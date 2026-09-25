import test from 'node:test';
import assert from 'node:assert/strict';
import {STAMP,STAMP_CYCLE,stamperState,stamperCrushes,stamperBlocks,FIRE,FIRE_CYCLE,fireballAt,CANNON,cannonLane,missileAt} from './hazards.mjs';

test('stamper cycles up -> fall -> down -> rise and repeats', () => {
  assert.equal(stamperState(0).phase, 'up');
  assert.equal(stamperState(0).y, STAMP.top);
  const f = stamperState(STAMP.up + STAMP.fall * .5);
  assert.equal(f.phase, 'fall');
  assert.ok(f.y < STAMP.top && f.y > 0);
  const d = stamperState(STAMP.up + STAMP.fall + .1);
  assert.equal(d.phase, 'down');
  assert.equal(d.y, 0);
  assert.equal(stamperState(STAMP.up + STAMP.fall + STAMP.down + STAMP.rise * .5).phase, 'rise');
  assert.deepEqual(stamperState(1.2), stamperState(1.2 + STAMP_CYCLE * 3));
});

test('stamper crushes only at the end of the fall and blocks while low', () => {
  let crushes = 0, blocksUp = 0;
  for (let t = 0; t < STAMP_CYCLE; t += .01) {
    const s = stamperState(t);
    if (stamperCrushes(s)) { crushes++; assert.equal(s.phase, 'fall'); }
    if (s.phase === 'up' && stamperBlocks(s)) blocksUp++;
  }
  assert.ok(crushes > 0 && crushes < 20, 'short crush window');
  assert.equal(blocksUp, 0, 'up high it never blocks');
  assert.ok(stamperBlocks(stamperState(STAMP.up + STAMP.fall + .2)));
});

test('fireball leaves the mouth, drops to kart height and crosses the whole road', () => {
  const start = fireballAt(0, 0, 1), mid = fireballAt(FIRE.flight * .5, 0, 1), end = fireballAt(FIRE.flight * .99, 0, 1);
  assert.ok(start.vis && Math.abs(start.off - FIRE.mouthOff) < 1e-9 && Math.abs(start.y - FIRE.mouthY) < 1e-9);
  assert.ok(Math.abs(mid.y - FIRE.ride) < 1e-9, 'at kart height while crossing');
  assert.ok(end.off < -7.6, 'reaches beyond the far road edge');
  assert.equal(fireballAt(FIRE.flight + .1, 0, 1).vis, false, 'pause between shots');
  const left = fireballAt(FIRE.flight * .5, 0, -1);
  assert.ok(left.off > 0, 'statue on the left fires to the right');
  assert.ok(FIRE_CYCLE > FIRE.flight);
});

test('cannon lanes are offset shot to shot and missiles merge into their lane', () => {
  for (let k = 0; k < 20; k++) assert.notEqual(cannonLane(k), cannonLane(k + 1));
  for (const l of CANNON.lanes) assert.ok(Math.abs(l) <= 5, 'lanes stay on the road');
  const m0 = missileAt(0, 10, -3.5), m1 = missileAt(CANNON.merge / CANNON.speed, 10, -3.5), m2 = missileAt(3, 10, -3.5);
  assert.equal(m0.off, 10);
  assert.ok(Math.abs(m1.off + 3.5) < 1e-9);
  assert.ok(m2.back > m1.back);
  assert.equal(missileAt(CANNON.range / CANNON.speed + .5, 10, 0).alive, false);
});
