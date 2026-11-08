// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// SCADA TELEMETRY & SUBSTATION SINGLE LINE DIAGRAM (SLD) SERVICE
// Protocols: IEC 60870-5-104, Modbus TCP, MQTT
// ============================================================================

import { ScadaTelemetryPoint, ScadaAlarm } from '../types/operations';
import { initialScadaPoints, initialScadaAlarms } from './mockData';

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
      pt.breakerStatus = pt.breakerStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
      pt.lastUpdated = 'Just now';
      this.notifyListeners();
    }
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
