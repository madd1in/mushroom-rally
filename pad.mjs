// Mushroom Rally R50: Controller (Gamepad-API, Standard-Belegung von Xbox-, PlayStation- und Switch-Pads).
// Reine Funktionen, im Spiel und in Tests genutzt: Stick mit Totzone, Trigger als Gas/Bremse, Tasten-Flanken.
export const PAD={dead:.18,curve:1.35,trig:.3,nav:.6};
// Standard-Mapping (https://w3c.github.io/gamepad/#remapping)
export const BTN={a:0,b:1,x:2,y:3,lb:4,rb:5,lt:6,rt:7,back:8,start:9,ls:10,rs:11,up:12,down:13,left:14,right:15};
// Knoepfe, deren Druck als einmaliges Ereignis zaehlt (Item, Pause, Menue); Richtungen kommen vom Steuerkreuz
// oder vom Stick (ueber PAD.nav hinaus)
export const PAD_EVENTS=['a','b','x','y','lb','rb','start','back','up','down','left','right'];

// Stick mit Totzone, danach auf 0..1 gestreckt und leicht gekruemmt: kleine Ausschlaege lenken fein,
// voller Ausschlag bleibt 1
export function deadzone(v,d=PAD.dead,curve=PAD.curve){const a=Math.abs(+v||0);if(!(a>d))return 0;
 return Math.sign(v)*Math.pow(Math.min(1,(a-d)/(1-d)),curve);}
// Knopfwert 0..1 - Gamepad-API liefert {pressed,value}, Tests auch nackte Zahlen/Booleans
export function btnValue(b){if(b==null)return 0;if(typeof b==='object')return Math.max(+b.value||0,b.pressed?1:0);return +b||0;}

// Zustand eines Pads: steer +1 = links (wie steering() im Spiel), Gas/Bremse/Drift als gehaltene Tasten,
// hold = welche Ereignis-Knoepfe gerade unten sind (fuer die Flankenerkennung)
export function readPad(gp){const B=gp?.buttons||[],A=gp?.axes||[],v=i=>btnValue(B[i]),on=i=>v(i)>.5;
 const sx=deadzone(A[0]),sy=deadzone(A[1]),dl=on(BTN.left),dr=on(BTN.right);
 const steer=dl!==dr?(dl?1:-1):-sx;
 const hold={};for(const k of PAD_EVENTS)hold[k]=on(BTN[k]);
 hold.left=hold.left||(A[0]??0)<-PAD.nav;hold.right=hold.right||(A[0]??0)>PAD.nav;
 hold.up=hold.up||(A[1]??0)<-PAD.nav;hold.down=hold.down||(A[1]??0)>PAD.nav;
 return {steer:steer||0,gas:on(BTN.a)||v(BTN.rt)>PAD.trig,brake:on(BTN.b)||v(BTN.lt)>PAD.trig,
  drift:on(BTN.lb)||on(BTN.rb),stickY:sy,hold,active:Math.abs(sx)>0||Math.abs(sy)>0||B.some(b=>btnValue(b)>.5)};}

// Neu gedrueckte Ereignis-Knoepfe seit dem letzten Stand (ohne Vorstand: nichts, damit ein beim
// Verbinden schon gehaltener Knopf nicht ausloest)
export function padPressed(cur,prev){if(!cur||!prev)return [];return PAD_EVENTS.filter(k=>cur.hold[k]&&!prev.hold[k]);}

// Erstes verbundenes Pad, Standard-Belegung bevorzugt
export function pickPad(list){const pads=[...(list||[])].filter(p=>p&&p.connected!==false);
 return pads.find(p=>p.mapping==='standard')||pads[0]||null;}

// Menue: Auswahl mit Umlauf (Strecke, Klasse, Modus)
export const cycle=(i,d,n)=>n>0?((i+d)%n+n)%n:0;
