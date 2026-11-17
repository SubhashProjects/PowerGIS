import { assetService } from './assetService';
import { faultService } from './faultService';
import { workOrderService } from './workOrderService';
import { ptwService } from './ptwService';
import { reliabilityService } from './reliabilityService';
import { surveyService } from './surveyService';
import { storesService } from './storesService';
import { specializedModuleService } from './specializedModuleService';

export type GlobalSearchCategory =
  | 'Asset' | 'Fault' | 'Work Order' | 'Permit' | 'Outage'
  | 'Survey' | 'Store' | 'Project' | 'Maintenance' | 'Disaster';

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: GlobalSearchCategory;
  target: string;
  record?: unknown;
}

const text = (value: unknown) => String(value ?? '').toLowerCase();
const matches = (record: unknown, query: string) => {
  const q = query.toLowerCase();
  return Object.values((record ?? {}) as Record<string, unknown>).some(value => text(value).includes(q));
};

export async function globalSearch(query: string, limitPerCategory = 6): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const results: GlobalSearchResult[] = [];
  const push = (category: GlobalSearchCategory, records: any[], titleKeys: string[], subtitleKeys: string[], target: string) => {
    records.filter(record => matches(record, q)).slice(0, limitPerCategory).forEach(record => {
      const title = titleKeys.map(k => record?.[k]).find(v => v !== undefined && v !== null && String(v).trim()) ?? record?.id;
      const subtitle = subtitleKeys.map(k => record?.[k]).find(v => v !== undefined && v !== null && String(v).trim()) ?? category;
      results.push({ id: String(record?.id ?? `${category}-${results.length}`), title: String(title), subtitle: String(subtitle), category, target, record });
    });
  };

  push('Asset', assetService.searchAssets(q), ['name','code','consumerNumber','poleNumber'], ['type','voltageClass','status'], 'assets');
  push('Fault', faultService.getFaults(false), ['faultNumber','title','id'], ['status','faultType','priority'], 'faults');
  push('Outage', reliabilityService.getOutages(undefined, false), ['outageNumber','id','title'], ['status','cause','sectionId'], 'outages');

  const [workOrders, permits, surveys, stores, projects, maintenance, disasters] = await Promise.allSettled([
    workOrderService.list(), ptwService.list(), Promise.resolve(surveyService.getSubmissions(false)), storesService.listItems(),
    specializedModuleService.listProjects(), specializedModuleService.listMaintenance(), specializedModuleService.listDisasters(),
  ]);
  if (workOrders.status === 'fulfilled') push('Work Order', workOrders.value, ['orderNumber','title','id'], ['status','priority','assignedCrew'], 'work-orders');
  if (permits.status === 'fulfilled') push('Permit', permits.value, ['permitNumber','title','id'], ['status','workType','requesterName'], 'ptw');
  if (surveys.status === 'fulfilled') push('Survey', surveys.value, ['surveyNumber','id','title'], ['status','surveyorName','sectionId'], 'surveys');
  if (stores.status === 'fulfilled') push('Store', stores.value, ['itemCode','name','id'], ['category','stock','unit'], 'stores');
  if (projects.status === 'fulfilled') push('Project', projects.value, ['projectCode','name','id'], ['status','projectType'], 'projects');
  if (maintenance.status === 'fulfilled') push('Maintenance', maintenance.value, ['taskNumber','title','id'], ['status','priority','assetCode'], 'maintenance');
  if (disasters.status === 'fulfilled') push('Disaster', disasters.value, ['eventNumber','title','id'], ['status','eventType','severity'], 'disasters');

  return results.slice(0, 40);
}
