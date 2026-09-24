import test from 'node:test';
import assert from 'node:assert/strict';
import {OW, coinPattern, pswitchMission, pswitchPress, pswitchCollect, pswitchTick, timeLeft, slalomMission, slalomPass, ringsMission, ringsHit, ringsLand, progressAdd} from './ow.mjs';

test('coin row lies ahead of the switch and stays on the road', () => {
  const c = coinPattern(100);
  assert.equal(c.length, OW.coins);
  assert.ok(c[0].d > 100);
  for (let i = 1; i < c.length; i++) assert.ok(c[i].d > c[i - 1].d);
  for (const x of c) assert.ok(Math.abs(x.off) <= 6.5, 'coin within road width');
});

test('P-switch: press, collect all eight in time -> done, stays done', () => {
  const m = pswitchMission('p1', 50);
  assert.equal(pswitchPress(m, 10), true);
  assert.equal(pswitchPress(m, 11), false, 'pressing again while running does nothing');
  for (let i = 0; i < OW.coins; i++) assert.equal(pswitchCollect(m, i, 10 + i), true);
  assert.equal(m.state, 'done');
  assert.equal(pswitchTick(m, 100), 'done');
  assert.equal(pswitchPress(m, 101), false);
});

test('P-switch: a coin counts once, timeout fails and the switch resets', () => {
  const m = pswitchMission('p2', 0);
  pswitchPress(m, 0);
  assert.equal(pswitchCollect(m, 3, 1), true);
  assert.equal(pswitchCollect(m, 3, 2), false);
  assert.equal(m.got, 1);
  assert.ok(Math.abs(timeLeft(m, 5) - (OW.coinTime - 5)) < 1e-9);
  assert.equal(pswitchTick(m, OW.coinTime + .1), 'failed');
  assert.equal(pswitchCollect(m, 4, OW.coinTime + .2), false, 'no collecting after the timeout');
  assert.equal(pswitchTick(m, OW.coinTime + .1 + OW.resetAfter + .1), 'ready');
  assert.equal(m.got, 0);
  assert.equal(pswitchPress(m, 60), true, 'can retry');
});

test('buoy slalom: gates in order, a miss restarts', () => {
  const m = slalomMission('s1', [{d: 10, off: -3}, {d: 30, off: 3}, {d: 50, off: -3}]);
  assert.equal(slalomPass(m, 0, -2), 'hit');
  assert.equal(slalomPass(m, 2, -3), 'ignore', 'gates must be taken in order');
  assert.equal(slalomPass(m, 1, -4), 'miss');
  assert.equal(m.next, 0);
  assert.equal(slalomPass(m, 0, -3), 'hit');
  assert.equal(slalomPass(m, 1, 2.5), 'hit');
  assert.equal(slalomPass(m, 2, -3.2), 'done');
  assert.equal(m.state, 'done');
});

test('ring flight: all rings in one flight, landing early resets', () => {
  const m = ringsMission('r1', 3);
  assert.equal(ringsHit(m, 0), true);
  assert.equal(ringsHit(m, 0), false);
  ringsLand(m);
  assert.equal(m.got.size, 0);
  ringsHit(m, 0); ringsHit(m, 2); ringsHit(m, 1);
  assert.equal(m.state, 'done');
  ringsLand(m);
  assert.equal(m.state, 'done', 'done stays done');
});

test('progress list is unique and sorted', () => {
  let p = progressAdd([], 'p2');
  p = progressAdd(p, 'p1');
  p = progressAdd(p, 'p2');
  assert.deepEqual(p, ['p1', 'p2']);
});
