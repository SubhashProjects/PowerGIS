import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const requireBackend = () => { if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: specialized operational records require Supabase.'); };
export const specializedModuleRepository = {
  async listProjects(): Promise<any[]> { requireBackend(); const { data, error } = await supabase.from('capital_project_packages').select('*').eq('data_source','OPERATIONAL').order('scheme_code'); if (error) throw error; return data ?? []; },
  async listMaintenance(): Promise<any[]> { requireBackend(); const { data, error } = await supabase.from('maintenance_tasks').select('*').eq('data_source','OPERATIONAL').order('scheduled_date'); if (error) throw error; return data ?? []; },
  async listDisasters(): Promise<any[]> { requireBackend(); const { data, error } = await supabase.from('disaster_events').select('*').order('start_date', { ascending: false }); if (error) throw error; return data ?? []; },
};
