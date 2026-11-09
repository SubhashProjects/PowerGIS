// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
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

export type ScadaSourceType = 'OPERATIONAL' | 'SIMULATOR';

export type ScadaTelemetryQuality = 'GOOD' | 'QUESTIONABLE' | 'COMM_FAILURE' | 'INVALID';

export interface ScadaTelemetryPoint {
  id: string;
  tag: string;
  description: string;
  substationId: string;
  feederId?: string;
  assetId?: string;
  sourceType: ScadaSourceType;
  simulationSessionId?: string;
  scenarioId?: string;
  voltageKV: number;
  currentAmps: number;
  activePowerMW: number;
  reactivePowerMVAR: number;
  powerFactor: number;
  frequencyHz: number;
  phaseACurrentAmps?: number;
  phaseBCurrentAmps?: number;
  phaseCCurrentAmps?: number;
  neutralCurrentAmps?: number;
  transformerLoadPct?: number;
  windingTempC?: number;
  oilTempC?: number;
  tapPosition?: number;
  breakerStatus: 'CLOSED' | 'OPEN' | 'TRIPPED';
  quality: ScadaTelemetryQuality;
  lastUpdated: string;
  eventTimestamp?: string;
  ingestionTimestamp?: string;
}

export interface ScadaAlarm {
  id: string;
  tag: string;
  alarmCode: string;
  sourceType?: ScadaSourceType;
  simulationSessionId?: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  status: 'active' | 'acknowledged' | 'cleared';
  timestamp: string;
}

export type ScadaSimulationMode =
  | 'continuous'
  | 'manual'
  | 'fluctuation'
  | 'preset_playback'
  | 'time_based'
  | 'csv_playback'
  | 'multi_substation'
  | 'multi_feeder'
  | 'fault_injection'
  | 'restoration';

export type ScadaScenarioPreset =
  | 'NORMAL'
  | 'PEAK_DEMAND'
  | 'OVERLOAD'
  | 'FAULT_EARTH'
  | 'FAULT_3PHASE'
  | 'CONDUCTOR_SNAP'
  | 'RESTORATION';

export interface ScadaSimulationConfig {
  sessionId: string;
  mode: ScadaSimulationMode;
  scenario: ScadaScenarioPreset;
  speed: 1 | 2 | 5 | 10;
  intervalSeconds: number;
  selectedSubstationId: string;
  selectedFeederId?: string;
  selectedAssetId?: string;
  fluctuationPct: number;
  frequencyNominalHz: number;
  powerFactorNominal: number;
  ambientTempC: number;
  isRunning: boolean;
  isPaused: boolean;
  voltageMinKV: number;
  voltageMaxKV: number;
  currentMaxAmps: number;
  oilTempAlarmThresholdC: number;
  windingTempAlarmThresholdC: number;
}

export type ScadaConnectionStatus =
  | 'LIVE_CONNECTED'
  | 'SIMULATOR_CONNECTED'
  | 'DISCONNECTED'
  | 'STALE_TELEMETRY'
  | 'COMM_FAILURE';

export type ScadaGatewayProtocol =
  | 'IEC-60870-5-104'
  | 'MODBUS-TCP'
  | 'MQTT'
  | 'WEBSOCKET'
  | 'REST'
  | 'SIMULATOR';

export interface ScadaBreakerCommand {
  id: string;
  tag: string;
  substationId: string;
  feederId?: string;
  targetState: 'OPEN' | 'CLOSED';
  previousState: 'OPEN' | 'CLOSED';
  supervisoryReason: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  interlocksVerified: {
    ptwClearanceChecked: boolean;
    synchroCheckPassed: boolean;
    operatorAuthorized: boolean;
  };
  dispatchedVia: ScadaGatewayProtocol;
  status: 'SUCCESS' | 'INTERLOCK_BLOCKED' | 'FAILED';
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
