# PowerGIS V3.2 Production Hardening Patch Notes

This patch continues the existing V3.1 security/safety correction rather than replacing the application.

## Implemented
- Removed production browser-local user profile persistence from `AuthService`.
- Added trusted Supabase Edge Function path for administrator user provisioning.
- Added secure administrator profile update/deactivation RPCs.
- Added Supabase-backed asset hydration.
- Added persistent fault creation/status transition RPCs.
- Added persistent work-order creation/status transition RPCs.
- Added atomic inventory issue and transaction RPCs with row locking.
- Added IndexedDB offline survey queue with server-confirmed sync semantics.
- Added Supabase survey submission and secure JE/AE/rejection RPC paths.
- Added manual-vs-GPS survey location provenance.
- Added real evidence file capture path in Contractor PWA.
- Added PTW backend state machine and immutable safety event records.
- Added explicit PTW evidence requirements for safety-critical stages.
- Added SCADA source separation and alarm persistence schema/RLS.
- Corrected invalid earlier RLS references in the SCADA hardening migration.
- Removed fake browser backup/restore success messaging.
- Removed fixed fault coordinates and fixed affected-consumer defaults.
- Removed fixed outage reporting year and fixed outage seed values from the production path.
- Added automated static production-hardening checks and expanded documentation.

## Not claimed complete
Live SCADA protocol connectivity, physical switching, real database backup/restore drills, live RLS/concurrency testing, and several advanced business modules still require a deployed staging Supabase environment and external integrations.
