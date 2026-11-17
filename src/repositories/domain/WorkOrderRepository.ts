import type { WorkOrder } from '../../types/operations';
import { createRepository } from '../repositoryFactory';
export const workOrderRepository = createRepository<WorkOrder>('work_orders');
