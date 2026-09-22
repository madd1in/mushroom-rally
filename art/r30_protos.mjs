import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9400;
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r30";
mkdirSync(OUT + "/chrome-profile-run4", { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-profile-run4`,
  "--window-size=1024,600", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("http://127.0.0.1:4218/?test=1")}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data);
 if (m.method === 'Network.loadingFailed') net.push('FAIL ' + m.params.errorText + ' ' + m.params.blockedReason + ' ' + (m.params.type||''));
 if (m.method === 'Runtime.consoleAPICalled' && (m.params.type==='error'||m.params.type==='warning')) net.push('CONSOLE ' + m.params.type + ' ' + (m.params.args||[]).map(a=>a.value??a.description??'').join(' ').slice(0,180));
 if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const net = [];
ws.on = null;
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable"); await send("Network.enable"); await send("Runtime.enable");
for (let i = 0; i < 50; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(400); }
for (let i = 0; i < 30; i++) { if (await evalPage("typeof rallyTest !== 'undefined'").catch(() => false) === true) break; await sleep(600); }
await sleep(800);
const protos = await evalPage("(function(){try{return JSON.stringify(rallyTest.items().protos)}catch(e){return 'ERR:'+e.message}})()");
console.log("PROTOS:", protos); console.log("NET:", JSON.stringify(net.slice(0,20)));
const late = await evalPage("(async function(){await new Promise(r=>{const t0=performance.now();const c=()=>rallyTest&&rallyTest.items&&performance.now()-t0>14000?r():setTimeout(c,500);c();});return JSON.stringify(rallyTest.items().protos)})()");
console.log("LATE14s:", late);
const shot = await send("Page.captureScreenshot", { format: "png" });
require("fs").writeFileSync("C:/Users/User/Documents/Playground/mushroom-rally/art/r30/late_rebuild.png", Buffer.from(shot.data, "base64"));
console.log("SHOT saved");
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
