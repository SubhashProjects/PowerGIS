# PowerGIS 3.8.0 — Operational Integrity

PowerGIS 3.8.0 extends the 3.7 operational platform with repository boundaries for PTW, survey and outage reads, a reusable critical-mutation integrity wrapper, server-side idempotency primitives, dependency-aware offline synchronization, and dashboard data-quality visibility.

## Integrity boundaries

- UI code should call domain services rather than Supabase tables.
- Domain services use repository interfaces for data access.
- Critical mutations can use `runCriticalMutation()` to combine idempotency and concurrency error normalization.
- `operation_idempotency` provides a server-side ledger for privileged RPC workflows.
- Offline operations can declare dependency readiness before synchronization.

## Data quality

The operational dashboard now exposes data-quality exceptions for duplicate/missing IDs, invalid transformer geometry/load and invalid inventory quantities. These checks are informational and do not silently modify production records.

## Database

Migration `20261122_operational_integrity.sql` adds the server idempotency ledger and completion/failure helpers. The all-in-one master SQL is regenerated to include every migration in order.

## Verification

`tests/v3_8_operational_integrity.test.mjs` performs static architecture checks. No npm installation is required for the static verification.
