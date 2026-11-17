import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { backendService } from '../../services/backendService';
import type { Fault, FaultStatus, FaultPriority } from '../../types/operations';
import { createMutationCommand, runServerIdempotentMutation } from '../../lib/mutationCommand';

const mapFault = (r: any): Fault => ({
 id:r.id, faultCode:r.fault_code, category:r.category, description:r.description, priority:r.priority,
 status:r.status, feederId:r.feeder_id ?? undefined, transformerId:r.transformer_id ?? undefined, poleId:r.pole_id ?? undefined,
 sectionId:r.section_id, jeJurisdictionId:r.je_jurisdiction_id ?? undefined, reportedBy:r.reported_by ?? '', assignedTo:r.assigned_to ?? undefined,
 contractorId:r.contractor_id ?? undefined, distanceFromPoleM:r.distance_from_pole_m ?? undefined, distanceFromDtM:r.distance_from_dt_m ?? undefined,
 distanceAlongFeederM:r.distance_along_feeder_m ?? undefined, distanceFromOfficeKm:r.distance_from_office_km ?? undefined,
 affectedConsumersEst:Number(r.affected_consumers_est ?? 0), photoUrl:r.photo_url ?? undefined, restorationPhotoUrl:r.restoration_photo_url ?? undefined,
 reportedAt:r.reported_at, resolvedAt:r.resolved_at ?? undefined, updatedAt:r.updated_at ?? undefined, coordinates:r.geom?.coordinates ? [Number(r.geom.coordinates[1]),Number(r.geom.coordinates[0])] : [Number.NaN,Number.NaN],
});

export class FaultCommandRepository {
 async list(): Promise<Fault[]> {
 if (!isSupabaseConfigured) return [];
 const { data, error } = await supabase.from('faults').select('*').order('reported_at', { ascending: false });
 if (error) throw error; return (data ?? []).map(mapFault);
 }
 async create(input: { category:string; description:string; priority:FaultPriority; feederId?:string; sectionId:string; jeJurisdictionId?:string; coordinates:[number,number]; affectedConsumersEst:number }): Promise<Fault> {
 if (!isSupabaseConfigured) throw new Error('Fault backend is not configured.');
 const command = createMutationCommand('fault.create');
 const result = await runServerIdempotentMutation(command, () => backendService.rpc<any>('create_fault_idempotent', {
 p_operation_id: command.operationId, p_category:input.category, p_description:input.description.trim(), p_priority:input.priority, p_feeder_id:input.feederId ?? null,
 p_section_id:input.sectionId, p_je_jurisdiction_id:input.jeJurisdictionId ?? null, p_lat:input.coordinates[0], p_lng:input.coordinates[1], p_affected_consumers_est:input.affectedConsumersEst,
 }), { entityType: 'fault', payload: { p_category:input.category, p_description:input.description.trim(), p_priority:input.priority, p_feeder_id:input.feederId ?? null, p_section_id:input.sectionId, p_je_jurisdiction_id:input.jeJurisdictionId ?? null, p_lat:input.coordinates[0], p_lng:input.coordinates[1], p_affected_consumers_est:input.affectedConsumersEst } });
 return mapFault(result);
 }
 async transition(id:string, status:FaultStatus, assignedTo?:string, expectedVersion?:string): Promise<void> {
 const command = createMutationCommand('fault.transition', expectedVersion);
 await runServerIdempotentMutation(command, () => backendService.rpc('transition_fault_idempotent', { p_operation_id:command.operationId, p_fault_id:id, p_status:status, p_assigned_to:assignedTo ?? null, p_expected_version:expectedVersion ?? null }), { entityType: 'fault', entityId: id, payload: { p_fault_id:id, p_status:status, p_assigned_to:assignedTo ?? null, p_expected_version:expectedVersion ?? null } });
 }
}
export const faultCommandRepository = new FaultCommandRepository();
