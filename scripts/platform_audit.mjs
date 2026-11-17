import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const failures = []; const warnings = [];
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const appConfig = read('src/config/appConfig.ts');
if (pkg.version !== lock.version || pkg.version !== lock.packages?.['']?.version) failures.push('package.json and package-lock.json versions do not match');
if (!appConfig.includes(`version: '${pkg.version}'`)) failures.push('APP_CONFIG version does not match package version');
const navSource = read('src/config/navigationConfig.ts');
const navBody = navSource.split('export const NAVIGATION_ITEMS')[1] ?? '';
const navIds = [...navBody.matchAll(/id:\s*'([^']+)'/g)].map(match => match[1]);
const duplicateIds = navIds.filter((id, index) => navIds.indexOf(id) !== index);
for (const id of duplicateIds) failures.push(`duplicate navigation ID: ${id}`);
const app = read('src/App.tsx');
for (const id of navIds) if (!app.includes(`activeTab === '${id}'`)) failures.push(`navigation route is not mounted: ${id}`);
const sourceFiles = [];
function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) walk(file); else if (/\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts')) sourceFiles.push(file); } }
walk(path.join(root, 'src'));
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (file.includes(`${path.sep}components${path.sep}`) && (/supabase\.from\(/.test(content) || /supabase\.rpc\(/.test(content))) failures.push(`direct Supabase access in UI component: ${path.relative(root,file)}`);
  const imports = /from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;
  for (const match of content.matchAll(imports)) {
    const specifier = match[1] || match[2]; if (!specifier.startsWith('.')) continue;
    const base = path.resolve(path.dirname(file), specifier);
    const exists = ['.ts','.tsx','.js','.jsx'].some(ext => fs.existsSync(base + ext)) || ['index.ts','index.tsx','index.js','index.jsx'].some(name => fs.existsSync(path.join(base,name))) || fs.existsSync(base);
    if (!exists) failures.push(`unresolved relative import: ${path.relative(root,file)} -> ${specifier}`);
  }
}
if (!fs.existsSync(path.join(root,'supabase/migrations/20261127_platform_evolution_326_332.sql'))) failures.push('3.26–3.32 database migration missing');
if (!fs.existsSync(path.join(root,'supabase/functions/telemetry-ingest/index.ts'))) failures.push('telemetry ingress Edge Function missing');
if (!fs.existsSync(path.join(root,'public/manifest.webmanifest')) || !fs.existsSync(path.join(root,'public/powergis-sw.js'))) failures.push('PWA manifest or service worker missing');
const worker = read('public/powergis-sw.js');
for (const pathPart of ['/rest/v1/','/auth/v1/','/storage/v1/','/functions/v1/']) if (!worker.includes(pathPart)) failures.push(`service worker API cache exclusion missing: ${pathPart}`);
if (!fs.existsSync(path.join(root,'node_modules'))) warnings.push('node_modules is absent; full app type-check and Vite build were not run');
console.log(`PowerGIS ${pkg.version} static platform audit`);
console.log(`Navigation modules: ${navIds.length}; source files: ${sourceFiles.length}`);
console.log(`Failures: ${failures.length}; warnings: ${warnings.length}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (failures.length) process.exit(1);
