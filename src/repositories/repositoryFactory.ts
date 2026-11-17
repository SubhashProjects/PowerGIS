import { isSupabaseConfigured } from '../lib/supabase';
import { RUNTIME_CONFIG } from '../config/runtimeConfig';
import { SupabaseTableRepository } from './supabase/SupabaseTableRepository';
import { SimulatorRepository } from './simulator/SimulatorRepository';
import type { EntityRepository, RepositoryQuery } from './interfaces/Repository';

export type RepositorySource = 'supabase' | 'simulator' | 'unavailable';

/** Simulator data is a development aid only. A production build without a
 * configured backend must fail closed instead of silently presenting demo data. */
export const isSimulatorRuntimeAllowed = (): boolean => RUNTIME_CONFIG.isDevelopment;

export const repositorySource = (): RepositorySource => {
  if (isSupabaseConfigured) return 'supabase';
  return isSimulatorRuntimeAllowed() ? 'simulator' : 'unavailable';
};

class UnavailableRepository<T extends { id: string }> implements EntityRepository<T> {
  constructor(private readonly table: string) {}
  private unavailable(): never {
    throw new Error(`BACKEND_NOT_CONFIGURED: ${this.table} is unavailable. Configure Supabase before using production data.`);
  }
  async list(_query?: RepositoryQuery): Promise<T[]> { return this.unavailable(); }
  async getById(_id: string): Promise<T | null> { return this.unavailable(); }
  async create(_input: Omit<T, 'id'> & Partial<Pick<T, 'id'>>): Promise<T> { return this.unavailable(); }
  async update(_id: string, _patch: Partial<T>, _expectedVersion?: string): Promise<T> { return this.unavailable(); }
  async remove(_id: string, _expectedVersion?: string): Promise<void> { return this.unavailable(); }
}

export function createRepository<T extends { id: string }>(table: string, simulatorSeed: T[] = []): EntityRepository<T> {
  const source = repositorySource();
  if (source === 'supabase') return new SupabaseTableRepository<T>(table);
  if (source === 'simulator') return new SimulatorRepository<T>(simulatorSeed);
  return new UnavailableRepository<T>(table);
}
