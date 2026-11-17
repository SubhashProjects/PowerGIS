import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..', import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const files=fs.readdirSync(path.join(root,'src/components'),{recursive:true}).filter(f=>String(f).endsWith('.tsx'));
for(const f of files){
 const s=read(path.join('src/components',String(f)));
 assert(!/supabase\.from\(/.test(s),`direct Supabase table access in UI component: ${f}`);
 assert(!/supabase\.rpc\(/.test(s),`direct Supabase RPC access in UI component: ${f}`);
}
assert(read('package.json').includes('"version": "3.14.0"'),'package version mismatch');
assert(read('src/config/appConfig.ts').includes("version: '3.14.0'"),'app version mismatch');
assert(fs.existsSync(path.join(root,'src/lib/workflowEngine.ts')),'workflow engine missing');
assert(read('src/services/workOrderService.ts').includes('assertWorkflowTransition'),'work order workflow is not enforced client-side');
assert(fs.existsSync(path.join(root,'src/repositories/domain/NotificationRepository.ts')),'notification repository missing');
assert(fs.existsSync(path.join(root,'src/components/common/NotificationCenter.tsx')),'notification center missing');
assert(read('supabase/migrations/20261124_production_enforcement.sql').includes('user_notifications'),'persistent notification migration missing');
assert(read('supabase/migrations/20261124_production_enforcement.sql').includes('operation_id'),'audit operation correlation missing');
assert(!read('src/index.css').includes('filter: grayscale(100%)'),'global grayscale filter must not exist');
for(const f of files){ const s=read(path.join('src/components',String(f))); assert(!/service_role|SUPABASE_SERVICE_ROLE|anon_key\s*[:=]\s*['"]/i.test(s),`credential leakage in UI component: ${f}`); }
assert(read('src/lib/offlineMutationProcessor.ts').includes('dependenciesReady'),'generic offline dependency processor missing');
assert(read('supabase/migrations/20261124_production_enforcement.sql').includes('record_operation_audit'),'operation audit function missing');
console.log('PowerGIS 3.10 production enforcement static tests passed');
