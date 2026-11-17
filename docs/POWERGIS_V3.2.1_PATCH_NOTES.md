# PowerGIS V3.2.1 Patch Notes

## Purpose
V3.2.1 is a follow-up production-hardening pass over V3.2. It targets defects found during a second review of the Supabase/RLS boundary, concurrency behavior, contractor offline synchronization, evidence storage, and remaining fabricated operational defaults.

## Implemented

### 1. Concurrency-safe identifiers
- Added dedicated PostgreSQL sequences for work orders, faults, outages, and PTWs.
- Removed `count(*) + 1` identifier generation from the production RPCs.
- Corrected the work-order insert path so an empty `work_orders` table no longer prevents creation.

### 2. Contractor offline synchronization
- IndexedDB queue records now carry an operation ID.
- Contractor PWA registers a real server synchronization handler.
- A failed synchronization remains unsynced.
- Added idempotent `sync_offline_survey_asset` RPC using `operation_id`.
- Existing queued records without an operation ID receive a new ID on synchronization.

### 3. Evidence storage
- Added private `ptw-evidence` and `survey-evidence` buckets.
- Added authenticated storage policies scoped to the uploader's UUID folder.
- Contractor evidence can be uploaded online and retained as base64 data for offline synchronization.
- PTW evidence remains private and is not a public bucket.

### 4. Administrative identity management
- User profile edits now use a server-side Supabase Edge Function.
- Auth email/password changes and profile changes are handled through the privileged server-side workflow rather than direct browser profile mutation.
- User deactivation also bans the corresponding Supabase Auth account.
- Passwords are never written to `user_profiles`.

### 5. Production data loading
- Asset bootstrap now loads operational assets, warranties, and lifecycle records from Supabase once after authenticated application startup.
- Warranty/lifecycle views no longer start with simulated records in clean operational mode.
- Removed several hardcoded feeder/work-order defaults from operational pages.
- Outage section filters now load sections from Supabase in configured environments.

### 6. RLS correction pass
- Corrected remaining invalid references in approval-history, work-order, stores, and warranty policies.
- Jurisdiction is derived through the section/subdivision/division hierarchy where the target table does not carry region/division columns.

## Verification
- Static production-hardening suite: **PASS**.
- The suite now covers concurrency sequence migrations, evidence buckets, offline synchronization, and server-side admin update wiring.
- Full `npm ci`, `tsc --noEmit`, browser E2E, live Supabase RLS/concurrency testing, and real backup/restore drills still require a configured staging environment with dependencies and Supabase credentials.

## Important remaining limitations
V3.2.1 does **not** claim that all advanced modules are fully backend-persistent or production-certified. Capital projects/RDSS, disaster response, preventive maintenance, smart-meter analytics, topology/routing, DT loading, risk calculations, and some GIS/data-import workflows still require deeper backend integration and live validation.
