# PowerGIS Deployment — V3.2

## Environments
Development → staging/testing → production.

## Frontend variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only public Supabase client credentials belong in the frontend environment.

## Trusted server secrets
The Supabase service-role key belongs only in Edge Functions/server-side infrastructure.

## Deployment sequence
1. Apply migrations to staging.
2. Run RLS/security tests using real test accounts.
3. Configure Storage buckets and policies.
4. Deploy Edge Functions.
5. Build frontend.
6. Run smoke/regression tests.
7. Verify monitoring and backup status.
8. Promote to production.

Do not enable remote switching commands as part of this deployment.
