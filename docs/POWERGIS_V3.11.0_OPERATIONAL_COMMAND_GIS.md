# PowerGIS 3.11.0 – Operational Command & GIS Integration

## Delivered

- Replaced the small GIS asset flyout with a universal operational record drawer.
- The drawer identifies network asset types, displays scalar record attributes and geographic/jurisdiction context, and provides navigation to the relevant operational modules.
- Related counts are resolved through the domain repositories for faults, work orders, outages and safety permits, and through the asset service for network relationships.
- Operational summary exception cards are now actionable navigation targets, including critical assets, data quality, pending PTWs, pending surveys and active outages.
- Data Quality checks now include duplicate business codes, missing business references, invalid coordinate ranges, feeder/substation relationships, transformer/feeder relationships, pole/feeder/transformer relationships, consumer asset relationships and negative sanctioned loads/capacities.
- Added database-triggered persistent notifications for inserts and status changes on faults, work orders, outages and safety permits. Recipient resolution prefers the assigned user profile and falls back to the authenticated actor.
- Preserved the GIS Master Map's layer-specific symbology; no global grayscale filter or forced monochrome map styling was introduced.

## Database migration

Apply `supabase/migrations/20261125_operational_event_notifications.sql` to an existing 3.10 database. The all-in-one SQL file is regenerated to include this migration.

## Important boundaries

- Related counts represent records visible through the current user's repository/RLS scope; zero does not establish that no record exists outside that scope.
- Notifications are persisted within the same database transaction as the source event. Failed inserts/updates therefore do not emit a notification.
- The event notification trigger does not claim physical SCADA telemetry or control.
- GIS record detail is read/navigation functionality; editing remains within the existing domain modules and their authorization/workflow rules.

## Validation

Run `node tests/v3_11_operational_command_gis.test.mjs` for the source-level release checks. No dependency installation is required for this test. Runtime build and live Supabase migration execution were not performed in this environment.
