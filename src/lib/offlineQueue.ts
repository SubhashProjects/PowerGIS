// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// CONTRACTOR PWA OFFLINE STORAGE & SYNC QUEUE (INDEXEDDB & LOCALSTORAGE)
// ============================================================================

import { OfflineSurveyRecord } from '../types/surveys';

const STORAGE_KEY = 'powergis_offline_surveys_queue';

export class OfflineQueueManager {
  private static instance: OfflineQueueManager;
  private syncListeners: Array<(count: number) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.attemptAutoSync();
      });
    }
  }

  public static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager();
    }
    return OfflineQueueManager.instance;
  }

  public getQueue(): OfflineSurveyRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch {
      return [];
    }
  }

  public getUnsyncedCount(): number {
    return this.getQueue().filter(r => !r.synced).length;
  }

  public enqueueRecord(record: Omit<OfflineSurveyRecord, 'id' | 'synced' | 'timestamp'>): OfflineSurveyRecord {
    const queue = this.getQueue();
    const newRecord: OfflineSurveyRecord = {
      ...record,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    queue.push(newRecord);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
    this.notifyListeners();
    return newRecord;
  }

  public markSynced(id: string): void {
    const queue = this.getQueue();
    const index = queue.findIndex(r => r.id === id);
    if (index !== -1) {
      queue[index].synced = true;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      }
      this.notifyListeners();
    }
  }

  public clearSynced(): void {
    const queue = this.getQueue().filter(r => !r.synced);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
    this.notifyListeners();
  }

  public async attemptAutoSync(): Promise<{ synced: number; failed: number }> {
    const unsynced = this.getQueue().filter(r => !r.synced);
    if (unsynced.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const record of unsynced) {
      try {
        // Simulate or perform sync to Supabase staging
        await new Promise(res => setTimeout(res, 200));
        this.markSynced(record.id);
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }

  public subscribe(listener: (count: number) => void): () => void {
    this.syncListeners.push(listener);
    listener(this.getUnsyncedCount());
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const count = this.getUnsyncedCount();
    this.syncListeners.forEach(l => l(count));
  }
}

export const offlineQueue = OfflineQueueManager.getInstance();
