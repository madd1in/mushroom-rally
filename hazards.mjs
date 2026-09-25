// Mushroom Rally R44: Taktgeber der neuen Hindernisse (reine Funktionen, im Spiel und in Tests genutzt).
// Stampfer: warten oben -> fallen -> liegen (Hindernis) -> hochziehen. Feuerkoenig: Feuerball aus dem Maul
// in einem Bogen auf Fahrhoehe und quer ueber die Bahn. Roehrenkanone: Kugelblitze in wechselnden Spuren.
export const STAMP={up:1.5,fall:.28,down:.9,rise:.92,top:7.2,half:2.2};
export const STAMP_CYCLE=STAMP.up+STAMP.fall+STAMP.down+STAMP.rise;
// Zustand zur Zeit t (Sekunden) mit Phasenversatz ph: Hoehe ueber der Bahn, Abschnitt, Fallgeschwindigkeit
export function stamperState(t,ph=0){const c=((t+ph)%STAMP_CYCLE+STAMP_CYCLE)%STAMP_CYCLE;
 if(c<STAMP.up)return {y:STAMP.top,phase:'up',warn:c/STAMP.up};
 let u=c-STAMP.up;if(u<STAMP.fall){const k=u/STAMP.fall;return {y:STAMP.top*(1-k*k),phase:'fall',warn:1};}
 u-=STAMP.fall;if(u<STAMP.down)return {y:0,phase:'down',warn:0,impact:u};
 u-=STAMP.down;const k=u/STAMP.rise;return {y:STAMP.top*k*k*(3-2*k),phase:'rise',warn:0};}
// Gefaehrlich (Quetschen) nur im letzten Stueck des Falls, danach ist der Block ein festes Hindernis
export const stamperCrushes=s=>s.phase==='fall'&&s.y<2.4;
export const stamperBlocks=s=>s.y<2.6;

// Feuerkoenig: Zyklus aus Flug und Pause. side = Seite der Statue (+1 rechts, -1 links, in Streckenversatz).
export const FIRE={flight:1.15,pause:1.45,mouthOff:13.2,mouthY:6.8,farOff:-14,drop:.2,ride:1.35};
export const FIRE_CYCLE=FIRE.flight+FIRE.pause;
export function fireballAt(t,ph,side){const c=((t+ph)%FIRE_CYCLE+FIRE_CYCLE)%FIRE_CYCLE;if(c>=FIRE.flight)return {vis:false,off:side*FIRE.mouthOff,y:FIRE.mouthY,u:1};
 const u=c/FIRE.flight,off=side*(FIRE.mouthOff+(FIRE.farOff-FIRE.mouthOff)*u),k=Math.max(0,1-u/FIRE.drop);
 return {vis:true,off,y:FIRE.ride+(FIRE.mouthY-FIRE.ride)*k*k,u};}

// Roehrenkanone: alle GAP Sekunden ein Kugelblitz, Spur aus dem Muster (leicht versetzt, nie zweimal gleich)
export const CANNON={gap:1.6,speed:24,range:115,merge:14,lanes:[-3.5,0,3.5,-1.5,2,-4.5,1]};
export const cannonLane=k=>CANNON.lanes[((k%CANNON.lanes.length)+CANNON.lanes.length)%CANNON.lanes.length];
// Position eines Geschosses s Sekunden nach dem Abschuss: Abstand ab Muendung entlang der Bahn zurueck und Versatz
// (von der Muendung seitlich in die Spur einschwenkend)
export function missileAt(s,muzzleOff,lane){const run=s*CANNON.speed,k=Math.min(1,run/CANNON.merge),e=k*k*(3-2*k);return {back:run,off:muzzleOff+(lane-muzzleOff)*e,alive:run<=CANNON.range};}
