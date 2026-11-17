import { offlineMutationQueue, OfflineMutation } from './offlineMutationQueue';

export type OfflineMutationHandler = (mutation: OfflineMutation) => Promise<void>;

class OfflineMutationProcessor {
  private handlers = new Map<string, OfflineMutationHandler>();
  register(operationType: string, handler: OfflineMutationHandler): () => void {
    this.handlers.set(operationType, handler);
    return () => { if (this.handlers.get(operationType) === handler) this.handlers.delete(operationType); };
  }
  async process(): Promise<{ synced: number; failed: number; blocked: number }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0, blocked: 0 };
    let synced = 0, failed = 0, blocked = 0;
    for (const mutation of offlineMutationQueue.list().filter(m => m.status === 'pending' || m.status === 'failed')) {
      if (!offlineMutationQueue.dependenciesReady(mutation)) { offlineMutationQueue.markBlocked(mutation.id, 'Waiting for dependent operation(s) to synchronize.'); blocked += 1; continue; }
      const handler = this.handlers.get(mutation.operationType);
      if (!handler) { offlineMutationQueue.markBlocked(mutation.id, `No sync handler registered for ${mutation.operationType}.`); blocked += 1; continue; }
      offlineMutationQueue.markSyncing(mutation.id);
      try { await handler(mutation); offlineMutationQueue.markSynced(mutation.id); synced += 1; }
      catch (error) { offlineMutationQueue.markFailed(mutation.id, error); failed += 1; }
    }
    return { synced, failed, blocked };
  }
}

export const offlineMutationProcessor = new OfflineMutationProcessor();
