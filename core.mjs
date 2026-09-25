export const LAPS=3;
export const GP_POINTS=[10,8,6,5,4,3,2,1];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Freie Fahrphysik (Meter, Sekunden). Tempo bewusst Mario-Kart-nah: ~30 m/s Spitze, Boost 40 m/s.
export const PHYS={top:30,accel:15,brake:32,reverse:8,coast:4,offTop:12.5,offDrag:2.6,turn:2.25,grip:9,offGrip:5,driftGrip:4.4,boostTop:40,boostAccel:34,airTurn:.3,driftMin:9,driftSlide:.5};
export const SPORE_BONUS=.35,MAX_SPORES=10;
// Mini-Turbo-Stufen: [Driftzeit, Boostdauer, Name]. Lange, saubere Drifts in Kurvenrichtung laden schneller.
export const MT_LEVELS=[[1.9,1.6,'ultra'],[1.15,1.05,'super'],[.55,.6,'mini']];
// Bunny-Hop (R44, wie Mario Kart): die Drifttaste laesst das Kart hopsen. Waehrend des Hopsers legt die Lenkung die
// Richtung fest (und dreht etwas williger), bei der Landung mit gehaltener Taste beginnt der Funkendrift.
export const HOP_T=.3,HOP_GRACE=.22,HOP_TURN=1.3;
// KI-Klassen: Tempo-Faktor und Fahrkoennen (Linienwahl, Bremspunkte, Drift-Nutzung, Fehlerrate).
export const CLASSES={50:{ai:.76,skill:.34,rubber:.06},100:{ai:.855,skill:.52,rubber:.055},150:{ai:1,skill:.9,rubber:.02}};
export function racer(id,name,color){return {id,name,color,x:0,z:0,h:0,vx:0,vz:0,speed:0,slide:0,distance:0,offset:0,boost:0,shield:0,stun:0,drift:0,driftDir:0,hop:0,lastMT:null,item:null,charges:0,spores:0,finishTime:null,cooldown:0};}
// R44: etwas mehr Untersteuern bei Hoechsttempo (.32 -> .34; .40 war mit den schmalen Strassen zu viel)
export function turnCurve(sp){return clamp(sp/5,0,1)*(1-.34*clamp(sp/PHYS.top,0,1.4));}
export const driftFactor=into=>.35+.7*(clamp(into,-1,1)+1)/2;
export function miniTurbo(charge){for(const l of MT_LEVELS)if(charge>=l[0])return l;return null;}
// surf: {air, offroad, slope (Steigung in Fahrtrichtung), speedMul}
export function driveKart(k,dt,input,surf={}){
 dt=clamp(dt,0,.05);const P=PHYS;
 k.boost=Math.max(0,k.boost-dt);k.shield=Math.max(0,k.shield-dt);k.stun=Math.max(0,k.stun-dt);k.cooldown=Math.max(0,k.cooldown-dt);k.hop=Math.max(0,(k.hop||0)-dt);
 const fx=Math.sin(k.h),fz=Math.cos(k.h),lx=fz,lz=-fx,air=!!surf.air,off=!air&&!!surf.offroad,boosting=k.boost>0,stunned=k.stun>0;
 let vf=k.vx*fx+k.vz*fz,vl=k.vx*lx+k.vz*lz;
 let top=(boosting?P.boostTop:P.top+(k.spores||0)*SPORE_BONUS)*(surf.speedMul||1)*(k.mTop||1);
 if(off&&!boosting)top=Math.min(top,P.offTop);
 if(stunned)top=Math.min(top,5);
 const steer=clamp(input.steer||0,-1,1);
 if(!air){
  if(input.gas&&!stunned){if(vf<top){const a=(boosting?P.boostAccel:P.accel)*(k.mAcc||1);vf=Math.min(top,vf+a*dt*clamp((top-vf)/(top*.3),.12,1));}}
  else if(input.brake&&!stunned){vf=vf>.5?Math.max(0,vf-P.brake*dt):Math.max(-P.reverse,vf-P.accel*.5*dt);}
  else vf-=Math.sign(vf)*Math.min(Math.abs(vf),P.coast*dt);
  if(vf>top)vf-=(vf-top)*Math.min(1,dt*(off?P.offDrag:1.8));
  vf-=9.8*(surf.slope||0)*dt*.7;
  if(stunned)vf*=Math.exp(-2.5*dt);
 }
 const sp=Math.abs(vf);
 if(air){k.hopT=0;k.hopGrace=0;}
 if(!air){
  const press=!!input.drift&&!k.driftHeld;
  if(press&&!k.driftDir&&!(k.hopT>0)&&!stunned){k.hopT=HOP_T;k.hop=HOP_T;k.hopDir=0;k.hopGrace=0;}
  if(k.hopT>0){if(Math.abs(steer)>.3)k.hopDir=Math.sign(steer);k.hopT-=dt;if(k.hopT<=0){k.hopT=0;k.hopGrace=input.drift?HOP_GRACE:0;}}
  else if(k.hopGrace>0)k.hopGrace=Math.max(0,k.hopGrace-dt);
  const dir=k.hopDir||(Math.abs(steer)>.35?Math.sign(steer):0);
  if(!k.driftDir&&input.drift&&k.hopGrace>0&&dir&&sp>P.driftMin&&!off&&!stunned){k.driftDir=dir;k.drift=0;k.hopGrace=0;k.hopDir=0;}
  if(k.driftDir&&(!input.drift||sp<8||stunned)){const lvl=stunned?null:miniTurbo(k.drift);if(lvl){k.boost=Math.max(k.boost,lvl[1]);k.lastMT=lvl[2];}k.driftDir=0;k.drift=0;}
 }
 let yaw;
 // Drift-Radius per Lenkung steuerbar: nach aussen gegenlenken = weiter Bogen, nach innen = enger Bogen.
 if(k.driftDir){const into=steer*k.driftDir;yaw=k.driftDir*P.turn*(k.mTurn||1)*driftFactor(into)*Math.min(1,sp/10);if(!air)k.drift+=dt*(into>.3?1.35:into<-.3?.55:1)*(off?.4:1);}
 else yaw=steer*P.turn*(k.mTurn||1)*turnCurve(sp)*(vf<-.5?-1:1);
 if(k.hopT>0&&!k.driftDir)yaw*=HOP_TURN;
 if(air)yaw*=P.airTurn;if(stunned)yaw=0;
 // surf.gripMul: im Looping haelt die Bahn magnetisch, sonst traegt die Fliehkraft jeden nach aussen
 const grip=(air?.3:k.driftDir?P.driftGrip:off?P.offGrip:P.grip)*(air?1:(k.mGrip||1))*(surf.gripMul||1);
 // Seitliches Rutschen abbauen, dabei den Grossteil der Energie in Vorwaertstempo umlenken (Drift haelt sein Tempo).
 const vl2=vl*Math.exp(-grip*dt),lost=vl*vl-vl2*vl2;if(!air&&vf>0)vf=Math.sqrt(vf*vf+lost*(k.driftDir?.94:.72));vl=vl2;
 if(k.driftDir&&!air){vl-=k.driftDir*sp*.10*dt;
  // Driftwinkel deckeln (ca. 27 Grad): haelt die Linie, statt ueber den Streckenrand zu tragen
  const cap=sp*P.driftSlide;if(Math.abs(vl)>cap)vl+=(Math.sign(vl)*cap-vl)*Math.min(1,dt*7);}
 k.driftHeld=!!input.drift;
 k.vx=fx*vf+lx*vl;k.vz=fz*vf+lz*vl;k.h+=yaw*dt;const mv=surf.moveMul||1;k.x+=k.vx*dt*mv;k.z+=k.vz*dt*mv;k.speed=vf;k.slide=vl;
}
// Hoechsttempo, mit dem eine Kurve der Kruemmung kappa (1/m) noch mit Grip bzw. im Drift fahrbar ist.
export function maxCornerSpeed(kappa,drift=false){if(kappa<1e-4)return 99;let lo=0,hi=60;for(let i=0;i<24;i++){const v=(lo+hi)/2,cap=drift?PHYS.turn*driftFactor(1)*Math.min(1,v/10):PHYS.turn*turnCurve(v);if(v*kappa<=cap)lo=v;else hi=v;}return lo;}
// Fortschritt entlang der Strecke aus der projizierten Rundendistanz; Spruenge (Abkuerzungen, Teleports) zaehlen nicht.
export function advanceProgress(k,lapD,length){const prev=((k.distance%length)+length)%length;let d=lapD-prev;if(d>length/2)d-=length;if(d<-length/2)d+=length;if(Math.abs(d)<25)k.distance+=d;return d;}
export function hitKart(k,stun,keep){k.stun=Math.max(k.stun,stun);k.vx*=keep;k.vz*=keep;k.driftDir=0;k.drift=0;k.combo=0;}
// Zwei Karts als Kreise: auseinanderschieben und Impuls entlang der Normalen tauschen (leicht elastisch).
export function collideKarts(a,b,rad=1.2){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>=rad*2||d<1e-6)return false;const nx=dx/d,nz=dz/d,pen=rad*2-d;a.x-=nx*pen/2;a.z-=nz*pen/2;b.x+=nx*pen/2;b.z+=nz*pen/2;const rel=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rel<0){const j=-rel*.65;a.vx-=nx*j;a.vz-=nz*j;b.vx+=nx*j;b.vz+=nz*j;}return true;}
export function lap(r,length){return clamp(Math.floor(Math.max(0,r.distance)/length)+1,1,LAPS);}
export function finish(r,length,time){if(r.distance>=length*LAPS&&r.finishTime===null)r.finishTime=time;return r.finishTime!==null;}
export function ranking(rs){return [...rs].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:a.finishTime!==null?-1:b.finishTime!==null?1:b.distance-a.distance);}
// Items. Dreifach-Turbo hat drei Ladungen; das Item bleibt im Slot, bis alle verbraucht sind.
export function activate(r,all){const item=r.item;if(!item)return null;r.item=null;
 if(item==='boost')r.boost=Math.max(r.boost,1.8);
 if(item==='triple'){r.boost=Math.max(r.boost,1.25);r.charges=(r.charges||3)-1;if(r.charges>0)r.item='triple';}
 if(item==='shield'){r.shield=6;r.boost=Math.max(r.boost,.5);}
 if(item==='shell'){const ahead=all.filter(a=>a.id!==r.id&&a.distance>r.distance&&a.finishTime===null).sort((a,b)=>a.distance-b.distance)[0];if(ahead&&!ahead.shield)ahead.stun=Math.max(ahead.stun,1.6);return {type:item,target:ahead?.id};}
 return {type:item,charges:r.charges};}
// Pilzbombe: vor allem fuers Mittelfeld (dort ist das Gedraenge am groessten)
export function itemWeights(place,count){const t=count>1?(place-1)/(count-1):0;return {banana:40*(1-t)+8,shield:22*(1-t)+10,shell:18+10*t,boost:6+30*t,triple:t>.45?66*(t-.45):0,bomb:3+16*Math.max(0,1-Math.abs(t-.5)*2.2)};}
// Explosion: Karts im Radius werden getroffen (Schild blockt). Rueckgabe: false | 'blocked' | true
export function blastHit(k,dx,dz,radius=6.5){if(Math.hypot(dx,dz)>radius)return false;if(k.shield>0)return 'blocked';hitKart(k,1.3,.3);return true;}
// Drift-Combo: Mini-Turbos in kurzer Folge ohne Fehler zaehlen hoch; Fehler (Treffer, Wand, Wiese) setzen auf 0
export const COMBO_WINDOW=4.5;
export function comboStep(k,time){k.combo=(k.combo>0&&time-(k.comboT??-99)<=COMBO_WINDOW)?k.combo+1:1;k.comboT=time;return k.combo;}
export function rollItem(place,count,rnd=Math.random){const w=itemWeights(place,count);let x=rnd()*Object.values(w).reduce((a,b)=>a+b,0);for(const [k,v] of Object.entries(w)){if((x-=v)<0)return k;}return 'boost';}
export function loseSpores(r,n=3){const lost=Math.min(r.spores||0,n);r.spores=(r.spores||0)-lost;return lost;}
export function addGpPoints(table,order){order.forEach((r,i)=>{table[r.id]=(table[r.id]||0)+GP_POINTS[i];});return table;}
export function gpStandings(table,ids){return [...ids].sort((a,b)=>(table[b]||0)-(table[a]||0)||a-b);}
// Sterne fuers Rennergebnis: Platz zaehlt, "perfekt" = Sieg ohne einen einzigen erlittenen Treffer.
export function raceStars(place,hitsTaken){const s=place===1?3:place<=3?2:place<=6?1:0;return {stars:s,perfect:place===1&&hitsTaken===0};}
