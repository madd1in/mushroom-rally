import test from 'node:test';
import assert from 'node:assert/strict';
import {armGlider,resetGlider,stepGlider} from './glider.mjs';
const airborne=()=>({air:true,airT:.3,y:3,vy:-2,speed:27,vx:1,vz:27,stun:0});
test('canopy opens on ramp and bounce flights after takeoff, preserving flight physics',()=>{
 for(const source of ['ramp','bounce']){
  const r=airborne();armGlider(r,source);r.airT=.06;stepGlider(r,1/60);assert.equal(r.gliderOpen,0);
  r.airT=.3;for(let i=0;i<24;i++)stepGlider(r,1/60);
  assert.ok(r.gliding&&r.gliderOpen>.98);
  assert.deepEqual([r.y,r.vy,r.speed,r.vx,r.vz],[3,-2,27,1,27]);
 }
});
test('recovery drops, hit knock-ups and road hops never deploy',()=>{
 for(const source of [undefined,'respawn','hit','road-hop']){
  const r=airborne();armGlider(r,source);stepGlider(r,1);assert.equal(r.gliderOpen,0);assert.equal(r.gliding,false);
 }
});
test('landing folds the canopy and cannot carry arming into a later hop',()=>{
 const r=airborne();armGlider(r,'ramp');stepGlider(r,1);r.air=false;r.y=0;stepGlider(r,.08);
 assert.ok(r.gliderOpen>0&&r.gliderOpen<.3);assert.equal(r.glideArmed,false);
 r.air=true;r.y=3;stepGlider(r,1);assert.equal(r.gliderOpen,0);
});
test('anti-gravity, collision stun and respawn cancel deployment',()=>{
 for(const kind of ['roll','hit','respawn']){
  const r=airborne();armGlider(r,'ramp');stepGlider(r,1);
  if(kind==='respawn')resetGlider(r,true);
  else{if(kind==='hit')r.stun=.5;stepGlider(r,1,{blocked:kind==='roll'});}
  assert.equal(r.gliderOpen,0);assert.equal(r.glideArmed,false);assert.equal(r.gliding,false);
 }
});
test('deployment is independent of render frame rate and works over gaps',()=>{
 const states=[30,60,120].map(fps=>{const r=airborne();armGlider(r,'ramp');for(let i=0;i<fps/2;i++)stepGlider(r,1/fps,{ground:-30});return r;});
 assert.ok(states.every(r=>r.gliding&&r.gliderOpen>.99));
 assert.ok(Math.max(...states.map(r=>r.gliderOpen))-Math.min(...states.map(r=>r.gliderOpen))<1e-10);
});
