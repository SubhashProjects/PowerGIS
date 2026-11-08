// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// AUTOMATED TEST SUITE: SECURITY, STRICT JURISDICTION RLS & CORE WORKFLOWS
// ============================================================================

import { authService } from '../src/services/authService';
import { assetService } from '../src/services/assetService';
import { faultService } from '../src/services/faultService';
import { surveyService } from '../src/services/surveyService';
import { reliabilityService } from '../src/services/reliabilityService';
import { riskService } from '../src/services/riskService';
import { initialUsers, initialTransformers, initialFeeders } from '../src/services/mockData';

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
  console.log(' PUDUCHERRY POWERGIS - AUTOMATED TEST SUITE EXECUTION');
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
