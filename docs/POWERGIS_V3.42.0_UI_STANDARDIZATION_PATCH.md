# PowerGIS 3.42.0 UI Standardization Patch

## Changes

- Made the Demo entry point visible on the login screen in both configured and unconfigured deployments.
- Kept demo persona authentication restricted to development builds without a configured production Supabase backend; production demo cards are disabled and the reason is explained.
- Standardized shared page chrome, neutral border treatment, icon color, form controls, focus states, and mobile page sizing through the global stylesheet.
- Removed the search field focus side effect that opened the command palette before the user could type; Ctrl/Cmd+K remains available.
- Kept map-layer and operational data symbology outside the global icon/border neutralization rules.
- Mirrored the shared neutral style layer and visible Demo entry point into the prebuilt `assets/`, `docs/assets/`, and `portal/assets/` deployment bundles.

## Validation

- `node scripts/run_static_tests.mjs`: passed (21/21 static regression tests).
- `node scripts/platform_audit.mjs`: 0 failures; build validation warning because dependencies are not installed in this workspace.
- `node scripts/release_readiness_audit.mjs`: 0 failures; existing package-lock integrity metadata warning remains.
- `node --check` passed for all three prebuilt JavaScript bundle copies.
- Full TypeScript/Vite production build was not run because dependencies could not be installed in this environment.
