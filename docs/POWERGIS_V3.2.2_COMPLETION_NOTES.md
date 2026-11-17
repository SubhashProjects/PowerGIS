# PowerGIS V3.2.2 Completion Pass

This pass completes the remaining specialized-module persistence boundaries without requiring a browser/npm installation step in the development environment.

## Completed

- Capital Projects / RDSS now reads project packages from `capital_project_packages` and milestone changes use an authorized PostgreSQL RPC with audit logging.
- Preventive Maintenance now reads `maintenance_tasks` and completion is performed by an authorized PostgreSQL RPC with audit logging.
- Disaster Management now reads `disaster_events` and restoration updates use an authorized PostgreSQL RPC with audit logging.
- Asset Risk Matrix no longer invents a fault count from row position. Risk is calculated by the existing PostgreSQL risk RPC using actual transformer condition, age, loading and two-year fault history.
- Smart Meter, DT Loading, Topology and Warranty modules explicitly load operational assets from Supabase when configured.
- Smart Meter UI no longer substitutes a fabricated meter manufacturer.
- Specialized module RLS and write authorization are included in the migration chain.
- All-in-one Supabase SQL has been regenerated.

## Intentionally not claimed as complete

A browser-side application cannot itself perform a trusted PostgreSQL physical backup. Backup/restore therefore remains an infrastructure operation and the UI must not claim a successful database restore merely because a JSON export was downloaded.

Likewise, SCADA physical switching remains disabled. Real IEC-104/Modbus/MQTT gateway integration requires the utility's actual gateway architecture, certificates/credentials, network controls and commissioning process.
