import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9390;
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r30";
mkdirSync(OUT + "/chrome-profile", { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-profile`,
  "--window-size=1280,720", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
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
for (let i = 0; i < 40; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
await evalPage("rallyTest.ready()");
await evalPage("rallyTest.start()");
for (let i = 0; i < 60 && await evalPage("rallyTest.tick(30).state").catch(() => "") !== "race"; i++) await sleep(300);
// drive a bit so the finish is through the gate area, then finish now + capture fireworks
await evalPage("rallyTest.tick(240)");
await evalPage("rallyTest.finishNow()");
await sleep(1600);
const s = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "/fireworks.png", Buffer.from(s.data, "base64"));
console.log("shot fireworks saved");
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
