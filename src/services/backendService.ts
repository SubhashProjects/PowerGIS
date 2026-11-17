import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../types/auth';

export class BackendConfigurationError extends Error {
  constructor(message = 'Supabase is not configured for this environment.') {
    super(message);
    this.name = 'BackendConfigurationError';
  }
}

export interface AuditEvent {
  action: string;
  module: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export interface BackendResult<T> {
  data: T | null;
  error: Error | null;
}

export const backendService = {
  ensureConfigured(): void {
    if (!isSupabaseConfigured) throw new BackendConfigurationError();
  },

  async getCurrentProfile(): Promise<UserProfile | null> {
    this.ensureConfigured();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      designation: data.designation ?? '',
      phone: data.phone ?? '',
      regionId: data.region_id ?? undefined,
      divisionId: data.division_id ?? undefined,
      subdivisionId: data.subdivision_id ?? undefined,
      sectionId: data.section_id ?? undefined,
      jeJurisdictionId: data.je_jurisdiction_id ?? undefined,
      contractorId: data.contractor_id ?? undefined,
      contractorCompany: data.contractor_company ?? undefined,
      isActive: Boolean(data.is_active),
    };
  },

  async audit(event: AuditEvent): Promise<void> {
    this.ensureConfigured();
    await this.rpc('write_audit_event', {
      p_action: event.action,
      p_module: event.module,
      p_resource_id: event.resourceId ?? null,
      p_details: event.details ?? {},
    });
  },

  async rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
    this.ensureConfigured();
    const { data, error } = await supabase.rpc(name, args ?? {});
    if (error) throw error;
    return data as T;
  },
};
