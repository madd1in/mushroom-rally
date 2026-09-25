import test from 'node:test';
import assert from 'node:assert/strict';
import {COASTER, BANK, coasterSpec, coasterProfile, coasterSpeedFactor, coasterG, airtimeFloat, launchKick, launchArches, coasterRating, twistAt, bankAngle, bankEnvelope, bankAxis, rollClearance} from './coaster.mjs';

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
  for (const kind of ['super', 'hills', 'dragon', 'bank']) for (const span of [110, 180, 300, 360]) {
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

test('twists: full turns end at a multiple of 2*PI, axis only while turning', () => {
  const s = coasterSpec('dragon', 320);
  assert.equal(s.rolls.length, 1, 'R44: one long corkscrew around the dragon');
  const before = twistAt(s, 1), after = twistAt(s, s.span - 1);
  assert.equal(before.ph, 0); assert.equal(before.axis, 0);
  const turns = s.rolls.reduce((a, r) => a + r.sgn * r.turns, 0);
  assert.ok(Math.abs(after.ph - turns * Math.PI * 2) < 1e-9);
  assert.equal(after.axis, 0);
  const cork = s.rolls[0], mid = twistAt(s, cork.c);
  assert.equal(mid.axis, 7.5);
  // stetig: kein Winkelsprung zwischen benachbarten halben Metern
  let jump = 0, prev = twistAt(s, 0).ph;
  for (let x = .5; x <= s.span; x += .5) {const ph = twistAt(s, x).ph; jump = Math.max(jump, Math.abs(ph - prev)); prev = ph;}
  assert.ok(jump < .35, 'max step ' + jump);
});

test('road edges never dip into the ground during twists (all kinds, all spans)', () => {
  for (const kind of ['super', 'hills', 'dragon']) for (const span of [110, 161, 260, 320, 360]) {
    const s = coasterSpec(kind, span), p = {h: 0, s: 0, k: 0};
    for (const r of s.rolls) for (let x = r.c - r.w; x <= r.c + r.w; x += .25) {
      const t = twistAt(s, x), h = coasterProfile(s, x, p).h;
      assert.ok(rollClearance(h, t.ph, t.axis) >= .39, `${kind}/${span} at ${x}: ${rollClearance(h, t.ph, t.axis)}`);
    }
  }
});

test('twists are long and calm: no short-coaster twist, dragon corkscrew turns slowly', () => {
  for (const span of [110, 161, 300]) assert.equal(coasterSpec('hills', span).rolls.length, 0);
  const r = coasterSpec('dragon', 290).rolls[0];
  assert.ok(r.turns * 2 * Math.PI * 1.5 / (2 * r.w) < .15, 'peak twist rate below .15 rad per metre');
});

test('banking: leans into the curve, capped, pivots on the inner edge', () => {
  assert.ok(bankAngle(1 / 40) < 0, 'left turn raises the right side');
  assert.ok(bankAngle(-1 / 40) > 0);
  assert.equal(bankAngle(0), 0);
  assert.ok(Math.abs(bankAngle(1)) <= BANK.max + 1e-12);
  assert.equal(bankAxis(-.5), BANK.edge);
  assert.equal(bankAxis(.5), -BANK.edge);
  assert.equal(bankAxis(0), 0);
  // um die Innenkante gekippt bleibt jede Stelle der Fahrbahn ueber dem Boden
  for (const ph of [-.9, -.4, .4, .9]) for (let s = -BANK.edge; s <= BANK.edge; s += .5) {
    const L = bankAxis(ph), y = (s - L) * Math.sin(ph);
    assert.ok(y >= -1e-9, `ph ${ph} s ${s}: ${y}`);
  }
});

test('bank envelope: zero at zone ends, zero around twists, full in between', () => {
  const b = coasterSpec('bank', 160);
  assert.equal(bankEnvelope(b, 0), 0); assert.equal(bankEnvelope(b, 160), 0);
  assert.equal(bankEnvelope(b, 80), 1);
  const d = coasterSpec('dragon', 320);
  for (const r of d.rolls) assert.equal(bankEnvelope(d, r.c), 0);
  assert.equal(bankEnvelope(coasterSpec('super', 300), 150), 0, 'kinds without bank never bank');
});

test('bank-only zones have no arches and no rating', () => {
  const b = coasterSpec('bank', 160);
  assert.equal(launchArches(b).length, 0);
  assert.equal(coasterRating({maxOff: 1, airHills: 3, noRating: true}), null);
});
