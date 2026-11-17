import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const warnings = [];
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const app = read('src/config/appConfig.ts');
const worker = read('public/powergis-sw.js');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const master = read('supabase/SUPABASE_ALL_IN_ONE_MASTER.sql');

if (pkg.version !== '3.42.0') failures.push(`expected release version 3.42.0, got ${pkg.version}`);
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) failures.push('package lock version mismatch');
const lockedVite = lock.packages?.['node_modules/vite'];
if (pkg.devDependencies?.vite !== '6.4.6' || lockedVite?.version !== '6.4.6') failures.push('Vite must be pinned to patched version 6.4.6');
if (!lockedVite?.integrity) warnings.push('Vite lock entry is missing npm integrity metadata; regenerate package-lock.json from a trusted npm registry before release');
if (pkg.engines?.node !== '>=22.0.0' || lock.packages?.['']?.engines?.node !== '>=22.0.0') failures.push('Node.js engine policy must be >=22.0.0 in package and lock metadata');
if (!app.includes(`version: '${pkg.version}'`)) failures.push('application version mismatch');
if (!app.includes("edition: 'Completion & Stabilization Edition'")) failures.push('application edition mismatch');
if (master.includes('superadmin@powergis.internal')) failures.push('production master SQL must not contain demo seed personas');
if (!worker.includes('const CACHE_NAME = `${CACHE_PREFIX}' + pkg.version + '`;')) failures.push('service worker cache version mismatch');
if (!manifest.start_url || !manifest.scope || !Array.isArray(manifest.icons) || manifest.icons.length < 2) failures.push('PWA manifest is incomplete');
for (const icon of manifest.icons) if (!fs.existsSync(path.join(root, 'public', icon.src.replace(/^\.\//, '')))) failures.push(`PWA icon missing: ${icon.src}`);

const migrationDir = path.join(root, 'supabase/migrations');
const migrations = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
for (const name of migrations) {
  const sql = fs.readFileSync(path.join(migrationDir, name), 'utf8').trim();
  if (sql && !master.includes(sql)) failures.push(`master SQL is missing or out of sync with migration: ${name}`);
}

const forbiddenClientSecrets = [/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]+['"]/i, /POWERGIS_TELEMETRY_INGEST_TOKEN\s*[:=]\s*['"][^'"]+['"]/i];
const sourceDirs = ['src', 'public'];
for (const directory of sourceDirs) {
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(ts|tsx|js|jsx|html)$/.test(file)) {
        const content = fs.readFileSync(file, 'utf8');
        for (const pattern of forbiddenClientSecrets) if (pattern.test(content)) failures.push(`possible embedded backend secret: ${path.relative(root, file)}`);
      }
    }
  };
  walk(path.join(root, directory));
}

const requiredBoundaryDocs = [
  'docs/POWERGIS_V3.26_TO_V3.32_PLATFORM_EVOLUTION.md',
  'docs/POWERGIS_V3.33_TO_V3.42_COMPLETION_STABILIZATION.md',
];
for (const file of requiredBoundaryDocs) if (!fs.existsSync(path.join(root, file))) failures.push(`release boundary documentation missing: ${file}`);

console.log(`PowerGIS ${pkg.version} release-readiness audit`);
console.log(`Migrations checked: ${migrations.length}; PWA icons checked: ${manifest.icons.length}`);
console.log(`Failures: ${failures.length}; warnings: ${warnings.length}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (failures.length) process.exit(1);
