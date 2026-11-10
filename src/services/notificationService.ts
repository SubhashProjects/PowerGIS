// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ROLE-BASED NOTIFICATION & TASK ASSIGNMENT SERVICE
// ============================================================================

import { UserProfile, OfficialRole } from '../types/auth';
import { NavTabId } from '../components/layout/Sidebar';
import { assetService } from './assetService';
import { surveyService } from './surveyService';
import { faultService } from './faultService';

export interface RoleNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  priority: 'critical' | 'high' | 'medium' | 'info';
  targetTab: NavTabId;
  read: boolean;
  actionLabel?: string;
}

export interface RoleAssignment {
  id: string;
  taskCode: string;
  title: string;
  category: 'Survey Verification' | 'AE Approval' | 'Fault Restoration' | 'Safety PTW' | 'Maintenance' | 'Capital Project' | 'Audit';
  priority: 'Immediate' | 'High' | 'Normal';
  dueDate: string;
  assignedJurisdiction: string;
  targetTab: NavTabId;
  actionLabel: string;
}

export interface RoleDashboardData {
  roleTitle: string;
  jurisdictionScope: string;
  metrics: Array<{
    label: string;
    value: string | number;
    subtext: string;
    trend?: string;
  }>;
  assignments: RoleAssignment[];
  notifications: RoleNotification[];
  quickActions: Array<{
    label: string;
    targetTab: NavTabId;
    description: string;
  }>;
}

class NotificationService {
  private static instance: NotificationService;
  private readNotificationIds: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public markAsRead(id: string): void {
    this.readNotificationIds.add(id);
  }

  public isRead(id: string): boolean {
    return this.readNotificationIds.has(id);
  }

  public markAllAsRead(notifications: RoleNotification[]): void {
    notifications.forEach(n => this.readNotificationIds.add(n.id));
  }

  public getDashboardData(user: UserProfile): RoleDashboardData {
    if (!assetService.isSimulatorMode()) {
      return this.getCleanDashboardData(user);
    }
    return this.getSimulatedDashboardData(user);
  }

  private getCleanDashboardData(user: UserProfile): RoleDashboardData {
    const userSurveys = surveyService.getSubmissions();
    const userFaults = faultService.getFaults();
    const userPoles = assetService.getPoles();
    const userDTRs = assetService.getTransformers();
    const userFeeders = assetService.getFeeders();
    const userSubstations = assetService.getSubstations();

    const pendingVerifications = userSurveys.filter(s => s.status === 'submitted');
    const pendingApprovals = userSurveys.filter(s => s.status === 'je_verified');
    const activeFaults = userFaults.filter(f => f.status === 'new' || f.status === 'assigned' || f.status === 'in_progress');

    const cleanNotification: RoleNotification = {
      id: 'clean-mode-standby',
      title: 'Clean Operational Mode Active',
      message: 'System is running in clean production state. Test/dummy telemetry is isolated. Turn ON the Simulator to view simulated operational scenarios.',
      timestamp: 'Active',
      priority: 'info',
      targetTab: 'scada',
      read: this.readNotificationIds.has('clean-mode-standby'),
      actionLabel: 'SCADA Simulator',
    };

    const realAssignments: RoleAssignment[] = [];
    if (user.role === 'je' || user.role === 'gis_admin') {
      pendingVerifications.forEach(s => {
        const count = Object.values(s.assetCounts || {}).reduce((a, b) => a + (b || 0), 0);
        realAssignments.push({
          id: `asg-srv-${s.id}`,
          taskCode: s.submissionCode,
          title: `Verify ${count} Staged Assets submitted by ${s.contractorName}`,
          category: 'Survey Verification',
          priority: 'Immediate',
          dueDate: 'Today',
          assignedJurisdiction: s.sectionName || s.jeJurisdictionId || 'Section Scope',
          targetTab: 'survey_approvals',
          actionLabel: 'Verify Staged Assets',
        });
      });
      activeFaults.forEach(f => {
        realAssignments.push({
          id: `asg-flt-${f.id}`,
          taskCode: f.faultCode,
          title: `Investigate Breakdown: ${f.category}`,
          category: 'Fault Restoration',
          priority: 'Immediate',
          dueDate: 'Urgent',
          assignedJurisdiction: f.description || f.sectionId,
          targetTab: 'faults',
          actionLabel: 'Update Restoration',
        });
      });
    } else if (user.role === 'ae') {
      pendingApprovals.forEach(s => {
        realAssignments.push({
          id: `asg-ae-${s.id}`,
          taskCode: s.submissionCode,
          title: `Promote Verified Survey ${s.submissionCode} to Production GIS`,
          category: 'AE Approval',
          priority: 'Immediate',
          dueDate: 'Today',
          assignedJurisdiction: s.sectionName || s.jeJurisdictionId || 'Section Scope',
          targetTab: 'survey_approvals',
          actionLabel: 'Approve & Publish',
        });
      });
    }

    switch (user.role) {
      case 'je':
        return {
          roleTitle: 'Junior Engineer Jurisdiction Command',
          jurisdictionScope: 'Marapalam Commercial Ward (JE-JUR-MARA-01) • Section: Marapalam O&M',
          metrics: [
            { label: 'Pending Verifications', value: pendingVerifications.length, subtext: 'Contractor field surveys awaiting physical check', trend: pendingVerifications.length > 0 ? 'Action Required' : 'All Clear' },
            { label: 'Active Ward Breakdowns', value: activeFaults.length, subtext: 'Reported feeder/conductor faults', trend: activeFaults.length > 0 ? 'Restoration Active' : '0 Breakdowns' },
            { label: 'Ward Utility Poles', value: userPoles.length, subtext: 'HT & LT poles in jurisdiction', trend: userPoles.length > 0 ? 'Imported' : 'Clean Mode' },
            { label: 'Ward Transformers', value: userDTRs.length, subtext: 'DTR units mapped in GIS', trend: userDTRs.length > 0 ? 'Operational' : 'Clean Mode' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Verify Contractor Surveys', targetTab: 'survey_approvals', description: 'Review GPS coordinates and approve stage 1' },
            { label: 'Register New Breakdown Fault', targetTab: 'faults', description: 'Pin fault on map and calculate distance' },
            { label: 'Inspect Ward Distribution Assets', targetTab: 'assets', description: 'View poles, DTs and meters in Marapalam' },
            { label: 'Open GIS Master Map', targetTab: 'gis_map', description: 'Full-screen spatial network inspection' },
          ],
        };
      case 'ae':
        return {
          roleTitle: 'Assistant Engineer Section Operations',
          jurisdictionScope: 'Marapalam O&M Section (SEC-MARAPALAM) • Sub-Division: Town',
          metrics: [
            { label: 'Pending Final Approvals', value: pendingApprovals.length, subtext: 'JE-verified surveys awaiting AE sign-off', trend: pendingApprovals.length > 0 ? 'Pending' : 'All Approved' },
            { label: 'Active Safety PTWs', value: 0, subtext: 'Feeder isolation permits issued', trend: 'Standby' },
            { label: 'Section Feeders', value: userFeeders.length, subtext: 'Energized 11kV/22kV distribution feeders', trend: userFeeders.length > 0 ? 'Active' : 'Clean Mode' },
            { label: 'Section Outages (30d)', value: userFaults.length, subtext: 'Logged customer interruptions', trend: userFaults.length === 0 ? 'Zero Outages' : 'Active' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Final Survey Approvals (Live GIS)', targetTab: 'survey_approvals', description: 'Promote verified staging data into PostGIS' },
            { label: 'Issue Safety Permit to Work (PTW)', targetTab: 'safety_ptw', description: 'Manage isolation, earthing & line clear' },
            { label: 'Section Feeder Outages & SAIDI', targetTab: 'outages', description: 'Review IEEE 1366 reliability indices' },
            { label: 'Preventive Maintenance Schedules', targetTab: 'preventive', description: 'Thermography and transformer BDV logs' },
          ],
        };
      case 'aee':
        return {
          roleTitle: 'Assistant Executive Engineer Sub-Division Overview',
          jurisdictionScope: 'Town Sub-Division (SUBDIV-TOWN) • Sections: Marapalam & Lawspet',
          metrics: [
            { label: 'Sub-Division Feeders', value: userFeeders.length, subtext: 'Distribution feeder network', trend: userFeeders.length > 0 ? 'Mapped' : 'Clean Mode' },
            { label: 'Sub-Division Transformers', value: userDTRs.length, subtext: 'Step-down distribution transformers', trend: userDTRs.length > 0 ? 'Mapped' : 'Clean Mode' },
            { label: 'Active Faults', value: userFaults.length, subtext: 'Open breakdown tickets', trend: userFaults.length === 0 ? 'Normal' : 'Active' },
            { label: 'Queued Surveys', value: userSurveys.length, subtext: 'Contractor GPS submissions', trend: userSurveys.length === 0 ? 'All Clear' : 'Under Review' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Sub-Division Work Orders', targetTab: 'work_orders', description: 'Monitor field gang restoration tasks' },
            { label: 'DT Loading & Imbalance', targetTab: 'dt_loading', description: 'Phase current & thermal load analytics' },
            { label: 'Network Topology Viewer', targetTab: 'topology', description: 'Trace upstream to substation and downstream to meters' },
            { label: 'Open Master Map', targetTab: 'gis_map', description: 'Full spatial network view' },
          ],
        };
      case 'ee':
        return {
          roleTitle: 'Executive Engineer Divisional Command',
          jurisdictionScope: 'Urban Operations Division (DIV-URBAN) • Region: Puducherry',
          metrics: [
            { label: 'Division Substations', value: userSubstations.length, subtext: 'Grid primary substations', trend: userSubstations.length > 0 ? 'Energized' : 'Clean Mode' },
            { label: 'Division Feeders', value: userFeeders.length, subtext: 'Total 11kV & 22kV feeders', trend: userFeeders.length > 0 ? 'Operational' : 'Clean Mode' },
            { label: 'Distribution Transformers', value: userDTRs.length, subtext: 'DTR capacity points', trend: userDTRs.length > 0 ? 'Mapped' : 'Clean Mode' },
            { label: 'Active Division Faults', value: userFaults.length, subtext: 'Unresolved network breakdowns', trend: userFaults.length === 0 ? 'Zero Faults' : 'Active' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Division Outages & IEEE 1366', targetTab: 'outages', description: 'SAIFI, SAIDI, CAIDI and Energy Not Served' },
            { label: 'SCADA Telemetry & Interactive SLD', targetTab: 'scada', description: 'Monitor substation breakers and active alarms' },
            { label: 'ISO 55000 Asset Risk Matrix', targetTab: 'asset_risk', description: 'Equipment failure probability & financial exposure' },
            { label: 'Tasks & Work Orders Kanban', targetTab: 'work_orders', description: 'Manage division-wide gang dispatches' },
          ],
        };
      case 'se':
        return {
          roleTitle: 'Superintending Engineer Circle Executive Oversight',
          jurisdictionScope: `${user.regionId === 'reg-pdy' ? 'Circle I (Urban Puducherry)' : 'Circle II / Outer Regions'} • Superintending Authority`,
          metrics: [
            { label: 'Circle Substations', value: userSubstations.length, subtext: 'Total 110kV/66kV grid substations', trend: userSubstations.length > 0 ? 'Online' : 'Clean Mode' },
            { label: 'Circle Feeders', value: userFeeders.length, subtext: 'Distribution feeder network', trend: userFeeders.length > 0 ? 'Online' : 'Clean Mode' },
            { label: 'Circle Transformers', value: userDTRs.length, subtext: 'Distribution transformers', trend: userDTRs.length > 0 ? 'Operational' : 'Clean Mode' },
            { label: 'Disaster Cell Status', value: 'Standby', subtext: 'Emergency restoration reserves', trend: 'Standby' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Disaster Management & Cyclone Cell', targetTab: 'disaster', description: 'Emergency restoration systems, reserve stock' },
            { label: 'ISO 55000 Asset Risk Scoring', targetTab: 'asset_risk', description: 'Multi-criteria asset criticality & health' },
            { label: 'Equipment Warranty Register', targetTab: 'warranties', description: 'Batch warranties & OEM contract claims' },
            { label: 'Stores & Material Inventory', targetTab: 'stores', description: 'Regional warehouse inventory & reorder limits' },
          ],
        };
      case 'contractor':
        return {
          roleTitle: 'EPC Field Survey Contractor Portal',
          jurisdictionScope: `${user.contractorCompany || 'Larsen Power Infrastructure Ltd'} • Offline GPS Staging`,
          metrics: [
            { label: 'Draft Field Surveys', value: userSurveys.filter(s => s.status === 'draft').length, subtext: 'Local memory / draft submissions', trend: 'Offline Ready' },
            { label: 'Submitted for Verification', value: pendingVerifications.length, subtext: 'Awaiting JE verification', trend: pendingVerifications.length > 0 ? 'Under Review' : 'None' },
            { label: 'Imported GIS Poles', value: userPoles.length, subtext: 'Poles mapped in assigned package', trend: userPoles.length > 0 ? 'Mapped' : 'Clean Mode' },
            { label: 'Live GIS Write Access', value: 'Locked', subtext: 'Staging queue promotion workflow enforced', trend: 'Zero-Trust' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Launch Mobile GPS Field Survey (PWA)', targetTab: 'contractor_pwa', description: 'Map poles, DTs, conductors with live GPS & camera' },
            { label: 'View Submitted Survey Status', targetTab: 'survey_approvals', description: 'Track JE verification & AE approval progress' },
            { label: 'Browse Permitted Ward Assets', targetTab: 'assets', description: 'Read-only view of assets in assigned package' },
          ],
        };
      case 'auditor':
        return {
          roleTitle: 'Regulatory Compliance & Statutory Audit Oversight',
          jurisdictionScope: 'Read-Only Regulatory Compliance Inspection • All Territories',
          metrics: [
            { label: 'Regulatory Compliance', value: '100%', subtext: 'JERC Grid Standards', trend: 'Certified' },
            { label: 'Active Operational Assets', value: userPoles.length + userDTRs.length + userFeeders.length + userSubstations.length, subtext: 'Total spatial objects in PostGIS', trend: 'Synchronized' },
            { label: 'System Mode', value: 'Clean Mode', subtext: 'Simulated dummy telemetry inactive', trend: 'Isolated' },
            { label: 'Asset Write Access', value: 'Zero', subtext: 'Read-Only enforcement', trend: 'Enforced' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Asset Register & Table', targetTab: 'assets', description: 'Browse electrical assets across all 4 regions' },
            { label: 'IEEE 1366 Reliability Metrics', targetTab: 'outages', description: 'SAIFI, SAIDI, CAIDI, and ENS computations' },
            { label: 'Audit Logs & Backup Records', targetTab: 'backup_restore', description: 'Verify tamper-evident change records' },
            { label: 'GIS Master Map Inspection', targetTab: 'gis_map', description: 'Read-only territorial GIS inspection' },
          ],
        };
      case 'super_admin':
        return {
          roleTitle: 'Super Administrator Enterprise Grid Command',
          jurisdictionScope: 'All 4 Regional Enclaves (Puducherry, Karaikal, Mahe, Yanam) • Enterprise Command',
          metrics: [
            { label: 'Distribution Regions', value: 4, subtext: 'Puducherry, Karaikal, Mahe, Yanam', trend: '100% Online' },
            { label: 'Grid Substations', value: userSubstations.length, subtext: 'Substations in database', trend: userSubstations.length > 0 ? 'Energized' : 'Clean Mode' },
            { label: 'Distribution Feeders', value: userFeeders.length, subtext: 'Feeders in database', trend: userFeeders.length > 0 ? 'Energized' : 'Clean Mode' },
            { label: 'Distribution Transformers', value: userDTRs.length, subtext: 'DTRs in database', trend: userDTRs.length > 0 ? 'Operational' : 'Clean Mode' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'SCADA Telemetry & Interactive SLD', targetTab: 'scada', description: 'Monitor substation breakers and active alarms' },
            { label: 'System Administration & User Roles', targetTab: 'admin_panel', description: 'Manage accounts, permissions & security audits' },
            { label: 'Geospatial Backup & Migration', targetTab: 'backup_restore', description: 'Export GeoJSON, CSV & database snapshots' },
            { label: 'Open GIS Master Map', targetTab: 'gis_map', description: 'Full territorial electrical network view' },
          ],
        };
      case 'gis_admin':
      default:
        return {
          roleTitle: 'GIS Spatial Data Administrator',
          jurisdictionScope: 'Spatial Database Master Topology & Geocoding • PostGIS Engine',
          metrics: [
            { label: 'Spatial Layers', value: 17, subtext: 'Overlays in PostGIS', trend: 'Active' },
            { label: 'Operational Assets', value: userPoles.length + userDTRs.length + userFeeders.length + userSubstations.length, subtext: 'Imported GPS features', trend: userPoles.length > 0 ? 'Mapped' : 'Clean Mode' },
            { label: 'Basemap Providers', value: 8, subtext: 'Google, Esri & OSM Color', trend: 'Operational' },
            { label: 'Topology Errors', value: 0, subtext: 'Dangling nodes or loops', trend: 'Zero-Defect' },
          ],
          assignments: realAssignments,
          notifications: [cleanNotification],
          quickActions: [
            { label: 'Import GIS Spatial Data (KML / GeoJSON / CSV)', targetTab: 'backup_restore', description: 'Upload spatial layers into active PostGIS memory' },
            { label: 'Layer Visibility & Hierarchy Tree', targetTab: 'gis_map', description: 'Toggle distribution network overlays and styles' },
            { label: 'Network Topology & Connectivity Tracing', targetTab: 'topology', description: 'Geometric snapping and connectivity validation' },
            { label: 'System Administration & RLS Controls', targetTab: 'admin_panel', description: 'Inspect PostgreSQL row-level security and audit logs' },
          ],
        };
    }
  }

  private getSimulatedDashboardData(user: UserProfile): RoleDashboardData {
    switch (user.role) {
      // ------------------------------------------------------------------------
      // 1. JUNIOR ENGINEER (JE)
      // ------------------------------------------------------------------------
      case 'je':
        return {
          roleTitle: 'Junior Engineer Jurisdiction Command',
          jurisdictionScope: 'Marapalam Commercial Ward (JE-JUR-MARA-01) • Section: Marapalam O&M',
          metrics: [
            { label: 'Pending Verifications', value: 2, subtext: 'Contractor field surveys awaiting physical check', trend: '+1 today' },
            { label: 'Active Ward Breakdowns', value: 1, subtext: 'Snapped LT conductor near Pole P-MARA-004', trend: 'In Progress' },
            { label: 'Ward Utility Poles', value: 5, subtext: 'HT & LT poles in jurisdiction', trend: '100% mapped' },
            { label: 'Ward Transformers', value: 2, subtext: '500kVA & 250kVA DTR units', trend: 'Normal Load' },
          ],
          assignments: [
            {
              id: 'asg-je-1',
              taskCode: 'VERIFY-SRV-001',
              title: 'Verify 3 New LT Poles Erected by Larsen Power',
              category: 'Survey Verification',
              priority: 'Immediate',
              dueDate: 'Today, 14:00',
              assignedJurisdiction: 'Kamaraj Salai, Marapalam Ward',
              targetTab: 'survey_approvals',
              actionLabel: 'Verify Staged Assets',
            },
            {
              id: 'asg-je-2',
              taskCode: 'FLT-RESTORE-001',
              title: 'Supervise LT Conductor Restringing at Junction',
              category: 'Fault Restoration',
              priority: 'Immediate',
              dueDate: 'Today, 11:30',
              assignedJurisdiction: 'Near Pole P-MARA-004',
              targetTab: 'faults',
              actionLabel: 'Update Restoration',
            },
            {
              id: 'asg-je-3',
              taskCode: 'SM-TAMPER-002',
              title: 'Site Inspection: Smart Meter Cover Open Alert',
              category: 'Maintenance',
              priority: 'Normal',
              dueDate: 'Tomorrow',
              assignedJurisdiction: 'Consumer Con-004, Marapalam',
              targetTab: 'smart_meters',
              actionLabel: 'Inspect Meter',
            },
          ],
          notifications: [
            {
              id: 'notif-je-1',
              title: 'New Survey Submitted by Contractor',
              message: 'Larsen Power submitted Survey SRV-2026-001 with 3 staged poles for your field verification.',
              timestamp: '15 mins ago',
              priority: 'high',
              targetTab: 'survey_approvals',
              read: this.readNotificationIds.has('notif-je-1'),
              actionLabel: 'Open Survey',
            },
            {
              id: 'notif-je-2',
              title: 'Breakdown Ticket FLT-2026-001 Assigned',
              message: 'Local resident reported snapped LT conductor at Maraimalai Adigal Salai.',
              timestamp: '42 mins ago',
              priority: 'critical',
              targetTab: 'faults',
              read: this.readNotificationIds.has('notif-je-2'),
              actionLabel: 'View Ticket',
            },
            {
              id: 'notif-je-3',
              title: 'Section Stock Delivery Received',
              message: '200 meters of Rabbit ACSR conductor delivered to Marapalam section stores.',
              timestamp: '2 hours ago',
              priority: 'info',
              targetTab: 'stores',
              read: this.readNotificationIds.has('notif-je-3'),
              actionLabel: 'View Stores',
            },
          ],
          quickActions: [
            { label: 'Verify Contractor Surveys', targetTab: 'survey_approvals', description: 'Review GPS coordinates and approve stage 1' },
            { label: 'Register New Breakdown Fault', targetTab: 'faults', description: 'Pin fault on map and calculate distance' },
            { label: 'Inspect Ward Distribution Assets', targetTab: 'assets', description: 'View poles, DTs and meters in Marapalam' },
            { label: 'Open GIS Master Map', targetTab: 'gis_map', description: 'Full-screen spatial network inspection' },
          ],
        };

      // ------------------------------------------------------------------------
      // 2. ASSISTANT ENGINEER (AE)
      // ------------------------------------------------------------------------
      case 'ae':
        return {
          roleTitle: 'Assistant Engineer Section Operations',
          jurisdictionScope: 'Marapalam O&M Section (SEC-MARAPALAM) • Sub-Division: Town',
          metrics: [
            { label: 'Pending Final Approvals', value: 2, subtext: 'JE-verified surveys awaiting AE sign-off', trend: 'Live Promotion' },
            { label: 'Active Safety PTWs', value: 1, subtext: 'Feeder isolation permits issued', trend: '11kV Line Clear' },
            { label: 'Section Feeder Loading', value: '70%', subtext: '11kV Boulevard East peak current: 245A', trend: 'Stable' },
            { label: 'Section Outages (30d)', value: 1, subtext: 'SAIDI: 42.1 minutes', trend: 'Below threshold' },
          ],
          assignments: [
            {
              id: 'asg-ae-1',
              taskCode: 'AE-APPROVE-002',
              title: 'Publish Verified Survey SRV-2026-002 to Production GIS',
              category: 'AE Approval',
              priority: 'Immediate',
              dueDate: 'Today, 16:00',
              assignedJurisdiction: 'White Town French Quarter Extension',
              targetTab: 'survey_approvals',
              actionLabel: 'Approve & Publish',
            },
            {
              id: 'asg-ae-2',
              taskCode: 'PTW-ISSUE-081',
              title: 'Issue Safety Permit to Work: 11kV Feeder Line Clear',
              category: 'Safety PTW',
              priority: 'Immediate',
              dueDate: 'Today, 10:00',
              assignedJurisdiction: 'Marapalam 110/22kV Substation Bay 2',
              targetTab: 'safety_ptw',
              actionLabel: 'Authorize PTW',
            },
            {
              id: 'asg-ae-3',
              taskCode: 'AE-INSPECT-003',
              title: 'Quarterly Oil BDV Dielectric Test for DT-01',
              category: 'Maintenance',
              priority: 'Normal',
              dueDate: 'In 3 days',
              assignedJurisdiction: '500kVA Marapalam Market DT',
              targetTab: 'preventive',
              actionLabel: 'View Schedule',
            },
          ],
          notifications: [
            {
              id: 'notif-ae-1',
              title: 'Survey Verified by JE Er. V. Anand',
              message: 'JE Anand completed physical check of Survey SRV-2026-002. Awaiting your final publication signature.',
              timestamp: '25 mins ago',
              priority: 'high',
              targetTab: 'survey_approvals',
              read: this.readNotificationIds.has('notif-ae-1'),
              actionLabel: 'Review Approval',
            },
            {
              id: 'notif-ae-2',
              title: 'Permit to Work Line Clear Requested',
              message: 'Maintenance gang requested 3-hour shutdown on Feeder FDR-MARA-01 for tree trimming.',
              timestamp: '1 hour ago',
              priority: 'high',
              targetTab: 'safety_ptw',
              read: this.readNotificationIds.has('notif-ae-2'),
              actionLabel: 'Review PTW',
            },
            {
              id: 'notif-ae-3',
              title: 'Section Health Index 88.5%',
              message: 'All 7 distribution transformers in section operating within safe thermal ratings.',
              timestamp: '3 hours ago',
              priority: 'info',
              targetTab: 'dt_loading',
              read: this.readNotificationIds.has('notif-ae-3'),
              actionLabel: 'View DT Loading',
            },
          ],
          quickActions: [
            { label: 'Final Survey Approvals (Live GIS)', targetTab: 'survey_approvals', description: 'Promote verified staging data into PostGIS' },
            { label: 'Issue Safety Permit to Work (PTW)', targetTab: 'safety_ptw', description: 'Manage isolation, earthing & line clear' },
            { label: 'Section Feeder Outages & SAIDI', targetTab: 'outages', description: 'Review IEEE 1366 reliability indices' },
            { label: 'Preventive Maintenance Schedules', targetTab: 'preventive', description: 'Thermography and transformer BDV logs' },
          ],
        };

      // ------------------------------------------------------------------------
      // 3. ASSISTANT EXECUTIVE ENGINEER (AEE)
      // ------------------------------------------------------------------------
      case 'aee':
        return {
          roleTitle: 'Assistant Executive Engineer Sub-Division Overview',
          jurisdictionScope: 'Town Sub-Division (SUBDIV-TOWN) • Sections: Marapalam & Lawspet',
          metrics: [
            { label: 'Sub-Division Sections', value: 2, subtext: 'Marapalam & Lawspet O&M Sections', trend: 'Operational' },
            { label: 'Sub-Division Transformers', value: 4, subtext: 'Total capacity: 1,250 kVA', trend: '72% Avg Load' },
            { label: 'Open Work Orders', value: 3, subtext: '1 Urgent restoration, 2 Preventive', trend: 'On Schedule' },
            { label: 'Maintenance Compliance', value: '94%', subtext: 'Thermography & BDV completion', trend: '+4% this month' },
          ],
          assignments: [
            {
              id: 'asg-aee-1',
              taskCode: 'SUPV-WO-102',
              title: 'Supervise 400 kVA DT Replacement at Lawspet Main',
              category: 'Maintenance',
              priority: 'High',
              dueDate: 'Tomorrow, 10:00',
              assignedJurisdiction: 'Lawspet Section, Town Sub-Division',
              targetTab: 'work_orders',
              actionLabel: 'Review Work Order',
            },
            {
              id: 'asg-aee-2',
              taskCode: 'SUPV-SAFETY-004',
              title: 'Review Sub-Division Earthing Compliance Audit',
              category: 'Safety PTW',
              priority: 'Normal',
              dueDate: 'In 5 days',
              assignedJurisdiction: 'Town Sub-Division',
              targetTab: 'safety_ptw',
              actionLabel: 'Audit Records',
            },
          ],
          notifications: [
            {
              id: 'notif-aee-1',
              title: 'Sub-Division Peak Load Alert',
              message: 'Town Sub-Division demand reached 38 MW during peak evening window.',
              timestamp: '1 hour ago',
              priority: 'medium',
              targetTab: 'dt_loading',
              read: this.readNotificationIds.has('notif-aee-1'),
              actionLabel: 'Inspect Loading',
            },
            {
              id: 'notif-aee-2',
              title: 'Contractor EPC Milestone Progress',
              message: 'Larsen Power completed 85% of pole mapping in Marapalam section.',
              timestamp: '3 hours ago',
              priority: 'info',
              targetTab: 'survey_approvals',
              read: this.readNotificationIds.has('notif-aee-2'),
              actionLabel: 'Survey Status',
            },
          ],
          quickActions: [
            { label: 'Sub-Division Work Orders', targetTab: 'work_orders', description: 'Monitor field gang restoration tasks' },
            { label: 'DT Loading & Imbalance', targetTab: 'dt_loading', description: 'Phase current & thermal load analytics' },
            { label: 'Network Topology Viewer', targetTab: 'topology', description: 'Trace upstream to substation and downstream to meters' },
            { label: 'Open Master Map', targetTab: 'gis_map', description: 'Full spatial network view' },
          ],
        };

      // ------------------------------------------------------------------------
      // 4. EXECUTIVE ENGINEER (EE)
      // ------------------------------------------------------------------------
      case 'ee':
        return {
          roleTitle: 'Executive Engineer Divisional Command',
          jurisdictionScope: 'Urban Operations Division (DIV-URBAN) • Region: Puducherry',
          metrics: [
            { label: 'Division SAIFI Index', value: 1.13, subtext: 'Target: < 1.50 per consumer/yr', trend: 'JERC Compliant' },
            { label: 'Division SAIDI Index', value: '43.3m', subtext: 'Avg outage duration per consumer', trend: '-8% vs 2025' },
            { label: 'Primary Substations', value: 4, subtext: 'Marapalam, Villianur, Lawspet, Muthialpet', trend: 'All Energized' },
            { label: 'Capital EPC Work Orders', value: 6, subtext: 'Underground cabling & smart metering', trend: '4 Active' },
          ],
          assignments: [
            {
              id: 'asg-ee-1',
              taskCode: 'SANCTION-WO-104',
              title: 'Sanction Capital Work Order: Boulevard UG Cabling',
              category: 'Capital Project',
              priority: 'Immediate',
              dueDate: 'Today, 17:00',
              assignedJurisdiction: 'Urban Division, French Quarter',
              targetTab: 'work_orders',
              actionLabel: 'Sanction WO',
            },
            {
              id: 'asg-ee-2',
              taskCode: 'JERC-REPORT-Q3',
              title: 'Authorize IEEE 1366 Reliability Metrics for JERC Filing',
              category: 'Audit',
              priority: 'High',
              dueDate: 'In 2 days',
              assignedJurisdiction: 'Urban Division-Wide',
              targetTab: 'outages',
              actionLabel: 'Sign Report',
            },
          ],
          notifications: [
            {
              id: 'notif-ee-1',
              title: 'SCADA Telemetry Alert: Venkata Nagar 33kV',
              message: 'Transformer oil temperature elevated to 68°C. Cooling fans activated.',
              timestamp: '35 mins ago',
              priority: 'high',
              targetTab: 'scada',
              read: this.readNotificationIds.has('notif-ee-1'),
              actionLabel: 'Open SCADA',
            },
            {
              id: 'notif-ee-2',
              title: 'Monthly Reliability Index Verified',
              message: 'SAIFI index calculated at 1.13 and SAIDI at 43.3 minutes across 125,000 consumers.',
              timestamp: '2 hours ago',
              priority: 'info',
              targetTab: 'outages',
              read: this.readNotificationIds.has('notif-ee-2'),
              actionLabel: 'View Indices',
            },
          ],
          quickActions: [
            { label: 'Division Outages & IEEE 1366', targetTab: 'outages', description: 'SAIFI, SAIDI, CAIDI and Energy Not Served' },
            { label: 'SCADA Telemetry & Interactive SLD', targetTab: 'scada', description: 'Monitor substation breakers and active alarms' },
            { label: 'ISO 55000 Asset Risk Matrix', targetTab: 'asset_risk', description: 'Equipment failure probability & financial exposure' },
            { label: 'Tasks & Work Orders Kanban', targetTab: 'work_orders', description: 'Manage division-wide gang dispatches' },
          ],
        };

      // ------------------------------------------------------------------------
      // 5. SUPERINTENDING ENGINEER (SE)
      // ------------------------------------------------------------------------
      case 'se':
        return {
          roleTitle: 'Superintending Engineer Circle Executive Oversight',
          jurisdictionScope: `${user.regionId === 'reg-pdy' ? 'Circle I (Urban Puducherry)' : 'Circle II / Outer Regions'} • Superintending Authority`,
          metrics: [
            { label: 'Circle Peak Grid Load', value: '142 MW', subtext: 'Substation capacity: 220 MVA', trend: '64.5% Peak' },
            { label: 'High Risk Assets (ISO 55000)', value: 2, subtext: 'Criticality > 75 requiring CAPEX', trend: 'Mitigation Queued' },
            { label: 'Active Warranty Claims', value: 3, subtext: 'OEM warranty claims for defective DTs', trend: '₹14.2 Lakhs' },
            { label: 'Disaster Readiness Index', value: '98%', subtext: 'Reserve poles, mobile DGs ready', trend: 'Cyclone Protocol' },
          ],
          assignments: [
            {
              id: 'asg-se-1',
              taskCode: 'DISASTER-SOP-ALERT-2',
              title: 'Approve Cyclone Readiness Alert Level 2 Protocol',
              category: 'Capital Project',
              priority: 'Immediate',
              dueDate: 'Today, 12:00',
              assignedJurisdiction: 'Coastal Puducherry & Karaikal',
              targetTab: 'disaster',
              actionLabel: 'Activate SOP',
            },
            {
              id: 'asg-se-2',
              taskCode: 'WARRANTY-SETTLEMENT-03',
              title: 'Review OEM Settlement: 500kVA DT Burnout Warranty',
              category: 'Audit',
              priority: 'Normal',
              dueDate: 'In 4 days',
              assignedJurisdiction: 'Central Stores Puducherry',
              targetTab: 'warranties',
              actionLabel: 'Review Claim',
            },
          ],
          notifications: [
            {
              id: 'notif-se-1',
              title: 'IMD Coastal Cyclone Advisory Alert',
              message: 'Depression forming in southwest Bay of Bengal. Emergency restoration systems put on standby.',
              timestamp: '45 mins ago',
              priority: 'critical',
              targetTab: 'disaster',
              read: this.readNotificationIds.has('notif-se-1'),
              actionLabel: 'Emergency Cell',
            },
            {
              id: 'notif-se-2',
              title: 'Annual Asset Replacement Budget Review',
              message: 'ISO 55000 assessment highlights 8 conductor spans for recabling in upcoming FY.',
              timestamp: '4 hours ago',
              priority: 'info',
              targetTab: 'asset_risk',
              read: this.readNotificationIds.has('notif-se-2'),
              actionLabel: 'Risk Matrix',
            },
          ],
          quickActions: [
            { label: 'Disaster Management & Cyclone Cell', targetTab: 'disaster', description: 'Emergency restoration systems, reserve stock' },
            { label: 'ISO 55000 Asset Risk Scoring', targetTab: 'asset_risk', description: 'Multi-criteria asset criticality & health' },
            { label: 'Equipment Warranty Register', targetTab: 'warranties', description: 'Batch warranties & OEM contract claims' },
            { label: 'Stores & Material Inventory', targetTab: 'stores', description: 'Regional warehouse inventory & reorder limits' },
          ],
        };

      // ------------------------------------------------------------------------
      // 6. CONTRACTOR
      // ------------------------------------------------------------------------
      case 'contractor':
        return {
          roleTitle: 'EPC Field Survey Contractor Portal',
          jurisdictionScope: `${user.contractorCompany || 'Larsen Power Infrastructure Ltd'} • Offline GPS Staging`,
          metrics: [
            { label: 'Draft Field Surveys', value: 2, subtext: 'Stored in local IndexedDB memory', trend: 'Offline Ready' },
            { label: 'Submitted for Verification', value: 1, subtext: 'Awaiting JE Anand verification', trend: 'Under Review' },
            { label: 'GPS Geolocation Accuracy', value: '±1.8m', subtext: 'Differential GPS fix active', trend: 'High Precision' },
            { label: 'Live GIS Write Access', value: 'Locked', subtext: 'Staging queue promotion workflow enforced', trend: 'Zero-Trust' },
          ],
          assignments: [
            {
              id: 'asg-con-1',
              taskCode: 'SURVEY-WARD-04',
              title: 'GPS Survey 4 New Poles on Heritage French Quarter Circuit',
              category: 'Survey Verification',
              priority: 'Immediate',
              dueDate: 'Today, 18:00',
              assignedJurisdiction: 'White Town Promenade',
              targetTab: 'contractor_pwa',
              actionLabel: 'Launch PWA Survey',
            },
            {
              id: 'asg-con-2',
              taskCode: 'SYNC-OFFLINE-QUEUE',
              title: 'Sync 2 Offline Field Records from Device Memory',
              category: 'Survey Verification',
              priority: 'Normal',
              dueDate: 'Today, 20:00',
              assignedJurisdiction: 'Marapalam Field Survey',
              targetTab: 'contractor_pwa',
              actionLabel: 'Sync IndexedDB',
            },
          ],
          notifications: [
            {
              id: 'notif-con-1',
              title: 'Survey SRV-2026-001 Under JE Verification',
              message: 'JE Er. V. Anand has initiated physical field check of your staged poles.',
              timestamp: '30 mins ago',
              priority: 'info',
              targetTab: 'contractor_pwa',
              read: this.readNotificationIds.has('notif-con-1'),
              actionLabel: 'View Status',
            },
            {
              id: 'notif-con-2',
              title: 'GPS Satellite Fix Acquired',
              message: 'Device RTK/GNSS accuracy locked at 1.8m. Suitable for asset geocoding.',
              timestamp: '1 hour ago',
              priority: 'info',
              targetTab: 'contractor_pwa',
              read: this.readNotificationIds.has('notif-con-2'),
              actionLabel: 'Open PWA',
            },
          ],
          quickActions: [
            { label: 'Launch Mobile GPS Field Survey (PWA)', targetTab: 'contractor_pwa', description: 'Map poles, DTs, conductors with live GPS & camera' },
            { label: 'View Submitted Survey Status', targetTab: 'survey_approvals', description: 'Track JE verification & AE approval progress' },
            { label: 'Browse Permitted Ward Assets', targetTab: 'assets', description: 'Read-only view of assets in assigned package' },
          ],
        };

      // ------------------------------------------------------------------------
      // 7. READ-ONLY AUDITOR
      // ------------------------------------------------------------------------
      case 'auditor':
        return {
          roleTitle: 'Regulatory Compliance & Statutory Audit Oversight',
          jurisdictionScope: 'Read-Only Regulatory Compliance Inspection • All Territories',
          metrics: [
            { label: 'Regulatory Compliance', value: '100%', subtext: 'JERC Grid Standards', trend: 'Certified' },
            { label: 'Audit Trail Records', value: '1,420', subtext: 'Full PostGIS mutation log', trend: 'Immutable' },
            { label: 'System Reliability', value: 'IEEE 1366', subtext: 'SAIFI / SAIDI verified', trend: 'Audited' },
            { label: 'Asset Write Access', value: 'Zero', subtext: 'Read-Only enforcement', trend: 'Enforced' },
          ],
          assignments: [
            {
              id: 'asg-auditor-1',
              taskCode: 'AUDIT-JERC-2026',
              title: 'Review Annual Distribution Asset Register & SAIDI Filing',
              category: 'Audit',
              priority: 'High',
              dueDate: 'In 5 days',
              assignedJurisdiction: 'All 4 Regional Enclaves',
              targetTab: 'outages',
              actionLabel: 'Inspect Records',
            },
            {
              id: 'asg-auditor-2',
              taskCode: 'COMPLIANCE-PTW-CHECK',
              title: 'Safety Permit to Work Line Clear Compliance Verification',
              category: 'Audit',
              priority: 'Normal',
              dueDate: 'In 7 days',
              assignedJurisdiction: 'Town & Rural Sections',
              targetTab: 'safety_ptw',
              actionLabel: 'Verify Logs',
            },
          ],
          notifications: [
            {
              id: 'notif-audit-1',
              title: 'Audit Log Export Generated',
              message: 'Immutable SHA-256 signed audit export ready for regulatory archive.',
              timestamp: '30 mins ago',
              priority: 'info',
              targetTab: 'backup_restore',
              read: this.readNotificationIds.has('notif-audit-1'),
              actionLabel: 'Download Archive',
            },
          ],
          quickActions: [
            { label: 'Asset Register & Table', targetTab: 'assets', description: 'Browse electrical assets across all 4 regions' },
            { label: 'IEEE 1366 Reliability Metrics', targetTab: 'outages', description: 'SAIFI, SAIDI, CAIDI, and ENS computations' },
            { label: 'Audit Logs & Backup Records', targetTab: 'backup_restore', description: 'Verify tamper-evident change records' },
            { label: 'GIS Master Map Inspection', targetTab: 'gis_map', description: 'Read-only territorial GIS inspection' },
          ],
        };

      // ------------------------------------------------------------------------
      // 8. GIS DATA ADMINISTRATOR
      // ------------------------------------------------------------------------
      case 'gis_admin':
        return {
          roleTitle: 'GIS Spatial Data Administrator',
          jurisdictionScope: 'Spatial Database Master Topology & Geocoding • PostGIS Engine',
          metrics: [
            { label: 'Spatial Layers', value: 17, subtext: 'Overlays in PostGIS', trend: 'Active' },
            { label: 'Geocoded Assets', value: '100%', subtext: 'GPS verified geometry', trend: 'WGS 84' },
            { label: 'Basemap Providers', value: 8, subtext: 'Google, Esri & OSM Color', trend: 'Operational' },
            { label: 'Topology Errors', value: 0, subtext: 'Dangling nodes or loops', trend: 'Zero-Defect' },
          ],
          assignments: [
            {
              id: 'asg-gis-1',
              taskCode: 'TOPOLOGY-CHECK-01',
              title: 'Run Automated Geometric Snapping on 11kV Feeder LineStrings',
              category: 'Maintenance',
              priority: 'Normal',
              dueDate: 'Today, 19:00',
              assignedJurisdiction: 'Urban Division Grid',
              targetTab: 'topology',
              actionLabel: 'Execute Topology Trace',
            },
          ],
          notifications: [
            {
              id: 'notif-gis-1',
              title: 'Spatial Index Optimized',
              message: 'PostGIS GIST spatial indexes rebuilt in 8.4ms.',
              timestamp: '1 hour ago',
              priority: 'info',
              targetTab: 'admin_panel',
              read: this.readNotificationIds.has('notif-gis-1'),
              actionLabel: 'View Indexes',
            },
          ],
          quickActions: [
            { label: 'GIS Master Map Engine', targetTab: 'gis_map', description: 'Spatial editor & layer manager' },
            { label: 'Network Topology Tracing', targetTab: 'topology', description: 'Trace upstream and downstream circuits' },
            { label: 'Data Exchange & Shapefiles', targetTab: 'backup_restore', description: 'GeoJSON and PostGIS spatial dumps' },
          ],
        };

      // ------------------------------------------------------------------------
      // 9. SUPER ADMINISTRATOR
      // ------------------------------------------------------------------------
      case 'super_admin':
      default:
        return {
          roleTitle: 'Super Administrator System Command',
          jurisdictionScope: 'All 4 Regions (Puducherry, Karaikal, Mahe, Yanam) • Global Enterprise Authority',
          metrics: [
            { label: 'Distribution Regions', value: 4, subtext: 'Puducherry, Karaikal, Mahe, Yanam', trend: '100% Online' },
            { label: 'Grid Substations', value: 8, subtext: '230kV Auto down to 33kV Primary', trend: '446 MVA Total' },
            { label: 'Distribution Feeders', value: 8, subtext: '22kV & 11kV LineString geometry', trend: 'Energized' },
            { label: 'Staff Accounts & Roles', value: 11, subtext: 'Multi-tier zero-trust accounts', trend: 'All Active' },
          ],
          assignments: [
            {
              id: 'asg-admin-1',
              taskCode: 'SYS-AUDIT-2026',
              title: 'Review System-Wide PostgreSQL RLS Security Policies',
              category: 'Audit',
              priority: 'High',
              dueDate: 'In 3 days',
              assignedJurisdiction: 'Enterprise Server Core',
              targetTab: 'admin_panel',
              actionLabel: 'Inspect RLS',
            },
            {
              id: 'asg-admin-2',
              taskCode: 'DATA-EXCHANGE-BACKUP',
              title: 'Run Geo-Redundant PostgreSQL Database Snapshot',
              category: 'Capital Project',
              priority: 'Normal',
              dueDate: 'Today, 23:00',
              assignedJurisdiction: 'Supabase / PostGIS Cluster',
              targetTab: 'backup_restore',
              actionLabel: 'Trigger Backup',
            },
          ],
          notifications: [
            {
              id: 'notif-admin-1',
              title: 'PostgreSQL PostGIS 3.4 Cluster Healthy',
              message: 'Zero-trust jurisdiction policies operational. All spatial queries executing <12ms.',
              timestamp: '10 mins ago',
              priority: 'info',
              targetTab: 'admin_panel',
              read: this.readNotificationIds.has('notif-admin-1'),
              actionLabel: 'System Status',
            },
            {
              id: 'notif-admin-2',
              title: 'All 4 Regional Enclaves Synchronized',
              message: 'Telemetry feed from Puducherry, Karaikal, Mahe, and Yanam reporting normal latency.',
              timestamp: '1 hour ago',
              priority: 'info',
              targetTab: 'gis_map',
              read: this.readNotificationIds.has('notif-admin-2'),
              actionLabel: 'View Map',
            },
          ],
          quickActions: [
            { label: 'Admin Control Panel & Users', targetTab: 'admin_panel', description: 'Configure staff accounts, roles & jurisdiction boundaries' },
            { label: 'Database Backup & Geo-Export', targetTab: 'backup_restore', description: 'PostgreSQL snapshot, GeoJSON/SHP data export' },
            { label: 'Global GIS Master Map', targetTab: 'gis_map', description: 'Full-screen territorial network visualizer' },
            { label: 'Smart Meter Dashboard', targetTab: 'smart_meters', description: 'AMI telecommunications & tamper analytics' },
          ],
        };
    }
  }
}

export const notificationService = NotificationService.getInstance();
