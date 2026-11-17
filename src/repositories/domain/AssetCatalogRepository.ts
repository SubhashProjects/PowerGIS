import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface AssetCatalogRows {
  substations: any[]; feeders: any[]; transformers: any[]; poles: any[];
  conductors: any[]; consumers: any[]; warranties: any[]; lifecycles: any[];
}

/** Database-shaped asset reads belong here; AssetService owns domain mapping only. */
export const assetCatalogRepository = {
  async loadAll(): Promise<AssetCatalogRows> {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: asset catalogue requires Supabase.');
    const results = await Promise.all([
      supabase.from('substations').select('*').order('code'),
      supabase.from('feeders').select('*').order('code'),
      supabase.from('transformers').select('*').order('code'),
      supabase.from('poles').select('*').order('code'),
      supabase.from('conductors').select('*').order('code'),
      supabase.from('consumers').select('*').order('consumer_number'),
      supabase.from('warranties').select('*').order('expiry_date'),
      supabase.from('equipment_lifecycle').select('*').order('replacement_priority'),
    ]);
    for (const result of results) if (result.error) throw result.error;
    const [ss, feeders, transformers, poles, conductors, consumers, warranties, lifecycles] = results;
    return {
      substations: ss.data ?? [], feeders: feeders.data ?? [], transformers: transformers.data ?? [],
      poles: poles.data ?? [], conductors: conductors.data ?? [], consumers: consumers.data ?? [],
      warranties: warranties.data ?? [], lifecycles: lifecycles.data ?? [],
    };
  },
};
