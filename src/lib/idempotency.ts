const PREFIX = 'powergis-idempotency:';

export interface IdempotencyRecord { operationId: string; status: 'pending' | 'completed' | 'failed'; result?: unknown; error?: string; updatedAt: string; }

export const createOperationId = (prefix = 'op'): string => `${prefix}_${crypto.randomUUID()}`;
export const getIdempotencyRecord = (operationId: string): IdempotencyRecord | null => {
  if (typeof localStorage === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(PREFIX + operationId) || 'null'); } catch { return null; }
};
export const rememberIdempotency = (record: IdempotencyRecord): void => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + record.operationId, JSON.stringify(record));
};
export async function runIdempotent<T>(operationId: string, operation: () => Promise<T>): Promise<T> {
  const existing = getIdempotencyRecord(operationId);
  if (existing?.status === 'completed') return existing.result as T;
  rememberIdempotency({ operationId, status: 'pending', updatedAt: new Date().toISOString() });
  try { const result = await operation(); rememberIdempotency({operationId,status:'completed',result,updatedAt:new Date().toISOString()}); return result; }
  catch (error) { rememberIdempotency({operationId,status:'failed',error:String((error as any)?.message ?? error),updatedAt:new Date().toISOString()}); throw error; }
}
