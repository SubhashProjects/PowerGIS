// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ELECTRICAL ASSET REPOSITORY SERVICE WITH JURISDICTION SCOPING
// ============================================================================

import {
 Substation, Feeder, Transformer, Pole, Conductor, Consumer,
 WarrantyRecord, EquipmentLifecycleRecord
} from '../types/assets';
import {
 initialSubstations, initialFeeders, initialTransformers, initialPoles,
 initialConductors, initialConsumers, initialWarranties, initialLifecycles
} from '../data/simulatorData';
import { authService } from './authService';
import { scadaSimulatorService } from './scadaSimulatorService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export class AssetService {
 private static instance: AssetService;

 // Simulated / Test dummy grid assets (active ONLY when simulator is ON)
 private simulatedSubstations: Substation[] = [...initialSubstations];
 private simulatedFeeders: Feeder[] = [...initialFeeders];
 private simulatedTransformers: Transformer[] = [...initialTransformers];
 private simulatedPoles: Pole[] = [...initialPoles];
 private simulatedConductors: Conductor[] = [...initialConductors];
 private simulatedConsumers: Consumer[] = [...initialConsumers];

 // User-uploaded / Real operational assets (starts clean)
 private userSubstations: Substation[] = [];
 private userFeeders: Feeder[] = [];
 private userTransformers: Transformer[] = [];
 private userPoles: Pole[] = [];
 private userConductors: Conductor[] = [];
 private userConsumers: Consumer[] = [];

 private warranties: WarrantyRecord[] = [];
 private lifecycles: EquipmentLifecycleRecord[] = [];
 private backendLoaded = false;
 private backendLoadPromise: Promise<void> | null = null;

 // Simulator Toggle: default FALSE (Clean Real Mode). Dummy data only appears when turned ON.
 private isSimulatorActive: boolean = false;
 private listeners: Array<() => void> = [];

 private constructor() {
 if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
 const stored = localStorage.getItem('powergis_simulator_mode');
 if (!isSupabaseConfigured && stored === 'true') {
 this.isSimulatorActive = true;
 }
 }
 }

 public static getInstance(): AssetService {
 if (!AssetService.instance) {
 AssetService.instance = new AssetService();
 }
 return AssetService.instance;
 }

 public async loadFromSupabase(): Promise<void> {
 if (!isSupabaseConfigured) return;
 if (this.backendLoaded) return;
 if (this.backendLoadPromise) return this.backendLoadPromise;
 this.backendLoadPromise = this.loadFromSupabaseInternal();
 try { await this.backendLoadPromise; } finally { this.backendLoadPromise = null; }
 }

 private async loadFromSupabaseInternal(): Promise<void> {
 const point = (geom: any): [number, number] => {
 if (geom?.coordinates && Array.isArray(geom.coordinates)) return [Number(geom.coordinates[1]), Number(geom.coordinates[0])];
 if (typeof geom === 'string') {
 const match = geom.match(/POINT\\s*\\(\\s*(-?\\d+(?:\\.\\d+)?)\\s+(-?\\d+(?:\\.\\d+)?)\\s*\\)/i);
 if (match) return [Number(match[2]), Number(match[1])];
 }
 return [Number.NaN, Number.NaN];
 };
 const line = (geom: any): [number, number][] => {
 if (geom?.coordinates && Array.isArray(geom.coordinates)) return geom.coordinates.map((p: any) => [Number(p[1]), Number(p[0])] as [number, number]);
 return [];
 };
 const [ss, feeders, transformers, poles, conductors, consumers, warranties, lifecycles] = await Promise.all([
 supabase.from('substations').select('*').order('code'),
 supabase.from('feeders').select('*').order('code'),
 supabase.from('transformers').select('*').order('code'),
 supabase.from('poles').select('*').order('code'),
 supabase.from('conductors').select('*').order('code'),
 supabase.from('consumers').select('*').order('consumer_number'),
 supabase.from('warranties').select('*').order('expiry_date'),
 supabase.from('equipment_lifecycle').select('*').order('replacement_priority'),
 ]);
 for (const result of [ss, feeders, transformers, poles, conductors, consumers, warranties, lifecycles]) if (result.error) throw result.error;
 this.userSubstations = (ss.data ?? []).map((r: any) => ({ id:r.id, code:r.code, name:r.name, voltageClass:r.voltage_class, capacityMVA:Number(r.capacity_mva), numFeeders:Number(r.num_feeders ?? 0), regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? undefined, status:r.status, commissionDate:r.commission_date ?? '', coordinates:point(r.geom) }));
 this.userFeeders = (feeders.data ?? []).map((r: any) => ({ id:r.id, code:r.code, name:r.name, substationId:r.substation_id, voltageClass:r.voltage_class, conductorType:r.conductor_type ?? '', lengthKm:Number(r.length_km ?? 0), peakLoadAmps:Number(r.peak_load_amps ?? 0), ratedCapacityAmps:Number(r.rated_capacity_amps ?? 0), regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? undefined, isEnergized:Boolean(r.is_energized), status:r.status, coordinates:line(r.geom) }));
 this.userTransformers = (transformers.data ?? []).map((r: any) => ({ id:r.id, code:r.code, name:r.name, feederId:r.feeder_id, capacityKVA:Number(r.capacity_kva), voltageRatio:r.voltage_ratio ?? '', make:r.make ?? '', serialNumber:r.serial_number ?? '', installationDate:r.installation_date ?? '', loadPercentage:Number(r.load_percentage ?? 0), oilLevelPct:Number(r.oil_level_pct ?? 0), hasOilLeakage:Boolean(r.has_oil_leakage), phaseImbalancePct:Number(r.phase_imbalance_pct ?? 0), regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? '', jeJurisdictionId:r.je_jurisdiction_id ?? undefined, status:r.status, coordinates:point(r.geom) }));
 this.userPoles = (poles.data ?? []).map((r: any) => ({ id:r.id, code:r.code, poleNumber:r.pole_number, poleType:r.pole_type ?? '', material:r.material ?? '', heightMeters:Number(r.height_meters ?? 0), feederId:r.feeder_id, transformerId:r.transformer_id ?? undefined, numInsulators:Number(r.num_insulators ?? 0), condition:r.condition, hasStreetlight:Boolean(r.has_streetlight), installationDate:r.installation_date ?? '', regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? '', jeJurisdictionId:r.je_jurisdiction_id ?? undefined, status:r.status, coordinates:point(r.geom) }));
 this.userConductors = (conductors.data ?? []).map((r: any) => ({ id:r.id, code:r.code, feederId:r.feeder_id, startPoleId:r.start_pole_id, endPoleId:r.end_pole_id, conductorType:r.conductor_type ?? '', voltageClass:r.voltage_class, lengthMeters:Number(r.length_meters ?? 0), ratedCurrentAmps:Number(r.rated_current_amps ?? 0), condition:r.condition, coordinates:line(r.geom) }));
 this.userConsumers = (consumers.data ?? []).map((r: any) => ({ id:r.id, consumerNumber:r.consumer_number, accountNumber:r.account_number ?? '', name:r.name, address:r.address, category:r.category, sanctionedLoadKW:Number(r.sanctioned_load_kw ?? 0), poleId:r.pole_id ?? undefined, transformerId:r.transformer_id ?? undefined, feederId:r.feeder_id ?? undefined, meterNumber:r.meter_number, isSmartMeter:Boolean(r.is_smart_meter), meterMake:r.meter_make ?? '', meterInstallDate:r.meter_install_date ?? '', status:r.status, regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? '', jeJurisdictionId:r.je_jurisdiction_id ?? undefined, coordinates:point(r.geom) }));
 this.warranties = (warranties.data ?? []).map((r: any) => ({ id:r.id, batchNumber:r.batch_id ?? undefined, equipmentType:r.equipment_type, equipmentId:r.equipment_id, equipmentCode:r.equipment_code, manufacturer:r.manufacturer, commencementDate:r.commencement_date, expiryDate:r.expiry_date, daysToExpiry:Number(r.days_to_expiry ?? 0), claimStatus:r.claim_status }));
 this.lifecycles = (lifecycles.data ?? []).map((r: any) => ({ id:r.id, assetType:r.asset_type, assetId:r.asset_id, assetCode:r.asset_code, installationDate:r.installation_date, expectedLifeYears:Number(r.expected_life_years ?? 25), currentAgeYears:Number(r.current_age_years ?? 0), conditionScore:Number(r.condition_score ?? 0), replacementPriority:r.replacement_priority, isExpired:Boolean(r.is_expired), sectionId:r.section_id ?? '' }));
 this.backendLoaded = true;
 this.notifyListeners();
 }

 // --- Simulator Mode Controls ---
 public isSimulatorMode(): boolean {
 return this.isSimulatorActive;
 }

 public setSimulatorMode(active: boolean): void {
 if (isSupabaseConfigured && active) {
   this.isSimulatorActive = false;
   if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') localStorage.removeItem('powergis_simulator_mode');
   return;
 }
 this.isSimulatorActive = active;
 authService.setSimulatorMode(active);
 if (!active) {
 scadaSimulatorService.stop();
 }
 if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
 localStorage.setItem('powergis_simulator_mode', active ? 'true' : 'false');
 window.dispatchEvent(new CustomEvent('powergis:simulator-toggled', { detail: { active } }));
 }
 this.notifyListeners();
 }

 public toggleSimulatorMode(): boolean {
 const next = !this.isSimulatorActive;
 this.setSimulatorMode(next);
 return next;
 }

 public clearUserAssets(): void {
 this.userSubstations = [];
 this.userFeeders = [];
 this.userTransformers = [];
 this.userPoles = [];
 this.userConductors = [];
 this.userConsumers = [];
 this.notifyListeners();
 }

 public subscribe(listener: () => void): () => void {
 this.listeners.push(listener);
 return () => {
 this.listeners = this.listeners.filter(l => l !== listener);
 };
 }

 private notifyListeners(): void {
 this.listeners.forEach(l => {
 try {
 l();
 } catch (err) {
 console.error('AssetService listener error:', err);
 }
 });
 }

 // --- Substations ---
 public getSubstations(includeSimulated = false): Substation[] {
 const list = (this.isSimulatorActive || includeSimulated)
 ? [...this.userSubstations, ...this.simulatedSubstations]
 : [...this.userSubstations];
 return list.filter(s => (s as any).isUserUploaded || authService.isWithinJurisdiction(s));
 }

 public addSubstation(substation: Substation): void {
 (substation as any).isUserUploaded = true;
 this.userSubstations.push(substation);
 this.notifyListeners();
 }

 // --- Feeders ---
 public getFeeders(includeSimulated = false): Feeder[] {
 const list = (this.isSimulatorActive || includeSimulated)
 ? [...this.userFeeders, ...this.simulatedFeeders]
 : [...this.userFeeders];
 return list.filter(f => (f as any).isUserUploaded || authService.isWithinJurisdiction(f));
 }

 public getFeederById(id: string): Feeder | undefined {
 return this.userFeeders.find(f => f.id === id) || this.simulatedFeeders.find(f => f.id === id);
 }

 public addFeeder(feeder: Feeder): void {
 (feeder as any).isUserUploaded = true;
 this.userFeeders.push(feeder);
 this.notifyListeners();
 }

 // --- Transformers ---
 public getTransformers(includeSimulated = false): Transformer[] {
 const list = (this.isSimulatorActive || includeSimulated)
 ? [...this.userTransformers, ...this.simulatedTransformers]
 : [...this.userTransformers];
 return list.filter(t => (t as any).isUserUploaded || authService.isWithinJurisdiction(t));
 }

 public getTransformerById(id: string): Transformer | undefined {
 return this.userTransformers.find(t => t.id === id) || this.simulatedTransformers.find(t => t.id === id);
 }

 public addTransformer(transformer: Transformer): void {
 (transformer as any).isUserUploaded = true;
 this.userTransformers.push(transformer);
 this.notifyListeners();
 }

 public updateTransformerLoad(id: string, loadPct: number, oilLevelPct: number): void {
 const t = this.getTransformerById(id);
 if (t) {
 t.loadPercentage = loadPct;
 t.oilLevelPct = oilLevelPct;
 this.notifyListeners();
 }
 }

 // --- Poles ---
 public getPoles(includeSimulated = false): Pole[] {
 const list = (this.isSimulatorActive || includeSimulated)
 ? [...this.userPoles, ...this.simulatedPoles]
 : [...this.userPoles];
 return list.filter(p => (p as any).isUserUploaded || authService.isWithinJurisdiction(p));
 }

 public getPoleById(id: string): Pole | undefined {
 return this.userPoles.find(p => p.id === id) || this.simulatedPoles.find(p => p.id === id);
 }

 public addPole(pole: Pole): void {
 (pole as any).isUserUploaded = true;
 this.userPoles.push(pole);
 this.notifyListeners();
 }

 // --- Conductors ---
 public getConductors(includeSimulated = false): Conductor[] {
 return (this.isSimulatorActive || includeSimulated)
 ? [...this.userConductors, ...this.simulatedConductors]
 : [...this.userConductors];
 }

 // --- Consumers ---
 public getConsumers(includeSimulated = false): Consumer[] {
 const list = (this.isSimulatorActive || includeSimulated)
 ? [...this.userConsumers, ...this.simulatedConsumers]
 : [...this.userConsumers];
 return list.filter(c => (c as any).isUserUploaded || authService.isWithinJurisdiction(c));
 }

 public addConsumer(consumer: Consumer): void {
 (consumer as any).isUserUploaded = true;
 this.userConsumers.push(consumer);
 this.notifyListeners();
 }

 public getSmartMeters(): Consumer[] {
 return this.getConsumers().filter(c => c.isSmartMeter);
 }

 public getConventionalMeters(): Consumer[] {
 return this.getConsumers().filter(c => !c.isSmartMeter);
 }

 // --- Warranties ---
 public getWarranties(includeSimulated = false): WarrantyRecord[] {
 return (this.isSimulatorActive || includeSimulated)
 ? (this.warranties.length > 0 ? this.warranties : initialWarranties)
 : this.warranties;
 }

 public getExpiringWarranties(daysThreshold = 60, includeSimulated = false): WarrantyRecord[] {
 return this.getWarranties(includeSimulated).filter(w => w.daysToExpiry <= daysThreshold && w.claimStatus !== 'expired');
 }

 // --- Equipment Lifecycle ---
 public getLifecycles(includeSimulated = false): EquipmentLifecycleRecord[] {
 return (this.isSimulatorActive || includeSimulated)
 ? (this.lifecycles.length > 0 ? this.lifecycles : initialLifecycles)
 : this.lifecycles;
 }

 public getCriticalReplacementAssets(includeSimulated = false): EquipmentLifecycleRecord[] {
 return this.getLifecycles(includeSimulated).filter(l => l.replacementPriority === 'Critical' || l.isExpired);
 }

 // --- Global Asset Search ---
 public searchAssets(query: string): Array<{ id: string; code: string; name: string; type: string; coordinates?: [number, number] }> {
 const q = query.toLowerCase().trim();
 if (!q) return [];

 const results: Array<{ id: string; code: string; name: string; type: string; coordinates?: [number, number] }> = [];

 this.getSubstations().forEach(s => {
 if (s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) {
 results.push({ id: s.id, code: s.code, name: s.name, type: 'Substation', coordinates: s.coordinates });
 }
 });

 this.getFeeders().forEach(f => {
 if (f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)) {
 results.push({ id: f.id, code: f.code, name: f.name, type: 'Feeder', coordinates: f.coordinates[0] });
 }
 });

 this.getTransformers().forEach(t => {
 if (t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.make.toLowerCase().includes(q)) {
 results.push({ id: t.id, code: t.code, name: t.name, type: 'Transformer (DT)', coordinates: t.coordinates });
 }
 });

 this.getPoles().forEach(p => {
 if (p.code.toLowerCase().includes(q) || p.poleNumber.toLowerCase().includes(q)) {
 results.push({ id: p.id, code: p.code, name: `Pole ${p.poleNumber}`, type: 'Pole', coordinates: p.coordinates });
 }
 });

 this.getConsumers().forEach(c => {
 if (c.consumerNumber.toLowerCase().includes(q) || c.meterNumber.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) {
 results.push({ id: c.id, code: c.consumerNumber, name: `${c.name} (${c.meterNumber})`, type: 'Consumer', coordinates: c.coordinates });
 }
 });

 return results.slice(0, 10);
 }
}

export const assetService = AssetService.getInstance();
