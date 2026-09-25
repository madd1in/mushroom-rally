"""Mushroom Rally R44: Tribuene neu (Mario-Kart-World-Anmutung), gleiche Sitzgeometrie wie vorher.
Aufruf: blender -b --factory-startup --python art/r44/create_grandstand.py
Export assets/grandstand.glb (ein Segment, 18 m breit, Front nach +z zur Strasse). Die Zuschauer stehen wie bisher
auf vier Stufen: Oberkante y = .45 + Reihe * .75, Stufenmitte z = .2 - Reihe * 1.1 (game.js buildStands).
Aufbau: Betonstufen mit farbigen Setzstufen und Baenken, niedrige Bruestung mit Sponsorband und Schachbrettstreifen
(die Zuschauer bleiben sichtbar), gestufte Seitenwaende mit Gelaender, Rueckwand mit Farbfeldern, geschwungenes
gestreiftes Dach mit Bogenkante auf schlanken Stahlstuetzen, Wimpelkette, Fahnenmasten und ein Pilz-Schild.
"""
import sys, math, json, pathlib, shutil
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
bak = ROOT / 'art' / 'r44' / 'grandstand_r43_backup.glb'
if not bak.exists():
    shutil.copy2(ROOT / 'assets' / 'grandstand.glb', bak)
init('R44_Stand')
use_materials({
    'StandConcrete': material('StandConcrete', (.86, .86, .84, 1), .85),
    'StandRiser': material('StandRiser', (.16, .42, .9, 1), .6),
    'StandSeat': material('StandSeat', (.95, .22, .2, 1), .55),
    'StandSeatB': material('StandSeatB', (1, .78, .12, 1), .55),
    'StandCream': material('StandCream', (.98, .96, .9, 1), .6),
    'StandAwning': material('StandAwning', (.92, .16, .18, 1), .55),
    'StandFrame': material('StandFrame', (.82, .85, .9, 1), .35, .7),
    'StandDark': material('StandDark', (.1, .1, .13, 1), .6),
    'StandFlag': material('StandFlag', (1, .8, .1, 1), .6),
    'StandBlue': material('StandBlue', (.1, .55, .95, 1), .55),
    'StandGreen': material('StandGreen', (.25, .75, .3, 1), .55),
})
W = 9.0
p = Part('Grandstand')
# ---------- Stufen
for r in range(4):
    top, zc = .45 + r * .75, .2 - r * 1.1
    p.add('StandConcrete', rbox((0, top / 2, zc), (2 * W - .3, top, 1.1), 0, 1), smooth=False)
    p.add('StandRiser', rbox((0, top - .2, zc + .56), (2 * W - .32, .36, .04), 0, 1), smooth=False)
    # Baenke je 3 m, Farben abwechselnd rot/gelb
    for k in range(6):
        x = -W + 1.6 + k * 2.96
        p.add('StandSeat' if (k + r) % 2 == 0 else 'StandSeatB', rbox((x, top + .12, zc - .28), (2.5, .16, .36), 0, 1), smooth=False)
# hinterer Unterbau bis zur Rueckwand
p.add('StandConcrete', rbox((0, 1.4, -3.95), (2 * W - .3, 2.8, .5), 0, 1), smooth=False)
# ---------- Bruestung vorn: weisses Band, blaues Sponsorfeld, Schachbrettstreifen
p.add('StandCream', rbox((0, .55, .86), (2 * W, 1.1, .18), .05))
p.add('StandBlue', rbox((0, .62, .96), (2 * W - .6, .5, .04), 0, 1), smooth=False)
for k in range(36):
    x = -W + .25 + k * .5
    p.add('StandDark' if k % 2 else 'StandCream', rbox((x, 1.02, .96), (.5, .16, .03), 0, 1), smooth=False)
    p.add('StandCream' if k % 2 else 'StandDark', rbox((x, .86, .96), (.5, .16, .03), 0, 1), smooth=False)
# ---------- Seitenwaende gestuft, mit Gelaender
for sx in (-1, 1):
    x = sx * (W - .08)
    prof = [(1.0, 0), (-4.3, 0), (-4.3, 4.3), (-2.6, 3.5), (-1.5, 2.75), (-.4, 2.0), (.75, 1.25), (1.0, 1.1)]
    p.add('StandCream', side_prism(prof, x - .09, x + .09), smooth=False)
    p.add('StandAwning', side_prism([(1.0, 1.1), (.75, 1.25), (-.4, 2.0), (-1.5, 2.75), (-2.6, 3.5), (-4.3, 4.3), (-4.3, 4.05), (-2.6, 3.25), (-1.5, 2.5), (-.4, 1.75), (.75, 1.0), (1.0, .85)], x - .1, x + .1), smooth=False)
    p.add('StandFrame', tube([(x, 1.9, .9), (x, 2.3, .3), (x, 3.05, -.8), (x, 3.8, -1.9), (x, 4.6, -3.0), (x, 5.0, -4.0)], .05, 6))
# ---------- Rueckwand mit Farbfeldern
p.add('StandCream', rbox((0, 2.4, -4.28), (2 * W, 4.8, .2), 0, 1), smooth=False)
cols = ['StandAwning', 'StandFlag', 'StandBlue', 'StandGreen']
for k in range(6):
    x = -W + 1.5 + k * 3.0
    p.add(cols[k % 4], rbox((x, 3.7, -4.16), (2.6, 1.2, .05), 0, 1), smooth=False)
# ---------- Stahlstuetzen und geschwungenes Dach
for x in (-8.4, -2.8, 2.8, 8.4):
    p.add('StandFrame', cyl((x, 0, -4.05), (x, 6.25, -4.05), .12, .12, 10))
    p.add('StandFrame', tube([(x, 6.1, -4.05), (x, 6.0, -1.8), (x, 5.55, .4)], .08, 6))
def roof_y(z):
    # Bogen: hinten 6.4 m, vorn 5.35 m, leicht gewoelbt
    u = (z + 4.4) / 5.8
    return 6.4 - 1.05 * u + .45 * math.sin(u * math.pi)
def roof(bm, x0, x1, key_top=True):
    zs = [-4.4 + i * 5.8 / 10 for i in range(11)]
    top = [(bm.verts.new(G(x0, roof_y(z) + .06, z)), bm.verts.new(G(x1, roof_y(z) + .06, z))) for z in zs]
    bot = [(bm.verts.new(G(x0, roof_y(z) - .06, z)), bm.verts.new(G(x1, roof_y(z) - .06, z))) for z in zs]
    fs = []
    for i in range(10):
        fs.append(bm.faces.new((top[i][0], top[i][1], top[i + 1][1], top[i + 1][0])))
        fs.append(bm.faces.new((bot[i + 1][0], bot[i + 1][1], bot[i][1], bot[i][0])))
        fs.append(bm.faces.new((bot[i][0], bot[i + 1][0], top[i + 1][0], top[i][0])))
        fs.append(bm.faces.new((top[i][1], top[i + 1][1], bot[i + 1][1], bot[i][1])))
    fs.append(bm.faces.new((top[0][0], bot[0][0], bot[0][1], top[0][1])))
    fs.append(bm.faces.new((top[-1][1], bot[-1][1], bot[-1][0], top[-1][0])))
    bmesh.ops.recalc_face_normals(bm, faces=fs)
N_ST = 8
for k in range(N_ST):
    x0 = -W - .3 + k * (2 * W + .6) / N_ST
    x1 = x0 + (2 * W + .6) / N_ST
    p.add('StandAwning' if k % 2 == 0 else 'StandCream', lambda bm, a=x0, b=x1: roof(bm, a, b))
# Bogenkante (Volant) vorn: Halbscheiben abwechselnd rot/weiss
zf = 1.4
for k in range(18):
    x = -W + .5 + k * 1.0
    key = 'StandAwning' if (k // 2) % 2 == 0 else 'StandCream'
    def scallop(bm, x=x):
        vs = [bm.verts.new(G(x - .5 + i / 8, roof_y(zf) - .06 - math.sin(i / 8 * math.pi) * .42, zf + .02)) for i in range(9)]
        c = bm.verts.new(G(x, roof_y(zf) - .06, zf + .02))
        fs = [bm.faces.new((vs[i], vs[i + 1], c)) for i in range(8)]
        for f in fs:
            if f.normal.dot(Vector((0, -1, 0))) < 0:
                f.normal_flip()
    p.add(key, scallop, smooth=False)
# Wimpelkette unter der Dachkante
flag_cols = ['StandFlag', 'StandBlue', 'StandGreen', 'StandAwning']
for k in range(24):
    x = -W + .4 + k * .75
    y = 4.55 - .25 * math.sin((k + .5) / 24 * math.pi * 3) ** 2
    def pennant(bm, x=x, y=y):
        bm.faces.new([bm.verts.new(G(x - .28, y, 1.3)), bm.verts.new(G(x, y - .5, 1.32)), bm.verts.new(G(x + .28, y, 1.3))])
    p.add(flag_cols[k % 4], pennant, smooth=False)
p.add('StandDark', tube([(-W, 4.6, 1.3), (-W / 2, 4.3, 1.3), (0, 4.55, 1.3), (W / 2, 4.3, 1.3), (W, 4.6, 1.3)], .02, 4, caps=False))
# ---------- Fahnenmasten mit Wimpeln und Pilz-Schild auf dem Dach
for x in (-8.4, 0, 8.4):
    y0 = roof_y(-2.4) + .05
    p.add('StandFrame', cyl((x, y0, -2.4), (x, y0 + 2.8, -2.4), .06, .05, 8))
    p.add('StandFrame', sphere((x, y0 + 2.85, -2.4), .1, (1, 1, 1), 8, 5))
    p.add('StandFlag' if x else 'StandBlue', side_prism([(-2.4, y0 + 2.7), (-2.4, y0 + 2.0), (-1.2, y0 + 2.35)], x - .02, x + .02), smooth=False)
ys = roof_y(-.8) + 1.1
p.add('StandBlue', cyl((0, ys, -.8), (0, ys, -.62), 1.05, 1.05, 24))
p.add('StandCream', cyl((0, ys, -.63), (0, ys, -.58), .95, .95, 24))
p.add('StandAwning', sphere((0, ys + .12, -.57), .62, (1, .55, .12), 16, 6))
p.add('StandCream', rbox((0, ys - .32, -.57), (.34, .42, .08), .04, 1))
for dx, dy in ((-.3, .28), (.25, .33), (0, .44)):
    p.add('StandCream', sphere((dx, ys + dy, -.5), .08, (1, 1, .4), 8, 4))
p.add('StandFrame', cyl((0, roof_y(-.8), -.8), (0, ys - 1.0, -.8), .07, .07, 8))
ob = p.finish()
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
ob.data.calc_loop_triangles()
target = ROOT / 'assets' / 'grandstand.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
rep = {'triangles': len(ob.data.loop_triangles), 'bytes': target.stat().st_size}
(ROOT / 'art' / 'r44' / 'grandstand_report.json').write_text(json.dumps(rep), encoding='utf-8')
print('REPORT', json.dumps(rep))
