"""Mushroom Rally R44: Themen-Wahrzeichen (eigene, stilisierte Entwuerfe), Export assets/landmarks.glb (Teile per Name):
  LM_Castle      Maerchenschloss im Neuschwanstein-Stil auf Felssockel (weisse Mauern, schlanke Rundtuerme mit
                 schieferblauen Kegeldaechern, steile Palasdaecher, roter Torbau, goldene Wetterfahnen), ~46 m hoch
  LM_Maypole     Maibaum: blau-weiss gewundener Stamm, zwei Kraenze, Zunftschilder, Krone mit Fahne
  LM_Tent        Festzelt (Oktoberfest): blau-weiss gestreiftes Dach, Giebel mit Leuchtband, Eingang, Faehnchen
  LM_Heart       Lebkuchenherz als Leuchtschild (Zuckerguss-Rand, Band zum Aufhaengen)
  LM_Pretzel     Riesenbrezel als Leuchtschild auf Pfahl
  LM_Loco        Dampflok (Kessel, Schlot, Dampfdom, Fuehrerhaus, rote Speichenraeder, Kuhfaenger, Laterne), faehrt nach +z
  LM_Wagon       offener Gueterwagen mit Holzkisten und Faessern
  LM_Crossing    Bahnuebergangs-Signal (Andreaskreuz, zwei Blinklichter)
Farben: Lacke (CapPaint, TentPaint, LocoPaint) im Spiel einfaerbbar; Leuchtteile als emittierende Materialien.
"""
import sys, math, json, pathlib
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
init('R44_Landmarks')
use_materials({
    'Wall': material('CastleWhite', (.95, .93, .88, 1), .7),
    'Slate': material('SlateBlue', (.28, .38, .52, 1), .6, .1),
    'Brick': material('BrickRed', (.72, .3, .22, 1), .8),
    'Rock': material('RockGrey', (.5, .5, .48, 1), .9),
    'Window': material('WindowDark', (.12, .14, .22, 1), .4),
    'Gold': material('Gold', (1, .76, .22, 1), .3, .85),
    'Green': material('Moss', (.32, .55, .28, 1), .9),
    'BavBlue': material('BavBlue', (.1, .45, .9, 1), .5),
    'White': material('White', (.97, .97, .95, 1), .5),
    'Wood': material('WoodPaint', (.55, .36, .2, 1), .8),
    'DarkWood': material('DarkWood', (.3, .19, .11, 1), .8),
    'NeonPink': material('NeonPink', (1, .3, .7, 1), .3, 0, (1, .25, .65, 1), 2.4),
    'NeonGold': material('NeonGold', (1, .8, .3, 1), .3, 0, (1, .72, .2, 1), 2.4),
    'Ginger': material('Gingerbread', (.62, .35, .16, 1), .8),
    'Icing': material('Icing', (1, .97, .92, 1), .5),
    'Red': material('Red', (.85, .15, .12, 1), .5),
    'LocoPaint': material('LocoPaint', (.12, .12, .14, 1), .45, .5),
    'Iron': material('Iron', (.2, .2, .22, 1), .5, .7),
    'Brass': material('Brass', (.95, .72, .3, 1), .3, .85),
    'Lamp': material('LampGlow', (1, .92, .6, 1), .2, 0, (1, .85, .5, 1), 3.0),
    'Crate': material('Crate', (.72, .5, .26, 1), .85),
    'SignalRed': material('SignalRed', (1, .1, .08, 1), .3, 0, (1, .08, .05, 1), 2.8),
})
report = {}
def cone(base, tip, r, seg=12):
    return cyl(base, tip, r, 0.0, seg)
def tower(part, x, z, r, h0, h1, roof=3.2, seg=16, key='Wall'):
    part.add(key, cyl((x, h0, z), (x, h1, z), r, r * .96, seg))
    part.add(key, cyl((x, h1 - .1, z), (x, h1 + .9, z), r * 1.14, r * 1.14, seg))      # Kranz
    part.add('Slate', cone((x, h1 + .85, z), (x, h1 + .85 + r * roof, z), r * 1.22, seg))
    part.add('Gold', cyl((x, h1 + .85 + r * roof, z), (x, h1 + 1.9 + r * roof, z), .08, .05, 6))
    for k in range(4):
        a = k * math.pi / 2 + .4
        part.add('Window', rbox((x + math.cos(a) * r * .97, h1 - 2.2, z + math.sin(a) * r * .97), (.5, 1.2, .5), 0, 1), smooth=False)

# ---------------- Maerchenschloss (Ursprung Fels-Unterkante Mitte, Front nach +z)
c = Part('LM_Castle')
c.add('Rock', sphere((0, 2, 0), 1, (26, 9, 20), 20, 10))
c.add('Green', sphere((0, 5.6, 0), 1, (22, 2.2, 16), 20, 6))
# Palas: langes Hauptgebaeude mit steilem Dach und Fensterreihen
c.add('Wall', rbox((0, 15, -2), (24, 18, 9), .2, 1))
def gable_roof(bm, x0, x1, z0, z1, y0, h):
    zc = (z0 + z1) / 2
    vs = [bm.verts.new(G(x, y, z)) for x in (x0, x1) for (y, z) in ((y0, z0), (y0, z1), (y0 + h, zc))]
    fs = [bm.faces.new((vs[0], vs[1], vs[4], vs[3])), bm.faces.new((vs[1], vs[2], vs[5], vs[4])), bm.faces.new((vs[2], vs[0], vs[3], vs[5])),
          bm.faces.new((vs[0], vs[2], vs[1])), bm.faces.new((vs[3], vs[4], vs[5]))]
    bmesh.ops.recalc_face_normals(bm, faces=fs)
c.add('Slate', lambda bm: gable_roof(bm, -12.6, 12.6, -7, 3, 24, 8), smooth=False)
for row in range(3):
    for k in range(8):
        c.add('Window', rbox((-9.6 + k * 2.75, 10.5 + row * 4, 2.55), (.9, 2.0, .1), 0, 1), smooth=False)
# Tuerme: hoher Bergfried hinten links, schlanke Tuerme an den Ecken, Treppenturm
tower(c, -10.5, -6, 2.4, 6, 30, 2.6)
tower(c, 11, -5.5, 1.8, 6, 26, 2.8)
tower(c, 12, 3, 1.4, 6, 22, 3.0)
tower(c, -12.5, 3.2, 1.2, 6, 20, 3.2)
tower(c, 4, -8.5, 2.0, 20, 34, 2.4)
# Torbau aus rotem Backstein vorn mit Zinnen und Ecktuermchen
c.add('Brick', rbox((0, 10, 9.5), (12, 8, 5), .1, 1))
c.add('Window', rbox((0, 8.6, 12.05), (3.2, 4.4, .2), .3, 1), smooth=False)
for k in range(6):
    c.add('Brick', rbox((-5 + k * 2, 14.5, 12.0), (1.0, 1.0, .9), 0, 1), smooth=False)
for sx in (-1, 1):
    tower(c, sx * 6.4, 11.8, 1.1, 6, 17, 2.4, 12, 'Brick')
# Verbindungsmauer mit Wehrgang
c.add('Wall', rbox((0, 9, 4.5), (22, 6, 1.2), .1, 1))
c.finish()

# ---------------- Maibaum (Ursprung Fuss)
m = Part('LM_Maypole')
H = 24
for k in range(24):
    y0, y1 = k * H / 24, (k + 1) * H / 24
    m.add('BavBlue' if k % 2 == 0 else 'White', cyl((0, y0, 0), (0, y1, 0), .42 - k * .008, .42 - (k + 1) * .008, 12))
for y in (15, 20):
    m.add('Green', torus((0, y, 0), 1.7, .22, (0, 1, 0), 20, 6))
    for k in range(4):
        a = k * math.pi / 2
        m.add('Green', cyl((math.cos(a) * .3, y + .1, math.sin(a) * .3), (math.cos(a) * 1.6, y - .1, math.sin(a) * 1.6), .05, .05, 4))
for i, (y, a) in enumerate(((6, 0), (8.5, math.pi), (11, .6), (13.5, math.pi + .6))):
    x, z = math.cos(a) * 1.1, math.sin(a) * 1.1
    m.add('White', rbox((x, y, z), (1.3, .9, .08), .05, 1, rot=(0, 0, 0)))
    m.add('BavBlue' if i % 2 else 'Red', rbox((x, y, z + .05), (.8, .5, .04), .02, 1))
m.add('Green', sphere((0, H + .6, 0), 1.1, (1, .8, 1), 12, 8))
m.add('Gold', cyl((0, H, 0), (0, H + 3, 0), .06, .05, 6))
m.add('BavBlue', side_prism([(0, H + 2.8), (0, H + 1.8), (1.6, H + 2.3)], -.02, .02), smooth=False)
m.finish()

# ---------------- Festzelt (Ursprung Boden Mitte, Front nach +z)
t = Part('LM_Tent')
t.add('White', rbox((0, 2.4, 0), (22, 4.8, 14), .1, 1))
N = 10
for k in range(N):
    x0, x1 = -11.4 + k * 22.8 / N, -11.4 + (k + 1) * 22.8 / N
    t.add('BavBlue' if k % 2 == 0 else 'White', lambda bm, a=x0, b=x1: gable_roof(bm, a, b, -7.4, 7.4, 4.8, 4.6), smooth=False)
t.add('NeonGold', rbox((0, 4.95, 7.3), (22.6, .22, .12), .03, 1))
t.add('DarkWood', rbox((0, 1.7, 7.05), (4.2, 3.4, .2), .1, 1))
t.add('NeonPink', rbox((0, 7.1, 7.15), (7.5, 1.6, .15), .1, 1))     # Schild ueber dem Eingang (Schrift im Spiel)
for sx in (-1, 1):
    for k in range(3):
        t.add('Window', rbox((sx * (4 + k * 2.4), 2.8, 7.05), (1.4, 1.4, .08), 0, 1), smooth=False)
    t.add('Wood', cyl((sx * 11.8, 0, 7.6), (sx * 11.8, 10.5, 7.6), .12, .1, 8))
    t.add('BavBlue', side_prism([(7.6, 10.3), (7.6, 9.2), (9.4, 9.75)], sx * 11.8 - .02, sx * 11.8 + .02), smooth=False)
t.finish()

# ---------------- Lebkuchenherz und Brezel (Leuchtschilder)
h = Part('LM_Heart')
def heart(bm, s=1.0, z=0.0, depth=.25):
    pts = []
    for i in range(40):
        u = 2 * math.pi * i / 40
        x = 16 * math.sin(u) ** 3
        y = 13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u) - math.cos(4 * u)
        pts.append((x / 17 * s, y / 17 * s))
    a = [bm.verts.new(G(x, y, z)) for x, y in pts]
    b = [bm.verts.new(G(x, y, z + depth)) for x, y in pts]
    fs = [bm.faces.new(list(reversed(a))), bm.faces.new(b)]
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        fs.append(bm.faces.new((a[i], a[j], b[j], b[i])))
    bmesh.ops.recalc_face_normals(bm, faces=fs)
h.add('Ginger', lambda bm: heart(bm, 1.6, -.12, .24), smooth=False)
h.add('NeonPink', lambda bm: heart(bm, 1.45, .12, .04), smooth=False)
h.add('Icing', lambda bm: heart(bm, 1.1, .16, .03), smooth=False)
h.add('BavBlue', tube([(-.9, 1.1, 0), (0, 2.4, 0), (.9, 1.1, 0)], .05, 6))
h.finish()
pz = Part('LM_Pretzel')
pz.add('Wood', cyl((0, 0, 0), (0, 5.2, 0), .14, .12, 8))
loop = []
for i in range(49):
    u = 2 * math.pi * i / 48
    x = 1.35 * math.sin(u) * (1 + .25 * math.cos(u))
    y = 6.4 + 1.0 * math.cos(u) + .55 * math.cos(2 * u) * .5
    loop.append((x, y, .08 * math.sin(3 * u)))
pz.add('NeonGold', tube(loop, .2, 8, caps=False))
pz.add('NeonGold', tube([(-.95, 6.9, 0), (0, 6.0, .1), (.95, 6.9, 0)], .19, 8))
pz.finish()

# ---------------- Dampflok und Gueterwagen (Spur 1,6 m, faehrt nach +z, Ursprung Schienenoberkante Mitte)
L = Part('LM_Loco')
L.add('Iron', rbox((0, .95, 0), (2.2, .35, 9.4), .06, 1))
L.add('LocoPaint', cyl((0, 2.35, -1.4), (0, 2.35, 3.9), 1.05, 1.05, 18))
L.add('Brass', torus((0, 2.35, 3.9), 1.02, .07, (0, 0, 1), 18, 5))
L.add('Iron', cyl((0, 2.35, 3.88), (0, 2.35, 4.02), .95, .95, 18))
L.add('LocoPaint', cyl((0, 3.2, 3.1), (0, 4.9, 3.1), .32, .48, 12))        # Schlot
L.add('Iron', cyl((0, 4.85, 3.1), (0, 5.05, 3.1), .52, .52, 12))
L.add('Brass', sphere((0, 3.45, 1.0), .42, (1, 1, 1), 12, 8))               # Dampfdom
L.add('Brass', sphere((0, 3.3, -.2), .3, (1, 1, 1), 10, 6))
L.add('Lamp', sphere((0, 3.05, 4.05), .26, (1, 1, .6), 10, 6))
L.add('LocoPaint', rbox((0, 2.9, -3.3), (2.5, 3.0, 2.6), .12, 1))           # Fuehrerhaus
L.add('Red', rbox((0, 4.55, -3.3), (2.8, .22, 3.0), .06, 1))
for sx in (-1, 1):
    L.add('Window', rbox((sx * 1.26, 3.3, -3.3), (.06, .9, 1.2), 0, 1), smooth=False)
L.add('Iron', prism([(4.6, .5), (5.4, .1), (5.4, .9), (4.6, 1.2)], -1.1, 1.1), smooth=False)   # Kuhfaenger
for sx in (-1, 1):
    for z, r in ((2.6, .75), (.8, .75), (-.9, .75), (-3.6, .5)):
        L.add('Red', cyl((sx * .82, r, z), (sx * .98, r, z), r, r, 16))
        L.add('Brass', cyl((sx * .97, r, z), (sx * 1.02, r, z), .16, .16, 8))
    L.add('Brass', rbox((sx * 1.03, .78, .85), (.08, .12, 3.6), .02, 1))
L.finish()
W = Part('LM_Wagon')
W.add('Iron', rbox((0, .95, 0), (2.2, .3, 7.4), .05, 1))
W.add('Crate', rbox((0, 1.55, 0), (2.5, .9, 7.2), .05, 1))
for sx in (-1, 1):
    W.add('DarkWood', rbox((sx * 1.28, 2.1, 0), (.12, 1.2, 7.2), .03, 1))
for sz in (-1, 1):
    W.add('DarkWood', rbox((0, 2.1, sz * 3.62), (2.6, 1.2, .12), .03, 1))
for (x, z, s) in ((-.55, -2.4, 1.0), (.5, -2.2, .9), (0, -.6, 1.1), (-.5, 1.3, .9), (.55, 1.6, 1.0)):
    W.add('Crate', rbox((x, 2.0 + s / 2, z), (s, s, s), .04, 1))
    W.add('DarkWood', rbox((x, 2.0 + s / 2, z + s / 2 + .01), (s * .9, .1, .02), 0, 1), smooth=False)
for x in (-.6, .6):
    W.add('Wood', cyl((x, 2.05, 3.0), (x, 2.95, 3.0), .38, .38, 12))
for sx in (-1, 1):
    for z in (-2.4, 2.4):
        W.add('Red', cyl((sx * .82, .55, z), (sx * .98, .55, z), .55, .55, 14))
W.finish()
X = Part('LM_Crossing')
X.add('White', cyl((0, 0, 0), (0, 4.6, 0), .09, .08, 8))
for a in (.62, -.62):
    X.add('Red', rbox((0, 4.1, .06), (2.4, .28, .05), 0, 1, rot=(0, 0, a)))
    X.add('White', rbox((0, 4.1, .09), (2.2, .16, .04), 0, 1, rot=(0, 0, a)))
X.add('Iron', rbox((0, 3.0, .1), (1.6, .3, .2), .04, 1))
for sx in (-1, 1):
    X.add('Iron', cyl((sx * .6, 3.0, .15), (sx * .6, 3.0, .45), .28, .28, 12))
    X.add('SignalRed', cyl((sx * .6, 3.0, .42), (sx * .6, 3.0, .47), .22, .22, 12))
X.finish()

objs = [o for o in blib.EXPORT.objects]
for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
for o in objs:
    o.data.calc_loop_triangles()
    report[o.name] = len(o.data.loop_triangles)
target = ROOT / 'assets' / 'landmarks.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
report['bytes'] = target.stat().st_size
(ROOT / 'art' / 'r44' / 'landmarks_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
print('REPORT', json.dumps(report))
