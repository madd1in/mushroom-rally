import test from 'node:test';
import assert from 'node:assert/strict';
import {raceXP, levelOf, levelStart, recordRace, ACH, TRACKS} from './progress.mjs';

test('race XP: placement base, bonuses and class multiplier', () => {
  const plain = raceXP({place: 1, cc: 50, stats: {hitsTaken: 1}});
  assert.equal(plain.total, 100);
  const rich = raceXP({place: 1, cc: 150, stats: {mt: {mini: 2, super: 1, ultra: 1}, tricks: 2, hitsTaken: 0}});
  assert.equal(rich.total, Math.round((100 + 8 + 8 + 15 + 12 + 30) * 1.6));
  assert.ok(raceXP({place: 8, cc: 100, stats: {hitsTaken: 3}}).total > 0, 'even last place earns XP');
});

test('levels grow steadily and report progress within the level', () => {
  assert.equal(levelOf(0).level, 1);
  assert.equal(levelOf(149).level, 1);
  assert.equal(levelOf(150).level, 2);
  assert.equal(levelOf(levelStart(5)).level, 5);
  const l = levelOf(200);
  assert.equal(l.into, 50);
  assert.equal(l.need, 300);
});

test('recording a race: achievements once, level-up reported, tracks remembered', () => {
  let r = recordRace({}, {track: 0, cc: 100, place: 1, finished: true, stats: {hitsTaken: 0, mt: {ultra: 1}}});
  assert.ok(r.fresh.includes('win') && r.fresh.includes('clean') && r.fresh.includes('ultra') && r.fresh.includes('cow'));
  assert.equal(r.levelUp, 2);
  assert.deepEqual(r.prog.done, [0]);
  const again = recordRace(r.prog, {track: 0, cc: 100, place: 1, finished: true, stats: {hitsTaken: 0}});
  assert.equal(again.fresh.includes('win'), false, 'each achievement only once');
  let p = r.prog;
  for (let t = 1; t < TRACKS; t++) p = recordRace(p, {track: t, cc: 50, place: 1, finished: true, stats: {hitsTaken: 2}}).prog;
  assert.ok(p.ach.includes('allTracks') && p.ach.includes('allWins'));
});

test('achievement ids are unique and every entry has a name and a description', () => {
  const ids = new Set(ACH.map(a => a.id));
  assert.equal(ids.size, ACH.length);
  for (const a of ACH) assert.ok(a.n && a.d && typeof a.t === 'function');
});
