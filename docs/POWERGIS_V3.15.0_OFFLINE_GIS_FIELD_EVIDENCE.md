# PowerGIS 3.15.0 — Offline GIS & Field Evidence

## Purpose
Extend the 3.13 durable operational queue and 3.14 network intelligence with a separate, device-local GIS workspace. Existing application architecture, role-based navigation, neutral UI conventions and backend repository boundaries are retained.

## Implemented
- Dedicated Offline GIS workspace, visible to operational, contractor and GIS administration roles.
- Import and validate GeoJSON `FeatureCollection` files into IndexedDB as named offline work areas.
- Package metadata includes stable ID, timestamps, feature count and serialized byte size.
- Export an offline area back to GeoJSON; delete an area and its local queued edits.
- Local feature edit queue stores the base version, base feature and proposed feature. Local edits are not represented as server-committed changes.
- Review actions apply a proposed edit to the local package or discard it. The store also exposes a conflict state and conflict marker for a future backend reconciliation workflow.
- Evidence vault splits files into 1 MiB IndexedDB chunks, persists chunk progress, resumes missing chunks when the original file is reselected and matches its checksum, verifies the checksum when restoring, and permits cleanup.
- Offline/online status, responsive workspace, clear local-storage limitations and explicit distinction between local and server state.
- Version metadata, architecture documentation and static regression tests updated to 3.15.0.

## Important boundaries
- This is a local offline data workspace, not a full replicated PostGIS database. GeoJSON areas must be explicitly imported/exported.
- Basemap tiles are not cached. Google, Esri and OpenStreetMap providers have differing licensing, attribution and tile-cache rules; indiscriminate tile caching would be unsafe. The map data itself is portable GeoJSON.
- The edit queue does not automatically write to Supabase. Before authoritative changes, a future server reconciliation API must re-read the current row, compare the captured base version, enforce jurisdiction/RLS and permissions, validate geometry and relationships, and commit with optimistic concurrency/idempotency.
- Chunked evidence is persisted locally and checksummed; this release does not claim resumable server uploads or server-side evidence approval. Browser storage can be cleared or evicted. Export/backup important evidence and retain server backups.
- SHA-256 requires Web Crypto support (normally a secure context such as HTTPS or localhost).
- Offline storage is per browser profile/device and is not shared between users or devices.

## Verification
Run `node tests/v3_15_offline_gis.test.mjs` and the existing static regression tests. No npm install is required for those checks. Full `tsc`/Vite build and live Supabase reconciliation remain unverified because dependencies/backend credentials are not installed/configured in this source-only workflow.
