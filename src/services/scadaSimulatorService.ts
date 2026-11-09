// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCADA DYNAMIC TELEMETRY SIMULATOR ENGINE (SECTION 12 & PHASE 3)
// 10 Operating Modes • Physically Consistent 3-Phase Equations • Data Isolation
// ============================================================================

import {
  ScadaTelemetryPoint,
  ScadaAlarm,
  ScadaSimulationConfig,
  ScadaSimulationMode,
  ScadaScenarioPreset,
  ScadaTelemetryQuality,
} from '../types/operations';

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

  // Internal state
  private timer: any = null;
  private simPoints: ScadaTelemetryPoint[] = [];
  private simAlarms: ScadaAlarm[] = [];
  private trendHistory: Record<string, TelemetryTrendPoint[]> = {};
  private eventLogs: SimulationEventLog[] = [];
  private listeners: Array<() => void> = [];
  private timeStepCounter = 0;

  private constructor() {
    this.initializeSimulatedNetwork();
  }

  public static getInstance(): ScadaSimulatorService {
    if (!ScadaSimulatorService.instance) {
      ScadaSimulatorService.instance = new ScadaSimulatorService();
    }
    return ScadaSimulatorService.instance;
  }

  /**
   * Initializes simulated electrical network with complete 3-phase topology
   */
  public initializeSimulatedNetwork(): void {
    const session = this.config.sessionId;
    const now = new Date().toISOString();

    this.simPoints = [
      // 1. Marapalam 110kV Incomer Bus
      {
        id: `sim-pt-mara-110`,
        tag: 'SIM_MARA_110_BUS',
        description: 'Simulated Marapalam 110kV Incomer Bus',
        substationId: 'ss-mara',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 110.8,
        currentAmps: 420.0,
        activePowerMW: 77.2,
        reactivePowerMVAR: 20.8,
        powerFactor: 0.965,
        frequencyHz: 50.01,
        phaseACurrentAmps: 420.0,
        phaseBCurrentAmps: 418.0,
        phaseCCurrentAmps: 422.0,
        neutralCurrentAmps: 3.5,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: now,
        ingestionTimestamp: now,
      },
      // 2. Marapalam PTR-1 80MVA Transformer (110/22kV)
      {
        id: `sim-pt-mara-ptr1`,
        tag: 'SIM_MARA_PTR1_80MVA',
        description: 'Simulated 110/22kV PTR-1 80MVA Transformer',
        substationId: 'ss-mara',
        assetId: 'ptr-mara-1',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 22.1,
        currentAmps: 1840.0,
        activePowerMW: 67.8,
        reactivePowerMVAR: 18.2,
        powerFactor: 0.965,
        frequencyHz: 50.01,
        phaseACurrentAmps: 1840.0,
        phaseBCurrentAmps: 1830.0,
        phaseCCurrentAmps: 1850.0,
        neutralCurrentAmps: 17.3,
        transformerLoadPct: 70.5,
        windingTempC: 62.4,
        oilTempC: 51.8,
        tapPosition: 0,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: now,
        ingestionTimestamp: now,
      },
      // 3. 11kV Feeder 1 (FDR-MARA-01: Commercial Ward)
      {
        id: `sim-pt-mara-fdr1`,
        tag: 'SIM_FDR_MARA_01',
        description: 'Simulated Feeder FDR-MARA-01 (Commercial Ward)',
        substationId: 'ss-mara',
        feederId: 'fdr-mara-1',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 11.2,
        currentAmps: 245.0,
        activePowerMW: 4.59,
        reactivePowerMVAR: 1.23,
        powerFactor: 0.966,
        frequencyHz: 50.01,
        phaseACurrentAmps: 245.0,
        phaseBCurrentAmps: 240.0,
        phaseCCurrentAmps: 242.0,
        neutralCurrentAmps: 4.6,
        transformerLoadPct: 69.0,
        windingTempC: 58.0,
        oilTempC: 48.5,
        tapPosition: 0,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: now,
        ingestionTimestamp: now,
      },
      // 4. 11kV Feeder 2 (FDR-HERI-02: French Quarter Heritage)
      {
        id: `sim-pt-mara-fdr2`,
        tag: 'SIM_FDR_HERI_02',
        description: 'Simulated Feeder FDR-HERI-02 (French Quarter)',
        substationId: 'ss-mara',
        feederId: 'fdr-heri-2',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 11.15,
        currentAmps: 278.0,
        activePowerMW: 5.18,
        reactivePowerMVAR: 1.40,
        powerFactor: 0.965,
        frequencyHz: 50.01,
        phaseACurrentAmps: 278.0,
        phaseBCurrentAmps: 271.0,
        phaseCCurrentAmps: 268.0,
        neutralCurrentAmps: 9.2,
        transformerLoadPct: 78.5,
        windingTempC: 66.2,
        oilTempC: 56.1,
        tapPosition: 1,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: now,
        ingestionTimestamp: now,
      },
      // 5. Villianur 230/110kV EHV Grid Substation
      {
        id: `sim-pt-vill-230`,
        tag: 'SIM_VILL_230_BUS',
        description: 'Simulated Villianur 230kV EHV Incomer Bus',
        substationId: 'ss-vill',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 228.4,
        currentAmps: 510.0,
        activePowerMW: 194.2,
        reactivePowerMVAR: 52.0,
        powerFactor: 0.966,
        frequencyHz: 50.0,
        phaseACurrentAmps: 510.0,
        phaseBCurrentAmps: 508.0,
        phaseCCurrentAmps: 512.0,
        neutralCurrentAmps: 3.5,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: now,
        ingestionTimestamp: now,
      },
      // 6. Bahour 66/11kV Rural Feeder
      {
        id: `sim-pt-bahr-66`,
        tag: 'SIM_BAHR_66_BUS',
        description: 'Simulated Bahour 66kV Substation Bus',
        substationId: 'ss-bahr',
        sourceType: 'SIMULATOR',
        simulationSessionId: session,
        scenarioId: this.config.scenario,
        voltageKV: 66.1,
        currentAmps: 182.0,
        activePowerMW: 20.1,
        reactivePowerMVAR: 5.4,
        powerFactor: 0.966,
        frequencyHz: 50.0,
        phaseACurrentAmps: 182.0,
        phaseBCurrentAmps: 179.0,
        phaseCCurrentAmps: 184.0,
        neutralCurrentAmps: 4.3,
        transformerLoadPct: 58.0,
        windingTempC: 52.0,
        oilTempC: 44.0,
        tapPosition: 0,
        breakerStatus: 'CLOSED',
        quality: 'GOOD',
        lastUpdated: 'Live (Simulated)',
        eventTimestamp: now,
        ingestionTimestamp: now,
      },
    ];

    // Seed initial trend history
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
      `SCADA Simulator network initialized. Session: ${this.config.sessionId}`
    );
  }

  // --------------------------------------------------------------------------
  // SIMULATION CONTROLS
  // --------------------------------------------------------------------------

  public start(): void {
    if (this.config.isRunning && !this.config.isPaused) return;

    this.config.isRunning = true;
    this.config.isPaused = false;
    this.clearInterval();

    const intervalMs = Math.max(200, Math.round((this.config.intervalSeconds * 1000) / this.config.speed));

    this.timer = setInterval(() => {
      this.stepSimulation();
    }, intervalMs);

    this.logEvent(
      'INFO',
      'SIM_START',
      `Simulation started [Mode: ${this.config.mode}, Scenario: ${this.config.scenario}, Speed: ${this.config.speed}x]`
    );
    this.notifyListeners();
  }

  public pause(): void {
    this.config.isPaused = true;
    this.clearInterval();
    this.logEvent('INFO', 'SIM_PAUSE', 'Simulation paused by operator');
    this.notifyListeners();
  }

  public resume(): void {
    if (!this.config.isRunning) {
      this.start();
      return;
    }
    this.config.isPaused = false;
    this.start();
  }

  public stop(): void {
    this.config.isRunning = false;
    this.config.isPaused = false;
    this.clearInterval();
    this.logEvent('INFO', 'SIM_STOP', 'Simulation stopped');
    this.notifyListeners();
  }

  public reset(): void {
    this.stop();
    this.config.sessionId = `SIM-${Date.now().toString().slice(-6)}`;
    this.config.scenario = 'NORMAL';
    this.timeStepCounter = 0;
    this.simAlarms = [];
    this.initializeSimulatedNetwork();
    this.logEvent('INFO', 'SIM_RESET', 'Simulation reset to baseline normal conditions');
    this.notifyListeners();
  }

  public setSpeed(speed: 1 | 2 | 5 | 10): void {
    this.config.speed = speed;
    if (this.config.isRunning && !this.config.isPaused) {
      this.start(); // restart with new speed
    } else {
      this.notifyListeners();
    }
  }

  public setIntervalSeconds(sec: number): void {
    this.config.intervalSeconds = Math.max(1, Math.min(60, sec));
    if (this.config.isRunning && !this.config.isPaused) {
      this.start();
    } else {
      this.notifyListeners();
    }
  }

  public setMode(mode: ScadaSimulationMode): void {
    this.config.mode = mode;
    this.logEvent('INFO', 'SIM_MODE', `Operating mode switched to: ${mode}`);
    this.notifyListeners();
  }

  public setScenario(preset: ScadaScenarioPreset): void {
    this.config.scenario = preset;
    this.logEvent('INFO', 'SIM_SCENARIO', `Scenario activated: ${preset}`);
    this.applyScenarioPreset(preset);
    this.notifyListeners();
  }

  public getConfig(): ScadaSimulationConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ScadaSimulationConfig>): void {
    this.config = { ...this.config, ...updates };
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

  public acknowledgeAlarm(alarmCode: string): void {
    const alm = this.simAlarms.find(a => a.alarmCode === alarmCode);
    if (alm) {
      alm.status = 'acknowledged';
      this.notifyListeners();
    }
  }

  // --------------------------------------------------------------------------
  // PHYSICAL ELECTRICAL CALCULATION ENGINE
  // --------------------------------------------------------------------------

  /**
   * Evaluates balanced or unbalanced 3-phase AC physics
   * P = sqrt(3) * V_LL * I_L * cos(phi) * 1e-3 (MW)
   * Q = sqrt(3) * V_LL * I_L * sin(phi) * 1e-3 (MVAr)
   * S = sqrt(P^2 + Q^2) (MVA)
   */
  public calculateThreePhaseElectricals(
    voltageKV: number,
    currentAmps: number,
    powerFactor: number,
    phaseImbalancePct = 2.0
  ) {
    const pf = Math.max(0.1, Math.min(1.0, powerFactor));
    const sinPhi = Math.sqrt(Math.max(0, 1 - pf * pf));

    // Active power (MW)
    const activePowerMW = Math.round(Math.sqrt(3) * voltageKV * currentAmps * pf * 1e-3 * 100) / 100;

    // Reactive power (MVAr)
    const reactivePowerMVAR = Math.round(Math.sqrt(3) * voltageKV * currentAmps * sinPhi * 1e-3 * 100) / 100;

    // Apparent power (MVA)
    const apparentPowerMVA = Math.round(Math.sqrt(3) * voltageKV * currentAmps * 1e-3 * 100) / 100;

    // Phase currents with imbalance
    const imbFraction = phaseImbalancePct / 100;
    const ir = Math.round(currentAmps * (1 + imbFraction) * 10) / 10;
    const iy = Math.round(currentAmps * (1 - imbFraction * 0.5) * 10) / 10;
    const ib = Math.round(currentAmps * (1 - imbFraction * 0.5) * 10) / 10;

    // Neutral current magnitude: I_N = sqrt(IR^2 + IY^2 + IB^2 - (IR*IY + IY*IB + IB*IR))
    const in_sq = ir * ir + iy * iy + ib * ib - (ir * iy + iy * ib + ib * ir);
    const neutralCurrentAmps = Math.round(Math.sqrt(Math.max(0, in_sq)) * 10) / 10;

    return {
      activePowerMW,
      reactivePowerMVAR,
      apparentPowerMVA,
      phaseACurrentAmps: ir,
      phaseBCurrentAmps: iy,
      phaseCCurrentAmps: ib,
      neutralCurrentAmps,
    };
  }

  /**
   * Exponential thermal rise equation for transformer oil and winding
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

    const tauOilSeconds = 180.0; // time constant in simulation scale
    const deltaOil = (targetOilTemp - currentOilTemp) * (dtSeconds / tauOilSeconds);
    const newOilTemp = Math.round((currentOilTemp + deltaOil) * 10) / 10;

    // Winding temperature gradient over oil: rated 15 deg C * loadRatio^1.8
    const windingGradient = 15.0 * Math.pow(loadRatio, 1.8);
    const newWindingTemp = Math.round((newOilTemp + windingGradient) * 10) / 10;

    return {
      oilTempC: newOilTemp,
      windingTempC: newWindingTemp,
    };
  }

  // --------------------------------------------------------------------------
  // STEP EXECUTION & SCENARIO PROCESSING
  // --------------------------------------------------------------------------

  private stepSimulation(): void {
    this.timeStepCounter++;
    const now = new Date().toISOString();
    const timeLabel = new Date().toLocaleTimeString();

    // Diurnal factor for time-based load curve
    const diurnalFactor = this.calculateDiurnalLoadFactor(this.timeStepCounter);

    this.simPoints.forEach(p => {
      // If breaker is open, current drops to 0
      if (p.breakerStatus === 'OPEN' || p.breakerStatus === 'TRIPPED') {
        p.currentAmps = 0;
        p.activePowerMW = 0;
        p.reactivePowerMVAR = 0;
        p.phaseACurrentAmps = 0;
        p.phaseBCurrentAmps = 0;
        p.phaseCCurrentAmps = 0;
        p.neutralCurrentAmps = 0;
        p.transformerLoadPct = 0;

        // Cooling down to ambient
        if (p.oilTempC && p.oilTempC > this.config.ambientTempC) {
          p.oilTempC = Math.max(this.config.ambientTempC, Math.round((p.oilTempC - 0.2) * 10) / 10);
        }
        if (p.windingTempC && p.windingTempC > this.config.ambientTempC) {
          p.windingTempC = Math.max(this.config.ambientTempC, Math.round((p.windingTempC - 0.4) * 10) / 10);
        }
        p.lastUpdated = 'Live (De-energized)';
        return;
      }

      // Base target current
      let targetAmps = p.currentAmps;

      // Apply mode specific variations
      if (this.config.mode === 'time_based') {
        targetAmps = targetAmps * diurnalFactor;
      } else if (this.config.mode === 'fluctuation' || this.config.mode === 'continuous') {
        const jitter = (Math.random() - 0.5) * 2 * (this.config.fluctuationPct / 100);
        targetAmps = Math.max(5, targetAmps * (1 + jitter));
      }

      p.currentAmps = Math.round(targetAmps * 10) / 10;

      // Tap position influence on voltage (+/- 1.25% per tap)
      const baseVolt = p.tag.includes('110') ? 110.0 : p.tag.includes('230') ? 230.0 : p.tag.includes('66') ? 66.0 : 11.0;
      const tapMultiplier = 1 + (p.tapPosition || 0) * 0.0125;
      const vJitter = (Math.random() - 0.5) * 0.004;
      p.voltageKV = Math.round(baseVolt * tapMultiplier * (1 + vJitter) * 100) / 100;

      // Grid frequency: 50.00 Hz nominal, slight droop with high system load
      const freqDroop = (p.currentAmps > 280 ? -0.04 : 0.0) + (Math.random() - 0.5) * 0.02;
      p.frequencyHz = Math.round((this.config.frequencyNominalHz + freqDroop) * 100) / 100;

      // 3-Phase Electrical calculation
      const elec = this.calculateThreePhaseElectricals(
        p.voltageKV,
        p.currentAmps,
        p.powerFactor || this.config.powerFactorNominal,
        2.5
      );

      p.activePowerMW = elec.activePowerMW;
      p.reactivePowerMVAR = elec.reactivePowerMVAR;
      p.phaseACurrentAmps = elec.phaseACurrentAmps;
      p.phaseBCurrentAmps = elec.phaseBCurrentAmps;
      p.phaseCCurrentAmps = elec.phaseCCurrentAmps;
      p.neutralCurrentAmps = elec.neutralCurrentAmps;

      // Thermal calculations for transformers and feeder bays
      if (p.tag.includes('PTR') || p.tag.includes('FDR')) {
        const ratedAmps = p.tag.includes('PTR') ? 2100 : 320;
        p.transformerLoadPct = Math.round((p.currentAmps / ratedAmps) * 1000) / 10;

        const therm = this.calculateThermalRise(
          p.currentAmps,
          ratedAmps,
          p.oilTempC || 45.0,
          this.config.ambientTempC,
          this.config.intervalSeconds
        );
        p.oilTempC = therm.oilTempC;
        p.windingTempC = therm.windingTempC;

        // Check alarm conditions
        this.checkAlarmsForPoint(p);
      }

      p.lastUpdated = 'Live (Simulated)';
      p.eventTimestamp = now;
      p.ingestionTimestamp = now;

      // Record trend buffer (keep last 60 samples)
      if (!this.trendHistory[p.tag]) this.trendHistory[p.tag] = [];
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
      if (history.length > 60) history.shift();
    });

    this.notifyListeners();
  }

  private calculateDiurnalLoadFactor(step: number): number {
    // 24-step normalized diurnal load curve
    const cycle = (step % 24) / 24;
    // Two peaks: morning 10:00 (cycle ~ 0.42) and evening 20:00 (cycle ~ 0.83)
    const morningPeak = Math.exp(-Math.pow((cycle - 0.42) / 0.1, 2));
    const eveningPeak = Math.exp(-Math.pow((cycle - 0.83) / 0.1, 2));
    const base = 0.65;
    return base + 0.35 * morningPeak + 0.45 * eveningPeak;
  }

  private applyScenarioPreset(preset: ScadaScenarioPreset): void {
    const targetFeeder = this.simPoints.find(p => p.tag === 'SIM_FDR_MARA_01') || this.simPoints[2];
    const targetPtr = this.simPoints.find(p => p.tag === 'SIM_MARA_PTR1_80MVA') || this.simPoints[1];

    switch (preset) {
      case 'NORMAL':
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
        targetFeeder.currentAmps = 1850.0; // Single line to ground fault
        targetFeeder.voltageKV = 2.1; // Voltage collapse on faulted phase
        targetFeeder.breakerStatus = 'TRIPPED';
        this.logEvent('FAULT', targetFeeder.tag, 'Single Phase-to-Ground fault (L-G) injected. Breaker Tripped.');
        this.createSimAlarm(
          targetFeeder.tag,
          'critical',
          `TRIP EVENT: Earth Fault Protection 51N operated on ${targetFeeder.tag}. Current: 1850A`
        );
        break;

      case 'FAULT_3PHASE':
        targetFeeder.currentAmps = 3400.0; // Symmetrical 3-phase short circuit
        targetFeeder.voltageKV = 0.4;
        targetFeeder.breakerStatus = 'TRIPPED';
        this.logEvent('FAULT', targetFeeder.tag, 'Symmetrical 3-Phase Short Circuit fault injected. Breaker Tripped.');
        this.createSimAlarm(
          targetFeeder.tag,
          'critical',
          `TRIP EVENT: Instantaneous Overcurrent 50 operated on ${targetFeeder.tag}. Fault Current: 3400A`
        );
        break;

      case 'CONDUCTOR_SNAP':
        targetFeeder.currentAmps = 12.0; // Line severed downstream
        targetFeeder.neutralCurrentAmps = 48.0; // Heavy neutral imbalance
        this.logEvent('FAULT', targetFeeder.tag, 'Conductor snap / open phase injected. Zero-sequence imbalance detected.');
        this.createSimAlarm(
          targetFeeder.tag,
          'high',
          `ALARM: High Neutral Current (48A) on ${targetFeeder.tag}. Probable conductor snap downstream.`
        );
        break;

      case 'RESTORATION':
        targetFeeder.breakerStatus = 'CLOSED';
        targetFeeder.currentAmps = 180.0;
        targetFeeder.voltageKV = 11.2;
        this.logEvent('INFO', targetFeeder.tag, 'Feeder reclosed. Load restored to 180A in staged sequence.');
        break;
    }
  }

  private checkAlarmsForPoint(p: ScadaTelemetryPoint): void {
    if (p.currentAmps > this.config.currentMaxAmps) {
      this.createSimAlarm(
        p.tag,
        'high',
        `Current overload: ${p.tag} carrying ${p.currentAmps}A (Threshold: ${this.config.currentMaxAmps}A)`
      );
    }
    if (p.oilTempC && p.oilTempC >= this.config.oilTempAlarmThresholdC) {
      this.createSimAlarm(
        p.tag,
        'critical',
        `CEA Statutory Violation: ${p.tag} oil temperature reached ${p.oilTempC}°C (Max allowable: ${this.config.oilTempAlarmThresholdC}°C)`
      );
    }
  }

  private createSimAlarm(tag: string, severity: 'critical' | 'high' | 'medium', message: string): void {
    // Avoid duplicate active alarms within 1 minute
    const existing = this.simAlarms.find(a => a.tag === tag && a.status === 'active' && a.message === message);
    if (existing) return;

    const alarmCode = `ALM-SIM-${Date.now().toString().slice(-4)}`;
    this.simAlarms.unshift({
      id: `sim-alm-${Date.now()}`,
      tag,
      alarmCode,
      sourceType: 'SIMULATOR',
      simulationSessionId: this.config.sessionId,
      severity,
      message,
      status: 'active',
      timestamp: new Date().toLocaleTimeString(),
    });

    if (this.simAlarms.length > 50) this.simAlarms.pop();
  }

  // --------------------------------------------------------------------------
  // MANUAL TELEMETRY INJECTION & BREAKER COMMANDS
  // --------------------------------------------------------------------------

  public injectManualTelemetry(tag: string, updates: Partial<ScadaTelemetryPoint>): boolean {
    const pt = this.simPoints.find(p => p.tag === tag);
    if (!pt) return false;

    Object.assign(pt, updates);
    pt.lastUpdated = 'Manual Override (Simulated)';
    pt.eventTimestamp = new Date().toISOString();

    // Recalculate electricals if V or I changed
    if (updates.voltageKV !== undefined || updates.currentAmps !== undefined || updates.powerFactor !== undefined) {
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
    }

    this.logEvent('INFO', tag, `Manual telemetry injected for ${tag}: ${JSON.stringify(updates)}`);
    this.notifyListeners();
    return true;
  }

  /**
   * Operates breaker strictly within the simulator sandbox (Safety Boundary)
   * Never operates live equipment or pollutes operational faults
   */
  public operateSimulatedBreaker(
    tag: string,
    targetState: 'OPEN' | 'CLOSED',
    operatorName: string,
    reason: string
  ): boolean {
    const pt = this.simPoints.find(p => p.tag === tag);
    if (!pt) return false;

    const prevState = pt.breakerStatus;
    pt.breakerStatus = targetState;
    pt.lastUpdated = 'Just now (Simulated)';

    if (targetState === 'OPEN') {
      pt.currentAmps = 0;
      pt.activePowerMW = 0;
      pt.reactivePowerMVAR = 0;
      this.createSimAlarm(
        tag,
        'critical',
        `SIMULATED SBO TRIP: Breaker ${pt.description} opened by ${operatorName}. Reason: ${reason}`
      );
      this.logEvent('BREAKER_TRIP', tag, `Simulated breaker tripped open by ${operatorName}. Reason: ${reason}`);
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
  // HISTORICAL CSV / EXCEL PLAYBACK & EXPORT
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

  public importHistoricalCSVPlayback(csvContent: string): { success: boolean; rowsProcessed: number; message: string } {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) return { success: false, rowsProcessed: 0, message: 'CSV has no data rows' };

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const tagIndex = headers.indexOf('tag');
      const voltIndex = headers.indexOf('voltage_kv');
      const ampIndex = headers.indexOf('current_amps');

      if (tagIndex === -1 || voltIndex === -1 || ampIndex === -1) {
        return { success: false, rowsProcessed: 0, message: 'Missing mandatory columns (tag, voltage_kv, current_amps)' };
      }

      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length <= Math.max(tagIndex, voltIndex, ampIndex)) continue;

        const tag = parts[tagIndex];
        const v = parseFloat(parts[voltIndex]);
        const a = parseFloat(parts[ampIndex]);

        if (tag && !isNaN(v) && !isNaN(a)) {
          this.injectManualTelemetry(tag, { voltageKV: v, currentAmps: a });
          count++;
        }
      }

      this.logEvent('INFO', 'CSV_PLAYBACK', `Imported ${count} historical telemetry points from CSV.`);
      return { success: true, rowsProcessed: count, message: `Successfully loaded ${count} telemetry playback frames.` };
    } catch (e: any) {
      return { success: false, rowsProcessed: 0, message: `Playback import failed: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // EVENT LOGGING & SUBSCRIPTIONS
  // --------------------------------------------------------------------------

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
        console.error('Simulator listener error:', err);
      }
    });
  }

  private clearInterval(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const scadaSimulatorService = ScadaSimulatorService.getInstance();
