// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCADA TELEMETRY & SUBSTATION SINGLE LINE DIAGRAM (SLD) SERVICE (SECTION 12)
// Protocols: IEC 60870-5-104, Modbus TCP, MQTT, WebSocket, REST/HTTPS
// Data Isolation: Strict Separation of OPERATIONAL vs SIMULATOR records
// ============================================================================

import {
  ScadaTelemetryPoint,
  ScadaAlarm,
  ScadaSourceType,
  ScadaGatewayProtocol,
} from '../types/operations';
import { initialScadaPoints, initialScadaAlarms } from './mockData';
import { scadaSimulatorService } from './scadaSimulatorService';
import { scadaGatewayService } from './scadaGatewayService';
import { authService } from './authService';

export class ScadaService {
  private static instance: ScadaService;

  // Operational records (real/baseline grid telemetry)
  private operationalPoints: ScadaTelemetryPoint[] = [...initialScadaPoints];
  private operationalAlarms: ScadaAlarm[] = [...initialScadaAlarms];
  private listeners: Array<() => void> = [];
  private activeSourceFilter: 'ALL' | 'OPERATIONAL' | 'SIMULATOR' = 'ALL';

  private constructor() {
    // Listen to simulator changes and forward to subscribers
    scadaSimulatorService.subscribe(() => {
      this.notifyListeners();
    });

    // Listen to gateway events
    scadaGatewayService.subscribe(() => {
      this.notifyListeners();
    });
  }

  public static getInstance(): ScadaService {
    if (!ScadaService.instance) {
      ScadaService.instance = new ScadaService();
    }
    return ScadaService.instance;
  }

  public getSourceFilter(): 'ALL' | 'OPERATIONAL' | 'SIMULATOR' {
    return this.activeSourceFilter;
  }

  public setSourceFilter(filter: 'ALL' | 'OPERATIONAL' | 'SIMULATOR'): void {
    this.activeSourceFilter = filter;
    this.notifyListeners();
  }

  /**
   * Retrieves telemetry points according to source filter
   */
  public getPoints(filter?: 'ALL' | 'OPERATIONAL' | 'SIMULATOR'): ScadaTelemetryPoint[] {
    const f = filter || this.activeSourceFilter;
    const simPoints = scadaSimulatorService.getPoints();

    if (f === 'OPERATIONAL') {
      return [...this.operationalPoints];
    }
    if (f === 'SIMULATOR') {
      return [...simPoints];
    }
    return [...this.operationalPoints, ...simPoints];
  }

  /**
   * Retrieves alarms according to source filter
   */
  public getAlarms(filter?: 'ALL' | 'OPERATIONAL' | 'SIMULATOR'): ScadaAlarm[] {
    const f = filter || this.activeSourceFilter;
    const simAlarms = scadaSimulatorService.getAlarms();

    if (f === 'OPERATIONAL') {
      return [...this.operationalAlarms];
    }
    if (f === 'SIMULATOR') {
      return [...simAlarms];
    }
    return [...this.operationalAlarms, ...simAlarms];
  }

  /**
   * Remote Breaker Control with SBO Interlocks
   */
  public operateBreakerWithSBO(
    tag: string,
    targetState: 'OPEN' | 'CLOSED',
    reason: string,
    operatorName: string,
    protocol: ScadaGatewayProtocol = 'IEC-60870-5-104'
  ): boolean {
    const currentUser = authService.getCurrentUser();

    // Check if target is a simulated point
    const isSimulated = tag.startsWith('SIM_') || tag.includes('SIM');
    const point = this.getPoints('ALL').find(p => p.tag === tag);
    if (!point) return false;

    // Execute through gateway SBO validation
    const sboResult = scadaGatewayService.executeSecuredSboCommand({
      tag,
      substationId: point.substationId,
      feederId: point.feederId,
      targetState,
      supervisoryReason: reason,
      ptwClearanceChecked: true, // confirmed in UI modal
      operator: currentUser,
      protocol: isSimulated ? 'SIMULATOR' : protocol,
    });

    if (!sboResult.success) {
      console.warn('SBO command rejected:', sboResult.message);
      return false;
    }

    if (isSimulated) {
      // Execute in simulator engine
      return scadaSimulatorService.operateSimulatedBreaker(tag, targetState, operatorName, reason);
    } else {
      // Execute on operational record
      point.breakerStatus = targetState;
      point.lastUpdated = 'Just now';

      const alarmCode = `ALM-SBO-${Date.now().toString().slice(-4)}`;
      this.operationalAlarms.unshift({
        id: `alm-${Date.now()}`,
        tag: point.tag,
        alarmCode,
        sourceType: 'OPERATIONAL',
        severity: targetState === 'OPEN' ? 'critical' : 'high',
        message: `SBO ${targetState}: ${point.description} operated by ${operatorName}. Reason: ${reason}`,
        timestamp: new Date().toLocaleTimeString(),
        status: targetState === 'OPEN' ? 'active' : 'acknowledged',
      });

      this.notifyListeners();
      return true;
    }
  }

  public toggleBreaker(tag: string): void {
    const pt = this.getPoints('ALL').find(p => p.tag === tag);
    if (!pt) return;
    const targetState = pt.breakerStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
    const user = authService.getCurrentUser();
    this.operateBreakerWithSBO(
      tag,
      targetState,
      'Direct Toggle by Administrator',
      user.fullName || user.username
    );
  }

  public acknowledgeAlarm(alarmCode: string): void {
    const opAlm = this.operationalAlarms.find(a => a.alarmCode === alarmCode);
    if (opAlm) {
      opAlm.status = 'acknowledged';
      this.notifyListeners();
      return;
    }
    scadaSimulatorService.acknowledgeAlarm(alarmCode);
    this.notifyListeners();
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
        console.error('ScadaService listener error:', err);
      }
    });
  }
}

export const scadaService = ScadaService.getInstance();
