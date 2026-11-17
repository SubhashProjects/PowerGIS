# PowerGIS 3.16.0 — Electrical Network Intelligence

## Scope

This release extends the existing 3.14 network intelligence engine and 3.15 offline GIS foundation. It does not replace the application architecture or create a parallel asset registry.

## Added capabilities

- Additive `NetworkPhase` and `NetworkSwitch` domain types.
- Optional phase membership and energized-state metadata on conductors. Missing values remain unknown; no phase or switching state is inferred.
- Graph-based connected-component tracing from a selected pole, optionally constrained to a recorded phase.
- Explicit switch traversal rules: only a switch with state `closed` is traversable. Open and unknown switch states are reported and withheld.
- Phase coverage summaries for R, Y, B and neutral, including unrecorded/mixed coverage.
- Stable-ID snapshot comparison for added, removed and changed network attributes, suitable for impact review and audit workflows.
- Phase-aware trace workspace integrated into the existing Network Intelligence page.

## Data and safety boundaries

- Existing records remain compatible because new conductor attributes are optional.
- The trace represents recorded graph connectivity, not electrical direction, live energization, protection coordination or a switching instruction.
- `traceNetwork` returns a connected component. Upstream/downstream direction requires authoritative source ordering or directed topology data and is not fabricated from an undirected graph.
- Switch records must come from an authorized and current source before they are supplied to the model. No switch state is persisted or controlled by this UI.
- Phase results are only as complete as surveyed phase attributes. Missing phase data is explicitly reported.
- Snapshot comparison is a pure utility; persistence, approval and rollback remain governed by existing repository and workflow boundaries.

## Verification

Run `node tests/v3_16_network_model.test.mjs` and `npx tsx tests/v3_16_network_model.runtime.test.ts`, then the existing regression suite. This source-level release does not claim a live SCADA, Supabase or engineering load-flow validation.
