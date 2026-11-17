import { isSupabaseConfigured } from '../lib/supabase';
import { workOrderRepository } from '../repositories/domain/WorkOrderRepository';
import { storesRepository } from '../repositories/domain/StoresRepository';
import { backendService } from './backendService';
import { createMutationCommand, runServerIdempotentMutation } from '../lib/mutationCommand';
import type { StoresItem } from '../types/operations';

export interface InventoryTransactionInput {
 itemId: string;
 transactionType: 'receipt' | 'issue' | 'return' | 'reconciliation' | 'transfer' | 'damaged';
 quantity: number;
 workOrderId?: string;
 recipientName?: string;
 remarks?: string;
}

export class StoresService {
 async listItems(): Promise<StoresItem[]> {
 if (!isSupabaseConfigured) return [];
 const data = await storesRepository.list({ orderBy: 'item_code', ascending: true });
 return data.map((row: any) => ({
 id: row.id, itemCode: row.item_code ?? row.itemCode, name: row.name, category: row.category,
 unitOfMeasure: row.unit_of_measure ?? row.unitOfMeasure, currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
 reorderLevel: Number(row.reorder_level ?? row.reorderLevel ?? 0), unitCostINR: Number(row.unit_cost_inr ?? row.unitCostINR ?? 0), sectionId: row.section_id ?? row.sectionId,
 }));
 }

 async issue(input: InventoryTransactionInput & { workOrderNumber?: string }): Promise<{ transactionId: string; newStock: number }> {
 if (!isSupabaseConfigured) throw new Error('Stores backend is not configured.');
 if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
 throw new Error('Quantity must be greater than zero.');
 }
 let workOrderId = input.workOrderId ?? null;
 if (!workOrderId && input.workOrderNumber) {
 const matches = await workOrderRepository.list({ filters: { order_number: input.workOrderNumber.trim() }, limit: 1 });
 if (!matches[0]) throw new Error(`Work order ${input.workOrderNumber} was not found.`);
 workOrderId = matches[0].id;
 }
 const command = createMutationCommand('inventory.issue');
 const result = await runServerIdempotentMutation(command, () => backendService.rpc<{ transaction_id: string; new_stock: number }>('issue_inventory_atomic_idempotent', { p_operation_id: command.operationId,
 p_item_id: input.itemId,
 p_quantity: input.quantity,
 p_work_order_id: workOrderId, 
 p_recipient_name: input.recipientName ?? null,
 p_remarks: input.remarks ?? null,
 }), { entityType: 'inventory', entityId: input.itemId, payload: { p_item_id:input.itemId, p_quantity:input.quantity, p_work_order_id:workOrderId, p_recipient_name:input.recipientName ?? null, p_remarks:input.remarks ?? null } });
 return { transactionId: result.transaction_id, newStock: Number(result.new_stock) };
 }

 async recordTransaction(input: InventoryTransactionInput): Promise<string> {
 if (!isSupabaseConfigured) throw new Error('Stores backend is not configured.');
 if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
 throw new Error('Quantity must be greater than zero.');
 }
 const command = createMutationCommand('inventory.transaction');
 const result = await runServerIdempotentMutation(command, () => backendService.rpc<string>('record_inventory_transaction_idempotent', { p_operation_id: command.operationId,
 p_item_id: input.itemId,
 p_transaction_type: input.transactionType,
 p_quantity: input.quantity,
 p_work_order_id: input.workOrderId ?? null,
 p_recipient_name: input.recipientName ?? null,
 p_remarks: input.remarks ?? null,
 }), { entityType: 'inventory', entityId: input.itemId, payload: { p_item_id:input.itemId, p_transaction_type:input.transactionType, p_quantity:input.quantity, p_work_order_id:input.workOrderId ?? null, p_recipient_name:input.recipientName ?? null, p_remarks:input.remarks ?? null } });
 return String(result);
 }
}

export const storesService = new StoresService();
