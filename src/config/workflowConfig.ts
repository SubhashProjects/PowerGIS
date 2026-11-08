// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// WORKFLOW & LIFECYCLE CONFIGURATION (SSOT)
// 8-Stage Fault Progression, IEEE/JERC SLA Deadlines & 5-Stage Kanban Board
// ============================================================================

import { FaultPriority, FaultStatus, WorkOrderStatus } from '../types/operations';

// SLA Allowed Durations (Hours) per Section 9.2
export const SLA_HOURS: Record<FaultPriority, number> = {
  critical: 4,  // Feeder breakdown (Mandatory 4-hour clearance)
  high: 8,      // DTR fuse failure
  medium: 24,   // Low voltage / leaning pole
  low: 72,      // Vegetation / meter inspection
};

// 8-Stage Fault Ticket Lifecycle
export interface StageDefinition {
  key: FaultStatus;
  label: string;
  stageNum: number;
  description: string;
}

export const FAULT_LIFECYCLE_STAGES: StageDefinition[] = [
  { key: 'new', label: '1. Logged', stageNum: 1, description: 'Fault reported & geocoded' },
  { key: 'assigned', label: '2. Assigned', stageNum: 2, description: 'Field gang dispatched' },
  { key: 'acknowledged', label: '3. Accepted', stageNum: 3, description: 'Crew on site' },
  { key: 'in_progress', label: '4. In Progress', stageNum: 4, description: 'Line repairs active' },
  { key: 'material_required', label: '5. On Hold', stageNum: 5, description: 'Store requisition pending' },
  { key: 'completed', label: '6. Resolved', stageNum: 6, description: 'Line physically restored' },
  { key: 'verified', label: '7. Verified', stageNum: 7, description: 'JE physical test & sign-off' },
  { key: 'closed', label: '8. Closed', stageNum: 8, description: 'AE final statutory closure' },
];

export const getStageIndex = (status: FaultStatus): number => {
  const idx = FAULT_LIFECYCLE_STAGES.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
};

// 5-Stage Work Order Kanban Board Columns
export interface KanbanColumnDef {
  id: WorkOrderStatus;
  title: string;
  topBorder: string;
  badgeBg: string;
  description: string;
}

export const WORK_ORDER_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'assigned',
    title: '1. Assigned to Crew',
    topBorder: 'border-t-4 border-t-blue-500',
    badgeBg: 'bg-blue-100 text-blue-800',
    description: 'Work order generated and assigned to breakdown gang',
  },
  {
    id: 'in_progress',
    title: '2. In Progress / On Site',
    topBorder: 'border-t-4 border-t-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800',
    description: 'Crew on site with active safety PTW clearance',
  },
  {
    id: 'completed',
    title: '3. Work Completed',
    topBorder: 'border-t-4 border-t-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    description: 'Work done, materials logged, ready for inspection',
  },
  {
    id: 'verified',
    title: '4. JE Verified',
    topBorder: 'border-t-4 border-t-purple-500',
    badgeBg: 'bg-purple-100 text-purple-800',
    description: 'Junior Engineer physical inspection and snapping verification',
  },
  {
    id: 'closed',
    title: '5. AE Approved & Closed',
    topBorder: 'border-t-4 border-t-teal-600',
    badgeBg: 'bg-teal-100 text-teal-800',
    description: 'Assistant Engineer final statutory approval and work closure',
  },
];
