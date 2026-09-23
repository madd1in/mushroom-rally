import test from 'node:test';
import assert from 'node:assert/strict';
import {COASTER, coasterSpec, coasterProfile, coasterSpeedFactor, coasterG, airtimeFloat, launchKick, launchArches, coasterRating} from './coaster.mjs';

const spec = coasterSpec('super', 300);

test('profile is flat on the launch track and at both ends of the zone', () => {
  for (const x of [-5, 0, spec.launch[0], spec.launch[1], spec.span, spec.span + 10]) {
    const p = coasterProfile(spec, x);
    assert.equal(p.h, 0); assert.equal(p.s, 0); assert.equal(p.k, 0);
  }
});

test('hill crests reach their height with zero slope and negative curvature', () => {
  for (const q of spec.hills) {
    const p = coasterProfile(spec, q.c);
    assert.ok(Math.abs(p.h - q.h) < 1e-9);
    assert.ok(Math.abs(p.s) < 1e-9);
    assert.ok(p.k < 0);
  }
});

test('profile is C2-smooth: slope and curvature match finite differences everywhere', () => {
  const e = 1e-3;
  let maxJump = 0;
  for (let x = 0; x <= spec.span; x += .37) {
    const p = coasterProfile(spec, x), a = coasterProfile(spec, x - e), b = coasterProfile(spec, x + e);
    assert.ok(Math.abs((b.h - a.h) / (2 * e) - p.s) < 1e-3, 'slope at ' + x);
    assert.ok(Math.abs((b.s - a.s) / (2 * e) - p.k) < 1e-3, 'curvature at ' + x);
    const n = coasterProfile(spec, x + .37);
    maxJump = Math.max(maxJump, Math.abs(n.k - p.k));
  }
  assert.ok(maxJump < .02, 'no curvature steps (jerk) ' + maxJump);
});

test('slopes stay drivable (at most ~46 degrees) on both kinds', () => {
  for (const kind of ['super', 'hills']) for (const span of [180, 300, 360]) {
    const s = coasterSpec(kind, span);
    let m = 0;
    for (let x = 0; x <= span; x += .5) m = Math.max(m, Math.abs(coasterProfile(s, x).s));
    assert.ok(m < 1.05, `${kind}/${span}: ${m}`);
  }
});

test('energy speed: slower uphill, never below the floor, unchanged on the flat', () => {
  const flat = coasterSpeedFactor({h: 0, s: 0});
  assert.equal(flat.vis, 1); assert.equal(flat.move, 1);
  const top = coasterSpeedFactor(coasterProfile(spec, spec.hills[0].c));
  assert.ok(top.vis < .7 && top.vis >= COASTER.minSpeed);
  const low = coasterSpeedFactor(coasterProfile(spec, spec.hills[2].c));
  assert.ok(low.vis > top.vis, 'small hill costs less speed than the top hat');
  // am Hang laeuft der Vorschub auf der Ebene langsamer als das Bild (laengerer Bildweg)
  const x = spec.hills[0].c - spec.hills[0].w * .45, side = coasterSpeedFactor(coasterProfile(spec, x));
  assert.ok(side.move < side.vis);
});

test('crests give airtime at speed, valleys press into the seat', () => {
  const c = coasterProfile(spec, spec.hills[1].c);
  assert.ok(coasterG(c, 30) < COASTER.airG);
  assert.ok(airtimeFloat(coasterG(c, 30)) > 0);
  assert.equal(coasterG(c, 0), 1);
  const valley = coasterProfile(spec, (spec.hills[0].c + spec.hills[0].w + spec.hills[1].c - spec.hills[1].w) / 2 - 3);
  assert.ok(coasterG(valley, 30) >= 1);
  assert.equal(airtimeFloat(1), 0);
  assert.ok(airtimeFloat(-50) <= .5);
});

test('launch kicks forward only, capped at the launch top speed', () => {
  assert.equal(launchKick(0), 0);
  assert.equal(launchKick(-10), 0);
  assert.equal(launchKick(NaN), 0);
  assert.equal(launchKick(20), COASTER.kick);
  assert.equal(launchKick(COASTER.launchTop - 2), 2);
  assert.equal(launchKick(COASTER.launchTop + 5), 0);
  let v = 25; for (let i = 0; i < 6; i++) v += launchKick(v);
  assert.equal(v, COASTER.launchTop);
});

test('arches are spread over the launch track in order', () => {
  const a = launchArches(spec, 6);
  assert.equal(a.length, 6);
  assert.equal(a[0], spec.launch[0]); assert.equal(a[5], spec.launch[1]);
  for (let i = 1; i < a.length; i++) assert.ok(a[i] > a[i - 1]);
});

test('rating rewards clean runs with airtime', () => {
  assert.equal(coasterRating({maxOff: 2, airHills: 3}).label, 'SUPER-ACHTERBAHN!');
  assert.equal(coasterRating({maxOff: 7, airHills: 2}).label, 'ACHTERBAHN-SCHWUNG!');
  assert.equal(coasterRating({maxOff: 2, airHills: 0}).label, 'ACHTERBAHN-SCHWUNG!');
  assert.equal(coasterRating({maxOff: 7, airHills: 1}), null);
  assert.equal(coasterRating({maxOff: 2, airHills: 3, hit: true}).label, 'ACHTERBAHN-SCHWUNG!');
});
