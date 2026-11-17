import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const sourceFiles = files(src).filter(f => /\.(ts|tsx)$/.test(f));
const text = sourceFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const errors = [];
const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '3.5.0' && pkg.version !== '3.10.0') errors.push(`package version is ${pkg.version}`);
if (!fs.existsSync(path.join(src, 'data', 'simulatorData.ts'))) errors.push('simulator adapter boundary missing');
if (!fs.existsSync(path.join(src, 'services', 'globalSearchService.ts'))) errors.push('global search service missing');
if (!text.includes('mobileCards')) errors.push('responsive DataTable cards missing');
for (const f of sourceFiles) {
  const rel = path.relative(root, f).replaceAll('\\','/');
  if (rel !== 'src/data/simulatorData.ts' && rel !== 'src/simulator/mockData.ts' && fs.readFileSync(f,'utf8').includes("simulator/mockData")) {
    errors.push(`direct simulator import remains: ${rel}`);
  }
}
if (text.includes('filter: grayscale(100%)') || text.includes('pg-monochrome')) errors.push('forbidden global monochrome mechanism remains');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('V3.5 architecture checks: PASS');
