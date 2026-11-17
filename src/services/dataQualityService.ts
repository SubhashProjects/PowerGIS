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
  const checkCodes = (entity: string, records: any[], fields = ['code', 'asset_code', 'consumer_number', 'ptwNumber', 'ptw_number']) => {
    const seen = new Map<string, string>();
    records.forEach(record => {
      const field = fields.find(key => record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '');
      if (!field) {
        issues.push({ id: `${entity}-missing-code-${record.id}`, severity: 'medium', entity, recordId: String(record.id ?? ''), message: 'Record has no populated business code or reference number.' });
        return;
      }
      const code = String(record[field]).trim().toLowerCase();
      const previous = seen.get(code);
      if (previous) issues.push({ id: `${entity}-duplicate-code-${record.id}`, severity: 'high', entity, recordId: String(record.id), message: `Duplicate business code detected: ${record[field]}.` });
      else seen.set(code, String(record.id));
    });
  };
  checkCodes('substations', substations); checkCodes('feeders', feeders); checkCodes('transformers', transformers);
  checkCodes('poles', poles); checkCodes('consumers', consumers);
  transformers.forEach((t: any) => {
    const load = Number(t.load_percentage ?? t.loadPercentage ?? 0);
    if (load > 100) issues.push({ id:`transformer-load-${t.id}`, severity:'high', entity:'transformers', recordId:t.id, message:'Transformer load exceeds 100%.' });
    const coords = t.coordinates ?? (t.geom?.coordinates ? [t.geom.coordinates[1], t.geom.coordinates[0]] : undefined);
    if (!coords || !Number.isFinite(Number(coords[0])) || !Number.isFinite(Number(coords[1]))) issues.push({ id:`transformer-geometry-${t.id}`, severity:'medium', entity:'transformers', recordId:t.id, message:'Transformer has missing or invalid coordinates.' });
  });
  const feederIds = new Set(feeders.map((f:any) => String(f.id)));
  const substationIds = new Set(substations.map((r:any) => String(r.id)));
  const transformerIds = new Set(transformers.map((r:any) => String(r.id)));
  const poleIds = new Set(poles.map((r:any) => String(r.id)));
  const checkGeometry = (entity: string, records: any[]) => records.forEach((record: any) => {
    const coords = record.coordinates ?? record.geom?.coordinates;
    if (!coords) return;
    const positions = Array.isArray(coords[0]) ? coords : [coords];
    const invalid = positions.some((point: any) => !Array.isArray(point) || point.length < 2 || !Number.isFinite(Number(point[0])) || !Number.isFinite(Number(point[1])) || !(Math.abs(Number(point[0])) <= 90 && Math.abs(Number(point[1])) <= 180) && !(Math.abs(Number(point[0])) <= 180 && Math.abs(Number(point[1])) <= 90));
    if (invalid) issues.push({ id: `${entity}-invalid-coordinate-${record.id}`, severity: 'high', entity, recordId: String(record.id), message: 'Geographic coordinates are outside valid latitude/longitude ranges.' });
  });
  checkGeometry('substations', substations); checkGeometry('feeders', feeders); checkGeometry('transformers', transformers);
  checkGeometry('poles', poles); checkGeometry('consumers', consumers);
  feeders.forEach((f:any) => {
    const substation = f.substationId ?? f.substation_id;
    if (substation && !substationIds.has(String(substation))) issues.push({ id: `feeder-orphan-substation-${f.id}`, severity: 'high', entity: 'feeders', recordId: String(f.id), message: 'Feeder references a substation that does not exist.' });
  });
  transformers.forEach((t:any) => {
    const feeder = t.feederId ?? t.feeder_id;
    if (feeder && !feederIds.has(String(feeder))) issues.push({ id: `transformer-orphan-feeder-${t.id}`, severity: 'high', entity: 'transformers', recordId: String(t.id), message: 'Transformer references a feeder that does not exist.' });
    if (Number(t.capacityKVA ?? t.capacity_kva ?? 0) < 0) issues.push({ id: `transformer-negative-capacity-${t.id}`, severity: 'critical', entity: 'transformers', recordId: String(t.id), message: 'Transformer capacity cannot be negative.' });
  });
  poles.forEach((p:any) => {
    const feeder = p.feederId ?? p.feeder_id;
    const transformer = p.transformerId ?? p.transformer_id;
    if (feeder && !feederIds.has(String(feeder))) issues.push({ id: `pole-orphan-feeder-${p.id}`, severity: 'high', entity: 'poles', recordId: String(p.id), message: 'Pole references a feeder that does not exist.' });
    if (transformer && !transformerIds.has(String(transformer))) issues.push({ id: `pole-orphan-transformer-${p.id}`, severity: 'high', entity: 'poles', recordId: String(p.id), message: 'Pole references a transformer that does not exist.' });
  });
  consumers.forEach((c:any) => {
    const feeder = c.feederId ?? c.feeder_id, transformer = c.transformerId ?? c.transformer_id, pole = c.poleId ?? c.pole_id;
    if (feeder && !feederIds.has(String(feeder))) issues.push({ id: `consumer-orphan-feeder-${c.id}`, severity: 'high', entity: 'consumers', recordId: String(c.id), message: 'Consumer references a feeder that does not exist.' });
    if (transformer && !transformerIds.has(String(transformer))) issues.push({ id: `consumer-orphan-transformer-${c.id}`, severity: 'high', entity: 'consumers', recordId: String(c.id), message: 'Consumer references a transformer that does not exist.' });
    if (pole && !poleIds.has(String(pole))) issues.push({ id: `consumer-orphan-pole-${c.id}`, severity: 'high', entity: 'consumers', recordId: String(c.id), message: 'Consumer references a pole that does not exist.' });
    if (Number(c.sanctionedLoadKW ?? c.sanctioned_load_kw ?? 0) < 0) issues.push({ id: `consumer-negative-load-${c.id}`, severity: 'medium', entity: 'consumers', recordId: String(c.id), message: 'Consumer sanctioned load cannot be negative.' });
  });
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
