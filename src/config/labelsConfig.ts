// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// CENTRAL LABELS & UI TEXT STRINGS REPOSITORY (SINGLE SOURCE OF TRUTH - SSOT)
// Edit any text label here once and it automatically reflects across the system.
// ============================================================================

export const LABELS = {
  // --------------------------------------------------------------------------
  // 1. COMMON & GLOBAL LABELS
  // --------------------------------------------------------------------------
  common: {
    appName: 'PowerGIS',
    appEdition: 'DISTRIBUTION',
    appTagline: 'PowerGIS',
    version: 'v1.0.0 Enterprise',
    jurisdiction: 'Jurisdiction',
    active: 'Active',
    inactive: 'Inactive',
    status: 'Status',
    actions: 'Actions',
    cancel: 'Cancel',
    save: 'Save Changes',
    saveNew: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search',
    loading: 'Loading...',
    refresh: 'Refresh',
    all: 'All',
    enabled: 'ENABLED',
    disabled: 'DISABLED',
    verified: 'VERIFIED',
    youBadge: 'YOU',
    signOut: 'Sign Out',
    signOutTooltip: 'Sign Out of PowerGIS',
  },

  // --------------------------------------------------------------------------
  // 2. APPLICATION HEADER LABELS
  // --------------------------------------------------------------------------
  header: {
    brandName: 'PowerGIS',
    brandBadge: 'DISTRIBUTION',
    brandSubtitle: 'PowerGIS',
    jurisdictionPrefix: 'Jurisdiction:',
    searchPlaceholder: 'Search (Ctrl + K)',
    searchMobilePlaceholder: 'Search assets, feeders, poles...',
    searchMobileTooltip: 'Search Assets',
    whiteThemeBadge: 'White Theme',
    notificationsTooltip: 'Role Notifications & Assignments',
    notificationsTitle: 'Role Notifications',
    regionsTitle: 'Union Territory Regions',
    adminConsole: 'Admin Console',
    adminConsoleTooltip: 'Super Administrator Management Console',
    signOut: 'Sign Out',
    signOutTooltip: 'Sign Out of PowerGIS',
    menuToggleAria: 'Toggle Navigation Drawer',
  },

  // --------------------------------------------------------------------------
  // 3. SCOPE HUD INDICATOR BANNER
  // --------------------------------------------------------------------------
  scopeHUD: {
    activeIdentityPrefix: 'Active Identity:',
    jurisdictionPrefix: 'Jurisdiction:',
    privilegesPrefix: 'Privileges:',
    rlsActiveBadge: 'RLS Active',
    stagingIsolationSuffix: '(Staging Sandbox Isolation)',
  },

  // --------------------------------------------------------------------------
  // 4. ZERO-TRUST STATUTORY JURISDICTION ACCESS GATE
  // --------------------------------------------------------------------------
  zeroTrustGate: {
    policyBadge: 'Zero-Trust Access Control • Statutory Policy 4.2',
    heading: 'Access Restricted by Role Entitlement',
    messagePrefix: 'Your official active role (',
    messageMiddle: ') is not provisioned with statutory authorization for the module "',
    messageSuffix: '".',
    returnButton: 'Return to Permitted Command Center',
  },

  // --------------------------------------------------------------------------
  // 5. NAVIGATION LABELS (SSOT FOR ALL MODULE TABS)
  // --------------------------------------------------------------------------
  navigation: {
    dashboard: 'Role Dashboard & Tasks',
    gisMap: 'GIS Master Map',
    assets: 'Electrical Assets',
    capitalProjects: 'Capital Projects (RDSS)',
    smartMeters: 'Smart Meter Dashboard',
    warranties: 'Warranties & Lifecycle',
    faults: 'Faults & Distance Calc',
    workOrders: 'Tasks & Work Orders',
    contractorPWA: 'Contractor GPS Survey (PWA)',
    surveyApprovals: 'Survey Approval Queue',
    scada: 'SCADA Telemetry & SLD',
    outages: 'Outages & IEEE Reliability',
    topology: 'Network Topology Tracing',
    preventive: 'Preventive Maintenance',
    dtLoading: 'DT Loading & Imbalance',
    stores: 'Stores & Material Mgmt',
    disaster: 'Disaster Management',
    safetyPTW: 'Safety Permit to Work (PTW)',
    assetRisk: 'ISO 55000 Asset Risk',
    backupRestore: 'Backup & Data Exchange',
    adminPanel: 'Admin Control Panel',
  },

  // --------------------------------------------------------------------------
  // 6. ROLE-BASED DASHBOARD LABELS
  // --------------------------------------------------------------------------
  dashboard: {
    assignmentsTitle: 'Pending Statutory Field Assignments',
    filterAll: 'All Pending',
    filterImmediate: 'Immediate Action',
    filterHigh: 'High Priority',
    noAssignments: 'No assignments pending for current filter.',
    notificationsTitle: 'Notifications',
    notificationsNewSuffix: 'New',
    markAllRead: 'Mark all read',
    quickActionsTitle: 'Authorized Quick Actions',
    quickActionsScopedPrefix: '— Scoped to ',
    quickActionsScopedSuffix: ' entitlements',
    accessModuleCTA: 'Access Module →',
    permissionsAuditTitle: 'Statutory Role Permissions & Field Authorization Audit',
  },

  // --------------------------------------------------------------------------
  // 7. SUPER ADMINISTRATOR CONTROL PANEL LABELS
  // --------------------------------------------------------------------------
  admin: {
    consoleTitle: 'Super Administrator Command Console',
    rootAuthorityBadge: 'ROOT AUTHORITY',
    consoleSubtitle: 'User Accounts & RBAC • PostGIS Migration • Point-in-Time Backups • Zero-Trust Access',
    activeSessionPrefix: 'Active Session:',
    tabUsers: 'Staff Accounts & RBAC',
    tabMigration: 'Geospatial Migration & Backups',
    tabFeatures: 'Modular Feature Toggles',
    searchPlaceholder: 'Search staff by name, email, role, or designation...',
    allRolesOption: 'All Roles',
    addUserButton: 'Add New User',
    resetDefaultTooltip: 'Reset all staff users to factory default initial personas',
    statTotalStaff: 'Total Staff Accounts',
    statActiveStaff: 'Active Accounts',
    statFieldRoles: 'Field Engineering Roles',
    statContractors: 'External Contractors',
    thStaffMember: 'Staff Member',
    thRoleDesignation: 'Role & Designation',
    thJurisdiction: 'Jurisdiction Scope',
    thContact: 'Contact',
    thStatus: 'Status',
    thActions: 'Actions',
    btnTestRole: 'Test Role',
    btnEdit: 'Edit',
    btnDelete: 'Delete',
    emptyTable: 'No staff accounts matching search query or role filter.',
    modalAddTitle: 'Add New Staff User',
    modalAddSubtitle: 'Provision official role & organizational jurisdiction',
    modalEditTitle: 'Edit Staff Profile',
    modalDeleteTitle: 'Confirm Deletion',
    modalDeleteSubtitle: 'Remove staff profile from system',
    modalDeleteConfirmText: 'Are you sure you want to permanently delete the staff record for ',
    modalDeleteConfirmRevoke: 'This will revoke all active zero-trust session tokens.',
    btnDeleteAccount: 'Delete Account',
    btnCreateAccount: 'Create Staff Account',
    accountActiveLabel: 'Account Enabled & Active for Portal Authentication',
    contractorFirmName: 'Contractor Firm Name',
    regionCircle: 'Region / Circle',
    sectionJurisdiction: 'Section Jurisdiction',
    fullNameLabel: 'Full Name & Salutation *',
    usernameLabel: 'Username *',
    emailLabel: 'Official Email *',
    roleLabel: 'Official Role *',
    designationLabel: 'Designation Title',
    phoneLabel: 'Mobile Phone',
    passwordLabel: 'Default Password',
  },

  // --------------------------------------------------------------------------
  // 8. GIS MASTER MAP LABELS
  // --------------------------------------------------------------------------
  gisMap: {
    title: 'GIS Master Map',
    basemapSwitcherTooltip: 'Select Base Map Layer',
    layersTooltip: 'Toggle Distribution Network Layers',
    rotationNorthTooltip: 'Reset Bearing to True North (0°)',
    rotationCWTooltip: 'Rotate Map Clockwise (+15°)',
    rotationCCWTooltip: 'Rotate Map Counter-Clockwise (-15°)',
    bearingLabel: 'Bearing',
    measureDistance: 'Distance Measure',
    measureArea: 'Area Measure',
    clearMeasure: 'Clear Measure',
    centerJurisdiction: 'Center Jurisdiction',
  },

  // --------------------------------------------------------------------------
  // 9. ELECTRICAL ASSET INVENTORY REGISTER
  // --------------------------------------------------------------------------
  assets: {
    registryTitle: 'PowerGIS Electrical Asset Inventory Register',
    searchPlaceholder: 'Search substations, feeders, DTRs, poles, conductors, meters...',
    exportRegistry: 'Export Register',
    tabSubstations: 'Substations',
    tabFeeders: '11kV/22kV Feeders',
    tabTransformers: 'Distribution Transformers',
    tabPoles: 'Utility Poles',
    tabConductors: 'Conductors & Cables',
    tabConsumers: 'Consumer Services',
  },

  // --------------------------------------------------------------------------
  // 10. FAULTS & DISTANCE CALCULATOR
  // --------------------------------------------------------------------------
  faults: {
    moduleTitle: 'Fault Ticket Management & Distance Calculator',
    calcDistanceTitle: 'Geodesic Proximity & Distance Calculation',
    nearestPole: 'Distance from Nearest Pole:',
    nearestDT: 'Distance from Distribution Transformer:',
    feederRouteDistance: 'Distance Along Feeder Route:',
    officeDistance: 'Distance from Section Office:',
    dispatchCrewCTA: 'Dispatch Repair Crew',
    ticketLifecycleTitle: '8-Stage Fault Progression Lifecycle',
  },

  // --------------------------------------------------------------------------
  // 11. WORK ORDERS & TASKS KANBAN
  // --------------------------------------------------------------------------
  workOrders: {
    boardTitle: 'Maintenance Tasks & Work Orders (Kanban)',
    newOrderCTA: 'Create Work Order',
    slaTimeRemaining: 'SLA Time Remaining:',
  },

  // --------------------------------------------------------------------------
  // 12. SURVEYS & APPROVAL WORKFLOW
  // --------------------------------------------------------------------------
  surveys: {
    pwaTitle: 'Contractor Mobile GPS Field Survey (PWA)',
    approvalQueueTitle: 'Multi-Tier Survey Verification & Approval Queue',
    jeVerificationStep: 'JE Physical Field Check',
    aeApprovalStep: 'AE Statutory Approval & Live GIS Publication',
  },

  // --------------------------------------------------------------------------
  // 13. SCADA TELEMETRY & SLD
  // --------------------------------------------------------------------------
  scada: {
    title: 'SCADA Telemetry & Interactive Single-Line Diagram (SLD)',
    protocolBadge: 'IEC 60870-5-104 PROTOCOL',
    telemetryStream: 'Live Bidirectional Telemetry Stream',
    remoteBreakerControl: 'Select-Before-Operate (SBO) Breaker Control',
  },

  // --------------------------------------------------------------------------
  // 14. OUTAGES & IEEE 1366 RELIABILITY
  // --------------------------------------------------------------------------
  outages: {
    title: 'IEEE 1366 Outage Analytics & Reliability Indices',
    saifiLabel: 'SAIFI (Interruption Frequency)',
    saidiLabel: 'SAIDI (Interruption Duration)',
    caidiLabel: 'CAIDI (Customer Average Interruption Duration)',
    ensLabel: 'Energy Not Served (ENS MWh)',
  },

  // --------------------------------------------------------------------------
  // 15. DATA MIGRATION & BACKUPS
  // --------------------------------------------------------------------------
  dataExchange: {
    title: 'Geospatial Data Migration & Exchange (Import / Export)',
    subtitle: 'Standardized OpenGIS Formats • Automated Coordinate Verification',
    importTitle: 'Import Spatial Dataset',
    exportTitle: 'Export Master GIS Network',
    backupTitle: 'PostgreSQL Database Backups & Point-in-Time Snapshots',
    runBackupButton: 'Run Manual Backup',
  },
} as const;

export type LabelsConfig = typeof LABELS;
