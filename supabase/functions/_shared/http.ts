/** Shared HTTP boundary for privileged Edge Functions. */
const configuredOrigins = (Deno.env.get('POWERGIS_ALLOWED_ORIGINS') ?? '')
  .split(',').map(value => value.trim()).filter(Boolean);

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
  if (origin && configuredOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || configuredOrigins.includes(origin);
}

export function preflight(request: Request): Response {
  if (!originAllowed(request)) return json(request, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function readJsonObject(request: Request, maxBytes = 16_384): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) throw new HttpError(415, 'JSON_REQUIRED');
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new HttpError(400, 'INVALID_JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'JSON_OBJECT_REQUIRED');
  return value as Record<string, unknown>;
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

export function errorResponse(request: Request, error: unknown): Response {
  if (error instanceof HttpError) return json(request, error.status, { error: error.code });
  // Do not disclose database, Auth, or service-role error details to callers.
  return json(request, 500, { error: 'INTERNAL_SERVER_ERROR' });
}
