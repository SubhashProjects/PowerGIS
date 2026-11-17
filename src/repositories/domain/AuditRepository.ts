import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface AuditRecord {
  id: string; actor_id?: string; actor_role?: string; action: string; module: string;
  resource_id?: string; details?: Record<string, unknown>; previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>; created_at: string;
}

export const auditRepository = {
  async forRecord(module: string, resourceId: string, limit = 50): Promise<AuditRecord[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('audit_logs').select('*').eq('module', module).eq('resource_id', resourceId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditRecord[];
  },
  async recent(limit = 50): Promise<AuditRecord[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditRecord[];
  },
};
