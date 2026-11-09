// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// AUTOMATED TEST SUITE: SECURITY, STRICT JURISDICTION RLS & CORE WORKFLOWS
// ============================================================================

import { authService } from '../src/services/authService';
import { assetService } from '../src/services/assetService';
import { faultService } from '../src/services/faultService';
import { surveyService } from '../src/services/surveyService';
import { reliabilityService } from '../src/services/reliabilityService';
import { riskService } from '../src/services/riskService';
import { notificationService } from '../src/services/notificationService';
import { scadaSimulatorService } from '../src/services/scadaSimulatorService';
import { scadaGatewayService } from '../src/services/scadaGatewayService';
import { scadaService } from '../src/services/scadaService';
import { initialUsers, initialTransformers, initialFeeders, initialScadaPoints } from '../src/services/mockData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log(' POWERGIS ENTERPRISE - AUTOMATED TEST SUITE EXECUTION');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: ROLE PERMISSIONS & ZERO-TRUST AUTHORIZATION
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Role Permissions & Authorization ---');
  {
    const adminPerms = authService.getRolePermissions('super_admin');
    assert(adminPerms.canManageUsers === true, 'Super Admin can manage users');
    assert(adminPerms.canConfigureSystem === true, 'Super Admin can configure system');

    const contractorPerms = authService.getRolePermissions('contractor');
    assert(contractorPerms.canSubmitSurvey === true, 'Contractor can submit surveys');
    assert(contractorPerms.canApproveSurvey === false, 'Contractor CANNOT approve surveys');
    assert(contractorPerms.canManageUsers === false, 'Contractor CANNOT manage users');

    const jePerms = authService.getRolePermissions('je');
    assert(jePerms.canVerifySurvey === true, 'JE can verify field surveys');
    assert(jePerms.canApproveSurvey === false, 'JE CANNOT give final AE approval');

    const auditorPerms = authService.getRolePermissions('auditor');
    assert(auditorPerms.canEditAssets === false, 'Auditor CANNOT edit assets (Read-Only)');
    assert(auditorPerms.canExportData === true, 'Auditor can export data for regulatory reports');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: STRICT JURISDICTION SEGREGATION (RLS SIMULATION)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Strict Jurisdiction Segregation ---');
  {
    // Persona: Er. V. Anand, JE Marapalam (Section: sec-mara, Jurisdiction: jur-mara-1)
    const jeUser = initialUsers.find(u => u.role === 'je')!;
    authService.setCurrentUser(jeUser);

    const marapalamPole = { regionId: 'reg-pdy', divisionId: 'div-urban', sectionId: 'sec-mara', jeJurisdictionId: 'jur-mara-1' };
    const karaikalPole = { regionId: 'reg-kkl', divisionId: 'div-kkl', sectionId: 'sec-kkl', jeJurisdictionId: 'jur-kkl-1' };

    assert(authService.isWithinJurisdiction(marapalamPole) === true, 'JE Anand can access his assigned Marapalam Ward');
    assert(authService.isWithinJurisdiction(karaikalPole) === false, 'SECURITY: JE Anand CANNOT access Karaikal jurisdiction');

    // Persona: Er. M. Sivakumar, EE Urban Division
    const eeUser = initialUsers.find(u => u.role === 'ee')!;
    authService.setCurrentUser(eeUser);

    assert(authService.isWithinJurisdiction(marapalamPole) === true, 'EE Urban can access subordinate Marapalam section');
    assert(authService.isWithinJurisdiction(karaikalPole) === false, 'SECURITY: EE Urban CANNOT access Karaikal division records');

    // Persona: Super Admin
    const adminUser = initialUsers.find(u => u.role === 'super_admin')!;
    authService.setCurrentUser(adminUser);
    assert(authService.isWithinJurisdiction(marapalamPole) === true, 'Super Admin can access Puducherry');
    assert(authService.isWithinJurisdiction(karaikalPole) === true, 'Super Admin can access Karaikal');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: CONTRACTOR STAGING -> JE -> AE PRODUCTION APPROVAL WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Multi-Tier Survey Staging & Approval Workflow ---');
  {
    const adminUser = initialUsers.find(u => u.role === 'super_admin')!;
    const contractor = initialUsers.find(u => u.role === 'contractor')!;
    authService.setCurrentUser(contractor);

    // Evaluate live production pole count from administrative view
    authService.setCurrentUser(adminUser);
    const initialPoleCount = assetService.getPoles().length;

    // Step A: Contractor Submits Draft Survey
    authService.setCurrentUser(contractor);
    const submission = surveyService.submitSurvey(
      'Automated Test Survey Batch',
      'WO-TEST-999',
      [
        {
          assetType: 'pole',
          temporaryCode: 'TMP-POL-TEST-01',
          attributes: { pole_number: 'P-TEST-01', pole_type: 'PSCC 9m' },
          gpsAccuracyM: 1.5,
          altitudeM: 10.0,
          validationStatus: 'valid',
          coordinates: [11.9250, 79.8210],
        },
      ]
    );

    assert(submission.status === 'submitted', 'Survey submitted by contractor enters submitted state');
    authService.setCurrentUser(adminUser);
    assert(assetService.getPoles().length === initialPoleCount, 'SECURITY: Staged asset does NOT appear in live GIS prior to approval');

    // Step B: JE Verifies
    const jeUser = initialUsers.find(u => u.role === 'je')!;
    authService.setCurrentUser(jeUser);
    surveyService.jeVerify(submission.id, 'Coordinates checked on site by JE Anand');

    const verifiedSub = surveyService.getSubmissionById(submission.id)!;
    assert(verifiedSub.status === 'je_verified', 'Survey status advances to je_verified');
    authService.setCurrentUser(adminUser);
    assert(assetService.getPoles().length === initialPoleCount, 'SECURITY: Staged asset still NOT in live GIS after JE verification alone');

    // Step C: AE Approves & Publishes to Production GIS
    const aeUser = initialUsers.find(u => u.role === 'ae')!;
    authService.setCurrentUser(aeUser);
    const publishedCount = surveyService.aeApproveAndPublish(submission.id, 'Sanctioned by AE Senthil Nathan');

    assert(publishedCount === 1, 'AE approval promoted 1 staging asset to live GIS');
    const approvedSub = surveyService.getSubmissionById(submission.id)!;
    assert(approvedSub.status === 'ae_approved', 'Survey status is now ae_approved');
    authService.setCurrentUser(adminUser);
    assert(assetService.getPoles().length === initialPoleCount + 1, 'Verified asset is now published to live production GIS');

    // Step D: Rejection Requires Mandatory Reason
    let threwOnEmptyReason = false;
    try {
      surveyService.rejectSubmission(submission.id, '');
    } catch {
      threwOnEmptyReason = true;
    }
    assert(threwOnEmptyReason === true, 'SECURITY: Rejection without mandatory reason is strictly rejected');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: FAULT DISTANCE CALCULATION ENGINE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Fault Distance & Network Proximity Engine ---');
  {
    const faultLocation: [number, number] = [11.9265, 79.8225];
    const distances = faultService.calculateFaultDistances(faultLocation, 'fdr-mara-1', 'sec-mara');

    assert(typeof distances.distanceFromPoleM === 'number' && distances.distanceFromPoleM > 0, 'Calculates distance from nearest pole (straight-line)');
    assert(typeof distances.distanceFromDtM === 'number' && distances.distanceFromDtM > 0, 'Calculates distance from nearest DT');
    assert(typeof distances.distanceAlongFeederM === 'number' && distances.distanceAlongFeederM > 0, 'Calculates distance along feeder route (LineString projection)');
    assert(typeof distances.distanceFromOfficeKm === 'number' && distances.distanceFromOfficeKm > 0, 'Calculates distance from section office');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: IEEE 1366 RELIABILITY INDICES (SAIFI, SAIDI, CAIDI, ENS)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: IEEE 1366 Reliability Indices ---');
  {
    const calc = reliabilityService.calculateSectionIndices('sec-mara', 4850);
    assert(calc.saifi > 0, 'Calculates SAIFI index (System Average Interruption Frequency)');
    assert(calc.saidi > 0, 'Calculates SAIDI index (System Average Interruption Duration)');
    assert(calc.caidi > 0, 'Calculates CAIDI index (Customer Average Interruption Duration)');
    assert(calc.ensMWh >= 0, 'Calculates Energy Not Served (ENS in MWh)');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 6: ISO 55000 ASSET RISK MATRIX
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: ISO 55000 Asset Risk Scoring ---');
  {
    const sampleDT = initialTransformers[0];
    const risk = riskService.evaluateTransformerRisk(sampleDT, 1);

    assert(risk.totalRiskScore >= 0 && risk.totalRiskScore <= 100, 'Calculates composite risk score within 0-100 range');
    assert(Boolean(risk.riskCategory), 'Assigns risk category (Low/Moderate/High/Critical)');
    assert(Boolean(risk.recommendation), 'Generates ISO 55000 engineering action plan');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 7: AUTHENTICATION, TEST CREDENTIALS & LOCKOUT PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Authentication & Test Credentials ---');
  {
    // 1. Valid credentials login
    const loginOk = authService.login('ee.urban@powergis.internal', 'EEUrban@2026');
    assert(loginOk.success === true && loginOk.user?.username === 'ee_urban', 'Valid official credentials login succeeds');
    assert(authService.isAuthenticated() === true, 'Session state reflects authenticated');

    // 2. Universal enterprise test password
    const universalLogin = authService.login('superadmin@powergis.internal', 'PowerGIS@2026');
    assert(universalLogin.success === true && universalLogin.user?.role === 'super_admin', 'Universal test password PowerGIS@2026 succeeds');

    // 3. Invalid credentials rejected
    const badLogin = authService.login('je.marapalam@powergis.internal', 'WrongPassword123!');
    assert(badLogin.success === false, 'Invalid credentials strictly rejected');

    // 4. 1-Click persona test login
    const personaRes = authService.loginAsPersona('user-contractor');
    assert(personaRes.success === true && personaRes.user?.role === 'contractor', '1-Click persona login authenticates contractor');

    // 5. Password reset request
    const resetRes = authService.requestPasswordReset('ae.marapalam@powergis.internal');
    assert(resetRes.success === true && resetRes.message.includes('dispatched'), 'Password reset token dispatched successfully');

    // 6. Sign out session clearance
    authService.logout();
    assert(authService.isAuthenticated() === false, 'Logout terminates active session');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 8: ROLE-BASED DASHBOARD & NOTIFICATION SCOPING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Role-Based Dashboard & Notification Scoping ---');
  {
    // 1. JE Anand - Ward Level
    const jeUser = initialUsers.find(u => u.role === 'je')!;
    const jeData = notificationService.getDashboardData(jeUser);
    assert(jeData.jurisdictionScope.includes('Marapalam Commercial Ward'), 'JE Dashboard is scoped to Marapalam Commercial Ward');
    assert(jeData.assignments.some(a => a.category === 'Survey Verification'), 'JE assignments include field survey verifications');
    assert(jeData.notifications.length > 0, 'JE receives role notifications');

    // 2. AE Senthil - Section Level
    const aeUser = initialUsers.find(u => u.role === 'ae')!;
    const aeData = notificationService.getDashboardData(aeUser);
    assert(aeData.jurisdictionScope.includes('Marapalam O&M Section'), 'AE Dashboard is scoped to Marapalam O&M Section');
    assert(aeData.assignments.some(a => a.category.includes('Approval') || a.category.includes('Safety')), 'AE assignments include final approval & PTW clearance');

    // 3. EE Sivakumar - Division Level
    const eeUser = initialUsers.find(u => u.role === 'ee')!;
    const eeData = notificationService.getDashboardData(eeUser);
    assert(eeData.jurisdictionScope.includes('Urban Operations Division'), 'EE Dashboard is scoped to Urban Operations Division');
    assert(eeData.metrics.some(m => m.label.includes('SAIFI') || m.label.includes('SAIDI')), 'EE metrics track IEEE 1366 SAIFI/SAIDI');

    // 4. Auditor
    const auditorUser = initialUsers.find(u => u.role === 'auditor')!;
    const auditorData = notificationService.getDashboardData(auditorUser);
    assert(auditorData.jurisdictionScope.includes('Regulatory Compliance'), 'Auditor Dashboard is scoped to regulatory compliance');

    // 5. Notification Read State
    const firstNotif = jeData.notifications[0];
    notificationService.markAsRead(firstNotif.id);
    assert(notificationService.isRead(firstNotif.id) === true, 'markAsRead successfully records read state');
    const refreshedJEData = notificationService.getDashboardData(jeUser);
    assert(refreshedJEData.notifications.find(n => n.id === firstNotif.id)?.read === true, 'Refreshed dashboard reflects notification read state as true');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 9: MAP ROTATION, BEARING CALCULATIONS & INVERSE COORDINATES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Map Rotation, Bearing & Inverse Angle Geometry ---');
  {
    const normalizeBearing = (deg: number): number => {
      const mod = deg % 360;
      return mod < 0 ? mod + 360 : Math.round(mod);
    };

    const getCardinal = (deg: number): string => {
      const d = (deg % 360 + 360) % 360;
      if (d >= 337.5 || d < 22.5) return 'N';
      if (d >= 22.5 && d < 67.5) return 'NE';
      if (d >= 67.5 && d < 112.5) return 'E';
      if (d >= 112.5 && d < 157.5) return 'SE';
      if (d >= 157.5 && d < 202.5) return 'S';
      if (d >= 202.5 && d < 247.5) return 'SW';
      if (d >= 247.5 && d < 292.5) return 'W';
      return 'NW';
    };

    assert(normalizeBearing(0) === 0, 'Bearing 0° normalizes to 0°');
    assert(normalizeBearing(360) === 0, 'Bearing 360° normalizes to 0°');
    assert(normalizeBearing(45) === 45, 'Bearing 45° normalizes to 45°');
    assert(normalizeBearing(-15) === 345, 'Bearing -15° wraps to 345°');
    assert(normalizeBearing(720) === 0, 'Bearing 720° wraps to 0°');

    assert(getCardinal(0) === 'N', '0° is North');
    assert(getCardinal(90) === 'E', '90° is East');
    assert(getCardinal(180) === 'S', '180° is South');
    assert(getCardinal(270) === 'W', '270° is West');
    assert(getCardinal(45) === 'NE', '45° is North-East');

    // Test Inverse Angular Coordinate Mapping for Rotated Map
    // Screen center C=(500, 500). Point P at (600, 500) (100px to the right)
    // When bearing = 90 deg clockwise, True North is rotated 90 deg counter-clockwise.
    // Clicking at (600, 500) corresponds to original point at (500, 400) (100px above center).
    const cx = 500, cy = 500;
    const clickX = 600, clickY = 500;
    const bearing = 90;
    const dx = clickX - cx;
    const dy = clickY - cy;
    const rad = (-bearing * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    const mappedX = Math.round(cx + rx);
    const mappedY = Math.round(cy + ry);

    assert(mappedX === 500 && mappedY === 400, 'Inverse rotation translates rotated screen click (600, 500) -> layer point (500, 400)');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 10: DATA EXCHANGE & SPATIAL IMPORT/EXPORT ENGINE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Data Exchange, GeoJSON & CSV Import/Export ---');
  {
    const { dataExchangeService } = await import('../src/services/dataExchangeService');
    const adminUser = initialUsers.find(u => u.role === 'super_admin')!;
    authService.setCurrentUser(adminUser);

    // 1. GeoJSON parsing and import
    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [79.8260, 11.9370] },
          properties: { assetType: 'pole', poleNumber: 'P-TEST-IMP-99', code: 'POL-IMP-99', material: 'Steel' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [79.8270, 11.9380] },
          properties: { assetType: 'consumer', consumerNumber: 'CON-TEST-IMP-99', name: 'Test Consumer Premise' },
        },
      ],
    };

    const initialPolesCount = assetService.getPoles().length;
    const initialConsumersCount = assetService.getConsumers().length;

    // Simulate mock file object
    const geojsonFile = {
      name: 'network_sample.geojson',
      text: async () => JSON.stringify(mockGeoJSON),
    } as unknown as File;

    const res = await dataExchangeService.importSpatialFile(geojsonFile);
    assert(res.success === true, 'GeoJSON import file processing succeeds');
    assert(res.importedCount === 2, 'Imports 2 valid features from GeoJSON');
    assert(assetService.getPoles().length === initialPolesCount + 1, 'Imported pole is successfully added to live asset registry');
    assert(assetService.getConsumers().length === initialConsumersCount + 1, 'Imported consumer is successfully added to live asset registry');

    // 2. Duplicate Detection
    const duplicateRes = await dataExchangeService.importSpatialFile(geojsonFile);
    assert(duplicateRes.duplicateCount === 2, 'Strictly identifies and ignores duplicate asset records on re-import');

    // 3. CSV Parsing & Import
    const csvContent = 'Code,Name,Latitude,Longitude\nPOL-CSV-01,Test Pole 1,11.9350,79.8250\nPOL-CSV-02,Test Pole 2,11.9355,79.8255';
    const csvFile = {
      name: 'poles.csv',
      text: async () => csvContent,
    } as unknown as File;

    const csvRes = await dataExchangeService.importSpatialFile(csvFile);
    assert(csvRes.success === true, 'CSV file processing succeeds');
    assert(csvRes.importedCount === 2, 'Imports 2 records from CSV file');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 11: ADMIN USER MANAGEMENT CRUD & PERSONA IMPERSONATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Admin User Management CRUD & RBAC ---');
  {
    const initialUsersCount = authService.getAllUsers().length;
    assert(initialUsersCount > 0, 'authService.getAllUsers() returns pre-seeded utility users');

    // 1. Add New User
    const newUser = authService.addUser({
      fullName: 'Er. Test Assistant Engineer',
      username: 'ae_test_user',
      email: 'ae.test@powergis.internal',
      role: 'ae',
      designation: 'Assistant Engineer (Test Section)',
      phone: '+91 94430 99999',
      isActive: true,
    });
    assert(Boolean(newUser.id), 'authService.addUser creates user with unique id');
    assert(authService.getAllUsers().length === initialUsersCount + 1, 'Total users count incremented after addUser');

    // 2. Update User
    const updated = authService.updateUser(newUser.id, {
      fullName: 'Er. Test Assistant Engineer (Promoted)',
      designation: 'Assistant Executive Engineer (Promoted)',
      role: 'aee',
    });
    assert(updated?.role === 'aee', 'authService.updateUser updates official role');
    assert(updated?.fullName.includes('Promoted'), 'authService.updateUser updates full name');

    // 3. Security: Cannot delete own active session
    const currentActive = authService.getCurrentUser();
    const selfDeleteRes = authService.deleteUser(currentActive.id);
    assert(selfDeleteRes.success === false, 'SECURITY: Super Admin cannot delete their own active session');

    // 4. Delete Created User
    const deleteRes = authService.deleteUser(newUser.id);
    assert(deleteRes.success === true, 'authService.deleteUser deletes non-active user');
    assert(authService.getAllUsers().length === initialUsersCount, 'Total users count returns to previous count after deleteUser');

    // 5. Reset Users to Default
    authService.resetUsersToDefault();
    assert(authService.getAllUsers().length === initialUsers.length, 'authService.resetUsersToDefault restores initial user personas');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 12: CENTRAL LABELS (SSOT) INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 12: Centralized UI Labels (SSOT) ---');
  {
    const { LABELS } = await import('../src/config/labelsConfig');
    const { NAVIGATION_ITEMS } = await import('../src/config/navigationConfig');

    assert(Boolean(LABELS.header.brandName), 'LABELS.header.brandName is defined');
    assert(LABELS.header.brandName.toUpperCase() === 'POWERGIS', 'Brand name is PowerGIS');
    assert(Boolean(LABELS.zeroTrustGate.policyBadge), 'Zero-Trust Gate policy badge is defined');
    assert(Boolean(LABELS.admin.consoleTitle), 'Admin console title is defined');
    assert(Boolean(LABELS.scopeHUD.activeIdentityPrefix), 'Scope HUD active identity prefix is defined');

    // Verify navigation item labels are bound to LABELS.navigation
    const dashboardNav = NAVIGATION_ITEMS.find(n => n.id === 'dashboard');
    assert(dashboardNav?.label === LABELS.navigation.dashboard, 'Dashboard navigation label is wired to LABELS.navigation.dashboard');

    const gisMapNav = NAVIGATION_ITEMS.find(n => n.id === 'gis_map');
    assert(gisMapNav?.label === LABELS.navigation.gisMap, 'GIS Map navigation label is wired to LABELS.navigation.gisMap');

    const adminNav = NAVIGATION_ITEMS.find(n => n.id === 'admin_panel');
    assert(adminNav?.label === LABELS.navigation.adminPanel, 'Admin Panel navigation label is wired to LABELS.navigation.adminPanel');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 13: ROLE-BASED DASHBOARD SCOPING & GIS LAYER COLOR PALETTE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 13: Role Dashboard Scoping & GIS Color Aesthetics ---');
  {
    const { initialGISLayers } = await import('../src/services/gisService');

    // 1. Verify vibrant colorful GIS layers (No monochrome defaults)
    const substationLayer = initialGISLayers.find(l => l.id === 'substations');
    assert(substationLayer?.color === '#EF4444', 'Substations layer has vibrant Crimson Red color token (#EF4444)');

    const feederHtLayer = initialGISLayers.find(l => l.id === 'feeders_ht_22kv');
    assert(feederHtLayer?.color === '#F59E0B', 'HT Feeders layer has vibrant Amber color token (#F59E0B)');

    const feeder11kvLayer = initialGISLayers.find(l => l.id === 'feeders_11kv');
    assert(feeder11kvLayer?.color === '#38BDF8' || feeder11kvLayer?.color === '#0284C7', '11kV Feeders layer has vivid Electric Blue color');

    const dtLayer = initialGISLayers.find(l => l.id === 'transformers');
    assert(dtLayer?.color === '#10B981', 'Transformers layer has vibrant Emerald Green color token (#10B981)');

    const poleHtLayer = initialGISLayers.find(l => l.id === 'poles_ht');
    assert(poleHtLayer?.color === '#8B5CF6', 'HT Utility Poles layer has vibrant Purple color token (#8B5CF6)');

    // 2. Verify Role Dashboard Scoping
    const contractorUser = initialUsers.find(u => u.role === 'contractor')!;
    const contractorData = notificationService.getDashboardData(contractorUser);
    assert(contractorData.roleTitle.includes('Contractor'), 'Contractor dashboard title is strictly contractor-scoped');
    assert(contractorData.metrics.some(m => m.label.includes('GPS') || m.label.includes('Survey')), 'Contractor metrics focus on field surveys and GPS');

    const jeUser = initialUsers.find(u => u.role === 'je')!;
    const jeData = notificationService.getDashboardData(jeUser);
    assert(jeData.roleTitle.includes('Junior Engineer'), 'JE dashboard title is strictly JE-scoped');
    assert(jeData.assignments.some(a => a.category === 'Survey Verification'), 'JE has survey verification tasks in ward');

    const aeUser = initialUsers.find(u => u.role === 'ae')!;
    const aeData = notificationService.getDashboardData(aeUser);
    assert(aeData.roleTitle.includes('Assistant Engineer'), 'AE dashboard title is strictly AE-scoped');
    assert(aeData.assignments.some(a => a.category === 'Safety PTW' || a.category === 'AE Approval'), 'AE has PTW and approval tasks');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 14: SCADA DYNAMIC SIMULATOR & 3-PHASE ELECTRICAL CALCULATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 14: SCADA Dynamic Simulator & 3-Phase Physics ---');
  {
    // 1. Balanced 3-Phase Power Calculation Verification
    // Equation: P = sqrt(3) * V_LL * I_L * cos(phi) * 1e-3 (MW)
    const vKV = 11.0;
    const iAmp = 250.0;
    const pf = 0.95;
    const calc = scadaSimulatorService.calculateThreePhaseElectricals(vKV, iAmp, pf, 2.0);

    const expectedActiveMW = Math.round(Math.sqrt(3) * 11.0 * 250.0 * 0.95 * 1e-3 * 100) / 100;
    assert(calc.activePowerMW === expectedActiveMW, `Active Power obeys P = √3·V·I·cosφ (${calc.activePowerMW} MW)`);

    const sinPhi = Math.sqrt(1 - pf * pf);
    const expectedReactiveMVAR = Math.round(Math.sqrt(3) * 11.0 * 250.0 * sinPhi * 1e-3 * 100) / 100;
    assert(calc.reactivePowerMVAR === expectedReactiveMVAR, `Reactive Power obeys Q = √3·V·I·sinφ (${calc.reactivePowerMVAR} MVAr)`);

    const expectedApparentMVA = Math.round(Math.sqrt(3) * 11.0 * 250.0 * 1e-3 * 100) / 100;
    assert(calc.apparentPowerMVA === expectedApparentMVA, `Apparent Power obeys S = √3·V·I (${calc.apparentPowerMVA} MVA)`);

    // 2. Neutral Current Phasor Summation
    assert(calc.neutralCurrentAmps > 0, `Neutral current is calculated via phasor vector summation (${calc.neutralCurrentAmps} A)`);
    assert(calc.phaseACurrentAmps > calc.phaseBCurrentAmps, 'Phase imbalance properly scales phase A over B and C');

    // 3. Thermal Rise Model
    const therm = scadaSimulatorService.calculateThermalRise(250.0, 320.0, 45.0, 32.0, 2);
    assert(therm.oilTempC >= 45.0 && therm.oilTempC < 75.0, `Transformer oil temperature responds to thermal rise (${therm.oilTempC}°C)`);
    assert(therm.windingTempC > therm.oilTempC, `Winding hot-spot temperature exceeds top-oil temperature (${therm.windingTempC}°C > ${therm.oilTempC}°C)`);

    // 4. Simulator State & Data Isolation
    const simPoints = scadaSimulatorService.getPoints();
    assert(simPoints.length >= 6, `Simulator initializes 6 grid telemetry points across 110kV/22kV/11kV network`);
    assert(simPoints.every(p => p.sourceType === 'SIMULATOR'), 'SECURITY: Every simulated telemetry point strictly carries source_type = SIMULATOR');
    assert(simPoints.every(p => p.simulationSessionId !== undefined), 'SECURITY: Every simulated point is stamped with simulation_session_id');

    // 5. Operating Modes & Controls
    scadaSimulatorService.setSpeed(5);
    assert(scadaSimulatorService.getConfig().speed === 5, 'Simulator speed configurable to 5x');

    scadaSimulatorService.setIntervalSeconds(5);
    assert(scadaSimulatorService.getConfig().intervalSeconds === 5, 'Simulator interval configurable to 5s');

    scadaSimulatorService.setMode('preset_playback');
    assert(scadaSimulatorService.getConfig().mode === 'preset_playback', 'Operating mode switched to preset_playback');

    // 6. Scenario Presets
    scadaSimulatorService.setScenario('OVERLOAD');
    const overloadedFdr = scadaSimulatorService.getPointByTag('SIM_FDR_MARA_01');
    assert(overloadedFdr?.currentAmps === 345.0, 'OVERLOAD scenario forces feeder current to 345A');
    assert(scadaSimulatorService.getAlarms().some(a => a.tag === 'SIM_FDR_MARA_01'), 'OVERLOAD scenario generates high-priority alarm');

    scadaSimulatorService.setScenario('NORMAL');
    const restoredFdr = scadaSimulatorService.getPointByTag('SIM_FDR_MARA_01');
    assert(restoredFdr?.currentAmps === 220.0, 'NORMAL scenario restores feeder current to nominal 220A');

    // 7. Manual Telemetry Injection
    const injected = scadaSimulatorService.injectManualTelemetry('SIM_FDR_MARA_01', {
      voltageKV: 11.45,
      currentAmps: 260.0,
      powerFactor: 0.98,
    });
    assert(injected === true, 'Manual telemetry injection into simulated tag succeeds');
    const updatedFdr = scadaSimulatorService.getPointByTag('SIM_FDR_MARA_01');
    assert(updatedFdr?.voltageKV === 11.45 && updatedFdr?.currentAmps === 260.0, 'Tag state reflects manually injected values');

    // 8. CSV Snapshot Export & Historical Playback Import
    const csvExport = scadaSimulatorService.exportTelemetrySnapshotCSV();
    assert(csvExport.includes('source_type') && csvExport.includes('SIMULATOR'), 'CSV export carries mandatory source_type = SIMULATOR column');
    assert(csvExport.includes('voltage_kv') && csvExport.includes('current_amps'), 'CSV export carries complete telemetry parameters');

    const sampleCsv = `tag,voltage_kv,current_amps\nSIM_FDR_MARA_01,11.35,215.0\n`;
    const importRes = scadaSimulatorService.importHistoricalCSVPlayback(sampleCsv);
    assert(importRes.success === true && importRes.rowsProcessed === 1, 'Historical CSV playback import processed 1 frame');
    assert(scadaSimulatorService.getPointByTag('SIM_FDR_MARA_01')?.currentAmps === 215.0, 'Playback frame applied to simulated point');

    // 9. Operational vs Simulator Isolation in ScadaService
    const opPoints = scadaService.getPoints('OPERATIONAL');
    assert(opPoints.every(p => p.sourceType === 'OPERATIONAL'), 'ScadaService.getPoints("OPERATIONAL") returns ONLY operational grid points');
    const onlySimPoints = scadaService.getPoints('SIMULATOR');
    assert(onlySimPoints.every(p => p.sourceType === 'SIMULATOR'), 'ScadaService.getPoints("SIMULATOR") returns ONLY simulated points');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 15: INDUSTRIAL SCADA GATEWAYS & SELECT-BEFORE-OPERATE (SBO)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 15: SCADA Gateways & SBO Safety Interlocks ---');
  {
    // 1. IEC 60870-5-104 ASDU Encoding & Decoding
    const testPt = scadaSimulatorService.getPointByTag('SIM_FDR_MARA_01')!;
    const iecFrame = scadaGatewayService.encodeIec104TelemetryFrame(testPt);
    assert(iecFrame.typeId === 13, 'IEC 60870-5-104 encodes ASDU Type 13 (Short Floating Point)');
    assert(iecFrame.ioa === 2001, 'IEC-104 Information Object Address (IOA) correctly mapped to 2001');
    assert(iecFrame.cot === 3, 'Cause of Transmission is 3 (Spontaneous event)');

    const decodedCmd = scadaGatewayService.decodeIec104CommandFrame({
      typeId: 45,
      isSequence: false,
      numObjects: 1,
      cot: 6,
      coa: 101,
      ioa: 2001,
      value: 0,
      quality: 0,
    });
    assert(decodedCmd.targetState === 'OPEN', 'IEC-104 ASDU Type 45 single command value 0 decodes to OPEN');
    assert(decodedCmd.tag === 'SIM_FDR_MARA_01', 'IEC-104 IOA 2001 decodes to SIM_FDR_MARA_01');

    // 2. Modbus TCP Holding Register Mapping
    const modbusPacket = scadaGatewayService.generateModbusRegisters([testPt]);
    assert(modbusPacket.functionCode === 3, 'Modbus TCP packet uses Function Code 03 (Read Holding Registers)');
    assert(modbusPacket.registerAddress === 40001, 'Modbus registers map to base address 40001');
    assert(modbusPacket.values?.length === 4, 'Modbus packet encapsulates 4 holding registers per point');

    // 3. MQTT JSON Telemetry Publishing
    scadaGatewayService.publishMqttTelemetry('ss-mara', testPt);
    const mqttMsgs = scadaGatewayService.getMqttMessages();
    assert(mqttMsgs.length > 0, 'MQTT telemetry message published successfully');
    assert(mqttMsgs[0].topic.includes('powergis/substation/ss-mara'), 'MQTT topic adheres to powergis/substation/{id} schema');
    assert(mqttMsgs[0].payload.includes('SIMULATOR'), 'MQTT payload carries source_type = SIMULATOR');

    // 4. Select-Before-Operate (SBO) Interlock 1: Role Authorization Gate
    const contractorUser = initialUsers.find(u => u.role === 'contractor')!;
    const blockedRoleResult = scadaGatewayService.executeSecuredSboCommand({
      tag: 'SIM_FDR_MARA_01',
      substationId: 'ss-mara',
      targetState: 'OPEN',
      supervisoryReason: 'Test unauthorized breaker operation',
      ptwClearanceChecked: true,
      operator: contractorUser,
      protocol: 'IEC-60870-5-104',
    });
    assert(blockedRoleResult.success === false, 'SECURITY: Contractor is strictly blocked from SBO breaker operation');
    assert(blockedRoleResult.auditRecord?.status === 'INTERLOCK_BLOCKED', 'Blocked operation is logged as INTERLOCK_BLOCKED');

    // 5. Select-Before-Operate (SBO) Interlock 2: PTW Clearance Gate
    const eeUser = initialUsers.find(u => u.role === 'ee')!;
    const blockedPtwResult = scadaGatewayService.executeSecuredSboCommand({
      tag: 'SIM_FDR_MARA_01',
      substationId: 'ss-mara',
      targetState: 'OPEN',
      supervisoryReason: 'Test unconfirmed PTW operation',
      ptwClearanceChecked: false, // NOT checked
      operator: eeUser,
      protocol: 'IEC-60870-5-104',
    });
    assert(blockedPtwResult.success === false, 'SECURITY: Breaker command blocked when PTW safety clearance is unconfirmed');

    // 6. Select-Before-Operate (SBO) Interlock 3: Successful Authorized Command
    const authorizedResult = scadaGatewayService.executeSecuredSboCommand({
      tag: 'SIM_FDR_MARA_01',
      substationId: 'ss-mara',
      targetState: 'OPEN',
      supervisoryReason: 'Emergency Line Breakdown repair',
      ptwClearanceChecked: true,
      operator: eeUser,
      protocol: 'IEC-60870-5-104',
    });
    assert(authorizedResult.success === true, 'Authorized EE with PTW clearance successfully executes SBO command');
    assert(authorizedResult.auditRecord?.status === 'SUCCESS', 'Successful SBO command logged with status SUCCESS');

    // 7. Safety Boundary: Simulated Breaker Trip does NOT pollute live faultService
    const faultsBefore = faultService.getFaults().length;
    scadaSimulatorService.operateSimulatedBreaker(
      'SIM_FDR_MARA_01',
      'OPEN',
      'Er. M. Sivakumar',
      'Simulated emergency trip test'
    );
    const faultsAfter = faultService.getFaults().length;
    assert(faultsAfter === faultsBefore, 'SAFETY BOUNDARY: Simulator breaker trip does NOT inject spurious tickets into production faultService');
  }

  // --------------------------------------------------------------------------
  // TEST SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(` TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
