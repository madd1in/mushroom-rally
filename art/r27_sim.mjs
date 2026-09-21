// R27 deterministic magnet sim: place the kart at a fixed offset in an agrav zone,
// hold gas + right steer, measure the offset trajectory. Time-trial mode = no traffic.
// Usage: node art/r27_sim.mjs <suffix>   (suffix: before | after)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SUFFIX = process.argv[2] ?? "after";
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r27";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9368;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(OUT, "chrome-profile3"), { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, "chrome-profile3")}`,
  "--window-size=1024,600", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
let tab;
for (let i = 0; i < 5; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?http://127.0.0.1:4218/?test=1`, { method: "PUT" }); if (r.ok) { tab = await r.json(); break; } } catch {} await sleep(500); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } pending.delete(m.id); };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
for (let i = 0; i < 60 && await evalPage("typeof rallyTest==='object' && typeof rallyTest.cp==='function'").catch(() => false) !== true; i++) await sleep(500);
await evalPage("rallyTest.ready()");
await evalPage("rallyTest.setMode('tt')");
await sleep(400);
await evalPage("rallyTest.setTrack(2)");   // Neon: roll zone cp 8.6..10.75
await sleep(600);
await evalPage("rallyTest.start()");
for (let i = 0; i < 60 && await evalPage("rallyTest.tick(30).state").catch(() => "") !== "race"; i++) await sleep(400);
const zone = JSON.parse(await evalPage("JSON.stringify({a:rallyTest.cp(8.6),b:rallyTest.cp(10.75)})"));
console.log("zone", Math.round(zone.a), "->", Math.round(zone.b));

// place kart deterministically just inside the zone, offset +5.5, aligned with the track tangent
await evalPage(`(()=>{
  const r=rallyTest.racers()[0], d=${(zone.a + 4).toFixed(1)}, off=5.5, s=rallyTest.track(d), s2=rallyTest.track(d+3);
  const dx=s2.x-s.x, dz=s2.z-s.z, l=Math.hypot(dx,dz)||1, ang=Math.atan2(dx,dz);
  r.distance=d; r.offset=off; r.x=s.x; r.z=s.z; r.h=ang;
  r.speed=28; r.vx=dx/l*28; r.vz=dz/l*28; r.vy=0; r.air=false; r.stun=0; r.trick=0;
  return 'placed';
})()`);
await evalPage("rallyTest.keys.add('KeyW')");
await evalPage("rallyTest.keys.add('KeyD')");
const traj = [];
for (let i = 0; i < 120; i++) {
  await evalPage("rallyTest.tick(1)");
  if (i % 3 === 0) {
    const s = await evalPage(`(()=>{const r=rallyTest.racers()[0];return JSON.stringify({d:+r.distance.toFixed(1),off:+(r.offset||0).toFixed(2),h:+(r.h||0).toFixed(2),vx:+(r.vx||0).toFixed(1),vz:+(r.vz||0).toFixed(1),sp:+(r.speed||0).toFixed(1)})})()`);
    traj.push(JSON.parse(s));
  }
  if (traj.length && traj[traj.length - 1].d > zone.b + 10) break;
}
await evalPage("rallyTest.keys.delete('KeyW')");
await evalPage("rallyTest.keys.delete('KeyD')");
const inZone = traj.filter(s => s.d >= zone.a && s.d <= zone.b);
const maxOff = Math.max(0, ...inZone.map(s => Math.abs(s.off)));
const endOff = Math.abs(inZone[inZone.length - 1]?.off ?? 0);
const atWall = inZone.filter(s => Math.abs(s.off) > 8.0).length;
writeFileSync(join(OUT, `sim_${SUFFIX}.json`), JSON.stringify({ zone, traj }, null, 1));
console.log(`SIM ${SUFFIX}: inZone=${inZone.length} maxOff=${maxOff.toFixed(2)} endOff=${endOff.toFixed(2)} atWall=${atWall}`);
console.log("traj:", traj.map(s => `${s.off.toFixed(1)}`).join(" "));
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
