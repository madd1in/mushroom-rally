from pathlib import Path
path = Path(__file__).resolve().parents[1] / 'game.js'
code = path.read_text(encoding='utf-8')
def replace(old,new):
 global code
 count=code.count(old)
 if count!=1: raise RuntimeError(f'Expected one match, found {count}: {old[:100]}')
 code=code.replace(old,new,1)
replace("import {mergeGeometries} from './vendor/BufferGeometryUtils.js';","import {mergeGeometries} from './vendor/BufferGeometryUtils.js';\nimport {armGlider,resetGlider,stepGlider} from './glider.mjs';")
replace("'RampPaint','FanCap']);","'RampPaint','FanCap','GliderPaint','GliderCream','GliderTrim','GliderRope']);")
replace("'driver_robot','driver_cat'];","'driver_robot','driver_cat','glider'];")
replace("function kart(color,goldLook=false,dtype=0){","""// Pilzgleiter: Blender-Modell und kompakter Geometrie-Fallback.
function fallbackGlider(){if(P._gliderFallback)return P._gliderFallback;
 const root=new T.Group(),paints=[new T.MeshStandardMaterial({name:'GliderPaint',color:0xef6c58,roughness:.78,side:T.DoubleSide}),new T.MeshStandardMaterial({name:'GliderCream',color:0xffedc8,roughness:.88,side:T.DoubleSide}),new T.MeshStandardMaterial({name:'GliderTrim',color:0x4fb9ad,roughness:.7,side:T.DoubleSide})];
 const canopy=(x,z)=>2.63+.57*Math.cos(x/2.5*Math.PI/2)+.15*Math.cos(z/.95*Math.PI/2);
 for(let strip=0;strip<10;strip++){const positions=[],indices=[],x0=-2.5+strip*.5;for(let ix=0;ix<=2;ix++)for(let iz=0;iz<=6;iz++){const x=x0+ix*.25,z=-.95+iz*.95/3;positions.push(x,canopy(x,z),z);}for(let ix=0;ix<2;ix++)for(let iz=0;iz<6;iz++){const a=ix*7+iz,b=a+7;indices.push(a,a+1,b,b,a+1,b+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();root.add(new T.Mesh(geo,paints[strip===0||strip===9?2:strip%3===1?1:0]));}
 const cord=new T.MeshStandardMaterial({name:'GliderRope',color:0x285553,roughness:.85});
 for(const side of [-1,1])for(const z of [-.7,.7]){const a=new T.Vector3(side*.7,.92,z*.5),b=new T.Vector3(side*2.08,canopy(side*2.08,z)-.04,z),dir=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(.014,.014,dir.length(),5),cord);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());root.add(m);}
 P._gliderFallback=mergeByMaterial(root);markShared(P._gliderFallback);return P._gliderFallback;}
function attachGlider(kart,color){const g=cloneProto(P.glider||fallbackGlider());g.name='MushroomParaglider';applyTint(g,'GliderPaint',new T.Color(color).lerp(new T.Color(0xffe2b4),.22).getHex());g.visible=false;kart.add(g);kart.userData.glider=g;return g;}
function syncGlider(r,dt,spin){const g=r.mesh.userData.glider;if(!g)return;
 const open=stepGlider(r,dt,{ground:groundAt(r.distance,r.offset).y,blocked:hasRoll(r.distance)||r.finishTime!==null});
 g.visible=open>.012;if(!g.visible)return;
 // Der Schirm bleibt beim Trick aufrecht, waehrend das Kart darunter dreht.
 g.rotation.order='YXZ';g.rotation.set(-r.mesh.rotation.x*.75,-spin,-r.mesh.rotation.z*.65-(r.steerS||0)*.09+Math.sin(elapsed*3+r.id)*.025*open);
 g.scale.set(.09+.91*open,.17+.83*open,.28+.72*open);g.position.y=-1.1*(1-open)+Math.sin(elapsed*4+r.id)*.045*open;
 if(r.id===0&&r.gliding&&!r.gliderSeen&&state==='race'){r.gliderSeen=true;toast('PILZGLEITER!  DRIFT = TRICK',1.3,'good');}}
function kart(color,goldLook=false,dtype=0){""")
replace("g.userData={...g.userData,shield,flames};return g;}","g.userData={...g.userData,shield,flames};attachGlider(g,color);return g;}")
replace("g.userData={parts:{wheels,driver},shield,flames,slot};","g.userData={parts:{wheels,driver},shield,flames,slot};attachGlider(g,color);")
replace("P.kartwheel?1:0].join('|');","P.kartwheel?1:0,P.glider?1:0].join('|');")
replace("if(u.shield)u.shield.visible=false;if(u.flames)","if(u.shield)u.shield.visible=false;if(u.glider)u.glider.visible=false;if(u.flames)")
replace("else if(!rh&&r.rampY>RAMP_H*.55){r.air=true;","else if(!rh&&r.rampY>RAMP_H*.55){armGlider(r,'ramp');r.air=true;")
replace("function land(r,ground,roadVy){const impact=","function land(r,ground,roadVy){resetGlider(r);const impact=")
replace("function respawn(r){const me=","function respawn(r){resetGlider(r,true);const me=")
replace("r.mesh.userData.shield.visible=r.shield>0;const fl=","syncGlider(r,dt,spin);r.mesh.userData.shield.visible=r.shield>0;const fl=")
replace("continue;}hitSpores(r);r.air=true;r.airT=0;r.vy=9;","continue;}hitSpores(r);resetGlider(r);r.air=true;r.airT=0;r.vy=9;")
replace("Math.abs(r.offset-pad.off)<2){r.air=true;","Math.abs(r.offset-pad.off)<2){armGlider(r,'bounce');r.air=true;")
replace("p.air?(p.trick?'TRICK!':'IN DER LUFT · DRIFT = TRICK')","p.air?(p.trick?'TRICK!':p.gliding?'PILZGLEITER · DRIFT = TRICK':'IN DER LUFT · DRIFT = TRICK')")
replace("if(TEST){window.rallyTest={start,home,use,pause,say,ceremony,hud,","""if(TEST){window.rallyTest={start,home,use,pause,say,ceremony,hud,
 gliderState:()=>racers.map(r=>({id:r.id,armed:!!r.glideArmed,gliding:!!r.gliding,open:r.gliderOpen||0,visible:!!r.mesh.userData.glider?.visible,asset:!!P.glider})),
 gliderPose:(phase='flight')=>{if(!racers.length)return null;const r=racers[0],rp=ramps.find(q=>!q.gap&&!hasRoll(q.end+7))||ramps[0],d=rp?rp.end+7:20,off=rp?.off||0,s=sample(d,off),gy=groundAt(d,off).y;r.distance=d;r.offset=off;r.x=s.p.x;r.z=s.p.z;r.h=s.angle;r.speed=28;r.vx=Math.sin(r.h)*28;r.vz=Math.cos(r.h)*28;r.y=gy+(phase==='ground'?0:3.4);r.vy=-2;r.air=phase!=='ground';r.airT=.35;r.stun=0;r.trick=0;r.finishTime=null;r.steerS=.3;r.lastGround=gy;resetGlider(r,true);armGlider(r,phase==='respawn'?'respawn':'ramp');state='inspect';for(let i=0;i<40;i++)syncKart(r,1/60);syncKartInstances();updateCamera(1/60,true);hud();renderer.render(scene,camera);return window.rallyTest.gliderState()[0];},""")
path.write_text(code,encoding='utf-8',newline='\n')
print('Glider runtime integrated; Audio section untouched.')

