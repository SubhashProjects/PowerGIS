# PowerGIS RLS & Security — V3.2

## Enforcement
Authorization is enforced in Supabase using authenticated identity, active profile, role and jurisdiction. Frontend navigation does not grant permissions.

## Hardened areas
- Survey approval functions derive actor identity from `auth.uid()`.
- PTW transitions derive actor identity/role from the authenticated profile.
- Inventory issues use row locking and reject insufficient stock.
- Work-order transitions are state-machine controlled.
- Fault creation validates section/feeder scope and rejects nearby duplicate active faults.
- SCADA telemetry insertion separates `OPERATIONAL` and `SIMULATOR` source types.
- Audit logs are append-only through a database trigger.

## Critical safety boundary
No migration enables actual breaker/switch operation. Existing SCADA command infrastructure remains a non-operational boundary until an independently secured gateway, interlocks, engineering authorization and end-to-end safety validation exist.

## Remaining deployment verification
Run authenticated cross-jurisdiction tests against a real staging Supabase project before production release. Static source checks alone cannot prove live RLS behavior.
