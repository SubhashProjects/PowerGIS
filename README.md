# PowerGIS

---

## 1. Executive Summary & Organizational Scope

The **Electricity GIS, Distribution Asset Management & O&M Platform** is a production-grade, enterprise utility operations system**.

### All Four Geographically Distinct Enclaves Covered:
1. **Puducherry** (Urban Boulevard, Semi-urban, and Rural Circles)
2. **Karaikal** (Coastal agricultural and port division)
3. **Mahe** (Arabian Sea coastal enclave)
4. **Yanam** (Godavari delta enclave)

### Official 5-Tier O&M Organizational Hierarchy:
$$\text{Superintending Engineer (SE)} \longrightarrow \text{Executive Engineer (EE)} \longrightarrow \text{Assistant Executive Engineer (AEE)} \longrightarrow \text{Assistant Engineer (AE)} \longrightarrow \text{Junior Engineer (JE)}$$
- **3 Configurable SE Accounts**:
  - Superintending Engineer (Circle I - Urban Puducherry)
  - Superintending Engineer (Circle II - Rural Puducherry)
  - Superintending Engineer (Karaikal, Mahe & Yanam Circle)

---

## 2. Key Modules & Technical Capabilities

| Module | Core Functionality & Engineering Standards |
|---|---|
| **Multi-Basemap GIS Master Map** | 8 Selectable basemaps: Google Maps (Roadmap, Satellite, Hybrid, Terrain), OSM Standard, OSM HOT, Esri World Imagery & Topo. 20 overlay layers, distance/area measurement, spatial coordinate search. |
| **Strict Jurisdiction Security (RLS)** | Multi-tier Row-Level Security in PostgreSQL: JE sees only assigned ward; AE only assigned section; EE only assigned division; SE assigned region; Contractor assigned tasks only. |
| **Electrical Asset Register** | Substations (230kV to 33kV), Feeders (22kV, 11kV, LT), DT Transformers, Utility Poles (PSCC 9m, Steel 11m, Rail), Conductors, Streetlights, Consumers. |
| **Smart Meter Management (AMI)** | Smart meters vs conventional meters, last communication timestamp, RF Mesh/4G status, transformer & pole mapping, tamper alerts. |
| **Warranties & Lifecycle Register** | Equipment useful life vs current age, 30/60/90-day expiry notifications, batch warranties, scrap & disposal register. |
| **Fault Management & Distance Engine** | Automated spatial calculation: GPS fault pin, straight-line distance to nearest pole & DT, distance along feeder LineString route, distance to section office. |
| **Work Order Kanban Board** | Field gang dispatch, status advancement (Assigned $\to$ In Progress $\to$ Completed $\to$ Verified $\to$ Closed), material consumption evidence. |
| **Contractor GPS Field Survey (PWA)** | Mobile-first offline PWA with live GPS accuracy meter, photo uploads, IndexedDB queue, and offline conflict resolver. |
| **Multi-Tier Survey Approval Queue** | Contractor Draft $\to$ Submit $\to$ JE Field Verify $\to$ AE Sanction $\to$ Atomic Promotion to Live Production GIS. Rejection requires mandatory reason. |
| **SCADA Telemetry & SLD** | Protocols: IEC 60870-5-104, Modbus TCP, MQTT. Interactive SVG Single Line Diagram (SLD) with dynamic busbars, breaker trip/close simulation. |
| **Outage & IEEE 1366 Reliability** | Calculation of **SAIFI**, **SAIDI**, **CAIDI**, **MAIFI**, and **ENS (Energy Not Served in MWh)** across feeders and sections. |
| **Network Topology Tracing** | Upstream tracing to source substation, downstream tracing to tail consumer meters, DT service area boundaries. |
| **DT Loading & Phase Imbalance** | Continuous peak load monitoring, 3-phase currents ($I_R, I_Y, I_B$), overload warning alerts, and RDSS augmentation recommendations. |
| **Stores & Material Management** | Stock inventory, goods receipt, store issue/return against work orders, contractor consumption reconciliation. |
| **Disaster Response Management** | Cyclone storm alert preparedness, damaged poles/DTs mapping, rapid grid restoration monitoring. |
| **Safety Permit to Work (PTW)** | Electrical LOTO protocol, line isolation, earthing confirmation, danger notice verification, clearance authorization. |
| **ISO 55000 Asset Risk Scoring** | Multi-factor composite index: 30% Condition + 25% Age + 20% Loading + 15% Faults + 10% Criticality. |
| **Automated Daily Backup & Restore** | Daily PostgreSQL + PostGIS + Supabase storage backups, restore verification, pre-restore safety snapshots. |
| **Super Admin Control Panel** | Modular feature toggles, role management, GeoJSON/Shapefile/KML data migration import & export. |

---

## 3. Technology Stack & Architecture

- **Frontend**: React 18, TypeScript 5.7, Vite 6, Tailwind CSS 3.4, Lucide React, Leaflet 1.9
- **GIS**: PostGIS 3.4, GeoJSON, Google Maps Platform, OpenStreetMap, Esri ArcGIS Online
- **Backend / Database**: Supabase, PostgreSQL 16, PostGIS 3.4, Row Level Security (RLS)
- **Architecture**: Modular MVVM / Service-Repository Pattern, Feature-based modules, Strongly typed domain models

```
PowerGISWeb/
├── src/
│   ├── types/          # Strongly typed domain interfaces (auth, assets, operations, gis, surveys)
│   ├── services/       # Service layer & repositories (auth, asset, gis, fault, survey, scada, reliability, risk)
│   ├── components/     # Feature-based presentation components
│   │   ├── layout/     # Header, ScopeBanner, Sidebar
│   │   ├── gis/        # MasterMap, BasemapSwitcher, LayerTree, MeasureTool
│   │   ├── assets/     # AssetTable, modal cards
│   │   ├── surveys/    # ContractorPWA, SurveyApprovalQueue
│   │   ├── faults/     # FaultList, DistanceCalculatorCard
│   │   ├── workOrders/ # WorkOrderKanban
│   │   ├── scada/      # ScadaTelemetryDashboard, SingleLineDiagram
│   │   ├── outages/    # OutageManager, ReliabilityCalculator
│   │   ├── topology/   # NetworkTraceViewer
│   │   ├── dtLoading/  # DTLoadingAnalytics
│   │   ├── stores/     # StoresInventory
│   │   ├── disaster/   # DisasterResponseCell
│   │   ├── safety/     # PermitToWorkManager
│   │   ├── risk/       # AssetRiskMatrix
│   │   └── admin/      # AdminControlPanel
│   ├── context/        # AuthContext, GISContext
│   ├── lib/            # Supabase client, offlineQueue (IndexedDB), geoUtils (Haversine/Area)
│   ├── App.tsx         # Main application container
│   ├── main.tsx        # React root entry point
│   └── index.css       # Tailwind & Leaflet styles
├── supabase/
│   ├── migrations/     # Master PostgreSQL 16 + PostGIS 3.4 schema, RLS policies, RPC triggers
│   └── seed.sql        # Realistic Puducherry grid seed dataset (all 4 regions)
├── tests/              # Automated security and functional test suite
└── dist/               # Production-ready minified build
```

---

## 4. Getting Started & Local Development

### Prerequisites
- Node.js (v18 or higher; v24 recommended)
- npm (v10 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/SubhashProjects/PowerGIS.git
cd PowerGIS

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Running Automated Security & Functional Tests

The system includes an extensive 34-test automated suite covering zero-trust jurisdiction security, multi-tier survey promotion, spatial distance calculations, IEEE 1366 reliability, and ISO 55000 asset health indexing:

```bash
# Execute automated test suite
npx tsx tests/security_and_functional.test.ts
```

## 6. Building for Production

```bash
# Compile TypeScript and bundle production assets
npm run build
```
Production assets will be output to the `dist/` folder, ready for deployment to any static host, CDN, or Supabase Storage bucket.

---

## 7. Database Migrations & Supabase Setup

To execute the database schema on Supabase Cloud or an In-House PostgreSQL 16 + PostGIS server:
1. Open the Supabase SQL Editor.
2. Run `supabase/migrations/20261108_puducherry_master_schema.sql` (Creates all tables, spatial indexes, PostGIS geometry types).
3. Run `supabase/migrations/20261108_rls_jurisdiction_policies.sql` (Enforces zero-trust RLS jurisdiction security).
4. Run `supabase/migrations/20261108_approval_workflow_rpc.sql` (Installs atomic staging-to-production promotion stored procedures).
5. Run `supabase/migrations/20261108_spatial_metrics_rpc.sql` (Installs nearest pole, nearest DT, and feeder route distance calculators).
6. Run `supabase/migrations/20261108_reliability_metrics_rpc.sql` (Installs IEEE 1366 SAIFI/SAIDI/CAIDI calculation functions).
7. Run `supabase/migrations/20261108_asset_risk_matrix.sql` (Installs ISO 55000 asset risk matrix engine).
8. Run `supabase/seed.sql` (Seeds all 4 regions, official user personas, substations, feeders, DTs, poles, consumers, SCADA, PTW, and stores data).

---

## 8. Deployment & Version Control

- **Repository**: https://github.com/SubhashProjects/PowerGIS
