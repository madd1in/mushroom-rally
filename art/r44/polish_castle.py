"""Mushroom Rally R44: Lava-Feste aufpolieren - Anbauten auf das bestehende castle.glb (Form und Kollider bleiben).
Aufruf: blender -b --factory-startup --python art/r44/polish_castle.py
Liest die Sicherung art/r44/castle_r43_backup.glb (wiederholbar) und fuegt hinzu:
  - Feuerkoenig-Relief ueber beiden Toroeffnungen: Steinschild, gehoernter Kopf, gluehende Augen und Maul
  - Fallgitter-Zaehne aus Eisen an der Oberkante beider Durchfahrten
  - Fackeln neben den Toren und an den Fluegeln (Eisenhalter, gluehende Flammen)
  - gluehendes Lavaband am Fuss von Halle und Fluegeln (ausserhalb der Durchfahrt)
  - Stachelkraenze um die beiden grossen Tuerme und goldene Spitzen auf den Kegeldaechern
"""
import sys, math, json, pathlib, shutil
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
import blib
from blib import *

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
bak = ROOT / 'art' / 'r44' / 'castle_r43_backup.glb'
if not bak.exists():
    shutil.copy2(ROOT / 'assets' / 'castle.glb', bak)
init('R44_Castle')
bpy.ops.import_scene.gltf(filepath=str(bak))
orig = [o for o in bpy.data.objects if o.type == 'MESH']
use_materials({
    'StoneDark': material('CastleStoneDark', (.16, .13, .14, 1), .85),
    'Stone': material('CastleRelief', (.42, .38, .4, 1), .8),
    'Iron': material('CastleIron', (.12, .12, .14, 1), .45, .7),
    'Bone': material('CastleBone', (.95, .88, .7, 1), .6),
    'Gold': material('CastleGold', (1, .74, .2, 1), .3, .85),
    'LavaGlow': material('LavaGlow', (1, .45, .06, 1), .4, 0, (1, .38, .04, 1), 4.0),
})
def cone(base, tip, r, seg=6):
    return cyl(base, tip, r, 0.0, seg)
add = Part('C_Polish')
HALL_Z, GATE_TOP = 10.25, 10.5
for sz in (-1, 1):
    zf = sz * HALL_Z
    out = sz * .1
    # Relief-Schild und Kopf
    add.add('StoneDark', rbox((0, 16.6, zf + out * 1.5), (8.4, 7.6, .5), .35))
    hz = zf + sz * .9
    add.add('Stone', sphere((0, 17.2, hz), 2.2, (1.1, .95, .55), 20, 12))
    add.add('Stone', rbox((0, 16.1, hz + sz * .85), (2.6, 1.5, 1.4), .45))
    add.add('LavaGlow', rbox((0, 15.25, hz + sz * .95), (1.9, .45, 1.1), .12))
    for x in (-.85, .85):
        add.add('LavaGlow', sphere((x, 17.75, hz + sz * 1.02), .34, (1, .7, .5), 10, 6))
        add.add('StoneDark', rbox((x, 18.3, hz + sz * 1.1), (1.3, .35, .5), .08, 1, rot=(0, 0, (-.32 if x < 0 else .32))))
        add.add('Bone', cone((x * .95, 15.55, hz + sz * 1.45), (x * .95, 14.95, hz + sz * 1.45), .12, 6), smooth=False)
    for sx in (-1, 1):
        add.add('Bone', tube([(sx * 2.0, 18.4, hz), (sx * 2.9, 19.3, hz + sz * .1), (sx * 3.3, 20.5, hz)], .38, 8))
        add.add('Bone', cone((sx * 3.3, 20.4, hz), (sx * 3.35, 21.4, hz + sz * .15), .36, 8))
    # Fallgitter-Zaehne
    for k in range(17):
        x = -8 + k
        add.add('Iron', cone((x, GATE_TOP + .05, zf + out), (x, GATE_TOP - 1.1 - (k % 2) * .35, zf + out), .2, 4), smooth=False)
    add.add('Iron', rbox((0, GATE_TOP + .25, zf + out), (17.4, .5, .35), .05, 1))
    # Fackeln neben dem Tor
    for x in (-10.4, 10.4):
        add.add('Iron', rbox((x, 6.2, zf + sz * .45), (.25, .25, .9), .04, 1))
        add.add('Iron', cyl((x, 6.3, zf + sz * .95), (x, 7.0, zf + sz * .95), .22, .42, 10))
        add.add('LavaGlow', cone((x, 6.95, zf + sz * .95), (x, 8.4, zf + sz * .95), .36, 8))
    # Lavaband am Hallenfuss, nur ausserhalb der Durchfahrt (|x| > 9.6)
    for sx in (-1, 1):
        add.add('LavaGlow', rbox((sx * 11.1, .18, zf + sz * .25), (3.0, .36, .45), .08, 1))
# Fluegel (x 36..52, Mauern bei z +-4.9): Lavaband und Fackeln
for sx in (-1, 1):
    for sz in (-1, 1):
        add.add('LavaGlow', rbox((sx * 44, .18, sz * 5.15), (16.5, .36, .4), .08, 1))
        for x in (38, 44, 50):
            add.add('Iron', cyl((sx * x, 7.3, sz * 5.4), (sx * x, 8.0, sz * 5.4), .2, .38, 8))
            add.add('LavaGlow', cone((sx * x, 7.95, sz * 5.4), (sx * x, 9.2, sz * 5.4), .32, 8))
# Tuerme: Kegeldach-Spitzen finden, Goldspitze und Stachelkranz am Dachfuss
roof = next(o for o in orig if any(m and m.name.startswith('RoofPaint') for m in o.data.materials))
rv = [roof.matrix_world @ v.co for v in roof.data.vertices]
for side in (-1, 1):
    vs = [v for v in rv if (v.x < 0) == (side < 0)]
    if not vs:
        continue
    apex = max(vs, key=lambda v: v.z)
    base = [v for v in vs if v.z < min(w.z for w in vs) + .3]
    cx = sum(v.x for v in base) / len(base); cy = sum(v.y for v in base) / len(base); bz = base[0].z
    br = max(math.hypot(v.x - cx, v.y - cy) for v in base)
    gx, gz = cx, -cy                         # Blender -> Spiel
    add.add('Gold', sphere((apex.x, apex.z + .5, -apex.y), .55, (1, 1, 1), 12, 8))
    add.add('Gold', cone((apex.x, apex.z + .9, -apex.y), (apex.x, apex.z + 2.6, -apex.y), .22, 8))
    for k in range(12):
        a = 2 * math.pi * k / 12
        c, s_ = math.cos(a), math.sin(a)
        add.add('Iron', cone((gx + c * br * .92, bz + .2, gz + s_ * br * .92), (gx + c * (br + 1.6), bz + 1.4, gz + s_ * (br + 1.6)), .42, 5), smooth=False)
pol = add.finish()
objs = orig + [pol]
for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = pol
target = ROOT / 'assets' / 'castle.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
pol.data.calc_loop_triangles()
rep = {'added_triangles': len(pol.data.loop_triangles), 'bytes': target.stat().st_size}
(ROOT / 'art' / 'r44' / 'castle_polish_report.json').write_text(json.dumps(rep), encoding='utf-8')
print('REPORT', json.dumps(rep))
