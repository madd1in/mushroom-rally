import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./game.js',import.meta.url),'utf8');
const fragment=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'loader test anchors must match production source');return source.slice(a,b);};
const recoverySource=fragment('function createPrototypeRecovery(', 'function loadProto(');
const createRecovery=vm.runInNewContext(recoverySource+';createPrototypeRecovery');

test('assets completed before bootstrap do not rebuild the first world',()=>{
 const p={kart:{},gate:{}};let rebuilds=0;const r=createRecovery(['kart','gate'],p,()=>rebuilds++);
 assert.equal(r.settle(),false);r.snapshot();assert.equal(r.settle(),false);assert.equal(rebuilds,0);
});
test('late successful load replaces fallbacks exactly once',()=>{
 const p={kart:{}};let rebuilds=0;const r=createRecovery(['kart','gate'],p,()=>rebuilds++);r.snapshot();
 p.gate={};assert.equal(r.settle(),true);assert.equal(r.settle(),false);assert.equal(rebuilds,1);
});
test('permanently missing asset does not cause a pointless rebuild',()=>{
 const p={kart:{}};let rebuilds=0;const r=createRecovery(['kart','gate'],p,()=>rebuilds++);r.snapshot();p.gate=null;
 assert.equal(r.settle(),false);assert.equal(rebuilds,0);
});
test('partial recovery is upgraded even if a different asset permanently fails',()=>{
 const p={};let rebuilds=0;const r=createRecovery(['kart','gate'],p,()=>rebuilds++);r.snapshot();p.kart={};p.gate=null;
 assert.equal(r.settle(),true);assert.equal(rebuilds,1);
});
for(const state of ['menu','race'])test(`production recovery invalidates stale caches safely during ${state}`,()=>{
 const disposed=[],builds=[],worldCache=new Map([[0,{}],[1,{}],[2,{}]]),p={kart:{}};
 const c=vm.createContext({PROTO_FILES:['kart','gate'],P:p,worldCache,builtSel:0,state,worldDirty:false,disposeCourse:i=>{disposed.push(i);worldCache.delete(i);},buildCourse:force=>builds.push(force)});
 vm.runInContext(recoverySource+fragment('const protoRecovery=createPrototypeRecovery(', 'const protoAll=')+';globalThis.recovery=protoRecovery;',c);
 c.recovery.snapshot();p.gate={};assert.equal(c.recovery.settle(),true);assert.equal(c.recovery.settle(),false);
 assert.deepEqual(disposed,[1,2]);assert.equal(worldCache.has(0),true);
 assert.deepEqual(builds,state==='menu'?[true]:[]);assert.equal(c.worldDirty,state==='race');
});
for(const succeeds of [true,false])test(`GLB retry chain ${succeeds?'recovers on third attempt':'settles after three failures'} and counts progress once`,async()=>{
 const queued=[],delays=[],p={};let attempts=0,progress=0,marked=0;
 const c=vm.createContext({P:p,GLTFLoader:class{load(url,ok,unused,error){attempts++;if(succeeds&&attempts===3)ok({scene:{asset:url}});else error(new Error('network'));}},NO_MERGE:new Set(),LITE:false,LO_FILES:new Set(),liteRoot:x=>x,mergeByMaterial:x=>x,markShared:()=>marked++,progress:()=>progress++,setTimeout:(fn,ms)=>{queued.push(fn);delays.push(ms);}});
 vm.runInContext(fragment('function loadProto(', 'function progress(')+';globalThis.load=loadProto;',c);
 const pending=c.load('gate');assert.equal(attempts,1);assert.equal(progress,0);assert.equal(p.gate,undefined);
 while(queued.length)queued.shift()();await pending;
 assert.equal(attempts,3);assert.deepEqual(delays,[1200,1200]);assert.equal(progress,1);assert.equal(marked,succeeds?1:0);
 if(succeeds)assert.equal(p.gate.asset,'assets/gate.glb');else assert.equal(p.gate,null);
});
