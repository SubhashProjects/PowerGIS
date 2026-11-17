# PowerGIS V3.4.0 — Operational UX & Architecture

## Completed

- Added reusable ConnectionStatus, CommandPalette, and PageShell components.
- Added global Ctrl+K command palette for module and asset navigation.
- Added online/offline state to the application header.
- Simulator controls are hidden when Supabase is configured; simulator data remains explicitly bounded under `src/simulator`.
- Removed the deprecated `src/services/mockData.ts` compatibility facade.
- Updated service imports to reference the simulator boundary explicitly.
- Preserved the GIS Master Map visual exception.
- Retained stable table sizing and responsive table behavior.
- Standardized the package version at 3.4.0.

## Architecture rules

- `src/commons`: domain/business shared content.
- `src/styles`: application presentation tokens and UI rules.
- `src/components/common`: reusable UI components.
- `src/simulator`: development/test data and simulator-only behavior.
- `src/components/gis` and GIS configuration own the GIS visual system.

## Verification

This source pass does not install npm dependencies. TypeScript/TSX syntax can be checked with an available TypeScript compiler; a full Vite build and browser E2E suite require the project dependency environment.
