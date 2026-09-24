// Loopings und Rollzonen (R39): Geometrie, die ohne Browser pruefbar sein muss.
// Gefahren wird weiter in der flachen Streckenebene - das Bild legt die Bahn nur um. Dieses Modul
// rechnet fuer eine Stelle x (Meter ab Zonenbeginn) den Versatz des Bildes gegenueber der flachen
// Bahn: vor (a), hoch (b) und seitlich (lat), dazu die Tangente fuer Kart und Kamera.
//
// Schraeg-Looping: jede Windung ist gegen die Fahrtrichtung geneigt (seitlicher Versatz -A*sin th).
// Ein- und Ausfahrt laufen dadurch seitlich aneinander vorbei statt sich zu schneiden - ein ebener
// Looping mit Ausfahrt vor der Einfahrt kreuzt sich zwangslaeufig selbst. Mehrere Windungen
// hintereinander ergeben eine Spirale; weil alle gleich geneigt sind, liegen benachbarte
// Windungen in parallelen, versetzten Ebenen und beruehren sich nicht.

const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
export const sstep = u => {const t = clamp01(u); return t * t * t * (t * (t * 6 - 15) + 10);};
export const sdot = u => {const t = clamp01(u); return 30 * t * t * (1 - t) * (1 - t);};
// Integral von sstep auf [0, t]: t^6 - 3t^5 + 2.5t^4 (Wert bei 1: 0,5)
const sInt = u => {const t = clamp01(u); return t * t * t * t * (t * (t - 3) + 2.5);};

export const LOOP = {
  spacing: 1.5,   // Vorschub je Windung auf der flachen Bahn, in Radien
  single: 2.6,    // Laenge des einfachen Loopings auf der flachen Bahn, in Radien
  tilt: 19,       // seitliche Auslenkung der Neigung (m): Ein- und Ausfahrt ziehen aneinander vorbei
  clear: 4,       // Mindestabstand zweier Bahnteile samt Traegern (m) - ein Kart passt dazwischen
  half: 11.2,     // halbe Breite inklusive Stahltraeger
};

// n Windungen mit Radius R, Neigungsseite dir (+1 / -1). span = Laenge auf der flachen Bahn.
// e = Anteil der Zone, auf dem die Drehung weich an- bzw. auslaeuft (dazwischen gleichmaessig).
export function loopSpec(R, n = 1, dir = 1) {
  n = Math.max(1, Math.round(n));
  const e = n === 1 ? .5 : Math.min(.5, .6 / n);
  const span = n === 1 ? Math.max(30, R * LOOP.single) : n * LOOP.spacing * R / (1 - e);
  return {R, n, e, span, dir: dir < 0 ? -1 : 1, A: LOOP.tilt, sig: TAU * R * n / span};
}

// Drehfortschritt 0..1 ueber die Zone: an den Enden Ruck-frei (Ableitung und Kruemmung 0),
// in der Mitte gleichmaessig - so liegen auch mittlere Windungen weit genug auseinander.
export function loopG(e, u) {
  u = clamp01(u);
  const G = u < e ? e * sInt(u / e) : u > 1 - e ? 1 - e - e * sInt((1 - u) / e) : e * .5 + (u - e);
  return G / (1 - e);
}
export function loopGd(e, u) {
  u = clamp01(u);
  return (u < e ? sstep(u / e) : u > 1 - e ? sstep((1 - u) / e) : 1) / (1 - e);
}

// Tropfenform (vor, hoch) bei Drehwinkel th: unten enger, oben runder wie bei einer echten Bahn.
// Bei vollen Umdrehungen genau (0, 0) - der Vorschub kommt allein aus der flachen Bahn, deshalb
// schliesst die Ausfahrt ohne Sprung an (vorher lag sie 0,34 R vor der Strasse danach).
export function loopShape(q, th, out = [0, 0]) {
  const r = q.R * (.66 + .34 * (1 - Math.cos(th)) * .5);
  out[0] = r * Math.sin(th); out[1] = r * (1 - Math.cos(th));
  return out;
}

const _s0 = [0, 0], _s1 = [0, 0], _s2 = [0, 0];
// Rahmen an Stelle x: Versatz (a vor, b hoch, lat seitlich), Tangente (tf, tu, tl - normiert),
// Normale in der Laengsebene (nf, nu), Streckung k (Bildmeter je Bahnmeter) und Nickwinkel.
export function loopFrame(q, x, st = {}) {
  const u = clamp01(x / q.span), th = TAU * q.n * loopG(q.e, u), thp = TAU * q.n * loopGd(q.e, u) / q.span;
  loopShape(q, th, _s0);
  const h = 1e-3;
  loopShape(q, th + h, _s1); loopShape(q, th - h, _s2);
  const fx = 1 + (_s1[0] - _s2[0]) / (2 * h) * thp, fy = (_s1[1] - _s2[1]) / (2 * h) * thp;
  const lat = -q.dir * q.A * Math.sin(th), fl = -q.dir * q.A * Math.cos(th) * thp;
  const f2 = Math.hypot(fx, fy) || 1, f3 = Math.hypot(fx, fy, fl) || 1;
  st.th = th; st.a = _s0[0]; st.b = _s0[1]; st.lat = lat;
  st.tf = fx / f3; st.tu = fy / f3; st.tl = fl / f3;
  st.nf = -fy / f2; st.nu = fx / f2; st.k = f3;
  // Nickwinkel stetig fortgefuehrt - sonst springt er oben um 2*PI
  const p = Math.atan2(fy, fx);
  st.pitch = th + Math.atan2(Math.sin(p - th), Math.cos(p - th));
  return st;
}

// Punkt der Fahrbahn auf gerader Strecke (vor, hoch, seitlich) - fuer Tests und Kollisionspruefung
export function loopPoint(q, x, off = 0, hgt = 0) {
  const st = loopFrame(q, x);
  return [x + st.a + st.nf * hgt, st.b + st.nu * hgt, st.lat + off];
}

// ---------- Rollzonen (Anti-Grav): Drehprofil als Folge aus Drehungen und Haltephasen.
// Eine volle Umdrehung Drehung zaehlt 0,7 der Zone, die Haltephasen ihr Gewicht - 'wall' und
// 'over' sind damit genau die bisherigen Profile. Neu (R39): lange Wand- und Ueberkopffahrten,
// Wandwechsel ueber Kopf und der Rundgang ueber alle vier Seiten.
export const AGRAV_MODES = {
  roll: [],
  wall: null,                                               // Winkel aus der Streckendefinition
  over: [[Math.PI, .3]],
  wallrun: [[Math.PI / 2, 1.2]],                            // lange 90-Grad-Wandfahrt
  ceiling: [[Math.PI, 1.2]],                                // lange Ueberkopffahrt
  switch: [[Math.PI / 2, .6], [Math.PI * 1.5, .6]],         // Wand links, ueber Kopf, Wand rechts
  tour: [[Math.PI / 2, .45], [Math.PI, .45], [Math.PI * 1.5, .45]],   // alle vier Seiten
};
export function agravSegments(mode, holdAngle = Math.PI / 2) {
  const holds = mode === 'wall' ? [[holdAngle, .3]] : AGRAV_MODES[mode] || AGRAV_MODES.roll;
  const parts = [];let prev = 0;
  for (const [ang, w] of holds) {parts.push({p0: prev, p1: ang, w: .7 * (ang - prev) / TAU}, {p0: ang, p1: ang, w}); prev = ang;}
  parts.push({p0: prev, p1: TAU, w: .7 * (TAU - prev) / TAU});
  const W = parts.reduce((s, p) => s + p.w, 0);
  let u = 0;
  return parts.filter(p => p.w > 0).map(p => {const g = {u0: u / W, u1: (u + p.w) / W, p0: p.p0, p1: p.p1}; u += p.w; return g;});
}
// Drehwinkel an Stelle u (0..1) - immer dieselbe Drehrichtung, am Ende genau eine Umdrehung
export function agravRoll(seg, u) {
  u = clamp01(u);
  for (const g of seg) if (u <= g.u1) return g.p0 + (g.p1 - g.p0) * sstep((u - g.u0) / ((g.u1 - g.u0) || 1));
  return TAU;
}
// Mitte jeder Haltephase (dort schweben die Magnetringe); reine Rolle: drei Ringe verteilt
export function agravRings(seg) {
  const holds = seg.filter(g => g.p0 === g.p1).map(g => (g.u0 + g.u1) / 2);
  return holds.length ? holds : [.3, .55, .8];
}
