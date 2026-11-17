import { analyzeNetwork } from '../src/services/networkIntelligenceService';
import type { Consumer, Feeder, Pole, Substation, Transformer, Conductor } from '../src/types/assets';

const substation: Substation = { id: 'ss-1', code: 'SS-1', name: 'Test SS', voltageClass: '110kV', capacityMVA: 20, numFeeders: 1, regionId: 'r1', status: 'operational', commissionDate: '2020-01-01', coordinates: [11, 79] };
const feeder: Feeder = { id: 'f-1', code: 'F-1', name: 'Test Feeder', substationId: 'ss-1', voltageClass: '11kV', conductorType: 'ACSR', lengthKm: 2, peakLoadAmps: 120, ratedCapacityAmps: 100, regionId: 'r1', isEnergized: true, status: 'operational', coordinates: [[11, 79], [11.01, 79.01]] };
const transformer: Transformer = { id: 't-1', code: 'T-1', name: 'Test DT', feederId: 'f-1', capacityKVA: 100, voltageRatio: '11kV/415V', make: 'Test', serialNumber: 'S1', installationDate: '2020-01-01', loadPercentage: 110, oilLevelPct: 80, hasOilLeakage: false, phaseImbalancePct: 14, regionId: 'r1', sectionId: 's1', status: 'operational', coordinates: [11.005, 79.005] };
const poleA: Pole = { id: 'p-1', code: 'P-1', poleNumber: '1', poleType: 'PSCC', material: 'Concrete', heightMeters: 9, feederId: 'f-1', numInsulators: 3, condition: 'Good', hasStreetlight: false, installationDate: '2020-01-01', regionId: 'r1', sectionId: 's1', status: 'operational', coordinates: [11, 79] };
const poleB: Pole = { ...poleA, id: 'p-2', code: 'P-2', poleNumber: '2', coordinates: [11.01, 79.01] };
const consumer: Consumer = { id: 'c-1', consumerNumber: 'C-1', accountNumber: 'A-1', name: 'Test Customer', address: 'Test', category: 'Domestic', sanctionedLoadKW: 2, poleId: 'p-2', transformerId: 't-1', feederId: 'f-1', meterNumber: 'M-1', isSmartMeter: false, meterMake: 'Test', meterInstallDate: '2020-01-01', status: 'active', regionId: 'r1', sectionId: 's1', coordinates: [11.01, 79.01] };
const conductor: Conductor = { id: 'cnd-1', code: 'CN-1', feederId: 'f-1', startPoleId: 'p-1', endPoleId: 'p-2', conductorType: 'ACSR', voltageClass: '11kV', lengthMeters: 100, ratedCurrentAmps: 100, condition: 'Good', coordinates: [[11, 79], [11.01, 79.01]] };

function assert(condition: boolean, label: string): void { if (!condition) throw new Error(`FAIL: ${label}`); console.log(`PASS: ${label}`); }

const healthy = analyzeNetwork({ substations: [substation], feeders: [feeder], transformers: [transformer], poles: [poleA, poleB], conductors: [conductor], consumers: [consumer] });
assert(healthy.summaries.length === 1, 'one feeder summary is produced');
assert(healthy.summaries[0].affectedConsumerCount === 1, 'active consumer impact is counted');
assert(healthy.summaries[0].utilizationPct === 120, 'feeder utilization is calculated');
assert(healthy.findings.some(item => item.code === 'OVERLOADED_FEEDER'), 'overloaded feeder is detected');
assert(healthy.findings.some(item => item.code === 'OVERLOADED_TRANSFORMER'), 'overloaded transformer is detected');
assert(healthy.findings.some(item => item.code === 'HIGH_PHASE_IMBALANCE'), 'high phase imbalance is detected');

const disconnected = analyzeNetwork({ substations: [substation], feeders: [feeder], transformers: [], poles: [poleA, poleB, { ...poleB, id: 'p-3', code: 'P-3', poleNumber: '3' }], conductors: [conductor], consumers: [] });
assert(disconnected.summaries[0].disconnectedPoleIds.includes('p-3'), 'disconnected conductor graph node is detected');

const orphan = analyzeNetwork({ substations: [], feeders: [feeder, { ...feeder, id: 'f-2', code: 'F-2' }], transformers: [{ ...transformer, feederId: 'missing' }], poles: [], conductors: [{ ...conductor, startPoleId: 'missing' }], consumers: [{ ...consumer, feederId: 'missing' }] });
assert(orphan.findings.some(item => item.code === 'MISSING_SUBSTATION'), 'missing source substation is detected');
assert(orphan.findings.some(item => item.code === 'ORPHAN_TRANSFORMER'), 'orphan transformer reference is detected');
assert(orphan.findings.some(item => item.code === 'ORPHAN_CONDUCTOR_ENDPOINT'), 'missing conductor endpoint is detected');
assert(orphan.findings.some(item => item.code === 'ORPHAN_CONSUMER'), 'orphan consumer reference is detected');
console.log('Network intelligence tests passed.');
