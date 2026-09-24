// R39: Platschen und Verwandlungs-Klick als WAV fuer den Videoschnitt - dieselben Rezepte wie die
// Synthese im Spiel (SFX.splash / SFX.transform): Rauschen mit fallendem Tiefpass plus tiefer Plumps,
// bzw. Rauschzischen nach oben und zwei helle Rechteck-Klicks. Aufruf: node art/r39/make_sfx.mjs
import {writeFileSync} from 'node:fs';
const SR = 48000;
function wav(path, samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  writeFileSync(path, buf);
}
let seed = 12345;
const rnd = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1;};
// einpoliger Tiefpass mit zeitabhaengiger Grenzfrequenz
function noiseSweep(dur, f0, f1, vol) {
  const n = Math.round(dur * SR), out = new Float32Array(n);let y = 0;
  for (let i = 0; i < n; i++) {const t = i / n, f = f0 * Math.pow(f1 / f0, t), a = 1 - Math.exp(-2 * Math.PI * f / SR);
    y += a * (rnd() - y); out[i] = y * vol * Math.min(1, i / (SR * .01)) * Math.pow(1 - t, 1.6);}
  return out;
}
const mix = (len, ...parts) => {const out = new Float32Array(Math.round(len * SR));for (const [p, off] of parts) {const o = Math.round(off * SR);for (let i = 0; i < p.length && o + i < out.length; i++) out[o + i] += p[i];}return out;};
// Platschen
const thump = new Float32Array(Math.round(.32 * SR));
for (let i = 0, ph = 0; i < thump.length; i++) {const t = i / SR, f = 150 * Math.pow(55 / 150, Math.min(1, t / .25));ph += 2 * Math.PI * f / SR;thump[i] = Math.sin(ph) * .55 * Math.exp(-t * 12);}
wav('art/r39/sfx_splash.wav', mix(.6, [noiseSweep(.55, 2600, 300, 1.4), 0], [thump, 0]));
// Verwandlung: Zischen nach oben und zwei Klicks
const click = (f, dur = .12) => {const c = new Float32Array(Math.round(dur * SR));for (let i = 0; i < c.length; i++) {const t = i / SR;c[i] = (Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1) * .22 * Math.exp(-t * 28);}return c;};
wav('art/r39/sfx_transform.wav', mix(.45, [noiseSweep(.32, 900, 3400, .9), 0], [click(480), .05], [click(720), .15]));
console.log('ok');
