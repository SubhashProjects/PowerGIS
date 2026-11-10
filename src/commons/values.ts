// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// COMMONS: STATUTORY VALUES, CONSTANTS & THRESHOLDS (SSOT)
// Change any electrical standard, reliability benchmark, or system threshold here.
// ============================================================================

export const VALUES = {
  // 1. Nominal Electrical Grid Standards (Central Electricity Authority / CEA Grid Code)
  grid: {
    nominalFrequencyHz: 50.0,
    frequencyToleranceHz: 0.5, // 49.5Hz - 50.5Hz statutory band
    frequencyLowTripHz: 48.8,
    frequencyHighTripHz: 51.5,

    // Transmission & Distribution Voltage Classes
    voltageClassesKV: [110, 22, 11, 0.415, 0.23],
    voltageTolerancePercent: 10.0, // Statutory ±10% limit (CEA Rule 54)

    // Standard Primary Feeder Voltage
    primaryFeederVoltageKV: 11.0,
    subTransmissionVoltageKV: 22.0,
    transmissionVoltageKV: 110.0,

    // Secondary Distribution Voltage
    secondaryThreePhaseVoltageV: 415.0,
    secondarySinglePhaseVoltageV: 230.0,

    // Power Factor Standard
    nominalPowerFactor: 0.95,
    minPowerFactorThreshold: 0.85,

    // Transformer Operating Limits
    transformerMaxContinuousLoadPercent: 80.0,
    transformerOverloadWarningPercent: 100.0,
    transformerCriticalTripPercent: 120.0,
    maxWindingTemperatureCelsius: 95.0,
    maxOilTemperatureCelsius: 85.0,
  },

  // 2. IEEE 1366 Reliability Indices Statutory Benchmarks (JERC Standard of Performance)
  reliability: {
    // Joint Electricity Regulatory Commission (JERC) Annual Benchmarks
    targetSAIFI: 3.0,           // System Average Interruption Frequency (events/customer/yr)
    targetSAIDI: 120.0,         // System Average Interruption Duration (minutes/customer/yr)
    targetCAIDI: 45.0,          // Customer Average Interruption Duration (minutes/interruption)
    targetASAI: 0.9995,         // Average System Availability Index (99.95%)

    // Major Event Day (MED) Threshold (IEEE 1366 2.5 Beta Method)
    medBetaMultiplier: 2.5,
    sustainedInterruptionThresholdMinutes: 5.0, // Interruptions > 5 min are sustained
    momentaryInterruptionThresholdSeconds: 300, // Interruptions <= 300s are momentary
  },

  // 3. ISO 55000 Asset Risk Matrix Weightings & Criticality Boundaries
  assetRisk: {
    // Risk Score Tiers (0 - 100 Scale)
    tierLowMax: 25,
    tierModerateMax: 50,
    tierHighMax: 75,
    tierCriticalMax: 100,

    // Composite Weightings: Probability of Failure (PoF) vs Consequence of Failure (CoF)
    pofWeight: 0.45,
    cofWeight: 0.55,

    // Condition Assessment Criteria Weights
    oilDielectricWeight: 0.25,
    dissolvedGasAnalysisWeight: 0.30,
    thermalLoadingHistoryWeight: 0.25,
    assetAgeWeight: 0.20,
  },

  // 4. SCADA Protocol Standards & Telemetry Parameters
  scada: {
    // Protocol Port Standards
    iec104DefaultPort: 2404,
    modbusTcpDefaultPort: 502,
    mqttDefaultPort: 1883,
    webSocketDefaultPort: 8080,

    // Telemetry Polling Intervals (milliseconds)
    telemetryRefreshIntervalMs: 1000,
    fastScanIntervalMs: 250,
    slowScanIntervalMs: 5000,
    staleTelemetryThresholdMs: 15000,

    // SBO (Select-Before-Operate) Safety Interlock Timeout
    sboArmTimeoutSeconds: 30,

    // IEC 60870-5-104 ASDU Type Definitions
    asduSingleCommandType: 45,
    asduDoubleCommandType: 46,
    asduMeasuredShortFloatType: 13,
    asduMeasuredNormalizedType: 9,
    asduIntegratedTotalsType: 15,

    // Cause of Transmission (COT)
    cotSpontaneous: 3,
    cotInterrogation: 20,
    cotActivation: 6,
    cotActivationConfirm: 7,
  },

  // 5. Statutory Security & Strict Password Policy (Zero-Trust Standard)
  security: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    specialCharPattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/,
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutHours: 12,
  },

  // 6. System, UI & Pagination Defaults
  system: {
    maxBorderRadiusPx: 6,
    headerHeightPx: 56,
    sidebarWidthExpandedPx: 256,
    sidebarWidthCollapsedPx: 64,
    defaultTablePageSize: 15,
    maxSearchQueryResults: 20,
    toastAutoDismissDelayMs: 4000,
    geoSearchRadiusMeters: 5000,
  },
} as const;

export type ValuesConfig = typeof VALUES;
