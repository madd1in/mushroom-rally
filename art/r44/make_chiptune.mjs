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
// Kuh: "Muuuh" - tiefes Rechteck, faellt langsam, Vibrato, Nasal-Anteil ueber eine zweite Stimme
report.push(wav('moo', render(1.0, [{type: 'sq', duty: .25, f0: 190, f1: 140, slide: .9, vib: [5, .03], vol: .2, attack: .08, hold: .6, decay: 1.2},
  {type: 'tri', f0: 95, f1: 70, slide: .9, vol: .3, attack: .08, hold: .6}])));
// Geisterhand packt zu: schauriger Abwaertsrutsch mit Rauschen
report.push(wav('grab', render(.55, [{type: 'sq', duty: .125, f0: 700, f1: 160, vib: [11, .05], vol: .16, decay: 1.2}, {type: 'noise', f0: 800, vol: .12, decay: 1.5}])));
// Sternschnuppe: fallender Pfeifton
report.push(wav('meteor', render(1.3, [{type: 'sq', duty: .125, f0: 2400, f1: 500, slide: 1.3, vol: .1, attack: .05, hold: .7}, {type: 'noise', f0: 6000, vol: .04, attack: .3, hold: .7}])));
// Einschlag: Rauschexplosion und tiefer Schlag
report.push(wav('boom', render(.7, [{type: 'noise', f0: 900, vol: .3, decay: 1.4}, {type: 'tri', f0: 120, f1: 40, vol: .45, decay: 1.2}])));
// Donner: langes Grollen mit Knistern
report.push(wav('thunder', render(1.8, [{type: 'noise', f0: 380, vol: .3, attack: .02, hold: .2, decay: 1.1}, {type: 'noise', f0: 2600, short: true, claps: 24, seed: 5, vol: .08, hold: .15, decay: 1.6}, {type: 'tri', f0: 70, f1: 45, vol: .3, hold: .3, decay: 1.2}])));
// Stufenaufstieg: Fanfare (Arpeggio aufwaerts, Schlussakkord)
report.push(wav('levelup', render(1.1, [{type: 'sq', duty: .25, steps: arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], .07), vol: .22, hold: .7, decay: 1.1},
  {type: 'sq', duty: .5, steps: [[0, note('C4')], [.28, note('G4')], [.49, note('C5')]], vol: .12, hold: .7}, {type: 'tri', steps: [[0, note('C3')], [.49, note('C4')]], vol: .3, hold: .7}])));
// Erfolg: heller Doppelklang
report.push(wav('unlock', render(.6, [{type: 'sq', duty: .125, steps: [[0, note('E6')], [.1, note('B6')]], vol: .2, hold: .4, decay: 1.6}, {type: 'sq', duty: .25, steps: [[0, note('E5')], [.1, note('B5')]], vol: .08, hold: .4}])));
// R45 Sternenschild: eigene Unbesiegbarkeits-Melodie als nahtlose Schleife (4 Takte, 200 bpm, 4,8 s).
// Akkorde C - As - B - C (bVI-bVII-I, "heldenhaft"), Rechteck-Arpeggio mit NES-Echo eine Sechzehntel spaeter,
// Gegenstimme in halben Takten, Dreieck-Bass im Oktavsprung, Rauschen als Hi-Hat und Snare. Jede Note endet
// in ihrer Huellkurve bei null - die Schleife knackt nicht an der Nahtstelle.
{
  const E = 60 / 200 / 2, voices = [];
  const seq = (list, mk) => { let t = 0; for (const [n, len] of list) { if (n) voices.push(mk(n, t, len * E)); t += len * E; } return t; };
  const lead = [['E6', 1], ['G6', 1], ['C7', 1], ['G6', 1], ['E6', 1], ['G6', 1], ['C7', 2],
    ['C7', 1], ['G#6', 1], ['D#6', 1], ['G#6', 1], ['C7', 1], ['D#7', 1], ['C7', 2],
    ['D7', 1], ['A#6', 1], ['F6', 1], ['A#6', 1], ['D7', 1], ['F7', 1], ['D7', 1], ['C7', 1],
    ['C7', 1], ['G6', 1], ['E6', 1], ['G6', 1], ['C7', 1], ['E7', 1], ['G7', 1], [null, 1]];
  const loop = seq(lead, (n, at, len) => ({type: 'sq', duty: .25, f0: note(n), at, len, vol: .2, hold: .45, decay: 1.3}));
  // Echo: gleiche Linie, 12,5 % Tastgrad, eine Sechzehntel spaeter und leiser (die letzte Note faellt weg)
  seq(lead.slice(0, -2), (n, at, len) => ({type: 'sq', duty: .125, f0: note(n), at: at + E / 2, len, vol: .07, hold: .3, decay: 1.6}));
  seq([['C6', 4], ['E6', 4], ['D#6', 4], ['C6', 4], ['F6', 4], ['D6', 4], ['E6', 4], ['G6', 4]],
    (n, at, len) => ({type: 'sq', duty: .5, f0: note(n), at, len, vol: .075, attack: .01, hold: .75, decay: 1.2}));
  const bass = []; for (const [lo, hi] of [['C3', 'C4'], ['G#2', 'G#3'], ['A#2', 'A#3'], ['C3', 'C4']]) for (let i = 0; i < 4; i++) bass.push([lo, 1], [hi, 1]);
  bass.splice(-2, 2, ['G2', 1], ['G3', 1]);
  seq(bass, (n, at, len) => ({type: 'tri', f0: note(n), at, len, vol: .34, hold: .6, decay: 1}));
  for (let i = 0; i < 32; i++) {
    voices.push({type: 'noise', f0: 11000, short: true, at: i * E, len: E * .45, vol: i % 2 ? .035 : .055, decay: 2.4});
    if (i % 4 === 2) voices.push({type: 'noise', f0: 2600, at: i * E, len: E * .9, vol: .12, decay: 1.8});
  }
  report.push(wav('star', render(loop, voices)));
}
// R45 Riesenpilz: wachsen - wippendes Aufwaerts-Arpeggio (Grundton/Quinte im Wechsel), Dreieck-Bass eine Oktave tiefer
const growN = ['C4', 'G3', 'D4', 'A3', 'E4', 'B3', 'F#4', 'C#4', 'G#4', 'D#4', 'A#4', 'F4', 'C5', 'G5', 'C6'];
report.push(wav('mega', render(1.15, [{type: 'sq', duty: .5, steps: arp(growN, .07), vol: .22, hold: .85, decay: 1.2},
  {type: 'tri', steps: arp(growN.map(n => n.replace(/\d/, d => String(+d - 1))), .07), vol: .3, hold: .85},
  {type: 'noise', f0: 8000, short: true, at: .98, len: .17, vol: .06, decay: 2}])));
// R45 Riesenpilz vorbei: schrumpfen - dasselbe abwaerts, kuerzer
report.push(wav('shrink', render(.62, [{type: 'sq', duty: .5, steps: arp(['C5', 'G4', 'A#4', 'F4', 'G#4', 'D#4', 'F#4', 'C#4', 'E4'], .06), vol: .2, hold: .7, decay: 1.4},
  {type: 'tri', steps: arp(['C4', 'G3', 'A#3', 'F3', 'G#3', 'D#3', 'F#3', 'C#3', 'E3'], .06), vol: .26, hold: .7}])));
// R45 Plattgemacht (vom Riesenpilz): komischer Plopp mit Quietschen
report.push(wav('squash', render(.34, [{type: 'sq', duty: .25, f0: 320, f1: 1100, slide: .06, vol: .2, decay: 1.6}, {type: 'sq', duty: .125, f0: 1100, f1: 240, at: .07, len: .25, vol: .14, decay: 1.4},
  {type: 'noise', f0: 1400, vol: .12, decay: 2.2}])));
// R45 Tintenpilz: satter Klatscher (tiefes Rauschen), Blubbern nach unten, nasses Nachtropfen
report.push(wav('ink', render(.62, [{type: 'noise', f0: 700, vol: .3, decay: 1.8}, {type: 'tri', f0: 260, f1: 70, slide: .3, vib: [18, .08], vol: .4, decay: 1.2},
  {type: 'sq', duty: .125, steps: [[0, note('E5')], [.09, note('C5')], [.18, note('A4')]], at: .22, len: .36, vol: .07, decay: 1.6}])));
// R45 Tagesaufgabe geschafft: Fanfare mit Schlussakkord und Glitzer
report.push(wav('daily', render(1.3, [{type: 'sq', duty: .25, steps: [[0, note('G5')], [.1, note('C6')], [.2, note('E6')], [.3, note('G6')], [.5, note('E6')], [.6, note('G6')], [.7, note('C7')]], vol: .22, hold: .75, decay: 1.2},
  {type: 'sq', duty: .5, steps: [[0, note('E5')], [.3, note('G5')], [.7, note('E6')]], vol: .1, hold: .75}, {type: 'tri', steps: [[0, note('C3')], [.3, note('G3')], [.7, note('C4')]], vol: .32, hold: .75},
  {type: 'noise', f0: 9000, short: true, at: .7, len: .5, vol: .05, decay: 2}])));
// R48 Riesenpilz-Schleife: stampfender Marsch in a-Moll (a - F - G - a/E, 140 bpm, 4 Takte, 6,9 s), laeuft solange das
// Kart gross ist. Rechteck-Melodie in punktierten Achteln, Quinten-Begleitung, Dreieck-Bass im Oktavsprung, auf jedem
// Schlag ein tiefer "Stampfer" (Dreieck-Rutsch nach unten), Rauschen auf 2 und 4. Noten enden bei null (nahtlos).
{
  const E = 60 / 140 / 2, voices = [];
  const seq = (list, mk) => { let t = 0; for (const [n, len] of list) { if (n) voices.push(mk(n, t, len * E)); t += len * E; } return t; };
  const lead = [['A5', 2], ['E5', 1], ['A5', 1], ['C6', 2], ['B5', 1], ['A5', 1],
    ['F5', 2], ['C5', 1], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
    ['G5', 2], ['D5', 1], ['G5', 1], ['B5', 2], ['A5', 1], ['G5', 1],
    ['A5', 1], ['C6', 1], ['E6', 2], ['D6', 1], ['C6', 1], ['B5', 1], ['G#5', 1]];
  const loop = seq(lead, (n, at, len) => ({type: 'sq', duty: .5, f0: note(n), at, len, vol: .17, hold: .5, decay: 1.2}));
  seq(lead, (n, at, len) => ({type: 'sq', duty: .125, f0: note(n) / 2, at, len, vol: .06, hold: .4, decay: 1.4}));
  seq([['E5', 8], ['C5', 8], ['D5', 8], ['E5', 4], ['G#4', 4]], (n, at, len) => ({type: 'sq', duty: .25, f0: note(n), at, len, vol: .05, attack: .01, hold: .8, decay: 1.1}));
  const bass = []; for (const [lo, hi] of [['A2', 'A3'], ['F2', 'F3'], ['G2', 'G3'], ['A2', 'E3']]) for (let i = 0; i < 4; i++) bass.push([i % 2 ? hi : lo, 2]);
  seq(bass, (n, at, len) => ({type: 'tri', f0: note(n), at, len, vol: .34, hold: .55, decay: 1}));
  for (let b = 0; b < 16; b++) {
    voices.push({type: 'tri', f0: 150, f1: 42, slide: .12, at: b * 2 * E, len: .16, vol: .5, decay: 1.4});
    if (b % 2) voices.push({type: 'noise', f0: 2200, at: b * 2 * E, len: E * .9, vol: .13, decay: 1.8});
    voices.push({type: 'noise', f0: 10000, short: true, at: (b * 2 + 1) * E, len: E * .4, vol: .04, decay: 2.4});
  }
  report.push(wav('megaloop', render(loop, voices)));
}
// R49 Sonnen-Turbo: heller Glockenlauf aufwaerts mit Glitzern (durch den Lichtfleck im Tunnel)
report.push(wav('sun', render(.5, [{type: 'sq', duty: .125, steps: arp(['C6', 'E6', 'G6', 'C7', 'E7', 'G7'], .035), vol: .18, hold: .35, decay: 1.6},
  {type: 'tri', steps: arp(['C5', 'G5', 'C6'], .05), vol: .22, hold: .3, decay: 1.4}, {type: 'noise', f0: 12000, short: true, at: .08, len: .35, vol: .05, decay: 2.2}])));
console.log(JSON.stringify(report));
