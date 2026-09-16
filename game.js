import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {racer,driveKart,turnCurve,advanceProgress,hitKart,collideKarts,maxCornerSpeed,angleDiff,lap,finish,ranking,activate,clamp,LAPS,rollItem,loseSpores,addGpPoints,gpStandings,raceStars,GP_POINTS,MAX_SPORES,PHYS,CLASSES} from './core.mjs';

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
  caps:[0xff7a2f,0xffc03a,0xd9482b],leaves:[0x5f8f3a,0x7aa84a],hills:[0xb4532e,0xc8683a],clouds:false,balloons:2,stars:false},
 haunted:{skyTop:0x07050f,skyBottom:0x3a2d5c,fog:0x2a2342,fogNear:90,fogFar:380,exposure:1.42,hemiSky:0x9a8cff,hemiGround:0x1a1426,hemiInt:1.25,sunCol:0xc9d6ff,sunInt:1.8,sunPos:[-70,130,90],fillCol:0x7dff9a,fillInt:.4,
  grass:0x2a3526,grassSpot:0x3f4d33,skirt:0x1f2419,road:0x3a3442,roadSpot:0x4f4858,edge:0x8f86a3,curbA:'#8a5cff',curbB:'#1a1426',line:'#9dff7a',glow:1,sea:0x1b1433,foam:0x9dff7a,
  caps:[0x8a5cff,0x9dff7a,0xff8a3d],leaves:[0x3a2d4a,0x2e2a3a,0x4a3550],hills:[0x1d1830,0x261f3a],clouds:false,balloons:0,stars:true},
 night:{skyTop:0x05041a,skyBottom:0x2f1c66,fog:0x1f1650,fogNear:140,fogFar:430,exposure:1.4,hemiSky:0x7a7aff,hemiGround:0x0c0c28,hemiInt:1.15,sunCol:0xa8bfff,sunInt:1.5,sunPos:[80,140,-60],fillCol:0xff4fb8,fillInt:.35,
  grass:0x12344a,grassSpot:0x1d5070,skirt:0x0d2638,road:0x16142b,roadSpot:0x29254d,edge:0x2de2e6,curbA:'#2de2e6',curbB:'#ff3cac',line:'#ff3cac',glow:1,sea:0x0a1c3c,foam:0x6fe8ff,
  caps:[0xff3cac,0x2de2e6,0xfff05a,0x9d6bff],leaves:[0x1f6a64,0x2a4f8a],hills:[0x1c2a5a,0x2a1f5c],clouds:false,balloons:0,stars:true}};
// Positionen der Features in Kontrollpunkt-Koordinaten: 2.5 = zwischen Punkt 2 und 3 auf halber Strecke.
// hills [cp, Hoehe, Breite als Rundenanteil], ramps [cp, Querversatz, Breite], pads [cp, Querversatz], boost [cp], boxes [cp],
// stands [cp, Querversatz], plateau [cpStart, cpEnde, Hoehe, Rampenlaenge m], gap [cp, Laenge m], swing [cp, Amplitude, Tempo, Phase].
const courses=[
 {name:'Pilz-Promenade',icon:'✿',kind:'Einsteiger · flüssig',medals:[76,82,92],music:'race',theme:'forest',seed:7,
  points:[[0,70],[60,72],[100,45],[95,5],[60,-10],[70,-55],[30,-85],[-25,-70],[-40,-30],[-85,-45],[-110,-5],[-95,45],[-45,60]],
  hills:[[2.5,5,.05],[6.6,6,.05],[10.5,7,.06]],ramps:[[4.5,0,9],[9.5,-2,8],[12.3,2,7]],pads:[[3.4,-4],[7.5,4],[11.3,0]],
  boost:[1.5,6.2,10.2],boxes:[1.0,3.9,5.9,8.4,11.0],stands:[[.25,18],[7.0,-19]]},
 {name:'Sonnen-Canyon',icon:'☀',kind:'Schnell · Schluchtsprung',medals:[92,99,111],music:'sunset',theme:'canyon',seed:23,
  points:[[0,78],[95,78],[125,45],[120,-20],[85,-45],[105,-88],[50,-102],[-10,-60],[-60,-98],[-115,-72],[-122,0],[-105,55],[-55,80]],
  hills:[[1.5,4,.03],[4.5,6,.04],[7.5,5,.04]],plateau:[9.45,11.7,7,34],gap:[10.5,14],ramps:[[3.3,0,9],[6.5,3,7]],pads:[[2.4,-4],[8.4,4]],
  boost:[.5,5.2,12.2],boxes:[1.0,4.0,7.0,9.1,12.6],stands:[[.3,-18],[5.6,19]]},
 {name:'Neon-Pilzwald',icon:'✦',kind:'Technisch · Drift',medals:[102,110,123],music:'night',theme:'night',seed:41,
  points:[[0,70],[50,75],[80,50],[55,25],[85,0],[95,-45],[55,-60],[30,-35],[0,-60],[-30,-95],[-80,-80],[-70,-40],[-105,-10],[-95,40],[-60,35],[-40,65]],
  hills:[[5.5,4,.03],[10.5,5,.035]],ramps:[[8.5,0,8],[14.5,-2,7]],pads:[[4.4,3],[12.4,-3]],
  boost:[.6,6.3,11.6],swing:[[2.5,5,1.3,0],[7.4,5,1.1,1.5],[13.1,5,1.4,3]],boxes:[1.3,3.6,6.9,9.8,13.8],stands:[[.25,18],[9.2,-19]]},
 {name:'Geisterhaus',icon:'👻',kind:'Spuk · Villa & Geister',medals:[90,97,108],music:'night',bgmRate:.9,theme:'haunted',seed:66,
  points:[[0,70],[55,78],[95,55],[105,10],[80,-20],[100,-60],[70,-95],[20,-90],[-30,-90],[-75,-95],[-112,-55],[-100,-18],[-88,10],[-102,38],[-80,70],[-40,76]],
  hills:[[3.5,4,.03],[13.6,5,.03]],mansion:7.8,ramps:[[2.4,0,9],[11.5,0,8]],pads:[[4.6,3],[14.6,-3]],
  boost:[.5,6,12.5],ghosts:[[1.6,5.5,.9,0],[5.3,5.5,1.1,2],[7.5,4.2,1,.5],[10.4,5.5,.8,4],[12.9,5.5,1.2,1]],boxes:[1.2,4.1,9.6,13.9],stands:[[.3,-19],[13.2,19]]}];
const KART_COLORS=[{c:0xed6350,n:'Ruby / Rot'},{c:0xffc74a,n:'Sunny / Gelb'},{c:0x55bdb2,n:'Mint / Türkis'},{c:0xa688dc,n:'Nova / Violett'},{c:0xffc93c,n:'Goldpilz',gold:true}];
const AI_NAMES=['Du','Peachy','Bramble','Pip','Luna','Mochi','Sunny','Nori'],AI_COLORS=[0xffb7c1,0x96b464,0xf7c055,0x918ed1,0x78c7d1,0xec9160,0x549a91];
const TRACK_SCALE=1.35,ROAD_HALF=7.6,G=30,G_STICK=74,RAMP_LEN=6.2,RAMP_H=1.15,FAN_COLS=[0xed6350,0xffd45c,0x55bdb2,0xa688dc,0xf1b35a,0xef7160],PLAYER_SLOT=5;
const ITEM_ICONS={boost:'⚡',triple:'⚡',shell:'◉',banana:'🍌',shield:'★'},ITEM_NAMES={boost:'TURBO',triple:'DREIFACH-TURBO',shell:'SUCH-PANZER',banana:'BANANE',shield:'STERNENSCHILD'};
const MT_COLORS={mini:0x5ad0ff,super:0xffa531,ultra:0xd36bff},MT_LABEL={mini:'MINI-TURBO',super:'SUPER-TURBO',ultra:'ULTRA-TURBO'};

let selected=0,colorIndex=0,mode='single',cc=store.get('class',100),state='menu',elapsed=0,countdown=3,last=0,curve,length=1,course,theme,ctx,frame=0,noticeTimer=0,toastTimer=0;
let boxes=[],racers=[],hazards=[],flags=[],balloons=[],puffs=[],shots=[],ramps=[],pads=[],rings=[],spores=[],swingers=[],gaps=[],boostPads=[],sporeMesh=null,crowd=null,boostTex=null,foamRing=null,fireflies=null;
let mapInfo={cx:0,cz:0,k:.6},shake=0,lastPlace=8,leadAt=-99,finishMusicAt=0,soundOn=true,autoGas=false,startPress=-1,prevDrift=false,roulette=null,camFov=62,camH=0,cer=null,wrongT=0,autopilot=false;
let gp={active:false,race:0,points:{}},stats=null,startLights=[],lightState=-1,chevrons=[];
function setLights(n){if(n===lightState||!startLights.length)return;lightState=n;startLights.forEach((m,i)=>{const on=n===4||i<n;m.emissive.setHex(!on?0x000000:n===4?0x3dff6a:0xff2a1f);m.color.setHex(!on?0x220808:n===4?0x2bd653:0xff3b2f);m.emissiveIntensity=on?2.4:0;});}
const obsGrid=new Map();let zones=[],bats=null;
const inZone=(d,pad=0)=>zones.some(z=>Math.abs(wrapDiff(d,z.d))<z.half+pad);
const coarseInput=matchMedia('(pointer:coarse)').matches,quality={level:0,dprCap:coarseInput?1.25:1.6,fpsFrames:0,fpsStart:0};

// ---------------------------------------------------------------- Renderer & Szene
let renderer;try{renderer=new T.WebGLRenderer({canvas:$('game'),antialias:!coarseInput});}catch(e){$('error').hidden=false;$('error').textContent='Dein Browser benötigt WebGL für dieses 3D-Spiel. Bitte Hardwarebeschleunigung aktivieren und die Seite neu laden.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.25,900),world=new T.Group(),actors=new T.Group();scene.add(world,actors);
const hemi=new T.HemisphereLight(0xffffff,0x587540,2);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff7db,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-190,right:190,top:190,bottom:-190,far:520});sun.shadow.bias=-.0006;scene.add(sun,sun.target);
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
const flameGeo=new T.ConeGeometry(.28,1.3,8);flameGeo.rotateX(-Math.PI/2);flameGeo.translate(0,0,-.65);
const persistentMats=new Set([cream,dark,white,gold,shieldMat,flameMat]);

// ---------------------------------------------------------------- GLB-Prototypen (Blender-MCP)
const sharedGeo=new Set([flameGeo]),sharedMat=new Set(),P={};
function markShared(root){root.traverse(o=>{if(o.isMesh){sharedGeo.add(o.geometry);for(const m of [].concat(o.material))if(m)sharedMat.add(m);}});}
function mergeByMaterial(root){root.updateMatrixWorld(true);const groups=new Map();root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){const k=o.material.uuid,e=groups.get(k)||{m:o.material,g:[]};e.g.push(o.geometry.clone().applyMatrix4(o.matrixWorld));groups.set(k,e);}});const out=new T.Group();for(const e of groups.values()){const mixed=new Set(e.g.map(g=>!!g.index)).size>1;const gs=e.g.map(g=>{g=mixed&&g.index?g.toNonIndexed():g;if(!g.attributes.normal)g.computeVertexNormals();for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal'&&!(k==='uv'&&e.m.map))g.deleteAttribute(k);return g;});const geo=mergeGeometries(gs,false);if(geo)out.add(new T.Mesh(geo,e.m));else for(const g of gs)out.add(new T.Mesh(g,e.m));}return out;}
let loaded=0;const PROTO_FILES=['kart','mushroom','gate','tree','rock','fence','balloon','itembox','banana','shell','ramp','grandstand','spectator','bouncepad','podium','trophy','mansion','ghost','gravestone','pumpkin','kartwheel','driver'];
function loadProto(name){return new Promise(resolve=>{new GLTFLoader().load(`assets/${name}.glb`,g=>{const merged=mergeByMaterial(g.scene);markShared(merged);P[name]=merged;progress();resolve();},undefined,()=>{P[name]=null;progress();resolve();});});}
function progress(){loaded++;const el=$('loaderBar');if(el)el.style.width=Math.round(loaded/PROTO_FILES.length*100)+'%';}
function cloneProto(proto){const c=proto.clone(true);c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return c;}
function applyTint(root,name,color,extra){root.traverse(o=>{if(!o.isMesh)return;const fix=m=>{if(m&&m.name===name){const c=m.clone();c.color=new T.Color(color);if(extra)Object.assign(c,extra);if(extra?.emissiveColor){c.emissive=new T.Color(extra.emissiveColor);}return c;}return m;};o.material=Array.isArray(o.material)?o.material.map(fix):fix(o.material);});}
function scatterInstanced(proto,list,tint){if(!proto||!list.length)return;const meshes=[];proto.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))meshes.push(o);});const m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),s=new T.Vector3(),v=new T.Vector3();for(const src of meshes){let material=src.material;if(tint&&tint[material.name]!==undefined){material=material.clone();material.color=new T.Color(tint[material.name]);}const inst=new T.InstancedMesh(src.geometry,material,list.length);inst.castShadow=true;inst.receiveShadow=true;list.forEach((t,i)=>{e.set(0,t.ry||0,0);q.setFromEuler(e);const sw=t.s*(t.sx||1);s.set(sw,t.s*(t.sy||1),sw);m.compose(v.set(t.x,t.y||0,t.z),q,s);inst.setMatrixAt(i,m);});inst.instanceMatrix.needsUpdate=true;world.add(inst);}}

// ---------------------------------------------------------------- Hilfsfunktionen
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,material,x,y,z,sx,sy=sx,sz=sx){const m=mesh(new T.SphereGeometry(1,14,10),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function box(parent,material,x,y,z,a,b,c){return mesh(new T.BoxGeometry(a,b,c),material,parent,x,y,z);}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hex=c=>'#'+new T.Color(c).getHexString();
function canvasTex(w,h,draw,repeat=false){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
function label(text,bg='#fff1d9',fg='#28523c',w=512,h=128){const tex=canvasTex(w,h,(q)=>{q.fillStyle=bg;q.fillRect(0,0,w,h);q.fillStyle=fg;q.font=`900 ${Math.round(h*.52)}px Trebuchet MS`;q.textAlign='center';q.textBaseline='middle';q.fillText(text,w/2,h/2);});return new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});}
function skyTexture(top,bottom){return canvasTex(2,256,(q)=>{const g=q.createLinearGradient(0,0,0,256);g.addColorStop(0,top);g.addColorStop(.62,bottom);g.addColorStop(1,bottom);q.fillStyle=g;q.fillRect(0,0,2,256);});}
function speckleTexture(base,spot,density=1200,size=256){return canvasTex(size,size,(q)=>{q.fillStyle=base;q.fillRect(0,0,size,size);for(let i=0;i<density;i++){q.globalAlpha=.12+Math.random()*.25;q.fillStyle=Math.random()<.55?spot:'#00000022';q.fillRect(Math.random()*size,Math.random()*size,2,2);}q.globalAlpha=1;},true);}
function clearGroup(g){const disposed=new Set();g.traverse(o=>{if(o.isMesh||o.isPoints){if(o.geometry&&!sharedGeo.has(o.geometry))o.geometry.dispose();for(const m of [].concat(o.material)){if(m&&!persistentMats.has(m)&&!sharedMat.has(m)&&!disposed.has(m)){m.map?.dispose();m.emissiveMap?.dispose?.();m.dispose();disposed.add(m);}}}});g.clear();}
const HC={};function setText(id,v){if(HC[id]!==v){HC[id]=v;$(id).textContent=v;}}
function notice(text,duration=1.3){setText('message',text);noticeTimer=duration;}
function toast(text,duration=1.4,cls=''){const el=$('toast');el.textContent=text;el.className='show '+cls;toastTimer=duration;}

// ---------------------------------------------------------------- Strecke: Tabelle, Projektion, Hoehe
const PS=2048,TP={x:new Float32Array(PS),z:new Float32Array(PS),tx:new Float32Array(PS),tz:new Float32Array(PS),k:new Float32Array(PS),v:new Float32Array(PS),vd:new Float32Array(PS),h:new Float32Array(PS),b:new Float32Array(PS)};
const lapDist=d=>((d%length)+length)%length;
const wrapDiff=(a,b)=>((a-b)%length+length*1.5)%length-length/2;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
function buildTable(){for(let i=0;i<PS;i++){const u=i/PS,p=curve.getPointAt(u),t=curve.getTangentAt(u).normalize();TP.x[i]=p.x;TP.z[i]=p.z;TP.tx[i]=t.x;TP.tz[i]=t.z;}
 const ds=length/PS,raw=new Float32Array(PS);for(let i=0;i<PS;i++){const j=(i+1)%PS;raw[i]=(TP.tz[i]*TP.tx[j]-TP.tx[i]*TP.tz[j])/ds;}
 for(let i=0;i<PS;i++){let s=0;for(let k=-8;k<=8;k++)s+=raw[(i+k+PS)%PS];TP.k[i]=s/17;}
 for(let i=0;i<PS;i++){let m=0;for(let k=-3;k<=3;k++)m=Math.max(m,Math.abs(TP.k[(i+k+PS)%PS]));TP.v[i]=maxCornerSpeed(m);TP.vd[i]=maxCornerSpeed(m,true);}}
// Globale Projektion eines Weltpunkts auf die Strecke (nur beim Bauen); im Rennen lokale Suche um die letzte Position.
function projectGlobal(x,z){let best=0,bd=1e18;for(let i=0;i<PS;i++){const dx=x-TP.x[i],dz=z-TP.z[i],d2=dx*dx+dz*dz;if(d2<bd){bd=d2;best=i;}}return best*length/PS;}
function project(x,z,hintD){const ds=length/PS,i0=Math.round(lapDist(hintD)/ds);let best=i0%PS,bd=1e18;for(let k=-60;k<=60;k++){const i=((i0+k)%PS+PS)%PS,dx=x-TP.x[i],dz=z-TP.z[i],d2=dx*dx+dz*dz;if(d2<bd){bd=d2;best=i;}}
 const dx=x-TP.x[best],dz=z-TP.z[best];return {d:lapDist(best*ds+dx*TP.tx[best]+dz*TP.tz[best]),off:dx*TP.tz[best]-dz*TP.tx[best]};}
function tIdx(d){const f=lapDist(d)/length*PS,i=Math.floor(f)%PS;return [i,(i+1)%PS,f-Math.floor(f)];}
function trackAt(d){const [i,j,k]=tIdx(d);return {h:TP.h[i]+(TP.h[j]-TP.h[i])*k,b:TP.b[i]+(TP.b[j]-TP.b[i])*k,kap:TP.k[i],v:TP.v[i],vd:TP.vd[i]};}
function slopeAt(d){return (trackAt(d+1.5).h-trackAt(d-1.5).h)/3;}
function sample(d,off=0){const [i,j,k]=tIdx(d),x=TP.x[i]+(TP.x[j]-TP.x[i])*k,z=TP.z[i]+(TP.z[j]-TP.z[i])*k;let tx=TP.tx[i]+(TP.tx[j]-TP.tx[i])*k,tz=TP.tz[i]+(TP.tz[j]-TP.tz[i])*k;const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;const h=TP.h[i]+(TP.h[j]-TP.h[i])*k,b=TP.b[i]+(TP.b[j]-TP.b[i])*k;return {p:new T.Vector3(x+tz*off,h-off*b,z-tx*off),t:new T.Vector3(tx,0,tz),angle:Math.atan2(tx,tz),bank:b};}
let cpU=[];
// Sucht in der Naehe eines Kontrollpunkts die geradeste Stelle (Anlauf davor, Landezone danach), damit Spruenge nie in Kurven landen.
function straightSpot(v,before=30,after=80,search=90){const c=cpDist(v);let best=c,bs=1e9;for(let o=-search;o<=search;o+=3){const d=c+o;if(gaps.some(g=>Math.abs(wrapDiff(g.c,d))<after+30)||zones.some(z=>{const w=wrapDiff(d,z.d);return w<z.half+before+5&&w>-z.half-after-5;}))continue;let m=0;for(let s=-before;s<=after;s+=3)m=Math.max(m,Math.abs(trackAt(d+s).kap));const score=m+Math.abs(o)*.00004;if(score<bs){bs=score;best=d;}}return lapDist(best);}
function cpDist(v){const n=course.points.length,i=Math.floor(v)%n,f=v-Math.floor(v),a=cpU[i],b=cpU[(i+1)%n];let du=b-a;if(du<0)du+=length;return lapDist(a+du*f);}
function inGap(d){const dl=lapDist(d);return gaps.some(g=>dl>g.start&&dl<g.end);}
function groundAt(d,off){const tr=trackAt(d);let base=tr.h-off*tr.b;const edge=Math.abs(off)-8.9;if(edge>0&&base>0)base=Math.max(0,base-edge/1.5);if(Math.abs(off)<30&&inGap(d))base=-30;const rh=rampAt(d,off);return {y:base+(rh?rh.y:0),rh};}
function rampAt(d,off){const dl=lapDist(d);for(const r of ramps){if(Math.abs(off-r.off)<r.w/2&&dl>=r.start&&dl<=r.end)return {y:RAMP_H*(dl-r.start)/RAMP_LEN,ramp:r};}return null;}
function strip(d0,d1,offset,width,lift,uvLen,steps){const v=[],uv=[],idx=[];for(let i=0;i<=steps;i++){const d=d0+(d1-d0)*i/steps;for(const side of [-1,1]){const {p}=sample(d,offset+side*width/2);v.push(p.x,p.y+lift,p.z);uv.push(side<0?0:1,(d-d0)/uvLen);}if(i<steps){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function addStrip(geo,material,shadow=true){const m=new T.Mesh(geo,material);m.receiveShadow=shadow;world.add(m);return m;}
// Strassenabschnitte ohne Schluchten
function roadSegments(){const segs=[];let s=0;for(const g of [...gaps].sort((a,b)=>a.start-b.start)){segs.push([s,g.start]);s=g.end;}segs.push([s,length]);return segs.filter(([a,b])=>b-a>1);}
function stripSegs(offset,width,lift,uvLen,material,shadow=true){for(const [a,b] of roadSegments())addStrip(strip(a,b,offset,width,lift,uvLen,Math.ceil((b-a)/1.1)),material,shadow);}
function skirt(side,material){const steps=520,v=[],idx=[],hs=[];for(let i=0;i<=steps;i++){const d=length*i/steps,s=sample(d,side*8.9),h=inGap(d)?0:Math.max(0,s.p.y),b=sample(d,side*(8.9+h*1.5+1.2)).p;v.push(s.p.x,s.p.y+.02,s.p.z,b.x,-.5,b.z);hs.push(h);}for(let i=0;i<steps;i++){if(Math.max(hs[i],hs[i+1])<.35||hs[i]===0||hs[i+1]===0)continue;const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,material);m.receiveShadow=true;world.add(m);}
// Hindernisse fuer Kollisionen (Raster 16 m)
function addObstacle(x,z,r,h=99){const key=(Math.floor(x/16)+500)*1000+(Math.floor(z/16)+500);let c=obsGrid.get(key);if(!c)obsGrid.set(key,c=[]);c.push({x,z,r,h});}
function nearTrack(x,z,dist){const d=projectGlobal(x,z),p=sample(d).p;return Math.hypot(p.x-x,p.z-z)<dist;}

// ---------------------------------------------------------------- Deko & Figuren
function mushroom(x,z,s,color,y=0,glow=0){if(P.mushroom){const g=cloneProto(P.mushroom);g.position.set(x,y,z);g.scale.setScalar(s);applyTint(g,'CapPaint',color,glow?{emissiveColor:color,emissiveIntensity:glow}:null);world.add(g);return g;}const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);world.add(g);mesh(new T.CylinderGeometry(.3,.52,2.5,12),cream,g,0,1.25,0);sphere(g,mat(color,glow?{emissive:color,emissiveIntensity:glow}:{}),0,2.65,0,1.6,.75,1.6);return g;}
function tree(x,z,s,color){if(P.tree){const g=cloneProto(P.tree);g.position.set(x,0,z);g.scale.setScalar(s);applyTint(g,'CapPaint',color);world.add(g);return g;}const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);mesh(new T.CylinderGeometry(.2,.4,2.7,7),mat(0x98714a),g,0,1.35,0);sphere(g,mat(color),0,3.5,0,1.7,2.6,1.7);}
function kart(color,goldLook=false){let g;if(P.kart){g=new T.Group();const body=cloneProto(P.kart);applyTint(body,'BodyPaint',color,goldLook?{metalness:.65,roughness:.28}:null);g.add(body);
  const wheels=[];if(P.kartwheel)for(const [x,y,z,s,w] of [[-1,.42,1,1,1],[1,.42,1,1,1],[-1.05,.48,-.9,1.14,1.3],[1.05,.48,-.9,1.14,1.3]]){const piv=new T.Group(),wh=cloneProto(P.kartwheel);piv.position.set(x,y,z);wh.scale.set(w*(x>0?-1:1),s,s);piv.add(wh);g.add(piv);wheels.push({piv,wh,front:z>0,r:y});}
  let driver=null;if(P.driver){driver=cloneProto(P.driver);applyTint(driver,'CapPaint',goldLook?0xffd23f:color);driver.position.set(0,.95,-.35);g.add(driver);}
  g.userData.parts={wheels,driver};}else{g=new T.Group();const body=mat(color,{roughness:.35});box(g,body,0,.68,0,1.75,.55,2.4);box(g,dark,0,.95,-.28,.9,.75,.72);sphere(g,cream,0,1.9,-.08,.45);for(const x of [-1,1])for(const z of [-.9,1]){const w=mesh(new T.CylinderGeometry(.43,.43,.38,14),dark,g,x,.44,z);w.rotation.z=Math.PI/2;}}
 const shield=new T.Mesh(new T.SphereGeometry(1.75,24,16),shieldMat);shield.position.y=1;shield.visible=false;g.add(shield);
 const flames=[-.45,.45].map(x=>{const f=new T.Mesh(flameGeo,flameMat);f.position.set(x,.72,-1.72);f.visible=false;g.add(f);return f;});g.userData={...g.userData,shield,flames};return g;}
function boostTexture(){return canvasTex(64,128,(q,w,h)=>{q.fillStyle='#ffc93c';q.fillRect(0,0,w,h);q.strokeStyle='#ff5a1f';q.lineWidth=12;q.lineCap='round';for(let y=10;y<h;y+=64){q.beginPath();q.moveTo(8,y+34);q.lineTo(w/2,y+6);q.lineTo(w-8,y+34);q.stroke();}},true);}

function buildCourse(){
 clearGroup(world);clearGroup(actors);obsGrid.clear();
 hazards=[];flags=[];balloons=[];puffs=[];shots=[];ramps=[];pads=[];rings=[];spores=[];swingers=[];gaps=[];zones=[];bats=null;boostPads=[];sporeMesh=null;crowd=null;roulette=null;cer=null;fireflies=null;
 shake=0;lastPlace=8;leadAt=-99;wrongT=0;for(const s of skids){s.life=0;s.m.visible=false;}for(const s of sparkPool)s.life=0;
 course=courses[selected];theme=THEMES[course.theme];
 // Licht & Himmel je Thema
 scene.background=skyTexture(hex(theme.skyTop),hex(theme.skyBottom));scene.fog=new T.Fog(theme.fog,theme.fogNear,theme.fogFar);renderer.toneMappingExposure=theme.exposure;
 hemi.color.setHex(theme.hemiSky);hemi.groundColor.setHex(theme.hemiGround);hemi.intensity=theme.hemiInt;sun.color.setHex(theme.sunCol);sun.intensity=theme.sunInt;sun.position.set(...theme.sunPos);fill.color.setHex(theme.fillCol);fill.intensity=theme.fillInt;headlight.intensity=theme.stars?90:0;
 stars.visible=moon.visible=theme.stars;sunGlow.visible=!theme.stars;sunGlow.position.set(theme.sunPos[0]*2.6,Math.max(80,theme.sunPos[1]*2),theme.sunPos[2]*2.6);sunGlow.material.color.setHex(course.theme==='canyon'?0xffc28a:0xffffff);
 curve=new T.CatmullRomCurve3(course.points.map(([x,z])=>new T.Vector3(x*TRACK_SCALE,0,z*TRACK_SCALE)),true,'catmullrom',.38);curve.arcLengthDivisions=3000;length=curve.getLength();buildTable();
 cpU=course.points.map(([x,z])=>projectGlobal(x*TRACK_SCALE,z*TRACK_SCALE));
 // Hoehenprofil: Huegel (Gauss) + Plateau; Ueberhoehung aus der Kruemmung
 const hills=(course.hills||[]).map(([v,a,w])=>[cpDist(v)/length,a,w]);const plat=course.plateau?{s:cpDist(course.plateau[0]),e:cpDist(course.plateau[1]),h:course.plateau[2],r:course.plateau[3]}:null;
 for(let i=0;i<PS;i++){const u=i/PS,d=u*length;let h=0;for(const [c,a,w] of hills){let du=u-c;du-=Math.round(du);h+=a*Math.exp(-(du*du)/(w*w));}if(plat)h+=plat.h*smooth(plat.s,plat.s+plat.r,d)*(1-smooth(plat.e-plat.r,plat.e,d));const b=clamp(TP.k[i]*4,-.12,.12);TP.b[i]=b;TP.h[i]=h+Math.abs(b)*9.8;}
 if(course.gap){const c=cpDist(course.gap[0]),L=course.gap[1];gaps.push({start:c-L/2,end:c+L/2,c});}
 let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;for(let i=0;i<PS;i+=8){minX=Math.min(minX,TP.x[i]);maxX=Math.max(maxX,TP.x[i]);minZ=Math.min(minZ,TP.z[i]);maxZ=Math.max(maxZ,TP.z[i]);}
 mapInfo={cx:(minX+maxX)/2,cz:(minZ+maxZ)/2,k:Math.min(180/(maxX-minX),140/(maxZ-minZ))};
 const random=rng(course.seed);
 // Boden, Meer, Kuestenschaum
 const grassMat=new T.MeshStandardMaterial({map:speckleTexture(hex(theme.grass),hex(theme.grassSpot),2600),roughness:1});
 mesh(new T.CylinderGeometry(210,195,12,96),grassMat,world,0,-6.3,0).castShadow=false;
 const seaMat=mat(theme.sea,{roughness:.3});seaMat.onBeforeCompile=sh=>{sh.uniforms.uTime=shaderTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying float vWave;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat w=sin(position.x*.035+uTime*1.3)*.8+sin(position.y*.05-uTime*1.1)*.6+sin((position.x+position.y)*.02+uTime*.7)*.9;transformed.z+=w;vWave=w;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWave;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb+=vec3(.10,.15,.15)*smoothstep(.7,2.1,vWave);');};
 const sea=mesh(new T.PlaneGeometry(1800,1800,90,90),seaMat,world,0,-12,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
 foamRing=mesh(new T.RingGeometry(204,217,72),new T.MeshBasicMaterial({color:theme.foam,transparent:true,opacity:.22,depthWrite:false}),world,0,-11.35,0);foamRing.rotation.x=-Math.PI/2;foamRing.castShadow=false;
 // Strasse, Kanten, Curbs, Mittellinie (bei Neon leuchtend)
 const glow=theme.glow;
 stripSegs(0,17.8,.04,6,mat(theme.edge,glow?{emissive:theme.edge,emissiveIntensity:.35}:{}));
 stripSegs(0,15.2,.065,6,new T.MeshStandardMaterial({map:speckleTexture(hex(theme.road),hex(theme.roadSpot),900),roughness:.9}));
 const curbTex=canvasTex(8,64,(q)=>{q.fillStyle=theme.curbA;q.fillRect(0,0,8,32);q.fillStyle=theme.curbB;q.fillRect(0,32,8,32);},true);curbTex.magFilter=T.NearestFilter;
 const curbMat=new T.MeshStandardMaterial({map:curbTex,roughness:.7,...(glow?{emissive:0xffffff,emissiveMap:curbTex,emissiveIntensity:.9}:{})});for(const off of [-8.2,8.2])stripSegs(off,.8,.13,8,curbMat);
 const dashTex=canvasTex(8,32,(q)=>{q.fillStyle=theme.line;q.fillRect(0,0,8,16);},true);stripSegs(0,.22,.075,8,new T.MeshStandardMaterial({map:dashTex,alphaTest:.5,roughness:.8,...(glow?{emissive:0xffffff,emissiveMap:dashTex,emissiveIntensity:1}:{})}),false);
 const skirtMat=new T.MeshStandardMaterial({map:speckleTexture(hex(theme.skirt),hex(theme.grassSpot),1800),roughness:1,side:T.DoubleSide});skirt(-1,skirtMat);skirt(1,skirtMat);
 buildGaps();buildMansion();
 // Start-Ziel-Tor und Schachbrett
 const start=sample(0),arch=new T.Group();arch.position.copy(start.p);arch.rotation.y=start.angle;world.add(arch);
 if(P.gate)arch.add(cloneProto(P.gate));else{box(arch,cream,-9,4,0,.6,8,.6);box(arch,cream,9,4,0,.6,8,.6);box(arch,mat(0xed6350),0,8,0,19,2,.7);}
 for(const side of [-1,1]){const p=sample(0,side*9.3).p;addObstacle(p.x,p.z,1);}
 const bz=P.gate?.26:.37;mesh(new T.PlaneGeometry(16,1.6),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,bz);mesh(new T.PlaneGeometry(16,1.6),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,-bz).rotation.y=Math.PI;
 const checker=canvasTex(64,16,(q)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){q.fillStyle=(x+y)%2?'#273943':'#fff1d9';q.fillRect(x*4,y*4,4,4);}});checker.magFilter=T.NearestFilter;
 {const panel=new T.Group();panel.position.set(0,5.6,-.75);arch.add(panel);box(panel,dark,0,0,0,5.2,1.5,.3);startLights=[-1.7,0,1.7].map(x=>{const m=new T.MeshStandardMaterial({color:0x220808,emissive:0x000000,roughness:.4});const l=new T.Mesh(new T.SphereGeometry(.5,16,12),m);l.position.set(x,0,-.2);panel.add(l);return m;});lightState=-1;}addStrip(strip(-1.6,1.6,0,15.2,.09,3.2,2),new T.MeshStandardMaterial({map:checker,roughness:.8}));
 // Boost-Pads
 boostTex=boostTexture();const padMat=new T.MeshBasicMaterial({map:boostTex});
 for(const v of course.boost){const d=straightSpot(v,10,45,60);boostPads.push(d);addStrip(strip(d-2.3,d+2.3,0,11,.1,4.6,6),padMat,false);}
 if(gaps.length){const d=gaps[0].start-40;boostPads.push(lapDist(d));addStrip(strip(d-2.3,d+2.3,0,11,.1,4.6,6),padMat,false);}
 // Fahnen an der Strecke
 for(let i=0;i<16;i++){const d=length*(i+.5)/16;if(inGap(d)||inZone(d,4))continue;const s=sample(d,i%2?9.8:-9.8),g=new T.Group();g.position.copy(s.p);g.position.y=Math.max(0,s.p.y-.6);g.rotation.y=s.angle;world.add(g);box(g,cream,0,1.55,0,.12,3.1,.12);addObstacle(s.p.x,s.p.z,.35);const penn=mesh(new T.PlaneGeometry(1.5,.7,5,1),mat(i%2?0xed6350:0xffd45c,{side:T.DoubleSide,...(glow?{emissive:i%2?0xff3cac:0x2de2e6,emissiveIntensity:.8}:{})}),g,.81,2.75,0);flags.push({mesh:penn,base:penn.geometry.attributes.position.array.slice()});}
 // Zaeune aussen an scharfen Kurven (auch Kollision)
 if(P.fence){const fences=[];for(let d=4;d<length;d+=4){if(inGap(d)||inZone(d,3))continue;const kap=trackAt(d).kap;if(Math.abs(kap)<1/42)continue;const side=kap>0?-1:1,s=sample(d,side*10.8),p=s.p;fences.push({x:p.x,z:p.z,y:Math.max(0,p.y-1.2),ry:s.angle+Math.PI/2,s:1});addObstacle(p.x,p.z,.9,p.y+2);}scatterInstanced(P.fence,fences,course.theme==='haunted'?{WoodPaint:0x1d1826,PostPaint:0x4a4058}:glow?{WoodPaint:0x2a2f5a,PostPaint:0xff3cac}:null);}
 buildChevrons();
 buildScenery(random);
 buildRamps();buildPads();buildSwingers();buildSpores();buildStands();
 boxes=[];for(const v of course.boxes){const d=cpDist(v);for(const k of [-4,0,4]){const s=sample(d,k),g=new T.Group();g.position.copy(s.p);world.add(g);if(P.itembox){const cube=cloneProto(P.itembox);cube.scale.setScalar(1.05);g.add(cube);const lm=label('?','#ed6350','#fff9df',128,128),q=new T.Sprite(new T.SpriteMaterial({map:lm.map,transparent:true,fog:false}));q.scale.set(.95,.95,1);q.position.y=1.3;g.add(q);lm.dispose();}else mesh(new T.BoxGeometry(1.5,1.5,1.5),mat(0xffd858),g);boxes.push({distance:d,offset:k,mesh:g,baseY:s.p.y+1.6,cooldown:0});}}
 placeRacers();
 setText('courseLabel',course.name);setText('courseNo',String(selected+1).padStart(2,'0'));drawMap();}

function placeRacers(){const cls=CLASSES[cc];racers=[];
 const order=isTT()?[0]:[1,2,3,4,5,0,6,7];// Startplatz 6 fuer den Spieler: der Sieg muss erfahren werden
 for(let s=0;s<order.length;s++){const id=order[s],r=racer(id,AI_NAMES[id],id===0?KART_COLORS[colorIndex].c:AI_COLORS[id-1]);const d=-(9+Math.floor(s/2)*7.5+(s%2)*3),off=s%2?-3.3:3.3,p=sample(d,off);r.x=p.p.x;r.z=p.p.z;r.h=p.angle;r.distance=d;r.offset=off;r.safeD=d;
  r.skill=clamp(cls.skill+(7-id)*.012+(id%3-1)*.02,.3,.98);r.laneBias=((id*37)%11-5)*.3;r.driftCd=0;r.aiDrift=0;
  r.mesh=kart(r.color,id===0&&KART_COLORS[colorIndex].gold);actors.add(r.mesh);racers[id]=r;}
 racers.forEach(r=>{vertical(r,1/60);syncKart(r,0);});camH=racers[0].h;lastPlace=racers.length;setupGhost();}
// ---------------------------------------------------------------- Zeitfahren: Geist der eigenen Bestzeit + Medaillen
const isTT=()=>mode==='tt'&&!gp.active;
let ghost=null,rec=null;
function setupGhost(){ghost=null;rec=null;if(!isTT())return;rec={x:[],y:[],z:[],h:[],d:[],next:0};const data=store.get(`ghost-${selected}`,null);if(!data||!data.x||!data.x.length)return;
 const g=kart(data.color??0xffffff);g.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.material=[].concat(o.material).map(m=>{const c=m.clone();c.transparent=true;c.opacity=.36;c.depthWrite=false;return c;})[0];});actors.add(g);ghost={mesh:g,data,dist:0};}
function recordGhost(p){if(!rec||elapsed<rec.next)return;rec.next+=.1;rec.x.push(Math.round(p.x*10));rec.y.push(Math.round(p.y*10));rec.z.push(Math.round(p.z*10));rec.h.push(Math.round(p.h*100));rec.d.push(Math.round(p.distance*10));}
function updateGhost(){if(!ghost)return;const D=ghost.data,f=elapsed/.1,i=Math.floor(f),n=D.x.length;if(state!=='race'||i>=n-1){ghost.mesh.visible=state==='countdown';if(i>=n-1)ghost.dist=Infinity;return;}
 const k=f-i,L=a=>(a[i]+(a[i+1]-a[i])*k)/10;ghost.mesh.visible=true;ghost.mesh.position.set(L(D.x),L(D.y)+.1,L(D.z));ghost.mesh.rotation.set(0,(D.h[i]+(D.h[i+1]-D.h[i])*k)/100,0);ghost.dist=L(D.d);}
function medalOf(time){const m=course.medals;return time<=m[0]?0:time<=m[1]?1:time<=m[2]?2:3;}
const MEDALS=['🥇 GOLD','🥈 SILBER','🥉 BRONZE'];

function buildGaps(){for(const g of gaps){const h=trackAt(g.start-1).h;
 // Klippenwaende an beiden Kanten + Fluss unten
 for(const d of [g.start,g.end]){const s=sample(d,0),wall=mesh(new T.BoxGeometry(18.5,h+.6,1.2),mat(theme.skirt,{roughness:1}),world,s.p.x,(h-.6)/2,s.p.z);wall.rotation.y=s.angle;}
 const water=addStrip(strip(g.start-8,g.end+8,0,60,-h+.3,6,12),mat(0x2fb7d8,{roughness:.15,emissive:0x0a4a6a,emissiveIntensity:.4}),false);water.castShadow=false;
 for(const d of [g.start-3,g.end+3])for(const side of [-1,1]){const p=sample(d,side*12).p;if(P.rock){const r=cloneProto(P.rock);applyTint(r,'StonePaint',0xc0643a);r.position.set(p.x,0,p.z);r.scale.set(2.2,2.8+Math.random(),2.2);world.add(r);}addObstacle(p.x,p.z,2.4);}
 // Warnschilder vor der Schlucht
 for(const side of [-1,1]){const s=sample(g.start-70,side*11),w=new T.Group();w.position.copy(s.p);w.rotation.y=s.angle;world.add(w);box(w,cream,0,1.6,0,.22,3.2,.22);mesh(new T.PlaneGeometry(4.2,1.7),label('SCHLUCHT! VOLLGAS','#ffd23f','#2b1d24',512,128),w,0,3.4,0);addObstacle(s.p.x,s.p.z,.4);}}}

// Geistervilla: die Strasse fuehrt mitten durch die Halle (Kollision an Waenden, Fluegeln und Tuermen)
function buildMansion(){if(!course.mansion)return;const d=straightSpot(course.mansion,30,30,60),s=sample(d,0),g=P.mansion?cloneProto(P.mansion):new T.Group();
 if(!P.mansion){for(const sx of [-1,1])box(g,mat(0x2a2240),sx*14.5,6.5,0,7,13,30);box(g,mat(0x2a2240),0,11.5,0,22,5,30);}
 g.position.copy(s.p);g.rotation.y=s.angle;world.add(g);g.updateMatrixWorld(true);
 const v=new T.Vector3(),ob=(x,z,r)=>{v.set(x,0,z).applyMatrix4(g.matrixWorld);addObstacle(v.x,v.z,r);};
 for(const sx of [-1,1]){for(let y=-15;y<=15;y+=2)ob(sx*12.3,y,1.3);for(let y=-13;y<=13;y+=3.5){ob(sx*15,y,2);ob(sx*17.6,y,1.4);}}
 ob(-21.5,-6,3.6);ob(21,9,2.8);
 zones.push({d,half:17,x:s.p.x,z:s.p.z,r:36});}
function buildScenery(random){const th=course.theme,glow=theme.glow;
 const clear=(x,z,min)=>{const d=projectGlobal(x,z),s=sample(d);return Math.hypot(s.p.x-x,s.p.z-z)>min+Math.max(0,s.p.y)*1.6&&zones.every(q=>Math.hypot(q.x-x,q.z-z)>q.r);};
 if(th==='forest'||th==='night'){
  for(let i=0;i<190;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>186||!clear(x,z,15))continue;const s=1+random()*2.3;
   if(i%3===0){mushroom(x,z,s,theme.caps[i%theme.caps.length],0,glow?.9:0);addObstacle(x,z,.55*s);}else{tree(x,z,s*.8,theme.leaves[i%theme.leaves.length]);addObstacle(x,z,.55*s*.8);}}
  if(P.rock){const rocks=[];for(let i=0;i<30;i++){const x=(random()-.5)*360,z=(random()-.5)*320;if(Math.hypot(x,z)>182||!clear(x,z,13))continue;const s=.6+random()*2.2,sx=.7+random()*.6;rocks.push({x,z,s,sx,ry:random()*TAU});addObstacle(x,z,1.1*s*sx);}scatterInstanced(P.rock,rocks);}
  const landmarks=th==='night'?[[0,0,6.5,0xff3cac],[30,10,3.6,0x2de2e6],[-30,-10,4.2,0x9d6bff]]:[[10,5,6.5,0xe8352e],[34,14,3.4,0xf5a623],[-28,-12,4,0x8e5bd9]];
  for(const [x,z,s,c] of landmarks)if(clear(x,z,12)){mushroom(x,z,s,c,0,glow?1.1:0);addObstacle(x,z,.55*s);}
  // Blumen (forest) bzw. Leuchtsteine (night) am Wegesrand fuer Farbe
  const n=th==='forest'?520:260,flowers=new T.InstancedMesh(new T.IcosahedronGeometry(.28,0),new T.MeshStandardMaterial({color:0xffffff,roughness:.6,...(glow?{emissive:0xffffff,emissiveIntensity:.7}:{})}),n),c=new T.Color(),m=new T.Matrix4(),palette=th==='forest'?[0xff4d6d,0xffd23f,0xffffff,0xa66bff,0xff8a3d]:[0x2de2e6,0xff3cac,0xfff05a];
  for(let i=0;i<n;i++){const d=random()*length,off=(random()<.5?-1:1)*(11+random()*22),s=sample(d,off);if(inGap(d)){m.makeScale(0,0,0);}else m.compose(new T.Vector3(s.p.x,Math.max(0,s.p.y-(Math.abs(off)-8.9)/1.5)+.15,s.p.z),new T.Quaternion(),new T.Vector3(1,.6,1).multiplyScalar(.7+random()*.8));flowers.setMatrixAt(i,m);flowers.setColorAt(i,c.setHex(palette[i%palette.length]));}
  flowers.castShadow=false;world.add(flowers);}
 if(th==='haunted'){
  for(let i=0;i<130;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>186||!clear(x,z,15))continue;const s=1+random()*2;
   if(i%4===0){mushroom(x,z,s*.9,theme.caps[i%theme.caps.length],0,.8);addObstacle(x,z,.5*s);}else{tree(x,z,s*.85,theme.leaves[i%theme.leaves.length]);addObstacle(x,z,.5*s*.85);}}
  if(P.gravestone){const graves=[];for(let k=0;k<7;k++){const cx=(random()-.5)*300,cz=(random()-.5)*280;for(let i=0;i<16;i++){const x=cx+(i%4)*3.4-5+random(),z=cz+Math.floor(i/4)*3.6-6+random();if(Math.hypot(x,z)>184||!clear(x,z,13))continue;graves.push({x,z,s:1.1+random()*.5,ry:(random()-.5)*.6+k*.9});addObstacle(x,z,.8);}}scatterInstanced(P.gravestone,graves);}
  if(P.pumpkin){const pk=[];for(let i=0;i<80;i++){const d=random()*length,side=random()<.5?-1:1,off=side*(11.5+random()*7),s=sample(d,off);if(inZone(d,22)||inGap(d))continue;pk.push({x:s.p.x,y:Math.max(0,s.p.y-(Math.abs(off)-8.9)/1.5),z:s.p.z,s:.9+random()*1.1,ry:Math.atan2(-s.t.z*side,s.t.x*side)});addObstacle(s.p.x,s.p.z,.8);}scatterInstanced(P.pumpkin,pk);}
  const batGeo=new T.BufferGeometry();batGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-1.3,.4,-.25,-.55,0,.35,0,0,0,.55,0,.35,1.3,.4,-.25],3));batGeo.computeVertexNormals();
  bats=new T.InstancedMesh(batGeo,new T.MeshBasicMaterial({color:0x08060e,side:T.DoubleSide}),28);bats.frustumCulled=false;world.add(bats);}
 if(th==='canyon'){
  // Felsnadeln & Kakteen auf der Insel, Tafelberge am Horizont
  if(P.rock){const rocks=[];for(let i=0;i<60;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>185||!clear(x,z,14))continue;const s=1.2+random()*2.4,sy=1.5+random()*3;rocks.push({x,z,s,sy,sx:.8+random()*.5,ry:random()*TAU});addObstacle(x,z,1.2*s);}scatterInstanced(P.rock,rocks,{StonePaint:0xc0643a,MossPaint:0xe8a15a});}
  const cactusGeo=mergeGeometries([new T.CylinderGeometry(.45,.5,4.2,8).translate(0,2.1,0),new T.CylinderGeometry(.3,.3,1.6,8).rotateZ(Math.PI/2).translate(.9,2,0),new T.CylinderGeometry(.28,.28,1.5,8).translate(1.55,2.6,0),new T.CylinderGeometry(.26,.26,1.2,8).rotateZ(Math.PI/2).translate(-.8,2.8,0),new T.CylinderGeometry(.25,.25,1.1,8).translate(-1.3,3.25,0)]);
  const cacti=[];for(let i=0;i<70;i++){const x=(random()-.5)*360,z=(random()-.5)*330;if(Math.hypot(x,z)>186||!clear(x,z,13))continue;cacti.push([x,z,.8+random()*.8,random()*TAU]);addObstacle(x,z,.7);}
  const cm=new T.InstancedMesh(cactusGeo,mat(0x4f8a3a,{roughness:.7}),cacti.length),m=new T.Matrix4();cacti.forEach(([x,z,s,r],i)=>{m.compose(new T.Vector3(x,0,z),new T.Quaternion().setFromEuler(new T.Euler(0,r,0)),new T.Vector3(s,s,s));cm.setMatrixAt(i,m);});cm.castShadow=true;world.add(cm);
  for(let i=0;i<18;i++){const x=(random()-.5)*330,z=(random()-.5)*300;if(Math.hypot(x,z)>180||!clear(x,z,16)||i%2)continue;mushroom(x,z,1.2+random()*1.5,theme.caps[i%theme.caps.length]);addObstacle(x,z,.8);}
  for(let i=0;i<14;i++){const a=i/14*TAU+random()*.2,r=240+random()*60,rad=18+random()*26,h=26+random()*40;const mesa=mesh(new T.CylinderGeometry(rad*.8,rad,h,7),mat(theme.hills[i%2],{flatShading:true,roughness:1}),world,Math.cos(a)*r,h/2-8,Math.sin(a)*r);mesa.castShadow=false;mesh(new T.CylinderGeometry(rad*.82,rad*.8,3,7),mat(0xe9a060,{flatShading:true}),world,Math.cos(a)*r,h-6.5,Math.sin(a)*r).castShadow=false;}}
 if(th!=='canyon')for(let i=0;i<16;i++){const a=i/16*TAU,r=228+random()*70;const hill=sphere(world,mat(theme.hills[i%2]),Math.cos(a)*r,-4,Math.sin(a)*r,25+random()*25,28+random()*34,24+random()*15);hill.castShadow=false;}
 if(theme.clouds)for(let i=0;i<15;i++){const cloud=new T.Group();world.add(cloud);cloud.position.set((random()-.5)*420,60+random()*40,(random()-.5)*350);for(let k=0;k<4;k++){const puff=sphere(cloud,white,k*4-6,Math.sin(k)*2,0,5,3.5,3);puff.castShadow=false;}}
 if(P.balloon)for(let i=0;i<theme.balloons;i++){const a=i/Math.max(1,theme.balloons)*TAU+random(),r=90+random()*60,g=cloneProto(P.balloon);applyTint(g,'CapPaint',[0xed6350,0xffd45c,0x55bdb2,0xa688dc][i]);g.position.set(Math.cos(a)*r,30+random()*20,Math.sin(a)*r);world.add(g);balloons.push({g,base:g.position.y,ph:random()*TAU});}
 if(th==='night'||th==='haunted'){
  // Laternen entlang der Strecke + Gluehwuermchen (Shader-Partikel)
  const lampGeo=new T.CylinderGeometry(.12,.16,4,6).translate(0,2,0),bulbGeo=new T.SphereGeometry(.45,10,8).translate(0,4.2,0),posts=[];for(let d=10;d<length;d+=38){if(inGap(d)||inZone(d,6))continue;const side=Math.round(d/38)%2?1:-1,s=sample(d,side*10.2);posts.push([s.p.x,Math.max(0,s.p.y-.9),s.p.z,side]);addObstacle(s.p.x,s.p.z,.4);}
  const pm=new T.InstancedMesh(lampGeo,mat(0x2a2f5a),posts.length),bm=new T.InstancedMesh(bulbGeo,new T.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1.4}),posts.length),m=new T.Matrix4(),c=new T.Color();posts.forEach(([x,y,z,side],i)=>{m.makeTranslation(x,y,z);pm.setMatrixAt(i,m);bm.setMatrixAt(i,m);bm.setColorAt(i,c.setHex(th==='haunted'?(side>0?0x9dff7a:0xb48cff):side>0?0x2de2e6:0xff3cac));});world.add(pm,bm);
  const n=420,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){const d=random()*length,s=sample(d,(random()-.5)*60);pos[i*3]=s.p.x;pos[i*3+1]=Math.max(0,s.p.y)+.8+random()*5;pos[i*3+2]=s.p.z;ph[i]=random()*TAU;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
  fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'uniform float uTime;attribute float phase;varying float vA;void main(){vec3 p=position+vec3(sin(uTime*.7+phase)*1.5,sin(uTime*1.3+phase*2.)*.8,cos(uTime*.6+phase)*1.5);vec4 mv=modelViewMatrix*vec4(p,1.);vA=.55+.45*sin(uTime*3.+phase*5.);gl_PointSize=clamp(180./-mv.z,2.,14.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.75,1.,.45)*(1.-smoothstep(.1,.5,d))*vA,1.);}'}));fireflies.frustumCulled=false;world.add(fireflies);}
 if(th==='canyon'){const n=220,pos=new Float32Array(n*3),ph=new Float32Array(n);for(let i=0;i<n;i++){pos[i*3]=(random()-.5)*360;pos[i*3+1]=1+random()*14;pos[i*3+2]=(random()-.5)*330;ph[i]=random()*TAU;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));
  fireflies=new T.Points(g,new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,vertexShader:'uniform float uTime;attribute float phase;void main(){vec3 p=position+vec3(mod(uTime*6.+phase*40.,80.)-40.,sin(uTime+phase)*1.,sin(uTime*.5+phase)*3.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(220./-mv.z,1.5,9.);gl_Position=projectionMatrix*mv;}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.82,.6,(1.-smoothstep(.15,.5,d))*.45);}'}));fireflies.frustumCulled=false;world.add(fireflies);}}

function chevronTex(dir){return canvasTex(128,64,(q,w,h)=>{q.fillStyle=theme.glow?'#1a1030':'#d7263d';q.fillRect(0,0,w,h);q.strokeStyle=theme.glow?(course.theme==='haunted'?'#9dff7a':'#2de2e6'):'#ffffff';q.lineWidth=11;q.lineJoin='round';for(const x of [30,64,98]){q.beginPath();q.moveTo(x-dir*12,10);q.lineTo(x+dir*12,32);q.lineTo(x-dir*12,54);q.stroke();}});}
function buildChevrons(){const texL=chevronTex(-1),texR=chevronTex(1),mk=t=>new T.MeshStandardMaterial({map:t,roughness:.6,...(theme.glow?{emissive:0xffffff,emissiveMap:t,emissiveIntensity:.9}:{})}),mL=mk(texL),mR=mk(texR),geo=new T.PlaneGeometry(2.6,1.3),post=new T.CylinderGeometry(.08,.08,1.6,6);
 let last=-99;for(let d=0;d<length;d+=3){const k=trackAt(d).kap;if(Math.abs(k)<1/30||inGap(d)||inZone(d,10)||d-last<45)continue;let apex=d,km=Math.abs(k);for(let s=d;s<d+40;s+=2){const kk=Math.abs(trackAt(s).kap);if(kk>km){km=kk;apex=s;}}last=apex;const left=trackAt(apex).kap>0,side=left?-1:1;
  for(const o of [-9,0,9]){const s=sample(apex+o,side*12),g=new T.Group();g.position.copy(s.p);g.position.y=Math.max(0,s.p.y-(12-8.9)/1.5);g.rotation.y=s.angle+Math.PI;world.add(g);const b=new T.Mesh(geo,left?mL:mR);b.position.y=2;b.castShadow=true;g.add(b);const p=new T.Mesh(post,dark);p.position.y=.8;g.add(p);addObstacle(s.p.x,s.p.z,.5);}}}
function buildRamps(){const list=course.ramps.map(([v,off,w])=>({d:straightSpot(v,35,85),off,w}));for(const g of gaps)list.push({d:lapDist(g.start-RAMP_LEN/2-.4),off:0,w:13,gap:true});
 for(const {d,off,w,gap} of list){const r={d,off,w,start:d-RAMP_LEN/2,end:d+RAMP_LEN/2,gap};ramps.push(r);const s=sample(d,off);let g;if(P.ramp){g=cloneProto(P.ramp);g.scale.set(w/6.4,1,RAMP_LEN/4.8);if(gap)applyTint(g,'RampPaint',0xffd23f);}else{g=new T.Group();const m=mesh(new T.BoxGeometry(w,.2,RAMP_LEN),mat(0xed6350),g,0,RAMP_H/2,0);m.rotation.x=-Math.atan(RAMP_H/RAMP_LEN);}g.position.copy(s.p);g.rotation.order='YXZ';g.rotation.set(Math.atan(slopeAt(d)),s.angle+Math.PI,s.bank);world.add(g);
  if(gap)continue;
  const rd=r.end+12,rs=sample(rd,off),ring=new T.Mesh(new T.TorusGeometry(3.2,.3,10,36),new T.MeshStandardMaterial({color:0xffd45c,emissive:0xff9a1f,emissiveIntensity:.9,roughness:.4}));ring.position.copy(rs.p);ring.position.y+=3.8;ring.rotation.y=rs.angle;world.add(ring);rings.push({d:lapDist(rd),off,y:ring.position.y,mesh:ring,flash:0});}}
function buildPads(){for(const [v,off] of course.pads){const d=straightSpot(v,20,55,70),s=sample(d,off);let g;if(P.bouncepad)g=cloneProto(P.bouncepad);else{g=new T.Group();sphere(g,mat(0xed6350),0,.2,0,1.75,.34,1.75);}g.position.copy(s.p);g.rotation.y=s.angle;world.add(g);pads.push({d,off,mesh:g,squash:0});}}
// Pendel-Pilze (Neon): schwingen quer ueber die Strecke, Timing statt Glueck.
function buildSwingers(){for(const [v,amp,spd,ph] of course.swing||[]){const d=cpDist(v),g=P.mushroom?cloneProto(P.mushroom):new T.Group();if(P.mushroom)applyTint(g,'CapPaint',0xff3cac,{emissiveColor:0xff3cac,emissiveIntensity:1.2});else sphere(g,mat(0xff3cac),0,2.6,0,1.6,.75,1.6);g.scale.setScalar(1.7);world.add(g);swingers.push({d,amp,spd,ph,mesh:g,x:0,z:0});}
 for(const [v,amp,spd,ph] of course.ghosts||[]){let d=cpDist(v);for(const r of [...ramps,...pads])if(Math.abs(wrapDiff(d,r.d))<32)d=lapDist(r.d+42);let g;if(P.ghost){g=cloneProto(P.ghost);g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.88;}});}else{g=new T.Group();sphere(g,mat(0xeef3ff,{emissive:0x9fb4ff,emissiveIntensity:.4}),0,1.7,0,1);}
  g.scale.setScalar(1.2);world.add(g);swingers.push({d,amp,spd,ph,mesh:g,x:0,z:0,y:0,kind:'ghost'});}}
function buildSpores(){const add=(d,off,lift)=>{if(inGap(d))return;const p=sample(d,off).p;spores.push({d:lapDist(d),off,x:p.x,z:p.z,y:p.y+lift,cd:0,ph:spores.length*.7});};
 // Sporen-Linien auf der Ideallinie der Kurven: wer sauber faehrt, sammelt sie
 for(let k=0;k<10;k++){const d0=length*((k+.35)/10);if(ramps.some(r=>Math.abs(wrapDiff(d0,r.d))<30)||inGap(d0))continue;const kap=trackAt(d0+10).kap,off=clamp(kap*120,-5,5)||Math.sin(k*2.1)*4;for(let i=0;i<5;i++)add(d0+i*4,off,1);}
 for(const r of ramps)if(!r.gap)[[5,2.4],[9,3.3],[13,3]].forEach(([dd,l])=>add(r.end+dd,r.off,l+RAMP_H));
 const m=new T.MeshStandardMaterial({color:0xfff27a,emissive:0xffb627,emissiveIntensity:1.2,roughness:.35,flatShading:true});sporeMesh=new T.InstancedMesh(new T.IcosahedronGeometry(.45,0),m,Math.max(1,spores.length));sporeMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);sporeMesh.castShadow=false;world.add(sporeMesh);}
function buildStands(){if(!P.grandstand)return;const fans=[],v=new T.Vector3();for(const [cp,off] of course.stands){const d=cpDist(cp),s=sample(d,off),tp=sample(d,0).p,g=cloneProto(P.grandstand);g.position.set(s.p.x,0,s.p.z);g.rotation.y=Math.atan2(tp.x-s.p.x,tp.z-s.p.z);world.add(g);g.updateMatrixWorld(true);
  for(let k=-8;k<=8;k+=4){v.set(k,0,-1.5).applyMatrix4(g.matrixWorld);addObstacle(v.x,v.z,2.8);}
  for(let row=0;row<4;row++)for(let i=0;i<18;i++){v.set(-8.1+i*.95,.45+row*.75+.16,-(row*1.1-.2)).applyMatrix4(g.matrixWorld);fans.push({x:v.x,y:v.y,z:v.z,ry:g.rotation.y+(Math.sin(i*7.3+row)*.35),ph:(i*1.7+row*2.3)%TAU,d,col:FAN_COLS[(row*7+i*3)%FAN_COLS.length]});}}
 if(!P.spectator||!fans.length)return;const insts=[];P.spectator.traverse(o=>{if(!o.isMesh)return;const im=new T.InstancedMesh(o.geometry,o.material,fans.length);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.castShadow=false;if(o.material.name==='FanCap'){const c=new T.Color();fans.forEach((f,i)=>im.setColorAt(i,c.setHex(f.col)));}world.add(im);insts.push(im);});crowd={fans,insts};updateCrowd(0);}
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_s=new T.Vector3(),_v=new T.Vector3();
function updateCrowd(now){if(!crowd)return;const p=racers[0],party=state==='finished'||state==='ceremony';crowd.fans.forEach((f,i)=>{const cheer=party||(p&&Math.abs(wrapDiff(p.distance,f.d))<75);const y=f.y+(cheer?Math.abs(Math.sin(now*.011+f.ph))*.45:Math.sin(now*.003+f.ph)*.03);_e.set(0,f.ry,cheer?Math.sin(now*.02+f.ph)*.12:0);_q.setFromEuler(_e);_m.compose(_v.set(f.x,y,f.z),_q,_s.set(1.5,1.5,1.5));for(const im of crowd.insts)im.setMatrixAt(i,_m);});for(const im of crowd.insts)im.instanceMatrix.needsUpdate=true;}
function updateSpores(dt,now){if(!sporeMesh)return;spores.forEach((s,i)=>{if(s.cd>0)s.cd-=dt;const vis=s.cd<=0?1:0;_e.set(0,now*.002+s.ph,.4);_q.setFromEuler(_e);_m.compose(_v.set(s.x,s.y+Math.sin(now*.004+s.ph)*.18,s.z),_q,_s.set(vis,vis,vis));sporeMesh.setMatrixAt(i,_m);});sporeMesh.instanceMatrix.needsUpdate=true;}
function updateSwingers(t=elapsed){const pl=racers[0];for(const s of swingers){const off=Math.sin(t*s.spd+s.ph)*s.amp,p=sample(s.d,off).p;s.x=p.x;s.z=p.z;
 if(s.kind==='ghost'){s.y=p.y+.9+Math.sin(t*2.2+s.ph)*.45;s.mesh.position.set(p.x,s.y,p.z);const face=pl?Math.atan2(pl.x-p.x,pl.z-p.z):t;s.mesh.rotation.set(0,face,-Math.cos(t*s.spd+s.ph)*.25);const near=pl&&Math.hypot(pl.x-p.x,pl.z-p.z)<18;s.boo=(s.boo||0)+((near?1:0)-(s.boo||0))*.08;s.mesh.scale.setScalar(1.2+s.boo*.35);}
 else{s.mesh.position.copy(p);s.mesh.rotation.y=t*1.5+s.ph;}}}

// ---------------------------------------------------------------- Partikel (Pool, keine Allokation im Rennen)
const sparkGeo=new T.BoxGeometry(.16,.16,.16),sparkMats=new Map(),sparkGroup=new T.Group();scene.add(sparkGroup);sharedGeo.add(sparkGeo);
const sparkMat=c=>{let m=sparkMats.get(c);if(!m){m=new T.MeshBasicMaterial({color:c});sparkMats.set(c,m);persistentMats.add(m);}return m;};
const sparkPool=Array.from({length:220},()=>{const m=new T.Mesh(sparkGeo,sparkMat(0xffffff));m.visible=false;sparkGroup.add(m);return {m,v:new T.Vector3(),life:0};});let sparkIdx=0;
function emit(x,y,z,color,vx,vy,vz,life=.5){const s=sparkPool[sparkIdx++%sparkPool.length];s.m.material=sparkMat(color);s.m.position.set(x,y,z);s.v.set(vx,vy,vz);s.life=life;s.m.visible=true;}
function burst(r,color,n=5){const p=r.mesh.position;for(let i=0;i<n;i++){const a=Math.random()*TAU;emit(p.x,p.y+.5,p.z,color,Math.sin(a)*4,2+Math.random()*3,Math.cos(a)*4,.6);}}
const marks=new T.Group();scene.add(marks);
const markGeo=new T.PlaneGeometry(.32,.95);markGeo.rotateX(-Math.PI/2);sharedGeo.add(markGeo);
const skids=Array.from({length:140},()=>{const m=new T.Mesh(markGeo,new T.MeshBasicMaterial({color:0x14181f,transparent:true,opacity:.4,depthWrite:false}));m.visible=false;marks.add(m);return{m,mat:m.material,life:0};});
let skidIdx=0;
function dropSkid(x,y,z,angle){const s=skids[skidIdx++%skids.length];s.m.position.set(x,y+.08,z);s.m.rotation.y=angle;s.mat.opacity=.4;s.life=5;s.m.visible=true;}
const puffGeo=new T.SphereGeometry(.18,8,6);sharedGeo.add(puffGeo);
function dropPuff(r,color=0xdfe8e8){if(puffs.length>=30)return;const m=new T.Mesh(puffGeo,new T.MeshBasicMaterial({color,transparent:true,opacity:.4,depthWrite:false}));const s=Math.sin(r.h),c=Math.cos(r.h);m.position.set(r.x-s*1.4,r.y+.5,r.z-c*1.4);actors.add(m);puffs.push({m,v:new T.Vector3(-s*2+(Math.random()-.5),.9,-c*2+(Math.random()-.5)),life:.75});}

// ---------------------------------------------------------------- Kart-Physik (vertikal), Kollisionen, Darstellung
function vertical(r,dt){const {y:ground,rh}=groundAt(r.distance,r.offset);
 if(r.y===undefined){r.y=ground;r.vy=0;r.air=false;r.airT=0;r.trick=0;r.lastGround=ground;r.rampY=0;r.padCd=0;r.ringCd=0;r.stall=0;r.driftVis=0;}
 const roadVy=clamp((ground-r.lastGround)/Math.max(dt,1e-3),-45,45);r.lastGround=ground;
 if(r.air){r.vy-=G*dt;r.y+=r.vy*dt;r.airT+=dt;if(r.y<ground-1.5&&r.vy<0&&ground>-20){respawn(r);return;}if(r.y<=ground&&ground>-20)land(r,ground,roadVy);}
 else if(!rh&&r.rampY>RAMP_H*.55){r.air=true;r.airT=0;r.vy=Math.min(16,6+Math.max(0,r.speed)*.22+(r.onGapRamp?2:0));r.y+=r.vy*dt;if(nearPlayer(r,50))SFX.ramp(r.id===0?1:.4);}
 else{const cand=r.y+r.vy*dt-.5*G_STICK*dt*dt;if(cand>ground+.06&&r.speed>12){r.air=true;r.airT=0;r.y=cand;r.vy-=G*dt;}else{r.y=ground;r.vy=roadVy;}}
 r.rampY=rh&&!r.air?rh.y:0;r.onGapRamp=rh?rh.ramp.gap:false;if(r.trick>0)r.trick=Math.min(.45,r.trick+dt);
 if(r.y<-4)respawn(r);}
function land(r,ground,roadVy){const impact=r.vy-roadVy,me=r.id===0;r.y=ground;r.vy=roadVy;r.air=false;r.airT=0;if(impact<-4)r.squash=clamp(-impact/40,.1,.3);
 if(r.trick>0){if(r.trick>=.42){r.boost=Math.max(r.boost,1.1);burst(r,0x7ceaff,14);if(me){stats.tricks++;SFX.trick();say('trick');toast('TRICK-TURBO!',1,'good');}}else{r.vx*=.7;r.vz*=.7;if(me)toast('WACKLIG!',.8,'bad');}r.trick=0;}
 if(me&&impact<-9){shake=Math.max(shake,Math.min(.3,-impact*.012));dropPuff(r);dropPuff(r);SFX.land(clamp(-impact/25,.25,1));}}
function startTrick(r){r.trick=.001;if(r.id===0)SFX.whoosh();}
// Rettungspilz: nach einem Sturz in die Schlucht zurueck vor die Anlaufstrecke
function respawn(r){const me=r.id===0,d=r.safeD??0,s=sample(d,0),fell=gaps.some(g=>Math.abs(wrapDiff(g.c,lapDist(r.distance)))<40);r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.vx=r.vz=0;r.speed=0;r.distance+=wrapDiff(d,lapDist(r.distance));r.offset=0;r.y=s.p.y+2.2;r.vy=0;r.air=true;r.airT=0;r.trick=0;r.driftDir=0;r.drift=0;r.stun=.5;r.lastGround=s.p.y;
 if(me&&stats){stats.falls++;toast(fell?'RETTUNGSPILZ! Mit mehr Tempo über die Schanze':'RETTUNGSPILZ!',2,'bad');if(fell)SFX.splash();shake=.3;}}
const nearPlayer=(r,range)=>racers[0]&&Math.abs(r.distance-racers[0].distance)<range;
function collideStatic(r){const ix=Math.floor(r.x/16),iz=Math.floor(r.z/16);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const cell=obsGrid.get((ix+a+500)*1000+(iz+b+500));if(!cell)continue;for(const o of cell){const dx=r.x-o.x,dz=r.z-o.z,rr=o.r+1.05,d2=dx*dx+dz*dz;if(d2<rr*rr&&r.y<o.h){const d=Math.sqrt(d2)||1,nx=dx/d,nz=dz/d;r.x=o.x+nx*rr;r.z=o.z+nz*rr;bounce(r,nx,nz);}}}
 for(const s of swingers){if(s.kind==='ghost')continue;const dx=r.x-s.x,dz=r.z-s.z,rr=2.3+1.05,d2=dx*dx+dz*dz;if(d2<rr*rr&&r.y<trackAt(s.d).h+3){const d=Math.sqrt(d2)||1,nx=dx/d,nz=dz/d;r.x=s.x+nx*rr;r.z=s.z+nz*rr;bounce(r,nx,nz,true);}}
 const R=Math.hypot(r.x,r.z);if(R>189){const nx=-r.x/R,nz=-r.z/R;r.x=-nx*189;r.z=-nz*189;bounce(r,nx,nz);}}
function bounce(r,nx,nz,hard=false){const vn=r.vx*nx+r.vz*nz;if(vn>=0)return;r.vx-=nx*vn*1.4;r.vz-=nz*vn*1.4;const loss=Math.min(.6,-vn/40+(hard?.25:0));r.vx*=1-loss;r.vz*=1-loss;if(hard&&-vn>4)hitKart(r,.45,.9);
 if(r.id===0&&-vn>5){shake=Math.max(shake,Math.min(.35,-vn*.02));SFX.bump(clamp(-vn/25,.2,1));stats.bumps++;}}
function syncKart(r,dt){const s=sample(r.distance,r.offset),e=r.mesh.rotation,dot=Math.sin(r.h)*s.t.x+Math.cos(r.h)*s.t.z;
 r.driftVis=(r.driftVis||0)+((r.driftDir||0)*.38-(r.driftVis||0))*Math.min(1,dt*10);
 const hopY=r.hop>0?Math.sin((.2-r.hop)/.2*Math.PI)*.35:0;
 r.mesh.position.set(r.x,(r.y??s.p.y)+.1+hopY+(r.air?0:Math.sin(elapsed*22+r.id)*.03*(Math.abs(r.speed)/30)),r.z);e.order='YXZ';
 const spin=r.trick>0?Math.min(1,r.trick/.42)*TAU:0;e.y=r.h+r.driftVis+(r.stun>0?elapsed*14:0)+spin;
 e.x=r.air?clamp(-r.vy*.02,-.45,.45):-Math.atan(slopeAt(r.distance)*dot);e.z=-s.bank*dot+(r.id===0?-(r.steerS||0)*.07:0)-r.driftVis*.12;
 if(r.squash>0){r.squash=Math.max(0,r.squash-dt*1.4);const q=Math.sin(r.squash/.3*Math.PI)*r.squash*.55;r.mesh.scale.set(1+q*.6,1-q,1+q*.6);}else if(r.mesh.scale.y!==1)r.mesh.scale.set(1,1,1);
 const parts=r.mesh.userData.parts;if(parts){const st=r.steerS||0;for(const w of parts.wheels){w.wh.rotation.x+=(r.speed*dt)/w.r;if(w.front)w.piv.rotation.y=st*.42+(r.driftDir||0)*.12;}
  const d=parts.driver;if(d){const lean=-st*.2-(r.driftVis||0)*.3,done=r.finishTime!==null;d.rotation.z+=(lean-d.rotation.z)*Math.min(1,dt*8);d.rotation.x+=((r.air?-.2:r.boost>0?.12:0)-d.rotation.x)*Math.min(1,dt*6);
   d.position.y=.95+(r.air?.14:0)+(done?Math.abs(Math.sin(elapsed*8+r.id))*.3:0)+Math.sin(elapsed*17+r.id)*.015*Math.min(1,Math.abs(r.speed)/20);d.rotation.y=r.stun>0?Math.sin(elapsed*28)*.35:done?Math.sin(elapsed*5+r.id)*.4:0;}}
 r.mesh.userData.shield.visible=r.shield>0;const fl=r.boost>0;for(const f of r.mesh.userData.flames){f.visible=fl;if(fl)f.scale.set(1,1,.7+Math.random()*.7);}}
const keys=new Set(),tkeys=new Set(),touchPtr=new Map(),held=c=>keys.has(c)||tkeys.has(c);function steering(){return (held('ArrowLeft')||held('KeyA')?1:0)-(held('ArrowRight')||held('KeyD')?1:0);}

// ---------------------------------------------------------------- KI-Fahrer: Ideallinie, Bremspunkte, Drifts (Koennen je Klasse)
function aiInput(r,dt){const sk=r.skill,sp=Math.max(0,r.speed),look=5+sp*.38;
 let kap=0;for(let s=10;s<=26;s+=8)kap+=trackAt(r.distance+s).kap;kap/=3;
 let line=clamp(kap*90,-4,4)*sk+r.laneBias*(1-sk*.6);
 // Schanzen/Schlucht: Ideallinie auf die Rampe; Bananen und Pendelpilzen ausweichen
 for(const rp of ramps){const ahead=wrapDiff(rp.d,r.distance);if(ahead>0&&ahead<(rp.gap?95:30))line=rp.off;}
 for(const h of hazards){const p=project(h.x,h.z,r.distance),ahead=wrapDiff(p.d,r.distance);if(ahead>2&&ahead<28&&Math.abs(p.off-line)<2.4)line=p.off+(p.off>line?-3.5:3.5);}
 for(const s of swingers){const ahead=wrapDiff(s.d,r.distance);if(ahead>0&&ahead<35){const off=Math.sin((elapsed+ahead/Math.max(sp,5))*s.spd+s.ph)*s.amp;if(Math.abs(off-line)<4)line=off>0?-4.6:4.6;}}
 line=clamp(line,-6,6);r.lineS=r.lineS===undefined?line:r.lineS+(line-r.lineS)*Math.min(1,dt*2.6);line=r.lineS;
 // Pure Pursuit: Zielpunkt auf der Linie, daraus benoetigte Gierrate -> Lenkeinschlag
 const tgt=sample(r.distance+look,line).p,L=Math.hypot(tgt.x-r.x,tgt.z-r.z)||1,err=angleDiff(Math.atan2(tgt.x-r.x,tgt.z-r.z),r.h);
 const needYaw=Math.max(sp,4)*2*Math.sin(err)/L;
 let steer=needYaw/(PHYS.turn*Math.max(.2,turnCurve(sp)))+Math.sin(elapsed*1.3+r.id*2)*.18*(1-sk);
 // Zieltempo: kleinste erlaubte Geschwindigkeit innerhalb der Bremsdistanz
 let target=PHYS.top*1.2;const brakeDecel=PHYS.brake*.8,dcap=sk>.55;
 for(let s=4;s<=12+sp*1.4;s+=4){const tr=trackAt(r.distance+s),vc=(r.driftDir||dcap?tr.vd:tr.v)*(.84+.16*sk);target=Math.min(target,Math.sqrt(vc*vc+2*brakeDecel*s));}
 const gapAhead=gaps.some(g=>{const a=wrapDiff(g.start,r.distance);return a>0&&a<120;});if(gapAhead)target=99;
 const gas=sp<target-.3,brake=sp>target+2.5&&!gapAhead;
 // Drift: nur bei langen Kurven; Radius per Gegenlenken regeln; Ladestufe je Koennen, Release wenn die Kurve oeffnet
 let drift=false;r.driftCd=Math.max(0,r.driftCd-dt);
 let turnAhead=0;for(let s=6;s<=46;s+=4)turnAhead+=trackAt(r.distance+s).kap*4;
 if(r.driftDir){const f=(needYaw*r.driftDir)/(PHYS.turn*Math.min(1,sp/10)),goal=sk>.85?2.35:sk>.6?1.45:.75;
  let exitSoon=0;for(let s=4;s<=20;s+=4)exitSoon+=trackAt(r.distance+s).kap*4;
  drift=!(f<.12||(r.drift>=goal&&Math.abs(exitSoon)<.28)||Math.abs(r.offset)>7.2||gapAhead);
  if(drift)steer=clamp(((f-.35)/.7)*2-1,-1,1)*r.driftDir;}
 else if(Math.abs(turnAhead)>.75&&sp>17&&r.driftCd<=0&&!r.air&&!gapAhead&&Math.abs(r.offset)<5){r.driftCd=1.5;if(Math.random()<sk*.95){drift=true;steer=Math.sign(turnAhead);}}
 return {gas,brake,steer:clamp(steer,-1,1),drift};}
function aiItems(r,order){if(r.cooldown>0||!r.item||r.itemPending)return;const pl=order.indexOf(r),ahead=order[pl-1],behind=order[pl+1],kap=Math.abs(trackAt(r.distance+20).kap);
 const use=r.item==='shell'?ahead&&ahead.distance-r.distance<70:r.item==='banana'?behind&&r.distance-behind.distance<35:r.item==='boost'||r.item==='triple'?kap<1/80:true;
 if(use){useItem(r);r.cooldown=r.item==='triple'?1.2:2.5;}}

// ---------------------------------------------------------------- Audio: Sprecher, SFX (ElevenLabs), Musik
let audioReady=false;
function armAudio(){if(audioReady)return;audioReady=true;if(soundOn){audioInit();playBgm(state==='menu'||state==='finished'?'menu':raceTrack());if(state==='menu')say('welcome');}}
addEventListener('pointerdown',armAudio,{once:true});addEventListener('keydown',armAudio,{once:true});
const VOICE={start:'Auf die Plätze — fertig — los!',lap2:'Runde zwei',lastlap:'Letzte Runde!',turbo:'Turbo!',hit:'Volltreffer!',ouch:'Autsch!',banana:'Banane gelegt!',shield:'Sternenschild!',lead:'Du führst!',win:'Erster Platz!',podium:'Aufs Treppchen!',finish:'Im Ziel!',best:'Neue Bestzeit!',welcome:'Willkommen bei Mushroom Rally!',rocket:'Raketenstart!',early:'Zu früh!',trick:'Super Trick!',spores:'Volle Sporen-Power!',gpnext:'Weiter zum nächsten Rennen!',gpwin:'Grand-Prix-Sieger!',gppodium:'Aufs Grand-Prix-Treppchen!',gpfinish:'Grand Prix beendet!'};
const VIP=new Set(['start','lap2','lastlap','win','podium','finish','best','gpnext','gpwin','gppodium','gpfinish']);
const SFX_MAX={pickup:1.2,banana:1.6,hit:1,cheer:4,jingle:8,goodtry:6,finallap:4,spore:.6,ramp:1.3,trick:1.1,rocket:1.8};
const CLIPS={};for(const k of Object.keys(VOICE))CLIPS['v_'+k]='assets/audio/voice/'+k+'.mp3';for(const k of Object.keys(SFX_MAX))CLIPS['s_'+k]='assets/audio/sfx/'+k+'.mp3';
const clipData={},clipBuf={},clipFail={},clipNorm={};let voiceGain=null,sfxGain=null,voiceSrc=null,voiceKey=null,voiceQueue=null,pendingVoice=null,duckUntil=0,ducked=false,engine=null,raceFilter=null;
for(const [k,url] of Object.entries(CLIPS))clipData[k]=fetch(url).then(r=>{if(!r.ok)throw new Error(url);return r.arrayBuffer();}).catch(()=>{clipFail[k]=true;return null;});
function prepClip(k,b){const sr=b.sampleRate,ch=b.numberOfChannels,d0=b.getChannelData(0),thr=.004;let start=0;while(start<d0.length&&Math.abs(d0[start])<thr)start++;start=Math.max(0,start-Math.floor(sr*.005));const max=k.startsWith('s_')?SFX_MAX[k.slice(2)]:10;let end=Math.min(d0.length,start+Math.floor(sr*max)),e=end-1;while(e>start&&Math.abs(d0[e])<thr)e--;end=Math.min(end,e+Math.floor(sr*.03));
 const len=Math.max(1,end-start),out=ctx.createBuffer(ch,len,sr),fade=Math.min(len,Math.floor(sr*.04));let sum=0,n=0;for(let c=0;c<ch;c++){const dst=out.getChannelData(c);dst.set(b.getChannelData(c).subarray(start,end));for(let i=0;i<fade;i++)dst[len-1-i]*=i/fade;if(c===0)for(let i=0;i<len;i+=3){sum+=dst[i]*dst[i];n++;}}
 clipNorm[k]=clamp((k.startsWith('v_')?.1:.12)/Math.max(Math.sqrt(sum/Math.max(1,n)),1e-4),.3,3);return out;}
function decodeClips(){for(const k of Object.keys(CLIPS))clipData[k].then(ab=>ab&&ctx.decodeAudioData(ab)).then(b=>{if(!b)return;clipBuf[k]=prepClip(k,b);if(pendingVoice&&'v_'+pendingVoice.key===k&&performance.now()-pendingVoice.t<900){const key=pendingVoice.key;pendingVoice=null;say(key);}}).catch(()=>{clipFail[k]=true;});}
function playClip(k,bus,vol=1,rate=1){const b=clipBuf[k];if(!soundOn||!b||!ctx)return null;const s=ctx.createBufferSource();s.buffer=b;s.playbackRate.value=rate;const g=ctx.createGain();g.gain.value=vol*(clipNorm[k]||1);s.connect(g);g.connect(bus||ctx.destination);s.start();return s;}
function speak(text){if(!('speechSynthesis' in window))return;try{const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith('de'));if(v)u.voice=v;u.rate=1.1;u.volume=.6;speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}}
function say(key){if(!soundOn||!VOICE[key])return;const now=performance.now(),busy=voiceSrc&&now<duckUntil;
 if(busy&&VIP.has(voiceKey)){if(VIP.has(key))voiceQueue=key;return;}
 if(ctx&&clipBuf['v_'+key]){try{voiceSrc?.stop();}catch{}voiceSrc=playClip('v_'+key,voiceGain,1);voiceKey=key;duckUntil=now+clipBuf['v_'+key].duration*1000+180;return;}
 if(!clipFail['v_'+key]){pendingVoice={key,t:now};return;}speak(VOICE[key]);}
function stopVoice(){try{voiceSrc?.stop();}catch{}voiceSrc=null;voiceQueue=null;pendingVoice=null;duckUntil=0;try{speechSynthesis.cancel();}catch{}}
function duckBgm(now){if(voiceQueue&&now>=duckUntil){const k=voiceQueue;voiceQueue=null;say(k);}ducked=now<duckUntil;bgmTick(now);}
function audioInit(){if(ctx)return;ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});
 const o1=ctx.createOscillator();o1.type='sawtooth';const o2=ctx.createOscillator();o2.type='square';const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700;f.Q.value=1.1;const g=ctx.createGain();g.gain.value=0;o1.connect(f);o2.connect(f);f.connect(g);g.connect(ctx.destination);o1.start();o2.start();
 const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=950;bp.Q.value=3.2;const ng=ctx.createGain();ng.gain.value=0;ns.connect(bp);bp.connect(ng);ng.connect(ctx.destination);ns.start();
 engine={o1,o2,f,g,noise:ng,bp};
 voiceGain=ctx.createGain();voiceGain.gain.value=.78;voiceGain.connect(ctx.destination);sfxGain=ctx.createGain();sfxGain.gain.value=.6;sfxGain.connect(ctx.destination);buildRaceFilter();decodeClips();}
function sfxNoise(dur,f0,f1,vol=.2,q=2){if(!soundOn||!ctx)return;const t=ctx.currentTime,b=ctx.createBuffer(1,Math.max(1,ctx.sampleRate*dur|0),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=ctx.createBufferSource();s.buffer=b;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=q;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);const gg=ctx.createGain();gg.gain.setValueAtTime(vol,t);gg.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(bp);bp.connect(gg);gg.connect(ctx.destination);s.start();}
function sfxTone(f0,f1,dur,type='square',vol=.08,delay=0){if(!soundOn||!ctx)return;const t=ctx.currentTime+delay,o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);const gg=ctx.createGain();gg.gain.setValueAtTime(vol,t);gg.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(gg);gg.connect(ctx.destination);o.start(t);o.stop(t+dur+.02);}
const SFX={
 pickup(){if(playClip('s_pickup',sfxGain,.6))return;[880,1108,1318].forEach((f,i)=>sfxTone(f,f,.09,'square',.05,i*.07));},
 tick(){sfxTone(1500,1400,.03,'square',.018);},
 boost(){sfxNoise(.5,400,3200,.18,1.5);sfxTone(180,760,.35,'sawtooth',.035);},
 mt(level){const base={mini:520,super:660,ultra:880}[level]||520;[1,1.25,1.5].forEach((m,i)=>sfxTone(base*m,base*m*1.02,.09,'square',.045,i*.05));sfxNoise(.45,500,3600,level==='ultra'?.22:.14,1.4);},
 overtake(){sfxTone(988,1318,.08,'triangle',.05);},
 shell(){sfxTone(900,180,.22,'sawtooth',.06);sfxNoise(.15,2000,400,.08,2);},
 banana(){sfxTone(520,220,.3,'triangle',.07);},
 slip(v=1){if(playClip('s_banana',sfxGain,.8*v))return;sfxTone(520,160,.45,'triangle',.08*v);},
 shield(){[660,880,1320].forEach((f,i)=>sfxTone(f,f*.99,.4,'triangle',.035,i*.03));},
 hit(v=1){if(playClip('s_hit',sfxGain,.9*v))return;sfxTone(160,60,.25,'square',.1*v);sfxNoise(.18,300,90,.1*v,1);},
 bump(v=1){sfxTone(130,55,.16,'sine',.16*v);sfxNoise(.12,700,150,.1*v,1);},
 splash(){sfxNoise(.9,1800,200,.25,.8);sfxTone(300,90,.5,'sine',.08);},
 cheer(){playClip('s_cheer',sfxGain,.6);},
 lap(){sfxTone(784,784,.1,'square',.05);sfxTone(1046,1046,.22,'square',.05,.11);},
 fanfare(){[523,659,784,1046].forEach((f,i)=>sfxTone(f,f,i===3?.5:.13,'square',.06,i*.12));},
 count(go){sfxTone(go?880:440,go?880:440,go?.28:.12,'square',.07);},
 rocket(){if(playClip('s_rocket',sfxGain,.9))return;sfxNoise(.7,300,2600,.2,1.2);},
 ramp(v=1){if(playClip('s_ramp',sfxGain,.7*v))return;sfxTone(200,620,.3,'sine',.08*v);},
 boing(v=1){if(playClip('s_ramp',sfxGain,.7*v,1.25))return;sfxTone(160,700,.35,'triangle',.1*v);},
 trick(){if(playClip('s_trick',sfxGain,.8,1.1))return;sfxTone(600,1500,.25,'triangle',.07);},
 whoosh(){sfxNoise(.3,500,2500,.1,1.4);},
 ring(){[988,1318,1760].forEach((f,i)=>sfxTone(f,f,.12,'triangle',.05,i*.05));},
 spore(n){if(playClip('s_spore',sfxGain,.4,1+n*.035))return;sfxTone(1200+n*60,1800+n*60,.08,'sine',.05);},
 land(v){sfxTone(110,45,.2,'sine',.14*v);sfxNoise(.14,500,120,.08*v,1);},
 spook(v=1){sfxTone(620,170,.6,'triangle',.07*v);sfxTone(640,185,.6,'sine',.05*v,.05);sfxNoise(.5,900,260,.07*v,2);},
 wrong(){sfxTone(300,300,.12,'square',.04);sfxTone(240,240,.18,'square',.04,.14);}};
const BGM_SRC={menu:'bgm_menu.mp3',race:'bgm_race.mp3',sunset:'bgm_sunset.mp3',night:'bgm_night.mp3'},RACE_TRACKS=['race','sunset','night'],BGM_VOL=.62,BGM_XF=2.2;
const TRACK_GAIN={menu:1.07,race:1,sunset:.94,night:.91};
const bgm={current:null,ready:{},failed:{},tracks:{},rate:1};
for(const [name,src] of Object.entries(BGM_SRC)){const els=[0,1].map(()=>{const a=new Audio('assets/audio/'+src);a.preload=name==='menu'?'auto':'metadata';a.volume=0;return a;});els[0].addEventListener('canplaythrough',()=>bgm.ready[name]=true);els[0].addEventListener('error',()=>bgm.failed[name]=true);bgm.tracks[name]={els,gains:null,active:0,xf:-1,t0:0};}
const raceTrack=()=>{const m=courses[selected].music;return bgm.failed[m]?'race':m;};
function buildRaceFilter(){if(raceFilter||!ctx)return;try{raceFilter=ctx.createBiquadFilter();raceFilter.type='lowpass';raceFilter.frequency.value=4000;raceFilter.connect(ctx.destination);for(const n of RACE_TRACKS){const tr=bgm.tracks[n];tr.gains=tr.els.map(a=>{const g=ctx.createGain();g.gain.value=0;ctx.createMediaElementSource(a).connect(g);g.connect(raceFilter);a.volume=1;return g;});}}catch{raceFilter=null;}}
function setTrackVol(tr,i,v){if(tr.gains)tr.gains[i].gain.value=v;else tr.els[i].volume=clamp(v,0,1);}
function setBgmRate(rate){bgm.rate=rate;const tr=bgm.tracks[bgm.current];if(!tr)return;for(const a of tr.els){a.preservesPitch=false;a.mozPreservesPitch=false;a.playbackRate=rate;}}
function stopBgm(){for(const tr of Object.values(bgm.tracks))tr.els.forEach((a,i)=>{a.pause();setTrackVol(tr,i,0);});bgm.current=null;}
function playBgm(name){if(!soundOn||bgm.failed[name])return;if(bgm.current===name)return;stopBgm();const tr=bgm.tracks[name];tr.active=0;tr.xf=-1;tr.t0=performance.now();for(const a of tr.els)a.playbackRate=1;bgm.rate=1;const a=tr.els[0];try{a.currentTime=0;}catch{}bgm.current=name;a.play().catch(()=>{if(bgm.current===name)bgm.current=null;});}
function bgmTick(now){const tr=bgm.tracks[bgm.current];if(!tr)return;const a=tr.els[tr.active],b=tr.els[1-tr.active],dur=a.duration,base=BGM_VOL*TRACK_GAIN[bgm.current]*(ducked?.58:1)*Math.min(1,(now-tr.t0)/700),xfDur=BGM_XF*bgm.rate;
 if(tr.xf<0&&isFinite(dur)&&dur>BGM_XF*3&&a.currentTime>dur-xfDur){tr.xf=now;try{b.currentTime=0;}catch{}if(b.currentTime>1)b.load();b.playbackRate=bgm.rate;b.play().catch(()=>{});}
 let va=1,vb=0;if(tr.xf>=0){const k=Math.min(1,(now-tr.xf)/(BGM_XF*1000));va=Math.cos(k*Math.PI/2);vb=Math.sin(k*Math.PI/2);if(k>=1){a.pause();tr.active=1-tr.active;tr.xf=-1;setTrackVol(tr,1-tr.active,0);setTrackVol(tr,tr.active,base);return;}}
 setTrackVol(tr,tr.active,base*va);setTrackVol(tr,1-tr.active,base*vb);}
function setSound(){soundOn=!soundOn;if(soundOn)audioInit();if(engine)engine.g.gain.value=0;if(!soundOn){stopBgm();stopVoice();}else playBgm(state==='menu'||state==='finished'||state==='ceremony'?'menu':raceTrack());$('sound').textContent=soundOn?'♪ AN':'♪ AUS';$('sound').setAttribute('aria-label',soundOn?'Ton ausschalten':'Ton einschalten');}

// ---------------------------------------------------------------- Spielablauf
function newStats(){return {mt:{mini:0,super:0,ultra:0},drafts:0,tricks:0,rings:0,hitsDealt:0,hitsTaken:0,overtakes:0,bestLap:Infinity,lapStart:0,falls:0,bumps:0,maxSpores:0};}
function start(){if(gp.active)selected=gp.race;syncTrackButtons();keys.clear();buildCourse();state='countdown';elapsed=0;countdown=3;startPress=-1;noticeTimer=0;stats=newStats();
 for(const id of ['menu','result','ceremony','pausePanel'])$(id).hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('touch').hidden=false;$('gpBadge').hidden=!gp.active;$('hud').classList.toggle('tt',isTT());$('ttGhost').hidden=$('ttMedal').hidden=!isTT();if(isTT())for(const b of boxes)b.cooldown=1e9;
 document.body.classList.add('racing');document.body.classList.remove('cer');if(soundOn)audioInit();finishMusicAt=0;playBgm(raceTrack());setBgmRate(course.bgmRate||1);stopVoice();say('start');updateCamera(1,true);
 toast(`${course.name} · ${isTT()?'Zeitfahren':cc+'cc'}`,2.2);if(isTT()&&ghost)setTimeout(()=>toast('👻 Dein Geist fährt mit – schlag ihn!',2),2300);if(coarseInput){wantFs=true;enterFs();}}
function home(){gp.active=false;state='menu';keys.clear();buildCourse();for(const id of ['hud','touch','pause','pausePanel','result','ceremony'])$(id).hidden=true;$('menu').hidden=false;setText('message','');document.body.classList.remove('racing','cer');if(engine)engine.g.gain.value=0;stopVoice();finishMusicAt=0;playBgm('menu');refreshMenu();}
let beforePause='race';function pause(){if(state==='paused'){state=beforePause;$('pausePanel').hidden=true;}else if(state==='race'||state==='countdown'){beforePause=state;state='paused';keys.clear();$('pausePanel').hidden=false;stopVoice();}if(engine)engine.g.gain.value=soundOn&&state==='race'?.011:0;}
function use(){if(state!=='race')return;useItem(racers[0]);}
function useItem(r){if(r.itemPending)return null;const prevStun=racers.map(x=>x.stun),res=activate(r,racers);if(!res)return null;const me=r.id===0;
 if(res.type==='shell'&&res.target!==undefined)racers[res.target].stun=prevStun[res.target];
 if(me&&(res.type==='boost'||res.type==='triple'))SFX.boost();else if(me&&SFX[res.type])SFX[res.type]();
 if(res.type==='banana')dropBanana(r);if(res.type==='shell')fireShell(r,res.target);
 if(me){if(res.type==='boost'||res.type==='triple')say('turbo');if(res.type==='shield')say('shield');if(res.type==='banana')say('banana');notice({boost:'TURBO!',triple:'TURBO ×'+(res.charges||0),shield:'STERNENSCHILD',banana:'BANANE!',shell:'SUCH-PANZER!'}[res.type],.8);}
 return res;}
const MAX_HAZARDS=14;
function dropBanana(r){if(hazards.length>=MAX_HAZARDS){const old=hazards.shift();actors.remove(old.mesh);}const x=r.x-Math.sin(r.h)*3.2,z=r.z-Math.cos(r.h)*3.2,g=new T.Group();actors.add(g);g.position.set(x,r.y,z);g.rotation.y=Math.random()*TAU;if(P.banana){const b=cloneProto(P.banana);b.scale.setScalar(1.6);g.add(b);}else mesh(new T.ConeGeometry(.6,1.3,5),gold,g,0,.7,0);hazards.push({mesh:g,x,z,y:r.y,life:25,owner:r.id,arm:.4});}
function fireShell(r,target){const g=new T.Group();if(P.shell){const s=cloneProto(P.shell);s.scale.setScalar(1.25);g.add(s);}else sphere(g,mat(0x5cc46a),0,.4,0,.55,.4,.55);actors.add(g);shots.push({g,d:r.distance+2.5,off:r.offset,owner:r.id,target,t:0});}
function hitSpores(r){const lost=loseSpores(r);if(lost){const p=r.mesh.position;for(let i=0;i<lost*3;i++){const a=Math.random()*TAU;emit(p.x,p.y+.8,p.z,0xfff27a,Math.sin(a)*5,4+Math.random()*3,Math.cos(a)*5,.9);}}return lost;}
function shellImpact(sh){const t=racers[sh.target],me=sh.owner===0,onMe=sh.target===0,near=nearPlayer(t,60);
 if(t.shield>0){burst(t,0xffe263,14);if(onMe)toast('ABGEWEHRT!',.9,'good');if(near)SFX.shield();return;}
 if(t.finishTime===null){hitKart(t,1.6,.25);hitSpores(t);}burst(t,0x8beb73,18);if(me||onMe||near)SFX.hit(me||onMe?1:.5);
 if(me){stats.hitsDealt++;say('hit');toast('VOLLTREFFER!',1,'good');}if(onMe){stats.hitsTaken++;say('ouch');toast('AUTSCH! −✦',1,'bad');shake=.45;}}
function updateShots(dt){for(let i=shots.length-1;i>=0;i--){const sh=shots[i];sh.t+=dt;const tg=sh.target!==undefined?racers[sh.target]:null;sh.d+=((tg?Math.max(tg.speed,0):Math.max(racers[sh.owner].speed,20))+24)*dt;if(tg)sh.off+=(tg.offset-sh.off)*Math.min(1,dt*5);const s=sample(sh.d,sh.off);sh.g.position.set(s.p.x,s.p.y+.15+Math.abs(Math.sin(sh.t*18))*.18,s.p.z);sh.g.rotation.y+=dt*16;
  if((tg&&sh.d>=tg.distance-1.2)||(!tg&&sh.t>1.2)||sh.t>4.5){if(tg)shellImpact(sh);else burst({mesh:sh.g},0x8beb73,8);actors.remove(sh.g);shots.splice(i,1);}}}

function update(dt){
 if(state==='ceremony'){updateCeremony(dt);return;}
 if(state!=='race'&&state!=='countdown')return;
 const player=racers[0],gasHeld=held('ArrowUp')||held('KeyW');
 if(state==='countdown'){const prev=Math.ceil(countdown);countdown-=dt;if(gasHeld){if(startPress<0)startPress=countdown;}else startPress=-1;
  if(Math.ceil(countdown)!==prev)SFX.count(countdown<=0);setLights(countdown>2?1:countdown>1?2:countdown>0?3:4);setText('message',countdown>0?String(Math.ceil(countdown)):'LOS!');
  if(engine&&ctx){const t=ctx.currentTime;engine.o1.frequency.setTargetAtTime(gasHeld?170:60,t,.08);engine.o2.frequency.setTargetAtTime(gasHeld?85:30,t,.08);engine.f.frequency.setTargetAtTime(gasHeld?1500:500,t,.1);engine.g.gain.setTargetAtTime(soundOn?.008:0,t,.1);}
  if(countdown<=0){state='race';notice('LOS!',.8);stats.lapStart=0;if(isTT()){player.item='triple';player.charges=3;}
   const fx=Math.sin(player.h),fz=Math.cos(player.h);
   if(gasHeld&&startPress>0&&startPress<=1.0){player.boost=Math.max(player.boost,1.5);player.vx=fx*16;player.vz=fz*16;SFX.rocket();say('rocket');toast('RAKETENSTART!',1.2,'good');burst(player,0xffa53d,20);}
   else if(gasHeld&&startPress>=2.2){player.stall=1.1;say('early');toast('ZU FRÜH! Motor abgewürgt',1.4,'bad');}
   for(const r of racers)if(r.id&&Math.random()<CLASSES[cc].skill*.6){r.boost=.9;}}
  for(const r of racers)syncKart(r,dt);return;}
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
  if(!me)aiItems(r,order);
  const offroad=!r.air&&Math.abs(r.offset)>8.6&&!inGap(r.distance),s=trackAt(r.distance),tan=sample(r.distance),dot=Math.sin(r.h)*tan.t.x+Math.cos(r.h)*tan.t.z;
  // Mildes Gummiband: Rivalen weit vorn werden minimal langsamer, weit hinten minimal schneller (Sieg bleibt verdient)
  const rubber=me?1:1+clamp((player.distance-r.distance)/400,-1,1)*cls.rubber,speedMul=me?1:cls.ai*(.96+.04*r.skill)*rubber;
  const oldLap=lap(r,length),oldBoost=r.boost;
  driveKart(r,dt,input,{air:r.air,offroad,slope:slopeAt(r.distance)*dot,speedMul});
  collideStatic(r);
  // KI haengt fest (Hindernis, Wand): nach kurzer Zeit per Rettungspilz zurueck auf die Strecke
  if((!me||autopilot)&&input.gas&&!r.air&&Math.abs(r.speed)<3&&r.stun<=0){r.stuckT=(r.stuckT||0)+dt;if(r.stuckT>1.6){r.stuckT=0;respawn(r);}}else r.stuckT=0;
  let pr=project(r.x,r.z,r.distance),skipped=false;
  // Weit neben der lokalen Projektion (Kurve abgeschnitten): global neu zuordnen; grosse Abkuerzungen setzen zurueck.
  if(Math.abs(pr.off)>14){const g2=project(r.x,r.z,projectGlobal(r.x,r.z));if(Math.abs(g2.off)<9){const jump=wrapDiff(g2.d,lapDist(r.distance));if(jump>60){respawn(r);if(me)toast('ABKÜRZUNG ZÄHLT NICHT!',1.6,'bad');skipped=true;}else{r.distance+=jump;pr=g2;}}}
  if(!skipped){advanceProgress(r,pr.d,length);r.offset=pr.off;}
  vertical(r,dt);
  if(!r.air&&Math.abs(r.offset)<ROAD_HALF&&!r.rampY){const toGap=gaps.find(g=>{const a=wrapDiff(g.start,r.distance);return a>0&&a<95;});if(!toGap)r.safeD=lapDist(r.distance);}
  if(r.lastMT){r.mts=(r.mts||0)+(r.lastMT==='ultra'?100:r.lastMT==='super'?10:1);if(me){stats.mt[r.lastMT]++;SFX.mt(r.lastMT);toast(MT_LABEL[r.lastMT]+'!',.8,'mt-'+r.lastMT);const p=r.mesh.position;for(let i=0;i<14;i++){const a=Math.random()*TAU;emit(p.x,p.y+.4,p.z,MT_COLORS[r.lastMT],Math.sin(a)*3-Math.sin(r.h)*6,1+Math.random()*2,Math.cos(a)*3-Math.cos(r.h)*6,.5);}}r.lastMT=null;}
  // Windschatten: dicht hinter einem Kart bleiben laedt einen Boost
  if(!r.air&&r.speed>17&&r.boost<=0){const sh=Math.sin(r.h),ch=Math.cos(r.h);let draft=false;for(const o of racers){if(o===r)continue;const dx=o.x-r.x,dz=o.z-r.z,f=dx*sh+dz*ch,lat=Math.abs(dx*ch-dz*sh);if(f>2.5&&f<15&&lat<1.9){draft=true;break;}}
   r.draft=draft?(r.draft||0)+dt:Math.max(0,(r.draft||0)-dt*2);if(me&&draft&&frame%3===0)for(const s of [-1,1])emit(r.x+ch*s*1.3+sh*2,r.y+1.1,r.z-sh*s*1.3+ch*2,0xe8f6ff,-sh*16,0,-ch*16,.22);
   if(r.draft>1.3){r.draft=0;r.boost=Math.max(r.boost,1);if(me){stats.drafts++;SFX.whoosh();toast('WINDSCHATTEN-BOOST!',.9,'good');}}}else if(r.air)r.draft=0;
  if(!r.air)for(const d of boostPads)if(Math.abs(wrapDiff(r.distance,d))<2.4&&Math.abs(r.offset)<5.6)r.boost=Math.max(r.boost,1);
  if(me&&r.boost>oldBoost&&oldBoost===0)SFX.boost();
  if(me&&r.stall>0&&frame%5===0)dropPuff(r);
  for(const pad of pads)if(!r.air&&r.padCd<=0&&Math.abs(wrapDiff(r.distance,pad.d))<1.9&&Math.abs(r.offset-pad.off)<2){r.air=true;r.airT=0;r.vy=11+Math.max(0,r.speed)*.1;r.y+=.1;r.boost=Math.max(r.boost,.5);r.padCd=.6;pad.squash=.45;if(nearPlayer(r,50))SFX.boing(me?1:.4);}
  for(const ring of rings)if(r.air&&r.ringCd<=0&&Math.abs(wrapDiff(r.distance,ring.d))<2.2&&Math.abs(r.offset-ring.off)<3.1&&Math.abs(r.y+.9-ring.y)<2.9){r.boost=Math.max(r.boost,1.3);r.ringCd=.8;ring.flash=.5;if(me){stats.rings++;SFX.ring();toast('RING-BOOST!',.8,'good');burst(r,0xffd45c,16);}}
  for(const sp of spores)if(sp.cd<=0&&Math.abs(wrapDiff(r.distance,sp.d))<1.8&&Math.abs(r.offset-sp.off)<1.8&&Math.abs(r.y+.8-sp.y)<2.3){sp.cd=10;if(r.spores<MAX_SPORES){r.spores++;if(me){stats.maxSpores=Math.max(stats.maxSpores,r.spores);SFX.spore(r.spores);if(r.spores===MAX_SPORES){say('spores');toast('VOLLE SPOREN-POWER!',1.2,'good');}}}}
  if(!isTT())for(const b of boxes){if(b.cooldown<=0&&!r.item&&!r.itemPending&&Math.abs(wrapDiff(r.distance,b.distance))<2.6&&Math.abs(r.offset-b.offset)<2.2&&Math.abs(r.y+1-b.baseY)<3){b.cooldown=4;if(me){r.itemPending=true;roulette={t:.95,tick:0,final:rollItem(placeOf(r),racers.length)};}else{r.item=rollItem(placeOf(r),racers.length);r.charges=r.item==='triple'?3:0;r.cooldown=1+Math.random()*2;}}}
  if(me&&lap(r,length)>oldLap){const lt=elapsed-stats.lapStart,best=lt<stats.bestLap;stats.bestLap=Math.min(stats.bestLap,lt);stats.lapStart=elapsed;const isLast=lap(r,length)===LAPS;
   toast(`RUNDE ${oldLap}: ${format(lt)}${best&&oldLap>1?' · BESTE RUNDE!':''}`,2,best&&oldLap>1?'good':'');notice(isLast?'LETZTE RUNDE!':'RUNDE 2',1.5);say(isLast?'lastlap':'lap2');if(isLast){if(!playClip('s_finallap',sfxGain,.9))SFX.lap();setBgmRate((course.bgmRate||1)*1.07);}else SFX.lap();}
  if(finish(r,length,elapsed)&&me){const lt=elapsed-stats.lapStart;stats.bestLap=Math.min(stats.bestLap,lt);}
  syncKart(r,dt);
  // Drift-Funken je Ladestufe (blau/orange/lila) an den Hinterraedern, Reifenspuren beim Rutschen
  const sx=Math.sin(r.h),cz=Math.cos(r.h);
  if(r.driftDir&&!r.air&&frame%2===0&&nearPlayer(r,90)){const lvl=r.drift>=2.3?'ultra':r.drift>=1.4?'super':r.drift>=.7?'mini':null;if(lvl)for(const side of [-1,1])emit(r.x-sx*1.3+cz*side*.9,r.y+.25,r.z-cz*1.3-sx*side*.9,MT_COLORS[lvl],-sx*3+(Math.random()-.5)*3,1.5+Math.random()*2,-cz*3+(Math.random()-.5)*3,.3);}
  if(!r.air&&(r.driftDir||Math.abs(r.slide)>2.2)&&Math.abs(r.speed)>8&&frame%3===0&&nearPlayer(r,70))for(const side of [-1,1])dropSkid(r.x-sx*.9+cz*side*.85,r.y,r.z-cz*.9-sx*side*.85,r.h);
  if(me&&offroad&&Math.abs(r.speed)>6&&frame%4===0)dropPuff(r,course.theme==='canyon'?0xe0a070:0xb7d59a);
  if(r.boost>0&&frame%3===0&&nearPlayer(r,80))emit(r.x-sx*1.8,r.y+.6,r.z-cz*1.8,0xffc04a,-sx*5,.5,-cz*5,.25);
  for(const s of swingers){if(s.kind!=='ghost'||(r.spookCd||0)>elapsed)continue;const dx=r.x-s.x,dz=r.z-s.z;if(dx*dx+dz*dz<5.3&&Math.abs(r.y+.8-s.y)<2.3){r.spookCd=elapsed+1.5;if(r.shield>0){burst(r,0xffe263,10);continue;}hitKart(r,.8,.6);loseSpores(r,1);burst(r,0xb48cff,16);if(me){stats.hitsTaken++;SFX.spook();toast('BUUUH! 👻',1.1,'bad');shake=.3;}else if(nearPlayer(r,40))SFX.spook(.4);}}
  // Bananen treffen jeden (auch den Leger nach kurzer Schonzeit), nicht in der Luft; Schild zerstoert sie.
  for(const h of hazards){if(h.life<=0||r.air||(h.owner===r.id&&h.arm>0))continue;const dx=r.x-h.x,dz=r.z-h.z;if(dx*dx+dz*dz<2.2){h.life=0;if(r.shield>0){burst(r,0xffe263,10);continue;}hitKart(r,me?1.1:1.4,.45);hitSpores(r);burst(r,0xffd23f,12);if(me){stats.hitsTaken++;SFX.slip();say('ouch');toast('AUSGERUTSCHT!',1,'bad');shake=.35;}else{if(h.owner===0)stats.hitsDealt++;if(nearPlayer(r,45))SFX.slip(h.owner===0?.8:.4);}}}
 }
 // Kart-Kollisionen (Rempeln)
 for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){const a=racers[i],b=racers[j];if(Math.abs(a.x-b.x)>3||Math.abs(a.z-b.z)>3||Math.abs(a.y-b.y)>1.2)continue;const rel=Math.hypot(a.vx-b.vx,a.vz-b.vz);if(collideKarts(a,b)&&(a.id===0||b.id===0)&&rel>6){SFX.bump(clamp(rel/25,.2,.8));shake=Math.max(shake,.15);}}
 updateShots(dt);
 const newOrder=ranking(racers),place=newOrder.indexOf(player)+1;
 if(place<lastPlace&&elapsed>2){stats.overtakes+=lastPlace-place;SFX.overtake();toast(`▲ PLATZ ${place}`,.9,'good');}
 if(place===1&&lastPlace>1&&elapsed>8&&elapsed-leadAt>15){leadAt=elapsed;say('lead');}lastPlace=place;
 // Falsche Richtung
 const tan=sample(player.distance),fdot=Math.sin(player.h)*tan.t.x+Math.cos(player.h)*tan.t.z;wrongT=fdot<-.35&&Math.abs(player.speed)>4?wrongT+dt:0;if(wrongT>1&&noticeTimer<=0){notice('FALSCHE RICHTUNG ↺',1);SFX.wrong();}
 if(engine&&ctx){const t=ctx.currentTime,sp=Math.abs(player.speed);engine.o1.frequency.setTargetAtTime(55+sp*5.2+(player.air?50:0)+(player.boost>0?30:0),t,.06);engine.o2.frequency.setTargetAtTime(28+sp*2.6,t,.06);engine.f.frequency.setTargetAtTime(480+sp*36,t,.08);engine.g.gain.setTargetAtTime(soundOn?.011:0,t,.09);engine.noise.gain.setTargetAtTime(soundOn&&(player.driftDir||Math.abs(player.slide)>2.5)&&sp>8&&!player.air?.045:0,t,.07);engine.bp.frequency.setTargetAtTime(player.driftDir?1100+player.drift*260:900,t,.1);if(raceFilter)raceFilter.frequency.setTargetAtTime(3000+sp*430,t,.18);}
 if(player.finishTime!==null)end();}

function end(){elapsed=racers[0].finishTime??elapsed;if(isTT())return endTT();state='finished';keys.clear();roulette=null;burst(racers[0],0xffd452,26);burst(racers[0],0xed6350,16);burst(racers[0],0x55bdb2,16);
 $('result').hidden=false;$('touch').hidden=true;const order=ranking(racers),place=order.indexOf(racers[0])+1,board=$('leaderboard'),rs=raceStars(place,stats.hitsTaken);
 $('resultTitle').textContent=place===1?(rs.perfect?'Perfektes Rennen!':'Der Pokal gehört dir!'):place<=3?`Platz ${place} – aufs Treppchen!`:`Platz ${place}. Da geht noch was!`;
 $('resultTime').textContent=`${course.name} · ${cc}cc · ${format(elapsed)}`;
 $('resultStars').innerHTML=[0,1,2].map(i=>`<i class="${i<rs.stars?'on':''}">★</i>`).join('')+(rs.perfect?'<b>PERFEKT</b>':'');
 stopVoice();say(place===1?'win':place<=3?'podium':'finish');if(place<=3)SFX.cheer();board.replaceChildren();
 // Statistik: macht sichtbar, womit man das Rennen gewonnen (oder verloren) hat
 const bestKey=`bestlap-${selected}`,oldBestLap=store.get(bestKey,Infinity),newBestLap=stats.bestLap<oldBestLap;if(newBestLap)store.set(bestKey,stats.bestLap);
 const st=[['Beste Runde',format(stats.bestLap)+(newBestLap?' ★ NEU':'')],['Mini-Turbos',`${stats.mt.mini} · ${stats.mt.super} · ${stats.mt.ultra}`],['Tricks · Ringe · Windschatten',`${stats.tricks} · ${stats.rings} · ${stats.drafts}`],['Überholt',stats.overtakes],['Treffer gelandet / kassiert',`${stats.hitsDealt} / ${stats.hitsTaken}`],['Rempler / Stürze',`${stats.bumps} / ${stats.falls}`]];
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
function ceremony(){state='ceremony';clearGroup(actors);hazards=[];shots=[];puffs=[];
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
 let icon='?',name='ITEM SAMMELN';if(roulette){const ks=Object.keys(ITEM_ICONS);icon=ITEM_ICONS[ks[Math.floor(performance.now()/75)%ks.length]];name='…';}else if(p.item){icon=p.item==='triple'?'⚡'+p.charges:ITEM_ICONS[p.item];name=ITEM_NAMES[p.item];}
 setText('itemIcon',icon);setText('titemIcon',icon);setText('itemName',name);const ready=p.item?'1':'0';if(HC.ready!==ready){HC.ready=ready;$('titem').classList.toggle('ready',!!p.item);$('item').classList.toggle('ready',!!p.item);}
 const full=p.spores>=MAX_SPORES?'1':'0';if(HC.full!==full){HC.full=full;$('spores').classList.toggle('full',full==='1');}
 const lvl=p.drift>=2.3?'ultra':p.drift>=1.4?'super':p.drift>=.7?'mini':'';const w=(p.driftDir?Math.min(100,p.drift/2.3*100):0).toFixed(0)+'%';if(HC.dw!==w){HC.dw=w;$('driftbar').style.width=w;}const dc=lvl?'#'+MT_COLORS[lvl].toString(16).padStart(6,'0'):'#9fb4c2';if(HC.dc!==dc){HC.dc=dc;$('driftbar').style.background=dc;}
 setText('driftlabel',p.boost>0?'TURBO!':p.air?(p.trick?'TRICK!':'IN DER LUFT · DRIFT = TRICK'):p.driftDir?(lvl?MT_LABEL[lvl]+' BEREIT':'DRIFT HALTEN …'):(p.draft||0)>.25?'WINDSCHATTEN …':coarseInput?'DRIFT + LENKEN':'SHIFT + LENKEN = DRIFT');}
function refreshBest(){document.querySelectorAll('#tracks .track').forEach((b,i)=>{let span=b.querySelector('.best');if(!span){span=document.createElement('span');span.className='best';b.append(span);}
 if(mode==='tt'){const t=store.get(`tt-${i}`,null),md=store.get(`medal-${i}`,3);span.textContent=(md<3?['🥇','🥈','🥉'][md]+' ':'')+(t?format(t):'—');return;}
 const t=store.get(`best-${i}-${cc}`,null),stars=store.get(`stars-${i}-${cc}`,0);span.textContent=(stars?'★'.repeat(stars)+' ':'')+(t?format(t):'—');});}
function drawMap(){const c=$('map'),q=c.getContext('2d'),{cx,cz,k}=mapInfo,X=x=>100+(x-cx)*k,Y=z=>80+(z-cz)*k;q.clearRect(0,0,200,160);q.lineWidth=9;q.lineJoin='round';q.strokeStyle='#0b1a2288';q.beginPath();for(let i=0;i<=PS;i+=16){const j=i%PS;i?q.lineTo(X(TP.x[j]),Y(TP.z[j])):q.moveTo(X(TP.x[j]),Y(TP.z[j]));}q.stroke();q.lineWidth=3;q.strokeStyle='#fff6dd';q.stroke();
 q.fillStyle='#ffd23f';for(const r of ramps){const p=sample(r.d,r.off).p;q.fillRect(X(p.x)-2.5,Y(p.z)-2.5,5,5);}q.fillStyle='#b48cff';for(const z of zones)q.fillRect(X(z.x)-4,Y(z.z)-4,8,8);q.fillStyle='#2fb7d8';for(const g of gaps){const p=sample(g.c).p;q.beginPath();q.arc(X(p.x),Y(p.z),5,0,TAU);q.fill();}
 for(const r of [...racers].reverse()){q.fillStyle=r.id===0?'#ffe16a':'#fff';q.beginPath();q.arc(X(r.x),Y(r.z),r.id===0?5:3,0,TAU);q.fill();if(r.id===0){q.strokeStyle='#203e2f';q.lineWidth=1.5;q.stroke();}}}
const tempLook=new T.Vector3();
function updateCamera(dt,snap=false){const portrait=camera.aspect<.9;
 if(state==='menu'){const s=sample(length*.03);const angle=performance.now()*.00005;camera.position.set(s.p.x+Math.sin(angle)*50,26+s.p.y,s.p.z+Math.cos(angle)*50);camera.lookAt(s.p.x,2,s.p.z);setFov(portrait?72:58,dt,true);return;}
 if(state==='ceremony'&&cer){const a=cer.angle+Math.sin(cer.t*.25)*.9,r=portrait?30:23;camera.position.set(cer.center.x+Math.sin(a)*r,cer.center.y+5+Math.sin(cer.t*.4),cer.center.z+Math.cos(a)*r);camera.lookAt(cer.center.x,cer.center.y+(portrait?-4.5:1.5),cer.center.z);
  if(!portrait&&innerWidth>900){camera.updateMatrixWorld();tempLook.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(7).add(cer.center);tempLook.y+=1.5;camera.lookAt(tempLook);}
  setFov(portrait?70:52,dt,true);return;}
 if(!racers.length)return;const p=racers[0];
 // Verfolgerkamera haengt am Kart (nicht an der Strecke): man sieht, wohin man wirklich faehrt
 const targetH=p.h+(p.driftDir?-p.driftDir*.12:0);camH=snap?targetH:camH+angleDiff(targetH,camH)*Math.min(1,dt*(p.driftDir?3.2:5));
 const back=portrait?10.5:8.4,up=portrait?4.8:3.7,sx=Math.sin(camH),cz=Math.cos(camH),py=p.y??0;
 const desired=tempLook.set(p.x-sx*back,py+up,p.z-cz*back);const k=snap?1:1-Math.exp(-dt*9);camera.position.x+=(desired.x-camera.position.x)*k;camera.position.z+=(desired.z-camera.position.z)*k;camera.position.y+=(desired.y-camera.position.y)*(snap?1:1-Math.exp(-dt*5));
 camera.lookAt(p.x+sx*8,py+1.3,p.z+cz*8);
 if(p.boost>0){camera.position.y+=Math.sin(elapsed*63)*.05;camera.position.x+=Math.sin(elapsed*49)*.04;}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.x+=(Math.random()-.5)*shake*.9;camera.position.y+=(Math.random()-.5)*shake*.7;}
 setFov((portrait?74:62)+(p.boost>0?10:0)+clamp(Math.abs(p.speed)-24,0,16)*.35,dt,snap);}
function setFov(target,dt,snap){camFov=snap?target:camFov+(target-camFov)*Math.min(1,dt*6);if(Math.abs(camera.fov-camFov)>.01){camera.fov=camFov;camera.updateProjectionMatrix();}}
function adaptQuality(fps){if(state!=='race'||fps>=45||quality.level>=2)return;quality.level++;quality.dprCap=Math.max(quality.level===1?1:.85,quality.dprCap-.35);if(quality.level===2){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m)m.needsUpdate=true;});}renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));resize();}
function animateWorld(dt,now){
 for(const b of boxes){b.cooldown=Math.max(0,b.cooldown-dt);b.mesh.visible=b.cooldown<=0;b.mesh.rotation.y=now*.001;b.mesh.position.y=b.baseY+Math.sin(now*.003+b.distance)*.2;}
 for(const s of sparkPool)if(s.life>0){s.life-=dt;s.v.y-=dt*8;s.m.position.addScaledVector(s.v,dt);s.m.scale.setScalar(Math.max(0,s.life*2));if(s.life<=0)s.m.visible=false;}
 for(const f of flags){const pos=f.mesh.geometry.attributes.position,q=pos.array;for(let v=0;v<pos.count;v++){const xn=(f.base[v*3]+.75)/1.5;q[v*3+2]=f.base[v*3+2]+Math.sin(now*.006+xn*4)*.11*xn;}pos.needsUpdate=true;}
 for(const b of balloons){b.g.position.y=b.base+Math.sin(now*.00045+b.ph)*2.4;b.g.rotation.y=now*.00008+b.ph;}
 for(const s of skids)if(s.life>0){s.life-=dt;s.mat.opacity=Math.min(.4,s.life*.12);if(s.life<=0)s.m.visible=false;}
 for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.life-=dt;p.v.y+=dt*1.1;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(1+(.75-p.life)*1.8);p.m.material.opacity=Math.max(0,p.life*.5);if(p.life<=0){actors.remove(p.m);p.m.material.dispose();puffs.splice(i,1);}}
 if(bats&&zones.length){const z=zones[0];for(let i=0;i<bats.count;i++){const a=now*.0005*(1+(i%3)*.25)+i*1.7,rr=10+(i%5)*4;_e.set(0,-a,0);_q.setFromEuler(_e);_m.compose(_v.set(z.x+Math.cos(a)*rr,24+Math.sin(now*.001+i)*4+(i%4)*2.5,z.z+Math.sin(a)*rr),_q,_s.set(1,Math.sin(now*.03+i*2),1));bats.setMatrixAt(i,_m);}bats.instanceMatrix.needsUpdate=true;}
 if(foamRing)foamRing.material.opacity=.16+Math.sin(now*.0012)*.09;
 for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.life-=dt;h.arm=Math.max(0,h.arm-dt);if(h.life<=0){actors.remove(h.mesh);hazards.splice(i,1);}}
 for(const pad of pads){pad.squash=Math.max(0,pad.squash-dt*1.6);const k=pad.squash>0?Math.sin(pad.squash*14)*pad.squash:0;pad.mesh.scale.set(1+k*.4,1-k,1+k*.4);}
 for(const ring of rings){ring.flash=Math.max(0,ring.flash-dt);ring.mesh.rotation.z=now*.0015;ring.mesh.scale.setScalar(1+ring.flash*.6);ring.mesh.material.emissiveIntensity=.9+ring.flash*4;}
 if(boostTex)boostTex.offset.y=-(now*.0022)%1;
 if(state==='menu')updateSwingersMenu(now);
 updateSpores(dt,now);if(frame%2===0)updateCrowd(now);
 if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0&&state!=='countdown')setText('message','');}
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').className='';}}
function updateSwingersMenu(now){updateSwingers(now*.001);}
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000||.016,.05);last=now;frame++;shaderTime.value=now/1000;duckBgm(now);
 if(finishMusicAt&&now>finishMusicAt){finishMusicAt=0;if(state==='finished'||state==='ceremony')playBgm('menu');}
 quality.fpsFrames++;if(quality.fpsStart&&now-quality.fpsStart>2000){adaptQuality(quality.fpsFrames*1000/(now-quality.fpsStart));quality.fpsFrames=0;quality.fpsStart=now;}else if(!quality.fpsStart)quality.fpsStart=now;
 if(state!=='paused'){update(dt);animateWorld(dt,now);updateCamera(dt);}
 if(frame%3===0){hud();if(state==='race'||state==='countdown')drawMap();}
 if(racers[0]&&headlight.intensity>0){const p=racers[0];headlight.position.set(p.x+Math.sin(p.h)*5,(p.y||0)+3.2,p.z+Math.cos(p.h)*5);}
 if(racers[0]){sun.target.position.set(racers[0].x,0,racers[0].z);sun.position.set(racers[0].x+theme.sunPos[0]*.8,theme.sunPos[1]*.8,racers[0].z+theme.sunPos[2]*.8);}
 renderer.render(scene,camera);}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
addEventListener('error',e=>{try{const el=$('error');el.hidden=false;el.textContent='Darsteller abgestürzt — bitte neu laden. ('+e.message+')';console.error(e.error||e.message);}catch{}});

// ---------------------------------------------------------------- Menue, Eingabe, Vollbild
function syncTrackButtons(){$('tracks').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',selected===j);x.setAttribute('aria-pressed',String(selected===j));});}
function refreshMenu(){const goldOk=store.get('gold',false);$('colors').querySelectorAll('button').forEach((b,i)=>{const locked=KART_COLORS[i].gold&&!goldOk;b.classList.toggle('locked',locked);b.title=locked?'Gewinne einen Grand Prix ab 100cc':KART_COLORS[i].n;});
 const tro=[50,100,150].map(c=>{const t=store.get(`trophy-${c}`,9);return `${c}cc ${t===1?'🥇':t===2?'🥈':t===3?'🥉':'–'}`;}).join(' · ');const medals=courses.map((_,i)=>store.get(`medal-${i}`,3)),mc=[0,1,2].map(k=>medals.filter(x=>x===k).length);$('trophies').textContent='Pokale: '+tro+(mc.some(Boolean)?` · Medaillen 🥇${mc[0]} 🥈${mc[1]} 🥉${mc[2]}`:'');$('classes').classList.toggle('locked',mode==='tt');
 document.querySelectorAll('#classes .cls').forEach(b=>{const on=Number(b.dataset.cc)===cc;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('trackHint').textContent=mode==='gp'?`Alle ${courses.length} Strecken`:mode==='tt'?'Medaillen & Geist':`${cc}cc`;refreshBest();}
KART_COLORS.forEach((k,i)=>{const b=document.createElement('button');b.className='swatch'+(i===0?' selected':'')+(k.gold?' gold':'');b.style.setProperty('--swatch','#'+k.c.toString(16));b.setAttribute('aria-label',k.n);b.setAttribute('aria-pressed',String(i===0));
 b.onclick=()=>{if(k.gold&&!store.get('gold',false)){toast('🔒 Gewinne einen Grand Prix ab 100cc',2,'bad');return;}colorIndex=i;$('colors').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));});$('driverName').textContent=k.n;buildCourse();};$('colors').append(b);});
courses.forEach((c,i)=>{const b=document.createElement('button');b.className='track'+(i===0?' selected':'');b.innerHTML=`<i>${c.icon}</i><b>${c.name}</b><span>${c.kind}</span>`;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{if(mode==='gp')return;selected=i;syncTrackButtons();buildCourse();};$('tracks').append(b);});
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
Promise.race([Promise.all(PROTO_FILES.map(loadProto)),new Promise(r=>setTimeout(r,9000))]).finally(()=>{buildCourse();resize();refreshMenu();playBgm('menu');const l=$('loader');l.classList.add('done');setTimeout(()=>l.hidden=true,600);requestAnimationFrame(loop);});

// Testschnittstelle nur mit ?test=1
if(TEST){window.rallyTest={start,home,use,pause,say,ceremony,next:nextAfterResult,track:d=>({...trackAt(d),x:sample(d).p.x,z:sample(d).p.z}),zones:()=>zones,cp:v=>cpDist(v),
 setMode:m=>document.querySelector(`#modes [data-mode="${m}"]`).click(),setClass:c=>{cc=c;refreshMenu();},setTrack:i=>{selected=i;syncTrackButtons();buildCourse();},
 autopilot:v=>{autopilot=v;},finishNow:()=>{racers[0].distance=length*LAPS+1;finish(racers[0],length,elapsed);end();},
 state:()=>({state,length,mode,cc,gp,stats,racers:racers.map(({mesh,...r})=>r)}),setItem:item=>{racers[0].item=item;racers[0].charges=item==='triple'?3:0;},
 perf:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,dpr:renderer.getPixelRatio(),qualityLevel:quality.level}),
 bgm:()=>({ready:bgm.ready,failed:bgm.failed,playing:bgm.current,rate:bgm.rate}),
 items:()=>({hazards:hazards.length,shots:shots.length,ramps:ramps.length,pads:pads.length,rings:rings.length,spores:spores.length,swingers:swingers.length,gaps:gaps.length,obstacles:[...obsGrid.values()].reduce((a,c)=>a+c.length,0),crowd:crowd?crowd.fans.length:0,protos:Object.fromEntries(PROTO_FILES.map(n=>[n,!!P[n]]))}),
 saveGhost:()=>{try{localStorage.setItem('mr-ghost-'+selected,JSON.stringify({...rec,next:undefined,color:0xffffff}));}catch{}return rec&&rec.x.length;},ghost:()=>ghost&&{n:ghost.data.x.length,dist:ghost.dist,visible:ghost.mesh.visible},medalOf:t=>medalOf(t),aiUse:(id,item)=>{racers[id].item=item;return useItem(racers[id]);},racers:()=>racers,world:()=>({ramps,pads,rings,spores,gaps,swingers}),keys,
 tick:(n=60,dt=1/60)=>{for(let i=0;i<n;i++){update(dt);animateWorld(dt,performance.now());updateCamera(dt);}duckBgm(performance.now());renderer.render(scene,camera);return {state,elapsed:+elapsed.toFixed(2),place:ranking(racers).indexOf(racers[0])+1};}};
 const panel=document.createElement('aside');panel.id='testPanel';panel.style.cssText='position:fixed;bottom:0;left:35%;z-index:30;background:#111;padding:10px;display:flex;gap:8px';
 for(const [text,action] of [['Test: Turbo',()=>{window.rallyTest.setItem('boost');state='race';use();}],['Test: Ziel',()=>{state='race';window.rallyTest.finishNow();}]]){const b=document.createElement('button');b.textContent=text;b.style.cssText='color:#fff;background:#345;padding:10px';b.onclick=action;panel.append(b);}document.body.append(panel);}
