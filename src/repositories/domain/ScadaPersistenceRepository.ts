import { supabase, isSupabaseConfigured } from '../../lib/supabase';
const requireBackend = () => { if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: SCADA persistence requires Supabase.'); };
export const scadaPersistenceRepository = {
  async createSimulationSession(row: Record<string, unknown>): Promise<void> { requireBackend(); const { error } = await supabase.from('scada_simulation_sessions').insert([row]); if (error) throw error; },
  async insertTelemetry(rows: Record<string, unknown>[]): Promise<void> { requireBackend(); const { error } = await supabase.from('scada_telemetry').insert(rows); if (error) throw error; },
  async acknowledgeAlarm(alarmCode: string, operatorName: string, acknowledgedAt: string): Promise<void> {
    requireBackend(); const { error } = await supabase.from('scada_alarms').update({ status: 'acknowledged', acknowledged_by: operatorName, acknowledged_at: acknowledgedAt }).eq('alarm_code', alarmCode); if (error) throw error;
  },
};
