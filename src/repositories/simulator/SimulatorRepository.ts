import type { EntityRepository, RepositoryQuery } from '../interfaces/Repository';

export class SimulatorRepository<T extends { id: string }> implements EntityRepository<T> {
  private records: T[];
  constructor(initial: T[]) { this.records = [...initial]; }

  async list(query: RepositoryQuery = {}): Promise<T[]> {
    let result = [...this.records];
    if (query.filters) result = result.filter(record => Object.entries(query.filters!).every(([k,v]) => (record as any)[k] === v));
    if (query.orderBy) result.sort((a,b) => String((a as any)[query.orderBy!]).localeCompare(String((b as any)[query.orderBy!])) * (query.ascending === false ? -1 : 1));
    if (query.offset !== undefined) result = result.slice(query.offset);
    if (query.limit !== undefined) result = result.slice(0, query.limit);
    return result;
  }

  async getById(id: string): Promise<T | null> { return this.records.find(r => r.id === id) ?? null; }
  async create(input: Omit<T,'id'> & Partial<Pick<T,'id'>>): Promise<T> { const item = { ...input, id: input.id ?? crypto.randomUUID() } as T; this.records.push(item); return item; }
  async update(id: string, patch: Partial<T>, expectedVersion?: string): Promise<T> { const i=this.records.findIndex(r=>r.id===id); if(i<0) throw new Error('Record not found.'); const current:any=this.records[i]; if(expectedVersion && current.updated_at && current.updated_at !== expectedVersion) throw new Error('CONCURRENCY_CONFLICT: record changed or was removed before update.'); this.records[i]={...current,...patch} as T; return this.records[i]; }
  async remove(id: string): Promise<void> { this.records=this.records.filter(r=>r.id!==id); }
}
