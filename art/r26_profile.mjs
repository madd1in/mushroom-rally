// R26 static bump scan: sample the road height profile per track, report curvature hotspots.
// Usage: node art/r26_profile.mjs
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r26";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9364;
const URL = "http://127.0.0.1:4218/?test=1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(OUT, "chrome-profile3"), { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, "chrome-profile3")}`,
  "--window-size=1024,600", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank",
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
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");

const report = {};
for (let track = 0; track < 6; track++) {
  await evalPage(`rallyTest.setTrack(${track})`);
  await sleep(600);
  const raw = await evalPage(`(()=>{
    const L = rallyTest.state().length, step = 2, hs = [], rl = [];
    for (let d = 0; d < L; d += step) { hs.push(rallyTest.track(d).h); }
    return JSON.stringify({L, step, hs});
  })()`);
  const { L, step, hs } = JSON.parse(raw);
  // second difference of height = vertical curvature; jerk proxy: |h(d+2)-2h(d)+h(d-2)| / step^2
  const curv = [];
  for (let i = 1; i < hs.length - 1; i++) {
    curv.push([Math.round(i * step), Math.abs(hs[i + 1] - 2 * hs[i] + hs[i - 1]) / (step * step)]);
  }
  curv.sort((a, b) => b[1] - a[1]);
  const bins = new Map();
  for (const [d, c] of curv) { const k = Math.round(d / 20) * 20; if (!bins.has(k) || bins.get(k) < c) bins.set(k, c); }
  report[track] = { L: Math.round(L), top: [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) };
  console.log("track", track, "L", Math.round(L), "top curvature (d,m_per_m2):", JSON.stringify(report[track].top.slice(0, 6)));
}
writeFileSync(join(OUT, "profile_report.json"), JSON.stringify(report, null, 1));
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
