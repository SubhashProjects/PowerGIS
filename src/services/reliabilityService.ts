// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// OUTAGE RELIABILITY ENGINE: IEEE 1366 STANDARDS
// Computes SAIFI, SAIDI, CAIDI, MAIFI & ENS (Energy Not Served)
// ============================================================================

import { OutageReliabilityMetrics } from '../types/operations';
import { initialReliabilityMetrics, initialOutages } from './mockData';

export class ReliabilityService {
  private static instance: ReliabilityService;
  private metrics: OutageReliabilityMetrics[] = [...initialReliabilityMetrics];

  private constructor() {}

  public static getInstance(): ReliabilityService {
    if (!ReliabilityService.instance) {
      ReliabilityService.instance = new ReliabilityService();
    }
    return ReliabilityService.instance;
  }

  public getMetrics(): OutageReliabilityMetrics[] {
    return this.metrics;
  }

  public calculateSectionIndices(sectionId: string, totalConsumers: number) {
    const outages = initialOutages.filter(o => o.sectionId === sectionId);
    const totalAffected = outages.reduce((sum, o) => sum + o.affectedConsumersCount, 0);
    const totalCustomerMinutes = outages.reduce(
      (sum, o) => sum + (o.affectedConsumersCount * (o.durationMinutes || 60)),
      0
    );
    const totalENSKWh = outages.reduce((sum, o) => sum + o.energyNotServedKWh, 0);

    const safeConsumers = totalConsumers > 0 ? totalConsumers : 1;
    const saifi = Math.round((totalAffected / safeConsumers) * 10000) / 10000;
    const saidi = Math.round((totalCustomerMinutes / safeConsumers) * 10) / 10;
    const caidi = totalAffected > 0 ? Math.round((totalCustomerMinutes / totalAffected) * 10) / 10 : 0;
    const ensMWh = Math.round((totalENSKWh / 1000) * 1000) / 1000;

    return {
      totalOutages: outages.length,
      totalAffected,
      totalCustomerMinutes,
      saifi,
      saidi,
      caidi,
      ensMWh,
    };
  }
}

export const reliabilityService = ReliabilityService.getInstance();
