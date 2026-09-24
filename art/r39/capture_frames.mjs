// R39 Update-Video, Schritt 1: Einzelbilder (Hochformat 1080x1920, 30 fps Spielzeit) als Montage aus
// vier Szenen des Elemente-Parcours. Je Szene: Strecke waehlen, Start abwarten (Echtzeit), Spieler und
// drei Rivalen kurz vor die Zone setzen, Kamera einschwingen lassen, dann Bild fuer Bild aufnehmen
// (performance.now laeuft virtuell mit). Schnitt und Ton: art/r39/edit_video_blender.py.
// Aufruf: node art/r39/capture_frames.mjs
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import net from 'node:net';
import path from 'node:path';
const root = process.cwd(), FPS = 30;
const FRAMES = path.join(root, '.scratch', 'r39-frames');
rmSync(FRAMES, {recursive: true, force: true}); mkdirSync(FRAMES, {recursive: true});
// [Strecke, Sekunden, Titel, Untertitel, Vorlauf vor der Zone (m)]
const SCENES = [
  [6, 15, 'WILDWASSER-SPIRALE', 'Boot \u00b7 abtauchen \u00b7 Spirale \u00b7 auftauchen', 34],
  [2, 9, 'NEON-RIFF', 'Dreifach-Helix taucht ein', 26],
  [4, 7, 'FEUERFLUG', 'Startrampe \u00b7 Flugzeug \u00b7 Ringe', 22],
  [3, 7, 'GEISTERSEE', 'Tauchgang', 26],
];
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
 const toastEl=document.getElementById('toast');let lastToast='',cap=null,scene=null;const events=[];
 const CAPS={'RENNBOOT!':['RENNBOOT!','#7cf3ff'],'TAUCHGANG!':['TAUCHGANG!','#5ad1ff'],'FLUGZEUG!':['FLUGZEUG!','#ffe45c'],'\u00dcBERKOPF!':['\u00dcBERKOPF!','#ff9ad5'],'RING':['RING-TURBO!','#ffe45c']};
 const font=(w,s)=>w+' '+s+'px "Trebuchet MS", "Arial Black", sans-serif';
 const pill=(x,y,w,h,r,fill)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();};
 function outlined(t,x,y,size,col,stroke=14){g.font=font('900',size);g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=stroke;g.strokeStyle='#1a1030';g.strokeText(t,x,y);g.fillStyle=col;g.fillText(t,x,y);}
 function overlay(t,i,ts){
  pill(40,60,470,92,46,'#1a1030cc');g.font=font('900',46);g.textAlign='left';g.textBaseline='middle';g.fillStyle='#fff5d9';g.fillText('MUSHROOM RALLY',74,108);
  // Intro (erste Szene) und Szenentitel
  if(i<3.6*FPS){const a=Math.min(1,t/.35)*Math.min(1,(3.6-t)/.45);g.globalAlpha=Math.max(0,a);outlined('UPDATE',W/2,520,76,'#fff5d9',12);outlined('ELEMENTE-PARCOURS',W/2,650,104,'#ff3b6b',18);outlined('Rennboot \u00b7 Tauchboot \u00b7 Flugzeug',W/2,775,58,'#ffe45c',12);g.globalAlpha=1;}
  else if(scene&&ts<2.2){const a=Math.min(1,ts/.3)*Math.min(1,(2.2-ts)/.4);g.globalAlpha=Math.max(0,a);outlined(scene.title,W/2,600,scene.title.length>14?92:112,'#7cf3ff',16);outlined(scene.sub,W/2,720,52,'#fff5d9',11);g.globalAlpha=1;}
  const cls=toastEl.className||'',txt=toastEl.textContent||'';
  if(cls.startsWith('show')&&txt!==lastToast){lastToast=txt;events.push({i,t:+t.toFixed(3),text:txt});
   const key=Object.keys(CAPS).find(k=>txt.toUpperCase().startsWith(k));if(key){const c=CAPS[key];cap={text:c[0],col:c[1],t0:t};}}
  if(!cls.startsWith('show'))lastToast='';
  if(cap){const k=t-cap.t0;if(k>1.4)cap=null;else{const s=k<.18?.6+.55*(k/.18):k<.3?1.15-.15*((k-.18)/.12):1;g.save();g.translate(W/2,430);g.scale(s,s);g.globalAlpha=Math.max(0,Math.min(1,(1.4-k)/.3));outlined(cap.text,0,0,120,cap.col,18);g.restore();g.globalAlpha=1;}}
  const p=rallyTest.racers()[0];if(p){const kmh=Math.round(Math.abs(p.speed)*3.6);pill(W-370,H-270,330,150,40,'#1a1030cc');g.textAlign='right';g.fillStyle='#fff5d9';g.font=font('900',98);g.fillText(String(kmh),W-158,H-192);g.font=font('800',34);g.fillText('KM/H',W-66,H-166);}
  pill(40,H-110,640,70,35,'#1a1030aa');g.textAlign='left';g.font=font('800',36);g.fillStyle='#ffe45c';g.fillText('Kostenlos im Browser spielbar',74,H-75);
 }
 const realNow=performance.now.bind(performance);let vt=realNow(),frame=0;
 function tele(r,d,off,sp){const P=rallyTest.posAt(d,off),Q=rallyTest.posAt(d+1,off),h=Math.atan2(Q[0]-P[0],Q[2]-P[2]);
  Object.assign(r,{distance:d,offset:off,x:P[0],z:P[2],h,speed:sp,vx:Math.sin(h)*sp,vz:Math.cos(h)*sp,y:P[1],vy:0,air:false,airT:0,stun:0,safeD:d,lastGround:P[1],boost:0,driftDir:0,drift:0,item:null});}
 window.R39={
  real(){performance.now=realNow;rallyTest.dbg.manual=false;return true;},
  place(title,sub,lead){const z=rallyTest.elems()[0],d0=z.s-lead,rs=rallyTest.racers();
   tele(rs[0],d0,0,33);tele(rs[1],d0+9,-3.2,31);tele(rs[2],d0+19,3,31);tele(rs[3],d0-7,2.5,33);
   for(let k=4;k<rs.length;k++)tele(rs[k],d0-60-k*8,0,20);
   vt=realNow();performance.now=()=>vt;rallyTest.dbg.manual=true;
   for(let i=0;i<24;i++){vt+=1000/FPS;rallyTest.step(2,1/(2*FPS));}   // Kamera einschwingen (nicht aufgenommen)
   scene={title,sub,f0:frame};return true;},
  frame(){vt+=1000/FPS;rallyTest.step(2,1/(2*FPS));g.drawImage(game,0,0,W,H);overlay(frame/FPS,frame,(frame-scene.f0)/FPS);frame++;return comp.toDataURL('image/jpeg',.9);},
  end(){performance.now=realNow;rallyTest.dbg.manual=false;return {events,frames:frame};},
  endCard(){g.drawImage(game,0,0,W,H);g.fillStyle='#1a1030e0';g.fillRect(0,0,W,H);
   outlined('NEU IN RUNDE 39',W/2,330,74,'#ffe45c',12);
   g.font=font('800',50);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff5d9';
   ['Tauch-Spiralen durch Wasser und Luft','Seen, Rennboot und Tauchboot','Flugabschnitte mit Ringen','Schr\u00e4g- und Mehrfach-Loopings','Glatter Belag \u00b7 Lenkhilfe'].forEach((l,k)=>g.fillText(l,W/2,480+k*84));
   outlined('MUSHROOM RALLY',W/2,1080,112,'#ff3b6b',16);
   g.font=font('800',50);g.fillStyle='#fff5d9';g.fillText('madd1in.github.io/mushroom-rally',W/2,1205);
   g.font=font('700',40);g.fillStyle='#7cf3ff';g.fillText('Kein Download \u00b7 l\u00e4uft im Browser',W/2,1280);
   g.font=font('700',36);g.fillStyle='#fff5d9';['Ein gemeinsames Werk von','Blender \u00b7 Unreal \u00b7 ElevenLabs','Opus 5 \u00b7 Opus 5.5 \u00b7 Astra 6 \u00b7 GLM 5.3'].forEach((l,k)=>g.fillText(l,W/2,1460+k*62));
   return comp.toDataURL('image/jpeg',.92);}
 };return true;})()`;

try {
  const sp = await freePort(), cp = await freePort();
  server = spawn(process.execPath, ['server.cjs', String(sp)], {cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
  await waitFor(async () => {try {return (await fetch('http://127.0.0.1:' + sp)).ok;} catch {return false;}}, 30000, 'server');
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + cp, '--user-data-dir=' + path.join(FRAMES, '..', 'r39-frames-profile'),
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
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `{let a=0x39e1e3;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}`});
  await send('Page.navigate', {url: 'http://127.0.0.1:' + sp + '/?test=1'});
  await waitFor(() => evaluate('!!window.rallyTest').catch(() => false), 90000, 'test API'); await evaluate('rallyTest.ready()');
  await evaluate(`rallyTest.setClass(100);rallyTest.autopilot(true);rallyTest.gfx('auto');rallyTest.dbg.camBack=7.4;rallyTest.dbg.camUp=3.5;`);
  await evaluate(PAGE);
  await evaluate('document.getElementById("testPanel").style.display="none";true');
  const t0 = Date.now(), cuts = [];let n = 0;
  for (const [trk, sec, title, sub, lead] of SCENES) {
    await evaluate('R39.real()');
    // Verwandlungsteile kommen mit den nachgeladenen Modellen - fehlen sie am Kart, war das Rennen
    // zu frueh gestartet: warten und neu starten (der Kart-Pool wird dann neu gebaut)
    for (let tries = 0; ; tries++) {
      await evaluate(`rallyTest.setTrack(${trk});rallyTest.start();true`); await evaluate('rallyTest.ready()');
      await waitFor(() => evaluate('rallyTest.state().state==="race"').catch(() => false), 60000, 'race ' + trk);
      if (await evaluate('rallyTest.tf()[0]!==null')) break;
      if (tries > 8) throw new Error('transform parts ' + trk);
      await sleep(4000);
    }
    await evaluate(`R39.place(${JSON.stringify(title)},${JSON.stringify(sub)},${lead})`);
    cuts.push({frame: n, track: trk, title});
    for (let i = 0; i < sec * FPS; i++, n++) {
      const url = await evaluate('R39.frame()');
      writeFileSync(path.join(FRAMES, 'f' + String(n).padStart(5, '0') + '.jpg'), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
      if (n % 90 === 0) console.log('frame', n, title, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  }
  const info = await evaluate('R39.end()');
  const card = await evaluate('R39.endCard()');
  writeFileSync(path.join(FRAMES, 'endcard.jpg'), Buffer.from(card.slice(card.indexOf(',') + 1), 'base64'));
  writeFileSync(path.join(FRAMES, 'events.json'), JSON.stringify({fps: FPS, ...info, cuts}, null, 2));
  console.log('DONE', n, 'frames', JSON.stringify(info.events));
} catch (e) {console.error('FAIL', e.message);} finally {
  if (logs.length) console.log('PAGE LOG', logs.slice(0, 20).join('\n'));
  try {ws?.close();} catch {} chrome?.kill(); server?.kill();
}
