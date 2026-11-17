export interface NavigationAuditItem { id: string; label: string; description: string; roles?: string[]; }

export interface AuditFinding { id: string; severity: 'critical' | 'high' | 'medium' | 'info'; title: string; detail: string; }

/** Static configuration audit. It does not claim to inspect remote runtime or database state. */
export function auditNavigationConfiguration(items: NavigationAuditItem[], mountedTabs: string[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) findings.push({ id: `duplicate-${item.id}`, severity: 'critical', title: `Duplicate navigation ID: ${item.id}`, detail: 'Navigation IDs must be unique because they are used as route keys.' });
    seen.add(item.id);
    if (!item.label?.trim() || !item.description?.trim()) findings.push({ id: `metadata-${item.id}`, severity: 'medium', title: `Incomplete navigation metadata: ${item.id}`, detail: 'Every module needs a label and description.' });
    if (item.roles && item.roles.length === 0) findings.push({ id: `roles-${item.id}`, severity: 'high', title: `Empty role allowlist: ${item.id}`, detail: 'An empty allowlist can cause an inaccessible or inconsistently protected route.' });
    if (!mountedTabs.includes(item.id)) findings.push({ id: `unmounted-${item.id}`, severity: 'high', title: `Navigation route is not mounted: ${item.id}`, detail: 'The sidebar exposes a route that is not rendered by the application router.' });
  }
  return findings;
}

export interface VoltageDropInput { voltageLineV: number; currentA: number; lengthKm: number; resistanceOhmPerKm: number; reactanceOhmPerKm?: number; powerFactor: number; phase: 'single' | 'three'; }
export function calculateVoltageDrop(input: VoltageDropInput) {
  const { voltageLineV: v, currentA: i, lengthKm: l, resistanceOhmPerKm: r, reactanceOhmPerKm: x = 0, powerFactor: pf, phase } = input;
  if (![v, i, l, r, x, pf].every(Number.isFinite) || v <= 0 || i < 0 || l < 0 || r < 0 || x < 0 || pf < 0 || pf > 1) throw new Error('Enter finite, non-negative electrical inputs; voltage must be positive and power factor must be between 0 and 1.');
  const sinPhi = Math.sqrt(Math.max(0, 1 - pf * pf));
  const factor = phase === 'three' ? Math.sqrt(3) : 2;
  const dropV = factor * i * l * (r * pf + x * sinPhi);
  const percent = dropV / v * 100;
  return { dropV, percent, receivingVoltageV: v - dropV, method: phase === 'three' ? 'Balanced three-phase approximate line-drop formula' : 'Single-phase two-conductor approximate line-drop formula' };
}

export function calculateTransformerLoading(input: { measuredKVA: number; ratedKVA: number }) {
  const { measuredKVA, ratedKVA } = input;
  if (![measuredKVA, ratedKVA].every(Number.isFinite) || measuredKVA < 0 || ratedKVA <= 0) throw new Error('Measured load must be non-negative and rated capacity must be positive.');
  return { loadingPercent: measuredKVA / ratedKVA * 100, headroomKVA: Math.max(0, ratedKVA - measuredKVA), overloaded: measuredKVA > ratedKVA };
}

export function calculatePhaseImbalance(input: { rA: number; yA: number; bA: number }) {
  const values = [input.rA, input.yA, input.bA];
  if (!values.every(Number.isFinite) || values.some(v => v < 0)) throw new Error('Phase currents must be finite and non-negative.');
  const average = values.reduce((sum, value) => sum + value, 0) / 3;
  if (average === 0) return { averageA: 0, maximumDeviationA: 0, imbalancePercent: 0 };
  const maximumDeviationA = Math.max(...values.map(value => Math.abs(value - average)));
  return { averageA: average, maximumDeviationA, imbalancePercent: maximumDeviationA / average * 100 };
}

export function calculateThreePhaseShortCircuit(input: { lineVoltageKV: number; sourceImpedanceOhm: number }) {
  const { lineVoltageKV, sourceImpedanceOhm } = input;
  if (![lineVoltageKV, sourceImpedanceOhm].every(Number.isFinite) || lineVoltageKV <= 0 || sourceImpedanceOhm <= 0) throw new Error('Line voltage and positive source impedance are required.');
  return { faultCurrentKA: lineVoltageKV / (Math.sqrt(3) * sourceImpedanceOhm), method: 'Three-phase bolted fault, source impedance referred to the stated voltage level' };
}

export const INTEGRATION_CATALOG = [
  { id: 'iec-61850', name: 'IEC 61850', domain: 'Substation automation', mode: 'Gateway adapter required', risk: 'High' },
  { id: 'iec-104', name: 'IEC 60870-5-104', domain: 'SCADA telemetry', mode: 'Protocol simulator/model present; real gateway adapter and commissioning required', risk: 'High' },
  { id: 'dnp3', name: 'DNP3', domain: 'SCADA telemetry', mode: 'Gateway adapter required', risk: 'High' },
  { id: 'modbus-tcp', name: 'Modbus TCP', domain: 'Equipment telemetry', mode: 'Gateway adapter required; simulator/model only', risk: 'High' },
  { id: 'websocket-rest', name: 'WebSocket / REST', domain: 'Application integration', mode: 'Authenticated API adapter and server-side allowlist required', risk: 'Medium' },
  { id: 'mqtt', name: 'MQTT', domain: 'Telemetry transport', mode: 'Broker and server-side consumer required', risk: 'Medium' },
  { id: 'ami', name: 'AMI / Meter Head-End', domain: 'Metering', mode: 'Vendor API / head-end adapter required', risk: 'High' },
  { id: 'gis', name: 'GIS / Spatial services', domain: 'Spatial exchange', mode: 'Existing GeoJSON import/export; coordinate QA required', risk: 'Medium' },
] as const;

export interface ConsumerServiceRequest {
  id: string; request_number?: string; applicant_name: string; contact_phone: string; service_address: string;
  category: 'Domestic' | 'Commercial' | 'Industrial' | 'Agricultural'; requested_load_kw: number;
  section_id: string; nearest_pole_id?: string | null; status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed'; created_at?: string;
}

export function validateConsumerServiceRequest(input: Partial<ConsumerServiceRequest>): string[] {
  const errors: string[] = [];
  if (!input.applicant_name?.trim() || input.applicant_name.trim().length < 2) errors.push('Applicant name must contain at least two characters.');
  if (!input.contact_phone?.trim() || !/^[+0-9()\-\s]{7,20}$/.test(input.contact_phone.trim())) errors.push('Enter a valid contact phone number.');
  if (!input.service_address?.trim() || input.service_address.trim().length < 5) errors.push('Service address must contain at least five characters.');
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!input.section_id?.trim() || !uuidPattern.test(input.section_id.trim())) errors.push('A valid section UUID is required.');
  if (input.nearest_pole_id && !uuidPattern.test(input.nearest_pole_id)) errors.push('Nearest pole ID must be a valid UUID.');
  if (!Number.isFinite(Number(input.requested_load_kw)) || Number(input.requested_load_kw) <= 0) errors.push('Requested load must be greater than zero.');
  if (!['Domestic', 'Commercial', 'Industrial', 'Agricultural'].includes(String(input.category))) errors.push('Select a valid consumer category.');
  return errors;
}

export function summarizeNetworkSnapshot(input: { substations: number; feeders: number; transformers: number; poles: number; conductors: number; consumers: number; }) {
  const values = Object.values(input);
  if (values.some(value => !Number.isInteger(value) || value < 0)) throw new Error('Network counts must be non-negative integers.');
  return { ...input, totalEntities: values.reduce((sum, value) => sum + value, 0), capturedAt: new Date().toISOString(), isLiveDigitalTwin: false };
}
