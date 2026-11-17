import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { backendService } from './backendService';
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
 const { data, error } = await supabase
 .from('stores_inventory')
 .select('*')
 .order('item_code');
 if (error) throw error;
 return (data ?? []).map((row: any) => ({
 id: row.id,
 itemCode: row.item_code,
 name: row.name,
 category: row.category,
 unitOfMeasure: row.unit_of_measure,
 currentStock: Number(row.current_stock ?? 0),
 reorderLevel: Number(row.reorder_level ?? 0),
 unitCostINR: Number(row.unit_cost_inr ?? 0),
 sectionId: row.section_id,
 }));
 }

 async issue(input: InventoryTransactionInput & { workOrderNumber?: string }): Promise<{ transactionId: string; newStock: number }> {
 if (!isSupabaseConfigured) throw new Error('Stores backend is not configured.');
 if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
 throw new Error('Quantity must be greater than zero.');
 }
 let workOrderId = input.workOrderId ?? null;
 if (!workOrderId && input.workOrderNumber) {
 const { data, error } = await supabase.from('work_orders').select('id').eq('order_number', input.workOrderNumber.trim()).maybeSingle();
 if (error) throw error;
 if (!data) throw new Error(`Work order ${input.workOrderNumber} was not found.`);
 workOrderId = data.id;
 }
 const result = await backendService.rpc<{ transaction_id: string; new_stock: number }>('issue_inventory_atomic', {
 p_item_id: input.itemId,
 p_quantity: input.quantity,
 p_work_order_id: workOrderId, 
 p_recipient_name: input.recipientName ?? null,
 p_remarks: input.remarks ?? null,
 });
 return { transactionId: result.transaction_id, newStock: Number(result.new_stock) };
 }

 async recordTransaction(input: InventoryTransactionInput): Promise<string> {
 if (!isSupabaseConfigured) throw new Error('Stores backend is not configured.');
 if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
 throw new Error('Quantity must be greater than zero.');
 }
 const { data, error } = await supabase.rpc('record_inventory_transaction', {
 p_item_id: input.itemId,
 p_transaction_type: input.transactionType,
 p_quantity: input.quantity,
 p_work_order_id: input.workOrderId ?? null,
 p_recipient_name: input.recipientName ?? null,
 p_remarks: input.remarks ?? null,
 });
 if (error) throw error;
 return String(data);
 }
}

export const storesService = new StoresService();
