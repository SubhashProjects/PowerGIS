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

export class AssetService {
  private static instance: AssetService;
  private substations: Substation[] = [...initialSubstations];
  private feeders: Feeder[] = [...initialFeeders];
  private transformers: Transformer[] = [...initialTransformers];
  private poles: Pole[] = [...initialPoles];
  private conductors: Conductor[] = [...initialConductors];
  private consumers: Consumer[] = [...initialConsumers];
  private warranties: WarrantyRecord[] = [...initialWarranties];
  private lifecycles: EquipmentLifecycleRecord[] = [...initialLifecycles];

  private constructor() {}

  public static getInstance(): AssetService {
    if (!AssetService.instance) {
      AssetService.instance = new AssetService();
    }
    return AssetService.instance;
  }

  // --- Substations ---
  public getSubstations(): Substation[] {
    return this.substations.filter(s => authService.isWithinJurisdiction(s));
  }

  public addSubstation(substation: Substation): void {
    this.substations.push(substation);
  }

  // --- Feeders ---
  public getFeeders(): Feeder[] {
    return this.feeders.filter(f => authService.isWithinJurisdiction(f));
  }

  public getFeederById(id: string): Feeder | undefined {
    return this.feeders.find(f => f.id === id);
  }

  public addFeeder(feeder: Feeder): void {
    this.feeders.push(feeder);
  }

  // --- Transformers ---
  public getTransformers(): Transformer[] {
    return this.transformers.filter(t => authService.isWithinJurisdiction(t));
  }

  public addTransformer(transformer: Transformer): void {
    this.transformers.push(transformer);
  }

  public getTransformerById(id: string): Transformer | undefined {
    return this.transformers.find(t => t.id === id);
  }

  public updateTransformerLoad(id: string, loadPct: number, oilLevelPct: number): void {
    const t = this.transformers.find(tr => tr.id === id);
    if (t) {
      t.loadPercentage = loadPct;
      t.oilLevelPct = oilLevelPct;
    }
  }

  // --- Poles ---
  public getPoles(): Pole[] {
    return this.poles.filter(p => authService.isWithinJurisdiction(p));
  }

  public getPoleById(id: string): Pole | undefined {
    return this.poles.find(p => p.id === id);
  }

  public addPole(pole: Pole): void {
    this.poles.push(pole);
  }

  // --- Conductors ---
  public getConductors(): Conductor[] {
    return this.conductors;
  }

  // --- Consumers ---
  public getConsumers(): Consumer[] {
    return this.consumers.filter(c => authService.isWithinJurisdiction(c));
  }

  public addConsumer(consumer: Consumer): void {
    this.consumers.push(consumer);
  }

  public getSmartMeters(): Consumer[] {
    return this.getConsumers().filter(c => c.isSmartMeter);
  }

  public getConventionalMeters(): Consumer[] {
    return this.getConsumers().filter(c => !c.isSmartMeter);
  }

  // --- Warranties ---
  public getWarranties(): WarrantyRecord[] {
    return this.warranties;
  }

  public getExpiringWarranties(daysThreshold = 60): WarrantyRecord[] {
    return this.warranties.filter(w => w.daysToExpiry <= daysThreshold && w.claimStatus !== 'expired');
  }

  // --- Equipment Lifecycle ---
  public getLifecycles(): EquipmentLifecycleRecord[] {
    return this.lifecycles;
  }

  public getCriticalReplacementAssets(): EquipmentLifecycleRecord[] {
    return this.lifecycles.filter(l => l.replacementPriority === 'Critical' || l.isExpired);
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
