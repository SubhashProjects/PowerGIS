# PowerGIS 3.6.0 — Platform Foundation

## Implemented
- Repository boundary: UI/services can use repository interfaces with Supabase and simulator implementations selected by environment.
- Supabase table repository with optimistic `updated_at` conflict detection.
- Idempotency utility for critical client workflows using stable operation IDs.
- Global error boundary to fail safely instead of leaving broken screens.
- Breadcrumb navigation for every application module.
- Offline Sync Center showing pending/failed/syncing operations and allowing manual retry.
- Offline queue now records retry count, last attempt and last error.
- Capability registry separates role identity from action-level authorization decisions.
- Reusable RecordPage for Summary, Related records and Activity sections.
- Static operational counts removed from regional configuration; operational counts must come from the backend or simulator repository.
- Version raised to 3.6.0.

## Boundary
`UI -> Service -> Repository interface -> Supabase / Simulator`

The GIS Master Map and its map-source colors are intentionally untouched. No global grayscale/filter mechanism is introduced.

## Verification
- Source files are syntactically inspected without installing npm dependencies.
- Package/version consistency checked statically.
- Repository files and architecture documentation are included for the next migration of individual domain services.
