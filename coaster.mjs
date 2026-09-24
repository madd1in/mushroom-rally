// Magnet-Achterbahn (R38): ein Streckenabschnitt, den die Magnetbahn wie eine Achterbahn faehrt.
// Gefahren wird weiter in der flachen Streckenebene (wie in Rollzonen und Looping) - das
// Hoehenprofil hebt nur das Bild. Dieses Modul rechnet alles, was dafuer ohne Browser pruefbar
// sein muss: Profil (Hoehe, Steigung, Kruemmung), Airtime, Energietempo und Katapult.
//
// Aufbau in Anteilen u der Zonenlaenge: Katapultstrecke (flach, Magnetboegen), dann Huegel
// als kompakte Buckel (1-x^2)^3. Die Form ist C2-glatt und genau null ausserhalb des Buckels -
// Steigung UND Kruemmung sind an den Raendern null, es gibt also keinen Ruck im Bild.

export const COASTER = {
  gravity: 26,        // Bild-Schwerkraft fuer das Energietempo (Spiel-G ist 30, etwas weicher)
  vRef: 44,           // Bezugstempo fuer die Energie: so schnell verlaesst man das Katapult
  minSpeed: .52,      // oben auf dem hoechsten Huegel nie langsamer als 52 % - Rennen bleibt Rennen
  airG: .35,          // unter diesem Lastvielfachen schwebt man (Airtime)
  kick: 7,            // Tempo-Schub je Magnetbogen (m/s)
  launchTop: 46,      // Katapult-Hoechsttempo (m/s)
  launchTime: 2.4,    // so lange traegt das Katapult ueber das normale Turbo-Maximum
};

// Vorlagen. launch = [Beginn, Ende] der Katapultstrecke (oder null), hills = [Mitte, Halbbreite,
// Hoehe m], rolls = [Mitte, Halbbreite, Umdrehungen, Achshoehe m, Zusatzhub m] (R39: Twists - die
// Bahn dreht sich um ihre Laengsachse, bei Achshoehe > 0 um eine Achse UEBER der Fahrbahn, also
// wie ein Korkenzieher um einen Koerper herum), bank = Steilkurven aus der Kruemmung.
// Halbbreiten und Mitten sind Anteile der Zonenlaenge; Hoehen sind absolut.
export const COASTER_KINDS = {
  // Grosse Achterbahn: Top-Hat, Kamelruecken, Bunny-Hop
  super: {launch: [.015, .15], hills: [[.32, .15, 26], [.57, .095, 15], [.74, .07, 9]], rolls: [], bank: false, arches: true},
  // Kurze Magnet-Wellen fuer Strecken mit wenig Platz, mit Zero-G-Roll auf dem ersten Huegel
  hills: {launch: [.02, .22], hills: [[.45, .14, 14], [.73, .1, 8]], rolls: [[.45, .075, 1, 0, 0]], bank: true, arches: true},
  // Drachen-Achterbahn (R39, Dragon-Driftway-Stil): Top-Hat, Kamelruecken mit Zero-G-Roll,
  // Bunny-Hop, dann ein doppelter Korkenzieher um den Drachenkoerper (Achse 7,5 m ueber der Bahn)
  dragon: {launch: [.015, .12], hills: [[.26, .12, 26], [.47, .085, 17], [.63, .05, 8]], rolls: [[.47, .06, 1, 0, 0], [.82, .07, 2, 7.5, 9]], bank: true, arches: true},
  // Magnet-Steilkurve: keine Huegel, nur Neigung aus der Kruemmung (um die Innenkante)
  bank: {launch: null, hills: [], rolls: [], bank: true, arches: false},
};

// Steilkurven: Neigung = Kruemmung x k, gedeckelt. Gekippt wird um die Innenkante (edge), die
// Innenkante bleibt also am Boden, aussen steigt die Bahn wie in einer Velodrom-Kurve.
export const BANK = {k: 34, max: .95, edge: 8.9, fade: 30, near: 14};

const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const sstep = u => {const t = clamp01(u); return t * t * t * (t * (t * 6 - 15) + 10);};

// Die steilste Stelle eines Buckels hat die Steigung 1,717*h/w. Auf kurzen Zonen wird die Hoehe
// deshalb gedeckelt (hoechstens ~45 Grad), sonst stuende die Bahn im Bild fast senkrecht.
// Twists bringen ihren eigenen Zusatzhub mit (ein breiterer Buckel unter der Rolle), damit die
// Fahrbahnkante beim Drehen nicht in den Boden taucht (siehe rollClearance).
export function coasterSpec(kind, span) {
  const k = COASTER_KINDS[kind] || COASTER_KINDS.super;
  const cap = (h, w) => Math.min(h, w * .58);
  const rolls = (k.rolls || []).map(([c, w, turns, axis, lift], i) => ({c: c * span, w: w * span, turns, axis, lift, sgn: i % 2 ? -1 : 1}));
  const spec = {
    kind, span, bank: !!k.bank, arches: !!k.arches,
    launch: k.launch ? [k.launch[0] * span, k.launch[1] * span] : null,
    hills: k.hills.map(([c, w, h]) => ({c: c * span, w: w * span, h: cap(h, w * span)}))
      .concat(rolls.filter(r => r.lift > 0).map(r => ({c: r.c, w: r.w * 1.45, h: cap(r.lift, r.w * 1.45)}))),
    rolls: [],
  };
  // Nur Rollen behalten, bei denen die Fahrbahnkante ueberall mindestens 0,4 m ueber dem Boden
  // bleibt. Auf kurzen Zonen sind die Huegel flacher (Steigungsdeckel) - dort faellt der Twist weg.
  const p = {h: 0, s: 0, k: 0};
  for (const r of rolls) {
    let ok = true;
    for (let x = r.c - r.w; x <= r.c + r.w && ok; x += .5) {
      const u = (x - (r.c - r.w)) / (2 * r.w), ph = r.turns * TAU * sstep(u);
      ok = rollClearance(coasterProfile(spec, x, p).h, ph, r.axis) >= .4;
    }
    if (ok) spec.rolls.push(r);
  }
  return spec;
}

// Magnetboegen gleichmaessig ueber die Katapultstrecke (Meter ab Zonenbeginn)
export function launchArches(spec, n = 6) {
  if (!spec.launch || !spec.arches) return [];
  const [a, b] = spec.launch, out = [];
  for (let i = 0; i < n; i++) out.push(a + (b - a) * (n > 1 ? i / (n - 1) : .5));
  return out;
}

// Twist an Stelle x: Drehwinkel (rad) und die Hoehe der Drehachse ueber der Fahrbahn. Nach einer
// Rolle bleibt der Winkel bei vollen Umdrehungen stehen (2*PI*n) - im Bild identisch mit 0.
export function twistAt(spec, x, out = {ph: 0, axis: 0}) {
  let ph = 0, axis = 0;
  for (const r of spec.rolls || []) {
    const u = (x - (r.c - r.w)) / (2 * r.w);
    if (u <= 0) continue;
    ph += r.sgn * r.turns * TAU * sstep(u);
    if (u < 1) axis = r.axis;
  }
  out.ph = ph; out.axis = axis;
  return out;
}

// Steilkurven-Neigung aus der Kruemmung (rad). Linkskurve (kappa > 0) hebt die rechte Seite.
export function bankAngle(kappa) {
  return Math.max(-BANK.max, Math.min(BANK.max, -kappa * BANK.k)) + 0;   // + 0: nie -0
}

// Wie stark die Steilkurve an Stelle x wirkt: weich an den Zonenenden ein/aus und nie zugleich
// mit einem Twist (dort kippt die Bahn schon selbst, und die Drehachsen waeren verschieden).
export function bankEnvelope(spec, x) {
  if (!spec.bank) return 0;
  const f = Math.min(BANK.fade, spec.span * .2);
  let e = sstep(x / f) * sstep((spec.span - x) / f);
  for (const r of spec.rolls || []) {
    const out = Math.max(0, Math.abs(x - r.c) - r.w);
    e = Math.min(e, sstep(out / BANK.near));
  }
  return e;
}

// Drehachse der Steilkurve: die Innenkante (seitlicher Versatz, Vorzeichen wie der Querversatz)
export function bankAxis(ph) {
  return ph === 0 ? 0 : -Math.sign(ph) * BANK.edge;
}

// Tiefster Punkt der Fahrbahn relativ zum Boden bei Hoehe h, Drehwinkel ph und Achshoehe a
// (Twist um eine Achse ueber der Bahn). Muss ueberall > 0 bleiben.
export function rollClearance(h, ph, a = 0, half = BANK.edge) {
  return h - half * Math.abs(Math.sin(ph)) + a * (1 - Math.cos(ph));
}

// Profil an Stelle x (Meter ab Zonenbeginn): Hoehe h, Steigung s = dh/dx, Kruemmung k = d2h/dx2
export function coasterProfile(spec, x, out = {h: 0, s: 0, k: 0}) {
  let h = 0, s = 0, k = 0;
  if (x >= 0 && x <= spec.span) for (const q of spec.hills) {
    const t = (x - q.c) / q.w;
    if (t <= -1 || t >= 1) continue;
    const a = 1 - t * t;
    h += q.h * a * a * a;
    s += q.h * (-6 * t * a * a) / q.w;
    k += q.h * (-6 * a * a + 24 * t * t * a) / (q.w * q.w);
  }
  out.h = h; out.s = s; out.k = k;
  return out;
}

// Wie viel schneller/langsamer das Bild durch die Huegel laeuft als das Kart auf der Ebene:
// Energieerhaltung relativ zum Bezugstempo (bergauf langsamer, bergab schneller) und die
// laengere Bildstrecke am Hang (sonst liefe der Hang im Zeitraffer).
// Rueckgabe: Faktor fuer den Vorschub auf der Ebene (moveMul) und fuer das Bildtempo.
export function coasterSpeedFactor(p) {
  const e = 1 - 2 * COASTER.gravity * p.h / (COASTER.vRef * COASTER.vRef);
  const vis = Math.max(COASTER.minSpeed, Math.sqrt(Math.max(0, e)));
  return {vis, move: vis / Math.sqrt(1 + p.s * p.s)};
}

// Lastvielfaches senkrecht zur Bahn beim Bildtempo v (m/s): 1 = normal, unter airG = Airtime,
// negativ = es hebt einen aus dem Sitz (nur der Magnet haelt). Spiel-Schwerkraft 30.
export function coasterG(p, v, g = 30) {
  const kap = p.k / Math.pow(1 + p.s * p.s, 1.5);
  return 1 + v * v * kap / g;
}

// Schweben im Bild: wie weit das Kart ueber der Bahn schwebt (Meter), weich gedeckelt
export function airtimeFloat(gLoad) {
  if (!(gLoad < COASTER.airG)) return 0;
  return Math.min(.5, (COASTER.airG - gLoad) * .22);
}

// Katapult: ein Magnetbogen schiebt das Kart an, aber nie ueber das Katapult-Hoechsttempo.
// Rueckwaerts oder im Stand gibt es keinen Schub (man soll nicht rueckwaerts katapultiert werden).
export function launchKick(speed) {
  if (!(speed > 2)) return 0;
  return Math.max(0, Math.min(COASTER.kick, COASTER.launchTop - speed));
}

// Wertung beim Verlassen der Achterbahn: sauber = nie an der Magnetbande, mit Airtime
export function coasterRating(run) {
  if (run.noRating) return null;
  const clean = (run.maxOff ?? 99) < 5.5 && !run.hit;
  const air = run.airHills || 0;
  if (clean && air >= 2) return {label: 'SUPER-ACHTERBAHN!', boost: 1.25, spores: 2};
  if (clean || air >= 2) return {label: 'ACHTERBAHN-SCHWUNG!', boost: .9, spores: 1};
  return null;
}
