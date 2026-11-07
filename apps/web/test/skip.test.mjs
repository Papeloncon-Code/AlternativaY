import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueSkip, mergeSegments } from '../src/skip.ts';

const segs = mergeSegments([
  { start: 879.329, end: 949.831, category: 'sponsor' },
  { start: 838.067, end: 881.08, category: 'sponsor' },
  { start: 1691.127, end: 1809.471, category: 'sponsor' },
]); // datos reales de SponsorBlock para CAYWoVi0rkw (2026-11-07)

test('une tramos solapados y ordena', () => {
  assert.equal(segs.length, 2);
  assert.deepEqual([segs[0].start, segs[0].end], [838.067, 949.831]);
});
test('no salta antes ni después del tramo', () => {
  assert.equal(dueSkip(segs, 100, new Set()), -1);
  assert.equal(dueSkip(segs, 838.0, new Set()), -1);
  assert.equal(dueSkip(segs, 949.7, new Set()), -1); // a punto de acabar: no merece la pena
  assert.equal(dueSkip(segs, 2000, new Set()), -1);
});
test('salta al entrar en el tramo', () => {
  assert.equal(dueSkip(segs, 838.1, new Set()), 0);
  assert.equal(dueSkip(segs, 1700, new Set()), 1);
});
test('tras deshacer, no vuelve a saltar el mismo tramo', () => {
  assert.equal(dueSkip(segs, 840, new Set([0])), -1);
});
