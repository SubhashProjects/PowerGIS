import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface PersistentNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'info';
  target_tab?: string;
  action_label?: string;
  read_at?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export const notificationRepository = {
  async listForUser(userId: string, limit = 100): Promise<PersistentNotification[]> {
    if (!isSupabaseConfigured || !userId) return [];
    const { data, error } = await supabase.from('user_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error; return (data ?? []) as PersistentNotification[];
  },
  async markRead(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
  async markAllRead(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;
    const { error } = await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
    if (error) throw error;
  },
};
