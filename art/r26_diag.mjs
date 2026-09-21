// R26 drive-flow diagnostics: autopilot one lap, telemetry in the agrav zone + bump hotspots.
// Usage: node art/r26_diag.mjs <trackIndex>
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TRACK = parseInt(process.argv[2] ?? "3", 10);
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r26";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9362;
const URL = "http://127.0.0.1:4218/?test=1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

mkdirSync(join(OUT, "chrome-profile"), { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, "chrome-profile")}`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling",
  "--disable-features=Translate,CalculateNativeWinOcclusion",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

async function waitForEndpoint() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {}
    await sleep(500);
  }
  throw new Error("chrome never came up");
}
await waitForEndpoint();
log("chrome up");
let tab;
for (let i = 0; i < 5; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: "PUT" }); if (r.ok) { tab = await r.json(); break; } } catch {}
  await sleep(500);
}
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable"); await send("Runtime.enable");
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");
await evalPage(`rallyTest.setTrack(${TRACK})`);
await evalPage("rallyTest.start()");
for (let i = 0; i < 40 && await evalPage("rallyTest.tick(30).state") !== "race"; i++) await sleep(300);
await evalPage("rallyTest.autopilot(true)");
log("racing, track", TRACK);

const samples = [];
let laps = 1, prevD = 0;
for (let t = 0; t < 700; t++) {
  await evalPage("rallyTest.tick(200)");
  const s = await evalPage(`(()=>{const r=rallyTest.racers()[0],st=rallyTest.state();return JSON.stringify({d:+r.distance.toFixed(1),sp:+(r.speed||0).toFixed(2),off:+(r.offset||0).toFixed(2),y:+(r.y||0).toFixed(2),air:!!r.air,vy:+(r.vy||0).toFixed(2),stuck:+(r.stuckT||0).toFixed(2),boost:+(r.boost||0).toFixed(2),falls:st.stats?st.stats.falls||0:0})})()`);
  const o = JSON.parse(s);
  o.t = t;
  if (o.d < prevD - 500) { laps++; log("lap", laps); }
  prevD = o.d;
  samples.push(o);
  if (laps >= 2) break; // one full lap + start of second is enough
}
const zone = await evalPage(`JSON.stringify({a:rallyTest.cp(11.4),b:rallyTest.cp(13.4),len:Math.round(rallyTest.state().length)})`).catch(() => "null");
await evalPage("rallyTest.autopilot(false)");
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
writeFileSync(join(OUT, `diag_t${TRACK}.json`), JSON.stringify({ zone: JSON.parse(zone), samples }, null, 1));
log("done ->", join(OUT, `diag_t${TRACK}.json`), "samples", samples.length);
process.exit(0);
