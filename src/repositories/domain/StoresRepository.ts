import type { StoresItem } from '../../types/operations';
import { createRepository } from '../repositoryFactory';
export const storesRepository = createRepository<StoresItem>('stores_inventory');
