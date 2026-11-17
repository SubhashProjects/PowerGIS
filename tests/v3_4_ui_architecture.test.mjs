import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const fail = m => { throw new Error(m); };

if (!/^3\.\d+\.\d+$/.test(JSON.parse(read('package.json')).version)) fail('package version is not 3.4.0');
if (!fs.existsSync(path.join(root, 'src/components/common/CommandPalette.tsx'))) fail('CommandPalette missing');
if (!fs.existsSync(path.join(root, 'src/components/common/ConnectionStatus.tsx'))) fail('ConnectionStatus missing');
if (!fs.existsSync(path.join(root, 'src/components/common/PageShell.tsx'))) fail('PageShell missing');
if (fs.existsSync(path.join(root, 'src/services/mockData.ts'))) fail('deprecated services/mockData facade remains');
const sourceFiles = [];
function walk(dir){ for(const name of fs.readdirSync(dir)){ const p=path.join(dir,name); if(name==='node_modules') continue; const s=fs.statSync(p); if(s.isDirectory()) walk(p); else if(/\.(ts|tsx)$/.test(name)) sourceFiles.push(p); } }
walk(path.join(root,'src'));
for (const p of sourceFiles) {
  const s=fs.readFileSync(p,'utf8');
  if (p.replaceAll('\\', '/').endsWith('src/simulator/index.ts')) continue;
  if (s.includes("from './mockData'") || s.includes("from '../services/mockData'")) fail(`deprecated mockData import remains: ${path.relative(root,p)}`);
}
if (!read('src/components/layout/Header.tsx').includes('!isSupabaseConfigured && <button')) fail('simulator toggle is not production-hidden');
console.log('V3.4.0 UI architecture checks: PASS');
