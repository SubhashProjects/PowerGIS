import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

console.log('PowerGIS V3.2 production hardening static checks');

const nav = read('src/config/navigationConfig.ts');
const pages = [
  'RoleBasedDashboard','MasterMap','NetworkTraceViewer','ScadaTelemetryDashboard','AssetTable','DTLoadingAnalytics',
  'SmartMeterDashboard','WarrantyRegister','AssetRiskMatrix','FaultList','WorkOrderKanban','MaintenanceScheduler',
  'PermitToWorkManager','StoresInventory','ContractorPWA','SurveyApprovalQueue','CapitalProjectsRDSS','DisasterResponseCell',
  'OutageManager','AdminControlPanel'
];
for (const component of pages) {
  const matches = [];
  function walk(dir) { for (const entry of fs.readdirSync(dir)) { const p=path.join(dir,entry); const st=fs.statSync(p); if(st.isDirectory()) walk(p); else if(/\.(ts|tsx)$/.test(p)) matches.push(p); } }
  walk(path.join(root,'src'));
  assert(matches.some(p => fs.readFileSync(p,'utf8').includes(`export const ${component}`) || fs.readFileSync(p,'utf8').includes(`export function ${component}`)), `Missing page component ${component}`);
}
assert(nav.includes("id: 'dashboard'") && nav.includes("id: 'gis_map'") && nav.includes("id: 'backup_restore'"), 'Navigation registry is incomplete');

const ptw = read('src/components/safety/PermitToWorkManager.tsx');
assert(ptw.includes('status: \'requested\''), 'PTW requests must start in requested state');
assert(ptw.includes('earthingConfirmed: false'), 'PTW earthing must default false');
assert(ptw.includes('dangerNoticesPosted: false'), 'PTW danger notices must default false');
assert(ptw.includes('gasDischargeTested: false'), 'PTW gas/induction verification must default false');
assert(ptw.includes('does not prove that physical isolation'), 'PTW UI must distinguish software record from physical safety proof');
assert(ptw.includes('Actual switching') || ptw.includes('switching'), 'PTW module must retain switching safety boundary');

const auth = read('src/services/authService.ts');
assert(!auth.includes('PowerGIS@2026') && !auth.includes('Admin@PowerGIS2026') && !auth.includes('EEUrban@2026'), 'Hardcoded credentials remain in auth service');
assert(auth.includes('signInWithPassword'), 'Supabase password authentication is not present');
assert(auth.includes('resetPasswordForEmail'), 'Supabase password recovery is not present');

const authContext = read('src/context/AuthContext.tsx');
assert(authContext.includes('Password sign-in is unavailable in simulator mode'), 'Simulator mode must not authenticate by email/username without password verification');
assert(authContext.includes('loginAsPersona'), 'Development persona login must remain an explicit separate flow');
assert(authContext.includes('!isDev || isSupabaseConfigured'), 'Demo persona login must remain blocked outside development or when Supabase is configured');

const faultPage = read('src/components/faults/FaultList.tsx');
assert(!faultPage.includes('11.9265') && !faultPage.includes('79.8225'), 'Fault page still contains fixed default Puducherry coordinates');
assert(faultPage.includes('No default location is used'), 'Fault page does not explicitly reject fabricated/default location');

const admin = read('src/components/admin/AdminControlPanel.tsx');
assert(admin.includes('No backup was reported as successful') && admin.includes('No database restore was performed'), 'Admin backup/restore UI still reports fake success');

const stores = read('src/services/storesService.ts');
assert(stores.includes('issue_inventory_atomic'), 'Inventory issue must use atomic backend RPC');
assert(stores.includes('quantity <= 0'), 'Inventory positive quantity validation missing');

const survey = read('src/services/surveyService.ts');
assert(survey.includes('je_verify_submission') && survey.includes('ae_approve_and_publish') && survey.includes('reject_survey_submission'), 'Survey approval service is not connected to secure RPCs');
assert(survey.includes('locationSource') || survey.includes('location_source'), 'Survey service does not carry location provenance');

const offline = read('src/lib/offlineQueue.ts');
assert(offline.includes('indexedDB'), 'Offline queue is not IndexedDB-backed');
assert(offline.includes('markSynced(record.id)'), 'Offline queue does not require server handler completion before marking synced');

const scada = read('src/services/scadaGatewayService.ts');
assert(scada.includes('PHYSICAL') || scada.includes('physical'), 'SCADA gateway source does not show physical control boundary');

const sql1 = read('supabase/migrations/20261116_production_schema_hardening.sql');
const sql2 = read('supabase/migrations/20261117_production_security_functions.sql');
assert(sql1.includes('ALTER TABLE public.safety_permits') && sql1.includes('permit_safety_events'), 'PTW schema hardening migration missing');
assert(sql2.includes('issue_inventory_atomic') && sql2.includes('advance_ptw_stage'), 'Security RPC migration missing');
assert(sql2.includes('REVOKE EXECUTE') && sql2.includes('GRANT EXECUTE'), 'Privileged RPC execution privileges are not explicitly constrained');
assert(sql2.includes('actor_id') && !sql2.includes('approval_history.approver_id'), 'Broken approval_history.approver_id reference remains');
const sql3 = read('supabase/migrations/20261118_concurrency_and_storage_hardening.sql');
assert(sql3.includes('work_order_number_seq') && sql3.includes('fault_number_seq') && sql3.includes('outage_number_seq') && sql3.includes('ptw_number_seq'), 'Concurrency-safe number sequences are missing');
assert(!/SELECT\s+count\(\*\)\s*\+\s*1/i.test(sql3), 'New production numbering migration still uses race-prone count(*)+1 identifiers');
assert(sql3.includes('survey-evidence') && sql3.includes('ptw-evidence'), 'Evidence storage buckets/policies are missing');
assert(sql3.includes('sync_offline_survey_asset'), 'Offline survey idempotent synchronization RPC is missing');
const contractor = read('src/components/surveys/ContractorPWA.tsx');
assert(contractor.includes('registerSyncHandler') && contractor.includes('survey-evidence'), 'Contractor PWA is not connected to server-confirmed offline sync/evidence storage');
const adminService = read('src/services/adminService.ts');
assert(read('src/repositories/domain/AdminRepository.ts').includes('admin-update-user'), 'Admin profile updates do not use the server-side Auth administration workflow');

console.log(`PASS: ${pages.length} primary page components inspected for presence plus P0/P1 static security invariants.`);
