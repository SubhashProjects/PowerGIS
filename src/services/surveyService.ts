// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// CONTRACTOR SURVEY & STAGING APPROVAL WORKFLOW SERVICE
// Enforces: Contractor Draft -> Submit -> JE Verify -> AE Approve -> Production GIS
// ============================================================================

import { SurveySubmission, SurveyStagingAsset, ApprovalHistoryEntry, SurveyStatus, OfflineSurveyRecord } from '../types/surveys';
import { initialSurveys, initialStagingAssets } from '../data/simulatorData';
import { assetService } from './assetService';
import { authService } from './authService';
import { isSupabaseConfigured } from '../lib/supabase';
import { surveyEvidenceRepository } from '../repositories/domain/SurveyEvidenceRepository';
import { surveyRepository } from '../repositories/domain/SurveyRepository';
import { backendService } from './backendService';

export class SurveyService {
  private static instance: SurveyService;
  private simulatedSubmissions: SurveySubmission[] = [...initialSurveys];
  private simulatedStagingAssets: SurveyStagingAsset[] = [...initialStagingAssets];
  private userSubmissions: SurveySubmission[] = [];
  private userStagingAssets: SurveyStagingAsset[] = [];
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

  public getSubmissions(includeSimulated = false): SurveySubmission[] {
    const isSim = assetService.isSimulatorMode() || includeSimulated;
    const list = isSim
      ? [...this.userSubmissions, ...this.simulatedSubmissions]
      : [...this.userSubmissions];

    const user = authService.getCurrentUser();
    if (user.role === 'contractor') {
      return list.filter(s => s.contractorId === user.id);
    }
    return list.filter(s => (s as any).isUserUploaded || authService.isWithinJurisdiction(s));
  }

  public getSubmissionById(id: string): SurveySubmission | undefined {
    return this.userSubmissions.find(s => s.id === id) || this.simulatedSubmissions.find(s => s.id === id);
  }

  public getStagingAssets(submissionId?: string, includeSimulated = false): SurveyStagingAsset[] {
    const isSim = assetService.isSimulatorMode() || includeSimulated;
    const list = isSim
      ? [...this.userStagingAssets, ...this.simulatedStagingAssets]
      : [...this.userStagingAssets];

    if (submissionId) {
      return list.filter(a => a.submissionId === submissionId);
    }
    return list;
  }

  public getApprovalHistory(submissionId: string): ApprovalHistoryEntry[] {
    return this.approvalHistory.filter(h => h.submissionId === submissionId);
  }


  public async loadFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured) return;
    const data = await surveyRepository.submissions();
    const mapped: SurveySubmission[] = data.map((row: any) => ({
      id: row.id,
      submissionCode: row.submission_code,
      contractorId: row.contractor_id,
      contractorName: row.contractor_name ?? '',
      jeId: row.je_id ?? undefined,
      jeName: row.je_name ?? undefined,
      aeId: row.ae_id ?? undefined,
      aeName: row.ae_name ?? undefined,
      sectionId: row.section_id,
      sectionName: row.section_name ?? '',
      jeJurisdictionId: row.je_jurisdiction_id ?? undefined,
      workOrderNumber: row.work_order_number ?? '',
      title: row.title,
      assetCounts: row.asset_counts ?? {},
      status: row.status,
      rejectionReason: row.rejection_reason ?? undefined,
      submittedAt: row.submitted_at ?? row.created_at,
      jeVerifiedAt: row.je_verified_at ?? undefined,
      aeApprovedAt: row.ae_approved_at ?? undefined,
    }));
    this.userSubmissions = mapped;

    const staging = await surveyRepository.stagingAssets();
    this.userStagingAssets = staging.map((row: any) => ({
      id: row.id,
      submissionId: row.submission_id,
      assetType: row.asset_type,
      temporaryCode: row.temporary_code,
      attributes: row.attributes ?? {},
      gpsAccuracyM: Number(row.gps_accuracy_m ?? 0),
      altitudeM: row.altitude_m == null ? undefined : Number(row.altitude_m),
      photoUrl: row.photo_url ?? undefined,
      validationStatus: row.validation_status,
      validationErrors: row.validation_errors ?? undefined,
      coordinates: row.geom?.coordinates ? [Number(row.geom.coordinates[1]), Number(row.geom.coordinates[0])] : [Number.NaN, Number.NaN],
    }));

    const history = await surveyRepository.approvalHistory();
    if (history.length) {
      this.approvalHistory = history.map((row: any) => ({
        id: row.id,
        submissionId: row.submission_id,
        actorId: row.actor_id,
        actorName: row.actor?.full_name ?? 'Unknown',
        actorRole: row.actor?.role ?? 'unknown',
        action: row.action,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        comments: row.comments ?? undefined,
        timestamp: row.created_at,
      }));
    }
  }

  public async submitSurveyAsync(
    title: string,
    workOrderNumber: string,
    stagingItems: Omit<SurveyStagingAsset, 'id' | 'submissionId'>[],
  ): Promise<SurveySubmission> {
    if (!isSupabaseConfigured) throw new Error('Survey backend is not configured.');
    const user = authService.getCurrentUser();
    if (user.role !== 'contractor') throw new Error('Only an authorized contractor can submit a field survey.');
    if (!user.sectionId || !user.jeJurisdictionId) throw new Error('Contractor profile is missing section/jurisdiction assignment.');
    if (!workOrderNumber.trim()) throw new Error('Survey work-order number is required.');
    if (!stagingItems.length) throw new Error('At least one survey asset is required.');

    const items = stagingItems.map(item => ({
      assetType: item.assetType, temporaryCode: item.temporaryCode, attributes: item.attributes,
      gpsAccuracyM: item.gpsAccuracyM, altitudeM: item.altitudeM ?? null, photoUrl: item.photoUrl ?? null,
      validationErrors: item.validationErrors ?? null, locationSource: (item as any).locationSource ?? 'GPS',
      coordinates: item.coordinates, operationId: crypto.randomUUID(),
    }));
    const submissionId = await backendService.rpc<string>('submit_contractor_survey', {
      p_title: title.trim(), p_work_order_number: workOrderNumber.trim(), p_items: items,
    });
    await this.loadFromSupabase();
    const created = this.getSubmissionById(submissionId);
    if (!created) throw new Error('Survey was submitted but could not be reloaded.');
    return created;
  }

  public async syncOfflineAsset(record: OfflineSurveyRecord): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Survey backend is not configured.');
    if (!record.workOrderNumber.trim()) throw new Error('Offline survey work-order number is required before synchronization.');
    const operationId = record.operationId ?? crypto.randomUUID();
    let photoUrl: string | null = null;
    if (record.photoBlob?.startsWith('data:')) {
      const match = record.photoBlob.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: match[1] });
        const path = `${record.contractorId}/${operationId}.${match[1].split('/')[1] || 'jpg'}`;
        await surveyEvidenceRepository.upload(path, blob, match[1]);
        photoUrl = path;
      }
    }
    await backendService.rpc('sync_offline_survey_asset', {
      p_operation_id: operationId,
      p_work_order_number: record.workOrderNumber.trim(),
      p_title: 'Offline contractor field survey',
      p_asset_type: record.assetType,
      p_temporary_code: record.temporaryCode,
      p_attributes: { ...record.attributes, location_source: record.attributes.location_source ?? 'GPS', photo_url: photoUrl },
      p_gps_accuracy_m: record.gpsAccuracyM,
      p_altitude_m: record.altitudeM ?? null,
      p_location_source: record.attributes.location_source ?? 'GPS',
      p_lat: record.coordinates[0],
      p_lng: record.coordinates[1],
    });
  }

  public async jeVerifyAsync(submissionId: string, comments?: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Survey backend is not configured.');
    await backendService.rpc('je_verify_submission', { p_submission_id: submissionId, p_comments: comments ?? 'Field survey inspected and verified' });
    await this.loadFromSupabase();
  }

  public async aeApproveAndPublishAsync(submissionId: string, comments?: string): Promise<number> {
    if (!isSupabaseConfigured) throw new Error('Survey backend is not configured.');
    const result = await backendService.rpc<{ published_assets: number }>('ae_approve_and_publish', { p_submission_id: submissionId, p_comments: comments ?? 'Sanctioned for production GIS' });
    await this.loadFromSupabase();
    return Number(result?.published_assets ?? 0);
  }

  public async rejectSubmissionAsync(submissionId: string, reason: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Survey backend is not configured.');
    if (!reason.trim()) throw new Error('A mandatory rejection reason is required.');
    await backendService.rpc('reject_survey_submission', { p_submission_id: submissionId, p_reason: reason.trim() });
    await this.loadFromSupabase();
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
    const subCode = `SURV-2026-${String(this.userSubmissions.length + this.simulatedSubmissions.length + 1).padStart(3, '0')}`;

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
    (submission as any).isUserUploaded = true;

    this.userSubmissions.unshift(submission);

    // Save staging assets
    stagingItems.forEach((item, idx) => {
      const asset = {
        ...item,
        id: `stg-${Date.now()}-${idx}`,
        submissionId: subId,
      };
      (asset as any).isUserUploaded = true;
      this.userStagingAssets.push(asset);
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
    const sub = this.getSubmissionById(submissionId);
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
    const sub = this.getSubmissionById(submissionId);
    if (!sub) throw new Error('Submission not found');
    if (sub.status !== 'je_verified') throw new Error('Survey must be verified by JE before AE sanction');

    sub.status = 'ae_approved';
    sub.aeId = user.id;
    sub.aeName = user.fullName;
    sub.aeApprovedAt = new Date().toISOString();

    // Atomic promotion: Staging Assets -> Live Production Layer
    const staging = this.getStagingAssets(submissionId, true);
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
    const sub = this.getSubmissionById(submissionId);
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
