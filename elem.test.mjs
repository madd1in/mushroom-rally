import test from 'node:test';
import assert from 'node:assert/strict';
import {ELEM, PLANS, elemPlan, elemState, elemHeight} from './elem.mjs';

const forms = (plan, step = .5) => {const seq = [];for (let x = 0; x <= plan.span; x += step) {const f = elemState(plan, x).form; if (seq.at(-1) !== f) seq.push(f);} return seq;};

test('plans fill the zone exactly, pieces are contiguous', () => {
  for (const kind of Object.keys(PLANS)) for (const span of [90, 140, 200]) {
    const p = elemPlan(kind, span);
    assert.ok(p.ok, `${kind}/${span} fits`);
    assert.equal(p.pieces[0].x0, 0);
    assert.ok(Math.abs(p.pieces.at(-1).x1 - span) < 1e-9);
    for (let i = 1; i < p.pieces.length; i++) assert.ok(Math.abs(p.pieces[i].x0 - p.pieces[i - 1].x1) < 1e-9);
  }
  assert.equal(elemPlan('see', 60).ok, false, 'too short zones are squeezed and flagged');
});

test('zone ends join the plain road (no height, no hidden road, kart form)', () => {
  for (const kind of Object.keys(PLANS)) {
    const p = elemPlan(kind, 150);
    for (const x of [0, p.span, -5, p.span + 5]) {
      const s = elemState(p, x);
      assert.equal(s.wl, 0); assert.equal(s.dep, 0); assert.equal(s.fly, 0);
      assert.equal(s.hide, false); assert.equal(s.form, 'kart');
    }
  }
});

test('height is continuous and slopes stay drivable', () => {
  for (const kind of Object.keys(PLANS)) {
    const p = elemPlan(kind, 160, {loopSpan: kind === 'see' ? 60 : 0});
    let prev = elemHeight(elemState(p, 0), 0, ELEM.water), maxSlope = 0;
    for (let x = .25; x <= p.span; x += .25) {
      const h = elemHeight(elemState(p, x), 0, ELEM.water);
      maxSlope = Math.max(maxSlope, Math.abs(h - prev) / .25);
      prev = h;
    }
    assert.ok(maxSlope < 1.4, `${kind}: ${maxSlope.toFixed(2)}`);
  }
});

test('lake: shore, boat on the surface, dive to the floor and back', () => {
  const p = elemPlan('see', 170, {loopSpan: 80});
  assert.deepEqual(forms(p), ['kart', 'boat', 'dive', 'boat', 'kart']);
  const deep = p.pieces.find(q => q.type === 'deep');
  assert.ok(p.loopX >= deep.x0 && p.loopX + 80 <= deep.x1, 'spiral sits on the lake floor');
  const s = elemState(p, p.loopX + 40);
  assert.equal(s.dep, -ELEM.depth); assert.equal(s.wl, 1); assert.equal(s.hide, false);
  // an der Oberflaeche ist die Fahrbahn verborgen (Boot), am Grund sichtbar
  const boat = p.pieces.find(q => q.type === 'boat');
  assert.equal(elemState(p, (boat.x0 + boat.x1) / 2).hide, true);
  // Bild am Grund: Wasserspiegel minus Tiefe
  assert.ok(Math.abs(elemHeight(s, 0, ELEM.water) - (ELEM.water - ELEM.depth)) < 1e-9);
});

test('flight: takeoff ramp is visible, the air part hides the road, landing brings it back', () => {
  const p = elemPlan('flug', 130);
  assert.deepEqual(forms(p), ['kart', 'plane', 'kart']);
  const take = p.pieces.find(q => q.type === 'takeoff'), cruise = p.pieces.find(q => q.type === 'cruise');
  assert.equal(elemState(p, (take.x0 + take.x1) / 2).hide, false);
  assert.ok(Math.abs(elemState(p, take.x1).fly - ELEM.takeoff) < 1e-9, 'ramp edge height');
  const c = elemState(p, (cruise.x0 + cruise.x1) / 2);
  assert.equal(c.hide, true); assert.equal(c.fly, ELEM.fly);
  assert.equal(elemHeight(c, 3, 99), ELEM.fly, 'flight height ignores the water level on land');
});

test('boat creek: road hidden on the water, kart again on the shore', () => {
  const p = elemPlan('bach', 80);
  assert.deepEqual(forms(p), ['kart', 'boat', 'kart']);
  assert.ok(elemHeight(elemState(p, 40), 0, ELEM.water) === ELEM.water);
});
