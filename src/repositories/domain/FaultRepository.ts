import type { Fault } from '../../types/operations';
import { createRepository } from '../repositoryFactory';
export const faultRepository = createRepository<Fault>('faults');
