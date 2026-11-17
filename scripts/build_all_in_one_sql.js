import fs from 'fs';
import path from 'path';

const migrationDir = 'supabase/migrations';
const migrations = fs.readdirSync(migrationDir)
  .filter(name => name.endsWith('.sql'))
  .sort((a, b) => {
    // Master baseline schema must always execute first to create all tables
    if (a.includes('master_schema')) return -1;
    if (b.includes('master_schema')) return 1;
    return a.localeCompare(b);
  })
  .map(name => path.join(migrationDir, name));
// Keep demo fixtures out of the production installation bundle.
const files = migrations;

let output = `-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS & ASSET MANAGEMENT PLATFORM
-- ALL-IN-ONE MASTER DATABASE INSTALLATION & SEED SCRIPT
-- ============================================================================
-- Deployment safety:
-- Apply timestamped migrations with the Supabase CLI to existing environments.
-- This consolidated script is intended only for a fresh, isolated database after
-- reviewing every migration. It is NOT a reset/repair script. Never DROP SCHEMA
-- public CASCADE on a production database; use a tested backup/restore procedure.
-- ============================================================================

`;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  output += `\n-- ----------------------------------------------------------------------------\n`;
  output += `-- SECTION: ${path.basename(f)}\n`;
  output += `-- ----------------------------------------------------------------------------\n\n`;
  output += content + '\n';
}

fs.writeFileSync('supabase/SUPABASE_ALL_IN_ONE_MASTER.sql', output, 'utf8');
console.log(`Successfully generated supabase/SUPABASE_ALL_IN_ONE_MASTER.sql, sections: ${files.length}, size: ${output.length}`);
