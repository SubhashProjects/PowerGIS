# POWERGIS ENTERPRISE — PROJECT MEMORY & KNOWLEDGE BASE
> **Document Purpose**: Complete architectural map, file lookup index, and "Change Once, Reflect Everywhere" single-source-of-truth reference for Antigravity agentic workflows.
> **Last Updated**: 2026-11-08  
> **Target Version**: 2.0.0-PROD  
> **Live Production URL**: [`https://subhashprojects.github.io/PowerGIS/`](https://subhashprojects.github.io/PowerGIS/)  
> **Source Repositories**:
> - Primary: `https://github.com/SubhashProjects/PowerGIS.git`
> - Mirror: `https://github.com/sv007git/PowerGIS.git`

---

## 1. "CHANGE ONCE, REFLECT EVERYWHERE" ROUTING TABLE (SSOT)

Never edit scattered files or hardcode values directly in components. Use this master lookup table:

| What do you want to change? | Single Source of Truth File | Where it automatically reflects |
|---|---|---|
| **Theme Colors & Gradients** | [`src/config/themeConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/themeConfig.ts) | Header, Sidebar, Dashboard, KPI cards, Status pills, Priority badges |
| **Basemap Engines & Defaults** | [`src/config/basemapConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/basemapConfig.ts) | Master Map, Basemap Switcher dropdown, GIS Context, Initial render |
| **Roles, Rights & Scope HUD** | [`src/config/rbacConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/rbacConfig.ts) | Scope HUD Banner, Role Dashboard, Permission checklist, Zero-Trust RLS, Admin User Management |
| **Navigation Menu & Tabs** | [`src/config/navigationConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/navigationConfig.ts) | Desktop Sidebar, Mobile Drawer, Mobile Bottom Nav, Router switching, Module role gating |
| **Ticket Stages & SLA Hours** | [`src/config/workflowConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/workflowConfig.ts) | Fault List stepper, SLA countdown watcher, Work Order Kanban columns |
| **Enclave Coordinates & Zoom** | [`src/config/appConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/appConfig.ts) | Enclave Quick-Fly switcher, Leaflet center bounds, Initial coordinates |
| **Substations, Feeders & DTR Seed** | [`src/services/mockData.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/services/mockData.ts) | Asset Register, GIS overlays, Network topology, SCADA points |
| **Geodesic & Proximity Math** | [`src/lib/geoUtils.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/lib/geoUtils.ts) | Fault nearest-pole distance, feeder projection, map rotation geometry |
| **User Management & RBAC CRUD** | [`src/services/authService.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/services/authService.ts) | Admin Control Panel user table, Add/Edit/Delete modals, Testing persona switch |
| **All UI Text Labels & Localization** | [`src/config/labelsConfig.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/src/config/labelsConfig.ts) | Common, Header, Scope HUD, Zero-Trust Gate, Navigation, Dashboard, Admin, GIS Map, Assets, Faults |

---

## 2. MODULAR PROJECT STRUCTURE & DIRECTORY TREE

```
PowerGISWeb/
├── .github/workflows/deploy.yml       # Automated GitHub Pages CI/CD on push to master
├── PROJECT_MEMORY.json                # Machine-parsable JSON directory dictionary
├── PROJECT_MEMORY.md                  # This authoritative memory document
├── index.html                         # Application entrypoint (points to /src/main.tsx)
├── package.json                       # Dependencies & build scripts
├── vite.config.ts                     # Vite bundler configuration (base: './')
├── tests/
│   └── security_and_functional.test.ts # 86 automated security, RBAC, labels & functional tests
└── src/
    ├── main.tsx                       # React DOM root render
    ├── App.tsx                        # Core shell, tab router, and modal coordinator
    ├── index.css                      # Tailwind base & Leaflet high-contrast rules
    ├── config/                        # SINGLE SOURCE OF TRUTH (SSOT)
    │   ├── labelsConfig.ts            # Central dictionary of all UI text labels across the application
    │   ├── appConfig.ts               # Identity, enclaves, coordinates, timing intervals
    │   ├── themeConfig.ts             # Palette tokens, gradients, status & priority styling
    │   ├── basemapConfig.ts           # 8 Color Basemaps, Google Roadmap default, category badges
    │   ├── rbacConfig.ts              # 16 roles registry, hierarchy tiers, permissions, privilege tags
    │   ├── workflowConfig.ts          # 8-stage fault progression, SLA hours, 5 Kanban columns
    │   ├── navigationConfig.ts        # 22 navigation tabs, icon components, role access arrays
    │   └── index.ts                   # Central configuration barrel export
    ├── context/                       # REACT STATE PROVIDERS
    │   ├── AuthContext.tsx            # Zero-trust session state, active user, persona switcher
    │   └── GISContext.tsx             # Map state, basemap, layers, measurement, rotation (0-360°)
    ├── services/                      # DOMAIN LOGIC ENGINES
    │   ├── gisService.ts              # GIS service adapter consuming config/basemapConfig
    │   ├── authService.ts             # Authentication, credential validation, RBAC checks
    │   ├── faultService.ts            # 8-stage ticket management, status transitions, dispatch
    │   ├── scadaService.ts            # IEC-104 telemetry simulator & SBO remote breaker control
    │   ├── surveyService.ts           # Contractor staging sandbox & multi-tier approval queue
    │   ├── assetService.ts            # Electrical asset search & spatial linking
    │   ├── notificationService.ts     # Role-based dashboard metrics, tasks & notification feed
    │   ├── reliabilityService.ts      # IEEE 1366 reliability indices (SAIFI, SAIDI, CAIDI, ENS)
    │   ├── riskService.ts             # ISO 55000 asset risk scoring (PoF × CoF matrix)
    │   ├── dataExchangeService.ts     # GeoJSON, CSV & Shapefile import/export engine
    │   └── mockData.ts                # Real-world Puducherry grid seed dataset
    ├── lib/                           # MATHEMATICAL & SPATIAL HELPERS
    │   ├── geoUtils.ts                # Haversine distance, line projection, screen-to-layer rotation
    │   ├── offlineQueue.ts            # IndexedDB / localStorage offline survey queue
    │   └── supabase.ts                # Supabase PostgreSQL / PostGIS 3.4 client
    ├── types/                         # DOMAIN TYPESCRIPT INTERFACES
    │   ├── assets.ts                  # Substation, Feeder, Transformer, Pole, Meter models
    │   ├── auth.ts                    # UserProfile, OfficialRole, Region, Division models
    │   ├── gis.ts                     # BasemapConfig, GISLayerState, MapMeasurement
    │   └── operations.ts              # Fault, WorkOrder, ScadaTelemetryPoint, ScadaAlarm
    └── components/                    # FEATURE UI PRESENTATION MODULES
        ├── gis/                       # Map components
        │   ├── MasterMap.tsx          # Leaflet map container with 360° rotation support
        │   ├── BasemapSwitcher.tsx    # Multi-vendor color basemap switcher (Google default)
        │   ├── LayerTree.tsx          # Floating overlay manager (Substations, DTRs, Feeders)
        │   ├── MapRotationControl.tsx # Compass needle dial, angle slider (0-359°), North reset
        │   ├── MeasureTool.tsx        # Point-to-point distance and polygon area calculator
        │   └── MapAttributeDrawer.tsx # Bottom synchronized attribute drawer with 2-way flyTo
        ├── layout/                    # Shell components
        │   ├── Header.tsx             # Operational clock, search, enclave switcher, user badge
        │   ├── Sidebar.tsx            # Desktop navigation sidebar with vibrant color accents
        │   ├── ScopeBanner.tsx        # Sticky HUD showing Active Identity, Scope & Privileges
        │   └── MobileBottomNav.tsx    # Touch-friendly bottom bar for mobile screens
        ├── dashboard/                 # Analytics components
        │   ├── RoleBasedDashboard.tsx # Persona-scoped dashboard with tasks & notifications
        │   └── DashboardAnalyticsCharts.tsx # Recharts load curve, donut, and reliability bars
        ├── faults/                    # Breakdown ticketing
        │   └── FaultList.tsx          # 8-stage fault lifecycle, SLA countdown & proximity geodesics
        ├── workOrders/                # Task Kanban
        │   └── WorkOrderKanban.tsx    # 5-column maintenance Kanban with crew dispatch
        ├── scada/                     # Remote telemetry
        │   └── ScadaTelemetryDashboard.tsx # IEC-104 SLD with SBO remote breaker control
        ├── projects/                  # Capital schemes
        │   └── CapitalProjectsRDSS.tsx # RDSS capital works tracker (Physical % vs Financial ₹ Cr)
        ├── surveys/                   # Field data collection
        │   ├── ContractorPWA.tsx      # GPS mobile survey tool for field crews
        │   └── SurveyApprovalQueue.tsx # Multi-tier verification queue (JE check -> AE approval)
        └── [other domains]/           # Safety PTW, Smart Meters, Topology, Risk, Warranties...
```

---

## 3. STRICT CODING STANDARDS

1. **Pure White Theme Default**:
   - Canvas background: `#F8FAFC` (Slate 50)
   - Cards & surfaces: `#FFFFFF` (Pure White) with `border border-slate-200`
   - Primary text: `#0F172A` (Slate 900), Secondary text: `#64748B` (Slate 500)
2. **Vibrant Color Theme Accents**:
   - Electric Blue (`#2563EB`, `from-blue-600 to-indigo-600`) for primary buttons and active indicators.
   - Emerald Green (`#10B981`) for energized status, approvals, and verified states.
   - Amber Gold (`#F59E0B`) for warnings, high loads, and pending requisitions.
   - Signal Red / Rose (`#EF4444`) for critical breakdowns, tripped breakers, and emergency alarms.
   - Cyan (`#06B6D4`) for SCADA telemetry and secondary feeder lines.
   - Violet / Purple (`#8B5CF6`) for JE verification, high-voltage poles, and audit records.
3. **TypeScript Integrity**:
   - Zero `any` casts for domain entities. Use interfaces in `src/types/`.
   - Maintain strict null checks.
4. **Single Source of Truth**:
   - NEVER hardcode lists of roles, basemaps, or navigation tabs in individual components.
   - Always import from `src/config/`.

---

## 4. TEST SUITE & VERIFICATION PROTOCOL

The test suite is located at [`tests/security_and_functional.test.ts`](file:///c:/Users/HARISH%20VYAS/Project/PowerGISWeb/tests/security_and_functional.test.ts).

Run tests:
```bash
npx tsx tests/security_and_functional.test.ts
```
Expected output: **69 PASSED, 0 FAILED** across 10 functional groups:
1. Role Permissions & Authorization (9 tests)
2. Strict Jurisdiction Segregation (6 tests)
3. Multi-Tier Survey Staging & Approval Workflow (8 tests)
4. Fault Distance & Network Proximity Engine (4 tests)
5. IEEE 1366 Reliability Indices (4 tests)
6. ISO 55000 Asset Risk Scoring (3 tests)
7. Authentication & Test Credentials (7 tests)
8. Role-Based Dashboard & Notification Scoping (10 tests)
9. Map Rotation, Bearing & Inverse Angle Geometry (11 tests)
10. Data Exchange, GeoJSON & CSV Import/Export (7 tests)

---

## 5. BUILD & DEPLOYMENT RUNBOOK

```bash
# 1. Run automated test suite
npx tsx tests/security_and_functional.test.ts

# 2. Compile production bundle directly from src/main.tsx
npm run build

# 3. Mirror compiled assets to docs/ for GitHub Pages
Copy-Item -Path "dist/assets/*" -Destination "docs/assets/" -Recurse -Force
Copy-Item -Path "dist/index.html" -Destination "docs/index.html" -Force
Copy-Item -Path "dist/assets/*" -Destination "assets/" -Recurse -Force

# 4. Commit and push
git add -A
git commit -m "feat: your descriptive message"
git push subhash master
git push subhash master:gh-pages --force
git push origin master:web-platform
git push origin master:master
```

## PowerGIS 3.12.0 – Production Architecture & Operational Reliability

- Production repository selection fails closed when Supabase is not configured; simulator repository mode is development-only.
- Demo authentication/persona switching and local demo-user administration are blocked outside development builds.
- Scope banner reports the active data source and no longer labels RLS as active merely from frontend state.
- Asset catalogue, fault commands, admin profile/edge-function operations, specialized-module reads, SCADA persistence, and survey evidence storage use domain repository boundaries.
- Added transactional idempotent wrappers for fault creation, fault transitions, and outage creation; fault transitions support an `updated_at` concurrency token.
- Corrected idempotency ledger ownership to use the PowerGIS profile ID referenced by the ledger foreign key, and bound operation IDs to actor and operation type.
- Added fault `updated_at` tracking and audit-log operation correlation for fault/outage commands.
- Registered allowlisted offline replay handlers for idempotent work-order, fault, outage, PTW and inventory operations; overlapping processor runs are prevented.
- Generic repository deletes now detect stale expected-version conflicts.
- Validation: release static test passed; TypeScript/TSX syntax transpilation passed for 143 source files; relative import check passed for 143 files; ZIP integrity verified after packaging. Full `tsc` and live Supabase migration execution were not completed because project dependencies/backend were not installed/configured.


## PowerGIS 3.13.0 – Complete Offline-First Operations

- Replaced localStorage operational mutation queue with a durable IndexedDB store and a one-time non-destructive migration of the v2 localStorage queue.
- Added connectivity-aware durable queueing to fault, outage, work-order, PTW and inventory idempotent commands.
- Preserved the original operation ID for retry/replay and only queue transport/connectivity failures.
- Added retry backoff, dependency-aware replay, cross-tab atomic replay lease, recovery of interrupted syncing items and conflict blocking.
- Expanded Sync Center with detailed operation status, errors, retry/removal controls and online/offline state.
- Survey attachments remain on their prior IndexedDB queue; resumable chunk uploads and a full offline read-model cache are not included.
- Verification: `node tests/v3_13_offline_first.test.mjs` and `node tests/v3_12_production_architecture.test.mjs`; no npm install, full semantic build or live Supabase migration was run.

## PowerGIS 3.14.0 – GIS Network Intelligence & Topology Validation

- Added a pure network analysis service that builds feeder summaries from the currently loaded, jurisdiction-filtered asset catalogue.
- Added upstream/downstream relationship summaries, active consumer impact counts, feeder utilization and transformer loading/phase-imbalance indicators.
- Added topology/data-quality findings for duplicate feeder/transformer/pole/consumer identifiers, missing source substations, orphan transformer/pole/consumer references, missing conductor endpoints, disconnected conductor-graph poles, overloaded feeders and overloaded transformers.
- Reworked Network Topology into a responsive intelligence workspace with feeder selection, trace direction, severity/search filters, finding list, transformer loading and active consumer impact list.
- Analysis is advisory and based on loaded records; it does not claim live power-flow calculation, switching safety, fault isolation authorization or persistence of computed findings.
- Added focused network-intelligence tests in `tests/network_intelligence.test.ts`.

## PowerGIS 3.15.0 — Offline GIS & Field Evidence

- New workspace: `src/components/gis/OfflineGISWorkspace.tsx` (navigation tab `offline_gis`).
- Local storage service: `src/services/offlineGISService.ts` with IndexedDB stores for GeoJSON packages, reviewable edits, evidence metadata and evidence chunks.
- GeoJSON import/export, local edit review, evidence chunk persistence and SHA-256 restore verification.
- No third-party basemap tile caching and no direct server mutation; backend conflict reconciliation and resumable server upload remain follow-on work.
- Static architecture check: `tests/v3_15_offline_gis.test.mjs`.

## PowerGIS 3.16.0 — Electrical Network Intelligence

- Added optional phase membership and energized metadata to conductor records and introduced a typed network switch record.
- Added graph-based phase-aware connected-component tracing; only explicitly closed switch edges are traversed.
- Added phase coverage summaries and a stable-ID snapshot comparison utility for network change impact review.
- Integrated a phase-aware trace panel into the existing Network Intelligence page.
- Unknown phase/switch values remain unknown; no direction, live state, engineering result or switching instruction is inferred.
- Verification: targeted strict TypeScript check for network model/domain types passed; runtime tests passed for phase filtering, reachability, phase gaps, open/unknown switch handling, coverage and snapshot diffs; new 3.16 architecture test passed.
- Full app build, live Supabase/SCADA integration and electrical engineering study validation were not performed.

## PowerGIS 3.17.0 — Asset Lifecycle Management
- Added dedicated Asset Lifecycle workspace over the canonical asset registry and existing `equipment_lifecycle` table.
- Supports lifecycle registration for existing substations, feeders, transformers and poles; condition assessment; replacement priority; expected-life ageing; and assessment history.
- Added RLS-protected `equipment_lifecycle_events` table and atomic SECURITY INVOKER assessment RPC migration: `supabase/migrations/20261117_asset_lifecycle_management.sql`.
- QR/barcode scanner, physical label printing, commissioning/decommissioning, financial depreciation and live deployment verification remain out of scope/not implemented.

## PowerGIS 3.25.0 — Enterprise Operations & Intelligence
- Bumped application/package version to 3.25.0 and added Enterprise Planning navigation/page.
- Added pure planning functions for straight-line depreciation estimates, reorder quantity, work-order due-state, deterministic operational recommendations and canonical asset label payloads.
- Integrated lifecycle, warranty, inventory and work-order data through existing services; recommendations navigate to existing modules and do not mutate operational records.
- Added printable human-readable asset labels; QR/barcode image generation and scanning are explicitly not included.
- Added an explainable rules-based recommendation workspace; this is not predictive AI, autonomous control or engineering decision-making.
- Added release documentation and a focused static architecture test. Historical version assertions were made semver-compatible so regression tests continue to test their architecture rather than fail on the release number.
- Verification: all static `.mjs` tests passed; TypeScript/TSX syntax transpilation passed for 150 files; relative imports resolved. Strict type check for the pure planning service passed. Full app build and live backend/device integration were not run; prebuilt bundles need regeneration before deployment.

## PowerGIS 3.26.0–3.32.0 — Platform Engineering & Field Operations
- Added a Platform Engineering & Operations Centre with seven release workspaces: static route/configuration audit, utility protocol catalogue, electrical screening calculator, consumer service application intake, canonical network snapshot, deployment readiness checks and mobile field workflow integration.
- Added pure calculation utilities for balanced three-phase voltage drop, transformer loading, phase-current imbalance and three-phase bolted-fault current using supplied source impedance; invalid/non-finite inputs are rejected. Added `consumerService.ts` to keep consumer-request repository access out of UI components.
- Added jurisdiction-scoped `consumer_service_requests` and secret-free `integration_endpoint_registry` schema with RLS in `supabase/migrations/20261127_platform_evolution_326_332.sql`; consolidated master SQL includes the migration.
- Added PWA manifest, app-shell service worker and secure-context registration. Added a read-only telemetry-ingest Edge Function with a dedicated gateway token, enabled gateway registry allowlist, optional tag namespace validation, bounded payloads, measurement/timestamp validation and source-event duplicate protection. The worker does not cache Supabase REST/auth/storage/functions requests.
- Mobile field centre reuses existing Contractor PWA, Offline GIS and registered idempotent offline mutation queue; no unsupported sync handler is fabricated.
- Digital twin view is only an application snapshot; utility protocols are catalogued but not connected; engineering calculations are screening estimates; consumer applications do not create energized connections.
- Historical test version assertions now compare package/app versions instead of pinning 3.25.0.
- Added `scripts/platform_audit.mjs`, a static regression runner, `npm run audit`, `npm run test:static` and `npm run test:platform-runtime`; GitHub Actions now runs these gates before deploy.
- Verification: 20/20 static `.mjs` tests and runtime tests of new pure services passed; 154 app TS/TSX files plus the Edge Function transpile with zero syntax errors; relative imports resolve; ZIP integrity passed. No npm install, full Vite build, live Supabase migration/RLS test, Edge Function deployment, RTU/PLC/AMI device commissioning or Android certification was performed.

## PowerGIS 3.42.0 — Completion & Stabilization Edition
- No new product features, modules, dashboards, integrations, or workflows were added.
- Release metadata and PWA cache identity aligned to 3.42.0.
- All-in-one SQL regenerated from timestamp-ordered migrations.
- Added `scripts/release_readiness_audit.mjs` to verify release metadata, PWA icon assets, migration/master SQL parity, backend-secret hygiene in client-delivered source, and release boundary documentation.
- Added `docs/POWERGIS_V3.33_TO_V3.42_COMPLETION_STABILIZATION.md` documenting scope, validation, and external deployment requirements.
- Source/static checks do not claim live Supabase/RLS, physical gateway, device, production load, disaster-recovery, or production security certification.


## Production hardening follow-up (2026-11-17)
- Supabase browser configuration is now build-time only; browser localStorage cannot redirect authentication/session traffic to an arbitrary backend. The login page no longer exposes backend URL/key editing or hardcoded demo credentials. Demo personas are shown only in development builds.
- Privileged admin Edge Functions share exact-origin CORS allowlisting (`POWERGIS_ALLOWED_ORIGINS`), POST-only handling, bounded JSON object parsing, and non-disclosing error responses.
- Legacy `SECURITY DEFINER` identity helper functions now have fixed search paths and explicit authenticated/service-role grants in `supabase/migrations/20261128_security_definer_search_path.sql`.
- The all-in-one SQL generator no longer recommends a destructive public-schema drop and excludes illustrative `seed.sql` data/personas from the production bundle.
- Vite upgraded to 6.4.6 and dev server bound to loopback only to mitigate GHSA-p4f5-76q4-ffq7. The lockfile package integrity field could not be regenerated in this offline environment; regenerate/verify lock metadata from the npm registry before release.
- Validation: platform audit 0 failures; release-readiness audit 0 failures; static regression 21/21; focused security baseline 5/5. Dependency install, npm audit, full TypeScript/Vite build, and live Supabase verification remain outstanding because npm registry access was unavailable.
