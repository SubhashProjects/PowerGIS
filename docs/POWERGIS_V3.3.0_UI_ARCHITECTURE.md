# PowerGIS V3.3.0 — Unified Enterprise UI Architecture

## Completed

- Added shared presentation components under `src/components/common/`.
- Added `PageHeader`, `DataTable`, `EmptyState`, `LoadingState`, and `ErrorState`.
- Added a Common reference page for shared domain content.
- Expanded the Styles page into an interactive design-system reference.
- Added Common and Styles to the Governance & Security navigation for super administrators.
- Added module search and collapsible navigation groups to the desktop/mobile sidebar.
- Restored desktop sidebar collapse/expand control.
- Standardized focus states, touch targets, table rhythm, and responsive table scrolling in the central stylesheet.
- Removed obsolete global typography overrides from the central stylesheet; presentation is now token-driven.
- Replaced header/scope region display dependence on `services/mockData` with `APP_CONFIG.regions`.
- Kept GIS operational symbology isolated from the neutral application design system.
- Updated package version to 3.3.0.

## Architecture rule

`src/styles/` owns presentation. `src/commons/` owns shared domain/business content. GIS colors remain local to GIS modules and configuration.
