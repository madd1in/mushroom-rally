"""Mushroom Rally R44 Teil 3: Hindernisse und Deko (eigene Entwuerfe, prozedural in Blender).
Aufruf: blender -b --factory-startup --python art/r44/create_hazards.py
Export assets/hazards.glb (ohne Materialverschmelzung geladen, Teile per Objektname):
  HZ_Stamper        zorniger Steinblock mit Stachelkranz und Gesicht vorn/hinten (stampft auf die Bahn)
  HZ_Pipe           Roehre mit Randwulst, Goldband und Nieten (Deko, Hindernis, Pflanzen-Topf)
  HZ_PipeRing       grosser Roehrenrand fuer die befahrbare Roehre (Tunnel-Einfahrt)
  HZ_PlantStem      Stiel mit zwei Blaettern der Schnappblume
  HZ_PlantJawTop    Oberkiefer (Drehpunkt am Scharnier hinten) mit Tupfen und Zaehnen
  HZ_PlantJawBot    Unterkiefer mit Zaehnen und Zunge
  HZ_Statue         riesiger Feuerkoenig: gehoernte Stein-Buste mit gluehenden Augen und offenem Maul (spuckt Feuerbaelle)
  HZ_Cannon         Roehrenkanone auf Steinsockel, Muendung nach +z
  HZ_Missile        Kugelblitz: Geschoss mit Augen, Brauen, Flossen und gluehendem Heck (fliegt nach +z)
  HZ_Sign           Warnschild "Achtung Lava": Holzpfosten, gelbe Tafel, Warndreieck und Lavawellen
Farben mit Lack-Materialien (StonePaint, PipePaint, PlantPaint, WoodPaint) sind im Spiel einfaerbbar.
"""
import sys, math, json, pathlib
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
init('R44_Hazards')
use_materials({
    'StonePaint': material('StonePaint', (.62, .64, .7, 1), .8),
    'StoneDark': material('StoneDark', (.2, .21, .25, 1), .85),
    'White': material('White', (.97, .97, .95, 1), .45),
    'Dark': material('Dark', (.06, .06, .08, 1), .5, .2),
    'Void': material('Void', (.01, .01, .012, 1), 1),
    'Gold': material('Gold', (1, .74, .2, 1), .3, .85),
    'PipePaint': material('PipePaint', (.16, .66, .26, 1), .38, .1),
    'PlantPaint': material('PlantPaint', (.78, .1, .42, 1), .45),
    'PlantStem': material('PlantStem', (.26, .62, .2, 1), .6),
    'Pink': material('Pink', (1, .5, .62, 1), .55),
    'Bone': material('Bone', (.96, .9, .74, 1), .6),
    'LavaGlow': material('LavaGlow', (1, .45, .06, 1), .4, 0, (1, .38, .04, 1), 4.0),
    'WoodPaint': material('WoodPaint', (.55, .35, .18, 1), .8),
    'SignYellow': material('SignYellow', (1, .8, .1, 1), .5),
    'SignRed': material('SignRed', (.9, .12, .1, 1), .5),
    'SignOrange': material('SignOrange', (1, .45, .05, 1), .5, 0, (1, .35, .02, 1), .8),
})
report = {}

def cone(base, tip, r, seg=4):
    return cyl(base, tip, r, 0.0, seg)

def face(part, z, s):
    """Zorniges Gesicht auf einer Stirnflaeche bei Spiel-z = z (s = +1 vorn, -1 hinten)."""
    for x in (-.78, .78):
        part.add('White', sphere((x, 2.75, z + s * .02), .46, (1, .82, .35), 16, 8))
        part.add('Dark', sphere((x * .88, 2.62, z + s * .15), .19, (1, 1.15, .5), 10, 6))
        part.add('Dark', rbox((x, 3.42, z + s * .1), (1.0, .26, .24), .06, 1, rot=(0, 0, -.38 if x < 0 else .38)))
    part.add('Dark', rbox((0, 1.25, z + s * .06), (2.3, .78, .2), .1))
    for i in range(6):
        x = -.95 + i * .38
        part.add('White', rbox((x, 1.47, z + s * .15), (.3, .26, .1), .03, 1))
        part.add('White', rbox((x, 1.03, z + s * .15), (.3, .26, .1), .03, 1))

# ---------------------------------------------------------------- Stampfer
st = Part('HZ_Stamper')
st.add('StonePaint', rbox((0, 2.2, 0), (4.2, 4.4, 3.2), .38, 2))
# Steinfugen als dunkle Kerben auf den Seiten
for x in (-2.11, 2.11):
    for y in (1.3, 3.1):
        st.add('StoneDark', rbox((x, y, 0), (.06, .1, 2.6), .02, 1))
# Stachelkranz: Seiten, Oberkante, Unterkante aussen
for sx in (-1, 1):
    for y in (1.0, 2.2, 3.4):
        for z in (-.9, .9):
            st.add('StoneDark', cone((sx * 2.05, y, z), (sx * 2.75, y, z), .34), smooth=False)
for x in (-1.4, 0, 1.4):
    for z in (-.9, .9):
        st.add('StoneDark', cone((x, 4.35, z), (x, 5.05, z), .34), smooth=False)
face(st, 1.6, 1)
face(st, -1.6, -1)
st.finish()

# ---------------------------------------------------------------- Roehre
pp = Part('HZ_Pipe')
pp.add('PipePaint', cyl((0, 0, 0), (0, 2.6, 0), 1.25, 1.25, 28))
pp.add('PipePaint', cyl((0, 2.5, 0), (0, 3.2, 0), 1.55, 1.55, 28))
pp.add('Void', cyl((0, 3.12, 0), (0, 3.215, 0), 1.3, 1.3, 28))
pp.add('Gold', torus((0, .55, 0), 1.26, .07, (0, 1, 0), 28, 6))
for k in range(8):
    a = 2 * math.pi * k / 8
    pp.add('Gold', sphere((math.cos(a) * 1.56, 2.85, math.sin(a) * 1.56), .09, (1, 1, 1), 8, 5))
pp.finish()

# Roehrenrand fuer die befahrbare Roehre: Ring um Spiel-z (Innenradius 8,6 m, Strasse ist 15,2 m breit)
pr = Part('HZ_PipeRing')
def ring_z(z0, z1, ri, ro, seg=40):
    def b(bm):
        rings = []
        for z in (z0, z1):
            for r in (ri, ro):
                rings.append([bm.verts.new(G(math.cos(2 * math.pi * i / seg) * r, math.sin(2 * math.pi * i / seg) * r, z)) for i in range(seg)])
        (a_in, a_out, b_in, b_out) = rings
        fs = []
        for i in range(seg):
            j = (i + 1) % seg
            fs.append(bm.faces.new((a_out[i], a_out[j], b_out[j], b_out[i])))   # aussen
            fs.append(bm.faces.new((a_in[j], a_in[i], b_in[i], b_in[j])))       # innen
            fs.append(bm.faces.new((a_in[i], a_in[j], a_out[j], a_out[i])))     # Stirn vorn
            fs.append(bm.faces.new((b_in[j], b_in[i], b_out[i], b_out[j])))     # Stirn hinten
        bmesh.ops.recalc_face_normals(bm, faces=fs)
    return b
pr.add('PipePaint', ring_z(-.9, .9, 8.6, 10.0))
pr.add('Gold', ring_z(-1.0, -.85, 9.2, 10.08))
pr.add('Gold', ring_z(.85, 1.0, 9.2, 10.08))
pr.finish()

# ---------------------------------------------------------------- Schnappblume (steht auf dem Roehrenrand, y=0 = Oberkante)
ps = Part('HZ_PlantStem')
ps.add('PlantStem', tube([(0, 0, 0), (0, .7, .06), (.05, 1.4, .1), (0, 2.1, 0)], .2, 10))
for sx in (-1, 1):
    ps.add('PlantStem', sphere((sx * .62, .42, 0), 1, (.72, .1, .36), 12, 6, rot=Matrix.Rotation(sx * .35, 3, 'Y')))
ps.finish()
HING = (0, 2.3, -.85)
def jaw(name, upper):
    part = Part(name)
    def half(bm):
        before = set(bm.verts)
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1)
        new = [v for v in bm.verts if v not in before]
        # obere bzw. untere Haelfte behalten (Blender-z = Spiel-y), Schnittkante flach
        for v in new:
            if (v.co.z < 0) == upper:
                v.co.z = 0
        r = 1.08 if upper else .96
        xf(bm, new, Matrix.Translation(G(0, 2.3, .05)) @ Matrix.Diagonal((r, r * 1.1, r * (.95 if upper else .7), 1)))
    part.add('PlantPaint', half)
    # Maulinneres als rosa Scheibe knapp innerhalb der Schnittflaeche
    part.add('Pink', cyl((0, 2.3 + (.02 if upper else -.02), .05), (0, 2.3 + (.05 if upper else -.05), .05), .98 if upper else .88, .98 if upper else .88, 20))
    # Zaehne entlang der vorderen Kante
    for k in range(-3, 4):
        a = k * .32
        x, z = math.sin(a) * (.92 if upper else .82), .05 + math.cos(a) * (.92 if upper else .82)
        base_y = 2.3 + (-.02 if upper else .02)
        part.add('White', cone((x, base_y, z), (x, base_y + (-.3 if upper else .26), z), .09, 6), smooth=False)
    if upper:
        for (x, y, z, r) in ((0, 3.4, .1, .22), (-.6, 3.05, .45, .16), (.6, 3.05, .45, .16), (-.75, 2.95, -.3, .15), (.7, 3.1, -.35, .14)):
            part.add('White', sphere((x, y, z), r, (1, .45, 1), 10, 5))
    else:
        part.add('Pink', sphere((0, 2.28, .25), .45, (1, .2, 1.1), 12, 6))
    return part.finish(origin=HING)
jaw('HZ_PlantJawTop', True)
jaw('HZ_PlantJawBot', False)

# ---------------------------------------------------------------- Feuerkoenig-Statue (etwa 13 m hoch)
sa = Part('HZ_Statue')
sa.add('StoneDark', rbox((0, 1.2, 0), (7.4, 2.4, 6.4), .3))
sa.add('LavaGlow', rbox((0, 2.45, 0), (7.0, .12, 6.0), .03, 1))
sa.add('StonePaint', rbox((0, 4.4, -.2), (6.6, 4.0, 4.6), .9, 2))
for k in range(7):
    a = -1.35 + k * .45
    sa.add('StoneDark', cone((math.sin(a) * 3.0, 6.2, -.2 + math.cos(a) * -1.8), (math.sin(a) * 3.9, 7.4, -.2 + math.cos(a) * -2.6), .45, 5), smooth=False)
sa.add('StonePaint', sphere((0, 8.3, .4), 2.6, (1.08, .95, 1.1), 24, 14))
sa.add('StonePaint', rbox((0, 7.6, 2.5), (3.0, 1.7, 2.3), .6, 2))
for x in (-.55, .55):
    sa.add('Dark', sphere((x, 7.95, 3.62), .2, (1, .7, .5), 8, 5))
# offenes Maul: Unterkiefer, gluehender Rachen, Fangzaehne
sa.add('StonePaint', rbox((0, 6.2, 2.3), (2.8, .7, 2.5), .3))
sa.add('LavaGlow', rbox((0, 6.85, 2.7), (2.2, .7, 1.4), .15))
for x in (-1.05, 1.05):
    sa.add('Bone', cone((x, 6.55, 3.4), (x, 7.15, 3.45), .17, 6), smooth=False)
    sa.add('Bone', cone((x * .8, 7.2, 3.55), (x * .8, 6.7, 3.55), .15, 6), smooth=False)
# Augen gluehen unter schweren Brauen
for x in (-1.0, 1.0):
    sa.add('LavaGlow', sphere((x, 8.95, 2.98), .42, (1, .75, .5), 12, 8))
    sa.add('StoneDark', rbox((x, 9.5, 3.02), (1.5, .45, .8), .12, 1, rot=(0, 0, -.3 if x < 0 else .3)))
# Hoerner und Stachelkamm
for sx in (-1, 1):
    sa.add('Bone', tube([(sx * 1.9, 9.4, .3), (sx * 2.7, 10.0, .2), (sx * 3.2, 10.8, 0)], .45, 10))
    sa.add('Bone', cone((sx * 3.2, 10.75, 0), (sx * 3.3, 11.7, .25), .42, 10))
for k in range(5):
    z = -1.6 + k * .7
    sa.add('StoneDark', cone((0, 10.6 - abs(k - 2) * .25, z), (0, 11.9 - abs(k - 2) * .35, z - .25), .42, 5), smooth=False)
sa.finish()

# ---------------------------------------------------------------- Roehrenkanone und Kugelblitz
ca = Part('HZ_Cannon')
ca.add('StoneDark', rbox((0, 1.0, 0), (3.2, 2.0, 3.4), .25))
for x in (-1.45, 1.45):
    for z in (-1.55, 1.55):
        ca.add('Gold', sphere((x, 2.0, z), .16, (1, 1, 1), 8, 5))
ca.add('Dark', cyl((0, 2.75, -1.7), (0, 2.75, 1.6), 1.12, 1.12, 24))
ca.add('Dark', cyl((0, 2.75, 1.55), (0, 2.75, 2.15), 1.34, 1.34, 24))
ca.add('Void', cyl((0, 2.75, 2.12), (0, 2.75, 2.18), .9, .9, 24))
ca.add('Gold', torus((0, 2.75, .4), 1.13, .08, (0, 0, 1), 24, 6))
ca.add('Gold', torus((0, 2.75, -1.2), 1.13, .08, (0, 0, 1), 24, 6))
for sx in (-1, 1):
    ca.add('White', cyl((sx * 1.1, 2.75, -.4), (sx * 1.16, 2.75, -.4), .42, .42, 20))
    ca.add('SignRed', cyl((sx * 1.15, 2.75, -.4), (sx * 1.18, 2.75, -.4), .22, .22, 12))
ca.finish()
mi = Part('HZ_Missile')
mi.add('Dark', cyl((0, 0, -1.0), (0, 0, .45), .72, .72, 22))
mi.add('Dark', sphere((0, 0, .45), .72, (1, 1, 1.15), 22, 10))
mi.add('Gold', torus((0, 0, -.72), .73, .06, (0, 0, 1), 22, 5))
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    c, s_ = math.cos(a), math.sin(a)
    mi.add('Dark', rbox((c * .78, s_ * .78, -.85), (.08, .5, .5), .03, 1, rot=(0, 0, a - math.pi / 2)))
for x in (-.3, .3):
    mi.add('White', sphere((x, .2, 1.05), .22, (1, 1.3, .45), 12, 6))
    mi.add('Dark', sphere((x * .85, .16, 1.15), .09, (1, 1.3, .5), 8, 5))
    mi.add('Dark', rbox((x, .55, 1.02), (.4, .09, .12), .02, 1, rot=(0, 0, -.45 if x < 0 else .45)))
mi.add('LavaGlow', cyl((0, 0, -1.03), (0, 0, -.98), .55, .55, 18))
mi.finish()

# ---------------------------------------------------------------- Warnschild "Achtung Lava" (Tafel zeigt nach +z)
sg = Part('HZ_Sign')
for x in (-1.15, 1.15):
    sg.add('WoodPaint', rbox((x, 1.35, -.05), (.22, 2.7, .22), .04, 1))
sg.add('Dark', rbox((0, 2.55, 0), (3.3, 2.15, .14), .08))
sg.add('SignYellow', rbox((0, 2.55, .03), (3.1, 1.95, .14), .07))
# Warndreieck mit Ausrufezeichen
tri = [(-.62, 0), (.62, 0), (0, 1.08)]
def flat_poly(poly, z, key, ox=0, oy=0, depth=.03):
    def b(bm):
        vs0 = [bm.verts.new(G(ox + x, oy + y, z)) for x, y in poly]
        vs1 = [bm.verts.new(G(ox + x, oy + y, z + depth)) for x, y in poly]
        fs = [bm.faces.new(vs1), bm.faces.new(list(reversed(vs0)))]
        n = len(poly)
        for i in range(n):
            j = (i + 1) % n
            fs.append(bm.faces.new((vs0[i], vs0[j], vs1[j], vs1[i])))
        bmesh.ops.recalc_face_normals(bm, faces=fs)
    sg.add(key, b, smooth=False)
flat_poly(tri, .1, 'SignRed', -.55, 2.05)
flat_poly([(x * .72, y * .72 + .1) for x, y in tri], .12, 'White', -.55, 2.05)
sg.add('Dark', rbox((-.55, 2.62, .17), (.13, .42, .04), .02, 1))
sg.add('Dark', rbox((-.55, 2.3, .17), (.13, .12, .04), .02, 1))
# Lavawellen rechts: drei gluehende Wellenbaender
for k in range(3):
    pts = [(i * .12, math.sin(i * .9 + k) * .08) for i in range(9)]
    band = pts + [(x, y - .12) for x, y in reversed(pts)]
    flat_poly(band, .1, 'SignOrange', .25, 2.2 + k * .28)
sg.finish()

objs = [o for o in blib.EXPORT.objects]
for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
for o in objs:
    o.data.calc_loop_triangles()
    report[o.name] = len(o.data.loop_triangles)
target = ROOT / 'assets' / 'hazards.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
report['bytes'] = target.stat().st_size
(ROOT / 'art' / 'r44' / 'hazards_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art' / 'r44' / 'hazards.blend'))
print('REPORT', json.dumps(report))
