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
│   └── security_and_functional.test.ts # 78 automated security, RBAC & functional tests
└── src/
    ├── main.tsx                       # React DOM root render
    ├── App.tsx                        # Core shell, tab router, and modal coordinator
    ├── index.css                      # Tailwind base & Leaflet high-contrast rules
    ├── config/                        # SINGLE SOURCE OF TRUTH (SSOT)
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
