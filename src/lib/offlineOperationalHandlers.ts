import { offlineMutationProcessor } from './offlineMutationProcessor';
import type { OfflineMutation } from './offlineMutationQueue';
import { backendService } from '../services/backendService';

type Payload = Record<string, unknown>;
const asPayload = (mutation: OfflineMutation): Payload => {
  if (!mutation.payload || typeof mutation.payload !== 'object' || Array.isArray(mutation.payload)) {
    throw new Error('OFFLINE_PAYLOAD_INVALID: expected an object payload.');
  }
  return mutation.payload as Payload;
};
const pick = (payload: Payload, keys: string[]): Record<string, unknown> => {
  const args: Record<string, unknown> = {};
  for (const key of keys) if (payload[key] !== undefined) args[key] = payload[key];
  return args;
};
const required = (args: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) if (args[key] === undefined || args[key] === null || args[key] === '') throw new Error(`OFFLINE_PAYLOAD_INVALID: ${key} is required.`);
};

/** Register only server-side transactional functions. Non-idempotent fault/outage
 * RPCs are deliberately excluded until matching database wrappers are deployed. */
export function registerOperationalOfflineHandlers(): () => void {
  const disposers = [
    offlineMutationProcessor.register('fault.create', async m => {
      const p = asPayload(m); const a = pick(p, ['p_category','p_description','p_priority','p_section_id','p_lat','p_lng','p_feeder_id','p_je_jurisdiction_id','p_affected_consumers_est']);
      required(a, ['p_category','p_description','p_priority','p_section_id','p_lat','p_lng']);
      await backendService.rpc('create_fault_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('fault.transition', async m => {
      const p = asPayload(m); const a = pick(p, ['p_fault_id','p_status','p_assigned_to','p_expected_version']);
      required(a, ['p_fault_id','p_status']);
      await backendService.rpc('transition_fault_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('outage.create', async m => {
      const p = asPayload(m); const a = pick(p, ['p_outage_type','p_reason','p_start_time','p_section_id','p_feeder_id','p_transformer_id','p_expected_restoration','p_affected_consumers_count','p_energy_not_served_kwh']);
      required(a, ['p_outage_type','p_reason','p_start_time','p_section_id']);
      await backendService.rpc('create_outage_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('work_order.create', async m => {
      const p = asPayload(m); const a = pick(p, ['p_title','p_category','p_instructions','p_assigned_crew','p_section_id','p_priority','p_due_date']);
      required(a, ['p_title','p_category','p_section_id','p_priority']);
      await backendService.rpc('create_work_order_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('work_order.transition', async m => {
      const p = asPayload(m); const a = pick(p, ['p_work_order_id','p_next_status','p_expected_version']);
      required(a, ['p_work_order_id','p_next_status']);
      await backendService.rpc('advance_work_order_status_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('ptw.create', async m => {
      const p = asPayload(m); const a = pick(p, ['p_feeder_id','p_section_id','p_work_description','p_isolation_points']);
      required(a, ['p_feeder_id','p_section_id','p_work_description','p_isolation_points']);
      await backendService.rpc('create_ptw_request_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('ptw.transition', async m => {
      const p = asPayload(m); const a = pick(p, ['p_permit_id','p_stage','p_equipment','p_location_lat','p_location_lng','p_confirmation','p_evidence_path','p_comments']);
      required(a, ['p_permit_id','p_stage']);
      await backendService.rpc('advance_ptw_stage_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('inventory.issue', async m => {
      const p = asPayload(m); const a = pick(p, ['p_item_id','p_quantity','p_work_order_id','p_recipient_name','p_remarks']);
      required(a, ['p_item_id','p_quantity']);
      if (Number(a.p_quantity) <= 0) throw new Error('OFFLINE_PAYLOAD_INVALID: p_quantity must be positive.');
      await backendService.rpc('issue_inventory_atomic_idempotent', { ...a, p_operation_id: m.operationId });
    }),
    offlineMutationProcessor.register('inventory.transaction', async m => {
      const p = asPayload(m); const a = pick(p, ['p_item_id','p_transaction_type','p_quantity','p_work_order_id','p_recipient_name','p_remarks']);
      required(a, ['p_item_id','p_transaction_type','p_quantity']);
      if (Number(a.p_quantity) <= 0) throw new Error('OFFLINE_PAYLOAD_INVALID: p_quantity must be positive.');
      await backendService.rpc('record_inventory_transaction_idempotent', { ...a, p_operation_id: m.operationId });
    }),
  ];
  return () => disposers.forEach(dispose => dispose());
}
