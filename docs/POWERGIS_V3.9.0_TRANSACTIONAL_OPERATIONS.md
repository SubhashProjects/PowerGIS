# PowerGIS 3.9.0 — Transactional Operations & Production Integrity

PowerGIS 3.9.0 moves critical write operations from client-side retry protection to database-transactional idempotency.

## Critical mutations covered

- Work order creation
- Work order status transitions
- Inventory issue
- Inventory transactions
- PTW creation
- PTW safety-stage transitions

Each command receives a client-generated operation ID. The server idempotency ledger and the business mutation execute inside the same PostgreSQL transaction. A network timeout followed by a retry therefore returns the original result instead of creating a second mutation.

## Concurrency

Work-order transitions can optionally carry the record `updated_at` version. The server rejects a stale transition with `CONCURRENCY_CONFLICT` rather than silently overwriting a newer change.

## Data Quality Center

A new Data Quality Center validates IDs, relationships, transformer loading/geometry, inventory bounds, and workflow statuses. The operational dashboard now reports actual failed offline synchronizations.

## Architecture

Critical UI/service mutations use `src/lib/mutationCommand.ts`. UI code continues to use domain services/repositories rather than direct table access.

## Database deployment

Run the generated `supabase/SUPABASE_ALL_IN_ONE_MASTER.sql` after applying the migration set. The new migration is `20261123_transactional_mutation_wrappers.sql`.

## Verification

No npm installation is required for the release static checks. The release tests validate the transactional wrappers, command layer, Data Quality Center, versioning and previous architecture gates.
