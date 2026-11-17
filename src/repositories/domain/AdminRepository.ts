import { supabase, isSupabaseConfigured } from '../../lib/supabase';
export const adminRepository = {
  async listUserProfiles(): Promise<any[]> {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: user profiles require Supabase.');
    const { data, error } = await supabase.from('user_profiles').select('*').order('full_name');
    if (error) throw error;
    return data ?? [];
  },
  async provisionUser(body: Record<string, unknown>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: user provisioning requires Supabase.');
    const { data, error } = await supabase.functions.invoke('admin-provision-user', { body });
    if (error) throw error; return data;
  },
  async updateUser(body: Record<string, unknown>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: user administration requires Supabase.');
    const { data, error } = await supabase.functions.invoke('admin-update-user', { body });
    if (error) throw error; return data;
  },
};
