// R38 Gameplay-Video, Schritt 1: Einzelbilder aus dem Spiel (Hochformat 1080x1920, 30 fps Spielzeit).
// Kopflos-Chrome rendert ohne GPU (~130 ms/Bild), deshalb nicht in Echtzeit aufnehmen, sondern Bild
// fuer Bild: Spiel um 1/30 s weiterschalten (performance.now laeuft virtuell mit, damit Lauflichter,
// Wimpel und Shader im Spieltakt bleiben), Bild + Social-Einblendungen als JPEG speichern und die
// Spielereignisse (Katapult, Airtime, Wertung ...) mit Bildnummer protokollieren. Schnitt und Ton:
// art/r38/edit_video_blender.py. Aufruf: node art/r38/capture_frames.mjs [sekunden]
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync, createWriteStream, rmSync} from 'node:fs';
import net from 'node:net';
import path from 'node:path';
const root = process.cwd(), SECONDS = +(process.argv[2] || 31), FPS = 30;
const FRAMES = path.join(root, '.scratch', 'r38-frames');
rmSync(FRAMES, {recursive: true, force: true}); mkdirSync(FRAMES, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => {const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => {const p = s.address().port; s.close(() => res(p));});});
let server, chrome, ws, seq = 0; const pending = new Map(), logs = [];
const send = (method, params = {}, timeout = 300000) => new Promise((resolve, reject) => {const id = ++seq, timer = setTimeout(() => {pending.delete(id); reject(new Error('CDP timeout: ' + method));}, timeout); pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params}));});
const evaluate = async expression => {const r = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true, userGesture: true}, 300000); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value;};
async function waitFor(check, ms, label) {const t = Date.now(); while (Date.now() - t < ms) {if (await check()) return; await sleep(250);} throw new Error('Timeout: ' + label);}

const PAGE = String.raw`
(()=>{
 const W=1080,H=1920,FPS=30,game=document.getElementById('game');
 const comp=document.createElement('canvas');comp.width=W;comp.height=H;const g=comp.getContext('2d');
 const toastEl=document.getElementById('toast');let lastToast='',cap=null;const events=[];
 const CAPS={'MAGNET-KATAPULT!':['MAGNET-KATAPULT!','#7cf3ff'],'AIRTIME':['AIRTIME!','#ffe45c'],'LOOPING-SCHWUNG!':['LOOPING!','#ff9ad5'],'SUPER-ACHTERBAHN!':['SUPER-ACHTERBAHN!','#ffe45c'],'ACHTERBAHN-SCHWUNG!':['ACHTERBAHN!','#ffe45c'],'ANTI-GRAV-SCHUB!':['KORKENZIEHER!','#7cf3ff']};
 const font=(w,s)=>w+' '+s+'px "Trebuchet MS", "Arial Black", sans-serif';
 const pill=(x,y,w,h,r,fill)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();};
 function outlined(t,x,y,size,col,stroke=14){g.font=font('900',size);g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=stroke;g.strokeStyle='#1a1030';g.strokeText(t,x,y);g.fillStyle=col;g.fillText(t,x,y);}
 function overlay(t,i){
  pill(40,60,470,92,46,'#1a1030cc');g.font=font('900',46);g.textAlign='left';g.textBaseline='middle';g.fillStyle='#fff5d9';g.fillText('MUSHROOM RALLY',74,108);
  if(t<3.8){const a=Math.min(1,t/.4)*Math.min(1,(3.8-t)/.5);g.globalAlpha=Math.max(0,a);outlined('NEUE STRECKE',W/2,560,72,'#fff5d9',12);outlined('MAGNET-KIRMES',W/2,690,124,'#ff3b6b',20);outlined('mit Super-Achterbahn',W/2,820,64,'#ffe45c',12);g.globalAlpha=1;}
  const cls=toastEl.className||'',txt=toastEl.textContent||'';
  if(cls.startsWith('show')&&txt!==lastToast){lastToast=txt;events.push({i,t:+t.toFixed(3),text:txt});
   const key=Object.keys(CAPS).find(k=>txt.startsWith(k));if(key){const c=CAPS[key];cap={text:key==='AIRTIME'?txt.replace(/\s*\u00d7\s*/,' x'):c[0],col:c[1],t0:t};}}
  if(!cls.startsWith('show'))lastToast='';
  if(cap){const k=t-cap.t0;if(k>1.5)cap=null;else{const s=k<.18?.6+.55*(k/.18):k<.3?1.15-.15*((k-.18)/.12):1;g.save();g.translate(W/2,440);g.scale(s,s);g.globalAlpha=Math.max(0,Math.min(1,(1.5-k)/.3));outlined(cap.text,0,0,cap.text.length>14?98:128,cap.col,18);g.restore();g.globalAlpha=1;}}
  const p=rallyTest.racers()[0];if(p&&t>3.8){const kmh=Math.round(Math.abs(p.speed)*(p.czVis||1)*3.6);pill(W-370,H-270,330,150,40,'#1a1030cc');g.textAlign='right';g.fillStyle='#fff5d9';g.font=font('900',98);g.fillText(String(kmh),W-158,H-192);g.font=font('800',34);g.fillText('KM/H',W-66,H-166);}
  pill(40,H-110,640,70,35,'#1a1030aa');g.textAlign='left';g.font=font('800',36);g.fillStyle='#ffe45c';g.fillText('Kostenlos im Browser spielbar',74,H-75);
 }
 const realNow=performance.now.bind(performance);let vt=realNow();
 window.R38={
  begin(){performance.now=()=>vt;rallyTest.dbg.manual=true;return true;},
  frame(i){vt+=1000/FPS;rallyTest.step(2,1/(2*FPS));g.drawImage(game,0,0,W,H);overlay(i/FPS,i);return comp.toDataURL('image/jpeg',.9);},
  end(){performance.now=realNow;rallyTest.dbg.manual=false;return {events,photo:!!rallyTest.ridePhotoURL()};},
  async endCard(){const img=new Image();const url=rallyTest.ridePhotoURL();if(url){img.src=url;await img.decode().catch(()=>{});}
   g.drawImage(game,0,0,W,H);g.fillStyle='#1a1030e8';g.fillRect(0,0,W,H);
   outlined('DEIN ON-RIDE-FOTO',W/2,170,78,'#ffe45c',12);
   // Foto in einen festen Rahmen einpassen (im Hochformat ist es hochkant)
   if(url){const k=Math.min(760/img.width,800/img.height),pw=img.width*k,ph=img.height*k;g.save();g.translate(W/2,660);g.rotate(-.04);
    g.fillStyle='#fff8ea';g.shadowColor='#000a';g.shadowBlur=40;g.fillRect(-pw/2-24,-ph/2-24,pw+48,ph+110);g.shadowBlur=0;g.drawImage(img,-pw/2,-ph/2,pw,ph);
    g.fillStyle='#46343a';g.font=font('800',32);g.textAlign='center';g.textBaseline='middle';g.fillText('ON-RIDE-FOTO \u00b7 MAGNET-KIRMES',0,ph/2+44);g.restore();}
   outlined('MUSHROOM RALLY',W/2,1250,112,'#ff3b6b',16);
   g.textAlign='center';g.textBaseline='middle';g.font=font('800',50);g.fillStyle='#fff5d9';g.fillText('madd1in.github.io/mushroom-rally',W/2,1375);
   g.font=font('700',40);g.fillStyle='#7cf3ff';g.fillText('Kein Download \u00b7 l\u00e4uft im Browser',W/2,1450);
   g.font=font('700',36);g.fillStyle='#fff5d9';['Ein gemeinsames Werk von','Blender \u00b7 Unreal \u00b7 ElevenLabs','Opus 5 \u00b7 Opus 5.5 \u00b7 Astra 6 \u00b7 GLM 5.3'].forEach((l,k)=>g.fillText(l,W/2,1610+k*62));
   return comp.toDataURL('image/jpeg',.92);}
 };return true;})()`;

try {
  const sp = await freePort(), cp = await freePort();
  server = spawn(process.execPath, ['server.cjs', String(sp)], {cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
  await waitFor(async () => {try {return (await fetch('http://127.0.0.1:' + sp)).ok;} catch {return false;}}, 30000, 'server');
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + cp, '--user-data-dir=' + path.join(FRAMES, '..', 'r38-frames-profile'),
    '--window-size=1080,1920', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-features=Translate,CalculateNativeWinOcclusion', 'about:blank'],
    {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
  await waitFor(async () => {try {return (await fetch('http://127.0.0.1:' + cp + '/json/version')).ok;} catch {return false;}}, 45000, 'chrome');
  const tab = await (await fetch('http://127.0.0.1:' + cp + '/json/new?about:blank', {method: 'PUT'})).json();
  ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r, j) => {ws.onopen = r; ws.onerror = j;});
  ws.onmessage = ev => {const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) {const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); return;}
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));};
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false});
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `{let a=0x38f11e5;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}`});
  await send('Page.navigate', {url: 'http://127.0.0.1:' + sp + '/?test=1'});
  await waitFor(() => evaluate('!!window.rallyTest').catch(() => false), 90000, 'test API'); await evaluate('rallyTest.ready()');
  await evaluate(`rallyTest.setTrack(6);rallyTest.setClass(100);rallyTest.autopilot(true);rallyTest.gfx('auto');rallyTest.dbg.camBack=7.4;rallyTest.dbg.camUp=3.5;`); await evaluate('rallyTest.ready()');
  await waitFor(() => evaluate('(()=>{const c=rallyTest.coasters()[0];let fw=false;rallyTest.three().world.traverse(o=>{if(o.isInstancedMesh&&o.count===12)fw=true;});return !!(c&&c.glow&&c.assets.arch&&fw);})()').catch(() => false), 60000, 'coaster+ferris');
  await evaluate('rallyTest.ready()'); await evaluate(PAGE);
  await evaluate('document.getElementById("testPanel").style.display="none";rallyTest.start();'); await evaluate('rallyTest.ready()');
  await evaluate('R38.begin()');
  const N = Math.round(SECONDS * FPS), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const url = await evaluate(`R38.frame(${i})`);
    writeFileSync(path.join(FRAMES, 'f' + String(i).padStart(5, '0') + '.jpg'), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if (i % 90 === 0) console.log('frame', i, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  const info = await evaluate('R38.end()');
  const card = await evaluate('R38.endCard()');
  writeFileSync(path.join(FRAMES, 'endcard.jpg'), Buffer.from(card.slice(card.indexOf(',') + 1), 'base64'));
  writeFileSync(path.join(FRAMES, 'events.json'), JSON.stringify({fps: FPS, frames: N, ...info}, null, 2));
  console.log('DONE', N, 'frames', JSON.stringify(info));
} catch (e) {console.error('FAIL', e.message);} finally {
  if (logs.length) console.log('PAGE LOG', logs.slice(0, 20).join('\n'));
  try {ws?.close();} catch {} chrome?.kill(); server?.kill();
}
