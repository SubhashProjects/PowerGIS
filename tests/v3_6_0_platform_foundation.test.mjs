import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const pkg = JSON.parse(read('package.json'));
const config = read('src/config/appConfig.ts');

if (!/^3\.\d+\.\d+$/.test(pkg.version)) throw new Error('package version mismatch');
for (const file of ['src/repositories/interfaces/Repository.ts','src/repositories/repositoryFactory.ts','src/repositories/supabase/SupabaseTableRepository.ts','src/repositories/simulator/SimulatorRepository.ts','src/lib/concurrency.ts','src/lib/idempotency.ts','src/components/common/ErrorBoundary.tsx','src/components/common/SyncCenter.tsx','src/components/common/RecordPage.tsx','src/config/capabilities.ts']) if (!fs.existsSync(path.join(root,file))) throw new Error(`missing ${file}`);
if (config.includes('substationsCount:') || config.includes('consumersCount:')) throw new Error('static operational counts remain in appConfig');
const src = fs.readdirSync(path.join(root,'src'),{recursive:true}).filter(x=>String(x).endsWith('.ts')||String(x).endsWith('.tsx')).map(x=>path.join(root,'src',x));
const productionImports = src.filter(f=>!f.includes(`${path.sep}simulator${path.sep}`) && !f.endsWith(`${path.sep}data${path.sep}simulatorData.ts`)).flatMap(f=>read(path.relative(root,f)).split('\n').filter(l=>l.includes("../simulator/mockData")||l.includes("./simulator/mockData")));
if (productionImports.length) throw new Error('direct simulator/mockData import remains outside simulator boundary');
console.log('PowerGIS 3.6.0 platform foundation static checks passed');
