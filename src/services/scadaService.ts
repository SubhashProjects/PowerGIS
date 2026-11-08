// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCADA TELEMETRY & SUBSTATION SINGLE LINE DIAGRAM (SLD) SERVICE
// Protocols: IEC 60870-5-104, Modbus TCP, MQTT
// ============================================================================

import { ScadaTelemetryPoint, ScadaAlarm } from '../types/operations';
import { initialScadaPoints, initialScadaAlarms } from './mockData';
import { faultService } from './faultService';

export class ScadaService {
  private static instance: ScadaService;
  private points: ScadaTelemetryPoint[] = [...initialScadaPoints];
  private alarms: ScadaAlarm[] = [...initialScadaAlarms];
  private listeners: Array<() => void> = [];

  private constructor() {
    // Simulate real-time grid fluctuation every 4 seconds
    setInterval(() => {
      this.simulateTelemetry();
    }, 4000);
  }

  public static getInstance(): ScadaService {
    if (!ScadaService.instance) {
      ScadaService.instance = new ScadaService();
    }
    return ScadaService.instance;
  }

  public getPoints(): ScadaTelemetryPoint[] {
    return this.points;
  }

  public getAlarms(): ScadaAlarm[] {
    return this.alarms;
  }

  public toggleBreaker(tag: string): void {
    const pt = this.points.find(p => p.tag === tag);
    if (pt) {
      const newState = pt.breakerStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
      pt.breakerStatus = newState;
      pt.lastUpdated = 'Just now';

      // Auto-event ticket and alarm if breaker tripped open
      if (newState === 'OPEN') {
        this.alarms.unshift({
          id: `alm-${Date.now()}`,
          tag: pt.tag,
          alarmCode: `ALM-${Date.now()}`,
          severity: 'critical',
          message: `TRIP EVENT: ${pt.description} Opened. Downstream de-energized.`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          status: 'active',
        });

        // Generate emergency fault ticket
        faultService.registerFault({
          category: 'SCADA Breaker Trip',
          description: `Emergency Outage: Breaker ${pt.description} tripped. Downstream load dropped.`,
          priority: 'critical',
          status: 'new',
          feederId: 'fdr-mara-1',
          sectionId: 'sec-mara',
          reportedBy: 'SCADA IEC-104 Gateway',
          affectedConsumersEst: 420,
          coordinates: [11.9280, 79.8240],
        });
      }

      this.notifyListeners();
    }
  }

  public operateBreakerWithSBO(tag: string, targetState: 'OPEN' | 'CLOSED', reason: string, operatorName: string): boolean {
    const pt = this.points.find(p => p.tag === tag);
    if (!pt) return false;

    pt.breakerStatus = targetState;
    pt.lastUpdated = 'Just now';

    if (targetState === 'OPEN') {
      this.alarms.unshift({
        id: `alm-${Date.now()}`,
        tag: pt.tag,
        alarmCode: `ALM-${Date.now()}`,
        severity: 'critical',
        message: `SBO TRIP: ${pt.description} operated by ${operatorName}. Reason: ${reason}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'active',
      });

      faultService.registerFault({
        category: 'Supervisory Breaker Operation',
        description: `Breaker ${pt.description} opened by ${operatorName}. Reason: ${reason}`,
        priority: 'critical',
        status: 'new',
        feederId: 'fdr-mara-1',
        sectionId: 'sec-mara',
        reportedBy: operatorName,
        affectedConsumersEst: 380,
        coordinates: [11.9280, 79.8240],
      });
    } else {
      this.alarms.unshift({
        id: `alm-${Date.now()}`,
        tag: pt.tag,
        alarmCode: `ALM-${Date.now()}`,
        severity: 'high',
        message: `SBO CLOSE: ${pt.description} re-energized by ${operatorName}. Reason: ${reason}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'acknowledged',
      });
    }

    this.notifyListeners();
    return true;
  }

  public acknowledgeAlarm(alarmCode: string): void {
    const alm = this.alarms.find(a => a.alarmCode === alarmCode);
    if (alm) {
      alm.status = 'acknowledged';
      this.notifyListeners();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  private simulateTelemetry(): void {
    this.points.forEach(p => {
      if (p.tag === 'GRID_FREQ_HZ' || p.description.includes('Voltage')) {
        const delta = (Math.random() - 0.5) * 0.4;
        p.voltageKV = Math.round((p.voltageKV + delta) * 10) / 10;
      }
      if (p.currentAmps > 0) {
        const delta = (Math.random() - 0.5) * 4.0;
        p.currentAmps = Math.round((p.currentAmps + delta) * 10) / 10;
        p.activePowerMW = Math.round((p.currentAmps * 0.02) * 100) / 100;
      }
      p.lastUpdated = 'Live';
    });
    this.notifyListeners();
  }
}

export const scadaService = ScadaService.getInstance();
