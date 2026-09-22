import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {armGlider,resetGlider,stepGlider} from './glider.mjs';
import {blastHit,comboStep,racer,driveKart,turnCurve,advanceProgress,hitKart,collideKarts,maxCornerSpeed,angleDiff,lap,finish,ranking,activate,clamp,LAPS,rollItem,loseSpores,addGpPoints,gpStandings,raceStars,GP_POINTS,MAX_SPORES,PHYS,CLASSES} from './core.mjs';

const $=id=>document.getElementById(id),TAU=Math.PI*2,TEST=new URLSearchParams(location.search).has('test');
const store={get(k,d){try{const v=localStorage.getItem('mr-'+k);return v===null?d:JSON.parse(v);}catch{return d;}},set(k,v){if(TEST)return;try{localStorage.setItem('mr-'+k,JSON.stringify(v));}catch{}}};

// ---------------------------------------------------------------- Themen & Strecken
// Jede Strecke hat eigenes Licht, eigene Farben, eigene Deko und eine eigene Spielmechanik.
const THEMES={
 forest:{skyTop:0x2f8fe0,skyBottom:0xc4ecff,fog:0xc9e8f5,fogNear:230,fogFar:560,exposure:1.08,hemiSky:0xffffff,hemiGround:0x3f7a2a,hemiInt:1.9,sunCol:0xfff1c9,sunInt:3.2,sunPos:[60,120,80],fillCol:0xbfd4ff,fillInt:.5,
  grass:0x3fae3a,grassSpot:0x6ccf4c,skirt:0x2f8a2e,road:0x3a414d,roadSpot:0x4e5766,edge:0xf4f1e6,curbA:'#e8352e',curbB:'#ffffff',line:'#ffffff',glow:0,sea:0x28a8dc,foam:0xe8fffb,
  caps:[0xe8352e,0xf5a623,0x8e5bd9,0xff5fa2],leaves:[0x2e9c3f,0x52b848,0x3f8f2a],hills:[0x3f9a5a,0x5fb870],clouds:true,balloons:4,stars:false},
 canyon:{skyTop:0x40207a,skyBottom:0xff9448,fog:0xf09a60,fogNear:170,fogFar:480,exposure:1.12,hemiSky:0xffd7b0,hemiGround:0x8a3b1e,hemiInt:1.55,sunCol:0xffae66,sunInt:3.8,sunPos:[-140,60,-150],fillCol:0x9a7bff,fillInt:.45,
  grass:0xd8843f,grassSpot:0xeea45e,skirt:0xa9512a,road:0x6e3a2a,roadSpot:0x8a4f3b,edge:0xf6d09a,curbA:'#ffd23f',curbB:'#2b1d24',line:'#ffe8a0',glow:0,sea:0x1c8fa6,foam:0xffe2c2,
  caps:[0xff7a2f,0xffc03a,0xd9482b],leaves:[0x5f8f3a,0x7aa84a],hills:[0xb4532e,0xc8683a],clouds:false,cloudCols:[0xffd2a8,0xff7a3a],balloons:2,stars:false},
 haunted:{skyTop:0x07050f,skyBottom:0x3a2d5c,fog:0x2a2342,fogNear:90,fogFar:380,exposure:1.42,hemiSky:0x9a8cff,hemiGround:0x1a1426,hemiInt:1.25,sunCol:0xc9d6ff,sunInt:1.8,sunPos:[-70,130,90],fillCol:0x7dff9a,fillInt:.4,
  grass:0x2a3526,grassSpot:0x3f4d33,skirt:0x1f2419,road:0x3a3442,roadSpot:0x4f4858,edge:0x8f86a3,curbA:'#8a5cff',curbB:'#1a1426',line:'#9dff7a',glow:1,sea:0x1b1433,foam:0x9dff7a,
  caps:[0x8a5cff,0x9dff7a,0xff8a3d],leaves:[0x3a2d4a,0x2e2a3a,0x4a3550],hills:[0x1d1830,0x261f3a],clouds:false,balloons:0,stars:true},
 rainbow:{skyTop:0x05030f,skyBottom:0x1b0b3a,fog:0x140a2e,fogNear:220,fogFar:640,exposure:1.36,hemiSky:0xc9b8ff,hemiGround:0x241a44,hemiInt:1.5,sunCol:0xffffff,sunInt:2.0,sunPos:[70,150,60],fillCol:0x7df3ff,fillInt:.7,head:60,
  grass:0x241a44,grassSpot:0x2e2358,skirt:0x1a1234,road:0x2a2050,roadSpot:0x3a2c6e,edge:0xffffff,curbA:'#ffffff',curbB:'#8a5cff',line:'#ffffff',glow:1,sea:0x0a0620,foam:0x9d8cff,
  caps:[0xff4fa3,0x4fd8ff,0xffe45c,0x8affc8],leaves:[0x3a2d6a,0x2a2050],hills:[0x1a1240,0x241a50],pennants:[0xff4fa3,0x4fd8ff],chev:'#ffffff',
  space:true,rainbowRoad:true,clouds:false,balloons:0,stars:true},
 lava:{skyTop:0x150409,skyBottom:0x8a2410,fog:0x40120c,fogNear:110,fogFar:430,exposure:1.3,hemiSky:0xffc59a,hemiGround:0x241010,hemiInt:1.05,sunCol:0xffd0a0,sunInt:2.6,sunPos:[-90,110,-70],fillCol:0x6a7dff,fillInt:.5,head:80,
  grass:0x2e2226,grassSpot:0x46302e,skirt:0x1d1517,road:0x2a2328,roadSpot:0x3b3038,edge:0xff7a2f,curbA:'#ff5a1f',curbB:'#1a1012',line:'#ffb347',glow:1,sea:0xff4a12,foam:0xffd08a,lavaSea:true,ember:true,
  chasm:{c:0xff4a12,e:0xff3a08,i:1.5,label:'LAVA! VOLLGAS'},
  caps:[0xff5a1f,0xffae3a,0xd93a12],leaves:[0x3a2a28,0x4a3230],hills:[0x2a1c1c,0x3a2422],pennants:[0xff7a2f,0xffd45c],chev:'#ffcf6a',clouds:false,cloudCols:[0x45302a,0x7a1e0c],balloons:0,stars:false},
 night:{skyTop:0x05041a,skyBottom:0x2f1c66,fog:0x1f1650,fogNear:140,fogFar:430,exposure:1.4,hemiSky:0x7a7aff,hemiGround:0x0c0c28,hemiInt:1.15,sunCol:0xa8bfff,sunInt:1.5,sunPos:[80,140,-60],fillCol:0xff4fb8,fillInt:.35,
  grass:0x12344a,grassSpot:0x1d5070,skirt:0x0d2638,road:0x16142b,roadSpot:0x29254d,edge:0x2de2e6,curbA:'#2de2e6',curbB:'#ff3cac',line:'#ff3cac',glow:1,sea:0x0a1c3c,foam:0x6fe8ff,
  caps:[0xff3cac,0x2de2e6,0xfff05a,0x9d6bff],leaves:[0x1f6a64,0x2a4f8a],hills:[0x1c2a5a,0x2a1f5c],clouds:false,balloons:0,stars:true}};
// Positionen der Features in Kontrollpunkt-Koordinaten: 2.5 = zwischen Punkt 2 und 3 auf halber Strecke.
// hills [cp, Hoehe, Breite als Rundenanteil], ramps [cp, Querversatz, Breite], pads [cp, Querversatz], boost [cp], boxes [cp],
// stands [cp, Querversatz], plateau [cpStart, cpEnde, Hoehe, Rampenlaenge m], gap [cp, Laenge m], swing [cp, Amplitude, Tempo, Phase].
const courses=[
 {name:'Pilz-Promenade',icon:'✿',kind:'Wurzeltor · Viadukt · Wandfahrt',medals:[85,91,102],music:'race',theme:'forest',seed:7,
  points:[[-45,-45],[-8,-8],[30,30],[72,62],[112,42],[118,-12],[82,-52],[38,-38],[-35,35],[-72,68],[-112,40],[-118,-15],[-85,-58]],
  raise:[[6.55,8.45,8,44,1]],hills:[[3.6,4,.022],[10.6,4,.022]],tunnel:[[2.15,2.9,'wood']],gaps:[[11.6,12]],agrav:[[4.5,6.4,'wall',90]],builds:[[.9,'roottree']],
  ramps:[[4.4,0,9],[9.7,0,8]],pads:[[3.1,-4],[10.0,4]],
  boost:[1.9,5.5,12.3],boxes:[1.6,4.9,9.3,12.0],stands:[[.2,18],[5.2,-19]]},
 {name:'Sonnen-Canyon',icon:'☀',kind:'Schnell · Schluchtsprung · Felstunnel',medals:[112,118,129],music:'sunset',theme:'canyon',seed:23,
  points:[[0,78],[95,78],[125,45],[120,-20],[85,-45],[105,-88],[50,-102],[2,-50],[-60,-98],[-115,-72],[-122,0],[-105,55],[-55,80]],
  loopc:[5.5,20],hills:[[1.5,4,.03],[4.5,6,.04]],plateau:[9.45,11.7,7,34],gaps:[[10.5,14]],fork:[[6.25,8.75,.36]],
  raise:[[2.3,3.3,7,30,1]],tunnel:[[4.7,5.45,'rock']],agrav:[[.7,2.2,'wall',90]],
  ramps:[[3.3,0,9],[6.5,3,7]],pads:[[2.4,-4],[8.4,4]],
  boost:[.5,5.2,12.2],boxes:[1.0,4.0,7.0,9.1,12.6],stands:[[.3,-18],[5.6,19]]},
 {name:'Neon-Pilzwald',icon:'✦',kind:'Technisch · Korkenzieher im Neontunnel',medals:[91,97,108],music:'night',theme:'night',seed:41,
  points:[[0,70],[50,75],[80,50],[55,25],[85,0],[95,-45],[55,-60],[30,-35],[0,-60],[-30,-95],[-80,-80],[-70,-40],[-105,-10],[-95,40],[-60,35],[-40,65]],
  hills:[[4.6,4,.03],[10.5,5,.035]],raise:[[1.1,2.1,7,28,1]],tunnel:[[9.3,10.0,'neon']],gaps:[[12.55,12]],agrav:[[2.65,4.95,'wall',90],[8.6,10.75,'roll',1]],
  ramps:[[10.6,0,8],[14.5,-2,7]],pads:[[4.4,3],[12.4,-3]],
  builds:[[11.45,'neongate']],boost:[.6,6.3,11.6],fork:[[5.75,8.75,.36]],boxes:[1.3,3.6,6.9,9.8,13.8],stands:[[.25,18],[10.1,-19]]},
 {name:'Geisterhaus',icon:'👻',kind:'Spuk · Villa · Fahrt über Kopf',medals:[91,98,110],music:'night',bgmRate:.9,theme:'haunted',seed:66,
  points:[[0,70],[55,78],[95,55],[105,10],[70,-16],[100,-60],[70,-95],[20,-90],[-30,-90],[-75,-95],[-112,-55],[-104,-18],[-93,12],[-104,40],[-80,70],[-40,76]],
  hills:[[3.5,4,.03],[13.6,5,.03]],mansion:7.8,raise:[[9.9,11.1,8,34,1]],tunnel:[[2.3,3.0,'crypt']],agrav:[[11.4,13.4,'over',1]],
  ramps:[[5.4,0,9],[13.5,0,8]],pads:[[4.6,3],[14.6,-3]],
  boost:[.5,6,12.5],ghosts:[[1.6,5.5,.9,0],[5.3,5.5,1.1,2],[7.5,4.2,1,.5],[10.4,5.5,.8,4],[12.9,5.5,1.2,1]],boxes:[1.2,4.1,9.6,13.9],stands:[[.3,-19],[13.2,19]]},
 {name:'Lava-Feste',icon:'\u2668',kind:'Burg \u00b7 Magma \u00b7 Feuerb\u00e4lle',medals:[88,94,105],music:'sunset',bgmRate:1.06,theme:'lava',seed:88,
  points:[[-80,86],[0,90],[80,84],[118,56],[126,12],[112,-34],[92,-74],[44,-98],[-14,-94],[-62,-86],[-92,-56],[-72,-26],[-96,6],[-118,44],[-108,74]],
  castle:1.05,hills:[[3.2,5,.03],[8.6,3,.028]],raise:[[12.4,13.4,8,32,1]],tunnel:[[4.6,5.25,'lava']],gaps:[[8.15,14]],agrav:[[9.45,12.0,'roll',1]],
  swing:[[3.4,5,1.25,0],[7.0,5,1.05,2]],
  ramps:[[2.4,0,9],[9.7,0,8]],pads:[[5.9,-4],[13.2,4]],
  boost:[.55,6.4,11.8],boxes:[1.6,4.4,8.0,9.9,13.6],stands:[[.4,18],[8.6,-19]]},
 {name:'Regenbogenpiste',icon:'\u2727',kind:'Weltall \u00b7 Looping \u00b7 Korkenzieher',medals:[101,107,118],music:'night',bgmRate:1.04,theme:'rainbow',seed:101,
  points:[[0,90],[70,88],[120,52],[108,-2],[128,-52],[96,-96],[36,-104],[-18,-78],[-8,-30],[-52,-8],[-104,-30],[-126,16],[-96,64],[-40,84]],
  loopc:[6.45,19],agrav:[[2.05,4.05,'roll',1],[8.85,10.8,'over',1]],
  hills:[[1.2,4,.025],[8.4,5,.03]],gaps:[[4.55,13]],
  ramps:[[1.9,0,9],[8.15,0,8]],pads:[[3.9,-4],[11.8,4]],
  boost:[.6,5.4,11.4],boxes:[1.4,4.0,7.9,10.7,12.8]}];
// Streckenlayouts haben sich geaendert (Viadukt, Abzweigungen, Kurvenglaettung) -> alte Rekorde/Geister einmalig verwerfen
const LAYOUT_VER=18;if(store.get('layoutVer',0)!==LAYOUT_VER){try{for(let i=0;i<courses.length;i++){for(const k of ['tt-','medal-','ghost-','bestlap-'])localStorage.removeItem('mr-'+k+i);for(const cc2 of [50,100,150]){localStorage.removeItem('mr-best-'+i+'-'+cc2);localStorage.removeItem('mr-stars-'+i+'-'+cc2);}}}catch(e){}store.set('layoutVer',LAYOUT_VER);}
const KART_COLORS=[{c:0xff3b30,n:'Ruby / Rot'},{c:0xffc400,n:'Sunny / Gelb'},{c:0x00c2a8,n:'Mint / Türkis'},{c:0x8b5cff,n:'Nova / Violett'},{c:0xffc93c,n:'Goldpilz',gold:true}];
// Jede Figur faehrt ihr eigenes Kart: Beschleunigung, Hoechsttempo, Grip, Lenkung und Bauform
const DRIVERS=[
 {k:'driver',n:'Pilzi',i:'🍄',kart:'Sporenflitzer',acc:1,top:1,grip:1,turn:1,sc:[1,1,1],tip:'ausgewogen'},
 {k:'driver_turtle',n:'Schildi',i:'🐢',kart:'Panzerwagen',acc:.87,top:1.09,grip:1.07,turn:.93,sc:[1.09,.95,1.05],tip:'schnell, traege'},
 {k:'driver_robot',n:'Volt',i:'🤖',kart:'Voltstoss',acc:1.18,top:.95,grip:1.03,turn:1.03,sc:[.97,1.07,.98],tip:'spurtstark'},
 {k:'driver_cat',n:'Mochi',i:'🐱',kart:'Kurvenkatze',acc:1.05,top:.97,grip:1.02,turn:1.15,sc:[.94,.96,.96],tip:'wendig'}];
const AI_DRIVERS=[0,1,2,3,1,2,3,0];
const AI_NAMES=['Du','Peachy','Bramble','Pip','Luna','Mochi','Sunny','Nori'],AI_COLORS=[0xff4f8b,0x5cc93a,0xffb800,0x7b61ff,0x1fb0ff,0xff7a1a,0x13b39a];
const TRACK_SCALE=1.35,ROAD_HALF=7.6,G=30,G_STICK=74,RAMP_LEN=6.2,RAMP_H=1.15,FAN_COLS=[0xed6350,0xffd45c,0x55bdb2,0xa688dc,0xf1b35a,0xef7160],PLAYER_SLOT=5;
const ITEM_ICONS={boost:'⚡',triple:'⚡',shell:'◉',banana:'🍌',shield:'★',bomb:'💣'},ITEM_NAMES={boost:'TURBO',triple:'DREIFACH-TURBO',shell:'SUCH-PANZER',banana:'BANANE',shield:'STERNENSCHILD',bomb:'PILZBOMBE'};
const ITEM_ART={empty:"<svg viewBox='0 0 48 48'><path d='M17 17a7 7 0 1 1 9.8 6.4c-1.9.9-2.8 2-2.8 4.1v2' fill='none' stroke='#d8e6dc' stroke-width='5' stroke-linecap='round'/><circle cx='24' cy='37' r='3.2' fill='#d8e6dc'/></svg>",boost:"<svg viewBox='0 0 48 48'><path d='M28 3 10 27h10l-3 18 21-26H27z' fill='#ffe27a' stroke='#b5760c' stroke-width='3' stroke-linejoin='round'/></svg>",triple:"<svg viewBox='0 0 48 48'><path d='M19 4 6 24h7l-2 14 14-18h-7z' fill='#ffe27a' stroke='#b5760c' stroke-width='2.6' stroke-linejoin='round'/><path d='M36 10 25 26h6l-2 12 12-16h-6z' fill='#fff0ad' stroke='#b5760c' stroke-width='2.6' stroke-linejoin='round'/></svg>",shell:"<svg viewBox='0 0 48 48'><path d='M5 34a19 16 0 0 1 38 0z' fill='#8fd8ff' stroke='#1d6c99' stroke-width='3' stroke-linejoin='round'/><path d='M24 18v16M13 23l-3 11M35 23l3 11' stroke='#1d6c99' stroke-width='2.6' fill='none' stroke-linecap='round'/><rect x='4' y='33' width='40' height='7' rx='3.5' fill='#fff4d9' stroke='#1d6c99' stroke-width='3'/></svg>",banana:"<svg viewBox='0 0 48 48'><path d='M10 9c1 15 8 25 27 28-3 4-9 5-14 4C11 39 5 28 6 13z' fill='#ffe45c' stroke='#9a7a12' stroke-width='3' stroke-linejoin='round'/><path d='M8 9c-2-2-4-2-5 0' stroke='#6c5a2a' stroke-width='3.4' fill='none' stroke-linecap='round'/></svg>",shield:"<svg viewBox='0 0 48 48'><path d='M24 3 30 18l16 1-12 10 4 16-14-9-14 9 4-16L2 19l16-1z' fill='#ffe9fb' stroke='#c95bb0' stroke-width='3' stroke-linejoin='round'/><circle cx='24' cy='24' r='4.5' fill='#ff9ee0'/></svg>",bomb:"<svg viewBox='0 0 48 48'><circle cx='21' cy='29' r='15' fill='#3b3546' stroke='#14101c' stroke-width='3'/><path d='M30 16c3-6 8-8 12-5' stroke='#a8764a' stroke-width='4' fill='none' stroke-linecap='round'/><path d='M43 8l2-4 2 4-4 1z' fill='#ffb02e'/><circle cx='43.5' cy='10' r='3.6' fill='#ffd45c'/><ellipse cx='16' cy='24' rx='4' ry='2.6' fill='#6a6478' opacity='.8'/></svg>"};
const ITEM_COL={boost:'#ffd45c',triple:'#ffd45c',shell:'#8fd8ff',banana:'#ffe45c',shield:'#ffb8ec',bomb:'#ff9a6a'};
const MT_COLORS={mini:0x5ad0ff,super:0xffa531,ultra:0xd36bff},MT_LABEL={mini:'MINI-TURBO',super:'SUPER-TURBO',ultra:'ULTRA-TURBO'};

let selected=0,colorIndex=0,driverIndex=Math.max(0,Math.min(3,store.get('driver',0)|0)),mode='single',cc=store.get('class',100),state='menu',elapsed=0,countdown=3,last=0,curve,length=1,course,theme,ctx,frame=0,noticeTimer=0,toastTimer=0;
let boxes=[],racers=[],hazards=[],flags=[],balloons=[],puffs=[],shots=[],ramps=[],pads=[],rings=[],spores=[],swingers=[],gaps=[],boostPads=[],sporeMesh=null,crowd=null,boostTex=null,foamRing=null,fireflies=null,rails=[],forks=[],raises=[],tunnels=[],agrav=[],loops=[],crystals=[];
let rainbowTex=null,mapInfo={cx:0,cz:0,k:.6},shake=0,lastPlace=8,leadAt=-99,finishMusicAt=0,soundOn=true,autoGas=false,startPress=-1,prevDrift=false,roulette=null,camFov=62,camH=0,camRoll=0,camRollPrev=0,cer=null,wrongT=0,autopilot=false;
let gp={active:false,race:0,points:{}},stats=null,startLights=[],lightState=-1,chevrons=[];
let fworks=[];
// Konfettiregen ueber der Startaufstellung, wenn die Ampel auf Gruen springt (R30)
function dropConfetti(){const cols=[...FAN_COLS,0xffffff,0xffd45c,0xff9ad5];for(let i=0;i<130;i++){const d=-1+Math.random()*12,off=(Math.random()-.5)*13,h=7+Math.random()*4.5;
 try{const p=posAt(d,off,h,new T.Vector3());dropConfettiBit(p.x,p.y,p.z,cols[i%cols.length]);}catch(e){}}}
function setLights(n){if(n===lightState||!startLights.length)return;lightState=n;startLights.forEach((m,i)=>{const on=n===4||i<n;m.emissive.setHex(!on?0x000000:n===4?0x3dff6a:0xff2a1f);m.color.setHex(!on?0x220808:n===4?0x2bd653:0xff3b2f);m.emissiveIntensity=on?2.4:0;});if(n===4)dropConfetti();}
// Feuerwerk ueber dem Sporentor beim Zieleinlauf: drei Raketen gestaffelt (R30)
function planFireworks(){const cols=theme?theme.caps:[0xffd45c];for(let i=0;i<3;i++)fworks.push({at:elapsed+.35+i*.75,off:(i-1)*5,h:11+i*2.4,col:cols[i%cols.length]});}
function burstAt(x,y,z,col){for(let i=0;i<26;i++){const a=i/26*TAU,sp=4.5+random01()*5;emit(x,y,z,col,Math.cos(a)*sp,Math.sin(a*3)*2.2+1.5,Math.sin(a)*sp,.9+random01()*.5);}
 for(let i=0;i<10;i++)emit(x,y,z,0xffffff,(random01()-.5)*7,(random01()-.5)*7,(random01()-.5)*7,.7);}
const random01=()=>Math.random();
let obsGrid=new Map();let zones=[],bats=null;
const inZone=(d,pad=0)=>zones.some(z=>Math.abs(wrapDiff(d,z.d))<z.half+pad);
const coarseInput=matchMedia('(pointer:coarse)').matches,quality={level:0,dprCap:coarseInput?1.25:1.25,fpsFrames:0,fpsStart:0};

// ---------------------------------------------------------------- Renderer & Szene
let renderer;try{renderer=new T.WebGLRenderer({canvas:$('game'),antialias:!coarseInput});}catch(e){$('error').hidden=false;$('error').textContent='Dein Browser benötigt WebGL für dieses 3D-Spiel. Bitte Hardwarebeschleunigung aktivieren und die Seite neu laden.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;if(coarseInput)renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.25,900),worldRoot=new T.Group(),actors=new T.Group();let world=new T.Group();scene.add(worldRoot,actors);worldRoot.add(world);
const hemi=new T.HemisphereLight(0xffffff,0x587540,2);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff7db,3);sun.castShadow=true;sun.shadow.mapSize.set(coarseInput?512:768,coarseInput?512:768);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:360});sun.shadow.bias=-.0006;scene.add(sun,sun.target);
const headlight=new T.PointLight(0xfff0d8,0,30,1.4);scene.add(headlight);
const fill=new T.DirectionalLight(0xbfd4ff,.45);fill.position.set(-60,40,-90);scene.add(fill);
const shaderTime={value:0};
function radialSprite(stops,scale,pos){const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),g=q.createRadialGradient(64,64,6,64,64,63);for(const [o,col] of stops)g.addColorStop(o,col);q.fillStyle=g;q.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(scale,scale,1);s.position.set(...pos);scene.add(s);return s;}
const sunGlow=radialSprite([[0,'rgba(255,250,230,1)'],[.25,'rgba(255,244,200,.85)'],[1,'rgba(255,244,200,0)']],190,[-320,240,-400]);
const moon=radialSprite([[0,'rgba(255,251,230,1)'],[.45,'rgba(252,243,214,.95)'],[1,'rgba(252,243,214,0)']],95,[230,300,-390]);
const stars=(()=>{const n=700,pos=new Float32Array(n*3);for(let i=0;i<n;i++){const a=Math.random()*TAU,e=Math.acos(Math.random()*.85),r=620;pos[i*3]=Math.sin(e)*Math.cos(a)*r;pos[i*3+1]=Math.cos(e)*r*.9+40;pos[i*3+2]=Math.sin(e)*Math.sin(a)*r;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const p=new T.Points(g,new T.PointsMaterial({color:0xfff6d8,size:2.3,sizeAttenuation:false,fog:false,transparent:true,opacity:.95}));scene.add(p);return p;})();

const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
const cream=mat(0xffefd5),dark=mat(0x273943),white=mat(0xffffff),gold=mat(0xffdc64);
const shieldMat=new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
 fragmentShader:'uniform float uTime;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.2);vec3 c=mix(vec3(1.,.82,.25),vec3(.5,.95,1.),f);gl_FragColor=vec4(c*(f*1.1+.12+.06*sin(uTime*9.)),1.);}'});
const flameMat=new T.MeshBasicMaterial({color:0xffa531,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false});
// Bremslichter am Heck - sichtbar auch an den KI-Karts
const brakeMat=new T.MeshBasicMaterial({color:0xff2a18,transparent:true,opacity:.92,blending:T.AdditiveBlending,depthWrite:false});
const brakeGeo=new T.BoxGeometry(.34,.16,.1);
const shieldGeo=new T.SphereGeometry(1.75,24,16),flameGeo=new T.ConeGeometry(.28,1.3,8);flameGeo.rotateX(-Math.PI/2);flameGeo.translate(0,0,-.65);
const persistentMats=new Set([cream,dark,white,gold,shieldMat,flameMat]);

// ---------------------------------------------------------------- GLB-Prototypen (Blender-MCP)
const sharedGeo=new Set([flameGeo,shieldGeo]),sharedMat=new Set(),P={};
function markShared(root){root.traverse(o=>{if(o.isMesh){sharedGeo.add(o.geometry);for(const m of [].concat(o.material))if(m)sharedMat.add(m);}});}
const KEEP_MATS=new Set(['BodyPaint','CapPaint','StonePaint','MossPaint','WoodPaint','PostPaint','RampPaint','FanCap','GliderPaint','GliderCream','GliderTrim','GliderRope']);
function mergeByMaterial(root){root.updateMatrixWorld(true);const groups=new Map(),baked=[];let rough=0,metal=0,cnt=0;
 root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const m=o.material,g=o.geometry.clone().applyMatrix4(o.matrixWorld),em=m.emissive&&m.emissiveIntensity>0&&(m.emissive.r+m.emissive.g+m.emissive.b)>.001;
  if(!KEEP_MATS.has(m.name)&&!em&&!m.map&&!m.transparent&&m.opacity>=1&&m.color){const n=g.attributes.position.count,col=new Float32Array(n*3);for(let i=0;i<n;i++){col[i*3]=m.color.r;col[i*3+1]=m.color.g;col[i*3+2]=m.color.b;}g.setAttribute('color',new T.BufferAttribute(col,3));baked.push(g);rough+=(m.roughness??.8)*n;metal+=(m.metalness??0)*n;cnt+=n;return;}
  const e=groups.get(m.uuid)||{m,g:[]};e.g.push(g);groups.set(m.uuid,e);});
 if(baked.length)groups.set('baked',{m:new T.MeshStandardMaterial({name:'Baked',vertexColors:true,roughness:rough/cnt,metalness:Math.min(.35,metal/cnt)}),g:baked});
 const out=new T.Group();for(const e of groups.values()){const mixed=new Set(e.g.map(g=>!!g.index)).size>1;const gs=e.g.map(g=>{g=mixed&&g.index?g.toNonIndexed():g;if(!g.attributes.normal)g.computeVertexNormals();for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal'&&!(k==='uv'&&e.m.map)&&!(k==='color'&&e.m.vertexColors))g.deleteAttribute(k);return g;});const geo=mergeGeometries(gs,false);if(geo)out.add(new T.Mesh(geo,e.m));else for(const g of gs)out.add(new T.Mesh(g,e.m));}return out;}
let loaded=0;const PROTO_FILES=['kart','mushroom','gate','tree','rock','balloon','itembox','banana','shell','ramp','grandstand','spectator','bouncepad','podium','trophy','ghost','gravestone','pumpkin','kartwheel','driver','driver_turtle','driver_robot','driver_cat','glider','crystal'];
// Villa und Burg sind gross und stehen nur auf je einer Strecke: erst nach dem Start nachladen
const LATE_FILES=['mansion','castle','roottree','neongate'];
function loadProto(name){return new Promise(resolve=>{new GLTFLoader().load(`assets/${name}.glb`,g=>{const merged=mergeByMaterial(g.scene);markShared(merged);P[name]=merged;progress();resolve();},undefined,()=>{P[name]=null;progress();resolve();});});}
function progress(){loaded++;const el=$('loaderBar');if(el)el.style.width=Math.round(loaded/PROTO_FILES.length*100)+'%';}
function cloneProto(proto){const c=proto.clone(true);c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return c;}
function applyTint(root,name,color,extra){root.traverse(o=>{if(!o.isMesh)return;const fix=m=>{if(m&&m.name===name){const c=m.clone();c.color=new T.Color(color);if(extra)Object.assign(c,extra);if(extra?.emissiveColor){c.emissive=new T.Color(extra.emissiveColor);}return c;}return m;};o.material=Array.isArray(o.material)?o.material.map(fix):fix(o.material);});}
function scatterInstanced(proto,list,tint,chunk=0){if(!proto||!list.length)return;
 if(chunk){const cells=new Map();for(const t of list){const k=Math.floor(t.x/chunk)+','+Math.floor(t.z/chunk);let c=cells.get(k);if(!c)cells.set(k,c=[]);c.push(t);}if(cells.size>1){for(const l of cells.values())scatterInstanced(proto,l,tint,0);return;}}const meshes=[];proto.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))meshes.push(o);});const m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),s=new T.Vector3(),v=new T.Vector3();for(const src of meshes){let material=src.material;const tv=tint?tint[material.name]:undefined;if(tv!==undefined&&tv!==null){material=material.clone();if(typeof tv==='object'){material.color=new T.Color(tv.color);if(tv.emissive!==undefined){material.emissive=new T.Color(tv.emissive);material.emissiveIntensity=tv.emissiveIntensity??1;}}else material.color=new T.Color(tv);}const inst=new T.InstancedMesh(src.geometry,material,list.length);inst.castShadow=true;inst.receiveShadow=true;list.forEach((t,i)=>{e.set(0,t.ry||0,0);q.setFromEuler(e);const sw=t.s*(t.sx||1);s.set(sw,t.s*(t.sy||1),sw);m.compose(v.set(t.x,t.y||0,t.z),q,s);inst.setMatrixAt(i,m);});inst.instanceMatrix.needsUpdate=true;world.add(inst);}}

// ---------------------------------------------------------------- Hilfsfunktionen
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,material,x,y,z,sx,sy=sx,sz=sx){const m=mesh(new T.SphereGeometry(1,14,10),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function box(parent,material,x,y,z,a,b,c){return mesh(new T.BoxGeometry(a,b,c),material,parent,x,y,z);}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hex=c=>'#'+new T.Color(c).getHexString();
function canvasTex(w,h,draw,repeat=false){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
function label(text,bg='#fff1d9',fg='#28523c',w=512,h=128){const tex=canvasTex(w,h,(q)=>{q.fillStyle=bg;q.fillRect(0,0,w,h);q.fillStyle=fg;q.font=`900 ${Math.round(h*.52)}px Trebuchet MS`;q.textAlign='center';q.textBaseline='middle';q.fillText(text,w/2,h/2);});return new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});}
function skyTexture(top,bottom){return canvasTex(2,256,(q)=>{const g=q.createLinearGradient(0,0,0,256);g.addColorStop(0,top);g.addColorStop(.62,bottom);g.addColorStop(1,bottom);q.fillStyle=g;q.fillRect(0,0,2,256);});}
const speckCache=new Map();
function speckleTexture(base,spot,density=1200,size=256){const key=[base,spot,density,size].join();let t=speckCache.get(key);if(!t){t=speckleTextureRaw(base,spot,density,size);speckCache.set(key,t);}return t;}
function speckleTextureRaw(base,spot,density,size){return canvasTex(size,size,(q)=>{q.fillStyle=base;q.fillRect(0,0,size,size);for(let i=0;i<density;i++){q.globalAlpha=.12+Math.random()*.25;q.fillStyle=Math.random()<.55?spot:'#00000022';q.fillRect(Math.random()*size,Math.random()*size,2,2);}q.globalAlpha=1;},true);}
function clearGroup(g,keep){if(keep&&keep.parent===g)g.remove(keep);const disposed=new Set();g.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isMesh||o.isPoints){if(o.geometry&&!sharedGeo.has(o.geometry))o.geometry.dispose();for(const m of [].concat(o.material)){if(m&&!persistentMats.has(m)&&!sharedMat.has(m)&&!disposed.has(m)){m.map?.dispose();m.emissiveMap?.dispose?.();m.dispose();disposed.add(m);}}}});g.clear();if(keep)g.add(keep);}
const HC={};function setText(id,v){if(HC[id]!==v){HC[id]=v;const e=$(id);if(e)e.textContent=v;}}
function notice(text,duration=1.3){setText('message',text);noticeTimer=duration;}
function toast(text,duration=1.4,cls=''){const el=$('toast');el.textContent=text;el.className='show '+cls;toastTimer=duration;}

// ---------------------------------------------------------------- Strecke: Tabelle, Projektion, Hoehe
const PS=2048,newTP=()=>({x:new Float32Array(PS),z:new Float32Array(PS),tx:new Float32Array(PS),tz:new Float32Array(PS),k:new Float32Array(PS),v:new Float32Array(PS),vd:new Float32Array(PS),h:new Float32Array(PS),b:new Float32Array(PS),rl:new Float32Array(PS),lf:new Float32Array(PS)});let TP=newTP();
const lapDist=d=>((d%length)+length)%length;
const wrapDiff=(a,b)=>((a-b)%length+length*1.5)%length-length/2;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
function buildTable(){for(let i=0;i<PS;i++){const u=i/PS,p=curve.getPointAt(u),t=curve.getTangentAt(u).normalize();TP.x[i]=p.x;TP.z[i]=p.z;TP.tx[i]=t.x;TP.tz[i]=t.z;}
 const ds=length/PS,raw=new Float32Array(PS);for(let i=0;i<PS;i++){const j=(i+1)%PS;raw[i]=(TP.tz[i]*TP.tx[j]-TP.tx[i]*TP.tz[j])/ds;}
 for(let i=0;i<PS;i++){let s=0;for(let k=-8;k<=8;k++)s+=raw[(i+k+PS)%PS];TP.k[i]=s/17;}
 for(let i=0;i<PS;i++){let m=0;for(let k=-3;k<=3;k++)m=Math.max(m,Math.abs(TP.k[(i+k+PS)%PS]));TP.v[i]=maxCornerSpeed(m);TP.vd[i]=maxCornerSpeed(m,true);}}
// Globale Projektion eines Weltpunkts auf die Strecke (nur beim Bauen); im Rennen lokale Suche um die letzte Position.
// Grob (jede 4. Stuetzstelle) + fein; mit Hoehe (y), damit an Kreuzungen/Bruecken die richtige Ebene gewinnt
function projectGlobal(x,z,y){let best=0,bd=1e18;const hy=y!==undefined;for(let i=0;i<PS;i+=4){const dx=x-TP.x[i],dz=z-TP.z[i];let d2=dx*dx+dz*dz;if(hy){const dy=y-TP.h[i];d2+=dy*dy*4;}if(d2<bd){bd=d2;best=i;}}
 const c=best;for(let k=-4;k<=4;k++){const i=((c+k)%PS+PS)%PS,dx=x-TP.x[i],dz=z-TP.z[i];let d2=dx*dx+dz*dz;if(hy){const dy=y-TP.h[i];d2+=dy*dy*4;}if(d2<bd){bd=d2;best=i;}}return best*length/PS;}
function project(x,z,hintD){const ds=length/PS,i0=Math.round(lapDist(hintD)/ds);let best=i0%PS,bd=1e18;for(let k=-60;k<=60;k++){const i=((i0+k)%PS+PS)%PS,dx=x-TP.x[i],dz=z-TP.z[i],d2=dx*dx+dz*dz;if(d2<bd){bd=d2;best=i;}}
 // Auf das Segment projizieren, nicht auf die Stuetzstelle: sonst springen Streckenmeter und
 // Querversatz bei jedem Stuetzstellenwechsel (alle ~0,5 m, bei Tempo fast jedes Bild). In einer
 // Rollzone steht die Fahrbahn senkrecht, dort wird aus jedem Versatzsprung ein Hoehensprung.
 let bi=best,bt=0,bq=1e18;
 for(const i of [(best-1+PS)%PS,best]){const j=(i+1)%PS,ex=TP.x[j]-TP.x[i],ez=TP.z[j]-TP.z[i],el=ex*ex+ez*ez||1;
  const t=clamp(((x-TP.x[i])*ex+(z-TP.z[i])*ez)/el,0,1),qx=x-TP.x[i]-ex*t,qz=z-TP.z[i]-ez*t,q=qx*qx+qz*qz;
  if(q<bq){bq=q;bi=i;bt=t;}}
 const j=(bi+1)%PS;let tx=TP.tx[bi]+(TP.tx[j]-TP.tx[bi])*bt,tz=TP.tz[bi]+(TP.tz[j]-TP.tz[bi])*bt;
 const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
 const dx=x-(TP.x[bi]+(TP.x[j]-TP.x[bi])*bt),dz=z-(TP.z[bi]+(TP.z[j]-TP.z[bi])*bt);
 return {d:lapDist((bi+bt)*ds+dx*tx+dz*tz),off:dx*tz-dz*tx};}
function tIdx(d){const f=lapDist(d)/length*PS,i=Math.floor(f)%PS;return [i,(i+1)%PS,f-Math.floor(f)];}
function trackAt(d){const [i,j,k]=tIdx(d);return {h:TP.h[i]+(TP.h[j]-TP.h[i])*k,b:TP.b[i]+(TP.b[j]-TP.b[i])*k,kap:TP.k[i],v:TP.v[i],vd:TP.vd[i]};}
function slopeAt(d){return (trackAt(d+1.5).h-trackAt(d-1.5).h)/3;}
const _tan={x:0,z:0,b:0},_sp=new T.Vector3();
function tanAt(d){const [i,j,k]=tIdx(d);let tx=TP.tx[i]+(TP.tx[j]-TP.tx[i])*k,tz=TP.tz[i]+(TP.tz[j]-TP.tz[i])*k;const tl=Math.hypot(tx,tz)||1;_tan.x=tx/tl;_tan.z=tz/tl;_tan.b=TP.b[i]+(TP.b[j]-TP.b[i])*k;return _tan;}
// ---------- Anti-Grav und Looping: beides dreht die Fahrbahn um die Fahrtrichtung bzw. die
// Querachse. Beide Winkel werden analytisch gerechnet, nicht aus der Tabelle interpoliert: eine
// Tabelle mit PS Stuetzstellen macht die Drehrate treppenfoermig (bei Tempo rund 60 Spruenge je
// Sekunde) - genau das sieht man als Ruckeln. sstep ist C2-glatt, damit auch die Drehbeschleunigung
// an den Raendern stetig ist; ein normales smoothstep hat dort noch einen Knick.
const sstep=u=>{const t=clamp(u,0,1);return t*t*t*(t*(t*6-15)+10);};
function loopAt(d){if(!loops.length)return null;for(const q of loops)if(lapDist(d-q.s)<=q.span)return q;return null;}
function nearLoop(d){if(!loops.length)return false;for(const q of loops)if(lapDist(d-q.s+25)<=q.span+50)return true;return false;}
// Winkel im Looping: 0 an der Einfahrt, TAU an der Ausfahrt - weich an- und ausfahrend. Mit
// gleichbleibender Winkelgeschwindigkeit waere die Bildstreckung an der Einfahrt schlagartig
// mehrfach, und genau dort sprang das Bild. Bei sstep ist die Ableitung an beiden Enden null,
// die Streckung also genau 1 - der Uebergang ist stetig.
const sdot=u=>{const t=clamp(u,0,1);return 30*t*t*(1-t)*(1-t);};     // Ableitung von sstep
// Form in der Ebene (vorwaerts / hoch): Tropfen statt Kreis - unten enger, oben runder, wie bei
// einer echten Achterbahn. Der lineare Vorschub (gap) oeffnet die Spirale: Einfahrt und Ausfahrt
// liegen sichtbar versetzt statt uebereinander (Nutzerwunsch R26) - ein geschlossener Kreis
// liess Ein- und Ausfahrt optisch und im Fahrgefuehl zusammenfallen.
function loopShape(q,th,out){const r=q.R*(.66+.34*(1-Math.cos(th))*.5);
 out[0]=r*Math.sin(th)+q.gap*th/TAU;out[1]=r*(1-Math.cos(th));return out;}
const _ls0=[0,0],_ls1=[0,0],_ls2=[0,0];
const _loopState={q:null,th:0,a:0,b:0,tf:1,tu:0,nf:0,nu:1,k:1,pitch:0};
function loopFrame(q,d){const st=_loopState,u=clamp(lapDist(d-q.s)/q.span,0,1),th=TAU*sstep(u);
 loopShape(q,th,_ls0);
 // Ableitungen numerisch - die Form ist glatt, das genuegt und bleibt aenderbar
 const e=1e-3,thp=TAU*sdot(u)/q.span;
 loopShape(q,th+e,_ls1);loopShape(q,th-e,_ls2);
 const fx=1+(_ls1[0]-_ls2[0])/(2*e)*thp,fy=(_ls1[1]-_ls2[1])/(2*e)*thp,fl=Math.hypot(fx,fy)||1;
 st.q=q;st.th=th;st.a=_ls0[0];st.b=_ls0[1];
 st.tf=fx/fl;st.tu=fy/fl;st.nf=-st.tu;st.nu=st.tf;st.k=fl;
 // Nickwinkel stetig fortgefuehrt statt aus atan2 - sonst springt er oben um 2*PI
 st.pitch=th+angleDiff(Math.atan2(st.tu,st.tf),th);
 return st;}
// Streckung an dieser Stelle: so viele Bildmeter je Fahrbahnmeter.
function loopStretch(q,st){return st.k;}
// Rollprofil: immer dieselbe Drehrichtung. 'roll' dreht glatt einmal durch; 'wall' und 'over'
// drehen ein, halten den Winkel ein Stueck (Wandfahrt bzw. kopfueber) und drehen dann in
// derselben Richtung bis zur vollen Umdrehung weiter. Eindrehen und wieder Zurueckdrehen war
// der Grund, warum sich das Kart im Korkenzieher verkantete.
function rollAt(d){let ph=0;
 for(const q of agrav){const rel=lapDist(d-q.s);if(rel>q.span)continue;const u=rel/q.span;
  if(q.mode==='roll'){ph+=TAU*sstep(u)*q.sgn;continue;}
  const h=q.hold,a=.7*h/TAU,b=1-.7*(TAU-h)/TAU;
  ph+=(u<a?h*sstep(u/a):u<b?h:h+(TAU-h)*sstep((u-b)/(1-b)))*q.sgn;}
 return ph;}
// Sichthub: hebt nur das Bild der Fahrbahn an, damit die gedrehte Bahn frei ueber dem Boden schwebt.
// Abbau seit R26 ueber die letzten 38 % statt 30 %: die 12,5-m-Absenkung am Zonenaustritt
// verteilte sich vorher auf zu wenige Meter - am Uebergang mass der Fahrfluss einen
// Geschwindigkeitswechsel von 13 m/s (sicht- und spuerbarer Ruck).
function liftAt(d){let lf=0;
 for(const q of agrav){const rel=lapDist(d-q.s);if(rel>q.span)continue;const u=rel/q.span;
  lf+=q.lift*sstep(u/.3)*(1-sstep((u-.62)/.38));}
 return lf;}
const hasRoll=d=>(agrav.length&&Math.abs(rollAt(d))>.004)||(loops.length&&!!loopAt(d));
// Zum Ende einer Rollzone hin enger fuehren: wer dort noch weit aussen haengt, faellt beim
// Austritt neben die Bahn - auf der Regenbogenpiste ins Leere.
function rollFree(d,base){let f=1;
 for(const q of agrav){const rel=lapDist(d-q.s);if(rel>q.span)continue;const u=rel/q.span;
  if(u>.72)f=Math.min(f,1-(u-.72)/.28*.55);}
 return base*f;}
// Ein einziger Weg von (Streckenmeter, Querversatz, Hoehe ueber der Bahn) ins Bild - flach,
// gerollt und im Looping. Bei Rollwinkel 0 und ausserhalb des Loopings faellt alles auf die
// flache Formel zusammen, deshalb gibt es an den Uebergaengen keinen Sprung.
function posAt(d,off,h,out){const [i,j,k]=tIdx(d),x=TP.x[i]+(TP.x[j]-TP.x[i])*k,z=TP.z[i]+(TP.z[j]-TP.z[i])*k;
 let tx=TP.tx[i]+(TP.tx[j]-TP.tx[i])*k,tz=TP.tz[i]+(TP.tz[j]-TP.tz[i])*k;const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
 const bb=TP.b[i]+(TP.b[j]-TP.b[i])*k,hh=TP.h[i]+(TP.h[j]-TP.h[i])*k+(agrav.length?liftAt(d):0);
 const ph=agrav.length?rollAt(d):0,cr=Math.cos(ph),sr=Math.sin(ph);
 const qx=tz*cr,qy=sr-bb*cr,qz=-tx*cr;                 // Querachse der Fahrbahn
 let nx=-tz*sr,ny=cr+bb*sr,nz=tx*sr,ax=0,ay=0,az=0;    // Flaechennormale
 const lq=loops.length?loopAt(d):null;
 if(lq){const st=loopFrame(lq,d);
  ax=tx*st.a;ay=st.b;az=tz*st.a;                       // Mittellinie auf den senkrechten Tropfen heben
  nx=tx*st.nf;ny=st.nu;nz=tz*st.nf;}                   // Normale kippt mit (oben kopfueber)
 return out.set(x+ax+qx*off+nx*h, hh+ay+qy*off+ny*h, z+az+qz*off+nz*h);}
function samplePos(d,off,out,lift=0){return posAt(d,off,lift,out);}
// Weit neben der Fahrbahn wird flach gerechnet. In einer Rollzone steht die Bahn senkrecht, dort
// zeigt die Querachse nach oben - ein Querversatz von 19 m landete damit senkrecht ueber der
// Mittellinie statt daneben, und Tribuenen und Baeume standen mitten auf der Strecke.
// Alles, was an der Fahrbahn haengt, geht ueber posAt bzw. samplePos, nicht hierueber.
function sample(d,off=0){const [i,j,k]=tIdx(d);let tx=TP.tx[i]+(TP.tx[j]-TP.tx[i])*k,tz=TP.tz[i]+(TP.tz[j]-TP.tz[i])*k;const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
 const b=TP.b[i]+(TP.b[j]-TP.b[i])*k,ang=Math.atan2(tx,tz);
 if(Math.abs(off)>10.6){const x=TP.x[i]+(TP.x[j]-TP.x[i])*k,z=TP.z[i]+(TP.z[j]-TP.z[i])*k,h=TP.h[i]+(TP.h[j]-TP.h[i])*k;
  return {p:new T.Vector3(x+tz*off,h-off*b,z-tx*off),t:new T.Vector3(tx,0,tz),angle:ang,bank:b};}
 return {p:posAt(d,off,0,new T.Vector3()),t:new T.Vector3(tx,0,tz),angle:ang,bank:b};}
let cpU=[];
// Sucht in der Naehe eines Kontrollpunkts die geradeste Stelle (Anlauf davor, Landezone danach), damit Spruenge nie in Kurven landen.
function straightSpot(v,before=30,after=80,search=90){const c=cpDist(v);let best=c,bs=1e9;for(let o=-search;o<=search;o+=3){const d=c+o;if(gaps.some(g=>Math.abs(wrapDiff(g.c,d))<after+30)||zones.some(z=>{const w=wrapDiff(d,z.d);return w<z.half+before+5&&w>-z.half-after-5;})||raises.some(q=>{const a0=d-before-8,al=before+after+16;return lapDist(q.s-a0)<al||lapDist(a0-q.s)<lapDist(q.e-q.s);})||forks.some(f=>{const a0=d-before-8,al=before+after+16;return lapDist(f.dA-a0)<al||lapDist(a0-f.dA)<f.span;})||tunnels.some(t=>{const a0=d-before-8,al=before+after+16;return lapDist(t.s-a0)<al||lapDist(a0-t.s)<lapDist(t.e-t.s);})||agrav.some(t=>{const a0=d-before-8,al=before+after+16;return lapDist(t.s-a0)<al||lapDist(a0-t.s)<lapDist(t.e-t.s);}))continue;let m=0;for(let s=-before;s<=after;s+=3)m=Math.max(m,Math.abs(trackAt(d+s).kap));const score=m+Math.abs(o)*.00004;if(score<bs){bs=score;best=d;}}return lapDist(best);}
function cpDist(v){const n=course.points.length,i=Math.floor(v)%n,f=v-Math.floor(v),a=cpU[i],b=cpU[(i+1)%n];let du=b-a;if(du<0)du+=length;return lapDist(a+du*f);}
function inGap(d){const dl=lapDist(d);return gaps.some(g=>dl>g.start&&dl<g.end);}
function inRaise(q,d){return lapDist(d-q.s)<=lapDist(q.e-q.s);}
function inBridge(d){return raises.some(q=>q.bridge&&inRaise(q,d));}
// sstep (C2-smootherstep) statt smooth: an den Rampenflanken blieb die STEIGUNG knicken -
// bei Tempo ein spuerbarer Ruck im Fahrfluss (R26). Hoehen bleiben exakt gleich, nur die
// Uebergaenge werden stetig.
function raiseH(d){let h=0;for(const q of raises){const span=lapDist(q.e-q.s),rel=lapDist(d-q.s);if(rel<=span)h+=q.h*sstep(rel/q.r)*(1-sstep((rel-(span-q.r))/q.r));}return h;}
// Anti-Grav dreht nur die Darstellung: gefahren wird weiter in der flachen Streckenebene.
// Bezugshoehe fuer posAt: die Fahrbahnebene selbst. groundAt taugt dafuer nicht, weil es
// neben der Bahn die Boeschung mitrechnet - das Bild wuerde an der Zonengrenze springen.
function roadRef(d,off){const [i,j,k]=tIdx(d);return TP.h[i]+(TP.h[j]-TP.h[i])*k-off*(TP.b[i]+(TP.b[j]-TP.b[i])*k);}
function groundAt(d,off){const tr=trackAt(d);let base=tr.h-off*tr.b;const edge=Math.abs(off)-8.9;
 // Die Anti-Grav-Bahn schwebt: daneben gibt es keine Boeschung, die abfaellt. Rechnete man sie
 // mit, loeste sich der Haltemagnet sobald das Kart etwas weiter aussen fuhr - es fiel heraus
 // und wurde zurueckgesetzt. Seitlich haelt die Fuehrung, nicht das Gelaende.
 if((agrav.length||loops.length)&&hasRoll(d))return {y:base,rh:rampAt(d,off)};
 if(theme.space&&edge>1.6){const rh0=rampAt(d,off);return {y:-30,rh:rh0};}   // neben der Bahn ist Leere
 if(edge>.6&&tr.h>2.2&&inBridge(d))base=0;else if(edge>0&&base>0)base=Math.max(0,base-edge/1.5);
 if(Math.abs(off)<30&&inGap(d))base=-30;const rh=rampAt(d,off);return {y:base+(rh?rh.y:0),rh};}
function rampAt(d,off){const dl=lapDist(d);for(const r of ramps){if(Math.abs(off-r.off)<r.w/2&&dl>=r.start&&dl<=r.end)return {y:RAMP_H*(dl-r.start)/RAMP_LEN,ramp:r};}return null;}
function strip(d0,d1,offset,width,lift,uvLen,steps,uvMul=1){const n=steps+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=new Uint32Array(steps*6);for(let i=0;i<n;i++){const d=d0+(d1-d0)*i/steps;for(let s=0;s<2;s++){const p=samplePos(d,offset+(s?1:-1)*width/2,_sp,lift),o=i*2+s;v[o*3]=p.x;v[o*3+1]=p.y;v[o*3+2]=p.z;uv[o*2]=s;uv[o*2+1]=(d-d0)*uvMul/uvLen;}if(i<steps){const a=i*2,q=i*6;idx[q]=a;idx[q+1]=a+2;idx[q+2]=a+1;idx[q+3]=a+1;idx[q+4]=a+2;idx[q+5]=a+3;}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(new T.BufferAttribute(idx,1));g.computeVertexNormals();return g;}
function addStrip(geo,material,shadow=true){const m=new T.Mesh(geo,material);m.receiveShadow=shadow;world.add(m);return m;}
// Strassenabschnitte ohne Schluchten
function roadSegments(){const segs=[];let s=0;for(const g of [...gaps].sort((a,b)=>a.start-b.start)){segs.push([s,g.start]);s=g.end;}segs.push([s,length]);return segs.filter(([a,b])=>b-a>1);}
// Im Looping steckt in einem Fahrbahnmeter ein Vielfaches an Bildmetern: dort feiner unterteilen
// (sonst ist der Kreis ein Vieleck) und die Textur entsprechend strecken.
function loopParts(a,b){if(!loops.length)return [[a,b,1]];const cuts=[a,b];
 for(const q of loops)for(const e of [q.s,q.s+q.span])for(const c of [lapDist(e),lapDist(e)+length])if(c>a+.5&&c<b-.5)cuts.push(c);
 cuts.sort((x,y)=>x-y);const out=[];
 for(let i=0;i<cuts.length-1;i++){const q=loopAt((cuts[i]+cuts[i+1])/2);out.push([cuts[i],cuts[i+1],q?q.sig*2.1+1:1]);}
 return out;}
function stripSegs(offset,width,lift,uvLen,material,shadow=true){for(const [a,b] of roadSegments())for(const [a2,b2,sc] of loopParts(a,b))addStrip(strip(a2,b2,offset,width,lift,uvLen,Math.max(2,Math.ceil((b2-a2)*sc/1.1)),sc),material,shadow);}
function skirt(side,material){const steps=520,v=[],idx=[],hs=[];for(let i=0;i<=steps;i++){const d=length*i/steps,s=sample(d,side*8.9),h=(inGap(d)||hasRoll(d)||(s.p.y>2.2&&inBridge(d)))?0:Math.max(0,s.p.y),b=sample(d,side*(8.9+h*1.5+1.2)).p;v.push(s.p.x,s.p.y+.02,s.p.z,b.x,-.5,b.z);hs.push(h);}for(let i=0;i<steps;i++){if(Math.max(hs[i],hs[i+1])<.35||hs[i]===0||hs[i+1]===0)continue;const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,material);m.receiveShadow=true;world.add(m);}
// Hindernisse fuer Kollisionen (Raster 16 m)
function addObstacle(x,z,r,h=99){const key=(Math.floor(x/16)+500)*1000+(Math.floor(z/16)+500);let c=obsGrid.get(key);if(!c)obsGrid.set(key,c=[]);c.push({x,z,r,h});}
function nearTrack(x,z,dist){const d=projectGlobal(x,z),p=sample(d).p;return Math.hypot(p.x-x,p.z-z)<dist;}

// ---------------------------------------------------------------- Deko & Figuren
let batch=null;
function batchAdd(proto,key,tint,t){let b=batch.get(key);if(!b)batch.set(key,b={proto,tint,list:[]});b.list.push(t);}
function mushroom(x,z,s,color,y=0,glow=0){if(P.mushroom&&batch){batchAdd(P.mushroom,'m_'+glow,glow,{x,y,z,s,ry:(x*12.99+z*78.23)%TAU,col:color});return null;}if(P.mushroom){const g=cloneProto(P.mushroom);g.position.set(x,y,z);g.scale.setScalar(s);applyTint(g,'CapPaint',color,glow?{emissiveColor:color,emissiveIntensity:glow}:null);world.add(g);return g;}const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);world.add(g);mesh(new T.CylinderGeometry(.3,.52,2.5,12),cream,g,0,1.25,0);sphere(g,mat(color,glow?{emissive:color,emissiveIntensity:glow}:{}),0,2.65,0,1.6,.75,1.6);return g;}
function tree(x,z,s,color){if(P.tree&&batch){batchAdd(P.tree,'t',0,{x,z,s,ry:(x*3.71+z*9.13)%TAU,col:color});return;}if(P.tree){const g=cloneProto(P.tree);g.position.set(x,0,z);g.scale.setScalar(s);applyTint(g,'CapPaint',color);world.add(g);return g;}const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);mesh(new T.CylinderGeometry(.2,.4,2.7,7),mat(0x98714a),g,0,1.35,0);sphere(g,mat(color),0,3.5,0,1.7,2.6,1.7);}
// Pilzgleiter: Blender-Modell und kompakter Geometrie-Fallback.
function fallbackGlider(){if(P._gliderFallback)return P._gliderFallback;
 const root=new T.Group(),paints=[new T.MeshStandardMaterial({name:'GliderPaint',color:0xef6c58,roughness:.78,side:T.DoubleSide}),new T.MeshStandardMaterial({name:'GliderCream',color:0xffedc8,roughness:.88,side:T.DoubleSide}),new T.MeshStandardMaterial({name:'GliderTrim',color:0x4fb9ad,roughness:.7,side:T.DoubleSide})];
 const canopy=(x,z)=>2.63+.57*Math.cos(x/2.5*Math.PI/2)+.15*Math.cos(z/.95*Math.PI/2);
 for(let strip=0;strip<10;strip++){const positions=[],indices=[],x0=-2.5+strip*.5;for(let ix=0;ix<=2;ix++)for(let iz=0;iz<=6;iz++){const x=x0+ix*.25,z=-.95+iz*.95/3;positions.push(x,canopy(x,z),z);}for(let ix=0;ix<2;ix++)for(let iz=0;iz<6;iz++){const a=ix*7+iz,b=a+7;indices.push(a,a+1,b,b,a+1,b+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();root.add(new T.Mesh(geo,paints[strip===0||strip===9?2:strip%3===1?1:0]));}
 const cord=new T.MeshStandardMaterial({name:'GliderRope',color:0x285553,roughness:.85});
 for(const side of [-1,1])for(const z of [-.7,.7]){const a=new T.Vector3(side*.7,.92,z*.5),b=new T.Vector3(side*2.08,canopy(side*2.08,z)-.04,z),dir=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(.014,.014,dir.length(),5),cord);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());root.add(m);}
 P._gliderFallback=mergeByMaterial(root);markShared(P._gliderFallback);return P._gliderFallback;}
function attachGlider(kart,color){const g=cloneProto(P.glider||fallbackGlider());g.name='MushroomParaglider';applyTint(g,'GliderPaint',new T.Color(color).lerp(new T.Color(0xffe2b4),.22).getHex());g.visible=false;kart.add(g);kart.userData.glider=g;return g;}
function syncGlider(r,dt,spin){const g=r.mesh.userData.glider;if(!g)return;
 const open=stepGlider(r,dt,{ground:groundAt(r.distance,r.offset).y,blocked:hasRoll(r.distance)||r.finishTime!==null});
 g.visible=open>.012;if(!g.visible)return;
 // Der Schirm bleibt beim Trick aufrecht, waehrend das Kart darunter dreht.
 g.rotation.order='YXZ';g.rotation.set(-r.mesh.rotation.x*.75,-spin,-r.mesh.rotation.z*.65-(r.steerS||0)*.09+Math.sin(elapsed*3+r.id)*.025*open);
 g.scale.set(.09+.91*open,.17+.83*open,.28+.72*open);g.position.y=-1.1*(1-open)+Math.sin(elapsed*4+r.id)*.045*open;
 if(r.id===0&&r.gliding&&!r.gliderSeen&&state==='race'){r.gliderSeen=true;toast('PILZGLEITER!  DRIFT = TRICK',1.3,'good');}}
function kart(color,goldLook=false,dtype=0){let g;if(P.kart){g=new T.Group();const body=cloneProto(P.kart);applyTint(body,'BodyPaint',color,goldLook?{metalness:.65,roughness:.28}:null);g.add(body);
  const wheels=[];if(P.kartwheel)for(const [x,y,z,s,w] of [[-1,.42,1,1,1],[1,.42,1,1,1],[-1.05,.48,-.9,1.14,1.3],[1.05,.48,-.9,1.14,1.3]]){const piv=new T.Group(),wh=cloneProto(P.kartwheel);piv.position.set(x,y,z);wh.scale.set(w*(x>0?-1:1),s,s);piv.add(wh);g.add(piv);wheels.push({piv,wh,front:z>0,r:y,dir:1});}
  const dproto=P[(DRIVERS[dtype]||DRIVERS[0]).k]||P.driver;
  let driver=null;if(dproto){driver=cloneProto(dproto);applyTint(driver,'CapPaint',goldLook?0xffd23f:color);driver.position.set(0,.95,-.35);g.add(driver);}
  g.userData.parts={wheels,driver};}else{g=new T.Group();const body=mat(color,{roughness:.35});box(g,body,0,.68,0,1.75,.55,2.4);box(g,dark,0,.95,-.28,.9,.75,.72);sphere(g,cream,0,1.9,-.08,.45);for(const x of [-1,1])for(const z of [-.9,1]){const w=mesh(new T.CylinderGeometry(.43,.43,.38,14),dark,g,x,.44,z);w.rotation.z=Math.PI/2;}}
 const shield=new T.Mesh(shieldGeo,shieldMat);shield.position.y=1;shield.visible=false;g.add(shield);
 const flames=[-.45,.45].map(x=>{const f=new T.Mesh(flameGeo,flameMat);f.position.set(x,.72,-1.72);f.visible=false;g.add(f);return f;});
 // Bremslichter: man sieht dem Vordermann an, wann er vom Gas geht
 const brakes=[-.62,.62].map(x=>{const b=new T.Mesh(brakeGeo,brakeMat);b.position.set(x,.62,-1.6);b.visible=false;g.add(b);return b;});
 // Anti-Grav-Unterlicht: additive Glowflaeche unterm Kart, sichtbar nur in Rollzonen -
 // rollt als Kind des Mesh automatisch mit und zeigt das Magnetfeld, das das Kart traegt.
 if(!UG_MAT){UG_MAT=new T.MeshBasicMaterial({map:canvasTex(64,64,(q)=>{const r0=q.createRadialGradient(32,32,4,32,32,30);r0.addColorStop(0,'rgba(255,255,255,.95)');r0.addColorStop(.45,'rgba(140,245,255,.5)');r0.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=r0;q.fillRect(0,0,64,64);}),color:0x9feaff,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false});}
 const ug=new T.Mesh(UG_GEO||(UG_GEO=new T.PlaneGeometry(3.1,4.2).rotateX(-Math.PI/2)),UG_MAT);
 ug.position.y=.14;ug.visible=false;g.add(ug);
 g.userData={...g.userData,shield,flames,brakes,underglow:ug};attachGlider(g,color);return g;}
// KI-Karts instanziert: je Bauteil (Karosserie, Lack, Fahrer, Kappe, Raeder) ein Draw-Call fuer alle 7 Karts.
// r.mesh bleibt ein unsichtbares Transform-Geruest (Fahrer-/Rad-Knoten), dessen Weltmatrizen jeden Frame uebertragen werden.
const WHEEL_SLOTS=[[-1,.42,1,1,1],[1,.42,1,1,1],[-1.05,.48,-.9,1.14,1.3],[1.05,.48,-.9,1.14,1.3]];
let kartInst=null,kartPool=null;
const kartsG=new T.Group();actors.add(kartsG);
// Anbauteile am Heck: haengen am Fahrermodell, damit sie auch bei instanzierten Karts mitlaufen
function kartExtras(){for(let i=0;i<DRIVERS.length;i++){const p=P[DRIVERS[i].k];if(!p||p.userData.extras)continue;p.userData.extras=true;
  const paint=()=>new T.MeshStandardMaterial({name:'CapPaint',color:0xffffff,roughness:.45,metalness:.1});
  const dark=()=>new T.MeshStandardMaterial({name:'ExtraDark',color:0x2b2b33,roughness:.5,metalness:.4});
  const g=new T.Group();g.position.set(0,-.35,0);
  if(i===1){const w=new T.Mesh(new T.BoxGeometry(2.0,.14,.55),paint());w.position.set(0,.5,-1.25);g.add(w);
   for(const x of [-.78,.78]){const s=new T.Mesh(new T.BoxGeometry(.16,.55,.42),paint());s.position.set(x,.18,-1.25);g.add(s);}}
  if(i===2){for(const x of [-.45,.45]){const t=new T.Mesh(new T.CylinderGeometry(.16,.2,.9,8),dark());t.rotation.x=Math.PI/2;t.position.set(x,.1,-1.35);g.add(t);}
   const bar=new T.Mesh(new T.BoxGeometry(1.5,.16,.16),dark());bar.position.set(0,.55,-1.0);g.add(bar);}
  if(i===3){const d=new T.Mesh(new T.BoxGeometry(1.7,.12,.6),paint());d.position.set(0,-.05,-1.3);d.rotation.x=.25;g.add(d);
   for(const x of [-1.0,1.0]){const s=new T.Mesh(new T.BoxGeometry(.12,.2,1.5),paint());s.position.set(x,-.1,-.2);g.add(s);}}
  if(g.children.length){g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});p.add(g);}}}
function buildKartInstances(types){kartExtras();kartInst=null;if(!types||!types.length||!P.kart||!P.driver||!P.kartwheel)return;const n=types.length,inst={n,body:[],wheel:[],groups:[],dmap:[]};
 const mk=(proto,arr,paint,count)=>proto.traverse(o=>{if(!o.isMesh)return;const isPaint=o.material.name===paint;const m=isPaint?o.material.clone():o.material;if(isPaint)m.color.set(0xffffff);const im=new T.InstancedMesh(o.geometry,m,count);im.frustumCulled=false;im.castShadow=true;im.receiveShadow=true;im.instanceMatrix.setUsage(T.DynamicDrawUsage);if(isPaint)for(let i=0;i<count;i++)im.setColorAt(i,_col.setHex(0xffffff));kartsG.add(im);arr.push({im,paint:isPaint});});
 mk(P.kart,inst.body,'BodyPaint',n);mk(P.kartwheel,inst.wheel,null,n*4);
 // Fahrerfiguren: je Figurtyp ein Satz Instanzen, damit das Feld gemischt ist
 const seen=new Map();
 types.forEach((t,slot)=>{let gi=seen.get(t);if(gi===undefined){const proto=P[(DRIVERS[t]||DRIVERS[0]).k]||P.driver,meshes=[];mk(proto,meshes,'CapPaint',types.filter(x=>x===t).length);gi=inst.groups.length;inst.groups.push({meshes,used:0});seen.set(t,gi);}
  const gr=inst.groups[gi];inst.dmap[slot]={g:gr,i:gr.used++};});
 kartInst=inst;}
function kartVirtual(color,slot){const g=new T.Group(),wheels=[];for(const [x,y,z,s,w] of WHEEL_SLOTS){const piv=new T.Group(),wh=new T.Object3D();piv.position.set(x,y,z);wh.rotation.order='YXZ';if(x>0)wh.rotation.y=Math.PI;wh.scale.set(w,s,s);piv.add(wh);g.add(piv);wheels.push({piv,wh,front:z>0,r:y,dir:x>0?-1:1});}
 const driver=new T.Object3D();driver.position.set(0,.95,-.35);g.add(driver);
 const shield=new T.Mesh(shieldGeo,shieldMat);shield.position.y=1;shield.visible=false;g.add(shield);const flames=[-.45,.45].map(x=>{const f=new T.Mesh(flameGeo,flameMat);f.position.set(x,.72,-1.72);f.visible=false;g.add(f);return f;});
 g.userData={parts:{wheels,driver},shield,flames,slot};attachGlider(g,color);
 const paint=(list,i)=>{for(const p of list)if(p.paint){p.im.setColorAt(i,_col.setHex(color));p.im.instanceColor.needsUpdate=true;}};
 paint(kartInst.body,slot);const dm=kartInst.dmap[slot];if(dm)paint(dm.g.meshes,dm.i);return g;}
function syncKartInstances(){if(!kartInst)return;for(const r of racers){const u=r.mesh.userData;if(u.slot===undefined)continue;r.mesh.updateMatrixWorld(true);const i=u.slot;
  for(const p of kartInst.body)p.im.setMatrixAt(i,r.mesh.matrixWorld);const dm=kartInst.dmap[i];if(dm)for(const p of dm.g.meshes)p.im.setMatrixAt(dm.i,u.parts.driver.matrixWorld);u.parts.wheels.forEach((w,k)=>{for(const p of kartInst.wheel)p.im.setMatrixAt(i*4+k,w.wh.matrixWorld);});}
 for(const key of ['body','wheel'])for(const p of kartInst[key])p.im.instanceMatrix.needsUpdate=true;
 for(const gr of kartInst.groups)for(const p of gr.meshes)p.im.instanceMatrix.needsUpdate=true;}
function boostTexture(){return canvasTex(64,128,(q,w,h)=>{q.fillStyle='#ffc93c';q.fillRect(0,0,w,h);q.strokeStyle='#ff5a1f';q.lineWidth=12;q.lineCap='round';for(let y=10;y<h;y+=64){q.beginPath();q.moveTo(8,y+34);q.lineTo(w/2,y+6);q.lineTo(w-8,y+34);q.stroke();}},true);}

const bprof=[];let bprofT=0;const bm=l=>{const n=performance.now();bprof.push([l,+(n-bprofT).toFixed(1)]);bprofT=n;};
let builtSel=-1,worldDirty=true,boxInst=[],boxQ=null,mapBase=null,agravWalls=[],agravGates=[],UG_MAT=null,UG_GEO=null;
// Jede gebaute Strecke bleibt als eigene Szenengruppe im Speicher: Zurueckwechseln = Gruppe tauschen (kein Neubau, kein Upload)
const worldCache=new Map();
const courseState=()=>({world,course,theme,curve,length,TP,cpU,gaps,zones,bats,mapInfo,obsGrid,flags,balloons,ramps,pads,rings,spores,swingers,boostPads,sporeMesh,crowd,fireflies,foamRing,boostTex,startLights,boxes,boxInst,boxQ,mapBase,rails,forks,raises,tunnels,agrav,loops,crystals,bg:scene.background,fog:scene.fog,revealed:true});
function loadCourse(c){({world,course,theme,curve,length,TP,cpU,gaps,zones,bats,mapInfo,obsGrid,flags,balloons,ramps,pads,rings,spores,swingers,boostPads,sporeMesh,crowd,fireflies,foamRing,boostTex,startLights,boxes,boxInst,boxQ,mapBase,rails,forks,raises,tunnels,agrav,loops,crystals}=c);scene.background=c.bg;scene.fog=c.fog;applyTheme();}
function disposeCourse(i){const c=worldCache.get(i);if(!c)return;if(c.world.parent)c.world.parent.remove(c.world);clearGroup(c.world);worldCache.delete(i);}
let revealQueue=null;
function startReveal(){const kids=world.children.slice();for(const k of kids)k.visible=false;world.visible=true;revealQueue=kids;}
function flushReveal(){if(revealQueue){for(const k of revealQueue)k.visible=true;revealQueue=null;}}
function buildCourse(force){if(!force&&builtSel===selected&&!worldDirty){resetRace();return;}
 flushReveal();if(builtSel>=0&&worldCache.has(builtSel))worldCache.get(builtSel).mapBase=mapBase;
 if(worldDirty&&builtSel>=0)disposeCourse(builtSel);if(world.parent)worldRoot.remove(world);worldDirty=false;builtSel=selected;
 const cached=!force&&worldCache.get(selected);
 if(cached){loadCourse(cached);worldRoot.add(world);actors.visible=true;buildToken++;worldReady=true;$('trackLoading').hidden=true;if(cached.revealed)world.visible=true;else{cached.revealed=true;startReveal();}}
 else{disposeCourse(selected);buildWorld();worldCache.set(selected,courseState());worldRoot.add(world);warmup();}
 resetRace();setText('courseLabel',course.name);setText('courseNo',String(selected+1).padStart(2,'0'));}
// Andere Strecken im Leerlauf des Menues vorbauen (Shader kompilieren im Hintergrund)
function prebuild(i){if(worldCache.has(i)||i===builtSel)return;const cur=courseState(),sel=selected;worldRoot.remove(world);selected=i;
 try{buildWorld();const c=courseState();c.revealed=false;worldCache.set(i,c);try{renderer.compileAsync(c.world,camera,scene);}catch(e){}}finally{selected=sel;loadCourse(cur);worldRoot.add(world);}}
let lastInput=performance.now();for(const ev of ['pointerdown','keydown'])addEventListener(ev,()=>{lastInput=performance.now();},{capture:true,passive:true});
function prebuildTick(){if(TEST||state!=='menu'||!worldReady||revealQueue||performance.now()-lastInput<2000)return;const next=courses.findIndex((_,i)=>!worldCache.has(i));if(next>=0)prebuild(next);}
function applyTheme(){renderer.toneMappingExposure=theme.exposure;
 hemi.color.setHex(theme.hemiSky);hemi.groundColor.setHex(theme.hemiGround);hemi.intensity=theme.hemiInt;sun.color.setHex(theme.sunCol);sun.intensity=theme.sunInt;sun.position.set(...theme.sunPos);fill.color.setHex(theme.fillCol);fill.intensity=theme.fillInt;headlight.intensity=theme.head!==undefined?theme.head:(theme.stars?90:0);
 stars.visible=moon.visible=theme.stars;sunGlow.visible=!theme.stars;sunGlow.position.set(theme.sunPos[0]*2.6,Math.max(80,theme.sunPos[1]*2),theme.sunPos[2]*2.6);sunGlow.material.color.setHex(course.theme==='canyon'?0xffc28a:0xffffff);}
// Flow: enge Stellen der Mittellinie (Radius < 24 m) werden iterativ aufgeweitet, der Rest bleibt wie entworfen
// Looping: nach der Glaettung wird an der gewuenschten Stelle ein 360-Grad-Kreis in die
// Mittellinie eingesetzt. Weil das erst danach passiert, passt die Tangente genau und die
// Glaettung kann den Kreis nicht mehr zusammenziehen.
function smoothCurve(points,minR=24){const base=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x*TRACK_SCALE,0,z*TRACK_SCALE)),true,'catmullrom',.38);base.arcLengthDivisions=3000;
 const n=360;let p=base.getSpacedPoints(n).slice(0,n).map(v=>[v.x,v.z]);
 const rad=(a,b,c)=>{const ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ca=Math.hypot(a[0]-c[0],a[1]-c[1]),ar=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;return ar<1e-6?1e9:ab*bc*ca/(4*ar);};
 for(let it=0;it<400;it++){let worst=1e9;const tight=new Uint8Array(n);for(let i=0;i<n;i++){const r=rad(p[(i-3+n)%n],p[i],p[(i+3)%n]);worst=Math.min(worst,r);if(r<minR*1.25)for(let k=-8;k<=8;k++)tight[(i+k+n)%n]=1;}if(worst>=minR)break;p=p.map((b,i)=>{if(!tight[i])return b;const a=p[(i-1+n)%n],c=p[(i+1)%n];return [b[0]+((a[0]+c[0])/2-b[0])*.5,b[1]+((a[1]+c[1])/2-b[1])*.5];});}
 const c=new T.CatmullRomCurve3(p.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');c.arcLengthDivisions=4000;return c;}
function buildWorld(){mapBase=null;bprof.length=0;bprofT=performance.now();world=new T.Group();obsGrid=new Map();TP=newTP();swayCache=new Map();
 flags=[];balloons=[];ramps=[];pads=[];rings=[];spores=[];swingers=[];gaps=[];zones=[];bats=null;boostPads=[];sporeMesh=null;crowd=null;fireflies=null;rails=[];forks=[];raises=[];tunnels=[];agrav=[];loops=[];crystals=[];
 course=courses[selected];theme=THEMES[course.theme];
 scene.background=skyTexture(hex(theme.skyTop),hex(theme.skyBottom));scene.fog=new T.Fog(theme.fog,theme.fogNear,theme.fogFar);applyTheme();
 curve=smoothCurve(course.points,24);length=curve.getLength();bm('clear+theme');buildTable();bm('table');
 cpU=course.points.map(([x,z])=>projectGlobal(x*TRACK_SCALE,z*TRACK_SCALE));
 // Looping: ein kurzes, moeglichst gerades Stueck Fahrbahn wird im Bild zu einem senkrechten
 // Kreis aufgestellt (Radius R, Fussabdruck span). Gefahren wird dabei ganz normal geradeaus -
 // deshalb gibt es keine unfahrbar enge Kurve, keine Selbstkreuzung und keinen Sprung am Ausgang.
 // sig = Bildmeter je Fahrbahnmeter; damit wird der Vorschub gebremst, sonst liefe der Kreis im
 // Zeitraffer. Die geradeste Stelle in der Naehe gewinnt, damit der Kreis nicht verwunden steht.
 if(course.loopc){const [cpv,radC]=course.loopc,R=radC*TRACK_SCALE,span=Math.max(30,R*1.85);
  // Belegte Abschnitte (Tunnel, Bruecke, Plateau, Schlucht) scheiden aus - dort stuende der
  // Kreis im Bauwerk. Sonst gewinnt die geradeste Stelle in der Naehe.
  const busy=[];
  for(const [a,b] of course.tunnel||[])busy.push([cpDist(a),cpDist(b)]);
  for(const [a,b] of (course.raise||[]).concat(course.plateau?[course.plateau]:[]))busy.push([cpDist(a),cpDist(b)]);
  for(const [v,L] of course.gaps||[])busy.push([cpDist(v)-L,cpDist(v)+L]);
  const taken=d=>busy.some(([a,b])=>lapDist(d+span+14-a)<lapDist(b-a)+span+28);
  const c0=cpDist(cpv);let s=c0,best=1e9;
  for(let o=-60;o<=60;o+=3){const d=lapDist(c0+o);if(taken(d))continue;let m=0;
   for(let t=-10;t<=span+10;t+=3)m=Math.max(m,Math.abs(trackAt(d+t).kap));
   const sc=m+Math.abs(o)*2e-5;if(sc<best){best=sc;s=d;}}
  const mid=lapDist(s+span/2),[mi,mj,mk]=tIdx(mid);
  const mx=TP.x[mi]+(TP.x[mj]-TP.x[mi])*mk,mz=TP.z[mi]+(TP.z[mj]-TP.z[mi])*mk;
  loops=[{s,span,R,gap:R*.34,sig:TAU*R/span}];
  // Unter dem Kreis bleibt es frei: dort stuende Deko sonst mitten in der Anfahrt
  zones.push({d:mid,half:span/2+26,x:mx,z:mz,r:26});}
 // Hoehenprofil: Huegel (Gauss) + Plateau; Ueberhoehung aus der Kruemmung
 // Huegel amplitude gedämpft (x .6): volle Hoehen fuehlten sich als staendiges Ruckeln an und
 // warfen das Kart bei Tempo von der Fahrbahn (Kuppenabsprung) - Flow geht vor Sprunghunger.
 const hills=(course.hills||[]).map(([v,a,w])=>[cpDist(v)/length,a*.6,w]);raises=(course.raise||[]).concat(course.plateau?[[...course.plateau,0]]:[]).map(([a,b,h,r,br])=>({s:cpDist(a),e:cpDist(b),h,r,bridge:!!br}));
 for(let i=0;i<PS;i++){const u=i/PS,d=u*length;let h=0;for(const [c,a,w] of hills){let du=u-c;du-=Math.round(du);h+=a*Math.exp(-(du*du)/(w*w));}h+=raiseH(d);const b=clamp(TP.k[i]*4,-.12,.12);TP.b[i]=b;TP.h[i]=h+Math.abs(b)*9.8;}
 for(const [v,L] of course.gaps||(course.gap?[course.gap]:[])){const c=cpDist(v);gaps.push({start:c-L/2,end:c+L/2,c});}
 tunnels=(course.tunnel||[]).map(([a,b,style])=>({s:cpDist(a),e:cpDist(b),style:style||'rock'}));
 // Anti-Grav-Abschnitte: 'wall' kippt bis zum Winkel und zurueck, 'roll' dreht einmal ganz durch, 'flip' geht ueber Kopf
 // hold = Winkel, der in der Mitte der Zone gehalten wird ('over' faehrt kopfueber).
 // Der Sichthub ist fuer alle Bauarten gleich: jede dreht irgendwann durch die Senkrechte,
 // und dort ragt die halbe Fahrbahnbreite nach unten.
 agravWalls=[];agravGates=[];agrav=(course.agrav||[]).map(([a,b,mode,deg])=>{const s=cpDist(a),e=cpDist(b),m=mode||'wall',dg=(deg===undefined?90:deg)*Math.PI/180;
  const hold=m==='over'||m==='flip'?Math.PI:clamp(Math.abs(dg),.35,TAU-.35);
  return {s,e,span:lapDist(e-s),mode:m==='flip'?'over':m,hold,sgn:dg<0?-1:1,lift:12.5};});
 for(let i=0;i<PS;i++){const d=i/PS*length;TP.rl[i]=rollAt(d);TP.lf[i]=liftAt(d);}
 buildForks();
 let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;for(let i=0;i<PS;i+=8){minX=Math.min(minX,TP.x[i]);maxX=Math.max(maxX,TP.x[i]);minZ=Math.min(minZ,TP.z[i]);maxZ=Math.max(maxZ,TP.z[i]);}
 mapInfo={cx:(minX+maxX)/2,cz:(minZ+maxZ)/2,k:Math.min(180/(maxX-minX),140/(maxZ-minZ))};
 bm('heights');const random=rng(course.seed);
 // Boden, Meer, Kuestenschaum
 const grassMat=new T.MeshStandardMaterial({map:speckleTexture(hex(theme.grass),hex(theme.grassSpot),2600),roughness:1});
 if(!theme.space)mesh(new T.CylinderGeometry(210,195,12,96),grassMat,world,0,-6.3,0).castShadow=false;
 const seaMat=mat(theme.sea,theme.lavaSea?{roughness:.65,emissive:0xff3a08,emissiveIntensity:.95}:{roughness:.3});seaMat.onBeforeCompile=sh=>{sh.uniforms.uTime=shaderTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying float vWave;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat w=sin(position.x*.035+uTime*1.3)*.8+sin(position.y*.05-uTime*1.1)*.6+sin((position.x+position.y)*.02+uTime*.7)*.9;transformed.z+=w;vWave=w;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWave;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb+=vec3(.10,.15,.15)*smoothstep(.7,2.1,vWave);');};
 const sea=mesh(new T.PlaneGeometry(1800,1800,90,90),seaMat,world,0,-12,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;sea.visible=!theme.space;
 foamRing=mesh(new T.RingGeometry(204,217,72),new T.MeshBasicMaterial({color:theme.foam,transparent:true,opacity:.22,depthWrite:false}),world,0,-11.35,0);foamRing.rotation.x=-Math.PI/2;foamRing.castShadow=false;foamRing.visible=!theme.space;
 bm('ground+sea');
 const glow=theme.glow;
 stripSegs(0,17.8,.04,6,mat(theme.edge,glow?{emissive:theme.edge,emissiveIntensity:.35}:{}));
 if(theme.rainbowRoad){
  // Farbband laengs der Fahrbahn, leicht leuchtend und langsam wandernd
  const rb=canvasTex(8,256,(q,w,h)=>{const g=q.createLinearGradient(0,0,0,h);
   ['#ff3b6b','#ff9a3c','#ffe45c','#5cff9a','#4fd8ff','#8a5cff','#ff4fd8','#ff3b6b'].forEach((c,i,a)=>g.addColorStop(i/(a.length-1),c));
   q.fillStyle=g;q.fillRect(0,0,w,h);},true);
  rb.repeat.set(1,1);
  // Glasbahn (R28): halbtransparent und beidseitig - der Sternenhimmel scheint durch die
  // Regenbogenpiste, wie bei der Regenbogenstrasse ueber dem Kosmos. depthWrite aus, sonst
  // verdeckte die eigene Flaeche die transparenten Nachbarn an Looping und Kuppen.
  // R29: Deckkraft 60 % und Emission zurueckgenommen - 80 % war dem Nutzer noch zu dicht.
  const rbMat=new T.MeshStandardMaterial({map:rb,emissive:0xffffff,emissiveMap:rb,emissiveIntensity:.7,roughness:.5,metalness:.1,transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide});
  rainbowTex=rb;stripSegs(0,15.2,.065,6,rbMat);}
 else stripSegs(0,15.2,.065,6,new T.MeshStandardMaterial({map:speckleTexture(hex(theme.road),hex(theme.roadSpot),900),roughness:.9}));
 const curbTex=canvasTex(8,64,(q)=>{q.fillStyle=theme.curbA;q.fillRect(0,0,8,32);q.fillStyle=theme.curbB;q.fillRect(0,32,8,32);},true);curbTex.magFilter=T.NearestFilter;
 const curbMat=new T.MeshStandardMaterial({map:curbTex,roughness:.7,...(glow?{emissive:0xffffff,emissiveMap:curbTex,emissiveIntensity:.9}:{})});for(const off of [-8.2,8.2])stripSegs(off,.8,.13,8,curbMat);
 const dashTex=canvasTex(8,32,(q)=>{q.fillStyle=theme.line;q.fillRect(0,0,8,16);},true);stripSegs(0,.22,.075,8,new T.MeshStandardMaterial({map:dashTex,alphaTest:.5,roughness:.8,...(glow?{emissive:0xffffff,emissiveMap:dashTex,emissiveIntensity:1}:{})}),false);
 const skirtMat=new T.MeshStandardMaterial({map:speckleTexture(hex(theme.skirt),hex(theme.grassSpot),1800),roughness:1,side:T.DoubleSide});
 if(!theme.space){skirt(-1,skirtMat);skirt(1,skirtMat);}
 // Im Weltall ist die Bahn seit R28 die Glasbahn selbst (DoubleSide, halbtransparent) -
 // die fruehere blickdichte Unterseite haette genau den Blick auf die Sterne verbaut.
 // Anti-Grav: dunkler Kiel unter der Wandfahrt, damit die gekippte Fahrbahn massiv wirkt
 // Textur vor dem Strassenbau: das Energieband der Anti-Grav-Bahn und des Loopings braucht sie,
 // und beide entstehen frueher als die Turbofelder.
 boostTex=boostTexture();
 if(agrav.length){const keelMat=new T.MeshStandardMaterial({color:theme.glow?0x1b1830:0x4c4640,roughness:.95,side:T.DoubleSide});
  const col=theme.glow?0x7cf3ff:0x59d7ff;
  const glowMat=new T.MeshBasicMaterial({color:col,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide});
  const ringMat=new T.MeshBasicMaterial({color:col,side:T.DoubleSide});
  const postMat=mat(0x232c44,{emissive:col,emissiveIntensity:.6,roughness:.5});
  const posts=[],_pv=new T.Vector3();
  // Kristall-Farbton je Strecken-Theme (Material "CrystalPaint" wird getönt, wie Pilzhüte)
  const CTINT={forest:0x8ef0c9,canyon:0xffd98a,night:0x7cf3ff,haunted:0xc09aff,lava:0xffab5e,rainbow:0xb09aff};
  for(const q of agrav){const span=lapDist(q.e-q.s),steps=Math.ceil((span+12)/1.1);
   addStrip(strip(q.s-6,q.e+6,0,17.8,-1.6,6,steps),keelMat);
   // Energieband auf der Fahrbahn
   {const gm=glowMat.clone();gm.map=boostTex||null;const m=addStrip(strip(q.s+1,q.e-1,0,15.2,.08,7,Math.ceil(span/1.3)),gm,false);m.castShadow=false;}
   // Energiewaende beidseitig: machen die Magnetbande sichtbar. Ohne sie gleitet man bis an den
   // Rand und weiss nicht, warum man dort nicht weiterkommt - das fuehlt sich abfliegen an.
   {const wm=glowMat.clone();wm.opacity=.3;agravWalls.push(wm);const n=Math.ceil(span/1.2),v=[],idx=[];
    for(const side of [-1,1]){const base=v.length/3;
     for(let i=0;i<=n;i++){const u=i/n,d=q.s+(q.e-q.s)*u,hgt=1.15*Math.min(1,Math.sin(Math.PI*u)*4);
      const a=posAt(d,side*8.75,0,_pv),b=posAt(d,side*8.75,hgt,new T.Vector3());
      v.push(a.x,a.y,a.z,b.x,b.y,b.z);
      if(i<n){const o=base+i*2;idx.push(o,o+2,o+1,o+1,o+2,o+3);}}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);
    const m=new T.Mesh(g,wm);m.castShadow=false;m.frustumCulled=false;world.add(m);}
   // Torringe an Ein- und Ausfahrt (pulsiere leicht, damit das Feld lebendig wirkt)
   for(const d of [q.s+1.5,q.e-1.5]){const s=sample(d,0),g=new T.Mesh(new T.TorusGeometry(11.8,.5,8,22),ringMat);
    g.position.copy(s.p);g.rotation.order='YXZ';g.rotation.y=s.angle;g.rotation.z=rollAt(d);g.castShadow=false;world.add(g);agravGates.push(g);}
   // Magnet-Ringe: schweben auf der Ideallinie durch die Zone. Im Korkenzieher mitnehmen
   // (roll), in der Wandfahrt einer in der Mitte - durchfahren gibt RING-BOOST.
   for(const u of (q.mode==='roll'?[.3,.55,.8]:[.45])){const d=lapDist(q.s+span*u),p=posAt(d,0,1.7,new T.Vector3());
    const rg=new T.Mesh(new T.TorusGeometry(4.6,.32,10,30),new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.1,roughness:.4}));
    rg.position.copy(p);rg.rotation.order='YXZ';const s=sample(d,0);rg.rotation.y=s.angle;rg.rotation.z=rollAt(d);
    rg.castShadow=false;world.add(rg);rings.push({d,off:0,y:p.y,mesh:rg,flash:0,ag:1});}
   // Pylonen: stehen senkrecht unter der schwebenden Bahn
   // nur dort, wo die Bahn noch kaum gedreht ist - unter einer senkrechten oder kopfueber
   // liegenden Fahrbahn stehen Stuetzen nicht nur falsch, sie verdecken auch die Sicht
   for(let d=q.s+4;d<q.e-2;d+=11){if(Math.abs(rollAt(d))>.55&&Math.abs(rollAt(d))<TAU-.55)continue;const [i,j,k]=tIdx(d);
    const cx=TP.x[i]+(TP.x[j]-TP.x[i])*k,cz=TP.z[i]+(TP.z[j]-TP.z[i])*k,top=TP.h[i]+(TP.h[j]-TP.h[i])*k+TP.lf[i]+(TP.lf[j]-TP.lf[i])*k;
    if(top<2)continue;posts.push(new T.BoxGeometry(1.2,top,1.2).translate(cx,top/2,cz));}
   // Schwebende Energie-Kristalle (Blender-Asset) zwischen den Pylonen unter der Bahn:
   // drehen sich langsam und schweben - gibt der Zone Tiefe ohne Draw-Call-Orgie (3 pro Zone).
   for(let ci=0;ci<3;ci++){const d=q.s+span*(.22+.28*ci),below=rollAt(d)>1.4?-4.2:-2.6,p=posAt(d,(ci%2?1:-1)*6.2,below,new T.Vector3());
    let cm=null;
    if(P.crystal){cm=cloneProto(P.crystal);cm.scale.setScalar(.85+ci*.12);
     const tc=CTINT[course.theme]||col;applyTint(cm,'CrystalPaint',tc,{emissiveColor:tc,emissiveIntensity:1.4});}
    else{cm=new T.Mesh(new T.OctahedronGeometry(1.1),new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.3,roughness:.3}));cm.scale.y=1.8;}
    cm.position.copy(p);cm.rotation.y=ci*2.1;cm.castShadow=false;world.add(cm);crystals.push({m:cm,base:p.y,ph:ci*2.1});}}
  if(posts.length){const pm=new T.Mesh(mergeGeometries(posts),postMat);pm.castShadow=true;world.add(pm);}}
 // Looping: Traggeruest wie bei einer Achterbahn - zwei Holme entlang der Bahn, Querstreben
 // dazwischen, Neonringe am Fuss. Die Holme werden ueber posAt gesetzt und folgen dem Kreis
 // deshalb exakt, auch dort wo er nach vorn geneigt steht.
 if(loops.length){const steel=mat(theme.glow?0x2a2150:0x59606e,{roughness:.5,metalness:.6});
  const neon=new T.MeshBasicMaterial({color:theme.glow?0x7cf3ff:0xffc14d});
  const _d=new T.Vector3(),_mid=new T.Vector3(),_qq=new T.Quaternion(),_mm=new T.Matrix4(),_ux=new T.Vector3(1,0,0),_sc=new T.Vector3();
  const bar=(list,p0,p1,w)=>{const len=p0.distanceTo(p1);if(len<.05)return;
   _d.subVectors(p1,p0).divideScalar(len);_mid.addVectors(p0,p1).multiplyScalar(.5);
   _qq.setFromUnitVectors(_ux,_d);_mm.compose(_mid,_qq,_sc.set(len,w,w));
   list.push(new T.BoxGeometry(1,1,1).applyMatrix4(_mm));};
  for(const q of loops){const parts=[],N=Math.max(36,Math.round((q.span+TAU*q.R)/4.5));let pv=null;
   for(let i=0;i<=N;i++){const d=q.s+q.span*i/N,cu=[posAt(d,-11.2,-.8,new T.Vector3()),posAt(d,11.2,-.8,new T.Vector3())];
    if(pv){bar(parts,pv[0],cu[0],.5);bar(parts,pv[1],cu[1],.5);}
    if(i%3===0)bar(parts,cu[0],cu[1],.34);
    pv=cu;}
   if(parts.length){const m=new T.Mesh(mergeGeometries(parts),steel);m.castShadow=true;m.receiveShadow=true;world.add(m);}
   // Leuchtband auf der Fahrbahn, damit der Kreis auch von weitem als Looping lesbar ist
   {const gm=new T.MeshBasicMaterial({color:theme.glow?0x7cf3ff:0xffc14d,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide,map:boostTex||null});
    const m2=addStrip(strip(q.s+.4,q.s+q.span-.4,0,14.6,.09,7,Math.ceil(q.span*(q.sig*1.9+1)/1.2),q.sig+1),gm,false);m2.castShadow=false;}
   for(const d of [q.s+1,q.s+q.span-1]){const s=sample(d,0),g=new T.Mesh(new T.TorusGeometry(12.4,.42,8,24),neon);
    g.position.copy(s.p);g.position.y+=1.1;g.rotation.order='YXZ';g.rotation.y=s.angle;g.castShadow=false;world.add(g);}}}
 bm('road+skirts');buildGaps();buildMansion();bm('gaps+mansion');
 // Start-Ziel-Tor und Schachbrett
 const start=sample(0),arch=new T.Group();arch.position.copy(start.p);arch.rotation.y=start.angle;world.add(arch);
 if(P.gate){const g=cloneProto(P.gate);applyTint(g,'CapPaint',theme.caps[0]);arch.add(g);}else{box(arch,cream,-9,4,0,.6,8,.6);box(arch,cream,9,4,0,.6,8,.6);box(arch,mat(0xed6350),0,8,0,19,2,.7);}
 for(const side of [-1,1]){const p=sample(0,side*9.3).p;addObstacle(p.x,p.z,1);}
 const bz=P.gate?.26:.37;mesh(new T.PlaneGeometry(16,1.6),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,bz);mesh(new T.PlaneGeometry(16,1.6),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,-bz).rotation.y=Math.PI;
 const checker=canvasTex(64,16,(q)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){q.fillStyle=(x+y)%2?'#273943':'#fff1d9';q.fillRect(x*4,y*4,4,4);}});checker.magFilter=T.NearestFilter;
 {const panel=new T.Group();panel.position.set(0,5.6,-.75);arch.add(panel);box(panel,dark,0,0,0,5.2,1.5,.3);startLights=[-1.7,0,1.7].map(x=>{const m=new T.MeshStandardMaterial({color:0x220808,emissive:0x000000,roughness:.4});const l=new T.Mesh(new T.SphereGeometry(.5,16,12),m);l.position.set(x,0,-.2);panel.add(l);return m;});lightState=-1;}addStrip(strip(-1.6,1.6,0,15.2,.09,3.2,2),new T.MeshStandardMaterial({map:checker,roughness:.8}));
 // Wehende Zielflaggen neben dem Tor - Schachbrett wie auf der Ziellinie, im Wimpel-Wind
 {const ftex=canvasTex(64,64,(q)=>{for(let x=0;x<8;x++)for(let y=0;y<8;y++){q.fillStyle=(x+y)%2?'#273943':'#fff1d9';q.fillRect(x*8,y*8,8,8);}});ftex.magFilter=T.NearestFilter;
  const s0=sample(0,0),poles=[],pens=[];
  for(const sx of [-1,1]){const p=sample(0,sx*12.6).p,M4=new T.Matrix4().makeRotationY(s0.angle).setPosition(p.x,Math.max(0,p.y),p.z);
   poles.push(new T.CylinderGeometry(.09,.13,7.4,6).translate(sx*12.6,3.7,0).applyMatrix4(M4));addObstacle(p.x,p.z,.4);
   const pg=new T.PlaneGeometry(3.0,1.8,8,3),n=pg.attributes.position.count,xn=new Float32Array(n);
   pg.translate(-sx*(3.0+.12),6.4,0);for(let v=0;v<n;v++)xn[v]=Math.max(0,(sx>0?3.12-pg.attributes.position.getX(v):pg.attributes.position.getX(v))/3.0);
   pg.userData={xn};pg.applyMatrix4(M4);pens.push(pg);}
  const pmesh=new T.Mesh(mergeGeometries(poles),cream);pmesh.castShadow=true;world.add(pmesh);
  const geo=mergeGeometries(pens),xn=new Float32Array(geo.attributes.position.count),dx=xn.slice(),dz=xn.slice();let o=0;
  for(const pg of pens){xn.set(pg.userData.xn,o);o+=pg.userData.xn.length;}
  dx.fill(Math.sin(s0.angle));dz.fill(Math.cos(s0.angle));
  const fm=new T.Mesh(geo,new T.MeshStandardMaterial({map:ftex,side:T.DoubleSide,roughness:.8}));fm.frustumCulled=false;world.add(fm);
  flags.push({mesh:fm,base:geo.attributes.position.array.slice(),xn,dx,dz,amp:.3});}
 // Boost-Pads
 const padMat=new T.MeshBasicMaterial({map:boostTex});
 for(const v of course.boost){const d=straightSpot(v,10,45,60);boostPads.push(d);addStrip(strip(d-2.3,d+2.3,0,11,.1,4.6,6),padMat,false);}
 for(const g of gaps){const d=g.start-40;boostPads.push(lapDist(d));addStrip(strip(d-2.3,d+2.3,0,11,.1,4.6,6),padMat,false);}
 // Rollzonen haben DURCHGAENGIGEN Turbo: das breite Energieband ist zugleich der Schub
 // (Funktion siehe update: inRoll haelt Schwung oben). Keine Einzelpads mehr - die Zone
 // schiebt durchgehend, wie ein langer Boost-Streifen.
 bm('gate+boost');
 // Ballonbogen ueber der Fahrbahn, 14 m nach dem Start-Ziel-Tor: beim Countdown steht er
 // hinter dem Tor im Bild, beim Zieleinlauf faehrt man durch ihn ins Ziel.
 // Alle Ballons teilen sich vier Instanz-Meshes (CapPaint je Instanz gefaerbt) - 4 Aufrufe.
 if(P.balloon){const NB=7,arc=[],rope=[];for(let i=0;i<NB;i++){const u=-1+2*i/(NB-1),s=samplePos(14,u*11.2,new T.Vector3()),h=12.6-3.5*u*u;
   arc.push({x:s.x,y:s.y+h,z:s.z,s:1.05+.2*(1-u*u),ry:-u*.5,col:FAN_COLS[i%FAN_COLS.length]});rope.push(s.clone().setY(s.y+h-1.1));}
  scatterColored(P.balloon,arc,'CapPaint',glow?.35:0);
  const ends=[samplePos(14,-12.4,new T.Vector3()),samplePos(14,12.4,new T.Vector3())];ends.forEach(p=>p.y=Math.max(0,p.y));
  const curve=new T.CatmullRomCurve3([ends[0],...rope,ends[1]]),cable=new T.Mesh(new T.TubeGeometry(curve,48,.07,5),dark);
  cable.castShadow=false;world.add(cable);
  const posts=mergeGeometries(ends.map(p=>new T.CylinderGeometry(.14,.18,2.4,6).translate(p.x,p.y+1.2,p.z)));
  const pm2=new T.Mesh(posts,cream);pm2.castShadow=true;world.add(pm2);}
 {const poles=[],pens=[],M4=new T.Matrix4(),col=new T.Color();for(let i=0;i<16;i++){const d=length*(i+.5)/16,fo=i%2?13:-13;if(inGap(d)||inZone(d,4)||forkBlocks(d,fo)||inBridge(d)||inTunnel(d))continue;const s=sample(d,fo);M4.makeRotationY(s.angle).setPosition(s.p.x,groundAt(d,fo).y-.1,s.p.z);addObstacle(s.p.x,s.p.z,.35);
  poles.push(new T.BoxGeometry(.12,3.1,.12).translate(0,1.55,0).applyMatrix4(M4));const pg=new T.PlaneGeometry(1.5,.7,5,1),n=pg.attributes.position.count,xn=new Float32Array(n),dx=new Float32Array(n),dz=new Float32Array(n),cc=new Float32Array(n*3);col.setHex(theme.pennants?theme.pennants[i%2]:(glow?(i%2?0xff3cac:0x2de2e6):(i%2?0xed6350:0xffd45c)));
  for(let v=0;v<n;v++){xn[v]=(pg.attributes.position.getX(v)+.75)/1.5;dx[v]=Math.sin(s.angle);dz[v]=Math.cos(s.angle);cc[v*3]=col.r;cc[v*3+1]=col.g;cc[v*3+2]=col.b;}pg.translate(.81,2.75,0).applyMatrix4(M4);pg.setAttribute('color',new T.BufferAttribute(cc,3));pg.userData={xn,dx,dz};pens.push(pg);}
 if(poles.length){world.add(new T.Mesh(mergeGeometries(poles),cream));const geo=mergeGeometries(pens);const xn=new Float32Array(geo.attributes.position.count),dx=xn.slice(),dz=xn.slice();let o=0;for(const pg of pens){xn.set(pg.userData.xn,o);dx.set(pg.userData.dx,o);dz.set(pg.userData.dz,o);o+=pg.userData.xn.length;}geo.attributes.position.setUsage(T.DynamicDrawUsage);
  const penMesh=new T.Mesh(geo,glow?new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}):new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.8}));penMesh.frustumCulled=false;world.add(penMesh);flags.push({mesh:penMesh,base:geo.attributes.position.array.slice(),xn,dx,dz});}}
 // Zaeune aussen an scharfen Kurven (auch Kollision)
  buildTunnels();buildBridges();buildRails();buildForkVisuals();
 bm('flags+fences');buildChevrons();bm('chevrons');
 buildScenery(random);bm('scenery');
 buildRamps();buildPads();buildSwingers();buildSpores();buildStands();bm('ramps..stands');
 boxes=[];for(const v of course.boxes){let d=cpDist(v);if(lapDist(d+52)<66)d=lapDist(d+72);for(const k of [-4,0,4]){const s=sample(d,k);boxes.push({distance:d,offset:k,x:s.p.x,z:s.p.z,baseY:s.p.y+1.6,cooldown:0});}}
 for(const f of forks){const rel=Math.round(f.span*.55),d=f.dA+rel,o=f.offT[rel];for(const k of [-2.6,2.6]){const s=sample(d,o+k);boxes.push({distance:lapDist(d),offset:o+k,x:s.p.x,z:s.p.z,baseY:Math.max(0,s.p.y)+1.6,cooldown:0});}}
 boxInst=[];const bsrc=[];if(P.itembox)P.itembox.traverse(o=>{if(o.isMesh)bsrc.push([o.geometry,o.material]);});else bsrc.push([new T.BoxGeometry(1.5,1.5,1.5),mat(0xffd858)]);
 for(const [g,m] of bsrc){const im=new T.InstancedMesh(g,m,boxes.length);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.frustumCulled=false;world.add(im);boxInst.push(im);}
 {const lm=label('?','#ed6350','#fff9df',128,128),geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(boxes.length*3),3));boxQ=new T.Points(geo,new T.PointsMaterial({map:lm.map,size:1.1,transparent:true,depthWrite:false}));boxQ.frustumCulled=false;world.add(boxQ);lm.dispose();}
 bm('boxes');}
// Neues Rennen auf derselben Strecke: Welt bleibt stehen, nur Fahrer & Zustand werden zurueckgesetzt (kein Ruckler beim Start)
function resetRace(){clearGroup(actors,kartsG);hazards=[];shots=[];bombs=[];fworks=[];for(const sh of shocks){sh.t=9;sh.m.visible=false;}roulette=null;cer=null;shake=0;lastPlace=8;leadAt=-99;wrongT=0;
 for(let i=0;i<SKIDS;i++){skids[i].life=0;skidMesh.setMatrixAt(i,_zeroM);}skidMesh.instanceMatrix.needsUpdate=true;for(let i=0;i<SPARKS;i++){sparkPool[i].life=0;sparkMesh.setMatrixAt(i,_zeroM);}sparkMesh.instanceMatrix.needsUpdate=true;for(let i=0;i<PUFFS;i++){puffPool[i].life=0;puffMesh.setMatrixAt(i,_zeroM);}puffMesh.instanceMatrix.needsUpdate=true;
 for(const b of boxes)b.cooldown=0;for(const s of spores)s.cd=0;for(const r of rings)r.flash=0;for(const p of pads)p.squash=0;lightState=-2;setLights(0);
 placeRacers();drawMap();}
// Shader aller selten sichtbaren Effekte vorab kompilieren (Flammen, Schild, Banane, Panzer), sonst ruckelt der erste Einsatz
// Shader im Hintergrund kompilieren (KHR_parallel_shader_compile); bis dahin bleibt die Strecke ausgeblendet statt das Bild einzufrieren
let buildToken=0,worldReady=true,readyPromise=Promise.resolve();
function warmup(){const tmp=new T.Group(),add=o=>{o.traverse(c=>{c.visible=true;c.frustumCulled=false;});tmp.add(o);};add(new T.Mesh(flameGeo,flameMat));add(new T.Mesh(shieldGeo,shieldMat));add(bombMesh());add(new T.Mesh(shockGeo,shocks[0].m.material));if(P.banana)add(cloneProto(P.banana));if(P.shell)add(cloneProto(P.shell));if(P.ghost)add(cloneProto(P.ghost));
 tmp.position.copy(camera.position);scene.add(tmp);const tok=++buildToken;let p;try{p=renderer.compileAsync(scene,camera);}catch(e){p=Promise.resolve();}scene.remove(tmp);
 worldReady=false;world.visible=false;actors.visible=false;$('trackLoading').hidden=false;
 readyPromise=Promise.race([p,new Promise(r=>setTimeout(r,8000))]).then(()=>{if(tok!==buildToken)return;worldReady=true;actors.visible=true;startReveal();$('trackLoading').hidden=true;});}

function placeRacers(){const cls=CLASSES[cc];racers=[];
 const order=isTT()?[0]:[1,2,3,4,5,0,6,7],ai=order.filter(id=>id!==0);
 // Karts bleiben zwischen Rennen stehen, solange Figur/Farbe/Feldgroesse gleich sind: spart Aufbau und Upload
 // Ladezustand mit in die Signatur: sonst bleiben notgebaute Karts im Zwischenspeicher haengen
 const sig=[order.length,colorIndex,driverIndex,KART_COLORS[colorIndex].gold?1:0,AI_DRIVERS.join(''),P.kart?1:0,P.driver?1:0,P.kartwheel?1:0,P.glider?1:0].join('|');
 const reuse=!!kartPool&&kartPool.sig===sig&&kartPool.meshes.length===order.length;
 if(!reuse){clearGroup(kartsG);kartInst=null;kartPool=null;buildKartInstances(isTT()?null:ai.map(id=>AI_DRIVERS[id]));}// Startplatz 6 fuer den Spieler: der Sieg muss erfahren werden
 for(let s=0;s<order.length;s++){const id=order[s],r=racer(id,AI_NAMES[id],id===0?KART_COLORS[colorIndex].c:AI_COLORS[id-1]);const d=-(9+Math.floor(s/2)*7.5+(s%2)*3),off=s%2?-3.3:3.3,p=sample(d,off);r.x=p.p.x;r.z=p.p.z;r.h=p.angle;r.distance=d;r.offset=off;r.safeD=d;
  const dv=DRIVERS[id===0?driverIndex:AI_DRIVERS[id]]||DRIVERS[0];
  r.mAcc=dv.acc;r.mTop=dv.top;r.mGrip=dv.grip;r.mTurn=dv.turn;r.kartScale=dv.sc;
  r.skill=clamp(cls.skill+(7-id)*.012+(id%3-1)*.02,.3,.98);r.laneBias=((id*37)%11-5)*.3;r.driftCd=0;r.aiDrift=0;
  if(reuse){r.mesh=kartPool.meshes[s];const u=r.mesh.userData;if(u.shield)u.shield.visible=false;if(u.glider)u.glider.visible=false;if(u.flames)for(const f of u.flames)f.visible=false;r.mesh.visible=true;r.mesh.scale.setScalar(1);}
  else{r.mesh=id===0||!kartInst?kart(r.color,id===0&&KART_COLORS[colorIndex].gold,id===0?driverIndex:AI_DRIVERS[id]):kartVirtual(r.color,ai.indexOf(id));kartsG.add(r.mesh);}
  racers[id]=r;}
 if(!reuse)kartPool={sig,meshes:order.map(id=>racers[id].mesh)};
 racers.forEach(r=>{vertical(r,1/60);syncKart(r,0);});syncKartInstances();camH=racers[0].h;lastPlace=racers.length;setupGhost();}
// ---------------------------------------------------------------- Zeitfahren: Geist der eigenen Bestzeit + Medaillen
const isTT=()=>mode==='tt'&&!gp.active;
let ghost=null,rec=null;
function setupGhost(){ghost=null;rec=null;if(!isTT())return;rec={x:[],y:[],z:[],h:[],d:[],next:0};const data=store.get(`ghost-${selected}`,null);if(!data||!data.x||!data.x.length)return;
 const g=kart(data.color??0xffffff,false,data.driver??0);g.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.material=[].concat(o.material).map(m=>{const c=m.clone();c.transparent=true;c.opacity=.36;c.depthWrite=false;return c;})[0];});actors.add(g);ghost={mesh:g,data,dist:0};}
function recordGhost(p){if(!rec||elapsed<rec.next)return;rec.next+=.1;rec.x.push(Math.round(p.x*10));rec.y.push(Math.round(p.y*10));rec.z.push(Math.round(p.z*10));rec.h.push(Math.round(p.h*100));rec.d.push(Math.round(p.distance*10));}
function updateGhost(){if(!ghost)return;const D=ghost.data,f=elapsed/.1,i=Math.floor(f),n=D.x.length;if(state!=='race'||i>=n-1){ghost.mesh.visible=state==='countdown';if(i>=n-1)ghost.dist=Infinity;return;}
 const k=f-i,L=a=>(a[i]+(a[i+1]-a[i])*k)/10;ghost.mesh.visible=true;ghost.mesh.position.set(L(D.x),L(D.y)+.1,L(D.z));ghost.mesh.rotation.set(0,(D.h[i]+(D.h[i+1]-D.h[i])*k)/100,0);ghost.dist=L(D.d);}
function medalOf(time){const m=course.medals;return time<=m[0]?0:time<=m[1]?1:time<=m[2]?2:3;}
const MEDALS=['🥇 GOLD','🥈 SILBER','🥉 BRONZE'];

// ---------- Viadukt: angehobene Abschnitte mit Bruecken-Flag bekommen Deck, Seitenwaende und Pfeiler statt Boeschung
function wallStrip(d0,d1,off,y0,y1,steps){const n=steps+1,v=new Float32Array(n*6),idx=[];for(let i=0;i<n;i++){const d=d0+(d1-d0)*i/steps,p=samplePos(d,off,_sp);v.set([p.x,p.y+y0,p.z,p.x,p.y+y1,p.z],i*6);if(i<steps){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function nearOtherRoad(x,z,d,dist){for(let i=0;i<PS;i+=3){if(Math.abs(wrapDiff(i*length/PS,d))<70)continue;if(Math.hypot(TP.x[i]-x,TP.z[i]-z)<dist)return true;}return false;}
function buildBridges(){const deckMat=mat(theme.glow?0x2c2650:0x9a948a,{roughness:.95,side:T.DoubleSide}),pillarMat=mat(theme.glow?0x241f40:0xb0aa9f,{roughness:.9});
 for(const q of raises){if(!q.bridge)continue;const span=lapDist(q.e-q.s),segs=[];let a=-1;for(let o=0;o<=span;o+=1){const d=q.s+o,top=trackAt(d).h>2.2&&!hasRoll(d);if(top&&a<0)a=d;if((!top||o+1>span)&&a>=0){segs.push([a,d]);a=-1;}}
  for(const [d0,d1] of segs){const steps=Math.ceil((d1-d0)/1.2);addStrip(strip(d0,d1,0,18.8,-1.2,6,steps),deckMat);const walls=[wallStrip(d0,d1,-9.4,-1.2,.12,steps),wallStrip(d0,d1,9.4,-1.2,.12,steps)];const wm=new T.Mesh(mergeGeometries(walls),deckMat);wm.castShadow=true;world.add(wm);
   const pg=[];for(let d=d0+5;d<d1-2;d+=14){const h=trackAt(d).h-1.2;if(h<1.8)continue;for(const side of [-1,1]){const p=samplePos(d,side*5.8,new T.Vector3());if(nearOtherRoad(p.x,p.z,d,11.5))continue;pg.push(new T.BoxGeometry(1.5,h,1.5).translate(p.x,h/2,p.z));addObstacle(p.x,p.z,1.15,h-.2);}}
   if(pg.length){const pm=new T.Mesh(mergeGeometries(pg),pillarMat);pm.castShadow=true;pm.receiveShadow=true;world.add(pm);}}}}
// ---------- Leitplanken: aussen an kritischen Kurven und beidseitig auf erhoehten Abschnitten. Weiche Gleit-Kollision statt Stopp.
const RAIL_OFF=9.2,RAIL_LIMIT=8.05,RAIL_COL={forest:['#e8352e','#ffffff',0x5a6470],canyon:['#ffd23f','#2b1d24',0x5a3a2a],night:['#2de2e6','#ff3cac',0x22204a],haunted:['#8a5cff','#1a1426',0x2e2840],lava:['#ff5a1f','#1a1012',0x3a2a2a]};
function railBlocked(d,side){if(inGap(d)||Math.abs(wrapDiff(d,0))<16)return true;
 // Im Looping und an seiner Anfahrt keine Planken: die Bahn kreuzt sich dort selbst, die Planken
 // der Geraden lägen quer im Kreis. Stattdessen haelt der Seitenmagnet das Kart auf der Bahn.
 if(loops.length)for(const q of loops)if(lapDist(d-q.s+20)<q.span+40)return true;
 if(hasRoll(d))return false;const fk=forkAt(d,14);return !!fk&&side===fk.f.side;}
function buildRails(){const list=[],ds=2;
 const scan=(test,kind,sides)=>{let a=-1,sd=0;for(let d=0;d<=length+ds;d+=ds){const s=test(d),ok=s!==0&&!railBlocked(d,s);if(ok&&a<0){a=d;sd=s;}else if(a>=0&&(!ok||s!==sd)){if(d-a>6)for(const x of sides(sd))list.push({d0:a-8,d1:d+8,side:x,kind});a=ok?d:-1;sd=s;}}};
 scan(d=>{const k=trackAt(d).kap;return Math.abs(k)>1/48?(k>0?-1:1):0;},'corner',s=>[s]);
 scan(d=>raiseH(d)>2&&!inGap(d)?1:0,'high',()=>[-1,1]);
 scan(d=>inTunnel(d)?1:0,'high',()=>[-1,1]);
 scan(d=>hasRoll(d)?1:0,'high',()=>[-1,1]);
 scan(d=>inZone(d,2)?1:0,'high',()=>[-1,1]);
 list.sort((a,b)=>a.side-b.side||a.d0-b.d0);for(const r of list){const last=rails[rails.length-1];if(last&&last.side===r.side&&r.d0<=last.d1+6){last.d1=Math.max(last.d1,r.d1);if(r.kind==='high')last.kind='high';}else rails.push({...r});}
 rails=rails.filter(r=>{for(let d=r.d0;d<=r.d1;d+=3)if(inGap(d))return false;return true;});
 if(!rails.length)return;const [ca,cb,postCol]=RAIL_COL[course.theme]||RAIL_COL.forest;
 const tex=canvasTex(64,16,(q,w,h)=>{q.fillStyle=ca;q.fillRect(0,0,w,h);q.fillStyle=cb;for(let x=-16;x<w;x+=32){q.beginPath();q.moveTo(x,h);q.lineTo(x+16,0);q.lineTo(x+32,0);q.lineTo(x+16,h);q.fill();}q.fillStyle='#0003';q.fillRect(0,h-3,w,3);},true);
 const band=new T.MeshStandardMaterial({map:tex,roughness:.45,metalness:.25,side:T.DoubleSide,...(theme.glow?{emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.55}:{})});
 const geos=[],posts=[];for(const r of rails){const steps=Math.max(2,Math.ceil((r.d1-r.d0)/1.6)),n=steps+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];
 for(let i=0;i<n;i++){const d=r.d0+(r.d1-r.d0)*i/steps,p=samplePos(d,r.side*RAIL_OFF,_sp);v.set([p.x,p.y+.3,p.z,p.x,p.y+.84,p.z],i*6);uv.set([(d-r.d0)/2.2,0,(d-r.d0)/2.2,1],i*4);if(i<steps){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}if(i%2===0)posts.push([p.x,p.y,p.z,d]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();geos.push(g);}
 const bm2=new T.Mesh(mergeGeometries(geos),band);bm2.castShadow=true;world.add(bm2);
 const pi=new T.InstancedMesh(new T.BoxGeometry(.14,1.5,.14),mat(postCol,{roughness:.6,metalness:.3}),posts.length);posts.forEach(([x,y,z,d],i)=>{const t=tanAt(d);_e.set(0,Math.atan2(t.x,t.z),rollAt(d),'YXZ');_q.setFromEuler(_e);_m.compose(_v.set(x,y+.1,z),_q,_s.set(1,1,1));pi.setMatrixAt(i,_m);});pi.castShadow=true;world.add(pi);}
function railCollide(r,me){if(!rails.length)return;
 // In Roll- und Loopzonen haelt die Fuehrung; zwei Korrektursysteme wuerden gegeneinander arbeiten
 if((agrav.length||loops.length)&&hasRoll(r.distance))return;
 const dl=lapDist(r.distance);for(const rl of rails){if(lapDist(dl-rl.d0)>rl.d1-rl.d0)continue;const so=r.offset*rl.side;if(so<RAIL_LIMIT||so>RAIL_LIMIT+6)continue;if((r.y||0)>groundAt(r.distance,r.offset).y+1.5)continue;
  const t=tanAt(r.distance),nx=-rl.side*t.z,nz=rl.side*t.x,pen=so-RAIL_LIMIT;r.x+=nx*pen;r.z+=nz*pen;r.offset=rl.side*RAIL_LIMIT;
  const vn=r.vx*nx+r.vz*nz;if(vn<0){r.vx-=nx*vn*1.25;r.vz-=nz*vn*1.25;const loss=Math.min(.16,-vn*.011);r.vx*=1-loss;r.vz*=1-loss;if(-vn>7){r.combo=0;if(me){shake=Math.max(shake,Math.min(.28,-vn*.018));SFX.bump(clamp(-vn/26,.2,.8));stats.bumps++;}}}
  if(Math.abs(r.speed)>9&&frame%2===0&&nearPlayer(r,60))emit(r.x-nx*1.1,(r.y||0)+.55,r.z-nz*1.1,0xffd27a,-Math.sin(r.h)*5+(Math.random()-.5)*3,1+Math.random()*2,-Math.cos(r.h)*5+(Math.random()-.5)*3,.25);
  if(me&&Math.abs(r.speed)>9&&frame%9===0)SFX.scrape();break;}}
// ---------- Abzweigungen: glatte Innenlinie (Bezier, tangential zur Hauptstrecke) als kuerzere, engere Alternative
function buildForks(){for(const fd of course.fork||[])forks.push(computeFork(...fd));}
function computeFork(ca,cb,hk=.34){{const dA=cpDist(ca),span=lapDist(cpDist(cb)-dA),pa=sample(dA),pb=sample(dA+span),chord=Math.hypot(pb.p.x-pa.p.x,pb.p.z-pa.p.z),k=chord*hk;
  const P0=[pa.p.x,pa.p.z],P1=[pa.p.x+pa.t.x*k,pa.p.z+pa.t.z*k],P2=[pb.p.x-pb.t.x*k,pb.p.z-pb.t.z*k],P3=[pb.p.x,pb.p.z],N=180,pts=[];let hint=dA,len=0;
  for(let i=0;i<=N;i++){const u=i/N,a=(1-u)**3,b=3*(1-u)**2*u,c=3*(1-u)*u*u,e=u**3,x=a*P0[0]+b*P1[0]+c*P2[0]+e*P3[0],z=a*P0[1]+b*P1[1]+c*P2[1]+e*P3[1],pr=project(x,z,hint);hint=pr.d;if(i)len+=Math.hypot(x-pts[i-1].x,z-pts[i-1].z);pts.push({x,z,d:pr.d,off:pr.off,rel:lapDist(pr.d-dA)});}
  for(let i=0;i<=N;i++){const p=pts[i],q0=pts[Math.max(0,i-1)],q1=pts[Math.min(N,i+1)],tx=q1.x-q0.x,tz=q1.z-q0.z,tl=Math.hypot(tx,tz)||1;p.tx=tx/tl;p.tz=tz/tl;p.y=groundAt(p.d,p.off).y;p.h=Math.atan2(p.tx,p.tz);}
  let minR=1e9;const kap=pts.map((p,i)=>{if(i<2||i>N-2)return 0;const dh=angleDiff(pts[i+1].h,pts[i-1].h),sl=Math.hypot(pts[i+1].x-pts[i-1].x,pts[i+1].z-pts[i-1].z)||1;return dh/sl;});
  const M=Math.ceil(span)+1,offT=new Float32Array(M),vT=new Float32Array(M).fill(99);let j=0;
  for(let m=0;m<M;m++){while(j<N-1&&pts[j+1].rel<m)j++;const a=pts[j],b=pts[Math.min(N,j+1)],t=b.rel>a.rel?clamp((m-a.rel)/(b.rel-a.rel),0,1):0;offT[m]=a.off+(b.off-a.off)*t;let km=0;for(let s=Math.max(0,j-4);s<=Math.min(N,j+5);s++)km=Math.max(km,Math.abs(kap[s]));vT[m]=maxCornerSpeed(km);if(km>1e-4)minR=Math.min(minR,1/km);}
  const maxOff=offT.reduce((m,o)=>Math.abs(o)>Math.abs(m)?o:m,0);return {dA,span,pts,offT,vT,side:Math.sign(maxOff),maxOff:Math.abs(maxOff),minR,len};}}
function forkAt(d,pad=0){if(!forks.length)return null;const dl=lapDist(d);for(const f of forks){const rel=lapDist(dl-f.dA+pad);if(rel<=f.span+pad*2){const m=clamp(Math.round(rel-pad),0,f.offT.length-1);return {f,off:f.offT[m],rel:m};}}return null;}
function forkRoadNear(d,off,w){const fk=forkAt(d);return !!fk&&Math.abs(off-fk.off)<w&&Math.abs(fk.off)>3;}
// Fahrbahn der Abzweigung als Band: am Anfang/Ende verschmilzt sie keilfoermig mit der Hauptstrecke
const FORK_HALF=5.5,MAIN_EDGE=8.0;
function forkBand(d,off,pad=0){const fk=forkAt(d);if(!fk)return false;const oo=off*fk.f.side;if(oo<=0)return false;const o=Math.abs(fk.off);return oo>=o-FORK_HALF-.4-pad&&oo<=o+FORK_HALF+.4+pad;}
function forkEdges(p,side){const oo=p.off*side,outer=oo+FORK_HALF,inner=Math.max(MAIN_EDGE,oo-FORK_HALF);return outer<=MAIN_EDGE+.15?null:{inner,outer,w:outer-inner,c:side*(inner+outer)/2,island:oo-FORK_HALF>MAIN_EDGE+.6};}
function forkBlocks(d,off){const fk=forkAt(d,10);return !!fk&&Math.sign(off)===fk.f.side&&Math.abs(off)<Math.abs(fk.off)+9;}
function onRoad(d,off){return Math.abs(off)<8.6||forkBand(d,off);}
function nearFork(x,z,dist){for(const f of forks)for(let i=0;i<f.pts.length;i+=3){const p=f.pts[i];if(Math.abs(p.x-x)<dist&&Math.abs(p.z-z)<dist&&Math.hypot(p.x-x,p.z-z)<dist)return true;}return false;}
function polyStripVar(pts,i0,i1,fn,lift,uvLen){const n=i1-i0+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];let acc=0;
 for(let i=0;i<n;i++){const p=pts[i0+i];if(i)acc+=Math.hypot(p.x-pts[i0+i-1].x,p.z-pts[i0+i-1].z);const e=fn(p,i/(n-1)),lx=p.tz,lz=-p.tx;
  for(let s=0;s<2;s++){const o=e.c+(s?1:-1)*e.w/2;v.set([p.x+lx*o,p.y+lift,p.z+lz*o],(i*2+s)*3);uv.set([s,acc/uvLen],(i*2+s)*2);}
  if(i<n-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function polyStrip(pts,i0,i1,center,width,lift,uvLen){const n=i1-i0+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];let acc=0;for(let i=0;i<n;i++){const p=pts[i0+i];if(i)acc+=Math.hypot(p.x-pts[i0+i-1].x,p.z-pts[i0+i-1].z);const lx=p.tz,lz=-p.tx;for(let s=0;s<2;s++){const o=center+(s?1:-1)*width/2;v.set([p.x+lx*o,p.y+lift,p.z+lz*o],(i*2+s)*3);uv.set([s,acc/uvLen],(i*2+s)*2);}if(i<n-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function buildForkVisuals(){if(!forks.length)return;const glow=theme.glow,po={polygonOffset:true,polygonOffsetFactor:3,polygonOffsetUnits:3};
 const edgeM=mat(theme.edge,{...po,...(glow?{emissive:theme.edge,emissiveIntensity:.35}:{})}),roadM=new T.MeshStandardMaterial({map:speckleTexture(hex(theme.road),hex(theme.roadSpot),900),roughness:.9,...po});
 const curbTex=canvasTex(8,64,(q)=>{q.fillStyle=theme.curbA;q.fillRect(0,0,8,32);q.fillStyle=theme.curbB;q.fillRect(0,32,8,32);},true);curbTex.magFilter=T.NearestFilter;const curbM=new T.MeshStandardMaterial({map:curbTex,roughness:.7,...(glow?{emissive:0xffffff,emissiveMap:curbTex,emissiveIntensity:.9}:{})});
 for(const f of forks){const N=f.pts.length-1,s=f.side;let i0=0,i1=N;
  while(i0<N&&!forkEdges(f.pts[i0],s))i0++;while(i1>0&&!forkEdges(f.pts[i1],s))i1--;i0=Math.max(0,i0-1);i1=Math.min(N,i1+1);if(i1-i0<4)continue;
  // Keil: die Fahrbahn waechst aus der Aussenkante der Hauptstrecke heraus und laeuft dort auch wieder hinein
  const band=(pad,extra)=>(p)=>{const e=forkEdges(p,s)||{inner:MAIN_EDGE,outer:MAIN_EDGE,w:0,c:s*MAIN_EDGE};const inner=e.inner-(e.island?extra:0),outer=e.outer+extra;return {c:s*(inner+outer)/2,w:Math.max(0,outer-inner)};};
  addStrip(polyStripVar(f.pts,i0,i1,band(0,1.2),.03,6),edgeM);
  addStrip(polyStripVar(f.pts,i0,i1,band(0,0),.05,6),roadM);
  addStrip(polyStripVar(f.pts,i0,i1,p=>{const e=forkEdges(p,s);return {c:s*((e?e.outer:MAIN_EDGE)-.35),w:.7};},.11,8),curbM);
  addStrip(polyStripVar(f.pts,i0,i1,p=>{const e=forkEdges(p,s);return e&&e.island?{c:s*(e.inner+.35),w:.7}:{c:s*MAIN_EDGE,w:0};},.11,8),curbM);
  // Schild an der Inselspitze
  const tip=f.pts.find(p=>Math.abs(p.off)>15);if(tip){const off=f.side*((Math.abs(tip.off)-6.5+8.9)/2),s=sample(tip.d,off),g=new T.Group();g.position.copy(s.p);g.position.y=Math.max(0,s.p.y);g.rotation.y=s.angle+Math.PI;world.add(g);box(g,dark,0,1,0,.14,2,.14);const sign=mesh(new T.PlaneGeometry(3.4,1.1),label(f.side>0?'⇠ ABKÜRZUNG':'ABKÜRZUNG ⇢','#ffd23f','#2b1d24',512,160),g,0,2.3,0);sign.material.side=T.DoubleSide;addObstacle(s.p.x,s.p.z,.5);}}}
function forkIslandDecor(){for(const f of forks)for(let rel=10;rel<f.span-10;rel+=11){const off=f.offT[Math.round(rel)],width=Math.abs(off)-FORK_HALF-9.4;if(width<3.5)continue;const mid=f.side*(9.4+width/2),p=samplePos(f.dA+rel,mid,new T.Vector3()),s=Math.min(2.2,.45*width);
  mushroom(p.x,p.z,s,theme.caps[(rel|0)%theme.caps.length],Math.max(0,p.y-.2),theme.glow?.9:0);addObstacle(p.x,p.z,.55*s);}}
// ---------- Tunnel: Gewoelbe ueber der Strecke, Portale, Lichter. Innen wird es dunkel.
const TUNNEL_R=13.4,TUNNEL_TH=.8;
const TUNNEL_STYLE={
 wood:{wall:0x6b4426,spot:0x4a2c17,rim:0x7d5a32,lamp:0xffcf7a,glow:.9,rings:0,label:'PILZSTAMM'},
 rock:{wall:0xb06a3c,spot:0x8a4f2a,rim:0x9c5c32,lamp:0xffd08a,glow:.8,rings:0,label:'FELSTUNNEL'},
 neon:{wall:0x171540,spot:0x241f5c,rim:0x2de2e6,lamp:0xff3cac,glow:2.0,rings:1,label:'NEONROEHRE'},
 crypt:{wall:0x2b2440,spot:0x1b1630,rim:0x6f5cc0,lamp:0x8affc8,glow:1.4,rings:1,label:'GRUFT'},
 lava:{wall:0x2a1a18,spot:0x3f2420,rim:0xff5a1f,lamp:0xffb347,glow:1.8,rings:1,label:'MAGMASCHACHT'}};
function inTunnel(d){const dl=lapDist(d);return tunnels.some(t=>lapDist(dl-t.s)<=lapDist(t.e-t.s));}
function archRing(d,r0,r1,lift0=0,lift1=0,seg=14){const v=new Float32Array((seg+1)*6),uv=new Float32Array((seg+1)*4),idx=[];
 for(let k=0;k<=seg;k++){const a=Math.PI*k/seg,c=-Math.cos(a),s=Math.sin(a);
  const p0=samplePos(d,c*r0,_sp);v.set([p0.x,p0.y+s*r0*TUNNEL_TH+lift0,p0.z],k*6);
  const p1=samplePos(d,c*r1,_sp);v.set([p1.x,p1.y+s*r1*TUNNEL_TH+lift1,p1.z],k*6+3);
  uv.set([k/seg*2,0,k/seg*2,1],k*4);
  if(k<seg){const b=k*2;idx.push(b,b+2,b+1,b+1,b+2,b+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function buildTunnels(){if(!tunnels.length)return;
 for(const t of tunnels){const st=TUNNEL_STYLE[t.style]||TUNNEL_STYLE.rock,span=lapDist(t.e-t.s),steps=Math.max(8,Math.ceil(span/2.6)),SEG=14,R=TUNNEL_R;
  // Gewoelbe
  const n=(steps+1)*(SEG+1),v=new Float32Array(n*3),uv=new Float32Array(n*2),idx=[];
  for(let i=0;i<=steps;i++){const d=t.s+span*i/steps;
   // Hoehe entlang der Fahrbahnnormalen statt senkrecht: dadurch dreht sich das Gewoelbe in
   // Anti-Grav-Zonen mit, und Tunnel und Korkenzieher lassen sich kombinieren.
   for(let k=0;k<=SEG;k++){const a=Math.PI*k/SEG,p=posAt(d,-Math.cos(a)*R,Math.sin(a)*R*TUNNEL_TH,_sp),o=i*(SEG+1)+k;
    v[o*3]=p.x;v[o*3+1]=p.y;v[o*3+2]=p.z;uv[o*2]=k/SEG*2.5;uv[o*2+1]=span*i/steps/11;
    if(i<steps&&k<SEG){idx.push(o,o+1,o+SEG+1,o+1,o+SEG+2,o+SEG+1);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const wallMat=new T.MeshStandardMaterial({map:speckleTexture(hex(st.wall),hex(st.spot),1500),roughness:.95,side:T.DoubleSide,emissive:st.wall,emissiveIntensity:.45});
  const shell=new T.Mesh(g,wallMat);shell.receiveShadow=true;world.add(shell);
  // Portale an beiden Enden
  const portalMat=mat(st.rim,{roughness:.85,...(theme.glow?{emissive:st.rim,emissiveIntensity:.5}:{})});
  for(const [d,dir] of [[t.s,-1],[t.e,1]]){
   const pm=new T.Mesh(archRing(d+dir*.6,R,R+3.0),portalMat);pm.castShadow=true;pm.material.side=T.DoubleSide;world.add(pm);
   if(st.rings){const s=sample(d,0),sign=mesh(new T.PlaneGeometry(9,1.5),label(st.label,hex(st.lamp),'#14101c',512,96),world,s.p.x,s.p.y+R*TUNNEL_TH+1.9,s.p.z);
    sign.rotation.y=s.angle+(dir<0?Math.PI:0);sign.material.side=T.DoubleSide;sign.castShadow=false;}}
  // Lampen und Leuchtbaender
  const lampMat=new T.MeshBasicMaterial({color:st.lamp});
  const lamps=[];for(let d=t.s+5;d<t.s+span-2;d+=9)for(const side of [-1,1]){const p=samplePos(d,side*11.6,new T.Vector3());lamps.push([p.x,p.y+5.4,p.z]);}
  if(lamps.length){const li=new T.InstancedMesh(new T.SphereGeometry(.42,8,6),lampMat,lamps.length);lamps.forEach(([x,y,z],i)=>{_m.makeTranslation(x,y,z);li.setMatrixAt(i,_m);});li.frustumCulled=false;world.add(li);}
  if(st.rings){const bandMat=new T.MeshBasicMaterial({color:st.rim,side:T.DoubleSide}),bands=[];
   for(let d=t.s+4;d<t.s+span-2;d+=7)bands.push(archRing(d,R-.6,R-.15));
   if(bands.length){const bm=new T.Mesh(mergeGeometries(bands),bandMat);bm.frustumCulled=false;world.add(bm);}}
  else{const stripMat=new T.MeshBasicMaterial({color:st.lamp,side:T.DoubleSide});
   for(const side of [-1,1])world.add(new T.Mesh(wallStrip(t.s+1.5,t.e-1.5,side*12.9,5.0,5.45,Math.ceil(span/3)),stripMat));}
  // Fels ueber dem Tunnel, damit er nicht in der Luft steht
  if(P.rock){const rl=[];for(let d=t.s-4;d<t.s+span+4;d+=6)for(const side of [-1,1]){const p=samplePos(d,side*(R+2.4),new T.Vector3());
    rl.push({x:p.x,y:Math.max(0,p.y)-1.2,z:p.z,s:3.4,sy:(2.4+((d*7)%10)/4)/3.4,ry:d});}
   scatterInstanced(P.rock,rl,{StonePaint:st.wall},0);}
  zones.push({d:lapDist(t.s+span/2),half:span/2+4,x:0,z:0,r:0});}}
function buildGaps(){for(const g of gaps){const h=trackAt(g.start-1).h;
 // Klippenwaende an beiden Kanten + Fluss unten
 for(const d of [g.start,g.end]){const s=sample(d,0),wall=mesh(new T.BoxGeometry(18.5,h+.6,1.2),mat(theme.skirt,{roughness:1}),world,s.p.x,(h-.6)/2,s.p.z);wall.rotation.y=s.angle;}
 const ch=theme.chasm||{c:0x2fb7d8,e:0x0a4a6a,i:.4,label:'SCHLUCHT! VOLLGAS'};
 const water=addStrip(strip(g.start-8,g.end+8,0,60,-h+.3,6,12),mat(ch.c,{roughness:theme.lavaSea?.6:.15,emissive:ch.e,emissiveIntensity:ch.i}),false);water.castShadow=false;
 for(const d of [g.start-3,g.end+3])for(const side of [-1,1]){const p=sample(d,side*12).p;if(P.rock){const r=cloneProto(P.rock);applyTint(r,'StonePaint',0xc0643a);r.position.set(p.x,0,p.z);r.scale.set(2.2,2.8+Math.random(),2.2);world.add(r);}addObstacle(p.x,p.z,2.4);}
 // Warnschilder vor der Schlucht
 for(const side of [-1,1]){const s=sample(g.start-70,side*11),w=new T.Group();w.position.copy(s.p);w.rotation.y=s.angle;world.add(w);box(w,cream,0,1.6,0,.22,3.2,.22);mesh(new T.PlaneGeometry(4.2,1.7),label((theme.chasm&&theme.chasm.label)||'SCHLUCHT! VOLLGAS','#ffd23f','#2b1d24',512,128),w,0,3.4,0);addObstacle(s.p.x,s.p.z,.4);}}}

// Geistervilla: die Strasse fuehrt mitten durch die Halle (Kollision an Waenden, Fluegeln und Tuermen)
// Bauwerke, durch die gefahren wird. Je Bauart: Ersatzfarbe (falls das Modell noch laedt),
// Kollider und die Sperrzone, in der keine Deko stehen darf. Kollider stehen grundsaetzlich
// ausserhalb der Fahrbahn (Halbbreite 8,9 m) - alles, was hineinragt, laesst Karts haengen.
// spiegel: Reihen der Form [x, zVon, zBis, Schritt, Radius] werden links und rechts gesetzt.
const BUILDINGS={
 mansion:{col:0x2a2240,half:17,zone:36,
  rows:[[12.3,-15,15,2,1.3],[15,-13,13,3.5,2],[17.6,-13,13,3.5,1.4]],
  single:[[-21.5,-6,3.6],[21,9,2.8]]},
 castle:{col:0x3a2a28,half:19,zone:40,
  rows:[[12.7,-11,11,2,1.5],[25.5,-9,9,3,2.4],[10.9,-6,6,6,.95]],
  single:[[-27.5,13,5.6],[27.5,-13,5.6],[-13.6,18,1.9],[13.6,18,1.9]],
  wings:true},
 neongate:{col:0x1a1730,half:14,zone:28,
  rows:[[14.2,-3.2,3.2,3.2,2.5],[16.4,-2,2,4,1.5]],
  single:[[-19.5,0,1.6],[19.5,0,1.6]]},
 roottree:{col:0x3a2a1c,half:15,zone:30,
  rows:[[15.2,-7,7,2.4,4.7],[21.5,-8,8,5.5,2.1]],
  single:[[-23,2,2.4],[23,-2.5,2.4]]}};
function buildMansion(){
 const list=[];
 if(course.mansion!==undefined)list.push([course.mansion,'mansion']);
 if(course.castle!==undefined)list.push([course.castle,'castle']);
 for(const b of course.builds||[])list.push(b);
 for(const [cp,kind] of list)placeBuilding(cp,kind);}
function placeBuilding(cp,kind){const B=BUILDINGS[kind];if(!B)return;
 const proto=P[kind],d=straightSpot(cp,30,30,60),s=sample(d,0),g=proto?cloneProto(proto):new T.Group();
 if(!proto){for(const sx of [-1,1])box(g,mat(B.col),sx*17,9,0,10,18,26);box(g,mat(B.col),0,17,0,28,6,26);}
 g.position.copy(s.p);g.rotation.y=s.angle;world.add(g);g.updateMatrixWorld(true);
 const v=new T.Vector3(),ob=(x,z,r)=>{v.set(x,0,z).applyMatrix4(g.matrixWorld);addObstacle(v.x,v.z,r);};
 for(const [x,z0,z1,st,r] of B.rows||[])for(const sx of [-1,1])for(let z=z0;z<=z1+1e-6;z+=st)ob(sx*x,z,r);
 for(const [x,z,r] of B.single||[])ob(x,z,r);
 if(B.wings)for(const sx of [-1,1])for(let x=28;x<=50;x+=4)ob(sx*x,0,4.4);
 zones.push({d,half:B.half,x:s.p.x,z:s.p.z,r:B.zone});}
function buildScenery(random){batch=new Map();buildSceneryInner(random);forkIslandDecor();for(const b of batch.values())scatterColored(b.proto,b.list,'CapPaint',b.tint,120,.028);batch=null;buildGrass(random);}
// Eine Instanz-Gruppe je Modell statt je Farbe: Lackfarbe pro Instanz (instanceColor), Leuchten wird per Shader mit eingefaerbt
const tintEmissive=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif');};
let swayCache=new Map();
// Baeume und Pilze wiegen sich im Wind: Versatz waechst mit der Hoehe, Phase aus der Instanzposition
function swayMat(m,amp){const key=m.uuid+'|'+amp;let c=swayCache.get(key);if(c)return c;c=m.clone();const prev=c.onBeforeCompile;
 c.onBeforeCompile=sh=>{if(prev)prev(sh);sh.uniforms.uTime=shaderTime;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 wp=instanceMatrix[3].xyz;float ws=sin(uTime*.85+wp.x*.06+wp.z*.08)*'+amp+'+sin(uTime*1.6+wp.z*.11)*'+(amp*.4).toFixed(4)+';\ntransformed.x+=ws*transformed.y;transformed.z+=ws*.55*transformed.y;\n#endif');};
 c.customProgramCacheKey=()=>'sway'+amp+(prev?'_p':'');swayCache.set(key,c);return c;}
function scatterColored(proto,list,paint,glow,chunk,sway=0){if(!proto||!list.length)return;const cells=new Map();for(const t of list){const k=Math.floor(t.x/chunk)+','+Math.floor(t.z/chunk);let c=cells.get(k);if(!c)cells.set(k,c=[]);c.push(t);}
 const srcs=[];proto.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))srcs.push(o);});const paintMats=new Map();
 for(const cell of cells.values())for(const src of srcs){let material=src.material;const isPaint=material.name===paint;
  if(isPaint){material=paintMats.get(src)||material.clone();if(!paintMats.has(src)){material.color.set(0xffffff);if(glow){material.emissive=new T.Color(0xffffff);material.emissiveIntensity=glow;material.onBeforeCompile=tintEmissive;material.customProgramCacheKey=()=>'tintEmissive';}paintMats.set(src,material);}}
  if(sway)material=swayMat(material,sway);
  const im=new T.InstancedMesh(src.geometry,material,cell.length);im.castShadow=true;im.receiveShadow=true;
  cell.forEach((t,i)=>{_e.set(0,t.ry||0,0);_q.setFromEuler(_e);_m.compose(_v.set(t.x,t.y||0,t.z),_q,_s.set(t.s,t.s,t.s));im.setMatrixAt(i,_m);if(isPaint)im.setColorAt(i,_col.setHex(t.col));});world.add(im);}}
const GRASS={forest:[0x2f8a2a,0x9be25a],canyon:[0x9a6a2a,0xf0c878],night:[0x14505a,0x44d6c8],haunted:[0x2e3c26,0x7f8f58],lava:[0x3a2a26,0x8a4424]};
function buildGrass(random){const [c0,c1]=GRASS[course.theme]||GRASS.forest,a=new T.Color(c0),b=new T.Color(c1),pos=[],col=[];
 for(let k=0;k<4;k++){const ang=k/4*Math.PI+.3,cx=Math.cos(ang)*.28,cz=Math.sin(ang)*.28,h=.55+(k%2)*.25;pos.push(-cx,0,-cz,cx,0,cz,cx*.15,h,cz*.15);col.push(a.r,a.g,a.b,a.r,a.g,a.b,b.r,b.g,b.b);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeVertexNormals();
 const matG=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}),cells=new Map();
 // Gras wiegt sich im Wind (Instanz-Position als Phase)
 matG.onBeforeCompile=sh=>{sh.uniforms.uTime=shaderTime;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 gp=instanceMatrix[3].xyz;float sw=sin(uTime*1.7+gp.x*.11+gp.z*.15)*.22+sin(uTime*3.1+gp.z*.23)*.08;transformed.x+=sw*transformed.y;transformed.z+=sw*.55*transformed.y;\n#endif');};
 for(let i=0;i<1800;i++){const d=random()*length,side=random()<.5?-1:1,off=side*(9.2+Math.pow(random(),1.6)*16);if(inGap(d)||inZone(d,20)||forkRoadNear(d,off,7.5)||inBridge(d)||inTunnel(d))continue;const s=samplePos(d,off,_sp),y=Math.max(0,s.y-(Math.abs(off)-8.9)/1.5);const key=Math.floor(s.x/120)+','+Math.floor(s.z/120);let c=cells.get(key);if(!c)cells.set(key,c=[]);c.push([s.x,y,s.z,.7+random()*.9,random()*TAU]);}
 for(const list of cells.values()){const im=new T.InstancedMesh(geo,matG,list.length);list.forEach(([x,y,z,sc,ry],i)=>{_e.set(0,ry,0);_q.setFromEuler(_e);_m.compose(_v.set(x,y,z),_q,_s.set(sc,sc*(.8+((i*37)%7)/14),sc));im.setMatrixAt(i,_m);});im.castShadow=false;im.receiveShadow=true;world.add(im);}}
function buildSceneryInner(random){const th=course.theme,glow=theme.glow;
 const clear=(x,z,min)=>{const d=projectGlobal(x,z),s=sample(d);return Math.hypot(s.p.x-x,s.p.z-z)>(inTunnel(d)?Math.max(min,22):min)+Math.max(0,s.p.y)*1.6&&zones.every(q=>Math.hypot(q.x-x,q.z-z)>q.r)&&!nearFork(x,z,min+8);};
 if(th==='forest'||th==='night'){
  for(let i=0;i<190;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>186||!clear(x,z,15))continue;const s=1+random()*2.3;
   if(i%3===0){mushroom(x,z,s,theme.caps[i%theme.caps.length],0,glow?.9:0);addObstacle(x,z,.55*s);}else{tree(x,z,s*.8,theme.leaves[i%theme.leaves.length]);addObstacle(x,z,.55*s*.8);}}
  if(P.rock){const rocks=[];for(let i=0;i<30;i++){const x=(random()-.5)*360,z=(random()-.5)*320;if(Math.hypot(x,z)>182||!clear(x,z,13))continue;const s=.6+random()*2.2,sx=.7+random()*.6;rocks.push({x,z,s,sx,ry:random()*TAU});addObstacle(x,z,1.1*s*sx);}scatterInstanced(P.rock,rocks,null,140);}
  const landmarks=th==='night'?[[0,0,6.5,0xff3cac],[30,10,3.6,0x2de2e6],[-30,-10,4.2,0x9d6bff]]:[[10,5,6.5,0xe8352e],[34,14,3.4,0xf5a623],[-28,-12,4,0x8e5bd9]];
  for(const [x,z,s,c] of landmarks)if(clear(x,z,12)){mushroom(x,z,s,c,0,glow?1.1:0);addObstacle(x,z,.55*s);}
  // Blumen (forest) bzw. Leuchtsteine (night) am Wegesrand fuer Farbe
  const n=th==='forest'?520:260,flowers=new T.InstancedMesh(new T.IcosahedronGeometry(.28,0),new T.MeshStandardMaterial({color:0xffffff,roughness:.6,...(glow?{emissive:0xffffff,emissiveIntensity:.7}:{})}),n),c=new T.Color(),m=new T.Matrix4(),palette=th==='forest'?[0xff4d6d,0xffd23f,0xffffff,0xa66bff,0xff8a3d]:[0x2de2e6,0xff3cac,0xfff05a];
  for(let i=0;i<n;i++){const d=random()*length,off=(random()<.5?-1:1)*(11+random()*22),s=sample(d,off);if(inGap(d)||forkRoadNear(d,off,7.5)||inTunnel(d)){m.makeScale(0,0,0);}else m.compose(new T.Vector3(s.p.x,Math.max(0,s.p.y-(Math.abs(off)-8.9)/1.5)+.15,s.p.z),new T.Quaternion(),new T.Vector3(1,.6,1).multiplyScalar(.7+random()*.8));flowers.setMatrixAt(i,m);flowers.setColorAt(i,c.setHex(palette[i%palette.length]));}
  flowers.castShadow=false;world.add(flowers);}
 if(th==='haunted'){
  for(let i=0;i<130;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>186||!clear(x,z,15))continue;const s=1+random()*2;
   if(i%4===0){mushroom(x,z,s*.9,theme.caps[i%theme.caps.length],0,.8);addObstacle(x,z,.5*s);}else{tree(x,z,s*.85,theme.leaves[i%theme.leaves.length]);addObstacle(x,z,.5*s*.85);}}
  if(P.gravestone){const graves=[];for(let k=0;k<7;k++){const cx=(random()-.5)*300,cz=(random()-.5)*280;for(let i=0;i<16;i++){const x=cx+(i%4)*3.4-5+random(),z=cz+Math.floor(i/4)*3.6-6+random();if(Math.hypot(x,z)>184||!clear(x,z,13))continue;graves.push({x,z,s:1.1+random()*.5,ry:(random()-.5)*.6+k*.9});addObstacle(x,z,.8);}}scatterInstanced(P.gravestone,graves,null,80);}
  if(P.pumpkin){const pk=[];for(let i=0;i<80;i++){const d=random()*length,side=random()<.5?-1:1,off=side*(13+random()*6),s=sample(d,off);if(inZone(d,22)||inGap(d)||forkBlocks(d,off)||inBridge(d)||inTunnel(d))continue;pk.push({x:s.p.x,y:Math.max(0,s.p.y-(Math.abs(off)-8.9)/1.5),z:s.p.z,s:.9+random()*1.1,ry:Math.atan2(-s.t.z*side,s.t.x*side)});addObstacle(s.p.x,s.p.z,.8);}scatterInstanced(P.pumpkin,pk,null,80);}
  const batGeo=new T.BufferGeometry();batGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-1.3,.4,-.25,-.55,0,.35,0,0,0,.55,0,.35,1.3,.4,-.25],3));batGeo.computeVertexNormals();
  bats=new T.InstancedMesh(batGeo,new T.MeshBasicMaterial({color:0x08060e,side:T.DoubleSide}),28);bats.frustumCulled=false;world.add(bats);}
 if(th==='rainbow'){
  // Schwebende Kristallinseln und Sternenstaub statt Landschaft
  const crystal=mergeGeometries([new T.ConeGeometry(3,9,6).translate(0,4.5,0),new T.ConeGeometry(3,4,6).rotateZ(Math.PI).translate(0,-2,0)]);
  const cols=[0xff4fa3,0x4fd8ff,0xffe45c,0x8affc8,0x8a5cff];
  for(let c=0;c<5;c++){const list=[];
   for(let i=0;i<26;i++){const a=random()*TAU,r=110+random()*150,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(!clear(x,z,26))continue;list.push({x,y:-20-random()*55,z,s:.8+random()*2.6,ry:random()*TAU});}
   if(!list.length)continue;
   const im=new T.InstancedMesh(crystal,new T.MeshStandardMaterial({color:cols[c],emissive:cols[c],emissiveIntensity:.5,roughness:.35,flatShading:true}),list.length);
   const m4=new T.Matrix4();list.forEach((t,i)=>{m4.compose(new T.Vector3(t.x,t.y,t.z),new T.Quaternion().setFromEuler(new T.Euler(0,t.ry,0)),new T.Vector3(t.s,t.s*1.6,t.s));im.setMatrixAt(i,m4);});
   im.castShadow=false;world.add(im);}
  // Sternenstaub, der langsam nach oben zieht
  {const n=340,pos=new Float32Array(n*3),ph=new Float32Array(n);
   for(let i=0;i<n;i++){const d=random()*length,s=sample(d,(random()-.5)*90);pos[i*3]=s.p.x;pos[i*3+1]=s.p.y-25+random()*50;pos[i*3+2]=s.p.z;ph[i]=random()*TAU;}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
   fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'uniform float uTime;attribute float phase;varying float vA;void main(){vec3 p=position+vec3(sin(uTime*.4+phase)*3.,mod(uTime*2.+phase*9.,40.)-20.,cos(uTime*.35+phase)*3.);vA=.5+.5*sin(uTime*2.+phase*5.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(160./-mv.z,1.5,7.);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.95,1.,(1.-smoothstep(.1,.5,d))*vA*.8);}'}));
   fireflies.frustumCulled=false;world.add(fireflies);}}
 if(th==='lava'){
  // Basaltnadeln, Lavaseen und Vulkane am Horizont
  if(P.rock){const rocks=[];for(let i=0;i<80;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>185||!clear(x,z,14))continue;const s=1.1+random()*2.3,sy=1.4+random()*3.4;rocks.push({x,z,s,sy,sx:.8+random()*.5,ry:random()*TAU});addObstacle(x,z,1.1*s);}scatterInstanced(P.rock,rocks,{StonePaint:0x2e2226},130);}
  {const pool=new T.CircleGeometry(1,16).rotateX(-Math.PI/2),pm=new T.InstancedMesh(pool,new T.MeshBasicMaterial({color:0xff5a18}),70),m=new T.Matrix4();
   for(let i=0;i<70;i++){const x=(random()-.5)*360,z=(random()-.5)*330,r=4+random()*12;
    if(Math.hypot(x,z)>178||!clear(x,z,r+14))m.makeScale(0,0,0);else m.compose(new T.Vector3(x,.12,z),new T.Quaternion(),new T.Vector3(r,1,r*(.6+random()*.7)));pm.setMatrixAt(i,m);}
   pm.castShadow=false;pm.receiveShadow=false;world.add(pm);}
  {const gs=[[],[]];for(let i=0;i<13;i++){const a=i/13*TAU+random()*.3,r=246+random()*70,rad=20+random()*26,h=36+random()*48,x=Math.cos(a)*r,z=Math.sin(a)*r;
    gs[i%2].push(new T.CylinderGeometry(rad*.3,rad,h,7).translate(x,h/2-8,z));}
   [theme.hills[0],theme.hills[1]].forEach((c,i)=>world.add(new T.Mesh(mergeGeometries(gs[i]),mat(c,{flatShading:true,roughness:1}))));}
  {const n=300,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){const d=random()*length,s=sample(d,(random()-.5)*70);pos[i*3]=s.p.x;pos[i*3+1]=Math.max(0,s.p.y);pos[i*3+2]=s.p.z;ph[i]=random()*TAU;}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
   fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'uniform float uTime;attribute float phase;varying float vA;void main(){float t=mod(uTime*.55+phase,6.2831);vec3 p=position+vec3(sin(uTime*.6+phase)*2.5,t*3.4,cos(uTime*.5+phase*1.7)*2.5);vA=1.-t/6.2831;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(150./-mv.z,1.5,7.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.55,.18,(1.-smoothstep(.1,.5,d))*vA*.8);}'}));
   fireflies.frustumCulled=false;world.add(fireflies);}}
 if(th==='canyon'){
  // Felsnadeln & Kakteen auf der Insel, Tafelberge am Horizont
  if(P.rock){const rocks=[];for(let i=0;i<60;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>185||!clear(x,z,14))continue;const s=1.2+random()*2.4,sy=1.5+random()*3;rocks.push({x,z,s,sy,sx:.8+random()*.5,ry:random()*TAU});addObstacle(x,z,1.2*s);}scatterInstanced(P.rock,rocks,{StonePaint:0xc0643a,MossPaint:0xe8a15a},140);}
  const cactusGeo=mergeGeometries([new T.CylinderGeometry(.45,.5,4.2,8).translate(0,2.1,0),new T.CylinderGeometry(.3,.3,1.6,8).rotateZ(Math.PI/2).translate(.9,2,0),new T.CylinderGeometry(.28,.28,1.5,8).translate(1.55,2.6,0),new T.CylinderGeometry(.26,.26,1.2,8).rotateZ(Math.PI/2).translate(-.8,2.8,0),new T.CylinderGeometry(.25,.25,1.1,8).translate(-1.3,3.25,0)]);
  const cacti=[];for(let i=0;i<70;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>186||!clear(x,z,13))continue;cacti.push([x,z,.8+random()*.8,random()*TAU]);addObstacle(x,z,.7);}
  const cm=new T.InstancedMesh(cactusGeo,mat(0x4f8a3a,{roughness:.7}),cacti.length),m=new T.Matrix4();cacti.forEach(([x,z,s,r],i)=>{m.compose(new T.Vector3(x,0,z),new T.Quaternion().setFromEuler(new T.Euler(0,r,0)),new T.Vector3(s,s,s));cm.setMatrixAt(i,m);});cm.castShadow=true;world.add(cm);
  for(let i=0;i<18;i++){const x=(random()-.5)*330,z=(random()-.5)*300;if(Math.hypot(x,z)>180||!clear(x,z,16)||i%2)continue;mushroom(x,z,1.2+random()*1.5,theme.caps[i%theme.caps.length]);addObstacle(x,z,.8);}
  {const gs=[[],[],[]];for(let i=0;i<14;i++){const a=i/14*TAU+random()*.2,r=240+random()*60,rad=18+random()*26,h=26+random()*40,x=Math.cos(a)*r,z=Math.sin(a)*r;gs[i%2].push(new T.CylinderGeometry(rad*.8,rad,h,7).translate(x,h/2-8,z));gs[2].push(new T.CylinderGeometry(rad*.82,rad*.8,3,7).translate(x,h-6.5,z));}
  [theme.hills[0],theme.hills[1],0xe9a060].forEach((c,i)=>world.add(new T.Mesh(mergeGeometries(gs[i]),mat(c,{flatShading:true,roughness:1}))));}}
 if(th!=='canyon'&&th!=='lava'&&th!=='rainbow'){const gs=[[],[]];for(let i=0;i<16;i++){const a=i/16*TAU,r=228+random()*70;gs[i%2].push(new T.SphereGeometry(1,16,12).scale(25+random()*25,28+random()*34,24+random()*15).translate(Math.cos(a)*r,-4,Math.sin(a)*r));}gs.forEach((g,i)=>{const h=new T.Mesh(mergeGeometries(g),mat(theme.hills[i]));h.receiveShadow=true;world.add(h);});}
 if(theme.clouds){const gs=[];for(let i=0;i<15;i++){const cx=(random()-.5)*420,cy=60+random()*40,cz=(random()-.5)*350;for(let k=0;k<4;k++)gs.push(new T.SphereGeometry(1,12,8).scale(5,3.5,3).translate(cx+k*4-6,cy+Math.sin(k)*2,cz));}const cl=new T.Mesh(mergeGeometries(gs),white);world.add(cl);}
 // Wetter-Wolken: Canyon bekommt Abendrot, Lava-Feste Glutwolken - flache Haufen, ein Aufruf je Thema
 if(theme.cloudCols){const cm=new T.MeshStandardMaterial({color:theme.cloudCols[0],roughness:1,emissive:theme.cloudCols[1],emissiveIntensity:.38}),gs=[];
  for(let i=0;i<14;i++){const cx=(random()-.5)*460,cy=78+random()*52,cz=(random()-.5)*380,w=8+random()*8;
   for(let k=0;k<4;k++)gs.push(new T.SphereGeometry(1,10,7).scale(w*(k===1||k===2?.72:1),2.3,w*.5).translate(cx+k*w*.62-w,cy+(k===1?1.4:0),cz+(k%2?1.3:-1.3)));}
  world.add(new T.Mesh(mergeGeometries(gs),cm));}
 if(P.balloon)for(let i=0;i<theme.balloons;i++){const a=i/Math.max(1,theme.balloons)*TAU+random(),r=90+random()*60,g=cloneProto(P.balloon);applyTint(g,'CapPaint',[0xed6350,0xffd45c,0x55bdb2,0xa688dc][i]);g.position.set(Math.cos(a)*r,30+random()*20,Math.sin(a)*r);world.add(g);balloons.push({g,base:g.position.y,ph:random()*TAU});}
 if(th==='night'||th==='haunted'){
  // Laternen entlang der Strecke + Gluehwuermchen (Shader-Partikel)
  const lampGeo=new T.CylinderGeometry(.12,.16,4,6).translate(0,2,0),bulbGeo=new T.SphereGeometry(.45,10,8).translate(0,4.2,0),posts=[];for(let d=10;d<length;d+=38){if(inGap(d)||inZone(d,6)||inTunnel(d))continue;const side=Math.round(d/38)%2?1:-1;if(forkBlocks(d,side*12.6))continue;const s=sample(d,side*12.6);posts.push([s.p.x,groundAt(d,side*12.6).y-.3,s.p.z,side]);addObstacle(s.p.x,s.p.z,.4);}
  const pm=new T.InstancedMesh(lampGeo,mat(0x2a2f5a),posts.length),bm=new T.InstancedMesh(bulbGeo,new T.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1.4}),posts.length),m=new T.Matrix4(),c=new T.Color();posts.forEach(([x,y,z,side],i)=>{m.makeTranslation(x,y,z);pm.setMatrixAt(i,m);bm.setMatrixAt(i,m);bm.setColorAt(i,c.setHex(th==='haunted'?(side>0?0x9dff7a:0xb48cff):side>0?0x2de2e6:0xff3cac));});world.add(pm,bm);
  const n=420,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){const d=random()*length,s=sample(d,(random()-.5)*60);pos[i*3]=s.p.x;pos[i*3+1]=Math.max(0,s.p.y)+.8+random()*5;pos[i*3+2]=s.p.z;ph[i]=random()*TAU;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
  fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'uniform float uTime;attribute float phase;varying float vA;void main(){vec3 p=position+vec3(sin(uTime*.7+phase)*1.5,sin(uTime*1.3+phase*2.)*.8,cos(uTime*.6+phase)*1.5);vec4 mv=modelViewMatrix*vec4(p,1.);vA=.55+.45*sin(uTime*3.+phase*5.);gl_PointSize=clamp(180./-mv.z,2.,14.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.75,1.,.45)*(1.-smoothstep(.1,.5,d))*vA,1.);}'}));fireflies.frustumCulled=false;world.add(fireflies);}
 if(th==='canyon'){const n=220,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){pos[i*3]=(random()-.5)*360;pos[i*3+1]=1+random()*14;pos[i*3+2]=(random()-.5)*330;ph[i]=random()*TAU;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
  fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,vertexShader:'uniform float uTime;attribute float phase;void main(){vec3 p=position+vec3(mod(uTime*6.+phase*40.,80.)-40.,sin(uTime+phase)*1.,sin(uTime*.5+phase)*3.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(220./-mv.z,1.5,9.);gl_Position=projectionMatrix*mv;}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.82,.6,(1.-smoothstep(.15,.5,d))*.45);}'}));fireflies.frustumCulled=false;world.add(fireflies);}}

function chevronTex(dir){return canvasTex(128,64,(q,w,h)=>{q.fillStyle=theme.glow?'#1a1030':'#d7263d';q.fillRect(0,0,w,h);q.strokeStyle=theme.chev||(theme.glow?(course.theme==='haunted'?'#9dff7a':'#2de2e6'):'#ffffff');q.lineWidth=11;q.lineJoin='round';for(const x of [30,64,98]){q.beginPath();q.moveTo(x-dir*12,10);q.lineTo(x+dir*12,32);q.lineTo(x-dir*12,54);q.stroke();}});}
function buildChevrons(){const texL=chevronTex(-1),texR=chevronTex(1),mk=t=>new T.MeshStandardMaterial({map:t,roughness:.6,...(theme.glow?{emissive:0xffffff,emissiveMap:t,emissiveIntensity:.9}:{})}),mL=mk(texL),mR=mk(texR),geo=new T.PlaneGeometry(2.6,1.3),post=new T.CylinderGeometry(.08,.08,1.6,6);
 const bl=[],br=[],posts=[];let last=-99;for(let d=0;d<length;d+=3){const k=trackAt(d).kap;if(Math.abs(k)<1/30||inGap(d)||inZone(d,10)||d-last<45)continue;let apex=d,km=Math.abs(k);for(let s=d;s<d+40;s+=2){const kk=Math.abs(trackAt(s).kap);if(kk>km){km=kk;apex=s;}}last=apex;const left=trackAt(apex).kap>0,side=left?-1:1;
  for(const o of [-9,0,9]){if(forkBlocks(apex+o,side*12.8)||inTunnel(apex+o))continue;const s=sample(apex+o,side*12.8),M4=new T.Matrix4().makeRotationY(s.angle+Math.PI).setPosition(s.p.x,groundAt(apex+o,side*12.8).y-.1,s.p.z);(left?bl:br).push(geo.clone().translate(0,2,0).applyMatrix4(M4));posts.push(post.clone().translate(0,.8,0).applyMatrix4(M4));addObstacle(s.p.x,s.p.z,.5);}}
 if(bl.length)world.add(new T.Mesh(mergeGeometries(bl),mL));if(br.length)world.add(new T.Mesh(mergeGeometries(br),mR));if(posts.length)world.add(new T.Mesh(mergeGeometries(posts),dark));}
function buildRamps(){const list=course.ramps.map(([v,off,w])=>({d:straightSpot(v,35,85),off,w}));for(const g of gaps)list.push({d:lapDist(g.start-RAMP_LEN/2-.4),off:0,w:13,gap:true});
 for(const {d,off,w,gap} of list){const r={d,off,w,start:d-RAMP_LEN/2,end:d+RAMP_LEN/2,gap};ramps.push(r);const s=sample(d,off);let g;if(P.ramp){g=cloneProto(P.ramp);g.scale.set(w/6.4,1,RAMP_LEN/4.8);if(gap)applyTint(g,'RampPaint',0xffd23f);}else{g=new T.Group();const m=mesh(new T.BoxGeometry(w,.2,RAMP_LEN),mat(0xed6350),g,0,RAMP_H/2,0);m.rotation.x=-Math.atan(RAMP_H/RAMP_LEN);}g.position.copy(s.p);g.rotation.order='YXZ';g.rotation.set(Math.atan(slopeAt(d)),s.angle+Math.PI,s.bank);world.add(g);
  if(gap)continue;
  const rd=r.end+12,rs=sample(rd,off),ring=new T.Mesh(new T.TorusGeometry(3.2,.3,10,36),new T.MeshStandardMaterial({color:0xffd45c,emissive:0xff9a1f,emissiveIntensity:.9,roughness:.4}));ring.position.copy(rs.p);ring.position.y+=3.8;ring.rotation.y=rs.angle;world.add(ring);rings.push({d:lapDist(rd),off,y:ring.position.y,mesh:ring,flash:0});}}
function buildPads(){for(const [v,off] of course.pads){const d=straightSpot(v,20,55,70),s=sample(d,off);let g;if(P.bouncepad)g=cloneProto(P.bouncepad);else{g=new T.Group();sphere(g,mat(0xed6350),0,.2,0,1.75,.34,1.75);}g.position.copy(s.p);g.rotation.y=s.angle;world.add(g);pads.push({d,off,mesh:g,squash:0});}}
// Pendel-Pilze (Neon): schwingen quer ueber die Strecke, Timing statt Glueck.
// Pendelnde Hindernisse gehoeren nicht in eine Rollzone: dort bildet der Querversatz auf die
// Hoehe ab, das Pendel steht dann in x/z still auf der Mittellinie - also genau auf der
// Ideallinie - waehrend die Kollision weiter flach rechnet. Deshalb aus der Zone schieben.
function outOfRoll(d){if(!agrav.length)return d;
 for(let i=0;i<40&&hasRoll(d);i++)d=lapDist(d+8);
 return lapDist(d+14);}
function buildSwingers(){for(const [v,amp,spd,ph] of course.swing||[]){const d=outOfRoll(cpDist(v));let g;
 if(theme.ember){g=new T.Group();g.add(new T.Mesh(new T.IcosahedronGeometry(1.15,1),new T.MeshBasicMaterial({color:0xffe08a})));
  const halo=new T.Mesh(new T.IcosahedronGeometry(1.75,0),new T.MeshBasicMaterial({color:0xff5a1f,transparent:true,opacity:.55,depthWrite:false}));g.add(halo);
  const tail=new T.Mesh(new T.ConeGeometry(.9,2.6,8),new T.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:.35,depthWrite:false}));tail.rotation.x=Math.PI/2;tail.position.z=-1.4;g.add(tail);world.add(g);}
 else{g=P.mushroom?cloneProto(P.mushroom):new T.Group();if(P.mushroom)applyTint(g,'CapPaint',0xff3cac,{emissiveColor:0xff3cac,emissiveIntensity:1.2});else sphere(g,mat(0xff3cac),0,2.6,0,1.6,.75,1.6);world.add(g);}
 g.scale.setScalar(theme.ember?1.5:1.7);swingers.push({d,amp,spd,ph,mesh:g,x:0,z:0,fire:!!theme.ember});}
 for(const [v,amp,spd,ph] of course.ghosts||[]){let d=outOfRoll(cpDist(v));for(const r of [...ramps,...pads])if(Math.abs(wrapDiff(d,r.d))<32)d=lapDist(r.d+42);let g;if(P.ghost){g=cloneProto(P.ghost);g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.88;}});}else{g=new T.Group();sphere(g,mat(0xeef3ff,{emissive:0x9fb4ff,emissiveIntensity:.4}),0,1.7,0,1);}
  g.scale.setScalar(1.2);world.add(g);swingers.push({d,amp,spd,ph,mesh:g,x:0,z:0,y:0,kind:'ghost'});}}
function buildSpores(){const add=(d,off,lift)=>{if(inGap(d))return;const p=sample(d,off).p;spores.push({d:lapDist(d),off,x:p.x,z:p.z,y:p.y+lift,cd:0,ph:spores.length*.7});};
 // Sporen-Linien auf der Ideallinie der Kurven: wer sauber faehrt, sammelt sie
 for(let k=0;k<10;k++){const d0=length*((k+.35)/10);if(ramps.some(r=>Math.abs(wrapDiff(d0,r.d))<30)||inGap(d0))continue;const kap=trackAt(d0+10).kap,off=clamp(kap*120,-5,5)||Math.sin(k*2.1)*4;for(let i=0;i<5;i++)add(d0+i*4,off,1);}
 for(const r of ramps)if(!r.gap)[[5,2.4],[9,3.3],[13,3]].forEach(([dd,l])=>add(r.end+dd,r.off,l+RAMP_H));
 for(const f of forks)for(let rel=f.span*.3;rel<f.span*.7;rel+=5)add(f.dA+rel,f.offT[Math.round(rel)],1);
 const m=new T.MeshStandardMaterial({color:0xfff27a,emissive:0xffb627,emissiveIntensity:1.2,roughness:.35,flatShading:true});sporeMesh=new T.InstancedMesh(new T.IcosahedronGeometry(.45,0),m,Math.max(1,spores.length));sporeMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);sporeMesh.castShadow=false;world.add(sporeMesh);}
// Tribuene aus drei Segmenten in einer Reihe: ein einzelnes Modell ist nur rund 16 m lang und
// wirkt neben der Start-Gerade verloren. Die Segmente stehen entlang der Strecke (lokales X).
const STAND_SEG=16.2;
function buildStands(){if(!P.grandstand||!course.stands)return;const fans=[],v=new T.Vector3();
 for(const [cp,off] of course.stands){const d=cpDist(cp),s=sample(d,off),tp=sample(d,0).p;
  const ry=Math.atan2(tp.x-s.p.x,tp.z-s.p.z),rx=Math.cos(ry),rz=-Math.sin(ry);
  for(const seg of [-STAND_SEG,0,STAND_SEG]){
   const g=cloneProto(P.grandstand);g.position.set(s.p.x+rx*seg,0,s.p.z+rz*seg);g.rotation.y=ry;world.add(g);g.updateMatrixWorld(true);
   for(let k=-8;k<=8;k+=4){v.set(k,0,-1.5).applyMatrix4(g.matrixWorld);addObstacle(v.x,v.z,2.8);}
   for(let row=0;row<4;row++)for(let i=0;i<18;i++){v.set(-8.1+i*.95,.45+row*.75+.16,-(row*1.1-.2)).applyMatrix4(g.matrixWorld);
    fans.push({x:v.x,y:v.y,z:v.z,ry:ry+(Math.sin(i*7.3+row)*.35),ph:(i*1.7+row*2.3+seg)%TAU,d,col:FAN_COLS[(row*7+i*3+(seg>0?2:seg<0?4:0))%FAN_COLS.length]});}}}
 if(!P.spectator||!fans.length)return;const insts=[];P.spectator.traverse(o=>{if(!o.isMesh)return;const im=new T.InstancedMesh(o.geometry,o.material,fans.length);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.castShadow=false;if(o.material.name==='FanCap'){const c=new T.Color();fans.forEach((f,i)=>im.setColorAt(i,c.setHex(f.col)));}world.add(im);insts.push(im);});crowd={fans,insts};updateCrowd(0);}
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_s=new T.Vector3(),_v=new T.Vector3();
function updateCrowd(now){if(!crowd)return;const p=racers[0],party=state==='finished'||state==='ceremony';crowd.fans.forEach((f,i)=>{const cheer=party||(p&&Math.abs(wrapDiff(p.distance,f.d))<75);const y=f.y+(cheer?Math.abs(Math.sin(now*.011+f.ph))*.45:Math.sin(now*.003+f.ph)*.03);_e.set(0,f.ry,cheer?Math.sin(now*.02+f.ph)*.12:0);_q.setFromEuler(_e);_m.compose(_v.set(f.x,y,f.z),_q,_s.set(1.5,1.5,1.5));for(const im of crowd.insts)im.setMatrixAt(i,_m);});for(const im of crowd.insts)im.instanceMatrix.needsUpdate=true;}
function updateSpores(dt,now){if(!sporeMesh)return;spores.forEach((s,i)=>{if(s.cd>0)s.cd-=dt;const vis=s.cd<=0?1:0;_e.set(0,now*.002+s.ph,.4);_q.setFromEuler(_e);_m.compose(_v.set(s.x,s.y+Math.sin(now*.004+s.ph)*.18,s.z),_q,_s.set(vis,vis,vis));sporeMesh.setMatrixAt(i,_m);});sporeMesh.instanceMatrix.needsUpdate=true;}
function updateSwingers(t=elapsed){const pl=racers[0];for(const s of swingers){const off=Math.sin(t*s.spd+s.ph)*s.amp,p=samplePos(s.d,off,_sp);s.x=p.x;s.z=p.z;
 if(s.kind==='ghost'){s.y=p.y+.9+Math.sin(t*2.2+s.ph)*.45;s.mesh.position.set(p.x,s.y,p.z);const face=pl?Math.atan2(pl.x-p.x,pl.z-p.z):t;s.mesh.rotation.set(0,face,-Math.cos(t*s.spd+s.ph)*.25);const near=pl&&Math.hypot(pl.x-p.x,pl.z-p.z)<18;s.boo=(s.boo||0)+((near?1:0)-(s.boo||0))*.08;s.mesh.scale.setScalar(1.2+s.boo*.35);}
 else{s.mesh.position.copy(p);s.mesh.rotation.y=t*1.5+s.ph;
  if(s.fire){const fl=1+Math.sin(t*9+s.ph*3)*.12;s.mesh.scale.setScalar(1.5*fl);s.mesh.position.y=p.y+1.4+Math.sin(t*3+s.ph)*.35;
   s.cd=Math.max(0,(s.cd||0)-.016);
   if(pl&&state==='race'){const dd=Math.hypot(pl.x-p.x,pl.z-p.z);if(dd<20&&!s.cd){s.cd=1.4;SFX.fire(Math.max(.25,1-dd/20));}}}}}}

// ---------------------------------------------------------------- Partikel (Pool, keine Allokation im Rennen)
const _zeroM=new T.Matrix4().makeScale(0,0,0),_col=new T.Color();
function fxMesh(geo,material,n){const im=new T.InstancedMesh(geo,material,n);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.frustumCulled=false;im.castShadow=false;for(let i=0;i<n;i++){im.setMatrixAt(i,_zeroM);im.setColorAt(i,_col.setHex(0xffffff));}scene.add(im);return im;}
const SPARKS=260,sparkMesh=fxMesh(new T.BoxGeometry(.16,.16,.16),new T.MeshBasicMaterial({color:0xffffff}),SPARKS),sparkPool=Array.from({length:SPARKS},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0}));let sparkIdx=0;
// Konfetti (R30): eigene Instanzen statt Funken - groessere, drehende Zettelchen mit Schwanken
const CONFETTI=150,confettiGeo=new T.PlaneGeometry(.34,.24),confettiMesh=fxMesh(confettiGeo,new T.MeshBasicMaterial({side:T.DoubleSide}),CONFETTI),confettiPool=Array.from({length:CONFETTI},()=>({x:0,y:0,z:0,vy:0,ph:0,rv:0,sw:0,life:0}));let confettiIdx=0;
function dropConfettiBit(x,y,z,col){const i=confettiIdx++%CONFETTI,c=confettiPool[i];c.x=x;c.y=y;c.z=z;c.vy=-1.4-Math.random()*1.1;c.ph=Math.random()*TAU;c.rv=(Math.random()-.5)*9;c.sw=.6+Math.random()*.9;c.life=2.6+Math.random()*1.2;confettiMesh.setColorAt(i,_col.setHex(col));confettiMesh.instanceColor.needsUpdate=true;}
function emit(x,y,z,color,vx,vy,vz,life=.5){const i=sparkIdx++%SPARKS,s=sparkPool[i];s.x=x;s.y=y;s.z=z;s.vx=vx;s.vy=vy;s.vz=vz;s.life=life;sparkMesh.setColorAt(i,_col.setHex(color));sparkMesh.instanceColor.needsUpdate=true;}
function burst(r,color,n=5){const p=r.mesh.position;for(let i=0;i<n;i++){const a=Math.random()*TAU;emit(p.x,p.y+.5,p.z,color,Math.sin(a)*4,2+Math.random()*3,Math.cos(a)*4,.6);}}
const marks=new T.Group();scene.add(marks);
const markGeo=new T.PlaneGeometry(.32,.95);markGeo.rotateX(-Math.PI/2);sharedGeo.add(markGeo);
const SKIDS=160,skidMesh=fxMesh(markGeo,new T.MeshBasicMaterial({color:0x14181f,transparent:true,opacity:.36,depthWrite:false}),SKIDS),skids=Array.from({length:SKIDS},()=>({x:0,y:0,z:0,a:0,life:0}));let skidIdx=0;
function setSkid(i,s){if(s.life<=0){skidMesh.setMatrixAt(i,_zeroM);return;}_e.set(0,s.a,0);_q.setFromEuler(_e);_m.compose(_v.set(s.x,s.y,s.z),_q,_s.set(Math.min(1,s.life*.4),1,1));skidMesh.setMatrixAt(i,_m);}
function dropSkid(x,y,z,angle){const i=skidIdx++%SKIDS,s=skids[i];s.x=x;s.y=y+.08;s.z=z;s.a=angle;s.life=5;setSkid(i,s);skidMesh.instanceMatrix.needsUpdate=true;}
const puffGeo=new T.SphereGeometry(.18,8,6);sharedGeo.add(puffGeo);
const PUFFS=40,puffMesh=fxMesh(puffGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.36,depthWrite:false}),PUFFS),puffPool=Array.from({length:PUFFS},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0}));let puffIdx=0;
function dropPuff(r,color=0xdfe8e8){const i=puffIdx++%PUFFS,p=puffPool[i],s=Math.sin(r.h),c=Math.cos(r.h);p.x=r.x-s*1.4;p.y=(r.y||0)+.5;p.z=r.z-c*1.4;p.vx=-s*2+(Math.random()-.5);p.vy=.9;p.vz=-c*2+(Math.random()-.5);p.life=.75;puffMesh.setColorAt(i,_col.setHex(color));puffMesh.instanceColor.needsUpdate=true;}

// ---------------------------------------------------------------- Kart-Physik (vertikal), Kollisionen, Darstellung
function vertical(r,dt){const {y:ground,rh}=groundAt(r.distance,r.offset);
 if(r.y===undefined){r.y=ground;r.vy=0;r.air=false;r.airT=0;r.trick=0;r.lastGround=ground;r.rampY=0;r.padCd=0;r.ringCd=0;r.stall=0;r.driftVis=0;}
 const roadVy=clamp((ground-r.lastGround)/Math.max(dt,1e-3),-45,45);r.lastGround=ground;
 // Anti-Grav wie in Mario Kart 8: in der Rollzone haelt die Bahn bedingungslos fest. Aus JEDER
 // Hoehe wird das Kart eingeholt (Anflug ueber der Zone, Absprung, Treffer) - das alte Fenster
 // (nur unter ground+3.4) liess jeden fallen, der hoch hineinflog. Einholen mit festem Zug,
 // damit sich der Fang wie ein Magnet anfuehlt, nicht wie ein Teleport.
 // Vorfeld: der Magnet greift schon ~12 m vor der Zone - wer hoch ueber die Einfahrt anreist,
 // wird an der Bahnschwelle gefangen statt davor in die Leere zu segeln.
 if((agrav.length||loops.length)&&(hasRoll(r.distance)||agrav.some(q=>{const a=wrapDiff(q.s,r.distance);return a>0&&a<12;}))&&!rh){if(r.air){r.air=false;r.airT=0;r.trick=0;}
  r.y+=(ground-r.y)*(1-Math.exp(-dt*16));if(Math.abs(ground-r.y)<.05)r.y=ground;
  r.vy=roadVy;r.rampY=0;r.onGapRamp=false;return;}
 if(r.air){r.vy-=G*dt;r.y+=r.vy*dt;r.airT+=dt;
  // Kanten-Gnade (R26): wer eine Landekante knapp unter Niveau kreuzt (zu kurzer Sprung),
  // knallt auf die Fahrbahn und faehrt weiter, statt sofort am Rettungspilz zu landen.
  // Vorher pruefte y<ground-1.5 VOR der Landung - jeder grenzwertige Sprung ueber eine
  // Schlucht endete in einem Respawn-Zyklus (Canyon-Autopilot: 429 Respawns je Rennen).
  if(r.y<ground-1.5&&r.vy<0&&ground>-20){if(ground-r.y<6){land(r,ground,roadVy);}else{respawn(r);return;}}
  if(r.y<=ground&&ground>-20)land(r,ground,roadVy);}
 else if(!rh&&r.rampY>RAMP_H*.55){armGlider(r,'ramp');r.air=true;r.airT=0;r.vy=Math.min(16,6+Math.max(0,r.speed)*.22+(r.onGapRamp?2:0));r.y+=r.vy*dt;if(nearPlayer(r,50))SFX.ramp(r.id===0?1:.4);}
 else{const cand=r.y+r.vy*dt-.5*G_STICK*dt*dt;if(cand>ground+.06&&r.speed>12){r.air=true;r.airT=0;r.y=cand;r.vy-=G*dt;}else{r.y=ground;r.vy=roadVy;}}
 r.rampY=rh&&!r.air?rh.y:0;r.onGapRamp=rh?rh.ramp.gap:false;if(r.trick>0)r.trick=Math.min(.45,r.trick+dt);
 if(r.y<-4&&!hasRoll(r.distance))respawn(r);}
function land(r,ground,roadVy){resetGlider(r);const impact=r.vy-roadVy,me=r.id===0;r.y=ground;r.vy=roadVy;r.air=false;r.airT=0;if(impact<-4)r.squash=clamp(-impact/40,.1,.3);
 if(r.trick>0){if(r.trick>=.42){r.boost=Math.max(r.boost,1.1);burst(r,0x7ceaff,14);if(me){stats.tricks++;SFX.trick();say('trick');toast('TRICK-TURBO!',1,'good');}}else{r.vx*=.7;r.vz*=.7;if(me)toast('WACKLIG!',.8,'bad');}r.trick=0;}
 if(me&&impact<-9){shake=Math.max(shake,Math.min(.3,-impact*.012));dropPuff(r);dropPuff(r);SFX.land(clamp(-impact/25,.25,1));}}
function startTrick(r){r.trick=.001;if(r.id===0)SFX.whoosh();}
// Rettungspilz: nach einem Sturz in die Schlucht zurueck vor die Anlaufstrecke
// Die Hoehe kommt aus groundAt, nicht aus sample: in einer Rollzone schwebt die sichtbare Bahn
// bis zu 12,5 m ueber dem Boden, und wer dort oben eingesetzt wird, faellt endlos im Kreis.
function respawn(r){resetGlider(r,true);const me=r.id===0,d=r.safeD??0,s=sample(d,0),gy=groundAt(d,0).y,fell=gaps.some(g=>Math.abs(wrapDiff(g.c,lapDist(r.distance)))<40);r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.vx=r.vz=0;r.speed=0;r.distance+=wrapDiff(d,lapDist(r.distance));r.offset=0;r.y=gy+2.2;r.vy=0;r.air=true;r.airT=0;r.trick=0;r.driftDir=0;r.drift=0;r.stun=.5;r.lastGround=gy;
 if(me&&stats){stats.falls++;toast(fell?'RETTUNGSPILZ! Mit mehr Tempo über die Schanze':'RETTUNGSPILZ!',2,'bad');if(fell)SFX.splash();shake=.3;}}
const nearPlayer=(r,range)=>racers[0]&&Math.abs(r.distance-racers[0].distance)<range;
function collideStatic(r){const ix=Math.floor(r.x/16),iz=Math.floor(r.z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const cell=obsGrid.get((ix+a+500)*1000+(iz+b+500));if(!cell)continue;for(const o of cell){const dx=r.x-o.x,dz=r.z-o.z,rr=o.r+1.05,d2=dx*dx+dz*dz;if(d2<rr*rr&&r.y<o.h){const d=Math.sqrt(d2)||1,nx=dx/d,nz=dz/d;r.x=o.x+nx*rr;r.z=o.z+nz*rr;bounce(r,nx,nz);}}}
 for(const s of swingers){if(s.kind==='ghost')continue;const dx=r.x-s.x,dz=r.z-s.z,rr=2.3+1.05,d2=dx*dx+dz*dz;if(d2<rr*rr&&r.y<trackAt(s.d).h+3){const d=Math.sqrt(d2)||1,nx=dx/d,nz=dz/d;r.x=s.x+nx*rr;r.z=s.z+nz*rr;bounce(r,nx,nz,true);}}
 const R=Math.hypot(r.x,r.z);if(R>189){const nx=-r.x/R,nz=-r.z/R;r.x=-nx*189;r.z=-nz*189;bounce(r,nx,nz);}}
function bounce(r,nx,nz,hard=false){const vn=r.vx*nx+r.vz*nz;if(vn>=0)return;r.vx-=nx*vn*1.06;r.vz-=nz*vn*1.06;const loss=Math.min(.35,-vn/70+(hard?.18:0));r.vx*=1-loss;r.vz*=1-loss;if(hard&&-vn>4)hitKart(r,.45,.9);
 if(-vn>5)r.combo=0;if(r.id===0&&-vn>5){shake=Math.max(shake,Math.min(.35,-vn*.02));SFX.bump(clamp(-vn/25,.2,1));stats.bumps++;}}
const _agP=new T.Vector3(),_agV=new T.Vector3(),_agAxis=new T.Vector3(),_agL=new T.Vector3(),_agB=new T.Vector3();
function syncKart(r,dt){const s=tanAt(r.distance),e=r.mesh.rotation,dot=Math.sin(r.h)*s.x+Math.cos(r.h)*s.z,bank=s.b;
 r.driftVis=(r.driftVis||0)+((r.driftDir||0)*.38-(r.driftVis||0))*Math.min(1,dt*10);
 const hopY=r.hop>0?Math.sin((.2-r.hop)/.2*Math.PI)*.35:0;
 const lift=.1+hopY+(r.air?0:Math.sin(elapsed*22+r.id)*.03*(Math.abs(r.speed)/30));
 const inLoop=loops.length?loopAt(r.distance):null;
 // Immer derselbe Weg ins Bild - keine Schwelle, an der umgeschaltet wird. Ohne Rolle, Hub und
 // Looping gibt posAt genau die physikalische Lage zurueck, flach aendert sich also nichts.
 r.mesh.position.copy(posAt(r.distance,r.offset,(r.y??0)-roadRef(r.distance,r.offset)+lift,_agP));e.order='YXZ';
 const spin=r.trick>0?Math.min(1,r.trick/.42)*TAU:0;
 // Der Looping ist reine Nickbewegung um die Querachse - Lenken bleibt davon unberuehrt
 e.y=r.h+r.driftVis+(r.stun>0?elapsed*14:0)+spin;
 e.x=inLoop?-loopFrame(inLoop,r.distance).pitch:r.air?clamp(-r.vy*.02,-.45,.45):-Math.atan(slopeAt(r.distance)*dot);
 e.z=-bank*dot+(r.id===0?-(r.steerS||0)*.07:0)-r.driftVis*.12+(agrav.length?rollAt(r.distance):0);
 const ks=r.kartScale||[1,1,1];
 if(r.squash>0){r.squash=Math.max(0,r.squash-dt*1.4);const q=Math.sin(r.squash/.3*Math.PI)*r.squash*.55;r.mesh.scale.set(ks[0]*(1+q*.6),ks[1]*(1-q),ks[2]*(1+q*.6));}
 else if(r.mesh.scale.y!==ks[1])r.mesh.scale.set(ks[0],ks[1],ks[2]);
 // Federung: Laengsbeschleunigung geglaettet, daraus Nicken und gegenlaeufiges Einfedern.
 // Ohne das steht das Kart starr auf den Raedern und wirkt wie ein Brett.
 {const sp=r.speed||0,a=(sp-(r.spdPrev??sp))/Math.max(dt,1e-3);
  r.spdPrev=sp;r.accS=(r.accS||0)+(a-(r.accS||0))*Math.min(1,dt*7);}
 const squat=clamp((r.accS||0)*.006,-.075,.075);
 e.x-=squat*.85;                                        // beschleunigen: Nase hoch, bremsen: Nase runter
 const parts=r.mesh.userData.parts;if(parts){const st=r.steerS||0;
  for(const w of parts.wheels){w.wh.rotation.x+=(r.speed*dt)/w.r*w.dir;if(w.front)w.piv.rotation.y=st*.42+(r.driftDir||0)*.12;
   if(w.y0===undefined)w.y0=w.piv.position.y;
   const c=(w.front?-squat:squat)*1.25-(r.air?.05:0);   // in der Luft haengen die Raeder aus
   w.piv.position.y=w.y0+c;}
  const d=parts.driver;if(d){const lean=-st*.2-(r.driftVis||0)*.3,done=r.finishTime!==null;d.rotation.z+=(lean-d.rotation.z)*Math.min(1,dt*8);d.rotation.x+=((r.air?-.2:r.boost>0?.12:0)-d.rotation.x)*Math.min(1,dt*6);
   d.position.y=.95+(r.air?.14:0)+(done?Math.abs(Math.sin(elapsed*8+r.id))*.3:0)+Math.sin(elapsed*17+r.id)*.015*Math.min(1,Math.abs(r.speed)/20);d.rotation.y=r.stun>0?Math.sin(elapsed*28)*.35:done?Math.sin(elapsed*5+r.id)*.4:0;}}
 syncGlider(r,dt,spin);r.mesh.userData.shield.visible=r.shield>0;const fl=r.boost>0;for(const f of r.mesh.userData.flames){f.visible=fl;if(fl)f.scale.set(1,1,.7+Math.random()*.7);}
 const ug=r.mesh.userData.underglow;if(ug)ug.visible=!r.air&&agrav.length>0&&hasRoll(r.distance)&&Math.abs(r.speed)>5;
 for(const b of r.mesh.userData.brakes||[])b.visible=!!r.braking;}
const keys=new Set(),tkeys=new Set(),touchPtr=new Map(),held=c=>keys.has(c)||tkeys.has(c);function steering(){return (held('ArrowLeft')||held('KeyA')?1:0)-(held('ArrowRight')||held('KeyD')?1:0);}

// ---------------------------------------------------------------- KI-Fahrer: Ideallinie, Bremspunkte, Drifts (Koennen je Klasse)
function aiInput(r,dt){const sk=r.skill,sp=Math.max(0,r.speed),look=5+sp*.38;
 let kap=0;for(let s=10;s<=26;s+=8)kap+=trackAt(r.distance+s).kap;kap/=3;
 let line=clamp(kap*90,-4,4)*sk+r.laneBias*(1-sk*.6);
 const fkNear=forkAt(r.distance+22)||forkAt(r.distance);let onFork=false;if(fkNear){if(r.forkFor!==fkNear.f){r.forkFor=fkNear.f;r.forkPick=Math.random()<.2+sk*.4;}onFork=r.forkPick;}else r.forkFor=null;
 // Schanzen/Schlucht: Ideallinie auf die Rampe; Bananen und Pendelpilzen ausweichen
 for(const rp of ramps){const ahead=wrapDiff(rp.d,r.distance);if(ahead>0&&ahead<(rp.gap?95:30))line=rp.off;}
 for(const h of hazards){const p=project(h.x,h.z,r.distance),ahead=wrapDiff(p.d,r.distance);if(ahead>2&&ahead<28&&Math.abs(p.off-line)<2.4)line=p.off+(p.off>line?-3.5:3.5);}
 for(const s of swingers){const ahead=wrapDiff(s.d,r.distance);if(ahead>0&&ahead<35){const off=Math.sin((elapsed+ahead/Math.max(sp,5))*s.spd+s.ph)*s.amp;if(Math.abs(off-line)<4)line=off>0?-4.6:4.6;}}
 if(onFork){const fa=forkAt(r.distance+look);if(fa)line=fa.off;}else line=clamp(line,-6,6);r.lineS=r.lineS===undefined?line:r.lineS+(line-r.lineS)*Math.min(1,dt*(onFork?8:2.6));line=onFork?line:r.lineS;
 // Pure Pursuit: Zielpunkt auf der Linie, daraus benoetigte Gierrate -> Lenkeinschlag
 const tgt=samplePos(r.distance+look,line,_sp),L=Math.hypot(tgt.x-r.x,tgt.z-r.z)||1,err=angleDiff(Math.atan2(tgt.x-r.x,tgt.z-r.z),r.h);
 const needYaw=Math.max(sp,4)*2*Math.sin(err)/L;
 let steer=needYaw/(PHYS.turn*Math.max(.2,turnCurve(sp)))+Math.sin(elapsed*1.3+r.id*2)*.18*(1-sk);
 // Zieltempo: kleinste erlaubte Geschwindigkeit innerhalb der Bremsdistanz
 let target=PHYS.top*1.2;const brakeDecel=PHYS.brake*.8,dcap=sk>.55;
 for(let s=4;s<=12+sp*1.4;s+=4){const tr=trackAt(r.distance+s);let vc=(r.driftDir||dcap?tr.vd:tr.v)*(.84+.16*sk);if(onFork){const fa=forkAt(r.distance+s);if(fa)vc=Math.min(vc,fa.f.vT[fa.rel]*(.88+.12*sk));}target=Math.min(target,Math.sqrt(vc*vc+2*brakeDecel*s));}
 const gapAhead=gaps.some(g=>{const a=wrapDiff(g.start,r.distance);return a>0&&a<120;});if(gapAhead)target=99;
 // Anti-Grav-Einfahrt mit Bodenkontakt anfahren: Deckel verhindert Abspruenge/Turbo am Wandeintritt

 const gas=sp<target-.3,brake=sp>target+2.5&&!gapAhead;
 // Drift: nur bei langen Kurven; Radius per Gegenlenken regeln; Ladestufe je Koennen, Release wenn die Kurve oeffnet
 let drift=false;r.driftCd=Math.max(0,r.driftCd-dt);
 // Anti-Grav dreht nur das Bild, gefahren wird normal: die KI darf hier driften wie ueberall
 const agNear=false;
 let turnAhead=0;for(let s=6;s<=46;s+=4)turnAhead+=trackAt(r.distance+s).kap*4;
 if(r.driftDir){const f=(needYaw*r.driftDir)/(PHYS.turn*Math.min(1,sp/10)),goal=sk>.85?2.35:sk>.6?1.45:.75;
  let exitSoon=0;for(let s=4;s<=20;s+=4)exitSoon+=trackAt(r.distance+s).kap*4;
  drift=!(f<.12||(r.drift>=goal&&Math.abs(exitSoon)<.28)||Math.abs(r.offset)>7.2||gapAhead||agNear);
  if(drift)steer=clamp(((f-.35)/.7)*2-1,-1,1)*r.driftDir;}
 else if(Math.abs(turnAhead)>.75&&sp>17&&r.driftCd<=0&&!r.air&&!gapAhead&&!agNear&&Math.abs(r.offset)<5){r.driftCd=1.5;if(Math.random()<sk*.95){drift=true;steer=Math.sign(turnAhead);}}
 return {gas,brake,steer:clamp(steer,-1,1),drift};}
function aiItems(r,order){if(r.cooldown>0||!r.item||r.itemPending)return;const pl=order.indexOf(r),ahead=order[pl-1],behind=order[pl+1],kap=Math.abs(trackAt(r.distance+20).kap);
 const use=r.item==='bomb'?ahead&&ahead.distance-r.distance>12&&ahead.distance-r.distance<45:r.item==='shell'?ahead&&ahead.distance-r.distance<70:r.item==='banana'?behind&&r.distance-behind.distance<35:r.item==='boost'||r.item==='triple'?kap<1/80&&!agrav.some(q=>{const a=wrapDiff(q.s,r.distance);return a>4&&a<55;}):true;
 if(use){useItem(r);r.cooldown=r.item==='triple'?1.2:2.5;}}

// ---------------------------------------------------------------- Audio: Sprecher, SFX (ElevenLabs), Musik
let audioReady=false;
function armAudio(){if(audioReady)return;audioReady=true;if(soundOn){audioInit();playBgm(state==='menu'||state==='finished'?'menu':raceTrack());if(state==='menu')say('welcome');}}
addEventListener('pointerdown',armAudio,{once:true});addEventListener('keydown',armAudio,{once:true});
const VOICE={start:'Auf die Plätze — fertig — los!',lap2:'Runde zwei',lastlap:'Letzte Runde!',turbo:'Turbo!',hit:'Volltreffer!',ouch:'Autsch!',banana:'Banane gelegt!',shield:'Sternenschild!',lead:'Du führst!',win:'Erster Platz!',podium:'Aufs Treppchen!',finish:'Im Ziel!',best:'Neue Bestzeit!',welcome:'Willkommen bei Mushroom Rally!',rocket:'Raketenstart!',early:'Zu früh!',trick:'Super Trick!',spores:'Volle Sporen-Power!',gpnext:'Weiter zum nächsten Rennen!',gpwin:'Grand-Prix-Sieger!',gppodium:'Aufs Grand-Prix-Treppchen!',gpfinish:'Grand Prix beendet!'};
const VIP=new Set(['start','lap2','lastlap','win','podium','finish','best','gpnext','gpwin','gppodium','gpfinish']);
const SFX_MAX={pickup:1.2,banana:1.6,hit:1,cheer:4,jingle:8,goodtry:6,finallap:4,spore:.6,ramp:1.3,trick:1.1,rocket:1.8,boost:1.4,lap:1.6,bump:.8,drift:1.2};
// Musik bleibt das Fundament. Kurze Hinweise liegen darueber, Kollisionen und Jubel dahinter.
const AUDIO_MIX={effects:.78,voice:.95,music:.49,world:.82};
const SFX_RMS={hit:.095,bump:.075,drift:.075,cheer:.075,boost:.105,rocket:.105,ramp:.095,spore:.09,jingle:.14,goodtry:.12,finallap:.115};
const CLIPS={};for(const k of Object.keys(VOICE))CLIPS['v_'+k]='assets/audio/voice/'+k+'.mp3';for(const k of Object.keys(SFX_MAX))CLIPS['s_'+k]='assets/audio/sfx/'+k+'.mp3';
const clipData={},clipBuf={},clipFail={},clipNorm={},clipPlayed={},effectSources=new Set();let echoSend=null,ambSrc=null,ambGain=null,ambLfo=null,voiceGain=null,sfxGain=null,effectsOut=null,voiceSrc=null,voiceKey=null,voiceQueue=null,pendingVoice=null,duckUntil=0,ducked=false,engine=null,raceFilter=null,masterGain=null,worldGain=null,mixMuted=false,duckLevel=1,duckTick=0;
for(const [k,url] of Object.entries(CLIPS))clipData[k]=fetch(url).then(r=>{if(!r.ok)throw new Error(url);return r.arrayBuffer();}).catch(()=>{clipFail[k]=true;return null;});
function prepClip(k,b){const sr=b.sampleRate,ch=b.numberOfChannels,channels=Array.from({length:ch},(_,i)=>b.getChannelData(i)),d0=channels[0],audible=i=>channels.some(d=>Math.abs(d[i])>=.004);let start=0;while(start<d0.length&&!audible(start))start++;start=Math.max(0,start-Math.floor(sr*.005));const max=k.startsWith('s_')?SFX_MAX[k.slice(2)]:10;let end=Math.min(d0.length,start+Math.floor(sr*max)),e=end-1;while(e>start&&!audible(e))e--;end=Math.min(end,e+Math.floor(sr*.03));
 const len=Math.max(1,end-start),out=ctx.createBuffer(ch,len,sr),fade=Math.min(len,Math.floor(sr*.04));let sum=0,n=0,peak=0;for(let c=0;c<ch;c++){const dst=out.getChannelData(c);dst.set(b.getChannelData(c).subarray(start,end));for(let i=0;i<fade;i++)dst[len-1-i]*=i/fade;for(let i=0;i<len;i++){peak=Math.max(peak,Math.abs(dst[i]));if(i%3===0){sum+=dst[i]*dst[i];n++;}}}
 const target=k.startsWith('v_')?.16:(SFX_RMS[k.slice(2)]||.11);
 // Spitzen begrenzen, statt leise Dateien samt Rauschen beliebig hochzuziehen.
 clipNorm[k]=Math.min(2.5,target/Math.max(Math.sqrt(sum/Math.max(1,n)),1e-4),.82/Math.max(peak,1e-4));return out;}
// Nacheinander dekodieren (kleine Pausen), damit der Start nicht an vielen gleichzeitigen Audio-Jobs haengt
async function decodeClips(){for(const k of Object.keys(CLIPS)){try{const ab=await clipData[k];if(ab){const b=await ctx.decodeAudioData(ab);clipBuf[k]=prepClip(k,b);if(pendingVoice&&'v_'+pendingVoice.key===k&&performance.now()-pendingVoice.t<900){const key=pendingVoice.key;pendingVoice=null;say(key);}}}catch(e){clipFail[k]=true;}await new Promise(r=>setTimeout(r,12));}}
function trackEffect(src){effectSources.add(src);src.onended=()=>{effectSources.delete(src);src.disconnect();};return src;}
function playClip(k,bus,vol=1,rate=1){const b=clipBuf[k],fx=k.startsWith('s_');if(!soundOn||!b||!ctx||(fx&&state==='paused'))return null;
 const t=ctx.currentTime;if(fx&&((t-(clipPlayed[k]??-99))<.09||effectSources.size>=18))return true;
 const s=ctx.createBufferSource();s.buffer=b;s.playbackRate.value=rate;const g=ctx.createGain();g.gain.value=vol*(clipNorm[k]||1);s.connect(g);g.connect(bus||sfxGain||masterGain);if(fx){clipPlayed[k]=t;trackEffect(s);}s.start();return s;}
function speak(text){if(!('speechSynthesis' in window))return;try{const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith('de'));if(v)u.voice=v;u.rate=1.1;u.volume=.6;speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}}
function say(key){if(!soundOn||!VOICE[key])return;const now=performance.now(),busy=voiceSrc&&now<duckUntil;
 if(busy&&VIP.has(voiceKey)){if(VIP.has(key))voiceQueue=key;return;}
 if(ctx&&clipBuf['v_'+key]){try{voiceSrc?.stop();}catch{}voiceSrc=playClip('v_'+key,voiceGain,1);voiceKey=key;duckUntil=now+clipBuf['v_'+key].duration*1000+180;return;}
 if(!clipFail['v_'+key]){pendingVoice={key,t:now};return;}speak(VOICE[key]);}
function stopVoice(){try{voiceSrc?.stop();}catch{}voiceSrc=null;voiceQueue=null;pendingVoice=null;duckUntil=0;try{speechSynthesis.cancel();}catch{}}
function syncAudioMix(){if(!ctx)return;const quiet=!soundOn||state==='paused',t=ctx.currentTime;
 if(quiet!==mixMuted){if(quiet){for(const s of effectSources){try{s.stop();}catch{}}effectSources.clear();}mixMuted=quiet;}
 sfxGain.gain.setTargetAtTime(quiet?0:AUDIO_MIX.effects,t,.045);effectsOut.gain.setTargetAtTime(quiet?0:1,t,.035);worldGain.gain.setTargetAtTime(quiet||!['race','countdown'].includes(state)?0:AUDIO_MIX.world,t,.08);masterGain.gain.setTargetAtTime(soundOn?.92:0,t,.035);}
function duckBgm(now){if(voiceQueue&&now>=duckUntil){const k=voiceQueue;voiceQueue=null;say(k);}ducked=now<duckUntil;const dt=duckTick?Math.min(.1,Math.max(0,(now-duckTick)/1000)):1/60;duckTick=now;const target=ducked?.66:1;duckLevel+=(target-duckLevel)*(1-Math.exp(-dt/(ducked?.12:.48)));syncAudioMix();bgmTick(now);}
function audioInit(){if(ctx){if(ctx.state==='suspended')ctx.resume().catch(()=>{});return;}ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});
 masterGain=ctx.createGain();masterGain.gain.value=.92;masterGain.connect(ctx.destination);worldGain=ctx.createGain();worldGain.gain.value=AUDIO_MIX.world;worldGain.connect(masterGain);
 const o1=ctx.createOscillator();o1.type='sawtooth';const o2=ctx.createOscillator();o2.type='square';const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700;f.Q.value=1.1;const g=ctx.createGain();g.gain.value=0;o1.connect(f);o2.connect(f);f.connect(g);g.connect(worldGain);o1.start();o2.start();
 const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=950;bp.Q.value=3.2;const ng=ctx.createGain();ng.gain.value=0;ns.connect(bp);bp.connect(ng);ng.connect(worldGain);ns.start();
 engine={o1,o2,f,g,noise:ng,bp};
 voiceGain=ctx.createGain();voiceGain.gain.value=AUDIO_MIX.voice;voiceGain.connect(masterGain);sfxGain=ctx.createGain();sfxGain.gain.value=AUDIO_MIX.effects;
 const hp=ctx.createBiquadFilter(),soft=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor();hp.type='highpass';hp.frequency.value=85;hp.Q.value=.7;soft.type='lowpass';soft.frequency.value=6500;soft.Q.value=.65;
 comp.threshold.value=-18;comp.knee.value=15;comp.ratio.value=3;comp.attack.value=.008;comp.release.value=.16;effectsOut=ctx.createGain();effectsOut.connect(masterGain);sfxGain.connect(hp);hp.connect(soft);soft.connect(comp);comp.connect(effectsOut);
 // Hallweg: im Tunnel wird er aufgezogen
 echoSend=ctx.createGain();echoSend.gain.value=0;const dl=ctx.createDelay(.6),fb=ctx.createGain(),lp=ctx.createBiquadFilter();
 dl.delayTime.value=.165;fb.gain.value=.22;lp.type='lowpass';lp.frequency.value=2200;
 const wet=ctx.createGain();wet.gain.value=.28;comp.connect(echoSend);echoSend.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(wet);wet.connect(effectsOut);buildRaceFilter();decodeClips();}
let noiseBuf=null;
// Dauerklang der Lavawelt: gefiltertes Rauschen mit langsam atmender Lautstaerke
function setAmbience(on){if(!ctx)return;
 if(on&&!ambSrc){if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  ambSrc=ctx.createBufferSource();ambSrc.buffer=noiseBuf;ambSrc.loop=true;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=170;lp.Q.value=.7;
  ambGain=ctx.createGain();ambGain.gain.value=0;
  const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.12;lg.gain.value=.055;lfo.connect(lg);lg.connect(ambGain.gain);lfo.start();ambLfo=lfo;
  ambSrc.connect(lp);lp.connect(ambGain);ambGain.connect(worldGain);ambSrc.start();
  ambGain.gain.setTargetAtTime(.18,ctx.currentTime,1.2);}
 else if(!on&&ambSrc){const s=ambSrc,g=ambGain,lfo=ambLfo;ambSrc=null;ambGain=null;ambLfo=null;g.gain.setTargetAtTime(0,ctx.currentTime,.4);setTimeout(()=>{try{s.stop();lfo?.stop();}catch(e){}},1400);}}
function sfxNoise(dur,f0,f1,vol=.2,q=2){if(!soundOn||!ctx||state==='paused'||effectSources.size>=18)return;const t=ctx.currentTime;if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}const s=trackEffect(ctx.createBufferSource());s.buffer=noiseBuf;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=q;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);const gg=ctx.createGain();gg.gain.setValueAtTime(.001,t);gg.gain.linearRampToValueAtTime(vol,t+.006);gg.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(bp);bp.connect(gg);gg.connect(sfxGain);s.start(t,Math.random()*.9,dur+.02);}
function sfxTone(f0,f1,dur,type='square',vol=.08,delay=0){if(!soundOn||!ctx||state==='paused'||effectSources.size>=18)return;const t=ctx.currentTime+delay,o=trackEffect(ctx.createOscillator());o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);const gg=ctx.createGain();gg.gain.setValueAtTime(.001,t);gg.gain.linearRampToValueAtTime(vol,t+.005);gg.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(gg);gg.connect(sfxGain);o.start(t);o.stop(t+dur+.02);}
let agHum=null;
const SFX={
 // Magnetfeld-Summen des Spielers in Rollzonen: leiser Sawtooth durch Tiefpass, weich ein/ausgeblendet
 hum(on){if(!ctx||(on?agHum:!agHum))return;if(on&&!soundOn)return;
  if(on){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
   o.type='sawtooth';o.frequency.value=50;f.type='lowpass';f.frequency.value=240;g.gain.value=0;
   o.connect(f);f.connect(g);g.connect(sfxGain||masterGain);o.start();
   g.gain.linearRampToValueAtTime(.045,ctx.currentTime+.25);agHum={o,g};}
  else{const h=agHum;agHum=null;h.g.gain.linearRampToValueAtTime(0,ctx.currentTime+.3);
   setTimeout(()=>{try{h.o.stop()}catch(e){}},450);}},
 pickup(){if(playClip('s_pickup',sfxGain,.6))return;[880,1108,1318].forEach((f,i)=>sfxTone(f,f,.09,'square',.05,i*.07));},
 tick(){sfxTone(1500,1400,.03,'square',.018);},
 drift(){playClip('s_drift',sfxGain,.5);},
 boost(){if(playClip('s_boost',sfxGain,.85))return;sfxNoise(.5,400,3200,.18,1.5);sfxTone(180,760,.35,'sawtooth',.035);},
 mt(level){const base={mini:520,super:660,ultra:880}[level]||520;[1,1.25,1.5].forEach((m,i)=>sfxTone(base*m,base*m*1.02,.09,'square',.045,i*.05));sfxNoise(.45,500,3600,level==='ultra'?.22:.14,1.4);},
 overtake(){sfxTone(988,1318,.08,'triangle',.05);},
 shell(){sfxTone(900,180,.22,'sawtooth',.06);sfxNoise(.15,2000,400,.08,2);},
 banana(){sfxTone(520,220,.3,'triangle',.07);},
 slip(v=1){if(playClip('s_banana',sfxGain,.8*v))return;sfxTone(520,160,.45,'triangle',.08*v);},
 shield(){[660,880,1320].forEach((f,i)=>sfxTone(f,f*.99,.4,'triangle',.035,i*.03));},
 hit(v=1){if(playClip('s_hit',sfxGain,.9*v))return;sfxTone(160,60,.25,'square',.1*v);sfxNoise(.18,300,90,.1*v,1);},
 bump(v=1){if(playClip('s_bump',sfxGain,.75*v))return;sfxTone(130,55,.16,'sine',.16*v);sfxNoise(.12,700,150,.1*v,1);},
 splash(){sfxNoise(.9,1800,200,.25,.8);sfxTone(300,90,.5,'sine',.08);},
 cheer(){playClip('s_cheer',sfxGain,.6);},
 lap(){if(playClip('s_lap',sfxGain,.8))return;sfxTone(784,784,.1,'square',.05);sfxTone(1046,1046,.22,'square',.05,.11);},
 fanfare(){[523,659,784,1046].forEach((f,i)=>sfxTone(f,f,i===3?.5:.13,'square',.06,i*.12));},
 count(go){sfxTone(go?880:440,go?880:440,go?.28:.12,'square',.07);},
 rocket(){if(playClip('s_rocket',sfxGain,.9))return;sfxNoise(.7,300,2600,.2,1.2);},
 ramp(v=1){if(playClip('s_ramp',sfxGain,.7*v))return;sfxTone(200,620,.3,'sine',.08*v);},
 boing(v=1){if(playClip('s_ramp',sfxGain,.7*v,1.25))return;sfxTone(160,700,.35,'triangle',.1*v);},
 trick(){if(playClip('s_trick',sfxGain,.8,1.1))return;sfxTone(600,1500,.25,'triangle',.07);},
 whoosh(){sfxNoise(.3,500,2500,.1,1.4);},
 fire(v=1){sfxNoise(.55,260,1700,.16*v,1.1);sfxTone(90,220,.4,'sawtooth',.05*v);},
 ring(){[988,1318,1760].forEach((f,i)=>sfxTone(f,f,.12,'triangle',.05,i*.05));},
 spore(n){if(playClip('s_spore',sfxGain,.4,1+n*.035))return;sfxTone(1200+n*60,1800+n*60,.08,'sine',.05);},
 land(v){sfxTone(110,45,.2,'sine',.14*v);sfxNoise(.14,500,120,.08*v,1);},
 scrape(){sfxNoise(.14,2600,1500,.045,3);},
 boom(v=1){sfxNoise(1.1,1200,50,.4*v,.6);sfxTone(140,38,.7,'sine',.22*v);sfxTone(90,30,.9,'triangle',.12*v,.05);},
 combo(c){[0,1,2,3].slice(0,Math.min(4,c)).forEach((k,i)=>sfxTone(660*Math.pow(1.26,k),700*Math.pow(1.26,k),.08,'square',.04,i*.055));},
 spook(v=1){sfxTone(620,170,.6,'triangle',.07*v);sfxTone(640,185,.6,'sine',.05*v,.05);sfxNoise(.5,900,260,.07*v,2);},
 wrong(){sfxTone(300,300,.12,'square',.04);sfxTone(240,240,.18,'square',.04,.14);}};
// Ein einziges Ereignis kann von Physik und Item-Logik im selben Bild gemeldet werden.
const FX_INTERVAL={boost:320,bump:150,hit:150,drift:750,cheer:1800,ramp:180,boing:180,spore:70,land:150,scrape:150,ring:160,fire:180,spook:350,whoosh:180},fxPlayed={};
for(const [name,ms] of Object.entries(FX_INTERVAL)){const play=SFX[name];SFX[name]=(...args)=>{const now=ctx?ctx.currentTime*1000:performance.now();if(!soundOn||state==='paused'||now-(fxPlayed[name]??-9999)<ms)return;fxPlayed[name]=now;return play(...args);};}
const BGM_SRC={menu:'bgm_menu.mp3',race:'bgm_race.mp3',sunset:'bgm_sunset.mp3',night:'bgm_night.mp3'},RACE_TRACKS=['race','sunset','night'],BGM_VOL=AUDIO_MIX.music,BGM_XF=2.2;
const TRACK_GAIN={menu:1.07,race:1,sunset:.94,night:.91};
const bgm={current:null,ready:{},failed:{},tracks:{},rate:1};
for(const [name,src] of Object.entries(BGM_SRC)){const els=[0,1].map(()=>{const a=new Audio('assets/audio/'+src);a.preload=name==='menu'?'auto':'metadata';a.volume=0;return a;});els[0].addEventListener('canplaythrough',()=>bgm.ready[name]=true);els[0].addEventListener('error',()=>bgm.failed[name]=true);bgm.tracks[name]={els,gains:null,active:0,xf:-1,t0:0};}
const raceTrack=()=>{const m=courses[selected].music;return bgm.failed[m]?'race':m;};
function buildRaceFilter(){if(raceFilter||!ctx)return;try{raceFilter=ctx.createBiquadFilter();raceFilter.type='lowpass';raceFilter.frequency.value=4000;raceFilter.connect(masterGain);for(const n of Object.keys(BGM_SRC)){const tr=bgm.tracks[n];tr.gains=tr.els.map(a=>{const g=ctx.createGain();g.gain.value=0;ctx.createMediaElementSource(a).connect(g);g.connect(n==='menu'?masterGain:raceFilter);a.volume=1;return g;});}}catch{raceFilter=null;}}
function setTrackVol(tr,i,v){if(tr.gains)tr.gains[i].gain.value=v;else tr.els[i].volume=clamp(v,0,1);}
function setBgmRate(rate){bgm.rate=rate;const tr=bgm.tracks[bgm.current];if(!tr)return;for(const a of tr.els){a.preservesPitch=false;a.mozPreservesPitch=false;a.playbackRate=rate;}}
function stopBgm(){for(const tr of Object.values(bgm.tracks))tr.els.forEach((a,i)=>{a.pause();setTrackVol(tr,i,0);});bgm.current=null;}
function playBgm(name){if(!soundOn||bgm.failed[name])return;if(bgm.current===name)return;stopBgm();const tr=bgm.tracks[name];tr.active=0;tr.xf=-1;tr.t0=performance.now();for(const a of tr.els)a.playbackRate=1;bgm.rate=1;const a=tr.els[0];try{a.currentTime=0;}catch{}bgm.current=name;a.play().catch(()=>{if(bgm.current===name)bgm.current=null;});}
function bgmTick(now){const tr=bgm.tracks[bgm.current];if(!tr)return;const a=tr.els[tr.active],b=tr.els[1-tr.active],dur=a.duration,base=BGM_VOL*TRACK_GAIN[bgm.current]*duckLevel*(state==='paused'?.65:1)*Math.min(1,(now-tr.t0)/700),xfDur=BGM_XF*bgm.rate;
 if(tr.xf<0&&isFinite(dur)&&dur>BGM_XF*3&&a.currentTime>dur-xfDur){tr.xf=now;try{b.currentTime=0;}catch{}if(b.currentTime>1)b.load();b.playbackRate=bgm.rate;b.play().catch(()=>{});}
 let va=1,vb=0;if(tr.xf>=0){const k=Math.min(1,(now-tr.xf)/(BGM_XF*1000));va=Math.cos(k*Math.PI/2);vb=Math.sin(k*Math.PI/2);if(k>=1){a.pause();tr.active=1-tr.active;tr.xf=-1;setTrackVol(tr,1-tr.active,0);setTrackVol(tr,tr.active,base);return;}}
 setTrackVol(tr,tr.active,base*va);setTrackVol(tr,1-tr.active,base*vb);}
function setSound(){soundOn=!soundOn;if(soundOn)audioInit();if(engine)engine.g.gain.value=0;if(!soundOn){stopBgm();stopVoice();}else playBgm(state==='menu'||state==='finished'||state==='ceremony'?'menu':raceTrack());syncAudioMix();$('sound').textContent=soundOn?'♪ AN':'♪ AUS';$('sound').setAttribute('aria-label',soundOn?'Ton ausschalten':'Ton einschalten');}

// ---------------------------------------------------------------- Spielablauf
function newStats(){return {mt:{mini:0,super:0,ultra:0},maxCombo:0,drafts:0,tricks:0,rings:0,hitsDealt:0,hitsTaken:0,overtakes:0,bestLap:Infinity,lapStart:0,falls:0,bumps:0,maxSpores:0};}
function start(){if(gp.active)selected=gp.race;syncTrackButtons();keys.clear();buildCourse();setAmbience(!!theme.ember);state='countdown';elapsed=0;countdown=3;startPress=-1;noticeTimer=0;stats=newStats();
 for(const id of ['menu','result','ceremony','pausePanel'])$(id).hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('touch').hidden=false;$('gpBadge').hidden=!gp.active;$('hud').classList.toggle('tt',isTT());$('ttGhost').hidden=$('ttMedal').hidden=!isTT();if(isTT())for(const b of boxes)b.cooldown=1e9;
 document.body.classList.add('racing');document.body.classList.remove('cer');if(soundOn)audioInit();finishMusicAt=0;playBgm(raceTrack());setBgmRate(course.bgmRate||1);stopVoice();say('start');updateCamera(1,true);
 toast(`${course.name} · ${isTT()?'Zeitfahren':cc+'cc'}`,2.2);if(isTT()&&ghost)setTimeout(()=>toast('👻 Dein Geist fährt mit – schlag ihn!',2),2300);if(coarseInput){wantFs=true;enterFs();}}
function home(){setAmbience(false);gp.active=false;state='menu';keys.clear();buildCourse();for(const id of ['hud','touch','pause','pausePanel','result','ceremony'])$(id).hidden=true;$('menu').hidden=false;setText('message','');document.body.classList.remove('racing','cer');if(engine)engine.g.gain.value=0;SFX.hum(false);stopVoice();finishMusicAt=0;playBgm('menu');refreshMenu();}
let beforePause='race';function pause(){if(state==='paused'){state=beforePause;$('pausePanel').hidden=true;}else if(state==='race'||state==='countdown'){beforePause=state;state='paused';keys.clear();$('pausePanel').hidden=false;stopVoice();}if(engine)engine.g.gain.value=soundOn&&state==='race'?.011:0;}
function use(){if(state!=='race')return;useItem(racers[0]);}
function useItem(r){if(r.itemPending)return null;const prevStun=racers.map(x=>x.stun),res=activate(r,racers);if(!res)return null;const me=r.id===0;
 if(res.type==='shell'&&res.target!==undefined)racers[res.target].stun=prevStun[res.target];
 if(me&&(res.type==='boost'||res.type==='triple'))SFX.boost();else if(me&&SFX[res.type])SFX[res.type]();
 if(res.type==='banana')dropBanana(r);if(res.type==='shell')fireShell(r,res.target);if(res.type==='bomb')throwBomb(r);
 if(me){if(res.type==='boost'||res.type==='triple')say('turbo');if(res.type==='shield')say('shield');if(res.type==='banana')say('banana');notice({boost:'TURBO!',triple:'TURBO ×'+(res.charges||0),shield:'STERNENSCHILD',banana:'BANANE!',shell:'SUCH-PANZER!',bomb:'PILZBOMBE!'}[res.type],.8);}
 return res;}
const MAX_HAZARDS=14;
function dropBanana(r){if(hazards.length>=MAX_HAZARDS){const old=hazards.shift();actors.remove(old.mesh);}const x=r.x-Math.sin(r.h)*3.2,z=r.z-Math.cos(r.h)*3.2,g=new T.Group();actors.add(g);g.position.set(x,r.y,z);g.rotation.y=Math.random()*TAU;if(P.banana){const b=cloneProto(P.banana);b.scale.setScalar(1.6);g.add(b);}else mesh(new T.ConeGeometry(.6,1.3,5),gold,g,0,.7,0);hazards.push({mesh:g,x,z,y:r.y,life:25,owner:r.id,arm:.4});}
function fireShell(r,target){const g=new T.Group();if(P.shell){const s=cloneProto(P.shell);s.scale.setScalar(1.25);g.add(s);}else sphere(g,mat(0x5cc46a),0,.4,0,.55,.4,.55);actors.add(g);shots.push({g,d:r.distance+2.5,off:r.offset,owner:r.id,target,t:0});}
function hitSpores(r){const lost=loseSpores(r);if(lost){const p=r.mesh.position;for(let i=0;i<lost*3;i++){const a=Math.random()*TAU;emit(p.x,p.y+.8,p.z,0xfff27a,Math.sin(a)*5,4+Math.random()*3,Math.cos(a)*5,.9);}}return lost;}
function shellImpact(sh){const t=racers[sh.target],me=sh.owner===0,onMe=sh.target===0,near=nearPlayer(t,60);
 if(t.shield>0){burst(t,0xffe263,14);if(onMe)toast('ABGEWEHRT!',.9,'good');if(near)SFX.shield();return;}
 if(t.finishTime===null){hitKart(t,1.6,.25);hitSpores(t);}burst(t,0x8beb73,18);if(me||onMe||near)SFX.hit(me||onMe?1:.5);
 if(me){stats.hitsDealt++;say('hit');toast('VOLLTREFFER!',1,'good');}if(onMe){stats.hitsTaken++;say('ouch');toast('AUTSCH! −✦',1,'bad');shake=.45;}}
// Bombe fliegt im Bogen voraus, landet, zischt kurz und explodiert (oder sofort bei Kontakt). Druckwelle schleudert Karts hoch.
let bombs=[];const bombGeo=new T.SphereGeometry(.62,16,12),fuseGeo=new T.CylinderGeometry(.06,.06,.45,6),bombMat=new T.MeshStandardMaterial({color:0x2a2238,roughness:.35,metalness:.2}),bombCap=new T.MeshStandardMaterial({color:0xff3b30,roughness:.5}),sparkBall=new T.MeshBasicMaterial({color:0xffe066});
const shockGeo=new T.TorusGeometry(1,.16,6,40),shocks=[0,1,2,3].map(()=>{const m=new T.Mesh(shockGeo,new T.MeshBasicMaterial({color:0xffb347,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);persistentMats.add(m.material);return {m,t:9};});
[bombMat,bombCap,sparkBall].forEach(m=>persistentMats.add(m));[bombGeo,fuseGeo,shockGeo].forEach(g=>sharedGeo.add(g));let shockIdx=0;
function bombMesh(){const g=new T.Group(),b=new T.Mesh(bombGeo,bombMat);b.castShadow=true;g.add(b);const cap=new T.Mesh(new T.SphereGeometry(.64,16,8,0,TAU,0,Math.PI*.33),bombCap);g.add(cap);const f=new T.Mesh(fuseGeo,bombMat);f.position.y=.75;g.add(f);const s=new T.Mesh(new T.SphereGeometry(.14,8,6),sparkBall);s.position.y=1;g.add(s);g.userData.spark=s;return g;}
function throwBomb(r){const g=bombMesh();actors.add(g);bombs.push({g,d:r.distance+2,off:r.offset,y:(r.y||0)+1.2,vy:11,fwd:Math.max(r.speed,18)+16,landed:false,fuse:1.1,owner:r.id,t:0});if(r.id===0)SFX.whoosh();}
function explode(b){const p=b.g.position,pl=racers[0],dist=Math.hypot(pl.x-p.x,pl.z-p.z);
 for(let i=0;i<46;i++){const a=Math.random()*TAU,sp=6+Math.random()*9;emit(p.x,p.y+.5,p.z,[0xffb347,0xffe066,0xff5a36,0x8a8494][i%4],Math.sin(a)*sp,3+Math.random()*8,Math.cos(a)*sp,.5+Math.random()*.5);}
 const sh=shocks[shockIdx++%shocks.length];sh.t=0;sh.m.position.set(p.x,p.y+.4,p.z);sh.m.visible=true;
 for(const r of racers){if(r.finishTime!==null)continue;if(Math.abs((r.y||0)-p.y)>4)continue;const res=blastHit(r,r.x-p.x,r.z-p.z);if(!res)continue;if(res==='blocked'){burst(r,0xffe263,12);continue;}hitSpores(r);resetGlider(r);r.air=true;r.airT=0;r.vy=9;r.y=(r.y||0)+.2;burst(r,0xffb347,14);
  if(r.id===0){stats.hitsTaken++;say('ouch');toast('BUMM! 💥',1.1,'bad');}else if(b.owner===0){stats.hitsDealt++;}}
 if(b.owner===0&&racers.some(r=>r.id!==0&&r.stun>=1.2))say('hit');
 if(dist<90){SFX.boom(clamp(1-dist/90,.15,1));shake=Math.max(shake,clamp(.6-dist/60,0,.6));}}
function updateBombs(dt){for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.t+=dt;
  if(!b.landed){b.d+=b.fwd*dt;b.vy-=G*dt;b.y+=b.vy*dt;const gy=groundAt(b.d,b.off).y;if(b.y<=gy+.62&&b.vy<0){b.y=gy+.62;b.landed=true;if(nearPlayer({distance:b.d},60))SFX.land(.5);}}
  else{b.fuse-=dt;const hitNow=racers.some(r=>r.id!==b.owner||b.t>1.4?Math.hypot(r.x-b.g.position.x,r.z-b.g.position.z)<2.2&&Math.abs((r.y||0)-b.g.position.y)<2.5:false);if(b.fuse<=0||hitNow){explode(b);actors.remove(b.g);bombs.splice(i,1);continue;}}
  const s=samplePos(b.d,b.off,_sp);b.g.position.set(s.x,b.landed?b.y:b.y,s.z);b.g.rotation.y+=dt*(b.landed?2:9);const blink=b.landed&&Math.sin(b.t*(10+(1.1-b.fuse)*30))>0;b.g.userData.spark.scale.setScalar(blink?1.8:1);b.g.scale.setScalar(b.landed?1+Math.max(0,.3-b.fuse)*.8:1);}
 for(const sh of shocks){if(sh.t>=.5){if(sh.m.visible)sh.m.visible=false;continue;}sh.t+=dt;const k=sh.t/.5;sh.m.scale.setScalar(1+k*9);sh.m.material.opacity=Math.max(0,1-k);}}
function updateShots(dt){for(let i=shots.length-1;i>=0;i--){const sh=shots[i];sh.t+=dt;const tg=sh.target!==undefined?racers[sh.target]:null;sh.d+=((tg?Math.max(tg.speed,0):Math.max(racers[sh.owner].speed,20))+24)*dt;if(tg)sh.off+=(tg.offset-sh.off)*Math.min(1,dt*5);const s=samplePos(sh.d,sh.off,_sp);sh.g.position.set(s.x,s.y+.15+Math.abs(Math.sin(sh.t*18))*.18,s.z);sh.g.rotation.y+=dt*16;
  if((tg&&sh.d>=tg.distance-1.2)||(!tg&&sh.t>1.2)||sh.t>4.5){if(tg)shellImpact(sh);else burst({mesh:sh.g},0x8beb73,8);actors.remove(sh.g);shots.splice(i,1);}}}

function update(dt){
 // Feuerwerk vom Zieleinlauf abarbeiten (laeuft auch im Result-Schirm weiter)
 for(const f of fworks)if(!f.done&&elapsed>=f.at){f.done=1;try{const p=posAt(0,f.off,f.h,new T.Vector3());burstAt(p.x,p.y,p.z,f.col);}catch(e){}}
 if(state==='ceremony'){updateCeremony(dt);return;}
 if(state!=='race'&&state!=='countdown')return;
 const player=racers[0],gasHeld=held('ArrowUp')||held('KeyW');
 if(state==='countdown'){if(!worldReady){setText('message','');return;}const prev=Math.ceil(countdown);countdown-=dt;if(gasHeld){if(startPress<0)startPress=countdown;}else startPress=-1;
  if(Math.ceil(countdown)!==prev)SFX.count(countdown<=0);setLights(countdown>2?1:countdown>1?2:countdown>0?3:4);setText('message',countdown>0?String(Math.ceil(countdown)):'LOS!');
  if(engine&&ctx){const t=ctx.currentTime;engine.o1.frequency.setTargetAtTime(gasHeld?170:60,t,.08);engine.o2.frequency.setTargetAtTime(gasHeld?85:30,t,.08);engine.f.frequency.setTargetAtTime(gasHeld?1500:500,t,.1);engine.g.gain.setTargetAtTime(soundOn?.008:0,t,.1);}
  if(countdown<=0){state='race';notice('LOS!',.8);stats.lapStart=0;if(isTT()){player.item='triple';player.charges=3;}
   const fx=Math.sin(player.h),fz=Math.cos(player.h);
   if(gasHeld&&startPress>0&&startPress<=1.0){player.boost=Math.max(player.boost,1.5);player.vx=fx*16;player.vz=fz*16;SFX.rocket();say('rocket');toast('RAKETENSTART!',1.2,'good');burst(player,0xffa53d,20);}
   else if(gasHeld&&startPress>=2.2){player.stall=1.1;say('early');toast('ZU FRÜH! Motor abgewürgt',1.4,'bad');}
   for(const r of racers)if(r.id&&Math.random()<CLASSES[cc].skill*.6){r.boost=.9;}}
  for(const r of racers)syncKart(r,dt);syncKartInstances();return;}
 elapsed+=dt;updateSwingers();setLights(elapsed<2.5?4:0);recordGhost(player);updateGhost();
 const order=ranking(racers),placeOf=r=>order.indexOf(r)+1,driftKey=held('ShiftLeft')||held('ShiftRight');
 if(!autopilot&&driftKey&&!prevDrift&&player.air&&player.airT>.06&&!player.trick)startTrick(player);prevDrift=driftKey;
 if(roulette){roulette.t-=dt;roulette.tick-=dt;if(roulette.tick<=0){roulette.tick=.075;SFX.tick();}if(roulette.t<=0){player.item=roulette.final;player.charges=player.item==='triple'?3:0;player.itemPending=false;SFX.pickup();toast(ITEM_NAMES[player.item]+'!',.9);roulette=null;}}
 const cls=CLASSES[cc];
 for(const r of racers){if(r.finishTime!==null){r.vx*=.98;r.vz*=.98;r.x+=r.vx*dt;r.z+=r.vz*dt;syncKart(r,dt);continue;}const me=r.id===0;
  r.stall=Math.max(0,(r.stall||0)-dt);r.padCd=Math.max(0,(r.padCd||0)-dt);r.ringCd=Math.max(0,(r.ringCd||0)-dt);
  let input;
  if(me&&!autopilot){const target=steering(),rate=(Math.sign(target)!==Math.sign(r.steerS||0)&&target!==0)?11:7;r.steerS=(r.steerS||0)+clamp(target-(r.steerS||0),-dt*rate,dt*rate);input={gas:(autoGas||gasHeld)&&r.stall<=0,brake:held('ArrowDown')||held('KeyS'),steer:r.steerS,drift:driftKey};}
  else{input=aiInput(r,dt);r.steerS=(r.steerS||0)+(input.steer-(r.steerS||0))*Math.min(1,dt*8);}
  // Steckenbleib-Schutz: wer mit Gas laenger als 1,6 s fast steht, wird auf die Strecke gesetzt
  if(state==='race'&&r.stun<=0&&r.stall<=0&&input.gas&&Math.abs(r.speed)<2.5){r.slowT=(r.slowT||0)+dt;
   if(r.slowT>1.6){r.slowT=0;respawn(r);if(me)toast('ZURÜCK AUF DIE STRECKE',1.2);}}
  else r.slowT=0;
  if(!me)aiItems(r,order);
  // In einer Rollzone schwebt die Bahn - daneben ist kein Gelaende, sondern nichts. Die
  // Offroad-Bremse (Hoechsttempo 12,5) gehoert dort nicht hin; seitlich haelt die Fuehrung.
  const inRoll=(agrav.length||loops.length)&&hasRoll(r.distance);
  // Durchgaengige Turbo-Streifen: das Energieband der Rollzone schiebt permanent an -
  // der Schwung bleibt oben, niemand schleppt sich durch die Spirale (Nutzerwunsch).
  if(inRoll&&!r.air&&Math.abs(r.speed)>5)r.boost=Math.max(r.boost,.55);
  // Magnetfeld-Spuren: Funken unterm Kart zeigen, dass die Bahn traegt (sparsam, nur beim Spieler-Umfeld)
  if(inRoll&&!r.air&&frame%2===0&&nearPlayer(r,60)){const p=r.mesh.position;
   emit(p.x+(Math.random()-.5)*1.6,p.y+.15,p.z+(Math.random()-.5)*1.6,theme.glow?0x7cf3ff:0x59d7ff,(Math.random()-.5)*2.5,-1.5-Math.random()*2.5,(Math.random()-.5)*2.5,.4);}
  // Saubere Spirale: wer die Rollzone auf der Linie durchfaehrt (nie an die Magnetbande),
  // kriegt beim Austritt einen Mini-Turbo - belohnt Fahren statt Anecken.
  if(inRoll){if(!r.inAgPrev)r.agMax=0;r.agMax=Math.max(r.agMax||0,Math.abs(r.offset));}
  else if(r.inAgPrev&&r.finishTime===null&&(r.agMax||9)<5.5&&Math.abs(r.speed)>15){r.boost=Math.max(r.boost,.8);
   if(me){toast('SAUBERE SPIRALE!',1,'good');SFX.whoosh();}}
  r.inAgPrev=inRoll;
  if(me)SFX.hum(inRoll);
  const offroad=!r.air&&!onRoad(r.distance,r.offset)&&!inGap(r.distance)&&!inRoll;if(TEST){r.tOff=(r.tOff||0)+(offroad?dt:0);r.tAll=(r.tAll||0)+dt;}
  const s=trackAt(r.distance),tan=tanAt(r.distance),dot=Math.sin(r.h)*tan.x+Math.cos(r.h)*tan.z;
  // Mildes Gummiband: Rivalen weit vorn werden minimal langsamer, weit hinten minimal schneller (Sieg bleibt verdient)
  const rubber=me?1:1+clamp((player.distance-r.distance)/400,-1,1)*cls.rubber,speedMul=me?1:cls.ai*(.96+.04*r.skill)*rubber;
  const oldLap=lap(r,length),oldBoost=r.boost;
  // Im Looping wird der Vorschub auf der Fahrbahn gebremst, damit das Bild in normalem Tempo
  // durch den Kreis laeuft. Gefahren wird geradeaus, also braucht es keinen Extra-Grip.
  const lp=loops.length?loopAt(r.distance):null;
  // In Rollzonen uebernimmt die Magnetbahn den Hoehenweg: Hang-Widerstand faellt weg, sonst
  // fehlt genau dort der Schwung, wo die Strecke zusaetzlich noch kippt.
  driveKart(r,dt,input,{air:r.air,offroad,slope:inRoll?0:slopeAt(r.distance)*dot,speedMul,gripMul:lp?1.5:inRoll?2.3:1,moveMul:lp?1/loopStretch(lp,loopFrame(lp,r.distance)):1});
  r.braking=!!input.brake&&r.speed>1.5&&!r.air;
  if(me&&r.driftDir&&!r.prevDrift)SFX.drift();
  r.prevDrift=!!r.driftDir;
  collideStatic(r);
  // Kart haengt fest (Hindernis, Wand, Spirale): nach kurzer Zeit per Rettungspilz zurueck auf die
  // Strecke. Seit R26 auch fuer den Spieler - wer in einer Spirale oder an Deko festhaengt und
  // trotz Gas nicht vorankommt, kommt ohne Handarbeit (Taste R) frei. Laengerer Limit und erst
  // nach dem Countdown, damit der Raketenstart (Gas halten bei Tempo 0) nichts faelschlich loest.
  const stuckLimit=me?2.6:1.6;
  if(elapsed>4&&input.gas&&!r.air&&Math.abs(r.speed)<3&&r.stun<=0){r.stuckT=(r.stuckT||0)+dt;if(r.stuckT>stuckLimit){r.stuckT=0;respawn(r);}}else r.stuckT=0;
  let pr=project(r.x,r.z,r.distance),skipped=false;
  // Weit neben der lokalen Projektion (Kurve abgeschnitten): global neu zuordnen; grosse Abkuerzungen setzen zurueck.
  if(Math.abs(pr.off)>14&&!forkBand(pr.d,pr.off,4)&&!nearLoop(r.distance)){const g2=project(r.x,r.z,projectGlobal(r.x,r.z,r.y||0));if(Math.abs(g2.off)<9){const jump=wrapDiff(g2.d,lapDist(r.distance));if(jump>60){respawn(r);if(me)toast('ABKÜRZUNG ZÄHLT NICHT!',1.6,'bad');skipped=true;}else{r.distance+=jump;pr=g2;}}}
  if(!skipped){advanceProgress(r,pr.d,length);r.offset=pr.off;railCollide(r,me);
   // Anti-Grav-Seitenmagnet: in Rollzonen stehen keine Leitplanken – die Magnetbahn haelt das Kart
   // seitlich fest (wie vertikal). Weicher exponentieller Pull statt hartem Snap: kein Ruck im Bild,
   // denn bei ~90 Grad Roll wird seitliche Korrektur als vertikale Bewegung sichtbar.
   // Im Looping wird gefuehrt: seitlich sanft zur Mitte gezogen und die Fahrtrichtung nachgefuehrt.
   // Ohne das traegt die Fliehkraft in der engen Kreisbahn jedes Kart an den Rand (Arcade-Konvention).
   // Fuehrung in Looping und Spiralen: wirkt wie Seitenhaftung, nicht wie eine Wand.
   // Innerhalb des freien Bands (+-6 m) bleibt das Lenken voellig frei; darueber hinaus zieht es
   // zunehmend zurueck, und zwar ueber die Geschwindigkeit statt ueber die Position - ein
   // Positions-Snap fuehlt sich beim Fahren wie Verkanten an.
   if(inRoll){const tn=tanAt(r.distance),free=lp?6.2:rollFree(r.distance,3.2),ao=Math.abs(r.offset),ex=ao-free;
    const sg=Math.sign(r.offset)||1,ox=tn.z*sg,oz=-tn.x*sg,vn=r.vx*ox+r.vz*oz;
    if(ex>0){
     // Haltekraft waechst mit dem Abstand: im freien Band nur der sanfte Grundzug (siehe unten),
     // weiter aussen wie ein Magnet. Mit fester Staerke war sie schwaecher als die Querbewegung
     // beim Lenken - dann faellt man raus.
     if(vn>0){const sp0=Math.hypot(r.vx,r.vz),kk=1-Math.exp(-dt*(3.5+ex*2.2));
      r.vx-=ox*vn*kk;r.vz-=oz*vn*kk;
      // Betrag erhalten: Daempfen kostet Schwung und fuehlt sich wie Anecken an
      const sp1=Math.hypot(r.vx,r.vz);if(sp1>.01&&sp0>.01){const f=sp0/sp1;r.vx*=f;r.vz*=f;}}
     const pull=Math.min(ex,dt*(2.5+ex*3.4));
     r.x-=ox*pull;r.z-=oz*pull;r.offset=sg*(Math.abs(r.offset)-pull);
     // Harte Grenze an der sichtbaren Energiewand (8.75): bis knapp davor haengen, aber nie
     // durch sie durch - und immer noch auf der Fahrbahn (onRoad greift unter 8.6).
     const cap=Math.min(free+6,8.45),ab=Math.abs(r.offset);
     if(ab>cap){const back=ab-cap;r.x-=ox*back;r.z-=oz*back;r.offset=sg*cap;}
     // Fahrtrichtung zurueckfuehren, je weiter aussen desto deutlicher
     r.h+=angleDiff(Math.atan2(tn.x,tn.z),r.h)*Math.min(1,dt*(1.0+ex*.9));}
    else{
     // Durchgaengige Bahnmagnetik (R27): auch innerhalb des freien Bands haelt die Bahn das
     // Kart wie auf Schienen. Vorher gab es dort keine Fuehrung - in Spiralen sackte das Kart
     // seitlich weg und klebte an der Leitplanke (Neon-Korkenzieher, Voll-Lenkung: Sitzt bei
     // 8,4 m Versatz bis die Zone endet). Zwei Kraefte: die Abdrift nach aussen wird weich auf
     // ~3,2 m/s begrenzt (bewusstes Ausscheren bleibt moeglich, Durchsacken nicht), und ein
     // proportionaler Zug zur Mitte. Auf der Ideallinie (unter 0,4 m) bleibt alles unberuehrt.
     if(!lp&&ao>.4){const g=Math.min(ao/free,1),vcap=3.2+g*1.6;
      // Harter Cap der Aussen-Komponente pro Frame (Schiene): weiche Daempfung verlor gegen
      // die staendig erneuerte Lenkrate - Voll-Lenkung drueckte trotzdem bis zur Bande durch.
      if(vn>vcap){const exv=vn-vcap,sp0=Math.hypot(r.vx,r.vz);
       r.vx-=ox*exv;r.vz-=oz*exv;
       const sp1=Math.hypot(r.vx,r.vz);if(sp1>.01&&sp0>.01){const f=sp0/sp1;r.vx*=f;r.vz*=f;}}
      const pull=Math.min(ao*.5,dt*(2.2+g*2.6));
      r.x-=ox*pull;r.z-=oz*pull;r.offset=sg*(ao-pull);
      // Winkel-Klemme: maximal ~20 Grad schraeg zur Bahn. Die Lenkrate einer Rollzone
      // (Grip 2,3) schlaegt jede weiche Nachfuehrung - ohne Klemme stand das Kart quer zur
      // Spirale und sackte durch die Kurve bis zur Leitplanke durch. 0.35 rad Slip bleiben
      // deutlich spuerbare Linienwahl, die Bahn fuehrt.
      const th=Math.atan2(tn.x,tn.z),dh=angleDiff(r.h,th);
      if(Math.abs(dh)>.35)r.h=th+Math.sign(dh)*.35;}
     if(lp)r.h+=angleDiff(Math.atan2(tn.x,tn.z),r.h)*(1-Math.exp(-dt*1.4));}}}
  vertical(r,dt);
  if(!r.air&&!inRoll&&Math.abs(r.offset)<ROAD_HALF&&!r.rampY){const toGap=gaps.find(g=>{const a=wrapDiff(g.start,r.distance);return a>0&&a<95;});if(!toGap)r.safeD=lapDist(r.distance);}
  if(r.lastMT){r.mts=(r.mts||0)+(r.lastMT==='ultra'?100:r.lastMT==='super'?10:1);if(me){stats.mt[r.lastMT]++;SFX.mt(r.lastMT);const combo=comboStep(r,elapsed);if(combo>=2){stats.maxCombo=Math.max(stats.maxCombo||0,combo);if(r.spores<MAX_SPORES)r.spores++;SFX.combo(combo);toast(`${MT_LABEL[r.lastMT]} · COMBO ×${combo}`,1,'mt-'+r.lastMT);}else toast(MT_LABEL[r.lastMT]+'!',.8,'mt-'+r.lastMT);const p=r.mesh.position;for(let i=0;i<14;i++){const a=Math.random()*TAU;emit(p.x,p.y+.4,p.z,MT_COLORS[r.lastMT],Math.sin(a)*3-Math.sin(r.h)*6,1+Math.random()*2,Math.cos(a)*3-Math.cos(r.h)*6,.5);}}r.lastMT=null;}
  // Windschatten: dicht hinter einem Kart bleiben laedt einen Boost
  if(!r.air&&r.speed>17&&r.boost<=0){const sh=Math.sin(r.h),ch=Math.cos(r.h);let draft=false;for(const o of racers){if(o===r)continue;const dx=o.x-r.x,dz=o.z-r.z,f=dx*sh+dz*ch,lat=Math.abs(dx*ch-dz*sh);if(f>2.5&&f<15&&lat<1.9){draft=true;break;}}
   r.draft=draft?(r.draft||0)+dt:Math.max(0,(r.draft||0)-dt*2);if(me&&draft&&frame%3===0)for(const s of [-1,1])emit(r.x+ch*s*1.3+sh*2,r.y+1.1,r.z-sh*s*1.3+ch*2,0xe8f6ff,-sh*16,0,-ch*16,.22);
   if(r.draft>1.3){r.draft=0;r.boost=Math.max(r.boost,1);if(me){stats.drafts++;SFX.whoosh();toast('WINDSCHATTEN-BOOST!',.9,'good');}}}else if(r.air)r.draft=0;
  // In Rollzonen zaehlt ein breiteres Band, sonst verfehlt man den Streifen beim Drehen
  if(!r.air){const pw=inRoll?7.4:5.6,pl=inRoll?3.7:2.4;
   for(const d of boostPads)if(Math.abs(wrapDiff(r.distance,d))<pl&&Math.abs(r.offset)<pw)r.boost=Math.max(r.boost,1);}
  if(me&&r.boost>oldBoost&&oldBoost===0)SFX.boost();
  if(me&&r.stall>0&&frame%5===0)dropPuff(r);
  for(const pad of pads)if(!r.air&&r.padCd<=0&&Math.abs(wrapDiff(r.distance,pad.d))<1.9&&Math.abs(r.offset-pad.off)<2){armGlider(r,'bounce');r.air=true;r.airT=0;r.vy=11+Math.max(0,r.speed)*.1;r.y+=.1;r.boost=Math.max(r.boost,.5);r.padCd=.6;pad.squash=.45;if(nearPlayer(r,50))SFX.boing(me?1:.4);}
  // Magnet-Ringe (ag) nehmen auch gebunden mit: in der Rollzone haelt die Bahn die Hoehe,
  // deshalb prueft der Luft-Filter dort nicht, nur Streckenmeter und Linie.
  for(const ring of rings)if(r.ringCd<=0&&(ring.ag?inRoll:r.air)&&Math.abs(wrapDiff(r.distance,ring.d))<2.2&&Math.abs(r.offset-ring.off)<3.4&&(ring.ag||Math.abs(r.y+.9-ring.y)<2.9)){r.boost=Math.max(r.boost,1.3);r.ringCd=.8;ring.flash=.5;if(me){stats.rings++;SFX.ring();toast('RING-BOOST!',.8,'good');burst(r,ring.ag?0x59d7ff:0xffd45c,16);}}
  for(const sp of spores)if(sp.cd<=0&&Math.abs(wrapDiff(r.distance,sp.d))<1.8&&Math.abs(r.offset-sp.off)<1.8&&Math.abs(r.y+.8-sp.y)<2.3){sp.cd=10;if(r.spores<MAX_SPORES){r.spores++;if(me){stats.maxSpores=Math.max(stats.maxSpores,r.spores);SFX.spore(r.spores);if(r.spores===MAX_SPORES){say('spores');toast('VOLLE SPOREN-POWER!',1.2,'good');}}}}
  if(!isTT())for(const b of boxes){if(b.cooldown<=0&&!r.item&&!r.itemPending&&Math.abs(wrapDiff(r.distance,b.distance))<2.6&&Math.abs(r.offset-b.offset)<2.2&&Math.abs(r.y+1-b.baseY)<3){b.cooldown=4;if(me){r.itemPending=true;roulette={t:.95,tick:0,final:rollItem(placeOf(r),racers.length)};}else{r.item=rollItem(placeOf(r),racers.length);r.charges=r.item==='triple'?3:0;r.cooldown=1+Math.random()*2;}}}
  if(me&&lap(r,length)>oldLap){const lt=elapsed-stats.lapStart,best=lt<stats.bestLap;stats.bestLap=Math.min(stats.bestLap,lt);stats.lapStart=elapsed;const isLast=lap(r,length)===LAPS;
   toast(`RUNDE ${oldLap}: ${format(lt)}${best&&oldLap>1?' · BESTE RUNDE!':''}`,2,best&&oldLap>1?'good':'');notice(isLast?'LETZTE RUNDE!':'RUNDE 2',1.5);say(isLast?'lastlap':'lap2');if(isLast){if(!playClip('s_finallap',sfxGain,.9))SFX.lap();setBgmRate((course.bgmRate||1)*1.07);}else SFX.lap();}
  if(finish(r,length,elapsed)&&me){const lt=elapsed-stats.lapStart;stats.bestLap=Math.min(stats.bestLap,lt);planFireworks();}
  syncKart(r,dt);
  // Drift-Funken je Ladestufe (blau/orange/lila) an den Hinterraedern, Reifenspuren beim Rutschen
  const sx=Math.sin(r.h),cz=Math.cos(r.h);
  if(r.driftDir&&!r.air&&frame%2===0&&nearPlayer(r,90)){const lvl=r.drift>=2.3?'ultra':r.drift>=1.4?'super':r.drift>=.7?'mini':null;if(lvl)for(const side of [-1,1])emit(r.x-sx*1.3+cz*side*.9,r.y+.25,r.z-cz*1.3-sx*side*.9,MT_COLORS[lvl],-sx*3+(Math.random()-.5)*3,1.5+Math.random()*2,-cz*3+(Math.random()-.5)*3,.3);}
  if(!r.air&&(r.driftDir||Math.abs(r.slide)>2.2)&&Math.abs(r.speed)>8&&frame%3===0&&nearPlayer(r,70))for(const side of [-1,1])dropSkid(r.x-sx*.9+cz*side*.85,r.y,r.z-cz*.9-sx*side*.85,r.h);
  if(me&&offroad&&r.combo){if(r.combo>=2)toast('COMBO WEG',.7,'bad');r.combo=0;}
 // Ueberkopf: kopfueber zieht das Kart eine Funkenspur
 {const lq3=loops.length?loopAt(r.distance):null;
  const upDot=lq3?loopFrame(lq3,r.distance).nu:agrav.length?Math.cos(rollAt(r.distance)):1;
  if(upDot<-.4){if(!r.ovh){r.ovh=1;if(me)toast('ÜBERKOPF!',1,'good');}
   if(frame%2===0&&nearPlayer(r,90)){const pm=r.mesh.position;
    emit(pm.x,pm.y+.2,pm.z,0x8fe8ff,(Math.random()-.5)*5,(Math.random()-.5)*5,(Math.random()-.5)*5,.4);}}
  else r.ovh=0;}
 // Looping sauber durchfahren gibt Schwung mit heraus
 if(loops.length){const inLp=!!loopAt(r.distance);
  if(inLp)r.lpT=(r.lpT||0)+dt;
  else if(r.lpT>1.5){r.lpT=0;r.boost=Math.max(r.boost,1.15);
   if(me){SFX.boost();toast('LOOPING-SCHWUNG!',1.2,'good');stats.boosts=(stats.boosts||0)+1;}}
  else r.lpT=0;}
 // Anti-Grav sauber durchfahren gibt Schwung mit heraus
 if(agrav.length){const inAg=hasRoll(r.distance);
  if(inAg){r.agT=(r.agT||0)+dt;if(offroad)r.agBad=1;}
  else if(r.agT>.4){const clean=!r.agBad;r.agT=0;r.agBad=0;
   if(clean){r.boost=Math.max(r.boost,.85);if(me){SFX.boost();toast('ANTI-GRAV-SCHUB!',1,'good');stats.boosts=(stats.boosts||0)+1;}}}
  else{r.agT=0;r.agBad=0;}}
  if(me&&offroad&&Math.abs(r.speed)>6&&frame%4===0)dropPuff(r,course.theme==='canyon'?0xe0a070:0xb7d59a);
  if(r.boost>0&&frame%3===0&&nearPlayer(r,80))emit(r.x-sx*1.8,r.y+.6,r.z-cz*1.8,0xffc04a,-sx*5,.5,-cz*5,.25);
  for(const s of swingers){if(s.kind!=='ghost'||(r.spookCd||0)>elapsed)continue;const dx=r.x-s.x,dz=r.z-s.z;if(dx*dx+dz*dz<5.3&&Math.abs(r.y+.8-s.y)<2.3){r.spookCd=elapsed+1.5;if(r.shield>0){burst(r,0xffe263,10);continue;}hitKart(r,.8,.6);loseSpores(r,1);burst(r,0xb48cff,16);if(me){stats.hitsTaken++;SFX.spook();toast('BUUUH! 👻',1.1,'bad');shake=.3;}else if(nearPlayer(r,40))SFX.spook(.4);}}
  // Bananen treffen jeden (auch den Leger nach kurzer Schonzeit), nicht in der Luft; Schild zerstoert sie.
  for(const h of hazards){if(h.life<=0||r.air||(h.owner===r.id&&h.arm>0))continue;const dx=r.x-h.x,dz=r.z-h.z;if(dx*dx+dz*dz<2.2&&Math.abs((r.y||0)-h.y)<2){h.life=0;if(r.shield>0){burst(r,0xffe263,10);continue;}hitKart(r,me?1.1:1.4,.45);hitSpores(r);burst(r,0xffd23f,12);if(me){stats.hitsTaken++;SFX.slip();say('ouch');toast('AUSGERUTSCHT!',1,'bad');shake=.35;}else{if(h.owner===0)stats.hitsDealt++;if(nearPlayer(r,45))SFX.slip(h.owner===0?.8:.4);}}}
 }
 // Kart-Kollisionen (Rempeln)
 for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){const a=racers[i],b=racers[j];if(Math.abs(a.x-b.x)>3||Math.abs(a.z-b.z)>3||Math.abs(a.y-b.y)>1.2)continue;
  // an Kreuzungen (Looping, Acht) liegen zwei Streckenteile uebereinander: dort nicht rempeln
  // Im Looping stecken in einem Fahrbahnmeter mehrere Bildmeter: zwei Karts, die im Bild weit
  // auseinander sind, liegen auf der Fahrbahn dicht beieinander und duerfen sich nicht rempeln.
  const lq2=loops.length&&(loopAt(a.distance)||loopAt(b.distance));
  if(Math.abs(wrapDiff(lapDist(a.distance),lapDist(b.distance)))>(lq2?14/(lq2.sig+1):14))continue;
  const rel=Math.hypot(a.vx-b.vx,a.vz-b.vz);if(collideKarts(a,b)&&(a.id===0||b.id===0)&&rel>6){SFX.bump(clamp(rel/25,.2,.8));shake=Math.max(shake,.15);}}
 updateShots(dt);updateBombs(dt);
 const newOrder=ranking(racers),place=newOrder.indexOf(player)+1;
 if(place<lastPlace&&elapsed>2){stats.overtakes+=lastPlace-place;SFX.overtake();toast(`▲ PLATZ ${place}`,.9,'good');}
 if(place===1&&lastPlace>1&&elapsed>8&&elapsed-leadAt>15){leadAt=elapsed;say('lead');}lastPlace=place;
 // Falsche Richtung
 const tan=tanAt(player.distance),fdot=Math.sin(player.h)*tan.x+Math.cos(player.h)*tan.z;wrongT=fdot<-.35&&Math.abs(player.speed)>4?wrongT+dt:0;if(wrongT>1&&noticeTimer<=0){notice('FALSCHE RICHTUNG ↺',1);SFX.wrong();}
 if(engine&&ctx){const t=ctx.currentTime,sp=Math.abs(player.speed);engine.o1.frequency.setTargetAtTime(55+sp*5.2+(player.air?50:0)+(player.boost>0?30:0),t,.06);engine.o2.frequency.setTargetAtTime(28+sp*2.6,t,.06);engine.f.frequency.setTargetAtTime(480+sp*36,t,.08);engine.g.gain.setTargetAtTime(soundOn?.011:0,t,.09);engine.noise.gain.setTargetAtTime(soundOn&&(player.driftDir||Math.abs(player.slide)>2.5)&&sp>8&&!player.air?.045:0,t,.07);engine.bp.frequency.setTargetAtTime(player.driftDir?1100+player.drift*260:900,t,.1);if(raceFilter)raceFilter.frequency.setTargetAtTime(3000+sp*430,t,.18);}
 syncKartInstances();if(player.finishTime!==null)end();}

function end(){elapsed=racers[0].finishTime??elapsed;if(isTT())return endTT();state='finished';keys.clear();roulette=null;SFX.hum(false);burst(racers[0],0xffd452,26);burst(racers[0],0xed6350,16);burst(racers[0],0x55bdb2,16);
 $('result').hidden=false;$('touch').hidden=true;const order=ranking(racers),place=order.indexOf(racers[0])+1,board=$('leaderboard'),rs=raceStars(place,stats.hitsTaken);
 $('resultTitle').textContent=place===1?(rs.perfect?'Perfektes Rennen!':'Der Pokal gehört dir!'):place<=3?`Platz ${place} – aufs Treppchen!`:`Platz ${place}. Da geht noch was!`;
 $('resultTime').textContent=`${course.name} · ${cc}cc · ${format(elapsed)}`;
 $('resultStars').innerHTML=[0,1,2].map(i=>`<i class="${i<rs.stars?'on':''}">★</i>`).join('')+(rs.perfect?'<b>PERFEKT</b>':'');
 stopVoice();say(place===1?'win':place<=3?'podium':'finish');if(place<=3)SFX.cheer();board.replaceChildren();
 // Statistik: macht sichtbar, womit man das Rennen gewonnen (oder verloren) hat
 const bestKey=`bestlap-${selected}`,oldBestLap=store.get(bestKey,Infinity),newBestLap=stats.bestLap<oldBestLap;if(newBestLap)store.set(bestKey,stats.bestLap);
 const st=[['Beste Runde',format(stats.bestLap)+(newBestLap?' ★ NEU':'')],['Mini-Turbos · beste Combo',`${stats.mt.mini} · ${stats.mt.super} · ${stats.mt.ultra} · ×${stats.maxCombo||0}`],['Tricks · Ringe · Windschatten',`${stats.tricks} · ${stats.rings} · ${stats.drafts}`],['Überholt',stats.overtakes],['Treffer gelandet / kassiert',`${stats.hitsDealt} / ${stats.hitsTaken}`],['Rempler / Stürze',`${stats.bumps} / ${stats.falls}`]];
 $('resultStats').innerHTML=st.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 if(gp.active){const gained={};order.forEach((r,i)=>gained[r.id]=GP_POINTS[i]);addGpPoints(gp.points,order);$('resultEyebrow').textContent=`GRAND PRIX ${cc}cc · RENNEN ${gp.race+1} / ${courses.length}`;
  gpStandings(gp.points,racers.map(r=>r.id)).forEach((id,i)=>{const li=document.createElement('li');if(id===0)li.className='me';li.innerHTML=`<span>${i+1}.</span><span>${racers[id].name}</span><span class="gain">+${gained[id]}</span><span>${gp.points[id]} P</span>`;board.append(li);});
  $('again').textContent=gp.race<courses.length-1?'Nächstes Rennen →':'Zur Siegerehrung 🏆';if(gp.race<courses.length-1)say('gpnext');}
 else{$('resultEyebrow').textContent='ZIEL ERREICHT';$('again').textContent='Nochmal – schneller! ↻';order.forEach((r,i)=>{const li=document.createElement('li');if(r.id===0)li.className='me';li.innerHTML=`<span>${i+1}.</span><span>${r.name}</span><span>${r.finishTime!==null?format(r.finishTime):'noch im Rennen'}</span>`;board.append(li);});}
 if(engine)engine.g.gain.value=0;let wasBest=false;const key=`best-${selected}-${cc}`,old=store.get(key,Infinity);if(elapsed<old&&place<=3){store.set(key,elapsed);wasBest=true;}
 const starKey=`stars-${selected}-${cc}`;if(rs.stars>store.get(starKey,0))store.set(starKey,rs.stars);refreshBest();
 if(wasBest&&!TEST){say('best');burst(racers[0],0xffe16a,36);notice('NEUE BESTZEIT!',2.6);}
 stopBgm();if(!playClip(place<=3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(place<=3?6800:4800);if(!wasBest)setText('message','');}
function endTT(){state='finished';keys.clear();roulette=null;const p=racers[0];$('result').hidden=false;$('touch').hidden=true;if(ghost)ghost.mesh.visible=false;
 const m=medalOf(elapsed),key=`tt-${selected}`,old=store.get(key,Infinity),record=elapsed<old,prevMedal=store.get(`medal-${selected}`,3);
 if(record){store.set(key,elapsed);if(rec&&rec.x.length)store.set(`ghost-${selected}`,{...rec,next:undefined,color:KART_COLORS[colorIndex].c,time:elapsed});}
 if(m<prevMedal)store.set(`medal-${selected}`,m);
 burst(p,m===0?0xffd23f:m===1?0xdfe6ee:m===2?0xd08a4a:0x55bdb2,34);
 $('resultEyebrow').textContent='ZEITFAHREN · '+course.name.toUpperCase();
 $('resultTitle').textContent=m<3?`${['Gold','Silber','Bronze'][m]}-Medaille!`:'Knapp daneben – der Geist wartet!';
 $('resultTime').textContent=`${format(elapsed)}${record?' · NEUER REKORD 👻':isFinite(old)?' · Rekord '+format(old):''}`;
 $('resultStars').innerHTML=[0,1,2].map(i=>`<i class="${i<3-m?'on':''}">★</i>`).join('')+(m<prevMedal&&m<3?'<b>NEUE MEDAILLE</b>':'');
 const st=[['Beste Runde',format(stats.bestLap)],['Mini-Turbos',`${stats.mt.mini} · ${stats.mt.super} · ${stats.mt.ultra}`],['Tricks / Ringe',`${stats.tricks} / ${stats.rings}`],['Rempler / Stürze',`${stats.bumps} / ${stats.falls}`]];
 $('resultStats').innerHTML=st.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 const board=$('leaderboard');board.replaceChildren();course.medals.forEach((t,i)=>{const li=document.createElement('li');if(i===m)li.className='me';li.innerHTML=`<span>${MEDALS[i]}</span><span>${elapsed<=t?'✓ geschafft':'noch '+(elapsed-t).toFixed(1)+' s'}</span><span>${format(t)}</span>`;board.append(li);});
 $('again').textContent=record?'Gegen den neuen Geist ↻':'Nochmal versuchen ↻';refreshBest();
 stopVoice();say(record?'best':'finish');if(m<3)SFX.cheer();if(engine)engine.g.gain.value=0;stopBgm();if(!playClip(m<3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(m<3?6800:4800);setText('message','');}
function nextAfterResult(){if(gp.active){if(gp.race<courses.length-1){gp.race++;start();}else ceremony();}else start();}

// ---------------------------------------------------------------- Grand-Prix-Siegerehrung, Pokale & Freischaltung
function ceremony(){state='ceremony';worldDirty=true;clearGroup(actors);kartInst=null;kartPool=null;bombs=[];hazards=[];shots=[];puffs=[];
 for(const id of ['result','hud','touch','pause'])$(id).hidden=true;document.body.classList.remove('racing');document.body.classList.add('cer');
 const standings=gpStandings(gp.points,racers.map(r=>r.id)),pos=sample(length*.035,-34).p,group=new T.Group();group.position.set(pos.x,0,pos.z);const look=sample(length*.035,0).p;
 world.traverse(o=>{if((o.isGroup||o.isMesh)&&o.parent===world&&!o.isInstancedMesh&&o.position.y<20&&Math.hypot(o.position.x-pos.x,o.position.z-pos.z)<26&&Math.hypot(o.position.x-pos.x,o.position.z-pos.z)>0.5)o.visible=false;});group.rotation.y=Math.atan2(look.x-pos.x,look.z-pos.z);actors.add(group);
 const S=2.2,podium=[];if(P.podium){const pd=cloneProto(P.podium);pd.scale.setScalar(S);group.add(pd);}else[[0,1.5],[-2.6,1],[2.6,.7]].forEach(([x,h])=>box(group,cream,x*S,h*S/2,0,2.5*S,h*S,2.2*S));
 [[0,1.5],[-2.6,1],[2.6,.7]].forEach(([x,h],i)=>{const r=racers[standings[i]],k=kart(r.color,r.id===0&&KART_COLORS[colorIndex].gold);k.position.set(x*S,h*S,0);k.scale.setScalar(1.25);group.add(k);podium.push(k);});
 let trophy=null;if(P.trophy){trophy=cloneProto(P.trophy);trophy.scale.setScalar(1.6);trophy.position.set(0,1.5*S+3.1,0);group.add(trophy);}
 group.updateMatrixWorld(true);cer={group,trophy,podium,t:0,burstT:0,center:new T.Vector3(pos.x,4,pos.z),angle:group.rotation.y};
 const mine=standings.indexOf(0)+1,tKey=`trophy-${cc}`,prevT=store.get(tKey,9);if(mine<=3&&mine<prevT)store.set(tKey,mine);
 let unlock='';if(mine===1&&cc>=100&&!store.get('gold',false)){store.set('gold',true);unlock='🔓 GOLDPILZ-KART FREIGESCHALTET!';}
 $('cerTitle').textContent=mine===1?`Grand-Prix-Sieger ${cc}cc! 🏆`:mine<=3?`Platz ${mine} im Grand Prix ${cc}cc!`:`Grand Prix beendet – Platz ${mine}`;
 $('cerUnlock').textContent=unlock||(mine===1&&cc<150?`Nächste Herausforderung: ${cc===50?100:150}cc`:mine>1?'Hol dir Gold – drifte die Kurven sauberer!':'');
 const board=$('cerBoard');board.replaceChildren();standings.forEach((id,i)=>{const li=document.createElement('li');if(id===0)li.className='me';li.innerHTML=`<span>${['🥇','🥈','🥉'][i]||(i+1)+'.'}</span><span>${racers[id].name}</span><span>${gp.points[id]} P</span>`;board.append(li);});
 $('ceremony').hidden=false;stopVoice();say(mine===1?'gpwin':mine<=3?'gppodium':'gpfinish');SFX.cheer();stopBgm();if(!playClip(mine<=3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(mine<=3?6800:4800);}
function updateCeremony(dt){if(!cer)return;cer.t+=dt;cer.burstT-=dt;cer.podium.forEach((k,i)=>{const d=k.userData.parts?.driver;if(!d)return;d.position.y=.95+Math.abs(Math.sin(cer.t*(6-i)+i))*(i===0?.5:.3);d.rotation.z=Math.sin(cer.t*4+i)*.18;d.rotation.y=i===0?Math.sin(cer.t*2)*.5:0;});if(cer.trophy){cer.trophy.rotation.y+=dt*1.2;cer.trophy.position.y=1.5*2.2+3.1+Math.sin(cer.t*2)*.25;}
 if(cer.burstT<=0){cer.burstT=.3;const p=new T.Vector3((Math.random()-.5)*14,4+Math.random()*4,(Math.random()-.5)*4).applyMatrix4(cer.group.matrixWorld);burst({mesh:{position:p}},FAN_COLS[Math.floor(Math.random()*FAN_COLS.length)],10);}}

// ---------------------------------------------------------------- HUD, Karte, Kamera
function format(time){if(!isFinite(time))return '--:--.-';return `${String(Math.floor(time/60)).padStart(2,'0')}:${(time%60).toFixed(1).padStart(4,'0')}`;}
function hud(){if(state==='menu'||state==='ceremony'||!racers.length)return;const p=racers[0];
 const boosting=state==='race'&&p.boost>0?'1':'0';if(HC.boosting!==boosting){HC.boosting=boosting;document.body.classList.toggle('boosting',boosting==='1');}
 if(isTT()){const m=[0,1,2].find(i=>elapsed<=course.medals[i])??2;setText('ttMedalLabel',MEDALS[m]);setText('ttMedalTime',format(course.medals[m]));
  let dl='—',cls='';if(ghost&&isFinite(ghost.dist)&&state==='race'){const gap=(ghost.dist-p.distance)/Math.max(12,Math.abs(p.speed));dl=(gap>0?'+':'−')+Math.abs(gap).toFixed(1)+' s';cls=gap>0?'behind':'ahead';}setText('ttDelta',dl);if(HC.ttc!==cls){HC.ttc=cls;$('ttDelta').className=cls;}}
 setText('place',String(ranking(racers).indexOf(p)+1));const lapHtml=`${lap(p,length)} <em>/ 3</em>`;if(HC.lap!==lapHtml){HC.lap=lapHtml;$('lap').innerHTML=lapHtml;}
 if(gp.active){const g=`${gp.race+1} <em>/ ${courses.length}</em>`;if(HC.gp!==g){HC.gp=g;$('gpRace').innerHTML=g;}}
 setText('time',format(elapsed));setText('speed',String(Math.round(Math.abs(p.speed)*3.6)));setText('sporeCount',String(p.spores||0));
 let key='empty',name='ITEM SAMMELN';
 if(roulette){const ks=['boost','shell','banana','shield','bomb'];key=ks[Math.floor(performance.now()/75)%ks.length];name='…';}
 else if(p.item){key=p.item;name=ITEM_NAMES[p.item];}
 const tag=key+(key==='triple'?p.charges:'');
 if(HC.art!==tag){HC.art=tag;const pic=itemThumbs[key];
  const html=(pic?'<img src="'+pic+'" alt="">':(ITEM_ART[key]||ITEM_ART.empty))+(key==='triple'?'<b class="cnt">'+p.charges+'</b>':''),col=ITEM_COL[key]||'#cfe0d4';
  for(const id of ['itemIcon','titemIcon']){const el=$(id);if(el){el.innerHTML=html;el.parentElement.style.setProperty('--it',col);}}
  $('item').classList.toggle('spin',!!roulette);$('titem').classList.toggle('spin',!!roulette);}
 setText('itemName',name);const ready=p.item?'1':'0';if(HC.ready!==ready){HC.ready=ready;$('titem').classList.toggle('ready',!!p.item);$('item').classList.toggle('ready',!!p.item);}
 const full=p.spores>=MAX_SPORES?'1':'0';if(HC.full!==full){HC.full=full;$('spores').classList.toggle('full',full==='1');}
 const lvl=p.drift>=2.3?'ultra':p.drift>=1.4?'super':p.drift>=.7?'mini':'';const w=(p.driftDir?Math.min(100,p.drift/2.3*100):0).toFixed(0)+'%';if(HC.dw!==w){HC.dw=w;$('driftbar').style.width=w;}const dc=lvl?'#'+MT_COLORS[lvl].toString(16).padStart(6,'0'):'#9fb4c2';if(HC.dc!==dc){HC.dc=dc;$('driftbar').style.background=dc;}
 setText('driftlabel',p.boost>0?'TURBO!':p.air?(p.trick?'TRICK!':p.gliding?'PILZGLEITER · DRIFT = TRICK':'IN DER LUFT · DRIFT = TRICK'):p.driftDir?(lvl?MT_LABEL[lvl]+' BEREIT':'DRIFT HALTEN …'):(p.draft||0)>.25?'WINDSCHATTEN …':coarseInput?'DRIFT + LENKEN':'SHIFT + LENKEN = DRIFT');}
function refreshBest(){document.querySelectorAll('#tracks .track').forEach((b,i)=>{let span=b.querySelector('.best');if(!span){span=document.createElement('span');span.className='best';b.append(span);}
 if(mode==='tt'){const t=store.get(`tt-${i}`,null),md=store.get(`medal-${i}`,3);span.textContent=(md<3?['🥇','🥈','🥉'][md]+' ':'')+(t?format(t):'—');return;}
 const t=store.get(`best-${i}-${cc}`,null),stars=store.get(`stars-${i}-${cc}`,0);span.textContent=(stars?'★'.repeat(stars)+' ':'')+(t?format(t):'—');});}
function drawMap(){const {cx,cz,k}=mapInfo,X=x=>100+(x-cx)*k,Y=z=>80+(z-cz)*k,out=$('map').getContext('2d');
 if(!mapBase){mapBase=document.createElement('canvas');mapBase.width=200;mapBase.height=160;const q=mapBase.getContext('2d');q.lineWidth=9;q.lineJoin='round';q.strokeStyle='#0b1a2288';q.beginPath();for(let i=0;i<=PS;i+=16){const j=i%PS;i?q.lineTo(X(TP.x[j]),Y(TP.z[j])):q.moveTo(X(TP.x[j]),Y(TP.z[j]));}q.stroke();q.lineWidth=3;q.strokeStyle='#fff6dd';q.stroke();
 q.fillStyle='#ffd23f';for(const r of ramps){const p=sample(r.d,r.off).p;q.fillRect(X(p.x)-2.5,Y(p.z)-2.5,5,5);}q.fillStyle='#b48cff';for(const z of zones)q.fillRect(X(z.x)-4,Y(z.z)-4,8,8);q.fillStyle='#2fb7d8';for(const g of gaps){const p=sample(g.c).p;q.beginPath();q.arc(X(p.x),Y(p.z),5,0,TAU);q.fill();}
 for(const f of forks){q.beginPath();f.pts.forEach((p,i)=>i?q.lineTo(X(p.x),Y(p.z)):q.moveTo(X(p.x),Y(p.z)));q.lineWidth=7;q.strokeStyle='#0b1a2288';q.stroke();q.lineWidth=2;q.strokeStyle='#ffe9a8';q.stroke();}}
 const q=out;q.clearRect(0,0,200,160);q.drawImage(mapBase,0,0);
 for(let n=racers.length-1;n>=0;n--){const r=racers[n];q.fillStyle=r.id===0?'#ffe16a':'#fff';q.beginPath();q.arc(X(r.x),Y(r.z),r.id===0?5:3,0,TAU);q.fill();if(r.id===0){q.strokeStyle='#203e2f';q.lineWidth=1.5;q.stroke();}}}
const tempLook=new T.Vector3(),camFlat=new T.Vector3(),camUp=new T.Vector3(0,1,0);
// Blickpunkt fuers Menue: die Stelle der Runde mit dem groessten Abstand zu allen Bauwerken.
// Sonst steht ein Wurzeltor oder eine Burg direkt vor der Kamera und verdeckt die Strecke.
let menuSpotD=-1,menuSpotFor=-2;
function menuSpot(){if(menuSpotFor===builtSel)return menuSpotD;
 let best=length*.03,bd=-1;
 for(let i=0;i<32;i++){const d=length*i/32,q=sample(d).p;let m=1e9;
  for(const z of zones)m=Math.min(m,Math.hypot(q.x-z.x,q.z-z.z)-(z.r||0));
  if(!zones.length)m=999;
  if(m>bd){bd=m;best=d;}}
 menuSpotFor=builtSel;menuSpotD=best;return best;}
function updateCameraMenuSpot(){return menuSpot();}
function updateCamera(dt,snap=false){const portrait=camera.aspect<.9;
 if(state==='menu'){camera.up.set(0,1,0);const s=sample(menuSpot()),angle=performance.now()*.00004;
  const r=portrait?58:74,hy=portrait?30:38;
  camera.position.set(s.p.x+Math.sin(angle)*r,hy+s.p.y,s.p.z+Math.cos(angle)*r);camera.lookAt(s.p.x,4,s.p.z);
  // Auf breiten Schirmen steht das Menue links. Den Blickpunkt nach links schieben, dann liegt
  // die Strecke rechts daneben im Bild statt hinter dem Panel.
  if(!portrait&&innerWidth>900){camera.updateMatrixWorld();
   tempLook.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-30).add(s.p);tempLook.y=4;camera.lookAt(tempLook);}
  setFov(portrait?72:54,dt,true);return;}
 if(state==='ceremony'&&cer){camera.up.set(0,1,0);const a=cer.angle+Math.sin(cer.t*.25)*.9,r=portrait?30:23;camera.position.set(cer.center.x+Math.sin(a)*r,cer.center.y+5+Math.sin(cer.t*.4),cer.center.z+Math.cos(a)*r);camera.lookAt(cer.center.x,cer.center.y+(portrait?-4.5:1.5),cer.center.z);
  if(!portrait&&innerWidth>900){camera.updateMatrixWorld();tempLook.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(7).add(cer.center);tempLook.y+=1.5;camera.lookAt(tempLook);}
  setFov(portrait?70:52,dt,true);return;}
 if(!racers.length)return;const p=racers[0];
 // Verfolgerkamera haengt am Kart (nicht an der Strecke): man sieht, wohin man wirklich faehrt
 const targetH=p.h+(p.driftDir?-p.driftDir*.12:0);camH=snap?targetH:camH+angleDiff(targetH,camH)*Math.min(1,dt*(p.driftDir?3.2:5));
 const back0=portrait?10.5:8.4,up0=portrait?4.8:3.7,sx=Math.sin(camH),cz=Math.cos(camH),py=p.y??0;

 // Anti-Grav: Kamera folgt der gedrehten Fahrbahn (Versatz und Hochachse um die Fahrtrichtung gedreht)
 // Feed-Forward: das analytische Roll-Delta wird direkt uebernommen, nur der Restfehler wird geglaettet.
 // So hinkt der Horizont bei schnellen Korkenziehern nicht (alt: dt*7-Nachlauf ~30 Grad) und die
 // TAU/0-Naht am Ende eines Roll-Moduls loest keinen Rueckwaertssalto aus (angleDiff ist wrap-sicher).
 // Eine einzige Kameraführung fuer flach, Spirale und Looping: Position, Hochachse und
 // Blickrichtung kommen aus demselben Rahmen und werden durchgehend geglättet. Frueher waren das
 // drei Modi mit harten Umschaltern - genau dort ruckte das Bild.
 const lq=loops.length?loopAt(p.distance):null;
 const rl=agrav.length?rollAt(p.distance):0;
 // Gewicht fuer die Bahnkamera: der Sichthub der Rollzone faehrt ohnehin weich hoch und runter
 const rw=agrav.length&&!lq?Math.min(1,liftAt(p.distance)/7):0;
 if(snap)camRoll=camRollPrev=rl;
 else{const dRl=angleDiff(rl,camRollPrev),pred=camRoll+dRl;camRoll=angleDiff(pred+angleDiff(rl,pred)*(1-Math.exp(-dt*10)),0);camRollPrev=rl;}
 let kx=p.x,ky=py,kz=p.z,fx=sx,fy=0,fz=cz,ux=0,uy=1,uz=0;
 // Im Looping wird der Kamerarahmen aus der Blickrichtung des Karts aufgebaut (nicht aus der
 // Streckentangente): am Ein- und Ausgang ist er damit exakt die flache Kamera, also kein Ruck.
 if(lq){const st=loopFrame(lq,p.distance);
  posAt(p.distance,p.offset,py-roadRef(p.distance,p.offset),_agP);kx=_agP.x;ky=_agP.y;kz=_agP.z;
  fx=sx*st.tf;fy=st.tu;fz=cz*st.tf;ux=sx*st.nf;uy=st.nu;uz=cz*st.nf;}
 else {posAt(p.distance,p.offset,py-roadRef(p.distance,p.offset),_agP);kx=_agP.x;ky=_agP.y;kz=_agP.z;
  // Der Versatz nach hinten folgt der Steigung der sichtbaren Fahrbahn. Waagerecht gerechnet
  // landete die Kamera an der abfallenden Rampe einer Anti-Grav-Zone unter der Fahrbahn - dann
  // verdeckt die Bahn die Sicht nach vorn und man weiss nicht mehr, wohin man faehrt.
  posAt(p.distance+3,p.offset,0,_agB);posAt(p.distance-3,p.offset,0,_agL);
  const dy=clamp(_agB.y-_agL.y,-5,5),dxz=Math.hypot(_agB.x-_agL.x,_agB.z-_agL.z)||1,pl=Math.hypot(dxz,dy);
  fx=sx*dxz/pl;fy=dy/pl;fz=cz*dxz/pl;
  if(Math.abs(camRoll)>1e-4){const tn=tanAt(p.distance);_agAxis.set(tn.x,0,tn.z);_agV.set(0,1,0).applyAxisAngle(_agAxis,camRoll);ux=_agV.x;uy=_agV.y;uz=_agV.z;}}
 const kk=snap?1:1-Math.exp(-dt*15);
 camUp.x+=(ux-camUp.x)*kk;camUp.y+=(uy-camUp.y)*kk;camUp.z+=(uz-camUp.z)*kk;
 if(camUp.lengthSq()<1e-4)camUp.set(0,1,0);camUp.normalize();
 // In Rollzonen bleibt die Kamera nah dran (normale Verfolgerhoehe plus wenig). Frueher stand sie
 // 11 m ueber der Fahrbahn - bei 180 Grad Roll heisst kartseitig "ueber" weltoffen "11 m UNTER dem
 // schwebenden Band", mitten zwischen den Spiralgängen: das sah aus wie Kamera unter der Strecke.
 // Die Bahn-Kamera rotiert mit der Fahrbahn mit, kann also von ihr nicht ueberstrichen werden;
 // nur die Rest-Glaettung braucht Abstand, dafuer zieht sie in Rollzonen schneller nach.
 const back=back0*(1-rw*.34),up=up0+rw*2.4;
 _agV.set(kx-fx*back+camUp.x*up,ky-fy*back+camUp.y*up,kz-fz*back+camUp.z*up);
 // und sie setzt sich auf die Bahn an ihrer eigenen Stelle, nicht in den Rahmen des Karts
 if(rw>0){posAt(lapDist(p.distance-back),p.offset,up,_agB);_agV.lerp(_agB,rw);}
 if(snap)camera.position.copy(_agV);else camera.position.lerp(_agV,1-Math.exp(-dt*(7+rw*5)));
 camera.up.copy(camUp);
 camera.lookAt(kx+fx*8+camUp.x*1.3,ky+fy*8+camUp.y*1.3,kz+fz*8+camUp.z*1.3);
 if(p.boost>0){camera.position.y+=Math.sin(elapsed*63)*.05;camera.position.x+=Math.sin(elapsed*49)*.04;}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.x+=(Math.random()-.5)*shake*.9;camera.position.y+=(Math.random()-.5)*shake*.7;}
 setFov((portrait?74:62)+(p.boost>0?10:0)+clamp(Math.abs(p.speed)-24,0,16)*.35,dt,snap);}
function setFov(target,dt,snap){camFov=snap?target:camFov+(target-camFov)*Math.min(1,dt*6);if(Math.abs(camera.fov-camFov)>.01){camera.fov=camFov;camera.updateProjectionMatrix();}}
function adaptQuality(fps){if(gfxMode!=='auto'||(state!=='race'&&state!=='countdown')||fps>=50||quality.level>=3)return;quality.level++;quality.dprCap=Math.max(quality.level===1?1:.8,quality.dprCap-.25);if(quality.level===1){sun.shadow.mapSize.set(512,512);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}if(quality.level===2){shadowEvery=2;}if(quality.level===3){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m)m.needsUpdate=true;});}renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));resize();}
const dbg={};let tunnelMix=0,shadowEvery=1;
const GFX={auto:{n:'Auto'},mid:{n:'Mittel'},low:{n:'Sparsam'}};
let gfxMode=store.get('gfx','auto');
// Feste Stufen: Aufloesung, Schattenkarte, Schattenrhythmus. 'auto' startet hoch und regelt bei Bedarf herunter.
function applyGfx(){const m=gfxMode;
 if(m==='low'){quality.level=3;quality.dprCap=.85;shadowEvery=1;renderer.shadowMap.enabled=false;sun.castShadow=false;}
 else{renderer.shadowMap.enabled=true;sun.castShadow=true;
  if(m==='mid'){quality.level=2;quality.dprCap=1;shadowEvery=2;sun.shadow.mapSize.set(512,512);}
  else{quality.level=0;quality.dprCap=coarseInput?1.25:1.25;shadowEvery=1;sun.shadow.mapSize.set(coarseInput?512:768,coarseInput?512:768);}
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
 renderer.shadowMap.autoUpdate=shadowEvery<=1&&!coarseInput;
 scene.traverse(o=>{if(o.isMesh)for(const mm of [].concat(o.material))if(mm)mm.needsUpdate=true;});
 renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));resize();}
function animateWorld(dt,now){
 // Energiewaende der Anti-Grav-Zonen atmen leicht - macht das Magnetfeld lebendig
 for(let i=0;i<agravWalls.length;i++)agravWalls[i].opacity=.24+.08*Math.sin(now*.0022+i*1.3);
 for(let i=0;i<agravGates.length;i++)agravGates[i].scale.setScalar(1+.04*Math.sin(now*.0025+i*1.1));
 if(UG_MAT)UG_MAT.opacity=.45+.15*Math.sin(now*.004);
 // Energie-Kristalle: langsame Eigendrehung und Schwebe-Bob
 for(let i=0;i<crystals.length;i++){const c=crystals[i];c.m.rotation.y+=dt*.6;c.m.position.y=c.base+Math.sin(now*.0012+c.ph)*.5;}
 if(!dbg.noBoxes&&boxInst.length&&boxQ){const qa=boxQ.geometry.attributes.position.array;_e.set(0,now*.001,0);_q.setFromEuler(_e);boxes.forEach((b,i)=>{b.cooldown=Math.max(0,b.cooldown-dt);const vis=b.cooldown<=0,y=b.baseY+Math.sin(now*.003+b.distance)*.2;_m.compose(_v.set(b.x,y,b.z),_q,_s.setScalar(vis?1.05:0));for(const im of boxInst)im.setMatrixAt(i,_m);qa[i*3]=b.x;qa[i*3+1]=vis?y+1.3:-999;qa[i*3+2]=b.z;});for(const im of boxInst)im.instanceMatrix.needsUpdate=true;boxQ.geometry.attributes.position.needsUpdate=true;}
 {let dirty=false;for(let i=0;i<SPARKS;i++){const s=sparkPool[i];if(s.life<=0)continue;s.life-=dt;s.vy-=dt*8;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;if(s.life>0){const k=s.life*2;_m.makeScale(k,k,k).setPosition(s.x,s.y,s.z);sparkMesh.setMatrixAt(i,_m);}else sparkMesh.setMatrixAt(i,_zeroM);dirty=true;}if(dirty)sparkMesh.instanceMatrix.needsUpdate=true;
 {let dirty=false;for(let i=0;i<CONFETTI;i++){const c=confettiPool[i];if(c.life<=0)continue;c.life-=dt;c.ph+=c.rv*dt;c.x+=Math.sin(c.ph*.6)*c.sw*dt;c.y+=c.vy*dt;if(c.life>0){_e.set(c.ph*.4,c.ph,0);_q.setFromEuler(_e);_m.compose(_v.set(c.x,c.y,c.z),_q,_s.set(1,1,1));confettiMesh.setMatrixAt(i,_m);}else confettiMesh.setMatrixAt(i,_zeroM);dirty=true;}if(dirty)confettiMesh.instanceMatrix.needsUpdate=true;}
  dirty=false;for(let i=0;i<PUFFS;i++){const p=puffPool[i];if(p.life<=0)continue;p.life-=dt;p.vy+=dt*1.1;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.life>0){const k=(1+(.75-p.life)*1.8)*Math.min(1,p.life*3);_m.makeScale(k,k,k).setPosition(p.x,p.y,p.z);puffMesh.setMatrixAt(i,_m);}else puffMesh.setMatrixAt(i,_zeroM);dirty=true;}if(dirty)puffMesh.instanceMatrix.needsUpdate=true;
  dirty=false;for(let i=0;i<SKIDS;i++){const s=skids[i];if(s.life<=0)continue;s.life-=dt;if(s.life<2.5){setSkid(i,s);dirty=true;}}if(dirty)skidMesh.instanceMatrix.needsUpdate=true;}
 if(!dbg.noFlags&&frame%2===0)for(const f of flags){const pos=f.mesh.geometry.attributes.position,q=pos.array;for(let v=0;v<pos.count;v++){const xn=f.xn[v],w=Math.sin(now*.006+xn*4+v*.02)*(f.amp||.11)*xn;q[v*3]=f.base[v*3]+f.dx[v]*w;q[v*3+2]=f.base[v*3+2]+f.dz[v]*w;}pos.needsUpdate=true;}
 for(const b of balloons){b.g.position.y=b.base+Math.sin(now*.00045+b.ph)*2.4;b.g.rotation.y=now*.00008+b.ph;}
 if(bats&&zones.length){const z=zones[0];for(let i=0;i<bats.count;i++){const a=now*.0005*(1+(i%3)*.25)+i*1.7,rr=10+(i%5)*4;_e.set(0,-a,0);_q.setFromEuler(_e);_m.compose(_v.set(z.x+Math.cos(a)*rr,24+Math.sin(now*.001+i)*4+(i%4)*2.5,z.z+Math.sin(a)*rr),_q,_s.set(1,Math.sin(now*.03+i*2),1));bats.setMatrixAt(i,_m);}bats.instanceMatrix.needsUpdate=true;}
 if(foamRing)foamRing.material.opacity=.16+Math.sin(now*.0012)*.09;
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.life-=dt;h.arm=Math.max(0,h.arm-dt);if(h.life<=0){actors.remove(h.mesh);hazards.splice(i,1);}}
 for(const pad of pads){pad.squash=Math.max(0,pad.squash-dt*1.6);const k=pad.squash>0?Math.sin(pad.squash*14)*pad.squash:0;pad.mesh.scale.set(1+k*.4,1-k,1+k*.4);}
 for(const ring of rings){ring.flash=Math.max(0,ring.flash-dt);if(!ring.ag)ring.mesh.rotation.z=now*.0015;ring.mesh.scale.setScalar(1+ring.flash*.6);ring.mesh.material.emissiveIntensity=.9+ring.flash*4;}
 if(boostTex)boostTex.offset.y=-(now*.0022)%1;
 if(rainbowTex)rainbowTex.offset.y=(now*.00008)%1;
 if(state==='menu')updateSwingersMenu(now);
 {const p=racers[0],want=p&&tunnels.length&&inTunnel(p.distance)?1:0;
  if(want||tunnelMix>.002){tunnelMix+=(want-tunnelMix)*Math.min(1,dt*4.5);renderer.toneMappingExposure=theme.exposure*(1-.26*tunnelMix);
   headlight.intensity=Math.max(theme.head!==undefined?theme.head:(theme.stars?90:0),tunnelMix*130);if(echoSend)echoSend.gain.value=tunnelMix*.5;}}
 if(!dbg.noSpores)updateSpores(dt,now);if(!dbg.noCrowd&&frame%2===0)updateCrowd(now);
 if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0&&state!=='countdown')setText('message','');}
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').className='';}}
function updateSwingersMenu(now){updateSwingers(now*.001);}
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000||.016,.05);last=now;
 if(finishMusicAt&&now>finishMusicAt){finishMusicAt=0;if(state==='finished'||state==='ceremony')playBgm('menu');}
 quality.fpsFrames++;if(quality.fpsStart&&now-quality.fpsStart>1200){adaptQuality(quality.fpsFrames*1000/(now-quality.fpsStart));quality.fpsFrames=0;quality.fpsStart=now;}else if(!quality.fpsStart)quality.fpsStart=now;
 frameStep(dt,now);}
const prof={upd:0,anim:0,hud:0,ren:0,n:0};
function frameStep(dt,now){if(dbg.freeze)return;frame++;
 if(shadowEvery>1&&renderer.shadowMap.enabled){renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=frame%shadowEvery===0;}
 if(revealQueue){const n=Math.max(10,Math.ceil(revealQueue.length/8));for(let i=0;i<n&&revealQueue.length;i++)revealQueue.shift().visible=true;if(!revealQueue.length)revealQueue=null;}shaderTime.value=now/1000;duckBgm(now);
 const p0=performance.now();if(state!=='paused'){update(dt);const p1=performance.now();prof.upd+=p1-p0;animateWorld(dt,now);updateCamera(dt);prof.anim+=performance.now()-p1;}
 if(frame%3===0){hud();if(state==='race'||state==='countdown')drawMap();}
 if(racers[0]&&headlight.intensity>0){const p=racers[0];headlight.position.set(p.x+Math.sin(p.h)*5,(p.y||0)+3.2,p.z+Math.cos(p.h)*5);}
 if(racers[0]){sun.target.position.set(racers[0].x,0,racers[0].z);sun.position.set(racers[0].x+theme.sunPos[0]*.8,theme.sunPos[1]*.8,racers[0].z+theme.sunPos[2]*.8);}
 if(!renderer.shadowMap.autoUpdate)renderer.shadowMap.needsUpdate=frame%2===0;const p2=performance.now();renderer.render(scene,camera);prof.ren+=performance.now()-p2;prof.n++;}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
addEventListener('error',e=>{try{const el=$('error');el.hidden=false;el.textContent='Darsteller abgestürzt — bitte neu laden. ('+e.message+')';console.error(e.error||e.message);}catch{}});

// ---------------------------------------------------------------- Menue, Eingabe, Vollbild
function syncTrackButtons(){$('tracks').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',selected===j);x.setAttribute('aria-pressed',String(selected===j));});}
// Fahrerfiguren als kleine Renderbilder in der Auswahl (statt Emoji)
let thumbRT=null;
function driverThumbs(){const btns=[...document.querySelectorAll('#drivers button')];if(!btns.length||!P.driver)return;
 const S=176;if(!thumbRT)thumbRT=new T.WebGLRenderTarget(S,S);thumbRT.texture.colorSpace=T.SRGBColorSpace;
 const sc=new T.Scene(),cam=new T.PerspectiveCamera(32,1,.4,24);cam.position.set(.5,1.45,3.0);cam.lookAt(0,.66,0);
 sc.add(new T.HemisphereLight(0xffffff,0x5a6472,2.4));const dl=new T.DirectionalLight(0xfff2dc,2.6);dl.position.set(2.5,4,3);sc.add(dl);
 const dl2=new T.DirectionalLight(0x9fc7ff,.9);dl2.position.set(-3,2,-2);sc.add(dl2);
 const buf=new Uint8Array(S*S*4),oldC=new T.Color();renderer.getClearColor(oldC);const oldA=renderer.getClearAlpha();renderer.setClearColor(0x000000,0);
 btns.forEach((b,i)=>{const proto=P[(DRIVERS[i]||DRIVERS[0]).k];if(!proto)return;
  const g=cloneProto(proto);applyTint(g,'CapPaint',KART_COLORS[colorIndex].c);g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  for(const c of g.children.slice())if(c.isGroup&&!c.isMesh)g.remove(c);   // Heckteile gehoeren ans Kart, nicht in die Figurvorschau
  g.rotation.y=-.42;sc.add(g);
  renderer.setRenderTarget(thumbRT);renderer.clear();renderer.render(sc,cam);renderer.setRenderTarget(null);
  renderer.readRenderTargetPixels(thumbRT,0,0,S,S,buf);sc.remove(g);
  let cv=b.querySelector('canvas');if(!cv){cv=document.createElement('canvas');cv.width=cv.height=S;b.textContent='';b.append(cv);}
  const q=cv.getContext('2d'),img=q.createImageData(S,S);
  for(let y=0;y<S;y++)img.data.set(buf.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4);
  q.putImageData(img,0,0);});
 renderer.setClearColor(oldC,oldA);}
// Item-Vorschau: die echten Modelle einmal in kleine Bilder rendern (Blitz und Stern als Extrusion)
const itemThumbs={};
function boltShape(){const s=new T.Shape();s.moveTo(.18,1);s.lineTo(-.55,.02);s.lineTo(-.05,.02);s.lineTo(-.22,-1);s.lineTo(.55,.06);s.lineTo(.05,.06);s.lineTo(.18,1);return s;}
function starShape(){const s=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.44:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();return s;}
function itemModel(key){const ex={depth:.32,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2};
 if(key==='banana')return P.banana?cloneProto(P.banana):null;
 if(key==='shell')return P.shell?cloneProto(P.shell):null;
 if(key==='empty')return P.itembox?cloneProto(P.itembox):null;
 if(key==='bomb')return bombMesh();
 if(key==='shield'){const g=new T.Group();g.add(new T.Mesh(new T.ExtrudeGeometry(starShape(),ex),new T.MeshStandardMaterial({color:0xffe9fb,emissive:0xff9ee0,emissiveIntensity:.55,roughness:.35,metalness:.2})));return g;}
 if(key==='triple'){const g=new T.Group();[-0.62,0,0.62].forEach((x,i)=>{const m=new T.Mesh(new T.ExtrudeGeometry(boltShape(),ex),new T.MeshStandardMaterial({color:i===1?0xfff0ad:0xffd45c,emissive:0xffa51f,emissiveIntensity:.7,roughness:.3,metalness:.25}));m.position.set(x,0,i===1?.15:0);m.scale.setScalar(i===1?.85:.62);g.add(m);});return g;}
 const g=new T.Group();g.add(new T.Mesh(new T.ExtrudeGeometry(boltShape(),ex),new T.MeshStandardMaterial({color:0xffe27a,emissive:0xffa51f,emissiveIntensity:.8,roughness:.3,metalness:.25})));return g;}
function buildItemThumbs(){if(!renderer||itemThumbs.done)return;
 const S=176,rt=new T.WebGLRenderTarget(S,S);rt.texture.colorSpace=T.SRGBColorSpace;
 const sc=new T.Scene(),cam=new T.PerspectiveCamera(30,1,.1,40);cam.position.set(1.5,1.7,3.6);cam.lookAt(0,0,0);
 sc.add(new T.HemisphereLight(0xffffff,0x5a6472,2.3));
 const dl=new T.DirectionalLight(0xfff2dc,2.8);dl.position.set(2.5,4,3);sc.add(dl);
 const dl2=new T.DirectionalLight(0x9fc7ff,1.1);dl2.position.set(-3,1.5,-2);sc.add(dl2);
 const buf=new Uint8Array(S*S*4),oldC=new T.Color();renderer.getClearColor(oldC);const oldA=renderer.getClearAlpha();renderer.setClearColor(0x000000,0);
 const box=new T.Box3(),size=new T.Vector3(),mid=new T.Vector3();
 for(const key of ['empty','boost','triple','shell','banana','shield','bomb']){
  if(itemThumbs[key])continue;
  let g;try{g=itemModel(key);}catch(e){continue;}
  if(!g)continue;
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  box.setFromObject(g);box.getSize(size);box.getCenter(mid);
  const k=2.0/Math.max(size.x,size.y,size.z,.001);
  g.scale.setScalar(k);g.position.set(-mid.x*k,-mid.y*k,-mid.z*k);
  g.rotation.y=key==='banana'?-.9:key==='shell'?.4:.35;g.rotation.x=key==='shell'||key==='banana'?.25:.12;
  sc.add(g);renderer.setRenderTarget(rt);renderer.clear();renderer.render(sc,cam);renderer.setRenderTarget(null);
  renderer.readRenderTargetPixels(rt,0,0,S,S,buf);sc.remove(g);
  const cv=document.createElement('canvas');cv.width=cv.height=S;const q=cv.getContext('2d'),img=q.createImageData(S,S);
  for(let y=0;y<S;y++)img.data.set(buf.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4);
  q.putImageData(img,0,0);itemThumbs[key]=cv.toDataURL('image/png');}
 renderer.setClearColor(oldC,oldA);rt.dispose();
 itemThumbs.done=['empty','boost','triple','shell','banana','shield','bomb'].every(k=>itemThumbs[k]);}
function refreshMenu(){const goldOk=store.get('gold',false);$('colors').querySelectorAll('button').forEach((b,i)=>{const locked=!!(KART_COLORS[i].gold&&!goldOk);b.classList.toggle('locked',locked);b.title=locked?'Gewinne einen Grand Prix ab 100cc':KART_COLORS[i].n;});
 const tro=[50,100,150].map(c=>{const t=store.get(`trophy-${c}`,9);return t<=3?`${['🏆','🥈','🥉'][t-1]} ${c}cc`:'';}).filter(Boolean).join('  ');const medals=courses.map((_,i)=>store.get(`medal-${i}`,3)),mc=[0,1,2].map(k=>medals.filter(x=>x===k).length);setText('trophies',[tro,mc.some(Boolean)?`🥇${mc[0]} 🥈${mc[1]} 🥉${mc[2]}`:''].filter(Boolean).join('   '));$('classes').classList.toggle('locked',mode==='tt');
 document.querySelectorAll('#classes .cls').forEach(b=>{const on=Number(b.dataset.cc)===cc;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('tracks').classList.toggle('locked',mode==='gp');
 // Medaille je Strecke auf die Karte
 $('tracks').querySelectorAll('.track').forEach((b,i)=>{const m=medals[i];b.dataset.medal=String(m);const em=b.querySelector('.medal');if(em)em.textContent=m<3?['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'][m]:'';});
 refreshBest();}
KART_COLORS.forEach((k,i)=>{const b=document.createElement('button');b.className='swatch'+(i===0?' selected':'')+(k.gold?' gold':'');b.style.setProperty('--swatch','#'+k.c.toString(16).padStart(6,'0'));b.setAttribute('aria-label',k.n);b.setAttribute('aria-pressed',String(i===0));
 b.onclick=()=>{if(k.gold&&!store.get('gold',false)){toast('🔒 Gewinne einen Grand Prix ab 100cc',2,'bad');return;}colorIndex=i;$('colors').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));});try{driverThumbs();}catch(e){}buildCourse();};$('colors').append(b);});
// Mini-Streckenplan fuer die Auswahlkarten: dieselbe Mittellinie wie im Spiel, nur flach gezeichnet
function trackThumb(cv,c){const q=cv.getContext('2d'),W=cv.width,H=cv.height,th=THEMES[c.theme];
 const cur=new T.CatmullRomCurve3(c.points.map(([x,z])=>new T.Vector3(x,0,z)),true,'catmullrom',.38),p=cur.getSpacedPoints(220);
 let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const v of p){x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);z0=Math.min(z0,v.z);z1=Math.max(z1,v.z);}
 const pad=13,k=Math.min((W-pad*2)/(x1-x0||1),(H-pad*2)/(z1-z0||1)),ox=(W-(x1-x0)*k)/2-x0*k,oz=(H-(z1-z0)*k)/2-z0*k;
 q.clearRect(0,0,W,H);q.lineJoin=q.lineCap='round';
 const path=()=>{q.beginPath();p.forEach((v,i)=>{const X=v.x*k+ox,Y=v.z*k+oz;i?q.lineTo(X,Y):q.moveTo(X,Y);});q.closePath();};
 path();q.strokeStyle='#00000059';q.lineWidth=11;q.stroke();
 path();q.strokeStyle=hex(th.edge);q.lineWidth=6.5;q.globalAlpha=.85;q.stroke();q.globalAlpha=1;
 path();q.strokeStyle=th.line;q.lineWidth=1.4;q.setLineDash([4,6]);q.stroke();q.setLineDash([]);
 const s=p[0];q.fillStyle=th.curbA;q.beginPath();q.arc(s.x*k+ox,s.z*k+oz,4.2,0,7);q.fill();
 q.strokeStyle='#ffffffcc';q.lineWidth=1.6;q.stroke();}
courses.forEach((c,i)=>{const b=document.createElement('button'),th=THEMES[c.theme];b.className='track'+(i===0?' selected':'');
 const wide=courses.length%2===1&&i===courses.length-1;   // letzte Karte einer ungeraden Anzahl geht ueber die ganze Breite
 b.innerHTML=`<canvas width="${wide?520:240}" height="${wide?150:126}"></canvas><i>${c.icon}</i><em class="medal"></em><b>${c.name}</b><u class="kind">${c.kind}</u><span class="best"></span>`;
 b.style.setProperty('--c1',hex(th.skyBottom));b.style.setProperty('--c2',hex(th.road));b.style.setProperty('--acc',th.curbA);
 b.title=c.kind;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{if(mode==='gp')return;selected=i;syncTrackButtons();buildCourse();};
 $('tracks').append(b);try{trackThumb(b.querySelector('canvas'),c);}catch(e){}});
{const box=$('gfx');if(box)Object.keys(GFX).forEach(k=>{const b=document.createElement('button');b.textContent=GFX[k].n;b.className=k===gfxMode?'selected':'';
 b.setAttribute('aria-pressed',String(k===gfxMode));
 b.onclick=()=>{gfxMode=k;store.set('gfx',k);box.querySelectorAll('button').forEach((x,j)=>{const on=Object.keys(GFX)[j]===k;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});applyGfx();toast('Grafik: '+GFX[k].n,1.1);};
 box.append(b);});}
DRIVERS.forEach((d,i)=>{const b=document.createElement('button');b.className=i===driverIndex?'selected':'';b.innerHTML=d.i;b.title=d.n+' \u00b7 '+d.kart+': '+d.tip;
 b.setAttribute('aria-label','Fahrer: '+d.n);b.setAttribute('aria-pressed',String(i===driverIndex));
 b.onclick=()=>{driverIndex=i;store.set('driver',i);$('drivers').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));});toast(d.n+' \u00b7 '+d.kart+' ('+d.tip+')',1.6);buildCourse();};
 $('drivers').append(b);});
document.querySelectorAll('#modes .mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('#modes .mode').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});$('tracks').classList.toggle('locked',mode==='gp');if(mode==='gp'&&selected!==0){selected=0;syncTrackButtons();buildCourse();}refreshMenu();});
document.querySelectorAll('#classes .cls').forEach(b=>b.onclick=()=>{cc=Number(b.dataset.cc);store.set('class',cc);refreshMenu();});
$('start').onclick=()=>{gp=mode==='gp'?{active:true,race:0,points:{}}:{active:false,race:0,points:{}};start();};
$('again').onclick=nextAfterResult;$('home').onclick=home;$('quit').onclick=home;$('pause').onclick=pause;$('resume').onclick=pause;$('sound').onclick=setSound;
$('cerAgain').onclick=()=>{gp={active:true,race:0,points:{}};start();};$('cerHome').onclick=home;
$('item').onclick=use;$('titem').onpointerdown=e=>{e.preventDefault();use();};
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(e.code==='Space')use();if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='KeyR'&&state==='race'){racers[0].safeD=lapDist(racers[0].distance);respawn(racers[0]);}if(e.code==='Enter'&&state==='menu')$('start').click();}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();touchPtr.clear();touchRefresh();if(state==='race'||state==='countdown')pause();});
const keyButtons=[...document.querySelectorAll('[data-key]')];
function touchRefresh(){tkeys.clear();const els=new Set();for(const p of touchPtr.values()){if(!p.el)continue;els.add(p.el);for(const k of p.el.dataset.key.split(' '))tkeys.add(k);}for(const b of keyButtons)b.classList.toggle('down',els.has(b));}
function touchTarget(x,y,prev){const el=document.elementFromPoint(x,y)?.closest?.('[data-key]');if(el)return el;if(prev){const r=prev.getBoundingClientRect(),dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);if(Math.hypot(dx,dy)<34)return prev;}return null;}
$('touch').addEventListener('pointerdown',e=>{const el=e.target.closest?.('[data-key]');if(!el)return;e.preventDefault();touchPtr.set(e.pointerId,{el});touchRefresh();});
addEventListener('pointermove',e=>{const p=touchPtr.get(e.pointerId);if(!p)return;const el=touchTarget(e.clientX,e.clientY,p.el);if(el!==p.el){p.el=el;touchRefresh();}},{passive:true});
const touchEnd=e=>{if(touchPtr.delete(e.pointerId))touchRefresh();};addEventListener('pointerup',touchEnd);addEventListener('pointercancel',touchEnd);
for(const b of keyButtons)b.oncontextmenu=e=>e.preventDefault();
let wantFs=false;
function enterFs(){const d=document.documentElement;if(!wantFs||document.fullscreenElement||!d.requestFullscreen)return;d.requestFullscreen({navigationUI:'hide'}).catch(()=>{});}
function armFs(){if(wantFs&&!document.fullscreenElement)addEventListener('pointerdown',enterFs,{once:true,capture:true});}
function onRotate(){setTimeout(()=>{enterFs();armFs();resize();},150);}
addEventListener('orientationchange',onRotate);screen.orientation?.addEventListener?.('change',onRotate);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)armFs();setTimeout(resize,80);});
$('full').onclick=()=>{if(document.fullscreenElement){wantFs=false;document.exitFullscreen().catch(()=>{});}else{wantFs=true;enterFs();}};
const autoButton=document.createElement('button');autoButton.id='autoGas';
function setAutoGas(v){autoGas=v;store.set('autogas',v);document.body.classList.toggle('autogas',v);for(const b of [autoButton,$('pauseAutoGas')]){if(!b)continue;b.textContent='Auto-Gas: '+(v?'AN':'AUS');b.setAttribute('aria-pressed',String(v));}}
autoButton.onclick=()=>setAutoGas(!autoGas);document.querySelector('.controls').after(autoButton);if($('pauseAutoGas'))$('pauseAutoGas').onclick=()=>setAutoGas(!autoGas);setAutoGas(store.get('autogas',false));

// ---------------------------------------------------------------- Laden & Start
const protoAll=Promise.all(PROTO_FILES.map(loadProto));
protoAll.then(()=>{try{buildItemThumbs();}catch(e){console.error('itemThumbs',e);}try{driverThumbs();}catch(e){console.error('driverThumbs',e);}});
Promise.race([protoAll,new Promise(r=>setTimeout(r,9000))]).finally(()=>{try{applyGfx();}catch(e){}buildCourse();resize();refreshMenu();try{driverThumbs();}catch(e){}try{buildItemThumbs();}catch(e){console.error('itemThumbs0',e);}readyPromise.then(()=>{updateCamera(1/60,true);try{renderer.render(scene,camera);}catch(e){}
 requestAnimationFrame(()=>{playBgm('menu');const l=$('loader');l.classList.add('done');setTimeout(()=>l.hidden=true,600);requestAnimationFrame(loop);setInterval(prebuildTick,900);
  // Grossbauten nachladen und die betroffenen Strecken neu bauen lassen
  Promise.all(LATE_FILES.map(loadProto)).then(()=>{for(let i=0;i<courses.length;i++){if(courses[i].mansion===undefined&&courses[i].castle===undefined&&!(courses[i].builds||[]).length)continue;if(i===builtSel){if(state==='menu')buildCourse(true);else worldDirty=true;}else disposeCourse(i);}});});});});

// Testschnittstelle nur mit ?test=1
if(TEST){window.rallyTest={start,home,use,pause,say,ceremony,hud,
 gliderState:()=>racers.map(r=>({id:r.id,armed:!!r.glideArmed,gliding:!!r.gliding,open:r.gliderOpen||0,visible:!!r.mesh.userData.glider?.visible,asset:!!P.glider})),
 gliderPose:(phase='flight')=>{if(!racers.length)return null;const r=racers[0],rp=ramps.find(q=>!q.gap&&!hasRoll(q.end+7))||ramps[0],d=rp?rp.end+7:20,off=rp?.off||0,s=sample(d,off),gy=groundAt(d,off).y;r.distance=d;r.offset=off;r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.speed=28;r.vx=Math.sin(r.h)*28;r.vz=Math.cos(r.h)*28;r.y=gy+(phase==='ground'?0:3.4);r.vy=-2;r.air=phase!=='ground';r.airT=.35;r.stun=0;r.trick=0;r.finishTime=null;r.steerS=.3;r.lastGround=gy;resetGlider(r,true);armGlider(r,phase==='respawn'?'respawn':'ramp');state='inspect';for(let i=0;i<40;i++)syncKart(r,1/60);syncKartInstances();updateCamera(1/60,true);hud();renderer.render(scene,camera);return window.rallyTest.gliderState()[0];},next:nextAfterResult,track:d=>({...trackAt(d),x:sample(d).p.x,z:sample(d).p.z}),zones:()=>zones,cp:v=>cpDist(v),
 setMode:m=>document.querySelector(`#modes [data-mode="${m}"]`).click(),setClass:c=>{cc=c;refreshMenu();},setTrack:i=>{selected=i;syncTrackButtons();buildCourse();},
 autopilot:v=>{autopilot=v;},finishNow:()=>{racers[0].distance=length*LAPS+1;finish(racers[0],length,elapsed);end();},
 state:()=>({state,length,mode,cc,gp,stats,racers:racers.map(({mesh,...r})=>r)}),setItem:item=>{racers[0].item=item;racers[0].charges=item==='triple'?3:0;},
 perf:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,dpr:renderer.getPixelRatio(),qualityLevel:quality.level}),
 bgm:()=>({ready:bgm.ready,failed:bgm.failed,playing:bgm.current,rate:bgm.rate}),
 items:()=>({hazards:hazards.length,shots:shots.length,ramps:ramps.length,pads:pads.length,rings:rings.length,spores:spores.length,swingers:swingers.length,gaps:gaps.length,obstacles:[...obsGrid.values()].reduce((a,c)=>a+c.length,0),crowd:crowd?crowd.fans.length:0,protos:Object.fromEntries(PROTO_FILES.map(n=>[n,!!P[n]]))}),
 saveGhost:()=>{try{localStorage.setItem('mr-ghost-'+selected,JSON.stringify({...rec,next:undefined,color:0xffffff}));}catch{}return rec&&rec.x.length;},ghost:()=>ghost&&{n:ghost.data.x.length,dist:ghost.dist,visible:ghost.mesh.visible},medalOf:t=>medalOf(t),aiUse:(id,item)=>{racers[id].item=item;return useItem(racers[id]);},racers:()=>racers,world:()=>({ramps,pads,rings,spores,gaps,swingers}),keys,
 loops:()=>loops.map(q=>({...q,s:Math.round(q.s),span:Math.round(q.span),R:Math.round(q.R)})),
 thumbs:()=>({items:Object.keys(itemThumbs),drivers:document.querySelectorAll('#drivers canvas').length}),
 dbg,gfx:m=>{if(m){gfxMode=m;applyGfx();}return {gfxMode,level:quality.level,dpr:renderer.getPixelRatio(),shadowEvery,shadows:renderer.shadowMap.enabled};},bprof:()=>bprof.slice(),three:()=>({renderer,scene,camera,sun,world,actors,headlight,T}),prof:()=>{const r=Object.fromEntries(Object.entries(prof).map(([k,v])=>[k,k==='n'?v:+(v/Math.max(1,prof.n)).toFixed(2)]));for(const k in prof)prof[k]=0;return r;},bench:(n=120)=>{const gl=renderer.getContext();let cpu=0,gpu=0,worst=0;for(let i=0;i<n;i++){const a=performance.now();frameStep(1/60,a);const b=performance.now();gl.finish();const c=performance.now();cpu+=b-a;gpu+=c-b;worst=Math.max(worst,c-a);}
  return {cpuMs:+(cpu/n).toFixed(2),finishMs:+(gpu/n).toFixed(2),worstMs:+worst.toFixed(1),calls:renderer.info.render.calls,tris:renderer.info.render.triangles,programs:renderer.info.programs.length,geos:renderer.info.memory.geometries};},
 ready:()=>readyPromise.then(()=>new Promise(res=>{const c=()=>revealQueue?setTimeout(c,30):res(worldReady);c();})),forkTest:(a,b,k)=>{const f=computeFork(a,b,k);return {maxOff:+f.maxOff.toFixed(1),minR:Math.round(f.minR),saved:Math.round(f.span-f.len),span:Math.round(f.span),back:f.pts.filter((p,i)=>i&&p.rel<f.pts[i-1].rel-.3).length,jump:Math.round(Math.max(...f.pts.map((p,i)=>i?p.rel-f.pts[i-1].rel:0)))};},prebuild:i=>{const a=performance.now();prebuild(i);return Math.round(performance.now()-a);},cache:()=>[...worldCache.keys()],
 forks:()=>forks.map(f=>({dA:Math.round(f.dA),span:Math.round(f.span),maxOff:+f.maxOff.toFixed(1),minR:Math.round(f.minR),len:Math.round(f.len),main:Math.round(f.span)})),rails:()=>rails.map(r=>[Math.round(r.d0),Math.round(r.d1),r.side,r.kind]),
 minRadius:()=>{let m=1e9,at=0;for(let i=0;i<PS;i++){const r=1/Math.max(1e-4,Math.abs(TP.k[i]));if(r<m){m=r;at=i*length/PS;}}return {r:+m.toFixed(1),at:Math.round(at),length:Math.round(length)};},timeStart:()=>{const a=performance.now();start();const b=performance.now();const gl=renderer.getContext();renderer.render(scene,camera);gl.finish();return {startMs:+(b-a).toFixed(1),firstFrameMs:+(performance.now()-b).toFixed(1)};},
 tick:(n=60,dt=1/60)=>{for(let i=0;i<n;i++){update(dt);animateWorld(dt,performance.now());updateCamera(dt);}duckBgm(performance.now());renderer.render(scene,camera);return {state,elapsed:+elapsed.toFixed(2),place:ranking(racers).indexOf(racers[0])+1};}};
 const panel=document.createElement('aside');panel.id='testPanel';panel.style.cssText='position:fixed;bottom:0;left:35%;z-index:30;background:#111;padding:10px;display:flex;gap:8px';
 for(const [text,action] of [['Test: Turbo',()=>{window.rallyTest.setItem('boost');state='race';use();}],['Test: Ziel',()=>{state='race';window.rallyTest.finishNow();}]]){const b=document.createElement('button');b.textContent=text;b.style.cssText='color:#fff;background:#345;padding:10px';b.onclick=action;panel.append(b);}document.body.append(panel);}
