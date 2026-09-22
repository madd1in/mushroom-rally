import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9385;
const OUT = "C:/Users/User/Documents/Playground/mushroom-rally/art/r28";
mkdirSync(OUT + "/live-profile6", { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/live-profile6`,
  "--window-size=1280,800", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-features=Translate,CalculateNativeWinOcclusion", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(500); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("https://madd1in.github.io/mushroom-rally/")}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map(); const logs = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.type + ": " + (m.params.args||[]).map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200));
  if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION: " + JSON.stringify(m.params.exceptionDetails, (k,v)=>k==="callFrames"?v:v, 1).slice(0, 3000));
};
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalPage = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable"); await send("Runtime.enable");
for (let i = 0; i < 60; i++) { if (await evalPage("document.readyState").catch(() => null) === "complete") break; await sleep(500); }
for (let t = 0; t <= 25; t += 5) {
  await sleep(5000);
  const st = await evalPage(`JSON.stringify({loaderHidden:document.querySelector('#loader')?.hidden, loaderDone:document.querySelector('#loader')?.classList.contains('done'), menuHidden:document.querySelector('#menu')?.hidden, trackLoadingHidden:document.querySelector('#trackLoading')?.hidden, canv:!!document.querySelector('#game')})`).catch(e => "eval-failed:" + e.message);
  console.log(`t+${t}s`, st);
}
console.log("LOGS:", JSON.stringify(logs.filter(l=>l.includes("R28DBG")||l.includes("EXCEPTION")).slice(-6), null, 1));
await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`).catch(() => {});
chrome.kill();
process.exit(0);
