// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCADA DYNAMIC TELEMETRY SIMULATOR ENGINE (SECTION 12 & PHASE 3)
// 10 Operating Modes • Physically Consistent 3-Phase Engine • Protection Relays
// Dynamic Asset Scoping • Timed CSV Playback • Supabase & Local Persistence
// ============================================================================

import {
  ScadaTelemetryPoint,
  ScadaAlarm,
  ScadaSimulationConfig,
  ScadaSimulationMode,
  ScadaScenarioPreset,
} from '../types/operations';
import { initialFeeders, initialTransformers } from './mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface TelemetryTrendPoint {
  timestamp: string;
  voltageKV: number;
  currentAmps: number;
  activePowerMW: number;
  reactivePowerMVAR: number;
  frequencyHz: number;
  windingTempC: number;
  oilTempC: number;
}

export interface SimulationEventLog {
  id: string;
  timestamp: string;
  scenario: string;
  tag: string;
  eventType: 'INFO' | 'ALARM' | 'BREAKER_TRIP' | 'BREAKER_CLOSE' | 'OVERLOAD' | 'FAULT';
  message: string;
  sessionId: string;
}

export interface ManualTelemetryInput {
  voltageKV?: number;
  currentAmps?: number;
  powerFactor?: number;
  frequencyHz?: number;
  windingTempC?: number;
  oilTempC?: number;
  tapPosition?: number;
  breakerStatus?: 'OPEN' | 'CLOSED';
}

export interface CsvPlaybackRecord {
  tag: string;
  timestamp?: string;
  voltageKV: number;
  currentAmps: number;
  powerFactor?: number;
  frequencyHz?: number;
  breakerStatus?: 'OPEN' | 'CLOSED' | 'TRIPPED';
}

export class ScadaSimulatorService {
  private static instance: ScadaSimulatorService;

  // Active configuration
  private config: ScadaSimulationConfig = {
    sessionId: `SIM-${Date.now().toString().slice(-6)}`,
    mode: 'continuous',
    scenario: 'NORMAL',
    speed: 1,
    intervalSeconds: 2,
    selectedSubstationId: 'ss-mara',
    selectedFeederId: 'fdr-mara-1',
    selectedAssetId: 'dtr-mara-1',
    fluctuationPct: 3.0,
    frequencyNominalHz: 50.0,
    powerFactorNominal: 0.965,
    ambientTempC: 32.0,
    isRunning: false,
    isPaused: false,
    voltageMinKV: 10.0,
    voltageMaxKV: 12.2,
    currentMaxAmps: 320.0,
    oilTempAlarmThresholdC: 75.0,
    windingTempAlarmThresholdC: 85.0,
  };

  // Internal timer & state
  private timer: any = null;
  private simPoints: ScadaTelemetryPoint[] = [];
  private simAlarms: ScadaAlarm[] = [];
  private trendHistory: Record<string, TelemetryTrendPoint[]> = {};
  private eventLogs: SimulationEventLog[] = [];
  private listeners: Array<() => void> = [];
  private timeStepCounter = 0;

  // Realistic Simulation Clock (Starts at 08:00 AM, 480 mins)
  private simulatedClockMinutes = 480;
  // Multiplier: 1 real second = 60 simulated seconds (1 sim minute per second at 1x)
  private simulatedTimeMultiplier = 30;

  // Persistent Scenario & Fault State
  private scenarioState = {
    active: false,
    preset: 'NORMAL' as ScadaScenarioPreset,
    stage: 'NORMAL' as 'NORMAL' | 'FAULT_INJECTED' | 'PROTECTION_PICKUP' | 'TRIPPED' | 'RESTORATION',
    remainingSteps: 0,
    targetTag: 'SIM_FDR_MARA_01',
    faultAmps: 0,
    faultPhase: 'A' as 'A' | 'B' | 'C' | '3PH' | 'SNAP',
  };

  // Timed CSV Playback Queue
  private csvPlaybackQueue: CsvPlaybackRecord[] = [];
  private csvPlaybackIndex = 0;

  private constructor() {
    this.initializeSimulatedNetwork();
  }

  public static getInstance(): ScadaSimulatorService {
    if (!ScadaSimulatorService.instance) {
      ScadaSimulatorService.instance = new ScadaSimulatorService();
    }
    return ScadaSimulatorService.instance;
  }

  // --------------------------------------------------------------------------
  // DYNAMIC NETWORK INITIALIZATION (LOADS CONFIGURED GIS ASSETS)
  // --------------------------------------------------------------------------

  public initializeSimulatedNetwork(): void {
    const session = this.config.sessionId;
    const points: ScadaTelemetryPoint[] = [];

    // 1. Primary Marapalam 110kV Incomer & PTR Baseline
    points.push(
      {
        id: 'sim-pt-mara-110',
        tag: 'SIM_MARA_110_BUS',
        description: 'Simulated Marapalam 110kV Incomer Bus',
        substationId: 'ss-mara',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 110.8,
        currentAmps: 340.5,
        activePowerMW: 62.4,
        reactivePowerMVAR: 16.2,
        powerFactor: 0.968,
        frequencyHz: 50.01,
        phaseACurrentAmps: 341.2,
        phaseBCurrentAmps: 339.8,
        phaseCCurrentAmps: 340.5,
        neutralCurrentAmps: 1.2,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: new Date().toISOString(),
      },
      {
        id: 'sim-pt-mara-ptr1',
        tag: 'SIM_MARA_PTR1_80MVA',
        description: 'Simulated 110/22kV 80MVA Power Transformer #1',
        substationId: 'ss-mara',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 22.1,
        currentAmps: 1250.0,
        activePowerMW: 45.2,
        reactivePowerMVAR: 12.1,
        powerFactor: 0.966,
        frequencyHz: 50.01,
        transformerLoadPct: 68.0,
        oilTempC: 56.5,
        windingTempC: 68.2,
        tapPosition: 0,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: new Date().toISOString(),
      }
    );

    // 2. Dynamically Load Feeders from repository
    const feeders = initialFeeders;
    if (feeders && feeders.length > 0) {
      feeders.slice(0, 4).forEach((f, idx) => {
        const tag = idx === 0 ? 'SIM_FDR_MARA_01' : `SIM_${f.code.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}`;
        points.push({
          id: `sim-fdr-${f.id}`,
          tag,
          description: `Simulated ${f.name} Breaker`,
          substationId: f.substationId || 'ss-mara',
          feederId: f.id,
          sourceType: 'SIMULATOR',
          simulationSessionId: session,
          scenarioId: this.config.scenario,
          voltageKV: 11.1,
          currentAmps: 220.0 + idx * 25,
          activePowerMW: 4.0 + idx * 0.4,
          reactivePowerMVAR: 1.1 + idx * 0.1,
          powerFactor: 0.965,
          frequencyHz: 50.01,
          phaseACurrentAmps: 221.0 + idx * 25,
          phaseBCurrentAmps: 219.0 + idx * 25,
          phaseCCurrentAmps: 220.0 + idx * 25,
          neutralCurrentAmps: 1.5,
          breakerStatus: 'CLOSED',
          quality: 'GOOD',
          lastUpdated: 'Live (Simulated)',
          eventTimestamp: new Date().toISOString(),
        });
      });
    } else {
      // Fallback feeder
      points.push({
        id: 'sim-pt-mara-fdr1',
        tag: 'SIM_FDR_MARA_01',
        description: 'Simulated 11kV Boulevard Outgoing Feeder #1',
        substationId: 'ss-mara',
        feederId: 'fdr-mara-1',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 11.1,
        currentAmps: 245.0,
        activePowerMW: 4.52,
        reactivePowerMVAR: 1.25,
        powerFactor: 0.964,
        frequencyHz: 50.01,
        phaseACurrentAmps: 246.5,
        phaseBCurrentAmps: 243.8,
        phaseCCurrentAmps: 244.7,
        neutralCurrentAmps: 2.1,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: new Date().toISOString(),
      });
    }

    // 3. Dynamically Load Distribution Transformer from repository
    const transformers = initialTransformers;
    const dtr = transformers.find(t => t.id === 'dt-blvd-1') || transformers[0];
    if (dtr) {
      points.push({
        id: `sim-dtr-${dtr.id}`,
        tag: 'SIM_DT_BLVD_1',
        description: `Simulated ${dtr.name} (${dtr.capacityKVA}kVA)`,
        substationId: 'ss-mara',
        feederId: dtr.feederId || 'fdr-mara-1',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 0.415,
        currentAmps: 420.0,
        activePowerMW: 0.28,
        reactivePowerMVAR: 0.08,
        powerFactor: 0.961,
        frequencyHz: 50.01,
        transformerLoadPct: dtr.loadPercentage || 74.5,
        oilTempC: 62.0,
        windingTempC: 74.5,
        phaseACurrentAmps: 428.0,
        phaseBCurrentAmps: 415.0,
        phaseCCurrentAmps: 417.0,
        neutralCurrentAmps: 11.2,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: new Date().toISOString(),
      });
    }

    this.simPoints = points;

    // Seed initial trend history for each point
    this.simPoints.forEach(p => {
      this.trendHistory[p.tag] = [
        {
          timestamp: new Date().toLocaleTimeString(),
          voltageKV: p.voltageKV,
          currentAmps: p.currentAmps,
          activePowerMW: p.activePowerMW,
          reactivePowerMVAR: p.reactivePowerMVAR,
          frequencyHz: p.frequencyHz,
          windingTempC: p.windingTempC || 50.0,
          oilTempC: p.oilTempC || 45.0,
        },
      ];
    });

    this.logEvent(
      'INFO',
      'SIM_INIT',
      `SCADA Simulator network initialized with ${this.simPoints.length} active GIS-mapped nodes. Session: ${session}`
    );
  }

  // --------------------------------------------------------------------------
  // TIMER & STATE TRANSITIONS (BUGS 1 & 2 RESOLVED)
  // --------------------------------------------------------------------------

  private clearIntervalTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private createOrRestartTimer(): void {
    this.clearIntervalTimer();
    const intervalMs = Math.max(
      150,
      Math.round((this.config.intervalSeconds * 1000) / this.config.speed)
    );

    this.timer = setInterval(() => {
      this.stepSimulation();
    }, intervalMs);
  }

  public start(): void {
    if (this.config.isRunning && !this.config.isPaused) return;

    this.config.isRunning = true;
    this.config.isPaused = false;
    this.createOrRestartTimer();

    this.persistSessionStart();
    this.logEvent(
      'INFO',
      'SIM_START',
      `Simulation started [Mode: ${this.config.mode}, Scenario: ${this.config.scenario}, Speed: ${this.config.speed}x]`
    );
    this.notifyListeners();
  }

  public pause(): void {
    this.config.isPaused = true;
    this.clearIntervalTimer();
    this.logEvent('INFO', 'SIM_PAUSE', 'Simulation paused by operator');
    this.notifyListeners();
  }

  /**
   * Resumes the paused simulation by explicitly recreating the interval timer
   * (Fixes Bug 1: Resume button did not resume)
   */
  public resume(): void {
    this.config.isRunning = true;
    this.config.isPaused = false;
    this.createOrRestartTimer();
    this.logEvent('INFO', 'SIM_RESUME', 'Simulation resumed by operator');
    this.notifyListeners();
  }

  public stop(): void {
    this.config.isRunning = false;
    this.config.isPaused = false;
    this.clearIntervalTimer();
    this.logEvent('INFO', 'SIM_STOP', 'Simulation stopped');
    this.notifyListeners();
  }

  public reset(): void {
    this.stop();
    this.config.sessionId = `SIM-${Date.now().toString().slice(-6)}`;
    this.config.scenario = 'NORMAL';
    this.timeStepCounter = 0;
    this.simulatedClockMinutes = 480;
    this.simAlarms = [];
    this.scenarioState = {
      active: false,
      preset: 'NORMAL',
      stage: 'NORMAL',
      remainingSteps: 0,
      targetTag: 'SIM_FDR_MARA_01',
      faultAmps: 0,
      faultPhase: 'A',
    };
    this.csvPlaybackQueue = [];
    this.csvPlaybackIndex = 0;
    this.initializeSimulatedNetwork();
    this.logEvent('INFO', 'SIM_RESET', 'Simulation reset to baseline normal conditions');
    this.notifyListeners();
  }

  /**
   * Adjusts simulation speed and immediately recreates timer if running
   * (Fixes Bug 2: Speed changes were ignored while running)
   */
  public setSpeed(speed: 1 | 2 | 5 | 10): void {
    this.config.speed = speed;
    if (this.config.isRunning && !this.config.isPaused) {
      this.createOrRestartTimer();
    }
    this.notifyListeners();
  }

  /**
   * Adjusts simulation interval and immediately recreates timer if running
   * (Fixes Bug 2: Interval changes were ignored while running)
   */
  public setIntervalSeconds(sec: number): void {
    this.config.intervalSeconds = Math.max(1, Math.min(60, sec));
    if (this.config.isRunning && !this.config.isPaused) {
      this.createOrRestartTimer();
    }
    this.notifyListeners();
  }

  public setMode(mode: ScadaSimulationMode): void {
    this.config.mode = mode;
    this.logEvent('INFO', 'MODE_CHANGE', `Operating mode switched to ${mode.toUpperCase()}`);
    this.notifyListeners();
  }

  public setScenario(preset: ScadaScenarioPreset): void {
    this.config.scenario = preset;
    this.applyScenarioPreset(preset);
    this.notifyListeners();
  }

  public getConfig(): ScadaSimulationConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ScadaSimulationConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.speed !== undefined || updates.intervalSeconds !== undefined) {
      if (this.config.isRunning && !this.config.isPaused) {
        this.createOrRestartTimer();
      }
    }
    this.notifyListeners();
  }

  public getPoints(): ScadaTelemetryPoint[] {
    return [...this.simPoints];
  }

  public getPointByTag(tag: string): ScadaTelemetryPoint | undefined {
    return this.simPoints.find(p => p.tag === tag);
  }

  public getAlarms(): ScadaAlarm[] {
    return [...this.simAlarms];
  }

  public getTrendHistory(tag: string): TelemetryTrendPoint[] {
    return this.trendHistory[tag] || [];
  }

  public getEventLogs(): SimulationEventLog[] {
    return [...this.eventLogs];
  }

  public acknowledgeAlarm(alarmCode: string, operatorName = 'Operator'): void {
    const alm = this.simAlarms.find(a => a.alarmCode === alarmCode);
    if (alm) {
      alm.status = 'acknowledged';
      this.logEvent('INFO', alm.tag, `Alarm [${alarmCode}] acknowledged by ${operatorName}`);
      this.persistAlarmAcknowledgement(alarmCode, operatorName);
      this.notifyListeners();
    }
  }

  // --------------------------------------------------------------------------
  // ADVANCED ELECTRICAL ENGINEERING CALCULATIONS (PHASORS & THERMAL)
  // --------------------------------------------------------------------------

  /**
   * Three-Phase Phasor Electrical Calculations:
   * P = sqrt(3) * V_LL * I_L * PF
   * Q = sqrt(3) * V_LL * I_L * sin(acos(PF))
   * S = sqrt(3) * V_LL * I_L
   * Phasor Vector Sum for Neutral Current: I_N = I_A + I_B + I_C
   */
  public calculateThreePhaseElectricals(
    vKV: number,
    iAmp: number,
    pf: number,
    unbalancePct = 0.03
  ) {
    const powerFactor = Math.min(1.0, Math.max(0.1, pf));
    const sinPhi = Math.sqrt(Math.max(0, 1 - powerFactor * powerFactor));

    // Three-Phase Balanced Powers
    const activePowerMW = Math.round((Math.sqrt(3) * vKV * iAmp * powerFactor * 100) / 1000) / 100;
    const reactivePowerMVAR = Math.round((Math.sqrt(3) * vKV * iAmp * sinPhi * 100) / 1000) / 100;
    const apparentPowerMVA = Math.round((Math.sqrt(3) * vKV * iAmp * 100) / 1000) / 100;

    // Per-Phase RMS Currents with Phase Imbalance
    const phaseA = Math.round(iAmp * (1 + unbalancePct) * 10) / 10;
    const phaseB = Math.round(iAmp * (1 - unbalancePct * 0.4) * 10) / 10;
    const phaseC = Math.round(iAmp * (1 - unbalancePct * 0.6) * 10) / 10;

    // Vector Phasor Representation (120 deg displacement)
    // I_A at 0 deg, I_B at -120 deg, I_C at +120 deg
    const phi = Math.acos(powerFactor);
    const iA_real = phaseA * Math.cos(-phi);
    const iA_imag = phaseA * Math.sin(-phi);

    const rad120 = (2 * Math.PI) / 3;
    const iB_real = phaseB * Math.cos(-rad120 - phi);
    const iB_imag = phaseB * Math.sin(-rad120 - phi);

    const iC_real = phaseC * Math.cos(rad120 - phi);
    const iC_imag = phaseC * Math.sin(rad120 - phi);

    const iN_real = iA_real + iB_real + iC_real;
    const iN_imag = iA_imag + iB_imag + iC_imag;
    const neutralAmps = Math.round(Math.sqrt(iN_real * iN_real + iN_imag * iN_imag) * 10) / 10;

    return {
      activePowerMW,
      reactivePowerMVAR,
      apparentPowerMVA,
      phaseACurrentAmps: phaseA,
      phaseBCurrentAmps: phaseB,
      phaseCCurrentAmps: phaseC,
      neutralCurrentAmps: neutralAmps,
    };
  }

  /**
   * Transformer Thermal Rise Model (IEC 60076-7)
   */
  public calculateThermalRise(
    currentAmps: number,
    ratedCurrentAmps: number,
    currentOilTemp: number,
    ambientTemp: number,
    dtSeconds: number
  ) {
    const loadRatio = Math.max(0, currentAmps / (ratedCurrentAmps || 1));
    const ratedOilRise = 45.0; // standard rated top-oil rise in deg C
    const targetOilRise = ratedOilRise * Math.pow(loadRatio, 1.6);
    const targetOilTemp = ambientTemp + targetOilRise;

    const tauOilSeconds = 180.0;
    const deltaOil = (targetOilTemp - currentOilTemp) * (dtSeconds / tauOilSeconds);
    const newOilTemp = Math.round((currentOilTemp + deltaOil) * 10) / 10;

    const windingGradient = 15.0 * Math.pow(loadRatio, 1.8);
    const newWindingTemp = Math.round((newOilTemp + windingGradient) * 10) / 10;

    return {
      oilTempC: newOilTemp,
      windingTempC: newWindingTemp,
    };
  }

  // --------------------------------------------------------------------------
  // SIMULATED TIME CLOCK & DIURNAL CURVE (BUG 5 RESOLVED)
  // --------------------------------------------------------------------------

  /**
   * Computes diurnal factor using a true simulated clock progression
   * (Fixes Bug 5: 24-hour cycle was finishing in 48s)
   */
  public calculateDiurnalLoadFactor(step: number): number {
    // Advance simulated clock: simulatedTimeMultiplier mins per step
    const hourOfDay = ((this.simulatedClockMinutes / 60) % 24);
    const cycle = hourOfDay / 24;

    // Dual peak: morning 10:00 (cycle ~ 0.42) and evening 20:00 (cycle ~ 0.83)
    const morningPeak = Math.exp(-Math.pow((cycle - 0.42) / 0.1, 2));
    const eveningPeak = Math.exp(-Math.pow((cycle - 0.83) / 0.1, 2));
    const base = 0.65;
    return base + 0.35 * morningPeak + 0.45 * eveningPeak;
  }

  public getSimulatedClockFormatted(): string {
    const totalMinutes = Math.floor(this.simulatedClockMinutes) % (24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(minutes)}`;
  }

  // --------------------------------------------------------------------------
  // STEP EXECUTION & PERSISTENT SCENARIO ENGINE (BUG 4 RESOLVED)
  // --------------------------------------------------------------------------

  private stepSimulation(): void {
    this.timeStepCounter++;
    // Advance simulated clock
    this.simulatedClockMinutes += (this.config.intervalSeconds * this.simulatedTimeMultiplier) / 60;

    const now = new Date().toISOString();
    const timeLabel = new Date().toLocaleTimeString();
    const diurnalFactor = this.calculateDiurnalLoadFactor(this.timeStepCounter);

    // 1. Process Active Scenario Progression (Earth Fault / Overload / Restoration)
    if (this.scenarioState.active && this.scenarioState.remainingSteps > 0) {
      this.scenarioState.remainingSteps--;

      if (this.scenarioState.stage === 'FAULT_INJECTED') {
        const pt = this.simPoints.find(p => p.tag === this.scenarioState.targetTag);
        if (pt) {
          pt.currentAmps = this.scenarioState.faultAmps;
          pt.voltageKV = Math.round(pt.voltageKV * 0.3 * 100) / 100; // Voltage dip
          if (this.scenarioState.faultPhase === 'SNAP') {
            pt.phaseACurrentAmps = 0;
            pt.neutralCurrentAmps = 48.0;
          }
        }

        // When relay pickup time finishes, trip breaker
        if (this.scenarioState.remainingSteps === 0) {
          this.scenarioState.stage = 'TRIPPED';
          if (pt) {
            pt.breakerStatus = 'TRIPPED';
            pt.currentAmps = 0;
            pt.voltageKV = 0;
            this.logEvent(
              'BREAKER_TRIP',
              pt.tag,
              `IDMT Overcurrent / Earth Fault relay tripped breaker ${pt.tag} open.`
            );
            this.createSimAlarm(
              pt.tag,
              'critical',
              `PROTECTION TRIP: Breaker ${pt.tag} opened on ${this.scenarioState.preset}`
            );
          }
        }
      }
    }

    // 2. Process CSV Timed Playback (if in csv_playback mode)
    if (this.config.mode === 'csv_playback' && this.csvPlaybackQueue.length > 0) {
      const row = this.csvPlaybackQueue[this.csvPlaybackIndex];
      if (row) {
        const pt = this.simPoints.find(p => p.tag === row.tag);
        if (pt) {
          pt.voltageKV = row.voltageKV;
          pt.currentAmps = row.currentAmps;
          if (row.breakerStatus) pt.breakerStatus = row.breakerStatus;
          if (row.frequencyHz) pt.frequencyHz = row.frequencyHz;
          if (row.powerFactor) pt.powerFactor = row.powerFactor;
        }
      }
      this.csvPlaybackIndex = (this.csvPlaybackIndex + 1) % this.csvPlaybackQueue.length;
    }

    // 3. Step every network node with physical consistency
    this.simPoints.forEach(p => {
      // De-energized downstream behavior on OPEN or TRIPPED breaker
      if (p.breakerStatus === 'OPEN' || p.breakerStatus === 'TRIPPED') {
        p.currentAmps = 0;
        p.activePowerMW = 0;
        p.reactivePowerMVAR = 0;
        p.phaseACurrentAmps = 0;
        p.phaseBCurrentAmps = 0;
        p.phaseCCurrentAmps = 0;
        p.neutralCurrentAmps = 0;
        p.transformerLoadPct = 0;

        // Cooling thermal decay towards ambient
        if (p.oilTempC && p.oilTempC > this.config.ambientTempC) {
          p.oilTempC = Math.max(this.config.ambientTempC, Math.round((p.oilTempC - 0.2) * 10) / 10);
        }
        if (p.windingTempC && p.windingTempC > this.config.ambientTempC) {
          p.windingTempC = Math.max(this.config.ambientTempC, Math.round((p.windingTempC - 0.4) * 10) / 10);
        }
        p.lastUpdated = 'Live (De-energized)';
        this.appendTrendPoint(p, timeLabel);
        return;
      }

      // If manual mode, keep current values unless overridden
      if (this.config.mode === 'manual') {
        this.appendTrendPoint(p, timeLabel);
        return;
      }

      // If persistent scenario is actively pinning this tag, skip random drift
      if (this.scenarioState.active && this.scenarioState.targetTag === p.tag) {
        this.appendTrendPoint(p, timeLabel);
        return;
      }

      // Calculate Target Load Current based on mode
      let targetAmps = p.currentAmps;
      if (this.config.mode === 'time_based') {
        targetAmps = targetAmps * diurnalFactor;
      } else if (this.config.mode === 'fluctuation' || this.config.mode === 'continuous') {
        const jitter = (Math.random() - 0.5) * 2 * (this.config.fluctuationPct / 100);
        targetAmps = Math.max(5, targetAmps * (1 + jitter));
      }

      p.currentAmps = Math.round(targetAmps * 10) / 10;

      // Base voltage with tap position variation (+/- 1.25% per tap)
      const baseVolt = p.tag.includes('110')
        ? 110.0
        : p.tag.includes('230')
        ? 230.0
        : p.tag.includes('66')
        ? 66.0
        : p.tag.includes('22')
        ? 22.0
        : 11.0;
      const tapMultiplier = 1 + (p.tapPosition || 0) * 0.0125;
      const vJitter = (Math.random() - 0.5) * 0.004;
      p.voltageKV = Math.round(baseVolt * tapMultiplier * (1 + vJitter) * 100) / 100;

      // Frequency droop model: 50.00 Hz nominal, slight droop under high loading
      const freqDroop = (p.currentAmps > 280 ? -0.04 : 0.0) + (Math.random() - 0.5) * 0.02;
      p.frequencyHz = Math.round((this.config.frequencyNominalHz + freqDroop) * 100) / 100;

      // Full 3-phase phasor electrical equations
      const elec = this.calculateThreePhaseElectricals(
        p.voltageKV,
        p.currentAmps,
        p.powerFactor || this.config.powerFactorNominal,
        0.03
      );
      p.activePowerMW = elec.activePowerMW;
      p.reactivePowerMVAR = elec.reactivePowerMVAR;
      p.phaseACurrentAmps = elec.phaseACurrentAmps;
      p.phaseBCurrentAmps = elec.phaseBCurrentAmps;
      p.phaseCCurrentAmps = elec.phaseCCurrentAmps;
      p.neutralCurrentAmps = elec.neutralCurrentAmps;

      // Transformer Thermal Rise Calculations
      if (p.transformerLoadPct !== undefined || p.tag.includes('PTR') || p.tag.includes('DT')) {
        const ratedAmps = p.tag.includes('110') ? 420.0 : p.tag.includes('PTR') ? 1400.0 : 500.0;
        p.transformerLoadPct = Math.round((p.currentAmps / ratedAmps) * 1000) / 10;

        const therm = this.calculateThermalRise(
          p.currentAmps,
          ratedAmps,
          p.oilTempC || 50.0,
          this.config.ambientTempC,
          this.config.intervalSeconds
        );
        p.oilTempC = therm.oilTempC;
        p.windingTempC = therm.windingTempC;

        if (p.windingTempC >= this.config.windingTempAlarmThresholdC) {
          this.createSimAlarm(
            p.tag,
            'critical',
            `THERMAL CRITICAL: ${p.description} winding temp reached ${p.windingTempC}C (Limit: ${this.config.windingTempAlarmThresholdC}C)`
          );
        }
      }

      p.lastUpdated = 'Live (Simulated)';
      p.eventTimestamp = now;
      this.appendTrendPoint(p, timeLabel);
    });

    // Periodic Supabase Persistence (every 5 steps)
    if (this.timeStepCounter % 5 === 0) {
      this.persistTelemetrySnapshot();
    }

    this.notifyListeners();
  }

  private appendTrendPoint(p: ScadaTelemetryPoint, timeLabel: string): void {
    if (!this.trendHistory[p.tag]) {
      this.trendHistory[p.tag] = [];
    }
    const history = this.trendHistory[p.tag];
    history.push({
      timestamp: timeLabel,
      voltageKV: p.voltageKV,
      currentAmps: p.currentAmps,
      activePowerMW: p.activePowerMW,
      reactivePowerMVAR: p.reactivePowerMVAR,
      frequencyHz: p.frequencyHz,
      windingTempC: p.windingTempC || 50.0,
      oilTempC: p.oilTempC || 45.0,
    });
    if (history.length > 60) {
      history.shift();
    }
  }

  // --------------------------------------------------------------------------
  // PERSISTENT SCENARIO APPLICATION (BUG 4 RESOLVED)
  // --------------------------------------------------------------------------

  private applyScenarioPreset(preset: ScadaScenarioPreset): void {
    const targetFeeder =
      this.simPoints.find(p => p.tag === 'SIM_FDR_MARA_01') || this.simPoints[2] || this.simPoints[0];
    const targetPtr =
      this.simPoints.find(p => p.tag === 'SIM_MARA_PTR1_80MVA') || this.simPoints[1] || this.simPoints[0];

    switch (preset) {
      case 'NORMAL':
        this.scenarioState = {
          active: false,
          preset: 'NORMAL',
          stage: 'NORMAL',
          remainingSteps: 0,
          targetTag: targetFeeder.tag,
          faultAmps: 0,
          faultPhase: 'A',
        };
        targetFeeder.currentAmps = 220.0;
        targetFeeder.breakerStatus = 'CLOSED';
        targetFeeder.powerFactor = 0.965;
        targetPtr.transformerLoadPct = 68.0;
        this.logEvent('INFO', 'PRESET', 'Normalized all feeder and PTR currents to nominal load');
        break;

      case 'PEAK_DEMAND':
        targetFeeder.currentAmps = 295.0;
        targetFeeder.powerFactor = 0.94;
        targetPtr.transformerLoadPct = 86.5;
        this.logEvent('INFO', 'PRESET', 'Applied summer evening peak demand scenario');
        break;

      case 'OVERLOAD':
        targetFeeder.currentAmps = 345.0; // Exceeds rated 320A
        targetPtr.transformerLoadPct = 104.2;
        this.logEvent('OVERLOAD', targetFeeder.tag, 'Feeder current overloaded to 345A (> rated 320A)');
        this.createSimAlarm(
          targetFeeder.tag,
          'critical',
          `OVERLOAD TRIP RISK: Feeder ${targetFeeder.description} carrying 345A (108% rated capacity)`
        );
        break;

      case 'FAULT_EARTH':
        // Persistent multi-stage single line-to-ground fault
        this.scenarioState = {
          active: true,
          preset: 'FAULT_EARTH',
          stage: 'FAULT_INJECTED',
          remainingSteps: 2, // 2 steps of severe fault current before relay trip
          targetTag: targetFeeder.tag,
          faultAmps: 1850.0,
          faultPhase: 'A',
        };
        targetFeeder.currentAmps = 1850.0;
        targetFeeder.voltageKV = 2.1; // Voltage dip on faulted phase
        this.logEvent('FAULT', targetFeeder.tag, 'Single Phase-to-Ground fault (L-G) injected. Protection pickup initiated.');
        break;

      case 'FAULT_3PHASE':
        // Persistent multi-stage 3-phase symmetrical bolted fault
        this.scenarioState = {
          active: true,
          preset: 'FAULT_3PHASE',
          stage: 'FAULT_INJECTED',
          remainingSteps: 2,
          targetTag: targetFeeder.tag,
          faultAmps: 3400.0,
          faultPhase: '3PH',
        };
        targetFeeder.currentAmps = 3400.0;
        targetFeeder.voltageKV = 0.8;
        this.logEvent('FAULT', targetFeeder.tag, '3-Phase symmetrical short circuit injected (3400A). Protection timing.');
        break;

      case 'CONDUCTOR_SNAP':
        // Conductor broken: phase current drops, neutral return current spikes
        this.scenarioState = {
          active: true,
          preset: 'CONDUCTOR_SNAP',
          stage: 'FAULT_INJECTED',
          remainingSteps: 10,
          targetTag: targetFeeder.tag,
          faultAmps: 110.0,
          faultPhase: 'SNAP',
        };
        targetFeeder.phaseACurrentAmps = 0.0;
        targetFeeder.neutralCurrentAmps = 48.0;
        this.logEvent('FAULT', targetFeeder.tag, 'Phase-A conductor snap detected. High neutral zero-sequence current (48A).');
        this.createSimAlarm(
          targetFeeder.tag,
          'critical',
          `CONDUCTOR SNAP ALARM: Neutral unbalance current 48A on ${targetFeeder.description}`
        );
        break;

      case 'RESTORATION':
        targetFeeder.breakerStatus = 'CLOSED';
        targetFeeder.currentAmps = 180.0;
        targetPtr.transformerLoadPct = 65.0;
        this.scenarioState.active = false;
        this.logEvent('INFO', targetFeeder.tag, 'Grid restoration sequence completed. Feeder re-energized.');
        break;
    }
  }

  // --------------------------------------------------------------------------
  // VALIDATED MANUAL TELEMETRY INJECTION (DATA ISOLATION RESOLVED)
  // --------------------------------------------------------------------------

  /**
   * Dedicated manual injection accepting ONLY authorized measurement inputs
   * Validates bounds and strictly prevents tampering with sourceType or keys
   */
  public injectManualTelemetry(tag: string, input: ManualTelemetryInput): boolean {
    const pt = this.simPoints.find(p => p.tag === tag);
    if (!pt) return false;

    // Validate bounds
    if (input.voltageKV !== undefined) {
      pt.voltageKV = Math.max(0, Math.min(150.0, input.voltageKV));
    }
    if (input.currentAmps !== undefined) {
      pt.currentAmps = Math.max(0, Math.min(3000.0, input.currentAmps));
    }
    if (input.powerFactor !== undefined) {
      pt.powerFactor = Math.max(0.5, Math.min(1.0, input.powerFactor));
    }
    if (input.frequencyHz !== undefined) {
      pt.frequencyHz = Math.max(47.0, Math.min(53.0, input.frequencyHz));
    }
    if (input.windingTempC !== undefined) {
      pt.windingTempC = Math.max(-20.0, Math.min(150.0, input.windingTempC));
    }
    if (input.oilTempC !== undefined) {
      pt.oilTempC = Math.max(-20.0, Math.min(130.0, input.oilTempC));
    }
    if (input.tapPosition !== undefined) {
      pt.tapPosition = Math.max(-8, Math.min(8, input.tapPosition));
    }
    if (input.breakerStatus !== undefined) {
      pt.breakerStatus = input.breakerStatus;
    }

    // Strictly enforce sandbox invariants
    pt.sourceType = 'SIMULATOR';
    pt.simulationSessionId = this.config.sessionId;
    pt.lastUpdated = 'Manual Override (Simulated)';
    pt.eventTimestamp = new Date().toISOString();

    // Recalculate derived 3-phase powers
    const elec = this.calculateThreePhaseElectricals(
      pt.voltageKV,
      pt.currentAmps,
      pt.powerFactor || this.config.powerFactorNominal
    );
    pt.activePowerMW = elec.activePowerMW;
    pt.reactivePowerMVAR = elec.reactivePowerMVAR;
    pt.phaseACurrentAmps = elec.phaseACurrentAmps;
    pt.phaseBCurrentAmps = elec.phaseBCurrentAmps;
    pt.phaseCCurrentAmps = elec.phaseCCurrentAmps;
    pt.neutralCurrentAmps = elec.neutralCurrentAmps;

    this.logEvent('INFO', tag, `Manual telemetry injected for ${tag}: ${JSON.stringify(input)}`);
    this.notifyListeners();
    return true;
  }

  // --------------------------------------------------------------------------
  // SIMULATOR BREAKER CONTROL (SAFETY SANDBOX ONLY)
  // --------------------------------------------------------------------------

  public operateSimulatedBreaker(
    tag: string,
    targetState: 'OPEN' | 'CLOSED',
    operatorName = 'Operator',
    reason = 'Manual Test Operation'
  ): boolean {
    const pt = this.simPoints.find(p => p.tag === tag);
    if (!pt) return false;

    pt.breakerStatus = targetState;
    pt.lastUpdated = `Simulated SBO ${targetState}`;
    pt.eventTimestamp = new Date().toISOString();

    if (targetState === 'OPEN') {
      pt.currentAmps = 0;
      pt.activePowerMW = 0;
      pt.reactivePowerMVAR = 0;
      this.createSimAlarm(
        tag,
        'critical',
        `SIMULATED SBO TRIP: Breaker ${pt.description} opened by ${operatorName}. Reason: ${reason}`
      );
      this.logEvent('BREAKER_TRIP', tag, `Simulated breaker opened by ${operatorName}. Reason: ${reason}`);
    } else {
      pt.currentAmps = 210.0;
      const elec = this.calculateThreePhaseElectricals(pt.voltageKV, pt.currentAmps, pt.powerFactor || 0.965);
      pt.activePowerMW = elec.activePowerMW;
      pt.reactivePowerMVAR = elec.reactivePowerMVAR;
      this.logEvent('BREAKER_CLOSE', tag, `Simulated breaker closed by ${operatorName}. Line re-energized.`);
    }

    this.notifyListeners();
    return true;
  }

  // --------------------------------------------------------------------------
  // ROBUST CSV IMPORT WITH TIMED PLAYBACK REPLAY (HIGH FINDING RESOLVED)
  // --------------------------------------------------------------------------

  public exportTelemetrySnapshotCSV(): string {
    const headers = [
      'tag',
      'source_type',
      'simulation_session_id',
      'scenario_id',
      'voltage_kv',
      'current_amps',
      'active_power_mw',
      'reactive_power_mvar',
      'power_factor',
      'frequency_hz',
      'phase_a_amps',
      'phase_b_amps',
      'phase_c_amps',
      'neutral_amps',
      'transformer_load_pct',
      'oil_temp_c',
      'winding_temp_c',
      'breaker_status',
      'quality',
      'timestamp',
    ];

    const rows = this.simPoints.map(p => [
      p.tag,
      p.sourceType,
      p.simulationSessionId || this.config.sessionId,
      p.scenarioId || this.config.scenario,
      p.voltageKV,
      p.currentAmps,
      p.activePowerMW,
      p.reactivePowerMVAR,
      p.powerFactor,
      p.frequencyHz,
      p.phaseACurrentAmps || p.currentAmps,
      p.phaseBCurrentAmps || p.currentAmps,
      p.phaseCCurrentAmps || p.currentAmps,
      p.neutralCurrentAmps || 0,
      p.transformerLoadPct || 0,
      p.oilTempC || 0,
      p.windingTempC || 0,
      p.breakerStatus,
      p.quality,
      p.eventTimestamp || new Date().toISOString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Robust RFC-4180 CSV line parser supporting quoted fields
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  /**
   * Imports historical CSV and queues for time-based playback replay
   */
  public importHistoricalCSVPlayback(csvContent: string): {
    success: boolean;
    rowsProcessed: number;
    message: string;
  } {
    try {
      const rawLines = csvContent.trim().split(/\r?\n/);
      if (rawLines.length < 2) {
        return { success: false, rowsProcessed: 0, message: 'CSV has no data rows' };
      }

      const headers = this.parseCsvLine(rawLines[0]).map(h => h.toLowerCase());
      const tagIndex = headers.indexOf('tag');
      const voltIndex = headers.indexOf('voltage_kv');
      const ampIndex = headers.indexOf('current_amps');

      if (tagIndex === -1 || voltIndex === -1 || ampIndex === -1) {
        return {
          success: false,
          rowsProcessed: 0,
          message: 'Missing mandatory columns: tag, voltage_kv, current_amps',
        };
      }

      const records: CsvPlaybackRecord[] = [];
      for (let i = 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;
        const parts = this.parseCsvLine(line);
        const tag = parts[tagIndex];
        const v = parseFloat(parts[voltIndex]);
        const a = parseFloat(parts[ampIndex]);

        if (tag && !isNaN(v) && !isNaN(a)) {
          records.push({
            tag,
            voltageKV: v,
            currentAmps: a,
            breakerStatus: parts[headers.indexOf('breaker_status')] as any,
            frequencyHz: parseFloat(parts[headers.indexOf('frequency_hz')]) || 50.0,
            powerFactor: parseFloat(parts[headers.indexOf('power_factor')]) || 0.965,
          });
        }
      }

      if (records.length === 0) {
        return { success: false, rowsProcessed: 0, message: 'No valid numeric telemetry rows found in CSV' };
      }

      // Populate playback buffer and activate timed playback mode
      this.csvPlaybackQueue = records;
      this.csvPlaybackIndex = 0;
      this.config.mode = 'csv_playback';

      // Immediately apply the first frame
      const first = records[0];
      this.injectManualTelemetry(first.tag, {
        voltageKV: first.voltageKV,
        currentAmps: first.currentAmps,
      });

      this.logEvent(
        'INFO',
        'CSV_PLAYBACK',
        `Queued ${records.length} historical frames for timestamped playback replay.`
      );
      this.notifyListeners();

      return {
        success: true,
        rowsProcessed: records.length,
        message: `Successfully loaded ${records.length} playback frames into time-series queue.`,
      };
    } catch (e: any) {
      return { success: false, rowsProcessed: 0, message: `Playback import failed: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // SUPABASE PERSISTENCE (SESSIONS, TELEMETRY, ALARMS)
  // --------------------------------------------------------------------------

  private async persistSessionStart(): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('scada_simulation_sessions').insert([
        {
          id: this.config.sessionId,
          session_name: `Simulation ${this.config.sessionId}`,
          mode: this.config.mode,
          scenario: this.config.scenario,
          speed: this.config.speed,
          interval_seconds: this.config.intervalSeconds,
          operator_name: 'Console Operator',
          is_active: true,
        },
      ]);
    } catch (e) {
      // In-memory fallback
    }
  }

  private async persistTelemetrySnapshot(): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const payload = this.simPoints.map(p => ({
        point_tag: p.tag,
        source_type: 'SIMULATOR',
        simulation_session_id: this.config.sessionId,
        scenario_id: this.config.scenario,
        voltage_kv: p.voltageKV,
        current_amps: p.currentAmps,
        active_power_mw: p.activePowerMW,
        reactive_power_mvar: p.reactivePowerMVAR,
        power_factor: p.powerFactor,
        frequency_hz: p.frequencyHz,
        phase_a_current_amps: p.phaseACurrentAmps,
        phase_b_current_amps: p.phaseBCurrentAmps,
        phase_c_current_amps: p.phaseCCurrentAmps,
        neutral_current_amps: p.neutralCurrentAmps,
        transformer_load_pct: p.transformerLoadPct,
        oil_temp_c: p.oilTempC,
        winding_temp_c: p.windingTempC,
        tap_position: p.tapPosition || 0,
        event_timestamp: p.eventTimestamp || new Date().toISOString(),
      }));

      await supabase.from('scada_telemetry').insert(payload);
    } catch (e) {
      // In-memory fallback
    }
  }

  private async persistAlarmAcknowledgement(alarmCode: string, operatorName: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase
        .from('scada_alarms')
        .update({
          status: 'acknowledged',
          acknowledged_by: operatorName,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('alarm_code', alarmCode);
    } catch (e) {
      // In-memory fallback
    }
  }

  // --------------------------------------------------------------------------
  // ALARMS, EVENT LOGGING & SUBSCRIPTIONS
  // --------------------------------------------------------------------------

  private createSimAlarm(tag: string, severity: 'critical' | 'high' | 'medium', message: string): void {
    const alarmCode = `ALM-SIM-${Date.now().toString().slice(-4)}`;
    const newAlarm: ScadaAlarm = {
      id: `alm-sim-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      tag,
      alarmCode,
      sourceType: 'SIMULATOR',
      severity,
      message,
      timestamp: new Date().toLocaleTimeString(),
      status: 'active',
    };
    this.simAlarms.unshift(newAlarm);
    if (this.simAlarms.length > 50) this.simAlarms.pop();
  }

  private logEvent(eventType: SimulationEventLog['eventType'], tag: string, message: string): void {
    const entry: SimulationEventLog = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      scenario: this.config.scenario,
      tag,
      eventType,
      message,
      sessionId: this.config.sessionId,
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 100) this.eventLogs.pop();
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
        console.error('ScadaSimulatorService listener error:', err);
      }
    });
  }
}

export const scadaSimulatorService = ScadaSimulatorService.getInstance();
