import { createOperationId, runIdempotent } from './idempotency';
import { assertNoConcurrencyConflict } from './concurrency';

export interface MutationContext { operationId: string; expectedVersion?: string; }
export const createMutationContext = (prefix: string, expectedVersion?: string): MutationContext => ({ operationId: createOperationId(prefix), expectedVersion });
export async function runCriticalMutation<T>(context: MutationContext, operation: () => Promise<T>): Promise<T> {
  try { return await runIdempotent(context.operationId, operation); }
  catch (error) { assertNoConcurrencyConflict(error); throw error; }
}
