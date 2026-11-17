import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.match(pkg.version, /^3\.\d+\.\d+$/);
assert.equal(JSON.parse(read('package-lock.json')).version, pkg.version);
const queue = read('src/lib/offlineMutationQueue.ts');
for (const token of ['indexedDB.open', 'transaction(STORE, \'readwrite\')', 'await this.put(item as OfflineMutation)', 'LEGACY_KEY', 'acquireReplayLease', 'releaseReplayLease', 'nextAttemptAt', 'CONCURRENCY_CONFLICT']) assert.ok(queue.includes(token), `Missing durable queue behavior: ${token}`);
assert.doesNotMatch(queue, /localStorage\.setItem\(LEGACY_KEY, JSON\.stringify/);
const processor = read('src/lib/offlineMutationProcessor.ts');
for (const token of ['acquireReplayLease', 'releaseReplayLease', 'nextAttemptAt', 'dependenciesReady', 'markFailed']) assert.ok(processor.includes(token));
const command = read('src/lib/mutationCommand.ts');
assert.match(command, /isConnectivityFailure/);
assert.match(command, /offlineMutationQueue\.enqueue/);
assert.match(command, /OFFLINE_QUEUED/);
for (const [file, ops] of [
 ['src/repositories/domain/FaultCommandRepository.ts', ['fault.create','fault.transition']],
 ['src/services/reliabilityService.ts', ['outage.create']],
 ['src/services/workOrderService.ts', ['work_order.create','work_order.transition']],
 ['src/services/ptwService.ts', ['ptw.create','ptw.transition']],
 ['src/services/storesService.ts', ['inventory.issue','inventory.transaction']],
]) { const text = read(file); assert.match(text, /entityType:/, `${file} missing durable offline payload`); for (const op of ops) assert.ok(text.includes(op), `${file} missing ${op}`); }
const center = read('src/components/common/SyncCenter.tsx');
for (const token of ['Sync details','Retry failed','Sync now','errorCode','IndexedDB']) assert.ok(center.includes(token));
assert.match(read('src/App.tsx'), /registerOperationalOfflineHandlers\(\)/);
console.log('PowerGIS 3.13 offline-first architecture checks passed.');
