# PowerGIS 3.7.0 — Operational Platform

PowerGIS 3.7.0 advances the 3.6 platform foundation into operational architecture.

## Implemented
- Domain repository adapters for assets, work orders, faults, stores and audit logs.
- Work-order and stores read paths routed through repository boundaries.
- Live operational dashboard summary sourced from Supabase when configured.
- Record detail activity timeline backed by immutable audit logs.
- Offline queue retry/remove controls and synchronization metadata foundation.
- Static architecture enforcement for repository routing, dashboard integration and monochrome protection.

## Source-of-truth rule
Supabase remains the production source of truth. Simulator data remains explicitly isolated to simulator mode. The GIS Master Map's native GIS colors are untouched.

## Remaining integration work
The next iteration can migrate every remaining domain service to specialized repositories and add backend-backed PTW, survey and outage counts to the live operational summary.
