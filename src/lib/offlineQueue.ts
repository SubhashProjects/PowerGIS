// PowerGIS offline queue: IndexedDB-backed, server-confirmed synchronization.
import { OfflineSurveyRecord } from '../types/surveys';

const DB_NAME = 'powergis-offline';
const STORE_NAME = 'survey_queue';

type SyncHandler = (record: OfflineSurveyRecord) => Promise<void>;

export class OfflineQueueManager {
 private static instance: OfflineQueueManager;
 private cache: OfflineSurveyRecord[] = [];
 private syncListeners: Array<(count: number) => void> = [];
 private syncHandler?: SyncHandler;
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
 const request = indexedDB.open(DB_NAME, 1);
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
 const request = indexedDB.open(DB_NAME, 1);
 request.onsuccess = () => {
 const db = request.result;
 const tx = db.transaction(STORE_NAME, 'readwrite');
 tx.objectStore(STORE_NAME).put(record);
 };
 }

 private deletePersisted(id: string): void {
 if (typeof indexedDB === 'undefined') return;
 const request = indexedDB.open(DB_NAME, 1);
 request.onsuccess = () => {
 const db = request.result;
 const tx = db.transaction(STORE_NAME, 'readwrite');
 tx.objectStore(STORE_NAME).delete(id);
 };
 }

 public getQueue(): OfflineSurveyRecord[] { return [...this.cache]; }
 public getUnsyncedCount(): number { return this.cache.filter(r => !r.synced).length; }
 public async ready(): Promise<void> { await this.readyPromise; }

 public enqueueRecord(record: Omit<OfflineSurveyRecord, 'id' | 'synced' | 'timestamp'>): OfflineSurveyRecord {
 const newRecord: OfflineSurveyRecord = {
 ...record,
 id: `offline_${crypto.randomUUID()}`,
 operationId: crypto.randomUUID(),
 timestamp: new Date().toISOString(),
 synced: false,
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

 public async attemptAutoSync(): Promise<{ synced: number; failed: number }> {
 await this.ready();
 if (!this.syncHandler || typeof navigator !== 'undefined' && !navigator.onLine) {
 return { synced: 0, failed: this.getUnsyncedCount() };
 }
 let synced = 0;
 let failed = 0;
 for (const record of this.cache.filter(r => !r.synced)) {
 try {
 await this.syncHandler(record);
 this.markSynced(record.id);
 synced += 1;
 } catch (error) {
 failed += 1;
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
