// R31 verify: early vs late prototype state + menu screenshot (late rebuild proof).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9412;
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r31";
mkdirSync(OUT + "/chrome-profile3", { recursive: true });
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
for (let i = 0; i < 50; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(400); }
for (let i = 0; i < 30; i++) { if (await evalPage("typeof rallyTest !== 'undefined'").catch(() => false) === true) break; await sleep(500); }
await sleep(300);
const early = await evalPage("(function(){try{return JSON.stringify(rallyTest.items().protos)}catch(e){return '{}'}})()");
await sleep(14000);
const late = await evalPage("(function(){try{return JSON.stringify(rallyTest.items().protos)}catch(e){return '{}'}})()");
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT + "/late_rebuild.png", Buffer.from(shot.data, "base64"));
const e1 = JSON.parse(early), l1 = JSON.parse(late);
const countTrue = (o) => Object.values(o).filter(Boolean).length;
console.log("EARLY:", countTrue(e1), "/25 loaded");
console.log("LATE:", countTrue(l1), "/25 loaded");
console.log("DOM:", await evalPage("(function(){const s=document.querySelector('#start');const m=document.querySelector('#menu');const l=document.querySelector('#loader');return JSON.stringify({start:!!s,startHidden:s?s.hidden:null,menuHidden:m?m.hidden:null,loaderHidden:l?l.hidden:null,loaderDone:l?l.classList.contains('done'):null})})()"));
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
