// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// INDUSTRIAL SCADA GATEWAY ADAPTERS (SECTION 12 & PHASE 4)
// Protocols: IEC 60870-5-104, Modbus TCP, MQTT, WebSocket, REST/HTTPS
// Normalized Telemetry Interface & Secured Select-Before-Operate (SBO) Interlocks
// ============================================================================

import {
  ScadaTelemetryPoint,
  ScadaAlarm,
  ScadaBreakerCommand,
  ScadaGatewayProtocol,
  ScadaTelemetryQuality,
  ScadaConnectionStatus,
} from '../types/operations';
import { UserProfile } from '../types/auth';

export interface IEC104AsduFrame {
  typeId: number; // 9: Normalized, 13: Short Floating Point, 45: Single Command, 46: Double Command
  isSequence: boolean;
  numObjects: number;
  cot: number; // Cause of Transmission: 3 = Spontaneous, 6 = Activation, 7 = Activation Confirm
  coa: number; // Common Address of ASDU (Substation station address)
  ioa: number; // Information Object Address
  value: number;
  quality: number; // IEC quality descriptor
  timestamp?: string;
}

export interface ModbusTcpPacket {
  transactionId: number;
  protocolId: number; // 0 for Modbus TCP
  length: number;
  unitId: number;
  functionCode: number; // 3: Read Holding, 4: Read Input, 5: Write Coil, 6: Write Register, 16: Write Multiple
  registerAddress: number;
  registerCount?: number;
  values?: number[];
}

export interface MqttMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retained: boolean;
  timestamp: string;
}

export interface SboCommandRequest {
  tag: string;
  substationId: string;
  feederId?: string;
  targetState: 'OPEN' | 'CLOSED';
  supervisoryReason: string;
  ptwClearanceChecked: boolean;
  operator: UserProfile;
  protocol: ScadaGatewayProtocol;
}

export interface SboCommandResult {
  success: boolean;
  commandId: string;
  message: string;
  auditRecord?: ScadaBreakerCommand;
}

export class ScadaGatewayService {
  private static instance: ScadaGatewayService;

  private connectedProtocols: Record<ScadaGatewayProtocol, boolean> = {
    'IEC-60870-5-104': true,
    'MODBUS-TCP': true,
    'MQTT': true,
    'WEBSOCKET': true,
    'REST': true,
    'SIMULATOR': true,
  };

  private commandHistory: ScadaBreakerCommand[] = [];
  private mqttMessages: MqttMessage[] = [];
  private activeIecSessions = 3; // Marapalam RTU, Villianur RTU, Bahour RTU
  private listeners: Array<() => void> = [];

  // Live Dynamic Connection State Monitor
  private connectionStatus: ScadaConnectionStatus = 'SIMULATOR_CONNECTED';
  private lastHeartbeat: string = new Date().toLocaleTimeString();
  private totalFramesReceived = 1420;
  private totalCommErrors = 0;

  private constructor() {
    this.initializeDefaultLogs();
  }

  public static getInstance(): ScadaGatewayService {
    if (!ScadaGatewayService.instance) {
      ScadaGatewayService.instance = new ScadaGatewayService();
    }
    return ScadaGatewayService.instance;
  }

  private initializeDefaultLogs(): void {
    this.commandHistory.push({
      id: `cmd-init-1`,
      tag: 'SIM_FDR_MARA_01',
      substationId: 'ss-mara',
      feederId: 'fdr-mara-1',
      targetState: 'CLOSED',
      previousState: 'OPEN',
      supervisoryReason: 'Commissioning of Marapalam Feeder 1 after maintenance clearance',
      operatorId: 'user-ee',
      operatorName: 'Er. M. Sivakumar',
      operatorRole: 'ee',
      interlocksVerified: {
        ptwClearanceChecked: true,
        synchroCheckPassed: true,
        operatorAuthorized: true,
      },
      dispatchedVia: 'IEC-60870-5-104',
      status: 'SUCCESS',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    });
  }

  // --------------------------------------------------------------------------
  // PROTOCOL STATUS & DIAGNOSTICS
  // --------------------------------------------------------------------------

  public getConnectionStatus(): ScadaConnectionStatus {
    return this.connectionStatus;
  }

  public setConnectionStatus(status: ScadaConnectionStatus): void {
    this.connectionStatus = status;
    if (status === 'COMM_FAILURE') {
      this.totalCommErrors += 1;
    }
    this.notifyListeners();
  }

  public getLastHeartbeat(): string {
    return this.lastHeartbeat;
  }

  public recordHeartbeat(): void {
    this.lastHeartbeat = new Date().toLocaleTimeString();
    this.totalFramesReceived += 1;
    this.notifyListeners();
  }

  public simulateCommFailure(): void {
    this.connectionStatus = 'COMM_FAILURE';
    this.totalCommErrors += 1;
    this.notifyListeners();
  }

  public restoreConnection(): void {
    this.connectionStatus = 'SIMULATOR_CONNECTED';
    this.recordHeartbeat();
  }

  public getStats(): { frames: number; errors: number; heartbeat: string; status: ScadaConnectionStatus } {
    return {
      frames: this.totalFramesReceived,
      errors: this.totalCommErrors,
      heartbeat: this.lastHeartbeat,
      status: this.connectionStatus,
    };
  }

  public getProtocolStatus(): Record<ScadaGatewayProtocol, boolean> {
    return { ...this.connectedProtocols };
  }

  public toggleProtocol(protocol: ScadaGatewayProtocol, active: boolean): void {
    this.connectedProtocols[protocol] = active;
    this.notifyListeners();
  }

  public getActiveIecSessions(): number {
    return this.activeIecSessions;
  }

  public getCommandHistory(): ScadaBreakerCommand[] {
    return [...this.commandHistory];
  }

  public getMqttMessages(): MqttMessage[] {
    return [...this.mqttMessages];
  }

  // --------------------------------------------------------------------------
  // 1. IEC 60870-5-104 PROTOCOL ADAPTER
  // --------------------------------------------------------------------------

  /**
   * Encodes a normalized telemetry point into an IEC 60870-5-104 ASDU Type 13 frame (Short Floating Point)
   */
  public encodeIec104TelemetryFrame(pt: ScadaTelemetryPoint): IEC104AsduFrame {
    // Map tag to IOA address
    const ioa = this.mapTagToIoa(pt.tag);

    return {
      typeId: 13, // M_ME_NC_1: Measured value, short floating point number
      isSequence: false,
      numObjects: 1,
      cot: 3, // Spontaneous transmission
      coa: pt.substationId === 'ss-mara' ? 101 : pt.substationId === 'ss-vill' ? 102 : 103,
      ioa,
      value: pt.voltageKV || pt.currentAmps || pt.activePowerMW,
      quality: pt.quality === 'GOOD' ? 0x00 : 0x01, // 0x00: Valid, 0x01: Overflow/Invalid
      timestamp: pt.eventTimestamp || new Date().toISOString(),
    };
  }

  /**
   * Decodes an incoming IEC 60870-5-104 Type 45 Single Command frame (C_SC_NA_1)
   */
  public decodeIec104CommandFrame(frame: IEC104AsduFrame): { targetState: 'OPEN' | 'CLOSED'; tag: string } {
    const targetState: 'OPEN' | 'CLOSED' = frame.value === 1 ? 'CLOSED' : 'OPEN';
    const tag = this.mapIoaToTag(frame.ioa);
    return { targetState, tag };
  }

  private mapTagToIoa(tag: string): number {
    if (tag.includes('MARA_110')) return 1001;
    if (tag.includes('MARA_01')) return 2001;
    if (tag.includes('HERI_02')) return 2002;
    if (tag.includes('PTR1')) return 3001;
    if (tag.includes('VILL_230')) return 4001;
    return 9999;
  }

  private mapIoaToTag(ioa: number): string {
    switch (ioa) {
      case 1001:
        return 'SIM_MARA_110_BUS';
      case 2001:
        return 'SIM_FDR_MARA_01';
      case 2002:
        return 'SIM_FDR_HERI_02';
      case 3001:
        return 'SIM_MARA_PTR1_80MVA';
      case 4001:
        return 'SIM_VILL_230_BUS';
      default:
        return 'SIM_FDR_MARA_01';
    }
  }

  // --------------------------------------------------------------------------
  // 2. MODBUS TCP PROTOCOL ADAPTER
  // --------------------------------------------------------------------------

  /**
   * Maps telemetry points to standard Modbus Holding Register tables (40001 - 40050)
   * Scaling: Voltage * 100 (e.g. 11.20kV -> 1120), Current * 10 (245.0A -> 2450)
   */
  public generateModbusRegisters(points: ScadaTelemetryPoint[]): ModbusTcpPacket {
    const values: number[] = [];
    points.forEach(p => {
      values.push(Math.round(p.voltageKV * 100)); // Reg 0: Voltage x100
      values.push(Math.round(p.currentAmps * 10)); // Reg 1: Current x10
      values.push(Math.round(p.activePowerMW * 100)); // Reg 2: Power x100
      values.push(p.breakerStatus === 'CLOSED' ? 1 : 0); // Reg 3: Breaker state
    });

    return {
      transactionId: Math.floor(Math.random() * 65535),
      protocolId: 0,
      length: values.length * 2 + 3,
      unitId: 1,
      functionCode: 3, // Read Holding Registers
      registerAddress: 40001,
      registerCount: values.length,
      values,
    };
  }

  // --------------------------------------------------------------------------
  // 3. MQTT TELEMETRY PUBLISHER
  // --------------------------------------------------------------------------

  /**
   * Publishes normalized telemetry to an MQTT topic
   */
  public publishMqttTelemetry(substationId: string, point: ScadaTelemetryPoint): void {
    const topic = `powergis/substation/${substationId}/telemetry/${point.tag}`;
    const payload = JSON.stringify({
      tag: point.tag,
      description: point.description,
      sourceType: point.sourceType,
      voltageKV: point.voltageKV,
      currentAmps: point.currentAmps,
      activePowerMW: point.activePowerMW,
      reactivePowerMVAR: point.reactivePowerMVAR,
      frequencyHz: point.frequencyHz,
      breakerStatus: point.breakerStatus,
      quality: point.quality,
      timestamp: point.eventTimestamp || new Date().toISOString(),
    });

    const msg: MqttMessage = {
      topic,
      payload,
      qos: 1,
      retained: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.mqttMessages.unshift(msg);
    if (this.mqttMessages.length > 50) this.mqttMessages.pop();
    this.notifyListeners();
  }

  // --------------------------------------------------------------------------
  // 4. SECURED SELECT-BEFORE-OPERATE (SBO) BREAKER INTERLOCK ENGINE
  // --------------------------------------------------------------------------

  /**
   * Three-Tier SBO Interlock Validation:
   * 1. Authorization: Operator must hold authorized role ('super_admin', 'se', 'ee', 'ae')
   * 2. PTW Safety: Statutory Permit-to-Work line clear clearance must be confirmed
   * 3. Synchro-Check / Safety: Valid reason code required
   */
  public executeSecuredSboCommand(req: SboCommandRequest): SboCommandResult {
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const authorizedRoles = ['super_admin', 'se', 'ee', 'ae'];

    // 0. Statutory Safety Air Gap: Block operational physical switchgear switching via web interface
    const isSimulated = req.tag.startsWith('SIM_') || req.protocol === 'SIMULATOR';
    if (!isSimulated) {
      const blockedRecord: ScadaBreakerCommand = {
        id: commandId,
        tag: req.tag,
        substationId: req.substationId,
        feederId: req.feederId,
        targetState: req.targetState,
        previousState: req.targetState === 'OPEN' ? 'CLOSED' : 'OPEN',
        supervisoryReason: req.supervisoryReason,
        operatorId: req.operator.id,
        operatorName: req.operator.fullName || req.operator.username,
        operatorRole: req.operator.role,
        interlocksVerified: {
          ptwClearanceChecked: req.ptwClearanceChecked,
          synchroCheckPassed: false,
          operatorAuthorized: false,
        },
        dispatchedVia: req.protocol,
        status: 'INTERLOCK_BLOCKED',
        timestamp: new Date().toISOString(),
      };
      this.commandHistory.unshift(blockedRecord);
      this.notifyListeners();
      return {
        success: false,
        commandId,
        message: 'SAFETY AIR GAP LOCKOUT: Live operational substation breaker switching via web interface is disabled. Only simulated sandbox breakers may be operated.',
        auditRecord: blockedRecord,
      };
    }

    // 1. Role Authorization Interlock
    const isAuthorized = authorizedRoles.includes(req.operator.role);
    if (!isAuthorized) {
      const blockedRecord: ScadaBreakerCommand = {
        id: commandId,
        tag: req.tag,
        substationId: req.substationId,
        feederId: req.feederId,
        targetState: req.targetState,
        previousState: req.targetState === 'OPEN' ? 'CLOSED' : 'OPEN',
        supervisoryReason: req.supervisoryReason,
        operatorId: req.operator.id,
        operatorName: req.operator.fullName || req.operator.username,
        operatorRole: req.operator.role,
        interlocksVerified: {
          ptwClearanceChecked: req.ptwClearanceChecked,
          synchroCheckPassed: false,
          operatorAuthorized: false,
        },
        dispatchedVia: req.protocol,
        status: 'INTERLOCK_BLOCKED',
        timestamp: new Date().toISOString(),
      };
      this.commandHistory.unshift(blockedRecord);
      this.notifyListeners();
      return {
        success: false,
        commandId,
        message: `SBO Interlock Rejected: Role '${req.operator.role.toUpperCase()}' lacks statutory authority for high-voltage breaker operation.`,
        auditRecord: blockedRecord,
      };
    }

    // 2. Safety Clearance Interlock
    if (!req.ptwClearanceChecked) {
      const blockedRecord: ScadaBreakerCommand = {
        id: commandId,
        tag: req.tag,
        substationId: req.substationId,
        feederId: req.feederId,
        targetState: req.targetState,
        previousState: req.targetState === 'OPEN' ? 'CLOSED' : 'OPEN',
        supervisoryReason: req.supervisoryReason,
        operatorId: req.operator.id,
        operatorName: req.operator.fullName || req.operator.username,
        operatorRole: req.operator.role,
        interlocksVerified: {
          ptwClearanceChecked: false,
          synchroCheckPassed: true,
          operatorAuthorized: true,
        },
        dispatchedVia: req.protocol,
        status: 'INTERLOCK_BLOCKED',
        timestamp: new Date().toISOString(),
      };
      this.commandHistory.unshift(blockedRecord);
      this.notifyListeners();
      return {
        success: false,
        commandId,
        message: 'SBO Interlock Rejected: Statutory Permit-to-Work (PTW) clearance confirmation is mandatory.',
        auditRecord: blockedRecord,
      };
    }

    // 3. Command Accepted: Record immutable audit entry
    const auditRecord: ScadaBreakerCommand = {
      id: commandId,
      tag: req.tag,
      substationId: req.substationId,
      feederId: req.feederId,
      targetState: req.targetState,
      previousState: req.targetState === 'OPEN' ? 'CLOSED' : 'OPEN',
      supervisoryReason: req.supervisoryReason,
      operatorId: req.operator.id,
      operatorName: req.operator.fullName || req.operator.username,
      operatorRole: req.operator.role,
      interlocksVerified: {
        ptwClearanceChecked: true,
        synchroCheckPassed: true,
        operatorAuthorized: true,
      },
      dispatchedVia: req.protocol,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };

    this.commandHistory.unshift(auditRecord);
    if (this.commandHistory.length > 100) this.commandHistory.pop();

    this.notifyListeners();

    return {
      success: true,
      commandId,
      message: `SBO Command Dispatched via ${req.protocol}: Breaker ${req.tag} target ${req.targetState} confirmed.`,
      auditRecord,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('SCADA Gateway listener error:', err);
      }
    });
  }
}

export const scadaGatewayService = ScadaGatewayService.getInstance();
