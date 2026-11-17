export type OfflineMutationStatus = 'pending' | 'syncing' | 'failed' | 'synced' | 'blocked';

export interface OfflineMutation<T = unknown> {
  id: string;
  operationId: string;
  operationType: string;
  entityType: string;
  entityId?: string;
  payload: T;
  dependencyIds: string[];
  status: OfflineMutationStatus;
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  lastError?: string;
}

const KEY = 'powergis-offline-mutations-v2';

export class OfflineMutationQueue {
  private read(): OfflineMutation[] {
    if (typeof localStorage === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  private write(items: OfflineMutation[]): void { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(items)); }
  enqueue<T>(input: Omit<OfflineMutation<T>, 'id' | 'operationId' | 'status' | 'retryCount' | 'createdAt'>): OfflineMutation<T> {
    const item: OfflineMutation<T> = { ...input, id: `offline_${crypto.randomUUID()}`, operationId: `${input.operationType}_${crypto.randomUUID()}`, status: 'pending', retryCount: 0, createdAt: new Date().toISOString() };
    this.write([...this.read(), item as OfflineMutation]); return item;
  }
  list(): OfflineMutation[] { return this.read(); }
  remove(id: string): void { this.write(this.read().filter(item => item.id !== id)); }
  retry(id: string): void { this.write(this.read().map(item => item.id === id ? { ...item, status: 'pending', lastError: undefined } : item)); }
  markSyncing(id: string): void { this.write(this.read().map(item => item.id === id ? { ...item, status: 'syncing', lastAttemptAt: new Date().toISOString() } : item)); }
  markFailed(id: string, error: unknown): void { this.write(this.read().map(item => item.id === id ? { ...item, status: 'failed', retryCount: item.retryCount + 1, lastAttemptAt: new Date().toISOString(), lastError: String((error as any)?.message ?? error) } : item)); }
  markBlocked(id: string, reason: string): void { this.write(this.read().map(item => item.id === id ? { ...item, status: 'blocked', lastError: reason } : item)); }
  markSynced(id: string): void { this.write(this.read().map(item => item.id === id ? { ...item, status: 'synced', lastAttemptAt: new Date().toISOString(), lastError: undefined } : item)); }
  dependenciesReady(item: OfflineMutation): boolean {
    const all = this.read();
    return item.dependencyIds.every(id => all.find(dep => dep.id === id)?.status === 'synced');
  }
  summary(): { pending: number; syncing: number; failed: number; blocked: number; synced: number } {
    const items = this.read();
    return { pending: items.filter(i => i.status === 'pending').length, syncing: items.filter(i => i.status === 'syncing').length, failed: items.filter(i => i.status === 'failed').length, blocked: items.filter(i => i.status === 'blocked').length, synced: items.filter(i => i.status === 'synced').length };
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();
