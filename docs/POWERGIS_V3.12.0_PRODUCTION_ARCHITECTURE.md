# PowerGIS 3.12.0 – Production Architecture & Operational Reliability

## Implemented

- Production repository selection now fails closed when Supabase is not configured; simulator repositories are available only in Vite development builds.
- Asset catalogue database reads are isolated in `AssetCatalogRepository`; `AssetService` retains domain mapping and jurisdiction behaviour.
- Fault command database access is isolated in the domain repository. The old service import remains as a compatibility re-export.
- Admin profile reads and Auth edge-function calls, specialized-module reads, SCADA simulation persistence, and survey-evidence storage are isolated behind domain repositories. Table/RPC calls are no longer issued directly by feature services; `backendService` remains the centralized RPC/auth-profile boundary.
- Fault creation, fault transitions and outage creation now use server-side idempotent RPC wrappers.
- Fault transitions accept an expected `updated_at` version and reject stale updates on the server.
- Idempotency ledger acquisition is actor- and operation-type-bound and serializes concurrent retries.
- Fault/outage audit events receive their operation id for cross-layer traceability.
- Offline replay handlers are registered for server-idempotent work-order, fault, PTW, inventory and outage operations. Non-idempotent operations are intentionally not replayed.
- Offline processor now prevents overlapping replay batches.
- Generic repository deletion detects optimistic-concurrency conflicts when an expected version is supplied.

## Database migration

Apply `supabase/migrations/20261126_idempotent_fault_outage_operations.sql` after the existing 3.11 migrations. Regenerate or use the updated all-in-one SQL file for consolidated deployment.

## Deployment requirements and limitations

- Production builds without Supabase configuration now fail closed for repository-backed data instead of silently switching to simulator repositories.
- Simulator mode is restricted to development builds.
- Offline queue storage remains the existing localStorage-backed generic queue in this release; survey attachments/records continue using their separate IndexedDB queue. The generic queue has safe idempotent replay handlers, but a full async IndexedDB queue migration remains a separate compatibility change.
- Live database migration execution, RLS integration tests and full TypeScript build require a configured Supabase project and installed project dependencies; they were not run as part of this source-only package.
