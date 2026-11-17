import type { Conductor, Consumer, Feeder, Pole, Substation, Transformer } from '../types/assets';
import { VALUES } from '../commons/values';

export type NetworkFindingSeverity = 'critical' | 'warning' | 'info';
export type NetworkFindingCode =
  | 'MISSING_SUBSTATION' | 'DUPLICATE_FEEDER_CODE' | 'DUPLICATE_TRANSFORMER_CODE'
  | 'DUPLICATE_POLE_CODE' | 'DUPLICATE_CONSUMER_NUMBER' | 'ORPHAN_TRANSFORMER'
  | 'ORPHAN_POLE' | 'ORPHAN_CONSUMER' | 'ORPHAN_CONDUCTOR_ENDPOINT'
  | 'DISCONNECTED_POLE' | 'OVERLOADED_FEEDER' | 'OVERLOADED_TRANSFORMER'
  | 'HIGH_PHASE_IMBALANCE' | 'INACTIVE_FEEDER_ASSETS';

export interface NetworkFinding {
  id: string;
  code: NetworkFindingCode;
  severity: NetworkFindingSeverity;
  title: string;
  detail: string;
  assetId?: string;
  assetCode?: string;
  feederId?: string;
}

export interface FeederNetworkSummary {
  feeder: Feeder;
  source?: Substation;
  transformers: Transformer[];
  poles: Pole[];
  conductors: Conductor[];
  consumers: Consumer[];
  reachablePoleIds: string[];
  disconnectedPoleIds: string[];
  affectedConsumerCount: number;
  utilizationPct: number;
  findings: NetworkFinding[];
}

const finding = (code: NetworkFindingCode, severity: NetworkFindingSeverity, title: string, detail: string, assetId?: string, assetCode?: string, feederId?: string): NetworkFinding => ({
  id: `${code}:${assetId || feederId || 'network'}`,
  code, severity, title, detail, assetId, assetCode, feederId,
});

function duplicates<T>(items: T[], key: (item: T) => string | undefined): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const value = key(item)?.trim().toLowerCase();
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), item]);
  }
  return new Map([...groups].filter(([, group]) => group.length > 1));
}

function reachablePoles(poles: Pole[], conductors: Conductor[], feeder: Feeder): Set<string> {
  if (!conductors.length) return new Set(poles.map(p => p.id));
  const known = new Set(poles.map(p => p.id));
  const adjacency = new Map<string, Set<string>>();
  for (const conductor of conductors) {
    if (!known.has(conductor.startPoleId) || !known.has(conductor.endPoleId)) continue;
    if (!adjacency.has(conductor.startPoleId)) adjacency.set(conductor.startPoleId, new Set());
    if (!adjacency.has(conductor.endPoleId)) adjacency.set(conductor.endPoleId, new Set());
    adjacency.get(conductor.startPoleId)!.add(conductor.endPoleId);
    adjacency.get(conductor.endPoleId)!.add(conductor.startPoleId);
  }
  const firstCoordinate = feeder.coordinates[0];
  const root = firstCoordinate && poles.length
    ? [...poles].sort((a, b) => Math.hypot(a.coordinates[0] - firstCoordinate[0], a.coordinates[1] - firstCoordinate[1]) - Math.hypot(b.coordinates[0] - firstCoordinate[0], b.coordinates[1] - firstCoordinate[1]))[0]
    : poles[0];
  const queue = root ? [root.id] : [];
  const visited = new Set(queue);
  for (let i = 0; i < queue.length; i += 1) {
    for (const next of adjacency.get(queue[i]) || []) {
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return visited;
}

export function analyzeNetwork(input: {
  substations: Substation[]; feeders: Feeder[]; transformers: Transformer[];
  poles: Pole[]; conductors: Conductor[]; consumers: Consumer[];
}): { summaries: FeederNetworkSummary[]; findings: NetworkFinding[] } {
  const { substations, feeders, transformers, poles, conductors, consumers } = input;
  const findings: NetworkFinding[] = [];

  for (const [code, group] of duplicates(feeders, x => x.code)) findings.push(finding('DUPLICATE_FEEDER_CODE', 'critical', 'Duplicate feeder code', `${group.length} feeders share code ${group[0].code}.`, group[0].id, group[0].code));
  for (const [code, group] of duplicates(transformers, x => x.code)) findings.push(finding('DUPLICATE_TRANSFORMER_CODE', 'critical', 'Duplicate transformer code', `${group.length} transformers share code ${group[0].code}.`, group[0].id, group[0].code));
  for (const [code, group] of duplicates(poles, x => x.code)) findings.push(finding('DUPLICATE_POLE_CODE', 'warning', 'Duplicate pole code', `${group.length} poles share code ${group[0].code}.`, group[0].id, group[0].code));
  for (const [number, group] of duplicates(consumers, x => x.consumerNumber)) findings.push(finding('DUPLICATE_CONSUMER_NUMBER', 'critical', 'Duplicate consumer number', `${group.length} consumer records share number ${group[0].consumerNumber}.`, group[0].id, group[0].consumerNumber));

  const feederIds = new Set(feeders.map(f => f.id));
  const poleIds = new Set(poles.map(p => p.id));
  const transformerIds = new Set(transformers.map(t => t.id));
  for (const t of transformers) if (!feederIds.has(t.feederId)) findings.push(finding('ORPHAN_TRANSFORMER', 'critical', 'Transformer has no valid feeder', `${t.code} references feeder ${t.feederId}, which is not available.`, t.id, t.code));
  for (const p of poles) if (!feederIds.has(p.feederId)) findings.push(finding('ORPHAN_POLE', 'warning', 'Pole has no valid feeder', `${p.code} references feeder ${p.feederId}, which is not available.`, p.id, p.code));
  for (const c of consumers) {
    if (c.feederId && !feederIds.has(c.feederId)) findings.push(finding('ORPHAN_CONSUMER', 'warning', 'Consumer has no valid feeder', `${c.consumerNumber} references missing feeder ${c.feederId}.`, c.id, c.consumerNumber));
    else if (c.transformerId && !transformerIds.has(c.transformerId)) findings.push(finding('ORPHAN_CONSUMER', 'warning', 'Consumer has no valid transformer', `${c.consumerNumber} references missing transformer ${c.transformerId}.`, c.id, c.consumerNumber));
  }
  for (const c of conductors) if (!poleIds.has(c.startPoleId) || !poleIds.has(c.endPoleId)) findings.push(finding('ORPHAN_CONDUCTOR_ENDPOINT', 'critical', 'Conductor endpoint missing', `${c.code} references ${!poleIds.has(c.startPoleId) ? 'missing start pole' : ''}${!poleIds.has(c.startPoleId) && !poleIds.has(c.endPoleId) ? ' and ' : ''}${!poleIds.has(c.endPoleId) ? 'missing end pole' : ''}.`, c.id, c.code, c.feederId));

  const summaries = feeders.map(feeder => {
    const source = substations.find(s => s.id === feeder.substationId);
    const feederTransformers = transformers.filter(t => t.feederId === feeder.id);
    const feederPoles = poles.filter(p => p.feederId === feeder.id);
    const feederConductors = conductors.filter(c => c.feederId === feeder.id);
    const feederConsumers = consumers.filter(c => c.feederId === feeder.id || (c.transformerId && feederTransformers.some(t => t.id === c.transformerId)));
    const reachable = reachablePoles(feederPoles, feederConductors, feeder);
    const disconnected = feederConductors.length ? feederPoles.filter(p => !reachable.has(p.id)).map(p => p.id) : [];
    const local: NetworkFinding[] = [];
    if (!source) local.push(finding('MISSING_SUBSTATION', 'critical', 'Feeder source substation missing', `${feeder.code} references substation ${feeder.substationId}, which is not available.`, feeder.id, feeder.code, feeder.id));
    if (!feeder.isEnergized || feeder.status !== 'operational') local.push(finding('INACTIVE_FEEDER_ASSETS', 'info', 'Feeder is not in normal energized state', `${feeder.code} is ${feeder.isEnergized ? 'energized' : 'de-energized'} with status ${feeder.status}.`, feeder.id, feeder.code, feeder.id));
    if (feeder.ratedCapacityAmps > 0 && feeder.peakLoadAmps > feeder.ratedCapacityAmps) local.push(finding('OVERLOADED_FEEDER', 'critical', 'Feeder exceeds rated current', `Peak load ${feeder.peakLoadAmps} A exceeds rating ${feeder.ratedCapacityAmps} A.`, feeder.id, feeder.code, feeder.id));
    if (feederConductors.length && disconnected.length) local.push(finding('DISCONNECTED_POLE', 'warning', 'Disconnected pole segment detected', `${disconnected.length} of ${feederPoles.length} poles are outside the feeder conductor graph.`, disconnected[0], feederPoles.find(p => p.id === disconnected[0])?.code, feeder.id));
    for (const t of feederTransformers) {
      if (t.loadPercentage > 100) local.push(finding('OVERLOADED_TRANSFORMER', 'critical', 'Transformer overloaded', `${t.code} is loaded to ${t.loadPercentage}%.`, t.id, t.code, feeder.id));
      if (t.phaseImbalancePct > VALUES.network.phaseImbalanceWarningPercent) local.push(finding('HIGH_PHASE_IMBALANCE', 'warning', 'High transformer phase imbalance', `${t.code} has ${t.phaseImbalancePct}% phase imbalance.`, t.id, t.code, feeder.id));
    }
    findings.push(...local);
    return {
      feeder, source, transformers: feederTransformers, poles: feederPoles, conductors: feederConductors,
      consumers: feederConsumers, reachablePoleIds: [...reachable], disconnectedPoleIds: disconnected,
      affectedConsumerCount: feederConsumers.filter(c => c.status === 'active').length,
      utilizationPct: feeder.ratedCapacityAmps > 0 ? Math.round((feeder.peakLoadAmps / feeder.ratedCapacityAmps) * 100) : 0,
      findings: local,
    };
  });
  return { summaries, findings };
}
