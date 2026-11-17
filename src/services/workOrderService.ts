import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { backendService } from './backendService';
import type { WorkOrder, WorkOrderStatus } from '../types/operations';

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
 const { data, error } = await supabase.from('work_orders').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 return (data ?? []).map(mapOrder);
 }
 async create(input: { title: string; category: string; instructions: string; assignedCrew: string; sectionId: string; priority: string; dueDate: string }): Promise<WorkOrder> {
 const result = await backendService.rpc<WorkOrder>('create_work_order', {
 p_title: input.title.trim(), p_category: input.category, p_instructions: input.instructions.trim(),
 p_assigned_crew: input.assignedCrew.trim(), p_section_id: input.sectionId, p_priority: input.priority, p_due_date: input.dueDate,
 });
 return result;
 }
 async advance(id: string, nextStatus: WorkOrderStatus): Promise<void> {
 await backendService.rpc('advance_work_order_status', { p_work_order_id: id, p_next_status: nextStatus });
 }
}
export const workOrderService = new WorkOrderService();
