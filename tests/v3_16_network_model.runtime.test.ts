import assert from 'node:assert/strict';
import { compareNetworkSnapshots, summarizePhaseCoverage, traceNetwork } from '../src/services/networkModelService';
import type { Conductor, Pole } from '../src/types/assets';

const poles = ['p1', 'p2', 'p3', 'p4'].map(id => ({ id } as Pole));
const conductors = [
  { id: 'c1', startPoleId: 'p1', endPoleId: 'p2', phases: ['R', 'Y', 'B'] },
  { id: 'c2', startPoleId: 'p2', endPoleId: 'p3', phases: ['Y'] },
  { id: 'c3', startPoleId: 'p3', endPoleId: 'p4' },
] as unknown as Conductor[];

const unknownPhaseEdge = { ...conductors[2], startPoleId: 'p2' };
const phaseTrace = traceNetwork({ startPoleId: 'p1', poles, conductors: [conductors[0], unknownPhaseEdge], phase: 'R' });
assert.deepEqual(phaseTrace.visitedPoleIds, ['p1', 'p2']);
assert.deepEqual(phaseTrace.missingPhaseDataConductorIds, ['c3']);
const fullTrace = traceNetwork({ startPoleId: 'p1', poles, conductors });
assert.equal(fullTrace.visitedPoleIds.length, 4);
assert.deepEqual(fullTrace.missingPhaseDataConductorIds, ['c3']);
const switchTrace = traceNetwork({ startPoleId: 'p1', poles, conductors: [conductors[0]], switches: [
  { id: 'sw-open', code: 'SW-O', feederId: 'f1', fromPoleId: 'p2', toPoleId: 'p3', state: 'open', source: 'survey' },
  { id: 'sw-unknown', code: 'SW-U', feederId: 'f1', fromPoleId: 'p3', toPoleId: 'p4', state: 'unknown', source: 'manual' },
] });
assert.deepEqual(switchTrace.blockedSwitchIds, ['sw-open']);
const unknownSwitchTrace = traceNetwork({ startPoleId: 'p1', poles, conductors: [conductors[0]], switches: [
  { id: 'sw-unknown', code: 'SW-U', feederId: 'f1', fromPoleId: 'p2', toPoleId: 'p3', state: 'unknown', source: 'manual' },
] });
assert.deepEqual(unknownSwitchTrace.unknownSwitchIds, ['sw-unknown']);
assert.equal(summarizePhaseCoverage(conductors).find(item => item.phase === 'R')?.knownConductorCount, 1);
assert.deepEqual(compareNetworkSnapshots([{ id: 'a', name: 'old' }], [{ id: 'a', name: 'new' }, { id: 'b', name: 'added' }], ['name']).map(item => item.kind), ['changed', 'added']);
console.log('PowerGIS 3.16 network model runtime tests passed.');
