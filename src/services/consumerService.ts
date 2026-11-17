import { createRepository } from '../repositories/repositoryFactory';
import { isSupabaseConfigured } from '../lib/supabase';
import { validateConsumerServiceRequest, type ConsumerServiceRequest } from './platformEvolutionService';

export type NewConsumerServiceRequest = Omit<ConsumerServiceRequest, 'id' | 'request_number' | 'status' | 'created_at'>;
const requests = createRepository<ConsumerServiceRequest>('consumer_service_requests');

export async function listConsumerServiceRequests(limit = 100): Promise<ConsumerServiceRequest[]> {
  if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: consumer service requests require Supabase.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Request list limit must be between 1 and 500.');
  return requests.list({ orderBy: 'created_at', ascending: false, limit });
}

export async function submitConsumerServiceRequest(input: NewConsumerServiceRequest): Promise<ConsumerServiceRequest> {
  if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: consumer service requests require Supabase.');
  const errors = validateConsumerServiceRequest(input);
  if (errors.length) throw new Error(errors.join(' '));
  return requests.create({
    applicant_name: input.applicant_name.trim(),
    contact_phone: input.contact_phone.trim(),
    service_address: input.service_address.trim(),
    category: input.category,
    requested_load_kw: input.requested_load_kw,
    section_id: input.section_id.trim(),
    nearest_pole_id: input.nearest_pole_id?.trim() || null,
    status: 'submitted',
  } as Omit<ConsumerServiceRequest, 'id'>);
}
