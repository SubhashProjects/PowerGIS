import type { Conductor, NetworkPhase, NetworkSwitch, Pole } from '../types/assets';

export interface NetworkTraceResult {
  startPoleId: string;
  visitedPoleIds: string[];
  traversedConductorIds: string[];
  traversedSwitchIds: string[];
  blockedSwitchIds: string[];
  unknownSwitchIds: string[];
  missingPhaseDataConductorIds: string[];
}
export interface PhaseCoverage {
  phase: NetworkPhase;
  knownConductorCount: number;
  unknownConductorCount: number;
  poleCount: number;
  status: 'present' | 'not_recorded' | 'mixed';
}
export interface NetworkChange {
  key: string;
  kind: 'added' | 'removed' | 'changed';
  before?: string;
  after?: string;
}

/**
 * Traces the surveyed connectivity graph. A switch edge is traversable only
 * when its state is explicitly closed. Unknown/open switches are reported,
 * never silently treated as closed. The result is a connected component, not
 * an inferred upstream/downstream path.
 */
export function traceNetwork(input: {
  startPoleId: string;
  poles: Pole[];
  conductors: Conductor[];
  switches?: NetworkSwitch[];
  phase?: NetworkPhase;
}): NetworkTraceResult {
  const { startPoleId, poles, conductors, switches = [], phase } = input;
  const knownPoles = new Set(poles.map(p => p.id));
  const visited = new Set<string>();
  const conductorIds = new Set<string>();
  const switchIds = new Set<string>();
  const blocked = new Set<string>();
  const unknown = new Set<string>();
  const missingPhase = new Set<string>();
  if (!knownPoles.has(startPoleId)) return { startPoleId, visitedPoleIds: [], traversedConductorIds: [], traversedSwitchIds: [], blockedSwitchIds: [], unknownSwitchIds: [], missingPhaseDataConductorIds: [] };

  const edges: Array<{ id: string; a: string; b: string; kind: 'conductor' | 'switch'; state?: string; phases?: NetworkPhase[] }> = [];
  for (const c of conductors) {
    if (!knownPoles.has(c.startPoleId) || !knownPoles.has(c.endPoleId) || c.isEnergized === false) continue;
    edges.push({ id: c.id, a: c.startPoleId, b: c.endPoleId, kind: 'conductor', phases: c.phases });
  }
  for (const sw of switches) edges.push({ id: sw.id, a: sw.fromPoleId, b: sw.toPoleId, kind: 'switch', state: sw.state, phases: sw.phases });
  const queue = [startPoleId]; visited.add(startPoleId);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const edge of edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
      if (!next) continue;
      if (edge.kind === 'conductor' && !edge.phases?.length) {
        missingPhase.add(edge.id);
        if (phase) continue; // Cannot assert phase connectivity without surveyed membership.
      }
      if (phase && edge.phases && !edge.phases.includes(phase)) continue;
      if (edge.kind === 'switch' && edge.state !== 'closed') {
        (edge.state === 'open' ? blocked : unknown).add(edge.id);
        continue;
      }
      if (visited.has(next)) continue;
      visited.add(next); queue.push(next);
      (edge.kind === 'conductor' ? conductorIds : switchIds).add(edge.id);
    }
  }
  return {
    startPoleId, visitedPoleIds: [...visited], traversedConductorIds: [...conductorIds],
    traversedSwitchIds: [...switchIds], blockedSwitchIds: [...blocked], unknownSwitchIds: [...unknown],
    missingPhaseDataConductorIds: [...missingPhase],
  };
}

export function summarizePhaseCoverage(conductors: Conductor[]): PhaseCoverage[] {
  const phases: NetworkPhase[] = ['R', 'Y', 'B', 'N'];
  return phases.map(phase => {
    const known = conductors.filter(c => c.phases?.includes(phase)).length;
    const unknown = conductors.filter(c => !c.phases || c.phases.length === 0).length;
    return { phase, knownConductorCount: known, unknownConductorCount: unknown, poleCount: new Set(conductors.filter(c => c.phases?.includes(phase)).flatMap(c => [c.startPoleId, c.endPoleId])).size,
      status: known === 0 ? 'not_recorded' : unknown ? 'mixed' : 'present' };
  });
}

/** Compare stable asset snapshots; caller supplies already-authorized records. */
export function compareNetworkSnapshots<T extends { id: string }>(before: T[], after: T[], fields: Array<keyof T>): NetworkChange[] {
  const oldMap = new Map(before.map(item => [item.id, item]));
  const newMap = new Map(after.map(item => [item.id, item]));
  const changes: NetworkChange[] = [];
  for (const [id, oldItem] of oldMap) {
    const next = newMap.get(id);
    if (!next) { changes.push({ key: id, kind: 'removed', before: JSON.stringify(oldItem) }); continue; }
    for (const field of fields) {
      if (JSON.stringify(oldItem[field]) !== JSON.stringify(next[field])) changes.push({ key: `${id}.${String(field)}`, kind: 'changed', before: JSON.stringify(oldItem[field]), after: JSON.stringify(next[field]) });
    }
  }
  for (const [id, item] of newMap) if (!oldMap.has(id)) changes.push({ key: id, kind: 'added', after: JSON.stringify(item) });
  return changes;
}
