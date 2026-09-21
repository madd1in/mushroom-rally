// R26 bump mapping: fine-grained autopilot lap per track, find vertical jerk hotspots.
// Usage: node art/r26_smooth.mjs
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r26";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9363;
const URL = "http://127.0.0.1:4218/?test=1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
mkdirSync(join(OUT, "chrome-profile2"), { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, "chrome-profile2")}`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling",
  "--disable-features=Translate,CalculateNativeWinOcclusion",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
let tab;
for (let i = 0; i < 5; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: "PUT" }); if (r.ok) { tab = await r.json(); break; } } catch {} await sleep(500); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable");
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");

const report = {};
for (let track = 0; track < 6; track++) {
  await evalPage(`rallyTest.setTrack(${track})`);
  await evalPage("rallyTest.start()");
  for (let i = 0; i < 40 && await evalPage("rallyTest.tick(30).state") !== "race"; i++) await sleep(250);
  await evalPage("rallyTest.autopilot(true)");
  const samples = [];
  for (let t = 0; t < 2400; t++) {
    await evalPage("rallyTest.tick(8)");
    const s = await evalPage(`(()=>{try{const r=rallyTest.racers()[0];if(!r)return null;return JSON.stringify({d:r.distance,vy:r.vy||0,air:!!r.air,sp:r.speed||0})}catch(e){return null}})()`);
    if (!s) { await sleep(400); continue; }
    const o = JSON.parse(s);
    samples.push(o);
    if (o.d > 950) break; // one lap
  }
  await evalPage("rallyTest.home ? 0 : 0");
  // hotspots: grounded vy jumps
  const hot = [];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].air || samples[i - 1].air) continue;
    const dy = Math.abs(samples[i].vy - samples[i - 1].vy);
    if (dy > 8) hot.push({ d: Math.round(samples[i].d), dy: Math.round(dy) });
  }
  // consolidate into 25 m bins, keep max
  const bins = new Map();
  for (const h of hot) { const k = Math.round(h.d / 25) * 25; bins.set(k, Math.max(bins.get(k) || 0, h.dy)); }
  report[track] = { n: samples.length, hotspots: [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) };
  log("track", track, "samples", samples.length, "hotspots", report[track].hotspots.length);
  await evalPage("location.reload()");
  await sleep(2500);
  for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
  await evalPage("rallyTest.ready()");
}
writeFileSync(join(OUT, "bump_report.json"), JSON.stringify(report, null, 1));
log("done");
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
