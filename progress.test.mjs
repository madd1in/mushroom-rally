import test from 'node:test';
import assert from 'node:assert/strict';
import {raceXP, levelOf, levelStart, recordRace, ACH, TRACKS, RIVAL_XP, DAILY_XP, DAILY_GOALS, dailyChallenge, dailyDone, dayKey, pickRival, rivalBeaten, achById} from './progress.mjs';

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

test('daily challenge: same task all day, valid track and class, win only in 50/100cc', () => {
  const a = dailyChallenge('2026-09-25'), b = dailyChallenge('2026-09-25');
  assert.deepEqual(a, b);
  const seen = new Set();
  for (let d = 1; d <= 60; d++) {
    const c = dailyChallenge(`2026-10-${String(d).padStart(2, '0')}`);
    assert.ok(c.track >= 0 && c.track < TRACKS);assert.ok([50, 100, 150].includes(c.cc));
    if (c.goal === 'win') assert.ok(c.cc !== 150);seen.add(c.goal);
  }
  assert.ok(seen.size >= 5, 'tasks vary from day to day');
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('daily challenge counts only on its track and class and when the goal is met', () => {
  const ch = {day: 'x', track: 4, cc: 100, goal: 'mt8'};
  const good = {track: 4, cc: 100, place: 5, finished: true, stats: {mt: {mini: 5, super: 2, ultra: 1}}};
  assert.equal(dailyDone(ch, good), true);
  assert.equal(dailyDone(ch, {...good, track: 3}), false);
  assert.equal(dailyDone(ch, {...good, cc: 150}), false);
  assert.equal(dailyDone(ch, {...good, stats: {mt: {mini: 2}}}), false);
  assert.equal(dailyDone({...ch, goal: 'podium'}, {...good, place: 3}), true);
  assert.ok(DAILY_GOALS.every(g => typeof g.ok === 'function' && g.t));
});

test('rival: picked from the front of the grid, beaten when you finish ahead; both bonuses add XP', () => {
  let seq = 0;const rnd = () => [0, .5, .99][seq++ % 3];
  assert.deepEqual([pickRival([1, 2, 3, 4], rnd), pickRival([1, 2, 3, 4], rnd), pickRival([1, 2, 3, 4], rnd)], [1, 2, 3]);
  assert.equal(pickRival([], rnd), null);
  assert.equal(rivalBeaten([3, 0, 2], 2), true);
  assert.equal(rivalBeaten([2, 0], 2), false);
  assert.equal(rivalBeaten([0, 2], null), false);
  const base = raceXP({place: 4, cc: 50, stats: {hitsTaken: 1}}).total;
  assert.equal(raceXP({place: 4, cc: 50, stats: {hitsTaken: 1, rivalBeaten: true, daily: true}}).total, base + RIVAL_XP + DAILY_XP);
  const r = recordRace({}, {track: 2, cc: 100, place: 4, finished: true, stats: {hitsTaken: 1, rivalBeaten: true, daily: true, stormBest: 5}});
  assert.ok(r.fresh.includes('rival') && r.fresh.includes('daily') && r.fresh.includes('storm'));
});

test('weather achievements: ufo lift and winning in rough weather', () => {
  const base = {place: 1, finished: true, track: 0, cc: 100, stats: {}};
  assert.ok(achById('ufo').t({...base, stats: {ufoLifts: 1}}));
  assert.ok(!achById('ufo').t(base));
  assert.ok(achById('wxwin').t({...base, stats: {wxRough: true}}));
  assert.ok(!achById('wxwin').t({...base, place: 2, stats: {wxRough: true}}));
  assert.ok(!achById('wxwin').t(base));
});
