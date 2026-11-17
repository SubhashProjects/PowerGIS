import { isSupabaseConfigured } from '../lib/supabase';
import { ptwRepository } from '../repositories/domain/PtwRepository';
import { backendService } from './backendService';
import { createMutationCommand, runServerIdempotentMutation } from '../lib/mutationCommand';
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
 return ptwRepository.list();
 }

 async createRequest(input: { feederId: string; workDescription: string; isolationPoints: string; sectionId: string }): Promise<string> {
 if (!isSupabaseConfigured) throw new Error('PTW backend is not configured.');
 if (!input.workDescription.trim()) throw new Error('Work description is required.');
 if (!input.isolationPoints.trim()) throw new Error('Isolation points are required.');
 const command = createMutationCommand('ptw.create');
 const id = await runServerIdempotentMutation(command, () => backendService.rpc<string>('create_ptw_request_idempotent', { p_operation_id: command.operationId,
 p_feeder_id: input.feederId,
 p_section_id: input.sectionId,
 p_work_description: input.workDescription.trim(),
 p_isolation_points: input.isolationPoints.trim(),
 }), { entityType: 'permit_to_work', payload: { p_feeder_id:input.feederId, p_section_id:input.sectionId, p_work_description:input.workDescription.trim(), p_isolation_points:input.isolationPoints.trim() } });
 return id;
 }

 async advance(input: PtwEventInput): Promise<void> {
 if (!isSupabaseConfigured) throw new Error('PTW backend is not configured.');
 if (input.stage !== 'requested' && input.confirmation !== true) {
 throw new Error('A backend-confirmed safety transition requires explicit confirmation.');
 }
 const command = createMutationCommand('ptw.transition');
 await runServerIdempotentMutation(command, () => backendService.rpc('advance_ptw_stage_idempotent', { p_operation_id: command.operationId,
 p_permit_id: input.permitId,
 p_stage: input.stage,
 p_equipment: input.equipment ?? null,
 p_location_lat: input.location?.lat ?? null,
 p_location_lng: input.location?.lng ?? null,
 p_confirmation: input.confirmation ?? false,
 p_evidence_path: input.evidencePath ?? null,
 p_comments: input.comments ?? null,
 }), { entityType: 'permit_to_work', entityId: input.permitId, payload: { p_permit_id:input.permitId, p_stage:input.stage, p_equipment:input.equipment ?? null, p_location_lat:input.location?.lat ?? null, p_location_lng:input.location?.lng ?? null, p_confirmation:input.confirmation ?? false, p_evidence_path:input.evidencePath ?? null, p_comments:input.comments ?? null } });
 }
}

export const ptwService = new PtwService();
