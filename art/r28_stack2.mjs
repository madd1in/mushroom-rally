import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9375;
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r28";
mkdirSync(OUT + "/chrome-profile7", { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-profile7`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("http://127.0.0.1:4218/?test=1")}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__st=[];window.addEventListener('error',e=>window.__st.push(String((e.error&&e.error.stack)||e.message)))" });
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");
await evalPage("rallyTest.setTrack(5)");
await sleep(600);
const raw = await evalPage(`(()=>{const b=document.querySelector('#start');const r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`);
const { x, y } = JSON.parse(raw);
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
await sleep(120);
await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
await sleep(60);
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
await sleep(12000);
await send("Page.captureScreenshot", { format: "png" });
await sleep(1500);
console.log("STACKS:", JSON.stringify(await evalPage("JSON.stringify(window.__st||[])"), null, 1).slice(0, 1600));
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
