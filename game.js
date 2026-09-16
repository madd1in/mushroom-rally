import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {racer,advance,lap,finish,ranking,activate,clamp,LAPS,rollItem,loseSpores,addGpPoints,gpStandings,GP_POINTS,MAX_SPORES} from './core.mjs';

const $=id=>document.getElementById(id),TAU=Math.PI*2,TEST=new URLSearchParams(location.search).has('test');
// Streckendaten: hills [u, Hoehe, Breite als Anteil der Runde], ramps [u, Querversatz, Breite], pads [u, Querversatz], stands [u, Querversatz].
// u=0 ist die Start-Ziel-Linie und bleibt flach.
const courses=[
 {name:'Pilz-Promenade',icon:'✿',kind:'Klassisch',music:'race',sky:0xa7dbe3,grass:0x7cba56,road:0x526574,seed:7,
  points:[[0,62],[65,57],[105,15],[90,-47],[32,-72],[-21,-40],[-85,-61],[-108,-10],[-77,50]],
  hills:[[.3,7,.045],[.6,5,.035],[.79,8,.05]],ramps:[[.135,0,9],[.33,-3.5,6],[.63,0,8],[.935,-2,7]],
  pads:[[.27,-4.5],[.47,-5],[.76,4.5],[.88,0]],stands:[[.02,18],[.45,-18]]},
 {name:'Sunset Valley',icon:'☀',kind:'Schnell',music:'sunset',sky:0xf1b393,grass:0xb2ae55,road:0x715e6c,seed:23,
  points:[[0,70],[75,72],[108,26],[57,-8],[94,-70],[23,-94],[-32,-63],[-95,-74],[-113,-16],[-72,51]],
  hills:[[.22,6,.04],[.47,9,.05],[.7,6,.04],[.9,4,.03]],ramps:[[.12,0,9],[.5,-3,6],[.6,0,9],[.8,-3,7],[.95,3,6]],
  pads:[[.2,4.5],[.36,-4.5],[.66,4],[.88,-4]],stands:[[.02,18],[.64,-18]]},
 {name:'Sternen-Garten',icon:'✦',kind:'Knifflig',music:'night',sky:0x586791,grass:0x4b846e,road:0x575b80,seed:41,
  points:[[0,70],[74,52],[95,-3],[44,-28],[72,-73],[0,-86],[-43,-48],[-96,-58],[-99,15],[-49,42]],
  hills:[[.26,5,.035],[.56,7,.045],[.82,6,.04]],ramps:[[.14,0,8],[.49,-3,7],[.66,0,9],[.9,2,7]],
  pads:[[.21,0],[.36,-4.5],[.58,4.5],[.77,-4],[.96,4]],stands:[[.02,18],[.42,-18]]}];
const colors=[0xed6350,0xffc74a,0x55bdb2,0xa688dc],driverNames=['Ruby / Rot','Sunny / Gelb','Mint / Türkis','Nova / Violett'];
const AI_NAMES=['Du','Peachy','Bramble','Pip','Luna','Mochi','Sunny','Nori'],AI_COLORS=[0xffb7c1,0x96b464,0xf7c055,0x918ed1,0x78c7d1,0xec9160,0x549a91];
const TRACK_SCALE=1.35,G=38,G_STICK=74,RAMP_LEN=6.2,RAMP_H=1.15,FAN_COLS=[0xed6350,0xffd45c,0x55bdb2,0xa688dc,0xf1b35a,0xef7160];
const ITEM_ICONS={boost:'⚡',triple:'⚡',shell:'◉',banana:'🍌',shield:'★'},ITEM_NAMES={boost:'TURBO',triple:'DREIFACH-TURBO',shell:'SUCH-PANZER',banana:'BANANE',shield:'STERNENSCHILD'};

let selected=0,colorIndex=0,mode='single',state='menu',elapsed=0,countdown=3,last=0,curve,length=1,course,ctx,frame=0,noticeTimer=0;
let boxes=[],racers=[],hazards=[],sparks=[],flags=[],balloons=[],puffs=[],shots=[],ramps=[],pads=[],rings=[],spores=[],sporeMesh=null,crowd=null,boostTex=null,foamRing=null;
let mapScale=.66,shake=0,lastPlace=8,leadAt=-99,finishMusicAt=0,soundOn=true,autoGas=false,startPress=-1,prevDrift=false,roulette=null,camFov=58,cer=null;
let gp={active:false,race:0,points:{}};
const coarseInput=matchMedia('(pointer:coarse)').matches,quality={level:0,dprCap:coarseInput?1.25:1.6,fpsFrames:0,fpsStart:0};

// ---------------------------------------------------------------- Renderer & Szene
let renderer;try{renderer=new T.WebGLRenderer({canvas:$('game'),antialias:!coarseInput});}catch(e){$('error').hidden=false;$('error').textContent='Dein Browser benötigt WebGL für dieses 3D-Spiel. Bitte Hardwarebeschleunigung aktivieren und die Seite neu laden.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.1,900),world=new T.Group(),actors=new T.Group();scene.add(world,actors);
const hemi=new T.HemisphereLight(0xffffff,0x587540,2);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff7db,3);sun.position.set(40,110,70);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-175,right:175,top:175,bottom:-175,far:380});sun.shadow.bias=-.0006;scene.add(sun);
const fill=new T.DirectionalLight(0xbfd4ff,.45);fill.position.set(-60,40,-90);scene.add(fill);
const shaderTime={value:0};
function radialSprite(stops,scale,pos){const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),g=q.createRadialGradient(64,64,6,64,64,63);for(const [o,col] of stops)g.addColorStop(o,col);q.fillStyle=g;q.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(scale,scale,1);s.position.set(...pos);scene.add(s);return s;}
radialSprite([[0,'rgba(255,250,230,1)'],[.25,'rgba(255,244,200,.85)'],[1,'rgba(255,244,200,0)']],190,[-320,240,-400]);
const moon=radialSprite([[0,'rgba(255,251,230,1)'],[.45,'rgba(252,243,214,.95)'],[1,'rgba(252,243,214,0)']],85,[230,310,-390]);moon.visible=false;
const stars=(()=>{const n=500,pos=new Float32Array(n*3);for(let i=0;i<n;i++){const a=Math.random()*TAU,e=Math.acos(Math.random()*.85),r=620;pos[i*3]=Math.sin(e)*Math.cos(a)*r;pos[i*3+1]=Math.cos(e)*r*.9+40;pos[i*3+2]=Math.sin(e)*Math.sin(a)*r;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const p=new T.Points(g,new T.PointsMaterial({color:0xfff6d8,size:2.2,sizeAttenuation:false,fog:false,transparent:true,opacity:.9}));p.visible=false;scene.add(p);return p;})();

const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
const cream=mat(0xffefd5),dark=mat(0x273943),white=mat(0xffffff),gold=mat(0xffdc64);
// Schild als Fresnel-Blase (additiv, ein gemeinsames Material fuer alle Karts).
const shieldMat=new T.ShaderMaterial({uniforms:{uTime:shaderTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
 fragmentShader:'uniform float uTime;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.2);vec3 c=mix(vec3(1.,.82,.25),vec3(.5,.95,1.),f);gl_FragColor=vec4(c*(f*1.1+.12+.06*sin(uTime*9.)),1.);}'});
const persistentMats=new Set([cream,dark,white,gold,shieldMat]);

// ---------------------------------------------------------------- GLB-Prototypen (Blender-MCP)
const sharedGeo=new Set(),sharedMat=new Set(),P={};
function markShared(root){root.traverse(o=>{if(o.isMesh){sharedGeo.add(o.geometry);for(const m of [].concat(o.material))if(m)sharedMat.add(m);}});}
// Meshes mit identischem Material zu einem Mesh verschmelzen: weniger Draw-Calls (Low-End/Mobile).
function mergeByMaterial(root){root.updateMatrixWorld(true);const groups=new Map();root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){const k=o.material.uuid,e=groups.get(k)||{m:o.material,g:[]};e.g.push(o.geometry.clone().applyMatrix4(o.matrixWorld));groups.set(k,e);}});const out=new T.Group();for(const e of groups.values()){const geo=mergeGeometries(e.g,false);if(geo)out.add(new T.Mesh(geo,e.m));}return out;}
let loaded=0;const PROTO_FILES=['kart','mushroom','gate','tree','rock','fence','balloon','itembox','banana','shell','ramp','grandstand','spectator','bouncepad','podium','trophy'];
function loadProto(name){return new Promise(resolve=>{new GLTFLoader().load(`assets/${name}.glb`,g=>{const merged=mergeByMaterial(g.scene);markShared(merged);P[name]=merged;progress();resolve();},undefined,()=>{P[name]=null;progress();resolve();});});}
function progress(){loaded++;const el=$('loaderBar');if(el)el.style.width=Math.round(loaded/PROTO_FILES.length*100)+'%';}
function cloneProto(proto){const c=proto.clone(true);c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return c;}
function applyTint(root,name,color){root.traverse(o=>{if(!o.isMesh)return;const fix=m=>{if(m&&m.name===name){const c=m.clone();c.color=new T.Color(color);return c;}return m;};o.material=Array.isArray(o.material)?o.material.map(fix):fix(o.material);});}
// Instanced-Streuung: alle Meshs des Prototyps bekommen dieselben Instanz-Matrizen (1 Draw-Call je Material).
function scatterInstanced(proto,list){if(!proto||!list.length)return;const meshes=[];proto.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))meshes.push(o);});const m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),s=new T.Vector3(),v=new T.Vector3();for(const src of meshes){const inst=new T.InstancedMesh(src.geometry,src.material,list.length);inst.castShadow=true;inst.receiveShadow=true;list.forEach((t,i)=>{e.set(0,t.ry||0,0);q.setFromEuler(e);const sw=t.s*(t.sx||1);s.set(sw,t.s,sw);m.compose(v.set(t.x,t.y||0,t.z),q,s);inst.setMatrixAt(i,m);});inst.instanceMatrix.needsUpdate=true;world.add(inst);}}

// ---------------------------------------------------------------- Hilfsfunktionen
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,material,x,y,z,sx,sy=sx,sz=sx){const m=mesh(new T.SphereGeometry(1,14,10),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function box(parent,material,x,y,z,a,b,c){return mesh(new T.BoxGeometry(a,b,c),material,parent,x,y,z);}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hex=c=>'#'+c.getHexString();
function canvasTex(w,h,draw,repeat=false){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
function label(text,bg='#fff1d9',fg='#28523c',w=512,h=128){const tex=canvasTex(w,h,(q)=>{q.fillStyle=bg;q.fillRect(0,0,w,h);q.fillStyle=fg;q.font=`900 ${Math.round(h*.52)}px Trebuchet MS`;q.textAlign='center';q.textBaseline='middle';q.fillText(text,w/2,h/2);});return new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});}
function skyTexture(top,bottom){return canvasTex(2,256,(q)=>{const g=q.createLinearGradient(0,0,0,256);g.addColorStop(0,top);g.addColorStop(1,bottom);q.fillStyle=g;q.fillRect(0,0,2,256);});}
function speckleTexture(base,spot,density=1200,size=256){return canvasTex(size,size,(q)=>{q.fillStyle=base;q.fillRect(0,0,size,size);for(let i=0;i<density;i++){q.globalAlpha=.1+Math.random()*.22;q.fillStyle=Math.random()<.5?spot:'#00000018';q.fillRect(Math.random()*size,Math.random()*size,2,2);}q.globalAlpha=1;},true);}
function clearGroup(g){const disposed=new Set();g.traverse(o=>{if(o.isMesh||o.isPoints){if(o.geometry&&!sharedGeo.has(o.geometry))o.geometry.dispose();for(const m of [].concat(o.material)){if(m&&!persistentMats.has(m)&&!sharedMat.has(m)&&!disposed.has(m)){m.map?.dispose();m.dispose();disposed.add(m);}}}});g.clear();}
const HC={};function setText(id,v){if(HC[id]!==v){HC[id]=v;$(id).textContent=v;}}
function notice(text,duration=1.3){setText('message',text);noticeTimer=duration;}

// ---------------------------------------------------------------- Strecke: Hoehenprofil, Ueberhoehung, Samples
const TS=1024,trackH=new Float32Array(TS),trackB=new Float32Array(TS);
function hillU(u){let h=0;for(const [c,a,w] of course.hills){let du=u-c;du-=Math.round(du);h+=a*Math.exp(-(du*du)/(w*w));}return h;}
function buildTrackData(){const raw=new Float32Array(TS),ds=length/TS;for(let i=0;i<TS;i++){const u=i/TS;trackH[i]=hillU(u);const t1=curve.getTangentAt(u),t2=curve.getTangentAt(((i+1)%TS)/TS);raw[i]=clamp((t1.z*t2.x-t1.x*t2.z)/ds*5.5,-.24,.24);}for(let i=0;i<TS;i++){let s=0;for(let k=-10;k<=10;k++)s+=raw[(i+k+TS)%TS];trackB[i]=s/21;}}
function trackAt(d){const f=(((d/length)%1+1)%1)*TS,i=Math.floor(f)%TS,j=(i+1)%TS,k=f-Math.floor(f);return {h:trackH[i]+(trackH[j]-trackH[i])*k,b:trackB[i]+(trackB[j]-trackB[i])*k};}
function slopeAt(d){return (trackAt(d+1.5).h-trackAt(d-1.5).h)/3;}
function sample(distance,offset=0){const u=((distance/length)%1+1)%1,p=curve.getPointAt(u),t=curve.getTangentAt(u).normalize();p.x+=t.z*offset;p.z-=t.x*offset;const tr=trackAt(distance);p.y=tr.h-offset*tr.b;return {p,t,angle:Math.atan2(t.x,t.z),bank:tr.b};}
const lapDist=d=>((d%length)+length)%length;
const wrapDiff=(a,b)=>((a-b)%length+length*1.5)%length-length/2;
function strip(d0,d1,offset,width,lift,uvLen,steps){const v=[],uv=[],idx=[];for(let i=0;i<=steps;i++){const d=d0+(d1-d0)*i/steps;for(const side of [-1,1]){const {p}=sample(d,offset+side*width/2);v.push(p.x,p.y+lift,p.z);uv.push(side<0?0:1,(d-d0)/uvLen);}if(i<steps){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function addStrip(geo,material,shadow=true){const m=new T.Mesh(geo,material);m.receiveShadow=shadow;world.add(m);return m;}
// Boeschung unter erhoehten Streckenteilen: von der Strassenkante schraeg auf den Inselboden.
function skirt(side,material){const steps=420,v=[],idx=[],hs=[];for(let i=0;i<=steps;i++){const d=length*i/steps,s=sample(d,side*8.9),h=Math.max(0,s.p.y),b=sample(d,side*(8.9+h*1.5+1.2)).p;v.push(s.p.x,s.p.y+.02,s.p.z,b.x,-.5,b.z);hs.push(h);}for(let i=0;i<steps;i++){if(Math.max(hs[i],hs[i+1])<.35)continue;const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,material);m.receiveShadow=true;world.add(m);}
function rampAt(d,off){const dl=lapDist(d);for(const r of ramps){if(Math.abs(off-r.off)<r.w/2&&dl>=r.start&&dl<=r.end)return {y:RAMP_H*(dl-r.start)/RAMP_LEN,ramp:r};}return null;}

// ---------------------------------------------------------------- Deko & Figuren
function mushroom(x,z,s,color,y=0){if(P.mushroom){const g=cloneProto(P.mushroom);g.position.set(x,y,z);g.scale.setScalar(s);applyTint(g,'CapPaint',color);world.add(g);return g;}const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);world.add(g);mesh(new T.CylinderGeometry(.3,.52,2.5,12),cream,g,0,1.25,0);sphere(g,mat(color),0,2.65,0,1.6,.75,1.6);return g;}
function tree(x,z,s,ci=0){if(P.tree){const g=cloneProto(P.tree);g.position.set(x,0,z);g.scale.setScalar(s);applyTint(g,'CapPaint',[0x4f9758,0x74b35b,0x5da04a][ci%3]);world.add(g);return g;}const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);mesh(new T.CylinderGeometry(.2,.4,2.7,7),mat(0x98714a),g,0,1.35,0);sphere(g,mat(0x4f9758),0,3.5,0,1.7,2.6,1.7);}
function kart(color){let g;if(P.kart){g=cloneProto(P.kart);applyTint(g,'BodyPaint',color);}else{g=new T.Group();const body=mat(color,{roughness:.35});box(g,body,0,.68,0,1.75,.55,2.4);box(g,dark,0,.95,-.28,.9,.75,.72);sphere(g,cream,0,1.9,-.08,.45);for(const x of [-1,1])for(const z of [-.9,1]){const w=mesh(new T.CylinderGeometry(.43,.43,.38,14),dark,g,x,.44,z);w.rotation.z=Math.PI/2;}}const shield=new T.Mesh(new T.SphereGeometry(1.75,24,16),shieldMat);shield.position.y=1;shield.visible=false;g.add(shield);g.userData={shield};return g;}
function boostTexture(){return canvasTex(64,128,(q,w,h)=>{q.fillStyle='#ffc93c';q.fillRect(0,0,w,h);q.strokeStyle='#ff7a2f';q.lineWidth=12;q.lineCap='round';for(let y=10;y<h;y+=64){q.beginPath();q.moveTo(8,y+34);q.lineTo(w/2,y+6);q.lineTo(w-8,y+34);q.stroke();}},true);}

function buildCourse(){
 clearGroup(world);clearGroup(actors);
 hazards=[];sparks=[];flags=[];balloons=[];puffs=[];shots=[];ramps=[];pads=[];rings=[];spores=[];sporeMesh=null;crowd=null;roulette=null;cer=null;
 shake=0;lastPlace=8;leadAt=-99;for(const s of skids){s.life=0;s.m.visible=false;}
 course=courses[selected];stars.visible=moon.visible=selected===2;
 const skyC=new T.Color(course.sky),horizonC=skyC.clone().lerp(new T.Color(course.grass),.42);scene.background=skyTexture(hex(skyC),hex(horizonC));scene.fog=new T.Fog(horizonC.getHex(),selected===2?240:190,selected===2?560:430);
 // Strecken um 35 % vergroessert: mehr Rennstrecke zwischen Schanzen/Kuppen, ~35-40 s pro Rennen statt ~25 s.
 curve=new T.CatmullRomCurve3(course.points.map(([x,z])=>new T.Vector3(x*TRACK_SCALE,0,z*TRACK_SCALE)),true,'catmullrom',.38);curve.arcLengthDivisions=2400;length=curve.getLength();buildTrackData();
 mapScale=Math.min(...course.points.map(([x,z])=>Math.min(88/Math.max(1,Math.abs(x*TRACK_SCALE)),68/Math.max(1,Math.abs(z*TRACK_SCALE)))));
 const grassC=new T.Color(course.grass),roadC=new T.Color(course.road),grassMat=new T.MeshStandardMaterial({map:speckleTexture(hex(grassC),hex(grassC.clone().offsetHSL(0,-.05,.08)),2200),roughness:1});
 const ground=mesh(new T.CylinderGeometry(210,195,12,96),grassMat,world,0,-6.08,0);ground.castShadow=false;
 // Animiertes Meer: Wellen im Vertex-Shader, hellere Wellenkaemme im Fragment-Shader.
 const seaMat=mat(selected===2?0x577da0:0x72c9cf,{roughness:.3});seaMat.onBeforeCompile=sh=>{sh.uniforms.uTime=shaderTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying float vWave;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat w=sin(position.x*.035+uTime*1.3)*.8+sin(position.y*.05-uTime*1.1)*.6+sin((position.x+position.y)*.02+uTime*.7)*.9;transformed.z+=w;vWave=w;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWave;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb+=vec3(.10,.15,.15)*smoothstep(.7,2.1,vWave);');};
 const sea=mesh(new T.PlaneGeometry(1800,1800,90,90),seaMat,world,0,-12,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
 foamRing=mesh(new T.RingGeometry(204,217,72),new T.MeshBasicMaterial({color:0xe8fffb,transparent:true,opacity:.22,depthWrite:false}),world,0,-11.35,0);foamRing.rotation.x=-Math.PI/2;foamRing.castShadow=false;
 // Strasse, Curbs und Mittellinie als je ein Strip (statt Hunderter Einzelboxen).
 addStrip(strip(0,length,0,17.8,.04,6,720),cream);
 addStrip(strip(0,length,0,15.2,.065,6,720),new T.MeshStandardMaterial({map:speckleTexture(hex(roadC),hex(roadC.clone().offsetHSL(0,0,.07)),700),roughness:.9}));
 const curbTex=canvasTex(8,64,(q)=>{q.fillStyle='#ed745a';q.fillRect(0,0,8,32);q.fillStyle='#fff1d9';q.fillRect(0,32,8,32);},true);curbTex.magFilter=T.NearestFilter;
 const curbMat=new T.MeshStandardMaterial({map:curbTex,roughness:.7});for(const off of [-8.2,8.2])addStrip(strip(0,length,off,.8,.13,10,720),curbMat);
 const dashTex=canvasTex(8,32,(q)=>{q.fillStyle='#fff1d9';q.fillRect(0,0,8,16);},true);addStrip(strip(0,length,0,.18,.075,10,720),new T.MeshStandardMaterial({map:dashTex,alphaTest:.5,roughness:.8}),false);
 const skirtMat=new T.MeshStandardMaterial({map:speckleTexture(hex(grassC.clone().offsetHSL(0,-.05,-.08)),hex(grassC.clone().offsetHSL(.02,-.1,-.16)),1800),roughness:1,side:T.DoubleSide});skirt(-1,skirtMat);skirt(1,skirtMat);
 const random=rng(course.seed),path=Array.from({length:200},(_,i)=>sample(i/200*length).p);
 const clearOfTrack=(x,z,min)=>!path.some(p=>Math.hypot(p.x-x,p.z-z)<min+Math.max(0,p.y)*1.6);
 for(let i=0;i<150;i++){const x=(random()-.5)*340,z=(random()-.5)*300;if(Math.hypot(x,z)>186||!clearOfTrack(x,z,14))continue;const s=1+random()*2.3;if(i%3===0)mushroom(x,z,s,[0xef7160,0xf1b35a,0xb292ce][i%9/3|0]);else tree(x,z,s*.8,i);}
 if(P.rock){const rocks=[];for(let i=0;i<26;i++){const x=(random()-.5)*360,z=(random()-.5)*320;if(Math.hypot(x,z)>182||!clearOfTrack(x,z,12))continue;rocks.push({x,z,s:.6+random()*2.2,sx:.7+random()*.6,ry:random()*TAU});}scatterInstanced(P.rock,rocks);}
 if(P.fence){const fences=[],STEP=4;let prevA=sample(0).angle;for(let d=STEP;d<length;d+=STEP){const s=sample(d);const da=Math.atan2(Math.sin(s.angle-prevA),Math.cos(s.angle-prevA));prevA=s.angle;if(Math.abs(da)<=.055)continue;const side=da>0?-1:1,p=sample(d,side*10.6).p;fences.push({x:p.x,z:p.z,y:Math.max(0,p.y-1.13),ry:s.angle+Math.PI/2,s:1});}scatterInstanced(P.fence,fences);}
 if(P.balloon){for(let i=0;i<4;i++){const a=i/4*TAU+random(),r=85+random()*55,g=cloneProto(P.balloon);applyTint(g,'CapPaint',[0xed6350,0xffd45c,0x55bdb2,0xa688dc][i]);g.position.set(Math.cos(a)*r,22+random()*18,Math.sin(a)*r);world.add(g);balloons.push({g,base:g.position.y,ph:random()*TAU});}}
 mushroom(20,0,6.5,0xee6859);mushroom(40,7,3.4,0xf8b94e);mushroom(-40,-7,4,0x8d9ddb);
 for(let i=0;i<16;i++){const a=i/16*TAU,r=225+random()*70;const hill=sphere(world,mat(i%2?0x6c9c84:0x8daf8c),Math.cos(a)*r,-4,Math.sin(a)*r,25+random()*25,28+random()*34,24+random()*15);hill.castShadow=false;}
 for(let i=0;i<15;i++){const cloud=new T.Group();world.add(cloud);cloud.position.set((random()-.5)*420,55+random()*40,(random()-.5)*350);for(let k=0;k<4;k++){const puff=sphere(cloud,white,k*4-6,Math.sin(k)*2,0,5,3.5,3);puff.castShadow=false;}}
 // Start-Ziel-Tor und Schachbrett
 const start=sample(0),arch=new T.Group();arch.position.copy(start.p);arch.rotation.y=start.angle;world.add(arch);
 if(P.gate)arch.add(cloneProto(P.gate));else{box(arch,cream,-9,4,0,.6,8,.6);box(arch,cream,9,4,0,.6,8,.6);box(arch,mat(0xed6350),0,8,0,19,2,.7);}
 const bz=P.gate?.26:.37;mesh(new T.PlaneGeometry(16,1.6),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,bz);mesh(new T.PlaneGeometry(16,1.6),label('MUSHROOM RALLY','#ed6350','#fff5d9'),arch,0,8,-bz).rotation.y=Math.PI;
 const checker=canvasTex(64,16,(q)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){q.fillStyle=(x+y)%2?'#273943':'#fff1d9';q.fillRect(x*4,y*4,4,4);}});checker.magFilter=T.NearestFilter;addStrip(strip(-1.6,1.6,0,15.2,.09,3.2,2),new T.MeshStandardMaterial({map:checker,roughness:.8}));
 // Boost-Pads mit laufenden Chevrons (Textur-Offset im Loop)
 boostTex=boostTexture();const padMat=new T.MeshBasicMaterial({map:boostTex});for(const f of [.18,.43,.72])addStrip(strip(length*f-2.1,length*f+2.1,0,12,.1,4.2,6),padMat,false);
 for(let i=1;i<course.points.length;i++){const s=sample(length*i/course.points.length,11),g=new T.Group();g.position.copy(s.p);g.position.y=Math.max(0,s.p.y-1.4);g.rotation.y=s.angle;world.add(g);box(g,cream,0,1.4,0,.22,2.8,.22);mesh(new T.PlaneGeometry(3,1.6),label('› › ›','#ffe071','#284a3c'),g,0,3,0);}
 for(let i=0;i<14;i++){const s=sample(length*(i+.5)/14,i%2?9.6:-9.6),g=new T.Group();g.position.copy(s.p);g.position.y=Math.max(0,s.p.y-.47);g.rotation.y=s.angle;world.add(g);box(g,cream,0,1.55,0,.12,3.1,.12);const penn=mesh(new T.PlaneGeometry(1.5,.7,5,1),mat(i%2?0xed6350:0xffd45c,{side:T.DoubleSide}),g,.81,2.75,0);flags.push({mesh:penn,base:penn.geometry.attributes.position.array.slice()});}
 buildRamps();buildPads();buildSpores();buildStands();
 boxes=[];for(let j=0;j<6;j++)for(let k=-1;k<=1;k++){const d=length*(.09+j*.15),s=sample(d,k*4),g=new T.Group();g.position.copy(s.p);world.add(g);let cube;if(P.itembox){cube=cloneProto(P.itembox);cube.scale.setScalar(1.05);g.add(cube);const lm=label('?','#ed6350','#fff9df',128,128),q=new T.Sprite(new T.SpriteMaterial({map:lm.map,transparent:true,fog:false}));q.scale.set(.95,.95,1);q.position.y=1.3;g.add(q);lm.dispose();}else cube=mesh(new T.BoxGeometry(1.5,1.5,1.5),mat(0xffd858),g);boxes.push({distance:d,offset:k*4,mesh:g,baseY:s.p.y+1.6,cooldown:0});}
 racers=Array.from({length:8},(_,i)=>racer(i,AI_NAMES[i],i===0?colors[colorIndex]:AI_COLORS[i-1]));racers.forEach(r=>{r.mesh=kart(r.color);actors.add(r.mesh);vertical(r,1/60);syncKart(r);});
 setText('courseLabel',course.name);setText('courseNo',String(selected+1).padStart(2,'0'));drawMap();}

function buildRamps(){for(const [u,off,w] of course.ramps){const d=u*length,r={d,off,w,start:d-RAMP_LEN/2,end:d+RAMP_LEN/2};ramps.push(r);const s=sample(d,off);let g;if(P.ramp){g=cloneProto(P.ramp);g.scale.set(w/6.4,1,RAMP_LEN/4.8);}else{g=new T.Group();const m=mesh(new T.BoxGeometry(w,.2,RAMP_LEN),mat(0xed6350),g,0,RAMP_H/2,0);m.rotation.x=-Math.atan(RAMP_H/RAMP_LEN);}g.position.copy(s.p);g.rotation.order='YXZ';g.rotation.set(Math.atan(slopeAt(d)),s.angle+Math.PI,s.bank);world.add(g);
 // Boost-Ring im Flugbogen hinter jeder Schanze
 const rd=r.end+22,rs=sample(rd,off),ring=new T.Mesh(new T.TorusGeometry(3.2,.3,10,36),new T.MeshStandardMaterial({color:0xffd45c,emissive:0xff9a1f,emissiveIntensity:.9,roughness:.4}));ring.position.copy(rs.p);ring.position.y+=4.4;ring.rotation.y=rs.angle;world.add(ring);rings.push({d:lapDist(rd),off,y:ring.position.y,mesh:ring,flash:0});}}
function buildPads(){for(const [u,off] of course.pads){const d=u*length,s=sample(d,off);let g;if(P.bouncepad)g=cloneProto(P.bouncepad);else{g=new T.Group();sphere(g,mat(0xed6350),0,.2,0,1.75,.34,1.75);}g.position.copy(s.p);g.rotation.y=s.angle;world.add(g);pads.push({d,off,mesh:g,squash:0});}}
// Pilzsporen: Linien auf der Strecke und Boegen ueber den Schanzen (InstancedMesh, ein Draw-Call).
function buildSpores(){const add=(d,off,lift)=>{const p=sample(d,off).p;spores.push({d:lapDist(d),off,x:p.x,z:p.z,y:p.y+lift,cd:0,ph:spores.length*.7});};
 for(let k=0;k<8;k++){const d0=length*((k+.3)/8),off=Math.sin(k*2.1)*4.5;if(ramps.some(r=>Math.abs(wrapDiff(d0,r.d))<30))continue;for(let i=0;i<5;i++)add(d0+i*3.6,off,1);}
 for(const r of ramps)[[9,2.4],[17,3.5],[25,3.2]].forEach(([dd,l])=>add(r.end+dd,r.off,l+RAMP_H));
 const m=new T.MeshStandardMaterial({color:0xfff27a,emissive:0xffb627,emissiveIntensity:1.1,roughness:.35,flatShading:true});sporeMesh=new T.InstancedMesh(new T.IcosahedronGeometry(.45,0),m,spores.length);sporeMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);sporeMesh.castShadow=false;world.add(sporeMesh);}
// Tribuenen mit Pilz-Publikum (InstancedMesh; Kappen je Instanz eingefaerbt, jubelt wenn der Spieler vorbeifaehrt).
function buildStands(){if(!P.grandstand)return;const fans=[],v=new T.Vector3();for(const [u,off] of course.stands){const d=u*length,s=sample(d,off),tp=sample(d,0).p,g=cloneProto(P.grandstand);g.position.set(s.p.x,0,s.p.z);g.rotation.y=Math.atan2(tp.x-s.p.x,tp.z-s.p.z);world.add(g);g.updateMatrixWorld(true);for(let row=0;row<4;row++)for(let i=0;i<18;i++){v.set(-8.1+i*.95,.45+row*.75+.16,-(row*1.1-.2)).applyMatrix4(g.matrixWorld);fans.push({x:v.x,y:v.y,z:v.z,ry:g.rotation.y+(Math.sin(i*7.3+row)*.35),ph:(i*1.7+row*2.3)%TAU,d,col:FAN_COLS[(row*7+i*3)%FAN_COLS.length]});}}
 if(!P.spectator||!fans.length)return;const insts=[];P.spectator.traverse(o=>{if(!o.isMesh)return;const im=new T.InstancedMesh(o.geometry,o.material,fans.length);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.castShadow=false;if(o.material.name==='FanCap'){const c=new T.Color();fans.forEach((f,i)=>im.setColorAt(i,c.setHex(f.col)));}world.add(im);insts.push(im);});crowd={fans,insts};updateCrowd(0);}
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_s=new T.Vector3(),_v=new T.Vector3();
function updateCrowd(now){if(!crowd)return;const p=racers[0],party=state==='finished'||state==='ceremony';crowd.fans.forEach((f,i)=>{const cheer=party||(p&&Math.abs(wrapDiff(p.distance,f.d))<75);const y=f.y+(cheer?Math.abs(Math.sin(now*.011+f.ph))*.45:Math.sin(now*.003+f.ph)*.03);_e.set(0,f.ry,cheer?Math.sin(now*.02+f.ph)*.12:0);_q.setFromEuler(_e);_m.compose(_v.set(f.x,y,f.z),_q,_s.set(1.5,1.5,1.5));for(const im of crowd.insts)im.setMatrixAt(i,_m);});for(const im of crowd.insts)im.instanceMatrix.needsUpdate=true;}
function updateSpores(dt,now){if(!sporeMesh)return;spores.forEach((s,i)=>{if(s.cd>0)s.cd-=dt;const vis=s.cd<=0?1:0;_e.set(0,now*.002+s.ph,.4);_q.setFromEuler(_e);_m.compose(_v.set(s.x,s.y+Math.sin(now*.004+s.ph)*.18,s.z),_q,_s.set(vis,vis,vis));sporeMesh.setMatrixAt(i,_m);});sporeMesh.instanceMatrix.needsUpdate=true;}

// ---------------------------------------------------------------- Kart-Physik (vertikal) & Darstellung
function vertical(r,dt){const tr=trackAt(r.distance),rh=rampAt(r.distance,r.offset);let base=tr.h-r.offset*tr.b;const edge=Math.abs(r.offset)-8.9;if(edge>0&&base>0)base=Math.max(0,base-edge/1.5);const ground=base+(rh?rh.y:0);
 if(r.y===undefined){r.y=ground;r.vy=0;r.air=false;r.airT=0;r.trick=0;r.lastGround=ground;r.rampY=0;r.padCd=0;r.ringCd=0;r.stall=0;}
 const roadVy=clamp((ground-r.lastGround)/Math.max(dt,1e-3),-45,45);r.lastGround=ground;
 if(r.air){r.vy-=G*dt;r.y+=r.vy*dt;r.airT+=dt;if(r.y<=ground)land(r,ground,roadVy);}
 else if(!rh&&r.rampY>RAMP_H*.55){r.air=true;r.airT=0;r.vy=Math.min(15,r.vyRoad+2.5+r.speed*.03);r.y+=r.vy*dt;if(nearPlayer(r,50))SFX.ramp(r.id===0?1:.4);}
 // Kuppen: Abheben wird mit hoeherer "Anpress-Schwerkraft" geprueft -> nur mit Boost oder an scharfen Kuppen kurze Luftspruenge.
 else{const cand=r.y+r.vy*dt-.5*G_STICK*dt*dt;if(cand>ground+.06&&r.speed>20){r.air=true;r.airT=0;r.y=cand;r.vy-=G*dt;}else{r.y=ground;r.vy=roadVy;}}
 r.rampY=rh&&!r.air?rh.y:0;r.vyRoad=roadVy;if(r.trick>0)r.trick=Math.min(.45,r.trick+dt);}
function land(r,ground,roadVy){const impact=r.vy-roadVy,me=r.id===0;r.y=ground;r.vy=roadVy;r.air=false;r.airT=0;
 if(r.trick>0){if(r.trick>=.42){r.boost=Math.max(r.boost,1.4);burst(r,0x7ceaff,14);if(me){SFX.trick();say('trick');notice('SUPER TRICK!',.9);}}else{r.speed*=.75;if(me)notice('WACKLIG!',.7);}r.trick=0;}
 if(me&&impact<-12){shake=Math.max(shake,Math.min(.3,-impact*.01));dropPuff(r);dropPuff(r);SFX.land(clamp(-impact/30,.25,1));}}
function startTrick(r){r.trick=.001;if(r.id===0)SFX.whoosh();}
const nearPlayer=(r,range)=>racers[0]&&Math.abs(r.distance-racers[0].distance)<range;
function syncKart(r){const s=sample(r.distance,r.offset),e=r.mesh.rotation;r.mesh.position.set(s.p.x,(r.y??s.p.y)+.1+(r.air?0:Math.sin(elapsed*22+r.id)*.035*(r.speed/50)),s.p.z);e.order='YXZ';
 const spin=r.trick>0?Math.min(1,r.trick/.42)*TAU:0;e.y=s.angle+(r.id===0&&r.drift>0?steering()*.3:0)+(r.stun>0?elapsed*14:0)+spin;
 e.x=r.air?clamp(-r.vy*.018,-.45,.45):-Math.atan(slopeAt(r.distance));e.z=-s.bank+(r.id===0?-steering()*.065:0);r.mesh.userData.shield.visible=r.shield>0;}
const keys=new Set();function steering(){return (keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0);}

// ---------------------------------------------------------------- Audio: Sprecher, SFX (ElevenLabs), Musik
let audioReady=false;
function armAudio(){if(audioReady)return;audioReady=true;if(soundOn){audioInit();playBgm(state==='menu'||state==='finished'?'menu':raceTrack());if(state==='menu')say('welcome');}}
addEventListener('pointerdown',armAudio,{once:true});addEventListener('keydown',armAudio,{once:true});
const VOICE={start:'Auf die Plätze — fertig — los!',lap2:'Runde zwei',lastlap:'Letzte Runde!',turbo:'Turbo!',hit:'Volltreffer!',ouch:'Autsch!',banana:'Banane gelegt!',shield:'Sternenschild!',lead:'Du führst!',win:'Erster Platz!',podium:'Aufs Treppchen!',finish:'Im Ziel!',best:'Neue Bestzeit!',welcome:'Willkommen bei Mushroom Rally!',rocket:'Raketenstart!',early:'Zu früh!',trick:'Super Trick!',spores:'Volle Sporen-Power!',gpnext:'Weiter zum nächsten Rennen!',gpwin:'Grand-Prix-Sieger!',gppodium:'Aufs Grand-Prix-Treppchen!',gpfinish:'Grand Prix beendet!'};
const VIP=new Set(['start','lap2','lastlap','win','podium','finish','best','gpnext','gpwin','gppodium','gpfinish']);
// Maximallaengen je SFX: die Text-to-Sound-Dateien haben teils lange Stille oder Nachhall am Ende.
const SFX_MAX={pickup:1.2,banana:1.6,hit:1,cheer:4,jingle:8,goodtry:6,finallap:4,spore:.6,ramp:1.3,trick:1.1,rocket:1.8};
const CLIPS={};for(const k of Object.keys(VOICE))CLIPS['v_'+k]='assets/audio/voice/'+k+'.mp3';for(const k of Object.keys(SFX_MAX))CLIPS['s_'+k]='assets/audio/sfx/'+k+'.mp3';
const clipData={},clipBuf={},clipFail={},clipNorm={};let voiceGain=null,sfxGain=null,voiceSrc=null,voiceKey=null,voiceQueue=null,pendingVoice=null,duckUntil=0,ducked=false,engine=null,raceFilter=null;
for(const [k,url] of Object.entries(CLIPS))clipData[k]=fetch(url).then(r=>{if(!r.ok)throw new Error(url);return r.arrayBuffer();}).catch(()=>{clipFail[k]=true;return null;});
// Beim Dekodieren: Stille vorne/hinten abschneiden, Maximallaenge, kurzer Fade und Lautheitsangleich ueber RMS.
function prepClip(k,b){const sr=b.sampleRate,ch=b.numberOfChannels,d0=b.getChannelData(0),thr=.004;let start=0;while(start<d0.length&&Math.abs(d0[start])<thr)start++;start=Math.max(0,start-Math.floor(sr*.005));const max=k.startsWith('s_')?SFX_MAX[k.slice(2)]:10;let end=Math.min(d0.length,start+Math.floor(sr*max)),e=end-1;while(e>start&&Math.abs(d0[e])<thr)e--;end=Math.min(end,e+Math.floor(sr*.03));
 const len=Math.max(1,end-start),out=ctx.createBuffer(ch,len,sr),fade=Math.min(len,Math.floor(sr*.04));let sum=0,n=0;for(let c=0;c<ch;c++){const dst=out.getChannelData(c);dst.set(b.getChannelData(c).subarray(start,end));for(let i=0;i<fade;i++)dst[len-1-i]*=i/fade;if(c===0)for(let i=0;i<len;i+=3){sum+=dst[i]*dst[i];n++;}}
 clipNorm[k]=clamp((k.startsWith('v_')?.1:.12)/Math.max(Math.sqrt(sum/Math.max(1,n)),1e-4),.3,3);return out;}
function decodeClips(){for(const k of Object.keys(CLIPS))clipData[k].then(ab=>ab&&ctx.decodeAudioData(ab)).then(b=>{if(!b)return;clipBuf[k]=prepClip(k,b);if(pendingVoice&&'v_'+pendingVoice.key===k&&performance.now()-pendingVoice.t<900){const key=pendingVoice.key;pendingVoice=null;say(key);}}).catch(()=>{clipFail[k]=true;});}
function playClip(k,bus,vol=1,rate=1){const b=clipBuf[k];if(!soundOn||!b||!ctx)return null;const s=ctx.createBufferSource();s.buffer=b;s.playbackRate.value=rate;const g=ctx.createGain();g.gain.value=vol*(clipNorm[k]||1);s.connect(g);g.connect(bus||ctx.destination);s.start();return s;}
function speak(text){if(!('speechSynthesis' in window))return;try{const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith('de'));if(v)u.voice=v;u.rate=1.1;u.volume=.6;speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}}
// Wichtige Ansagen (Start, Runden, Ziel) werden von Item-Rufen nicht unterbrochen; zwei wichtige laufen nacheinander.
function say(key){if(!soundOn||!VOICE[key])return;const now=performance.now(),busy=voiceSrc&&now<duckUntil;
 if(busy&&VIP.has(voiceKey)){if(VIP.has(key))voiceQueue=key;return;}
 if(ctx&&clipBuf['v_'+key]){try{voiceSrc?.stop();}catch{}voiceSrc=playClip('v_'+key,voiceGain,1);voiceKey=key;duckUntil=now+clipBuf['v_'+key].duration*1000+180;return;}
 if(!clipFail['v_'+key]){pendingVoice={key,t:now};return;}speak(VOICE[key]);}
function stopVoice(){try{voiceSrc?.stop();}catch{}voiceSrc=null;voiceQueue=null;pendingVoice=null;duckUntil=0;try{speechSynthesis.cancel();}catch{}}
function duckBgm(now){if(voiceQueue&&now>=duckUntil){const k=voiceQueue;voiceQueue=null;say(k);}ducked=now<duckUntil;bgmTick(now);}
function audioInit(){if(ctx)return;ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});
 const o1=ctx.createOscillator();o1.type='sawtooth';const o2=ctx.createOscillator();o2.type='square';const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700;f.Q.value=1.1;const g=ctx.createGain();g.gain.value=0;o1.connect(f);o2.connect(f);f.connect(g);g.connect(ctx.destination);o1.start();o2.start();
 const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=950;bp.Q.value=3.2;const ng=ctx.createGain();ng.gain.value=0;ns.connect(bp);bp.connect(ng);ng.connect(ctx.destination);ns.start();
 engine={o1,o2,f,g,noise:ng};
 // Pegel: Musik vorne, Sprecher deutlich darunter (Wunsch nach Runde 5), Effekte dazwischen.
 voiceGain=ctx.createGain();voiceGain.gain.value=.5;voiceGain.connect(ctx.destination);sfxGain=ctx.createGain();sfxGain.gain.value=.6;sfxGain.connect(ctx.destination);buildRaceFilter();decodeClips();}
function sfxNoise(dur,f0,f1,vol=.2,q=2){if(!soundOn||!ctx)return;const t=ctx.currentTime,b=ctx.createBuffer(1,Math.max(1,ctx.sampleRate*dur|0),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=ctx.createBufferSource();s.buffer=b;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=q;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);const gg=ctx.createGain();gg.gain.setValueAtTime(vol,t);gg.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(bp);bp.connect(gg);gg.connect(ctx.destination);s.start();}
function sfxTone(f0,f1,dur,type='square',vol=.08,delay=0){if(!soundOn||!ctx)return;const t=ctx.currentTime+delay,o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);const gg=ctx.createGain();gg.gain.setValueAtTime(vol,t);gg.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(gg);gg.connect(ctx.destination);o.start(t);o.stop(t+dur+.02);}
// ElevenLabs-SFX haben Vorrang; die Synthese bleibt als Ersatz, solange eine Datei fehlt oder noch dekodiert wird.
const SFX={
 pickup(){if(playClip('s_pickup',sfxGain,.6))return;[880,1108,1318].forEach((f,i)=>sfxTone(f,f,.09,'square',.05,i*.07));},
 tick(){sfxTone(1500,1400,.03,'square',.018);},
 boost(){sfxNoise(.5,400,3200,.18,1.5);sfxTone(180,760,.35,'sawtooth',.035);},
 shell(){sfxTone(900,180,.22,'sawtooth',.06);sfxNoise(.15,2000,400,.08,2);},
 banana(){sfxTone(520,220,.3,'triangle',.07);},
 slip(v=1){if(playClip('s_banana',sfxGain,.8*v))return;sfxTone(520,160,.45,'triangle',.08*v);},
 shield(){[660,880,1320].forEach((f,i)=>sfxTone(f,f*.99,.4,'triangle',.035,i*.03));},
 hit(v=1){if(playClip('s_hit',sfxGain,.9*v))return;sfxTone(160,60,.25,'square',.1*v);sfxNoise(.18,300,90,.1*v,1);},
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
 land(v){sfxTone(110,45,.2,'sine',.14*v);sfxNoise(.14,500,120,.08*v,1);}};
// BGM: ElevenLabs-Music-Tracks. KI-Musik loopt nicht nahtlos -> je Track zwei <audio>-Elemente mit Ueberblendung kurz vor dem Ende.
// TRACK_GAIN gleicht die gemessene Lautheit (RMS) der Tracks an; BGM_VOL liegt bewusst ueber dem Sprecher.
const BGM_SRC={menu:'bgm_menu.mp3',race:'bgm_race.mp3',sunset:'bgm_sunset.mp3',night:'bgm_night.mp3'},RACE_TRACKS=['race','sunset','night'],BGM_VOL=.62,BGM_XF=2.2;
// Gemessen per rallyTest.measure(): RMS menu .164, race .175, sunset .186, night .192 -> auf .175 angeglichen.
const TRACK_GAIN={menu:1.07,race:1,sunset:.94,night:.91};
const bgm={current:null,ready:{},failed:{},tracks:{},rate:1};
for(const [name,src] of Object.entries(BGM_SRC)){const els=[0,1].map(()=>{const a=new Audio('assets/audio/'+src);a.preload=name==='menu'?'auto':'metadata';a.volume=0;return a;});els[0].addEventListener('canplaythrough',()=>bgm.ready[name]=true);els[0].addEventListener('error',()=>bgm.failed[name]=true);bgm.tracks[name]={els,gains:null,active:0,xf:-1,t0:0};}
const raceTrack=()=>{const m=courses[selected].music;return bgm.failed[m]?'race':m;};
function buildRaceFilter(){if(raceFilter||!ctx)return;try{raceFilter=ctx.createBiquadFilter();raceFilter.type='lowpass';raceFilter.frequency.value=4000;raceFilter.connect(ctx.destination);for(const n of RACE_TRACKS){const tr=bgm.tracks[n];tr.gains=tr.els.map(a=>{const g=ctx.createGain();g.gain.value=0;ctx.createMediaElementSource(a).connect(g);g.connect(raceFilter);a.volume=1;return g;});}}catch{raceFilter=null;}}
function setTrackVol(tr,i,v){if(tr.gains)tr.gains[i].gain.value=v;else tr.els[i].volume=clamp(v,0,1);}
function setBgmRate(rate){bgm.rate=rate;const tr=bgm.tracks[bgm.current];if(!tr)return;for(const a of tr.els){a.preservesPitch=false;a.mozPreservesPitch=false;a.playbackRate=rate;}}
function stopBgm(){for(const tr of Object.values(bgm.tracks))tr.els.forEach((a,i)=>{a.pause();setTrackVol(tr,i,0);});bgm.current=null;}
function playBgm(name){if(!soundOn||bgm.failed[name])return;if(bgm.current===name)return;stopBgm();const tr=bgm.tracks[name];tr.active=0;tr.xf=-1;tr.t0=performance.now();for(const a of tr.els)a.playbackRate=1;bgm.rate=1;const a=tr.els[0];try{a.currentTime=0;}catch{}bgm.current=name;a.play().catch(()=>{if(bgm.current===name)bgm.current=null;});}
function bgmTick(now){const tr=bgm.tracks[bgm.current];if(!tr)return;const a=tr.els[tr.active],b=tr.els[1-tr.active],dur=a.duration,base=BGM_VOL*TRACK_GAIN[bgm.current]*(ducked?.72:1)*Math.min(1,(now-tr.t0)/700),xfDur=BGM_XF*bgm.rate;
 if(tr.xf<0&&isFinite(dur)&&dur>BGM_XF*3&&a.currentTime>dur-xfDur){tr.xf=now;try{b.currentTime=0;}catch{}if(b.currentTime>1)b.load();b.playbackRate=bgm.rate;b.play().catch(()=>{});}
 let va=1,vb=0;if(tr.xf>=0){const k=Math.min(1,(now-tr.xf)/(BGM_XF*1000));va=Math.cos(k*Math.PI/2);vb=Math.sin(k*Math.PI/2);if(k>=1){a.pause();tr.active=1-tr.active;tr.xf=-1;setTrackVol(tr,1-tr.active,0);setTrackVol(tr,tr.active,base);return;}}
 setTrackVol(tr,tr.active,base*va);setTrackVol(tr,1-tr.active,base*vb);}
function setSound(){soundOn=!soundOn;if(soundOn)audioInit();if(engine)engine.g.gain.value=0;if(!soundOn){stopBgm();stopVoice();}else playBgm(state==='menu'||state==='finished'||state==='ceremony'?'menu':raceTrack());$('sound').textContent=soundOn?'♪ AN':'♪ AUS';$('sound').setAttribute('aria-label',soundOn?'Ton ausschalten':'Ton einschalten');}

// ---------------------------------------------------------------- Spielablauf
function start(){if(gp.active)selected=gp.race;syncTrackButtons();keys.clear();buildCourse();state='countdown';elapsed=0;countdown=3;startPress=-1;noticeTimer=0;
 for(const id of ['menu','result','ceremony','pausePanel'])$(id).hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('touch').hidden=false;$('gpBadge').hidden=!gp.active;
 document.body.classList.add('racing');document.body.classList.remove('cer');if(soundOn)audioInit();finishMusicAt=0;playBgm(raceTrack());stopVoice();say('start');updateCamera(1,true);
 if(coarseInput){wantFs=true;enterFs();}}
function home(){gp.active=false;state='menu';keys.clear();buildCourse();for(const id of ['hud','touch','pause','pausePanel','result','ceremony'])$(id).hidden=true;$('menu').hidden=false;setText('message','');document.body.classList.remove('racing','cer');if(engine)engine.g.gain.value=0;stopVoice();finishMusicAt=0;playBgm('menu');}
let beforePause='race';function pause(){if(state==='paused'){state=beforePause;$('pausePanel').hidden=true;}else if(state==='race'||state==='countdown'){beforePause=state;state='paused';keys.clear();$('pausePanel').hidden=false;stopVoice();}if(engine)engine.g.gain.value=soundOn&&state==='race'?.011:0;}
function use(){if(state!=='race')return;useItem(racers[0]);}
// Items: core.activate() wirkt sofort; beim Such-Panzer wird der Treffer bis zur Ankunft des Geschosses zurueckgehalten.
function useItem(r){if(r.itemPending)return null;const prev=racers.map(x=>[x.stun,x.speed]),res=activate(r,racers);if(!res)return null;const me=r.id===0;
 if(res.type==='shell'&&res.target!==undefined){const t=racers[res.target];[t.stun,t.speed]=prev[res.target];}
 if(me&&(res.type==='boost'||res.type==='triple'))SFX.boost();else if(me&&SFX[res.type])SFX[res.type]();
 if(res.type==='banana')dropBanana(r);if(res.type==='shell')fireShell(r,res.target);
 if(me){if(res.type==='boost'||res.type==='triple')say('turbo');if(res.type==='shield')say('shield');if(res.type==='banana')say('banana');notice({boost:'TURBO!',triple:'TURBO ×'+(res.charges||0),shield:'STERNENSCHILD',banana:'BANANE!',shell:'SUCH-PANZER!'}[res.type],.9);}
 return res;}
const MAX_HAZARDS=12;
function dropBanana(r){if(hazards.length>=MAX_HAZARDS){const old=hazards.shift();actors.remove(old.mesh);}const d=r.distance-5,s=sample(d,r.offset),g=new T.Group();actors.add(g);g.position.copy(s.p);g.rotation.y=Math.random()*TAU;if(P.banana){const b=cloneProto(P.banana);b.scale.setScalar(1.8);g.add(b);}else mesh(new T.ConeGeometry(.6,1.3,5),gold,g,0,.7,0);hazards.push({mesh:g,distance:d,offset:r.offset,life:20,owner:r.id});}
function fireShell(r,target){const g=new T.Group();if(P.shell){const s=cloneProto(P.shell);s.scale.setScalar(1.25);g.add(s);}else sphere(g,mat(0x5cc46a),0,.4,0,.55,.4,.55);actors.add(g);shots.push({g,d:r.distance+2.5,off:r.offset,owner:r.id,target,t:0});}
function hitSpores(r){const lost=loseSpores(r);if(lost&&r.id===0)burst(r,0xfff27a,lost*4);return lost;}
function shellImpact(sh){const t=racers[sh.target],me=sh.owner===0,onMe=sh.target===0,near=nearPlayer(t,60);
 if(t.shield>0){burst(t,0xffe263,14);if(onMe)notice('ABGEWEHRT!',.9);if(near)SFX.shield();return;}
 if(t.finishTime===null){t.stun=2.8;t.speed*=.35;hitSpores(t);}burst(t,0x8beb73,18);if(me||onMe||near)SFX.hit(me||onMe?1:.5);
 if(me){say('hit');notice('VOLLTREFFER!',1);}if(onMe){say('ouch');notice('AUTSCH! −✦',1);shake=.45;}}
function updateShots(dt){for(let i=shots.length-1;i>=0;i--){const sh=shots[i];sh.t+=dt;const tg=sh.target!==undefined?racers[sh.target]:null;sh.d+=((tg?Math.max(tg.speed,0):racers[sh.owner].speed)+72)*dt;if(tg)sh.off+=(tg.offset-sh.off)*Math.min(1,dt*6);const s=sample(sh.d,sh.off);sh.g.position.set(s.p.x,s.p.y+.15+Math.abs(Math.sin(sh.t*18))*.18,s.p.z);sh.g.rotation.y+=dt*16;
  if((tg&&sh.d>=tg.distance-1.2)||(!tg&&sh.t>.9)||sh.t>3){if(tg)shellImpact(sh);else burst({mesh:sh.g},0x8beb73,8);actors.remove(sh.g);shots.splice(i,1);}}}
function burst(r,color,n=5){for(let i=0;i<n;i++){const g=mesh(new T.BoxGeometry(.15,.15,.15),new T.MeshBasicMaterial({color}),actors);g.castShadow=false;g.position.copy(r.mesh.position);g.position.y+=.5;const a=Math.random()*TAU;sparks.push({mesh:g,v:new T.Vector3(Math.sin(a)*4,2+Math.random()*3,Math.cos(a)*4),life:.6});}}
const marks=new T.Group();scene.add(marks);
const markGeo=new T.PlaneGeometry(.3,.95);markGeo.rotateX(-Math.PI/2);sharedGeo.add(markGeo);
const skids=Array.from({length:90},()=>{const m=new T.Mesh(markGeo,new T.MeshBasicMaterial({color:0x21303a,transparent:true,opacity:.38,depthWrite:false}));m.visible=false;marks.add(m);return{m,mat:m.material,life:0};});
let skidIdx=0;
function dropSkid(x,y,z,angle){const s=skids[skidIdx++%skids.length];s.m.position.set(x,y+.08,z);s.m.rotation.y=angle;s.mat.opacity=.38;s.life=4;s.m.visible=true;}
const puffGeo=new T.SphereGeometry(.13,8,6);sharedGeo.add(puffGeo);
function dropPuff(r){if(puffs.length>=24)return;const m=new T.Mesh(puffGeo,new T.MeshBasicMaterial({color:0xdfe8e8,transparent:true,opacity:.38,depthWrite:false}));const c=Math.cos(r.mesh.rotation.y),s2=Math.sin(r.mesh.rotation.y);m.position.set(r.mesh.position.x-s2*1.35,r.mesh.position.y+.45,r.mesh.position.z-c*1.35);actors.add(m);puffs.push({m,v:new T.Vector3(-s2*2+(Math.random()-.5),.9,-c*2+(Math.random()-.5)),life:.75});}

function update(dt){
 if(state==='ceremony'){updateCeremony(dt);return;}
 if(state!=='race'&&state!=='countdown')return;
 const player=racers[0],gasHeld=keys.has('ArrowUp')||keys.has('KeyW');
 if(state==='countdown'){const prev=Math.ceil(countdown);countdown-=dt;if(gasHeld){if(startPress<0)startPress=countdown;}else startPress=-1;
  if(Math.ceil(countdown)!==prev)SFX.count(countdown<=0);setText('message',countdown>0?String(Math.ceil(countdown)):'LOS!');
  if(engine&&ctx){const t=ctx.currentTime;engine.o1.frequency.setTargetAtTime(gasHeld?150:60,t,.08);engine.o2.frequency.setTargetAtTime(gasHeld?75:30,t,.08);engine.f.frequency.setTargetAtTime(gasHeld?1400:500,t,.1);engine.g.gain.setTargetAtTime(soundOn?.008:0,t,.1);}
  if(countdown<=0){state='race';notice('LOS!',.8);
   // Raketenstart: Gas waehrend der "1" gedrueckt und gehalten. Schon bei der "3" gedrueckt = abgewuergt.
   if(gasHeld&&startPress>0&&startPress<=1.0){player.boost=Math.max(player.boost,1.9);player.speed=34;SFX.rocket();say('rocket');notice('RAKETENSTART!',1.1);burst(player,0xffa53d,20);}
   else if(gasHeld&&startPress>=2.2){player.stall=1.1;say('early');notice('ZU FRÜH!',1.1);}
   for(const r of racers)if(r.id&&Math.random()<.35){r.boost=.9;r.speed=24;}}
  return;}
 elapsed+=dt;const order=ranking(racers),placeOf=r=>order.indexOf(r)+1,driftKey=keys.has('ShiftLeft')||keys.has('ShiftRight');
 if(driftKey&&!prevDrift&&player.air&&player.airT>.06&&!player.trick)startTrick(player);prevDrift=driftKey;
 if(roulette){roulette.t-=dt;roulette.tick-=dt;if(roulette.tick<=0){roulette.tick=.075;SFX.tick();}if(roulette.t<=0){player.item=roulette.final;player.charges=player.item==='triple'?3:0;player.itemPending=false;SFX.pickup();notice(ITEM_NAMES[player.item]+'!',.8);roulette=null;}}
 for(const r of racers){if(r.finishTime!==null)continue;const me=r.id===0,s=sample(r.distance),ahead=sample(r.distance+4),cross=s.t.x*ahead.t.z-s.t.z*ahead.t.x;
  r.stall=Math.max(0,(r.stall||0)-dt);r.padCd=Math.max(0,(r.padCd||0)-dt);r.ringCd=Math.max(0,(r.ringCd||0)-dt);
  const input=me?{gas:(autoGas||gasHeld)&&r.stall<=0,brake:keys.has('ArrowDown')||keys.has('KeyS'),steer:steering(),drift:driftKey,air:r.air}:{gas:true,steer:clamp(((Math.sin(r.distance*.013+r.id*1.8)*4)-r.offset)*.35,-1,1),air:r.air};
  const oldLap=lap(r,length),oldBoost=r.boost;advance(r,dt,input,me?cross:0);vertical(r,dt);
  if(!me){r.speed*=1-dt*(.025+r.id*.003);if(r.distance<player.distance-80)r.speed+=dt*2;if(r.cooldown===0&&r.item){useItem(r);r.cooldown=r.item==='triple'?1.2:6;}if(r.air&&r.airT>.1&&!r.trick&&Math.random()<dt*2.5)startTrick(r);}
  if(!r.air)for(const f of [.18,.43,.72])if(Math.abs(wrapDiff(r.distance,length*f))<2.1&&Math.abs(r.offset)<6.2)r.boost=Math.max(r.boost,.9);
  if(me&&r.boost>oldBoost&&oldBoost===0){SFX.boost();if(r.drift===0)burst(r,0x7ceaff,8);}
  if(me&&r.stall>0&&frame%5===0)dropPuff(r);
  for(const pad of pads)if(!r.air&&r.padCd<=0&&Math.abs(wrapDiff(r.distance,pad.d))<1.9&&Math.abs(r.offset-pad.off)<2){r.air=true;r.airT=0;r.vy=11.5+r.speed*.035;r.y+=.1;r.boost=Math.max(r.boost,.5);r.padCd=.6;pad.squash=.45;if(nearPlayer(r,50))SFX.boing(me?1:.4);if(me)notice('BOING!',.6);}
  for(const ring of rings)if(r.air&&r.ringCd<=0&&Math.abs(wrapDiff(r.distance,ring.d))<2&&Math.abs(r.offset-ring.off)<3.1&&Math.abs(r.y+.9-ring.y)<2.7){r.boost=Math.max(r.boost,1.7);r.ringCd=.8;ring.flash=.5;if(me){SFX.ring();notice('RING-BOOST!',.8);burst(r,0xffd45c,16);}}
  for(const sp of spores)if(sp.cd<=0&&Math.abs(wrapDiff(r.distance,sp.d))<1.8&&Math.abs(r.offset-sp.off)<1.7&&Math.abs(r.y+.8-sp.y)<2.3){sp.cd=9;if(r.spores<MAX_SPORES){r.spores++;if(me){SFX.spore(r.spores);if(r.spores===MAX_SPORES){say('spores');notice('VOLLE SPOREN-POWER!',1);}}}}
  for(const b of boxes){if(b.cooldown<=0&&!r.item&&!r.itemPending&&Math.abs(wrapDiff(r.distance,b.distance))<2.8&&Math.abs(r.offset-b.offset)<2&&Math.abs(r.y+1-b.baseY)<3){b.cooldown=4;r.cooldown=4;if(me){r.itemPending=true;roulette={t:.95,tick:0,final:rollItem(placeOf(r),racers.length)};}else{r.item=rollItem(placeOf(r),racers.length);r.charges=r.item==='triple'?3:0;}}}
  if(me&&lap(r,length)>oldLap){const isLast=lap(r,length)===LAPS;notice(isLast?'LETZTE RUNDE!':'RUNDE 2',1.5);say(isLast?'lastlap':'lap2');if(isLast){if(!playClip('s_finallap',sfxGain,.9))SFX.lap();setBgmRate(1.07);}else SFX.lap();}
  finish(r,length,elapsed);syncKart(r);
  if(r.boost>0&&frame%4===0)burst(r,0xffd452,1);if(me&&r.drift>.4&&frame%4===0)burst(r,r.drift>1.6?0xffb442:0x6addff,2);
  if(me&&!r.air&&r.drift>.4&&r.speed>12&&frame%3===0){const c=Math.cos(r.mesh.rotation.y),s2=Math.sin(r.mesh.rotation.y);for(const side of[-1,1]){const ox=side*.85,oz=-.85;dropSkid(r.mesh.position.x+ox*c+oz*s2,r.y,r.mesh.position.z-ox*s2+oz*c,r.mesh.rotation.y);}}
  if(me&&input.gas&&!r.air&&r.speed>6&&r.speed<42&&frame%7===0)dropPuff(r);
  // Bananen treffen jeden ausser dem Leger (nicht in der Luft); Schild zerstoert sie. Der Spieler rutscht kuerzer als die KI.
  for(const h of hazards){if(h.owner!==r.id&&h.life>0&&!r.air&&Math.abs(r.distance-h.distance)<3&&Math.abs(r.offset-h.offset)<1.8){h.life=0;if(r.shield>0){burst(r,0xffe263,10);continue;}r.stun=me?1.5:2;r.speed*=me?.45:.4;hitSpores(r);burst(r,0xffd23f,12);if(me){SFX.slip();say('ouch');notice('AUSGERUTSCHT!',1);shake=.35;}else if(nearPlayer(r,45))SFX.slip(h.owner===0?.8:.4);}}
 }
 updateShots(dt);
 const place=placeOf(player);if(place===1&&lastPlace>1&&elapsed>5&&elapsed-leadAt>12){leadAt=elapsed;say('lead');notice('FÜHRUNG!',.9);}lastPlace=place;
 for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){const a=racers[i],b=racers[j];if(Math.abs(a.distance-b.distance)<2.4&&Math.abs(a.offset-b.offset)<1.6&&Math.abs(a.y-b.y)<1.5){const sign=a.offset>b.offset?1:-1;a.offset+=sign*dt*3;b.offset-=sign*dt*3;}}
 if(engine&&ctx){const t=ctx.currentTime,sp=player.speed;engine.o1.frequency.setTargetAtTime(48+sp*2.4+(player.air?40:0),t,.06);engine.o2.frequency.setTargetAtTime(24+sp*1.2,t,.06);engine.f.frequency.setTargetAtTime(420+sp*16,t,.08);engine.g.gain.setTargetAtTime(soundOn?.011:0,t,.09);engine.noise.gain.setTargetAtTime(soundOn&&player.drift>.4&&sp>12&&!player.air?.04:0,t,.07);if(raceFilter)raceFilter.frequency.setTargetAtTime(3600+sp*195,t,.18);}
 if(player.finishTime!==null)end();}

function end(){elapsed=racers[0].finishTime??elapsed;state='finished';keys.clear();roulette=null;burst(racers[0],0xffd452,26);burst(racers[0],0xed6350,16);burst(racers[0],0x55bdb2,16);
 $('result').hidden=false;$('touch').hidden=true;const order=ranking(racers),place=order.indexOf(racers[0])+1,board=$('leaderboard');
 $('resultTitle').textContent=place===1?'Der Pokal gehört dir!':`Platz ${place}. Stark gefahren!`;$('resultTime').textContent=`${course.name} · 3 Runden · ${format(elapsed)}`;
 stopVoice();say(place===1?'win':place<=3?'podium':'finish');if(place<=3)SFX.cheer();board.replaceChildren();
 if(gp.active){const gained={};order.forEach((r,i)=>gained[r.id]=GP_POINTS[i]);addGpPoints(gp.points,order);$('resultEyebrow').textContent=`GRAND PRIX · RENNEN ${gp.race+1} / 3`;
  gpStandings(gp.points,racers.map(r=>r.id)).forEach((id,i)=>{const li=document.createElement('li');if(id===0)li.className='me';li.innerHTML=`<span>${i+1}.</span><span>${racers[id].name}</span><span class="gain">+${gained[id]}</span><span>${gp.points[id]} P</span>`;board.append(li);});
  $('again').textContent=gp.race<2?'Nächstes Rennen →':'Zur Siegerehrung 🏆';if(gp.race<2)say('gpnext');}
 else{$('resultEyebrow').textContent='ZIEL ERREICHT';$('again').textContent='Noch eine Runde Chaos ↗';order.forEach((r,i)=>{const li=document.createElement('li');if(r.id===0)li.className='me';li.innerHTML=`<span>${i+1}.</span><span>${r.name}</span><span>${r.finishTime!==null?format(r.finishTime):'noch im Rennen'}</span>`;board.append(li);});}
 if(engine)engine.g.gain.value=0;let wasBest=false;try{if(!TEST){const key='mushroom-rally-best-'+selected,old=Number(localStorage.getItem(key)||Infinity);if(elapsed<old){localStorage.setItem(key,String(elapsed));wasBest=true;}}}catch{}refreshBest();if(wasBest){say('best');burst(racers[0],0xffe16a,36);notice('NEUE BESTZEIT!',2.6);}
 // Zieleinlauf: Rennmusik aus, Siegesfanfare (Platz 1-3) oder Trost-Jingle, danach die Menue-Musik.
 stopBgm();if(!playClip(place<=3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(place<=3?6800:4800);if(!wasBest)setText('message','');}
function nextAfterResult(){if(gp.active){if(gp.race<2){gp.race++;start();}else ceremony();}else start();}

// ---------------------------------------------------------------- Grand-Prix-Siegerehrung
function ceremony(){state='ceremony';clearGroup(actors);hazards=[];shots=[];sparks=[];puffs=[];
 for(const id of ['result','hud','touch','pause'])$(id).hidden=true;document.body.classList.remove('racing');document.body.classList.add('cer');
 const standings=gpStandings(gp.points,racers.map(r=>r.id)),pos=sample(length*.035,-34).p,group=new T.Group();group.position.set(pos.x,0,pos.z);const look=sample(length*.035,0).p;
 // Deko im Umkreis ausblenden, damit Baeume/Pilze die Kamera-Bahn nicht verdecken (Tribuene steht auf der anderen Seite).
 world.traverse(o=>{if((o.isGroup||o.isMesh)&&o.parent===world&&!o.isInstancedMesh&&o.position.y<20&&Math.hypot(o.position.x-pos.x,o.position.z-pos.z)<26&&Math.hypot(o.position.x-pos.x,o.position.z-pos.z)>0.5)o.visible=false;});group.rotation.y=Math.atan2(look.x-pos.x,look.z-pos.z);actors.add(group);
 const S=2.2;if(P.podium){const pd=cloneProto(P.podium);pd.scale.setScalar(S);group.add(pd);}else[[0,1.5],[-2.6,1],[2.6,.7]].forEach(([x,h])=>box(group,cream,x*S,h*S/2,0,2.5*S,h*S,2.2*S));
 [[0,1.5],[-2.6,1],[2.6,.7]].forEach(([x,h],i)=>{const r=racers[standings[i]],k=kart(r.color);k.position.set(x*S,h*S,0);k.scale.setScalar(1.25);group.add(k);});
 let trophy=null;if(P.trophy){trophy=cloneProto(P.trophy);trophy.scale.setScalar(1.6);trophy.position.set(0,1.5*S+3.1,0);group.add(trophy);}
 group.updateMatrixWorld(true);cer={group,trophy,t:0,burstT:0,center:new T.Vector3(pos.x,4,pos.z),angle:group.rotation.y};
 const mine=standings.indexOf(0)+1;$('cerTitle').textContent=mine===1?'Grand-Prix-Sieger! 🏆':mine<=3?`Platz ${mine} im Grand Prix!`:`Grand Prix beendet – Platz ${mine}`;
 const board=$('cerBoard');board.replaceChildren();standings.forEach((id,i)=>{const li=document.createElement('li');if(id===0)li.className='me';li.innerHTML=`<span>${['🥇','🥈','🥉'][i]||(i+1)+'.'}</span><span>${racers[id].name}</span><span>${gp.points[id]} P</span>`;board.append(li);});
 $('ceremony').hidden=false;stopVoice();say(mine===1?'gpwin':mine<=3?'gppodium':'gpfinish');SFX.cheer();stopBgm();if(!playClip(mine<=3?'s_jingle':'s_goodtry',sfxGain,.8))SFX.fanfare();finishMusicAt=performance.now()+(mine<=3?6800:4800);}
function updateCeremony(dt){if(!cer)return;cer.t+=dt;cer.burstT-=dt;if(cer.trophy){cer.trophy.rotation.y+=dt*1.2;cer.trophy.position.y=1.5*2.2+3.1+Math.sin(cer.t*2)*.25;}
 if(cer.burstT<=0){cer.burstT=.35;const p=new T.Vector3((Math.random()-.5)*14,4+Math.random()*4,(Math.random()-.5)*4).applyMatrix4(cer.group.matrixWorld);burst({mesh:{position:p}},FAN_COLS[Math.floor(Math.random()*FAN_COLS.length)],10);}}

// ---------------------------------------------------------------- HUD, Karte, Kamera
function format(time){return `${String(Math.floor(time/60)).padStart(2,'0')}:${(time%60).toFixed(1).padStart(4,'0')}`;}
function hud(){if(state==='menu'||state==='ceremony'||!racers.length)return;const p=racers[0];
 setText('place',String(ranking(racers).indexOf(p)+1));const lapHtml=`${lap(p,length)} <em>/ 3</em>`;if(HC.lap!==lapHtml){HC.lap=lapHtml;$('lap').innerHTML=lapHtml;}
 if(gp.active){const g=`${gp.race+1} <em>/ 3</em>`;if(HC.gp!==g){HC.gp=g;$('gpRace').innerHTML=g;}}
 setText('time',format(elapsed));setText('speed',String(Math.round(p.speed*2.2)));setText('sporeCount',String(p.spores||0));
 let icon='?',name='ITEM SAMMELN';if(roulette){const ks=Object.keys(ITEM_ICONS);icon=ITEM_ICONS[ks[Math.floor(performance.now()/75)%ks.length]];name='…';}else if(p.item){icon=p.item==='triple'?'⚡'+p.charges:ITEM_ICONS[p.item];name=ITEM_NAMES[p.item];}
 setText('itemIcon',icon);setText('titemIcon',icon);setText('itemName',name);const ready=p.item?'1':'0';if(HC.ready!==ready){HC.ready=ready;$('titem').classList.toggle('ready',!!p.item);$('item').classList.toggle('ready',!!p.item);}
 const full=p.spores>=MAX_SPORES?'1':'0';if(HC.full!==full){HC.full=full;$('spores').classList.toggle('full',full==='1');}
 const w=Math.min(100,p.drift/2.5*100).toFixed(0)+'%';if(HC.dw!==w){HC.dw=w;$('driftbar').style.width=w;}const dc=p.drift>1.6?'#ffcb55':'#73dcff';if(HC.dc!==dc){HC.dc=dc;$('driftbar').style.background=dc;}
 setText('driftlabel',p.boost>0?'TURBO AKTIV!':p.air?(p.trick?'TRICK!':'IN DER LUFT · DRIFT = TRICK'):p.drift>.7?'LOS LASSEN → MINI-TURBO':coarseInput?'DRIFT HALTEN':'SHIFT HALTEN · DRIFT');}
function refreshBest(){try{document.querySelectorAll('#tracks .track').forEach((b,i)=>{const t=localStorage.getItem('mushroom-rally-best-'+i);let span=b.querySelector('.best');if(!span){span=document.createElement('span');span.className='best';b.append(span);}span.textContent=t?'BEST '+format(Number(t)):'—';});}catch{}}
function drawMap(){const c=$('map'),q=c.getContext('2d'),k=mapScale;q.clearRect(0,0,200,160);q.lineWidth=9;q.lineJoin='round';q.strokeStyle='#23483988';q.beginPath();for(let i=0;i<=120;i++){const p=sample(length*i/120).p;const x=100+p.x*k,y=80+p.z*k;i?q.lineTo(x,y):q.moveTo(x,y);}q.stroke();q.lineWidth=3;q.strokeStyle='#fff6dd';q.stroke();q.fillStyle='#ed6350';for(const r of ramps){const p=sample(r.d,r.off).p;q.fillRect(100+p.x*k-2.5,80+p.z*k-2.5,5,5);}for(const r of [...racers].reverse()){const p=sample(r.distance,r.offset).p;q.fillStyle=r.id===0?'#ffe16a':'#fff';q.beginPath();q.arc(100+p.x*k,80+p.z*k,r.id===0?4.5:2.7,0,TAU);q.fill();}}
const tempLook=new T.Vector3();
function updateCamera(dt,snap=false){const portrait=camera.aspect<.9;
 if(state==='menu'){const s=sample(length*.05);const angle=.45+Math.sin(performance.now()*.00006)*.16;camera.position.set(s.p.x+Math.sin(angle)*48,30+s.p.y,s.p.z+Math.cos(angle)*42);camera.lookAt(s.p.x-12,1,s.p.z-10);setFov(portrait?72:58,dt,true);return;}
 if(state==='ceremony'&&cer){const a=cer.angle+Math.sin(cer.t*.25)*.9,r=portrait?30:23;camera.position.set(cer.center.x+Math.sin(a)*r,cer.center.y+5+Math.sin(cer.t*.4),cer.center.z+Math.cos(a)*r);camera.lookAt(cer.center.x,cer.center.y+(portrait?-4.5:1.5),cer.center.z);
  // Podest nicht hinter dem Ergebnis-Panel: am Desktop Blickpunkt nach rechts schieben (Podest wandert nach links).
  if(!portrait&&innerWidth>900){camera.updateMatrixWorld();tempLook.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(7).add(cer.center);tempLook.y+=1.5;camera.lookAt(tempLook);}
  setFov(portrait?70:52,dt,true);return;}
 if(!racers.length)return;const p=racers[0],s=sample(p.distance,p.offset),future=sample(p.distance+12,p.offset*(portrait?.9:.5)),back=portrait?13.5:10.7,up=portrait?7.2:5.9;
 const desired=s.p.clone().addScaledVector(s.t,-back);desired.y=Math.max(s.p.y,(p.y??s.p.y)-.6)+up;camera.position.lerp(desired,snap?1:1-Math.exp(-dt*7));
 tempLook.copy(future.p);tempLook.y=Math.max(future.p.y,(p.y??0)-1.5)+1.3;camera.lookAt(tempLook);
 if(p.boost>0){camera.position.y+=Math.sin(elapsed*63)*.07;camera.position.x+=Math.sin(elapsed*49)*.05;}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.x+=(Math.random()-.5)*shake*.9;camera.position.y+=(Math.random()-.5)*shake*.7;}
 setFov((portrait?70:58)+(p.boost>0?9:0)+(p.air?3:0),dt,snap);}
function setFov(target,dt,snap){camFov=snap?target:camFov+(target-camFov)*Math.min(1,dt*6);if(Math.abs(camera.fov-camFov)>.01){camera.fov=camFov;camera.updateProjectionMatrix();}}
function adaptQuality(fps){if(state!=='race'||fps>=45||quality.level>=2)return;quality.level++;quality.dprCap=Math.max(quality.level===1?1:.85,quality.dprCap-.35);if(quality.level===2){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m)m.needsUpdate=true;});}renderer.setPixelRatio(Math.min(devicePixelRatio,quality.dprCap));resize();}
function animateWorld(dt,now){
 for(const b of boxes){b.cooldown=Math.max(0,b.cooldown-dt);b.mesh.visible=b.cooldown<=0;b.mesh.rotation.y=now*.001;b.mesh.position.y=b.baseY+Math.sin(now*.003+b.distance)*.2;}
 for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.life-=dt;p.v.y-=dt*8;p.mesh.position.addScaledVector(p.v,dt);p.mesh.scale.setScalar(Math.max(0,p.life*1.6));if(p.life<=0){actors.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();sparks.splice(i,1);}}
 for(const f of flags){const pos=f.mesh.geometry.attributes.position,q=pos.array;for(let v=0;v<pos.count;v++){const xn=(f.base[v*3]+.75)/1.5;q[v*3+2]=f.base[v*3+2]+Math.sin(now*.006+xn*4)*.11*xn;}pos.needsUpdate=true;}
 for(const b of balloons){b.g.position.y=b.base+Math.sin(now*.00045+b.ph)*2.4;b.g.rotation.y=now*.00008+b.ph;}
 for(const s of skids)if(s.life>0){s.life-=dt;s.mat.opacity=Math.min(.38,s.life*.12);if(s.life<=0)s.m.visible=false;}
 for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.life-=dt;p.v.y+=dt*1.1;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(1+(.75-p.life)*1.6);p.m.material.opacity=Math.max(0,p.life*.5);if(p.life<=0){actors.remove(p.m);p.m.material.dispose();puffs.splice(i,1);}}
 if(foamRing)foamRing.material.opacity=.16+Math.sin(now*.0012)*.09;
 for(let i=hazards.length-1;i>=0;i--){hazards[i].life-=dt;if(hazards[i].life<=0){actors.remove(hazards[i].mesh);hazards.splice(i,1);}}
 for(const pad of pads){pad.squash=Math.max(0,pad.squash-dt*1.6);const k=pad.squash>0?Math.sin(pad.squash*14)*pad.squash:0;pad.mesh.scale.set(1+k*.4,1-k,1+k*.4);}
 for(const ring of rings){ring.flash=Math.max(0,ring.flash-dt);ring.mesh.rotation.z=now*.0015;ring.mesh.scale.setScalar(1+ring.flash*.6);ring.mesh.material.emissiveIntensity=.9+ring.flash*4;}
 if(boostTex)boostTex.offset.y=-(now*.0022)%1;
 updateSpores(dt,now);if(frame%2===0)updateCrowd(now);
 if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0&&state!=='countdown')setText('message','');}}
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000||.016,.05);last=now;frame++;shaderTime.value=now/1000;duckBgm(now);
 if(finishMusicAt&&now>finishMusicAt){finishMusicAt=0;if(state==='finished'||state==='ceremony')playBgm('menu');}
 quality.fpsFrames++;if(quality.fpsStart&&now-quality.fpsStart>2000){adaptQuality(quality.fpsFrames*1000/(now-quality.fpsStart));quality.fpsFrames=0;quality.fpsStart=now;}else if(!quality.fpsStart)quality.fpsStart=now;
 if(state!=='paused'){update(dt);animateWorld(dt,now);updateCamera(dt);}
 if(frame%3===0){hud();if(state==='race'||state==='countdown')drawMap();}
 renderer.render(scene,camera);}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
addEventListener('error',e=>{try{const el=$('error');el.hidden=false;el.textContent='Darsteller abgestürzt — bitte neu laden. ('+e.message+')';console.error(e.error||e.message);}catch{}});

// ---------------------------------------------------------------- Menue, Eingabe, Vollbild
function syncTrackButtons(){$('tracks').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',selected===j);x.setAttribute('aria-pressed',String(selected===j));});}
for(let i=0;i<4;i++){const b=document.createElement('button');b.className='swatch'+(i===0?' selected':'');b.style.setProperty('--swatch','#'+colors[i].toString(16));b.setAttribute('aria-label',driverNames[i]);b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{colorIndex=i;$('colors').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));});$('driverName').textContent=driverNames[i];buildCourse();};$('colors').append(b);}
courses.forEach((c,i)=>{const b=document.createElement('button');b.className='track'+(i===0?' selected':'');b.innerHTML=`<i>${c.icon}</i><b>${c.name}</b><span>${c.kind}</span>`;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{if(mode==='gp')return;selected=i;syncTrackButtons();buildCourse();};$('tracks').append(b);});
document.querySelectorAll('#modes .mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('#modes .mode').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});$('tracks').classList.toggle('locked',mode==='gp');$('trackHint').textContent=mode==='gp'?'Alle 3 Strecken':'150 cc';if(mode==='gp'&&selected!==0){selected=0;syncTrackButtons();buildCourse();}});
refreshBest();
$('start').onclick=()=>{gp=mode==='gp'?{active:true,race:0,points:{}}:{active:false,race:0,points:{}};start();};
$('again').onclick=nextAfterResult;$('home').onclick=home;$('quit').onclick=home;$('pause').onclick=pause;$('resume').onclick=pause;$('sound').onclick=setSound;
$('cerAgain').onclick=()=>{gp={active:true,race:0,points:{}};start();};$('cerHome').onclick=home;
$('item').onclick=use;$('titem').onpointerdown=e=>{e.preventDefault();use();};
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(e.code==='Space')use();if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='KeyR'&&state==='race'){racers[0].offset=0;racers[0].speed=12;}if(e.code==='Enter'&&state==='menu')$('start').click();}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(state==='race'||state==='countdown')pause();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);b.classList.add('down');};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{keys.delete(b.dataset.key);b.classList.remove('down');};b.oncontextmenu=e=>e.preventDefault();});
// Vollbild: nach jedem Drehen (Hoch-/Querformat) automatisch wieder aktivieren. Browser verlangen dafuer eine Beruehrung,
// deshalb wird zusaetzlich die naechste Beruehrung scharf geschaltet.
let wantFs=false;
function enterFs(){const d=document.documentElement;if(!wantFs||document.fullscreenElement||!d.requestFullscreen)return;d.requestFullscreen({navigationUI:'hide'}).catch(()=>{});}
function armFs(){if(wantFs&&!document.fullscreenElement)addEventListener('pointerdown',enterFs,{once:true,capture:true});}
function onRotate(){setTimeout(()=>{enterFs();armFs();resize();},150);}
addEventListener('orientationchange',onRotate);screen.orientation?.addEventListener?.('change',onRotate);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)armFs();setTimeout(resize,80);});
$('full').onclick=()=>{if(document.fullscreenElement){wantFs=false;document.exitFullscreen().catch(()=>{});}else{wantFs=true;enterFs();}};
const autoButton=document.createElement('button');autoButton.id='autoGas';autoButton.textContent='Auto-Gas: AUS';autoButton.setAttribute('aria-pressed','false');autoButton.onclick=()=>{autoGas=!autoGas;autoButton.textContent='Auto-Gas: '+(autoGas?'AN':'AUS');autoButton.setAttribute('aria-pressed',String(autoGas));};document.querySelector('.controls').after(autoButton);

// ---------------------------------------------------------------- Laden & Start
Promise.race([Promise.all(PROTO_FILES.map(loadProto)),new Promise(r=>setTimeout(r,9000))]).finally(()=>{buildCourse();resize();playBgm('menu');const l=$('loader');l.classList.add('done');setTimeout(()=>l.hidden=true,600);requestAnimationFrame(loop);});

// Testschnittstelle nur mit ?test=1
if(TEST){window.rallyTest={start,home,use,pause,say,ceremony,next:nextAfterResult,
 setMode:m=>document.querySelector(`#modes [data-mode="${m}"]`).click(),
 step:(seconds,input={gas:true})=>{for(let i=0;i<seconds*60;i++){advance(racers[0],1/60,input);vertical(racers[0],1/60);elapsed+=1/60;if(finish(racers[0],length,elapsed))break;}if(racers[0].finishTime!==null)end();},
 state:()=>({state,length,mode,gp,racers:racers.map(({mesh,...r})=>r)}),setItem:item=>{racers[0].item=item;racers[0].charges=item==='triple'?3:0;},
 perf:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,dpr:renderer.getPixelRatio(),qualityLevel:quality.level}),
 bgm:()=>({ready:bgm.ready,failed:bgm.failed,playing:bgm.current,rate:bgm.rate}),bgmTrack:n=>bgm.tracks[n||bgm.current],
 voice:()=>({decoded:Object.keys(clipBuf),failed:Object.keys(clipFail),key:voiceKey,ducked,norm:clipNorm}),
 items:()=>({hazards:hazards.length,shots:shots.length,ramps:ramps.length,pads:pads.length,rings:rings.length,spores:spores.length,crowd:crowd?crowd.fans.length:0,protos:Object.fromEntries(PROTO_FILES.map(n=>[n,!!P[n]]))}),
 aiUse:(id,item)=>{racers[id].item=item;return useItem(racers[id]);},racers:()=>racers,world:()=>({ramps,pads,rings,spores}),keys,
 setCountdown:v=>{countdown=v;},
 tick:(n=60,dt=1/60)=>{for(let i=0;i<n;i++){update(dt);animateWorld(dt,performance.now());updateCamera(dt);}duckBgm(performance.now());renderer.render(scene,camera);return {state,elapsed:+elapsed.toFixed(2),place:ranking(racers).indexOf(racers[0])+1};},
 // Lautheit der BGM-Dateien messen (RMS), um TRACK_GAIN zu kalibrieren.
 measure:async()=>{const ac=ctx||new AudioContext(),out={};for(const [n,src] of Object.entries(BGM_SRC)){const b=await ac.decodeAudioData(await (await fetch('assets/audio/'+src)).arrayBuffer());let s=0,c=0;for(let ch=0;ch<b.numberOfChannels;ch++){const d=b.getChannelData(ch);for(let i=0;i<d.length;i+=7){s+=d[i]*d[i];c++;}}out[n]=+Math.sqrt(s/c).toFixed(4);}return out;}};
 const panel=document.createElement('aside');panel.id='testPanel';panel.style.cssText='position:fixed;bottom:0;left:35%;z-index:30;background:#111;padding:10px;display:flex;gap:8px';
 for(const [text,action] of [['Test: Turbo',()=>{window.rallyTest.setItem('boost');state='race';use();}],['Test: Ziel',()=>{state='race';window.rallyTest.step(length*3/50+20);}]]){const b=document.createElement('button');b.textContent=text;b.style.cssText='color:#fff;background:#345;padding:10px';b.onclick=action;panel.append(b);}document.body.append(panel);}
