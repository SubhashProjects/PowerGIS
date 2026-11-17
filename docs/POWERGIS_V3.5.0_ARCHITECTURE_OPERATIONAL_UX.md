# PowerGIS 3.5.0 — Architecture & Operational UX

## Implemented
- Central simulator adapter boundary at `src/data/simulatorData.ts`.
- Production-configured environments cannot activate simulator mode through persisted browser state or runtime toggles.
- Global operational search now covers assets, faults, work orders, PTWs, outages, surveys, stores, projects, maintenance and disaster records, in addition to navigation modules.
- Responsive `DataTable` supports mobile record cards while preserving stable desktop table dimensions.
- Connection indicator distinguishes browser offline state from an unavailable backend health endpoint without falsely claiming a backend outage.
- Static architecture checks cover simulator import boundaries, versioning, responsive table support and forbidden global monochrome mechanisms.

## Source-of-truth rule
Supabase remains authoritative when configured. Simulator data is an explicit test/demo adapter and is not persisted as production operational data.

## GIS styling boundary
The Master Map retains its own GIS visualization colors. No global grayscale/filter is used to neutralize the application UI.

## Verification
No npm install was performed. Static source/architecture checks are intended to run in the project environment with dependencies available.
