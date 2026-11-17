/** Durable IndexedDB queue for operational mutations. A mutation is not accepted
 * until its transaction commits; localStorage is used only for one-time migration. */
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
  updatedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
  errorCode?: string;
  nextAttemptAt?: string;
}

export interface OfflineMutationSummary { pending: number; syncing: number; failed: number; blocked: number; synced: number; }
const DB_NAME = 'powergis-offline-mutations';
const DB_VERSION = 1;
const STORE = 'mutations';
const LEASE_STORE = 'leases';
const LEGACY_KEY = 'powergis-offline-mutations-v2';
const LEASE_KEY = 'operational-replay';

const makeId = (prefix: string) => `${prefix}_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
const errorText = (error: unknown) => String((error as { message?: string })?.message ?? error);

export class OfflineMutationQueue {
  private cache: OfflineMutation[] = [];
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readyPromise: Promise<void>;
  private listeners = new Set<(items: OfflineMutation[]) => void>();
  constructor() { this.readyPromise = this.initialize().catch(() => undefined); }

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('DURABLE_OFFLINE_UNAVAILABLE: IndexedDB is not available in this browser.'));
    if (!this.dbPromise) this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(LEASE_STORE)) db.createObjectStore(LEASE_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open offline database.'));
      request.onblocked = () => reject(new Error('OFFLINE_DATABASE_BLOCKED: close other PowerGIS tabs and retry.'));
    });
    return this.dbPromise;
  }

  private async initialize(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    const db = await this.open();
    const stored = await new Promise<OfflineMutation[]>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result ?? []) as OfflineMutation[]);
      request.onerror = () => reject(request.error);
    });
    this.cache = stored.map(item => item.status === 'syncing' ? { ...item, status: 'pending', updatedAt: new Date().toISOString() } : item);
    for (const recovered of this.cache.filter((item, index) => item !== stored[index])) await this.put(recovered);
    // One-time, non-destructive migration of the previous localStorage queue.
    if (typeof localStorage !== 'undefined') {
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]') as OfflineMutation[];
        const known = new Set(stored.map(item => item.id));
        for (const raw of legacy) {
          if (!raw?.id || known.has(raw.id)) continue;
          const migrated: OfflineMutation = { ...raw, operationId: raw.operationId || makeId(raw.operationType || 'legacy'), status: raw.status === 'syncing' ? 'pending' : raw.status || 'pending', dependencyIds: raw.dependencyIds || [], retryCount: raw.retryCount || 0, createdAt: raw.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
          await this.put(migrated); this.cache.push(migrated);
        }
        if (legacy.length) localStorage.setItem(`${LEGACY_KEY}-migrated-at`, new Date().toISOString());
      } catch (error) { console.warn('PowerGIS legacy offline queue migration was not completed:', error); }
    }
    this.notify();
  }

  async ready(): Promise<void> { await this.readyPromise; }
  private async put(item: OfflineMutation): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Offline queue write failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Offline queue write was aborted.'));
    });
  }
  private async deletePersisted(id: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }
  private async change(id: string, updater: (item: OfflineMutation) => OfflineMutation): Promise<void> {
    await this.ready();
    const current = this.cache.find(item => item.id === id); if (!current) return;
    const next = updater(current);
    await this.put(next);
    this.cache = this.cache.map(item => item.id === id ? next : item); this.notify();
  }

  /** Resolves only after IndexedDB confirms the durable write. */
  async enqueue<T>(input: { operationType: string; entityType: string; entityId?: string; payload: T; dependencyIds?: string[]; operationId?: string }): Promise<OfflineMutation<T>> {
    await this.ready();
    const now = new Date().toISOString();
    const item: OfflineMutation<T> = { ...input, id: makeId('offline'), operationId: input.operationId || makeId(input.operationType), dependencyIds: input.dependencyIds || [], status: 'pending', retryCount: 0, createdAt: now, updatedAt: now };
    await this.put(item as OfflineMutation);
    this.cache = [...this.cache, item as OfflineMutation]; this.notify(); return item;
  }
  list(): OfflineMutation[] { return this.cache.map(item => ({ ...item, dependencyIds: [...item.dependencyIds] })); }
  async remove(id: string): Promise<void> { await this.ready(); await this.deletePersisted(id); this.cache = this.cache.filter(item => item.id !== id); this.notify(); }
  async retry(id: string): Promise<void> { await this.change(id, item => item.errorCode === 'CONCURRENCY_CONFLICT' ? item : ({ ...item, status: 'pending', lastError: undefined, errorCode: undefined, nextAttemptAt: undefined, updatedAt: new Date().toISOString() })); }
  async retryAllFailed(): Promise<void> { await this.ready(); for (const item of this.cache.filter(value => value.status === 'failed' || (value.status === 'blocked' && value.errorCode !== 'CONCURRENCY_CONFLICT'))) await this.retry(item.id); }
  async markSyncing(id: string): Promise<void> { await this.change(id, item => ({ ...item, status: 'syncing', lastAttemptAt: new Date().toISOString(), updatedAt: new Date().toISOString() })); }
  async markFailed(id: string, error: unknown): Promise<void> {
    await this.change(id, item => { const retryCount = item.retryCount + 1; const message = errorText(error); const conflict = /CONCURRENCY_CONFLICT|version conflict|stale version/i.test(message); const delay = Math.min(30 * 60_000, 2 ** Math.min(retryCount, 10) * 1000);
      return { ...item, status: conflict ? 'blocked' : 'failed', retryCount, lastAttemptAt: new Date().toISOString(), lastError: message, errorCode: conflict ? 'CONCURRENCY_CONFLICT' : undefined, nextAttemptAt: conflict ? undefined : new Date(Date.now() + delay).toISOString(), updatedAt: new Date().toISOString() }; });
  }
  async markBlocked(id: string, reason: string): Promise<void> { await this.change(id, item => ({ ...item, status: 'blocked', lastError: reason, updatedAt: new Date().toISOString() })); }
  async markSynced(id: string): Promise<void> { await this.change(id, item => ({ ...item, status: 'synced', lastAttemptAt: new Date().toISOString(), lastError: undefined, errorCode: undefined, nextAttemptAt: undefined, updatedAt: new Date().toISOString() })); }
  dependenciesReady(item: OfflineMutation): boolean { return item.dependencyIds.every(id => this.cache.find(dep => dep.id === id)?.status === 'synced'); }
  summary(): OfflineMutationSummary { return { pending: this.cache.filter(i => i.status === 'pending').length, syncing: this.cache.filter(i => i.status === 'syncing').length, failed: this.cache.filter(i => i.status === 'failed').length, blocked: this.cache.filter(i => i.status === 'blocked').length, synced: this.cache.filter(i => i.status === 'synced').length }; }
  subscribe(listener: (items: OfflineMutation[]) => void): () => void { this.listeners.add(listener); listener(this.list()); return () => this.listeners.delete(listener); }
  private notify(): void { const items = this.list(); this.listeners.forEach(listener => listener(items)); }

  /** Atomic lease prevents duplicate replay across tabs; lease expires after a crashed tab. */
  async acquireReplayLease(owner: string, ttlMs = 60_000): Promise<boolean> {
    await this.ready(); const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LEASE_STORE, 'readwrite'); const store = tx.objectStore(LEASE_STORE); const get = store.get(LEASE_KEY); let acquired = false;
      get.onsuccess = () => { const lease = get.result as { id: string; owner: string; expiresAt: number } | undefined; if (!lease || lease.expiresAt <= Date.now() || lease.owner === owner) { store.put({ id: LEASE_KEY, owner, expiresAt: Date.now() + ttlMs }); acquired = true; } };
      tx.oncomplete = () => resolve(acquired); tx.onerror = () => reject(tx.error);
    });
  }
  async releaseReplayLease(owner: string): Promise<void> {
    const db = await this.open(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(LEASE_STORE, 'readwrite'); const store = tx.objectStore(LEASE_STORE); const get = store.get(LEASE_KEY); get.onsuccess = () => { if (get.result?.owner === owner) store.delete(LEASE_KEY); }; tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  }
}
export const offlineMutationQueue = new OfflineMutationQueue();
