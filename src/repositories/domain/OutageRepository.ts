import { createRepository } from '../repositoryFactory';

export interface OutageRecord extends Record<string, unknown> { id: string; }
export const outageRepository = createRepository<OutageRecord>('outages');
