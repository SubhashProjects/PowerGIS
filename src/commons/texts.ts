// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// COMMONS: DESCRIPTIVE TEXTS, POLICIES & GUIDANCE STRINGS (SSOT)
// Change any narrative description, disclaimer, or statutory policy text here.
// ============================================================================

export const TEXTS = {
  // 1. Module Subtitles & Operational Overviews
  modules: {
    dashboard: 'Enterprise command console, real-time role jurisdiction assignments, and pending engineering actions.',
    gisMap: 'High-craft geospatial visualizer, 360° bearing rotation control, and multi-scale electrical network overlays.',
    assets: 'Comprehensive inventory register of substations, 11kV/22kV feeders, distribution transformers, and utility poles.',
    capitalProjects: 'Revamped Distribution Sector Scheme (RDSS) infrastructure upgrade execution and financial milestone tracking.',
    smartMeters: 'Advanced Metering Infrastructure (AMI) telecommunication diagnostics, power quality telemetry, and tamper alerts.',
    warranties: 'Asset statutory warranty tracking, OEM guarantee registers, vendor claim workflows, and replacement lifecycle alerts.',
    faults: '8-stage breakdown ticket management lifecycle, geodesic proximity distance calculations, and repair crew dispatch.',
    workOrders: '5-column maintenance task Kanban board, statutory priority classification, and work order assignment.',
    contractorPWA: 'Offline-first Progressive Web App for field survey GPS coordinate logging and multi-tier verification staging.',
    surveyApprovals: 'Multi-tier verification workflow enforcing Junior Engineer physical check before Assistant Engineer GIS publishing.',
    scada: 'Primary substation interactive Single-Line Diagram (SLD), IEC 60870-5-104 telemetry, and SBO safety breaker control.',
    outages: 'Standardized IEEE 1366 reliability indices calculation (SAIFI, SAIDI, CAIDI, ENS) with statutory JERC compliance evaluation.',
    topology: 'Graph-theoretic electrical circuit tracing for downstream customer impact and optimal upstream feeder isolation.',
    preventive: 'Scheduled preventive maintenance calendar, transformer oil breakdown voltage (BDV) logs, and vegetation clearance.',
    dtLoading: 'Distribution transformer thermal load analysis, 3-phase current imbalance detection, and technical loss reduction.',
    stores: 'Central equipment warehouse inventory, transformer spare reserves, scrap disposal registers, and material requisitions.',
    disaster: 'Coastal cyclone hazard mapping, flood-vulnerable asset identification, and rapid post-disaster restoration mobilization.',
    safetyPTW: 'Digital statutory Permit-to-Work (PTW) issuance, lock-out/tag-out (LOTO) verification, and earthing interlocks.',
    assetRisk: 'ISO 55000 asset management framework combining failure probability and failure consequence criticality scoring.',
    backupRestore: 'PostgreSQL/PostGIS database point-in-time snapshots, multi-format spatial exchange (GeoJSON, KML, CSV), and audit archives.',
    adminPanel: 'Super administrator staff credential provisioning, zero-trust territorial scope assignment, and system parameter management.',
  },

  // 2. Statutory & Regulatory Policy Statements
  policies: {
    zeroTrustTitle: 'Zero-Trust Role-Based Territorial Access (RLS)',
    zeroTrustBody: 'Strict statutory jurisdiction scoping is enforced at the database layer. Field personnel operate exclusively within their assigned territorial subdivisions, circles, or vendor contract boundaries.',

    ceaGridCodeTitle: 'CEA Grid Standard & Safety Compliance',
    ceaGridCodeBody: 'All electrical asset parameters, clearance distances, and breaker interlocks adhere strictly to Central Electricity Authority (Measures relating to Safety and Electric Supply) Regulations.',

    jercReliabilityTitle: 'Joint Electricity Regulatory Commission (JERC) Standard of Performance',
    jercReliabilityBody: 'Reliability performance indices (SAIFI, SAIDI, CAIDI) are compiled in accordance with JERC Distribution Code Chapter 7 and IEEE Standard 1366-2012 guidelines.',

    iso55000Title: 'ISO 55000 Asset Management Standard',
    iso55000Body: 'Asset lifecycle optimization, health index scoring, and predictive maintenance schedules are governed by ISO 55001 Asset Management asset risk methodology.',

    ptwSafetyTitle: 'Mandatory Statutory Line Clear Permit (PTW)',
    ptwSafetyBody: 'No physical maintenance or breaker switching may proceed without formal digital Permit-to-Work issuance, verified double earthing, and signed JE/AE handovers.',
  },

  // 3. Clean Standby Mode Guidance (When Simulator is Turned OFF)
  standby: {
    scadaStandbyTitle: 'SCADA Telemetry in Clean Standby Mode',
    scadaStandbyBody: 'No simulated electrical telemetry points are currently being injected. Turn the Grid Simulator ON from the header toolbar to stream dynamic 3-phase waveforms and test breaker telemetry.',

    gatewayStandbyTitle: 'Industrial Gateways on Inactive Standby',
    gatewayStandbyBody: 'Protocol transceivers (IEC-104, Modbus TCP, MQTT) are operating in clean standby mode with 0 synthetic frames.',

    simulationLogsStandbyTitle: 'No Simulation Events in Clean Operational Mode',
    simulationLogsStandbyBody: 'Click "Start Simulator" to initialize simulated fault injection scenarios and dynamic waveform generation.',

    distributionRegionsStandby: '0 simulated regions in clean mode',
    assetsStandbyNotice: 'Operating in pristine clean mode. Zero dummy test assets are displayed.',
  },

  // 4. Modal Dialog Confirmation Notices
  confirmations: {
    deleteUserTitle: 'Confirm Staff Account Deletion',
    deleteUserBody: 'Are you sure you want to permanently delete this staff member record? This will revoke all active zero-trust session tokens immediately.',

    resetDatabaseTitle: 'Confirm System Factory Persona Reset',
    resetDatabaseBody: 'This will reset all staff user accounts and permissions to official default distribution utility personas. Any newly created local accounts will be restored to defaults.',

    breakerTripTitle: 'Statutory Breaker Switching Authorization',
    breakerTripBody: 'Confirm remote operation of this circuit breaker under IEC 60870-5-104 Select-Before-Operate procedure. Field clearance and safety permits must be verified.',

    ptwCancelTitle: 'Permit-to-Work Cancellation',
    ptwCancelBody: 'Are you sure you want to cancel this line clear permit? Any associated breaker lockout tags will be removed.',
  },
} as const;

export type TextsConfig = typeof TEXTS;
