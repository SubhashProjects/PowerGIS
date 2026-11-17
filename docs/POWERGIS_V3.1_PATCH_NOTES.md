# PowerGIS V3.1 Patch Notes

This patch is based on the uploaded `PowerGIS-master (1).zip` source tree. It is a targeted security/safety correction, not a complete production conversion of all 21 modules.

## Changes made

- Removed local browser-storage session restoration as an authentication source.
- Supabase sign-in now fails closed when Supabase is not configured, when profile lookup fails, or when no active `user_profiles` row is found.
- Added verified Supabase profile restoration and an `onAuthStateChange` subscription in `AuthProvider`.
- Added a real `supabase.auth.resetPasswordForEmail` call for the login page password-reset flow.
- Disabled local password authentication and removed the hardcoded credential vault/universal password logic.
- Restricted demo persona login and user switching to Vite development builds.
- Tightened client-side jurisdiction helper checks: imported/uploaded flags no longer bypass scope, and missing scope identifiers are denied for scoped roles. Backend RLS remains the actual security boundary and still requires live verification.
- Removed hardcoded Supabase project/key fallbacks. `.env.example` now contains blank public configuration values; SCADA/SMS secrets are explicitly designated backend-only.
- PTW requests now start in `requested` state with safety checks unconfirmed. The UI no longer directly authorizes restoration/re-energization and warns that physical safety steps require independent verification.
- Contractor PWA no longer fabricates GPS coordinates or accuracy when geolocation fails. Asset capture requires a real GPS fix.
- Contractor survey submission no longer reports an official JE submission when only local staging exists; drafts remain queued until a real backend adapter is connected.
- Offline queue no longer marks records synced after a timer. It preserves pending records until a real server acknowledgement exists.
- Corrected GIS theme state so black/white mode state toggles rather than always forcing white.
- Updated auth tests to reject legacy local credentials and imported-record jurisdiction bypass.

## Not completed / known limitations

- The 21 business modules are not all converted to Supabase-backed repositories by this patch. Asset, fault, survey, work order, inventory, outage, warranty, maintenance, project, disaster, and notification services still require full persistence implementation and RLS verification.
- Admin user creation/editing is still not a secure Supabase Auth Admin workflow. It must be moved to a trusted Edge Function/server process before production use.
- Client-side role and jurisdiction helpers do not replace backend RLS and secure RPC checks.
- PTW workflow remains a request/visibility safeguard, not a complete audited isolation, verification, issue, clearance, and restoration workflow. Do not use this build as the authoritative safety permit system.
- Contractor offline synchronization is deliberately not marked successful; a real idempotent Supabase sync adapter is still required. Manual map pin and camera evidence capture are not implemented here.
- SCADA live protocol gateway, IEC-104, Modbus TCP, MQTT, live switching, and industrial safety interlocks are not implemented by this patch. Real breaker commands must remain disabled.
- Backup/restore remains to be implemented and tested against a separate database environment.
- GIS topology, live AMI/MDMS, historical transformer loading, warranty claims, full project workflows, disaster response, and validated regulatory reliability calculations still require implementation.
- A complete visual theme conversion is not included; this patch fixes the state/toggle logic and root theme attributes, but individual component styles may still need dark-theme CSS.

## Verification status

- Source changes were inspected after editing.
- Dependency installation (`npm ci`) could not complete within the available execution window.
- TypeScript build/tests could not be run because project dependencies, including `vite/client`, were unavailable in the environment.
- No live Supabase project, browser end-to-end session, industrial gateway, GPS hardware, or database restore test was available.

Do not label this archive production-ready until the remaining work and live tests above are completed.

## Deployment note

The checked-in compiled static bundles in `dist/`, `docs/`, `portal/`, and `assets/` were not regenerated because dependency installation could not be completed in this execution environment. They therefore do not yet contain the source corrections above. Run `npm ci` followed by `npm run build` in a connected development environment before deploying these compiled folders to GitHub Pages.
