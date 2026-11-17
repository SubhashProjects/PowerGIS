import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { SafetyPermit } from '../../types/operations';

export const ptwRepository = {
  async list(): Promise<SafetyPermit[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('safety_permits')
      .select('*, feeders(code), applicant:user_profiles!safety_permits_applicant_id_fkey(full_name), issuer:user_profiles!safety_permits_issuing_officer_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      ptwNumber: row.ptw_number,
      feederId: row.feeder_id,
      feederCode: row.feeders?.code ?? '',
      applicantName: row.applicant?.full_name ?? '',
      issuingOfficerName: row.issuer?.full_name ?? 'Pending authorized issuer assignment',
      workDescription: row.work_description,
      isolationPoints: row.isolation_points,
      earthingConfirmed: Boolean(row.earthing_confirmed),
      dangerNoticesPosted: Boolean(row.danger_notices_posted),
      gasDischargeTested: Boolean(row.gas_discharge_tested),
      status: row.status,
      issueTime: row.issue_time ?? undefined,
      clearanceTime: row.clearance_time ?? undefined,
      sectionId: row.section_id,
    }));
  },
};
