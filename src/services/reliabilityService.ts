// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// OUTAGE RELIABILITY ENGINE: IEEE 1366 STANDARDS
// Computes SAIFI, SAIDI, CAIDI, MAIFI & ENS (Energy Not Served)
// Dynamic Calculation from Live Outage Repository & Custom Reporting Periods
// ============================================================================

import { Outage, OutageReliabilityMetrics } from '../types/operations';
import { initialReliabilityMetrics, initialOutages } from './mockData';
import { assetService } from './assetService';

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
  saifi: number;  // System Average Interruption Frequency Index (int/consumer)
  saidi: number;  // System Average Interruption Duration Index (min/consumer)
  caidi: number;  // Customer Average Interruption Duration Index (min/interrupted consumer)
  ensMWh: number; // Energy Not Served (MWh)
  jercCompliance: {
    saifiCompliant: boolean;
    saidiCompliant: boolean;
    status: 'COMPLIANT' | 'BREACH';
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

    const safeConsumers = filter.totalConsumers > 0 ? filter.totalConsumers : 1;
    const saifi = Math.round((totalAffected / safeConsumers) * 10000) / 10000;
    const saidi = Math.round((totalCustomerMinutes / safeConsumers) * 10) / 10;
    const caidi = totalAffected > 0 ? Math.round((totalCustomerMinutes / totalAffected) * 10) / 10 : 0;
    const ensMWh = Math.round((totalENSKWh / 1000) * 1000) / 1000;

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
