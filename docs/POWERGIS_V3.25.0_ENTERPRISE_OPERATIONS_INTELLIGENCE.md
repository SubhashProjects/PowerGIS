# PowerGIS 3.25.0 — Enterprise Operations & Intelligence

## Release train delivered in the cumulative source

| Release | Capability carried forward |
|---|---|
| 3.18 | Canonical asset lifecycle, condition assessment history, replacement prioritisation and printable asset identity labels |
| 3.19 | Existing work-order dispatch, assignment, staged verification and due-date exception review |
| 3.20 | Existing fault/outage workflows and reliability indices (SAIFI, SAIDI, CAIDI, ENS) |
| 3.21 | Existing stores inventory, stock transactions, reorder thresholds and idempotent issue operations |
| 3.22 | Straight-line depreciation and book-value planning calculator; estimates only, not accounting postings |
| 3.23 | Existing GIS network tracing, phase coverage, topology and data-quality checks |
| 3.24 | Existing RBAC, jurisdiction scoping, Supabase RLS, audit and approval controls |
| 3.25 | Explainable deterministic recommendations derived from lifecycle, warranty, stock and work-order records |

## New integration surface

- `src/services/enterprisePlanningService.ts` contains pure, testable planning functions.
- `src/components/assets/EnterprisePlanningCenter.tsx` provides the integrated planning page.
- `enterprise_planning` is role-gated in the central navigation configuration and routed by `App.tsx`.
- Recommendation actions navigate to their existing operational modules; they do not mutate operational records.
- Asset label output is a printable human-readable identity payload based on the canonical asset ID. It is **not** a QR/barcode image, scanner integration or device enrollment.

## Financial calculation boundaries

The depreciation calculator uses straight-line depreciation:

`annual depreciation = (acquisition cost - residual value) / useful life`

Accumulated depreciation is capped at depreciable cost; estimated book value is floored at residual value. All inputs must be finite, cost/residual non-negative, residual no greater than cost, useful life positive, and age non-negative. The calculation is an estimate only and does not create an accounting ledger, statutory asset register, tax schedule, or journal entry.

## Automation boundaries

The recommendation engine is deterministic and explainable. It flags expired/critical/low-condition lifecycle assets, warranties nearing expiry, stock at or below reorder threshold, and overdue work orders. It does not use a trained predictive model, infer unobserved failures, dispatch crews, change breaker states, approve permits, or make engineering decisions.

## Operational data boundaries

- Supabase remains the source of truth for configured production operations.
- The planning page loads existing repositories/services; it does not create parallel asset, work-order, outage or stock registries.
- When Supabase is not configured, inventory/work-order operational lists remain empty; no simulator records are represented as live operational data.
- Live SCADA/AMI, ERP/procurement, vendor, payment, accounting and field-device integrations require actual endpoints, credentials, contracts and commissioning tests.

## Verification

Run:

- `node tests/v3_25_enterprise_planning.test.mjs`
- Existing v3.13–v3.17 and production-hardening static/runtime tests.
- Full `npm ci`, `npm run lint`, `npm test`, `npm run build` in an environment with dependency installation permitted.

This source handoff does not claim a full Vite production build or live Supabase/RLS validation unless those checks are run in the deployment environment.
