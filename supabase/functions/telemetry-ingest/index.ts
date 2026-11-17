// Read-only telemetry ingress for a secured protocol gateway.
// Never expose the service-role key or gateway token to browser clients.
interface TelemetryFrame {
  eventId: string; gatewayId: string; pointTag: string; recordedAt: string;
  substationId?: string; feederId?: string; voltageKV?: number; currentAmps?: number;
  activePowerMW?: number; reactivePowerMvar?: number; frequencyHz?: number;
  breakerStatus?: 'OPEN' | 'CLOSED' | 'TRIPPED' | 'UNKNOWN';
  quality: 'GOOD' | 'QUESTIONABLE' | 'COMM_FAILURE' | 'INVALID';
}
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const finiteOptional = (value: unknown, min: number, max: number) => value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max);
function concatenate(chunks: Uint8Array[], total: number): Uint8Array { const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; } return output; }
function validate(frame: TelemetryFrame): string | null {
  if (!frame || typeof frame !== 'object') return 'INVALID_FRAME';
  if (typeof frame.eventId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(frame.eventId)) return 'INVALID_EVENT_ID';
  if (typeof frame.gatewayId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(frame.gatewayId)) return 'INVALID_GATEWAY_ID';
  if (typeof frame.pointTag !== 'string' || !/^[A-Za-z0-9_.:-]{1,50}$/.test(frame.pointTag)) return 'INVALID_POINT_TAG';
  if (frame.substationId !== undefined && !uuid.test(frame.substationId)) return 'INVALID_SUBSTATION_ID';
  if (frame.feederId !== undefined && !uuid.test(frame.feederId)) return 'INVALID_FEEDER_ID';
  if (!finiteOptional(frame.voltageKV, 0, 1000) || !finiteOptional(frame.currentAmps, 0, 1000000) || !finiteOptional(frame.activePowerMW, -100000, 100000) || !finiteOptional(frame.reactivePowerMvar, -100000, 100000) || !finiteOptional(frame.frequencyHz, 0, 1000)) return 'INVALID_MEASUREMENT';
  if (!['GOOD','QUESTIONABLE','COMM_FAILURE','INVALID'].includes(frame.quality)) return 'INVALID_QUALITY';
  if (frame.breakerStatus !== undefined && !['OPEN','CLOSED','TRIPPED','UNKNOWN'].includes(frame.breakerStatus)) return 'INVALID_BREAKER_STATE';
  const timestamp = Date.parse(frame.recordedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60_000 || timestamp < Date.now() - 7 * 24 * 60 * 60_000) return 'INVALID_OR_STALE_TIMESTAMP';
  return null;
}
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder(); const left = encoder.encode(a); const right = encoder.encode(b);
  let diff = left.length ^ right.length; const size = Math.max(left.length, right.length);
  for (let i = 0; i < size; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
Deno.serve(async request => {
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
  const expected = Deno.env.get('POWERGIS_TELEMETRY_INGEST_TOKEN');
  const supplied = request.headers.get('x-powergis-ingest-token') ?? '';
  if (!expected || !constantTimeEqual(supplied, expected)) return json(401, { error: 'UNAUTHORIZED_GATEWAY' });
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return json(415, { error: 'JSON_REQUIRED' });
  const reader = request.body?.getReader();
  if (!reader) return json(400, { error: 'EMPTY_BODY' });
  const chunks: Uint8Array[] = []; let totalBytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    totalBytes += part.value.byteLength;
    if (totalBytes > 16_384) { await reader.cancel(); return json(413, { error: 'PAYLOAD_TOO_LARGE' }); }
    chunks.push(part.value);
  }
  const raw = new TextDecoder().decode(chunks.length === 1 ? chunks[0] : concatenate(chunks, totalBytes));
  let frame: TelemetryFrame;
  try { frame = JSON.parse(raw) as TelemetryFrame; } catch { return json(400, { error: 'INVALID_JSON' }); }
  const invalid = validate(frame);
  if (invalid) return json(422, { error: invalid });
  const url = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json(503, { error: 'INGEST_BACKEND_NOT_CONFIGURED' });
  const registryUrl = `${url.replace(/\/$/, '')}/rest/v1/integration_endpoint_registry?gateway_reference=eq.${encodeURIComponent(frame.gatewayId)}&enabled=eq.true&commissioning_status=in.(read_only,active)&select=integration_key,metadata`;
  const registryResponse = await fetch(registryUrl, { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
  if (!registryResponse.ok) return json(502, { error: 'GATEWAY_REGISTRY_LOOKUP_FAILED' });
  const registered = await registryResponse.json() as Array<{ integration_key: string; metadata?: { tag_namespace?: string } }>;
  if (!registered.length) return json(403, { error: 'GATEWAY_NOT_COMMISSIONED' });
  const namespace = registered[0].metadata?.tag_namespace;
  if (namespace !== undefined && typeof namespace !== 'string') return json(503, { error: 'INVALID_GATEWAY_TAG_NAMESPACE' });
  if (namespace && !frame.pointTag.startsWith(namespace)) return json(403, { error: 'TAG_OUTSIDE_GATEWAY_NAMESPACE' });
  const row = {
    source_event_id: `${frame.gatewayId}:${frame.eventId}`, source_gateway: frame.gatewayId, point_tag: frame.pointTag,
    substation_id: frame.substationId ?? null, feeder_id: frame.feederId ?? null,
    voltage_kv: frame.voltageKV ?? null, current_amps: frame.currentAmps ?? null,
    active_power_mw: frame.activePowerMW ?? null, reactive_power_mvar: frame.reactivePowerMvar ?? null,
    frequency_hz: frame.frequencyHz ?? null, breaker_status: frame.breakerStatus ?? 'UNKNOWN',
    quality: frame.quality, recorded_at: new Date(frame.recordedAt).toISOString(), ingested_at: new Date().toISOString(),
  };
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/scada_telemetry?on_conflict=source_event_id`, {
    method: 'POST', headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify([row]),
  });
  if (!response.ok) return json(502, { error: 'TELEMETRY_PERSISTENCE_FAILED', status: response.status });
  return json(202, { accepted: true, eventId: frame.eventId, duplicateSafe: true, controlChannel: false });
});
