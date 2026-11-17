export interface RepositoryQuery {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
}

export interface RepositoryResult<T> {
  data: T | null;
  error: Error | null;
}

export interface EntityRepository<T extends { id: string }> {
  list(query?: RepositoryQuery): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(input: Omit<T, 'id'> & Partial<Pick<T, 'id'>>): Promise<T>;
  update(id: string, patch: Partial<T>, expectedVersion?: string): Promise<T>;
  remove(id: string, expectedVersion?: string): Promise<void>;
}
