// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MVP / MVVM PRESENTER: IEEE 1366 RELIABILITY VIEW MODEL
// Encapsulates SAIFI, SAIDI, CAIDI, and JERC Compliance Evaluation
// ============================================================================

import { useMemo } from 'react';
import { reliabilityService, CalculatedReliabilityIndices } from '../services/reliabilityService';
import { COMMONS } from '../commons';

export interface ReliabilityViewModel {
  indices: CalculatedReliabilityIndices;
  targetSAIFI: number;
  targetSAIDI: number;
  targetCAIDI: number;
  isSaifiCompliant: boolean;
  isSaidiCompliant: boolean;
  commons: typeof COMMONS;
}

export function useReliabilityViewModel(sectionId?: string): ReliabilityViewModel {
  const targetSAIFI = COMMONS.values.reliability.targetSAIFI;
  const targetSAIDI = COMMONS.values.reliability.targetSAIDI;
  const targetCAIDI = COMMONS.values.reliability.targetCAIDI;

  const indices = useMemo(() => {
    return reliabilityService.calculateDynamicIndices({
      sectionId,
      totalConsumers: 1000,
    });
  }, [sectionId]);

  const isSaifiCompliant = indices.saifi <= targetSAIFI;
  const isSaidiCompliant = indices.saidi <= targetSAIDI;

  return {
    indices,
    targetSAIFI,
    targetSAIDI,
    targetCAIDI,
    isSaifiCompliant,
    isSaidiCompliant,
    commons: COMMONS,
  };
}
