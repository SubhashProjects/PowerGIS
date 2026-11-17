import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculatePhaseImbalance, calculateThreePhaseShortCircuit, calculateTransformerLoading, calculateVoltageDrop, validateConsumerServiceRequest, summarizeNetworkSnapshot } from '../src/services/platformEvolutionService';

test('three phase voltage drop uses balanced three-phase factor', () => {
  const result = calculateVoltageDrop({ voltageLineV: 11000, currentA: 80, lengthKm: 2, resistanceOhmPerKm: 0.25, reactanceOhmPerKm: 0.08, powerFactor: 0.9, phase: 'three' });
  assert.ok(result.dropV > 0);
  assert.equal(result.percent, result.dropV / 11000 * 100);
});
test('engineering calculations reject invalid inputs', () => {
  assert.throws(() => calculateTransformerLoading({ measuredKVA: 10, ratedKVA: 0 }));
  assert.throws(() => calculatePhaseImbalance({ rA: -1, yA: 0, bA: 0 }));
  assert.throws(() => calculateThreePhaseShortCircuit({ lineVoltageKV: 11, sourceImpedanceOhm: 0 }));
});
test('phase imbalance and short circuit estimates are deterministic', () => {
  assert.equal(calculatePhaseImbalance({ rA: 100, yA: 100, bA: 100 }).imbalancePercent, 0);
  assert.ok(calculateThreePhaseShortCircuit({ lineVoltageKV: 11, sourceImpedanceOhm: 1 }).faultCurrentKA > 0);
});
test('consumer requests require valid jurisdiction and positive load', () => {
  assert.ok(validateConsumerServiceRequest({ applicant_name:'A B', contact_phone:'1234567890', service_address:'Street 1', category:'Domestic', requested_load_kw:2, section_id:'' }).length > 0);
  assert.equal(validateConsumerServiceRequest({ applicant_name:'A B', contact_phone:'1234567890', service_address:'Street 1', category:'Domestic', requested_load_kw:2, section_id:'123e4567-e89b-42d3-a456-426614174000' }).length, 0);
});
test('network snapshot rejects invalid counts and sums canonical records', () => {
  const snapshot = summarizeNetworkSnapshot({ substations:1, feeders:2, transformers:3, poles:4, conductors:5, consumers:6 });
  assert.equal(snapshot.totalEntities, 21);
  assert.equal(snapshot.isLiveDigitalTwin, false);
  assert.throws(() => summarizeNetworkSnapshot({ substations:-1, feeders:0, transformers:0, poles:0, conductors:0, consumers:0 }));
});
