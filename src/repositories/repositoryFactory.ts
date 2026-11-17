import { isSupabaseConfigured } from '../lib/supabase';
import { SupabaseTableRepository } from './supabase/SupabaseTableRepository';
import { SimulatorRepository } from './simulator/SimulatorRepository';
import type { EntityRepository } from './interfaces/Repository';

export type RepositorySource = 'supabase' | 'simulator';

export const repositorySource = (): RepositorySource => isSupabaseConfigured ? 'supabase' : 'simulator';

export function createRepository<T extends { id: string }>(table: string, simulatorSeed: T[] = []): EntityRepository<T> {
  return repositorySource() === 'supabase' ? new SupabaseTableRepository<T>(table) : new SimulatorRepository<T>(simulatorSeed);
}
