# PowerGIS 3.17.0 — Asset Lifecycle Management

## Delivered

- Added a dedicated Asset Lifecycle workspace using the existing canonical asset registry and `equipment_lifecycle` table.
- Added lifecycle registration for existing substations, feeders, transformers and poles. Registration never creates a second asset record or changes operational asset status.
- Added condition assessment (0–100), replacement priority, expected-life ageing and expired-life calculation.
- Added append-only assessment history in `equipment_lifecycle_events`.
- Assessment snapshot update and history insert execute atomically through a `SECURITY INVOKER` PostgreSQL function; normal table RLS remains in force.
- Added role-gated navigation and a responsive, neutral UI.
- Kept maintenance work orders, inspections, warranty data and replacement procurement as separate existing workflows; this module does not falsely mark them complete.

## Database deployment

Apply `supabase/migrations/20261117_asset_lifecycle_management.sql` to the target Supabase project before using lifecycle registration, assessment or history. The same migration is appended to `supabase/SUPABASE_ALL_IN_ONE_MASTER.sql`. The migration creates the assessment history table, enables RLS, grants authenticated read/insert access subject to RLS, and installs the atomic assessment RPC.

## Boundaries

- Lifecycle registration currently covers asset classes available in the existing in-memory asset registry: substations, feeders, transformers and poles. Conductors and consumers are not offered because their existing registry/domain mapping does not provide a consistent installation-date and section scope for this workflow.
- QR/barcode generation, physical label printing, mobile scanner integration, commissioning/decommissioning workflows, spare-parts consumption and financial depreciation are not claimed as implemented.
- Condition scores and replacement priorities are planning records; they do not constitute an engineering safety clearance or automatic replacement approval.
- No simulator records are written as operational lifecycle data. A configured Supabase backend is required for writes.

## Verification

Static tests and targeted strict TypeScript checks are run as part of this source update. Full application build, database migration execution against a live project, live RLS verification and field/engineering acceptance require the deployment environment and were not performed here.
