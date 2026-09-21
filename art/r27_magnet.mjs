// R27 magnet test: drive into an agrav zone with constant steering input (bad driver),
// measure how far the kart drifts sideways and whether it sticks at the energy wall.
// Usage: node art/r27_magnet.mjs <track> <zoneCpA> <zoneCpB> <suffix>
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TRACK = parseInt(process.argv[2] ?? "2", 10);
const CPA = parseFloat(process.argv[3] ?? "8.6");
const CPB = parseFloat(process.argv[4] ?? "10.75");
const SUFFIX = process.argv[5] ?? "before";
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r27";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9366;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
mkdirSync(join(OUT, "chrome-profile"), { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, "chrome-profile")}`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
let tab;
for (let i = 0; i < 5; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?http://127.0.0.1:4218/?test=1`, { method: "PUT" }); if (r.ok) { tab = await r.json(); break; } } catch {} await sleep(500); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable");
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");
await evalPage(`rallyTest.setTrack(${TRACK})`);
await evalPage("rallyTest.start()");
for (let i = 0; i < 40 && await evalPage("rallyTest.tick(30).state") !== "race"; i++) await sleep(250);
await evalPage("rallyTest.autopilot(true)");
const zone = JSON.parse(await evalPage(`JSON.stringify({a:rallyTest.cp(${CPA}),b:rallyTest.cp(${CPB})})`));
log("zone meters", Math.round(zone.a), "->", Math.round(zone.b));

// autopilot until 100 m before the zone, then take over manually
while (true) {
  await evalPage("rallyTest.tick(10)");
  const d = await evalPage("rallyTest.racers()[0].distance");
  const w = ((d - (zone.a - 100)) % 1e6);
  if (d > zone.a - 100) break;
}
await evalPage("rallyTest.autopilot(false)");
const key = (t, c, k, v) => send("Input.dispatchKeyEvent", { type: t, key: k, code: c, windowsVirtualKeyCode: v, nativeVirtualKeyCode: v });
await key("keyDown", "KeyW", "w", 87);
log("manual: gas on");
const samples = [];
for (let i = 0; i < 600; i++) {
  const d = await evalPage("rallyTest.racers()[0].distance");
  const inZone = d > zone.a - 5 && d < zone.b + 5;
  // steering pulses (1 of 3 ticks) - a human countersteering, not a full-lock crash test
  if (inZone && i % 3 === 0) { await key("keyDown", "KeyD", "d", 68); } else { await key("keyUp", "KeyD", "d", 68); }
  await evalPage("rallyTest.tick(6)");
  const s = await evalPage(`(()=>{const r=rallyTest.racers()[0];return JSON.stringify({d:r.distance,off:r.offset,sp:r.speed})})()`);
  const o = JSON.parse(s);
  o.inZone = inZone;
  samples.push(o);
  if (d > zone.b + 60) break;
}
await key("keyUp", "KeyD", "d", 68);
await key("keyUp", "KeyW", "w", 87);
const inZoneSamples = samples.filter(s => s.inZone);
const maxOff = Math.max(0, ...inZoneSamples.map(s => Math.abs(s.off)));
const meanOff = inZoneSamples.reduce((a, s) => a + Math.abs(s.off), 0) / Math.max(1, inZoneSamples.length);
const atWall = inZoneSamples.filter(s => Math.abs(s.off) > 8.0).length;
const minSp = Math.min(...inZoneSamples.map(s => s.sp));
writeFileSync(join(OUT, `magnet_t${TRACK}_${SUFFIX}.json`), JSON.stringify({ zone, samples }, null, 1));
console.log(`RESULT track=${TRACK} ${SUFFIX}: inZone=${inZoneSamples.length} maxOff=${maxOff.toFixed(2)} meanOff=${meanOff.toFixed(2)} atWall=${atWall} minSp=${minSp.toFixed(1)}`);
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
