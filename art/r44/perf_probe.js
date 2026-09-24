// Frame-Profil im Spiel (TEST-Modus): Rennen mit Autopilot, je Frame Dauer, Position, Runde,
// neu kompilierte Shader-Programme und hochgeladene Geometrien/Texturen. Ergebnis: Spitzen mit Kontext.
async function perfProbe(track, maxSec = 170) {
  await new Promise(r => { const w = () => window.rallyTest && rallyTest.ready() ? r() : setTimeout(w, 300); w(); });
  const t = rallyTest.three(), info = t.renderer.info;
  rallyTest.setTrack(track); rallyTest.start(); rallyTest.autopilot(true);
  const frames = []; let last = performance.now(), t0 = last;
  let progs = info.programs.length, geos = info.memory.geometries, texs = info.memory.textures;
  const longs = []; let po = null;
  try { po = new PerformanceObserver(l => { for (const e of l.getEntries()) longs.push([Math.round(e.startTime - t0), Math.round(e.duration)]); }); po.observe({ type: 'longtask', buffered: false }); } catch (e) {}
  await new Promise(res => {
    const step = now => {
      const dt = now - last; last = now;
      const st = rallyTest.state(), p = st.racers[0];
      const np = info.programs.length, ng = info.memory.geometries, nt = info.memory.textures;
      frames.push([Math.round(now - t0), +dt.toFixed(1), Math.round(p.distance), st.state === 'race' ? Math.floor(p.distance / st.length) + 1 : 0, np - progs, ng - geos, nt - texs, info.render.calls]);
      progs = np; geos = ng; texs = nt;
      if (st.state === 'finished' || st.state === 'result' || now - t0 > maxSec * 1000) return res();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  po && po.disconnect();
  const race = frames.filter(f => f[3] > 0), byLap = {};
  for (const f of race) (byLap[f[3]] ||= []).push(f[1]);
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const laps = Object.fromEntries(Object.entries(byLap).map(([k, a]) => [k, { n: a.length, p50: q(a, .5), p95: q(a, .95), p99: q(a, .99), max: Math.max(...a), over50: a.filter(x => x > 50).length, over33: a.filter(x => x > 33).length }]));
  const spikes = frames.filter(f => f[1] > 45).map(f => ({ ms: f[0], dt: f[1], d: f[2], lap: f[3], newProg: f[4], newGeo: f[5], newTex: f[6], calls: f[7] }));
  return { track, name: st0name(), laps, spikes: spikes.slice(0, 80), longs: longs.slice(0, 60), progs: info.programs.length, quality: rallyTest.gfx() };
  function st0name() { try { return document.querySelector('#trackName')?.textContent || ''; } catch (e) { return ''; } }
}
