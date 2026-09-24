// Pilzland (R41): Missionen der Open World, ohne Browser pruefbar. Die Welt ist eine grosse
// Rundstrasse; Missionen haengen an Streckenmetern (d) und Querversatz (off) wie alles andere.
//   pswitch  P-Schalter ueberfahren -> 8 Muenzen erscheinen auf der Strasse voraus, alle einsammeln
//            bevor die Zeit ablaeuft
//   slalom   Bojentore auf dem Fluss der Reihe nach durchfahren (Boot)
//   rings    Alle Ringe eines Flugabschnitts in einem Flug durchfliegen
// Fortschritt: Menge erledigter Missions-IDs (im Spiel im localStorage).

export const OW = {
  coins: 8,          // Muenzen je P-Schalter
  coinTime: 22,      // Sekunden
  coinFirst: 22,     // erste Muenze so viele Meter hinter dem Schalter
  coinGap: 17,       // Abstand zwischen Muenzen (m)
  coinWave: 4.8,     // seitliche Welle der Muenzreihe (m)
  coinR: 2.7,        // Einsammelradius (m, flach)
  resetAfter: 3,     // Sekunden bis der Schalter nach Ablauf wieder bereit ist
  gateHalf: 3.4,     // halbe Breite eines Bojentors (m)
};

// Muenzreihe hinter einem Schalter bei Streckenmeter d0: Schlangenlinie ueber die Fahrbahn
export function coinPattern(d0, n = OW.coins) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({d: d0 + OW.coinFirst + i * OW.coinGap, off: OW.coinWave * Math.sin(i * 1.15)});
  return out;
}

// Zustand einer P-Schalter-Mission. t = Spielzeit in Sekunden.
export function pswitchMission(id, d0) {
  return {id, kind: 'pswitch', d0, state: 'ready', coins: [], got: 0, t0: 0, tEnd: 0};
}
export function pswitchPress(m, t) {
  if (m.state !== 'ready') return false;
  m.state = 'running'; m.t0 = t; m.got = 0;
  m.coins = coinPattern(m.d0).map(c => ({...c, taken: false}));
  return true;
}
// Muenze i einsammeln (nur einmal, nur waehrend die Mission laeuft). Rueckgabe: neu eingesammelt?
export function pswitchCollect(m, i, t) {
  if (m.state !== 'running' || !m.coins[i] || m.coins[i].taken || t - m.t0 > OW.coinTime) return false;
  m.coins[i].taken = true; m.got++;
  if (m.got >= m.coins.length) {m.state = 'done'; m.tEnd = t;}
  return true;
}
// Zeitablauf: laufend -> fehlgeschlagen; nach resetAfter wieder bereit. Erledigt bleibt erledigt.
export function pswitchTick(m, t) {
  if (m.state === 'running' && t - m.t0 > OW.coinTime) {m.state = 'failed'; m.tEnd = t; for (const c of m.coins) c.taken = true;}
  else if (m.state === 'failed' && t - m.tEnd > OW.resetAfter) {m.state = 'ready'; m.coins = []; m.got = 0;}
  return m.state;
}
export function timeLeft(m, t) {
  return m.state === 'running' ? Math.max(0, OW.coinTime - (t - m.t0)) : 0;
}

// Bojen-Slalom: Tore [{d, off}] der Reihe nach. passGate prueft beim Ueberfahren von Tor k, ob man
// zwischen den Bojen war; ein verpasstes Tor setzt den Slalom zurueck.
export function slalomMission(id, gates) {
  return {id, kind: 'slalom', gates, next: 0, state: 'ready', missed: 0};
}
export function slalomPass(m, k, off) {
  if (m.state === 'done' || k !== m.next) return 'ignore';
  const hit = Math.abs(off - m.gates[k].off) <= OW.gateHalf;
  if (!hit) {m.next = 0; m.missed++; m.state = 'ready'; return 'miss';}
  m.next++; m.state = m.next >= m.gates.length ? 'done' : 'running';
  return m.state === 'done' ? 'done' : 'hit';
}

// Ringflug: alle Ringe eines Flugabschnitts in einem Flug (landen setzt zurueck)
export function ringsMission(id, count) {
  return {id, kind: 'rings', count, got: new Set(), state: 'ready'};
}
export function ringsHit(m, ringIndex) {
  if (m.state === 'done' || ringIndex < 0 || ringIndex >= m.count) return false;
  const fresh = !m.got.has(ringIndex);
  m.got.add(ringIndex); m.state = m.got.size >= m.count ? 'done' : 'running';
  return fresh;
}
export function ringsLand(m) {
  if (m.state !== 'done') {m.got.clear(); m.state = 'ready';}
}

// Fortschritt als sortierte ID-Liste (fuer localStorage)
export function progressAdd(list, id) {
  return list.includes(id) ? list : [...list, id].sort();
}
