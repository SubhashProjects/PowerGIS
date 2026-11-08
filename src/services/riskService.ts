// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ISO 55000 ASSET RISK SCORING & HEALTH INDEX ENGINE
// ============================================================================

import { Transformer } from '../types/assets';

export interface AssetRiskScore {
  transformerId: string;
  code: string;
  name: string;
  conditionRisk: number;  // 0 - 100
  ageFactor: number;       // 0 - 100
  loadFactor: number;      // 0 - 100
  faultFactor: number;     // 0 - 100
  criticality: number;     // 0 - 100
  totalRiskScore: number;  // 0 - 100
  riskCategory: 'Critical' | 'High' | 'Moderate' | 'Low';
  recommendation: string;
}

export class RiskService {
  private static instance: RiskService;

  private constructor() {}

  public static getInstance(): RiskService {
    if (!RiskService.instance) {
      RiskService.instance = new RiskService();
    }
    return RiskService.instance;
  }

  public evaluateTransformerRisk(t: Transformer, faultCount = 1): AssetRiskScore {
    // 1. Condition Index (oil leak, oil level, phase imbalance)
    let conditionHealth = 100;
    if (t.hasOilLeakage) conditionHealth -= 35;
    if (t.oilLevelPct < 85) conditionHealth -= 25;
    if (t.phaseImbalancePct > 5) conditionHealth -= t.phaseImbalancePct * 2;
    conditionHealth = Math.max(0, conditionHealth);
    const conditionRisk = 100 - conditionHealth;

    // 2. Age Factor (Design life = 25 years)
    const installYear = new Date(t.installationDate).getFullYear() || 2020;
    const ageYears = Math.max(0, 2026 - installYear);
    const ageFactor = Math.min(100, Math.round((ageYears / 25) * 100));

    // 3. Loading Factor
    const loadFactor = Math.min(100, Math.round(t.loadPercentage));

    // 4. Fault Factor
    const faultFactor = Math.min(100, faultCount * 25);

    // 5. Criticality
    const criticality = t.capacityKVA >= 1000 ? 90 : t.capacityKVA >= 500 ? 75 : 50;

    // Weighted Formula (ISO 55000):
    // 30% Condition + 25% Age + 20% Load + 15% Faults + 10% Criticality
    const totalRiskScore = Math.round(
      0.30 * conditionRisk +
      0.25 * ageFactor +
      0.20 * loadFactor +
      0.15 * faultFactor +
      0.10 * criticality
    );

    let riskCategory: 'Critical' | 'High' | 'Moderate' | 'Low' = 'Low';
    let recommendation = 'Asset operating safely within CEA/IEEE thermal limits.';

    if (totalRiskScore >= 75) {
      riskCategory = 'Critical';
      recommendation = 'Immediate capacity augmentation or overhaul needed. Deploy portable DTR test kit.';
    } else if (totalRiskScore >= 55) {
      riskCategory = 'High';
      recommendation = 'Schedule oil filtration and phase load balancing within 14 days.';
    } else if (totalRiskScore >= 35) {
      riskCategory = 'Moderate';
      recommendation = 'Routine quarterly preventive maintenance inspection.';
    }

    return {
      transformerId: t.id,
      code: t.code,
      name: t.name,
      conditionRisk,
      ageFactor,
      loadFactor,
      faultFactor,
      criticality,
      totalRiskScore,
      riskCategory,
      recommendation,
    };
  }
}

export const riskService = RiskService.getInstance();
