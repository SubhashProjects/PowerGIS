// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// RBAC & ENTITLEMENT MATRIX CONFIGURATION (SSOT)
// 16 Discrete Utility Roles with Field-Level Access Control & Scope HUD
// ============================================================================

import { OfficialRole } from '../types/auth';

export interface RoleDefinition {
  key: OfficialRole;
  title: string;
  designation: string;
  hierarchyTier: number; // 1 = highest (Super Admin), 16 = base
  defaultJurisdiction: string;
  privilegeTags: string[];
  permissions: {
    canSubmitSurvey: boolean;
    canVerifySurvey: boolean;
    canApproveSurvey: boolean;
    canIssuePTW: boolean;
    canReportFault: boolean;
    canEditAssets: boolean;
    canExportData: boolean;
    canConfigureSystem: boolean;
    canOperateSCADA: boolean;
    readOnly: boolean;
  };
}

export const ROLES_REGISTRY: Record<string, RoleDefinition> = {
  super_admin: {
    key: 'super_admin',
    title: 'Super Administrator',
    designation: 'Universal Enterprise Authority',
    hierarchyTier: 1,
    defaultJurisdiction: 'Puducherry UT (Universal State-Wide Oversight)',
    privilegeTags: ['SCADA Switching', 'PTW Clear', 'Topology Trace', 'DB Backup', 'Zero-Trust RLS'],
    permissions: {
      canSubmitSurvey: true,
      canVerifySurvey: true,
      canApproveSurvey: true,
      canIssuePTW: true,
      canReportFault: true,
      canEditAssets: true,
      canExportData: true,
      canConfigureSystem: true,
      canOperateSCADA: true,
      readOnly: false,
    },
  },
  se: {
    key: 'se',
    title: 'Superintending Engineer (SE)',
    designation: 'Circle Chief Administrator',
    hierarchyTier: 2,
    defaultJurisdiction: 'Puducherry Circle (Urban & Rural Circles)',
    privilegeTags: ['RDSS Capital Schemes', 'SCADA Oversight', 'SLA Enforcement', 'PTW Approval'],
    permissions: {
      canSubmitSurvey: false,
      canVerifySurvey: true,
      canApproveSurvey: true,
      canIssuePTW: true,
      canReportFault: true,
      canEditAssets: true,
      canExportData: true,
      canConfigureSystem: false,
      canOperateSCADA: true,
      readOnly: false,
    },
  },
  ee: {
    key: 'ee',
    title: 'Executive Engineer (EE)',
    designation: 'Division Operations Head',
    hierarchyTier: 3,
    defaultJurisdiction: 'Urban Operations Division (Feeders, DTRs & Dispatch)',
    privilegeTags: ['Feeder Dispatch', 'SCADA Switching', 'WO Release', 'Outage Approval'],
    permissions: {
      canSubmitSurvey: false,
      canVerifySurvey: true,
      canApproveSurvey: true,
      canIssuePTW: true,
      canReportFault: true,
      canEditAssets: true,
      canExportData: true,
      canConfigureSystem: false,
      canOperateSCADA: true,
      readOnly: false,
    },
  },
  aee: {
    key: 'aee',
    title: 'Asst. Executive Engineer (AEE)',
    designation: 'Sub-Division Manager',
    hierarchyTier: 4,
    defaultJurisdiction: 'Town Sub-Division (Maintenance Supervision & Approvals)',
    privilegeTags: ['Sub-Div Operations', 'Survey Sign-Off', 'WO Verification'],
    permissions: {
      canSubmitSurvey: false,
      canVerifySurvey: true,
      canApproveSurvey: true,
      canIssuePTW: true,
      canReportFault: true,
      canEditAssets: true,
      canExportData: true,
      canConfigureSystem: false,
      canOperateSCADA: true,
      readOnly: false,
    },
  },
  ae: {
    key: 'ae',
    title: 'Section Engineer (AE)',
    designation: 'Section O&M Officer',
    hierarchyTier: 5,
    defaultJurisdiction: 'Marapalam O&M Section (JE Approval & Fault Cleared Verification)',
    privilegeTags: ['PTW Line Clearance', 'JE Verification', 'SLD Control', 'Breakdown Clearance'],
    permissions: {
      canSubmitSurvey: false,
      canVerifySurvey: true,
      canApproveSurvey: true,
      canIssuePTW: true,
      canReportFault: true,
      canEditAssets: true,
      canExportData: true,
      canConfigureSystem: false,
      canOperateSCADA: true,
      readOnly: false,
    },
  },
  je: {
    key: 'je',
    title: 'Junior Engineer (JE)',
    designation: 'Field Inspection & Verification Engineer',
    hierarchyTier: 6,
    defaultJurisdiction: 'Marapalam Commercial Ward (Strict Local Section Scope)',
    privilegeTags: ['Field Survey Verify', 'Pole Snapping', 'Fault Proximity', 'Local Section Only'],
    permissions: {
      canSubmitSurvey: true,
      canVerifySurvey: true,
      canApproveSurvey: false,
      canIssuePTW: false,
      canReportFault: true,
      canEditAssets: false,
      canExportData: false,
      canConfigureSystem: false,
      canOperateSCADA: false,
      readOnly: false,
    },
  },
  contractor: {
    key: 'contractor',
    title: 'EPC Contractor Project Manager',
    designation: 'Field Survey & Construction Partner',
    hierarchyTier: 7,
    defaultJurisdiction: 'Larsen Power Ltd (Staging Sandbox Isolation)',
    privilegeTags: ['Staging Sandbox Only', 'GPS Photo Upload', 'No Live GIS Writes'],
    permissions: {
      canSubmitSurvey: true,
      canVerifySurvey: false,
      canApproveSurvey: false,
      canIssuePTW: false,
      canReportFault: true,
      canEditAssets: false,
      canExportData: false,
      canConfigureSystem: false,
      canOperateSCADA: false,
      readOnly: false,
    },
  },
  auditor: {
    key: 'auditor',
    title: 'Regulatory & Vigilance Auditor',
    designation: 'Statutory Compliance Inspector',
    hierarchyTier: 8,
    defaultJurisdiction: 'State-Wide Regulatory Compliance & Energy Loss Audits',
    privilegeTags: ['Read-Only RLS', 'Regulatory Exports', 'Loss Audits', 'Tamper Log'],
    permissions: {
      canSubmitSurvey: false,
      canVerifySurvey: false,
      canApproveSurvey: false,
      canIssuePTW: false,
      canReportFault: false,
      canEditAssets: false,
      canExportData: true,
      canConfigureSystem: false,
      canOperateSCADA: false,
      readOnly: true,
    },
  },
  gis_admin: {
    key: 'gis_admin',
    title: 'GIS Spatial Data Administrator',
    designation: 'PostGIS & Topology Lead',
    hierarchyTier: 2,
    defaultJurisdiction: 'Spatial Database Master Topology & Geocoding • PostGIS Engine',
    privilegeTags: ['Topology Snapping', 'Shapefile Dump', 'Spatial Indexing', 'PostGIS RLS'],
    permissions: {
      canSubmitSurvey: true,
      canVerifySurvey: true,
      canApproveSurvey: true,
      canIssuePTW: false,
      canReportFault: true,
      canEditAssets: true,
      canExportData: true,
      canConfigureSystem: true,
      canOperateSCADA: false,
      readOnly: false,
    },
  },
};

export const getRoleDefinition = (role: string): RoleDefinition => {
  return ROLES_REGISTRY[role] || ROLES_REGISTRY.super_admin;
};
