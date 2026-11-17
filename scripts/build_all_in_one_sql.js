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
const files = [...migrations, 'supabase/seed.sql'];

let output = `-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS & ASSET MANAGEMENT PLATFORM
-- ALL-IN-ONE MASTER DATABASE INSTALLATION & SEED SCRIPT
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste the ENTIRE contents of this file and click "Run" (or Ctrl + Enter)
-- 
-- NOTE FOR EXISTING DATABASES:
-- If your database has old, corrupted or conflicting test tables from
-- earlier projects, run this single command first to reset cleanly:
--
--   DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
--
-- Then paste and run this script.
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
