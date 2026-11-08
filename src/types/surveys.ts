// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DOMAIN TYPES: CONTRACTOR FIELD SURVEY, STAGING & APPROVAL WORKFLOW
// ============================================================================

export type SurveyStatus = 'draft' | 'submitted' | 'je_verified' | 'ae_approved' | 'rejected';
export type SurveyAssetType = 'pole' | 'transformer' | 'conductor' | 'consumer' | 'streetlight';

export interface SurveySubmission {
  id: string;
  submissionCode: string;
  contractorId: string;
  contractorName: string;
  jeId?: string;
  jeName?: string;
  aeId?: string;
  aeName?: string;
  sectionId: string;
  sectionName: string;
  jeJurisdictionId?: string;
  workOrderNumber: string;
  title: string;
  assetCounts: {
    poles?: number;
    transformers?: number;
    conductors?: number;
    consumers?: number;
    smartMeters?: number;
    streetlights?: number;
  };
  status: SurveyStatus;
  rejectionReason?: string;
  submittedAt: string;
  jeVerifiedAt?: string;
  aeApprovedAt?: string;
}

export interface SurveyStagingAsset {
  id: string;
  submissionId: string;
  assetType: SurveyAssetType;
  temporaryCode: string;
  attributes: Record<string, any>;
  gpsAccuracyM: number;
  altitudeM?: number;
  photoUrl?: string;
  validationStatus: 'valid' | 'warning' | 'error';
  validationErrors?: string;
  coordinates: [number, number];
}

export interface ApprovalHistoryEntry {
  id: string;
  submissionId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'submit' | 'je_verify' | 'ae_approve' | 'reject' | 'resubmit';
  previousStatus: SurveyStatus;
  newStatus: SurveyStatus;
  comments?: string;
  timestamp: string;
}

export interface OfflineSurveyRecord {
  id: string;
  contractorId: string;
  workOrderNumber: string;
  assetType: SurveyAssetType;
  temporaryCode: string;
  coordinates: [number, number];
  gpsAccuracyM: number;
  altitudeM?: number;
  timestamp: string;
  attributes: Record<string, any>;
  photoBlob?: string; // base64 or object URL
  synced: boolean;
}
