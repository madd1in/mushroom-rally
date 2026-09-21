// capture JS error stack on rainbow track
import { spawn } from "node:child_process";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9369;
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r28";
import { mkdirSync } from "node:fs";
mkdirSync(OUT + "/chrome-profile", { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-profile`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("http://127.0.0.1:4218/?test=1")}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable");
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");
await evalPage("window.__st=[];window.addEventListener('error',e=>window.__st.push(String(e.error&&e.error.stack||e.message)))");
await evalPage("rallyTest.setTrack(5)");
await sleep(800);
await evalPage("rallyTest.start()");
for (let i = 0; i < 60 && await evalPage("rallyTest.tick(30).state").catch(() => "") !== "race"; i++) await sleep(300);
await evalPage("rallyTest.tick(120)");
const stacks = await evalPage("JSON.stringify(window.__st||[])");
console.log("STACKS:", stacks);
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
