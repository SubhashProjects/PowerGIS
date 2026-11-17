import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const surveyRepository = {
  async submissions(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('survey_submissions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async stagingAssets(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('survey_staging_assets').select('*').order('created_at');
    if (error) throw error;
    return data ?? [];
  },
  async approvalHistory(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('approval_history').select('*, actor:user_profiles!approval_history_actor_id_fkey(full_name, role)').order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
