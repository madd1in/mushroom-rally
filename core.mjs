export const LAPS=3;
export const TOP_SPEED=57,SPORE_BONUS=.8,MAX_SPORES=10;
export const GP_POINTS=[10,8,6,5,4,3,2,1];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function racer(id,name,color){return {id,name,color,distance:-id*3,speed:0,offset:(id%2?1:-1)*2.4,boost:0,shield:0,stun:0,drift:0,item:null,charges:0,spores:0,finishTime:null,cooldown:0};}
// input.air: in der Luft keine Offroad-Bremse, kein Drift-Aufladen und halbe Lenkwirkung.
export function advance(r,dt,input,curvature=0){
 dt=clamp(dt,0,.05);r.boost=Math.max(0,r.boost-dt);r.shield=Math.max(0,r.shield-dt);r.stun=Math.max(0,r.stun-dt);r.cooldown=Math.max(0,r.cooldown-dt);
 const air=!!input.air,off=!air&&Math.abs(r.offset)>7.3;
 const max=r.stun>0?12:off?23:r.boost>0?86:TOP_SPEED+(r.spores||0)*SPORE_BONUS;
 const target=input.gas?max:input.brake?0:Math.max(0,r.speed-10);
 r.speed+=(target-r.speed)*Math.min(1,dt*(input.brake?4:1.2));
 if(input.brake)r.speed=Math.max(0,r.speed-dt*20);
 const steer=input.steer||0;
 r.offset+=steer*dt*(3.2+r.speed*.11)*(input.drift&&!air?1.2:1)*(air?.5:1)+(air?0:curvature*r.speed*r.speed*dt*.018);
 r.offset=clamp(r.offset,-12,12);
 if(!air&&input.drift&&Math.abs(steer)>.1&&r.speed>22&&!off)r.drift=Math.min(3,r.drift+dt);
 else if(!air&&r.drift>0){if(r.drift>.7)r.boost=Math.max(r.boost,r.drift>1.6?2.2:1.2);r.drift=0;}
 r.distance+=r.speed*dt;
}
export function lap(r,length){return clamp(Math.floor(Math.max(0,r.distance)/length)+1,1,LAPS);}
export function finish(r,length,time){if(r.distance>=length*LAPS&&r.finishTime===null)r.finishTime=time;return r.finishTime!==null;}
export function ranking(rs){return [...rs].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:a.finishTime!==null?-1:b.finishTime!==null?1:b.distance-a.distance);}
// Dreifach-Turbo hat drei Ladungen; das Item bleibt im Slot, bis alle verbraucht sind.
export function activate(r,all){const item=r.item;if(!item)return null;r.item=null;
 if(item==='boost')r.boost=3.5;
 if(item==='triple'){r.boost=Math.max(r.boost,2.2);r.charges=(r.charges||3)-1;if(r.charges>0)r.item='triple';}
 if(item==='shield'){r.shield=6;r.boost=1;}
 if(item==='shell'){const ahead=all.filter(a=>a.id!==r.id&&a.distance>r.distance&&a.finishTime===null).sort((a,b)=>a.distance-b.distance)[0];if(ahead&&!ahead.shield){ahead.stun=2.8;ahead.speed*=.35;}return {type:item,target:ahead?.id};}
 return {type:item,charges:r.charges};}
// Platzabhaengige Items: vorne eher Banane/Schild, hinten Turbo und Dreifach-Turbo zum Aufholen.
export function itemWeights(place,count){const t=count>1?(place-1)/(count-1):0;return {banana:40*(1-t)+8,shield:22*(1-t)+10,shell:18+10*t,boost:6+30*t,triple:t>.45?66*(t-.45):0};}
export function rollItem(place,count,rnd=Math.random){const w=itemWeights(place,count);let x=rnd()*Object.values(w).reduce((a,b)=>a+b,0);for(const [k,v] of Object.entries(w)){if((x-=v)<0)return k;}return 'boost';}
export function loseSpores(r,n=3){const lost=Math.min(r.spores||0,n);r.spores=(r.spores||0)-lost;return lost;}
export function addGpPoints(table,order){order.forEach((r,i)=>{table[r.id]=(table[r.id]||0)+GP_POINTS[i];});return table;}
export function gpStandings(table,ids){return [...ids].sort((a,b)=>(table[b]||0)-(table[a]||0)||a-b);}
