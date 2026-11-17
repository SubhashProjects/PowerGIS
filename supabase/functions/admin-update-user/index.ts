import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { errorResponse, HttpError, json, originAllowed, preflight, readJsonObject } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  if (req.method !== 'POST') return json(req, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!originAllowed(req)) return json(req, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new HttpError(503, 'FUNCTION_NOT_CONFIGURED');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(req, 401, { error: 'AUTHENTICATION_REQUIRED' });
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: authUser }, error: userError } = await caller.auth.getUser();
    if (userError || !authUser) return json(req, 401, { error: 'AUTHENTICATED_CALLER_NOT_FOUND' });

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile, error: callerError } = await admin.from('user_profiles').select('id, role, is_active').eq('auth_user_id', authUser.id).maybeSingle();
    if (callerError) throw callerError;
    if (!callerProfile?.is_active || callerProfile.role !== 'super_admin') throw new HttpError(403, 'SUPER_ADMIN_REQUIRED');

    const body = await readJsonObject(req);
    const userId = String(body.userId || '');
    const action = String(body.action || 'update');
    if (!userId) throw new HttpError(400, 'USER_ID_REQUIRED');

    const { data: targetProfile, error: targetError } = await admin.from('user_profiles').select('*').eq('id', userId).maybeSingle();
    if (targetError) throw targetError;
    if (!targetProfile) throw new HttpError(404, 'USER_NOT_FOUND');
    if (targetProfile.id === callerProfile.id && action === 'deactivate') throw new HttpError(409, 'CANNOT_DEACTIVATE_CURRENT_ADMIN');

    if (action === 'deactivate') {
      const { error: authError } = await admin.auth.admin.updateUserById(targetProfile.auth_user_id, { ban_duration: '876000h' });
      if (authError) throw authError;
      const { error: profileError } = await admin.from('user_profiles').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', userId);
      if (profileError) {
        await admin.auth.admin.updateUserById(targetProfile.auth_user_id, { ban_duration: 'none' });
        throw profileError;
      }
      await admin.from('audit_logs').insert({ actor_id: authUser.id, user_id: callerProfile.id, actor_role: callerProfile.role, action: 'user.deactivate', module: 'admin', resource_id: userId });
      return json(req, 200, { success: true });
    }

    const profileUpdates: Record<string, unknown> = {
      full_name: body.fullName ?? targetProfile.full_name,
      username: body.username ?? targetProfile.username,
      email: body.email ?? targetProfile.email,
      role: body.role ?? targetProfile.role,
      designation: body.designation ?? targetProfile.designation,
      phone: body.phone ?? targetProfile.phone,
      region_id: body.regionId ?? targetProfile.region_id,
      division_id: body.divisionId ?? targetProfile.division_id,
      subdivision_id: body.subdivisionId ?? targetProfile.subdivision_id,
      section_id: body.sectionId ?? targetProfile.section_id,
      je_jurisdiction_id: body.jeJurisdictionId ?? targetProfile.je_jurisdiction_id,
      contractor_company: body.contractorCompany ?? targetProfile.contractor_company,
      is_active: body.isActive ?? targetProfile.is_active,
      updated_at: new Date().toISOString(),
    };

    const nextEmail = String(profileUpdates.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new HttpError(400, 'INVALID_EMAIL');
    if (body.password !== undefined && String(body.password).length < 12) throw new HttpError(400, 'PASSWORD_POLICY_FAILED');

    const authUpdates: Record<string, unknown> = { email: nextEmail, email_confirm: true, user_metadata: { full_name: profileUpdates.full_name, username: profileUpdates.username } };
    if (body.password) authUpdates.password = String(body.password);
    if (profileUpdates.is_active === false) authUpdates.ban_duration = '876000h'; else authUpdates.ban_duration = 'none';

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(targetProfile.auth_user_id, authUpdates);
    if (authUpdateError) throw authUpdateError;
    const { data: updatedProfile, error: profileUpdateError } = await admin.from('user_profiles').update(profileUpdates).eq('id', userId).select('*').single();
    if (profileUpdateError) {
      await admin.auth.admin.updateUserById(targetProfile.auth_user_id, { email: targetProfile.email, user_metadata: { full_name: targetProfile.full_name, username: targetProfile.username }, ban_duration: targetProfile.is_active ? 'none' : '876000h' });
      throw profileUpdateError;
    }

    await admin.from('audit_logs').insert({ actor_id: authUser.id, user_id: callerProfile.id, actor_role: callerProfile.role, action: 'user.update', module: 'admin', resource_id: userId, details: { email: updatedProfile.email, role: updatedProfile.role, is_active: updatedProfile.is_active } });
    return json(req, 200, { profile: updatedProfile });
  } catch (error) {
    return errorResponse(req, error);
  }
});
