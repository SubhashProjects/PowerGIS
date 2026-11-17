// PowerGIS offline queue: IndexedDB-backed, server-confirmed synchronization.
import { OfflineSurveyRecord } from '../types/surveys';

const DB_NAME = 'powergis-offline';
const STORE_NAME = 'survey_queue';

export interface SyncQueueSummary { pending: number; failed: number; syncing: number; synced: number; }
export interface SyncQueueItemMeta { operationId: string; entityType?: string; entityId?: string; mutation?: string; dependencyIds?: string[]; retryCount: number; lastAttemptAt?: string; lastError?: string; }

type SyncHandler = (record: OfflineSurveyRecord) => Promise<void>;

export class OfflineQueueManager {
 private static instance: OfflineQueueManager;
 private cache: OfflineSurveyRecord[] = [];
 private syncListeners: Array<(count: number) => void> = [];
 private syncHandler?: SyncHandler;
 private dependencyResolver?: (record: OfflineSurveyRecord) => boolean;
 private readyPromise: Promise<void>;

 private constructor() {
 this.readyPromise = this.load();
 if (typeof window !== 'undefined') {
 window.addEventListener('online', () => { void this.attemptAutoSync(); });
 }
 }

 public static getInstance(): OfflineQueueManager {
 if (!OfflineQueueManager.instance) OfflineQueueManager.instance = new OfflineQueueManager();
 return OfflineQueueManager.instance;
 }

 private async load(): Promise<void> {
 if (typeof indexedDB === 'undefined') return;
 await new Promise<void>((resolve, reject) => {
 const request = indexedDB.open(DB_NAME, 2);
 request.onupgradeneeded = () => {
 const db = request.result;
 if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
 };
 request.onerror = () => reject(request.error);
 request.onsuccess = () => {
 const db = request.result;
 const tx = db.transaction(STORE_NAME, 'readonly');
 const req = tx.objectStore(STORE_NAME).getAll();
 req.onsuccess = () => { this.cache = req.result ?? []; resolve(); };
 req.onerror = () => reject(req.error);
 };
 }).catch(() => undefined);
 }

 private persist(record: OfflineSurveyRecord): void {
 if (typeof indexedDB === 'undefined') return;
 const request = indexedDB.open(DB_NAME, 2);
 request.onsuccess = () => {
 const db = request.result;
 const tx = db.transaction(STORE_NAME, 'readwrite');
 tx.objectStore(STORE_NAME).put(record);
 };
 }

 private deletePersisted(id: string): void {
 if (typeof indexedDB === 'undefined') return;
 const request = indexedDB.open(DB_NAME, 2);
 request.onsuccess = () => {
 const db = request.result;
 const tx = db.transaction(STORE_NAME, 'readwrite');
 tx.objectStore(STORE_NAME).delete(id);
 };
 }

 public getQueue(): OfflineSurveyRecord[] { return [...this.cache]; }
 public retry(id: string): void { const item=this.cache.find(r=>r.id===id); if(!item) return; item.synced=false; item.syncStatus='pending'; item.lastError=undefined; this.persist(item); this.notifyListeners(); }
 public remove(id: string): void { this.cache=this.cache.filter(r=>r.id!==id); this.deletePersisted(id); this.notifyListeners(); }
 public getUnsyncedCount(): number { return this.cache.filter(r => !r.synced).length; }
 public getSummary(): SyncQueueSummary { return { pending: this.cache.filter(r => !r.synced && r.syncStatus !== 'failed').length, failed: this.cache.filter(r => !r.synced && r.syncStatus === 'failed').length, syncing: this.cache.filter(r => r.syncStatus === 'syncing').length, synced: this.cache.filter(r => r.synced).length }; }
 public markFailed(id: string, error: unknown): void { const item=this.cache.find(r=>r.id===id); if(!item) return; item.syncStatus='failed'; item.lastAttemptAt=new Date().toISOString(); item.lastError=String((error as any)?.message ?? error); item.retryCount=(item.retryCount ?? 0)+1; this.persist(item); this.notifyListeners(); }
 public async ready(): Promise<void> { await this.readyPromise; }

 public enqueueRecord(record: Omit<OfflineSurveyRecord, 'id' | 'synced' | 'timestamp'>): OfflineSurveyRecord {
 const newRecord: OfflineSurveyRecord = {
 ...record,
 id: `offline_${crypto.randomUUID()}`,
 operationId: crypto.randomUUID(),
 timestamp: new Date().toISOString(),
 synced: false,
 syncStatus: 'pending',
 retryCount: 0,
 };
 this.cache.push(newRecord);
 this.persist(newRecord);
 this.notifyListeners();
 return newRecord;
 }

 public markSynced(id: string): void {
 const item = this.cache.find(r => r.id === id);
 if (!item) return;
 item.synced = true;
 item.syncStatus = 'synced';
 item.lastAttemptAt = new Date().toISOString();
 this.persist(item);
 this.notifyListeners();
 }

 public clearSynced(): void {
 const synced = this.cache.filter(r => r.synced);
 this.cache = this.cache.filter(r => !r.synced);
 synced.forEach(r => this.deletePersisted(r.id));
 this.notifyListeners();
 }

 public registerSyncHandler(handler: SyncHandler): () => void {
 this.syncHandler = handler;
 return () => { if (this.syncHandler === handler) this.syncHandler = undefined; };
 }

 public setDependencyResolver(resolver?: (record: OfflineSurveyRecord) => boolean): void {
 this.dependencyResolver = resolver;
 }

 public async attemptAutoSync(): Promise<{ synced: number; failed: number }> {
 await this.ready();
 if (!this.syncHandler || typeof navigator !== 'undefined' && !navigator.onLine) {
 return { synced: 0, failed: this.getUnsyncedCount() };
 }
 let synced = 0;
 let failed = 0;
 for (const record of this.cache.filter(r => !r.synced && (!this.dependencyResolver || this.dependencyResolver(r)))) {
 try {
 await this.syncHandler(record);
 this.markSynced(record.id);
 synced += 1;
 } catch (error) {
 failed += 1;
 this.markFailed(record.id, error);
 console.error('Offline survey synchronization failed:', error);
 }
 }
 return { synced, failed };
 }

 public subscribe(listener: (count: number) => void): () => void {
 this.syncListeners.push(listener);
 listener(this.getUnsyncedCount());
 return () => { this.syncListeners = this.syncListeners.filter(l => l !== listener); };
 }

 private notifyListeners(): void {
 const count = this.getUnsyncedCount();
 this.syncListeners.forEach(listener => listener(count));
 }
}

export const offlineQueue = OfflineQueueManager.getInstance();
