import { createOperationId } from './idempotency';
import { offlineMutationQueue } from './offlineMutationQueue';

export interface MutationCommandContext { operationId: string; operationType: string; expectedVersion?: string; }
export interface OfflineMutationFallback { entityType: string; entityId?: string; payload: Record<string, unknown>; dependencyIds?: string[]; }
export const createMutationCommand = (operationType: string, expectedVersion?: string): MutationCommandContext => ({ operationId: createOperationId(operationType), operationType, expectedVersion });

const isConnectivityFailure = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = String((error as { message?: string })?.message ?? error).toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|connection (?:lost|reset|refused)|timed? ?out|fetch failed|offline/.test(message);
};

/** Executes a transactional idempotent RPC. When transport is unavailable, the
 * same operation id and exact RPC payload are durably queued before returning an
 * explicit OFFLINE_QUEUED error to the caller. Server/business errors are never queued. */
export async function runServerIdempotentMutation<T>(
  context: MutationCommandContext,
  operation: () => Promise<T>,
  offline?: OfflineMutationFallback,
): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (offline && isConnectivityFailure(error)) {
      await offlineMutationQueue.enqueue({ operationType: context.operationType, operationId: context.operationId, entityType: offline.entityType, entityId: offline.entityId, payload: offline.payload, dependencyIds: offline.dependencyIds });
      const queued = new Error(`OFFLINE_QUEUED: ${context.operationType} was saved on this device and will synchronize when connectivity returns.`);
      queued.name = 'OfflineMutationQueuedError';
      throw queued;
    }
    throw error;
  }
}
