import test from 'node:test';import assert from 'node:assert/strict';
import {MEGA_T,INK_T,SHRINK_T,SHRINK_TOP,flattenSmall,HOP_T,racer,driveKart,finish,lap,ranking,activate,rollItem,itemWeights,loseSpores,addGpPoints,gpStandings,maxCornerSpeed,miniTurbo,advanceProgress,collideKarts,hitKart,raceStars,blastHit,comboStep,COMBO_WINDOW,PHYS,SPORE_BONUS} from './core.mjs';
const run=(k,sec,input,surf)=>{for(let i=0;i<sec*60;i++)driveKart(k,1/60,input,surf);};
test('three complete forward laps required; finish recorded once',()=>{const r=racer(0,'A',0);r.distance=1999;assert.equal(lap(r,1000),2);assert.equal(finish(r,1000,20),false);r.distance=3000;assert.equal(finish(r,1000,30),true);finish(r,1000,40);assert.equal(r.finishTime,30);});
test('acceleration reaches top speed in a few seconds, not instantly',()=>{const k=racer(0,'A',0);run(k,1,{gas:true});assert.ok(k.speed>10&&k.speed<22,`1s: ${k.speed}`);run(k,4,{gas:true});assert.ok(Math.abs(k.speed-PHYS.top)<.5,`5s: ${k.speed}`);});
test('without steering the kart drives straight; steering turns it (no rails)',()=>{const k=racer(0,'A',0);k.vz=30;run(k,2,{gas:true});assert.ok(Math.abs(k.x)<.01);const t=racer(1,'B',0);t.vz=30;run(t,1,{gas:true,steer:1});assert.ok(t.h>1.2,`heading ${t.h}`);assert.ok(t.x>5,'turned left (+x)');});
test('offroad caps speed hard',()=>{const k=racer(0,'A',0);k.vz=30;run(k,3,{gas:true},{offroad:true});assert.ok(k.speed<PHYS.offTop+.5);});
test('drift turns tighter than grip driving and releases a mini turbo by charge level',()=>{const g=racer(0,'A',0),d=racer(1,'B',0);g.vz=d.vz=28;run(g,1,{gas:true,steer:1});run(d,1,{gas:true,steer:1,drift:true});assert.ok(d.h>g.h,`drift ${d.h} grip ${g.h}`);const s=racer(2,'C',0);s.vz=28;run(s,1.2,{gas:true,steer:1,drift:true});assert.ok(s.speed>20,`drift keeps speed: ${s.speed}`);driveKart(s,1/60,{gas:true,steer:1,drift:false});assert.equal(s.lastMT,'super');run(d,1.3,{gas:true,steer:1,drift:true});driveKart(d,1/60,{gas:true,steer:1,drift:false});assert.equal(d.lastMT,'ultra');assert.ok(d.boost>1.5);assert.equal(miniTurbo(.3),null);assert.equal(miniTurbo(2.5)[2],'ultra');});
test('drifting needs speed and a steering direction (hop first, drift on landing)',()=>{const k=racer(0,'A',0);k.vz=6;run(k,.5,{gas:false,steer:1,drift:true});assert.equal(k.driftDir,0,'too slow: only a hop');
 const f=racer(1,'B',0);f.vz=25;driveKart(f,1/60,{gas:true,steer:0,drift:true});assert.ok(f.hopT>0,'press starts a hop');assert.equal(f.driftDir,0,'no drift while airborne in the hop');
 run(f,HOP_T+.25,{gas:true,steer:0,drift:true});assert.equal(f.driftDir,0,'no steering, no drift');
 const g=racer(2,'C',0);g.vz=25;driveKart(g,1/60,{gas:true,steer:0,drift:true});run(g,HOP_T*.5,{gas:true,steer:-1,drift:true});assert.equal(g.driftDir,0);run(g,HOP_T,{gas:true,steer:-1,drift:true});assert.equal(g.driftDir,-1,'steering during the hop sets the drift side');});
test('hop without holding the button stays a hop; a new press is needed for the next hop',()=>{const k=racer(0,'A',0);k.vz=25;driveKart(k,1/60,{gas:true,steer:1,drift:true});run(k,HOP_T+.1,{gas:true,steer:1});assert.equal(k.driftDir,0,'released before landing');
 run(k,.2,{gas:true,steer:1,drift:true});assert.equal(k.driftDir,0,'holding after a released hop does not start a drift without a new hop');
 run(k,.1,{gas:true,steer:1});driveKart(k,1/60,{gas:true,steer:1,drift:true});run(k,HOP_T+.05,{gas:true,steer:1,drift:true});assert.equal(k.driftDir,1);});
test('corner speed table: tight corners need braking, drifting allows more',()=>{assert.equal(maxCornerSpeed(0),99);const tight=maxCornerSpeed(1/15),wide=maxCornerSpeed(1/60);assert.ok(tight<wide);assert.ok(maxCornerSpeed(1/15,true)>tight);assert.ok(wide>=PHYS.top-.5);});
test('progress follows the track and ignores shortcuts',()=>{const k=racer(0,'A',0);k.distance=990;advanceProgress(k,5,1000);assert.equal(k.distance,1005);advanceProgress(k,300,1000);assert.equal(k.distance,1005);advanceProgress(k,1,1000);assert.equal(k.distance,1001);});
test('kart collision separates and trades momentum',()=>{const a=racer(0,'A',0),b=racer(1,'B',0);a.vz=20;b.z=2;b.vz=5;assert.ok(collideKarts(a,b));assert.ok(b.z-a.z>=2.39);assert.ok(b.vz>5&&a.vz<20);});
test('items: shell targets next racer, shield protects, triple lasts three uses',()=>{const a=racer(0,'A',0),b=racer(1,'B',1);b.distance=100;a.item='shell';activate(a,[a,b]);assert.equal(a.item,null);assert.ok(b.stun>0);b.stun=0;b.shield=3;a.item='shell';activate(a,[a,b]);assert.equal(b.stun,0);const r=racer(2,'C',0);r.item='triple';r.charges=3;for(let i=0;i<3;i++){r.boost=0;assert.equal(activate(r,[r]).type,'triple');assert.ok(r.boost>0);}assert.equal(r.item,null);});
test('leaders never get triple turbo, last place gets more boosts',()=>{assert.equal(itemWeights(1,8).triple,0);const lead=itemWeights(1,8),last=itemWeights(8,8);assert.ok(last.boost+last.triple>lead.boost*3);let seq=0;const rnd=()=>((seq=(seq*9301+49297)%233280)/233280);for(let i=0;i<500;i++)assert.notEqual(rollItem(1,8,rnd),'triple');});
test('spores raise top speed, hits cost spores and stun',()=>{const a=racer(0,'A',0),b=racer(1,'B',1);b.spores=10;run(a,8,{gas:true});run(b,8,{gas:true});assert.ok(Math.abs(b.speed-a.speed-10*SPORE_BONUS)<.3);assert.equal(loseSpores(b),3);hitKart(b,1.2,.3);assert.ok(b.stun>0&&b.speed>0);driveKart(b,1/60,{gas:true});assert.ok(Math.hypot(b.vx,b.vz)<12);});
test('bomb: mid-pack item, blast radius, shield blocks',()=>{const mid=itemWeights(4,8).bomb,lead=itemWeights(1,8).bomb;assert.ok(mid>lead*3,`mid ${mid} lead ${lead}`);const a=racer(0,'A',0);a.item='bomb';assert.equal(activate(a,[a]).type,'bomb');assert.equal(a.item,null);const k=racer(1,'B',0);k.vz=20;assert.equal(blastHit(k,10,0),false);assert.equal(blastHit(k,3,2),true);assert.ok(k.stun>=1.3&&k.vz<7);const s=racer(2,'C',0);s.shield=2;assert.equal(blastHit(s,1,1),'blocked');assert.equal(s.stun,0);});
test('drift combo counts quick mini turbos and resets on hits or gaps',()=>{const k=racer(0,'A',0);assert.equal(comboStep(k,1),1);assert.equal(comboStep(k,3),2);assert.equal(comboStep(k,3+COMBO_WINDOW-.1),3);assert.equal(comboStep(k,20),1);comboStep(k,21);hitKart(k,.5,.9);assert.equal(comboStep(k,22),1);});
test('finish order wins over subsequent movement; grand prix points; stars',()=>{const a=racer(0,'A',0),b=racer(1,'B',1);a.finishTime=40;b.finishTime=45;b.distance=9000;assert.equal(ranking([b,a])[0].id,0);const rs=[0,1,2].map(i=>racer(i,'R'+i,0));const t={};addGpPoints(t,[rs[1],rs[0],rs[2]]);addGpPoints(t,[rs[0],rs[2],rs[1]]);assert.deepEqual(gpStandings(t,[0,1,2]),[0,1,2]);assert.deepEqual(raceStars(1,0),{stars:3,perfect:true});assert.equal(raceStars(4,2).stars,1);});

test('storm cloud shrinks everyone ahead, spares those behind and shielded, and slows the small karts',()=>{
 const a=racer(0,'A',0),ahead=racer(1,'B',1),shielded=racer(2,'C',2),behind=racer(3,'D',3),done=racer(4,'E',4);
 a.distance=100;ahead.distance=150;ahead.item='shell';shielded.distance=180;shielded.shield=2;behind.distance=60;done.distance=300;done.finishTime=50;
 a.item='storm';const res=activate(a,[a,ahead,shielded,behind,done]);
 assert.equal(res.type,'storm');assert.equal(a.item,null);assert.equal(ahead.shrink,SHRINK_T);assert.equal(ahead.item,null);assert.ok(ahead.stun>0);
 assert.equal(shielded.shrink||0,0);assert.equal(behind.shrink||0,0);assert.equal(done.shrink||0,0);
 assert.deepEqual(res.hit.map(h=>[h.id,h.blocked]),[[1,false],[2,true]]);
 // klein faehrt langsamer
 const big=racer(5,'F',5),small=racer(6,'G',6);small.shrink=3;for(let i=0;i<140;i++){driveKart(big,.02,{gas:true});driveKart(small,.02,{gas:true});}
 assert.ok(Math.abs(small.speed||Math.hypot(small.vx,small.vz))<Math.abs(big.speed||Math.hypot(big.vx,big.vz))*.8,'small kart is slower');
 assert.ok(small.shrink<3,'shrink wears off');
});

test('storm cloud comes only to the back half; a big kart flattens a small one once',()=>{
 assert.equal(itemWeights(1,8).storm,0);assert.equal(itemWeights(4,8).storm,0);assert.ok(itemWeights(8,8).storm>itemWeights(6,8).storm);
 const big=racer(0,'A',0),small=racer(1,'B',1);small.shrink=2;assert.equal(flattenSmall(big,small,2),null,'slow touch is harmless');
 assert.equal(flattenSmall(big,small,9),small);assert.ok(small.stun>1);assert.equal(flattenSmall(big,small,9),null,'cooldown');
 const b2=racer(2,'C',2);b2.shrink=1;assert.equal(flattenSmall(small,b2,9),null,'two small karts only bump');
});

test('R47 items: mega makes big and untouchable, ink hits only racers ahead, leaders get neither',()=>{
 const a=racer(0,'A',0);a.item='mega';assert.equal(activate(a,[a]).type,'mega');assert.equal(a.mega,MEGA_T);assert.ok(a.shield>=MEGA_T);
 driveKart(a,.05,{gas:true,steer:0,drift:false});assert.ok(a.mega<MEGA_T&&a.mega>MEGA_T-.2,'mega runs down');
 const me=racer(1,'B',0),front=racer(2,'C',0),back=racer(3,'D',0),safe=racer(4,'E',0);me.distance=100;front.distance=150;back.distance=50;safe.distance=200;safe.shield=3;
 me.item='ink';const res=activate(me,[me,front,back,safe]);assert.deepEqual(res.targets,[2]);assert.equal(front.ink,INK_T);assert.ok(!(back.ink>0)&&!(safe.ink>0));
 const lead=itemWeights(1,8),last=itemWeights(8,8);assert.equal(lead.mega,0);assert.equal(lead.ink,0);assert.ok(last.mega>10&&last.ink>10);
});
