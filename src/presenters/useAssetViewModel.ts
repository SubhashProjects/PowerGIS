// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MVP / MVVM PRESENTER: ELECTRICAL ASSET VIEW MODEL
// Encapsulates Asset Search, Filtering, and Jurisdiction Scoping
// ============================================================================

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { assetService } from '../services/assetService';
import {
  Substation,
  Feeder,
  Transformer,
  Pole,
  Consumer,
} from '../types/assets';
import { COMMONS } from '../commons';

export type AssetCategory = 'substations' | 'feeders' | 'transformers' | 'poles' | 'consumers';

export interface AssetViewModel {
  user: ReturnType<typeof useAuth>['user'];
  activeCategory: AssetCategory;
  setActiveCategory: (cat: AssetCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  substations: Substation[];
  feeders: Feeder[];
  transformers: Transformer[];
  poles: Pole[];
  consumers: Consumer[];
  filteredSubstations: Substation[];
  filteredFeeders: Feeder[];
  filteredTransformers: Transformer[];
  filteredPoles: Pole[];
  filteredConsumers: Consumer[];
  totalAssetCount: number;
  commons: typeof COMMONS;
}

export function useAssetViewModel(): AssetViewModel {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('substations');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const substations = useMemo(() => assetService.getSubstations(), []);
  const feeders = useMemo(() => assetService.getFeeders(), []);
  const transformers = useMemo(() => assetService.getTransformers(), []);
  const poles = useMemo(() => assetService.getPoles(), []);
  const consumers = useMemo(() => assetService.getConsumers(), []);

  const q = searchQuery.toLowerCase().trim();

  const filteredSubstations = useMemo(() => {
    if (!q) return substations;
    return substations.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [substations, q]);

  const filteredFeeders = useMemo(() => {
    if (!q) return feeders;
    return feeders.filter(
      f => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)
    );
  }, [feeders, q]);

  const filteredTransformers = useMemo(() => {
    if (!q) return transformers;
    return transformers.filter(
      t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [transformers, q]);

  const filteredPoles = useMemo(() => {
    if (!q) return poles;
    return poles.filter(
      p => p.poleNumber.toLowerCase().includes(q) || (p.material && p.material.toLowerCase().includes(q))
    );
  }, [poles, q]);

  const filteredConsumers = useMemo(() => {
    if (!q) return consumers;
    return consumers.filter(
      c => c.name.toLowerCase().includes(q) || c.consumerNumber.toLowerCase().includes(q)
    );
  }, [consumers, q]);

  const totalAssetCount = useMemo(() => {
    return (
      substations.length +
      feeders.length +
      transformers.length +
      poles.length +
      consumers.length
    );
  }, [substations, feeders, transformers, poles, consumers]);

  return {
    user,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    substations,
    feeders,
    transformers,
    poles,
    consumers,
    filteredSubstations,
    filteredFeeders,
    filteredTransformers,
    filteredPoles,
    filteredConsumers,
    totalAssetCount,
    commons: COMMONS,
  };
}
