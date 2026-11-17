import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { OfficialRole, UserProfile } from '../types/auth';

const mapProfile = (row: any): UserProfile => ({
 id: row.id, username: row.username, email: row.email, fullName: row.full_name,
 role: row.role, designation: row.designation ?? '', phone: row.phone ?? '',
 regionId: row.region_id ?? undefined, divisionId: row.division_id ?? undefined,
 subdivisionId: row.subdivision_id ?? undefined, sectionId: row.section_id ?? undefined,
 jeJurisdictionId: row.je_jurisdiction_id ?? undefined, contractorId: row.contractor_id ?? undefined,
 contractorCompany: row.contractor_company ?? undefined, isActive: Boolean(row.is_active),
});

export class AdminService {
 async listUsers(): Promise<UserProfile[]> {
 if (!isSupabaseConfigured) return [];
 const { data, error } = await supabase.from('user_profiles').select('*').order('full_name');
 if (error) throw error;
 return (data ?? []).map(mapProfile);
 }

 async provisionUser(input: Omit<UserProfile, 'id'> & { password: string }): Promise<UserProfile> {
 if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
 const { data, error } = await supabase.functions.invoke('admin-provision-user', {
 body: {
 email: input.email.trim().toLowerCase(), password: input.password,
 fullName: input.fullName.trim(), username: input.username.trim().toLowerCase(),
 role: input.role, designation: input.designation, phone: input.phone,
 regionId: input.regionId ?? null, divisionId: input.divisionId ?? null,
 subdivisionId: input.subdivisionId ?? null, sectionId: input.sectionId ?? null,
 jeJurisdictionId: input.jeJurisdictionId ?? null, contractorCompany: input.contractorCompany ?? null,
 isActive: input.isActive,
 },
 });
 if (error) throw error;
 if (!data?.profile) throw new Error('Provisioning service returned no profile.');
 return mapProfile(data.profile);
 }

 async updateUser(id: string, updates: Partial<UserProfile> & { password?: string }): Promise<UserProfile> {
 if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
 const { password, ...profileUpdates } = updates;
 const { data, error } = await supabase.functions.invoke('admin-update-user', {
 body: {
 action: 'update', userId: id, password,
 fullName: profileUpdates.fullName, username: profileUpdates.username, email: profileUpdates.email,
 role: profileUpdates.role, designation: profileUpdates.designation, phone: profileUpdates.phone,
 regionId: profileUpdates.regionId, divisionId: profileUpdates.divisionId, subdivisionId: profileUpdates.subdivisionId,
 sectionId: profileUpdates.sectionId, jeJurisdictionId: profileUpdates.jeJurisdictionId,
 contractorCompany: profileUpdates.contractorCompany, isActive: profileUpdates.isActive,
 },
 });
 if (error) throw error;
 if (!data?.profile) throw new Error('User administration service returned no profile.');
 return mapProfile(data.profile);
 }

 async deactivateUser(id: string): Promise<void> {
 if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
 const { data, error } = await supabase.functions.invoke('admin-update-user', { body: { action: 'deactivate', userId: id } });
 if (error) throw error;
 if (!data?.success) throw new Error('User deactivation was not confirmed by the administration service.');
 }
}

export const adminService = new AdminService();
