import test from 'node:test';
import assert from 'node:assert/strict';
import {WX_THEMES,TOD_KEYS,WX_KEYS,EV_KEYS,weatherPlan,calmPlan,weatherMix,weatherLook,WX_BLEND,lerpHex,wxGrip,wxWind,forecast,lapNews} from './weather.mjs';

const THEMES = Object.keys(WX_THEMES);
const plans = th => Array.from({length: 300}, (_, i) => weatherPlan(i * 7919 + 13, th));
const forestBase = {skyTop: 0x2f8fe0, skyBottom: 0xc4ecff, fog: 0xc9e8f5, fogNear: 230, fogFar: 560, exposure: 1.08, hemiSky: 0xffffff, hemiInt: 1.9, sunCol: 0xfff1c9, sunInt: 3.2, head: 0};

test('same seed gives the same plan, different seeds vary', () => {
  assert.deepEqual(weatherPlan(42, 'forest'), weatherPlan(42, 'forest'));
  const seen = new Set(plans('forest').map(p => JSON.stringify(p)));
  assert.ok(seen.size > 30, 'many different forecasts');
});

test('every plan only uses what its theme allows and always changes at least once', () => {
  for (const th of THEMES) for (const p of plans(th)) {
    assert.equal(p.length, 3);
    for (const s of p) {
      assert.ok(TOD_KEYS.includes(s.tod) && WX_KEYS.includes(s.wx), JSON.stringify(s));
      assert.ok(WX_THEMES[th].wx.includes(s.wx), th + ' allows ' + s.wx);
      assert.ok(s.ev === null || (EV_KEYS.includes(s.ev) && WX_THEMES[th].ev.includes(s.ev)), th + ' event ' + s.ev);
    }
    assert.equal(p[0].ev, null, 'lap 1 has no event');
    assert.ok(p[0].wx === 'clear' || p[0].wx === 'clouds' || p[0].wx === 'fog', 'lap 1 starts calm');
    const changed = p.some(s => s.tod !== p[0].tod || s.wx !== p[0].wx || s.ev);
    assert.ok(changed, th + ' ' + JSON.stringify(p));
  }
});

test('dark themes keep their time of day, space has no rain', () => {
  for (const th of ['night', 'haunted', 'rainbow', 'lava']) for (const p of plans(th)) assert.ok(p.every(s => s.tod === 'day'), th);
  for (const p of plans('rainbow')) assert.ok(p.every(s => s.wx === 'clear'));
  const nights = plans('forest').filter(p => p.some(s => s.tod === 'night')).length;
  assert.ok(nights > 20, 'forest races can end at night');
});

test('events fit the sky: rainbows follow rain, eclipses happen in clear daylight, no ufo in a thunderstorm', () => {
  let rainbows = 0, ufos = 0;
  for (const th of THEMES) for (const p of plans(th)) p.forEach((s, i) => {
    if (s.ev === 'rainbow') { rainbows++; assert.ok(['rain', 'storm'].includes(p[i - 1].wx) && s.tod !== 'night'); }
    if (s.ev === 'eclipse') assert.ok(s.tod === 'day' && s.wx === 'clear');
    if (s.ev === 'ufo') { ufos++; assert.notEqual(s.wx, 'storm'); }
    if (s.ev === 'fireflies') assert.ok(s.tod === 'dusk' || s.tod === 'night');
  });
  assert.ok(rainbows > 5 && ufos > 50);
});

test('snow only falls by day or dawn', () => {
  for (const p of plans('forest')) for (const s of p) if (s.wx === 'snow') assert.ok(s.tod === 'day' || s.tod === 'dawn');
});

test('calm plan is the plain theme', () => {
  assert.deepEqual(calmPlan(3), [{tod: 'day', wx: 'clear', ev: null}, {tod: 'day', wx: 'clear', ev: null}, {tod: 'day', wx: 'clear', ev: null}]);
});

test('the change blends in around the finish line and is complete shortly after', () => {
  const p = [{tod: 'day', wx: 'clear', ev: null}, {tod: 'night', wx: 'rain', ev: 'ufo'}, {tod: 'night', wx: 'storm', ev: null}];
  assert.equal(weatherMix(p, -.2).night, 0, 'countdown on the grid');
  assert.equal(weatherMix(p, .5).rain, 0);
  assert.equal(weatherMix(p, 1 - WX_BLEND.pre - .01).night, 0);
  const mid = weatherMix(p, 1.02);
  assert.ok(mid.night > 0 && mid.night < 1 && mid.lap === 1);
  assert.equal(weatherMix(p, 1 + WX_BLEND.post + .01).night, 1);
  assert.equal(weatherMix(p, 1.5).ufo, 1);
  assert.equal(weatherMix(p, 2.5).ufo, 0);
  assert.equal(weatherMix(p, 2.5).storm, 1);
  assert.ok(weatherMix(p, 2.5).rain >= .85, 'a storm brings rain');
  assert.equal(weatherMix(p, 3.4).lap, 2, 'after the finish the last lap stays');
  let prev = 0;
  for (let x = .9; x < 1.2; x += .005) { const v = weatherMix(p, x).night; assert.ok(v >= prev - 1e-9 && v - prev < .12, 'smooth'); prev = v; }
});

test('an eclipse passes within its lap', () => {
  const p = [{tod: 'day', wx: 'clear', ev: null}, {tod: 'day', wx: 'clear', ev: 'eclipse'}];
  assert.ok(weatherMix(p, 1.45).eclipse > .95);
  assert.ok(weatherMix(p, 1.15).eclipse < .05);
  assert.ok(weatherMix(p, 1.8).eclipse < .05);
});

test('look: night and storms darken the sky, fog shortens the view, the plain mix is the theme', () => {
  const plain = weatherLook(forestBase, weatherMix(calmPlan(), 0));
  assert.equal(plain.skyTop, forestBase.skyTop);
  assert.equal(plain.fog, forestBase.fog);
  assert.equal(plain.sunInt, forestBase.sunInt);
  assert.equal(plain.fogFar, forestBase.fogFar);
  assert.equal(plain.stars, 0);
  const night = weatherLook(forestBase, weatherMix([{tod: 'night', wx: 'clear', ev: null}], 0));
  assert.ok(night.sunInt < plain.sunInt * .4 && night.head >= 90 && night.stars > .9 && night.sunGlow === 0);
  const storm = weatherLook(forestBase, weatherMix([{tod: 'day', wx: 'storm', ev: null}], 0));
  assert.ok(storm.sunInt < plain.sunInt * .5 && storm.fogFar < plain.fogFar);
  const fog = weatherLook(forestBase, weatherMix([{tod: 'day', wx: 'fog', ev: null}], 0));
  assert.ok(fog.fogFar < 160 && fog.fogNear < 30);
  const dark = weatherLook({...forestBase, dark: true, stars: true}, weatherMix([{tod: 'day', wx: 'rain', ev: null}], 0));
  assert.ok(dark.stars > 0 && dark.stars < 1, 'clouds hide some stars on dark tracks');
  const clearMix = weatherMix(calmPlan(1), 0);
  const lava = weatherLook({...forestBase, dark: true, stars: false, sunGlow: true}, clearMix);
  assert.equal(lava.stars, 0, 'no stars over the lava fortress');
  assert.equal(lava.moon, 0);
  assert.equal(lava.sunGlow, 1, 'its glowing sun stays');
  const neon = weatherLook({...forestBase, dark: true, stars: true, sunGlow: false}, clearMix);
  assert.equal(neon.stars, 1);
  assert.equal(neon.sunGlow, 0);
  for (const k of ['skyTop', 'skyBottom', 'fog', 'sunCol', 'hemiSky']) for (const l of [plain, night, storm, fog, dark]) assert.ok(Number.isInteger(l[k]) && l[k] >= 0 && l[k] <= 0xffffff, k);
});

test('colour mixing', () => {
  assert.equal(lerpHex(0x000000, 0xffffff, .5), 0x808080);
  assert.equal(lerpHex(0x123456, 0xabcdef, 0), 0x123456);
  assert.equal(lerpHex(0x123456, 0xabcdef, 1), 0xabcdef);
  assert.equal(lerpHex(0x123456, 0xabcdef, 7), 0xabcdef, 'clamped');
});

test('wet road grips less, storms push in gusts and are calm without wind', () => {
  const dry = weatherMix(calmPlan(), 0), wet = weatherMix([{tod: 'day', wx: 'rain', ev: null}], 0), snow = weatherMix([{tod: 'day', wx: 'snow', ev: null}], 0);
  assert.equal(wxGrip(dry), 1);
  assert.ok(wxGrip(wet) < 1 && wxGrip(wet) > .8);
  assert.ok(wxGrip(snow) < 1 && wxGrip(snow) > .8);
  for (let t = 0; t < 30; t += .37) assert.equal(wxWind(wet, t), 0);
  const storm = weatherMix([{tod: 'day', wx: 'storm', ev: null}], 0);
  let calm = 0, max = 0;
  for (let t = 0; t < 60; t += .05) { const w = wxWind(storm, t); if (w === 0) calm++; max = Math.max(max, Math.abs(w)); }
  assert.ok(calm > 100, 'pauses between gusts');
  assert.ok(max > 1 && max < 6, 'gusts are noticeable but not wild');
});

test('forecast and lap announcements', () => {
  const p = [{tod: 'day', wx: 'clear', ev: null}, {tod: 'dusk', wx: 'rain', ev: null}, {tod: 'night', wx: 'storm', ev: 'ufo'}];
  assert.deepEqual(forecast(p, 'forest'), ['☀', '🌇🌧', '🌙⛈🛸']);
  assert.deepEqual(forecast(calmPlan(2), 'night'), ['🌙', '🌙']);
  assert.equal(lapNews(p, 1), '🌧 DÄMMERUNG · REGEN');
  assert.equal(lapNews(p, 2), '🛸 NACHT · GEWITTER · UFO!');
  for (const th of THEMES) for (const q of plans(th)) for (let i = 1; i < 3; i++) { const n = lapNews(q, i); if (n) assert.ok(n.length <= 40, n); }
  assert.equal(lapNews(p, 0), null);
  assert.equal(lapNews(calmPlan(), 1), null, 'nothing new, nothing announced');
});
