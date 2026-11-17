import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { backendService } from './backendService';
import type { SafetyPermit } from '../types/operations';

export type PtwStage =
 | 'requested'
 | 'isolation_verified'
 | 'absence_of_voltage_verified'
 | 'earthing_confirmed'
 | 'danger_notices_confirmed'
 | 'additional_checks_verified'
 | 'issuer_verified'
 | 'approved'
 | 'work_started'
 | 'suspended'
 | 'extended'
 | 'work_completed'
 | 'personnel_cleared'
 | 'earths_removed'
 | 'restoration_approved'
 | 'restored'
 | 'closed'
 | 'cancelled';

export interface PtwEventInput {
 permitId: string;
 stage: PtwStage;
 equipment?: string;
 location?: { lat: number; lng: number };
 confirmation?: boolean;
 comments?: string;
 evidencePath?: string;
}

export class PtwService {
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
 }

 async createRequest(input: { feederId: string; workDescription: string; isolationPoints: string; sectionId: string }): Promise<string> {
 if (!isSupabaseConfigured) throw new Error('PTW backend is not configured.');
 if (!input.workDescription.trim()) throw new Error('Work description is required.');
 if (!input.isolationPoints.trim()) throw new Error('Isolation points are required.');
 const id = await backendService.rpc<string>('create_ptw_request', {
 p_feeder_id: input.feederId,
 p_section_id: input.sectionId,
 p_work_description: input.workDescription.trim(),
 p_isolation_points: input.isolationPoints.trim(),
 });
 return id;
 }

 async advance(input: PtwEventInput): Promise<void> {
 if (!isSupabaseConfigured) throw new Error('PTW backend is not configured.');
 if (input.stage !== 'requested' && input.confirmation !== true) {
 throw new Error('A backend-confirmed safety transition requires explicit confirmation.');
 }
 await backendService.rpc('advance_ptw_stage', {
 p_permit_id: input.permitId,
 p_stage: input.stage,
 p_equipment: input.equipment ?? null,
 p_location_lat: input.location?.lat ?? null,
 p_location_lng: input.location?.lng ?? null,
 p_confirmation: input.confirmation ?? false,
 p_evidence_path: input.evidencePath ?? null,
 p_comments: input.comments ?? null,
 });
 }
}

export const ptwService = new PtwService();
