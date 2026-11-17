# PowerGIS 3.33–3.42 Completion & Stabilization Programme

## Scope decision

This programme does **not** introduce new product features, modules, dashboards, integrations, or workflows. It consolidates and stabilizes the capabilities already present through 3.32. The 3.33–3.42 labels are internal completion checkpoints represented by one cumulative 3.42.0 source release, not ten separately deployable feature releases.

## Completion work included

- Align the package, lockfile, application identity, and service-worker cache to 3.42.0.
- Add a release-readiness gate for version consistency, PWA asset integrity, backend-secret hygiene, migration/master-SQL parity, and release-boundary documentation.
- Keep all database migrations as the source of truth and regenerate the all-in-one SQL from the migration directory.
- Remove browser-editable Supabase trust roots; backend URL and publishable key are deployment-time configuration only.
- Replace wildcard CORS on privileged Edge Functions with exact `POWERGIS_ALLOWED_ORIGINS` allowlisting, bounded JSON parsing, method checks, and sanitized server errors.
- Fix legacy `SECURITY DEFINER` identity helpers with fixed `search_path` and explicit execution grants.
- Remove the destructive `DROP SCHEMA public CASCADE` reset instruction from the master SQL generator.
- Exclude demo seed data and illustrative user personas from the generated production SQL bundle; `supabase/seed.sql` is explicitly development/staging-only.
- Patch Vite to 6.4.6 and bind the development server to loopback only, mitigating the November 2026 dev-server RCE advisory.
- Retain existing repository/service boundaries and server-side mutation controls; do not add direct database access to UI components.
- Preserve the existing neutral UI conventions and GIS map styling.
- Document what static checks can prove and what still requires an actual Supabase project, gateway, browser/device, or production deployment.

## Validation performed in this source package

- `node scripts/platform_audit.mjs`
- `node scripts/run_static_tests.mjs`
- `node scripts/release_readiness_audit.mjs`
- `node --test tests/production_security_baseline.test.mjs` (5 security baseline tests)
- ZIP integrity verification after packaging

## Checks not claimed

No live Supabase migration, RLS impersonation test, Edge Function deployment, external gateway commissioning, full browser/device test, production load test, backup restore drill, or production security assessment is represented as completed by these source-only checks. Full dependency-backed TypeScript/Vite build also requires installing the locked dependencies (`npm ci`) in the deployment/build environment.

## Deployment sequence

1. Back up the target Supabase project and verify the target environment.
2. Apply migrations in timestamp order. The consolidated SQL contains schema migrations only and is for a fresh, isolated database; it excludes `seed.sql`. Never use schema-drop/reset commands on production.
3. Configure only required server-side secrets in Supabase Edge Function secrets.
4. Set `POWERGIS_ALLOWED_ORIGINS` in Supabase Edge Function secrets to the exact production origins (comma-separated; no wildcard). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time variables; never put service-role or gateway secrets in `VITE_` variables.
5. Run `npm ci`, `npm run test:static`, `npm run test:platform-runtime`, `npm test`, and `npm run build` in CI. Recreate/verify the lockfile integrity metadata with a connected npm registry before release.
6. Validate authentication, jurisdiction-scoped reads, denied cross-jurisdiction writes, offline recovery, and PWA update behavior in a staging environment.
7. Promote only after operational owner acceptance and a tested rollback/restore plan.
