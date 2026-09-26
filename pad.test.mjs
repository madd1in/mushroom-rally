import test from 'node:test';
import assert from 'node:assert/strict';
import {PAD,BTN,deadzone,btnValue,readPad,padPressed,pickPad,cycle} from './pad.mjs';

// Pad im Format der Gamepad-API: 17 Knoepfe, 4 Achsen
function gp({buttons = {}, axes = [0, 0, 0, 0], mapping = 'standard', connected = true} = {}) {
  const b = Array.from({length: 17}, () => ({pressed: false, value: 0}));
  for (const [k, v] of Object.entries(buttons)) b[BTN[k]] = {pressed: v > .5, value: v};
  return {buttons: b, axes, mapping, connected};
}

test('stick dead zone ignores drift and keeps full deflection at 1', () => {
  assert.equal(deadzone(0), 0);
  assert.equal(deadzone(PAD.dead * .9), 0);
  assert.equal(deadzone(-PAD.dead * .9), 0);
  assert.equal(deadzone(1), 1);
  assert.equal(deadzone(-1), -1);
  const half = deadzone(.6);
  assert.ok(half > 0 && half < .6, 'gentle curve below full lock');
  assert.ok(deadzone(.8) > half, 'monotonic');
  assert.equal(deadzone(NaN), 0);
});

test('button values accept Gamepad objects, numbers and booleans', () => {
  assert.equal(btnValue({pressed: true, value: 0}), 1);
  assert.equal(btnValue({pressed: false, value: .4}), .4);
  assert.equal(btnValue(true), 1);
  assert.equal(btnValue(undefined), 0);
});

test('stick left steers left (+1 like the keyboard), right steers right', () => {
  assert.equal(readPad(gp({axes: [-1, 0]})).steer, 1);
  assert.equal(readPad(gp({axes: [1, 0]})).steer, -1);
  assert.equal(readPad(gp({axes: [.05, 0]})).steer, 0);
});

test('d-pad overrides the stick and cancels itself when both sides are held', () => {
  assert.equal(readPad(gp({buttons: {left: 1}, axes: [1, 0]})).steer, 1);
  assert.equal(readPad(gp({buttons: {right: 1}})).steer, -1);
  assert.equal(readPad(gp({buttons: {left: 1, right: 1}, axes: [.5, 0]})).steer, -deadzone(.5));
});

test('A or right trigger is gas, B or left trigger is brake, shoulders hop and drift', () => {
  assert.ok(readPad(gp({buttons: {a: 1}})).gas);
  assert.ok(readPad(gp({buttons: {rt: .8}})).gas);
  assert.ok(!readPad(gp({buttons: {rt: .1}})).gas, 'resting trigger is not gas');
  assert.ok(readPad(gp({buttons: {b: 1}})).brake);
  assert.ok(readPad(gp({buttons: {lt: .9}})).brake);
  assert.ok(readPad(gp({buttons: {lb: 1}})).drift);
  assert.ok(readPad(gp({buttons: {rb: 1}})).drift);
  const idle = readPad(gp());
  assert.ok(!idle.gas && !idle.brake && !idle.drift && !idle.active);
});

test('presses are edges: holding a button fires once, nothing fires without a previous state', () => {
  const up = readPad(gp()), down = readPad(gp({buttons: {x: 1, start: 1}}));
  assert.deepEqual(padPressed(down, null), [], 'button already held when the pad appears');
  assert.deepEqual(padPressed(down, up).sort(), ['start', 'x']);
  assert.deepEqual(padPressed(down, down), []);
  assert.deepEqual(padPressed(up, down), [], 'release is not a press');
});

test('stick pushed far counts as a direction for menus', () => {
  const idle = readPad(gp());
  assert.deepEqual(padPressed(readPad(gp({axes: [.9, 0]})), idle), ['right']);
  assert.deepEqual(padPressed(readPad(gp({axes: [0, -.9]})), idle), ['up']);
  assert.deepEqual(padPressed(readPad(gp({axes: [.4, 0]})), idle), [], 'small push only steers');
});

test('first connected pad wins, standard mapping preferred', () => {
  const odd = gp({mapping: ''}), std = gp(), gone = gp({connected: false});
  assert.equal(pickPad([null, odd, std]), std);
  assert.equal(pickPad([null, odd]), odd);
  assert.equal(pickPad([gone, null]), null);
  assert.equal(pickPad(undefined), null);
});

test('menu selection wraps around', () => {
  assert.equal(cycle(0, -1, 7), 6);
  assert.equal(cycle(6, 1, 7), 0);
  assert.equal(cycle(2, 1, 3), 0);
  assert.equal(cycle(0, 1, 0), 0);
});
