import { isSupabaseConfigured } from '../lib/supabase';
import { specializedModuleRepository } from '../repositories/domain/SpecializedModuleRepository';
import { backendService } from './backendService';

export interface ProjectPackage {
  id: string;
  schemeCode: string;
  title: string;
  category: string;
  scopeMetric: string;
  sanctionedBudgetCr: number;
  expenditureCr: number;
  physicalProgressPct: number;
  contractor: string;
  targetDate: string;
  status: string;
  corridor: string;
  milestones: Array<{ title: string; completed: boolean; date: string }>;
}

export interface MaintenanceTask {
  id: string;
  assetId?: string;
  assetCode: string;
  assetName: string;
  maintenanceType: string;
  scheduledDate: string;
  cycle: string;
  priority: string;
  triggerReason: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
}

export interface DisasterRecord {
  id: string;
  code: string;
  eventType: string;
  name: string;
  affectedRegions: string[];
  startDate: string;
  status: 'active' | 'restoration_in_progress' | 'closed';
  damagedPolesCount: number;
  damagedDTsCount: number;
  snappedConductorsKm: number;
  restorationPct: number;
}

const configured = () => isSupabaseConfigured;

export const specializedModuleService = {
  async listProjects(): Promise<ProjectPackage[]> {
    backendService.ensureConfigured();
    const data = await specializedModuleRepository.listProjects();
    return data.map((r: any) => ({
      id: r.id, schemeCode: r.scheme_code, title: r.title, category: r.category,
      scopeMetric: r.scope_metric, sanctionedBudgetCr: Number(r.sanctioned_budget_cr),
      expenditureCr: Number(r.expenditure_cr), physicalProgressPct: Number(r.physical_progress_pct),
      contractor: r.contractor ?? '', targetDate: r.target_date, status: r.status,
      corridor: r.corridor ?? '', milestones: Array.isArray(r.milestones) ? r.milestones : [],
    }));
  },

  async createProjectPackage(input: Omit<ProjectPackage, 'id'|'status'> & { regionId?: string|null; divisionId?: string|null; sectionId?: string|null }): Promise<ProjectPackage> {
    backendService.ensureConfigured();
    return backendService.rpc<ProjectPackage>('create_capital_project_package', {
      p_scheme_code: input.schemeCode, p_title: input.title, p_category: input.category, p_scope_metric: input.scopeMetric,
      p_sanctioned_budget_cr: input.sanctionedBudgetCr, p_expenditure_cr: input.expenditureCr,
      p_physical_progress_pct: input.physicalProgressPct, p_contractor: input.contractor || null,
      p_target_date: input.targetDate || null, p_corridor: input.corridor || null, p_milestones: input.milestones || [],
      p_region_id: input.regionId ?? null, p_division_id: input.divisionId ?? null, p_section_id: input.sectionId ?? null,
    });
  },

  async updateProjectMilestone(projectId: string, milestoneIndex: number, completed: boolean): Promise<ProjectPackage> {
    backendService.ensureConfigured();
    return backendService.rpc<ProjectPackage>('update_capital_project_milestone', {
      p_project_id: projectId, p_milestone_index: milestoneIndex, p_completed: completed,
    });
  },

  async listMaintenance(): Promise<MaintenanceTask[]> {
    backendService.ensureConfigured();
    const data = await specializedModuleRepository.listMaintenance();
    return data.map((r: any) => ({
      id: r.id, assetId: r.asset_id ?? undefined, assetCode: r.asset_code,
      assetName: r.asset_name, maintenanceType: r.maintenance_type,
      scheduledDate: r.scheduled_date, cycle: r.cycle, priority: r.priority,
      triggerReason: r.trigger_reason, status: r.status,
    }));
  },

  async createMaintenanceTask(input: Omit<MaintenanceTask, 'id'|'status'> & { regionId?: string|null; divisionId?: string|null; sectionId?: string|null }): Promise<MaintenanceTask> {
    backendService.ensureConfigured();
    return backendService.rpc<MaintenanceTask>('create_maintenance_task', {
      p_asset_id: input.assetId ?? null, p_asset_code: input.assetCode, p_asset_name: input.assetName,
      p_maintenance_type: input.maintenanceType, p_scheduled_date: input.scheduledDate, p_cycle: input.cycle,
      p_priority: input.priority, p_trigger_reason: input.triggerReason, p_region_id: input.regionId ?? null,
      p_division_id: input.divisionId ?? null, p_section_id: input.sectionId ?? null,
    });
  },

  async completeMaintenance(taskId: string): Promise<MaintenanceTask> {
    backendService.ensureConfigured();
    return backendService.rpc<MaintenanceTask>('complete_maintenance_task', { p_task_id: taskId });
  },

  async listDisasters(): Promise<DisasterRecord[]> {
    backendService.ensureConfigured();
    const data = await specializedModuleRepository.listDisasters();
    return data.map((r: any) => ({
      id: r.id, code: r.code, eventType: r.event_type, name: r.name,
      affectedRegions: r.affected_regions ?? [], startDate: r.start_date, status: r.status,
      damagedPolesCount: Number(r.damaged_poles_count ?? 0), damagedDTsCount: Number(r.damaged_dts_count ?? 0),
      snappedConductorsKm: Number(r.snapped_conductors_km ?? 0), restorationPct: Number(r.restoration_pct ?? 0),
    }));
  },

  async updateDisaster(id: string, patch: Partial<Omit<DisasterRecord, 'id'>>): Promise<DisasterRecord> {
    backendService.ensureConfigured();
    return backendService.rpc<DisasterRecord>('update_disaster_event', { p_event_id: id, p_patch: patch });
  },

  async getTransformerRisk(transformerId: string): Promise<Record<string, unknown>> {
    backendService.ensureConfigured();
    return backendService.rpc<Record<string, unknown>>('calculate_transformer_risk_score', { p_transformer_id: transformerId });
  },

  async getTransformerRisks(transformerIds: string[]): Promise<Record<string, Record<string, unknown>>> {
    const entries = await Promise.all(transformerIds.map(async id => [id, await this.getTransformerRisk(id)] as const));
    return Object.fromEntries(entries);
  },

  isConfigured: configured,
};
