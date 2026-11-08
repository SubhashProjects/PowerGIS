import fs from 'fs';
import path from 'path';

const files = [
  'supabase/migrations/20261108_puducherry_master_schema.sql',
  'supabase/migrations/20261108_rls_jurisdiction_policies.sql',
  'supabase/migrations/20261108_approval_workflow_rpc.sql',
  'supabase/migrations/20261108_spatial_metrics_rpc.sql',
  'supabase/migrations/20261108_reliability_metrics_rpc.sql',
  'supabase/migrations/20261108_asset_risk_matrix.sql',
  'supabase/seed.sql'
];

let output = `-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS & ASSET MANAGEMENT PLATFORM
-- ALL-IN-ONE MASTER DATABASE INSTALLATION & SEED SCRIPT
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste the ENTIRE contents of this file and click "Run" (or Ctrl + Enter)
-- 4. This script installs:
--    - PostGIS, UUID, and Crypto extensions
--    - Master spatial tables and GIST spatial indices
--    - Strict multi-tier Row Level Security (RLS) policies
--    - Atomic survey approval & staging promotion RPC stored procedures
--    - IEEE 1366 reliability calculation functions (SAIFI, SAIDI, CAIDI, ENS)
--    - ISO 55000 asset risk scoring engine
--    - Complete initial test & seed dataset across all 4 regions
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
console.log('Successfully generated supabase/SUPABASE_ALL_IN_ONE_MASTER.sql, size:', output.length);
