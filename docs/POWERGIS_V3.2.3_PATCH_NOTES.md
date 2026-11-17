# PowerGIS V3.2.3 Final Hardening Notes

This patch is a source-level completion pass on top of V3.2.2. It does not require npm installation.

## Added
- Server-side creation RPCs for Capital Projects and Preventive Maintenance.
- Explicit jurisdiction columns and RLS for disaster events.
- Strict disaster update field allow-list and numeric/status validation.
- Jurisdiction enforcement for transformer risk scoring.
- Revocation of direct authenticated INSERT/UPDATE/DELETE access on specialized operational tables; writes use controlled RPCs.
- Additional indexes for specialized operational queries.
- Specialized service methods for project/task creation.

## Corrected
- Disaster updates could previously be authorized by role without a reliable row-level jurisdiction boundary.
- Transformer risk RPC previously allowed any authenticated caller to request another jurisdiction's transformer risk score.
- Specialized tables had update-only RLS paths without server-side creation workflows.

## Verification scope
Static/source checks only. No npm installation, live Supabase migration, live RLS/concurrency test, browser E2E test, SCADA commissioning, or backup/restore drill was performed in this environment.
