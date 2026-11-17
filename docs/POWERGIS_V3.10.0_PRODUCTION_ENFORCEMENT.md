# PowerGIS 3.10.0 — Production Enforcement

## Implemented

- Persistent user notification repository and Notification Center.
- Production notification table with RLS and least-privilege notification RPC.
- Generic offline mutation queue with retry, dependency blocking, sync state, and recovery controls.
- Explicit work-order workflow transition enforcement before transactional RPC execution.
- Repository migration for the outage section lookup and inventory work-order lookup.
- Audit correlation field for critical operation IDs.
- Architecture regression test that rejects direct Supabase table/RPC access from UI components.
- Transactional RPC grants are re-asserted in the production enforcement migration.
- Version 3.10.0 and regenerated all-in-one SQL master.

## Operational rule

The Master Map remains the only UI surface whose GIS layer colors are preserved. No global grayscale or color filter is introduced.

## Verification

Run the static 3.10 test without installing dependencies:

`node tests/v3_10_production_enforcement.test.mjs`
