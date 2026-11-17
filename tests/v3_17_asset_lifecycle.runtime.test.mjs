import assert from 'node:assert/strict';

// Pure domain invariants used by the lifecycle workflow.
const ageYears = (installationDate, now = new Date('2026-11-17T00:00:00Z')) => {
  const installed = new Date(installationDate);
  if (Number.isNaN(installed.getTime()) || installed.getTime() > now.getTime()) throw new Error('invalid installation date');
  return Math.max(0, (now.getTime() - installed.getTime()) / (365.25 * 86400000));
};
const replacementExpired = (age, expectedLife) => age >= expectedLife;
const validateScore = (score) => Number.isInteger(score) && score >= 0 && score <= 100;

assert.equal(validateScore(0), true);
assert.equal(validateScore(100), true);
assert.equal(validateScore(101), false);
assert.equal(validateScore(50.5), false);
assert.equal(replacementExpired(ageYears('2000-01-01'), 25), true);
assert.equal(replacementExpired(ageYears('2020-01-01'), 25), false);
assert.throws(() => ageYears('2027-01-01'));
console.log('PowerGIS 3.17 lifecycle domain invariants passed.');
