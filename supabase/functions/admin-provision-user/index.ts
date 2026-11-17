import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Required Supabase Edge Function secrets are not configured.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: authUser }, error: userError } = await caller.auth.getUser();
    if (userError || !authUser) throw new Error('Authenticated caller not found.');

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile, error: profileError } = await admin.from('user_profiles').select('id, role, is_active').eq('auth_user_id', authUser.id).maybeSingle();
    if (profileError) throw profileError;
    if (!callerProfile?.is_active || callerProfile.role !== 'super_admin') throw new Error('Super Administrator authorization required.');

    const body = await req.json();
    const required = ['email','password','fullName','username','role'];
    for (const key of required) if (!body[key]) throw new Error(`${key} is required.`);
    if (String(body.password).length < 12) throw new Error('Password must be at least 12 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) throw new Error('Invalid email address.');

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
    return new Response(JSON.stringify({ profile }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Provisioning failed.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
