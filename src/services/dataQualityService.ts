import { assetRepositories } from '../repositories/domain/AssetRepository';
import { faultRepository } from '../repositories/domain/FaultRepository';
import { workOrderRepository } from '../repositories/domain/WorkOrderRepository';
import { storesRepository } from '../repositories/domain/StoresRepository';
import { outageRepository } from '../repositories/domain/OutageRepository';
import { surveyRepository } from '../repositories/domain/SurveyRepository';
import { ptwRepository } from '../repositories/domain/PtwRepository';

export interface DataQualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  entity: string;
  recordId?: string;
  message: string;
}

async function createRepositorySafe(table: string): Promise<any[]> {
  try { const { createRepository } = await import('../repositories/repositoryFactory'); return createRepository<any>(table).list(); } catch { return []; }
}

export async function getDataQualityIssues(): Promise<DataQualityIssue[]> {
  const issues: DataQualityIssue[] = [];
  const [substations, feeders, transformers, poles, consumers, faults, workOrders, stores, outages, surveys, ptws] = await Promise.all([
    assetRepositories.substations.list(), assetRepositories.feeders.list(), assetRepositories.transformers.list(),
    assetRepositories.poles.list(), assetRepositories.consumers.list(), faultRepository.list(), workOrderRepository.list(),
    storesRepository.list(), outageRepository.list(), surveyRepository.submissions(), ptwRepository.list(),
  ]);
  const checkIds = (entity: string, records: any[]) => {
    const seen = new Set<string>();
    records.forEach(r => {
      if (!r.id) issues.push({ id: `${entity}-missing-id`, severity: 'critical', entity, message: 'Record is missing an id.' });
      else if (seen.has(String(r.id))) issues.push({ id: `${entity}-duplicate-${r.id}`, severity: 'high', entity, recordId: String(r.id), message: 'Duplicate record id detected.' });
      else seen.add(String(r.id));
    });
  };
  checkIds('substations', substations); checkIds('feeders', feeders); checkIds('transformers', transformers); checkIds('poles', poles);
  checkIds('consumers', consumers); checkIds('faults', faults); checkIds('work_orders', workOrders); checkIds('stores_inventory', stores);
  checkIds('outages', outages); checkIds('survey_submissions', surveys); checkIds('safety_permits', ptws);
  transformers.forEach((t: any) => {
    const load = Number(t.load_percentage ?? t.loadPercentage ?? 0);
    if (load > 100) issues.push({ id:`transformer-load-${t.id}`, severity:'high', entity:'transformers', recordId:t.id, message:'Transformer load exceeds 100%.' });
    const coords = t.coordinates ?? (t.geom?.coordinates ? [t.geom.coordinates[1], t.geom.coordinates[0]] : undefined);
    if (!coords || !Number.isFinite(Number(coords[0])) || !Number.isFinite(Number(coords[1]))) issues.push({ id:`transformer-geometry-${t.id}`, severity:'medium', entity:'transformers', recordId:t.id, message:'Transformer has missing or invalid coordinates.' });
  });
  const feederIds = new Set(feeders.map((f:any) => String(f.id)));
  const sectionIds = new Set((await createRepositorySafe('om_sections')).map((r:any) => String(r.id)));
  faults.forEach((f:any) => {
    if (f.feeder_id && !feederIds.has(String(f.feeder_id))) issues.push({ id:`fault-orphan-feeder-${f.id}`, severity:'high', entity:'faults', recordId:String(f.id), message:'Fault references a feeder that does not exist.' });
    if (f.section_id && sectionIds.size && !sectionIds.has(String(f.section_id))) issues.push({ id:`fault-orphan-section-${f.id}`, severity:'high', entity:'faults', recordId:String(f.id), message:'Fault references a section that does not exist.' });
  });
  workOrders.forEach((w:any) => {
    if (w.section_id && sectionIds.size && !sectionIds.has(String(w.section_id))) issues.push({ id:`wo-orphan-section-${w.id}`, severity:'high', entity:'work_orders', recordId:String(w.id), message:'Work order references a section that does not exist.' });
    if (w.status && !['assigned','in_progress','completed','verified','closed','cancelled'].includes(String(w.status))) issues.push({ id:`wo-invalid-status-${w.id}`, severity:'critical', entity:'work_orders', recordId:String(w.id), message:`Unsupported work-order status: ${w.status}.` });
  });
  outages.forEach((o:any) => {
    if (o.feeder_id && !feederIds.has(String(o.feeder_id))) issues.push({ id:`outage-orphan-feeder-${o.id}`, severity:'high', entity:'outages', recordId:String(o.id), message:'Outage references a feeder that does not exist.' });
  });
  stores.forEach((s:any) => {
    const stock=Number(s.current_stock ?? s.currentStock ?? 0), reorder=Number(s.reorder_level ?? s.reorderLevel ?? 0);
    if (stock < 0) issues.push({ id:`stock-negative-${s.id}`, severity:'critical', entity:'stores_inventory', recordId:s.id, message:'Inventory quantity is negative.' });
    if (reorder < 0) issues.push({ id:`stock-reorder-${s.id}`, severity:'medium', entity:'stores_inventory', recordId:s.id, message:'Reorder level is negative.' });
  });
  return issues;
}
