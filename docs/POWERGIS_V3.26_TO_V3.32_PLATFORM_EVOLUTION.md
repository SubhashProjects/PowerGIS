# PowerGIS 3.26.0–3.32.0 — Platform Engineering & Field Operations

## Release scope

This cumulative source release adds a shared Platform Engineering & Operations Centre with seven release workspaces:

- **3.26 Production readiness:** static navigation/route coverage audit and a mandatory deployment quality-gate checklist. This is not a full source-code security scanner or remote RLS verifier.
- **3.27 Utility integrations:** a protocol and gateway commissioning catalogue for IEC 61850, IEC 60870-5-104, DNP3, Modbus TCP, MQTT, AMI and GIS exchange. A server-side `telemetry-ingest` Edge Function accepts bounded, validated, duplicate-safe read-only telemetry frames from allowlisted gateways. It checks a dedicated gateway token, an enabled/commissioned registry entry and an optional tag namespace before inserting into the historian. Browser-side protocol clients and credential storage are excluded; actual RTU/PLC/AMI gateway adapters and commissioning remain external.
- **3.28 Electrical engineering:** validated-input calculations for balanced three-phase voltage drop, transformer kVA loading, phase-current imbalance and three-phase bolted-fault current from a supplied source impedance. These are screening estimates only, not a load-flow, short-circuit network solver, protection coordination package, switching plan or approved engineering output.
- **3.29 Consumer services:** jurisdiction-scoped new connection application intake using `consumer_service_requests`. A request is not a consumer master record, sanctioned connection, payment receipt or energised service. Approval and commissioning workflows remain separate.
- **3.30 Digital twin foundation:** a snapshot summary of canonical asset-service counts and links to existing topology, loading, risk, reliability and data-quality modules. This is not a live synchronized digital twin or state estimator.
- **3.31 Deployment & scalability:** client-side checks for configuration presence, secure context, connectivity, IndexedDB and service-worker support, plus scale-out guidance. These do not replace server monitoring, load testing, penetration testing, backup/restore drills or HA deployment.
- **3.32 Mobile field operations:** a web-app manifest and app-shell service worker; an integrated entry point to the existing Contractor Survey PWA, Offline GIS and durable mutation queue. API/auth/storage/functions requests are excluded from service-worker caching. Existing mutation replay only supports registered idempotent handlers.

## Database deployment

Apply `supabase/migrations/20261127_platform_evolution_326_332.sql` after the existing migrations. The consolidated `supabase/SUPABASE_ALL_IN_ONE_MASTER.sql` includes the new migration at its end. The endpoint registry protocol constraint supports IEC 61850, IEC 60870-5-104, DNP3, Modbus TCP, MQTT, WebSocket/REST, AMI API and GIS exchange.

The migration creates:

- `consumer_service_requests` with section jurisdiction, creator ownership, status constraints, load validation and RLS.
- `integration_endpoint_registry` for non-secret endpoint metadata, with restricted read/write roles, gateway-reference uniqueness and a strict metadata-key allowlist.
- Idempotency columns/indexes on `scada_telemetry` for source event IDs and gateway provenance.

Do not store passwords, API tokens, certificates, private keys or connection strings in `integration_endpoint_registry`. Configure the gateway token as an Edge Function secret and deploy the function with `supabase functions deploy telemetry-ingest`. For example, register a gateway with `integration_key`, a non-secret `gateway_reference`, `enabled=true`, `commissioning_status=read_only` and an optional `metadata.tag_namespace`; only then set the `POWERGIS_TELEMETRY_INGEST_TOKEN` secret. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function runtime. Keep the service-role key and gateway token only on the gateway/server side. Restrict gateway network egress and apply rate limits at the gateway/API perimeter; the Edge Function is telemetry-ingest only and has no breaker-control operation.

## Verification performed

- All static `.mjs` regression tests, including the new 3.26–3.32 static architecture test.
- Runtime checks of the new engineering calculations, consumer-request validation and network snapshot summarizer using TypeScript transpilation.
- TypeScript/TSX syntax transpilation and relative import resolution across the source tree.
- SQL structural checks and ZIP integrity.

## Explicit deployment boundaries

No npm install, full Vite build, live Supabase migration, RLS role matrix, live protocol gateway connection, SCADA/AMI device commissioning, power-system study validation, Android device certification, or production security assessment was performed. The Edge Function is source-implemented but not deployed or tested against a live project. Regenerate compiled bundles with `npm ci && npm run build` before publishing. Run migrations in staging first and verify all role policies with test identities. Electrical results must be independently checked by qualified engineers using validated network data.
