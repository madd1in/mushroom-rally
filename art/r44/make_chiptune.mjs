// Mushroom Rally R44: Chiptune-Effekte selbst synthetisiert (NES-artig) statt Samples.
// Aufruf: node art/r44/make_chiptune.mjs  ->  assets/audio/sfx/chip/*.wav (22,05 kHz, 16 bit, mono)
// Kanaele wie beim NES: Rechteck mit 12,5/25/50 % Tastgrad, Dreieck (4-bit-gestuft), Rauschen per LFSR.
// Jede Stimme: Tonfolge (Arpeggio) oder Tonhoehen-Rutsch, Lautstaerke-Huellkurve, optional Vibrato.
import {writeFileSync, mkdirSync} from 'node:fs';
const SR = 22050, OUT = new URL('../../assets/audio/sfx/chip/', import.meta.url);
mkdirSync(OUT, {recursive: true});
const N = n => 440 * Math.pow(2, (n - 69) / 12);            // MIDI-Note -> Hz
const note = s => { const m = s.match(/^([A-G])(#?)(\d)$/); const k = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[m[1]] + (m[2] ? 1 : 0); return N(12 * (+m[3] + 1) + k); };

function render(dur, voices) {
  const n = Math.round(dur * SR), buf = new Float32Array(n);
  for (const v of voices) {
    let ph = 0, lfsr = 1, noiseVal = 1, noiseAcc = 0;
    const t0 = v.at || 0, len = v.len ?? dur - t0;
    for (let i = Math.round(t0 * SR); i < Math.min(n, Math.round((t0 + len) * SR)); i++) {
      const t = i / SR - t0, u = t / len;
      // Frequenz: Tonfolge (steps: [[t, hz], ...]) oder Rutsch f0 -> f1 (exponentiell)
      let f = v.f0;
      if (v.steps) { for (const [ts, hz] of v.steps) if (t >= ts) f = hz; }
      else if (v.f1) f = v.f0 * Math.pow(v.f1 / v.f0, Math.min(1, t / (v.slide ?? len)));
      if (v.vib) f *= 1 + v.vib[1] * Math.sin(2 * Math.PI * v.vib[0] * t);
      // Huellkurve: kurzer Anschlag, Halten, Abklingen (NES-typisch in groben Stufen)
      const a = v.attack ?? .004, env = t < a ? t / a : Math.pow(Math.max(0, 1 - (u - (v.hold ?? 0)) / (1 - (v.hold ?? 0))), v.decay ?? 1.4);
      const stepEnv = Math.round(Math.min(1, env) * 15) / 15;
      let s;
      // Klatschen: Rauschen, das in zufaelligen kurzen Stoessen an- und abschwillt (8-Bit-Applaus)
      if (v.claps) { const slot = Math.floor(t * v.claps), h = Math.sin(slot * 12.9898 + (v.seed || 0) * 78.233) * 43758.5453, r = h - Math.floor(h), ph2 = t * v.claps - slot; if (r < .35 || ph2 > .55) { buf[i] += 0; continue; } }
      if (v.type === 'noise') {
        noiseAcc += f / SR;
        while (noiseAcc >= 1) { noiseAcc -= 1; const bit = ((lfsr ^ (lfsr >> (v.short ? 6 : 1))) & 1); lfsr = (lfsr >> 1) | (bit << 14); noiseVal = (lfsr & 1) ? 1 : -1; }
        s = noiseVal;
      } else {
        ph = (ph + f / SR) % 1;
        if (v.type === 'tri') s = Math.round((ph < .5 ? ph * 4 - 1 : 3 - ph * 4) * 7.5) / 7.5;
        else s = ph < (v.duty ?? .5) ? 1 : -1;
      }
      buf[i] += s * stepEnv * (v.vol ?? .3);
    }
  }
  // sanftes Ausblenden am Ende gegen Knackser, Begrenzung
  const fade = Math.min(n, Math.round(.012 * SR));
  for (let i = 0; i < fade; i++) buf[n - 1 - i] *= i / fade;
  for (let i = 0; i < n; i++) buf[i] = Math.max(-1, Math.min(1, buf[i]));
  return buf;
}
function wav(name, buf) {
  const b = Buffer.alloc(44 + buf.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + buf.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) b.writeInt16LE(Math.round(buf[i] * 32000), 44 + i * 2);
  writeFileSync(new URL(name + '.wav', OUT), b);
  return {name, ms: Math.round(buf.length / SR * 1000), kb: +(b.length / 1024).toFixed(1)};
}
const arp = (notes, step) => notes.map((n, i) => [i * step, note(n)]);
const report = [];
// Muenze: klassischer Zweiklang H5 -> E6, Rechteck 25 %, zweite Stimme eine Oktave hoeher leise
report.push(wav('coin', render(.42, [
  {type: 'sq', duty: .25, steps: [[0, note('B5')], [.075, note('E6')]], vol: .32, hold: .18, decay: 1.6},
  {type: 'sq', duty: .125, steps: [[0, note('B6')], [.075, note('E7')]], vol: .08, hold: .1, decay: 2}])));
// Item-Box: schnelles Aufwaerts-Arpeggio mit Glitzer
report.push(wav('item', render(.36, [
  {type: 'sq', duty: .5, steps: arp(['C6', 'E6', 'G6', 'C7', 'E7'], .045), vol: .22, hold: .5},
  {type: 'noise', f0: 9000, short: true, at: .2, len: .16, vol: .06, decay: 2}])));
// Runde geschafft: kleine Fanfare G5 C6 E6 G6 (Rechteck + Dreieck-Bass)
report.push(wav('lap', render(.62, [
  {type: 'sq', duty: .25, steps: arp(['G5', 'C6', 'E6', 'G6'], .09), vol: .26, hold: .55, decay: 1.2},
  {type: 'tri', steps: arp(['C4', 'C4', 'G3', 'C4'], .09), vol: .32, hold: .5}])));
// Mini-Turbo in drei Stufen: blau (kurz), rot (hoeher, laenger), lila (Doppelarpeggio)
report.push(wav('mt1', render(.3, [{type: 'sq', duty: .25, steps: arp(['E5', 'A5', 'E6'], .045), vol: .22, hold: .3}, {type: 'noise', f0: 5000, vol: .07, decay: 2.5}])));
report.push(wav('mt2', render(.4, [{type: 'sq', duty: .25, steps: arp(['G5', 'C6', 'G6', 'C7'], .045), vol: .24, hold: .35}, {type: 'noise', f0: 6500, vol: .09, decay: 2}])));
report.push(wav('mt3', render(.55, [{type: 'sq', duty: .125, steps: arp(['A5', 'C#6', 'E6', 'A6', 'C#7', 'E7'], .04), vol: .24, hold: .4}, {type: 'sq', duty: .5, f0: 220, f1: 880, vol: .1, len: .4}, {type: 'noise', f0: 8000, vol: .1, decay: 1.6}])));
// Turbo: Rauschstoss + Rechteck-Aufwaertsrutsch
report.push(wav('boost', render(.5, [{type: 'noise', f0: 3200, vol: .18, decay: 1.2}, {type: 'sq', duty: .5, f0: 180, f1: 820, slide: .32, vol: .16, hold: .2}])));
// Treffer: Abwaertsrutsch mit Crash-Rauschen
report.push(wav('hit', render(.45, [{type: 'sq', duty: .5, f0: 660, f1: 70, vol: .28, decay: 1.3}, {type: 'noise', f0: 1800, vol: .2, decay: 1.8}])));
// Rempler: dumpfer Dreieck-Schlag
report.push(wav('bump', render(.16, [{type: 'tri', f0: 180, f1: 60, vol: .5, decay: 1.5}, {type: 'noise', f0: 900, vol: .08, decay: 3}])));
// Banane: wackelnder Abwaerts-Pfiff
report.push(wav('slip', render(.5, [{type: 'sq', duty: .25, f0: 900, f1: 180, vib: [14, .06], vol: .2, decay: 1.2}])));
// Trick in der Luft: Pfeif-Arpeggio
report.push(wav('trick', render(.3, [{type: 'sq', duty: .125, steps: arp(['D6', 'F#6', 'A6', 'D7'], .05), vol: .22, hold: .4}])));
// Ring: Glockenklang (Rechteck 12,5 % + Quinte)
report.push(wav('ring', render(.35, [{type: 'sq', duty: .125, f0: note('A6'), vol: .16, decay: 2.2}, {type: 'sq', duty: .125, f0: note('E7'), vol: .08, at: .03, decay: 2.4}])));
// Raketenstart: langer Aufwaertsrutsch mit Rauschen
report.push(wav('rocket', render(.8, [{type: 'noise', f0: 2400, vol: .2, decay: 1}, {type: 'sq', duty: .5, f0: 110, f1: 990, slide: .6, vol: .16, hold: .3}])));
// Countdown-Piep und LOS
report.push(wav('beep', render(.14, [{type: 'sq', duty: .5, f0: note('A4'), vol: .24, hold: .6}])));
report.push(wav('go', render(.42, [{type: 'sq', duty: .5, f0: note('A5'), vol: .26, hold: .55}, {type: 'sq', duty: .25, f0: note('A6'), vol: .08, hold: .5}])));
// Jubel der Tribuene: drei Klatsch-Schichten, aufsteigende Pfiffe, ein kleines Hurra-Arpeggio
report.push(wav('cheer', render(1.7, [
  {type: 'noise', f0: 7000, claps: 17, seed: 1, vol: .16, hold: .55, decay: 1.2},
  {type: 'noise', f0: 4200, claps: 13, seed: 2, vol: .13, hold: .55, decay: 1.2},
  {type: 'noise', f0: 9500, short: true, claps: 21, seed: 3, vol: .07, hold: .5, decay: 1.4},
  {type: 'sq', duty: .125, f0: 1150, f1: 1900, slide: .22, vib: [9, .02], at: .05, len: .38, vol: .09, hold: .5},
  {type: 'sq', duty: .125, f0: 1300, f1: 2100, slide: .2, vib: [11, .02], at: .55, len: .34, vol: .08, hold: .5},
  {type: 'sq', duty: .25, steps: arp(['C6', 'E6', 'G6', 'E6', 'G6', 'C7'], .07), at: .2, len: .6, vol: .08, hold: .6}])));
// Sandhose: anschwellendes Rauschen mit Tonhoehen-Rutsch, darueber ein pfeifendes Rechteck
report.push(wav('whirl', render(.9, [{type: 'noise', f0: 1200, vib: [7, .5], vol: .2, attack: .15, hold: .4, decay: 1.2},
  {type: 'sq', duty: .125, f0: 300, f1: 900, slide: .5, vib: [9, .04], vol: .05, attack: .1, hold: .3}])));
// Treibsand: tiefe Dreieck-Blubber
report.push(wav('sand', render(.28, [{type: 'tri', steps: [[0, 110], [.07, 92], [.14, 124]], vol: .38, hold: .3, decay: 1.6}, {type: 'noise', f0: 600, vol: .05, decay: 2}])));
// Dampfpfeife: zwei Toene mit Vibrato (Terz), Rauschen als Dampf
report.push(wav('whistle', render(1.1, [{type: 'sq', duty: .5, f0: note('E5'), vib: [6, .012], vol: .16, attack: .06, hold: .7, decay: 1.4},
  {type: 'sq', duty: .25, f0: note('G#5'), vib: [6, .012], vol: .11, attack: .06, hold: .7, decay: 1.4}, {type: 'noise', f0: 5200, vol: .07, attack: .05, hold: .6}])));
// Schrankenglocke: heller kurzer Schlag
report.push(wav('bell', render(.3, [{type: 'sq', duty: .125, f0: note('C7'), vol: .18, decay: 2.6}, {type: 'sq', duty: .125, f0: note('G7'), vol: .06, decay: 3}])));
console.log(JSON.stringify(report));
