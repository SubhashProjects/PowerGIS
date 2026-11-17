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
import { isSupabaseConfigured } from '../lib/supabase';
import { isSimulatorRuntimeAllowed } from '../repositories/repositoryFactory';
import { assetCatalogRepository } from '../repositories/domain/AssetCatalogRepository';
import { validateAssetConditionScore, validateAssetInstallationDate, validateExpectedAssetLife } from '../commons/validators';

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
 if (isSimulatorRuntimeAllowed() && !isSupabaseConfigured && stored === 'true') {
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
 const catalog = await assetCatalogRepository.loadAll();
 const { substations: ss, feeders, transformers, poles, conductors, consumers, warranties, lifecycles } = catalog;
 this.userSubstations = (ss ?? []).map((r: any) => ({ id:r.id, code:r.code, name:r.name, voltageClass:r.voltage_class, capacityMVA:Number(r.capacity_mva), numFeeders:Number(r.num_feeders ?? 0), regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? undefined, status:r.status, commissionDate:r.commission_date ?? '', coordinates:point(r.geom) }));
 this.userFeeders = (feeders ?? []).map((r: any) => ({ id:r.id, code:r.code, name:r.name, substationId:r.substation_id, voltageClass:r.voltage_class, conductorType:r.conductor_type ?? '', lengthKm:Number(r.length_km ?? 0), peakLoadAmps:Number(r.peak_load_amps ?? 0), ratedCapacityAmps:Number(r.rated_capacity_amps ?? 0), regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? undefined, isEnergized:Boolean(r.is_energized), status:r.status, coordinates:line(r.geom) }));
 this.userTransformers = (transformers ?? []).map((r: any) => ({ id:r.id, code:r.code, name:r.name, feederId:r.feeder_id, capacityKVA:Number(r.capacity_kva), voltageRatio:r.voltage_ratio ?? '', make:r.make ?? '', serialNumber:r.serial_number ?? '', installationDate:r.installation_date ?? '', loadPercentage:Number(r.load_percentage ?? 0), oilLevelPct:Number(r.oil_level_pct ?? 0), hasOilLeakage:Boolean(r.has_oil_leakage), phaseImbalancePct:Number(r.phase_imbalance_pct ?? 0), regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? '', jeJurisdictionId:r.je_jurisdiction_id ?? undefined, status:r.status, coordinates:point(r.geom) }));
 this.userPoles = (poles ?? []).map((r: any) => ({ id:r.id, code:r.code, poleNumber:r.pole_number, poleType:r.pole_type ?? '', material:r.material ?? '', heightMeters:Number(r.height_meters ?? 0), feederId:r.feeder_id, transformerId:r.transformer_id ?? undefined, numInsulators:Number(r.num_insulators ?? 0), condition:r.condition, hasStreetlight:Boolean(r.has_streetlight), installationDate:r.installation_date ?? '', regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? '', jeJurisdictionId:r.je_jurisdiction_id ?? undefined, status:r.status, coordinates:point(r.geom) }));
 this.userConductors = (conductors ?? []).map((r: any) => ({ id:r.id, code:r.code, feederId:r.feeder_id, startPoleId:r.start_pole_id, endPoleId:r.end_pole_id, conductorType:r.conductor_type ?? '', voltageClass:r.voltage_class, lengthMeters:Number(r.length_meters ?? 0), ratedCurrentAmps:Number(r.rated_current_amps ?? 0), condition:r.condition, coordinates:line(r.geom) }));
 this.userConsumers = (consumers ?? []).map((r: any) => ({ id:r.id, consumerNumber:r.consumer_number, accountNumber:r.account_number ?? '', name:r.name, address:r.address, category:r.category, sanctionedLoadKW:Number(r.sanctioned_load_kw ?? 0), poleId:r.pole_id ?? undefined, transformerId:r.transformer_id ?? undefined, feederId:r.feeder_id ?? undefined, meterNumber:r.meter_number, isSmartMeter:Boolean(r.is_smart_meter), meterMake:r.meter_make ?? '', meterInstallDate:r.meter_install_date ?? '', status:r.status, regionId:r.region_id, divisionId:r.division_id ?? undefined, sectionId:r.section_id ?? '', jeJurisdictionId:r.je_jurisdiction_id ?? undefined, coordinates:point(r.geom) }));
 this.warranties = (warranties ?? []).map((r: any) => ({ id:r.id, batchNumber:r.batch_id ?? undefined, equipmentType:r.equipment_type, equipmentId:r.equipment_id, equipmentCode:r.equipment_code, manufacturer:r.manufacturer, commencementDate:r.commencement_date, expiryDate:r.expiry_date, daysToExpiry:Number(r.days_to_expiry ?? 0), claimStatus:r.claim_status }));
 this.lifecycles = (lifecycles ?? []).map((r: any) => ({ id:r.id, assetType:r.asset_type, assetId:r.asset_id, assetCode:r.asset_code, installationDate:r.installation_date, expectedLifeYears:Number(r.expected_life_years ?? 25), currentAgeYears:Number(r.current_age_years ?? 0), conditionScore:Number(r.condition_score ?? 0), replacementPriority:r.replacement_priority, isExpired:Boolean(r.is_expired), sectionId:r.section_id ?? '' }));
 this.backendLoaded = true;
 this.notifyListeners();
 }

 // --- Simulator Mode Controls ---
 public isSimulatorMode(): boolean {
 return this.isSimulatorActive;
 }

 public setSimulatorMode(active: boolean): void {
 if ((!isSimulatorRuntimeAllowed() || isSupabaseConfigured) && active) {
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

 public async assessLifecycle(id: string, conditionScore: number, replacementPriority: EquipmentLifecycleRecord['replacementPriority'], notes: string): Promise<void> {
 const scoreError = validateAssetConditionScore(conditionScore);
 if (scoreError) throw new Error(scoreError);
 if (!isSupabaseConfigured) throw new Error('Lifecycle assessments require a configured Supabase backend. No local-only operational update was made.');
 const current = this.getLifecycles().find(item => item.id === id);
 if (!current) throw new Error('Lifecycle record was not found in the current jurisdiction.');
 const installation = new Date(current.installationDate);
 const age = Number.isNaN(installation.getTime()) ? current.currentAgeYears : Math.max(0, (Date.now() - installation.getTime()) / (365.25 * 86400000));
 const expired = age >= current.expectedLifeYears;
 const saved = await assetCatalogRepository.saveLifecycleAssessment({ lifecycle_id: id, asset_id: current.assetId, condition_score: conditionScore, replacement_priority: replacementPriority, is_expired: expired, current_age_years: Number(age.toFixed(2)), notes: notes.trim() });
 const row = Array.isArray(saved) ? saved[0] : saved;
 this.lifecycles = this.lifecycles.map(item => item.id === id ? { ...item, conditionScore: Number(row.condition_score), replacementPriority: row.replacement_priority, isExpired: Boolean(row.is_expired), currentAgeYears: Number(row.current_age_years) } : item);
 this.notifyListeners();
 }

 public async registerLifecycle(record: Omit<EquipmentLifecycleRecord, 'id' | 'currentAgeYears' | 'isExpired'>): Promise<void> {
 if (!isSupabaseConfigured) throw new Error('Lifecycle registration requires a configured Supabase backend.');
 const dateError = validateAssetInstallationDate(record.installationDate);
 const lifeError = validateExpectedAssetLife(record.expectedLifeYears);
 const scoreError = validateAssetConditionScore(record.conditionScore);
 if (dateError || lifeError || scoreError) throw new Error([dateError, lifeError, scoreError].filter(Boolean).join(' '));
 if (this.getLifecycles().some(item => item.assetId === record.assetId)) throw new Error('This asset already has a lifecycle record.');
 const installed = new Date(record.installationDate);
 const age = Math.max(0, (Date.now() - installed.getTime()) / (365.25 * 86400000));
 const expired = age >= record.expectedLifeYears;
 const saved = await assetCatalogRepository.createLifecycle({ asset_type: record.assetType, asset_id: record.assetId, asset_code: record.assetCode, installation_date: record.installationDate, expected_life_years: record.expectedLifeYears, current_age_years: Number(age.toFixed(2)), condition_score: record.conditionScore, replacement_priority: record.replacementPriority, is_expired: expired, section_id: record.sectionId || null });
 this.lifecycles = [...this.lifecycles, { id: saved.id, assetType: saved.asset_type, assetId: saved.asset_id, assetCode: saved.asset_code, installationDate: saved.installation_date, expectedLifeYears: Number(saved.expected_life_years), currentAgeYears: Number(saved.current_age_years ?? 0), conditionScore: Number(saved.condition_score ?? 0), replacementPriority: saved.replacement_priority, isExpired: Boolean(saved.is_expired), sectionId: saved.section_id ?? '' }];
 this.notifyListeners();
 }

 public getLifecycleHistory(id: string) { return assetCatalogRepository.listLifecycleEvents(id); }

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
