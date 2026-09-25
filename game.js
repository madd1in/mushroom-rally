import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {armGlider,resetGlider,stepGlider} from './glider.mjs';
import {isPrecisionFlight,ringBoostDuration} from './windring.mjs';
import {COASTER,BANK,coasterSpec,coasterProfile,coasterSpeedFactor,coasterG,airtimeFloat,launchKick,launchArches,coasterRating,twistAt,bankAngle,bankEnvelope,bankAxis} from './coaster.mjs';
import {ELEM,elemPlan,elemState,elemHeight} from './elem.mjs';
import {ACH,achById,recordRace,levelOf,pickRival,rivalBeaten,dailyChallenge,dailyDone,dayKey,DAILY_XP} from './progress.mjs';
import {STAMP,stamperState,stamperCrushes,stamperBlocks,fireballAt,CANNON,cannonLane,missileAt} from './hazards.mjs';
import {OW,pswitchMission,pswitchPress,pswitchCollect,pswitchTick,timeLeft,slalomMission,slalomPass,ringsMission,ringsHit,ringsLand,progressAdd} from './ow.mjs';
import {LOOP,loopSpec,loopFrame as loopFrameAt,agravSegments,agravRoll,agravRings} from './loop.mjs';
import {HOP_T,miniTurbo,flattenSmall,blastHit,comboStep,racer,driveKart,turnCurve,advanceProgress,hitKart,collideKarts,maxCornerSpeed,angleDiff,lap,finish,ranking,activate,clamp,LAPS,rollItem,loseSpores,addGpPoints,gpStandings,raceStars,GP_POINTS,MAX_SPORES,PHYS,CLASSES} from './core.mjs';

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
  caps:[0x8a5cff,0x9dff7a,0xff8a3d],leaves:[0x3a2d4a,0x2e2a3a,0x4a3550],hills:[0x1d1830,0x261f3a],clouds:false,balloons:0,stars:true,magnetCol:0x6a2fc0,magGlow:0x9dff7a},
 rainbow:{skyTop:0x05030f,skyBottom:0x1b0b3a,fog:0x140a2e,fogNear:220,fogFar:640,exposure:1.36,hemiSky:0xc9b8ff,hemiGround:0x241a44,hemiInt:1.5,sunCol:0xffffff,sunInt:2.0,sunPos:[70,150,60],fillCol:0x7df3ff,fillInt:.7,head:60,
  grass:0x241a44,grassSpot:0x2e2358,skirt:0x1a1234,road:0x2a2050,roadSpot:0x3a2c6e,edge:0xffffff,curbA:'#ffffff',curbB:'#8a5cff',line:'#ffffff',glow:1,sea:0x0a0620,foam:0x9d8cff,
  caps:[0xff4fa3,0x4fd8ff,0xffe45c,0x8affc8],leaves:[0x3a2d6a,0x2a2050],hills:[0x1a1240,0x241a50],pennants:[0xff4fa3,0x4fd8ff],chev:'#ffffff',
  space:true,rainbowRoad:true,clouds:false,balloons:0,stars:true,magnetCol:0xd23a8a},
 lava:{skyTop:0x150409,skyBottom:0x8a2410,fog:0x40120c,fogNear:110,fogFar:430,exposure:1.3,hemiSky:0xffc59a,hemiGround:0x241010,hemiInt:1.05,sunCol:0xffd0a0,sunInt:2.6,sunPos:[-90,110,-70],fillCol:0x6a7dff,fillInt:.5,head:80,
  grass:0x2e2226,grassSpot:0x46302e,skirt:0x1d1517,road:0x2a2328,roadSpot:0x3b3038,edge:0xff7a2f,curbA:'#ff5a1f',curbB:'#1a1012',line:'#ffb347',glow:1,sea:0xff4a12,foam:0xffd08a,lavaSea:true,ember:true,
  chasm:{c:0xff4a12,e:0xff3a08,i:1.5,label:'LAVA! VOLLGAS'},
  caps:[0xff5a1f,0xffae3a,0xd93a12],leaves:[0x3a2a28,0x4a3230],hills:[0x2a1c1c,0x3a2422],pennants:[0xff7a2f,0xffd45c],chev:'#ffcf6a',clouds:false,cloudCols:[0x45302a,0x7a1e0c],balloons:0,stars:false},
 fair:{skyTop:0x1f1450,skyBottom:0xff8f6b,fog:0xb67c98,fogNear:190,fogFar:520,exposure:1.18,hemiSky:0xffd8e6,hemiGround:0x34284a,hemiInt:1.55,sunCol:0xffc08a,sunInt:2.9,sunPos:[-130,55,-120],fillCol:0x8ab0ff,fillInt:.55,
  grass:0x3c9a4c,grassSpot:0x5fc062,skirt:0x2c7a3c,road:0x3a3452,roadSpot:0x51496e,edge:0xfff0dc,curbA:'#ff3b6b',curbB:'#ffe45c',line:'#ffe45c',glow:1,sea:0x2a5fa0,foam:0xffe0ee,
  caps:[0xff3b6b,0xffe45c,0x4fd8ff,0x9d6bff],leaves:[0x2e8a4f,0x46a55a,0x3f8f2a],hills:[0x3a2c62,0x4b3674],pennants:[0xff3b6b,0xffe45c],chev:'#ffe45c',
  clouds:false,cloudCols:[0xffc8d8,0xff7a8a],balloons:3,stars:false,coasterCol:0xff3b6b},
 night:{skyTop:0x05041a,skyBottom:0x2f1c66,fog:0x1f1650,fogNear:140,fogFar:430,exposure:1.4,hemiSky:0x7a7aff,hemiGround:0x0c0c28,hemiInt:1.15,sunCol:0xa8bfff,sunInt:1.5,sunPos:[80,140,-60],fillCol:0xff4fb8,fillInt:.35,
  grass:0x12344a,grassSpot:0x1d5070,skirt:0x0d2638,road:0x16142b,roadSpot:0x29254d,edge:0x2de2e6,curbA:'#2de2e6',curbB:'#ff3cac',line:'#ff3cac',glow:1,sea:0x0a1c3c,foam:0x6fe8ff,
  caps:[0xff3cac,0x2de2e6,0xfff05a,0x9d6bff],leaves:[0x1f6a64,0x2a4f8a],hills:[0x1c2a5a,0x2a1f5c],clouds:false,balloons:0,stars:true}};
// Positionen der Features in Kontrollpunkt-Koordinaten: 2.5 = zwischen Punkt 2 und 3 auf halber Strecke.
// hills [cp, Hoehe, Breite als Rundenanteil], ramps [cp, Querversatz, Breite], pads [cp, Querversatz], boost [cp], boxes [cp],
// stands [cp, Querversatz], plateau [cpStart, cpEnde, Hoehe, Rampenlaenge m], gap [cp, Laenge m], swing [cp, Amplitude, Tempo, Phase].
const courses=[
 {name:'Pilz-Promenade',icon:'✿',kind:'Almwiese · Kühe · Märchenschloss',medals:[93,99,110],music:'race',theme:'forest',seed:7,
  points:[[-45,-45],[-8,-8],[30,30],[72,62],[112,42],[118,-12],[82,-52],[38,-38],[-35,35],[-72,68],[-112,40],[-118,-15],[-85,-58]],sharp:[[9,13]],
  raise:[[6.55,8.45,8,44,1]],hills:[[10.6,4,.022]],elem:[[2.95,4.3,'bach']],tunnel:[[2.15,2.9,'wood']],gaps:[[11.6,12]],agrav:[[4.5,6.4,'wallrun',90]],loopc:[[10.75,13,2,1]],builds:[[.9,'roottree']],
  ramps:[[4.4,0,9],[9.7,0,8]],pads:[[3.1,-4],[10.0,4]],
  pipes:[[1.35,1,1],[1.6,-1,0],[8.7,1,1],[9.35,-1,1]],landmarks:{castle:1,maypoles:[[.35,1],[10.0,-1]]},pennants:[0x1a73e8,0xffffff],cows:[[9.45,10.4,3]],boost:[1.9,5.5,12.3],boxes:[1.6,4.9,9.3,12.0],stands:[[.2,18],[5.2,-19]]},
 {name:'Sonnen-Canyon',icon:'☀',kind:'Wüstensturm · Dünen · Sandhosen · Güterzug',medals:[125,131,142],music:'sunset',theme:'canyon',seed:23,
  points:[[0,78],[95,78],[125,45],[120,-20],[85,-45],[105,-88],[50,-102],[2,-50],[-60,-98],[-115,-72],[-122,0],[-105,55],[-55,80]],sharp:[[4,13]],
  loopc:[[9.12,13,1,-1]],dunes:[[.55,2.25,1.7,18]],twisters:[[5.95,6,.35,0],[12.1,6,.3,1.7],[12.7,6,.33,3.1]],sand:[[4,0,8.5]],hills:[[1.5,4,.03],[4.5,6,.04]],plateau:[9.45,11.7,7,34],gaps:[[10.5,14]],fork:[[6.25,8.75,.36]],
  raise:[[2.3,3.3,7,30,1]],tunnel:[[4.7,5.45,'rock']],
  ramps:[[3.3,0,9],[6.5,3,7]],pads:[[2.4,-4],[8.4,4]],
  train:[3.4,0],boost:[.5,5.2,12.2],boxes:[1.0,4.0,7.0,9.1,12.6],stands:[[.3,-18],[4.35,19]]},
 {name:'Neon-Pilzwald',icon:'✦',kind:'Beat · Taktschranken · Oktoberfest',medals:[115,121,132],music:'night',theme:'night',seed:41,
  points:[[0,70],[50,75],[80,50],[55,25],[85,0],[95,-45],[55,-60],[30,-35],[0,-60],[-30,-95],[-80,-80],[-70,-40],[-105,-10],[-95,40],[-60,35],[-40,65]],
  hills:[[10.5,5,.035]],raise:[[1.1,2.1,7,28,1]],tunnel:[[9.3,10.0,'neon']],gaps:[[12.55,12]],agrav:[[8.6,10.75,'roll',1]],elem:[[2.36,5.6,'see',{loop:[3,11,1]}]],
  ramps:[[10.6,0,8]],pads:[[4.4,3],[12.4,-3]],
  builds:[[11.45,'neongate']],pipes:[[13.25,1,1],[13.5,-1,1]],landmarks:{tent:[12.0,-1],maypoles:[[.35,-1],[11.0,1]],hearts:[[.7,1],[11.2,-1],[13.9,-1],[14.6,1]],pretzels:[[.9,-1],[11.6,1],[14.3,-1]]},beatgates:[[11.05],[11.9],[14.1]],boost:[.6,6.3,11.6],fork:[[5.75,8.75,.36]],boxes:[1.3,3.6,6.9,9.8,13.8],stands:[[.25,18],[10.1,-19]]},
 {name:'Geisterhaus',icon:'👻',kind:'Spuk · Gewitter · Geisterhände',medals:[101,108,120],music:'night',bgmRate:.9,theme:'haunted',seed:66,
  points:[[0,70],[55,78],[95,55],[105,10],[70,-16],[100,-60],[70,-95],[20,-90],[-30,-90],[-75,-95],[-112,-55],[-104,-18],[-93,12],[-104,40],[-80,70],[-40,76]],
  hills:[[3.5,4,.03],[13.6,5,.03]],mansion:7.8,raise:[[9.9,11.1,8,34,1]],tunnel:[[2.3,3.0,'crypt']],agrav:[[11.4,13.4,'ceiling',1]],coaster:[[8.2,9.82,'hills']],loopc:[[4.1,14,2,-1]],elem:[[5.9,7.85,'see']],
  ramps:[[5.4,0,9],[13.5,0,8]],pads:[[4.6,3],[14.6,-3]],
  hands:[[.7,2.1,6]],boost:[.5,6,12.5],ghosts:[[1.6,5.5,.9,0],[5.3,5.5,1.1,2],[7.5,4.2,1,.5],[10.4,5.5,.8,4],[12.9,5.5,1.2,1]],boxes:[1.2,4.1,9.6,13.9],stands:[[.3,-19],[13.2,19]]},
 {name:'Lava-Feste',icon:'\u2668',kind:'Burg \u00b7 Magma \u00b7 Feuerb\u00e4lle',medals:[111,117,128],music:'sunset',bgmRate:1.06,theme:'lava',seed:88,
  points:[[-80,86],[0,90],[80,84],[118,56],[126,12],[112,-34],[92,-74],[44,-98],[-14,-94],[-62,-86],[-92,-56],[-72,-26],[-96,6],[-118,44],[-108,74]],
  castle:1.05,hills:[[8.6,3,.028]],elem:[[2.62,4.52,'flug']],raise:[[12.3,13.45,14,44,1]],tunnel:[[4.6,5.25,'pipe'],[12.95,13.12,'breach']],towers:[[12.8]],gaps:[[8.15,14]],agrav:[[9.45,12.0,'tour',1]],loopc:[[6.4,14,2,1]],
  swing:[[5.6,5,1,.9],[7.0,5,1.05,2],[12.2,5,1,.3]],cannons:[[2.2,1],[13.3,0,1]],stampers:[[13.72,-3.6,0],[13.95,3.6,1.8]],
  ramps:[[2.4,0,9],[9.7,0,8]],pads:[[5.9,-4]],
  boost:[.55,6.4,11.8],boxes:[1.6,4.4,8.0,9.9,13.6],stands:[[.4,18],[8.6,-19]]},
 {name:'Regenbogenpiste',icon:'\u2727',kind:'Sternenstrasse \u00b7 Stampfer \u00b7 Sternschnuppen',medals:[127,133,144],music:'night',bgmRate:1.04,theme:'rainbow',seed:101,
  points:[[0,90],[70,88],[120,52],[108,-2],[128,-52],[96,-96],[36,-104],[-18,-78],[-8,-30],[-52,-8],[-104,-30],[-126,16],[-96,64],[-40,84]],
  loopc:[[6.2,21,2,-1,'curve']],agrav:[[2.05,4.05,'roll',1],[8.85,10.8,'ceiling',1]],coaster:[[10.9,12.95,'hills']],
  hills:[[8.4,5,.03]],gaps:[[4.55,13]],elem:[[.3,1.72,'flug']],stampers:[[5.0,3.6,.9],[13.1,-3.6,0],[13.28,3.6,1.8]],
  ramps:[[1.9,0,9],[8.15,0,8]],pads:[[3.9,-4]],
  meteors:[[4.7,5.85]],boost:[.6,5.4,11.4],boxes:[1.4,4.0,7.9,10.7,.45]},
 // R38: Kirmes-Strecke rund um die Magnet-Achterbahn (Katapult, Top-Hat, Kamelruecken, Bunny-Hop),
 // dazu Looping auf der rechten Geraden und ein Korkenzieher links.
 {name:'Magnet-Kirmes',icon:'❂',kind:'Achterbahn · Magnet-Katapult · Airtime',medals:[119,125,136],music:'race',bgmRate:1.05,theme:'fair',seed:138,
  points:[[0,92],[70,94],[118,66],[132,10],[126,-48],[96,-92],[40,-110],[-30,-112],[-92,-100],[-126,-56],[-122,0],[-90,26],[-104,60],[-60,88]],
  coaster:[[5.45,9.2,'dragon']],loopc:[[12.3,16,1,-1]],elem:[[1.82,4.75,'see',{loop:[2,15,1]}]],agrav:[[9.3,11.3,'roll',1]],
  hills:[[11.9,4,.03]],
  ramps:[[1.4,0,9]],pads:[[12.5,3]],
  boost:[.55,4.7,11.3],boxes:[.8,2.7,4.7,9.0,11.7,13.2],stands:[[.3,18],[4.4,-19]]}];
// ---------- Pilzland (R41): Open World, die die Rennstrecken verbindet. Eine grosse Rundstrasse durch
// Wald, Flussaue, Canyon, Seen und Flugschneisen - an Portalen geht es in jede Rennstrecke, dazu
// Missionen (P-Schalter mit 8 Muenzen, Bojen-Slalom als Boot, Ringflug als Flugzeug). Steht nicht in
// der Rennliste (Grand Prix, Rekorde und Streckenwahl bleiben unberuehrt), sondern unter Index 99.
const WORLD_IDX=99;
const PILZLAND={name:'Pilzland',icon:'🍄',kind:'Open World · Missionen · Portale',medals:[9999,9999,9999],music:'race',theme:'forest',seed:4141,worldR:680,openWorld:true,
 points:[[0,420],[160,400],[300,330],[380,200],[360,60],[420,-80],[380,-220],[260,-320],[120,-380],[-40,-360],[-180,-400],[-320,-320],[-400,-180],[-360,-40],[-420,100],[-360,240],[-240,340],[-110,400]],
 // langer Fluss (Boot an der Oberflaeche, Bojen-Slalom), lange Flugschneise (Ringflug), See mit Tauch-Spirale, zweiter Fluss
 elem:[[1.55,2.95,'bach'],[5.85,7.35,'flug',{fly:26}],[10.95,12.15,'see',{loop:[2,15,1]}],[15.9,17.2,'bach']],
 loopc:[[9.05,16,1,1],[13.9,13,3,-1,'curve']],agrav:[[4.15,4.95,'wallrun',90],[8.1,8.75,'tour',1]],
 hills:[[3.6,5,.01],[9.9,4,.01],[14.8,5,.01]],ramps:[[3.4,0,9],[10.3,0,8]],
 boost:[.3,4.0,8.4,13.2,15.4],boxes:[.6,3.8,5.3,9.5,12.6,14.9,17.5],stands:[[.08,18]],pads:[[3.9,-4],[13.3,4]],
 portals:[[.95,0],[3.15,1],[5.35,2],[8.0,3],[10.55,4],[12.75,5],[15.25,6]],
 pswitch:[[.4,0,'p1'],[5.1,0,'p2'],[10.0,0,'p3'],[14.45,0,'p4']]};
const courseAt=i=>i===WORLD_IDX?PILZLAND:courses[i];
// Streckenlayouts haben sich geaendert (Viadukt, Abzweigungen, Kurvenglaettung) -> alte Rekorde/Geister einmalig verwerfen
const LAYOUT_VER=18;if(store.get('layoutVer',0)!==LAYOUT_VER){try{for(let i=0;i<courses.length;i++){for(const k of ['tt-','medal-','ghost-','bestlap-'])localStorage.removeItem('mr-'+k+i);for(const cc2 of [50,100,150]){localStorage.removeItem('mr-best-'+i+'-'+cc2);localStorage.removeItem('mr-stars-'+i+'-'+cc2);}}}catch(e){}store.set('layoutVer',LAYOUT_VER);}
// Seit R38 je Strecke: nur Strecken mit geaendertem Layout verlieren Rekorde und Geister
// (Geisterhaus und Regenbogenpiste bekamen eine Achterbahn), der Rest bleibt erhalten.
// R39: alle Strecken - Schraeg- und Mehrfach-Loopings, laengere Wand- und Ueberkopffahrten.
const TRACK_VER={0:1,1:1,2:1,3:2,4:1,5:2,6:1};
for(const [i,v] of Object.entries(TRACK_VER))if(store.get('trackVer-'+i,0)!==v){try{for(const k of ['tt-','medal-','ghost-','bestlap-'])localStorage.removeItem('mr-'+k+i);for(const cc2 of [50,100,150]){localStorage.removeItem('mr-best-'+i+'-'+cc2);localStorage.removeItem('mr-stars-'+i+'-'+cc2);}}catch(e){}store.set('trackVer-'+i,v);}
const KART_COLORS=[{c:0xff3b30,n:'Ruby / Rot'},{c:0xffc400,n:'Sunny / Gelb'},{c:0x00c2a8,n:'Mint / Türkis'},{c:0x8b5cff,n:'Nova / Violett'},{c:0xffc93c,n:'Goldpilz',gold:true},
 // R44: Lackierungen, die mit der Fahrerstufe freigeschaltet werden
 {c:0x2f8cff,n:'Blitz / Blau',lvl:2},{c:0xff7a1a,n:'Lava / Orange',lvl:3},{c:0x22c55e,n:'Wald / Grün',lvl:5},{c:0xff5fc8,n:'Bonbon / Pink',lvl:7},{c:0xeef1f6,n:'Diamant / Weiß',lvl:10}];
const progLevel=()=>levelOf(store.get('prog',{xp:0}).xp||0).level;
// Jede Figur faehrt ihr eigenes Kart: Beschleunigung, Hoechsttempo, Grip, Lenkung und Bauform
const DRIVERS=[
 {k:'driver',n:'Pilzi',i:'🍄',kart:'Sporenflitzer',acc:1,top:1,grip:1,turn:1,sc:[1,1,1],tip:'ausgewogen'},
 {k:'driver_turtle',n:'Schildi',i:'🐢',kart:'Panzerwagen',acc:.87,top:1.09,grip:1.07,turn:.93,sc:[1.09,.95,1.05],tip:'schnell, traege'},
 {k:'driver_robot',n:'Volt',i:'🤖',kart:'Voltstoss',acc:1.18,top:.95,grip:1.03,turn:1.03,sc:[.97,1.07,.98],tip:'spurtstark'},
 {k:'driver_cat',n:'Mochi',i:'🐱',kart:'Kurvenkatze',acc:1.05,top:.97,grip:1.02,turn:1.15,sc:[.94,.96,.96],tip:'wendig'}];
const AI_DRIVERS=[0,1,2,3,1,2,3,0];
const AI_NAMES=['Du','Peachy','Bramble','Pip','Luna','Mochi','Sunny','Nori'],AI_COLORS=[0xff4f8b,0x5cc93a,0xffb800,0x7b61ff,0x1fb0ff,0xff7a1a,0x13b39a];
const TRACK_SCALE=1.35,ROAD_HALF=7.6,G=30,G_STICK=74,RAMP_LEN=6.2,RAMP_H=1.15,FAN_COLS=[0xed6350,0xffd45c,0x55bdb2,0xa688dc,0xf1b35a,0xef7160],PLAYER_SLOT=5;
// Weltgroesse (R41): Rennstrecken liegen auf einer Insel mit 210 m Radius, die Open World ist groesser.
// WK skaliert Insel, Meer, Streufelder und Kulisse; AK die Anzahl flaechig gestreuter Deko (hoechstens 4x).
let WK=1,AK=1,hz=null;
const ITEM_ICONS={boost:'⚡',triple:'⚡',shell:'◉',banana:'🍌',shield:'★',bomb:'💣'},ITEM_NAMES={boost:'TURBO',triple:'DREIFACH-TURBO',shell:'SUCH-PANZER',banana:'BANANE',shield:'STERNENSCHILD',bomb:'PILZBOMBE',storm:'GEWITTERWOLKE'};
const ITEM_ART={storm:"<svg viewBox='0 0 48 48'><path d='M14 28a8 8 0 0 1 1-16 11 11 0 0 1 20 2 7 7 0 0 1-1 14z' fill='#5b4f86' stroke='#2b2346' stroke-width='3' stroke-linejoin='round'/><path d='M26 26l-7 10h6l-3 9 10-12h-6l3-7z' fill='#ffe27a' stroke='#b5760c' stroke-width='2' stroke-linejoin='round'/></svg>",empty:"<svg viewBox='0 0 48 48'><path d='M17 17a7 7 0 1 1 9.8 6.4c-1.9.9-2.8 2-2.8 4.1v2' fill='none' stroke='#d8e6dc' stroke-width='5' stroke-linecap='round'/><circle cx='24' cy='37' r='3.2' fill='#d8e6dc'/></svg>",boost:"<svg viewBox='0 0 48 48'><path d='M28 3 10 27h10l-3 18 21-26H27z' fill='#ffe27a' stroke='#b5760c' stroke-width='3' stroke-linejoin='round'/></svg>",triple:"<svg viewBox='0 0 48 48'><path d='M19 4 6 24h7l-2 14 14-18h-7z' fill='#ffe27a' stroke='#b5760c' stroke-width='2.6' stroke-linejoin='round'/><path d='M36 10 25 26h6l-2 12 12-16h-6z' fill='#fff0ad' stroke='#b5760c' stroke-width='2.6' stroke-linejoin='round'/></svg>",shell:"<svg viewBox='0 0 48 48'><path d='M5 34a19 16 0 0 1 38 0z' fill='#8fd8ff' stroke='#1d6c99' stroke-width='3' stroke-linejoin='round'/><path d='M24 18v16M13 23l-3 11M35 23l3 11' stroke='#1d6c99' stroke-width='2.6' fill='none' stroke-linecap='round'/><rect x='4' y='33' width='40' height='7' rx='3.5' fill='#fff4d9' stroke='#1d6c99' stroke-width='3'/></svg>",banana:"<svg viewBox='0 0 48 48'><path d='M10 9c1 15 8 25 27 28-3 4-9 5-14 4C11 39 5 28 6 13z' fill='#ffe45c' stroke='#9a7a12' stroke-width='3' stroke-linejoin='round'/><path d='M8 9c-2-2-4-2-5 0' stroke='#6c5a2a' stroke-width='3.4' fill='none' stroke-linecap='round'/></svg>",shield:"<svg viewBox='0 0 48 48'><path d='M24 3 30 18l16 1-12 10 4 16-14-9-14 9 4-16L2 19l16-1z' fill='#ffe9fb' stroke='#c95bb0' stroke-width='3' stroke-linejoin='round'/><circle cx='24' cy='24' r='4.5' fill='#ff9ee0'/></svg>",bomb:"<svg viewBox='0 0 48 48'><circle cx='21' cy='29' r='15' fill='#3b3546' stroke='#14101c' stroke-width='3'/><path d='M30 16c3-6 8-8 12-5' stroke='#a8764a' stroke-width='4' fill='none' stroke-linecap='round'/><path d='M43 8l2-4 2 4-4 1z' fill='#ffb02e'/><circle cx='43.5' cy='10' r='3.6' fill='#ffd45c'/><ellipse cx='16' cy='24' rx='4' ry='2.6' fill='#6a6478' opacity='.8'/></svg>"};
const ITEM_COL={storm:'#b7a4ff',boost:'#ffd45c',triple:'#ffd45c',shell:'#8fd8ff',banana:'#ffe45c',shield:'#ffb8ec',bomb:'#ff9a6a'};
const MT_COLORS={mini:0x3aa8ff,super:0xff3b2f,ultra:0xd36bff},MT_LABEL={mini:'MINI-TURBO',super:'SUPER-TURBO',ultra:'ULTRA-TURBO'};

let selected=0,colorIndex=0,driverIndex=Math.max(0,Math.min(3,store.get('driver',0)|0)),mode='single',cc=store.get('class',100),state='menu',elapsed=0,countdown=3,last=0,curve,length=1,course,theme,ctx,frame=0,noticeTimer=0,toastTimer=0;
const loopMiss=[];let boxes=[],racers=[],hazards=[],flags=[],balloons=[],puffs=[],shots=[],ramps=[],pads=[],rings=[],spores=[],swingers=[],gaps=[],boostPads=[],sporeMesh=null,crowd=null,boostTex=null,foamRing=null,fireflies=null,rails=[],forks=[],raises=[],tunnels=[],agrav=[],loops=[],crystals=[],coasters=[],ferris=null,dragon=null,elems=[],elemFx=null,owFx=null,worldMode=false,lastRaceSel=0,owPortalAt=null,ridePhoto=null,photoPending=false;
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
const coarseInput=matchMedia('(pointer:coarse)').matches||(TEST&&new URLSearchParams(location.search).has('mobile')),quality={level:0,dprCap:coarseInput?1:1.25,fpsFrames:0,fpsStart:0};
// Leicht-Modus (R44) fuer Handys, "Sparsam" und Geraete, die frueher bis zur untersten Stufe herunterregeln mussten:
// Lambert statt PBR-Material, keine Schatten, kein Scheinwerfer-Punktlicht, halbe Streudeko. Wird nur beim Start
// festgelegt - Materialtyp oder Schatten mitten im Rennen umzuschalten kompiliert jeden Shader neu (Ruckeln in Runde 1).
const liteFor=g=>g==='low'||(g==='auto'&&(coarseInput||store.get('gfxAuto',0)>=3)),LITE=liteFor(store.get('gfx','auto')),DENS=LITE?.5:1;

// ---------------------------------------------------------------- Renderer & Szene
let renderer;try{renderer=new T.WebGLRenderer({canvas:$('game'),antialias:!coarseInput});}catch(e){$('error').hidden=false;$('error').textContent='Dein Browser benötigt WebGL für dieses 3D-Spiel. Bitte Hardwarebeschleunigung aktivieren und die Seite neu laden.';throw e;}
// Shaderfehler nur im Testmodus pruefen: getProgramInfoLog wartet sonst bei jeder Neukompilierung auf den Treiber
if(renderer)renderer.debug.checkShaderErrors=TEST;
renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));renderer.shadowMap.enabled=!LITE;renderer.shadowMap.type=T.PCFShadowMap;if(coarseInput)renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.25,900),worldRoot=new T.Group(),actors=new T.Group();let world=new T.Group();scene.add(worldRoot,actors);worldRoot.add(world);
const hemi=new T.HemisphereLight(0xffffff,0x587540,2);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff7db,3);sun.castShadow=!LITE;sun.shadow.mapSize.set(coarseInput?512:768,coarseInput?512:768);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:360});sun.shadow.bias=-.0006;scene.add(sun,sun.target);
const headlight=new T.PointLight(0xfff0d8,0,30,1.4);if(!LITE)scene.add(headlight);
const fill=new T.DirectionalLight(0xbfd4ff,.45);fill.position.set(-60,40,-90);scene.add(fill);
const shaderTime={value:0};
function radialSprite(stops,scale,pos){const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),g=q.createRadialGradient(64,64,6,64,64,63);for(const [o,col] of stops)g.addColorStop(o,col);q.fillStyle=g;q.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(scale,scale,1);s.position.set(...pos);scene.add(s);return s;}
const sunGlow=radialSprite([[0,'rgba(255,250,230,1)'],[.25,'rgba(255,244,200,.85)'],[1,'rgba(255,244,200,0)']],190,[-320,240,-400]);
const moon=radialSprite([[0,'rgba(255,251,230,1)'],[.45,'rgba(252,243,214,.95)'],[1,'rgba(252,243,214,0)']],95,[230,300,-390]);
const stars=(()=>{const n=700,pos=new Float32Array(n*3);for(let i=0;i<n;i++){const a=Math.random()*TAU,e=Math.acos(Math.random()*.85),r=620;pos[i*3]=Math.sin(e)*Math.cos(a)*r;pos[i*3+1]=Math.cos(e)*r*.9+40;pos[i*3+2]=Math.sin(e)*Math.sin(a)*r;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const p=new T.Points(g,new T.PointsMaterial({color:0xfff6d8,size:2.3,sizeAttenuation:false,fog:false,transparent:true,opacity:.95}));scene.add(p);return p;})();

const mat=(color,extra={})=>stdMat({color,roughness:.8,...extra});
// Standardmaterial bzw. im Leicht-Modus Lambert (gleiche Farben, Texturen, Leuchten, Transparenz; ohne Rauheit/Metall)
function stdMat(p={}){if(!LITE)return new T.MeshStandardMaterial(p);const q={...p};for(const k of ['roughness','metalness','roughnessMap','metalnessMap','envMapIntensity'])delete q[k];return new T.MeshLambertMaterial(q);}
const _lite=new Map();
function toLite(m){if(!LITE||!m||!m.isMeshStandardMaterial)return m;let l=_lite.get(m);if(l)return l;l=new T.MeshLambertMaterial();T.Material.prototype.copy.call(l,m);
 for(const k of ['color','emissive'])l[k].copy(m[k]);for(const k of ['map','alphaMap','emissiveMap','normalMap','bumpMap','lightMap','aoMap','emissiveIntensity','flatShading','fog','wireframe','bumpScale','aoMapIntensity','lightMapIntensity'])if(m[k]!==undefined)l[k]=m[k];
 if(m.normalScale)l.normalScale.copy(m.normalScale);l.userData={...m.userData};if(m.onBeforeCompile!==T.Material.prototype.onBeforeCompile)l.onBeforeCompile=m.onBeforeCompile;_lite.set(m,l);return l;}
function liteRoot(root){if(LITE)root.traverse(o=>{if(o.isMesh||o.isPoints)o.material=Array.isArray(o.material)?o.material.map(toLite):toLite(o.material);});return root;}
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
const KEEP_MATS=new Set(['BodyPaint','CapPaint','StonePaint','MossPaint','WoodPaint','PostPaint','RampPaint','FanCap','GliderPaint','GliderCream','GliderTrim','GliderRope','WindGlow','MagnetPaint','MagnetGlow','TrussPaint','WheelPaint','WheelLights','GondolaPaint','GondolaTrim']);
function mergeByMaterial(root){root.updateMatrixWorld(true);const groups=new Map(),baked=[];let rough=0,metal=0,cnt=0;
 root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const m=o.material,g=o.geometry.clone().applyMatrix4(o.matrixWorld),em=m.emissive&&m.emissiveIntensity>0&&(m.emissive.r+m.emissive.g+m.emissive.b)>.001;
  if(m.name==='Baked'&&g.attributes.color){const n=g.attributes.position.count;baked.push(g);rough+=(m.roughness??.8)*n;metal+=(m.metalness??0)*n;cnt+=n;return;}
  if(!KEEP_MATS.has(m.name)&&!em&&!m.map&&!m.transparent&&m.opacity>=1&&m.color){const n=g.attributes.position.count,col=new Float32Array(n*3);for(let i=0;i<n;i++){col[i*3]=m.color.r;col[i*3+1]=m.color.g;col[i*3+2]=m.color.b;}g.setAttribute('color',new T.BufferAttribute(col,3));baked.push(g);rough+=(m.roughness??.8)*n;metal+=(m.metalness??0)*n;cnt+=n;return;}
  const key=KEEP_MATS.has(m.name)?'n:'+m.name:m.uuid,e=groups.get(key)||{m,g:[]};e.g.push(g);groups.set(key,e);});
 if(baked.length)groups.set('baked',{m:stdMat({name:'Baked',vertexColors:true,roughness:rough/cnt,metalness:Math.min(.35,metal/cnt)}),g:baked});
 const out=new T.Group();for(const e of groups.values()){const mixed=new Set(e.g.map(g=>!!g.index)).size>1;const gs=e.g.map(g=>{g=mixed&&g.index?g.toNonIndexed():g;if(!g.attributes.normal)g.computeVertexNormals();for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal'&&!(k==='uv'&&e.m.map)&&!(k==='color'&&e.m.vertexColors))g.deleteAttribute(k);return g;});const geo=mergeGeometries(gs,false);if(geo)out.add(new T.Mesh(geo,e.m));else for(const g of gs)out.add(new T.Mesh(g,e.m));}return out;}
let loaded=0;const PROTO_FILES=['kart','mushroom','gate','tree','rock','balloon','itembox','banana','shell','ramp','grandstand','spectator','bouncepad','podium','trophy','ghost','gravestone','pumpkin','kartwheel','driver','driver_turtle','driver_robot','driver_cat','glider','crystal','windring','kartkit','coin','clouds'];
// Villa und Burg sind gross und stehen nur auf je einer Strecke: erst nach dem Start nachladen
const LATE_FILES=['mansion','castle','roottree','neongate','magnetarch','coastertruss','ferriswheel','dragon','transform','elements','ow','hazards','landmarks','critters','tower'];
// Ohne Materialverschmelzung laden: der Drache braucht seine Teile (Glied, Kopf, Kiefer, Schwanz) einzeln
const NO_MERGE=new Set(['dragon','transform','elements','ow','kartkit','hazards','landmarks','critters','tower','clouds']);
// R44: weiche Hoehenschattierung als Vertexfarbe (unten dunkler und kuehler, oben hell) - wirkt auch im Leicht-Modus
// und in den Low-Poly-Fassungen, die Lackfarbe je Instanz (Baumkrone, Pilzhut) bleibt erhalten
function shadeGeo(g,lo,hi,nw=.25){const p=g.attributes.position,n=g.attributes.normal,old=g.attributes.color;g.computeBoundingBox();const b=g.boundingBox,h=Math.max(1e-3,b.max.y-b.min.y),c=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){let t=(p.getY(i)-b.min.y)/h*(1-nw)+(n?n.getY(i)*.5+.5:.5)*nw;t=Math.min(1,Math.max(0,t));t=t*t*(3-2*t);for(let k=0;k<3;k++)c[i*3+k]=(lo[k]+(hi[k]-lo[k])*t)*(old?old.getComponent(i,k):1);}
 g.setAttribute('color',new T.BufferAttribute(c,3));}
function shadeProto(root,name,lo,hi,nw){root.traverse(o=>{if(o.isMesh&&o.material&&o.material.name===name){shadeGeo(o.geometry,lo,hi,nw);o.material=o.material.clone();o.material.vertexColors=true;}});return root;}
// Pilz-Unterseite: zeigt nach unten und bekaeme fast nur das gruene Bodenlicht - Normalen schraeg nach aussen/oben biegen,
// damit Lamellen hell wie im Seitenlicht wirken (nur oberhalb von minY, der Stiel bleibt unberuehrt)
function litUnderside(root,minY){const v=new T.Vector3();root.traverse(o=>{const mn=o.material?.name;if(!o.isMesh||(mn!=='Baked'&&mn!=='CapPaint'))return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;if(!n)return;
 for(let i=0;i<p.count;i++)if(n.getY(i)<-.4&&p.getY(i)>minY){const x=p.getX(i),z=p.getZ(i),l=Math.hypot(x,z)||1;v.set(x/l*.7,.45,z/l*.7).normalize();n.setXYZ(i,v.x,v.y,v.z);}n.needsUpdate=true;});return root;}
// Wolken: jede der drei Formen einzeln verschmelzen (eine Geometrie je Form fuer die Instanzierung)
function prepClouds(scene){const out=new T.Group();for(let v=0;v<3;v++){const o=scene.getObjectByName('CL_Cloud'+v);if(!o)continue;let mesh=null;mergeByMaterial(o).traverse(q=>{if(q.isMesh&&!mesh)mesh=q;});if(!mesh)continue;shadeGeo(mesh.geometry,[.74,.79,.9],[1.04,1.04,1.04],.35);mesh.name='CL_Cloud'+v;out.add(mesh);}return out;}
const PREP={tree:r=>shadeProto(r,'CapPaint',[.55,.62,.55],[1.1,1.1,1.02]),mushroom:r=>litUnderside(shadeProto(r,'CapPaint',[.68,.64,.64],[1.06,1.06,1.06],.4),1.9),clouds:prepClouds};
// Asset-Laden robust (R31): schlug eine GLB beim ersten Versuch fehl (Deploy-Propagation,
// Mobile-Netz), blieben die Block-Fallbacks fuer den Rest der Sitzung - Fahrer und Tor
// als Bloeke. Jetzt zwei Wiederholungen mit Abstand, und wenn ein Prototyp nachtraeglich
// doch ankommt, wird die Strecke im Menue neu gebaut.
// Vergleiche den ersten Weltaufbau mit dem spaeteren Ladeabschluss: nur echte
// Wiederherstellung darf Fallback-Welten ersetzen, nicht ein dauerhafter Fehler.
function createPrototypeRecovery(names,prototypes,onRecovered){
 let missing=null,handled=false;
 return {snapshot(){if(missing===null)missing=names.filter(name=>!prototypes[name]);},
  settle(){if(handled||missing===null||!missing.some(name=>!!prototypes[name]))return false;
   handled=true;onRecovered();return true;}};
}
// Leicht-Modus: Low-Poly-Fassungen aus art/r44/make_lod.py (Blender Decimate, gleiche Objekt- und Materialnamen)
const LO_FILES=new Set(['balloon', 'castle', 'rock', 'coastertruss', 'coin', 'dragon', 'driver', 'driver_cat', 'driver_robot', 'driver_turtle', 'elements', 'ferriswheel', 'gate', 'ghost', 'glider', 'grandstand', 'gravestone', 'itembox', 'kart', 'kartkit', 'kartwheel', 'mansion', 'mushroom', 'pumpkin', 'roottree', 'spectator', 'tree', 'clouds']);
function loadProto(name){return new Promise(resolve=>{
 const tryLoad=attempt=>{new GLTFLoader().load(`assets/${LITE&&LO_FILES.has(name)?'lo/':''}${name}.glb`,g=>{let root=NO_MERGE.has(name)?g.scene:mergeByMaterial(g.scene);if(PREP[name])root=PREP[name](root);const merged=liteRoot(root);markShared(merged);P[name]=merged;progress();resolve();},undefined,
  ()=>{if(attempt<2){setTimeout(()=>tryLoad(attempt+1),1200);}else{P[name]=null;progress();resolve();}});};
 tryLoad(0);});}
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
const HC={};function setText(id,v){if(HC[id]!==v){HC[id]=v;const e=$(id);if(e){e.textContent=v;
 // Countdown und Einblendungen springen bei jedem neuen Text kurz auf (R41)
 if(id==='message'&&v){e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');}}}}
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
// Loopings (R39, loop.mjs): Schraeg-Loopings mit einer oder mehreren Windungen. Jede Windung ist
// zur Seite geneigt - Ein- und Ausfahrt ziehen aneinander vorbei statt sich zu schneiden, und die
// Ausfahrt schliesst ohne Sprung an die Strasse an (vorher lag sie 0,34 R vor der Strasse danach).
const sdot=u=>{const t=clamp(u,0,1);return 30*t*t*(1-t)*(1-t);};     // Ableitung von sstep
const _loopState={q:null,th:0,a:0,b:0,lat:0,tf:1,tu:0,tl:0,nf:0,nu:1,k:1,pitch:0};
function loopFrame(q,d){const st=loopFrameAt(q,clamp(lapDist(d-q.s),0,q.span),_loopState);st.q=q;return st;}
// Streckung an dieser Stelle: so viele Bildmeter je Fahrbahnmeter.
function loopStretch(q,st){return st.k;}
// Rollprofil: immer dieselbe Drehrichtung. 'roll' dreht glatt einmal durch; 'wall' und 'over'
// drehen ein, halten den Winkel ein Stueck (Wandfahrt bzw. kopfueber) und drehen dann in
// derselben Richtung bis zur vollen Umdrehung weiter. Eindrehen und wieder Zurueckdrehen war
// der Grund, warum sich das Kart im Korkenzieher verkantete.
// R39: das Profil ist eine Folge aus Drehungen und Haltephasen (loop.mjs) - dazu gekommen sind
// lange Wandfahrt (wallrun), lange Ueberkopffahrt (ceiling), Wandwechsel ueber Kopf (switch) und
// der Rundgang ueber alle vier Seiten (tour).
function rollAt(d){let ph=0;
 for(const q of agrav){const rel=lapDist(d-q.s);if(rel>q.span)continue;ph+=agravRoll(q.seg,rel/q.span)*q.sgn;}
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
// ---------- Magnet-Achterbahn (R38): Katapult und Airtime-Huegel. Wie Rollzone und Looping nur im
// Bild - gefahren wird flach. Profil, Energie und Airtime kommen aus coaster.mjs (ohne Browser getestet).
// ---------- Elemente-Parcours (R39, elem.mjs): See, Tauchgang und Flug. Wie Looping und Achterbahn
// nur im Bild - gefahren wird flach. Das Kart verwandelt sich je nach Element (Boot, Tauchboot, Flugzeug).
function elemAt(d,pad=0){if(!elems.length)return null;for(const z of elems)if(lapDist(d-z.s+pad)<=z.span+2*pad)return z;return null;}
const _est={wl:0,dep:0,fly:0,hide:false,form:'kart',piece:null,z:null};
// Zustand an Streckenmeter d (geteiltes Objekt - Werte sofort uebernehmen)
function elemSt(d){const z=elemAt(d);_est.z=z;if(!z){_est.wl=_est.dep=_est.fly=0;_est.hide=false;_est.form='kart';_est.piece=null;return _est;}elemState(z.plan,lapDist(d-z.s),_est);return _est;}
function elemH(d){const st=elemSt(d);if(!st.z)return 0;const [i,j,k]=tIdx(d);return elemHeight(st,TP.h[i]+(TP.h[j]-TP.h[i])*k,st.z.water);}
function coasterAt(d){if(!coasters.length)return null;for(const c of coasters)if(lapDist(d-c.s)<=c.span)return c;return null;}
const _cpf={h:0,s:0,k:0};
// Profil an Streckenmeter d (geteiltes Objekt - Werte sofort uebernehmen)
function coasterP(d){const c=coasterAt(d);if(!c){_cpf.h=_cpf.s=_cpf.k=0;return _cpf;}return coasterProfile(c.spec,lapDist(d-c.s),_cpf);}
const coasterH=d=>coasters.length?coasterP(d).h:0;
// R39: Twists und Steilkurven. Liefert den Drehwinkel um die Fahrtrichtung und schreibt die Drehachse
// nach out (L = seitlich: Innenkante der Steilkurve, A = Hoehe ueber der Bahn: Korkenzieher um den
// Drachen). Die Steilkurven-Neigung kommt aus der vorab geglaetteten Kruemmung (c.bankArr je Meter).
const _tw={ph:0,axis:0},_rax={L:0,A:0},_rax2={L:0,A:0},_rax3={L:0,A:0};
function coasterRoll(d,out=_rax){out.L=0;out.A=0;const c=coasterAt(d);if(!c)return 0;
 const x=lapDist(d-c.s);twistAt(c.spec,x,_tw);let ph=_tw.ph;
 const ba=c.bankArr;if(ba){const i=Math.max(0,Math.min(ba.length-2,x|0)),f=clamp(x-i,0,1),b=(ba[i]+(ba[i+1]-ba[i])*f)*bankEnvelope(c.spec,x);
  if(Math.abs(b)>1e-5){ph+=b;out.L=bankAxis(b);return ph;}}
 out.A=_tw.axis;return ph;}
// Gesamte Rolle einer Stelle (Rollzone + Achterbahn) - fuer Kart, Kamera, Leitplanken
const rollTot=d=>(agrav.length?rollAt(d):0)+(coasters.length?coasterRoll(d,_rax2):0);
// Magnetbahn allgemein: Rollzone, Looping oder Achterbahn - dort haelt die Bahn, daneben ist nichts
const magOn=()=>agrav.length>0||loops.length>0||coasters.length>0||elems.length>0;
const hasMag=d=>hasRoll(d)||(coasters.length>0&&!!coasterAt(d))||(elems.length>0&&!!elemAt(d));
// Fahrt eines Karts durch die Achterbahn: Einstieg, Katapult (jeder Magnetbogen schiebt genau einmal),
// Magnettempo danach, Airtime an den Kuppen. Rueckgabe: Vorschubfaktor fuer driveKart (Energie aus
// der Hoehe und laengerer Bildweg am Hang). Bergauf wird es langsamer, bergab schneller.
const _cpr={h:0,s:0,k:0};
function coasterRide(r,cz,me){const x=lapDist(r.distance-cz.s);
 if(r.czRun?.c!==cz)r.czRun={c:cz,arch:0,maxOff:0,airHills:0,air:[],hit:false,launched:false,noRating:!cz.spec.hills.length};
 const run=r.czRun;
 while(run.arch<cz.archX.length&&x>=cz.archX[run.arch]){
  const k=launchKick(r.speed);if(k>0){r.vx+=Math.sin(r.h)*k;r.vz+=Math.cos(r.h)*k;r.speed+=k;}
  cz.flash[run.arch]=Math.max(cz.flash[run.arch],me?1:.5);
  if(me){if(run.arch===0){toast('MAGNET-KATAPULT!',1.3,'good');SFX.launch();shake=Math.max(shake,.22);if(!r.saidLaunch){r.saidLaunch=true;say('launch');}}else SFX.zap(run.arch);}
  if(nearPlayer(r,50)){const p=r.mesh.position;for(let i=0;i<8;i++){const a=Math.random()*TAU;emit(p.x,p.y+.6,p.z,0x7cf3ff,Math.sin(a)*4-Math.sin(r.h)*9,1+Math.random()*3,Math.cos(a)*4-Math.cos(r.h)*9,.35);}}
  run.arch++;run.launched=true;}
 // Die Magnetbahn traegt nach dem Abschuss weiter: Hoechsttempo bleibt oben wie auf einer echten Abschussbahn
 if(run.launched&&!r.air&&Math.abs(r.speed)>5)r.boost=Math.max(r.boost,.3);
 if(r.stun>0)run.hit=true;
 run.maxOff=Math.max(run.maxOff,Math.abs(r.offset));
 const p=coasterProfile(cz.spec,x,_cpr),f=coasterSpeedFactor(p),gl=coasterG(p,Math.abs(r.speed)*f.vis);
 r.czG=gl;r.czFloat=r.air?0:airtimeFloat(gl);r.czVis=f.vis;
 // On-Ride-Foto (R38): wie bei echten Achterbahnen blitzt es an der ersten Abfahrt - einmal je Rennen
 if(me&&!ridePhoto&&!photoPending&&state==='race'){const q=cz.spec.hills[0];if(q&&x>q.c+q.w*.12&&x<q.c+q.w*.5)photoPending=true;}
 if(r.czFloat>.04){const hi=cz.spec.hills.findIndex(q=>Math.abs(x-q.c)<q.w*.6);
  if(hi>=0&&!run.air.includes(hi)){run.air.push(hi);run.airHills++;
   if(me){stats.airtime=(stats.airtime||0)+1;toast(run.airHills>1?'AIRTIME ×'+run.airHills+'!':'AIRTIME!',.9,'good');SFX.airtime();}}}
 return f.move;}
// Ausfahrt: nur wer die Zone wirklich am Ende verlaesst (nicht per Rettungspilz), bekommt die Wertung
function coasterExit(r,me){const run=r.czRun;r.czRun=null;r.czFloat=0;r.czG=1;r.czVis=1;
 if(!run||r.finishTime!==null)return;const past=wrapDiff(r.distance,run.c.e);if(past<0||past>40)return;
 const rt=coasterRating(run);if(!rt)return;
 r.boost=Math.max(r.boost,rt.boost);r.spores=Math.min(MAX_SPORES,(r.spores||0)+rt.spores);
 if(me){stats.coasters=(stats.coasters||0)+1;toast(rt.label,1.4,'good');SFX.boost();
  // Ansage nicht jede Runde: erste Super-Wertung und in der letzten Runde
  if(rt.spores>1&&(!r.saidCoaster||lap(r,length)===LAPS)){r.saidCoaster=true;say('coaster');}}}
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
 const bb=TP.b[i]+(TP.b[j]-TP.b[i])*k,hh=TP.h[i]+(TP.h[j]-TP.h[i])*k+(agrav.length?liftAt(d):0)+(coasters.length?coasterH(d):0)+(elems.length?elemH(d):0);
 const ph=(agrav.length?rollAt(d):0)+(coasters.length?coasterRoll(d,_rax):0),cr=Math.cos(ph),sr=Math.sin(ph);
 const qx=tz*cr,qy=sr-bb*cr,qz=-tx*cr;                 // Querachse der Fahrbahn
 let nx=-tz*sr,ny=cr+bb*sr,nz=tx*sr,ax=0,ay=0,az=0;    // Flaechennormale
 // Drehung um eine versetzte Achse (R39): Steilkurve um die Innenkante (L), Korkenzieher um eine
 // Achse ueber der Bahn (A). Bei Rolle 0 ist beides null - kein Sprung an den Zonengrenzen.
 if(coasters.length&&(_rax.L||_rax.A)){const L=_rax.L,A=_rax.A;ax=L*(tz-qx)-A*nx;ay=L*(-bb-qy)+A*(1-ny);az=L*(-tx-qz)-A*nz;}
 const lq=loops.length?loopAt(d):null;
 if(lq){const st=loopFrame(lq,d);
  ax=tx*st.a+tz*st.lat;ay=st.b;az=tz*st.a-tx*st.lat;  // Mittellinie auf den geneigten Tropfen heben
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
function straightSpot(v,before=30,after=80,search=90){const c=cpDist(v);let best=c,bs=1e9;for(let o=-search;o<=search;o+=3){const d=c+o;if(gaps.some(g=>Math.abs(wrapDiff(g.c,d))<after+30)||zones.some(z=>{const w=wrapDiff(d,z.d);return w<z.half+before+5&&w>-z.half-after-5;})||raises.some(q=>{const a0=d-before-8,al=before+after+16;return lapDist(q.s-a0)<al||lapDist(a0-q.s)<lapDist(q.e-q.s);})||forks.some(f=>{const a0=d-before-8,al=before+after+16;return lapDist(f.dA-a0)<al||lapDist(a0-f.dA)<f.span;})||tunnels.some(t=>{const a0=d-before-8,al=before+after+16;return lapDist(t.s-a0)<al||lapDist(a0-t.s)<lapDist(t.e-t.s);})||agrav.some(t=>{const a0=d-before-8,al=before+after+16;return lapDist(t.s-a0)<al||lapDist(a0-t.s)<lapDist(t.e-t.s);})||coasters.some(t=>{const a0=d-before-8,al=before+after+16;return lapDist(t.s-a0)<al||lapDist(a0-t.s)<t.span;}))continue;let m=0;for(let s=-before;s<=after;s+=3)m=Math.max(m,Math.abs(trackAt(d+s).kap));const score=m+Math.abs(o)*.00004;if(score<bs){bs=score;best=d;}}return lapDist(best);}
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
function groundAt(d,off){const tr=trackAt(d);let base=tr.h-off*tr.b;const edge=Math.abs(off)-(Math.abs(off)>8.6&&shoulderOk(d,off)?SHOULDER+.3:8.9);
 // Die Anti-Grav-Bahn schwebt: daneben gibt es keine Boeschung, die abfaellt. Rechnete man sie
 // mit, loeste sich der Haltemagnet sobald das Kart etwas weiter aussen fuhr - es fiel heraus
 // und wurde zurueckgesetzt. Seitlich haelt die Fuehrung, nicht das Gelaende.
 if(magOn()&&hasMag(d))return {y:base,rh:rampAt(d,off)};
 if(theme.space&&edge>1.6){const rh0=rampAt(d,off);return {y:-30,rh:rh0};}   // neben der Bahn ist Leere
 if(edge>.6&&tr.h>2.2&&inBridge(d))base=0;else if(edge>0&&base>0)base=Math.max(0,base-edge/1.5);
 if(worldMode&&edge>0&&base<0)base=0;
 if(Math.abs(off)<30&&inGap(d))base=-30;const rh=rampAt(d,off);return {y:base+(rh?rh.y:0),rh};}
function rampAt(d,off){const dl=lapDist(d);for(const r of ramps){if(Math.abs(off-r.off)<r.w/2&&dl>=r.start&&dl<=r.end)return {y:RAMP_H*(dl-r.start)/RAMP_LEN,ramp:r};}return null;}
function strip(d0,d1,offset,width,lift,uvLen,steps,uvMul=1){const n=steps+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=new Uint32Array(steps*6);for(let i=0;i<n;i++){const d=d0+(d1-d0)*i/steps;for(let s=0;s<2;s++){const p=samplePos(d,offset+(s?1:-1)*width/2,_sp,lift),o=i*2+s;v[o*3]=p.x;v[o*3+1]=p.y;v[o*3+2]=p.z;uv[o*2]=s;uv[o*2+1]=(d-d0)*uvMul/uvLen;}if(i<steps){const a=i*2,q=i*6;idx[q]=a;idx[q+1]=a+2;idx[q+2]=a+1;idx[q+3]=a+1;idx[q+4]=a+2;idx[q+5]=a+3;}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(new T.BufferAttribute(idx,1));g.computeVertexNormals();return g;}
function addStrip(geo,material,shadow=true){const m=new T.Mesh(geo,material);m.receiveShadow=shadow;world.add(m);return m;}
// Strassenabschnitte ohne Schluchten
// Ringpuffer-Filter ueber eine Runde: gleitender Mittelwert (zweimal Kastenfilter = Dreieck) und Maximum
function ringSmooth(a,w){if(w<1)return Float32Array.from(a);const n=a.length;let src=Float32Array.from(a);
 for(let pass=0;pass<2;pass++){const out=new Float32Array(n);let sum=0;for(let j=-w;j<=w;j++)sum+=src[((j%n)+n)%n];
  for(let i=0;i<n;i++){out[i]=sum/(2*w+1);sum+=src[(i+w+1)%n]-src[((i-w)%n+n)%n];}src=out;}return src;}
function ringMax(a,w){const n=a.length,out=new Float32Array(n);for(let i=0;i<n;i++){let m=0;for(let j=-w;j<=w;j++)m=Math.max(m,a[((i+j)%n+n)%n]);out[i]=m;}return out;}
// Hoehenkruemmung der Fahrbahn (1/m) an Streckenmeter d - fuer den Kuppenabsprung
function vcurv(d){const h=x=>{const [i,j,k]=tIdx(x);return TP.h[i]+(TP.h[j]-TP.h[i])*k;};return (h(d+3)-2*h(d)+h(d-3))/9;}
function roadSegments(){const segs=[];let s=0;for(const g of [...gaps].sort((a,b)=>a.start-b.start)){segs.push([s,g.start]);s=g.end;}segs.push([s,length]);let out=segs.filter(([a,b])=>b-a>1);
 for(const z of elems)for(const [a0,b0] of z.hidden)for(const sh of [0,-length]){const a=a0+sh,b=b0+sh;out=out.flatMap(([x,y])=>b<=x||a>=y?[[x,y]]:[[x,a],[b,y]].filter(([p,q])=>q-p>1));}
 return out;}
// Im Looping steckt in einem Fahrbahnmeter ein Vielfaches an Bildmetern: dort feiner unterteilen
// (sonst ist der Kreis ein Vieleck) und die Textur entsprechend strecken.
// R39: auch Achterbahn-Twists feiner rastern (3x) - sonst sind die Vierecke der gedrehten Bahn
// stark verwunden und die Schattierung wird fleckig.
function loopParts(a,b){if(!loops.length&&!coasters.length)return [[a,b,1]];const cuts=[a,b];
 for(const q of loops)for(const e of [q.s,q.s+q.span])for(const c of [lapDist(e),lapDist(e)+length])if(c>a+.5&&c<b-.5)cuts.push(c);
 for(const k of coasters)for(const r of k.spec.rolls)for(const e of [k.s+r.c-r.w-2,k.s+r.c+r.w+2])for(const c of [lapDist(e),lapDist(e)+length])if(c>a+.5&&c<b-.5)cuts.push(c);
 cuts.sort((x,y)=>x-y);const out=[];
 for(let i=0;i<cuts.length-1;i++){const m=(cuts[i]+cuts[i+1])/2,q=loopAt(m),cz=coasterAt(m),tw=cz&&cz.spec.rolls.some(r=>Math.abs(lapDist(m-cz.s)-r.c)<r.w+2);
  out.push([cuts[i],cuts[i+1],q?q.sig*2.1+1:tw?3:1]);}
 return out;}
function stripSegs(offset,width,lift,uvLen,material,shadow=true){for(const [a,b] of roadSegments())for(const [a2,b2,sc] of loopParts(a,b))addStrip(strip(a2,b2,offset,width,lift,uvLen,Math.max(2,Math.ceil((b2-a2)*sc/1.1)),sc),material,shadow);}
function skirt(side,material){const steps=520,v=[],idx=[],hs=[];for(let i=0;i<=steps;i++){const d=length*i/steps,e0=shoulderOk(d,side)?SHOULDER+.3:8.9,s=sample(d,side*e0),h=(inGap(d)||hasMag(d)||(s.p.y>2.2&&inBridge(d)))?0:Math.max(0,s.p.y),b=sample(d,side*(e0+h*1.5+1.2)).p;v.push(s.p.x,s.p.y+.02,s.p.z,b.x,-.5,b.z);hs.push(h);}for(let i=0;i<steps;i++){if(Math.max(hs[i],hs[i+1])<.35||hs[i]===0||hs[i+1]===0)continue;const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,material);m.receiveShadow=true;world.add(m);}
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
 const root=new T.Group(),paints=[stdMat({name:'GliderPaint',color:0xef6c58,roughness:.78,side:T.DoubleSide}),stdMat({name:'GliderCream',color:0xffedc8,roughness:.88,side:T.DoubleSide}),stdMat({name:'GliderTrim',color:0x4fb9ad,roughness:.7,side:T.DoubleSide})];
 const canopy=(x,z)=>2.63+.57*Math.cos(x/2.5*Math.PI/2)+.15*Math.cos(z/.95*Math.PI/2);
 for(let strip=0;strip<10;strip++){const positions=[],indices=[],x0=-2.5+strip*.5;for(let ix=0;ix<=2;ix++)for(let iz=0;iz<=6;iz++){const x=x0+ix*.25,z=-.95+iz*.95/3;positions.push(x,canopy(x,z),z);}for(let ix=0;ix<2;ix++)for(let iz=0;iz<6;iz++){const a=ix*7+iz,b=a+7;indices.push(a,a+1,b,b,a+1,b+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();root.add(new T.Mesh(geo,paints[strip===0||strip===9?2:strip%3===1?1:0]));}
 const cord=stdMat({name:'GliderRope',color:0x285553,roughness:.85});
 for(const side of [-1,1])for(const z of [-.7,.7]){const a=new T.Vector3(side*.7,.92,z*.5),b=new T.Vector3(side*2.08,canopy(side*2.08,z)-.04,z),dir=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(.014,.014,dir.length(),5),cord);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());root.add(m);}
 P._gliderFallback=mergeByMaterial(root);markShared(P._gliderFallback);return P._gliderFallback;}
function attachGlider(kart,color){const g=cloneProto(P.glider||fallbackGlider());g.name='MushroomParaglider';applyTint(g,'GliderPaint',new T.Color(color).lerp(new T.Color(0xffe2b4),.22).getHex());g.visible=false;kart.add(g);kart.userData.glider=g;return g;}
function syncGlider(r,dt,spin){const g=r.mesh.userData.glider;if(!g)return;
 const open=stepGlider(r,dt,{ground:groundAt(r.distance,r.offset).y,blocked:hasRoll(r.distance)||r.finishTime!==null});
 if(!r.glideArmed)r.glideCue=false;
 if(r.id===0&&r.gliding&&!r.glideCue&&state==='race'){r.glideCue=true;SFX.sail();}
 g.visible=open>.012;if(!g.visible)return;
 // Der Schirm bleibt beim Trick aufrecht, waehrend das Kart darunter dreht.
 g.rotation.order='YXZ';g.rotation.set(-r.mesh.rotation.x*.75,-spin,-r.mesh.rotation.z*.65-(r.steerS||0)*.09+Math.sin(elapsed*3+r.id)*.025*open);
 g.scale.set(.09+.91*open,.17+.83*open,.28+.72*open);g.position.y=-1.1*(1-open)+Math.sin(elapsed*4+r.id)*.045*open;
 if(r.id===0&&r.gliding&&!r.gliderSeen&&state==='race'){r.gliderSeen=true;toast('PILZGLEITER!  DRIFT = TRICK',1.3,'good');}}
function kart(color,goldLook=false,dtype=0){let g;if(P.kart){g=new T.Group();const body=cloneProto(kartProto(dtype));applyTint(body,'BodyPaint',color,goldLook?{metalness:.65,roughness:.28}:null);g.add(body);
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
 g.userData={...g.userData,shield,flames,brakes,underglow:ug};attachGlider(g,color);attachTransform(g,color);return g;}
// KI-Karts instanziert: je Bauteil (Karosserie, Lack, Fahrer, Kappe, Raeder) ein Draw-Call fuer alle 7 Karts.
// r.mesh bleibt ein unsichtbares Transform-Geruest (Fahrer-/Rad-Knoten), dessen Weltmatrizen jeden Frame uebertragen werden.
const WHEEL_SLOTS=[[-1,.42,1,1,1],[1,.42,1,1,1],[-1.05,.48,-.9,1.14,1.3],[1.05,.48,-.9,1.14,1.3]];
let kartInst=null,kartPool=null;
const kartsG=new T.Group();actors.add(kartsG);
// Kart je Fahrer (R43): Grundkarosserie plus Blender-Bausatz der Figur (kartkit.glb: Pilzhut-Spoiler,
// Panzerplatten, Raketenbooster, Katzenohr-Fluegel) zu einem Prototyp verschmolzen. Der Bausatz sitzt
// fest an der Karosserie (die alten Box-Anbauteile hingen am Fahrer und schwankten mit ihm mit, bei
// instanzierten KI-Karts lagen sie sogar ohne Versatz im Fahrer) und kostet keinen eigenen Draw-Call.
const kartProtos=new Map();
function kartProto(t){if(!P.kart)return null;const k=DRIVERS[t]?t:0,kit=P.kartkit?.getObjectByName('KX_'+k);if(!kit)return P.kart;
 let p=kartProtos.get(k);if(p)return p;const root=new T.Group();root.add(P.kart.clone(true),kit.clone(true));
 p=mergeByMaterial(root);markShared(p);kartProtos.set(k,p);return p;}
function buildKartInstances(types){kartInst=null;if(!types||!types.length||!P.kart||!P.driver||!P.kartwheel)return;const n=types.length,inst={n,wheel:[],groups:[],bodies:[],dmap:[],bmap:[]};
 const mk=(proto,arr,paint,count)=>proto.traverse(o=>{if(!o.isMesh)return;const isPaint=o.material.name===paint;const m=isPaint?o.material.clone():o.material;if(isPaint)m.color.set(0xffffff);const im=new T.InstancedMesh(o.geometry,m,count);im.frustumCulled=false;im.castShadow=true;im.receiveShadow=true;im.instanceMatrix.setUsage(T.DynamicDrawUsage);if(isPaint)for(let i=0;i<count;i++)im.setColorAt(i,_col.setHex(0xffffff));kartsG.add(im);arr.push({im,paint:isPaint});});
 mk(P.kartwheel,inst.wheel,null,n*4);
 // Karosserien je Fahrertyp (eigener Bausatz), Fahrerfiguren ebenso
 // Fahrerfiguren: je Figurtyp ein Satz Instanzen, damit das Feld gemischt ist
 const seen=new Map();
 types.forEach((t,slot)=>{let gi=seen.get(t);if(gi===undefined){const proto=P[(DRIVERS[t]||DRIVERS[0]).k]||P.driver,meshes=[];mk(proto,meshes,'CapPaint',types.filter(x=>x===t).length);gi=inst.groups.length;inst.groups.push({meshes,used:0});seen.set(t,gi);}
  const gr=inst.groups[gi],br=inst.bodies[gi]||(inst.bodies[gi]=(()=>{const meshes=[];mk(kartProto(t),meshes,'BodyPaint',types.filter(x=>x===t).length);return {meshes,used:0};})());
  inst.dmap[slot]={g:gr,i:gr.used++};inst.bmap[slot]={g:br,i:br.used++};});
 kartInst=inst;}
function kartVirtual(color,slot){const g=new T.Group(),wheels=[];for(const [x,y,z,s,w] of WHEEL_SLOTS){const piv=new T.Group(),wh=new T.Object3D();piv.position.set(x,y,z);wh.rotation.order='YXZ';if(x>0)wh.rotation.y=Math.PI;wh.scale.set(w,s,s);piv.add(wh);g.add(piv);wheels.push({piv,wh,front:z>0,r:y,dir:x>0?-1:1});}
 const driver=new T.Object3D();driver.position.set(0,.95,-.35);g.add(driver);
 const shield=new T.Mesh(shieldGeo,shieldMat);shield.position.y=1;shield.visible=false;g.add(shield);const flames=[-.45,.45].map(x=>{const f=new T.Mesh(flameGeo,flameMat);f.position.set(x,.72,-1.72);f.visible=false;g.add(f);return f;});
 g.userData={parts:{wheels,driver},shield,flames,slot};attachGlider(g,color);attachTransform(g,color);
 const paint=(list,i)=>{for(const p of list)if(p.paint){p.im.setColorAt(i,_col.setHex(color));p.im.instanceColor.needsUpdate=true;}};
 const bm=kartInst.bmap[slot];if(bm)paint(bm.g.meshes,bm.i);const dm=kartInst.dmap[slot];if(dm)paint(dm.g.meshes,dm.i);return g;}
function syncKartInstances(){if(!kartInst)return;for(const r of racers){const u=r.mesh.userData;if(u.slot===undefined)continue;r.mesh.updateMatrixWorld(true);const i=u.slot;
  const bm=kartInst.bmap[i];if(bm)for(const p of bm.g.meshes)p.im.setMatrixAt(bm.i,r.mesh.matrixWorld);const dm=kartInst.dmap[i];if(dm)for(const p of dm.g.meshes)p.im.setMatrixAt(dm.i,u.parts.driver.matrixWorld);u.parts.wheels.forEach((w,k)=>{for(const p of kartInst.wheel)p.im.setMatrixAt(i*4+k,w.wh.matrixWorld);});}
 for(const p of kartInst.wheel)p.im.instanceMatrix.needsUpdate=true;
 for(const gr of kartInst.groups.concat(kartInst.bodies))for(const p of gr.meshes)p.im.instanceMatrix.needsUpdate=true;}
function boostTexture(){return canvasTex(64,128,(q,w,h)=>{q.fillStyle='#ffc93c';q.fillRect(0,0,w,h);q.strokeStyle='#ff5a1f';q.lineWidth=12;q.lineCap='round';for(let y=10;y<h;y+=64){q.beginPath();q.moveTo(8,y+34);q.lineTo(w/2,y+6);q.lineTo(w-8,y+34);q.stroke();}},true);}

const bprof=[];let bprofT=0;const bm=l=>{const n=performance.now();bprof.push([l,+(n-bprofT).toFixed(1)]);bprofT=n;};
let builtSel=-1,worldDirty=true,boxInst=[],boxQ=null,mapBase=null,agravWalls=[],agravGates=[],UG_MAT=null,UG_GEO=null;
// Jede gebaute Strecke bleibt als eigene Szenengruppe im Speicher: Zurueckwechseln = Gruppe tauschen (kein Neubau, kein Upload)
const worldCache=new Map();
const courseState=()=>({world,course,theme,curve,length,TP,cpU,gaps,zones,bats,mapInfo,obsGrid,flags,balloons,ramps,pads,rings,spores,swingers,boostPads,sporeMesh,crowd,fireflies,foamRing,boostTex,startLights,boxes,boxInst,boxQ,mapBase,rails,forks,raises,tunnels,agrav,loops,crystals,coasters,coasterGlow,agravWalls,agravGates,ferris,dragon,elems,elemFx,lakeMask,owFx,hz,trainFx,desert,chr,bg:scene.background,fog:scene.fog,revealed:true});
function loadCourse(c){({world,course,theme,curve,length,TP,cpU,gaps,zones,bats,mapInfo,obsGrid,flags,balloons,ramps,pads,rings,spores,swingers,boostPads,sporeMesh,crowd,fireflies,foamRing,boostTex,startLights,boxes,boxInst,boxQ,mapBase,rails,forks,raises,tunnels,agrav,loops,crystals,coasters,coasterGlow,agravWalls,agravGates,ferris,dragon,elems,elemFx,lakeMask,owFx,hz,trainFx,desert,chr}=c);scene.background=c.bg;scene.fog=c.fog;applyTheme();}
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
// R44: rechtwinklige Kurven im SNES-Stil an ausgewaehlten Kontrollpunkten (course.sharp: [index, Mindestradius, Hilfsabstand]).
// Zwei Hilfspunkte kurz vor und nach der Ecke ziehen die Kurve eng herum; die Radius-Glaettung gilt dort nur abgeschwaecht.
// Die Kontrollpunkt-Positionen der Strecke (cpU) bleiben unberuehrt, alle Bauten sitzen weiter an derselben Stelle.
function smoothCurve(points,minR=24,sharp=[]){const S=TRACK_SCALE,n0=points.length,pts=[],corners=[];
 points.forEach(([x,z],i)=>{const sh=sharp.find(q=>q[0]===i);if(!sh){pts.push([x,z]);return;}const a=points[(i-1+n0)%n0],c=points[(i+1)%n0],k=sh[2]||7,l1=Math.hypot(x-a[0],z-a[1]),l2=Math.hypot(c[0]-x,c[1]-z);
  pts.push([x-(x-a[0])/l1*k,z-(z-a[1])/l1*k],[x,z],[x+(c[0]-x)/l2*k,z+(c[1]-z)/l2*k]);corners.push([x*S,z*S,sh[1]]);});
 const base=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x*S,0,z*S)),true,'catmullrom',.38);base.arcLengthDivisions=3000;
 const n=360;let p=base.getSpacedPoints(n).slice(0,n).map(v=>[v.x,v.z]);
 const rad=(a,b,c)=>{const ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ca=Math.hypot(a[0]-c[0],a[1]-c[1]),ar=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;return ar<1e-6?1e9:ab*bc*ca/(4*ar);};
 const lim=p.map(([x,z])=>{let r=minR;for(const [cx,cz,cr] of corners){const d=Math.hypot(x-cx,z-cz);if(d<34)r=Math.min(r,cr+(minR-cr)*Math.max(0,(d-18)/16));}return r;});
 for(let it=0;it<400;it++){let bad=false;const tight=new Uint8Array(n);for(let i=0;i<n;i++){const r=rad(p[(i-3+n)%n],p[i],p[(i+3)%n]);if(r<lim[i])bad=true;if(r<lim[i]*1.25)for(let k=-8;k<=8;k++)tight[(i+k+n)%n]=1;}if(!bad)break;p=p.map((b,i)=>{if(!tight[i])return b;const a=p[(i-1+n)%n],c=p[(i+1)%n];return [b[0]+((a[0]+c[0])/2-b[0])*.5,b[1]+((a[1]+c[1])/2-b[1])*.5];});}
 const c=new T.CatmullRomCurve3(p.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');c.arcLengthDivisions=4000;return c;}
function buildWorld(){mapBase=null;bprof.length=0;bprofT=performance.now();world=new T.Group();obsGrid=new Map();TP=newTP();swayCache=new Map();
 flags=[];balloons=[];ramps=[];pads=[];rings=[];spores=[];swingers=[];gaps=[];zones=[];bats=null;boostPads=[];sporeMesh=null;crowd=null;fireflies=null;rails=[];forks=[];raises=[];tunnels=[];agrav=[];loops=[];crystals=[];coasters=[];ferris=null;dragon=null;elems=[];elemFx=null;owFx=null;hz=null;
 course=courseAt(selected);theme=THEMES[course.theme];WK=(course.worldR||210)/210;AK=Math.min(WK*WK,4)*DENS;
 scene.background=skyTexture(hex(theme.skyTop),hex(theme.skyBottom));scene.fog=new T.Fog(theme.fog,theme.fogNear,theme.fogFar);applyTheme();
 curve=smoothCurve(course.points,24,course.sharp||[]);length=curve.getLength();bm('clear+theme');buildTable();bm('table');
 cpU=course.points.map(([x,z])=>projectGlobal(x*TRACK_SCALE,z*TRACK_SCALE));
 // Looping: ein kurzes, moeglichst gerades Stueck Fahrbahn wird im Bild zu einem senkrechten
 // Kreis aufgestellt (Radius R, Fussabdruck span). Gefahren wird dabei ganz normal geradeaus -
 // deshalb gibt es keine unfahrbar enge Kurve, keine Selbstkreuzung und keinen Sprung am Ausgang.
 // sig = Bildmeter je Fahrbahnmeter; damit wird der Vorschub gebremst, sonst liefe der Kreis im
 // Zeitraffer. Die geradeste Stelle in der Naehe gewinnt, damit der Kreis nicht verwunden steht.
 // Elemente-Parcours: [cpVon, cpBis, Plan ('see' | 'bach' | 'flug'), {loop:[Windungen, Radius, Seite], depth, fly}]
 for(const [a,b,kind,o={}] of course.elem||[]){const s=cpDist(a),span=lapDist(cpDist(b)-s);
  const lp=o.loop?loopSpec(o.loop[1]*TRACK_SCALE,o.loop[0],o.loop[2]??1):null;
  const plan=elemPlan(kind,span,{loopSpan:lp?lp.span:0,depth:o.depth,fly:o.fly});
  if(!plan.ok)console.warn('Elemente-Zone gestaucht:',course.name,a,b);
  const z={s,span,kind,plan,water:0,hidden:[],lake:kind!=='flug'};
  {let open=-1;const st={};for(let x=0;x<=span+.25;x+=.25){elemState(plan,x,st);if(st.hide&&open<0)open=x;if((!st.hide||x>span)&&open>=0){z.hidden.push([s+open,s+x]);open=-1;}}}
  elems.push(z);
  if(lp&&plan.loopX!==null)loops.push({...lp,s:lapDist(s+plan.loopX),style:'lake'});}
 if(course.loopc){const defs=Array.isArray(course.loopc[0])?course.loopc:[course.loopc];
  // Belegte Abschnitte scheiden aus: Bauwerke, Rollzonen, Achterbahn, Abzweigungen, Schanzen,
  // Tribuenen und die Startgerade - der schraege Looping greift bis ~30 m zur Seite aus.
  const busy=[],cpd=v=>cpDist(v);
  for(const [a,b] of (course.tunnel||[]).concat(course.raise||[],course.plateau?[course.plateau]:[],course.agrav||[],course.coaster||[],course.fork||[]))busy.push([cpd(a)-8,cpd(b)+8]);
  for(const [v,L] of course.gaps||[])busy.push([cpd(v)-L-8,cpd(v)+L+8]);
  for(const [v] of course.ramps||[])busy.push([cpd(v)-50,cpd(v)+34]);   // Anlauf: nach dem Looping erst geradeaus auf die Schanze
  for(const [v] of (course.stands||[]).concat(course.builds||[]))busy.push([cpd(v)-36,cpd(v)+36]);
  for(const v of [course.mansion,course.castle])if(v!==undefined)busy.push([cpd(v)-50,cpd(v)+50]);
  busy.push([length-40,length+36]);
  for(const z of elems)busy.push([z.s-10,z.s+z.span+10]);
  const taken=(d,span)=>busy.some(([a,b])=>lapDist(d+span-a)<lapDist(b-a)+span);
  // [cp Mitte, Radius, Windungen, Neigungsseite, 'straight' | 'curve'] - 'curve' sucht eine Kurve:
  // die Spirale biegt sich dann mit der Strecke (gekruemmte Mehrfach-Spirale)
  for(const [cpv,radC,turns=1,dir=1,style='straight'] of defs){const spec=loopSpec(radC*TRACK_SCALE,turns,dir),span=spec.span,c0=cpd(cpv);
   let s=-1,best=1e9;
   const why={taken:[],curv:[],ok:0};if(loopMiss.length>40)loopMiss.shift();loopMiss.push({track:course.name,cpv,span:Math.round(span),c0:Math.round(c0),why,busy});
   for(let o=-90;o<=90;o+=1){const d=lapDist(c0+o-span/2);if(taken(d,span)){why.taken.push(Math.round(d));continue;}let m=0,sum=0,cnt=0;
    for(let t=-10;t<=span+10;t+=3){const kp=Math.abs(trackAt(d+t).kap);m=Math.max(m,kp);sum+=kp;cnt++;}
    if(m>1/22){why.curv.push(Math.round(1/m));continue;}why.ok++;
    const sc=(style==='curve'?-sum/cnt:m)+Math.abs(o)*2e-5;if(sc<best){best=sc;s=d;}}
   if(s<0){console.warn("Looping findet keinen Platz:",course.name,cpv);continue;}
   busy.push([s-10,s+span+10]);loops.push({...spec,s,style});}
  // Unter und neben den Windungen bleibt es frei: dort stuende Deko sonst mitten in der Bahn
  for(const q of loops){const mid=lapDist(q.s+q.span/2),[mi,mj,mk]=tIdx(mid);
   zones.push({d:mid,half:q.span/2+26,x:TP.x[mi]+(TP.x[mj]-TP.x[mi])*mk,z:TP.z[mi]+(TP.z[mj]-TP.z[mi])*mk,r:26});
   for(let t=-6;t<=q.span+6;t+=9){const d=lapDist(q.s+t),[i,j,k]=tIdx(d);
    zones.push({d,half:0,x:TP.x[i]+(TP.x[j]-TP.x[i])*k,z:TP.z[i]+(TP.z[j]-TP.z[i])*k,r:LOOP.tilt+14});}}}
 // Hoehenprofil: Huegel (Gauss) + Plateau; Ueberhoehung aus der Kruemmung
 // Huegel amplitude gedämpft (x .6): volle Hoehen fuehlten sich als staendiges Ruckeln an und
 // warfen das Kart bei Tempo von der Fahrbahn (Kuppenabsprung) - Flow geht vor Sprunghunger.
 const hills=(course.hills||[]).map(([v,a,w])=>[cpDist(v)/length,a*.6,w]);raises=(course.raise||[]).concat(course.plateau?[[...course.plateau,0]]:[]).map(([a,b,h,r,br])=>({s:cpDist(a),e:cpDist(b),h,r,bridge:!!br}));
 // Ueberhoehung und Kurvenhub aus GEGLAETTETER Kruemmung (R39): die Kruemmung des Streckenzugs
 // schwankt von Stuetzpunkt zu Stuetzpunkt. Roh uebernommen hob und senkte sich die Fahrbahn in
 // jeder Kurvenfolge um bis zu 1,2 m und kippte hin und her - eine Buckelpiste. Jetzt: Neigung ueber
 // +-16 m gemittelt, der Hub (haelt die Innenkante ueber dem Boden) als Maximum ueber +-10 m und
 // dann ueber +-28 m weich verschliffen.
 {const ds=length/PS,bs=ringSmooth(TP.k,Math.round(16/ds)).map(k=>clamp(k*4,-.12,.12)),lift=ringSmooth(ringMax(bs.map(Math.abs),Math.round(10/ds)),Math.round(28/ds));
  for(let i=0;i<PS;i++){const u=i/PS,d=u*length;let h=0;for(const [c,a,w] of hills){let du=u-c;du-=Math.round(du);h+=a*Math.exp(-(du*du)/(w*w));}h+=raiseH(d)+dunesH(d);TP.b[i]=bs[i];TP.h[i]=h+lift[i]*9.8;}}
 for(const [v,L] of course.gaps||(course.gap?[course.gap]:[])){const c=cpDist(v);gaps.push({start:c-L/2,end:c+L/2,c});}
 tunnels=(course.tunnel||[]).map(([a,b,style])=>({s:cpDist(a),e:cpDist(b),style:style||'rock'}));
 // Anti-Grav-Abschnitte: 'wall' kippt bis zum Winkel und zurueck, 'roll' dreht einmal ganz durch, 'flip' geht ueber Kopf
 // hold = Winkel, der in der Mitte der Zone gehalten wird ('over' faehrt kopfueber).
 // Der Sichthub ist fuer alle Bauarten gleich: jede dreht irgendwann durch die Senkrechte,
 // und dort ragt die halbe Fahrbahnbreite nach unten.
 agravWalls=[];agravGates=[];agrav=(course.agrav||[]).map(([a,b,mode,deg])=>{const s=cpDist(a),e=cpDist(b),m=mode||'wall',dg=(deg===undefined?90:deg)*Math.PI/180;
  const hold=m==='over'||m==='flip'?Math.PI:clamp(Math.abs(dg),.35,TAU-.35);
  const md=m==='flip'?'over':m;return {s,e,span:lapDist(e-s),mode:md,hold,seg:agravSegments(md,hold),sgn:dg<0?-1:1,lift:12.5};});
 for(let i=0;i<PS;i++){const d=i/PS*length;TP.rl[i]=rollAt(d);TP.lf[i]=liftAt(d);}
 // Wasserspiegel je See: Gelaende am Zonenbeginn minus ELEM.water. Unter See und Flugbahn keine Deko.
 for(const z of elems){z.water=Math.min(roadRef(z.s,0)+ELEM.water,-.95);     // immer unter der Bodenkante (-0,3)
  for(let x=-8;x<=z.span+8;x+=8){const d=lapDist(z.s+x),[i,j,k]=tIdx(d);zones.push({d,half:0,x:TP.x[i]+(TP.x[j]-TP.x[i])*k,z:TP.z[i]+(TP.z[j]-TP.z[i])*k,r:z.lake?ELEM.lake+8:18});}
  const mid=lapDist(z.s+z.span/2),[mi,mj,mk]=tIdx(mid);zones.push({d:mid,half:z.span/2+12,x:TP.x[mi]+(TP.x[mj]-TP.x[mi])*mk,z:TP.z[mi]+(TP.z[mj]-TP.z[mi])*mk,r:0});}
 // Magnet-Achterbahn (R38): [cpVon, cpBis, Bauart]. Die Katapultstrecke liegt am Anfang, danach die
 // Huegel. archX: Meter ab Zonenbeginn je Magnetbogen; flash: Aufleuchten je Bogen (Bild).
 coasters=(course.coaster||[]).map(([a,b,kind])=>{const s=cpDist(a),e=cpDist(b),span=lapDist(e-s),spec=coasterSpec(kind||'super',span),archX=launchArches(spec,6);
  // Steilkurven: Kruemmung je Meter, ueber +-15 m geglaettet (sonst zuckt die Neigung in S-Kurven)
  let bankArr=null;if(spec.bank){const n=Math.ceil(span)+2,kk=new Float32Array(n);bankArr=new Float32Array(n);
   for(let i=0;i<n;i++)kk[i]=trackAt(s+i).kap;
   for(let i=0;i<n;i++){let a=0,m=0;for(let j=-15;j<=15;j++){const q=i+j;if(q<0||q>=n)continue;const w=1-Math.abs(j)/16;a+=kk[q]*w;m+=w;}bankArr[i]=bankAngle(a/m);}}
  return {s,e,span,spec,archX,bankArr,flash:archX.map(()=>0)};});
 // Unter den Huegeln bleibt es frei - Baeume und Pilze stuenden sonst durch die schwebende Bahn
 for(const c of coasters)for(const q of c.spec.hills){const d=lapDist(c.s+q.c),[mi,mj,mk]=tIdx(d);
  zones.push({d,half:q.w,x:TP.x[mi]+(TP.x[mj]-TP.x[mi])*mk,z:TP.z[mi]+(TP.z[mj]-TP.z[mi])*mk,r:q.w*.7+14});}
 buildForks();
 let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;for(let i=0;i<PS;i+=8){minX=Math.min(minX,TP.x[i]);maxX=Math.max(maxX,TP.x[i]);minZ=Math.min(minZ,TP.z[i]);maxZ=Math.max(maxZ,TP.z[i]);}
 mapInfo={cx:(minX+maxX)/2,cz:(minZ+maxZ)/2,k:Math.min(180/(maxX-minX),140/(maxZ-minZ))};
 bm('heights');const random=rng(course.seed);
 // Boden, Meer, Kuestenschaum
 const grassMat=stdMat({map:speckleTexture(hex(theme.grass),hex(theme.grassSpot),2600),roughness:1});
 if(!theme.space&&elems.some(z=>z.lake))buildLakeGround(grassMat);else if(!theme.space)mesh(new T.CylinderGeometry(210*WK,210*WK-15,12,Math.round(96*Math.sqrt(WK))),grassMat,world,0,-6.3,0).castShadow=false;
 lakeMask=lakeMask&&elems.some(z=>z.lake)?lakeMask:null;buildHazards();buildLandmarks();buildDesert();buildCharacter();if(elems.length)buildElems();if(course.openWorld)buildOW();if(elemFx)buildBuoyInst();
 const seaMat=mat(theme.sea,theme.lavaSea?{roughness:.65,emissive:0xff3a08,emissiveIntensity:.95}:{roughness:.3});seaMat.onBeforeCompile=sh=>{sh.uniforms.uTime=shaderTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying float vWave;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat w=sin(position.x*.035+uTime*1.3)*.8+sin(position.y*.05-uTime*1.1)*.6+sin((position.x+position.y)*.02+uTime*.7)*.9;transformed.z+=w;vWave=w;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWave;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb+=vec3(.10,.15,.15)*smoothstep(.7,2.1,vWave);');};
 const sea=mesh(new T.PlaneGeometry(1800*WK,1800*WK,90,90),seaMat,world,0,-12,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;sea.visible=!theme.space;
 foamRing=mesh(new T.RingGeometry(204*WK,217*WK,Math.round(72*Math.sqrt(WK))),new T.MeshBasicMaterial({color:theme.foam,transparent:true,opacity:.22,depthWrite:false}),world,0,-11.35,0);foamRing.rotation.x=-Math.PI/2;foamRing.castShadow=false;foamRing.visible=!theme.space;
 bm('ground+sea');
 const glow=theme.glow;
 // Randband nur an den Kanten (R39): als volle Flaeche unter dem Asphalt stachen seine schiefen
 // Dreiecke in Twists (16 Grad Drehung je Rasterschritt) bis 60 cm durch die Fahrbahn.
 {const em=mat(theme.edge,glow?{emissive:theme.edge,emissiveIntensity:.35}:{});for(const o of [-8.25,8.25])stripSegs(o,1.3,.04,6,em);}
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
  const rbMat=stdMat({map:rb,emissive:0xffffff,emissiveMap:rb,emissiveIntensity:.7,roughness:.5,metalness:.1,transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide});
  rainbowTex=rb;stripSegs(0,15.2,.065,6,rbMat);}
 else stripSegs(0,15.2,.065,6,stdMat({map:speckleTexture(hex(theme.road),hex(theme.roadSpot),900),roughness:.9}));
 buildShoulder();if(!theme.space){const shM=stdMat({map:speckleTexture(hex(new T.Color(theme.road).lerp(new T.Color(0xffffff),.16).getHex()),hex(theme.roadSpot),900),roughness:.92}),edgeM=stdMat({color:theme.line?new T.Color(theme.line):0xffffff,roughness:.7,...(glow?{emissive:0xffffff,emissiveIntensity:.8}:{})});
  for(const side of [-1,1]){const A=side<0?SHT.L:SHT.R;let a=-1;for(let i=0;i<=SHT.n;i++){const on=i<SHT.n&&A[i];if(on&&a<0)a=i;else if(!on&&a>=0){const d0=a*SHT.ds,d1=i*SHT.ds,st=Math.max(2,Math.ceil((d1-d0)/1.6));addStrip(strip(d0,d1,side*9.9,2.7,.058,6,st),shM);addStrip(strip(d0,d1,side*10.95,.2,.07,6,st),edgeM,false);a=-1;}}}}
const curbTex=canvasTex(8,64,(q)=>{q.fillStyle=theme.curbA;q.fillRect(0,0,8,32);q.fillStyle=theme.curbB;q.fillRect(0,32,8,32);},true);curbTex.magFilter=T.NearestFilter;
 const curbMat=stdMat({map:curbTex,roughness:.7,...(glow?{emissive:0xffffff,emissiveMap:curbTex,emissiveIntensity:.9}:{})});for(const off of [-8.2,8.2])stripSegs(off,.8,.13,8,curbMat);
 const dashTex=canvasTex(8,32,(q)=>{q.fillStyle=theme.line;q.fillRect(0,0,8,16);},true);stripSegs(0,.22,.075,8,stdMat({map:dashTex,alphaTest:.5,roughness:.8,...(glow?{emissive:0xffffff,emissiveMap:dashTex,emissiveIntensity:1}:{})}),false);
 const skirtMat=stdMat({map:speckleTexture(hex(theme.skirt),hex(theme.grassSpot),1800),roughness:1,side:T.DoubleSide});
 if(!theme.space){skirt(-1,skirtMat);skirt(1,skirtMat);}
 // Im Weltall ist die Bahn seit R28 die Glasbahn selbst (DoubleSide, halbtransparent) -
 // die fruehere blickdichte Unterseite haette genau den Blick auf die Sterne verbaut.
 // Anti-Grav: dunkler Kiel unter der Wandfahrt, damit die gekippte Fahrbahn massiv wirkt
 // Textur vor dem Strassenbau: das Energieband der Anti-Grav-Bahn und des Loopings braucht sie,
 // und beide entstehen frueher als die Turbofelder.
 boostTex=boostTexture();
 if(agrav.length){const keelMat=stdMat({color:theme.glow?0x1b1830:0x4c4640,roughness:.95,side:T.DoubleSide});
  const col=theme.glow?0x7cf3ff:0x59d7ff;
  const glowMat=new T.MeshBasicMaterial({color:col,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide});
  const ringMat=new T.MeshBasicMaterial({color:col,side:T.DoubleSide});
  const postMat=mat(0x232c44,{emissive:col,emissiveIntensity:.6,roughness:.5});
  const posts=[],_pv=new T.Vector3();
  // Kristall-Farbton je Strecken-Theme (Material "CrystalPaint" wird getönt, wie Pilzhüte)
  const CTINT={fair:0xffd0f0,forest:0x8ef0c9,canyon:0xffd98a,night:0x7cf3ff,haunted:0xc09aff,lava:0xffab5e,rainbow:0xb09aff};
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
   for(const u of agravRings(q.seg)){const d=lapDist(q.s+span*u),p=posAt(d,0,1.7,new T.Vector3());
    const rg=new T.Mesh(new T.TorusGeometry(4.6,.32,10,30),stdMat({color:col,emissive:col,emissiveIntensity:1.1,roughness:.4}));
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
    else{cm=new T.Mesh(new T.OctahedronGeometry(1.1),stdMat({color:col,emissive:col,emissiveIntensity:1.3,roughness:.3}));cm.scale.y=1.8;}
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
  for(const q of loops){const parts=[],N=Math.max(36,Math.round((q.span+TAU*q.R*q.n)/4.5));let pv=null;
   for(let i=0;i<=N;i++){const d=q.s+q.span*i/N,cu=[posAt(d,-11.2,-.8,new T.Vector3()),posAt(d,11.2,-.8,new T.Vector3())];
    if(pv){bar(parts,pv[0],cu[0],.5);bar(parts,pv[1],cu[1],.5);}
    if(i%3===0)bar(parts,cu[0],cu[1],.34);
    pv=cu;}
   if(parts.length){const m=new T.Mesh(mergeGeometries(parts),steel);m.castShadow=true;m.receiveShadow=true;world.add(m);}
   // Unterseite (R39): von aussen und von unten sah man sonst durch die Fahrbahn hindurch
   {const km=stdMat({color:theme.glow?0x1b1830:0x4c4640,roughness:.9,side:T.DoubleSide});
    const m3=addStrip(strip(q.s+.2,q.s+q.span-.2,0,17.2,-.5,6,Math.ceil(q.span*(q.sig*1.9+1)/1.2),q.sig+1),km);m3.receiveShadow=true;}
   // Leuchtband auf der Fahrbahn, damit der Kreis auch von weitem als Looping lesbar ist
   {const gm=new T.MeshBasicMaterial({color:theme.glow?0x7cf3ff:0xffc14d,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide,map:boostTex||null});
    const m2=addStrip(strip(q.s+.4,q.s+q.span-.4,0,14.6,.09,7,Math.ceil(q.span*(q.sig*1.9+1)/1.2),q.sig+1),gm,false);m2.castShadow=false;}
   for(const d of [q.s+1,q.s+q.span-1]){const s=sample(d,0),g=new T.Mesh(new T.TorusGeometry(12.4,.42,8,24),neon);
    g.position.copy(s.p);g.position.y+=1.1;g.rotation.order='YXZ';g.rotation.y=s.angle;g.castShadow=false;world.add(g);}}}
 buildCoasters();bm('road+skirts');buildGaps();buildMansion();bm('gaps+mansion');
 // Start-Ziel-Tor und Schachbrett
 const start=sample(0),arch=new T.Group();arch.position.copy(start.p);arch.rotation.y=start.angle;world.add(arch);
 if(P.gate){const g=cloneProto(P.gate);applyTint(g,'CapPaint',theme.caps[0]);arch.add(g);}else{box(arch,cream,-9,4,0,.6,8,.6);box(arch,cream,9,4,0,.6,8,.6);box(arch,mat(0xed6350),0,8,0,19,2,.7);}
 for(const side of [-1,1]){const p=sample(0,side*9.3).p;addObstacle(p.x,p.z,1);}
 // Schriftzug schmaler als der Balken (R44): die Pilzhuete der Pfeiler verdeckten sonst das M und das Y
 const bz=P.gate?.26:.37,lw=P.gate?13.4:16;mesh(new T.PlaneGeometry(lw,1.5),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,bz);mesh(new T.PlaneGeometry(lw,1.5),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,-bz).rotation.y=Math.PI;
 const checker=canvasTex(64,16,(q)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){q.fillStyle=(x+y)%2?'#273943':'#fff1d9';q.fillRect(x*4,y*4,4,4);}});checker.magFilter=T.NearestFilter;
 {const panel=new T.Group();panel.position.set(0,5.6,-.75);arch.add(panel);box(panel,dark,0,0,0,5.2,1.5,.3);startLights=[-1.7,0,1.7].map(x=>{const m=stdMat({color:0x220808,emissive:0x000000,roughness:.4});const l=new T.Mesh(new T.SphereGeometry(.5,16,12),m);l.position.set(x,0,-.2);panel.add(l);return m;});lightState=-1;}addStrip(strip(-1.6,1.6,0,15.2,.09,3.2,2),stdMat({map:checker,roughness:.8}));
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
  const fm=new T.Mesh(geo,stdMat({map:ftex,side:T.DoubleSide,roughness:.8}));fm.frustumCulled=false;world.add(fm);
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
  poles.push(new T.BoxGeometry(.12,3.1,.12).translate(0,1.55,0).applyMatrix4(M4));const pg=new T.PlaneGeometry(1.5,.7,5,1),n=pg.attributes.position.count,xn=new Float32Array(n),dx=new Float32Array(n),dz=new Float32Array(n),cc=new Float32Array(n*3);col.setHex((course.pennants||theme.pennants)?(course.pennants||theme.pennants)[i%2]:(glow?(i%2?0xff3cac:0x2de2e6):(i%2?0xed6350:0xffd45c)));
  for(let v=0;v<n;v++){xn[v]=(pg.attributes.position.getX(v)+.75)/1.5;dx[v]=Math.sin(s.angle);dz[v]=Math.cos(s.angle);cc[v*3]=col.r;cc[v*3+1]=col.g;cc[v*3+2]=col.b;}pg.translate(.81,2.75,0).applyMatrix4(M4);pg.setAttribute('color',new T.BufferAttribute(cc,3));pg.userData={xn,dx,dz};pens.push(pg);}
 if(poles.length){world.add(new T.Mesh(mergeGeometries(poles),cream));const geo=mergeGeometries(pens);const xn=new Float32Array(geo.attributes.position.count),dx=xn.slice(),dz=xn.slice();let o=0;for(const pg of pens){xn.set(pg.userData.xn,o);dx.set(pg.userData.dx,o);dz.set(pg.userData.dz,o);o+=pg.userData.xn.length;}geo.attributes.position.setUsage(T.DynamicDrawUsage);
  const penMesh=new T.Mesh(geo,glow?new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}):stdMat({vertexColors:true,side:T.DoubleSide,roughness:.8}));penMesh.frustumCulled=false;world.add(penMesh);flags.push({mesh:penMesh,base:geo.attributes.position.array.slice(),xn,dx,dz});}}
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
function resetRace(){ridePhoto=null;photoPending=false;clearGroup(actors,kartsG);hazards=[];shots=[];bombs=[];stormFx=[];fworks=[];for(const sh of shocks){sh.t=9;sh.m.visible=false;}roulette=null;cer=null;shake=0;lastPlace=8;leadAt=-99;wrongT=0;
 for(let i=0;i<SKIDS;i++){skids[i].life=0;skidMesh.setMatrixAt(i,_zeroM);}skidMesh.instanceMatrix.needsUpdate=true;for(let i=0;i<SPARKS;i++){sparkPool[i].life=0;sparkMesh.setMatrixAt(i,_zeroM);}sparkMesh.instanceMatrix.needsUpdate=true;for(let i=0;i<PUFFS;i++){puffPool[i].life=0;puffMesh.setMatrixAt(i,_zeroM);}puffMesh.instanceMatrix.needsUpdate=true;
 for(const b of boxes)b.cooldown=0;for(const s of spores)s.cd=0;for(const r of rings)r.flash=0;for(const p of pads)p.squash=0;lightState=-2;setLights(0);
 placeRacers();drawMap();}
// Shader aller selten sichtbaren Effekte vorab kompilieren (Flammen, Schild, Banane, Panzer), sonst ruckelt der erste Einsatz
// Shader im Hintergrund kompilieren (KHR_parallel_shader_compile); bis dahin bleibt die Strecke ausgeblendet statt das Bild einzufrieren
let buildToken=0,worldReady=true,readyPromise=Promise.resolve();
// Ausgeblendete Kartteile (Boot, Tauchboot, Flugzeug, Schild, Gleiter) ueberging die allgemeine
// Vorkompilierung - beim ersten Auftauchen im Rennen kompilierte der Browser die Shader und das
// Bild stockte (nur in Runde 1). Kurz einblenden, im Hintergrund kompilieren, wieder ausblenden.
function warmKarts(){showHidden(kartsG,()=>{try{renderer.compileAsync(kartsG,camera,scene).catch(()=>{});}catch(e){}});initTextures(kartsG);}
// R44: dasselbe fuer die ganze Strecke - Drache (erst in seiner Zone sichtbar), Boots-/Tauch-/Flugteile,
// Unterwasser-Deko und Missionsteile kompilierten sonst erst beim ersten Auftauchen (Profil Magnet-Kirmes:
// BoatGlass bei 149 m, DragonFin bei 220 m, je 130-200 ms Standbild in Runde 1).
function showHidden(root,fn){const hidden=[];root.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}});try{fn();}finally{for(const o of hidden)o.visible=false;}}
// Texturen vorab hochladen (sonst beim ersten Sichtkontakt mitten im Rennen)
function initTextures(root){const seen=new Set();root.traverse(o=>{if(!o.material)return;for(const m of [].concat(o.material))if(m)for(const k of ['map','alphaMap','emissiveMap','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[k]&&!seen.has(m[k])){seen.add(m[k]);try{renderer.initTexture(m[k]);}catch(e){}}});}
function warmup(){const tmp=new T.Group(),add=o=>{o.traverse(c=>{c.visible=true;c.frustumCulled=false;});tmp.add(o);};add(new T.Mesh(flameGeo,flameMat));add(new T.Mesh(shieldGeo,shieldMat));add(bombMesh());add(new T.Mesh(shockGeo,shocks[0].m.material));if(P.banana)add(cloneProto(P.banana));if(P.shell)add(cloneProto(P.shell));if(P.ghost)add(cloneProto(P.ghost));
 tmp.position.copy(camera.position);scene.add(tmp);const tok=++buildToken;let p;showHidden(world,()=>{try{p=renderer.compileAsync(scene,camera);}catch(e){p=Promise.resolve();}});scene.remove(tmp);initTextures(world);
 worldReady=false;world.visible=false;actors.visible=false;$('trackLoading').hidden=false;
 readyPromise=Promise.race([p,new Promise(r=>setTimeout(r,8000))]).then(()=>{if(tok!==buildToken)return;worldReady=true;actors.visible=true;startReveal();$('trackLoading').hidden=true;});}

// Rivale (R46): rotes Schild ueber seinem Kart, Anzeige im HUD, Bonus im Ergebnis
let rivalId=null,rivalSprite=null;
function rivalMark(){if(rivalSprite)return rivalSprite;const c=document.createElement('canvas');c.width=256;c.height=88;const q=c.getContext('2d');
 q.fillStyle='#15133a';q.beginPath();q.roundRect(6,6,244,62,20);q.fill();q.fillStyle='#e8202a';q.beginPath();q.roundRect(12,10,232,50,16);q.fill();
 q.beginPath();q.moveTo(112,66);q.lineTo(144,66);q.lineTo(128,84);q.closePath();q.fillStyle='#15133a';q.fill();
 q.font='italic 900 34px Rubik,"Trebuchet MS",sans-serif';q.textAlign='center';q.textBaseline='middle';q.lineJoin='round';q.lineWidth=7;q.strokeStyle='#15133a';q.strokeText('⚔ RIVALE',128,36);q.fillStyle='#fff';q.fillText('⚔ RIVALE',128,36);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;rivalSprite=new T.Sprite(new T.SpriteMaterial({map:t,depthWrite:false}));rivalSprite.scale.set(2.9,1,1);rivalSprite.visible=false;rivalSprite.renderOrder=5;scene.add(rivalSprite);return rivalSprite;}
function updateRival(){const on=rivalId!==null&&(state==='race'||state==='countdown')&&racers[rivalId];const sp=rivalSprite||(on?rivalMark():null);if(!sp)return;
 if(!on){sp.visible=false;return;}const r=racers[rivalId],p=r.mesh.position,me=racers[0];sp.visible=r.mesh.visible&&Math.hypot(me.x-r.x,me.z-r.z)<130&&r.finishTime===null;
 if(sp.visible){const sc=r.mesh.scale.y||1,k=clamp(camera.position.distanceTo(p)/22,1,2.2);sp.scale.set(2.9*k,k,1);sp.position.set(p.x,p.y+3.1*sc+.4*k+(r.stun>0?.5:0),p.z);}}
function placeRacers(){const cls=CLASSES[cc];racers=[];
 const order=isTT()?[0]:[1,2,3,4,5,0,6,7],ai=order.filter(id=>id!==0);
 // Karts bleiben zwischen Rennen stehen, solange Figur/Farbe/Feldgroesse gleich sind: spart Aufbau und Upload
 // Ladezustand mit in die Signatur: sonst bleiben notgebaute Karts im Zwischenspeicher haengen
 const sig=[order.length,colorIndex,driverIndex,KART_COLORS[colorIndex].gold?1:0,AI_DRIVERS.join(''),P.kart?1:0,P.driver?1:0,P.kartwheel?1:0,P.glider?1:0,P.transform?1:0,P.kartkit?1:0].join('|');
 const reuse=!!kartPool&&kartPool.sig===sig&&kartPool.meshes.length===order.length;
 if(!reuse){clearGroup(kartsG);kartInst=null;kartPool=null;buildKartInstances(isTT()?null:ai.map(id=>AI_DRIVERS[id]));}// Startplatz 6 fuer den Spieler: der Sieg muss erfahren werden
 for(let s=0;s<order.length;s++){const id=order[s],r=racer(id,AI_NAMES[id],id===0?KART_COLORS[colorIndex].c:AI_COLORS[id-1]);const d=-(9+Math.floor(s/2)*7.5+(s%2)*3),off=s%2?-3.3:3.3,p=sample(d,off);r.x=p.p.x;r.z=p.p.z;r.h=p.angle;r.distance=d;r.offset=off;r.safeD=d;
  const dv=DRIVERS[id===0?driverIndex:AI_DRIVERS[id]]||DRIVERS[0];
  r.mAcc=dv.acc;r.mTop=dv.top;r.mGrip=dv.grip;r.mTurn=dv.turn;r.kartScale=dv.sc;
  r.skill=clamp(cls.skill+(7-id)*.012+(id%3-1)*.02,.3,.98);r.laneBias=((id*37)%11-5)*.3;r.driftCd=0;r.aiDrift=0;
  if(reuse){r.mesh=kartPool.meshes[s];const u=r.mesh.userData;if(u.shield)u.shield.visible=false;if(u.glider)u.glider.visible=false;resetTransform(u);if(u.flames)for(const f of u.flames)f.visible=false;r.mesh.visible=true;r.mesh.scale.setScalar(1);}
  else{r.mesh=id===0||!kartInst?kart(r.color,id===0&&KART_COLORS[colorIndex].gold,id===0?driverIndex:AI_DRIVERS[id]):kartVirtual(r.color,ai.indexOf(id));kartsG.add(r.mesh);}
  racers[id]=r;}
 if(!reuse){kartPool={sig,meshes:order.map(id=>racers[id].mesh)};warmKarts();}
 // Rivale (R46): einer aus den ersten drei Startplaetzen, faehrt etwas besser als sein Klassenwert
 rivalId=isTT()||worldMode?null:pickRival(ai);if(rivalId!==null)racers[rivalId].skill=Math.min(.98,racers[rivalId].skill+.1);
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
 for(const q of raises){if(!q.bridge)continue;const span=lapDist(q.e-q.s),segs=[];let a=-1;for(let o=0;o<=span;o+=1){const d=q.s+o,top=trackAt(d).h>2.2&&!hasMag(d);if(top&&a<0)a=d;if((!top||o+1>span)&&a>=0){segs.push([a,d]);a=-1;}}
  for(const [d0,d1] of segs){const steps=Math.ceil((d1-d0)/1.2);addStrip(strip(d0,d1,0,18.8,-1.2,6,steps),deckMat);const walls=[wallStrip(d0,d1,-9.4,-1.2,.12,steps),wallStrip(d0,d1,9.4,-1.2,.12,steps)];const wm=new T.Mesh(mergeGeometries(walls),deckMat);wm.castShadow=true;world.add(wm);
   const pg=[];for(let d=d0+5;d<d1-2;d+=14){const h=trackAt(d).h-1.2;if(h<1.8)continue;for(const side of [-1,1]){const p=samplePos(d,side*5.8,new T.Vector3());if(nearOtherRoad(p.x,p.z,d,11.5))continue;pg.push(new T.BoxGeometry(1.5,h,1.5).translate(p.x,h/2,p.z));addObstacle(p.x,p.z,1.15,h-.2);}}
   if(pg.length){const pm=new T.Mesh(mergeGeometries(pg),pillarMat);pm.castShadow=true;pm.receiveShadow=true;world.add(pm);}}}}
// ---------- Leitplanken: aussen an kritischen Kurven und beidseitig auf erhoehten Abschnitten. Weiche Gleit-Kollision statt Stopp.
const RAIL_OFF=9.2,RAIL_LIMIT=8.05,RAIL_COL={forest:['#e8352e','#ffffff',0x5a6470],canyon:['#ffd23f','#2b1d24',0x5a3a2a],night:['#2de2e6','#ff3cac',0x22204a],haunted:['#8a5cff','#1a1426',0x2e2840],lava:['#ff5a1f','#1a1012',0x3a2a2a],fair:['#ff3b6b','#ffe45c',0x3a2c62]};
function railBlocked(d,side){if(inGap(d)||Math.abs(wrapDiff(d,0))<16)return true;
 // Im Looping und an seiner Anfahrt keine Planken: die Bahn kreuzt sich dort selbst, die Planken
 // der Geraden lägen quer im Kreis. Stattdessen haelt der Seitenmagnet das Kart auf der Bahn.
 if(loops.length)for(const q of loops)if(lapDist(d-q.s+20)<q.span+40)return true;
 if(elems.length&&elemAt(d,20))return true;
 if(hasMag(d))return false;const fk=forkAt(d,14);return !!fk&&side===fk.f.side;}
function buildRails(){const list=[],ds=2;
 const scan=(test,kind,sides)=>{let a=-1,sd=0;for(let d=0;d<=length+ds;d+=ds){const s=test(d),ok=s!==0&&!railBlocked(d,s);if(ok&&a<0){a=d;sd=s;}else if(a>=0&&(!ok||s!==sd)){if(d-a>6)for(const x of sides(sd))list.push({d0:a-8,d1:d+8,side:x,kind});a=ok?d:-1;sd=s;}}};
 // Flow (R39): Planken schon ab 65 m Kurvenradius und beidseitig in jeder Landezone - wer nach
 // einem Sprung in die Kurve kommt, gleitet an der Planke entlang statt ins Gras zu fliegen
 scan(d=>{const k=trackAt(d).kap;return Math.abs(k)>1/65?(k>0?-1:1):0;},'corner',s=>[s]);
 scan(d=>ramps.some(rp=>{const a=wrapDiff(d,rp.end);return a>4&&a<48;})&&!inGap(d)?1:0,'high',()=>[-1,1]);
 scan(d=>raiseH(d)>2&&!inGap(d)?1:0,'high',()=>[-1,1]);
 scan(d=>inTunnel(d)?1:0,'high',()=>[-1,1]);
 scan(d=>hasMag(d)?1:0,'high',()=>[-1,1]);
 scan(d=>inZone(d,2)?1:0,'high',()=>[-1,1]);
 list.sort((a,b)=>a.side-b.side||a.d0-b.d0);for(const r of list){const last=rails[rails.length-1];if(last&&last.side===r.side&&r.d0<=last.d1+6){last.d1=Math.max(last.d1,r.d1);if(r.kind==='high')last.kind='high';}else rails.push({...r});}
 // Planke an die Aussenkante der Auslaufzone, wenn diese dort ueberwiegend vorhanden ist
 for(const r of rails){let on=0,all=0;for(let d=r.d0;d<=r.d1;d+=2){all++;if(shoulderOk(d,r.side))on++;}const wide=all&&on/all>.7;r.off=wide?SHOULDER+.6:RAIL_OFF;r.lim=wide?SHOULDER-.55:RAIL_LIMIT;}
 rails=rails.filter(r=>{for(let d=r.d0;d<=r.d1;d+=3)if(inGap(d))return false;return true;});
 if(!rails.length)return;const [ca,cb,postCol]=RAIL_COL[course.theme]||RAIL_COL.forest;
 const tex=canvasTex(64,16,(q,w,h)=>{q.fillStyle=ca;q.fillRect(0,0,w,h);q.fillStyle=cb;for(let x=-16;x<w;x+=32){q.beginPath();q.moveTo(x,h);q.lineTo(x+16,0);q.lineTo(x+32,0);q.lineTo(x+16,h);q.fill();}q.fillStyle='#0003';q.fillRect(0,h-3,w,3);},true);
 const band=stdMat({map:tex,roughness:.45,metalness:.25,side:T.DoubleSide,...(theme.glow?{emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.55}:{})});
 const geos=[],posts=[];for(const r of rails){const steps=Math.max(2,Math.ceil((r.d1-r.d0)/1.6)),n=steps+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];
 for(let i=0;i<n;i++){const d=r.d0+(r.d1-r.d0)*i/steps,p=samplePos(d,r.side*(r.off||RAIL_OFF),_sp);v.set([p.x,p.y+.3,p.z,p.x,p.y+.84,p.z],i*6);uv.set([(d-r.d0)/2.2,0,(d-r.d0)/2.2,1],i*4);if(i<steps){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}if(i%2===0)posts.push([p.x,p.y,p.z,d]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();geos.push(g);}
 const bm2=new T.Mesh(mergeGeometries(geos),band);bm2.castShadow=true;world.add(bm2);
 const pi=new T.InstancedMesh(new T.BoxGeometry(.14,1.5,.14),mat(postCol,{roughness:.6,metalness:.3}),posts.length);posts.forEach(([x,y,z,d],i)=>{const t=tanAt(d);_e.set(0,Math.atan2(t.x,t.z),rollTot(d),'YXZ');_q.setFromEuler(_e);_m.compose(_v.set(x,y+.1,z),_q,_s.set(1,1,1));pi.setMatrixAt(i,_m);});pi.castShadow=true;world.add(pi);}
function railCollide(r,me){if(!rails.length)return;
 // In Roll- und Loopzonen haelt die Fuehrung; zwei Korrektursysteme wuerden gegeneinander arbeiten
 if((agrav.length||loops.length)&&hasRoll(r.distance))return;
 const dl=lapDist(r.distance);for(const rl of rails){if(lapDist(dl-rl.d0)>rl.d1-rl.d0)continue;const so=r.offset*rl.side,lim=rl.lim||RAIL_LIMIT;if(so<lim||so>lim+6)continue;if((r.y||0)>groundAt(r.distance,r.offset).y+1.5)continue;
  const t=tanAt(r.distance),nx=-rl.side*t.z,nz=rl.side*t.x,pen=so-lim;r.x+=nx*pen;r.z+=nz*pen;r.offset=rl.side*lim;
  const vn=r.vx*nx+r.vz*nz;if(vn<0){r.vx-=nx*vn*1.0;r.vz-=nz*vn*1.0;const loss=Math.min(.08,-vn*.006);r.vx*=1-loss;r.vz*=1-loss;if(-vn>7){r.combo=0;if(me){shake=Math.max(shake,Math.min(.28,-vn*.018));SFX.bump(clamp(-vn/26,.2,.8));stats.bumps++;}}}
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
// R44: Auslaufzone - beidseitig befestigter Randstreifen von 8,6 bis 11,2 m, zaehlt als Fahrbahn (Platz zum Driften;
// Planken in Kurven stehen an seiner Aussenkante). Nicht auf Bruecken, an Luecken, in Loopings, Roll-, Wasser-, Flug- und
// Achterbahnzonen, nicht auf der Abzweigseite und nicht am Start-Ziel-Tor (Pfeiler). Tabelle in 2-m-Schritten je Seite.
const SHOULDER=11.2;let SHT=null;
function buildShoulder(){const ds=2,n=Math.ceil(length/ds),L=new Uint8Array(n),R=new Uint8Array(n);SHT={ds,n,L,R};if(theme.space)return;
 for(let i=0;i<n;i++){const d=i*ds;if(inGap(d)||inGap(d-6)||inGap(d+6)||(agrav.length&&hasMag(d))||raiseH(d)>.3||raiseH(d-16)>.3||raiseH(d+16)>.3||coasterH(d)>.4||elemAt(d,14)||Math.abs(wrapDiff(d,0))<10)continue;
  if(loops.length&&loops.some(q=>lapDist(d-q.s+24)<q.span+48))continue;const fk=forkAt(d,16);L[i]=fk&&fk.f.side<0?0:1;R[i]=fk&&fk.f.side>0?0:1;}
 // kurze Stuecke (unter 12 m) weglassen - kein Flackern zwischen breit und schmal
 for(const A of [L,R]){let a=-1;for(let i=0;i<=n;i++){const on=i<n&&A[i];if(on&&a<0)a=i;else if(!on&&a>=0){if(i-a<6)A.fill(0,a,i);a=-1;}}}}
function shoulderOk(d,off){if(!SHT)return false;const i=Math.floor(lapDist(d)/SHT.ds)%SHT.n;return (off<0?SHT.L:SHT.R)[i]===1;}
function onRoad(d,off){const a=Math.abs(off);return a<8.6||forkBand(d,off)||(a<SHOULDER&&shoulderOk(d,off));}
function nearFork(x,z,dist){for(const f of forks)for(let i=0;i<f.pts.length;i+=3){const p=f.pts[i];if(Math.abs(p.x-x)<dist&&Math.abs(p.z-z)<dist&&Math.hypot(p.x-x,p.z-z)<dist)return true;}return false;}
function polyStripVar(pts,i0,i1,fn,lift,uvLen){const n=i1-i0+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];let acc=0;
 for(let i=0;i<n;i++){const p=pts[i0+i];if(i)acc+=Math.hypot(p.x-pts[i0+i-1].x,p.z-pts[i0+i-1].z);const e=fn(p,i/(n-1)),lx=p.tz,lz=-p.tx;
  for(let s=0;s<2;s++){const o=e.c+(s?1:-1)*e.w/2;v.set([p.x+lx*o,p.y+lift,p.z+lz*o],(i*2+s)*3);uv.set([s,acc/uvLen],(i*2+s)*2);}
  if(i<n-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function polyStrip(pts,i0,i1,center,width,lift,uvLen){const n=i1-i0+1,v=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];let acc=0;for(let i=0;i<n;i++){const p=pts[i0+i];if(i)acc+=Math.hypot(p.x-pts[i0+i-1].x,p.z-pts[i0+i-1].z);const lx=p.tz,lz=-p.tx;for(let s=0;s<2;s++){const o=center+(s?1:-1)*width/2;v.set([p.x+lx*o,p.y+lift,p.z+lz*o],(i*2+s)*3);uv.set([s,acc/uvLen],(i*2+s)*2);}if(i<n-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function buildForkVisuals(){if(!forks.length)return;const glow=theme.glow,po={polygonOffset:true,polygonOffsetFactor:3,polygonOffsetUnits:3};
 const edgeM=mat(theme.edge,{...po,...(glow?{emissive:theme.edge,emissiveIntensity:.35}:{})}),roadM=stdMat({map:speckleTexture(hex(theme.road),hex(theme.roadSpot),900),roughness:.9,...po});
 const curbTex=canvasTex(8,64,(q)=>{q.fillStyle=theme.curbA;q.fillRect(0,0,8,32);q.fillStyle=theme.curbB;q.fillRect(0,32,8,32);},true);curbTex.magFilter=T.NearestFilter;const curbM=stdMat({map:curbTex,roughness:.7,...(glow?{emissive:0xffffff,emissiveMap:curbTex,emissiveIntensity:.9}:{})});
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
 lava:{wall:0x2a1a18,spot:0x3f2420,rim:0xff5a1f,lamp:0xffb347,glow:1.8,rings:1,label:'MAGMASCHACHT'},
 // R44: befahrbare Roehre (gruen, goldene Baender)
 pipe:{wall:0x1b7a36,spot:0x22903f,rim:0x33c95a,lamp:0xffd84a,glow:1.1,rings:1,label:'ROEHRE'},
 // R44: Mauerdurchbruch in den Burgturm (Basalt, Fackelschein)
 breach:{wall:0x2c2022,spot:0x3e2c2c,rim:0x5a403c,lamp:0xff7a1a,glow:1.3,rings:0,label:'TURM'}};
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
  const wallMat=stdMat({map:speckleTexture(hex(st.wall),hex(st.spot),1500),roughness:.95,side:T.DoubleSide,emissive:st.wall,emissiveIntensity:.45});
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
// ---------- Magnet-Achterbahn (R38): Kastentraeger unter der Bahn, zwei leuchtende Magnetschienen,
// Fachwerkstuetzen (Blender-Segment, gestapelt statt gestreckt) unter den Huegeln und
// Hufeisen-Magnetboegen ueber der Katapultstrecke. Alles haengt an posAt, folgt also exakt der
// gezeichneten Fahrbahn. Die Pol-Leuchten aller Boegen sind EINE Instanz-Gruppe (Farbe je Bogen).
let coasterGlow=null;
function buildCoasters(){coasterGlow=null;if(!coasters.length)return;
 const glow=theme.glow,col=theme.coasterCol??(glow?0x3b2a7a:0xd8433a),mag=theme.magGlow??(glow?0x7cf3ff:0x4fd8ff);
 const steel=mat(col,{roughness:.42,metalness:.45,side:T.DoubleSide}),under=mat(glow?0x1b1830:0x353a46,{roughness:.6,metalness:.5,side:T.DoubleSide});
 const railMat=new T.MeshBasicMaterial({color:mag}),_d=new T.Vector3(),_mid=new T.Vector3(),_qq=new T.Quaternion(),_mm=new T.Matrix4(),_ux=new T.Vector3(1,0,0),_sc=new T.Vector3();
 const bar=(list,p0,p1,w,h=w)=>{const len=p0.distanceTo(p1);if(len<.05)return;_d.subVectors(p1,p0).divideScalar(len);_mid.addVectors(p0,p1).multiplyScalar(.5);
  _qq.setFromUnitVectors(_ux,_d);_mm.compose(_mid,_qq,_sc.set(len,h,w));list.push(new T.BoxGeometry(1,1,1).applyMatrix4(_mm));};
 const steelParts=[],railParts=[],trussList=[],footList=[],archList=[];
 for(const c of coasters){const d0=c.s-4,d1=c.s+c.span+4,steps=Math.ceil((d1-d0)/1.2);
  // Unterseite des Kastentraegers und zwei Seitenwangen (bis knapp ueber die Fahrbahn)
  // Im All bleibt die Glasbahn durchsichtig (Sterne unter der Fahrbahn, R28) - dort keine Unterseite
  if(!theme.space)addStrip(strip(d0,d1,0,17.6,-1.25,6,steps),under);
  {const v=[],idx=[],_a=new T.Vector3(),_b=new T.Vector3();
   for(const side of [-1,1]){const base=v.length/3;
    for(let i=0;i<=steps;i++){const d=d0+(d1-d0)*i/steps;posAt(d,side*8.8,-1.25,_a);posAt(d,side*8.8,.12,_b);v.push(_a.x,_a.y,_a.z,_b.x,_b.y,_b.z);
     if(i<steps){const o=base+i*2;idx.push(o,o+2,o+1,o+1,o+2,o+3);}}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();
   const m=new T.Mesh(g,steel);m.castShadow=true;m.frustumCulled=false;world.add(m);}
  // Magnetschienen unter dem Traeger (leuchtend) und Querschwellen
  let pv=null;for(let d=d0;d<=d1+.01;d+=2.4){const cu=[posAt(d,-4.6,-1.55,new T.Vector3()),posAt(d,4.6,-1.55,new T.Vector3())];
   if(pv){bar(railParts,pv[0],cu[0],.42);bar(railParts,pv[1],cu[1],.42);}
   if(Math.round((d-d0)/2.4)%2===0)bar(steelParts,posAt(d,-8.6,-1.4,new T.Vector3()),posAt(d,8.6,-1.4,new T.Vector3()),.34,.5);
   pv=cu;}
  // Fachwerkstuetzen: Segment 4 m hoch, gestapelt; oben ein Quertraeger. Im All gibt es keinen Boden.
  // Stuetzen dort, wo die Unterseite wirklich hoch liegt (Huegel ODER Aussenkante einer Steilkurve);
  // in Twists nicht - dort dreht sich die Bahn um ihre Achse, eine Stuetze stuende quer im Bild.
  if(!theme.space)for(let d=c.s+3;d<c.s+c.span-3;d+=7.5){if(Math.cos(twistAt(c.spec,lapDist(d-c.s),_tw).ph)<.97)continue;
   const tops=[-6.2,6.2].map(o=>posAt(d,o,-1.3,new T.Vector3())),hs=tops.map((t,k)=>t.y-roadRef(d,k?6.2:-6.2));
   if(Math.max(hs[0],hs[1])<2.4)continue;if(Math.min(hs[0],hs[1])>2.4)bar(steelParts,tops[0],tops[1],.55,.7);
   const ry=sample(d,0).angle;
   for(let k=0;k<2;k++){const off=k?6.2:-6.2,y0=roadRef(d,off)-.05,top=tops[k],h=top.y-y0;if(h<2.4)continue;
    footList.push({x:top.x,y:y0,z:top.z,s:1,ry});
    for(let y=0;y<h-.05;y+=4){const seg=Math.min(4,h-y);trussList.push({x:top.x,y:y0+y,z:top.z,s:1,sy:seg/4,ry});}}}
  // Magnetboegen ueber der Katapultstrecke (Fuesse ausserhalb der Leitplanken)
  c.arches=c.archX.map((x,i)=>{const d=lapDist(c.s+x),sp=sample(d,0);
   for(const side of [-1,1]){const q=sample(d,side*12.4).p;addObstacle(q.x,q.z,1.3);}
   archList.push({x:sp.p.x,y:sp.p.y,z:sp.p.z,s:1,ry:sp.angle,c,i});return d;});
  // Katapult-Band: die Turbo-Textur laeuft ueber die ganze Abschussstrecke
  if(c.archX.length){const a=c.s+c.spec.launch[0]-6,b=c.s+c.spec.launch[1]+12,m=addStrip(strip(a,b,0,11,.1,4.6,Math.ceil((b-a)/1.5)),new T.MeshBasicMaterial({map:boostTex,transparent:true,opacity:.92}),false);m.castShadow=false;}
  // Schild am ersten Bogen (vorn und hinten lesbar)
  if(c.archX.length){const d=lapDist(c.s+c.archX[0]),sp=sample(d,0);for(const back of [0,1]){const sg=mesh(new T.PlaneGeometry(11,1.7),label('MAGNET-KATAPULT',glow?'#1a1030':'#d8433a','#fff5d9',512,80),world,sp.p.x,sp.p.y+13.6,sp.p.z);
   sg.rotation.y=sp.angle+(back?0:Math.PI);const f=back?.9:-.9;sg.position.x+=Math.sin(sp.angle)*f;sg.position.z+=Math.cos(sp.angle)*f;sg.castShadow=false;sg.material.side=T.FrontSide;}}}
 if(steelParts.length){const m=new T.Mesh(mergeGeometries(steelParts),steel);m.castShadow=true;m.receiveShadow=true;world.add(m);}
 if(railParts.length){const m=new T.Mesh(mergeGeometries(railParts),railMat);m.castShadow=false;world.add(m);}
 // Stuetzen: Blender-Fachwerk, sonst schlichte Kastenstuetze
 const truss=P.coastertruss;
 if(truss){const foot=[],seg=[];truss.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))(o.material.name==='TrussPaint'?seg:foot).push(o);});
  const inst=(meshes,list)=>{for(const src of meshes){if(!list.length||Array.isArray(src.material))continue;let m=src.material;if(m.name==='TrussPaint'&&theme.trussCol){m=m.clone();m.color=new T.Color(theme.trussCol);}
   const im=new T.InstancedMesh(src.geometry,m,list.length);list.forEach((t,i)=>{_e.set(0,t.ry,0);_q.setFromEuler(_e);_m.compose(_v.set(t.x,t.y,t.z),_q,_s.set(1,t.sy||1,1));im.setMatrixAt(i,_m);});
   im.castShadow=true;im.receiveShadow=true;world.add(im);}};
  inst(seg,trussList);inst(foot,footList);}
 else if(trussList.length){const g=[];for(const t of trussList)g.push(new T.BoxGeometry(.9,4*(t.sy||1),.9).translate(t.x,t.y+2*(t.sy||1),t.z));const m=new T.Mesh(mergeGeometries(g),steel);m.castShadow=true;world.add(m);}
 // Boegen: jedes Material eine Instanz-Gruppe; die Pol-Leuchte (MagnetGlow) bekommt Farbe je Bogen
 const arch=P.magnetarch;
 if(arch&&archList.length){arch.traverse(src=>{if(!src.isMesh||Array.isArray(src.material))return;let m=src.material;const isGlow=m.name==='MagnetGlow';
   if(isGlow){m=m.clone();m.color=new T.Color(0xffffff);m.emissive=new T.Color(0xffffff);m.emissiveIntensity=1.6;m.onBeforeCompile=tintEmissive;m.customProgramCacheKey=()=>'tintEmissive';}
   else if(m.name==='MagnetPaint'&&theme.magnetCol){m=m.clone();m.color=new T.Color(theme.magnetCol);}
   const im=new T.InstancedMesh(src.geometry,m,archList.length);archList.forEach((t,i)=>{_e.set(0,t.ry,0);_q.setFromEuler(_e);_m.compose(_v.set(t.x,t.y,t.z),_q,_s.set(1,1,1));im.setMatrixAt(i,_m);if(isGlow)im.setColorAt(i,_col.setHex(mag));});
   im.castShadow=!isGlow;im.receiveShadow=true;world.add(im);if(isGlow)coasterGlow={mesh:im,list:archList,col:new T.Color(mag)};});}
 for(const c of coasters)if(c.spec.kind==='dragon')buildDragon(c);
 else for(const t of archList){const g=new T.Group();g.position.set(t.x,t.y,t.z);g.rotation.y=t.ry;world.add(g);
  const body=new T.Mesh(new T.TorusGeometry(12.4,.9,10,28,Math.PI),mat(0xd8433a,{roughness:.5}));body.position.y=.4;g.add(body);
  for(const sx of [-1,1])box(g,mat(0xdfe6ee,{metalness:.6,roughness:.3}),sx*12.4,1.2,0,2.1,2.4,2.1);}}
// ---------- Fliegenpilz-Drache (R39, Blender): der Leib kommt vor dem Korkenzieher aus dem Boden,
// liegt waehrend der Doppelrolle genau auf der Drehachse (die Bahn wickelt sich um ihn herum) und
// hebt am Ausgang den Kopf - der schaut den Karts entgegen und speit Feuer, wenn der Spieler kommt.
// Leib = Instanzen des Koerperglieds entlang einer Kurve (eine Instanz-Gruppe je Material).
function dragonPart(root,prefix){let hit=null;root.traverse(o=>{if(!hit&&o.name&&o.name.startsWith(prefix))hit=o;});return hit;}
function buildDragon(c){const src=P.dragon;dragon=null;if(!src)return;
 const r=c.spec.rolls.find(q=>q.axis>0);if(!r)return;
 const A=r.axis,d0=c.s+r.c-r.w,d1=c.s+r.c+r.w;
 // Achse: Bahnmitte ohne Rolle, auf Achterbahnhoehe plus Achsabstand
 const axisPt=(d,lat=0,dy=0)=>{const [i,j,k]=tIdx(d),tx=TP.tx[i],tz=TP.tz[i];return new T.Vector3(TP.x[i]+(TP.x[j]-TP.x[i])*k+tz*lat,TP.h[i]+(TP.h[j]-TP.h[i])*k+(agrav.length?liftAt(d):0)+coasterH(d)+A+dy,TP.z[i]+(TP.z[j]-TP.z[i])*k-tx*lat);};
 const pts=[];{const g=axisPt(d0-48,-21,0);g.y=groundAt(d0-48,0).y-2.4;pts.push(g);}
 pts.push(axisPt(d0-32,-14,-A*.55));pts.push(axisPt(d0-15,-4,-1));
 for(let d=d0-4;d<=d1+4;d+=6)pts.push(axisPt(d));
 pts.push(axisPt(d1+13,3.5,2.5));const headAt=axisPt(d1+25,8.5,8.5);pts.push(headAt);
 const curve=new T.CatmullRomCurve3(pts,false,'centripetal'),L=curve.getLength(),n=Math.floor(L/1.55);
 const seg=dragonPart(src,'DR_Segment'),headSrc=dragonPart(src,'DR_Head'),jawSrc=dragonPart(src,'DR_Jaw'),tailSrc=dragonPart(src,'DR_TailTip');if(!seg||!headSrc)return;
 const mats=[],up=new T.Vector3(0,1,0),X=new T.Vector3(),Y=new T.Vector3(),Z=new T.Vector3(),M=new T.Matrix4(),S=new T.Matrix4();
 for(let i=1;i<n-2;i++){const u=i/n,p=curve.getPointAt(u);Z.copy(curve.getTangentAt(u)).normalize();X.crossVectors(up,Z);if(X.lengthSq()<1e-6)X.set(1,0,0);X.normalize();Y.crossVectors(Z,X);
  const sc=.42+.58*sstep(u/.28);M.makeBasis(X,Y,Z).multiply(S.makeScale(sc,sc,sc)).setPosition(p);mats.push(M.clone());}
 seg.updateMatrixWorld(true);const segInv=new T.Matrix4().copy(seg.matrixWorld).invert();
 seg.traverse(o=>{if(!o.isMesh)return;const local=new T.Matrix4().multiplyMatrices(segInv,o.matrixWorld);
  const im=new T.InstancedMesh(o.geometry,o.material,mats.length);mats.forEach((m,i)=>im.setMatrixAt(i,_m.multiplyMatrices(m,local)));
  im.castShadow=true;im.receiveShadow=true;im.userData.dragonPart=true;world.add(im);});
 // Schwanzflamme am Anfang (zeigt vom Leib weg)
 if(tailSrc){const t=tailSrc.clone(true),p=curve.getPointAt(1/n),dir=curve.getTangentAt(1/n).negate();t.position.copy(p);t.scale.setScalar(.5);t.lookAt(p.clone().add(dir));t.traverse(o=>{if(o.isMesh)o.userData.dragonPart=true;});world.add(t);}
 // Kopf: schaut entlang der Bahn zurueck zum Korkenzieher-Ausgang, leicht nach unten
 const head=new T.Group(),h=headSrc.clone(true);h.position.set(0,0,0);head.add(h);head.position.copy(headAt);head.scale.setScalar(1.25);
 const look=axisPt(d1-6,0,-A+1.5);head.lookAt(look);world.add(head);
 let jaw=null;if(jawSrc){jaw=jawSrc.clone(true);jaw.position.set(0,-.7,1.1);h.add(jaw);}
 let eye=null;h.traverse(o=>{if(o.isMesh&&o.material&&o.material.name==='DragonEye'){o.material=o.material.clone();eye=o.material;}});
 head.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.dragonPart=true;}});
 // Eigene Materialkopien fuer den Kopf (das Auge ist schon eine)
 head.traverse(o=>{if(o.isMesh&&o.material!==eye)o.material=o.material.clone();});
 // Durchsichtig in der eigenen Achterbahn (R40): der Leib verdeckte im Korkenzieher die Sicht
 const dm=new Set(),meshes=[];world.traverse(o=>{if(o.isMesh&&o.userData.dragonPart){meshes.push(o);for(const m of [].concat(o.material))dm.add(m);}});
 for(const m of dm){m.transparent=true;m.opacity=1;}
 dragon={head,jaw,eye,d1,fireT:0,cd:0,roarT:0,t:0,mats:[...dm],meshes,alpha:1,zone:{s:c.s,span:c.span}};}
// Feuer und Kiefer (animateWorld): der Drache speit, wenn der Spieler auf den Korkenzieher-Ausgang zufaehrt
function updateDragon(dt){const g=dragon;if(!g)return;g.t+=dt;g.cd=Math.max(0,g.cd-dt);
 {const p=racers[0],race=state==='race'||state==='countdown'||state==='finished';let want=1;
  if(p&&race&&g.zone){const rel=lapDist(p.distance-g.zone.s);if(rel<g.zone.span+15||lapDist(g.zone.s-p.distance)<30)want=.12;}
  if(Math.abs(want-g.alpha)>.002){g.alpha+=(want-g.alpha)*Math.min(1,dt*4);if(Math.abs(want-g.alpha)<.004)g.alpha=want;
   for(const m of g.mats){m.opacity=g.alpha;m.depthWrite=g.alpha>.97;}for(const o of g.meshes)o.castShadow=g.alpha>.9;}}
 const p=racers[0];if(p&&(state==='race'||state==='finished')&&g.cd<=0){const rel=wrapDiff(g.d1,lapDist(p.distance));if(rel>4&&rel<38){g.fireT=1.6;g.cd=6;if(state==='race'){SFX.roar();}}}
 const fire=g.fireT>0;g.fireT=Math.max(0,g.fireT-dt);
 const open=fire?.55:.08+.05*Math.sin(g.t*1.3);if(g.jaw)g.jaw.rotation.x+=(open-g.jaw.rotation.x)*Math.min(1,dt*8);
 if(g.eye)g.eye.emissiveIntensity=fire?5:2.2+.8*Math.sin(g.t*2.1);
 if(fire){g.head.updateMatrixWorld(true);const m=g.head.matrixWorld,o=new T.Vector3(0,-.9,6.2).applyMatrix4(m),f=new T.Vector3(0,-.25,1).transformDirection(m);
  for(let i=0;i<7;i++){const sp=16+Math.random()*12;emit(o.x,o.y,o.z,Math.random()<.5?0xff6a1a:0xffc23a,f.x*sp+(Math.random()-.5)*5,f.y*sp+(Math.random()-.5)*4+2,f.z*sp+(Math.random()-.5)*5,.55+Math.random()*.35);}}}
// ---------- Elemente-Parcours: See und Flug im Bild
const WATER={forest:[0x44c2cf,0x0f5a6a,0x1d7486],night:[0x3a7bff,0x071c52,0x0d2c72],haunted:[0x5a9a80,0x10302a,0x1a3d34],fair:[0x3fd0de,0x0c5c74,0x16788c],canyon:[0x4cc4c8,0x14586a,0x1f6f80],lava:[0xff8a3a,0x5a1406,0x7a2a0e],rainbow:[0x8a7bff,0x1a1050,0x2a1c70]};
let lakeMask=null;   // Maske des Bodendeckels: {data,W}; Rotwert 10+20*i = See i, 255 = Land
function lakeHalf(z,x){const e=Math.min(x-5,z.span-5-x),L=ELEM.lake;if(e<=0)return 0;return e>=L?L:Math.sqrt(L*L-(L-e)*(L-e));}
// Punkt neben der flachen Mittellinie (Zonenmeter x, Querversatz off, Hoehe y)
function lakePt(z,x,off,y,out=new T.Vector3()){const [i,j,k]=tIdx(lapDist(z.s+x));let tx=TP.tx[i]+(TP.tx[j]-TP.tx[i])*k,tz=TP.tz[i]+(TP.tz[j]-TP.tz[i])*k;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
 return out.set(TP.x[i]+(TP.x[j]-TP.x[i])*k+tz*off,y,TP.z[i]+(TP.z[j]-TP.z[i])*k-tx*off);}
// Welcher See liegt unter (x, z)? Liest die Bodenmaske (UV des Zylinderdeckels: u = z, v = x)
function lakeAt(x,z){if(!lakeMask)return null;const W=lakeMask.W,px=Math.floor((.5+z/(420*WK))*W),py=Math.floor((.5-x/(420*WK))*W);if(px<0||py<0||px>=W||py>=W)return null;
 const v=lakeMask.data[(py*W+px)*4];if(v>=128)return null;const lakes=elems.filter(q=>q.lake);return lakes[clamp(Math.round((v-10)/20),0,lakes.length-1)]||null;}
function buildLakeGround(grassMat){const W=1024,cv=document.createElement('canvas');cv.width=cv.height=W;const q=cv.getContext('2d');q.fillStyle='#fff';q.fillRect(0,0,W,W);
 const px=p=>[(.5+p.z/(420*WK))*W,(.5-p.x/(420*WK))*W];
 elems.filter(z=>z.lake).forEach((z,li)=>{const g=10+20*li;q.fillStyle=`rgb(${g},${g},${g})`;
  for(let x=0;x<z.span;x+=1.5){const x2=Math.min(z.span,x+1.9),h1=lakeHalf(z,x),h2=lakeHalf(z,x2);if(h1<=0&&h2<=0)continue;
   const pts=[lakePt(z,x,-h1,0),lakePt(z,x2,-h2,0),lakePt(z,x2,h2,0),lakePt(z,x,h1,0)].map(px);q.beginPath();q.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<4;i++)q.lineTo(pts[i][0],pts[i][1]);q.closePath();q.fill();}});
 lakeMask={data:q.getImageData(0,0,W,W).data,W};
 const cap=grassMat.clone();cap.alphaMap=new T.CanvasTexture(cv);cap.alphaTest=.5;
 const g=mesh(new T.CylinderGeometry(210*WK,210*WK-15,12,Math.round(96*Math.sqrt(WK))),[grassMat,cap,grassMat],world,0,-6.3,0);g.castShadow=false;g.receiveShadow=true;}
// Band entlang der Zone zwischen zwei Randkurven
function lakeRibbon(z,fa,fb,mat,step=1.5,uvL=10){const n=Math.ceil(z.span/step),v=[],uv=[],idx=[],pa=new T.Vector3(),pb=new T.Vector3();
 for(let i=0;i<=n;i++){const x=Math.min(z.span,i*step);fa(x,pa);fb(x,pb);v.push(pa.x,pa.y,pa.z,pb.x,pb.y,pb.z);uv.push(0,x/uvL,1,x/uvL);if(i<n){const o=i*2;idx.push(o,o+2,o+1,o+1,o+2,o+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 const m=new T.Mesh(g,mat);m.receiveShadow=true;world.add(m);return m;}
function elemPart(name){const src=P.elements;if(!src)return null;let hit=null;src.traverse(o=>{if(!hit&&o.name===name)hit=o;});return hit;}
// Instanzen eines Deko-Teils (je Material ein InstancedMesh); mats: Weltmatrizen
function elemInst(name,mats,colors){const src=elemPart(name);if(!src||!mats.length)return [];src.updateMatrixWorld(true);const inv=new T.Matrix4().copy(src.matrixWorld).invert(),out=[];
 src.traverse(o=>{if(!o.isMesh)return;const local=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),im=new T.InstancedMesh(o.geometry,o.material,mats.length);
  mats.forEach((m,i)=>im.setMatrixAt(i,_m.multiplyMatrices(m,local)));
  if(colors&&/Paint/.test(o.material.name||'')){colors.forEach((c,i)=>im.setColorAt(i,_col.setHex(c)));}
  im.castShadow=false;im.receiveShadow=true;world.add(im);out.push({im,local});});return out;}
function buildElems(){const pal=WATER[course.theme]||WATER.forest,glow=!!theme.glow,rnd=rng(course.seed+77),fx={uw:0,uwOn:false,fog0:null,bg0:null,uwCol:new T.Color(pal[2]),schools:[],buoys:[],shimmer:null,caustic:null};
 fx.shimmer=canvasTex(128,128,(q,w,h)=>{q.fillStyle='#fff';q.fillRect(0,0,w,h);for(let i=0;i<260;i++){const a=.25+Math.random()*.5;q.fillStyle=`rgba(150,210,255,${a})`;q.beginPath();q.ellipse(Math.random()*w,Math.random()*h,3+Math.random()*9,1+Math.random()*2,Math.random()*3,0,7);q.fill();}});
 fx.shimmer.wrapS=fx.shimmer.wrapT=T.RepeatWrapping;fx.shimmer.repeat.set(1,3);
 fx.caustic=canvasTex(128,128,(q,w,h)=>{q.fillStyle='#000';q.fillRect(0,0,w,h);q.strokeStyle='rgba(255,255,255,.75)';q.lineWidth=2;for(let i=0;i<40;i++){q.beginPath();const x=Math.random()*w,y=Math.random()*h;q.moveTo(x,y);q.bezierCurveTo(x+20*Math.random(),y-15,x+30,y+15*Math.random(),x+40*Math.random(),y+30*Math.random());q.stroke();}});
 fx.caustic.wrapS=fx.caustic.wrapT=T.RepeatWrapping;fx.caustic.repeat.set(2,6);
 const waterMat=stdMat({color:pal[0],map:fx.shimmer,transparent:true,opacity:.7,roughness:.1,metalness:.15,side:T.DoubleSide,depthWrite:false,emissive:pal[0],emissiveIntensity:glow?.45:.1});
 const floorMat=stdMat({color:course.theme==='haunted'?0x4a4a3c:glow?0x2a3a6a:0xd8c796,roughness:.95,emissive:0xffffff,emissiveMap:fx.caustic,emissiveIntensity:glow?.5:.3});
 const wallMat=stdMat({color:course.theme==='haunted'?0x3a3830:0x6b5a48,roughness:1,side:T.DoubleSide});
 const sandMat=stdMat({color:glow?0x3a4a7a:0xe6d3a0,roughness:1});
 const ringCol=course.theme==='lava'?0xff6a1a:theme.space?0xff4fd8:0x7cf3ff;
 for(const z of elems){
  if(z.lake){const yF=z.water-z.plan.depth-2.5,H=x=>lakeHalf(z,x);
   lakeRibbon(z,(x,o)=>lakePt(z,x,-H(x),z.water,o),(x,o)=>lakePt(z,x,H(x),z.water,o),waterMat).castShadow=false;
   lakeRibbon(z,(x,o)=>lakePt(z,x,-H(x),yF,o),(x,o)=>lakePt(z,x,H(x),yF,o),floorMat);
   for(const sd of [-1,1]){lakeRibbon(z,(x,o)=>lakePt(z,x,sd*H(x),-.3,o),(x,o)=>lakePt(z,x,sd*H(x),yF,o),wallMat);
    lakeRibbon(z,(x,o)=>lakePt(z,x,sd*H(x),-.26,o),(x,o)=>lakePt(z,x,sd*(H(x)+(H(x)>0?3.5:0)),-.26,o),sandMat);}
   // Seetang, Korallen: am Grund, nicht auf der Bahn und nicht unter der Spirale
   const lp=loops.find(q=>q.style==='lake'&&lapDist(q.s-z.s)<z.span),spots=(n)=>{const out=[];for(let t=0;t<n*8&&out.length<n;t++){const x=6+rnd()*(z.span-12),h=H(x);
     const inLoop=lp&&lapDist(z.s+x-lp.s)<lp.span+6,min=inLoop?LOOP.tilt+12:12;if(h<min+2)continue;out.push([x,(rnd()<.5?-1:1)*(min+rnd()*(h-min-1.5))]);}return out;};
   const kelp=spots(34).map(([x,o])=>new T.Matrix4().compose(lakePt(z,x,o,yF-.2),new T.Quaternion().setFromEuler(new T.Euler(0,rnd()*6.3,0)),new T.Vector3().setScalar(.8+rnd()*.7)));
   elemInst('UW_Kelp',kelp);
   const cor=spots(14),corC=[0xff7aa2,0xffb04a,0xb58cff,0x5ee0c0,0xff5d6c];
   elemInst('UW_Coral',cor.map(([x,o])=>new T.Matrix4().compose(lakePt(z,x,o,yF-.1),new T.Quaternion().setFromEuler(new T.Euler(0,rnd()*6.3,0)),new T.Vector3().setScalar(1.2+rnd()*1.3))),cor.map((_,i)=>corC[i%corC.length]));
   // Fischschwaerme ziehen Kreise zwischen Grund und Oberflaeche
   const fishC=[0xffa23a,0xff5d8f,0x5ad1ff,0xffe45c,0x9dff6a],list=[];
   for(const [x,o] of spots(5)){const c=lakePt(z,x,o,0),yy=yF+2+rnd()*Math.max(1,z.water-yF-4),w=(rnd()<.5?-1:1)*(.35+rnd()*.4);
    for(let i=0;i<7;i++)list.push({cx:c.x+(rnd()-.5)*3,cz:c.z+(rnd()-.5)*3,r:4+rnd()*5,a:rnd()*6.3,w,y:yy+(rnd()-.5)*2.2,s:.7+rnd()*.5});}
   if(list.length){const parts=elemInst('UW_Fish',list.map(()=>new T.Matrix4()),list.map((_,i)=>fishC[i%fishC.length]));fx.schools.push({parts,list});}
   // Bojen an der Bootsspur
   for(const pc of z.plan.pieces)if(pc.type==='boat')for(let x=pc.x0+3;x<=pc.x1-2;x+=11)for(const sd of [-1,1]){const q=lakePt(z,x,sd*ELEM.lane,z.water);fx.buoys.push({x:q.x,y0:q.y-.35,z:q.z,s:1.15,ph:x*.7+sd});}}
  else{// Flug: Leuchtkante an Startrampe und Landung, Ringe auf der Flugbahn
   const take=z.plan.pieces.find(q=>q.type==='takeoff'),land=z.plan.pieces.find(q=>q.type==='land'),barMat=new T.MeshBasicMaterial({color:ringCol});
   for(const x of [take.x1-.6,land.x0+.6]){const d=lapDist(z.s+x),p=posAt(d,0,.25,new T.Vector3()),b=mesh(new T.BoxGeometry(17.4,.3,.9),barMat,world,p.x,p.y,p.z);b.rotation.y=sample(d,0).angle;b.castShadow=false;}
   const cl=z.plan.pieces.find(q=>q.type==='climb'),de=z.plan.pieces.find(q=>q.type==='descend'),cr=z.plan.pieces.find(q=>q.type==='cruise');
   const ringXs=[];{const a=cl.x0+(cl.x1-cl.x0)*.75,b=de.x0+(de.x1-de.x0)*.3,n=Math.max(3,Math.round((b-a)/34)+1);for(let k=0;k<n;k++)ringXs.push([a+(b-a)*k/(n-1),[-3.5,3.5,-1.5,4,-4,2][k%6]]);}
   const zi=elems.indexOf(z);ringXs.forEach(([x,off],ri)=>{const d=lapDist(z.s+x),p=posAt(d,off,1.3,new T.Vector3());
    const rg=new T.Mesh(new T.TorusGeometry(4.3,.36,10,32),stdMat({color:ringCol,emissive:ringCol,emissiveIntensity:1.1,roughness:.35}));
    rg.position.copy(p);rg.rotation.order='YXZ';rg.rotation.y=sample(d,0).angle;rg.castShadow=false;world.add(rg);rings.push({d,off,y:p.y,mesh:rg,flash:0,fly:1,zone:zi,ri,rn:ringXs.length});});}}
 elemFx=fx;}
// Bojen: ein InstancedMesh je Material fuer alle Bojen (vorher einzelne Klone - an langen Fluessen
// ueber 250 Draw-Calls), Wippen per Matrix in updateElems
function buildBuoyInst(){const fx=elemFx;if(!fx||!fx.buoys.length)return;fx.buoyParts=elemInst('EL_Buoy',fx.buoys.map(()=>new T.Matrix4()));for(const p of fx.buoyParts){p.im.frustumCulled=false;p.im.castShadow=true;}}
const _fp=new T.Vector3(),_fq=new T.Quaternion(),_fs=new T.Vector3(),_fe=new T.Euler(),_fm=new T.Matrix4(),_fm2=new T.Matrix4();
// Wasser, Fische, Bojen und die Unterwasser-Sicht (animateWorld)
function updateElems(dt,now){const fx=elemFx;if(!fx)return;
 fx.shimmer.offset.set((now*.00002)%1,(now*.00005)%1);fx.caustic.offset.set((now*.00004)%1,(-now*.00003)%1);
 if(fx.buoyParts&&frame%2===0){fx.buoys.forEach((b,i)=>{_fp.set(b.x,b.y0+Math.sin(now*.0021+b.ph)*.18,b.z);_fq.setFromEuler(_fe.set(0,b.ph,Math.sin(now*.0017+b.ph)*.08));_fm.compose(_fp,_fq,_fs.setScalar(b.s));
   for(const p of fx.buoyParts)p.im.setMatrixAt(i,_fm2.multiplyMatrices(_fm,p.local));});for(const p of fx.buoyParts)p.im.instanceMatrix.needsUpdate=true;}
 for(const sc of fx.schools){sc.list.forEach((f,i)=>{f.a+=f.w*dt;_fp.set(f.cx+Math.cos(f.a)*f.r,f.y+Math.sin(now*.002+i)*.3,f.cz+Math.sin(f.a)*f.r);
   _fq.setFromEuler(_fe.set(0,Math.atan2(-Math.sin(f.a)*f.w,Math.cos(f.a)*f.w)+Math.sin(now*.009+i)*.18,0));_fm.compose(_fp,_fq,_fs.setScalar(f.s));
   for(const p of sc.parts)p.im.setMatrixAt(i,_fm2.multiplyMatrices(_fm,p.local));});
  for(const p of sc.parts)p.im.instanceMatrix.needsUpdate=true;}
 // Unter Wasser: Nebel und Hintergrund in Wasserfarbe, die Musik klingt gedaempft (raceFilter)
 const c=camera.position,lk=lakeAt(c.x,c.z),want=lk&&c.y<lk.water-.12?1:0;fx.uw+=(want-fx.uw)*Math.min(1,dt*7);if(fx.uw<.004&&!want)fx.uw=0;
 const f=scene.fog;if(f&&(fx.uw>0||fx.fog0)){if(!fx.fog0)fx.fog0={c:f.color.clone(),n:f.near,f:f.far};const k=fx.uw;
  f.color.copy(fx.fog0.c).lerp(fx.uwCol,k);f.near=fx.fog0.n+(1.5-fx.fog0.n)*k;f.far=fx.fog0.f+(75-fx.fog0.f)*k;if(k===0){f.color.copy(fx.fog0.c);f.near=fx.fog0.n;f.far=fx.fog0.f;fx.fog0=null;}}
 if(fx.uw>.5&&!fx.uwOn){fx.bg0=scene.background;scene.background=fx.uwCol;fx.uwOn=true;}else if(fx.uw<=.5&&fx.uwOn){scene.background=fx.bg0;fx.uwOn=false;}
 if(fx.uw>.5&&frame%3===0)emit(c.x+(Math.random()-.5)*6,c.y-1.5-Math.random()*2,c.z+(Math.random()-.5)*6,0xcff6ff,0,5+Math.random()*2,0,.5);}
// ---------- Verwandlung: Rennboot, Tauchboot, Flugzeug (Blender-Teile am Kart, je nach Element)
const TF_FORMS=['boat','dive','plane'],TF_TOAST={boat:'RENNBOOT!',dive:'TAUCHGANG!',plane:'FLUGZEUG!'};
function tfPart(name){const src=P.transform;if(!src)return null;let hit=null;src.traverse(o=>{if(!hit&&o.name===name)hit=o;});return hit?cloneProto(hit):null;}
function attachTransform(g,color){if(!P.transform)return;const tf={cur:'kart',k:{boat:0,dive:0,plane:0}};
 const mk=names=>{const grp=new T.Group();for(const n of names){const q=tfPart(n);if(q)grp.add(q);}for(const m of ['BoatPaint','DivePaint','WingPaint'])applyTint(grp,m,color);grp.traverse(o=>{if(o.isMesh)o.castShadow=true;});grp.visible=false;g.add(grp);return grp;};
 tf.boat=mk(['TF_Boat']);tf.dive=mk(['TF_Dive','TF_DiveProp']);tf.plane=mk(['TF_Plane','TF_PlaneProp']);
 tf.dprop=tf.dive.getObjectByName('TF_DiveProp');tf.pprop=tf.plane.getObjectByName('TF_PlaneProp');g.userData.tf=tf;}
function resetTransform(u){const tf=u.tf;if(!tf)return;tf.cur='kart';for(const f of TF_FORMS){tf.k[f]=0;tf[f].visible=false;}if(u.parts)for(const w of u.parts.wheels)w.piv.scale.setScalar(1);}
function elemBurst(r,cols,n,up){const p=r.mesh.position;for(let i=0;i<n;i++)emit(p.x+(Math.random()-.5)*2.4,p.y+.4+Math.random(),p.z+(Math.random()-.5)*2.4,cols[i%cols.length],(Math.random()-.5)*9,up*(3+Math.random()*6),(Math.random()-.5)*9,.45+Math.random()*.4);}
function syncTransform(r,dt){const u=r.mesh.userData,tf=u.tf;if(!tf)return;let form='kart',z=null;
 if(elems.length){const st=elemSt(r.distance);z=st.z;form=st.form;
  if(z&&z.lake){const wy=r.mesh.position.y-z.water,side=wy<0?-1:1;
   if(form==='dive'&&wy>.6)form='kart';                      // auf der Spirale ueber dem Wasser
   if(r.wSide&&side!==r.wSide&&nearPlayer(r,90)){elemBurst(r,[0xffffff,0xbff4ff,0x7fd8ff],18,1);if(r.id===0)SFX.splash();}
   r.wSide=side;}else r.wSide=0;}
 if(form!==tf.cur){tf.cur=form;if(nearPlayer(r,70))elemBurst(r,[0xffe45c,0xffffff,0xff7ab8],10,.6);
  if(r.id===0&&state==='race'&&form!=='kart'){SFX.transform(form);const seen=r.tfSeen||(r.tfSeen={});if(!seen[form]){seen[form]=1;toast(TF_TOAST[form],1.1,'good');}}}
 let wheels=1;
 for(const f of TF_FORMS){const g=tf[f],want=tf.cur===f?1:0;tf.k[f]+=(want-tf.k[f])*Math.min(1,dt*9);if(!want&&tf.k[f]<.004)tf.k[f]=0;
  const k=tf.k[f];g.visible=k>0;if(k>0)g.scale.setScalar(.12+.88*k);if(f!=='dive')wheels=Math.min(wheels,1-k);}
 if(u.parts)for(const w of u.parts.wheels)w.piv.scale.setScalar(Math.max(.001,wheels));
 if(tf.k.dive>0&&tf.dprop)tf.dprop.rotation.z+=dt*(6+Math.abs(r.speed)*.9);
 if(tf.k.plane>0&&tf.pprop)tf.pprop.rotation.z+=dt*(30+Math.abs(r.speed));
 if(tf.cur!=='kart'&&u.underglow)u.underglow.visible=false;
 // Boot schaukelt, Flugzeug legt sich in die Kurve und schwebt
 if(tf.k.boat>0){const k=tf.k.boat;r.mesh.position.y+=Math.sin(elapsed*5.2+r.id)*.12*k;r.mesh.rotateZ(Math.sin(elapsed*3.1+r.id*2)*.05*k);r.mesh.rotateX(-.07*k*Math.min(1,Math.abs(r.speed)/30));}
 if(tf.k.plane>0){const k=tf.k.plane;r.mesh.rotateZ(-(r.steerS||0)*.5*k);r.mesh.position.y+=Math.sin(elapsed*2.3+r.id)*.22*k;}
 // Spuren: Gischt am Boot, Blasen beim Tauchen, Kondensstreifen an den Fluegelspitzen
 if(tf.cur!=='kart'&&frame%2===0&&Math.abs(r.speed)>6&&nearPlayer(r,70)){
  if(tf.cur==='boat')for(const sx of [-1.3,1.3]){_fp.set(sx,.2,-1.9);r.mesh.localToWorld(_fp);emit(_fp.x,_fp.y,_fp.z,0xffffff,(Math.random()-.5)*3+sx*1.5,3+Math.random()*3,(Math.random()-.5)*3,.35);}
  else if(tf.cur==='dive'){_fp.set((Math.random()-.5)*1.6,.9,-2.1);r.mesh.localToWorld(_fp);emit(_fp.x,_fp.y,_fp.z,0xcff6ff,(Math.random()-.5)*1.5,6+Math.random()*3,(Math.random()-.5)*1.5,.55);}
  else for(const sx of [-2.9,2.9]){_fp.set(sx,.85,-.1);r.mesh.localToWorld(_fp);emit(_fp.x,_fp.y,_fp.z,0xf4fbff,0,4,0,.5);}}}
// ---------- Pilzland: Portale, P-Schalter, Muenzen, Bojen-Slalom (Blender: ow.glb, elements.glb)
function owPart(name){const src=P.ow;if(!src)return null;let hit=null;src.traverse(o=>{if(!hit&&o.name===name)hit=o;});return hit;}
function labelPlane(text,sub,col,w=16,h=3.6){const tex=canvasTex(512,116,(q,W,H)=>{q.fillStyle='#15133a';q.beginPath();q.roundRect(4,4,W-8,H-8,26);q.fill();q.fillStyle=col;q.beginPath();q.roundRect(12,12,W-24,H-24,20);q.fill();
  q.font='italic 900 50px Rubik, "Baloo 2", sans-serif';q.textAlign='center';q.textBaseline='middle';q.lineJoin='round';q.lineWidth=10;q.strokeStyle='#15133a';q.strokeText(text,W/2,H/2-(sub?12:0));q.fillStyle='#fff';q.fillText(text,W/2,H/2-(sub?12:0));
  if(sub){q.font='800 24px "Baloo 2", sans-serif';q.fillStyle='#15133a';q.fillText(sub,W/2,H-24);}});
 return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));}
function buildOW(){const fx={switches:[],portals:[],slaloms:[],ringMs:[],coins:null,coinParts:[],active:null,done:store.get('owDone',[]),total:0,msg:''};
 // Portale: Torbogen in der Farbe der Zielstrecke, Namensschild obendrauf
 for(const [cp,ti] of course.portals||[]){const d=cpDist(cp),s0=sample(d,0),tc=courses[ti],th=THEMES[tc.theme],col=th.caps?th.caps[0]:0xffd21f,g=new T.Group();g.position.copy(s0.p);g.rotation.y=s0.angle;world.add(g);
  if(P.gate){const a=cloneProto(P.gate);applyTint(a,'CapPaint',col);g.add(a);}
  const lab=labelPlane(tc.icon+' '+tc.name,'PORTAL · '+tc.kind.split('·')[0].trim(),'#'+new T.Color(col).getHexString());lab.position.set(0,11.2,0);g.add(lab);
  // leuchtender Portalschleier
  const veil=new T.Mesh(new T.PlaneGeometry(16,7.5),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.18,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));veil.position.set(0,4.2,0);g.add(veil);
  fx.portals.push({d,ti,veil,cool:0});}
 // P-Schalter: Sockel und Kappe (Kappe wird beim Ueberfahren gestaucht)
 const baseSrc=owPart('EL_PSwitch'),capSrc=owPart('EL_PSwitchCap');
 for(const [cp,off,id] of course.pswitch||[]){const d=cpDist(cp),p=posAt(d,off,0,new T.Vector3()),g=new T.Group();g.position.copy(p);g.rotation.y=sample(d,0).angle;world.add(g);
  let cap=null;if(baseSrc){g.add(cloneProto(baseSrc));cap=cloneProto(capSrc);cap.position.y=.5;g.add(cap);}
  else{cap=mesh(new T.CylinderGeometry(1.2,1.2,.8,24),mat(0x1f5cff,{emissive:0x1030ff,emissiveIntensity:.5}),g,0,.9,0);}
  const m=pswitchMission(id,d);fx.switches.push({id,d,off,g,cap,m});fx.total++;}
 // Muenzen: ein Satz (8) fuer den gerade laufenden Schalter
 const coinSrc=owPart('EL_Coin');
 if(coinSrc){coinSrc.updateMatrixWorld(true);const inv=new T.Matrix4().copy(coinSrc.matrixWorld).invert();coinSrc.traverse(o=>{if(!o.isMesh)return;const im=new T.InstancedMesh(o.geometry,o.material,OW.coins);im.userData.local=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<OW.coins;i++)im.setMatrixAt(i,_zeroM);im.frustumCulled=false;im.castShadow=true;world.add(im);fx.coinParts.push(im);});}
 // Bojen-Slalom auf jedem Fluss (Plan 'bach'): Tore abwechselnd links und rechts der Spur
 elems.forEach((z,zi)=>{if(z.kind!=='bach')return;const bp=z.plan.pieces.find(q=>q.type==='boat');if(!bp)return;const gates=[];
  for(let x=bp.x0+16,k=0;x<bp.x1-10;x+=24,k++){const off=k%2?3.6:-3.6;gates.push({d:lapDist(z.s+x),off});
   for(const sd of [-1,1]){const q=lakePt(z,x,off+sd*(OW.gateHalf+.4),z.water);if(elemFx)elemFx.buoys.push({x:q.x,y0:q.y-.35,z:q.z,s:1.3,ph:x*.9+sd});}}
  if(gates.length){fx.slaloms.push({zi,m:slalomMission('s'+(zi+1),gates),prevD:null});fx.total++;}});
 // Ringflug: alle Ringe eines Flugabschnitts
 elems.forEach((z,zi)=>{if(z.kind!=='flug')return;const n=rings.filter(r=>r.fly&&r.zone===zi).length;if(n){fx.ringMs.push({zi,m:ringsMission('r'+(zi+1),n)});fx.total++;}});
 // Wahrzeichen (R41): Pilzberg in der Inselmitte, an jedem Portal das Wahrzeichen seiner Strecke
 const rnd=rng(course.seed+9),land=(name,x,z,s,ry=0,tint=null,r=0)=>{const src=P[name];if(!src)return null;const o=cloneProto(src);o.position.set(x,-.3,z);o.scale.setScalar(s);o.rotation.y=ry;
  if(tint!==null)applyTint(o,'CapPaint',tint);o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});world.add(o);if(r)addObstacle(x,z,r);return o;};
 land('mushroom',0,0,15,.3,0xe8352e,9);
 const DISTRICT={0:['roottree',1.2],1:['rock',9],2:['neongate',1.1],3:['mansion',.9],4:['castle',.8],5:['crystal',7],6:['ferriswheel',.8]};
 for(const pt of fx.portals){const [name,sc]=DISTRICT[pt.ti]||['mushroom',6],a=sample(pt.d,-56).p,b=sample(pt.d,56).p,q=Math.hypot(a.x,a.z)<Math.hypot(b.x,b.z)?a:b,ang=Math.atan2(-q.x,-q.z);
  const o=land(name,q.x,q.z,sc,ang,name==='crystal'?0xb09aff:null,name==='rock'||name==='crystal'?6:10);
  if(o&&name==='rock')for(let k=1;k<4;k++)land('rock',q.x+Math.cos(k*2.1)*14,q.z+Math.sin(k*2.1)*14,5+k*1.6,k,null,5);}
 owPaths(fx);owHunt(fx);owFx=fx;}
// R44: Sandwege von jedem Portal quer ueber die Wiese zum Pilzberg - verbinden alle Gebiete, frei befahrbar
function owPaths(fx){const tex=canvasTex(64,64,(q,w,h)=>{q.fillStyle='#d9b77c';q.fillRect(0,0,w,h);for(let i=0;i<180;i++){q.fillStyle=`rgba(${150+Math.random()*60|0},${110+Math.random()*50|0},${70+Math.random()*30|0},.5)`;q.fillRect(Math.random()*w,Math.random()*h,2,2);}},true);tex.repeat.set(1,8);
 const m=stdMat({map:tex,roughness:.95}),geos=[];for(const pt of fx.portals){const s0=sample(pt.d+18,0).p,a=sample(pt.d+18,-12).p,b=sample(pt.d+18,12).p,st=Math.hypot(a.x,a.z)<Math.hypot(b.x,b.z)?a:b,len0=Math.hypot(st.x,st.z),ux=-st.x/len0,uz=-st.z/len0,L=len0-66;
  if(L<20)continue;const g=new T.PlaneGeometry(6,L,1,Math.ceil(L/6)).rotateX(-Math.PI/2);g.rotateY(Math.atan2(ux,uz));g.translate(st.x+ux*L/2,.04,st.z+uz*L/2);geos.push(g);}
 if(geos.length){const mesh=new T.Mesh(mergeGeometries(geos),m);mesh.receiveShadow=true;world.add(mesh);}}
// R44: Muenzjagd - 24 Muenzen quer ueber die Insel, jede einmal (bleibt gespeichert); alle = Mission erledigt
function owHunt(fx){if(!P.coin)return;const got=new Set(store.get('owHunt',[])),rnd=rng(4242),list=[];let guard=0;
 while(list.length<24&&guard++<4000){const a=rnd()*TAU,rr=90+rnd()*470,x=Math.cos(a)*rr,z=Math.sin(a)*rr,d=projectGlobal(x,z),q=sample(d).p;if(Math.hypot(q.x-x,q.z-z)<25)continue;if(list.some(c=>Math.hypot(c.x-x,c.z-z)<40))continue;list.push({x,z,i:list.length});}
 let cg=null,cm=null;P.coin.traverse(o=>{if(o.isMesh&&!cg){cg=o.geometry;cm=o.material;}});const im=new T.InstancedMesh(cg,cm,list.length);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.frustumCulled=false;world.add(im);
 fx.hunt={list,got,im};fx.total++;if(got.size>=list.length)fx.done=progressAdd(fx.done,'hunt');}
// Zustand zuruecksetzen (neue Fahrt in der Welt): erledigte Missionen bleiben erledigt
// Portal-Knopf wirklich ausblenden (vorher blieb er nach dem Tippen im Rennen und sogar im Hauptmenue stehen)
function owPortalHide(){owPortalAt=null;owHudKey='';const pb=$('owPortal');if(pb)pb.hidden=true;}
function owReset(){const fx=owFx;if(!fx)return;fx.done=store.get('owDone',[]);fx.active=null;owPortalAt=null;
 for(const sw of fx.switches){sw.m=pswitchMission(sw.id,sw.d);if(fx.done.includes(sw.id))sw.m.state='done';sw.cap.scale.y=sw.m.state==='done'?.35:1;}
 for(const s of fx.slaloms){s.m=slalomMission(s.m.id,s.m.gates);if(fx.done.includes(s.m.id))s.m.state='done';s.prevD=null;}
 for(const r of fx.ringMs){r.m=ringsMission(r.m.id,r.m.count);if(fx.done.includes(r.m.id))r.m.state='done';}
 for(const im of fx.coinParts){for(let i=0;i<OW.coins;i++)im.setMatrixAt(i,_zeroM);im.instanceMatrix.needsUpdate=true;}
 owHud();}
// Erfolg direkt gutschreiben (Grand Prix, Pilzland-Missionen)
function grantAch(id){const pr=store.get('prog',{xp:0,ach:[],done:[],won:[]});if((pr.ach||[]).includes(id))return;pr.ach=[...(pr.ach||[]),id];store.set('prog',pr);const a=achById(id);if(a){toast('🏅 ERFOLG: '+a.n,2.4,'good');playClip('s_c_unlock',sfxGain,.8);}}
function owComplete(id,label){const fx=owFx;fx.done=progressAdd(fx.done,id);store.set('owDone',fx.done);if(fx.done.length>=3)grantAch('ow');const p=racers[0];
 if(p){p.boost=Math.max(p.boost,1.6);p.spores=Math.min(MAX_SPORES,(p.spores||0)+3);}
 SFX.boost();toast(`${label} GESCHAFFT! ★ ${fx.done.length}/${fx.total}`,2,'good');elemBurst(p,[0xffe45c,0x5ad1ff,0xffffff],24,1);owHud();}
function owRingHit(ring){const fx=owFx;if(!fx)return;const rm=fx.ringMs.find(x=>x.zi===ring.zone);if(!rm||rm.m.state==='done')return;
 if(ringsHit(rm.m,ring.ri)){if(rm.m.state==='done')owComplete(rm.m.id,'RINGFLUG');else fx.msg=`Ringflug ${rm.m.got.size}/${rm.m.count}`;owHud();}}
const _cm=new T.Matrix4(),_cq=new T.Quaternion(),_cv=new T.Vector3(),_cs=new T.Vector3(1,1,1);
function updateOW(dt){const fx=owFx,p=racers[0];if(!fx||!p)return;const t=elapsed,d=lapDist(p.distance);
 if(fx.hunt){const H=fx.hunt;H.list.forEach((c,i)=>{const on=!H.got.has(i);if(on&&Math.hypot(p.x-c.x,p.z-c.z)<2.8&&(p.y||0)<4){H.got.add(i);store.set('owHunt',[...H.got]);SFX.spore(H.got.size);burst(p,0xffd23f,10);
   toast(`MÜNZJAGD ${H.got.size}/${H.list.length}`,1,'good');if(H.got.size>=H.list.length)owComplete('hunt','Münzjagd');}
  _e.set(0,t*2.2+i,0);_q.setFromEuler(_e);_m.compose(_v.set(c.x,1.5+Math.sin(t*2.4+i)*.25,c.z),_q,_s.setScalar(on?1.7:0));H.im.setMatrixAt(i,_m);});H.im.instanceMatrix.needsUpdate=true;}
 // P-Schalter und Muenzen
 for(const sw of fx.switches){const m=sw.m;
  if(m.state==='ready'&&Math.abs(wrapDiff(d,sw.d))<2.4&&Math.abs(p.offset-sw.off)<2.8&&!p.air&&pswitchPress(m,t)){fx.active=sw;sw.cap.scale.y=.35;SFX.pickup();toast(`P-SCHALTER! ${OW.coins} Münzen in ${OW.coinTime} s`,1.6,'good');}
  if(m.state==='running'){for(let i=0;i<m.coins.length;i++){const c=m.coins[i];if(!c.taken&&Math.abs(wrapDiff(d,c.d))<OW.coinR&&Math.abs(p.offset-c.off)<OW.coinR&&pswitchCollect(m,i,t)){SFX.spore(m.got);if(m.state==='done'){owComplete(sw.id,'P-SCHALTER');fx.active=null;}}}}
  const prev=m.state;pswitchTick(m,t);if(prev==='running'&&m.state==='failed'){toast('ZEIT UM!',1.4,'bad');fx.active=null;}
  if(prev==='failed'&&m.state==='ready')sw.cap.scale.y=1;}
 // Muenzen zeichnen (drehen sich, schweben), sonst verborgen
 const act=fx.switches.find(s=>s.m.state==='running');
 for(const im of fx.coinParts){for(let i=0;i<OW.coins;i++){const c=act&&act.m.coins[i];
   if(!c||c.taken){im.setMatrixAt(i,_zeroM);continue;}
   posAt(c.d,c.off,2+Math.sin(t*3+i)*.25,_cv);_cq.setFromAxisAngle(T.Object3D.DEFAULT_UP,t*3+i*.7);_cm.compose(_cv,_cq,_cs.setScalar(1.9));im.setMatrixAt(i,_cm.multiply(im.userData.local));}
  im.instanceMatrix.needsUpdate=true;}
 // Bojen-Slalom: Tor beim Ueberfahren werten
 for(const s of fx.slaloms){if(s.m.state==='done'){s.prevD=d;continue;}
  if(s.prevD!==null){s.m.gates.forEach((g,k)=>{const a=wrapDiff(s.prevD,g.d),b=wrapDiff(d,g.d);if(a<0&&b>=0&&b<20){const res=slalomPass(s.m,k,p.offset);
   if(res==='hit'){SFX.pickup();fx.msg=`Bojen-Slalom ${s.m.next}/${s.m.gates.length}`;}else if(res==='miss')toast('TOR VERPASST – NOCHMAL VON VORN',1.3,'bad');else if(res==='done')owComplete(s.m.id,'BOJEN-SLALOM');owHud();}});}
  s.prevD=d;}
 // Ringflug: Landen ohne alle Ringe setzt zurueck
 {const f=p.mesh.userData.tf?.cur;if(fx.wasPlane&&f!=='plane')for(const r of fx.ringMs)if(r.m.state!=='done'&&r.m.got.size){ringsLand(r.m);toast('RINGFLUG: ALLE RINGE IN EINEM FLUG!',1.4,'bad');}fx.wasPlane=f==='plane';}
 // Portale: Schleier pulsiert, beim Durchfahren Angebot zum Rennen
 for(const pt of fx.portals){pt.veil.material.opacity=.14+.08*Math.sin(t*3+pt.d);pt.cool=Math.max(0,pt.cool-dt);
  if(pt.cool<=0&&Math.abs(wrapDiff(d,pt.d))<3&&Math.abs(p.offset)<9){pt.cool=6;owPortalAt={ti:pt.ti,until:t+5};SFX.pickup();owHud();}}
 if(owPortalAt&&t>owPortalAt.until){owPortalAt=null;owHud();}
 if(frame%10===0)owHud();}
// Anzeige oben links und Portal-Knopf
let owHudKey='';
function owHud(){const fx=owFx;if(!fx||!worldMode)return;const act=fx.switches.find(s=>s.m.state==='running');
 const line=act?`P-Schalter: ${act.m.got}/${OW.coins} · ${Math.ceil(timeLeft(act.m,elapsed))} s`:fx.msg||(fx.hunt&&fx.hunt.got.size<fx.hunt.list.length?`Münzjagd ${fx.hunt.got.size}/${fx.hunt.list.length} – fahr frei über die Insel`:'Fahr durch Pilzland – Portale führen zu den Rennen');
 const hk=fx.hunt?fx.hunt.got.size:0;
 const k=`${fx.done.length}|${fx.total}|${line}|${hk}|${owPortalAt?owPortalAt.ti:-1}`;if(k===owHudKey)return;owHudKey=k;
 $('owStars').textContent=`★ ${fx.done.length}/${fx.total}`;$('owMission').textContent=line;
 const pb=$('owPortal');pb.hidden=!owPortalAt;if(owPortalAt){const tc=courses[owPortalAt.ti];pb.innerHTML=`<b>▶ ${tc.icon} ${tc.name} fahren</b><span>Enter / tippen</span>`;}}
function owEnterTrack(ti){owPortalAt=null;owPortalHide();mode='single';document.querySelectorAll('#modes .mode').forEach(x=>{const on=x.dataset.mode==='single';x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});
 $('tracks').classList.remove('locked');lastRaceSel=ti;selected=ti;worldMode=false;start();}
function buildGaps(){for(const g of gaps){const h=trackAt(g.start-1).h;
 // Klippenwaende an beiden Kanten + Fluss unten
 for(const d of [g.start,g.end]){const s=sample(d,0),wall=mesh(new T.BoxGeometry(18.5,h+.6,1.2),mat(theme.skirt,{roughness:1}),world,s.p.x,(h-.6)/2,s.p.z);wall.rotation.y=s.angle;}
 const ch=theme.chasm||{c:0x2fb7d8,e:0x0a4a6a,i:.4,label:'SCHLUCHT! VOLLGAS'};
 const water=addStrip(strip(g.start-8,g.end+8,0,60,-h+.3,6,12),mat(ch.c,{roughness:theme.lavaSea?.6:.15,emissive:ch.e,emissiveIntensity:ch.i}),false);water.castShadow=false;
 for(const d of [g.start-3,g.end+3])for(const side of [-1,1]){const p=sample(d,side*12).p;if(P.rock){const r=cloneProto(P.rock);applyTint(r,'StonePaint',0xc0643a);r.position.set(p.x,0,p.z);r.scale.set(2.2,2.8+Math.random(),2.2);world.add(r);}addObstacle(p.x,p.z,2.4);}
 // Warnschilder vor der Schlucht
 // R44: auf der Lava-Feste das Blender-Warnschild (Tafel mit Warndreieck und Lavawellen) statt der Textplakate
 for(const side of [-1,1]){const s=sample(g.start-70,side*12.8);if(theme.ember&&P.hazards){const sg=hzPart('HZ_Sign');sg.position.copy(s.p);sg.rotation.y=s.angle+Math.PI;sg.scale.setScalar(1.35);world.add(sg);addObstacle(s.p.x,s.p.z,.6);continue;}const w=new T.Group();w.position.copy(s.p);w.rotation.y=s.angle;world.add(w);box(w,cream,0,1.6,0,.22,3.2,.22);mesh(new T.PlaneGeometry(4.2,1.7),label((theme.chasm&&theme.chasm.label)||'SCHLUCHT! VOLLGAS','#ffd23f','#2b1d24',512,128),w,0,3.4,0);addObstacle(s.p.x,s.p.z,.4);}}}

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
// Pilzland: Pilzring um den Pilzberg und Haine auf der Wiese - gebuendelt (Instanzen) statt einzeln
function owScenery(random){const offRoad=(x,z,m)=>{const d=projectGlobal(x,z),q=sample(d);return Math.hypot(q.p.x-x,q.p.z-z)>m;};
 for(let i=0;i<16;i++){const a=i/16*TAU+random()*.3,rr=38+random()*46,x=Math.cos(a)*rr,z=Math.sin(a)*rr;mushroom(x,z,2.6+random()*4,theme.caps[i%theme.caps.length]);addObstacle(x,z,2.4);}
 for(let g=0;g<12;g++){const a=random()*TAU,rr=110+random()*300,cx=Math.cos(a)*rr,cz=Math.sin(a)*rr;
  for(let i=0;i<9;i++){const x=cx+(random()-.5)*44,z=cz+(random()-.5)*44;if(zones.some(q=>Math.hypot(q.x-x,q.z-z)<q.r+6)||Math.hypot(x,z)<95||!offRoad(x,z,16))continue;
   if(random()<.65){tree(x,z,1.4+random()*1.6,theme.caps[i%theme.caps.length]);}else mushroom(x,z,1.5+random()*2.5,theme.caps[i%theme.caps.length]);addObstacle(x,z,1.2);}}}
function buildScenery(random){batch=new Map();buildSceneryInner(random);if(course.openWorld)owScenery(random);forkIslandDecor();for(const b of batch.values())scatterColored(b.proto,b.list,'CapPaint',b.tint,120,.028);batch=null;buildGrass(random);}
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
const GRASS={forest:[0x2f8a2a,0x9be25a],fair:[0x2f8a3a,0xb6f06a],canyon:[0x9a6a2a,0xf0c878],night:[0x14505a,0x44d6c8],haunted:[0x2e3c26,0x7f8f58],lava:[0x3a2a26,0x8a4424]};
function buildGrass(random){const [c0,c1]=GRASS[course.theme]||GRASS.forest,a=new T.Color(c0),b=new T.Color(c1),pos=[],col=[];
 for(let k=0;k<4;k++){const ang=k/4*Math.PI+.3,cx=Math.cos(ang)*.28,cz=Math.sin(ang)*.28,h=.55+(k%2)*.25;pos.push(-cx,0,-cz,cx,0,cz,cx*.15,h,cz*.15);col.push(a.r,a.g,a.b,a.r,a.g,a.b,b.r,b.g,b.b);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeVertexNormals();
 const matG=stdMat({vertexColors:true,side:T.DoubleSide,roughness:1}),cells=new Map();
 // Gras wiegt sich im Wind (Instanz-Position als Phase)
 matG.onBeforeCompile=sh=>{sh.uniforms.uTime=shaderTime;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 gp=instanceMatrix[3].xyz;float sw=sin(uTime*1.7+gp.x*.11+gp.z*.15)*.22+sin(uTime*3.1+gp.z*.23)*.08;transformed.x+=sw*transformed.y;transformed.z+=sw*.55*transformed.y;\n#endif');};
 for(let i=0;i<1800*DENS;i++){const d=random()*length,side=random()<.5?-1:1,off=side*(11.8+Math.pow(random(),1.6)*14);if(inGap(d)||inZone(d,20)||forkRoadNear(d,off,7.5)||inBridge(d)||inTunnel(d))continue;const s=samplePos(d,off,_sp),y=Math.max(0,s.y-(Math.abs(off)-8.9)/1.5);const key=Math.floor(s.x/120)+','+Math.floor(s.z/120);let c=cells.get(key);if(!c)cells.set(key,c=[]);c.push([s.x,y,s.z,.7+random()*.9,random()*TAU]);}
 for(const list of cells.values()){const im=new T.InstancedMesh(geo,matG,list.length);list.forEach(([x,y,z,sc,ry],i)=>{_e.set(0,ry,0);_q.setFromEuler(_e);_m.compose(_v.set(x,y,z),_q,_s.set(sc,sc*(.8+((i*37)%7)/14),sc));im.setMatrixAt(i,_m);});im.castShadow=false;im.receiveShadow=true;world.add(im);}}
// Riesenrad (R38, Blender): Wahrzeichen der Magnet-Kirmes. Eine GLB, drei Teile ueber die
// Materialnamen: Gestell (gebacken), Rad (WheelPaint/WheelLights, dreht um die Nabe in 24 m Hoehe)
// und die Gondel-Vorlage (GondolaPaint/GondolaTrim, Aufhaengepunkt im Ursprung). Zwoelf Gondeln als
// Instanzen, die immer senkrecht haengen. Steht im Innenfeld mit Blick zur Start-Ziel-Geraden.
const FERRIS={hub:24,r:20,n:12,wheel:new Set(['WheelPaint','WheelLights']),gond:new Set(['GondolaPaint','GondolaTrim'])};
function buildFerris(clear){const src=P.ferriswheel;if(!src)return;
 let spot=null;for(const [x,z] of [[10,-6],[-14,-22],[24,-30],[-30,8],[0,-40],[34,10],[-40,-30]])if(clear(x,z,30)){spot=[x,z];break;}
 if(!spot)return;const [fx,fz]=spot,start=sample(0).p,g=new T.Group(),wheel=new T.Group();
 g.position.set(fx,0,fz);g.rotation.y=Math.atan2(start.x-fx,start.z-fz);world.add(g);
 wheel.position.y=FERRIS.hub;g.add(wheel);const gond=[];
 src.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const n=o.material.name;
  if(FERRIS.wheel.has(n)){const m=new T.Mesh(o.geometry.clone().translate(0,-FERRIS.hub,0),n==='WheelLights'?o.material.clone():o.material);m.castShadow=n!=='WheelLights';wheel.add(m);if(n==='WheelLights')wheel.userData.lights=m.material;}
  else if(FERRIS.gond.has(n))gond.push(o);
  else{const m=new T.Mesh(o.geometry,o.material);m.castShadow=true;m.receiveShadow=true;g.add(m);}});
 // Gondeln: je Material eine Instanz-Gruppe, der Pilzhut bekommt die Kirmesfarben
 const insts=gond.map(o=>{let m=o.material;if(m.name==='GondolaPaint'){m=m.clone();m.color.set(0xffffff);}
  const im=new T.InstancedMesh(o.geometry,m,FERRIS.n);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.castShadow=true;im.frustumCulled=false;
  if(o.material.name==='GondolaPaint')for(let i=0;i<FERRIS.n;i++)im.setColorAt(i,_col.setHex(theme.caps[i%theme.caps.length]));
  g.add(im);return im;});
 // Kollision: Plattform und A-Boecke (die Plattform steht fern der Fahrbahn, trotzdem sauber)
 g.updateMatrixWorld(true);const v=new T.Vector3();for(const [x,z,r] of [[0,0,6],[-9,0,4],[9,0,4],[-9.5,-3.4,2.2]]){v.set(x,0,z).applyMatrix4(g.matrixWorld);addObstacle(v.x,v.z,r);}
 zones.push({d:projectGlobal(fx,fz),half:0,x:fx,z:fz,r:28});
 ferris={g,wheel,insts,rot:0};updateFerris(0,0);}
function updateFerris(dt,now){const f=ferris;if(!f)return;f.rot+=dt*.075;f.wheel.rotation.z=f.rot;
 for(let i=0;i<FERRIS.n;i++){const a=f.rot+i*TAU/FERRIS.n;_m.makeTranslation(Math.cos(a)*FERRIS.r,FERRIS.hub+Math.sin(a)*FERRIS.r,0);for(const im of f.insts)im.setMatrixAt(i,_m);}
 for(const im of f.insts)im.instanceMatrix.needsUpdate=true;
 const L=f.wheel.userData.lights;if(L)L.emissiveIntensity=1.6+.6*Math.sin(now*.004);}
function buildSceneryInner(random){const th=course.theme,glow=theme.glow;
 const clear=(x,z,min)=>{if(trainFx&&trainFx.pts.some(p=>Math.abs(p[0]-x)<9&&Math.abs(p[1]-z)<9))return false;const d=projectGlobal(x,z),s=sample(d);return Math.hypot(s.p.x-x,s.p.z-z)>(inTunnel(d)?Math.max(min,22):min)+Math.max(0,s.p.y)*1.6&&zones.every(q=>Math.hypot(q.x-x,q.z-z)>q.r)&&!nearFork(x,z,min+8);};
 if((th==='forest'||th==='night')&&P.hazards&&!course.openWorld){const pp=hzPart('HZ_Pipe'),list=[];for(let i=0;i<Math.round(14*AK);i++){const x=(random()-.5)*340*WK,z=(random()-.5)*320*WK;if(Math.hypot(x,z)>180*WK||!clear(x,z,16))continue;
  for(let k=0;k<3;k++){const a=random()*TAU,rr=k?2.6+random()*1.2:0,px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr,sy=.6+random()*1.1;list.push({x:px,z:pz,y:0,s:1.05,sy,ry:random()*TAU});addObstacle(px,pz,1.5);}}scatterInstanced(pp,list,{PipePaint:glow?0x2de2e6:0x2aa84a},120);}
 // Riesenrad zuerst: seine Sperrzone haelt Baeume und Riesenpilze aus dem Blickfeld
 if(th==='fair')buildFerris(clear);
 if(th==='forest'||th==='night'||th==='fair'){
  for(let i=0;i<Math.round(190*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*330*WK;if(Math.hypot(x,z)>186*WK||!clear(x,z,15))continue;const s=1+random()*2.3;
   if(i%3===0){mushroom(x,z,s,theme.caps[i%theme.caps.length],0,glow&&th!=='fair'?.9:0);addObstacle(x,z,.55*s);}else{tree(x,z,s*.8,theme.leaves[i%theme.leaves.length]);addObstacle(x,z,.55*s*.8);}}
  if(P.rock){const rocks=[];for(let i=0;i<Math.round(30*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*320*WK;if(Math.hypot(x,z)>182*WK||!clear(x,z,13))continue;const s=.6+random()*2.2,sx=.7+random()*.6;rocks.push({x,z,s,sx,ry:random()*TAU});addObstacle(x,z,1.1*s*sx);}scatterInstanced(P.rock,rocks,null,140);}
  const landmarks=th==='night'?[[0,0,6.5,0xff3cac],[30,10,3.6,0x2de2e6],[-30,-10,4.2,0x9d6bff]]:[[10,5,6.5,0xe8352e],[34,14,3.4,0xf5a623],[-28,-12,4,0x8e5bd9]];
  for(const [x,z,s,c] of landmarks)if(clear(x,z,12)){mushroom(x,z,s,c,0,glow&&th!=='fair'?1.1:0);addObstacle(x,z,.55*s);}
  // Blumen (forest) bzw. Leuchtsteine (night) am Wegesrand fuer Farbe
  const n=Math.round((th==='night'?260:520)*DENS),flowers=new T.InstancedMesh(new T.IcosahedronGeometry(.28,0),stdMat({color:0xffffff,roughness:.6,...(glow?{emissive:0xffffff,emissiveIntensity:.7}:{})}),n),c=new T.Color(),m=new T.Matrix4(),palette=th==='night'?[0x2de2e6,0xff3cac,0xfff05a]:[0xff4d6d,0xffd23f,0xffffff,0xa66bff,0xff8a3d];
  for(let i=0;i<n;i++){const d=random()*length,off=(random()<.5?-1:1)*(11+random()*22),s=sample(d,off);if(inGap(d)||forkRoadNear(d,off,7.5)||inTunnel(d)){m.makeScale(0,0,0);}else m.compose(new T.Vector3(s.p.x,Math.max(0,s.p.y-(Math.abs(off)-8.9)/1.5)+.15,s.p.z),new T.Quaternion(),new T.Vector3(1,.6,1).multiplyScalar(.7+random()*.8));flowers.setMatrixAt(i,m);flowers.setColorAt(i,c.setHex(palette[i%palette.length]));}
  flowers.castShadow=false;world.add(flowers);}
 if(th==='haunted'){
  for(let i=0;i<Math.round(130*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*330*WK;if(Math.hypot(x,z)>186*WK||!clear(x,z,15))continue;const s=1+random()*2;
   if(i%4===0){mushroom(x,z,s*.9,theme.caps[i%theme.caps.length],0,.8);addObstacle(x,z,.5*s);}else{tree(x,z,s*.85,theme.leaves[i%theme.leaves.length]);addObstacle(x,z,.5*s*.85);}}
  if(P.gravestone){const graves=[];for(let k=0;k<7;k++){const cx=(random()-.5)*300*WK,cz=(random()-.5)*280*WK;for(let i=0;i<16;i++){const x=cx+(i%4)*3.4-5+random(),z=cz+Math.floor(i/4)*3.6-6+random();if(Math.hypot(x,z)>184*WK||!clear(x,z,13))continue;graves.push({x,z,s:1.1+random()*.5,ry:(random()-.5)*.6+k*.9});addObstacle(x,z,.8);}}scatterInstanced(P.gravestone,graves,null,80);}
  if(P.pumpkin){const pk=[];for(let i=0;i<Math.round(80*AK);i++){const d=random()*length,side=random()<.5?-1:1,off=side*(13+random()*6),s=sample(d,off);if(inZone(d,22)||inGap(d)||forkBlocks(d,off)||inBridge(d)||inTunnel(d))continue;pk.push({x:s.p.x,y:Math.max(0,s.p.y-(Math.abs(off)-8.9)/1.5),z:s.p.z,s:.9+random()*1.1,ry:Math.atan2(-s.t.z*side,s.t.x*side)});addObstacle(s.p.x,s.p.z,.8);}scatterInstanced(P.pumpkin,pk,null,80);}
  const batGeo=new T.BufferGeometry();batGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-1.3,.4,-.25,-.55,0,.35,0,0,0,.55,0,.35,1.3,.4,-.25],3));batGeo.computeVertexNormals();
  bats=new T.InstancedMesh(batGeo,new T.MeshBasicMaterial({color:0x08060e,side:T.DoubleSide}),28);bats.frustumCulled=false;world.add(bats);}
 if(th==='rainbow'){
  // Schwebende Kristallinseln und Sternenstaub statt Landschaft
  const crystal=mergeGeometries([new T.ConeGeometry(3,9,6).translate(0,4.5,0),new T.ConeGeometry(3,4,6).rotateZ(Math.PI).translate(0,-2,0)]);
  const cols=[0xff4fa3,0x4fd8ff,0xffe45c,0x8affc8,0x8a5cff];
  for(let c=0;c<5;c++){const list=[];
   for(let i=0;i<26;i++){const a=random()*TAU,r=(110+random()*150)*WK,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(!clear(x,z,26))continue;list.push({x,y:-20-random()*55,z,s:.8+random()*2.6,ry:random()*TAU});}
   if(!list.length)continue;
   const im=new T.InstancedMesh(crystal,stdMat({color:cols[c],emissive:cols[c],emissiveIntensity:.5,roughness:.35,flatShading:true}),list.length);
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
  if(P.rock){const rocks=[];for(let i=0;i<Math.round(80*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*330*WK;if(Math.hypot(x,z)>185*WK||!clear(x,z,14))continue;const s=1.1+random()*2.3,sy=1.4+random()*3.4;rocks.push({x,z,s,sy,sx:.8+random()*.5,ry:random()*TAU});addObstacle(x,z,1.1*s);}scatterInstanced(P.rock,rocks,{StonePaint:0x2e2226},130);}
  {const pool=new T.CircleGeometry(1,16).rotateX(-Math.PI/2),pm=new T.InstancedMesh(pool,new T.MeshBasicMaterial({color:0xff5a18}),70),m=new T.Matrix4();
   for(let i=0;i<Math.round(70*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*330*WK,r=4+random()*12;
    if(Math.hypot(x,z)>178*WK||!clear(x,z,r+14))m.makeScale(0,0,0);else m.compose(new T.Vector3(x,.12,z),new T.Quaternion(),new T.Vector3(r,1,r*(.6+random()*.7)));pm.setMatrixAt(i,m);}
   pm.castShadow=false;pm.receiveShadow=false;world.add(pm);}
  {const gs=[[],[]];for(let i=0;i<13;i++){const a=i/13*TAU+random()*.3,r=(246+random()*70)*WK,rad=20+random()*26,h=36+random()*48,x=Math.cos(a)*r,z=Math.sin(a)*r;
    gs[i%2].push(new T.CylinderGeometry(rad*.3,rad,h,7).translate(x,h/2-8,z));}
   [theme.hills[0],theme.hills[1]].forEach((c,i)=>world.add(new T.Mesh(mergeGeometries(gs[i]),mat(c,{flatShading:true,roughness:1}))));}
  {const n=300,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){const d=random()*length,s=sample(d,(random()-.5)*70);pos[i*3]=s.p.x;pos[i*3+1]=Math.max(0,s.p.y);pos[i*3+2]=s.p.z;ph[i]=random()*TAU;}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
   fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'uniform float uTime;attribute float phase;varying float vA;void main(){float t=mod(uTime*.55+phase,6.2831);vec3 p=position+vec3(sin(uTime*.6+phase)*2.5,t*3.4,cos(uTime*.5+phase*1.7)*2.5);vA=1.-t/6.2831;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(150./-mv.z,1.5,7.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.55,.18,(1.-smoothstep(.1,.5,d))*vA*.8);}'}));
   fireflies.frustumCulled=false;world.add(fireflies);}}
 if(th==='canyon'){
  // Felsnadeln & Kakteen auf der Insel, Tafelberge am Horizont
  if(P.rock){const rocks=[];for(let i=0;i<Math.round(60*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*330*WK;if(Math.hypot(x,z)>185*WK||!clear(x,z,14))continue;const s=1.2+random()*2.4,sy=1.5+random()*3;rocks.push({x,z,s,sy,sx:.8+random()*.5,ry:random()*TAU});addObstacle(x,z,1.2*s);}scatterInstanced(P.rock,rocks,{StonePaint:0xc0643a,MossPaint:0xe8a15a},140);}
  const cactusGeo=mergeGeometries([new T.CylinderGeometry(.45,.5,4.2,8).translate(0,2.1,0),new T.CylinderGeometry(.3,.3,1.6,8).rotateZ(Math.PI/2).translate(.9,2,0),new T.CylinderGeometry(.28,.28,1.5,8).translate(1.55,2.6,0),new T.CylinderGeometry(.26,.26,1.2,8).rotateZ(Math.PI/2).translate(-.8,2.8,0),new T.CylinderGeometry(.25,.25,1.1,8).translate(-1.3,3.25,0)]);
  const cacti=[];for(let i=0;i<Math.round(70*AK);i++){const x=(random()-.5)*360*WK,z=(random()-.5)*330*WK;if(Math.hypot(x,z)>186*WK||!clear(x,z,13))continue;cacti.push([x,z,.8+random()*.8,random()*TAU]);addObstacle(x,z,.7);}
  const cm=new T.InstancedMesh(cactusGeo,mat(0x4f8a3a,{roughness:.7}),cacti.length),m=new T.Matrix4();cacti.forEach(([x,z,s,r],i)=>{m.compose(new T.Vector3(x,0,z),new T.Quaternion().setFromEuler(new T.Euler(0,r,0)),new T.Vector3(s,s,s));cm.setMatrixAt(i,m);});cm.castShadow=true;world.add(cm);
  for(let i=0;i<Math.round(18*AK);i++){const x=(random()-.5)*330*WK,z=(random()-.5)*300*WK;if(Math.hypot(x,z)>180*WK||!clear(x,z,16)||i%2)continue;mushroom(x,z,1.2+random()*1.5,theme.caps[i%theme.caps.length]);addObstacle(x,z,.8);}
  {const gs=[[],[],[]];for(let i=0;i<14;i++){const a=i/14*TAU+random()*.2,r=(240+random()*60)*WK,rad=18+random()*26,h=26+random()*40,x=Math.cos(a)*r,z=Math.sin(a)*r;gs[i%2].push(new T.CylinderGeometry(rad*.8,rad,h,7).translate(x,h/2-8,z));gs[2].push(new T.CylinderGeometry(rad*.82,rad*.8,3,7).translate(x,h-6.5,z));}
  [theme.hills[0],theme.hills[1],0xe9a060].forEach((c,i)=>world.add(new T.Mesh(mergeGeometries(gs[i]),mat(c,{flatShading:true,roughness:1}))));}}
 if(th!=='canyon'&&th!=='lava'&&th!=='rainbow'){const gs=[[],[]];for(let i=0;i<16;i++){const a=i/16*TAU,r=(228+random()*70)*WK;gs[i%2].push(new T.SphereGeometry(1,16,12).scale(25+random()*25,28+random()*34,24+random()*15).translate(Math.cos(a)*r,-4,Math.sin(a)*r));}gs.forEach((g,i)=>{const h=new T.Mesh(mergeGeometries(g),mat(theme.hills[i]));h.receiveShadow=true;world.add(h);});}
 // R44: Comic-Wolken aus Blender (drei Formen mit flachem Boden, instanziert, Unterseite kuehl schattiert); Fallback Kugel-Haufen
 const cgeo=P.clouds?[0,1,2].map(v=>P.clouds.getObjectByName('CL_Cloud'+v)?.geometry).filter(Boolean):[];
 const cloudInst=(list,material)=>cgeo.forEach((g,v)=>{const l=list.filter(c=>c.v%cgeo.length===v);if(!l.length)return;const im=new T.InstancedMesh(g,material,l.length);
  l.forEach((c,i)=>{_e.set(0,c.ry,0);_q.setFromEuler(_e);_m.compose(_v.set(c.x,c.y,c.z),_q,_s.set(c.s,c.s*c.sy,c.s*c.sz));im.setMatrixAt(i,_m);});world.add(im);});
 if(theme.clouds){const list=[];for(let i=0;i<Math.round(15*WK);i++){const cx=(random()-.5)*420*WK,cy=60+random()*40,cz=(random()-.5)*350*WK;list.push({x:cx,y:cy,z:cz,s:1+((i*37)%10)/26,sy:1,sz:1,ry:(i*2.39)%TAU,v:i});}
  if(cgeo.length)cloudInst(list,stdMat({color:0xffffff,roughness:1,vertexColors:true,emissive:0xe8f0ff,emissiveIntensity:.2}));
  else{const gs=[];for(const c of list)for(let k=0;k<4;k++)gs.push(new T.SphereGeometry(1,12,8).scale(5,3.5,3).translate(c.x+k*4-6,c.y+Math.sin(k)*2,c.z));world.add(new T.Mesh(mergeGeometries(gs),white));}}
 // Wetter-Wolken: Canyon bekommt Abendrot, Lava-Feste Glutwolken - flache Haufen, ein Aufruf je Thema
 if(theme.cloudCols){const cm=stdMat({color:theme.cloudCols[0],roughness:1,emissive:theme.cloudCols[1],emissiveIntensity:.38,vertexColors:cgeo.length>0}),gs=[],list=[];
  for(let i=0;i<Math.round(14*WK);i++){const cx=(random()-.5)*460*WK,cy=78+random()*52,cz=(random()-.5)*380*WK,w=8+random()*8;list.push({x:cx,y:cy,z:cz,s:w/5,sy:.32,sz:.9,ry:(i*1.77)%TAU,v:i});
   if(!cgeo.length)for(let k=0;k<4;k++)gs.push(new T.SphereGeometry(1,10,7).scale(w*(k===1||k===2?.72:1),2.3,w*.5).translate(cx+k*w*.62-w,cy+(k===1?1.4:0),cz+(k%2?1.3:-1.3)));}
  if(cgeo.length)cloudInst(list,cm);else world.add(new T.Mesh(mergeGeometries(gs),cm));}
 if(P.balloon)for(let i=0;i<theme.balloons;i++){const a=i/Math.max(1,theme.balloons)*TAU+random(),r=90+random()*60,g=cloneProto(P.balloon);applyTint(g,'CapPaint',[0xed6350,0xffd45c,0x55bdb2,0xa688dc][i]);g.position.set(Math.cos(a)*r,30+random()*20,Math.sin(a)*r);world.add(g);balloons.push({g,base:g.position.y,ph:random()*TAU});}
 if(th==='night'||th==='haunted'||th==='fair'){
  // Laternen entlang der Strecke + Gluehwuermchen (Shader-Partikel)
  const lampGeo=new T.CylinderGeometry(.12,.16,4,6).translate(0,2,0),bulbGeo=new T.SphereGeometry(.45,10,8).translate(0,4.2,0),posts=[];for(let d=10;d<length;d+=38){if(inGap(d)||inZone(d,6)||inTunnel(d))continue;const side=Math.round(d/38)%2?1:-1;if(forkBlocks(d,side*12.6))continue;const s=sample(d,side*12.6);posts.push([s.p.x,groundAt(d,side*12.6).y-.3,s.p.z,side]);addObstacle(s.p.x,s.p.z,.4);}
  const pm=new T.InstancedMesh(lampGeo,mat(0x2a2f5a),posts.length),bm=new T.InstancedMesh(bulbGeo,stdMat({color:0xffffff,emissive:0xffffff,emissiveIntensity:1.4}),posts.length),m=new T.Matrix4(),c=new T.Color();posts.forEach(([x,y,z,side],i)=>{m.makeTranslation(x,y,z);pm.setMatrixAt(i,m);bm.setMatrixAt(i,m);bm.setColorAt(i,c.setHex(th==='haunted'?(side>0?0x9dff7a:0xb48cff):th==='fair'?(side>0?0xffe45c:0xff3b6b):side>0?0x2de2e6:0xff3cac));});world.add(pm,bm);
  const n=420,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){const d=random()*length,s=sample(d,(random()-.5)*60);pos[i*3]=s.p.x;pos[i*3+1]=Math.max(0,s.p.y)+.8+random()*5;pos[i*3+2]=s.p.z;ph[i]=random()*TAU;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
  fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'uniform float uTime;attribute float phase;varying float vA;void main(){vec3 p=position+vec3(sin(uTime*.7+phase)*1.5,sin(uTime*1.3+phase*2.)*.8,cos(uTime*.6+phase)*1.5);vec4 mv=modelViewMatrix*vec4(p,1.);vA=.55+.45*sin(uTime*3.+phase*5.);gl_PointSize=clamp(180./-mv.z,2.,14.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.75,1.,.45)*(1.-smoothstep(.1,.5,d))*vA,1.);}'}));fireflies.frustumCulled=false;world.add(fireflies);}
 if(th==='canyon'){const n=220,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){pos[i*3]=(random()-.5)*360*WK;pos[i*3+1]=1+random()*14;pos[i*3+2]=(random()-.5)*330*WK;ph[i]=random()*TAU;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
  fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,vertexShader:'uniform float uTime;attribute float phase;void main(){vec3 p=position+vec3(mod(uTime*6.+phase*40.,80.)-40.,sin(uTime+phase)*1.,sin(uTime*.5+phase)*3.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(220./-mv.z,1.5,9.);gl_Position=projectionMatrix*mv;}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.82,.6,(1.-smoothstep(.15,.5,d))*.45);}'}));fireflies.frustumCulled=false;world.add(fireflies);}}

function chevronTex(dir){return canvasTex(128,64,(q,w,h)=>{q.fillStyle=theme.glow?'#1a1030':'#d7263d';q.fillRect(0,0,w,h);q.strokeStyle=theme.chev||(theme.glow?(course.theme==='haunted'?'#9dff7a':'#2de2e6'):'#ffffff');q.lineWidth=11;q.lineJoin='round';for(const x of [30,64,98]){q.beginPath();q.moveTo(x-dir*12,10);q.lineTo(x+dir*12,32);q.lineTo(x-dir*12,54);q.stroke();}});}
function buildChevrons(){const texL=chevronTex(-1),texR=chevronTex(1),mk=t=>stdMat({map:t,roughness:.6,...(theme.glow?{emissive:0xffffff,emissiveMap:t,emissiveIntensity:.9}:{})}),mL=mk(texL),mR=mk(texR),geo=new T.PlaneGeometry(2.6,1.3),post=new T.CylinderGeometry(.08,.08,1.6,6);
 const bl=[],br=[],posts=[];let last=-99;for(let d=0;d<length;d+=3){const k=trackAt(d).kap;if(Math.abs(k)<1/30||inGap(d)||inZone(d,10)||d-last<45)continue;let apex=d,km=Math.abs(k);for(let s=d;s<d+40;s+=2){const kk=Math.abs(trackAt(s).kap);if(kk>km){km=kk;apex=s;}}last=apex;const left=trackAt(apex).kap>0,side=left?-1:1;
  for(const o of [-9,0,9]){if(forkBlocks(apex+o,side*12.8)||inTunnel(apex+o))continue;const s=sample(apex+o,side*12.8),M4=new T.Matrix4().makeRotationY(s.angle+Math.PI).setPosition(s.p.x,groundAt(apex+o,side*12.8).y-.1,s.p.z);(left?bl:br).push(geo.clone().translate(0,2,0).applyMatrix4(M4));posts.push(post.clone().translate(0,.8,0).applyMatrix4(M4));addObstacle(s.p.x,s.p.z,.5);}}
 if(bl.length)world.add(new T.Mesh(mergeGeometries(bl),mL));if(br.length)world.add(new T.Mesh(mergeGeometries(br),mR));if(posts.length)world.add(new T.Mesh(mergeGeometries(posts),dark));}
function windRingModel(){
 const root=P.windring?cloneProto(P.windring):new T.Mesh(new T.TorusGeometry(3.2,.13,8,48),mat(0x8aead6,{name:'WindGlow',emissive:0x42d8be,emissiveIntensity:.55,roughness:.5}));
 const glow=[];root.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
  if(o.material.name==='WindGlow'){o.material=o.material.clone();o.material.emissive.setHex(0x42d8be);o.material.emissiveIntensity=.55;glow.push(o.material);}});
 return {root,glow};}
function buildRamps(){const list=course.ramps.map(([v,off,w])=>({d:straightSpot(v,35,85),off,w}));for(const g of gaps)list.push({d:lapDist(g.start-RAMP_LEN/2-.4),off:0,w:13,gap:true});
 for(const {d,off,w,gap} of list){const r={d,off,w,start:d-RAMP_LEN/2,end:d+RAMP_LEN/2,gap};ramps.push(r);const s=sample(d,off);let g;if(P.ramp){g=cloneProto(P.ramp);g.scale.set(w/6.4,1,RAMP_LEN/4.8);if(gap)applyTint(g,'RampPaint',0xffd23f);}else{g=new T.Group();const m=mesh(new T.BoxGeometry(w,.2,RAMP_LEN),mat(0xed6350),g,0,RAMP_H/2,0);m.rotation.x=-Math.atan(RAMP_H/RAMP_LEN);}g.position.copy(s.p);g.rotation.order='YXZ';g.rotation.set(Math.atan(slopeAt(d)),s.angle+Math.PI,s.bank);world.add(g);
  if(gap)continue;
  const rd=r.end+12,rs=sample(rd,off),art=windRingModel(),ring=art.root;ring.position.copy(rs.p);ring.position.y+=3.8;ring.rotation.order='YXZ';ring.rotation.y=rs.angle+Math.PI;world.add(ring);rings.push({d:lapDist(rd),off,y:ring.position.y,mesh:ring,glow:art.glow,flash:0,precision:false});}}
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
 g.scale.setScalar(theme.ember?1.5:1.7);const sw={d,amp,spd,ph,mesh:g,x:0,z:0,fire:!!theme.ember};swingers.push(sw);
 // R44: Feuerkoenig-Statue neben der Bahn spuckt den Feuerball quer ueber die Strecke (Seiten abwechselnd)
 if(sw.fire){sw.side=swingers.filter(q=>q.fire).length%2?1:-1;const st=hzPart('HZ_Statue');if(st){const p=samplePos(d,sw.side*(ROAD_HALF+9),new T.Vector3()),c=samplePos(d,0,_sp);st.position.copy(p);st.rotation.y=Math.atan2(c.x-p.x,c.z-p.z);world.add(st);addObstacle(p.x,p.z,4.2);sw.statue=st;}}}
 for(const [v,amp,spd,ph] of course.ghosts||[]){let d=outOfRoll(cpDist(v));for(const r of [...ramps,...pads])if(Math.abs(wrapDiff(d,r.d))<32)d=lapDist(r.d+42);let g;if(P.ghost){g=cloneProto(P.ghost);g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.88;}});}else{g=new T.Group();sphere(g,mat(0xeef3ff,{emissive:0x9fb4ff,emissiveIntensity:.4}),0,1.7,0,1);}
  g.scale.setScalar(1.2);world.add(g);swingers.push({d,amp,spd,ph,mesh:g,x:0,z:0,y:0,kind:'ghost'});}}
function buildSpores(){const add=(d,off,lift)=>{if(inGap(d))return;const p=sample(d,off).p;spores.push({d:lapDist(d),off,x:p.x,z:p.z,y:p.y+lift,cd:0,ph:spores.length*.7});};
 // Sporen-Linien auf der Ideallinie der Kurven: wer sauber faehrt, sammelt sie
 for(let k=0;k<10;k++){const d0=length*((k+.35)/10);if(ramps.some(r=>Math.abs(wrapDiff(d0,r.d))<30)||inGap(d0))continue;const kap=trackAt(d0+10).kap,off=clamp(kap*120,-5,5)||Math.sin(k*2.1)*4;for(let i=0;i<5;i++)add(d0+i*4,off,1);}
 for(const r of ramps)if(!r.gap)[[5,2.4],[9,3.3],[13,3]].forEach(([dd,l])=>add(r.end+dd,r.off,l+RAMP_H));
 for(const f of forks)for(let rel=f.span*.3;rel<f.span*.7;rel+=5)add(f.dA+rel,f.offT[Math.round(rel)],1);
 // R44: Sporenmuenze aus Blender (assets/coin.glb, gepraegter Pilz) statt gelbem Ikosaeder
 let cg=null,cm=null;P.coin?.traverse(o=>{if(o.isMesh&&!cg){cg=o.geometry;cm=o.material;}});
 const m=cm||stdMat({color:0xfff27a,emissive:0xffb627,emissiveIntensity:1.2,roughness:.35,flatShading:true});sporeMesh=new T.InstancedMesh(cg||new T.IcosahedronGeometry(.45,0),m,Math.max(1,spores.length));sporeMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);sporeMesh.castShadow=false;world.add(sporeMesh);}
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
function updateSpores(dt,now){if(!sporeMesh)return;spores.forEach((s,i)=>{if(s.cd>0)s.cd-=dt;const vis=s.cd<=0?1:0;_e.set(0,now*.0034+s.ph,0);_q.setFromEuler(_e);_m.compose(_v.set(s.x,s.y+Math.sin(now*.004+s.ph)*.18,s.z),_q,_s.set(vis,vis,vis));sporeMesh.setMatrixAt(i,_m);});sporeMesh.instanceMatrix.needsUpdate=true;}
// ---------------------------------------------------------------- R44: Hindernisse aus art/r44/create_hazards.py
// Stampfer (stampft im Takt auf eine Spur), Roehren mit Schnappblumen am Rand, Roehrenkanone mit Kugelblitzen.
// Die Feuerkoenig-Statuen entstehen in buildSwingers (je Feuerball eine Statue, von der er ausgespuckt wird).
function hzPart(n){const o=P.hazards?.getObjectByName(n);if(!o)return null;const c=o.clone(true);c.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});return c;}
let HZ_SHADOW=null;
function buildHazards(){hz={stampers:[],plants:[],cannons:[],missiles:[]};if(!P.hazards)return;
 if(!HZ_SHADOW)HZ_SHADOW={geo:new T.PlaneGeometry(4.6,3.6).rotateX(-Math.PI/2),mat:new T.MeshBasicMaterial({color:0x05030a,transparent:true,opacity:.3,depthWrite:false})};
 const stoneCol=course.theme==='lava'?0x5a403c:theme.space?0xb9a8ff:0x9aa0ad;
 for(const [v,off,ph=0] of course.stampers||[]){const d=cpDist(v),g=hzPart('HZ_Stamper');if(!g)break;applyTint(g,'StonePaint',stoneCol);const p=samplePos(d,off,new T.Vector3());g.position.copy(p);g.rotation.y=sample(d).angle;world.add(g);
  const sh=new T.Mesh(HZ_SHADOW.geo,HZ_SHADOW.mat.clone());sh.position.set(p.x,p.y+.06,p.z);sh.rotation.y=g.rotation.y;sh.renderOrder=2;world.add(sh);
  hz.stampers.push({d,off,ph,g,base:p.y,sh,was:'up',st:null});}
 const pipeCol=theme.glow?0x2de2e6:0x2aa84a,plantCol=theme.glow?0xff3cac:0xd21f6a;
 for(const [v,side,plant=1] of course.pipes||[]){const d=cpDist(v),off=side*(ROAD_HALF+5.3),g=hzPart('HZ_Pipe');if(!g)break;applyTint(g,'PipePaint',pipeCol);const p=samplePos(d,off,new T.Vector3());g.position.copy(p);world.add(g);addObstacle(p.x,p.z,1.7);
  if(!plant)continue;const root=new T.Group(),lean=new T.Group(),stem=hzPart('HZ_PlantStem'),top=hzPart('HZ_PlantJawTop'),bot=hzPart('HZ_PlantJawBot');
  for(const q of [top,bot])applyTint(q,'PlantPaint',plantCol);lean.add(stem,top,bot);root.add(lean);root.position.set(p.x,p.y+3.2,p.z);world.add(root);
  hz.plants.push({d,off,side,root,lean,top,bot,x:p.x,y:p.y+3.2,z:p.z,cd:0,lunge:0,ph:d*.37,head:new T.Vector3()});}
 // R44: Burgturm der Lava-Feste - Hochstrasse windet sich an ihm hinauf, oben Mauerdurchbruch und Kanonen-Portal
 const tw=P.tower;for(const [v] of course.towers||[]){const d=cpDist(v),tr=tw?.getObjectByName('LT_Tower');if(!tr)break;const inside=trackAt(d).kap>0?1:-1,p=samplePos(d,inside*(9.4+2+13.8),new T.Vector3()),g=tr.clone(true);g.position.set(p.x,0,p.z);g.rotation.y=sample(d).angle;g.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});world.add(g);addObstacle(p.x,p.z,14.5);zones.push({d,half:0,x:p.x,z:p.z,r:24});}
 for(const [v,side,over] of course.cannons||[]){const d=cpDist(v),g=hzPart('HZ_Cannon');if(!g)break;
  // "ueber der Bahn": Kanone auf einem Steinportal mitten ueber der Strasse, frontal gegen die anfahrenden Karts
  if(over){const p=samplePos(d,0,new T.Vector3()),ang=sample(d).angle,gt=tw?.getObjectByName('LT_Gantry')?.clone(true);if(gt){gt.position.copy(p);gt.rotation.y=ang;world.add(gt);for(const sx of [-1,1]){const q=samplePos(d,sx*9.6,_hzv);addObstacle(q.x,q.z,1.4);}}
   g.position.set(p.x,p.y+11.4,p.z);g.rotation.y=ang+Math.PI;g.scale.setScalar(1.35);world.add(g);hz.cannons.push({d,off:0,g,next:0,k:0,pool:[],over:true});continue;}
  const off=side*(ROAD_HALF+6),p=samplePos(d,off,new T.Vector3());g.position.copy(p);g.rotation.y=sample(d).angle+Math.PI;g.scale.setScalar(1.35);world.add(g);addObstacle(p.x,p.z,2.6);
  hz.cannons.push({d,off:off*.86,g,next:0,k:0,pool:[]});}}
const _hzv=new T.Vector3();
function hzMissile(c){let m=c.pool.find(q=>!q.live);if(!m){const g=hzPart('HZ_Missile');if(!g)return null;g.scale.setScalar(1.25);world.add(g);m={g,live:false};c.pool.push(m);}
 m.live=true;m.t0=elapsed;m.lane=cannonLane(c.k++);m.g.visible=true;hz.missiles.push(m);m.c=c;return m;}
function hzBoom(x,y,z,col=0xffa53d,n=14){for(let i=0;i<n;i++){const a=Math.random()*TAU;emit(x,y,z,col,Math.sin(a)*6,2+Math.random()*4,Math.cos(a)*6,.5);}}
function updateHazards(dt,t=elapsed,live=true){if(!hz)return;const pl=racers[0];
 for(const s of hz.stampers){const st=stamperState(t,s.ph);s.st=st;s.g.position.y=s.base+st.y;s.g.rotation.z=st.phase==='up'&&st.warn>.7?Math.sin(t*46)*.035*(st.warn-.7)/.3:0;
  s.sh.material.opacity=.12+.45*(st.phase==='fall'?1:st.phase==='up'?st.warn*st.warn:.25);
  if(st.phase==='down'&&s.was!=='down'&&live){const p=s.g.position;for(let i=0;i<10;i++){const a=Math.random()*TAU;emit(p.x+Math.sin(a)*2.4,s.base+.3,p.z+Math.cos(a)*2.4,theme.space?0xd8ccff:0xb9a58a,Math.sin(a)*5,1+Math.random()*2,Math.cos(a)*5,.55);}
   if(pl){const dd=Math.hypot(pl.x-p.x,pl.z-p.z);if(dd<34){SFX.bump(Math.max(.3,1-dd/34));if(dd<20)shake=Math.max(shake,.35*(1-dd/20));}}}
  s.was=st.phase;}
 for(const f of hz.plants){let tgt=null,best=11;if(live)for(const r of racers){const dd=Math.hypot(r.x-f.x,r.z-f.z);if(dd<best){best=dd;tgt=r;}}
  const want=tgt?Math.atan2(tgt.x-f.x,tgt.z-f.z):f.root.rotation.y+Math.sin(t*.7+f.ph)*.01;f.root.rotation.y+=angleDiff(want,f.root.rotation.y)*Math.min(1,dt*5);
  f.cd=Math.max(0,f.cd-dt);const go=tgt&&best<8.5&&f.cd<=0;f.lunge=Math.max(0,Math.min(1,f.lunge+(go?dt*5:-dt*2.2)));if(f.lunge>=1&&go)f.cd=1.3;
  const open=f.lunge>0?.55*Math.sin(Math.min(1,f.lunge)*Math.PI):.12+.1*Math.sin(t*3+f.ph);f.lean.rotation.x=f.lunge*.95+Math.sin(t*1.3+f.ph)*.05;f.top.rotation.x=-open;f.bot.rotation.x=open*.5;
  f.head.set(0,2.3,.1).applyMatrix4(f.lean.matrixWorld);}
 if(!live)return;
 for(const c of hz.cannons){const near=racers.some(r=>{const ahead=wrapDiff(c.d,r.distance);return ahead>0&&ahead<170;});if(near&&t>=c.next){c.next=t+CANNON.gap;const m=hzMissile(c);if(m&&pl&&Math.hypot(pl.x-c.g.position.x,pl.z-c.g.position.z)<90)SFX.shell();}}
 for(let i=hz.missiles.length-1;i>=0;i--){const m=hz.missiles[i],c=m.c,mp=missileAt(t-m.t0,c.off,m.lane),d=c.d-mp.back;
  if(!mp.alive){const p=m.g.position;hzBoom(p.x,p.y,p.z,0x9aa0ad,8);m.live=false;m.g.visible=false;hz.missiles.splice(i,1);continue;}
  const p=samplePos(d,mp.off,_hzv),k=c.over?Math.min(1,mp.back/30):1,hy=c.over?(1-k*k*(3-2*k))*14.8:0;m.g.position.set(p.x,p.y+1.35+hy,p.z);m.g.rotation.set(c.over?-(1-k)*.45:0,sample(d).angle+Math.PI,Math.sin((t-m.t0)*9)*.12);m.d=d;m.off=mp.off;m.hy=hy;}}
// Treffer und Kollision je Kart (Stampfer quetscht/sperrt, Schnappblume beisst, Kugelblitz explodiert)
function hazardHits(r,me){if(!hz)return;
 for(const s of hz.stampers){const st=s.st;if(!st||!stamperBlocks(st))continue;const dd=wrapDiff(r.distance,s.d),doff=r.offset-s.off;if(Math.abs(dd)>STAMP.half+1.2||Math.abs(doff)>STAMP.half+1.3)continue;
  if(stamperCrushes(st)&&!((r.crushCd||0)>elapsed)){r.crushCd=elapsed+1.6;if(r.shield>0){r.shield=0;burst(r,0xffe263,12);continue;}hitKart(r,1.35,.12);r.squash=.6;loseSpores(r,2);if(me){stats.squashed++;SFX.hit();shake=.6;toast('PLATT!',.9,'bad');}}
  else{const p=s.g.position,dx=r.x-p.x,dz=r.z-p.z,dl=Math.hypot(dx,dz)||1,rr=3.3;if(dl<rr){r.x=p.x+dx/dl*rr;r.z=p.z+dz/dl*rr;bounce(r,dx/dl,dz/dl,true);}}}
 for(const f of hz.plants){if(f.lunge<.55)continue;const dx=r.x-f.head.x,dz=r.z-f.head.z;if(dx*dx+dz*dz>4.4||Math.abs((r.y||0)+.9-f.head.y)>2.6||(r.biteCd||0)>elapsed)continue;r.biteCd=elapsed+1.8;
  if(r.shield>0){r.shield=0;burst(r,0xffe263,10);continue;}hitKart(r,.95,.45);loseSpores(r,1);if(me){SFX.hit(.8);toast('GESCHNAPPT!',.9,'bad');}}
 for(let i=hz.missiles.length-1;i>=0;i--){const m=hz.missiles[i];if(m.d===undefined||(m.hy||0)>2.4)continue;if(Math.abs(wrapDiff(r.distance,m.d))>1.9||Math.abs(r.offset-m.off)>1.7||r.air&&r.y>3)continue;
  const p=m.g.position;hzBoom(p.x,p.y,p.z);m.live=false;m.g.visible=false;hz.missiles.splice(i,1);if(r.shield>0){r.shield=0;continue;}hitKart(r,1.15,.25);loseSpores(r,2);if(me){SFX.hit();shake=.5;toast('KUGELBLITZ!',.9,'bad');}}}
// ---------------------------------------------------------------- R44: Themen-Wahrzeichen (art/r44/create_landmarks.py)
// Pilz-Promenade: Maerchenschloss (Neuschwanstein-Stil) am Inselrand, Maibaeume, blau-weisse Wimpel.
// Neon-Pilzwald: Oktoberfest - Festzelt mit Leuchtschild, Maibaeume, Lebkuchenherzen und Brezeln als Neonschilder.
// Sonnen-Canyon: Dampf-Gueterzug auf einem Gleisring mit zwei Bahnuebergaengen ueber die Strasse.
function lmPart(n){const o=P.landmarks?.getObjectByName(n);if(!o)return null;const c=o.clone(true);c.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});return c;}
function lmAt(g,d,off,scale=1){const s=sample(d,off),c=sample(d,0).p;g.position.set(s.p.x,Math.max(0,groundAt(d,off).y),s.p.z);g.rotation.y=Math.atan2(c.x-s.p.x,c.z-s.p.z);g.scale.setScalar(scale);world.add(g);return s.p;}
// freie Stelle am Inselrand (moeglichst weit weg von Strecke und Zonen) fuer grosse Wahrzeichen
function rimSpot(minTrack,rad){let best=null;for(let a=0;a<TAU;a+=TAU/72){const x=Math.cos(a)*rad,z=Math.sin(a)*rad,d=projectGlobal(x,z),q=sample(d).p,dist=Math.hypot(q.x-x,q.z-z);if(dist<minTrack||zones.some(zn=>Math.hypot(zn.x-x,zn.z-z)<zn.r+30))continue;if(!best||dist>best.dist)best={x,z,dist};}return best;}
let trainFx=null;
function buildLandmarks(){trainFx=null;if(!P.landmarks)return;const L=course.landmarks||{};
 if(L.castle){const sp=rimSpot(70,158*WK);if(sp){const g=lmPart('LM_Castle');g.position.set(sp.x,-1.5,sp.z);g.rotation.y=Math.atan2(-sp.x,-sp.z);g.scale.setScalar(1.25);world.add(g);addObstacle(sp.x,sp.z,30);zones.push({d:projectGlobal(sp.x,sp.z),half:0,x:sp.x,z:sp.z,r:38});}}
 for(const [v,side] of L.maypoles||[]){const p=lmAt(lmPart('LM_Maypole'),cpDist(v),side*17);addObstacle(p.x,p.z,1);}
 if(L.tent){const [v,side]=L.tent,d=cpDist(v),g=lmPart('LM_Tent'),p=lmAt(g,d,side*34,1.15);addObstacle(p.x,p.z,16);zones.push({d,half:0,x:p.x,z:p.z,r:22});
  const sign=mesh(new T.PlaneGeometry(7.3,1.45),label("O'ZAPFT IS!",'#ff4fae','#fff6fb',512,100),g,0,7.1,7.24);sign.castShadow=false;}
 for(const [v,side] of L.hearts||[]){const g=new T.Group(),h=lmPart('LM_Heart');h.position.set(0,7.6,0);g.add(h);mesh(new T.CylinderGeometry(.12,.14,6.4,8),mat(0x5a3a22),g,0,3.2,0);const p=lmAt(g,cpDist(v),side*13);addObstacle(p.x,p.z,.6);}
 for(const [v,side] of L.pretzels||[]){const p=lmAt(lmPart('LM_Pretzel'),cpDist(v),side*13,1.1);addObstacle(p.x,p.z,.6);}
 if(course.train)buildTrain();}
// Gleisring: Sehne durch die Insel (kreuzt die Strasse zweimal) plus Bogen am Inselrand zurueck
function buildTrain(){const [cpA,ang=0]=course.train,dA=cpDist(cpA),sA=sample(dA),RIM=192*WK;
 const okAt=d=>!inGap(d)&&!inZone(d,18)&&!inTunnel(d)&&!(agrav.length&&hasMag(d))&&!loops.some(q=>lapDist(d-q.s+30)<q.span+60)&&raiseH(d)<.5&&Math.abs(wrapDiff(d,0))>30&&!forkAt(d,20);
 const why=d=>[inGap(d)?'gap':'',inZone(d,18)?'zone':'',inTunnel(d)?'tunnel':'',agrav.length&&hasMag(d)?'mag':'',loops.some(q=>lapDist(d-q.s+30)<q.span+60)?'loop':'',raiseH(d)>=.5?'raise':'',Math.abs(wrapDiff(d,0))<=30?'start':'',forkAt(d,20)?'fork':''].filter(Boolean).join(',');
 if(TEST){window.__train={a:why(dA),tries:[]};window.__trainWhy=why;}
 if(!okAt(dA))return;
 let dir=null,B=null;for(const da of [0,.2,-.2,.4,-.4,.6,-.6]){const a=sA.angle+Math.PI/2+ang+da,dx=Math.sin(a),dz=Math.cos(a);let hit=null;
  for(let t=18;t<2*RIM;t+=2){const x=sA.p.x+dx*t,z=sA.p.z+dz*t;if(Math.hypot(x,z)>RIM)break;const d=projectGlobal(x,z),q=sample(d).p;if(Math.hypot(q.x-x,q.z-z)<3){hit={d,x,z};break;}}
  if(TEST)window.__train.tries.push(hit?Math.round(hit.d)+':'+why(hit.d):'nohit');if(hit&&okAt(hit.d)){dir=[dx,dz];B=hit;break;}}
 if(!dir)return;
 // Sehne von Rand zu Rand durch A und B, dann Bogen aussen herum zurueck
 const line=[],P0={x:sA.p.x,z:sA.p.z};let t0=0,t1=0;while(Math.hypot(P0.x-dir[0]*t0,P0.z-dir[1]*t0)<RIM)t0+=2;while(Math.hypot(P0.x+dir[0]*t1,P0.z+dir[1]*t1)<RIM)t1+=2;
 for(let t=-t0;t<=t1;t+=3)line.push([P0.x+dir[0]*t,P0.z+dir[1]*t]);
 const a0=Math.atan2(line[line.length-1][1],line[line.length-1][0]),a1=Math.atan2(line[0][1],line[0][0]);let da=a1-a0;while(da<=0)da+=TAU;if(da>Math.PI)da-=TAU;
 const arc=[],n=Math.ceil(Math.abs(da)*RIM/3);for(let i=1;i<n;i++){const a=a0+da*i/n;arc.push([Math.cos(a)*RIM,Math.sin(a)*RIM]);}
 let pts=line.concat(arc);
 for(let it=0;it<6;it++)pts=pts.map((p,i)=>{const a=pts[(i-1+pts.length)%pts.length],b=pts[(i+1)%pts.length];return [(a[0]+2*p[0]+b[0])/4,(a[1]+2*p[1]+b[1])/4];});
 const cum=[0];for(let i=1;i<=pts.length;i++){const a=pts[i-1],b=pts[i%pts.length];cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
 const len=cum[pts.length];
 // Schienen (ein Mesh) und Schwellen (Instanzen)
 const rails=[],sl=[],M4=new T.Matrix4(),Q=new T.Quaternion(),E=new T.Euler(),V=new T.Vector3(),S=new T.Vector3(1,1,1);
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),segL=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(const side of [-.8,.8]){const cx=(a[0]+b[0])/2+Math.cos(yaw)*side,cz=(a[1]+b[1])/2-Math.sin(yaw)*side;rails.push(new T.BoxGeometry(.12,.14,segL+.05).rotateY(yaw).translate(cx,.26,cz));}
  for(let k=0;k<segL;k+=1.4){M4.compose(V.set(a[0]+(b[0]-a[0])*k/segL,.1,a[1]+(b[1]-a[1])*k/segL),Q.setFromEuler(E.set(0,yaw,0)),S);sl.push(M4.clone());}}
 world.add(new T.Mesh(mergeGeometries(rails),mat(0x9aa0aa,{roughness:.4,metalness:.7})));
 const slM=new T.InstancedMesh(new T.BoxGeometry(2.6,.16,.42),mat(0x5a3a22),sl.length);sl.forEach((m,i)=>slM.setMatrixAt(i,m));slM.receiveShadow=true;world.add(slM);
 // Zug: Lok und drei Wagen
 const loco=lmPart('LM_Loco');if(!loco)return;world.add(loco);const cars=[{g:loco,half:4.7,off:0}];
 for(let k=0;k<3;k++){const w=lmPart('LM_Wagon');world.add(w);cars.push({g:w,half:3.7,off:9.2+k*8.2});}
 // Bahnuebergaenge: Blinksignale beidseitig der Strasse
 const sigMat=[],crossings=[{d:dA,s:0},{d:B.d,s:0}].map(c=>{let bi=0,bd=1e9;const cp=sample(c.d).p;for(let i=0;i<pts.length;i++){const e=Math.hypot(pts[i][0]-cp.x,pts[i][1]-cp.z);if(e<bd){bd=e;bi=i;}}c.s=cum[bi];
  for(const side of [-1,1]){const g=lmPart('LM_Crossing');if(!g)continue;const sp=sample(c.d+side*9,side*13.2);g.position.copy(sp.p);g.rotation.y=sp.angle+(side>0?Math.PI:0);world.add(g);addObstacle(sp.p.x,sp.p.z,.5);
   g.traverse(q=>{if(q.isMesh&&q.material.name==='SignalRed'){q.material=q.material.clone();sigMat.push(q.material);}});}
  return c;});
 trainFx={pts,cum,len,cars,crossings,sigMat,s:0,speed:17,bellT:0,whT:0};updateTrain(0,0);}
function trainAt(s,out){const f=trainFx;s=((s%f.len)+f.len)%f.len;let lo=0,hi=f.pts.length;while(hi-lo>1){const m=(lo+hi)>>1;if(f.cum[m]<=s)lo=m;else hi=m;}const a=f.pts[lo],b=f.pts[(lo+1)%f.pts.length],k=(s-f.cum[lo])/Math.max(1e-6,f.cum[lo+1]-f.cum[lo]);out.x=a[0]+(b[0]-a[0])*k;out.z=a[1]+(b[1]-a[1])*k;out.yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);return out;}
const _ta={x:0,z:0,yaw:0};
function updateTrain(dt,t){const f=trainFx;if(!f)return;f.s=(f.s+f.speed*dt)%f.len;
 for(const c of f.cars){trainAt(f.s-c.off,_ta);c.g.position.set(_ta.x,.14,_ta.z);c.g.rotation.y=_ta.yaw;c.x=_ta.x;c.z=_ta.z;c.yaw=_ta.yaw;}
 f.whT-=dt;{const p0=racers[0];if(p0&&f.whT<=0&&Math.hypot(f.cars[0].x-p0.x,f.cars[0].z-p0.z)<110&&state==='race'){SFX.whistle();f.whT=7;}}
 const lo=f.cars[0],near=f.crossings.some(c=>{const ds=((c.s-f.s)%f.len+f.len)%f.len;return ds<70||ds>f.len-45;}),on=near&&Math.floor(t*2.4)%2===0;
 for(const m of f.sigMat)m.emissiveIntensity=near?(on?3:.2):.15;
 const pl=racers[0];f.bellT-=dt;if(near&&pl&&f.bellT<=0&&state==='race'){const dd=Math.min(...f.crossings.map(c=>{const q=sample(c.d).p;return Math.hypot(q.x-pl.x,q.z-pl.z);}));if(dd<80){SFX.bell();f.bellT=.5;}}
 if(pl&&frame%3===0&&Math.hypot(lo.x-pl.x,lo.z-pl.z)<120)emit(lo.x+Math.sin(lo.yaw)*3.1,5.2,lo.z+Math.cos(lo.yaw)*3.1,0xe8e4dc,(Math.random()-.5)*1.5,3+Math.random()*2,(Math.random()-.5)*1.5,1.1);}
// Zug erwischt ein Kart: seitlich wegschleudern und Dreher
function trainHits(r,me){const f=trainFx;if(!f||(r.trainCd||0)>elapsed)return;for(const c of f.cars){const dx=r.x-c.x,dz=r.z-c.z,fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),along=dx*fx+dz*fz,lat=dx*fz-dz*fx;
  if(Math.abs(along)<c.half+.9&&Math.abs(lat)<2.2&&(r.y||0)<4){r.trainCd=elapsed+1.6;const sgn=Math.sign(lat)||1;r.vx=fz*sgn*14+fx*f.speed;r.vz=-fx*sgn*14+fz*f.speed;hitKart(r,1.5,1);loseSpores(r,2);burst(r,0xe8e4dc,18);if(me){stats.trainHits++;SFX.hit();shake=.7;toast('VOM ZUG ERWISCHT!',1,'bad');}return;}}}
// ---------------------------------------------------------------- R44: Wuestensturm (Sonnen-Canyon)
// Duenen: rhythmische Sandkaemme auf der Geraden (Hoehenprofil), ab ~28 m/s hebt man auf jedem Kamm ab - Hops/Drift
// in der Luft = Trick-Turbo bei der Landung. Sandhosen: wandernde Wirbelstuerme quer ueber die Bahn, heben das Kart
// hoch und drehen es. Treibsand: Senke an der Innenseite einer Ecke, bremst stark und zieht zur Mitte (Turbo rettet).
function dunesH(d){let h=0;for(const [a,b,amp,wave] of course.dunes||[]){const d0=cpDist(a),span=lapDist(cpDist(b)-d0),rel=lapDist(d-d0);if(rel>span)continue;
 const env=sstep(Math.min(rel,span-rel)/14),s=Math.sin(Math.PI*rel/wave);h+=amp*env*s*s;}return h;}
let desert=null;
function buildDesert(){desert=null;const tw=course.twisters||[],qs=course.sand||[];if(!tw.length&&!qs.length)return;desert={twisters:[],pits:[]};
 if(tw.length){const tex=canvasTex(64,128,(q,w,h)=>{q.fillStyle='rgba(0,0,0,0)';q.clearRect(0,0,w,h);for(let i=0;i<22;i++){q.strokeStyle=`rgba(${220+Math.random()*30|0},${170+Math.random()*40|0},${110+Math.random()*30|0},${.35+Math.random()*.5})`;q.lineWidth=3+Math.random()*7;q.beginPath();const y=Math.random()*h;q.moveTo(0,y);q.bezierCurveTo(w*.3,y-18,w*.7,y+18,w,y-6);q.stroke();}},true);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,1);
  const prof=[];for(let i=0;i<=12;i++){const t=i/12;prof.push(new T.Vector2(1.1+Math.pow(t,1.7)*5.4,t*15));}
  const geo=new T.LatheGeometry(prof,20),m=new T.MeshBasicMaterial({map:tex,color:0xf0c890,transparent:true,opacity:.62,depthWrite:false,side:T.DoubleSide});
  for(const [v,amp,spd,ph] of tw){const d=cpDist(v),g=new T.Group(),a=new T.Mesh(geo,m),b=new T.Mesh(geo,m);b.scale.set(.72,.9,.72);b.rotation.y=1.3;g.add(a,b);world.add(g);desert.twisters.push({d,amp,spd,ph,g,a,b,x:0,z:0});}}
 for(const [v,side,rad=8.5] of qs){const d=cpDist(v),k=trackAt(d).kap,inside=side||(k>0?1:-1),off=inside*(8.2+rad*.5),p=samplePos(d,off,new T.Vector3());
  const tex=canvasTex(128,128,(q,w,h)=>{const g=q.createRadialGradient(64,64,6,64,64,64);g.addColorStop(0,'#8a5a2c');g.addColorStop(.55,'#c98d4c');g.addColorStop(1,'rgba(214,160,96,0)');q.fillStyle=g;q.fillRect(0,0,w,h);q.strokeStyle='rgba(90,55,25,.55)';q.lineWidth=4;for(let a=0;a<6;a++){q.beginPath();for(let t=0;t<1;t+=.02){const r=6+t*54,an=a*TAU/6+t*5;q.lineTo(64+Math.cos(an)*r,64+Math.sin(an)*r);}q.stroke();}});
  const disc=new T.Mesh(new T.CircleGeometry(rad,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));disc.position.set(p.x,p.y+.1,p.z);disc.renderOrder=1;world.add(disc);
  desert.pits.push({x:p.x,z:p.z,r:rad,disc,d,off});}}
function updateDesert(dt,t){if(!desert)return;const pl=racers[0];
 for(const s of desert.twisters){const off=Math.sin(t*s.spd+s.ph)*s.amp,dd=s.d+Math.sin(t*s.spd*.43+s.ph*2)*10,p=samplePos(dd,off,_sp);s.x=p.x;s.z=p.z;s.dd=dd;s.off=off;s.g.position.set(p.x,p.y,p.z);
  s.a.rotation.y+=dt*5.5;s.b.rotation.y-=dt*7;s.a.material.map.offset.y-=dt*.9;
  if(pl&&frame%4===0&&Math.hypot(pl.x-p.x,pl.z-p.z)<90)for(let i=0;i<2;i++){const a=Math.random()*TAU;emit(p.x+Math.cos(a)*2,p.y+.4,p.z+Math.sin(a)*2,0xe6b77a,Math.cos(a+1.6)*6,1+Math.random()*3,Math.sin(a+1.6)*6,.8);}
  if(pl&&state==='race'){const dd2=Math.hypot(pl.x-p.x,pl.z-p.z);s.cd=Math.max(0,(s.cd||0)-dt);if(dd2<34&&!s.cd){s.cd=1.1;SFX.whirl(Math.max(.25,1-dd2/34));}}}
 for(const q of desert.pits)q.disc.rotation.y+=dt*.35;}
function desertHits(r,me,dt){if(!desert)return;
 for(const s of desert.twisters){const dx=r.x-s.x,dz=r.z-s.z;if(dx*dx+dz*dz>11.5||(r.twCd||0)>elapsed||(r.y||0)>trackAt(s.d).h+7)continue;r.twCd=elapsed+1.8;
  if(r.shield>0){r.shield=0;burst(r,0xffe263,10);continue;}r.air=true;r.airT=0;r.vy=10.5;r.y=(r.y||0)+.1;hitKart(r,.8,.6);loseSpores(r,1);burst(r,0xe6b77a,16);if(me){stats.twisterHits++;toast('SANDHOSE!',.9,'bad');shake=.4;}}
 for(const q of desert.pits){const dx=q.x-r.x,dz=q.z-r.z,dl=Math.hypot(dx,dz);if(dl>q.r||r.air)continue;const k=1-dl/q.r;
  if(r.boost<=0){const cap=9+10*(1-k);const sp=Math.hypot(r.vx,r.vz);if(sp>cap){const f=Math.max(cap/sp,Math.exp(-2.6*dt));r.vx*=f;r.vz*=f;}}
  r.vx+=dx/(dl||1)*3.2*k*dt*6;r.vz+=dz/(dl||1)*3.2*k*dt*6;if(me&&frame%10===0){SFX.sand();if(frame%40===0)toast('TREIBSAND!',.7,'bad');}}}
// ---------------------------------------------------------------- R44: Streckencharakter (assets/critters.glb)
// Pilz-Promenade "Almwiese": Kuehe wandern ueber die Strasse und grasen. Neon-Pilzwald "Beat": Taktschranken senken
// sich im Takt abwechselnd links/rechts, Turbo-Felder im Takt geben mehr Schub. Geisterhaus "Spuk": Geisterhaende
// schiessen aus dem Boden (Riss als Warnung) und packen zu, dazu Gewitter mit Blitz und Donner. Regenbogenpiste
// "Schwerelos": Mondschwerkraft-Zone (weite, lenkbare Spruenge) und Sternschnuppen mit Warnkreis.
const BEAT=.5; // Neon: 120 Schlaege pro Minute
function crPart(n){const o=P.critters?.getObjectByName(n);if(!o)return null;const c=o.clone(true);c.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});return c;}
let chr=null,flashEl=null;const _cowQ=new T.Vector3();
function buildCharacter(){chr=null;const C=course;if(!P.critters||!(C.cows||C.beatgates||C.hands||C.lowgrav||C.meteors))return;chr={cows:[],gates:[],hands:[],mets:[],flash:0,next:8};
 for(const [a,b,n] of C.cows||[]){const d0=cpDist(a),span=lapDist(cpDist(b)-d0);for(let k=0;k<n;k++){const g=new T.Group(),body=crPart('CR_CowBody'),head=crPart('CR_CowHead'),legs=[];g.add(body,head);
   for(const [x,z] of [[-.38,.7],[.38,.7],[-.38,-.75],[.38,-.75]]){const l=crPart('CR_CowLeg');l.position.set(x,1.1,z);g.add(l);legs.push(l);}g.scale.setScalar(1.35);world.add(g);
   const d=d0+span*(k+.5)/n;chr.cows.push({g,head,legs,d,off:(k%2?1:-1)*(4+k*2.5),tgt:0,pause:1+k,walk:0,x:0,z:0,ph:k*1.7,moo:0});}}
 for(const [v] of C.beatgates||[]){const d=cpDist(v),halves=[];for(const side of [-1,1]){const bar=crPart('CR_Bar');const p=samplePos(d,side*11.6,new T.Vector3()),c=samplePos(d,0,new T.Vector3()),grp=new T.Group();grp.position.copy(p);grp.rotation.y=Math.atan2(-(c.z-p.z),c.x-p.x);grp.scale.setScalar(1.35);world.add(grp);addObstacle(p.x,p.z,.5);
  // Pfosten bleibt stehen, nur der Arm (alle Teile ausser dem dunklen Pfosten) dreht am Scharnier in 1,55 m Hoehe
  const boom=new T.Group();boom.position.set(0,1.55,0);const ms=[];bar.traverse(q=>{if(q.isMesh)ms.push(q);});grp.add(bar);for(const q of ms)if(q.material.name!=='PostDark'){q.position.y-=1.55;boom.add(q);}grp.add(boom);halves.push({side,bar:boom,ang:1.4});}chr.gates.push({d,halves});}
 for(const [a,b,n] of C.hands||[]){const d0=cpDist(a),span=lapDist(cpDist(b)-d0);for(let k=0;k<n;k++){const g=crPart('CR_Hand');g.scale.setScalar(1.3);world.add(g);
   const crack=new T.Mesh(new T.CircleGeometry(1.4,16).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x0c0812,transparent:true,opacity:0,depthWrite:false}));world.add(crack);
   chr.hands.push({g,crack,d0,span,d:d0,off:0,t:-k*1.3,up:0,x:0,z:0,y:0});}}
 chr.low=(C.lowgrav||[]).map(([a,b])=>({s:cpDist(a),span:lapDist(cpDist(b)-cpDist(a))}));
 for(const [a,b] of C.meteors||[]){const d0=cpDist(a),span=lapDist(cpDist(b)-d0);for(let k=0;k<2;k++){const m=crPart('CR_Meteor');m.visible=false;world.add(m);
   const ring=new T.Mesh(new T.RingGeometry(2.6,3.4,28).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xff4fd8,transparent:true,opacity:0,depthWrite:false}));world.add(ring);chr.mets.push({m,ring,d0,span,t:-k*1.6,d:d0,off:0,x:0,z:0,gy:0});}}}
function gravMul(d){if(!chr||!chr.low.length)return 1;for(const z of chr.low){const rel=lapDist(d-z.s);if(rel<z.span)return .38;}return 1;}
const beatPhase=t=>(t%BEAT)/BEAT;
function updateCharacter(dt,t,live=true){if(!chr)return;const pl=racers[0];
 for(const c of chr.cows){c.pause-=dt;if(c.pause<=0&&!c.walk){c.walk=1;c.tgt=(Math.random()<.5?-1:1)*(3+Math.random()*9);}
  if(c.walk){const dir=Math.sign(c.tgt-c.off);c.off+=dir*1.5*dt;if(Math.abs(c.tgt-c.off)<.2){c.walk=0;c.pause=2+Math.random()*3;}}
  const p=samplePos(c.d,c.off,_sp),s=sample(c.d);c.x=p.x;c.z=p.z;c.g.position.set(p.x,Math.max(0,groundAt(c.d,c.off).y),p.z);
  let face=s.angle+Math.PI*.6;if(c.walk){const q=samplePos(c.d,c.off+Math.sign(c.tgt-c.off||1),_cowQ);face=Math.atan2(q.x-p.x,q.z-p.z);}c.g.rotation.y+=angleDiff(face,c.g.rotation.y)*Math.min(1,dt*3);
  const sw=c.walk?Math.sin(t*7+c.ph)*.45:0;c.legs.forEach((l,i)=>l.rotation.x=(i%2?sw:-sw));c.head.rotation.x=c.walk?Math.sin(t*3.5)*.08:.45+Math.sin(t*2+c.ph)*.15;
  c.moo=Math.max(0,c.moo-dt);if(live&&pl&&!c.moo&&Math.hypot(pl.x-p.x,pl.z-p.z)<22){c.moo=6+Math.random()*4;SFX.moo();}}
 for(const gt of chr.gates){const beat=Math.floor(t/BEAT),ph=beat%4,pulse=1-beatPhase(t);
  for(const h of gt.halves){const down=(ph===0&&h.side<0)||(ph===2&&h.side>0);const want=down?0:1.35;h.ang+=(want-h.ang)*Math.min(1,dt*14);h.bar.rotation.z=h.ang;h.down=h.ang<.35;
   h.bar.traverse(q=>{if(q.isMesh&&q.material.emissive&&q.material.name==='BarNeon')q.material.emissiveIntensity=1.5+pulse*2.5;});}}
 for(const h of chr.hands){h.t+=dt;const cyc=h.t%4.2;if(h.t>0&&cyc<dt*1.5){h.d=h.d0+Math.random()*h.span;h.off=(Math.random()-.5)*12;const p=samplePos(h.d,h.off,_sp);h.x=p.x;h.z=p.z;h.y=p.y;h.crack.position.set(p.x,p.y+.08,p.z);}
  const warn=cyc<.8,up=cyc>=.8&&cyc<2.2,rise=up?Math.min(1,(cyc-.8)/.18):cyc>=2.2&&cyc<2.6?1-(cyc-2.2)/.4:0;h.up=h.t>0?rise:0;
  h.crack.material.opacity=h.t>0&&(warn||up)?(warn?.3+.4*Math.sin(t*20)*.5+.2:.55):0;h.g.visible=h.up>.02;h.g.position.set(h.x,h.y-3.2+h.up*3.2,h.z);h.g.rotation.y=Math.sin(t*3+h.d)*.4;}
 for(const m of chr.mets){m.t+=dt;const cyc=m.t%3.1;if(m.t>0&&cyc<dt*1.5){m.d=m.d0+Math.random()*m.span;m.off=(Math.random()-.5)*13;const p=samplePos(m.d,m.off,_sp);m.x=p.x;m.z=p.z;m.gy=p.y;m.ring.position.set(p.x,p.y+.1,p.z);m.hit=false;if(live&&pl&&Math.hypot(pl.x-p.x,pl.z-p.z)<90)SFX.meteor();}
  const f=m.t>0?Math.min(1,cyc/1.3):0;m.ring.material.opacity=m.t>0&&cyc<1.35?.35+.45*Math.abs(Math.sin(t*12)):0;m.m.visible=m.t>0&&cyc<1.3;m.m.position.set(m.x+(1-f)*14,m.gy+(1-f)*42,m.z-(1-f)*8);
  if(m.t>0&&cyc>=1.3&&!m.hit){m.hit=true;for(let i=0;i<14;i++){const a=Math.random()*TAU;emit(m.x,m.gy+.5,m.z,i%2?0xff4fd8:0xffd36b,Math.sin(a)*7,3+Math.random()*4,Math.cos(a)*7,.6);}if(live&&pl){const dd=Math.hypot(pl.x-m.x,pl.z-m.z);if(dd<40){SFX.boom(Math.max(.3,1-dd/40));shake=Math.max(shake,.3*(1-dd/40));}}m.boom=.25;}
  m.boom=Math.max(0,(m.boom||0)-dt);}
 if(course.theme==='haunted'&&live){chr.next-=dt;if(chr.next<=0){chr.next=11+Math.random()*7;chr.flash=.5;SFX.thunder();}chr.flash=Math.max(0,chr.flash-dt);
  if(!flashEl){flashEl=document.body.appendChild(document.createElement('div'));flashEl.style.cssText='position:fixed;inset:0;background:#eef4ff;pointer-events:none;z-index:4;opacity:0';}
  flashEl.style.opacity=String(chr.flash>.3?(chr.flash-.3)*4:chr.flash>.12&&chr.flash<.2?.35:0);}
 else if(flashEl)flashEl.style.opacity='0';}
function characterHits(r,me){if(!chr)return;
 for(const c of chr.cows){const dx=r.x-c.x,dz=r.z-c.z,d2=dx*dx+dz*dz;if(d2<8.4&&(r.y||0)<trackAt(c.d).h+2.5){const dl=Math.sqrt(d2)||1,nx=dx/dl,nz=dz/dl;r.x=c.x+nx*2.9;r.z=c.z+nz*2.9;bounce(r,nx,nz,true);if((r.cowCd||0)<elapsed){r.cowCd=elapsed+1.5;hitKart(r,.6,.55);if(me){stats.cowHits++;SFX.moo();toast('MUH!',.8,'bad');}}}}
 for(const gt of chr.gates){if(Math.abs(wrapDiff(r.distance,gt.d))>1.4)continue;for(const h of gt.halves){if(!h.down||r.offset*h.side<1.2)continue;
   const t=tanAt(r.distance),back=Math.sign(wrapDiff(r.distance,gt.d))||-1;r.x+=t.x*back*.8;r.z+=t.z*back*.8;const vf=r.vx*t.x+r.vz*t.z;r.vx-=t.x*vf*1.3;r.vz-=t.z*vf*1.3;if((r.gateCd||0)<elapsed){r.gateCd=elapsed+1;hitKart(r,.4,.4);if(me){SFX.bump(1);toast('SCHRANKE!',.7,'bad');}}}}
 for(const h of chr.hands){if(h.up<.6)continue;const dx=r.x-h.x,dz=r.z-h.z;if(dx*dx+dz*dz>5.3||(r.handCd||0)>elapsed)continue;r.handCd=elapsed+2;if(r.shield>0){r.shield=0;burst(r,0xffe263,10);continue;}
  hitKart(r,.9,.3);loseSpores(r,1);burst(r,0x7dffb0,14);if(me){stats.grabs++;SFX.grab();toast('GEPACKT!',.9,'bad');}}
 for(const m of chr.mets){if(!m.boom)continue;const dx=r.x-m.x,dz=r.z-m.z;if(dx*dx+dz*dz>16||(r.metCd||0)>elapsed)continue;r.metCd=elapsed+1.5;if(r.shield>0){r.shield=0;continue;}r.air=true;r.airT=0;r.vy=8;r.y=(r.y||0)+.1;hitKart(r,1,.5);loseSpores(r,1);if(me){stats.meteorHits++;SFX.hit();toast('STERNSCHNUPPE!',.9,'bad');}}}
function updateSwingers(t=elapsed){const pl=racers[0];for(const s of swingers){const fb=s.fire&&s.side?fireballAt(t,s.ph,s.side):null,off=fb?fb.off:Math.sin(t*s.spd+s.ph)*s.amp,p=samplePos(s.d,off,_sp);s.x=p.x;s.z=p.z;if(fb){s.active=fb.vis&&fb.y<2.4;s.mesh.visible=fb.vis;}
 if(s.kind==='ghost'){s.y=p.y+.9+Math.sin(t*2.2+s.ph)*.45;s.mesh.position.set(p.x,s.y,p.z);const face=pl?Math.atan2(pl.x-p.x,pl.z-p.z):t;s.mesh.rotation.set(0,face,-Math.cos(t*s.spd+s.ph)*.25);const near=pl&&Math.hypot(pl.x-p.x,pl.z-p.z)<18;s.boo=(s.boo||0)+((near?1:0)-(s.boo||0))*.08;s.mesh.scale.setScalar(1.2+s.boo*.35);}
 else{s.mesh.position.copy(p);s.mesh.rotation.y=t*1.5+s.ph;
  if(s.fire){const fl=1+Math.sin(t*9+s.ph*3)*.12;s.mesh.scale.setScalar(1.5*fl);s.mesh.position.y=p.y+(fb?fb.y:1.4+Math.sin(t*3+s.ph)*.35);if(fb)s.mesh.rotation.y=sample(s.d).angle+(s.side>0?-Math.PI/2:Math.PI/2);
   s.cd=Math.max(0,(s.cd||0)-.016);
   if(pl&&state==='race'){const dd=Math.hypot(pl.x-p.x,pl.z-p.z);if(dd<20&&!s.cd){s.cd=1.4;SFX.fire(Math.max(.25,1-dd/20));}}}}}}

// ---------------------------------------------------------------- Partikel (Pool, keine Allokation im Rennen)
const _zeroM=new T.Matrix4().makeScale(0,0,0),_col=new T.Color();
function fxMesh(geo,material,n){const im=new T.InstancedMesh(geo,material,n);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.frustumCulled=false;im.castShadow=false;for(let i=0;i<n;i++){im.setMatrixAt(i,_zeroM);im.setColorAt(i,_col.setHex(0xffffff));}scene.add(im);return im;}
const SPARKS=260,sparkMesh=fxMesh(new T.BoxGeometry(.16,.16,.16),new T.MeshBasicMaterial({color:0xffffff}),SPARKS),sparkPool=Array.from({length:SPARKS},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0}));let sparkIdx=0;
// Konfetti (R30): eigene Instanzen statt Funken - groessere, drehende Zettelchen mit Schwanken
// Schwindel-Sterne (R46): nach einem Dreher kreisen drei gelbe Sterne ueber dem Kopf des Fahrers
const DIZZY_N=36,dizzyGeo=(()=>{const sh=new T.Shape();for(let i=0;i<10;i++){const a=i/10*TAU-Math.PI/2,rr=i%2?.1:.24;sh[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}return new T.ExtrudeGeometry(sh,{depth:.07,bevelEnabled:false}).center();})(),dizzyMesh=fxMesh(dizzyGeo,new T.MeshBasicMaterial({color:0xffe14a}),DIZZY_N);let dizzyOn=false;
function updateDizzy(now){let any=false;racers.forEach((r,i)=>{if(i*3+2>=DIZZY_N)return;const on=r.stun>.05&&r.finishTime===null&&r.mesh.visible&&(state==='race'||state==='countdown');
  for(let j=0;j<3;j++){if(!on){dizzyMesh.setMatrixAt(i*3+j,_zeroM);continue;}any=true;const p=r.mesh.position,sc=r.mesh.scale.y||1,f=Math.min(1,r.stun*3.5)*sc,a=now*.0075+j*TAU/3+i;
   _e.set(0,-a*1.6,Math.sin(now*.01+j)*.3);_q.setFromEuler(_e);_m.compose(_v.set(p.x+Math.cos(a)*.62*sc,p.y+2.35*sc+Math.sin(now*.012+j*2)*.09,p.z+Math.sin(a)*.62*sc),_q,_s.set(f,f,f));dizzyMesh.setMatrixAt(i*3+j,_m);}});
 if(any||dizzyOn)dizzyMesh.instanceMatrix.needsUpdate=true;dizzyOn=any;}
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
 if(magOn()&&(hasMag(r.distance)||agrav.some(q=>{const a=wrapDiff(q.s,r.distance);return a>0&&a<12;})||coasters.some(q=>{const a=wrapDiff(q.s,r.distance);return a>0&&a<12;}))&&!rh){if(r.air){r.air=false;r.airT=0;r.trick=0;}
  r.y+=(ground-r.y)*(1-Math.exp(-dt*16));if(Math.abs(ground-r.y)<.05)r.y=ground;
  r.vy=roadVy;r.rampY=0;r.onGapRamp=false;return;}
 if(r.air){r.vy-=G*gravMul(r.distance)*dt;r.y+=r.vy*dt;r.airT+=dt;
  // Kanten-Gnade (R26): wer eine Landekante knapp unter Niveau kreuzt (zu kurzer Sprung),
  // knallt auf die Fahrbahn und faehrt weiter, statt sofort am Rettungspilz zu landen.
  // Vorher pruefte y<ground-1.5 VOR der Landung - jeder grenzwertige Sprung ueber eine
  // Schlucht endete in einem Respawn-Zyklus (Canyon-Autopilot: 429 Respawns je Rennen).
  if(r.y<ground-1.5&&r.vy<0&&ground>-20){if(ground-r.y<6){land(r,ground,roadVy);}else{respawn(r);return;}}
  if(r.y<=ground&&ground>-20)land(r,ground,roadVy);}
 else if(!rh&&r.rampY>RAMP_H*.55){armGlider(r,'ramp');r.air=true;r.airT=0;r.vy=Math.min(16,6+Math.max(0,r.speed)*.22+(r.onGapRamp?2:0));r.y+=r.vy*dt;if(nearPlayer(r,50))SFX.ramp(r.id===0?1:.4);}
 // Kuppenabsprung nur, wenn die Fahrbahn schneller wegknickt, als die Haftung (G_STICK) haelt -
 // entschieden aus der Hoehenkruemmung, also unabhaengig von der Bildrate. Vorher verglich jeder
 // Frame Soll- und Ist-Hoehe: bei 20 fps hob das Kart schon an sanften Wellen ab und setzte wieder
 // auf (Buckelpiste auf dem Handy).
 else{const sp=Math.max(0,r.speed);if(sp>12&&sp*sp*vcurv(r.distance)<-G_STICK){r.air=true;r.airT=0;r.y=ground+.02;r.vy=roadVy;}else{r.y=ground;r.vy=roadVy;}}
 r.rampY=rh&&!r.air?rh.y:0;r.onGapRamp=rh?rh.ramp.gap:false;if(r.trick>0)r.trick=Math.min(.45,r.trick+dt);
 if(r.y<-4&&!hasMag(r.distance))respawn(r);}
function land(r,ground,roadVy){resetGlider(r);const impact=r.vy-roadVy,me=r.id===0;r.y=ground;r.vy=roadVy;r.air=false;r.airT=0;if(impact<-4)r.squash=clamp(-impact/40,.1,.3);
 if(r.trick>0){if(r.trick>=.42){r.boost=Math.max(r.boost,1.1);burst(r,0x7ceaff,14);if(me){stats.tricks++;SFX.trick();say('trick');toast('TRICK-TURBO!',1,'good');}}else{r.vx*=.7;r.vz*=.7;if(me)toast('WACKLIG!',.8,'bad');}r.trick=0;}
 if(me&&impact<-9){shake=Math.max(shake,Math.min(.3,-impact*.012));dropPuff(r);dropPuff(r);SFX.land(clamp(-impact/25,.25,1));}}
function startTrick(r){r.trick=.001;if(r.id===0)SFX.whoosh();}
// Rettungspilz: nach einem Sturz in die Schlucht zurueck vor die Anlaufstrecke
// Die Hoehe kommt aus groundAt, nicht aus sample: in einer Rollzone schwebt die sichtbare Bahn
// bis zu 12,5 m ueber dem Boden, und wer dort oben eingesetzt wird, faellt endlos im Kreis.
function respawn(r){resetGlider(r,true);const me=r.id===0,d=r.safeD??0,fromD=Math.round(lapDist(r.distance)),fromOff=+(r.offset||0).toFixed(1),s=sample(d,0),gy=groundAt(d,0).y,fell=gaps.some(g=>Math.abs(wrapDiff(g.c,lapDist(r.distance)))<40);r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.vx=r.vz=0;r.speed=0;r.distance+=wrapDiff(d,lapDist(r.distance));r.offset=0;r.y=gy+2.2;r.vy=0;r.air=true;r.airT=0;r.trick=0;r.driftDir=0;r.drift=0;r.stun=.5;r.lastGround=gy;
 if(me&&stats){stats.falls++;(stats.fallAt||(stats.fallAt=[])).push([fromD,fromOff,Math.round(lapDist(r.distance))]);toast(fell?'RETTUNGSPILZ! Mit mehr Tempo über die Schanze':'RETTUNGSPILZ!',2,'bad');if(fell)SFX.splash();shake=.3;}}
const nearPlayer=(r,range)=>racers[0]&&Math.abs(r.distance-racers[0].distance)<range;
function collideStatic(r){hazardHits(r,r.id===0);trainHits(r,r.id===0);characterHits(r,r.id===0);const ix=Math.floor(r.x/16),iz=Math.floor(r.z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const cell=obsGrid.get((ix+a+500)*1000+(iz+b+500));if(!cell)continue;for(const o of cell){const dx=r.x-o.x,dz=r.z-o.z,rr=o.r+1.05,d2=dx*dx+dz*dz;if(d2<rr*rr&&r.y<o.h){const d=Math.sqrt(d2)||1,nx=dx/d,nz=dz/d;r.x=o.x+nx*rr;r.z=o.z+nz*rr;bounce(r,nx,nz);}}}
 for(const s of swingers){if(s.kind==='ghost')continue;if(s.side){if(!s.active)continue;const dx=r.x-s.x,dz=r.z-s.z;if(dx*dx+dz*dz<7.3&&(r.burnCd||0)<elapsed&&(r.y||0)<trackAt(s.d).h+3){r.burnCd=elapsed+1.4;if(r.shield>0){r.shield=0;burst(r,0xffe263,10);}else{hitKart(r,1,.4);loseSpores(r,1);burst(r,0xff7a1a,16);if(r.id===0){SFX.hit();toast('ANGEBRANNT!',.9,'bad');}}}continue;}
  const dx=r.x-s.x,dz=r.z-s.z,rr=2.3+1.05,d2=dx*dx+dz*dz;if(d2<rr*rr&&r.y<trackAt(s.d).h+3){const d=Math.sqrt(d2)||1,nx=dx/d,nz=dz/d;r.x=s.x+nx*rr;r.z=s.z+nz*rr;bounce(r,nx,nz,true);}}
 const R=Math.hypot(r.x,r.z),RB=WK>1?210*WK-30:189;if(R>RB){const nx=-r.x/R,nz=-r.z/R;r.x=-nx*RB;r.z=-nz*RB;bounce(r,nx,nz);}}
function bounce(r,nx,nz,hard=false){const vn=r.vx*nx+r.vz*nz;if(vn>=0)return;r.vx-=nx*vn*1.06;r.vz-=nz*vn*1.06;const loss=Math.min(.35,-vn/70+(hard?.18:0));r.vx*=1-loss;r.vz*=1-loss;if(hard&&-vn>4)hitKart(r,.45,.9);
 if(-vn>5)r.combo=0;if(r.id===0&&-vn>5){shake=Math.max(shake,Math.min(.35,-vn*.02));SFX.bump(clamp(-vn/25,.2,1));stats.bumps++;}}
const _agP=new T.Vector3(),_agV=new T.Vector3(),_agAxis=new T.Vector3(),_agL=new T.Vector3(),_agB=new T.Vector3();
const _kX=new T.Vector3(),_kY=new T.Vector3(),_kZ=new T.Vector3(),_kM=new T.Matrix4(),_kQ=new T.Quaternion(),_kE=new T.Euler();
function syncKart(r,dt){const s=tanAt(r.distance),e=r.mesh.rotation,dot=Math.sin(r.h)*s.x+Math.cos(r.h)*s.z,bank=s.b;
 r.driftVis=(r.driftVis||0)+((r.driftDir||0)*.38-(r.driftVis||0))*Math.min(1,dt*10);
 const hopY=r.hop>0?Math.sin((HOP_T-r.hop)/HOP_T*Math.PI)*.42:0;
 const lift=.1+hopY+(r.air?0:Math.sin(elapsed*22+r.id)*.03*(Math.abs(r.speed)/30));
 const inLoop=loops.length?loopAt(r.distance):null;
 // Immer derselbe Weg ins Bild - keine Schwelle, an der umgeschaltet wird. Ohne Rolle, Hub und
 // Looping gibt posAt genau die physikalische Lage zurueck, flach aendert sich also nichts.
 r.czFloatS=(r.czFloatS||0)+((r.czFloat||0)-(r.czFloatS||0))*Math.min(1,dt*9);
 r.mesh.position.copy(posAt(r.distance,r.offset,(r.y??0)-roadRef(r.distance,r.offset)+lift+r.czFloatS,_agP));e.order='YXZ';
 const spin=r.trick>0?Math.min(1,r.trick/.42)*TAU:0;
 // Der Looping ist reine Nickbewegung um die Querachse - Lenken bleibt davon unberuehrt
 e.y=r.h+r.driftVis+(r.stun>0?elapsed*14:0)+spin;
 e.x=inLoop?-loopFrame(inLoop,r.distance).pitch:r.air?clamp(-r.vy*.02,-.45,.45):-Math.atan((slopeAt(r.distance)+(coasters.length?coasterP(r.distance).s:0))*dot);
 e.z=-bank*dot+(r.id===0?-(r.steerS||0)*.07:0)-r.driftVis*.12+rollTot(r.distance);
 // Im Schraeg-Looping zeigt das Kart entlang der geneigten Bahn: Grundlage ist der Rahmen aus
 // Tangente und Normale, Lenk- und Driftwinkel und die Schraeglage kommen lokal obendrauf.
 if(inLoop){const st=loopFrame(inLoop,r.distance),tn=tanAt(r.distance),tx=tn.x,tz=tn.z,yaw=angleDiff(e.y,Math.atan2(tx,tz)),roll=e.z;
  _kZ.set(tx*st.tf+tz*st.tl,st.tu,tz*st.tf-tx*st.tl);_kY.set(tx*st.nf,st.nu,tz*st.nf);
  _kX.crossVectors(_kY,_kZ).normalize();_kY.crossVectors(_kZ,_kX);
  r.mesh.quaternion.setFromRotationMatrix(_kM.makeBasis(_kX,_kY,_kZ)).multiply(_kQ.setFromEuler(_kE.set(0,yaw,roll,'YXZ')));}
 let sv=(r.shrinkVis??1)+(((r.shrink||0)>0?.58:1)-(r.shrinkVis??1))*Math.min(1,dt*7);if(Math.abs(sv-1)<.002)sv=1;r.shrinkVis=sv;
 const ks0=r.kartScale||[1,1,1],ks=sv===1?ks0:[ks0[0]*sv,ks0[1]*sv,ks0[2]*sv];
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
  const d=parts.driver;if(d){const lean=-st*.2-(r.driftVis||0)*.3,done=r.finishTime!==null;d.rotation.z+=(lean-d.rotation.z)*Math.min(1,dt*8);d.rotation.x+=((r.air?-.2:r.czFloatS>.05?-.3:r.boost>0?.12:0)-d.rotation.x)*Math.min(1,dt*6);
   d.position.y=.95+(r.air?.14:0)+Math.min(.2,(r.czFloatS||0)*.6)+(done?Math.abs(Math.sin(elapsed*8+r.id))*.3:0)+Math.sin(elapsed*17+r.id)*.015*Math.min(1,Math.abs(r.speed)/20);d.rotation.y=r.stun>0?Math.sin(elapsed*28)*.35:done?Math.sin(elapsed*5+r.id)*.4:0;}}
 syncGlider(r,dt,spin);r.mesh.userData.shield.visible=r.shield>0;const fl=r.boost>0;for(const f of r.mesh.userData.flames){f.visible=fl;if(fl)f.scale.set(1,1,.7+Math.random()*.7);}
 const ug=r.mesh.userData.underglow;if(ug)ug.visible=!r.air&&magOn()&&hasMag(r.distance)&&Math.abs(r.speed)>5;
 for(const b of r.mesh.userData.brakes||[])b.visible=!!r.braking;
 syncTransform(r,dt);}
// Lenkhilfe (R39, Flow): wie Smart Steering - das Kart folgt der Kurve auf der Spur, auf der es
// gerade faehrt; die eigene Lenkung kommt obendrauf (Spur wechseln, Ideallinie, Drift). Vor Kurven,
// die zu eng fuer das Tempo sind, geht sie vom Gas. Rechnet auf der flachen Mittellinie - in
// Looping und Rollzone liegt das Bild woanders, gefahren wird aber flach.
let assistOn=store.get('assist',true);
const _fa=new T.Vector3();
function flatPt(d,off,out){const [i,j,k]=tIdx(d);let tx=TP.tx[i]+(TP.tx[j]-TP.tx[i])*k,tz=TP.tz[i]+(TP.tz[j]-TP.tz[i])*k;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
 return out.set(TP.x[i]+(TP.x[j]-TP.x[i])*k+tz*off,0,TP.z[i]+(TP.z[j]-TP.z[i])*k-tx*off);}
function steerAssist(r){const sp=Math.max(0,r.speed),look=6+sp*.34,tgt=flatPt(r.distance+look,clamp(r.offset,-6.5,6.5),_fa);
 const L=Math.hypot(tgt.x-r.x,tgt.z-r.z)||1,err=angleDiff(Math.atan2(tgt.x-r.x,tgt.z-r.z),r.h);
 return clamp(Math.max(sp,4)*2*Math.sin(err)/L/(PHYS.turn*Math.max(.2,turnCurve(sp))),-1,1);}
// Kurventempo voraus (wie die KI, ohne Drift): so schnell geht die engste Kurve im Bremsweg noch
function assistTop(r){const sp=Math.max(0,r.speed);let t=99;for(let s=6;s<=14+sp*1.2;s+=4){const v=trackAt(r.distance+s).v;t=Math.min(t,Math.sqrt(v*v+2*PHYS.coast*6*s));}return t;}
const keys=new Set(),tkeys=new Set(),touchPtr=new Map(),held=c=>keys.has(c)||tkeys.has(c);function steering(){return (held('ArrowLeft')||held('KeyA')?1:0)-(held('ArrowRight')||held('KeyD')?1:0)||(oh.on?oh.steer:0);}
// Ein-Hand-Steuerung (R45, Handy hochkant): ein Finger wischt links/rechts (stufenlos, der Nullpunkt wandert mit),
// Auto-Gas, Tippen = Hops (in der Luft Trick), weit wischen und kurz halten = Drift (Loslassen = Turbo),
// nach oben wischen = Item. Im Countdown zaehlt der aufgelegte Finger als Gas (Raketenstart).
const oh={on:false,id:null,x0:0,y0:0,t0:0,ax:0,moved:0,steer:0,full:0,opp:0,drift:false,dir:0,hop:0,item:false,taps:new Map()};
// Kurzanleitung: ab dem Countdown bis 4 s nach dem Start, in den ersten fuenf Rennen mit Ein-Hand-Steuerung
let ohHintOn=false;function ohHint(v){if(v===ohHintOn)return;ohHintOn=v;$('ohHint').classList.toggle('show',v);if(!v&&state==='race')store.set('ohHints',store.get('ohHints',0)+1);}
function ohTick(dt,p){if(oh.id===null){oh.drift=false;oh.full=0;return;}const s=oh.steer;
 if(!oh.drift){if(Math.abs(s)>=.9&&p.speed>12&&!p.air&&p.stun<=0){oh.full+=dt;if(oh.full>=.14){oh.drift=true;oh.dir=Math.sign(s);oh.opp=0;}}else oh.full=0;}
 // voll zur Gegenseite gewischt: Drift loesen (Turbo) - bleibt der Finger dort, driftet es gleich andersherum weiter
 else if(s*oh.dir<-.6){oh.opp+=dt;if(oh.opp>.22){oh.drift=false;oh.full=0;}}else oh.opp=0;}

// ---------------------------------------------------------------- KI-Fahrer: Ideallinie, Bremspunkte, Drifts (Koennen je Klasse)
function aiInput(r,dt){const sk=r.skill,sp=Math.max(0,r.speed),look=5+sp*.38;
 let kap=0;for(let s=10;s<=26;s+=8)kap+=trackAt(r.distance+s).kap;kap/=3;
 let line=clamp(kap*90,-4,4)*sk+r.laneBias*(1-sk*.6);
 const fkNear=forkAt(r.distance+22)||forkAt(r.distance);let onFork=false;if(fkNear){if(r.forkFor!==fkNear.f){r.forkFor=fkNear.f;r.forkPick=Math.random()<.2+sk*.4;}onFork=r.forkPick;}else r.forkFor=null;
 // Schanzen/Schlucht: Ideallinie auf die Rampe; Bananen und Pendelpilzen ausweichen
 for(const rp of ramps){const ahead=wrapDiff(rp.d,r.distance);if(ahead>0&&ahead<(rp.gap?95:30))line=rp.off;}
 for(const h of hazards){const p=project(h.x,h.z,r.distance),ahead=wrapDiff(p.d,r.distance);if(ahead>2&&ahead<28&&Math.abs(p.off-line)<2.4)line=p.off+(p.off>line?-3.5:3.5);}
 for(const s of swingers){const ahead=wrapDiff(s.d,r.distance);if(ahead>0&&ahead<35){const ta=elapsed+ahead/Math.max(sp,5);if(s.side){const fb=fireballAt(ta,s.ph,s.side);if(fb.vis&&fb.y<2.4&&Math.abs(fb.off-line)<4)line=fb.off>line?line-3.5:line+3.5;continue;}const off=Math.sin(ta*s.spd+s.ph)*s.amp;if(Math.abs(off-line)<4)line=off>0?-4.6:4.6;}}
 if(chr){for(const c of chr.cows){const ahead=wrapDiff(c.d,r.distance);if(ahead>0&&ahead<34&&Math.abs(c.off-line)<3.6)line=c.off>line?c.off-4.4:c.off+4.4;}
  for(const h of chr.hands){if(h.up<.05&&h.crack.material.opacity<.1)continue;const ahead=wrapDiff(h.d,r.distance);if(ahead>0&&ahead<30&&Math.abs(h.off-line)<3)line=h.off>line?h.off-3.8:h.off+3.8;}
  for(const m of chr.mets){if(m.ring.material.opacity<.05)continue;const ahead=wrapDiff(m.d,r.distance);if(ahead>0&&ahead<36&&Math.abs(m.off-line)<4.2)line=m.off>line?m.off-5:m.off+5;}
  for(const gt of chr.gates){const ahead=wrapDiff(gt.d,r.distance);if(ahead>0&&ahead<40){const ph=Math.floor((elapsed+ahead/Math.max(sp,5))/BEAT)%4;if(ph===0)line=Math.max(line,3.5);else if(ph===2)line=Math.min(line,-3.5);}}}
 if(desert){for(const s of desert.twisters){const ahead=wrapDiff(s.d,r.distance);if(ahead>0&&ahead<40){const ta=elapsed+ahead/Math.max(sp,5),off=Math.sin(ta*s.spd+s.ph)*s.amp;if(Math.abs(off-line)<4.2)line=off>line?off-4.6:off+4.6;}}
  for(const q of desert.pits){const ahead=wrapDiff(q.d,r.distance);if(ahead>-12&&ahead<45&&Math.sign(q.off)*line>2)line=Math.sign(q.off)*2;}}
 if(hz){for(const st of hz.stampers){const ahead=wrapDiff(st.d,r.distance);if(ahead>0&&ahead<40&&Math.abs(st.off-line)<4.6){const a=stamperState(elapsed+ahead/Math.max(sp,5),st.ph);if(a.y<3||a.phase==='fall')line=st.off>0?st.off-5.4:st.off+5.4;}}
  for(const m of hz.missiles){if(m.d===undefined)continue;const ahead=wrapDiff(m.d,r.distance);if(ahead>0&&ahead<45&&Math.abs(m.off-line)<2.6)line=m.off>line?m.off-3.4:m.off+3.4;}}
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

 // Bahnuebergang (R44): ist der Zug bei Ankunft auf dem Uebergang, abbremsen und warten
 if(trainFx)for(const c of trainFx.crossings){const ahead=wrapDiff(c.d,r.distance);if(ahead>0&&ahead<55){const ta=ahead/Math.max(sp,4),fr=((trainFx.s+trainFx.speed*ta-c.s)%trainFx.len+trainFx.len)%trainFx.len;if(fr<34||fr>trainFx.len-8)target=Math.min(target,ahead<14?0:6);}}
 const gas=sp<target-.3,brake=sp>target+2.5&&!gapAhead;
 // Drift: nur bei langen Kurven; Radius per Gegenlenken regeln; Ladestufe je Koennen, Release wenn die Kurve oeffnet
 let drift=false;r.driftCd=Math.max(0,r.driftCd-dt);
 // Anti-Grav dreht nur das Bild, gefahren wird normal: die KI darf hier driften wie ueberall
 const agNear=false;
 let turnAhead=0;for(let s=6;s<=46;s+=4)turnAhead+=trackAt(r.distance+s).kap*4;
 if(r.driftDir){const f=(needYaw*r.driftDir)/(PHYS.turn*Math.min(1,sp/10)),goal=sk>.85?2.35:sk>.6?1.45:.75;
  let exitSoon=0;for(let s=4;s<=20;s+=4)exitSoon+=trackAt(r.distance+s).kap*4;
  drift=!((f<.12&&r.drift>.45)||(r.drift>=goal&&Math.abs(exitSoon)<.28)||Math.abs(r.offset)>7.2||gapAhead||agNear);
  if(drift)steer=clamp(((f-.35)/.7)*2-1,-1,1)*r.driftDir;}
 // Bunny-Hop (R44): Taste ueber den Hopser halten und in die Kurve lenken, dann beginnt der Drift bei der Landung
 else if((r.hopT>0||r.hopGrace>0)&&r.aiHopDir){drift=true;steer=r.aiHopDir*.55;}
 else if(Math.abs(turnAhead)>.75&&sp>17&&r.driftCd<=0&&!r.air&&!gapAhead&&!agNear&&Math.abs(r.offset)<5){r.driftCd=1.5;r.aiHopDir=0;if(Math.random()<sk*.95){drift=true;steer=Math.sign(turnAhead);r.aiHopDir=steer;}}
 return {gas,brake,steer:clamp(steer,-1,1),drift};}
function aiItems(r,order){if(r.cooldown>0||!r.item||r.itemPending)return;const pl=order.indexOf(r),ahead=order[pl-1],behind=order[pl+1],kap=Math.abs(trackAt(r.distance+20).kap);
 const use=r.item==='bomb'?ahead&&ahead.distance-r.distance>12&&ahead.distance-r.distance<45:r.item==='shell'?ahead&&ahead.distance-r.distance<70:r.item==='banana'?behind&&r.distance-behind.distance<35:r.item==='boost'||r.item==='triple'?kap<1/80&&!agrav.some(q=>{const a=wrapDiff(q.s,r.distance);return a>4&&a<55;}):true;
 if(use){useItem(r);r.cooldown=r.item==='triple'?1.2:2.5;}}

// ---------------------------------------------------------------- Audio: Sprecher, SFX (ElevenLabs), Musik
let audioReady=false;
function armAudio(){if(audioReady)return;audioReady=true;if(soundOn){audioInit();playBgm(state==='menu'||state==='finished'?'menu':raceTrack());if(state==='menu')say('welcome');}}
addEventListener('pointerdown',armAudio,{once:true});addEventListener('keydown',armAudio,{once:true});
const VOICE={start:'Auf die Plätze — fertig — los!',lap2:'Runde zwei',lastlap:'Letzte Runde!',turbo:'Turbo!',hit:'Volltreffer!',ouch:'Autsch!',banana:'Banane gelegt!',shield:'Sternenschild!',lead:'Du führst!',win:'Erster Platz!',podium:'Aufs Treppchen!',finish:'Im Ziel!',best:'Neue Bestzeit!',welcome:'Willkommen bei Mushroom Rally!',rocket:'Raketenstart!',early:'Zu früh!',trick:'Super Trick!',spores:'Volle Sporen-Power!',gpnext:'Weiter zum nächsten Rennen!',gpwin:'Grand-Prix-Sieger!',gppodium:'Aufs Grand-Prix-Treppchen!',gpfinish:'Grand Prix beendet!',coaster:'Super-Achterbahn!',launch:'Magnet-Katapult!'};
const VIP=new Set(['start','lap2','lastlap','win','podium','finish','best','gpnext','gpwin','gppodium','gpfinish']);
const SFX_MAX={pickup:1.2,banana:1.6,hit:1,cheer:4,jingle:8,goodtry:6,finallap:4,spore:.6,ramp:1.3,trick:1.1,rocket:1.8,boost:1.4,lap:1.6,bump:.8,drift:1.2,launch:2.4};
// Musik bleibt das Fundament. Kurze Hinweise liegen darueber, Kollisionen und Jubel dahinter.
const AUDIO_MIX={effects:.78,voice:.95,music:.49,world:.82};
const SFX_RMS={c_star:.085,hit:.095,bump:.075,drift:.075,cheer:.075,boost:.105,rocket:.105,ramp:.095,spore:.09,jingle:.14,goodtry:.12,finallap:.115,launch:.11};
const CLIPS={};for(const k of Object.keys(VOICE))CLIPS['v_'+k]='assets/audio/voice/'+k+'.mp3';for(const k of Object.keys(SFX_MAX))CLIPS['s_'+k]='assets/audio/sfx/'+k+'.mp3';
// R44: selbst synthetisierte Chiptune-Effekte (art/r44/make_chiptune.mjs) haben Vorrang vor den Samples
const CHIP=['coin','item','lap','mt1','mt2','mt3','boost','hit','bump','slip','trick','ring','rocket','beep','go','cheer','whirl','sand','whistle','bell','moo','grab','meteor','boom','thunder','levelup','unlock','star'];for(const k of CHIP)CLIPS['s_c_'+k]='assets/audio/sfx/chip/'+k+'.wav';
const clipData={},clipBuf={},clipFail={},clipNorm={},clipPlayed={},effectSources=new Set();let echoSend=null,ambSrc=null,ambGain=null,ambLfo=null,voiceGain=null,sfxGain=null,effectsOut=null,voiceSrc=null,voiceKey=null,voiceQueue=null,pendingVoice=null,duckUntil=0,ducked=false,engine=null,raceFilter=null,masterGain=null,worldGain=null,mixMuted=false,duckLevel=1,duckTick=0;
for(const [k,url] of Object.entries(CLIPS))clipData[k]=fetch(url).then(r=>{if(!r.ok)throw new Error(url);return r.arrayBuffer();}).catch(()=>{clipFail[k]=true;return null;});
const LOOP_CLIPS=new Set(['s_c_star']);
function prepClip(k,b){if(LOOP_CLIPS.has(k)){let sum=0,n=0;const d=b.getChannelData(0);for(let i=0;i<d.length;i+=3){sum+=d[i]*d[i];n++;}clipNorm[k]=Math.min(2.5,(SFX_RMS[k.slice(2)]||.11)/Math.max(Math.sqrt(sum/Math.max(1,n)),1e-4));return b;}
 const sr=b.sampleRate,ch=b.numberOfChannels,channels=Array.from({length:ch},(_,i)=>b.getChannelData(i)),d0=channels[0],audible=i=>channels.some(d=>Math.abs(d[i])>=.004);let start=0;while(start<d0.length&&!audible(start))start++;start=Math.max(0,start-Math.floor(sr*.005));const max=k.startsWith('s_')?(SFX_MAX[k.slice(2)]??2):10;let end=Math.min(d0.length,start+Math.floor(sr*max)),e=end-1;while(e>start&&!audible(e))e--;end=Math.min(end,e+Math.floor(sr*.03));
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
// AudioParam nur bei spuerbarer Aenderung und laufendem Kontext nachfuehren (R44): jeder setTargetAtTime-
// Aufruf legt ein Automationsereignis an. Bei pausiertem Kontext (Handy vor dem ersten Tippen, Ton aus,
// Kopflos-Tests) laeuft die Zeit nicht weiter, die Listen wachsen endlos und kosteten im Profil 16 % CPU.
function aset(p,v,t,tc){if(ctx.state!=='running')return;const tol=Math.abs(v)*.006+1e-4;if(p._mrV!==undefined&&Math.abs(v-p._mrV)<=tol&&Math.abs(p.value-v)<=tol*4)return;p._mrV=v;p.cancelScheduledValues?.(t);p.setTargetAtTime(v,t,tc);}
function syncAudioMix(){if(!ctx)return;const quiet=!soundOn||state==='paused',t=ctx.currentTime;
 if(quiet!==mixMuted){if(quiet){for(const s of effectSources){try{s.stop();}catch{}}effectSources.clear();}mixMuted=quiet;}
 aset(sfxGain.gain,quiet?0:AUDIO_MIX.effects,t,.045);aset(effectsOut.gain,quiet?0:1,t,.035);aset(worldGain.gain,quiet||!['race','countdown'].includes(state)?0:AUDIO_MIX.world,t,.08);aset(masterGain.gain,soundOn?.92:0,t,.035);}
// Sternenschild (R45): eigene Chiptune-Schleife solange der Schild haelt, die Streckenmusik tritt so lange zurueck
let starSrc=null,starOut=null;
function starTick(p){const want=soundOn&&!!ctx&&!!p&&p.shield>0&&(state==='race'||state==='paused');
 if(want&&!starSrc&&clipBuf.s_c_star){starSrc=ctx.createBufferSource();starSrc.buffer=clipBuf.s_c_star;starSrc.loop=true;starOut=ctx.createGain();starOut.gain.value=.95*(clipNorm.s_c_star||1);starSrc.connect(starOut);starOut.connect(sfxGain||masterGain);starSrc.start();}
 else if(!want&&starSrc){const t=ctx.currentTime,s=starSrc,g=starOut;g.gain.setTargetAtTime(0,t,.05);try{s.stop(t+.3);}catch{}s.onended=()=>{s.disconnect();g.disconnect();};starSrc=starOut=null;}}
// Drift-Knistern (R46): solange der Spieler driftet, ein leises Chiptune-Trillern plus Funkenrauschen. Jede
// Mini-Turbo-Stufe hebt Tonhoehe und Tempo (blau -> rot -> lila) und klickt kurz - man hoert, wann loslassen lohnt.
const DRIFT_SND=[[196,14,.016,1400],[392,20,.022,2600],[587,26,.026,3800],[880,34,.03,5200]];let driftSnd=null;
function driftTick(level){const want=soundOn&&!!ctx&&level>=0&&state==='race';
 if(!want){if(driftSnd){const d=driftSnd,t=ctx.currentTime;driftSnd=null;d.g.gain.setTargetAtTime(0,t,.03);for(const o of d.src)try{o.stop(t+.2);}catch{}d.src[0].onended=()=>d.g.disconnect();}return;}
 const t=ctx.currentTime;
 if(!driftSnd){const o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=ctx.createGain(),n=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),ng=ctx.createGain(),g=ctx.createGain();
  if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  o.type='square';lfo.type='square';lfo.connect(lg);lg.connect(o.frequency);n.buffer=noiseBuf;n.loop=true;bp.type='bandpass';bp.Q.value=3;ng.gain.value=.55;
  o.connect(g);n.connect(bp);bp.connect(ng);ng.connect(g);g.gain.value=0;g.connect(sfxGain||masterGain);o.start(t);lfo.start(t);n.start(t);driftSnd={o,lfo,lg,bp,g,src:[o,lfo,n],lvl:-1};}
 if(level!==driftSnd.lvl){const [f,rate,vol,bf]=DRIFT_SND[Math.min(3,level)],d=driftSnd;
  // Trillern: Rechteck springt im LFO-Takt um eine Quinte (NES-Aufladegeraeusch)
  d.o.frequency.setTargetAtTime(f,t,.02);d.lg.gain.setTargetAtTime(f*.5,t,.02);d.lfo.frequency.setTargetAtTime(rate,t,.02);d.bp.frequency.setTargetAtTime(bf,t,.03);d.g.gain.setTargetAtTime(vol,t,.04);
  if(d.lvl>=0&&level>d.lvl)sfxTone(f*2,f*2.5,.06,'square',.03);d.lvl=level;}}
function duckBgm(now){if(voiceQueue&&now>=duckUntil){const k=voiceQueue;voiceQueue=null;say(k);}ducked=now<duckUntil;const dt=duckTick?Math.min(.1,Math.max(0,(now-duckTick)/1000)):1/60;duckTick=now;const target=(ducked?.66:1)*(starSrc?.28:1);duckLevel+=(target-duckLevel)*(1-Math.exp(-dt/(ducked||starSrc?.12:.48)));syncAudioMix();bgmTick(now);}
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
 pickup(){if(playClip('s_c_item',sfxGain,.7)||playClip('s_pickup',sfxGain,.6))return;[880,1108,1318].forEach((f,i)=>sfxTone(f,f,.09,'square',.05,i*.07));},
 tick(){sfxTone(1500,1400,.03,'square',.018);},
 drift(){playClip('s_drift',sfxGain,.5);},
 boost(){if(playClip('s_c_boost',sfxGain,.8)||playClip('s_boost',sfxGain,.85))return;sfxNoise(.5,400,3200,.18,1.5);sfxTone(180,760,.35,'sawtooth',.035);},
 // Hopser: kurzer Chiptune-Sprung (Rechteck, aufwaerts)
 moo(){playClip('s_c_moo',sfxGain,.6);},
 grab(){playClip('s_c_grab',sfxGain,.8);},
 meteor(){playClip('s_c_meteor',sfxGain,.55);},
 boom(v=1){playClip('s_c_boom',sfxGain,.8*v);},
 thunder(){playClip('s_c_thunder',sfxGain,.8);},
 whirl(v=1){playClip('s_c_whirl',sfxGain,.7*v);},
 sand(){playClip('s_c_sand',sfxGain,.5);},
 whistle(){playClip('s_c_whistle',sfxGain,.75);},
 bell(){playClip('s_c_bell',sfxGain,.45);},
 hop(){sfxTone(300,640,.075,'square',.045);sfxTone(640,520,.05,'square',.025,.07);},
 mt(level){if(playClip('s_c_mt'+({mini:1,super:2,ultra:3}[level]||1),sfxGain,.85))return;const base={mini:520,super:660,ultra:880}[level]||520;[1,1.25,1.5].forEach((m,i)=>sfxTone(base*m,base*m*1.02,.09,'square',.045,i*.05));sfxNoise(.45,500,3600,level==='ultra'?.22:.14,1.4);},
 overtake(){sfxTone(988,1318,.08,'triangle',.05);},
 shell(){sfxTone(900,180,.22,'sawtooth',.06);sfxNoise(.15,2000,400,.08,2);},
 banana(){sfxTone(520,220,.3,'triangle',.07);},
 slip(v=1){if(playClip('s_c_slip',sfxGain,.8*v)||playClip('s_banana',sfxGain,.8*v))return;sfxTone(520,160,.45,'triangle',.08*v);},
 shield(){[660,880,1320].forEach((f,i)=>sfxTone(f,f*.99,.4,'triangle',.035,i*.03));},
 hit(v=1){if(playClip('s_c_hit',sfxGain,.9*v)||playClip('s_hit',sfxGain,.9*v))return;sfxTone(160,60,.25,'square',.1*v);sfxNoise(.18,300,90,.1*v,1);},
 bump(v=1){if(playClip('s_c_bump',sfxGain,.8*v)||playClip('s_bump',sfxGain,.75*v))return;sfxTone(130,55,.16,'sine',.16*v);sfxNoise(.12,700,150,.1*v,1);},
 splash(){sfxNoise(.9,1800,200,.25,.8);sfxTone(300,90,.5,'sine',.08);},
 cheer(){playClip('s_c_cheer',sfxGain,.7)||playClip('s_cheer',sfxGain,.6);},
 lap(){if(playClip('s_c_lap',sfxGain,.85)||playClip('s_lap',sfxGain,.8))return;sfxTone(784,784,.1,'square',.05);sfxTone(1046,1046,.22,'square',.05,.11);},
 fanfare(){[523,659,784,1046].forEach((f,i)=>sfxTone(f,f,i===3?.5:.13,'square',.06,i*.12));},
 count(go){if(playClip(go?'s_c_go':'s_c_beep',sfxGain,.8))return;sfxTone(go?880:440,go?880:440,go?.28:.12,'square',.07);},
 rocket(){if(playClip('s_c_rocket',sfxGain,.85)||playClip('s_rocket',sfxGain,.9))return;sfxNoise(.7,300,2600,.2,1.2);},
 ramp(v=1){if(playClip('s_ramp',sfxGain,.7*v))return;sfxTone(200,620,.3,'sine',.08*v);},
 boing(v=1){if(playClip('s_ramp',sfxGain,.7*v,1.25))return;sfxTone(160,700,.35,'triangle',.1*v);},
 trick(){if(playClip('s_c_trick',sfxGain,.8)||playClip('s_trick',sfxGain,.8,1.1))return;sfxTone(600,1500,.25,'triangle',.07);},
 whoosh(){sfxNoise(.3,500,2500,.1,1.4);},
 // Magnet-Katapult (R38): aufheulendes Linearmotor-Surren mit Schub. Ohne Clip: Synthese.
 launch(){if(playClip('s_launch',sfxGain,.95))return;sfxTone(90,900,.9,'sawtooth',.05);sfxTone(180,1800,.9,'square',.018);sfxNoise(.9,300,4200,.16,1.3);},
 // Jeder weitere Magnetbogen: kurzer, steigender Zap
 // Verwandlung (R39): Zischen und zwei helle Klicks, je Form eine andere Tonhoehe
 transform(form){if(!soundOn||!ctx||state==='paused')return;const t=ctx.currentTime,base=form==='plane'?660:form==='dive'?330:480;sfxNoise(.32,900,3400,.11,1.2);
  for(const [d0,f] of [[.05,base],[.15,base*1.5]]){const o=trackEffect(ctx.createOscillator()),g=ctx.createGain();o.type='square';o.frequency.setValueAtTime(f,t+d0);g.gain.setValueAtTime(.0001,t+d0);g.gain.exponentialRampToValueAtTime(.05,t+d0+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d0+.12);o.connect(g);g.connect(sfxGain);o.start(t+d0);o.stop(t+d0+.14);}},
 // Platschen beim Ein- und Auftauchen: Rauschen plus tiefer Plumps
 splash(){if(!soundOn||!ctx||state==='paused')return;sfxNoise(.5,2600,300,.2,.7);const t=ctx.currentTime,o=trackEffect(ctx.createOscillator()),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(55,t+.25);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+.32);},
 // Drachengebruell (R39): tiefer, schwankender Saegezahn plus Rauschen - ohne Clip, rein synthetisch
 roar(){if(!soundOn||!ctx||state==='paused')return;const t=ctx.currentTime,o=trackEffect(ctx.createOscillator()),lfo=ctx.createOscillator(),lg=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  o.type='sawtooth';o.frequency.setValueAtTime(95,t);o.frequency.linearRampToValueAtTime(70,t+1.3);lfo.frequency.value=17;lg.gain.value=9;lfo.connect(lg);lg.connect(o.frequency);
  f.type='lowpass';f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(260,t+1.4);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.16,t+.12);g.gain.exponentialRampToValueAtTime(.001,t+1.5);
  o.connect(f);f.connect(g);g.connect(sfxGain);o.start(t);lfo.start(t);o.stop(t+1.55);lfo.stop(t+1.55);sfxNoise(1.3,1200,300,.12,.8);},
 // Kamera-Ausloeser fuer das On-Ride-Foto
 shutter(){sfxNoise(.06,5200,2400,.1,2.5);sfxTone(2100,1500,.035,'square',.02,.03);},
 zap(i=1){sfxTone(260+i*110,760+i*150,.11,'sawtooth',.026);sfxNoise(.08,2600,5200,.035,3);},
 // Airtime: vorhandener ElevenLabs-Whoosh (Schanze) hoeher gespielt, darueber ein heller Schimmer
 airtime(){playClip('s_ramp',sfxGain,.45,1.3)||sfxNoise(.6,1400,400,.09,.9);[988,1318,1760].forEach((f,i)=>sfxTone(f,f*1.01,.16,'sine',.022,.08+i*.06));},
 fire(v=1){sfxNoise(.55,260,1700,.16*v,1.1);sfxTone(90,220,.4,'sawtooth',.05*v);},
 sail(){if(playClip('s_ramp',sfxGain,.18,.85))return;sfxNoise(.35,450,1100,.035,1.1);},
 ring(precise=false){if(playClip('s_c_ring',sfxGain,.7,precise?1.12:1))return;if(precise&&playClip('s_trick',sfxGain,.45,.92))return;[660,825,990].forEach((f,i)=>sfxTone(f,f,.13,'triangle',.028,i*.055));},
 spore(n){if(playClip('s_c_coin',sfxGain,.6,1+n*.012))return;if(playClip('s_spore',sfxGain,.4,1+n*.035))return;sfxTone(1200+n*60,1800+n*60,.08,'sine',.05);},
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
const raceTrack=()=>{const m=courseAt(selected).music;return bgm.failed[m]?'race':m;};
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
function newStats(){return {cowHits:0,twisterHits:0,trainHits:0,grabs:0,squashed:0,meteorHits:0,beatBoosts:0,rocket:0,mt:{mini:0,super:0,ultra:0},maxCombo:0,drafts:0,tricks:0,rings:0,precisionRings:0,airtime:0,coasters:0,hitsDealt:0,hitsTaken:0,overtakes:0,bestLap:Infinity,lapStart:0,falls:0,bumps:0,maxSpores:0};}
function start(){if(gp.active)selected=gp.race;worldMode=mode==='world'&&!gp.active;if(worldMode){if(selected!==WORLD_IDX)lastRaceSel=selected;selected=WORLD_IDX;}else if(selected===WORLD_IDX)selected=lastRaceSel;document.body.classList.toggle('ow',worldMode);if(!worldMode)owPortalHide();syncTrackButtons();keys.clear();buildCourse();if(worldMode)owReset();setAmbience(!!theme.ember);state='countdown';elapsed=0;countdown=3;startPress=-1;noticeTimer=0;stats=newStats();
 for(const id of ['menu','result','ceremony','pausePanel'])$(id).hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('touch').hidden=false;$('gpBadge').hidden=!gp.active;$('hud').classList.toggle('tt',isTT());$('ttGhost').hidden=$('ttMedal').hidden=!isTT();if(isTT())for(const b of boxes)b.cooldown=1e9;
 document.body.classList.add('racing');document.body.classList.remove('cer');if(soundOn)audioInit();finishMusicAt=0;playBgm(raceTrack());setBgmRate(course.bgmRate||1);stopVoice();say('start');updateCamera(1,true);
 toast(`${course.name} · ${isTT()?'Zeitfahren':cc+'cc'}`,2.2);if(isTT()&&ghost)setTimeout(()=>toast('👻 Dein Geist fährt mit – schlag ihn!',2),2300);if(rivalId!==null){const rn=racers[rivalId].name;setTimeout(()=>{if(state==='countdown'||state==='race')toast(`⚔ RIVALE: ${rn.toUpperCase()}`,1.8);},2400);}if(coarseInput){wantFs=true;enterFs();}}
function home(){owPortalHide();setAmbience(false);gp.active=false;state='menu';keys.clear();buildCourse();for(const id of ['hud','touch','pause','pausePanel','result','ceremony'])$(id).hidden=true;$('menu').hidden=false;setText('message','');document.body.classList.remove('racing','cer');if(engine)engine.g.gain.value=0;SFX.hum(false);stopVoice();finishMusicAt=0;playBgm('menu');refreshMenu();}
let beforePause='race';function pause(){if(state==='paused'){state=beforePause;$('pausePanel').hidden=true;}else if(state==='race'||state==='countdown'){beforePause=state;state='paused';keys.clear();$('pausePanel').hidden=false;stopVoice();}if(engine)engine.g.gain.value=soundOn&&state==='race'?.011:0;}
function use(){if(state!=='race')return;useItem(racers[0]);}
function useItem(r){if(r.itemPending)return null;const prevStun=racers.map(x=>x.stun),res=activate(r,racers);if(!res)return null;const me=r.id===0;
 if(res.type==='shell'&&res.target!==undefined)racers[res.target].stun=prevStun[res.target];
 if(me&&(res.type==='boost'||res.type==='triple'))SFX.boost();else if(me&&SFX[res.type])SFX[res.type]();
 if(res.type==='banana')dropBanana(r);if(res.type==='shell')fireShell(r,res.target);if(res.type==='bomb')throwBomb(r);if(res.type==='storm')stormStrike(r,res.hit);
 if(me){if(res.type==='boost'||res.type==='triple')say('turbo');if(res.type==='shield')say('shield');if(res.type==='banana')say('banana');notice({boost:'TURBO!',triple:'TURBO ×'+(res.charges||0),shield:'STERNENSCHILD',banana:'BANANE!',shell:'SUCH-PANZER!',bomb:'PILZBOMBE!',storm:'GEWITTERWOLKE!'}[res.type],.8);}
 return res;}
const MAX_HAZARDS=14;
// Gewitterwolke (R46): ueber jedem getroffenen Kart eine dunkle Wolke, ein Zickzack-Blitz faehrt herab (geteilte
// Geometrie und Materialien, nach 0,7 s wieder weg), Donner und Bildblitz; getroffene Karts schrumpfen (core.mjs)
const stormMat=stdMat({color:0x4a4170,roughness:.85}),stormMatHi=stdMat({color:0x6a5fa0,roughness:.8}),boltMat=new T.MeshBasicMaterial({color:0xfff6b0}),boltGeo=new T.BoxGeometry(1,1,1),puffBall=new T.SphereGeometry(1,12,9);
[stormMat,stormMatHi,boltMat].forEach(m=>persistentMats.add(m));[boltGeo,puffBall].forEach(g=>sharedGeo.add(g));let stormFx=[];
function stormCloud(icon){const g=new T.Group();for(const [x,y,z,r,hi] of [[0,.1,0,.62,1],[-.62,-.05,.05,.46,0],[.6,-.04,-.04,.5,0],[-.2,-.18,.32,.42,0],[.25,.32,-.1,.44,1]]){const m=new T.Mesh(puffBall,hi?stormMatHi:stormMat);m.position.set(x,y,z);m.scale.set(r,r*.85,r);g.add(m);}
 if(icon){const b=new T.Mesh(new T.ExtrudeGeometry(boltShape(),{depth:.2,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:1}),stdMat({color:0xffe27a,emissive:0xffa51f,emissiveIntensity:.8,roughness:.3}));b.scale.setScalar(.5);b.position.set(.05,-.78,.1);g.add(b);}return g;}
function spawnBolt(k,blocked){const g=new T.Group(),top=9,cloud=stormCloud(false);cloud.scale.setScalar(1.9);cloud.position.y=top;g.add(cloud);
 const pts=[];for(let i=0;i<=6;i++){const t=i/6;pts.push(new T.Vector3(i&&i<6?(Math.random()-.5)*1.3:0,top-.6-t*(top-(blocked?2.4:1.4)),i&&i<6?(Math.random()-.5)*1.3:0));}
 const bolt=new T.Group();for(let i=0;i<6;i++){const a=pts[i],b=pts[i+1],d=_v.subVectors(b,a),len=d.length(),m=new T.Mesh(boltGeo,boltMat);m.scale.set(.2,len,.2);m.position.addVectors(a,b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(_kY.set(0,1,0),d.normalize());bolt.add(m);}
 g.add(bolt);g.position.set(k.x,(k.y||0),k.z);actors.add(g);stormFx.push({g,bolt,k,life:.7});}
function updateStorm(dt){for(let i=stormFx.length-1;i>=0;i--){const f=stormFx[i];f.life-=dt;f.g.position.set(f.k.x,f.k.y||0,f.k.z);f.bolt.visible=f.life>.3&&Math.sin(f.life*90)>-.3;f.g.children[0].scale.setScalar(1.9*Math.min(1,f.life*3));if(f.life<=0){actors.remove(f.g);stormFx.splice(i,1);}}}
function flashScreen(v){const f=$('flash');if(!f)return;f.style.transition='none';f.style.opacity=String(v);requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .45s';f.style.opacity='0';}));}
function stormStrike(u,hit){const me=u.id===0;let meHit=false,dealt=0,near=me;
 for(const h of hit){const k=racers[h.id];if(!k)continue;if(nearPlayer(k,140)){spawnBolt(k,h.blocked);near=true;}
  if(h.id===0){if(h.blocked)toast('SCHILD HÄLT DEN BLITZ AB!',1,'good');else{meHit=true;stats.hitsTaken++;if(roulette){roulette=null;k.itemPending=false;}}}else if(!h.blocked)dealt++;}
 if(me){stats.hitsDealt+=dealt;stats.stormBest=Math.max(stats.stormBest||0,dealt);toast(dealt?`⚡ ${dealt} GETROFFEN!`:'⚡ NIEMAND VOR DIR',1.1,dealt?'good':'');}
 if(meHit){toast('⚡ GEWITTER! DU BIST KLEIN',1.4,'bad');shake=.5;say('ouch');}
 if(near||meHit){SFX.thunder();flashScreen(me||meHit?.7:.3);}}
function dropBanana(r){if(hazards.length>=MAX_HAZARDS){const old=hazards.shift();actors.remove(old.mesh);}const x=r.x-Math.sin(r.h)*3.2,z=r.z-Math.cos(r.h)*3.2,g=new T.Group();actors.add(g);g.position.set(x,r.y,z);
 // In Achterbahn und Rollzone liegt die Bahn im Bild hoeher als in der Physik - sonst laege die
 // Banane unsichtbar unter der schwebenden Fahrbahn. Getroffen wird weiter flach (x/z, r.y).
 if(hasMag(r.distance-3.2))posAt(r.distance-3.2,r.offset,0,g.position);g.rotation.y=Math.random()*TAU;if(P.banana){const b=cloneProto(P.banana);b.scale.setScalar(1.6);g.add(b);}else mesh(new T.ConeGeometry(.6,1.3,5),gold,g,0,.7,0);hazards.push({mesh:g,x,z,y:r.y,life:25,owner:r.id,arm:.4});}
function fireShell(r,target){const g=new T.Group();if(P.shell){const s=cloneProto(P.shell);s.scale.setScalar(1.25);g.add(s);}else sphere(g,mat(0x5cc46a),0,.4,0,.55,.4,.55);actors.add(g);shots.push({g,d:r.distance+2.5,off:r.offset,owner:r.id,target,t:0});}
function hitSpores(r){const lost=loseSpores(r);if(lost){const p=r.mesh.position;for(let i=0;i<lost*3;i++){const a=Math.random()*TAU;emit(p.x,p.y+.8,p.z,0xfff27a,Math.sin(a)*5,4+Math.random()*3,Math.cos(a)*5,.9);}}return lost;}
function shellImpact(sh){const t=racers[sh.target],me=sh.owner===0,onMe=sh.target===0,near=nearPlayer(t,60);
 if(t.shield>0){burst(t,0xffe263,14);if(onMe)toast('ABGEWEHRT!',.9,'good');if(near)SFX.shield();return;}
 if(t.finishTime===null){hitKart(t,1.6,.25);hitSpores(t);}burst(t,0x8beb73,18);if(me||onMe||near)SFX.hit(me||onMe?1:.5);
 if(me){stats.hitsDealt++;say('hit');toast('VOLLTREFFER!',1,'good');}if(onMe){stats.hitsTaken++;say('ouch');toast('AUTSCH! −✦',1,'bad');shake=.45;}}
// Bombe fliegt im Bogen voraus, landet, zischt kurz und explodiert (oder sofort bei Kontakt). Druckwelle schleudert Karts hoch.
let bombs=[];const bombGeo=new T.SphereGeometry(.62,16,12),fuseGeo=new T.CylinderGeometry(.06,.06,.45,6),bombMat=stdMat({color:0x2a2238,roughness:.35,metalness:.2}),bombCap=stdMat({color:0xff3b30,roughness:.5}),sparkBall=new T.MeshBasicMaterial({color:0xffe066});
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
 if(worldMode&&state==='race'){for(const r of racers)if(r.distance>length*1.5){r.distance-=length;if(r.safeD!==undefined)r.safeD=lapDist(r.safeD);}updateOW(dt);}
 // Feuerwerk vom Zieleinlauf abarbeiten (laeuft auch im Result-Schirm weiter)
 for(const f of fworks)if(!f.done&&elapsed>=f.at){f.done=1;try{const p=posAt(0,f.off,f.h,new T.Vector3());burstAt(p.x,p.y,p.z,f.col);}catch(e){}}
 if(state==='ceremony'){updateCeremony(dt);return;}
 if(state!=='race'&&state!=='countdown')return;
 const player=racers[0],ohGas=state==='countdown'&&oh.on&&oh.id!==null,gasHeld=held('ArrowUp')||held('KeyW')||ohGas;
 if(state==='countdown'){oh.hop=0;if(!worldReady){setText('message','');return;}ohHint(oh.on&&store.get('ohHints',0)<5);const prev=Math.ceil(countdown);countdown-=dt;if(gasHeld){if(startPress<0)startPress=countdown;}else startPress=-1;
  if(Math.ceil(countdown)!==prev)SFX.count(countdown<=0);setLights(countdown>2?1:countdown>1?2:countdown>0?3:4);setText('message',countdown>0?String(Math.ceil(countdown)):'LOS!');
  if(engine&&ctx){const t=ctx.currentTime;aset(engine.o1.frequency,gasHeld?170:60,t,.08);aset(engine.o2.frequency,gasHeld?85:30,t,.08);aset(engine.f.frequency,gasHeld?1500:500,t,.1);aset(engine.g.gain,soundOn?.008:0,t,.1);}
  if(countdown<=0){state='race';notice('LOS!',.8);stats.lapStart=0;if(isTT()){player.item='triple';player.charges=3;}
   const fx=Math.sin(player.h),fz=Math.cos(player.h);
   if(gasHeld&&startPress>0&&startPress<=1.0){player.boost=Math.max(player.boost,1.5);player.vx=fx*16;player.vz=fz*16;SFX.rocket();say('rocket');toast('RAKETENSTART!',1.2,'good');stats.rocket++;burst(player,0xffa53d,20);}
   else if(gasHeld&&startPress>=2.2&&!ohGas){player.stall=1.1;say('early');toast('ZU FRÜH! Motor abgewürgt',1.4,'bad');}
   for(const r of racers)if(r.id&&Math.random()<CLASSES[cc].skill*.6){r.boost=.9;}}
  for(const r of racers)syncKart(r,dt);syncKartInstances();return;}
 elapsed+=dt;updateSwingers();updateHazards(dt);updateTrain(dt,elapsed);updateDesert(dt,elapsed);updateCharacter(dt,elapsed);setLights(elapsed<2.5?4:0);recordGhost(player);updateGhost();
 if(oh.on)ohTick(dt,player);const ohHop=oh.hop>0;oh.hop=0;if(ohHintOn&&(elapsed>4||!oh.on))ohHint(false);
 const order=ranking(racers),placeOf=r=>order.indexOf(r)+1,driftKey=held('ShiftLeft')||held('ShiftRight')||(oh.on&&(oh.drift||ohHop));
 if(!autopilot&&driftKey&&!prevDrift&&player.air&&player.airT>.06&&!player.trick)startTrick(player);prevDrift=driftKey;
 if(roulette){roulette.t-=dt;roulette.tick-=dt;if(roulette.tick<=0){roulette.tick=.075;SFX.tick();}if(roulette.t<=0){player.item=roulette.final;player.charges=player.item==='triple'?3:0;player.itemPending=false;SFX.pickup();toast(ITEM_NAMES[player.item]+'!',.9);roulette=null;}}
 const cls=CLASSES[cc];
 for(const r of racers){if(r.finishTime!==null){r.vx*=.98;r.vz*=.98;r.x+=r.vx*dt;r.z+=r.vz*dt;syncKart(r,dt);continue;}const me=r.id===0;
  r.stall=Math.max(0,(r.stall||0)-dt);r.padCd=Math.max(0,(r.padCd||0)-dt);r.ringCd=Math.max(0,(r.ringCd||0)-dt);
  let input;
  if(me&&!autopilot){const target=steering(),rate=(Math.sign(target)!==Math.sign(r.steerS||0)&&target!==0)?11:7;r.steerS=(r.steerS||0)+clamp(target-(r.steerS||0),-dt*rate,dt*rate);
   let st=r.steerS,gas=(autoGas||gasHeld||oh.on)&&r.stall<=0;
   let brk=held('ArrowDown')||held('KeyS');
   if(assistOn&&!r.driftDir&&r.stun<=0){st=clamp(st+steerAssist(r)*(1-.55*Math.abs(st)),-1,1);const top=assistTop(r);if(r.boost<=0&&r.speed>top+1.5)gas=false;if(r.speed>top+5)brk=true;}
   input={gas,brake:brk,steer:st,drift:driftKey};}
  else{input=aiInput(r,dt);r.steerS=(r.steerS||0)+(input.steer-(r.steerS||0))*Math.min(1,dt*8);}
  // Steckenbleib-Schutz: wer mit Gas laenger als 1,6 s fast steht, wird auf die Strecke gesetzt
  if(state==='race'&&r.stun<=0&&r.stall<=0&&input.gas&&Math.abs(r.speed)<2.5){r.slowT=(r.slowT||0)+dt;
   if(r.slowT>(worldMode?4:1.6)){r.slowT=0;respawn(r);if(me)toast('ZURÜCK AUF DIE STRECKE',1.2);}}
  else r.slowT=0;
  if(!me)aiItems(r,order);
  // In einer Rollzone schwebt die Bahn - daneben ist kein Gelaende, sondern nichts. Die
  // Offroad-Bremse (Hoechsttempo 12,5) gehoert dort nicht hin; seitlich haelt die Fuehrung.
  // Achterbahn (R38) zaehlt als Magnetbahn (Halten, kein Offroad), hat aber ihr eigenes Tempo:
  // Katapult statt Dauer-Turbo, Energie aus den Huegeln statt Energieband.
  const czn=coasters.length?coasterAt(r.distance):null;
  const inSpiral=(agrav.length||loops.length)&&hasRoll(r.distance),inRoll=inSpiral||!!czn;
  // Durchgaengige Turbo-Streifen: das Energieband der Rollzone schiebt permanent an -
  // der Schwung bleibt oben, niemand schleppt sich durch die Spirale (Nutzerwunsch).
  if(inSpiral&&!r.air&&Math.abs(r.speed)>5)r.boost=Math.max(r.boost,.55);
  // Magnetfeld-Spuren: Funken unterm Kart zeigen, dass die Bahn traegt (sparsam, nur beim Spieler-Umfeld)
  if(inRoll&&!r.air&&frame%2===0&&nearPlayer(r,60)){const p=r.mesh.position;
   emit(p.x+(Math.random()-.5)*1.6,p.y+.15,p.z+(Math.random()-.5)*1.6,theme.glow?0x7cf3ff:0x59d7ff,(Math.random()-.5)*2.5,-1.5-Math.random()*2.5,(Math.random()-.5)*2.5,.4);}
  // Saubere Spirale: wer die Rollzone auf der Linie durchfaehrt (nie an die Magnetbande),
  // kriegt beim Austritt einen Mini-Turbo - belohnt Fahren statt Anecken.
  if(inSpiral){if(!r.inAgPrev)r.agMax=0;r.agMax=Math.max(r.agMax||0,Math.abs(r.offset));}
  else if(r.inAgPrev&&r.finishTime===null&&(r.agMax||9)<5.5&&Math.abs(r.speed)>15){r.boost=Math.max(r.boost,.8);
   if(me){toast('SAUBERE SPIRALE!',1,'good');SFX.whoosh();}}
  r.inAgPrev=inSpiral;
  if(me)SFX.hum(inRoll);
  const czMove=czn?coasterRide(r,czn,me):1;
  if(!czn&&r.czRun)coasterExit(r,me);
  const offroad=!worldMode&&!r.air&&!onRoad(r.distance,r.offset)&&!inGap(r.distance)&&!inRoll&&!(elems.length&&elemAt(r.distance));
  const meadow=worldMode&&!r.air&&!onRoad(r.distance,r.offset);if(TEST){r.tOff=(r.tOff||0)+(offroad?dt:0);r.tAll=(r.tAll||0)+dt;}
  const s=trackAt(r.distance),tan=tanAt(r.distance),dot=Math.sin(r.h)*tan.x+Math.cos(r.h)*tan.z;
  // Mildes Gummiband: Rivalen weit vorn werden minimal langsamer, weit hinten minimal schneller (Sieg bleibt verdient)
  const rubber=me?1:1+clamp((player.distance-r.distance)/400,-1,1)*cls.rubber,speedMul=me?1:cls.ai*(.96+.04*r.skill)*rubber;
  const oldLap=lap(r,length),oldBoost=r.boost;
  // Im Looping wird der Vorschub auf der Fahrbahn gebremst, damit das Bild in normalem Tempo
  // durch den Kreis laeuft. Gefahren wird geradeaus, also braucht es keinen Extra-Grip.
  const lp=loops.length?loopAt(r.distance):null,tfF=elems.length?r.mesh.userData.tf?.cur:null;
  // In Rollzonen uebernimmt die Magnetbahn den Hoehenweg: Hang-Widerstand faellt weg, sonst
  // fehlt genau dort der Schwung, wo die Strecke zusaetzlich noch kippt.
  driveKart(r,dt,input,{air:r.air,offroad,meadow,slope:inRoll?0:slopeAt(r.distance)*dot,speedMul:(meadow?.95:1)*speedMul*(czn&&r.czRun?.launched?COASTER.launchTop/PHYS.boostTop:1)*(tfF==='dive'?.95:tfF==='plane'?1.04:1),gripMul:(lp?1.5:inRoll?2.3:1)*(tfF==='boat'?.85:1),moveMul:lp?1/loopStretch(lp,loopFrame(lp,r.distance)):czMove});
  if(me&&r.hopT>0&&!r.hopWas)SFX.hop();r.hopWas=r.hopT>0;desertHits(r,me,dt);
  // Luftfuehrung (R44): nach Schanzen und Luecken folgt das Kart in der Luft sanft dem Streckenverlauf und wird
  // Richtung Mitte gezogen - eine Kurve direkt hinter dem Sprung (12 Stellen im Audit) fuehrt nicht mehr zum Absturz
  if(r.air&&!r.gliding&&!inRoll&&!lp&&r.stun<=0&&Math.abs(r.speed)>8){const tn=tanAt(r.distance+Math.abs(r.speed)*.3),want=Math.atan2(tn.x,tn.z),dh=angleDiff(want,r.h);
   if(Math.abs(dh)<1.3){const tr=clamp(dh,-1.4*dt,1.4*dt),c=Math.cos(tr),sn=Math.sin(tr),vx=r.vx*c+r.vz*sn,vz=-r.vx*sn+r.vz*c;r.h+=tr;r.vx=vx;r.vz=vz;}
   if(Math.abs(r.offset)>4){const [i,j,k]=tIdx(r.distance),cx=TP.x[i]+(TP.x[j]-TP.x[i])*k,cz=TP.z[i]+(TP.z[j]-TP.z[i])*k,dx=cx-r.x,dz=cz-r.z,dl=Math.hypot(dx,dz)||1,pull=Math.min(6,(Math.abs(r.offset)-4)*2.2)*dt*(gravMul(r.distance)<1?2.5:1);r.vx+=dx/dl*pull*6;r.vz+=dz/dl*pull*6;}}
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
  if(Math.abs(pr.off)>14&&!forkBand(pr.d,pr.off,4)&&!nearLoop(r.distance)){const g2=project(r.x,r.z,projectGlobal(r.x,r.z,r.y||0));if(Math.abs(g2.off)<9){const jump=wrapDiff(g2.d,lapDist(r.distance));if(jump>60&&!worldMode){respawn(r);if(me)toast('ABKÜRZUNG ZÄHLT NICHT!',1.6,'bad');skipped=true;}else{r.distance+=jump;pr=g2;}}}
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
   // Reine Steilkurven fuehren lockerer: breiteres freies Band, keine Winkel-Klemme (Driften bleibt frei)
   // Elemente-Parcours (R39): See und Flug fuehren wie eine Steilkurve - sonst glitt das Kart neben
   // die Bootsspur oder in der Luft neben die Flugbahn (bis 28 m Versatz)
   const inElem=elems.length>0&&!lp&&!!elemAt(r.distance),soft=!!(czn&&!czn.spec.hills.length)||inElem;
   if(inRoll||inElem){const tn=tanAt(r.distance),free=lp?6.2:soft?5.8:rollFree(r.distance,3.2),ao=Math.abs(r.offset),ex=ao-free;
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
      if(!soft&&Math.abs(dh)>.35)r.h=th+Math.sign(dh)*.35;}
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
   for(const d of boostPads)if(Math.abs(wrapDiff(r.distance,d))<pl&&Math.abs(r.offset)<pw){const onBeat=course.beatgates&&beatPhase(elapsed)<.24;if(onBeat&&r.boost<1.5&&me){stats.beatBoosts++;toast('IM TAKT! +TURBO',.8,'good');SFX.mt('super');}r.boost=Math.max(r.boost,onBeat?1.7:1);}}
  if(me&&r.boost>oldBoost&&oldBoost===0)SFX.boost();
  if(me&&r.stall>0&&frame%5===0)dropPuff(r);
  for(const pad of pads)if(!r.air&&r.padCd<=0&&Math.abs(wrapDiff(r.distance,pad.d))<1.9&&Math.abs(r.offset-pad.off)<2){armGlider(r,'bounce');r.air=true;r.airT=0;r.vy=11+Math.max(0,r.speed)*.1;r.y+=.1;r.boost=Math.max(r.boost,.5);r.padCd=.6;pad.squash=.45;if(nearPlayer(r,50))SFX.boing(me?1:.4);}
  // Magnet-Ringe (ag) nehmen auch gebunden mit: in der Rollzone haelt die Bahn die Hoehe,
  // deshalb prueft der Luft-Filter dort nicht, nur Streckenmeter und Linie.
  for(const ring of rings)if(r.ringCd<=0&&(ring.ag?inRoll:ring.fly?r.mesh.userData.tf?.cur==='plane':r.air)&&Math.abs(wrapDiff(r.distance,ring.d))<2.2&&Math.abs(r.offset-ring.off)<3.4&&(ring.ag||ring.fly||Math.abs(r.y+.9-ring.y)<2.9)){const precise=isPrecisionFlight(r,ring);r.boost=Math.max(r.boost,ringBoostDuration(precise));r.ringCd=.8;ring.flash=.5;ring.precision=precise;if(me&&worldMode&&ring.fly)owRingHit(ring);if(me){stats.rings++;if(precise)stats.precisionRings++;SFX.ring(precise);toast(precise?'PRÄZISIONSFLUG!  EXTRA TURBO':ring.ag?'RING-BOOST!':'WINDRING-TURBO!',1,'good');burst(r,precise?0xffe5a0:0x59d7cf,precise?24:16);}}
  for(const sp of spores)if(sp.cd<=0&&Math.abs(wrapDiff(r.distance,sp.d))<1.8&&Math.abs(r.offset-sp.off)<1.8&&Math.abs(r.y+.8+coasterH(sp.d)+(elems.length?elemH(sp.d):0)-sp.y)<2.3){sp.cd=10;if(r.spores<MAX_SPORES){r.spores++;if(me){stats.maxSpores=Math.max(stats.maxSpores,r.spores);SFX.spore(r.spores);if(r.spores===MAX_SPORES){say('spores');toast('VOLLE SPOREN-POWER!',1.2,'good');}}}}
  if(!isTT())for(const b of boxes){if(b.cooldown<=0&&!r.item&&!r.itemPending&&Math.abs(wrapDiff(r.distance,b.distance))<2.6&&Math.abs(r.offset-b.offset)<2.2&&Math.abs(r.y+1+coasterH(b.distance)+(elems.length?elemH(b.distance):0)-b.baseY)<3){b.cooldown=4;if(me){r.itemPending=true;roulette={t:.95,tick:0,final:rollItem(placeOf(r),racers.length)};}else{r.item=rollItem(placeOf(r),racers.length);r.charges=r.item==='triple'?3:0;r.cooldown=1+Math.random()*2;}}}
  if(me&&!worldMode&&lap(r,length)>oldLap){const lt=elapsed-stats.lapStart,best=lt<stats.bestLap;stats.bestLap=Math.min(stats.bestLap,lt);stats.lapStart=elapsed;const isLast=lap(r,length)===LAPS;
   toast(`RUNDE ${oldLap}: ${format(lt)}${best&&oldLap>1?' · BESTE RUNDE!':''}`,2,best&&oldLap>1?'good':'');notice(isLast?'LETZTE RUNDE!':'RUNDE 2',1.5);say(isLast?'lastlap':'lap2');if(isLast){if(!playClip('s_finallap',sfxGain,.9))SFX.lap();setBgmRate((course.bgmRate||1)*1.07);}else SFX.lap();}
  if(finish(r,length,elapsed)&&me){const lt=elapsed-stats.lapStart;stats.bestLap=Math.min(stats.bestLap,lt);planFireworks();}
  syncKart(r,dt);
  // Drift-Funken je Ladestufe (blau/orange/lila) an den Hinterraedern, Reifenspuren beim Rutschen
  const sx=Math.sin(r.h),cz=Math.cos(r.h);
  if(r.driftDir&&!r.air&&frame%2===0&&nearPlayer(r,90)){const lvl=miniTurbo(r.drift)?.[2]||null;if(lvl)for(const side of [-1,1])emit(r.x-sx*1.3+cz*side*.9,r.y+.25,r.z-cz*1.3-sx*side*.9,MT_COLORS[lvl],-sx*3+(Math.random()-.5)*3,1.5+Math.random()*2,-cz*3+(Math.random()-.5)*3,.3);}
  if(!r.air&&(r.driftDir||Math.abs(r.slide)>2.2)&&Math.abs(r.speed)>8&&frame%3===0&&nearPlayer(r,70))for(const side of [-1,1])dropSkid(r.x-sx*.9+cz*side*.85,r.y,r.z-cz*.9-sx*side*.85,r.h);
  if(me&&offroad&&r.combo){if(r.combo>=2)toast('COMBO WEG',.7,'bad');r.combo=0;}
 // Ueberkopf: kopfueber zieht das Kart eine Funkenspur
 {const lq3=loops.length?loopAt(r.distance):null;
  const upDot=lq3?loopFrame(lq3,r.distance).nu:Math.cos(rollTot(r.distance));
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
  const rel=Math.hypot(a.vx-b.vx,a.vz-b.vz);if(collideKarts(a,b)){
   // Gewitterwolke: ein kleines Kart wird vom grossen plattgefahren
   const fl=flattenSmall(a,b,rel);if(fl){fl.squash=.6;burst(fl,0xfff27a,10);if(fl.id===0){stats.hitsTaken++;toast('ÜBERROLLT!',1,'bad');SFX.hit();shake=.4;}else if(a.id===0||b.id===0){stats.hitsDealt++;toast('PLATT GEFAHREN!',.9,'good');SFX.hit(.7);}}
   else if((a.id===0||b.id===0)&&rel>6){SFX.bump(clamp(rel/25,.2,.8));shake=Math.max(shake,.15);}}}
 updateShots(dt);updateBombs(dt);
 const newOrder=ranking(racers),place=newOrder.indexOf(player)+1;
 if(place<lastPlace&&elapsed>2){stats.overtakes+=lastPlace-place;SFX.overtake();toast(`▲ PLATZ ${place}`,.9,'good');}
 if(place===1&&lastPlace>1&&elapsed>8&&elapsed-leadAt>15){leadAt=elapsed;say('lead');}lastPlace=place;
 // Falsche Richtung
 const tan=tanAt(player.distance),fdot=Math.sin(player.h)*tan.x+Math.cos(player.h)*tan.z;wrongT=fdot<-.35&&Math.abs(player.speed)>4?wrongT+dt:0;if(wrongT>1&&noticeTimer<=0){notice('FALSCHE RICHTUNG ↺',1);SFX.wrong();}
 if(engine&&ctx){const t=ctx.currentTime,sp=Math.abs(player.speed);aset(engine.o1.frequency,55+sp*5.2+(player.air?50:0)+(player.boost>0?30:0),t,.06);aset(engine.o2.frequency,28+sp*2.6,t,.06);aset(engine.f.frequency,480+sp*36,t,.08);aset(engine.g.gain,soundOn?.011:0,t,.09);aset(engine.noise.gain,soundOn&&(player.driftDir||Math.abs(player.slide)>2.5)&&sp>8&&!player.air?.045:0,t,.07);aset(engine.bp.frequency,player.driftDir?1100+player.drift*260:900,t,.1);if(raceFilter)aset(raceFilter.frequency,(3000+sp*430)*(1-.85*(elemFx?elemFx.uw:0)),t,.18);}
 syncKartInstances();if(player.finishTime!==null)end();}

// Direkt nach dem Rendern im selben Takt auslesen: ohne preserveDrawingBuffer ist das Bild danach weg.
// Das HUD liegt im DOM, das Foto zeigt also nur die Szene. Klein und als JPEG, damit es leicht bleibt.
// Wie bei echten Achterbahnen haengt die Fotokamera an der Strecke VOR dem Wagen und schaut zurueck
// aufs Gesicht: kurz umstellen, rendern, auslesen, zurueckstellen und neu rendern (einmal je Rennen).
function takeRidePhoto(){photoPending=false;const p=racers[0];if(!p)return;
 const pos=camera.position.clone(),q=camera.quaternion.clone(),up=camera.up.clone(),fov=camera.fov;
 try{const look=p.mesh.position.clone();look.y+=1.2;
  // Freie Sicht: kein anderes Kart naeher als 1,7 m an der Sichtlinie (sonst ist ein Rivale im Bild)
  const _s=new T.Vector3(),_c=new T.Vector3(),clearLine=e=>racers.every(o=>{if(o===p)return true;_s.subVectors(look,e);const L=_s.length()||1;_s.divideScalar(L);
   _c.subVectors(o.mesh.position,e);const t=clamp(_c.dot(_s),0,L);return _c.addScaledVector(_s,-t).length()>1.7;});
  let eye=null;for(const [ahead,side,up] of [[6,2.4,2.4],[4.5,-2.6,2.2],[5,3.4,3.4],[3.8,0,3.8],[7,-3.2,3]]){const e=posAt(p.distance+ahead,p.offset+side,up,new T.Vector3());if(clearLine(e)){eye=e;break;}}
  if(!eye)eye=posAt(p.distance+3.6,p.offset+1.6,3.2,new T.Vector3());
  // R40: Das Foto kostete einen Frame mit zwei vollen Zusatz-Bildern, blockierendem Pixel-Ruecklauf
  // und JPEG-Kodierung - auf dem Handy ein deutlicher Ruckler. Jetzt: ein Bild (Schattenkarte
  // wiederverwendet), asynchroner Schnappschuss, Kodierung im Leerlauf; das normale Bild kommt im
  // naechsten Frame, der Blitz deckt den einen Frame ab.
  camera.up.set(0,1,0);camera.position.copy(eye);camera.lookAt(look);camera.fov=48;camera.updateProjectionMatrix();
  const sa=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;renderer.render(scene,camera);renderer.shadowMap.autoUpdate=sa;
  const src=renderer.domElement,w=480,h=Math.round(w*src.height/Math.max(1,src.width));
  createImageBitmap(src,{resizeWidth:w,resizeHeight:h,resizeQuality:'medium'}).then(bmp=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bmp,0,0);if(bmp.close)bmp.close();
   (window.requestIdleCallback||setTimeout)(()=>{ridePhoto=c.toDataURL('image/jpeg',.82);});}).catch(()=>{ridePhoto=null;});}
 catch(e){ridePhoto=null;}
 camera.position.copy(pos);camera.quaternion.copy(q);camera.up.copy(up);camera.fov=fov;camera.updateProjectionMatrix();
 const f=$('flash');if(f){f.style.transition='none';f.style.opacity='.8';requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .5s';f.style.opacity='0';}));}
 SFX.shutter();}
function showRidePhoto(){const rp=$('ridePhoto');if(!rp)return;rp.hidden=!ridePhoto;if(ridePhoto){rp.querySelector('img').src=ridePhoto;rp.querySelector('figcaption').textContent='ON-RIDE-FOTO · '+course.name.toUpperCase();}}
// R44: Fortschritt nach dem Rennen - XP-Balken fuellt sich (auch ueber Stufen hinweg), neue Erfolge und Lackierungen
function showProgress(res){store.set('prog',res.prog);const el=$('resultProg');if(!el)return;const lv0=levelOf(res.prog.xp-res.xp.total),lv1=levelOf(res.prog.xp);
 const unl=res.levelUp?KART_COLORS.filter(k=>k.lvl&&k.lvl>res.before&&k.lvl<=res.after):[];
 el.innerHTML=`<div class="xp-head"><b>STUFE <span id="xpLvl">${lv0.level}</span></b><span>+${res.xp.total} XP${res.xp.mul>1?` (×${res.xp.mul})`:''}</span></div><div class="xp-bar"><i id="xpFill" style="width:${Math.round(lv0.into/lv0.need*100)}%"></i></div>`+
  `<div class="xp-parts">${res.xp.parts.map(([k,v])=>`<span>${k} <b>+${v}</b></span>`).join('')}</div>`+
  (res.levelUp?`<div class="xp-up">⬆ FAHRERSTUFE ${res.after}!${unl.length?' · Neue Lackierung: '+unl.map(k=>k.n.split(' /')[0]).join(', '):''}</div>`:'')+
  (res.fresh.length?`<div class="ach-new">${res.fresh.map(id=>{const a=achById(id);return `<div class="ach"><i>🏅</i><b>${a.n}</b><small>${a.d}</small></div>`;}).join('')}</div>`:'');
 const fill=$('xpFill');setTimeout(()=>{if(res.levelUp){fill.style.width='100%';setTimeout(()=>{setText('xpLvl',String(lv1.level));fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='';fill.style.width=Math.round(lv1.into/lv1.need*100)+'%';playClip('s_c_levelup',sfxGain,.9);},700);}else fill.style.width=Math.round(lv1.into/lv1.need*100)+'%';},450);
 if(res.fresh.length)setTimeout(()=>playClip('s_c_unlock',sfxGain,.8),res.levelUp?1600:900);}
function end(){elapsed=racers[0].finishTime??elapsed;qualityRaceEnd();if(isTT())return endTT();state='finished';keys.clear();roulette=null;SFX.hum(false);burst(racers[0],0xffd452,26);burst(racers[0],0xed6350,16);burst(racers[0],0x55bdb2,16);
 $('result').hidden=false;$('touch').hidden=true;showRidePhoto();const order=ranking(racers),place=order.indexOf(racers[0])+1,board=$('leaderboard'),rs=raceStars(place,stats.hitsTaken);
 $('resultTitle').textContent=place===1?(rs.perfect?'Perfektes Rennen!':'Der Pokal gehört dir!'):place<=3?`Platz ${place} – aufs Treppchen!`:`Platz ${place}. Da geht noch was!`;
 $('resultTime').textContent=`${course.name} · ${cc}cc · ${format(elapsed)}`;
 $('resultStars').innerHTML=[0,1,2].map(i=>`<i class="${i<rs.stars?'on':''}">★</i>`).join('')+(rs.perfect?'<b>PERFEKT</b>':'');
 stopVoice();say(place===1?'win':place<=3?'podium':'finish');if(place<=3)SFX.cheer();board.replaceChildren();
 // Statistik: macht sichtbar, womit man das Rennen gewonnen (oder verloren) hat
 const bestKey=`bestlap-${selected}`,oldBestLap=store.get(bestKey,Infinity),newBestLap=stats.bestLap<oldBestLap;if(newBestLap)store.set(bestKey,stats.bestLap);
 const st=[['Beste Runde',format(stats.bestLap)+(newBestLap?' ★ NEU':'')],['Mini-Turbos · beste Combo',`${stats.mt.mini} · ${stats.mt.super} · ${stats.mt.ultra} · ×${stats.maxCombo||0}`],['Tricks · Ringe · Windschatten',`${stats.tricks} · ${stats.rings} · ${stats.drafts}`],['Präzisionsflüge',stats.precisionRings||0],...(coasters.length?[['Airtime · Achterbahn',`${stats.airtime||0} · ${stats.coasters||0}`]]:[]),['Überholt',stats.overtakes],['Treffer gelandet / kassiert',`${stats.hitsDealt} / ${stats.hitsTaken}`],['Rempler / Stürze',`${stats.bumps} / ${stats.falls}`]];
 $('resultStats').innerHTML=st.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 // Rivale und Tages-Herausforderung (R46) vor dem Verbuchen, damit XP und Erfolge sie sehen
 if(rivalId!==null){stats.rivalBeaten=rivalBeaten(order.map(r=>r.id),rivalId);$('resultStats').insertAdjacentHTML('beforeend',`<div class="rival ${stats.rivalBeaten?'won':'lost'}"><span>⚔ Rivale ${racers[rivalId].name}</span><b>${stats.rivalBeaten?'GESCHLAGEN ✓':'vor dir'}</b></div>`);}
 {const ch=dailyChallenge(dayKey());if(!worldMode&&store.get('dailyDone','')!==ch.day&&dailyDone(ch,{track:selected,cc,place,finished:true,stats})){stats.daily=true;store.set('dailyDone',ch.day);dailyShown=null;setTimeout(()=>toast(`📅 TAGESAUFGABE GESCHAFFT! +${DAILY_XP} XP`,2,'good'),600);}}
 showProgress(recordRace(store.get('prog',{xp:0,ach:[],done:[],won:[]}),{track:selected,cc,place,finished:true,stats:{...stats}}));
 if(gp.active){const gained={};order.forEach((r,i)=>gained[r.id]=GP_POINTS[i]);addGpPoints(gp.points,order);$('resultEyebrow').textContent=`GRAND PRIX ${cc}cc · RENNEN ${gp.race+1} / ${courses.length}`;
  gpStandings(gp.points,racers.map(r=>r.id)).forEach((id,i)=>{const li=document.createElement('li');if(id===0)li.className='me';li.innerHTML=`<span>${i+1}.</span><span>${racers[id].name}</span><span class="gain">+${gained[id]}</span><span>${gp.points[id]} P</span>`;board.append(li);});
  $('again').textContent=gp.race<courses.length-1?'Nächstes Rennen →':'Zur Siegerehrung 🏆';if(gp.race<courses.length-1)say('gpnext');}
 else{$('resultEyebrow').textContent='ZIEL ERREICHT';$('again').textContent='Nochmal – schneller! ↻';order.forEach((r,i)=>{const li=document.createElement('li');if(r.id===0)li.className='me';li.innerHTML=`<span>${i+1}.</span><span>${r.name}</span><span>${r.finishTime!==null?format(r.finishTime):'noch im Rennen'}</span>`;board.append(li);});}
 if(engine)engine.g.gain.value=0;let wasBest=false;const key=`best-${selected}-${cc}`,old=store.get(key,Infinity);if(elapsed<old&&place<=3){store.set(key,elapsed);wasBest=true;}
 const starKey=`stars-${selected}-${cc}`;if(rs.stars>store.get(starKey,0))store.set(starKey,rs.stars);refreshBest();
 if(wasBest&&!TEST){say('best');burst(racers[0],0xffe16a,36);notice('NEUE BESTZEIT!',2.6);}
 stopBgm();if(!playClip(place<=3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(place<=3?6800:4800);if(!wasBest)setText('message','');}
function endTT(){state='finished';keys.clear();roulette=null;const p=racers[0];$('result').hidden=false;$('touch').hidden=true;showRidePhoto();if(ghost)ghost.mesh.visible=false;
 const m=medalOf(elapsed),key=`tt-${selected}`,old=store.get(key,Infinity),record=elapsed<old,prevMedal=store.get(`medal-${selected}`,3);
 if(record){store.set(key,elapsed);if(rec&&rec.x.length)store.set(`ghost-${selected}`,{...rec,next:undefined,color:KART_COLORS[colorIndex].c,time:elapsed});}
 if(m<prevMedal)store.set(`medal-${selected}`,m);
 burst(p,m===0?0xffd23f:m===1?0xdfe6ee:m===2?0xd08a4a:0x55bdb2,34);
 $('resultEyebrow').textContent='ZEITFAHREN · '+course.name.toUpperCase();
 $('resultTitle').textContent=m<3?`${['Gold','Silber','Bronze'][m]}-Medaille!`:'Knapp daneben – der Geist wartet!';
 $('resultTime').textContent=`${format(elapsed)}${record?' · NEUER REKORD 👻':isFinite(old)?' · Rekord '+format(old):''}`;
 $('resultStars').innerHTML=[0,1,2].map(i=>`<i class="${i<3-m?'on':''}">★</i>`).join('')+(m<prevMedal&&m<3?'<b>NEUE MEDAILLE</b>':'');
 const st=[['Beste Runde',format(stats.bestLap)],['Mini-Turbos',`${stats.mt.mini} · ${stats.mt.super} · ${stats.mt.ultra}`],['Tricks / Ringe',`${stats.tricks} / ${stats.rings}`],['Präzisionsflüge',stats.precisionRings||0],...(coasters.length?[['Airtime · Achterbahn',`${stats.airtime||0} · ${stats.coasters||0}`]]:[]),['Rempler / Stürze',`${stats.bumps} / ${stats.falls}`]];
 $('resultStats').innerHTML=st.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 const board=$('leaderboard');board.replaceChildren();course.medals.forEach((t,i)=>{const li=document.createElement('li');if(i===m)li.className='me';li.innerHTML=`<span>${MEDALS[i]}</span><span>${elapsed<=t?'✓ geschafft':'noch '+(elapsed-t).toFixed(1)+' s'}</span><span>${format(t)}</span>`;board.append(li);});
 $('again').textContent=record?'Gegen den neuen Geist ↻':'Nochmal versuchen ↻';refreshBest();
 stopVoice();say(record?'best':'finish');if(m<3)SFX.cheer();if(engine)engine.g.gain.value=0;stopBgm();if(!playClip(m<3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(m<3?6800:4800);setText('message','');}
function nextAfterResult(){if(gp.active){if(gp.race<courses.length-1){gp.race++;start();}else ceremony();}else start();}

// ---------------------------------------------------------------- Grand-Prix-Siegerehrung, Pokale & Freischaltung
function ceremony(){state='ceremony';worldDirty=true;clearGroup(actors);kartInst=null;kartPool=null;bombs=[];stormFx=[];hazards=[];shots=[];puffs=[];
 for(const id of ['result','hud','touch','pause'])$(id).hidden=true;document.body.classList.remove('racing');document.body.classList.add('cer');
 const standings=gpStandings(gp.points,racers.map(r=>r.id)),pos=sample(length*.035,-34).p,group=new T.Group();group.position.set(pos.x,0,pos.z);const look=sample(length*.035,0).p;
 world.traverse(o=>{if((o.isGroup||o.isMesh)&&o.parent===world&&!o.isInstancedMesh&&o.position.y<20&&Math.hypot(o.position.x-pos.x,o.position.z-pos.z)<26&&Math.hypot(o.position.x-pos.x,o.position.z-pos.z)>0.5)o.visible=false;});group.rotation.y=Math.atan2(look.x-pos.x,look.z-pos.z);actors.add(group);
 const S=2.2,podium=[];if(P.podium){const pd=cloneProto(P.podium);pd.scale.setScalar(S);group.add(pd);}else[[0,1.5],[-2.6,1],[2.6,.7]].forEach(([x,h])=>box(group,cream,x*S,h*S/2,0,2.5*S,h*S,2.2*S));
 [[0,1.5],[-2.6,1],[2.6,.7]].forEach(([x,h],i)=>{const r=racers[standings[i]],k=kart(r.color,r.id===0&&KART_COLORS[colorIndex].gold,r.id===0?driverIndex:AI_DRIVERS[r.id]);k.position.set(x*S,h*S,0);k.scale.setScalar(1.25);group.add(k);podium.push(k);});
 let trophy=null;if(P.trophy){trophy=cloneProto(P.trophy);trophy.scale.setScalar(1.6);trophy.position.set(0,1.5*S+3.1,0);group.add(trophy);}
 group.updateMatrixWorld(true);cer={group,trophy,podium,t:0,burstT:0,center:new T.Vector3(pos.x,4,pos.z),angle:group.rotation.y};
 const mine=standings.indexOf(0)+1,tKey=`trophy-${cc}`,prevT=store.get(tKey,9);if(mine<=3&&mine<prevT)store.set(tKey,mine);
 let unlock='';if(mine===1)grantAch('gp');if(mine===1&&cc>=100&&!store.get('gold',false)){store.set('gold',true);unlock='🔓 GOLDPILZ-KART FREIGESCHALTET!';}
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
 setText('time',format(elapsed));setText('speed',String(Math.round(Math.abs(p.speed)*(p.czVis||1)*3.6)));setText('sporeCount',String(p.spores||0));
 {const on=rivalId!==null&&!!racers[rivalId];const tag=$('rivalTag');if(tag.hidden===on)tag.hidden=!on;
  if(on){const rv=racers[rivalId],ahead=rv.finishTime!==null&&p.finishTime===null||(rv.finishTime===null&&p.finishTime===null&&rv.distance>p.distance),t=(ahead?'▲ ':'▼ ')+rv.name.toUpperCase();if(HC.rv!==t){HC.rv=t;$('rivalName').textContent=t;tag.classList.toggle('ahead',ahead);}}}
 let key='empty',name='ITEM SAMMELN';
 if(roulette){const ks=['boost','shell','banana','shield','bomb','storm'];key=ks[Math.floor(performance.now()/75)%ks.length];name='…';}
 else if(p.item){key=p.item;name=ITEM_NAMES[p.item];}
 const tag=key+(key==='triple'?p.charges:'');
 if(HC.art!==tag){HC.art=tag;const pic=itemThumbs[key];
  const html=(pic?'<img src="'+pic+'" alt="">':(ITEM_ART[key]||ITEM_ART.empty))+(key==='triple'?'<b class="cnt">'+p.charges+'</b>':''),col=ITEM_COL[key]||'#cfe0d4';
  for(const id of ['itemIcon','titemIcon']){const el=$(id);if(el){el.innerHTML=html;el.parentElement.style.setProperty('--it',col);}}
  $('item').classList.toggle('spin',!!roulette);$('titem').classList.toggle('spin',!!roulette);}
 setText('itemName',name);const ready=p.item?'1':'0';if(HC.ready!==ready){HC.ready=ready;$('titem').classList.toggle('ready',!!p.item);$('item').classList.toggle('ready',!!p.item);}
 const full=p.spores>=MAX_SPORES?'1':'0';if(HC.full!==full){HC.full=full;$('spores').classList.toggle('full',full==='1');}
 const lvl=miniTurbo(p.drift)?.[2]||'';const w=(p.driftDir?Math.min(100,p.drift/1.9*100):0).toFixed(0)+'%';if(HC.dw!==w){HC.dw=w;$('driftbar').style.width=w;}const dc=lvl?'#'+MT_COLORS[lvl].toString(16).padStart(6,'0'):'#9fb4c2';if(HC.dc!==dc){HC.dc=dc;$('driftbar').style.background=dc;}
 setText('driftlabel',p.boost>0?'TURBO!':p.air?(p.trick?'TRICK!':oh.on?'IN DER LUFT · TIPPEN = TRICK':p.gliding?'PILZGLEITER · DRIFT = TRICK':'IN DER LUFT · DRIFT = TRICK'):p.driftDir?(lvl?MT_LABEL[lvl]+' BEREIT':oh.on?'FINGER HALTEN …':'DRIFT HALTEN …'):p.hopT>0?'HOPS! JETZT LENKEN':(p.draft||0)>.25?'WINDSCHATTEN …':oh.on?'WEIT WISCHEN = DRIFT':coarseInput?'DRIFT + LENKEN':'SHIFT + LENKEN = DRIFT');}
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
 const back0=dbg.camBack??(portrait?10.5:8.4),up0=dbg.camUp??(portrait?4.8:3.7),sx=Math.sin(camH),cz=Math.cos(camH),py=p.y??0;

 // Anti-Grav: Kamera folgt der gedrehten Fahrbahn (Versatz und Hochachse um die Fahrtrichtung gedreht)
 // Feed-Forward: das analytische Roll-Delta wird direkt uebernommen, nur der Restfehler wird geglaettet.
 // So hinkt der Horizont bei schnellen Korkenziehern nicht (alt: dt*7-Nachlauf ~30 Grad) und die
 // TAU/0-Naht am Ende eines Roll-Moduls loest keinen Rueckwaertssalto aus (angleDiff ist wrap-sicher).
 // Eine einzige Kameraführung fuer flach, Spirale und Looping: Position, Hochachse und
 // Blickrichtung kommen aus demselben Rahmen und werden durchgehend geglättet. Frueher waren das
 // drei Modi mit harten Umschaltern - genau dort ruckte das Bild.
 const lq=loops.length?loopAt(p.distance):null;
 // R44: Achterbahn-Twists drehen die Kamera nur zu 40 % mit (Horizont bleibt ruhiger), und die Kamera-Rolle ist auf
 // 3,2 rad/s begrenzt - schnelle Spiralen drehten das Bild vorher mit bis zu 15 rad/s
 const rl=(agrav.length?rollAt(p.distance):0)+(coasters.length?coasterRoll(p.distance,_rax2)*.4:0);
 // Gewicht fuer die Bahnkamera: der Sichthub der Rollzone faehrt ohnehin weich hoch und runter
 // Achterbahn (R38): ab ein paar Metern Hoehe setzt sich die Kamera ebenfalls auf die Bahn hinter
 // dem Kart - sonst schneidet sie an Kuppe und Abfahrt durch den Huegel.
 const rw=Math.max(agrav.length&&!lq?Math.min(1,liftAt(p.distance)/7):0,coasters.length&&!lq?Math.min(1,coasterH(p.distance)/6)*.85:0,elems.length&&!lq?Math.min(1,Math.abs(elemH(p.distance))/4)*.9:0);
 if(snap)camRoll=camRollPrev=rl;
 else{const dRl=clamp(angleDiff(rl,camRollPrev),-3.2*dt,3.2*dt),pred=camRoll+dRl;camRoll=angleDiff(pred+clamp(angleDiff(rl,pred)*(1-Math.exp(-dt*10)),-3.2*dt,3.2*dt),0);camRollPrev=angleDiff(camRollPrev+dRl,0);}
 let kx=p.x,ky=py,kz=p.z,fx=sx,fy=0,fz=cz,ux=0,uy=1,uz=0;
 // Im Looping wird der Kamerarahmen aus der Blickrichtung des Karts aufgebaut (nicht aus der
 // Streckentangente): am Ein- und Ausgang ist er damit exakt die flache Kamera, also kein Ruck.
 if(lq){const st=loopFrame(lq,p.distance);
  posAt(p.distance,p.offset,py-roadRef(p.distance,p.offset),_agP);kx=_agP.x;ky=_agP.y;kz=_agP.z;
  fx=sx*st.tf+cz*st.tl;fy=st.tu;fz=cz*st.tf-sx*st.tl;ux=sx*st.nf;uy=st.nu;uz=cz*st.nf;}
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
 const back=back0*(1-rw*.34);let up=up0+rw*2.4;
 // Korkenzieher um den Drachen (R39): die Kamera bleibt unter der Drehachse, sonst saesse sie im Drachenkoerper
 if(coasters.length){coasterRoll(p.distance,_rax3);if(_rax3.A>0)up=Math.min(up,_rax3.A-3.6);}
 _agV.set(kx-fx*back+camUp.x*up,ky-fy*back+camUp.y*up,kz-fz*back+camUp.z*up);
 // und sie setzt sich auf die Bahn an ihrer eigenen Stelle, nicht in den Rahmen des Karts
 if(rw>0){posAt(lapDist(p.distance-back),p.offset,up,_agB);_agV.lerp(_agB,rw);}
 if(snap)camera.position.copy(_agV);else camera.position.lerp(_agV,1-Math.exp(-dt*(7+rw*5)));
 camera.up.copy(camUp);
 camera.lookAt(kx+fx*8+camUp.x*1.3,ky+fy*8+camUp.y*1.3,kz+fz*8+camUp.z*1.3);
 if(p.boost>0){camera.position.y+=Math.sin(elapsed*63)*.05;camera.position.x+=Math.sin(elapsed*49)*.04;}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.x+=(Math.random()-.5)*shake*.9;camera.position.y+=(Math.random()-.5)*shake*.7;}
 setFov((portrait?74:62)+(p.boost>0?10:0)+clamp(Math.abs(p.speed)-24,0,16)*.35+(p.czFloatS>.05?6:0),dt,snap);}
function setFov(target,dt,snap){camFov=snap?target:camFov+(target-camFov)*Math.min(1,dt*6);if(Math.abs(camera.fov-camFov)>.01){camera.fov=camFov;camera.updateProjectionMatrix();}}
function adaptQuality(fps){if(gfxMode!=='auto'||(state!=='race'&&state!=='countdown')||fps>=50||quality.level>=5)return;quality.level++;
 // R44: mitten im Rennen nur Aufloesung, Schattenkarte und Schattenrhythmus - nie Schatten oder Material umschalten
 quality.dprCap=Math.max(.7,quality.dprCap-(quality.level<=2?.15:.1));
 if(quality.level===1&&!LITE){sun.shadow.mapSize.set(512,512);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
 if(quality.level===2)shadowEvery=2;
 renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));resize();
 if(store.get('gfxAuto',0)<Math.min(quality.level,3))store.set('gfxAuto',Math.min(quality.level,3));}
// Laeuft ein ganzes Rennen fluessig (ueber 58 fps), darf die naechste Sitzung eine Stufe hoeher starten
function qualityRaceEnd(){if(gfxMode!=='auto'||!quality.raceFrames)return;const fps=quality.raceFrames/Math.max(1,quality.raceSec);const l=store.get('gfxAuto',0);if(fps>58&&l>0)store.set('gfxAuto',l-1);quality.raceFrames=0;quality.raceSec=0;}
const dbg={};let tunnelMix=0,shadowEvery=1;
const GFX={auto:{n:'Auto'},mid:{n:'Mittel'},low:{n:'Sparsam'}};
let gfxMode=store.get('gfx','auto');
// Feste Stufen: Aufloesung, Schattenkarte, Schattenrhythmus. 'auto' startet hoch und regelt bei Bedarf herunter.
function applyGfx(){const m=gfxMode;
 if(m==='low'||LITE){const lr=store.get('gfxAuto',0);quality.level=m==='low'?3:lr;quality.dprCap=m==='low'?.85:Math.max(.9,1.5-.15*lr);shadowEvery=1;renderer.shadowMap.enabled=false;sun.castShadow=false;}
 else{renderer.shadowMap.enabled=true;sun.castShadow=true;
  if(m==='mid'){quality.level=2;quality.dprCap=1;shadowEvery=2;sun.shadow.mapSize.set(512,512);}
  // Touch-Geraete (Handy) starten sparsamer: volle Aufloesung kostet dort am meisten Bildrate (R39)
  else{quality.level=coarseInput?1:0;quality.dprCap=coarseInput?1:1.25;shadowEvery=coarseInput?2:1;sun.shadow.mapSize.set(coarseInput?512:768,coarseInput?512:768);
   // R44: gelernte Stufe aus frueheren Rennen gleich anwenden - Herunterregeln mitten im Rennen (v. a. Schatten aus)
   // zwingt jeden Shader zum Neukompilieren und ruckelte die ganze erste Runde lang
   const learned=Math.min(2,store.get('gfxAuto',0));if(learned>quality.level){quality.level=learned;quality.dprCap=learned>=2?.9:1;sun.shadow.mapSize.set(512,512);if(learned>=2)shadowEvery=2;}}
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
 renderer.shadowMap.autoUpdate=shadowEvery<=1&&!coarseInput;
 scene.traverse(o=>{if(o.isMesh)for(const mm of [].concat(o.material))if(mm)mm.needsUpdate=true;});
 renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));resize();}
function animateWorld(dt,now){updateDizzy(now);updateRival();if(stormFx.length)updateStorm(dt);
 // Energiewaende der Anti-Grav-Zonen atmen leicht - macht das Magnetfeld lebendig
 for(let i=0;i<agravWalls.length;i++)agravWalls[i].opacity=.24+.08*Math.sin(now*.0022+i*1.3);
 for(let i=0;i<agravGates.length;i++)agravGates[i].scale.setScalar(1+.04*Math.sin(now*.0025+i*1.1));
 if(UG_MAT)UG_MAT.opacity=.45+.15*Math.sin(now*.004);
 // Magnetboegen (R38): Lauflicht in Fahrtrichtung wie bei einer echten Abschussbahn, beim
 // Durchfahren blitzt der Bogen hell auf (flash, klingt ab)
 if(coasterGlow){const g=coasterGlow;for(let i=0;i<g.list.length;i++){const t=g.list[i],c=t.c;c.flash[t.i]*=Math.exp(-dt*3.2);
   const ch=Math.pow(.5+.5*Math.sin(now*.009-t.i*1.15),4),b=.28+.55*ch+2.2*c.flash[t.i];
   g.mesh.setColorAt(i,_col.copy(g.col).multiplyScalar(b));}
  if(g.mesh.instanceColor)g.mesh.instanceColor.needsUpdate=true;}
 if(ferris)updateFerris(dt,now);
 if(dragon)updateDragon(dt);
 if(elemFx)updateElems(dt,now);
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
 for(const ring of rings){ring.flash=Math.max(0,ring.flash-dt);if(!ring.flash)ring.precision=false;if(!ring.ag)ring.mesh.rotation.z=now*.00032;ring.mesh.scale.setScalar(1+ring.flash*(ring.ag?.6:.24));
  for(const m of ring.glow||[ring.mesh.material]){m.emissiveIntensity=(ring.ag?.9:.55)+ring.flash*2.5;if(!ring.ag&&!ring.fly)m.emissive.setHex(ring.precision?0xffc867:0x42d8be);}}
 if(boostTex)boostTex.offset.y=-(now*.0022)%1;
 if(rainbowTex)rainbowTex.offset.y=(now*.00008)%1;
 if(state==='menu')updateSwingersMenu(now);
 {const p=racers[0],want=p&&tunnels.length&&inTunnel(p.distance)?1:0;
  if(want||tunnelMix>.002){tunnelMix+=(want-tunnelMix)*Math.min(1,dt*4.5);renderer.toneMappingExposure=theme.exposure*(1-.26*tunnelMix);
   headlight.intensity=Math.max(theme.head!==undefined?theme.head:(theme.stars?90:0),tunnelMix*130);if(echoSend)echoSend.gain.value=tunnelMix*.5;}}
 if(!dbg.noSpores)updateSpores(dt,now);if(!dbg.noCrowd&&frame%2===0)updateCrowd(now);
 if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0&&state!=='countdown')setText('message','');}
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').className='';}}
function updateSwingersMenu(now){updateSwingers(now*.001);updateHazards(.016,now*.001,false);updateTrain(.016,now*.001);updateDesert(.016,now*.001);updateCharacter(.016,now*.001,false);}
// ?fps in der Adresse: Bildrate, Modus, Aufloesungsfaktor und Draw-Calls oben links (zum Testen auf dem Handy)
const fpsEl=new URLSearchParams(location.search).has('fps')?Object.assign(document.body.appendChild(document.createElement('div')),{id:'fpsMeter'}):null;let fpsN=0,fpsT=0;
function loop(now){requestAnimationFrame(loop);if(dbg.manual)return;const dt=Math.min((now-last)/1000||.016,.05);last=now;
 if(finishMusicAt&&now>finishMusicAt){finishMusicAt=0;if(state==='finished'||state==='ceremony')playBgm('menu');}
 if(fpsEl){fpsN++;if(now-fpsT>500){fpsEl.textContent=`${Math.round(fpsN*1000/(now-fpsT))} fps · ${LITE?'Leicht':'Voll'} · ${renderer.getPixelRatio().toFixed(2)}x · ${renderer.info.render.calls} DC`;fpsN=0;fpsT=now;}}
 quality.fpsFrames++;if(state==='race'){quality.raceFrames=(quality.raceFrames||0)+1;quality.raceSec=(quality.raceSec||0)+dt;}if(quality.fpsStart&&now-quality.fpsStart>1200){adaptQuality(quality.fpsFrames*1000/(now-quality.fpsStart));quality.fpsFrames=0;quality.fpsStart=now;}else if(!quality.fpsStart)quality.fpsStart=now;
 frameStep(dt,now);}
const prof={upd:0,anim:0,hud:0,ren:0,n:0};
function frameStep(dt,now){if(dbg.freeze)return;frame++;
 if(shadowEvery>1&&renderer.shadowMap.enabled){renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=frame%shadowEvery===0;}
 if(revealQueue){const n=Math.max(10,Math.ceil(revealQueue.length/8));for(let i=0;i<n&&revealQueue.length;i++)revealQueue.shift().visible=true;if(!revealQueue.length)revealQueue=null;}shaderTime.value=now/1000;starTick(racers[0]);{const p=racers[0];driftTick(p&&p.driftDir&&!p.air&&!autopilot?({mini:1,super:2,ultra:3}[miniTurbo(p.drift)?.[2]]||0):-1);}duckBgm(now);
 const p0=performance.now();if(state!=='paused'){update(dt);const p1=performance.now();prof.upd+=p1-p0;animateWorld(dt,now);updateCamera(dt);prof.anim+=performance.now()-p1;}
 if(frame%3===0){hud();if(state==='race'||state==='countdown')drawMap();}
 if(racers[0]&&headlight.intensity>0){const p=racers[0];headlight.position.set(p.x+Math.sin(p.h)*5,(p.y||0)+3.2,p.z+Math.cos(p.h)*5);}
 if(racers[0]){sun.target.position.set(racers[0].x,0,racers[0].z);sun.position.set(racers[0].x+theme.sunPos[0]*.8,theme.sunPos[1]*.8,racers[0].z+theme.sunPos[2]*.8);}
 if(!renderer.shadowMap.autoUpdate)renderer.shadowMap.needsUpdate=frame%2===0;const p2=performance.now();renderer.render(scene,camera);if(photoPending)takeRidePhoto();prof.ren+=performance.now()-p2;prof.n++;}
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
 if(key==='storm')return stormCloud(true);
 if(key==='shield'){const g=new T.Group();g.add(new T.Mesh(new T.ExtrudeGeometry(starShape(),ex),stdMat({color:0xffe9fb,emissive:0xff9ee0,emissiveIntensity:.55,roughness:.35,metalness:.2})));return g;}
 if(key==='triple'){const g=new T.Group();[-0.62,0,0.62].forEach((x,i)=>{const m=new T.Mesh(new T.ExtrudeGeometry(boltShape(),ex),stdMat({color:i===1?0xfff0ad:0xffd45c,emissive:0xffa51f,emissiveIntensity:.7,roughness:.3,metalness:.25}));m.position.set(x,0,i===1?.15:0);m.scale.setScalar(i===1?.85:.62);g.add(m);});return g;}
 const g=new T.Group();g.add(new T.Mesh(new T.ExtrudeGeometry(boltShape(),ex),stdMat({color:0xffe27a,emissive:0xffa51f,emissiveIntensity:.8,roughness:.3,metalness:.25})));return g;}
function buildItemThumbs(){if(!renderer||itemThumbs.done)return;
 const S=176,rt=new T.WebGLRenderTarget(S,S);rt.texture.colorSpace=T.SRGBColorSpace;
 const sc=new T.Scene(),cam=new T.PerspectiveCamera(30,1,.1,40);cam.position.set(1.5,1.7,3.6);cam.lookAt(0,0,0);
 sc.add(new T.HemisphereLight(0xffffff,0x5a6472,2.3));
 const dl=new T.DirectionalLight(0xfff2dc,2.8);dl.position.set(2.5,4,3);sc.add(dl);
 const dl2=new T.DirectionalLight(0x9fc7ff,1.1);dl2.position.set(-3,1.5,-2);sc.add(dl2);
 const buf=new Uint8Array(S*S*4),oldC=new T.Color();renderer.getClearColor(oldC);const oldA=renderer.getClearAlpha();renderer.setClearColor(0x000000,0);
 const box=new T.Box3(),size=new T.Vector3(),mid=new T.Vector3();
 for(const key of ['empty','boost','triple','shell','banana','shield','bomb','storm']){
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
 itemThumbs.done=['empty','boost','triple','shell','banana','shield','bomb','storm'].every(k=>itemThumbs[k]);}
function openAchievements(){const pr=store.get('prog',{xp:0,ach:[]}),lv=levelOf(pr.xp||0),got=new Set(pr.ach||[]);
 setText('achLevel',`Fahrerstufe ${lv.level}`);$('achBar').innerHTML=`<i style="width:${Math.round(lv.into/lv.need*100)}%"></i><span>${lv.into} / ${lv.need} XP</span>`;
 $('achCount').textContent=`${got.size} / ${ACH.length} Erfolge`;
 $('achList').innerHTML=ACH.map(a=>`<div class="ach ${got.has(a.id)?'on':''}"><i>${got.has(a.id)?'🏅':'🔒'}</i><b>${a.n}</b><small>${a.d}</small></div>`).join('')+
  `<div class="ach-colors">${KART_COLORS.filter(k=>k.lvl).map(k=>`<span class="${lv.level>=k.lvl?'on':''}" style="--c:#${k.c.toString(16).padStart(6,'0')}">${lv.level>=k.lvl?'':'🔒 '}${k.n.split(' /')[0]} · Stufe ${k.lvl}</span>`).join('')}</div>`;
 $('achPanel').hidden=false;}
function refreshMenu(){const goldOk=store.get('gold',false),lv=progLevel();$('colors').querySelectorAll('button').forEach((b,i)=>{const k=KART_COLORS[i],locked=!!(k.gold&&!goldOk)||!!(k.lvl&&lv<k.lvl);b.classList.toggle('locked',locked);b.title=locked?(k.lvl?`Ab Fahrerstufe ${k.lvl}`:'Gewinne einen Grand Prix ab 100cc'):k.n;});setText('achBtnLvl','Stufe '+lv);
 const tro=[50,100,150].map(c=>{const t=store.get(`trophy-${c}`,9);return t<=3?`${['🏆','🥈','🥉'][t-1]} ${c}cc`:'';}).filter(Boolean).join('  ');const medals=courses.map((_,i)=>store.get(`medal-${i}`,3)),mc=[0,1,2].map(k=>medals.filter(x=>x===k).length);setText('trophies',[tro,mc.some(Boolean)?`🥇${mc[0]} 🥈${mc[1]} 🥉${mc[2]}`:''].filter(Boolean).join('   '));$('classes').classList.toggle('locked',mode==='tt');
 document.querySelectorAll('#classes .cls').forEach(b=>{const on=Number(b.dataset.cc)===cc;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('tracks').classList.toggle('locked',mode==='gp');
 // Medaille je Strecke auf die Karte
 $('tracks').querySelectorAll('.track').forEach((b,i)=>{const m=medals[i];b.dataset.medal=String(m);const em=b.querySelector('.medal');if(em)em.textContent=m<3?['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'][m]:'';});
 refreshBest();refreshDaily();}
KART_COLORS.forEach((k,i)=>{const b=document.createElement('button');b.className='swatch'+(i===0?' selected':'')+(k.gold?' gold':'');b.style.setProperty('--swatch','#'+k.c.toString(16).padStart(6,'0'));b.setAttribute('aria-label',k.n);b.setAttribute('aria-pressed',String(i===0));
 b.onclick=()=>{if(k.gold&&!store.get('gold',false)){toast('🔒 Gewinne einen Grand Prix ab 100cc',2,'bad');return;}if(k.lvl&&progLevel()<k.lvl){toast(`🔒 Ab Fahrerstufe ${k.lvl}`,2,'bad');return;}colorIndex=i;$('colors').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));});try{driverThumbs();}catch(e){}buildCourse();};$('colors').append(b);});
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
// Tages-Herausforderung (R46): Karte ueber dem Startknopf - antippen waehlt Strecke, Klasse und Modus
let dailyShown=null;const dailyBtn=document.createElement('button');dailyBtn.id='daily';dailyBtn.type='button';$('start').before(dailyBtn);
function refreshDaily(){const ch=dailyChallenge(dayKey()),done=store.get('dailyDone','')===ch.day,key=ch.day+done;if(dailyShown===key)return;dailyShown=key;
 dailyBtn.classList.toggle('done',done);dailyBtn.innerHTML=`<i>📅</i><span><small>TAGESAUFGABE${done?' · GESCHAFFT':''}</small><b>${ch.text}</b><em>${courses[ch.track].name} · ${ch.cc}cc${done?' · morgen gibt es eine neue':` · +${DAILY_XP} XP`}</em></span>${done?'<u>✓</u>':'<u>▶</u>'}`;}
dailyBtn.onclick=()=>{const ch=dailyChallenge(dayKey());if(mode!=='single')document.querySelector('#modes [data-mode="single"]').click();document.querySelector(`#classes [data-cc="${ch.cc}"]`)?.click();$('tracks').children[ch.track]?.click();toast('📅 Aufgabe gewählt – los geht\'s!',1.4,'good');};
courses.forEach((c,i)=>{const b=document.createElement('button'),th=THEMES[c.theme];b.className='track'+(i===0?' selected':'');
 const wide=courses.length%2===1&&i===courses.length-1;   // letzte Karte einer ungeraden Anzahl geht ueber die ganze Breite
 b.innerHTML=`<canvas width="${wide?520:240}" height="${wide?150:126}"></canvas><i>${c.icon}</i><em class="medal"></em><b>${c.name.replace('Regenbogenpiste','Regenbogen&shy;piste')}</b><u class="kind">${c.kind}</u><span class="best"></span>`;
 b.style.setProperty('--c1',hex(th.skyBottom));b.style.setProperty('--c2',hex(th.road));b.style.setProperty('--acc',th.curbA);
 b.title=c.kind;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{if(mode==='gp')return;selected=i;syncTrackButtons();buildCourse();};
 $('tracks').append(b);try{trackThumb(b.querySelector('canvas'),c);}catch(e){}});
{const pb=$('owPortal');if(pb)pb.onclick=()=>{if(owPortalAt)owEnterTrack(owPortalAt.ti);};}
{const ab=$('achBtn');if(ab)ab.onclick=()=>{SFX.pickup();openAchievements();};const ac=$('achClose');if(ac)ac.onclick=()=>{$('achPanel').hidden=true;};}
{const box=$('assist');if(box)[[true,'An'],[false,'Aus']].forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.className=v===assistOn?'selected':'';b.setAttribute('aria-pressed',String(v===assistOn));
 b.onclick=()=>{assistOn=v;store.set('assist',v);box.querySelectorAll('button').forEach((x,j)=>{const on=j===(v?0:1);x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});toast('Lenkhilfe: '+n,1.1);};box.append(b);});}
{const box=$('gfx');if(box)Object.keys(GFX).forEach(k=>{const b=document.createElement('button');b.textContent=GFX[k].n;b.className=k===gfxMode?'selected':'';
 b.setAttribute('aria-pressed',String(k===gfxMode));
 b.onclick=()=>{if(liteFor(k)!==LITE&&!TEST){store.set('gfx',k);toast('Grafik: '+GFX[k].n+' – lädt neu …',1.2);setTimeout(()=>location.reload(),500);return;}gfxMode=k;store.set('gfx',k);box.querySelectorAll('button').forEach((x,j)=>{const on=Object.keys(GFX)[j]===k;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});applyGfx();toast('Grafik: '+GFX[k].n,1.1);};
 box.append(b);});}
DRIVERS.forEach((d,i)=>{const b=document.createElement('button');b.className=i===driverIndex?'selected':'';b.innerHTML=d.i;b.title=d.n+' \u00b7 '+d.kart+': '+d.tip;
 b.setAttribute('aria-label','Fahrer: '+d.n);b.setAttribute('aria-pressed',String(i===driverIndex));
 b.onclick=()=>{driverIndex=i;store.set('driver',i);$('drivers').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));});toast(d.n+' \u00b7 '+d.kart+' ('+d.tip+')',1.6);buildCourse();};
 $('drivers').append(b);});
document.querySelectorAll('#modes .mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('#modes .mode').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});$('tracks').classList.toggle('locked',mode==='gp'||mode==='world');$('classes').classList.toggle('locked',mode==='world');
 if(mode==='world'){if(selected!==WORLD_IDX){lastRaceSel=selected;selected=WORLD_IDX;buildCourse();}}else if(selected===WORLD_IDX){selected=lastRaceSel;syncTrackButtons();buildCourse();}
 if(mode==='gp'&&selected!==0){selected=0;syncTrackButtons();buildCourse();}refreshMenu();});
document.querySelectorAll('#classes .cls').forEach(b=>b.onclick=()=>{cc=Number(b.dataset.cc);store.set('class',cc);refreshMenu();});
$('start').onclick=()=>{gp=mode==='gp'?{active:true,race:0,points:{}}:{active:false,race:0,points:{}};start();};
$('again').onclick=nextAfterResult;$('home').onclick=home;$('quit').onclick=home;$('pause').onclick=pause;$('resume').onclick=pause;$('sound').onclick=setSound;
$('cerAgain').onclick=()=>{gp={active:true,race:0,points:{}};start();};$('cerHome').onclick=home;
$('item').onclick=use;$('titem').onpointerdown=e=>{e.preventDefault();use();};
addEventListener('keydown',e=>{if(e.code==='Enter'&&worldMode&&owPortalAt&&state==='race'){owEnterTrack(owPortalAt.ti);return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(e.code==='Space')use();if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='KeyR'&&state==='race'){racers[0].safeD=lapDist(racers[0].distance);respawn(racers[0]);}if(e.code==='Enter'&&state==='menu')$('start').click();}});
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
// Nach dem Drehen melden manche Browser die neue Groesse erst spaeter: zweimal nachmessen, Seite nie verschoben lassen
function onRotate(){for(const ms of [150,500])setTimeout(()=>{scrollTo(0,0);fixZoom();enterFs();armFs();resize();ohSync();},ms);}
// Blieb der Browser nach dem Drehen trotzdem gezoomt, setzt ein neu geschriebenes Viewport-Tag den Massstab auf 1 zurueck
function fixZoom(){const m=document.querySelector('meta[name=viewport]'),vv=window.visualViewport;if(!m||!vv||Math.abs(vv.scale-1)<.02)return;const c=m.content;m.content=c.replace('initial-scale=1','initial-scale=1.0001');requestAnimationFrame(()=>{m.content=c;});}
visualViewport?.addEventListener?.('resize',()=>{if(visualViewport.scale>1.01||visualViewport.scale<.99||scrollX||scrollY)scrollTo(0,0);resize();});
addEventListener('orientationchange',onRotate);screen.orientation?.addEventListener?.('change',onRotate);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)armFs();setTimeout(resize,80);});
$('full').onclick=()=>{if(document.fullscreenElement){wantFs=false;document.exitFullscreen().catch(()=>{});}else{wantFs=true;enterFs();}};
const autoButton=document.createElement('button');autoButton.id='autoGas';
function setAutoGas(v){autoGas=v;store.set('autogas',v);document.body.classList.toggle('autogas',v);for(const b of [autoButton,$('pauseAutoGas')]){if(!b)continue;b.textContent='Auto-Gas: '+(v?'AN':'AUS');b.setAttribute('aria-pressed',String(v));}}
// Ein-Hand-Steuerung: Wischflaeche ueber dem Spielbild (unter Kopfzeile und Item-Blase), nur hochkant auf Touch
const ohPad=$('ohPad'),ohStick=$('ohStick'),ohKnob=ohStick.firstElementChild,ctrlButton=document.createElement('button');ctrlButton.id='ctrlMode';
const ohRadius=()=>clamp(innerWidth*.15,44,80);
function ohRelease(){oh.id=null;oh.steer=0;oh.drift=false;oh.full=0;oh.taps.clear();ohStick.classList.remove('on');}
let ohPref=store.get('onehand',true);
function ohSync(){const pref=ohPref,on=coarseInput&&pref&&innerHeight>innerWidth;if(on!==oh.on){oh.on=on;if(!on)ohRelease();}
 document.body.classList.toggle('onehand',on);
 for(const b of [ctrlButton,$('pauseCtrl')]){if(!b)continue;b.hidden=!coarseInput;b.textContent='Hochkant: '+(pref?'Ein-Hand':'Knöpfe');b.setAttribute('aria-pressed',String(pref));}}
function ohDraw(x,y){const R=ohRadius(),dx=clamp(x-oh.ax,-R,R);ohStick.style.transform=`translate(${oh.ax}px,${y}px)`;ohStick.style.setProperty('--r',R+'px');ohKnob.style.transform=`translateX(${dx}px)`;}
// Zeiten aus dem Ereignis-Zeitstempel (Beruehrung selbst), nicht aus dem Handler-Aufruf: ruckelt ein Bild, kaemen
// Aufsetzen und Loslassen sonst verspaetet an und ein kurzes Tippen zaehlte nicht als Hops
const evT=e=>e.timeStamp>0?e.timeStamp:performance.now();
ohPad.addEventListener('pointerdown',e=>{e.preventDefault();try{ohPad.setPointerCapture(e.pointerId);}catch{}const now=evT(e);
 if(oh.id!==null){oh.taps.set(e.pointerId,{x:e.clientX,y:e.clientY,t:now});return;}
 Object.assign(oh,{id:e.pointerId,x0:e.clientX,y0:e.clientY,ax:e.clientX,t0:now,moved:0,steer:0,full:0,item:false});ohStick.classList.add('on');ohDraw(e.clientX,e.clientY);});
ohPad.addEventListener('pointermove',e=>{if(e.pointerId!==oh.id)return;const R=ohRadius(),x=e.clientX,y=e.clientY;
 // Nullpunkt folgt dem Finger, sobald er ueber den vollen Ausschlag hinaus wischt: Gegenlenken wirkt sofort
 if(x-oh.ax>R)oh.ax=x-R;else if(oh.ax-x>R)oh.ax=x+R;
 oh.moved=Math.max(oh.moved,Math.hypot(x-oh.x0,y-oh.y0));const d=(x-oh.ax)/R,a=Math.abs(d);oh.steer=a<.08?0:-Math.sign(d)*Math.min(1,(a-.08)/.84);
 const up=oh.y0-y;if(!oh.item&&evT(e)-oh.t0<600&&up>54&&Math.abs(x-oh.x0)<up*.7){oh.item=true;use();}
 ohDraw(x,oh.y0);},{passive:true});
function ohUp(e){const now=evT(e);
 if(e.pointerId===oh.id){const tap=!oh.item&&now-oh.t0<280&&oh.moved<16;ohRelease();if(tap&&e.type==='pointerup')oh.hop=1;return;}
 const t=oh.taps.get(e.pointerId);if(t){oh.taps.delete(e.pointerId);if(e.type==='pointerup'&&now-t.t<280&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<16)oh.hop=1;}}
ohPad.addEventListener('pointerup',ohUp);ohPad.addEventListener('pointercancel',ohUp);ohPad.oncontextmenu=e=>e.preventDefault();
// Flaeche verschwindet mit dem Finger drauf (Ziel, Pause): kein Finger darf "kleben" bleiben
ohPad.addEventListener('lostpointercapture',e=>{if(e.pointerId===oh.id)ohRelease();else oh.taps.delete(e.pointerId);});
addEventListener('blur',ohRelease);addEventListener('resize',ohSync);
ctrlButton.onclick=$('pauseCtrl').onclick=()=>{ohPref=!ohPref;store.set('onehand',ohPref);ohSync();};
autoButton.onclick=()=>setAutoGas(!autoGas);document.querySelector('.controls').after(autoButton,ctrlButton);ohSync();if($('pauseAutoGas'))$('pauseAutoGas').onclick=()=>setAutoGas(!autoGas);if(store.get('autogasV',0)<44){store.set('autogas',false);store.set('autogasV',44);}setAutoGas(store.get('autogas',false));

// ---------------------------------------------------------------- Laden & Start
const protoRecovery=createPrototypeRecovery(PROTO_FILES,P,()=>{
 // Auch im Menue vorgebaute Strecken enthalten sonst dauerhaft die alten Fallbacks.
 for(const i of [...worldCache.keys()])if(i!==builtSel)disposeCourse(i);
 if(state==='menu')buildCourse(true);else worldDirty=true;
});
const protoAll=Promise.all(PROTO_FILES.map(loadProto));
protoAll.then(()=>{protoRecovery.settle();
 try{buildItemThumbs();}catch(e){console.error('itemThumbs',e);}try{driverThumbs();}catch(e){console.error('driverThumbs',e);}});
Promise.race([protoAll,new Promise(r=>setTimeout(r,9000))]).finally(()=>{protoRecovery.snapshot();try{applyGfx();}catch(e){}buildCourse();resize();refreshMenu();try{driverThumbs();}catch(e){}try{buildItemThumbs();}catch(e){console.error('itemThumbs0',e);}readyPromise.then(()=>{updateCamera(1/60,true);try{renderer.render(scene,camera);}catch(e){}
 requestAnimationFrame(()=>{playBgm('menu');const l=$('loader');l.classList.add('done');setTimeout(()=>l.hidden=true,600);requestAnimationFrame(loop);setInterval(prebuildTick,900);
  // Grossbauten nachladen und die betroffenen Strecken neu bauen lassen
  Promise.all(LATE_FILES.map(loadProto)).then(()=>{for(let i=0;i<courses.length;i++){const hzC=courses[i].stampers||courses[i].pipes||courses[i].cannons||courses[i].landmarks||courses[i].train||courses[i].towers||courses[i].cows||courses[i].beatgates||courses[i].hands||courses[i].lowgrav||courses[i].meteors||courses[i].theme==='lava'||courses[i].theme==='forest';if(!hzC&&courses[i].mansion===undefined&&courses[i].castle===undefined&&!(courses[i].builds||[]).length&&!(courses[i].coaster||[]).length)continue;if(i===builtSel){if(state==='menu')buildCourse(true);else worldDirty=true;}else disposeCourse(i);}});});});});

// Testschnittstelle nur mit ?test=1
if(TEST){window.rallyTest={start,home,use,pause,say,ceremony,hud,oh:()=>({...oh,taps:oh.taps.size}),dizzy:()=>{const m=new T.Matrix4(),out=[];for(let i=0;i<6;i++){dizzyMesh.getMatrixAt(i,m);out.push(new T.Vector3().setFromMatrixPosition(m).toArray().map(v=>+v.toFixed(1)));}return {out,cam:camera.position.toArray().map(v=>+v.toFixed(1)),p:racers[0].mesh.position.toArray().map(v=>+v.toFixed(1))};},star:()=>({playing:!!starSrc,loaded:!!clipBuf.s_c_star,dur:clipBuf.s_c_star?.duration,duck:+duckLevel.toFixed(2)}),
 windringInfo:()=>rings.filter(r=>!r.ag).map(r=>({d:r.d,off:r.off,y:r.y,asset:!!P.windring,materials:r.glow?.length||0,precision:r.precision})),
 gliderState:()=>racers.map(r=>({id:r.id,armed:!!r.glideArmed,gliding:!!r.gliding,open:r.gliderOpen||0,visible:!!r.mesh.userData.glider?.visible,asset:!!P.glider})),
 gliderPose:(phase='flight')=>{if(!racers.length)return null;const r=racers[0],rp=ramps.find(q=>!q.gap&&!hasRoll(q.end+7))||ramps[0],d=rp?rp.end+7:20,off=rp?.off||0,s=sample(d,off),gy=groundAt(d,off).y;r.distance=d;r.offset=off;r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.speed=28;r.vx=Math.sin(r.h)*28;r.vz=Math.cos(r.h)*28;r.y=gy+(phase==='ground'?0:3.4);r.vy=-2;r.air=phase!=='ground';r.airT=.35;r.stun=0;r.trick=0;r.finishTime=null;r.steerS=.3;r.lastGround=gy;resetGlider(r,true);armGlider(r,phase==='respawn'?'respawn':'ramp');state='inspect';for(let i=0;i<40;i++)syncKart(r,1/60);syncKartInstances();updateCamera(1/60,true);hud();renderer.render(scene,camera);return window.rallyTest.gliderState()[0];},next:nextAfterResult,track:d=>({...trackAt(d),x:sample(d).p.x,z:sample(d).p.z}),zones:()=>zones,cp:v=>cpDist(v),
 setMode:m=>document.querySelector(`#modes [data-mode="${m}"]`).click(),setClass:c=>{cc=c;refreshMenu();},setTrack:i=>{selected=i;syncTrackButtons();buildCourse();},posAt:(d,off=0,h=0)=>posAt(d,off,h,new T.Vector3()).toArray().map(v=>+v.toFixed(2)),ow:()=>owFx?{world:worldMode,total:owFx.total,done:owFx.done,switches:owFx.switches.map(s=>({id:s.id,d:Math.round(s.d),state:s.m.state,got:s.m.got})),slaloms:owFx.slaloms.map(s=>({id:s.m.id,gates:s.m.gates.length,next:s.m.next,state:s.m.state})),rings:owFx.ringMs.map(r=>({id:r.m.id,n:r.m.count,got:r.m.got.size,state:r.m.state})),portals:owFx.portals.map(p=>[Math.round(p.d),p.ti]),portalAt:owPortalAt}:null,
 loopDbg:()=>loopMiss.slice(-12),assist:v=>{if(v!==undefined)assistOn=!!v;return assistOn;},trk:d=>{const t=trackAt(d);return [+t.kap.toFixed(4),+t.v.toFixed(1),+t.vd.toFixed(1),+t.h.toFixed(2)];},obsNear:(x,z,R=15)=>{const out=[];for(const c of obsGrid.values())for(const o of c)if(Math.hypot(o.x-x,o.z-z)<R+o.r)out.push([+o.x.toFixed(1),+o.z.toFixed(1),+o.r.toFixed(1),o.h]);return out;},phys:()=>{const r=racers[0];return {d:r.distance,off:r.offset,y:r.y,ref:roadRef(r.distance,r.offset),g:groundAt(r.distance,r.offset).y,air:r.air,vy:r.vy,sp:r.speed,mag:hasMag(r.distance)};},elems:()=>elems.map(z=>({s:Math.round(z.s),span:Math.round(z.span),kind:z.kind,water:+z.water.toFixed(2),ok:z.plan.ok,pieces:z.plan.pieces.map(q=>q.type+':'+Math.round(q.x0)),hidden:z.hidden.map(h=>h.map(Math.round))})),tf:()=>racers.map(r=>r.mesh.userData.tf?.cur||null),uw:()=>elemFx?elemFx.uw:null,loopClear:(step=.2,far=30)=>loops.map(q=>{const pts=[];let sl=0,pv=null;
  for(let x=0;x<=q.span;x+=step){const c=posAt(q.s+x,0,0,new T.Vector3());if(pv)sl+=c.distanceTo(pv);pv=c;for(const o of [-LOOP.half,0,LOOP.half])pts.push([posAt(q.s+x,o,0,new T.Vector3()),sl]);}
  let m=1e9;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){if(Math.abs(pts[i][1]-pts[j][1])<far)continue;const dd=pts[i][0].distanceTo(pts[j][0]);if(dd<m)m=dd;}
  return {s:Math.round(q.s),span:Math.round(q.span),n:q.n,R:+q.R.toFixed(1),style:q.style,len:Math.round(sl),min:+m.toFixed(2)};}),
 autopilot:v=>{autopilot=v;},finishNow:()=>{racers[0].distance=length*LAPS+1;finish(racers[0],length,elapsed);end();},
 state:()=>({state,length,mode,cc,gp,stats,racers:racers.map(({mesh,...r})=>r)}),setItem:item=>{racers[0].item=item;racers[0].charges=item==='triple'?3:0;},
 perf:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,dpr:renderer.getPixelRatio(),qualityLevel:quality.level}),
 bgm:()=>({ready:bgm.ready,failed:bgm.failed,playing:bgm.current,rate:bgm.rate}),
 chr:()=>chr&&{cows:chr.cows.map(c=>[Math.round(c.x),Math.round(c.z),Math.round(c.d)]),gates:chr.gates.map(g=>Math.round(g.d)),hands:chr.hands.map(h=>[Math.round(h.x),Math.round(h.z),+h.up.toFixed(2),Math.round(h.d)]),mets:chr.mets.map(m=>[Math.round(m.x),Math.round(m.z),Math.round(m.d)])},desert:()=>desert&&{tw:desert.twisters.map(q=>[Math.round(q.x),Math.round(q.z),Math.round(q.dd||q.d)]),pits:desert.pits.map(q=>[Math.round(q.x),Math.round(q.z),q.r,Math.round(q.d)])},train:()=>trainFx&&{len:Math.round(trainFx.len),cross:trainFx.crossings.map(c=>Math.round(c.d)),loco:[+trainFx.cars[0].x.toFixed(1),+trainFx.cars[0].z.toFixed(1)]},lm:()=>!!P.landmarks,hz:()=>hz&&{stampers:hz.stampers.map(q=>[Math.round(q.d),q.off,q.g.position.toArray().map(v=>+v.toFixed(1))]),plants:hz.plants.map(q=>[Math.round(q.d),q.side,+q.x.toFixed(1),+q.y.toFixed(1),+q.z.toFixed(1)]),cannons:hz.cannons.map(q=>[Math.round(q.d),q.g.position.toArray().map(v=>+v.toFixed(1))]),missiles:hz.missiles.length,statues:swingers.filter(q=>q.statue).map(q=>q.statue.position.toArray().map(v=>+v.toFixed(1))),loaded:!!P.hazards},jumps:()=>({ramps:ramps.map(r=>[+r.start.toFixed(1),+r.end.toFixed(1),r.gap?1:0,+r.off.toFixed(1)]),gaps:gaps.map(g=>[+g.start.toFixed(1),+g.end.toFixed(1)]),length}),items:()=>({hazards:hazards.length,shots:shots.length,ramps:ramps.length,pads:pads.length,rings:rings.length,spores:spores.length,swingers:swingers.length,gaps:gaps.length,obstacles:[...obsGrid.values()].reduce((a,c)=>a+c.length,0),crowd:crowd?crowd.fans.length:0,protos:Object.fromEntries(PROTO_FILES.map(n=>[n,!!P[n]]))}),
 saveGhost:()=>{try{localStorage.setItem('mr-ghost-'+selected,JSON.stringify({...rec,next:undefined,color:0xffffff}));}catch{}return rec&&rec.x.length;},ghost:()=>ghost&&{n:ghost.data.x.length,dist:ghost.dist,visible:ghost.mesh.visible},medalOf:t=>medalOf(t),aiUse:(id,item)=>{racers[id].item=item;return useItem(racers[id]);},racers:()=>racers,world:()=>({ramps,pads,rings,spores,gaps,swingers}),keys,
 loops:()=>loops.map(q=>({...q,s:Math.round(q.s),span:Math.round(q.span),R:Math.round(q.R)})),
 coasters:()=>coasters.map(c=>({s:Math.round(c.s),span:Math.round(c.span),kind:c.spec.kind,launch:c.spec.launch.map(Math.round),hills:c.spec.hills.map(q=>({c:Math.round(q.c),w:Math.round(q.w),h:+q.h.toFixed(1)})),arches:c.archX.map(Math.round),assets:{arch:!!P.magnetarch,truss:!!P.coastertruss},glow:!!coasterGlow})),
 // Videoaufnahme (R38): Bilder im festen Takt selbst weiterschalten (rAF-Schleife ruht bei dbg.manual)
 step:(n=2,dt=1/60)=>{for(let i=0;i<n-1;i++){update(dt);animateWorld(dt,performance.now());}frameStep(dt,performance.now());},
 audio:()=>{armAudio();audioInit();return {ctx,masterGain};},
 coasterH:d=>coasterH(d),ridePhoto:()=>ridePhoto?ridePhoto.length:0,ridePhotoURL:()=>ridePhoto,coasterRun:()=>racers.map(r=>({id:r.id,run:r.czRun?{arch:r.czRun.arch,air:r.czRun.airHills,maxOff:+r.czRun.maxOff.toFixed(2),launched:r.czRun.launched}:null,g:r.czG,float:r.czFloat,vis:r.czVis,speed:r.speed})),
 // Standbild an beliebiger Stelle: Spieler auf Streckenmeter d setzen, Kamera einrasten, rendern
 pose:(d,off=0,speed=30,frames=40)=>{if(!racers.length)return null;const r=racers[0],s=sample(d,off),gy=groundAt(d,off).y;r.distance=d;r.offset=off;r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.speed=speed;r.vx=Math.sin(r.h)*speed;r.vz=Math.cos(r.h)*speed;r.y=gy;r.vy=0;r.air=false;r.airT=0;r.stun=0;r.trick=0;r.finishTime=null;r.lastGround=gy;
  const cz=coasterAt(d);if(cz){r.czRun=null;coasterRide(r,cz,false);}else{r.czFloat=0;r.czVis=1;}
  state='inspect';for(let i=0;i<frames;i++){syncKart(r,1/60);updateCamera(1/60,i===0);animateWorld(1/60,performance.now());}syncKartInstances();hud();renderer.render(scene,camera);return {d,y:r.mesh.position.y,g:r.czG,float:r.czFloat};},
 // Blick von oben auf die Strecke (Layout-Pruefung)
 topView:(cx=0,cz=0,h=420,fov=50)=>{state='inspect';camera.up.set(0,0,-1);camera.position.set(cx,h,cz);camera.lookAt(cx,0,cz);camera.fov=fov;camera.updateProjectionMatrix();renderer.render(scene,camera);camera.up.set(0,1,0);return true;},
 shot:(x,y,z,lx,ly,lz,fov=55)=>{state='inspect';camera.up.set(0,1,0);camera.position.set(x,y,z);camera.lookAt(lx,ly,lz);camera.fov=fov;camera.updateProjectionMatrix();animateWorld(1/60,performance.now());renderer.render(scene,camera);return true;},
 thumbs:()=>({items:Object.keys(itemThumbs),drivers:document.querySelectorAll('#drivers canvas').length}),
 dbg,gfx:m=>{if(m){gfxMode=m;applyGfx();}return {gfxMode,level:quality.level,dpr:renderer.getPixelRatio(),shadowEvery,shadows:renderer.shadowMap.enabled};},bprof:()=>bprof.slice(),three:()=>({renderer,scene,camera,sun,world,actors,headlight,T}),prof:()=>{const r=Object.fromEntries(Object.entries(prof).map(([k,v])=>[k,k==='n'?v:+(v/Math.max(1,prof.n)).toFixed(2)]));for(const k in prof)prof[k]=0;return r;},bench:(n=120)=>{const gl=renderer.getContext();let cpu=0,gpu=0,worst=0;for(let i=0;i<n;i++){const a=performance.now();frameStep(1/60,a);const b=performance.now();gl.finish();const c=performance.now();cpu+=b-a;gpu+=c-b;worst=Math.max(worst,c-a);}
  return {cpuMs:+(cpu/n).toFixed(2),finishMs:+(gpu/n).toFixed(2),worstMs:+worst.toFixed(1),calls:renderer.info.render.calls,tris:renderer.info.render.triangles,programs:renderer.info.programs.length,geos:renderer.info.memory.geometries};},
 ready:()=>readyPromise.then(()=>new Promise(res=>{const c=()=>revealQueue?setTimeout(c,30):res(worldReady);c();})),forkTest:(a,b,k)=>{const f=computeFork(a,b,k);return {maxOff:+f.maxOff.toFixed(1),minR:Math.round(f.minR),saved:Math.round(f.span-f.len),span:Math.round(f.span),back:f.pts.filter((p,i)=>i&&p.rel<f.pts[i-1].rel-.3).length,jump:Math.round(Math.max(...f.pts.map((p,i)=>i?p.rel-f.pts[i-1].rel:0)))};},prebuild:i=>{const a=performance.now();prebuild(i);return Math.round(performance.now()-a);},cache:()=>[...worldCache.keys()],
 forks:()=>forks.map(f=>({dA:Math.round(f.dA),span:Math.round(f.span),maxOff:+f.maxOff.toFixed(1),minR:Math.round(f.minR),len:Math.round(f.len),main:Math.round(f.span)})),rails:()=>rails.map(r=>[Math.round(r.d0),Math.round(r.d1),r.side,r.kind]),
 minRadius:()=>{let m=1e9,at=0;for(let i=0;i<PS;i++){const r=1/Math.max(1e-4,Math.abs(TP.k[i]));if(r<m){m=r;at=i*length/PS;}}return {r:+m.toFixed(1),at:Math.round(at),length:Math.round(length)};},timeStart:()=>{const a=performance.now();start();const b=performance.now();const gl=renderer.getContext();renderer.render(scene,camera);gl.finish();return {startMs:+(b-a).toFixed(1),firstFrameMs:+(performance.now()-b).toFixed(1)};},
 tick:(n=60,dt=1/60)=>{for(let i=0;i<n;i++){update(dt);animateWorld(dt,performance.now());updateCamera(dt);}duckBgm(performance.now());renderer.render(scene,camera);if(photoPending)takeRidePhoto();return {state,elapsed:+elapsed.toFixed(2),place:ranking(racers).indexOf(racers[0])+1};}};
 const panel=document.createElement('aside');panel.id='testPanel';panel.style.cssText='position:fixed;bottom:0;left:35%;z-index:30;background:#111;padding:10px;display:flex;gap:8px';
 for(const [text,action] of [['Test: Turbo',()=>{window.rallyTest.setItem('boost');state='race';use();}],['Test: Ziel',()=>{state='race';window.rallyTest.finishNow();}]]){const b=document.createElement('button');b.textContent=text;b.style.cssText='color:#fff;background:#345;padding:10px';b.onclick=action;panel.append(b);}document.body.append(panel);}
