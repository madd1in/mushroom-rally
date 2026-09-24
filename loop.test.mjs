import test from 'node:test';
import assert from 'node:assert/strict';
import {LOOP, loopSpec, loopFrame, loopPoint, loopG, loopGd, agravSegments, agravRoll, agravRings} from './loop.mjs';

const TAU = Math.PI * 2;
// Kleinster Abstand zwischen Bahnteilen, die entlang der Bahn >= far Meter auseinander liegen
function minClear(q, step = .15, far = 30, cell = 6) {
  const pts = [];let s = 0, prev = null;
  for (let x = 0; x <= q.span; x += step) {
    const c = loopPoint(q, x);
    if (prev) s += Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]);
    prev = c;
    for (const off of [-LOOP.half, 0, LOOP.half]) {const p = loopPoint(q, x, off); pts.push([p[0], p[1], p[2], s]);}
  }
  const grid = new Map(), key = (i, j, k) => i + ',' + j + ',' + k;
  for (const p of pts) {const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell)); (grid.get(k) || grid.set(k, []).get(k)).push(p);}
  let best = cell;
  for (const a of pts) {
    const ci = Math.floor(a[0] / cell), cj = Math.floor(a[1] / cell), ck = Math.floor(a[2] / cell);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++)
      for (const b of grid.get(key(ci + di, cj + dj, ck + dk)) || []) if (Math.abs(a[3] - b[3]) >= far) best = Math.min(best, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  return best;
}

test('loop ends join the flat road exactly (no jump at entry or exit)', () => {
  for (const n of [1, 2, 3]) for (const R of [16, 24]) {
    const q = loopSpec(R, n, n % 2 ? 1 : -1);
    for (const x of [0, q.span]) {
      const st = loopFrame(q, x);
      assert.ok(Math.abs(st.a) < 1e-9 && Math.abs(st.b) < 1e-9 && Math.abs(st.lat) < 1e-9, `n${n} R${R} x${x}`);
      assert.ok(Math.abs(st.tf - 1) < 1e-9 && Math.abs(st.nu - 1) < 1e-9, 'flat frame at the ends');
    }
  }
});

test('turn progress is smooth and completes n full turns', () => {
  for (const n of [1, 2, 3]) {
    const q = loopSpec(20, n);
    assert.equal(loopG(q.e, 0), 0); assert.ok(Math.abs(loopG(q.e, 1) - 1) < 1e-12);
    assert.equal(loopGd(q.e, 0), 0); assert.equal(loopGd(q.e, 1), 0);
    const e = 1e-5;
    for (let u = .01; u < 1; u += .013) assert.ok(Math.abs((loopG(q.e, u + e) - loopG(q.e, u - e)) / (2 * e) - loopGd(q.e, u)) < 1e-4, 'derivative at ' + u);
    assert.ok(Math.abs(loopFrame(q, q.span).th - n * TAU) < 1e-9);
  }
});

test('visual road is continuous and the frame stays orthonormal', () => {
  for (const n of [1, 3]) {
    const q = loopSpec(18, n, -1);
    let prev = loopPoint(q, 0), maxStep = 0;
    for (let x = .05; x <= q.span; x += .05) {
      const p = loopPoint(q, x), st = loopFrame(q, x);
      maxStep = Math.max(maxStep, Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]));
      prev = p;
      assert.ok(Math.abs(Math.hypot(st.tf, st.tu, st.tl) - 1) < 1e-9);
      assert.ok(Math.abs(st.tf * st.nf + st.tu * st.nu) < 1e-9, 'normal is perpendicular to the tangent');
    }
    // Bildweg je 5 cm Bahn: hoechstens die Streckung (k), kein Sprung
    assert.ok(maxStep < .05 * 12, 'max step ' + maxStep);
  }
});

test('inclined loops never cut through themselves (single, double, triple)', () => {
  for (const n of [1, 2, 3]) for (const R of [16, 22, 28]) {
    const c = minClear(loopSpec(R, n, 1));
    assert.ok(c >= LOOP.clear, `n${n} R${R}: ${c.toFixed(2)} m`);
  }
});

test('entry and exit pass each other side by side', () => {
  const q = loopSpec(20, 1, 1);
  // ein Viertel und drei Viertel der Drehung liegen auf verschiedenen Seiten
  let l1 = null, l3 = null;
  for (let x = 0; x <= q.span; x += .05) {const st = loopFrame(q, x); if (l1 === null && st.th >= TAU / 4) l1 = st.lat; if (l3 === null && st.th >= TAU * .75) l3 = st.lat;}
  assert.ok(l1 < -LOOP.tilt * .9 && l3 > LOOP.tilt * .9, `${l1} / ${l3}`);
  assert.ok(loopSpec(20, 1, -1).dir === -1);
});

test('anti-grav profiles: wall and over keep the old shape', () => {
  const h = Math.PI / 2, seg = agravSegments('wall', h), a = .7 * h / TAU, b = 1 - .7 * (TAU - h) / TAU;
  assert.ok(Math.abs(seg[0].u1 - a) < 1e-12 && Math.abs(seg[1].u1 - b) < 1e-12);
  assert.ok(Math.abs(agravRoll(seg, (a + b) / 2) - h) < 1e-12);
  const o = agravSegments('over');
  assert.ok(Math.abs(agravRoll(o, .5) - Math.PI) < 1e-12);
});

test('anti-grav profiles turn one way, end at a full turn and hold their faces', () => {
  for (const mode of ['roll', 'over', 'wallrun', 'ceiling', 'switch', 'tour']) {
    const seg = agravSegments(mode);
    assert.equal(agravRoll(seg, 0), 0); assert.ok(Math.abs(agravRoll(seg, 1) - TAU) < 1e-12, mode);
    let prev = 0;
    for (let u = 0; u <= 1; u += .002) {const p = agravRoll(seg, u); assert.ok(p >= prev - 1e-12, mode + ' never turns back'); prev = p;}
  }
  // lange Wandfahrt: mehr als die Haelfte der Zone an der Wand
  const w = agravSegments('wallrun').find(g => g.p0 === g.p1);
  assert.ok(w.u1 - w.u0 > .55 && w.p0 === Math.PI / 2);
  const c = agravSegments('ceiling').find(g => g.p0 === g.p1);
  assert.ok(c.u1 - c.u0 > .55 && c.p0 === Math.PI);
  assert.deepEqual(agravSegments('switch').filter(g => g.p0 === g.p1).map(g => g.p0), [Math.PI / 2, Math.PI * 1.5]);
  assert.equal(agravRings(agravSegments('tour')).length, 3);
  assert.deepEqual(agravRings(agravSegments('roll')), [.3, .55, .8]);
});
