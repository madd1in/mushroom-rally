// Mushroom Rally R50: Wetter und Tageszeit wechseln von Runde zu Runde.
// Reine Funktionen (im Spiel und in Tests genutzt): Wetterplan je Rennen, Ueberblendung am Rundenwechsel,
// Lichtstimmung aus Thema + Mischung, Grip und Wind. Das Spiel setzt die Werte nur noch in Szene und Ton um.
export const TOD_KEYS=['day','dusk','night','dawn'];
export const WX_KEYS=['clear','clouds','rain','storm','fog','snow','sand','ash'];
export const EV_KEYS=['ufo','meteors','rainbow','aurora','fireflies','eclipse'];
export const WX_ICON={day:'☀',dusk:'🌇',night:'🌙',dawn:'🌅',clear:'',clouds:'☁',rain:'🌧',storm:'⛈',fog:'🌫',snow:'❄',sand:'🌪',ash:'🌋',
 ufo:'🛸',meteors:'☄',rainbow:'🌈',aurora:'🌌',fireflies:'✨',eclipse:'🌑'};
// Je Thema: moegliche Tageszeit-Folgen, Wetter und Ereignisse. Dunkle Themen (Nacht, Gruft, All, Lava)
// behalten ihre Tageszeit und wechseln nur Wetter und Ereignisse. Beim Canyon ist "day" der Sonnenuntergang.
export const WX_THEMES={
 forest:{tods:[['day','day','dusk'],['day','dusk','night'],['dawn','day','day'],['day','day','day'],['dusk','night','night']],wx:['clear','clouds','rain','storm','fog','snow'],ev:['ufo','rainbow','fireflies','aurora','eclipse','meteors']},
 canyon:{tods:[['day','day','night'],['day','night','night'],['day','day','day'],['dawn','day','day']],wx:['clear','clouds','sand','storm'],ev:['ufo','meteors','eclipse']},
 fair:{tods:[['day','night','night'],['day','day','night'],['day','day','day'],['dusk','night','night']],wx:['clear','clouds','rain','fog'],ev:['ufo','fireflies','meteors']},
 night:{tods:[['day','day','day']],wx:['clear','rain','fog','storm'],ev:['ufo','aurora','meteors']},
 haunted:{tods:[['day','day','day']],wx:['clear','fog','rain','storm'],ev:['ufo','meteors','aurora']},
 rainbow:{tods:[['day','day','day']],wx:['clear'],ev:['ufo','meteors','aurora']},
 lava:{tods:[['day','day','day']],wx:['clear','ash','storm'],ev:['ufo','meteors']}};

// Kleiner reproduzierbarer Zufall (mulberry32)
export function rng(seed){let a=(seed>>>0)||1;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const pickW=(R,list)=>{const tot=list.reduce((s,[,w])=>s+w,0);let x=R()*tot;for(const [k,w] of list){if((x-=w)<=0)return k;}return list[list.length-1][0];};
// Naechstes Wetter: eher Steigerung als Rueckschritt, damit die letzte Runde die dramatischste ist
const NEXT={clear:{clear:2,clouds:3,rain:2,fog:1.2,snow:.6,sand:3,ash:3,storm:.6},clouds:{rain:3,storm:2,clouds:1,clear:1,fog:1,snow:.8,sand:2,ash:2},
 rain:{storm:3,rain:1.5,clear:1.4,clouds:.6},storm:{storm:2,rain:1,clear:1},fog:{fog:1.4,clear:1.2,rain:1,clouds:1},snow:{snow:2,clouds:1,clear:.6},
 sand:{sand:2,storm:1.2,clear:1},ash:{ash:2,storm:1,clear:.8}};

// Wetterplan eines Rennens: je Runde Tageszeit, Wetter und hoechstens ein Ereignis. Runde 1 bleibt ruhig
// (Strecke kennenlernen), danach wird es wechselhaft; mindestens eine Aenderung gibt es immer.
export function weatherPlan(seed,themeKey,laps=3){const T=WX_THEMES[themeKey]||WX_THEMES.forest,R=rng(seed),n=Math.max(1,laps|0);
 const seq=T.tods[Math.floor(R()*T.tods.length)],tod=i=>seq[Math.min(i,seq.length-1)],allow=new Set(T.wx);
 const plan=[];let wx=tod(0)==='dawn'&&allow.has('fog')&&R()<.5?'fog':R()<.72||!allow.has('clouds')?'clear':'clouds';
 for(let i=0;i<n;i++){if(i>0){const opts=Object.entries(NEXT[wx]||NEXT.clear).filter(([k])=>allow.has(k));wx=opts.length?pickW(R,opts):'clear';}
  if(wx==='snow'&&tod(i)!=='day'&&tod(i)!=='dawn')wx=allow.has('clouds')?'clouds':'clear';
  plan.push({tod:tod(i),wx,ev:null});}
 // Ereignis: nach Regen ein Regenbogen, sonst mit 60 % eines, das zu Tageszeit und Wetter passt (nie in Runde 1)
 const fits=(e,s,prev)=>{const dark=s.tod==='night'||!['forest','canyon','fair'].includes(themeKey);
  if(e==='rainbow')return (s.wx==='clear'||s.wx==='clouds')&&(prev?.wx==='rain'||prev?.wx==='storm')&&s.tod!=='night';
  if(e==='aurora'||e==='meteors')return dark&&s.wx!=='storm'&&s.wx!=='rain'&&s.wx!=='fog'&&s.wx!=='ash';
  if(e==='fireflies')return (s.tod==='dusk'||s.tod==='night')&&(s.wx==='clear'||s.wx==='clouds');
  if(e==='eclipse')return (s.tod==='day')&&s.wx==='clear'&&!dark;
  if(e==='ufo')return s.wx!=='storm';return false;};
 for(let i=1;i<n;i++)if(T.ev.includes('rainbow')&&fits('rainbow',plan[i],plan[i-1])){plan[i].ev='rainbow';break;}
 if(!plan.some(s=>s.ev)&&n>1&&R()<.6){const i=1+Math.floor(R()*(n-1)),cand=T.ev.filter(e=>e!=='rainbow'&&fits(e,plan[i],plan[i-1]));if(cand.length)plan[i].ev=cand[Math.floor(R()*cand.length)];}
 const same=plan.every(s=>s.tod===plan[0].tod&&s.wx===plan[0].wx&&!s.ev);
 if(same&&n>1){const last=plan[n-1],cand=T.ev.filter(e=>e!=='rainbow'&&fits(e,last,plan[n-2]));if(cand.length)last.ev=cand[Math.floor(R()*cand.length)];else{const w=T.wx.find(k=>k!==last.wx&&k!=='snow');if(w)last.wx=w;else last.ev='ufo';}}
 return plan;}
// Ruhiger Plan (Zeitfahren, Wetter aus): Thema pur
export const calmPlan=(laps=3)=>Array.from({length:Math.max(1,laps|0)},()=>({tod:'day',wx:'clear',ev:null}));

// Anteile eines Rundenzustands: Gewitter bringt Regen und Wolken mit, Regen Wolken
function stateVec(s){const v={day:0,dusk:0,night:0,dawn:0,clouds:0,rain:0,storm:0,fog:0,snow:0,sand:0,ash:0,ufo:0,meteors:0,rainbow:0,aurora:0,fireflies:0,eclipse:0};
 v[s.tod]=1;if(s.wx!=='clear')v[s.wx]=1;if(s.wx==='storm'){v.rain=Math.max(v.rain,.85);v.clouds=1;}if(s.wx==='rain'||s.wx==='snow')v.clouds=Math.max(v.clouds,.8);if(s.ev)v[s.ev]=1;return v;}
export const WX_BLEND={pre:.05,post:.12};
const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
// Mischung bei Fortschritt prog (Runden, z. B. 1.5 = Mitte Runde 2): kurz vor der Ziellinie beginnt der
// Wechsel, kurz danach ist er vollstaendig. Eine Sonnenfinsternis zieht innerhalb der Runde auf und vorbei.
export function weatherMix(plan,prog){const n=plan.length,p=Number.isFinite(prog)?prog:0,i=Math.min(n-1,Math.max(0,Math.floor(p+WX_BLEND.pre)));
 const cur=stateVec(plan[i]),t=i===0?1:smooth((p-(i-WX_BLEND.pre))/(WX_BLEND.pre+WX_BLEND.post)),prev=i>0?stateVec(plan[i-1]):cur,out={};
 for(const k in cur)out[k]=prev[k]+(cur[k]-prev[k])*t;
 const frac=p-Math.floor(p);if(plan[i].ev==='eclipse')out.eclipse*=Math.exp(-Math.pow((frac-.45)/.16,2));
 out.lap=i;out.t=t;return out;}

// Farben als 0xRRGGBB mischen
export function lerpHex(a,b,t){t=Math.min(1,Math.max(0,t));const c=(s)=>[(s>>16)&255,(s>>8)&255,s&255],A=c(a),B=c(b);return A.map((x,k)=>Math.round(x+(B[k]-x)*t)).reduce((s,x)=>s*256+x,0);}
export const scaleHex=(a,k)=>lerpHex(0,a,k);
const TOD_LOOK={dusk:{skyTop:0x2a2f7a,skyBottom:0xff9a5c,fog:0xe0937a,sunCol:0xff9050,sunK:.6,hemiSky:0xffa888,hemiK:.64,exp:1.04,head:45,L:.62},
 night:{skyTop:0x03061c,skyBottom:0x1b2a5c,fog:0x18204a,sunCol:0x9fb6ff,sunK:.28,hemiSky:0x7d8cff,hemiK:.48,exp:1.3,head:95,L:.16},
 dawn:{skyTop:0x4d7ad8,skyBottom:0xffc4a4,fog:0xf0c8bc,sunCol:0xffcfa0,sunK:.82,hemiSky:0xffe0d0,hemiK:.9,exp:1.08,head:18,L:.85}};

// Lichtstimmung: base = Themawerte (skyTop, skyBottom, fog, fogNear, fogFar, exposure, hemiSky, hemiInt, sunCol,
// sunInt, head, dark). Liefert dieselben Groessen plus Sternen-, Sonnen- und Blitzfaktoren fuer die Szene.
export function weatherLook(base,m){const w=TOD_KEYS.map(k=>m[k]||0),sum=w.reduce((a,b)=>a+b,0)||1,[wd,wu,wn,wa]=w.map(x=>x/sum);
 const mixC=(key,dayVal)=>{let r=scaleHex(dayVal,wd);for(const [k,wt] of [['dusk',wu],['night',wn],['dawn',wa]])if(wt>0){const v=TOD_LOOK[k][key];r=addHex(r,scaleHex(v,wt));}return r;};
 const mixN=(key,dayVal)=>dayVal*wd+TOD_LOOK.dusk[key]*wu+TOD_LOOK.night[key]*wn+TOD_LOOK.dawn[key]*wa;
 let skyTop=mixC('skyTop',base.skyTop),skyBottom=mixC('skyBottom',base.skyBottom),fog=mixC('fog',base.fog),sunCol=mixC('sunCol',base.sunCol),hemiSky=mixC('hemiSky',base.hemiSky);
 let sunInt=base.sunInt*(wd+TOD_LOOK.dusk.sunK*wu+TOD_LOOK.night.sunK*wn+TOD_LOOK.dawn.sunK*wa),hemiInt=base.hemiInt*(wd+TOD_LOOK.dusk.hemiK*wu+TOD_LOOK.night.hemiK*wn+TOD_LOOK.dawn.hemiK*wa);
 let exposure=mixN('exp',base.exposure),head=mixN('head',base.head||0),fogNear=base.fogNear*(1-.45*wu-.2*wn),fogFar=base.fogFar*(1-.25*wu-.15*wn);
 const L=base.dark?.18:mixN('L',1);
 // Bewoelkung: Himmel wird grau (nachts dunkelgrau), Sonne schwaecher, Sicht etwas kuerzer
 const oc=Math.min(1,Math.max((m.clouds||0)*.45,(m.rain||0)*.75,m.storm||0,(m.snow||0)*.55));
 const gTop=scaleHex(0x6f7c8c,.12+.88*L),gBot=scaleHex(0xaab4bf,.12+.88*L);
 skyTop=lerpHex(skyTop,gTop,oc*(base.dark?.35:.85));skyBottom=lerpHex(skyBottom,gBot,oc*(base.dark?.3:.8));fog=lerpHex(fog,gBot,oc*(base.dark?.3:.65));
 sunInt*=1-.6*oc;hemiInt*=1-.16*oc;const vis=1-.3*(m.rain||0)-.22*(m.storm||0);fogNear*=vis;fogFar*=vis;
 if(m.storm)skyTop=lerpHex(skyTop,scaleHex(0x2a3040,.3+.7*L),m.storm*.6);
 // Nebel, Schnee, Sand, Asche: eigene Farbe und kurze Sicht
 for(const [k,col,near,far] of [['fog',0xc9d1d8,16,135],['snow',0xe6ecf2,40,230],['sand',0xd9a262,24,165],['ash',0x3a2622,28,210]]){const a=m[k]||0;if(!a)continue;
  const c=k==='ash'?col:scaleHex(col,.2+.8*L);fog=lerpHex(fog,c,a*.9);skyBottom=lerpHex(skyBottom,c,a*.75);fogNear+=(near-fogNear)*a;fogFar+=(far-fogFar)*a;if(k==='sand'){sunInt*=1-.3*a;skyTop=lerpHex(skyTop,scaleHex(0xb07a48,.3+.7*L),a*.5);}if(k==='ash')skyTop=lerpHex(skyTop,0x1a0c0a,a*.5);}
 // Sonnenfinsternis: Sonne fast weg, Himmel dunkel, Scheinwerfer an
 const ec=m.eclipse||0;if(ec){sunInt*=1-.85*ec;hemiInt*=1-.45*ec;skyTop=lerpHex(skyTop,0x070a20,ec*.8);skyBottom=lerpHex(skyBottom,0x2a2a55,ec*.7);fog=lerpHex(fog,0x252a48,ec*.6);exposure+=.18*ec;head=Math.max(head,90*ec);}
 // Dunkle Themen behalten ihren eigenen Himmel (Lava-Feste: Glutsonne, keine Sterne); base.stars/base.sunGlow = Thema
 const sky=base.dark?(base.stars?1:0):wn*1.1+wu*.25,glow=base.dark?(base.sunGlow?1:0):1-(wn+wu*.25);
 return {skyTop,skyBottom,fog,fogNear,fogFar,sunCol,sunInt,hemiSky,hemiInt,exposure,head:Math.max(head,base.head||0),
  stars:Math.max(0,Math.min(1,sky*(1-oc*.9))),sunGlow:Math.max(0,glow*(1-oc)*(1-ec*.3)),moon:Math.max(0,Math.min(1,(base.dark?(base.stars?1:0):wn)*(1-oc*.8))),L};}
function addHex(a,b){const c=(s)=>[(s>>16)&255,(s>>8)&255,s&255],A=c(a),B=c(b);return A.map((x,k)=>Math.min(255,x+B[k])).reduce((s,x)=>s*256+x,0);}

// Nasse oder verschneite Fahrbahn haelt etwas weniger (fuer alle gleich), Sturm schiebt in Boeen seitlich
export const wxGrip=m=>1-.12*Math.min(1,(m.rain||0)+(m.storm||0)*.2)-.1*(m.snow||0);
export const WIND={amp:2.6,sand:1.6};
export function wxWind(m,t){const s=(m.storm||0)+WIND.sand/WIND.amp*(m.sand||0);if(!s)return 0;
 const gust=Math.max(0,Math.sin(t*.9)+.6*Math.sin(t*2.3+1.3)-.35);return WIND.amp*s*gust*(Math.sin(t*.13)>=0?1:-1);}
// Wetterbericht fuer die Anzeige: ein Symbol je Runde
// Dunkle Themen zeigen ihr eigenes Grundsymbol statt der Sonne; Tageszeit und Wetter stehen nebeneinander
const BASE_ICON={night:'🌙',haunted:'🌙',rainbow:'🪐',lava:'🔥'};
export function forecast(plan,themeKey){const b=BASE_ICON[themeKey];
 return plan.map(s=>{const tod=s.tod==='day'?(b||WX_ICON.day):WX_ICON[s.tod];return (s.wx==='clear'?tod:(s.tod==='day'?'':tod)+WX_ICON[s.wx])+(s.ev?WX_ICON[s.ev]:'');});}
// Ansage beim Rundenwechsel: was ist neu gegenueber der Vorrunde? Kurz (eine Zeile), Symbol des Wichtigsten vorn
export const WX_SHORT={day:'TAG',dusk:'DÄMMERUNG',night:'NACHT',dawn:'MORGENROT',clear:'AUFGEKLART',clouds:'WOLKEN',rain:'REGEN',storm:'GEWITTER',fog:'NEBEL',snow:'SCHNEE',
 sand:'SANDSTURM',ash:'ASCHEREGEN',ufo:'UFO!',meteors:'STERNSCHNUPPEN',rainbow:'REGENBOGEN',aurora:'POLARLICHT',fireflies:'GLÜHWÜRMCHEN',eclipse:'FINSTERNIS'};
export function lapNews(plan,i){if(i<=0||i>=plan.length)return null;const a=plan[i-1],b=plan[i],keys=[];
 if(b.tod!==a.tod)keys.push(b.tod);if(b.wx!==a.wx)keys.push(b.wx);if(b.ev)keys.push(b.ev);if(!keys.length)return null;
 const lead=b.ev||(b.wx!==a.wx&&b.wx!=='clear'?b.wx:null)||keys[0];return (WX_ICON[lead]||'☀')+' '+keys.map(k=>WX_SHORT[k]).join(' · ');}
