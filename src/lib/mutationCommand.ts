import { createOperationId } from './idempotency';

export interface MutationCommandContext {
  operationId: string;
  operationType: string;
  expectedVersion?: string;
}

export const createMutationCommand = (operationType: string, expectedVersion?: string): MutationCommandContext => ({
  operationId: createOperationId(operationType),
  operationType,
  expectedVersion,
});

/**
 * Critical commands are idempotent at the database boundary. The operation id
 * is generated once by the client and passed into a single transactional RPC.
 * The database wrapper owns the idempotency ledger and the business mutation
 * in the same transaction, so a retry after a transport failure cannot create
 * a second record.
 */
export async function runServerIdempotentMutation<T>(
  _context: MutationCommandContext,
  operation: () => Promise<T>,
): Promise<T> {
  return operation();
}
