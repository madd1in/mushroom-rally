export const LAPS=3;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function racer(id,name,color){return {id,name,color,distance:-id*3,speed:0,offset:(id%2?1:-1)*2.4,boost:0,shield:0,stun:0,drift:0,item:null,finishTime:null,cooldown:0};}
export function advance(r,dt,input,curvature=0){
 dt=clamp(dt,0,.05);r.boost=Math.max(0,r.boost-dt);r.shield=Math.max(0,r.shield-dt);r.stun=Math.max(0,r.stun-dt);r.cooldown=Math.max(0,r.cooldown-dt);
 const off=Math.abs(r.offset)>7.3;
 const max=r.stun>0?12:off?23:r.boost>0?86:57;
 const target=input.gas?max:input.brake?0:Math.max(0,r.speed-10);
 r.speed+=(target-r.speed)*Math.min(1,dt*(input.brake?4:1.2));
 if(input.brake)r.speed=Math.max(0,r.speed-dt*20);
 const steer=input.steer||0;
 r.offset+=steer*dt*(3.2+r.speed*.11)*(input.drift?1.2:1)+curvature*r.speed*r.speed*dt*.018;
 r.offset=clamp(r.offset,-12,12);
 if(input.drift&&Math.abs(steer)>.1&&r.speed>22&&!off)r.drift=Math.min(3,r.drift+dt);
 else if(r.drift>0){if(r.drift>.7)r.boost=Math.max(r.boost,r.drift>1.6?2.2:1.2);r.drift=0;}
 r.distance+=r.speed*dt;
}
export function lap(r,length){return clamp(Math.floor(Math.max(0,r.distance)/length)+1,1,LAPS);}
export function finish(r,length,time){if(r.distance>=length*LAPS&&r.finishTime===null)r.finishTime=time;return r.finishTime!==null;}
export function ranking(rs){return [...rs].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:a.finishTime!==null?-1:b.finishTime!==null?1:b.distance-a.distance);}
export function activate(r,all){const item=r.item;if(!item)return null;r.item=null;if(item==='boost')r.boost=3.5;if(item==='shield'){r.shield=6;r.boost=1;}if(item==='shell'){const ahead=all.filter(a=>a.id!==r.id&&a.distance>r.distance&&a.finishTime===null).sort((a,b)=>a.distance-b.distance)[0];if(ahead&&!ahead.shield){ahead.stun=2.8;ahead.speed*=.35;}return {type:item,target:ahead?.id};}return {type:item};}
