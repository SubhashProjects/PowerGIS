// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// DOMAIN TYPES: FAULTS, WORK ORDERS, SCADA, OUTAGES, SAFETY (PTW) & STORES
// ============================================================================

export type FaultPriority = 'critical' | 'high' | 'medium' | 'low';
export type FaultStatus =
  | 'new'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'material_required'
  | 'awaiting_approval'
  | 'completed'
  | 'verified'
  | 'closed'
  | 'reopened';

export interface Fault {
  id: string;
  faultCode: string;
  category: string;
  description: string;
  priority: FaultPriority;
  status: FaultStatus;
  feederId?: string;
  transformerId?: string;
  poleId?: string;
  sectionId: string;
  jeJurisdictionId?: string;
  reportedBy: string;
  assignedTo?: string;
  contractorId?: string;
  distanceFromPoleM?: number;
  distanceFromDtM?: number;
  distanceAlongFeederM?: number;
  distanceFromOfficeKm?: number;
  affectedConsumersEst: number;
  photoUrl?: string;
  restorationPhotoUrl?: string;
  reportedAt: string;
  resolvedAt?: string;
  coordinates: [number, number];
}

export type WorkOrderPriority = 'critical' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'assigned' | 'in_progress' | 'completed' | 'verified' | 'closed';

export interface WorkOrder {
  id: string;
  orderNumber: string;
  faultId?: string;
  title: string;
  category: string;
  instructions: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedCrew: string;
  contractorId?: string;
  sectionId: string;
  jeVerified: boolean;
  aeApproved: boolean;
  materialsUsed?: string;
  dueDate: string;
  completedAt?: string;
}

export interface Outage {
  id: string;
  outageCode: string;
  feederId?: string;
  transformerId?: string;
  outageType: 'Planned' | 'Emergency' | 'Load Shedding';
  reason: string;
  startTime: string;
  expectedRestoration: string;
  actualRestoration?: string;
  durationMinutes?: number;
  affectedConsumersCount: number;
  energyNotServedKWh: number;
  sectionId: string;
  status: 'active' | 'restored';
}

export interface OutageReliabilityMetrics {
  id: string;
  sectionId: string;
  feederId?: string;
  calculationPeriod: string;
  totalConsumersServed: number;
  saifi: number;  // System Average Interruption Frequency Index
  saidi: number;  // System Average Interruption Duration Index (min)
  caidi: number;  // Customer Average Interruption Duration Index (min)
  maifi: number;  // Momentary Average Interruption Frequency Index
  ensMWh: number; // Energy Not Served (MWh)
}

export interface SafetyPermit {
  id: string;
  ptwNumber: string;
  feederId: string;
  feederCode: string;
  applicantName: string;
  issuingOfficerName: string;
  workDescription: string;
  isolationPoints: string;
  earthingConfirmed: boolean;
  dangerNoticesPosted: boolean;
  gasDischargeTested: boolean;
  status: 'requested' | 'approved' | 'isolated' | 'restored' | 'cancelled';
  issueTime?: string;
  clearanceTime?: string;
  sectionId: string;
}

export interface ScadaTelemetryPoint {
  id: string;
  tag: string;
  description: string;
  substationId: string;
  feederId?: string;
  voltageKV: number;
  currentAmps: number;
  activePowerMW: number;
  reactivePowerMVAR: number;
  frequencyHz: number;
  breakerStatus: 'CLOSED' | 'OPEN' | 'TRIPPED';
  quality: 'GOOD' | 'WARN' | 'FAULT';
  lastUpdated: string;
}

export interface ScadaAlarm {
  id: string;
  tag: string;
  alarmCode: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  status: 'active' | 'acknowledged' | 'cleared';
  timestamp: string;
}

export interface StoresItem {
  id: string;
  itemCode: string;
  name: string;
  category: 'Conductor' | 'Pole' | 'Transformer Oil' | 'Insulator' | 'Smart Meter' | 'Hardware';
  unitOfMeasure: string;
  currentStock: number;
  reorderLevel: number;
  unitCostINR: number;
  sectionId: string;
}

export interface DisasterEvent {
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
