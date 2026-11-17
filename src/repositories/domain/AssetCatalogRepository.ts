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
  async saveLifecycleAssessment(input: { lifecycle_id: string; asset_id: string; condition_score: number; replacement_priority: string; is_expired: boolean; current_age_years: number; notes: string }) {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: lifecycle updates require Supabase.');
    const { data, error } = await supabase.rpc('record_equipment_lifecycle_assessment', {
      p_lifecycle_id: input.lifecycle_id, p_asset_id: input.asset_id, p_condition_score: input.condition_score,
      p_replacement_priority: input.replacement_priority, p_is_expired: input.is_expired,
      p_current_age_years: input.current_age_years, p_notes: input.notes,
    });
    if (error) throw error;
    return data;
  },
  async createLifecycle(record: { asset_type: string; asset_id: string; asset_code: string; installation_date: string; expected_life_years: number; current_age_years: number; condition_score: number; replacement_priority: string; is_expired: boolean; section_id: string | null }) {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: lifecycle records require Supabase.');
    const { data, error } = await supabase.from('equipment_lifecycle').insert(record).select('*').single();
    if (error) throw error;
    return data;
  },
  async listLifecycleEvents(lifecycleId: string) {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: lifecycle history requires Supabase.');
    const { data, error } = await supabase.from('equipment_lifecycle_events').select('*').eq('lifecycle_id', lifecycleId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
};
