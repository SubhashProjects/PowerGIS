import { supabase } from '../../lib/supabase';
import type { EntityRepository, RepositoryQuery } from '../interfaces/Repository';

export class SupabaseTableRepository<T extends { id: string }> implements EntityRepository<T> {
  constructor(private readonly table: string) {}

  private applyQuery(builder: any, query: RepositoryQuery = {}) {
    let next = builder;
    if (query.filters) for (const [key, value] of Object.entries(query.filters)) next = next.eq(key, value);
    if (query.orderBy) next = next.order(query.orderBy, { ascending: query.ascending !== false });
    if (query.offset !== undefined && query.limit !== undefined) next = next.range(query.offset, query.offset + query.limit - 1);
    else if (query.limit !== undefined) next = next.limit(query.limit);
    return next;
  }

  async list(query?: RepositoryQuery): Promise<T[]> {
    const { data, error } = await this.applyQuery(supabase.from(this.table).select('*'), query).throwOnError();
    return (data ?? []) as T[];
  }

  async getById(id: string): Promise<T | null> {
    const { data, error } = await supabase.from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data ?? null) as T | null;
  }

  async create(input: Omit<T, 'id'> & Partial<Pick<T, 'id'>>): Promise<T> {
    const { data, error } = await supabase.from(this.table).insert(input as any).select('*').single();
    if (error) throw error;
    return data as T;
  }

  async update(id: string, patch: Partial<T>, expectedVersion?: string): Promise<T> {
    let query = supabase.from(this.table).update(patch as any).eq('id', id);
    if (expectedVersion) query = query.eq('updated_at', expectedVersion);
    const { data, error } = await query.select('*').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('CONCURRENCY_CONFLICT: record changed or was removed before update.');
    return data as T;
  }

  async remove(id: string, expectedVersion?: string): Promise<void> {
    let query = supabase.from(this.table).delete().eq('id', id);
    if (expectedVersion) query = query.eq('updated_at', expectedVersion);
    const { error } = await query;
    if (error) throw error;
  }
}
