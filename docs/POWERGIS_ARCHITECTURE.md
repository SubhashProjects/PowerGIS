# PowerGIS Architecture — V3.2

PowerGIS remains the existing React 18 + TypeScript + Vite + Tailwind application. The upgrade preserves the existing page/component structure and adds a production service/repository boundary around Supabase.

## Layers
- UI: existing 21 operational navigation entries and reusable components.
- Context: `AuthContext` owns verified Supabase session/profile state.
- Services/repositories: `backendService`, `adminService`, `assetService`, `faultRepository`, `workOrderService`, `storesService`, `surveyService`, `ptwService`.
- Backend: Supabase Auth, PostgreSQL/PostGIS, RLS, SECURITY DEFINER RPCs for privileged/transactional workflows, Storage for evidence.
- Simulation: explicitly separated from operational records and never treated as live SCADA.

## Rules
1. Browser code never receives the Supabase service-role key.
2. Business mutations that require transactionality use backend RPCs.
3. RLS remains enabled; client-side role checks are only a UX layer.
4. Failed backend mutations do not produce success messages.
5. Physical electrical actions are not performed by the web application.
