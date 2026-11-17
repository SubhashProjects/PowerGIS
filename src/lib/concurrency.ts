export class ConcurrencyConflictError extends Error {
  constructor(message = 'This record changed elsewhere. Reload it before saving again.') {
    super(message); this.name = 'ConcurrencyConflictError';
  }
}

export interface VersionedRecord { id: string; updated_at?: string; version?: number; }

export const getRecordVersion = (record: VersionedRecord): string | number | undefined => record.updated_at ?? record.version;
export const isConcurrencyConflict = (error: unknown): boolean => String((error as any)?.message ?? error).includes('CONCURRENCY_CONFLICT');
export const assertNoConcurrencyConflict = (error: unknown): never => { if (isConcurrencyConflict(error)) throw new ConcurrencyConflictError(); throw error; };
