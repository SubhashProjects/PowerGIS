import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('browser Supabase trust roots are build-time only', () => {
  const client = read('src/lib/supabase.ts');
  const login = read('src/components/auth/LoginPage.tsx');
  const runtime = read('src/config/runtimeConfig.ts');
  assert.match(runtime, /environment\.VITE_SUPABASE_URL/);
  assert.match(runtime, /environment\.VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(runtime + client, /localStorage|sessionStorage/);
  assert.match(client, /https:\/\/powergis-not-configured\.invalid/);
  assert.doesNotMatch(login, /saveSupabaseConfig|clearSupabaseConfig|Supabase Anon Key/);
});

test('privileged Edge Functions enforce origin allowlists and bounded JSON', () => {
  const shared = read('supabase/functions/_shared/http.ts');
  assert.match(shared, /POWERGIS_ALLOWED_ORIGINS/);
  assert.match(shared, /configuredOrigins\.includes\(origin\)/);
  assert.match(shared, /PAYLOAD_TOO_LARGE/);
  assert.match(shared, /INTERNAL_SERVER_ERROR/);
  for (const name of ['admin-provision-user', 'admin-update-user']) {
    const source = read(`supabase/functions/${name}/index.ts`);
    assert.match(source, /originAllowed\(req\)/);
    assert.match(source, /req\.method !== 'POST'/);
    assert.match(source, /readJsonObject\(req\)/);
    assert.doesNotMatch(source, /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/);
  }
});

test('legacy SECURITY DEFINER helpers have fixed search paths and restricted execution', () => {
  const migration = read('supabase/migrations/20261128_security_definer_search_path.sql');
  for (const fn of ['current_user_profile', 'current_user_role', 'is_super_admin']) {
    assert.match(migration, new RegExp(`ALTER FUNCTION public\\.${fn}\\(\\)[\\s\\S]*?SET search_path`));
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(\\) FROM PUBLIC, anon`));
  }
});

test('consolidated SQL builder does not recommend destructive schema reset', () => {
  const builder = read('scripts/build_all_in_one_sql.js');
  const master = read('supabase/SUPABASE_ALL_IN_ONE_MASTER.sql');
  assert.doesNotMatch(builder, /DROP SCHEMA public CASCADE/);
  assert.doesNotMatch(master, /DROP SCHEMA public CASCADE/);
  assert.match(master, /20261128_security_definer_search_path\.sql/);
  assert.doesNotMatch(builder, /supabase\/seed\.sql/);
  assert.doesNotMatch(master, /superadmin@powergis\.internal/);
});


test('Vite dev server is patched and loopback-only', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const vite = lock.packages['node_modules/vite'];
  assert.equal(pkg.devDependencies.vite, '6.4.6');
  assert.equal(vite.version, '6.4.6');
  assert.match(read('vite.config.ts'), /host: '127\.0\.0\.1'/);
  assert.match(read('vite.config.ts'), /strictPort: true/);
});
