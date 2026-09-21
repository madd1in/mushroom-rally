// R26 loop visual check: camera in front of the canyon loop, one render + screenshot.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r26";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9365;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(OUT, "chrome-profile4"), { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, "chrome-profile4")}`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
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
await evalPage("rallyTest.setTrack(1)");
await sleep(1200);
const info = await evalPage(`(()=>{
  const q = rallyTest.loops()[0];
  const t = rallyTest.track(q.s-46);
  const {camera, T} = rallyTest.three();
  const fx = t.x, fz = t.z;
  const tangent = Math.atan2(t.x, t.z);
  // stand 46 m before loop entrance, off to the side, look at loop center height
  const side = 20, back = 52, h = 14;
  const sx = fx - Math.sin(tangent)*back + Math.cos(tangent)*side;
  const sz = fz - Math.cos(tangent)*back - Math.sin(tangent)*side;
  camera.position.set(sx, h, sz);
  camera.lookAt(fx + Math.sin(tangent)*q.R*0.6, q.R*1.05, fz + Math.cos(tangent)*q.R*0.6);
  rallyTest.three().renderer.render(rallyTest.three().scene, camera);
  return JSON.stringify({loop:q});
})()`);
await sleep(400);
const s = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(join(OUT, "loop_open_check.png"), Buffer.from(s.data, "base64"));
console.log("shot saved", info);
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
