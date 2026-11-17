import fs from 'node:fs';
import assert from 'node:assert/strict';
const files = [
  'src/services/specializedModuleService.ts',
  'src/components/projects/CapitalProjectsRDSS.tsx',
  'src/components/preventive/MaintenanceScheduler.tsx',
  'src/components/disaster/DisasterResponseCell.tsx',
  'src/components/risk/AssetRiskMatrix.tsx',
  'supabase/migrations/20261119_specialized_modules_completion.sql',
];
for (const f of files) assert.ok(fs.existsSync(f), `missing ${f}`);
const sql = fs.readFileSync(files.at(-1), 'utf8');
for (const needle of ['capital_project_packages','maintenance_tasks','update_capital_project_milestone','complete_maintenance_task','update_disaster_event','user_has_jurisdiction']) assert.ok(sql.includes(needle), `missing ${needle}`);
const risk = fs.readFileSync(files[4], 'utf8');
assert.ok(risk.includes('getTransformerRisks'), 'risk UI must use backend risk RPC');
assert.ok(!risk.includes('idx === 0 ? 2 : 0'), 'risk UI must not fabricate fault counts');
console.log('PASS: V3.2.2 specialized-module persistence/security checks.');
