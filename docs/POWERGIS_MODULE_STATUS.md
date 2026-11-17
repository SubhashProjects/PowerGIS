> V3.2.1 follow-up hardening has been applied after the V3.2 review. See `docs/POWERGIS_V3.2.1_PATCH_NOTES.md`.

# PowerGIS Module Status — V3.2

| Module | V3.2 status | Evidence |
|---|---|---|
| Authentication | Hardened | Supabase Auth + recovery + active profile |
| Administration | Backend provisioning path added | Edge Function + admin RPCs |
| Asset Register | Supabase read hydration added | `assetService.loadFromSupabase()` |
| Fault Management | Backend create/transition path added | `faultRepository` + RPCs |
| Work Orders | Persistent create/transition path added | `workOrderService` + RPCs |
| Stores | Atomic issue path added | `issue_inventory_atomic` |
| Contractor PWA | GPS/manual provenance + IndexedDB + server submit | `ContractorPWA`, `offlineQueue`, `surveyService` |
| Survey Approval | Secure JE/AE RPC path | backend-derived actor and scope |
| PTW | Controlled safety state machine | `permit_safety_events`, `advance_ptw_stage` |
| SCADA | Source separation hardened | `source_type`, `scada_alarms` RLS |
| GIS | Existing module preserved | asset hydration foundation |
| Remaining advanced modules | Partial | Existing UI retained; deeper persistence/integration still requires staging validation |

A module is not called production-complete merely because its page renders.
