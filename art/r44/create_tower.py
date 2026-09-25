"""Mushroom Rally R44: Burgturm der Lava-Feste (eigener Entwurf), Export assets/tower.glb:
  LT_Tower   runder Bergfried aus Basalt (r 13 m, 30 m) mit gluehenden Lava-Rissen, Zinnenkranz, Wehrgang-Konsolen,
             leuchtenden Fenstern, Flammen-Bannern und spitzem rotem Dach mit Stachelspitze
  LT_Gantry  Kanonen-Portal ueber der Fahrbahn: zwei Steinpfeiler, Querbalken mit Zinnen (Kanone kommt aus hazards.glb)
Ursprung jeweils Boden Mitte; das Portal ist 19 m breit (Strasse 15,2 m + Rand).
"""
import sys, math, json, pathlib
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
init('R44_Tower')
use_materials({
    'Basalt': material('Basalt', (.22, .17, .18, 1), .85),
    'BasaltLight': material('BasaltLight', (.36, .28, .28, 1), .85),
    'Roof': material('RoofRed', (.62, .1, .08, 1), .6),
    'Lava': material('LavaGlow', (1, .45, .06, 1), .4, 0, (1, .38, .04, 1), 4.0),
    'Window': material('WindowFire', (1, .6, .2, 1), .4, 0, (1, .5, .15, 1), 2.6),
    'Banner': material('BannerRed', (.75, .08, .1, 1), .7),
    'Iron': material('Iron', (.14, .14, .16, 1), .45, .7),
    'Gold': material('Gold', (1, .74, .2, 1), .3, .85),
})
R, H = 13.0, 30.0
t = Part('LT_Tower')
t.add('Basalt', cyl((0, 0, 0), (0, H, 0), R * 1.06, R, 28))
for y in (7, 15, 23):
    t.add('BasaltLight', torus((0, y, 0), R * (1.03 - y / H * .06), .35, (0, 1, 0), 28, 5))
# Lava-Risse: schmale gluehende Zickzack-Baender an der Wand
for k in range(6):
    a0 = k * math.pi / 3 + .3
    pts = []
    for i in range(7):
        a = a0 + math.sin(i * 1.7) * .05
        y = 1 + i * 3.6
        pts.append((math.cos(a) * (R * (1.05 - y / H * .06) + .05), y, math.sin(a) * (R * (1.05 - y / H * .06) + .05)))
    t.add('Lava', tube(pts, .18, 5))
# Zinnenkranz und Wehrgang
t.add('BasaltLight', cyl((0, H, 0), (0, H + 1.4, 0), R + 1.6, R + 1.6, 28))
for k in range(20):
    a = k * 2 * math.pi / 20
    c, s_ = math.cos(a), math.sin(a)
    t.add('Basalt', cyl((c * (R + 1.2), H + 1.4, s_ * (R + 1.2)), (c * (R + 1.2), H + 3.2, s_ * (R + 1.2)), 1.0, 1.0, 4), smooth=False)
    t.add('Iron', cyl((c * (R + .2), H - .4, s_ * (R + .2)), (c * (R + 1.8), H + .2, s_ * (R + 1.8)), .25, .25, 5), smooth=False)
# Fenster (leuchtend) und Banner
for k in range(8):
    a = k * math.pi / 4
    for y in (10, 19):
        c, s_ = math.cos(a), math.sin(a)
        t.add('Window', rbox((c * (R + .05), y, s_ * (R + .05)), (1.4, 2.6, 1.4), .2, 1))
for k in range(4):
    a = k * math.pi / 2 + .4
    c, s_ = math.cos(a), math.sin(a)
    t.add('Banner', rbox((c * (R + .35), H - 6, s_ * (R + .35)), (3.0, 9.0, .15), 0, 1, rot=(0, -a - math.pi / 2, 0)), smooth=False)
    t.add('Lava', sphere((c * (R + .55), H - 5, s_ * (R + .55)), .7, (1, 1.2, .35), 10, 6))
# spitzes Dach mit Stachelspitze
t.add('Roof', cyl((0, H + 1.3, 0), (0, H + 18, 0), R + .6, 0.0, 28))
t.add('Iron', cyl((0, H + 17, 0), (0, H + 22, 0), .5, 0.0, 8))
for k in range(8):
    a = k * math.pi / 4
    c, s_ = math.cos(a), math.sin(a)
    t.add('Iron', cyl((c * (R - 2), H + 6, s_ * (R - 2)), (c * (R + 1.5), H + 6.8, s_ * (R + 1.5)), .5, 0.0, 6), smooth=False)
t.finish()

g = Part('LT_Gantry')
for sx in (-1, 1):
    g.add('Basalt', rbox((sx * 9.6, 5.0, 0), (2.2, 10.0, 2.6), .2))
    g.add('Lava', rbox((sx * 9.6, 1.0, 1.32), (1.4, .3, .05), .02, 1))
g.add('BasaltLight', rbox((0, 10.6, 0), (22, 1.6, 3.0), .2))
for k in range(9):
    g.add('Basalt', rbox((-10 + k * 2.5, 11.9, 0), (1.3, 1.1, 3.0), .1, 1))
g.add('Lava', rbox((0, 9.75, 1.52), (20, .18, .05), .02, 1))
g.finish()

objs = [o for o in blib.EXPORT.objects]
for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
rep = {}
for o in objs:
    o.data.calc_loop_triangles()
    rep[o.name] = len(o.data.loop_triangles)
target = ROOT / 'assets' / 'tower.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
rep['bytes'] = target.stat().st_size
print('REPORT', json.dumps(rep))
