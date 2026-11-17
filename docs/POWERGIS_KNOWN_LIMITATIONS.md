> V3.2.1 follow-up hardening has been applied after the V3.2 review. See `docs/POWERGIS_V3.2.1_PATCH_NOTES.md`.

# PowerGIS Known Limitations — V3.2

1. Live SCADA gateway protocols are not connected to a physical utility gateway.
2. Physical breaker/switch commands remain disabled.
3. Backup/restore is not claimed functional until a trusted backup service and separate restore test are configured.
4. Browser E2E testing and live RLS tests require a Supabase staging environment and browser automation dependencies.
5. Some advanced modules retain their existing UI and require further backend persistence work: capital projects, disaster response, smart-meter/AMI integration, topology validation, detailed maintenance lifecycle and full warranty claims.
6. PostGIS geometry serialization should be verified against the deployed Supabase/PostgREST representation before large GIS rollout.
7. External SMS/email providers require server-side credentials and delivery callbacks before delivery can be reported.

No limitation above is hidden behind a simulated success state.
