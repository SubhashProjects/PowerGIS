// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// CONTRACTOR SURVEY & STAGING APPROVAL WORKFLOW SERVICE
// Enforces: Contractor Draft -> Submit -> JE Verify -> AE Approve -> Production GIS
// ============================================================================

import { SurveySubmission, SurveyStagingAsset, ApprovalHistoryEntry, SurveyStatus } from '../types/surveys';
import { initialSurveys, initialStagingAssets } from './mockData';
import { assetService } from './assetService';
import { authService } from './authService';

export class SurveyService {
  private static instance: SurveyService;
  private submissions: SurveySubmission[] = [...initialSurveys];
  private stagingAssets: SurveyStagingAsset[] = [...initialStagingAssets];
  private approvalHistory: ApprovalHistoryEntry[] = [
    {
      id: 'appr-1',
      submissionId: 'surv-1',
      actorId: 'user-contractor',
      actorName: 'Er. Rajesh Kumar',
      actorRole: 'Contractor',
      action: 'submit',
      previousStatus: 'draft',
      newStatus: 'submitted',
      comments: 'Initial GPS field survey completed for 4 poles and 12 consumer premises',
      timestamp: '2026-11-07T16:00:00Z',
    },
  ];

  private constructor() {}

  public static getInstance(): SurveyService {
    if (!SurveyService.instance) {
      SurveyService.instance = new SurveyService();
    }
    return SurveyService.instance;
  }

  public getSubmissions(): SurveySubmission[] {
    const user = authService.getCurrentUser();
    if (user.role === 'contractor') {
      return this.submissions.filter(s => s.contractorId === user.id);
    }
    return this.submissions.filter(s => authService.isWithinJurisdiction(s));
  }

  public getSubmissionById(id: string): SurveySubmission | undefined {
    return this.submissions.find(s => s.id === id);
  }

  public getStagingAssets(submissionId?: string): SurveyStagingAsset[] {
    if (submissionId) {
      return this.stagingAssets.filter(a => a.submissionId === submissionId);
    }
    return this.stagingAssets;
  }

  public getApprovalHistory(submissionId: string): ApprovalHistoryEntry[] {
    return this.approvalHistory.filter(h => h.submissionId === submissionId);
  }

  /**
   * Contractor Submits Draft
   */
  public submitSurvey(
    title: string,
    workOrderNumber: string,
    stagingItems: Omit<SurveyStagingAsset, 'id' | 'submissionId'>[]
  ): SurveySubmission {
    const user = authService.getCurrentUser();
    const subId = `surv-${Date.now()}`;
    const subCode = `SURV-2026-${String(this.submissions.length + 1).padStart(3, '0')}`;

    const submission: SurveySubmission = {
      id: subId,
      submissionCode: subCode,
      contractorId: user.id,
      contractorName: user.fullName,
      sectionId: user.sectionId || 'sec-mara',
      sectionName: 'Marapalam O&M Section',
      jeJurisdictionId: user.jeJurisdictionId,
      workOrderNumber,
      title,
      assetCounts: {
        poles: stagingItems.filter(i => i.assetType === 'pole').length,
        transformers: stagingItems.filter(i => i.assetType === 'transformer').length,
        consumers: stagingItems.filter(i => i.assetType === 'consumer').length,
      },
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    this.submissions.unshift(submission);

    // Save staging assets
    stagingItems.forEach((item, idx) => {
      this.stagingAssets.push({
        ...item,
        id: `stg-${Date.now()}-${idx}`,
        submissionId: subId,
      });
    });

    // Audit log
    this.approvalHistory.push({
      id: `appr-${Date.now()}`,
      submissionId: subId,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'submit',
      previousStatus: 'draft',
      newStatus: 'submitted',
      comments: 'Field survey submitted for official JE verification',
      timestamp: new Date().toISOString(),
    });

    return submission;
  }

  /**
   * Stage 1 Approval: Junior Engineer (JE) Reviews & Verifies
   */
  public jeVerify(submissionId: string, comments = 'Inspected in field; pole coordinates verified'): void {
    const user = authService.getCurrentUser();
    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) throw new Error('Submission not found');
    if (sub.status !== 'submitted') throw new Error('Only submitted surveys can be verified by JE');

    sub.status = 'je_verified';
    sub.jeId = user.id;
    sub.jeName = user.fullName;
    sub.jeVerifiedAt = new Date().toISOString();

    this.approvalHistory.push({
      id: `appr-${Date.now()}`,
      submissionId,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'je_verify',
      previousStatus: 'submitted',
      newStatus: 'je_verified',
      comments,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stage 2 Approval: Assistant Engineer (AE) Sanctions & Publishes to Live GIS
   */
  public aeApproveAndPublish(submissionId: string, comments = 'Approved for production GIS catalog'): number {
    const user = authService.getCurrentUser();
    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) throw new Error('Submission not found');
    if (sub.status !== 'je_verified') throw new Error('Survey must be verified by JE before AE sanction');

    sub.status = 'ae_approved';
    sub.aeId = user.id;
    sub.aeName = user.fullName;
    sub.aeApprovedAt = new Date().toISOString();

    // Atomic promotion: Staging Assets -> Live Production Layer
    const staging = this.stagingAssets.filter(a => a.submissionId === submissionId);
    staging.forEach(asset => {
      if (asset.assetType === 'pole') {
        assetService.addPole({
          id: `pol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: asset.temporaryCode,
          poleNumber: asset.attributes.pole_number || asset.temporaryCode,
          poleType: asset.attributes.pole_type || 'PSCC 9m',
          material: 'Pre-stressed Concrete',
          heightMeters: 9.0,
          feederId: 'fdr-mara-1',
          numInsulators: 3,
          condition: 'Good',
          hasStreetlight: false,
          installationDate: new Date().toISOString().split('T')[0],
          regionId: 'reg-pdy',
          sectionId: sub.sectionId,
          jeJurisdictionId: sub.jeJurisdictionId,
          status: 'operational',
          coordinates: asset.coordinates,
        });
      } else if (asset.assetType === 'consumer') {
        assetService.addConsumer({
          id: `con-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          consumerNumber: asset.temporaryCode,
          accountNumber: `ACC-${Date.now()}`,
          name: asset.attributes.name || 'Verified Consumer',
          address: asset.attributes.address || 'Puducherry',
          category: 'Domestic',
          sanctionedLoadKW: 3.0,
          meterNumber: asset.attributes.meter_number || asset.temporaryCode,
          isSmartMeter: Boolean(asset.attributes.is_smart_meter),
          meterMake: 'L&T Smart Grid',
          meterInstallDate: new Date().toISOString().split('T')[0],
          status: 'active',
          regionId: 'reg-pdy',
          sectionId: sub.sectionId,
          coordinates: asset.coordinates,
        });
      }
    });

    this.approvalHistory.push({
      id: `appr-${Date.now()}`,
      submissionId,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'ae_approve',
      previousStatus: 'je_verified',
      newStatus: 'ae_approved',
      comments,
      timestamp: new Date().toISOString(),
    });

    return staging.length;
  }

  /**
   * Reject Submission (Mandatory reason required)
   */
  public rejectSubmission(submissionId: string, reason: string): void {
    if (!reason || !reason.trim()) {
      throw new Error('A mandatory reason is required to reject a field survey submission');
    }
    const user = authService.getCurrentUser();
    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) throw new Error('Submission not found');

    const prevStatus = sub.status;
    sub.status = 'rejected';
    sub.rejectionReason = reason;

    this.approvalHistory.push({
      id: `appr-${Date.now()}`,
      submissionId,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'reject',
      previousStatus: prevStatus,
      newStatus: 'rejected',
      comments: `REJECTED: ${reason}`,
      timestamp: new Date().toISOString(),
    });
  }
}

export const surveyService = SurveyService.getInstance();
