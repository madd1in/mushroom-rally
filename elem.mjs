// Elemente-Parcours (R39): Wasser, Tauchen und Luft - das Kart verwandelt sich je nach Element in
// Rennboot, Tauchboot oder Flugzeug. Gefahren wird weiter flach; dieses Modul rechnet fuer eine
// Stelle x (Meter ab Zonenbeginn), wie das Bild der Bahn liegt:
//   wl   Seeanteil 0..1 (0 = Ufer/Land, 1 = See: die Bahn folgt dem Wasserspiegel statt dem Gelaende)
//   dep  Tiefe unter dem Wasserspiegel (<= 0)
//   fly  Flughoehe ueber dem Grund (>= 0)
//   hide Fahrbahn unsichtbar (Flug, und an der Wasseroberflaeche - dort faehrt man als Boot)
//   form 'kart' | 'boat' | 'dive' | 'plane'
// Ein Abschnitt ist eine Folge von Stuecken. Jedes Stueck setzt einen oder mehrere Kanaele auf einen
// Zielwert; innerhalb des Stuecks wird weich (C2) uebergeblendet, danach bleibt der Wert stehen.

const clamp01 = x => Math.max(0, Math.min(1, x));
const sstep = u => {const t = clamp01(u); return t * t * t * (t * (t * 6 - 15) + 10);};

export const ELEM = {
  water: -1.3,    // Wasserspiegel unter dem Ufer (m)
  depth: 7,       // Tauchtiefe (m) - die Spirale taucht mit ihren unteren Bogen ein
  fly: 18,        // Reiseflughoehe (m)
  takeoff: 3.2,   // Hoehe der Startrampen-Kante (m) - bis dahin ist die Fahrbahn sichtbar
  lane: 11,       // halbe Breite der Bootsspur (Bojen)
  lake: 34,       // halbe Seebreite neben der Bahn (m)
};

// Stueck-Arten: Laenge (m, Mindestwert), Kanalziele, Verwandlung
const PIECE = {
  shoreIn: {len: 12, set: {wl: 1}},
  shoreOut: {len: 12, set: {wl: 0}},
  boat: {len: 6},
  dive: {len: 20, set: {dep: -1}},       // dep in Einheiten der Tauchtiefe
  deep: {len: 8},
  rise: {len: 20, set: {dep: 0}},
  takeoff: {len: 14, set: {fly: 'T'}},
  climb: {len: 24, set: {fly: 'H'}, hide: true, form: 'plane'},
  cruise: {len: 6, hide: true, form: 'plane'},
  descend: {len: 24, set: {fly: 'T'}, hide: true, form: 'plane'},
  land: {len: 14, set: {fly: 0}},
};

// Plaene: welches Stueck den Rest der Zone aufnimmt (flex)
export const PLANS = {
  bach: {pieces: ['shoreIn', 'boat', 'shoreOut'], flex: 'boat'},
  see: {pieces: ['shoreIn', 'boat', 'dive', 'deep', 'rise', 'boat', 'shoreOut'], flex: 'deep'},
  flug: {pieces: ['takeoff', 'climb', 'cruise', 'descend', 'land'], flex: 'cruise'},
};

// Plan auf eine Zonenlaenge auslegen. loopSpan: Laenge einer Spirale am Seegrund (optional).
// Liefert Stuecke mit x0/x1, die Lage der Spirale (loopX) und die Tiefe/Flughoehe.
export function elemPlan(kind, span, {loopSpan = 0, depth = ELEM.depth, fly = ELEM.fly} = {}) {
  const plan = PLANS[kind] || PLANS.bach;
  const lens = plan.pieces.map(p => PIECE[p].len);
  const fi = plan.pieces.indexOf(plan.flex);
  if (loopSpan > 0 && kind === 'see') lens[fi] = Math.max(lens[fi], loopSpan + 6);
  const fixed = lens.reduce((a, b) => a + b, 0) - lens[fi];
  const rest = span - fixed;
  const ok = rest >= lens[fi] - 1e-9;
  // Passt es nicht, werden alle Stuecke gleichmaessig gestaucht (Warnung ueber ok)
  if (ok) lens[fi] = rest;
  else {const k = span / (fixed + lens[fi]); for (let i = 0; i < lens.length; i++) lens[i] *= k;}
  let x = 0;
  const pieces = plan.pieces.map((p, i) => {const q = {type: p, x0: x, x1: x + lens[i], ...PIECE[p]}; x += lens[i]; return q;});
  const deep = pieces.find(p => p.type === 'deep');
  const loopX = loopSpan > 0 && deep ? deep.x0 + (deep.x1 - deep.x0 - loopSpan) / 2 : null;
  return {kind, span, pieces, ok, loopX, depth, fly};
}

const CH = ['wl', 'dep', 'fly'];
// Zustand an Stelle x
export function elemState(plan, x, out = {}) {
  const val = {wl: 0, dep: 0, fly: 0};
  let piece = plan.pieces[0];
  for (const p of plan.pieces) {
    const target = {};
    if (p.set) for (const c of CH) if (c in p.set) {
      const v = p.set[c];
      target[c] = c === 'dep' ? v * plan.depth : v === 'T' ? ELEM.takeoff : v === 'H' ? plan.fly : v;
    }
    if (x >= p.x1) {Object.assign(val, target); continue;}
    if (x >= p.x0) {
      piece = p;
      const u = sstep((x - p.x0) / ((p.x1 - p.x0) || 1));
      for (const c in target) val[c] += (target[c] - val[c]) * u;
    }
    break;
  }
  if (x >= plan.span) piece = plan.pieces[plan.pieces.length - 1];
  const inside = x > 0 && x < plan.span;
  out.wl = inside ? val.wl : 0; out.dep = inside ? val.dep : 0; out.fly = inside ? val.fly : 0;
  out.piece = inside ? piece.type : null;
  // An der Wasseroberflaeche faehrt man als Boot ueber die Wellen - die Fahrbahn liegt dort
  // nicht sichtbar im Wasser (sonst flimmert sie mit dem Wasserspiegel)
  const surface = out.wl > .6 && out.dep > -.7 && out.fly < .05;
  out.hide = inside && (!!piece.hide || surface);
  out.form = !inside ? 'kart' : piece.form || (out.wl > .5 ? (out.dep < -1 ? 'dive' : 'boat') : 'kart');
  return out;
}

// Hoehe des Bahnbildes ueber dem Gelaende: im See folgt sie dem Wasserspiegel (wl), dazu Tiefe
// und Flughoehe. ground = Gelaendehoehe an dieser Stelle, water = Wasserspiegel (absolut).
export function elemHeight(st, ground, water) {
  return st.wl * (water + st.dep - ground) + st.fly;
}
