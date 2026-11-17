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
    if (userError || !authUser) throw new HttpError(401, 'AUTHENTICATED_CALLER_NOT_FOUND');

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile, error: profileError } = await admin.from('user_profiles').select('id, role, is_active').eq('auth_user_id', authUser.id).maybeSingle();
    if (profileError) throw profileError;
    if (!callerProfile?.is_active || callerProfile.role !== 'super_admin') throw new HttpError(403, 'SUPER_ADMIN_REQUIRED');

    const body = await readJsonObject(req);
    const required = ['email','password','fullName','username','role'];
    for (const key of required) if (!body[key]) throw new HttpError(400, 'REQUIRED_FIELD_MISSING');
    if (String(body.password).length < 12) throw new HttpError(400, 'PASSWORD_POLICY_FAILED');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) throw new HttpError(400, 'INVALID_EMAIL');

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: String(body.email).trim().toLowerCase(), password: String(body.password), email_confirm: true,
      user_metadata: { full_name: body.fullName, username: body.username },
    });
    if (createError || !created.user) throw createError ?? new Error('Auth user creation failed.');

    const { data: profile, error: insertError } = await admin.from('user_profiles').insert({
      auth_user_id: created.user.id, username: body.username, email: body.email,
      full_name: body.fullName, role: body.role, designation: body.designation ?? null, phone: body.phone ?? null,
      region_id: body.regionId ?? null, division_id: body.divisionId ?? null, subdivision_id: body.subdivisionId ?? null,
      section_id: body.sectionId ?? null, je_jurisdiction_id: body.jeJurisdictionId ?? null,
      contractor_company: body.contractorCompany ?? null, is_active: body.isActive !== false,
    }).select('*').single();
    if (insertError || !profile) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw insertError ?? new Error('Profile creation failed; auth account rolled back.');
    }

    await admin.from('audit_logs').insert({ actor_id: authUser.id, user_id: callerProfile.id, actor_role: callerProfile.role, action: 'user.provision', module: 'admin', resource_id: profile.id, details: { email: profile.email, role: profile.role } });
    return json(req, 200, { profile });
  } catch (error) {
    return errorResponse(req, error);
  }
});
