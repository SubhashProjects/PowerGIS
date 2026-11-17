import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.cwd());
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const sql = read('supabase/migrations/20261120_final_production_hardening.sql');
const svc = read('src/services/specializedModuleService.ts');
const master = read('supabase/SUPABASE_ALL_IN_ONE_MASTER.sql');
const checks = [
  ['capital project creation RPC', /create_capital_project_package/],
  ['maintenance creation RPC', /create_maintenance_task/],
  ['disaster scope columns', /ALTER TABLE public\.disaster_events ADD COLUMN IF NOT EXISTS section_id/],
  ['disaster patch allow-list', /Immutable or unsupported disaster fields supplied/],
  ['disaster value bounds', /Restoration progress must be 0\.\.100/],
  ['risk jurisdiction enforcement', /Transformer outside jurisdiction/],
  ['risk function execution restricted', /GRANT EXECUTE ON FUNCTION public\.calculate_transformer_risk_score/],
  ['direct specialized table mutation revoked', /REVOKE INSERT, UPDATE, DELETE ON public\.capital_project_packages FROM authenticated/],
  ['service exposes project creation', /createProjectPackage/],
  ['service exposes maintenance creation', /createMaintenanceTask/],
  ['all migrations included in master SQL', /SECTION: 20261120_final_production_hardening\.sql/],
  ['master SQL contains specialized RPC', /create_capital_project_package/],
];
let failed=0;
for (const [name,re] of checks) { if(!re.test(sql+svc+master)){console.error('FAIL',name);failed++;} else console.log('PASS',name); }
if(failed) process.exit(1);
