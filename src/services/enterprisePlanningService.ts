import type { EquipmentLifecycleRecord, WarrantyRecord } from '../types/assets';
import type { StoresItem, WorkOrder } from '../types/operations';

export type PlanningPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export interface PlanningRecommendation {
  id: string;
  priority: PlanningPriority;
  category: 'Replacement' | 'Warranty' | 'Inventory' | 'Work order' | 'Maintenance';
  title: string;
  detail: string;
  sourceId: string;
  actionTab: 'asset_lifecycle' | 'warranties' | 'stores' | 'work_orders' | 'preventive';
}

const dayMs = 86_400_000;
const safeDate = (value: string): number | null => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

export function calculateStraightLineDepreciation(input: {
  acquisitionCostINR: number;
  residualValueINR: number;
  usefulLifeYears: number;
  ageYears: number;
}) {
  const { acquisitionCostINR: cost, residualValueINR: residual, usefulLifeYears: life, ageYears: age } = input;
  if (![cost, residual, life, age].every(Number.isFinite)) throw new Error('All financial inputs must be finite numbers.');
  if (cost < 0 || residual < 0 || residual > cost) throw new Error('Cost and residual value are invalid. Residual value cannot exceed acquisition cost.');
  if (life <= 0 || age < 0) throw new Error('Useful life must be positive and asset age cannot be negative.');
  const annualDepreciationINR = (cost - residual) / life;
  const accumulatedDepreciationINR = Math.min(cost - residual, annualDepreciationINR * age);
  return {
    annualDepreciationINR,
    accumulatedDepreciationINR,
    estimatedBookValueINR: Math.max(residual, cost - accumulatedDepreciationINR),
    remainingLifeYears: Math.max(0, life - age),
    isFullyDepreciated: age >= life,
  };
}

export function calculateReorderQuantity(item: Pick<StoresItem, 'currentStock' | 'reorderLevel'>, targetStock?: number): number {
  const stock = Number(item.currentStock);
  const reorder = Number(item.reorderLevel);
  const target = targetStock === undefined ? Math.max(reorder * 2, reorder + 1) : Number(targetStock);
  if (![stock, reorder, target].every(Number.isFinite) || stock < 0 || reorder < 0 || target < reorder) {
    throw new Error('Inventory levels are invalid.');
  }
  return stock <= reorder ? Math.max(0, target - stock) : 0;
}

export function getWorkOrderDueState(order: Pick<WorkOrder, 'dueDate' | 'status'>, now = Date.now()) {
  const due = safeDate(order.dueDate);
  if (!due) return { state: 'unknown' as const, daysRemaining: null };
  if (['completed', 'verified', 'closed'].includes(order.status)) return { state: 'complete' as const, daysRemaining: Math.ceil((due - now) / dayMs) };
  const daysRemaining = Math.ceil((due - now) / dayMs);
  return { state: daysRemaining < 0 ? 'overdue' as const : daysRemaining === 0 ? 'due_today' as const : 'on_track' as const, daysRemaining };
}

export function buildPlanningRecommendations(input: {
  lifecycles: EquipmentLifecycleRecord[];
  warranties: WarrantyRecord[];
  inventory: StoresItem[];
  workOrders: WorkOrder[];
  now?: number;
}): PlanningRecommendation[] {
  const now = input.now ?? Date.now();
  const result: PlanningRecommendation[] = [];
  input.lifecycles.forEach(asset => {
    if (asset.isExpired || asset.replacementPriority === 'Critical' || asset.conditionScore <= 25) {
      result.push({ id: `replace-${asset.id}`, priority: 'Critical', category: 'Replacement', title: `Review replacement: ${asset.assetCode}`, detail: asset.isExpired ? 'Design life has been exceeded.' : `Condition score is ${asset.conditionScore}/100; replacement priority is ${asset.replacementPriority}.`, sourceId: asset.id, actionTab: 'asset_lifecycle' });
    } else if (asset.replacementPriority === 'High' || asset.conditionScore <= 50) {
      result.push({ id: `condition-${asset.id}`, priority: 'High', category: 'Maintenance', title: `Inspect asset: ${asset.assetCode}`, detail: `Condition score ${asset.conditionScore}/100 or high replacement priority requires review.`, sourceId: asset.id, actionTab: 'preventive' });
    }
  });
  input.warranties.forEach(warranty => {
    const expiry = safeDate(warranty.expiryDate);
    if (warranty.claimStatus !== 'claimed' && expiry !== null && expiry >= now && expiry - now <= 60 * dayMs) {
      result.push({ id: `warranty-${warranty.id}`, priority: 'Medium', category: 'Warranty', title: `Warranty action: ${warranty.equipmentCode}`, detail: `Warranty expires on ${warranty.expiryDate}. Review coverage and claim requirements.`, sourceId: warranty.id, actionTab: 'warranties' });
    }
  });
  input.inventory.forEach(item => {
    const quantity = calculateReorderQuantity(item);
    if (quantity > 0) result.push({ id: `stock-${item.id}`, priority: item.currentStock <= 0 ? 'Critical' : 'High', category: 'Inventory', title: `Replenish: ${item.itemCode}`, detail: `Available ${item.currentStock} ${item.unitOfMeasure}; reorder level ${item.reorderLevel}; suggested replenishment ${quantity}.`, sourceId: item.id, actionTab: 'stores' });
  });
  input.workOrders.forEach(order => {
    const due = getWorkOrderDueState(order, now);
    if (due.state === 'overdue') result.push({ id: `overdue-${order.id}`, priority: 'High', category: 'Work order', title: `Overdue work order: ${order.orderNumber}`, detail: `Status ${order.status}; due date ${order.dueDate}. Review assignment and blockers.`, sourceId: order.id, actionTab: 'work_orders' });
  });
  const rank: Record<PlanningPriority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return result.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title));
}

export function buildAssetLabelPayload(asset: Pick<EquipmentLifecycleRecord, 'assetCode' | 'assetId' | 'assetType'>): string {
  const code = asset.assetCode.trim();
  const id = asset.assetId.trim();
  if (!code || !id) throw new Error('An asset code and canonical asset ID are required.');
  return `POWERGIS-ASSET|${encodeURIComponent(asset.assetType)}|${encodeURIComponent(code)}|${encodeURIComponent(id)}`;
}
