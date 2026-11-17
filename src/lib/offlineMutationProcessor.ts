import { offlineMutationQueue, OfflineMutation } from './offlineMutationQueue';
export type OfflineMutationHandler = (mutation: OfflineMutation) => Promise<void>;

class OfflineMutationProcessor {
  private handlers = new Map<string, OfflineMutationHandler>();
  private processing: Promise<{ synced: number; failed: number; blocked: number }> | null = null;
  private readonly owner = `tab_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;
  register(operationType: string, handler: OfflineMutationHandler): () => void {
    this.handlers.set(operationType, handler);
    return () => { if (this.handlers.get(operationType) === handler) this.handlers.delete(operationType); };
  }
  async process(): Promise<{ synced: number; failed: number; blocked: number }> {
    if (this.processing) return this.processing;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0, blocked: 0 };
    this.processing = this.processBatch();
    try { return await this.processing; } finally { this.processing = null; }
  }
  private async processBatch(): Promise<{ synced: number; failed: number; blocked: number }> {
    await offlineMutationQueue.ready();
    const leased = await offlineMutationQueue.acquireReplayLease(this.owner, 5 * 60_000);
    if (!leased) return { synced: 0, failed: 0, blocked: 0 };
    let synced = 0, failed = 0, blocked = 0;
    try {
      const now = Date.now();
      // Dependency-blocked commands become eligible automatically once their parents commit.
      for (const blocked of offlineMutationQueue.list().filter(item => item.status === 'blocked' && item.lastError?.startsWith('Waiting for dependent operation'))) {
        if (offlineMutationQueue.dependenciesReady(blocked)) await offlineMutationQueue.retry(blocked.id);
      }
      for (const mutation of offlineMutationQueue.list().filter(m => m.status === 'pending' || (m.status === 'failed' && (!m.nextAttemptAt || Date.parse(m.nextAttemptAt) <= now)))) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) break;
        if (!offlineMutationQueue.dependenciesReady(mutation)) {
          await offlineMutationQueue.markBlocked(mutation.id, 'Waiting for dependent operation(s) to synchronize.'); blocked += 1; continue;
        }
        const handler = this.handlers.get(mutation.operationType);
        if (!handler) { await offlineMutationQueue.markBlocked(mutation.id, `No sync handler registered for ${mutation.operationType}.`); blocked += 1; continue; }
        await offlineMutationQueue.markSyncing(mutation.id);
        try { await handler(mutation); await offlineMutationQueue.markSynced(mutation.id); synced += 1; }
        catch (error) { await offlineMutationQueue.markFailed(mutation.id, error); failed += 1; }
      }
      return { synced, failed, blocked };
    } finally { await offlineMutationQueue.releaseReplayLease(this.owner); }
  }
}
export const offlineMutationProcessor = new OfflineMutationProcessor();
