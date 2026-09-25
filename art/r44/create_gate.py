"""Mushroom Rally R44: Sporentor neu (Start-Ziel-Bogen), Anker wie bisher (game.js):
  Schriftzug-Ebenen bei y=8, z=+-0.26 (16 x 1,6 m), Pfeiler bei x=+-9 (Kollider r=1 bei 9,3),
  Startampel-Kasten haengt bei (0, 5.6, -0.75). CapPaint wird je Strecke eingefaerbt.
Aufruf: blender -b --factory-startup --python art/r44/create_gate.py
Aufbau: Pilztuerme auf Steinsockeln (Stiel mit Goldringen und Schachbrettband, grosser getupfter Hut, Wimpel),
gerader Bogenbalken mit Bannerfeld, Schachbrettleisten und Gluehbirnenreihe, Ampelhalterung.
"""
import sys, math, json, pathlib, shutil
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
bak = ROOT / 'art' / 'r44' / 'gate_r43_backup.glb'
if not bak.exists():
    shutil.copy2(ROOT / 'assets' / 'gate.glb', bak)
init('R44_Gate')
use_materials({
    'CapPaint': material('CapPaint', (1, 1, 1, 1), .45, .05),
    'DotPaint': material('DotPaint', (.98, .97, .92, 1), .5),
    'PillarPaint': material('PillarPaint', (.97, .93, .82, 1), .6),
    'StonePaint': material('StonePaint', (.62, .64, .7, 1), .85),
    'Gold': material('Gold', (1, .76, .22, 1), .3, .85),
    'ArchPaint': material('ArchPaint', (.93, .33, .26, 1), .5),
    'BannerPaint': material('BannerPaint', (1, .96, .85, 1), .6),
    'Dark': material('Dark', (.1, .12, .16, 1), .6),
    'FlagPaint': material('FlagPaint', (1, .8, .12, 1), .6),
    'BulbGlow': material('BulbGlow', (1, .92, .6, 1), .3, 0, (1, .85, .45, 1), 2.2),
})
P_ = Part('SporeGate')
for sx in (-1, 1):
    x = sx * 9.0
    P_.add('StonePaint', rbox((x, .45, 0), (2.6, .9, 2.6), .18))
    P_.add('PillarPaint', cyl((x, .85, 0), (x, 6.9, 0), 1.0, .88, 16))
    for y in (1.3, 4.2):
        P_.add('Gold', torus((x, y, 0), .98 - (y - .85) * .02, .09, (0, 1, 0), 16, 4))
    # Schachbrettband unter dem Hut
    for k in range(16):
        a0, a1 = 2 * math.pi * k / 16, 2 * math.pi * (k + 1) / 16
        for row in range(2):
            y0, y1 = 5.6 + row * .4, 6.0 + row * .4
            key = 'Dark' if (k + row) % 2 else 'BannerPaint'
            def quad(bm, a0=a0, a1=a1, y0=y0, y1=y1):
                r = .93
                vs = [bm.verts.new(G(x + math.cos(a) * r, y, math.sin(a) * r)) for a, y in ((a0, y0), (a1, y0), (a1, y1), (a0, y1))]
                f = bm.faces.new(vs)
                c = f.calc_center_median()
                if (c - G(x, (y0 + y1) / 2, 0)).dot(f.normal) < 0:
                    f.normal_flip()
            P_.add(key, quad, smooth=False)
    # Hut: abgeflachte Kugel mit Tupfen, darunter Lamellenring
    def cap(bm, x=x):
        before = set(bm.verts)
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1)
        new = [v for v in bm.verts if v not in before]
        for v in new:
            if v.co.z < -.1:
                v.co.z = -.1
        xf(bm, new, Matrix.Translation(G(x, 7.2, 0)) @ Matrix.Diagonal((1.9, 1.9, 1.45, 1)))
    P_.add('CapPaint', cap)
    P_.add('DotPaint', cyl((x, 6.95, 0), (x, 7.08, 0), 1.75, 1.75, 20))
    for (a, h, r) in ((0, 1.2, .38), (1.3, .8, .3), (2.6, .9, .34), (3.9, .75, .3), (5.1, .95, .32), (.65, .35, .26), (3.2, .3, .26)):
        rr = 1.85 * math.sqrt(max(0, 1 - (h / 1.55) ** 2)) if h < 1.5 else 0
        P_.add('DotPaint', sphere((x + math.cos(a) * rr, 7.2 + h, math.sin(a) * rr), r, (1, .45, 1), 8, 4))
    # Wimpel oben
    P_.add('Gold', cyl((x, 8.6, 0), (x, 10.4, 0), .06, .05, 8))
    P_.add('FlagPaint', side_prism([(0, 10.3), (0, 9.5), (1.3, 9.9)], x - .02, x + .02), smooth=False)
# Bogenbalken: gerade (der Schriftzug im Spiel ist eine ebene Flaeche bei y=8), zwischen den Hueten angesetzt
def beam_y(x):
    return 8.0
def beam(bm, z0, z1, dy0, dy1):
    xs = [-8.2 + i * 16.4 / 20 for i in range(21)]
    rings = []
    for x in xs:
        yc = beam_y(x)
        rings.append([bm.verts.new(G(x, yc + dy, z)) for (dy, z) in ((dy0, z0), (dy0, z1), (dy1, z1), (dy1, z0))])
    fs = []
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            fs.append(bm.faces.new((a[i], a[j], b[j], b[i])))
    fs.append(bm.faces.new(rings[0]))
    fs.append(bm.faces.new(list(reversed(rings[-1]))))
    bmesh.ops.recalc_face_normals(bm, faces=fs)
P_.add('ArchPaint', lambda bm: beam(bm, -.24, .24, -1.05, 1.05), smooth=False)
P_.add('BannerPaint', lambda bm: beam(bm, -.25, .25, -.82, .82), smooth=False)
# Schachbrettleisten unten vorn und hinten
for sz in (-1, 1):
    for k in range(32):
        x0 = -8.0 + k * .5
        key = 'Dark' if k % 2 else 'BannerPaint'
        def sq(bm, x0=x0, sz=sz):
            y0 = beam_y(x0 + .25) - 1.0
            vs = [bm.verts.new(G(x0 + dx, y0 + dy, sz * .255)) for dx, dy in ((0, 0), (.5, 0), (.5, .2), (0, .2))]
            f = bm.faces.new(vs)
            if f.normal.dot(G(0, 0, sz)) < 0:
                f.normal_flip()
        P_.add(key, sq, smooth=False)
# Gluehbirnen auf der Oberkante
for k in range(17):
    x = -8.0 + k * 1.0
    P_.add('BulbGlow', sphere((x, beam_y(x) + 1.15, 0), .16, (1, 1, 1), 6, 4))
# Ampelhalterung
P_.add('Dark', rbox((0, 6.75, -.45), (1.2, .8, .3), .05, 1))
P_.add('Dark', rbox((0, 6.75, -.75), (5.6, .3, .3), .05, 1))
ob = P_.finish()
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
ob.data.calc_loop_triangles()
target = ROOT / 'assets' / 'gate.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
rep = {'triangles': len(ob.data.loop_triangles), 'bytes': target.stat().st_size}
(ROOT / 'art' / 'r44' / 'gate_report.json').write_text(json.dumps(rep), encoding='utf-8')
print('REPORT', json.dumps(rep))
