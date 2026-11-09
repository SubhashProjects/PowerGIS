// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DOMAIN TYPES: AUTH, ROLES, JURISDICTIONS & PERMISSIONS
// ============================================================================

export type RegionName = 'Puducherry' | 'Karaikal' | 'Mahe' | 'Yanam';

export type OfficialRole =
  | 'super_admin'
  | 'se'                // Superintending Engineer
  | 'ee'                // Executive Engineer
  | 'aee'               // Assistant Executive Engineer
  | 'ae'                // Assistant Engineer
  | 'je'                // Junior Engineer
  | 'contractor'        // Authorized Contractor
  | 'gis_admin'         // GIS Data Administrator
  | 'auditor';          // Read-only Auditor

export interface Region {
  id: string;
  code: string;
  name: RegionName;
  headquarters: string;
}

export interface Division {
  id: string;
  regionId: string;
  code: string;
  name: string;
  eeInCharge: string;
  phone: string;
}

export interface Subdivision {
  id: string;
  divisionId: string;
  code: string;
  name: string;
  aeeInCharge: string;
}

export interface OMSection {
  id: string;
  subdivisionId: string;
  code: string;
  name: string;
  aeInCharge: string;
  officeAddress: string;
  latitude: number;
  longitude: number;
}

export interface JEJurisdiction {
  id: string;
  sectionId: string;
  code: string;
  name: string;
  jeName: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  password?: string;
  fullName: string;
  role: OfficialRole;
  designation: string;
  phone: string;
  regionId?: string;
  divisionId?: string;
  subdivisionId?: string;
  sectionId?: string;
  jeJurisdictionId?: string;
  contractorId?: string;
  contractorCompany?: string;
  isActive: boolean;
}

export interface RolePermission {
  canViewAssets: boolean;
  canEditAssets: boolean;
  canReportFault: boolean;
  canAssignFault: boolean;
  canVerifySurvey: boolean;  // JE verification
  canApproveSurvey: boolean; // AE approval
  canSubmitSurvey: boolean;  // Contractor only
  canIssuePTW: boolean;
  canManageUsers: boolean;
  canConfigureSystem: boolean;
  canExportData: boolean;
}
