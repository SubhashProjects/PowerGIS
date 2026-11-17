import { isSupabaseConfigured } from '../lib/supabase';
import { assetRepositories } from '../repositories/domain/AssetRepository';
import { workOrderRepository } from '../repositories/domain/WorkOrderRepository';
import { faultRepository } from '../repositories/domain/FaultRepository';
import { storesRepository } from '../repositories/domain/StoresRepository';
import { createRepository } from '../repositories/repositoryFactory';
import { getDataQualityIssues } from './dataQualityService';
import { offlineQueue } from '../lib/offlineQueue';

const surveyRepository = createRepository<any>('survey_submissions');
const ptwRepository = createRepository<any>('safety_permits');
const outageRepository = createRepository<any>('outages');

export interface OperationalDashboardSummary {
  network: { substations: number; feeders: number; transformers: number; poles: number; consumers: number };
  operations: { activeFaults: number; openWorkOrders: number; pendingPtws: number; pendingSurveys: number; activeOutages: number };
  exceptions: { criticalAssets: number; lowInventory: number; dataQualityIssues: number; failedSync: number };
  source: 'supabase' | 'simulator';
  loadedAt: string;
}

export async function getOperationalDashboardSummary(): Promise<OperationalDashboardSummary> {
  if (!isSupabaseConfigured) return { network:{substations:0,feeders:0,transformers:0,poles:0,consumers:0}, operations:{activeFaults:0,openWorkOrders:0,pendingPtws:0,pendingSurveys:0,activeOutages:0}, exceptions:{criticalAssets:0,lowInventory:0,dataQualityIssues:0,failedSync:0}, source:'simulator', loadedAt:new Date().toISOString() };
  const [substations, feeders, transformers, poles, consumers, faults, workOrders, stores, surveys, ptws, outages, quality] = await Promise.all([
    assetRepositories.substations.list(), assetRepositories.feeders.list(), assetRepositories.transformers.list(), assetRepositories.poles.list(), assetRepositories.consumers.list(),
    faultRepository.list(), workOrderRepository.list(), storesRepository.list(), surveyRepository.list(), ptwRepository.list(), outageRepository.list(), getDataQualityIssues(),
  ]);
  const activeFaults = faults.filter((f:any)=>['new','assigned','in_progress'].includes(f.status)).length;
  const openWorkOrders = workOrders.filter((w:any)=>!['completed','closed','cancelled'].includes(w.status)).length;
  const criticalAssets = transformers.filter((t:any)=>Number(t.load_percentage ?? t.loadPercentage ?? 0) >= 90 || Boolean(t.has_oil_leakage ?? t.hasOilLeakage)).length;
  const lowInventory = stores.filter((s:any)=>Number(s.current_stock ?? s.currentStock ?? 0) <= Number(s.reorder_level ?? s.reorderLevel ?? 0)).length;
  return { network:{substations:substations.length,feeders:feeders.length,transformers:transformers.length,poles:poles.length,consumers:consumers.length}, operations:{activeFaults,openWorkOrders,pendingPtws:ptws.filter((p:any)=>['requested','issued'].includes(p.status)).length,pendingSurveys:surveys.filter((s:any)=>['submitted','je_verified'].includes(s.status)).length,activeOutages:outages.filter((o:any)=>o.status==='active').length}, exceptions:{criticalAssets,lowInventory,dataQualityIssues:quality.length,failedSync:offlineQueue.getSummary().failed}, source:'supabase', loadedAt:new Date().toISOString() };
}
