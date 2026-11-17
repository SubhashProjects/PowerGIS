# PowerGIS Database Schema — V3.2

The existing schema is retained and extended incrementally. Core tables include organizational hierarchy, user profiles, substations, feeders, transformers, poles, conductors, consumers, faults, work orders, surveys, approvals, outages, PTW, stores, disaster events, SCADA telemetry and audit logs.

## V3.2 additions
- Jurisdiction columns on warranty, work-order, inventory and survey records.
- `permit_safety_events` for immutable PTW stage evidence.
- Extended PTW status values for controlled stage transitions.
- `scada_alarms` plus telemetry source/quality/session fields.
- Inventory integer-unit constraint support.
- Audit actor role, jurisdiction, previous/new state and correlation fields.
- Atomic inventory, PTW, survey, fault and work-order RPCs.

## Spatial data
Operational spatial fields use PostGIS geometry/geography with SRID 4326. Spatial indexes are retained/created for GIS-heavy tables.

## Migration policy
Never replace production data with a seed. Apply timestamped migrations in order and test against a staging database before production deployment.
