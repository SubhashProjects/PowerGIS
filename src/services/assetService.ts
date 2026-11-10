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
} from './mockData';
import { authService } from './authService';
import { scadaSimulatorService } from './scadaSimulatorService';

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

  private warranties: WarrantyRecord[] = [...initialWarranties];
  private lifecycles: EquipmentLifecycleRecord[] = [...initialLifecycles];

  // Simulator Toggle: default FALSE (Clean Real Mode). Dummy data only appears when turned ON.
  private isSimulatorActive: boolean = false;
  private listeners: Array<() => void> = [];

  private constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('powergis_simulator_mode');
      if (stored === 'true') {
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

  // --- Simulator Mode Controls ---
  public isSimulatorMode(): boolean {
    return this.isSimulatorActive;
  }

  public setSimulatorMode(active: boolean): void {
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
    return (this.isSimulatorActive || includeSimulated) ? this.warranties : [];
  }

  public getExpiringWarranties(daysThreshold = 60, includeSimulated = false): WarrantyRecord[] {
    return this.getWarranties(includeSimulated).filter(w => w.daysToExpiry <= daysThreshold && w.claimStatus !== 'expired');
  }

  // --- Equipment Lifecycle ---
  public getLifecycles(includeSimulated = false): EquipmentLifecycleRecord[] {
    return (this.isSimulatorActive || includeSimulated) ? this.lifecycles : [];
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
