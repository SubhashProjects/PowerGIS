import { isSupabaseConfigured } from '../lib/supabase';
import { workOrderRepository } from '../repositories/domain/WorkOrderRepository';
import { backendService } from './backendService';
import { createMutationCommand, runServerIdempotentMutation } from '../lib/mutationCommand';
import type { WorkOrder, WorkOrderStatus } from '../types/operations';
import { assertWorkflowTransition } from '../lib/workflowEngine';

const mapOrder = (r: any): WorkOrder => ({
 id: r.id, orderNumber: r.order_number, faultId: r.fault_id ?? undefined, title: r.title,
 category: r.category, instructions: r.instructions ?? '', priority: r.priority, status: r.status,
 assignedCrew: r.assigned_crew ?? '', contractorId: r.contractor_id ?? undefined,
 sectionId: r.section_id, jeVerified: Boolean(r.je_verified), aeApproved: Boolean(r.ae_approved),
 materialsUsed: r.materials_used ?? undefined, dueDate: r.due_date ?? '', completedAt: r.completed_at ?? undefined,
});

export class WorkOrderService {
 async list(): Promise<WorkOrder[]> {
 if (!isSupabaseConfigured) return [];
 const data = await workOrderRepository.list({ orderBy: 'created_at', ascending: false });
 return data.map(mapOrder);
 }
 async create(input: { title: string; category: string; instructions: string; assignedCrew: string; sectionId: string; priority: string; dueDate: string }): Promise<WorkOrder> {
 const command = createMutationCommand('work_order.create');
 const result = await runServerIdempotentMutation(command, () => backendService.rpc<WorkOrder>('create_work_order_idempotent', { p_operation_id: command.operationId,
 p_title: input.title.trim(), p_category: input.category, p_instructions: input.instructions.trim(),
 p_assigned_crew: input.assignedCrew.trim(), p_section_id: input.sectionId, p_priority: input.priority, p_due_date: input.dueDate,
 }));
 return result;
 }
 async advance(id: string, nextStatus: WorkOrderStatus, expectedVersion?: string): Promise<void> {
 const current = await workOrderRepository.getById(id);
 if (!current) throw new Error('Work order was not found.');
 assertWorkflowTransition('work_order', String((current as any).status), nextStatus);
 const command = createMutationCommand('work_order.transition', expectedVersion ?? (current as any).updated_at);
 await runServerIdempotentMutation(command, () => backendService.rpc('advance_work_order_status_idempotent', { p_operation_id: command.operationId, p_work_order_id: id, p_next_status: nextStatus, p_expected_version: expectedVersion ?? null }));
 }
}
export const workOrderService = new WorkOrderService();
