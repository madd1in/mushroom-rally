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

// Vorlagen. launch = [Beginn, Ende] der Katapultstrecke, hills = [Mitte, Halbbreite, Hoehe m].
// Die Halbbreite ist ein Anteil der Zonenlaenge; die Hoehen sind absolut.
export const COASTER_KINDS = {
  // Grosse Achterbahn: Top-Hat, Kamelruecken, Bunny-Hop
  super: {launch: [.015, .15], hills: [[.32, .15, 26], [.57, .095, 15], [.74, .07, 9]]},
  // Kurze Magnet-Wellen fuer Strecken mit wenig Platz
  hills: {launch: [.02, .22], hills: [[.45, .14, 14], [.73, .1, 8]]},
};

// Die steilste Stelle eines Buckels hat die Steigung 1,717*h/w. Auf kurzen Zonen wird die Hoehe
// deshalb gedeckelt (hoechstens ~45 Grad), sonst stuende die Bahn im Bild fast senkrecht.
export function coasterSpec(kind, span) {
  const k = COASTER_KINDS[kind] || COASTER_KINDS.super;
  return {
    kind, span,
    launch: [k.launch[0] * span, k.launch[1] * span],
    hills: k.hills.map(([c, w, h]) => ({c: c * span, w: w * span, h: Math.min(h, w * span * .58)})),
  };
}

// Magnetboegen gleichmaessig ueber die Katapultstrecke (Meter ab Zonenbeginn)
export function launchArches(spec, n = 6) {
  const [a, b] = spec.launch, out = [];
  for (let i = 0; i < n; i++) out.push(a + (b - a) * (n > 1 ? i / (n - 1) : .5));
  return out;
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
  const clean = (run.maxOff ?? 99) < 5.5 && !run.hit;
  const air = run.airHills || 0;
  if (clean && air >= 2) return {label: 'SUPER-ACHTERBAHN!', boost: 1.25, spores: 2};
  if (clean || air >= 2) return {label: 'ACHTERBAHN-SCHWUNG!', boost: .9, spores: 1};
  return null;
}
