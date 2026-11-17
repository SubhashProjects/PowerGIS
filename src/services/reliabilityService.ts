// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE RELIABILITY ENGINE: IEEE 1366 STANDARDS
// Computes SAIFI, SAIDI, CAIDI, MAIFI & ENS (Energy Not Served)
// Dynamic Calculation from Live Outage Repository & Custom Reporting Periods
// ============================================================================

import { Outage, OutageReliabilityMetrics } from '../types/operations';
import { initialReliabilityMetrics, initialOutages } from './mockData';
import { assetService } from './assetService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { backendService } from './backendService';

export interface DynamicReliabilityFilter {
 sectionId?: string;
 feederId?: string;
 totalConsumers: number;
 startDate?: string;
 endDate?: string;
 outageType?: 'Planned' | 'Emergency' | 'Load Shedding' | 'ALL';
 includeSimulated?: boolean;
}

export interface CalculatedReliabilityIndices {
 sectionId?: string;
 calculationPeriod: string;
 totalOutages: number;
 totalAffected: number;
 totalCustomerMinutes: number;
 saifi: number; // System Average Interruption Frequency Index (int/consumer)
 saidi: number; // System Average Interruption Duration Index (min/consumer)
 caidi: number; // Customer Average Interruption Duration Index (min/interrupted consumer)
 ensMWh: number; // Energy Not Served (MWh)
 jercCompliance: {
 saifiCompliant: boolean;
 saidiCompliant: boolean;
 status: 'COMPLIANT' | 'BREACH' | 'UNAVAILABLE';
 };
}

export class ReliabilityService {
 private static instance: ReliabilityService;
 private metrics: OutageReliabilityMetrics[] = [...initialReliabilityMetrics];
 private simulatedOutages: Outage[] = [...initialOutages];
 private userOutages: Outage[] = [];

 private constructor() {}

 public static getInstance(): ReliabilityService {
 if (!ReliabilityService.instance) {
 ReliabilityService.instance = new ReliabilityService();
 }
 return ReliabilityService.instance;
 }

 public async loadFromSupabase(): Promise<void> {
 if (!isSupabaseConfigured) return;
 const { data, error } = await supabase.from('outages').select('*').order('start_time', { ascending: false });
 if (error) throw error;
 this.userOutages = (data ?? []).map((r:any) => ({
 id:r.id, outageCode:r.outage_code, feederId:r.feeder_id ?? undefined, transformerId:r.transformer_id ?? undefined,
 outageType:r.outage_type, reason:r.reason, startTime:r.start_time, expectedRestoration:r.expected_restoration ?? '', actualRestoration:r.actual_restoration ?? undefined,
 durationMinutes:r.duration_minutes == null ? undefined : Number(r.duration_minutes), affectedConsumersCount:Number(r.affected_consumers_count ?? 0), energyNotServedKWh:Number(r.energy_not_served_kwh ?? 0), sectionId:r.section_id, status:r.status,
 }));
 }

 public async registerOutageAsync(input: Omit<Outage,'id'|'outageCode'>): Promise<Outage> {
 if (!isSupabaseConfigured) throw new Error('Outage backend is not configured.');
 if (input.affectedConsumersCount < 0) throw new Error('Affected consumers cannot be negative.');
 const result = await backendService.rpc<any>('create_outage', {
 p_feeder_id: input.feederId ?? null, p_transformer_id: input.transformerId ?? null, p_outage_type: input.outageType,
 p_reason: input.reason.trim(), p_start_time: input.startTime, p_expected_restoration: input.expectedRestoration || null,
 p_affected_consumers_count: input.affectedConsumersCount, p_energy_not_served_kwh: input.energyNotServedKWh ?? 0, p_section_id: input.sectionId,
 });
 await this.loadFromSupabase();
 return this.userOutages.find(o => o.id === result.id) ?? (result as Outage);
 }

 public getMetrics(includeSimulated = false): OutageReliabilityMetrics[] {
 const isSim = assetService.isSimulatorMode() || includeSimulated;
 return isSim ? this.metrics : [];
 }

 public getOutages(sectionId?: string, includeSimulated = false): Outage[] {
 const isSim = assetService.isSimulatorMode() || includeSimulated;
 const list = isSim
 ? [...this.userOutages, ...this.simulatedOutages]
 : [...this.userOutages];

 if (sectionId) {
 return list.filter(o => o.sectionId === sectionId);
 }
 return list;
 }

 public registerOutage(outage: Outage): void {
 (outage as any).isUserUploaded = true;
 this.userOutages.unshift(outage);
 }

 /**
 * Computes IEEE 1366 Indices dynamically from live outage records
 */
 public calculateDynamicIndices(filter: DynamicReliabilityFilter): CalculatedReliabilityIndices {
 const isSim = assetService.isSimulatorMode() || Boolean(filter.includeSimulated);
 let sourceOutages = this.getOutages(filter.sectionId, isSim);

 if (!isSim && sourceOutages.length === 0) {
 return {
 sectionId: filter.sectionId,
 calculationPeriod: `${filter.startDate || 'All'} - ${filter.endDate || 'Present'}`,
 totalOutages: 0,
 totalAffected: 0,
 totalCustomerMinutes: 0,
 saifi: 0,
 saidi: 0,
 caidi: 0,
 ensMWh: 0,
 jercCompliance: {
 saifiCompliant: true,
 saidiCompliant: true,
 status: 'COMPLIANT',
 },
 };
 }

 let list = [...sourceOutages];

 if (filter.sectionId) {
 list = list.filter(o => o.sectionId === filter.sectionId);
 }
 if (filter.feederId) {
 list = list.filter(o => o.feederId === filter.feederId);
 }
 if (filter.outageType && filter.outageType !== 'ALL') {
 list = list.filter(o => o.outageType === filter.outageType);
 }
 if (filter.startDate) {
 const startMs = new Date(filter.startDate).getTime();
 list = list.filter(o => new Date(o.startTime).getTime() >= startMs);
 }
 if (filter.endDate) {
 const endMs = new Date(filter.endDate).getTime();
 list = list.filter(o => new Date(o.startTime).getTime() <= endMs);
 }

 const totalAffected = list.reduce((sum, o) => sum + o.affectedConsumersCount, 0);
 const totalCustomerMinutes = list.reduce(
 (sum, o) => sum + (o.affectedConsumersCount * (o.durationMinutes || 60)),
 0
 );
 const totalENSKWh = list.reduce((sum, o) => sum + (o.energyNotServedKWh || 0), 0);
 const ensMWh = Math.round((totalENSKWh / 1000) * 1000) / 1000;

 if (filter.totalConsumers <= 0) {
 return { sectionId: filter.sectionId, calculationPeriod: `${filter.startDate || 'All'} - ${filter.endDate || 'Present'}`, totalOutages: list.length, totalAffected, totalCustomerMinutes, saifi: 0, saidi: 0, caidi: 0, ensMWh, jercCompliance: { saifiCompliant: false, saidiCompliant: false, status: 'UNAVAILABLE' } };
 }
 const safeConsumers = filter.totalConsumers;
 const saifi = Math.round((totalAffected / safeConsumers) * 10000) / 10000;
 const saidi = Math.round((totalCustomerMinutes / safeConsumers) * 10) / 10;
 const caidi = totalAffected > 0 ? Math.round((totalCustomerMinutes / totalAffected) * 10) / 10 : 0;

 // Statutory JERC Benchmark Targets: SAIFI < 2.0 / year, SAIDI < 180 min / year
 const saifiCompliant = saifi <= 2.0;
 const saidiCompliant = saidi <= 180.0;

 return {
 sectionId: filter.sectionId,
 calculationPeriod: `${filter.startDate || 'All'} - ${filter.endDate || 'Present'}`,
 totalOutages: list.length,
 totalAffected,
 totalCustomerMinutes,
 saifi,
 saidi,
 caidi,
 ensMWh,
 jercCompliance: {
 saifiCompliant,
 saidiCompliant,
 status: saifiCompliant && saidiCompliant ? 'COMPLIANT' : 'BREACH',
 },
 };
 }

 /**
 * Backward-compatible helper for legacy components
 */
 public calculateSectionIndices(sectionId: string, totalConsumers: number) {
 const res = this.calculateDynamicIndices({ sectionId, totalConsumers, includeSimulated: true });
 return {
 totalOutages: res.totalOutages,
 totalAffected: res.totalAffected,
 totalCustomerMinutes: res.totalCustomerMinutes,
 saifi: res.saifi,
 saidi: res.saidi,
 caidi: res.caidi,
 ensMWh: res.ensMWh,
 };
 }
}

export const reliabilityService = ReliabilityService.getInstance();
