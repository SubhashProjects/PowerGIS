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
import { assetService } from './assetService';

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
   * Retrieves telemetry points according to source filter.
   * OPERATIONAL records are always returned; SIMULATOR records depend on simulator mode.
   * (Fixes Bug 3: Operational SCADA telemetry previously disappeared when simulator was OFF)
   */
  public getPoints(filter?: 'ALL' | 'OPERATIONAL' | 'SIMULATOR', includeSimulated = false): ScadaTelemetryPoint[] {
    const isSim = assetService.isSimulatorMode() || includeSimulated;
    const f = filter || this.activeSourceFilter;
    const simPoints = isSim ? scadaSimulatorService.getPoints() : [];

    if (f === 'OPERATIONAL') {
      return [...this.operationalPoints];
    }
    if (f === 'SIMULATOR') {
      return [...simPoints];
    }
    return isSim ? [...this.operationalPoints, ...simPoints] : [...this.operationalPoints];
  }

  /**
   * Retrieves alarms according to source filter.
   * OPERATIONAL alarms are always preserved.
   */
  public getAlarms(filter?: 'ALL' | 'OPERATIONAL' | 'SIMULATOR', includeSimulated = false): ScadaAlarm[] {
    const isSim = assetService.isSimulatorMode() || includeSimulated;
    const f = filter || this.activeSourceFilter;
    const simAlarms = isSim ? scadaSimulatorService.getAlarms() : [];

    if (f === 'OPERATIONAL') {
      return [...this.operationalAlarms];
    }
    if (f === 'SIMULATOR') {
      return [...simAlarms];
    }
    return isSim ? [...this.operationalAlarms, ...simAlarms] : [...this.operationalAlarms];
  }

  /**
   * Remote Breaker Control with SBO Interlocks & Statutory Safety Boundary
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
    const point = this.getPoints('ALL', true).find(p => p.tag === tag);
    if (!point) return false;

    // CRITICAL SAFETY AIR GAP: Disallow operational physical breaker operations via web interface
    if (!isSimulated) {
      console.warn('SAFETY LOCKOUT: Web-based remote tripping of physical high-voltage switchgear is prohibited.');
      return false;
    }

    // Execute through gateway SBO validation
    const sboResult = scadaGatewayService.executeSecuredSboCommand({
      tag,
      substationId: point.substationId,
      feederId: point.feederId,
      targetState,
      supervisoryReason: reason,
      ptwClearanceChecked: true, // confirmed in UI modal
      operator: currentUser,
      protocol: 'SIMULATOR',
    });

    if (!sboResult.success) {
      console.warn('SBO command rejected:', sboResult.message);
      return false;
    }

    // Execute strictly in simulator engine
    return scadaSimulatorService.operateSimulatedBreaker(tag, targetState, operatorName, reason);
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
