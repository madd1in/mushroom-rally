// Visual flight state only: jump distance, gravity and racing balance stay unchanged.
export function armGlider(r,source){
 r.glideArmed=source==='ramp'||source==='bounce';r.gliding=false;
}
export function resetGlider(r,instant=false){
 r.glideArmed=false;r.gliding=false;if(instant)r.gliderOpen=0;
}
export function stepGlider(r,dt,{ground=0,blocked=false}={}){
 if(!r.air||blocked||r.stun>0)resetGlider(r);
 // Recovery drops, hit hops and tiny road hops never arm the canopy.
 const clearance=(r.y??ground)-ground;
 r.gliding=!!(r.glideArmed&&r.air&&r.airT>=.12&&clearance>(r.gliding?.32:.7));
 const target=r.gliding?1:0,rate=target?11:17;
 r.gliderOpen=(r.gliderOpen||0)+(target-(r.gliderOpen||0))*(1-Math.exp(-rate*Math.max(0,dt)));
 if(!target&&r.gliderOpen<.008)r.gliderOpen=0;
 return r.gliderOpen;
}
