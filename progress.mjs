// Mushroom Rally R44: Fortschritt - Erfahrungspunkte je Rennen, Fahrerstufen mit Freischaltungen, Erfolge.
// Reine Funktionen (Spiel und Tests). Strecken-Index: 0 Promenade, 1 Canyon, 2 Neon, 3 Geisterhaus, 4 Lava,
// 5 Regenbogen, 6 Magnet-Kirmes.
export const PLACE_XP = [100, 80, 66, 56, 47, 40, 34, 28];
export const CLASS_MUL = {50: 1, 100: 1.25, 150: 1.6};
export const TRACKS = 7;
// R46: Bonus fuer den geschlagenen Rivalen und die geschaffte Tages-Herausforderung
export const RIVAL_XP = 25, DAILY_XP = 60;

// XP eines Rennens mit Aufschluesselung (fuer die Ergebnisanzeige)
export function raceXP({place, cc, stats = {}}) {
  const mt = stats.mt || {}, parts = [['Platz ' + place, PLACE_XP[place - 1] || 20]];
  const add = (k, v) => {if (v > 0) parts.push([k, Math.round(v)]);};
  add('Mini-Turbos', (mt.mini || 0) * 4 + (mt.super || 0) * 8 + (mt.ultra || 0) * 15);
  add('Tricks', (stats.tricks || 0) * 6);
  add('Windschatten', (stats.drafts || 0) * 6);
  add('Überholt', (stats.overtakes || 0) * 3);
  add('Ringe', (stats.rings || 0) * 2);
  add('Plattgemacht', (stats.megaSquash || 0) * 5);
  if (!(stats.hitsTaken > 0)) add('Ohne Treffer', 30);
  if (stats.rivalBeaten) add('Rivale geschlagen', RIVAL_XP);
  if (stats.daily) add('Tagesaufgabe', DAILY_XP);
  const mul = CLASS_MUL[cc] || 1;
  return {parts, mul, total: Math.round(parts.reduce((a, p) => a + p[1], 0) * mul)};
}

// Stufe n (ab 1) braucht insgesamt 150 * (n-1) * n / 2 XP: 0, 150, 450, 900, 1500 ...
export const levelStart = n => 75 * (n - 1) * n;
export function levelOf(xp) {
  let n = 1;
  while (xp >= levelStart(n + 1)) n++;
  return {level: n, into: xp - levelStart(n), need: levelStart(n + 1) - levelStart(n)};
}

const cnt = (s, k) => s[k] || 0;
const mtAll = s => cnt(s.mt || {}, 'mini') + cnt(s.mt || {}, 'super') + cnt(s.mt || {}, 'ultra');
// Erfolge: r = Rennzusammenfassung {track, cc, place, stats, finished, gpWon, owDone}, p = Fortschritt {done, won}
export const ACH = [
  {id: 'win', n: 'Erster Sieg', d: 'Gewinne ein Rennen', t: r => r.place === 1},
  {id: 'podium', n: 'Treppchen', d: 'Fahre unter die ersten drei', t: r => r.place <= 3},
  {id: 'mt10', n: 'Turbo-Profi', d: '10 Mini-Turbos in einem Rennen', t: r => mtAll(r.stats) >= 10},
  {id: 'ultra', n: 'Lila Funken', d: 'Zünde einen Ultra-Turbo', t: r => cnt(r.stats.mt || {}, 'ultra') >= 1},
  {id: 'combo', n: 'Combo-König', d: 'Schaffe eine Turbo-Combo ×4', t: r => cnt(r.stats, 'maxCombo') >= 4},
  {id: 'clean', n: 'Unberührbar', d: 'Gewinne, ohne getroffen zu werden', t: r => r.place === 1 && !(r.stats.hitsTaken > 0)},
  {id: 'tricks', n: 'Luftakrobat', d: '5 Tricks in einem Rennen', t: r => cnt(r.stats, 'tricks') >= 5},
  {id: 'draft', n: 'Windschatten-Jäger', d: '3 Windschatten-Boosts in einem Rennen', t: r => cnt(r.stats, 'drafts') >= 3},
  {id: 'overtake', n: 'Überholkünstler', d: '10 Überholmanöver in einem Rennen', t: r => cnt(r.stats, 'overtakes') >= 10},
  {id: 'coins', n: 'Münzsammler', d: 'Trage alle 10 Münzen gleichzeitig', t: r => cnt(r.stats, 'maxSpores') >= 10},
  {id: 'rocket', n: 'Raketenstart', d: 'Gelungener Raketenstart', t: r => cnt(r.stats, 'rocket') >= 1},
  {id: 'cc150', n: '150cc-Champion', d: 'Gewinne ein Rennen in 150cc', t: r => r.place === 1 && r.cc === 150},
  {id: 'gp', n: 'Grand-Prix-Sieger', d: 'Gewinne einen Grand Prix', t: r => !!r.gpWon},
  {id: 'allTracks', n: 'Weltenbummler', d: 'Fahre jede Strecke einmal', t: (r, p) => (p.done || []).length >= TRACKS},
  {id: 'allWins', n: 'Pokalsammler', d: 'Gewinne auf jeder Strecke', t: (r, p) => (p.won || []).length >= TRACKS},
  {id: 'cow', n: 'Kuhflüsterer', d: 'Almwiese ohne Kuhkontakt', t: r => r.track === 0 && r.finished && !cnt(r.stats, 'cowHits')},
  {id: 'desert', n: 'Wüstenfuchs', d: 'Sonnen-Canyon ohne Sandhose und Zug', t: r => r.track === 1 && r.finished && !cnt(r.stats, 'twisterHits') && !cnt(r.stats, 'trainHits')},
  {id: 'beat', n: 'Taktgefühl', d: '3 Turbos im Takt (Neon-Pilzwald)', t: r => cnt(r.stats, 'beatBoosts') >= 3},
  {id: 'ghost', n: 'Geisterjäger', d: 'Geisterhaus, ohne gepackt zu werden', t: r => r.track === 3 && r.finished && !cnt(r.stats, 'grabs')},
  {id: 'stomp', n: 'Stampfer-Tänzer', d: 'Lava-Feste, ohne plattgedrückt zu werden', t: r => r.track === 4 && r.finished && !cnt(r.stats, 'squashed')},
  {id: 'star', n: 'Sternenkind', d: 'Regenbogenpiste ohne Sternschnuppen-Treffer', t: r => r.track === 5 && r.finished && !cnt(r.stats, 'meteorHits')},
  {id: 'coaster', n: 'Achterbahn-Fan', d: 'Fahre in einem Rennen drei Achterbahnen', t: r => cnt(r.stats, 'coasters') >= 3},
  {id: 'ow', n: 'Entdecker', d: 'Erledige 3 Missionen im Pilzland', t: r => (r.owDone || 0) >= 3},
  {id: 'rival', n: 'Rivalen-Bezwinger', d: 'Lass deinen Rivalen hinter dir', t: r => !!r.stats.rivalBeaten},
  {id: 'storm', n: 'Wettermacher', d: 'Triff 4 Karts mit einer Gewitterwolke', t: r => cnt(r.stats, 'stormBest') >= 4},
  {id: 'daily', n: 'Tagesheld', d: 'Schaffe eine Tages-Herausforderung', t: r => !!r.stats.daily},
  // R47
  {id: 'sun', n: 'Sonnenanbeter', d: 'Hol dir 6 Sonnen-Turbos in einem Rennen', t: r => cnt(r.stats, 'sunBoosts') >= 6},
  {id: 'mirror', n: 'Spiegelmeister', d: 'Gewinne ein Rennen im Spiegel-Modus', t: r => r.place === 1 && !!r.mirror},
  {id: 'mega', n: 'Riesenschritt', d: 'Mache mit dem Riesenpilz 3 Karts platt', t: r => cnt(r.stats, 'megaSquash') >= 3},
  {id: 'ink', n: 'Tintenfisch', d: 'Triff mit einem Tintenpilz 4 Fahrer', t: r => cnt(r.stats, 'inkBest') >= 4},
  // R50: Wetter von Runde zu Runde
  {id: 'ufo', n: 'Nahbegegnung', d: 'Lass dich vom UFO-Strahl anheben', t: r => cnt(r.stats, 'ufoLifts') >= 1},
  {id: 'wxwin', n: 'Wetterfest', d: 'Gewinne bei Gewitter, Schnee oder Sandsturm', t: r => r.place === 1 && !!r.stats.wxRough},
];
export const achById = id => ACH.find(a => a.id === id);

// Rennen verbuchen: Fortschritt aktualisieren (neues Objekt), neue Erfolge und Stufenwechsel zurueckgeben
export function recordRace(prog, r) {
  const p = {xp: prog.xp || 0, ach: [...(prog.ach || [])], done: [...(prog.done || [])], won: [...(prog.won || [])]};
  if (r.finished && r.track >= 0 && r.track < TRACKS && !p.done.includes(r.track)) p.done.push(r.track);
  if (r.place === 1 && r.track >= 0 && r.track < TRACKS && !p.won.includes(r.track)) p.won.push(r.track);
  const xp = raceXP(r), before = levelOf(p.xp).level;
  p.xp += xp.total;
  const after = levelOf(p.xp).level;
  const fresh = ACH.filter(a => !p.ach.includes(a.id) && a.t(r, p)).map(a => a.id);
  p.ach.push(...fresh);
  return {prog: p, xp, fresh, levelUp: after > before ? after : 0, before, after};
}

// Tages-Herausforderung (R46): aus dem Datum (JJJJ-MM-TT) folgen Strecke, Klasse und Aufgabe - fuer alle gleich,
// ohne Server. "Gewinnen" nur in 50/100cc. Geschafft zaehlt sie einmal am Tag (das merkt sich das Spiel).
export const DAILY_GOALS = [
  {id: 'podium', t: 'Fahre aufs Treppchen', ok: (s, pl) => pl <= 3},
  {id: 'win', t: 'Gewinne das Rennen', ok: (s, pl) => pl === 1},
  {id: 'mt8', t: 'Zünde 8 Mini-Turbos', ok: s => mtAll(s) >= 8},
  {id: 'clean', t: 'Komm ohne Treffer ins Ziel', ok: s => !(s.hitsTaken > 0)},
  {id: 'coins', t: 'Trage 10 Münzen gleichzeitig', ok: s => cnt(s, 'maxSpores') >= 10},
  {id: 'tricks', t: 'Schaffe 4 Tricks', ok: s => cnt(s, 'tricks') >= 4},
  {id: 'overtake', t: 'Überhole 8-mal', ok: s => cnt(s, 'overtakes') >= 8},
  {id: 'rival', t: 'Schlage deinen Rivalen', ok: s => !!s.rivalBeaten},
];
function hash(str) {let h = 2166136261; for (const c of str) {h ^= c.charCodeAt(0); h = Math.imul(h, 16777619);} return h >>> 0;}
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function dailyChallenge(day) {
  const h = hash('mr-' + day), g = DAILY_GOALS[h % DAILY_GOALS.length], track = (h >>> 8) % TRACKS;
  const cc = g.id === 'win' ? [50, 100][(h >>> 16) % 2] : [50, 100, 150][(h >>> 16) % 3];
  return {day, track, cc, goal: g.id, text: g.t};
}
export function dailyDone(ch, {track, cc, place, finished, stats = {}}) {
  if (!ch || !finished || track !== ch.track || cc !== ch.cc) return false;
  const g = DAILY_GOALS.find(x => x.id === ch.goal);
  return !!g && g.ok(stats, place);
}
// Rivale (R46): ein KI-Fahrer aus dem vorderen Startfeld, je Rennen neu; geschlagen, wenn man vor ihm ankommt
export function pickRival(aiIds, rnd = Math.random) {return aiIds.length ? aiIds[Math.floor(rnd() * Math.min(3, aiIds.length))] : null;}
export const rivalBeaten = (order, rivalId) => rivalId !== null && rivalId !== undefined && order.indexOf(0) >= 0 && order.indexOf(0) < order.indexOf(rivalId);
