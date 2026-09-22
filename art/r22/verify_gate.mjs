// R22 gate verification: load the game headless, start a race, screenshot the new start/finish gate.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r22";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9361;
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
let chromeErr = "";
chrome.stderr.on("data", (d) => { chromeErr += d; });

async function waitForEndpoint() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(500);
  }
  throw new Error("devtools endpoint never came up: " + chromeErr.slice(-500));
}
await waitForEndpoint();
log("chrome up");

let tab;
for (let i = 0; i < 5; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: "PUT" }); if (r.ok) { tab = await r.json(); break; } } catch {}
  await sleep(500);
}
if (!tab) throw new Error("could not create tab");

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws error")); });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page eval failed: " + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
  return r.result.value;
};
await send("Page.enable"); await send("Runtime.enable");

for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
log("dom ready, settling");
await sleep(3500);
await evalPage("(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));return 'ok'})()");

async function clickStart() {
  for (let i = 0; i < 30; i++) {
    const raw = await evalPage(`(()=>{const b=document.querySelector('#start');if(!b||b.hidden)return null;const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
    if (raw) {
      const { x, y } = JSON.parse(raw);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(x), y: Math.round(y), button: "none" });
      await sleep(150);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(x), y: Math.round(y), button: "left", clickCount: 1 });
      await sleep(60);
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(x), y: Math.round(y), button: "left", clickCount: 1 });
      return true;
    }
    await sleep(600);
  }
  return null;
}

const TRACK = parseInt(process.argv[2] ?? "0", 10); // 0 Promenade, 1 Canyon, 4 Lava

async function shot(tag) {
  const s = await send("Page.captureScreenshot", { format: "png" });
  const file = join(OUT, `game_${tag}.png`);
  writeFileSync(file, Buffer.from(s.data, "base64"));
  log("shot ->", file);
  return file;
}

if (TRACK > 0) {
  const picked = await evalPage(`(()=>{const b=document.querySelectorAll('#tracks button')[${TRACK}];if(!b)return null;b.click();return b.textContent.trim()})()`);
  log("track picked:", picked);
  await evalPage("rallyTest.ready ? rallyTest.ready().catch(()=>0) : 0").catch(() => {});
  await sleep(800);
}

const started = await clickStart();
log("race start clicked:", started);
// countdown ~3s then rolling start; first shot during countdown shows the gate from the grid
await sleep(1500);
await shot(TRACK > 0 ? `t${TRACK}_grid` : "grid");
await sleep(4000);
await shot(TRACK > 0 ? `t${TRACK}_rolling` : "rolling");

const errs = await evalPage("JSON.stringify(window.__errs ?? [])");
log("window.__errs =", errs);
const state = await evalPage("(()=>{return JSON.stringify({hud:!document.querySelector('#hud')?.hidden,time:document.querySelector('#time')?.textContent,speed:document.querySelector('#speed')?.textContent,lap:document.querySelector('#lap')?.textContent,place:document.querySelector('#place')?.textContent})})()");
log("race state", state);

await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
await sleep(400);
chrome.kill();
console.log("RESULT " + JSON.stringify({ started, errs: JSON.parse(errs) }));
process.exit(0);
