"""Mushroom Rally R44: Sporenmuenze fuer die Rennen (ersetzt die gelben Ikosaeder).
Aufruf: blender -b --factory-startup --python art/r44/create_coin.py
Export assets/coin.glb mit einem Objekt RC_Coin (ein Material 'CoinGold', damit alle Muenzen einer Strecke
in einem Instanz-Draw-Call bleiben): dicke Scheibe mit erhabenem Rand, gepraegtem Pilz (Hut mit Tupfen, Stiel)
auf beiden Seiten und geriffelter Kante. Steht aufrecht (Achse Spiel-z), dreht sich im Spiel um die Hochachse.
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def G(x, y, z):
    return Vector((x, -z, y))

m = bpy.data.materials.new('CoinGold')
m.use_nodes = True
p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
p.inputs['Base Color'].default_value = (1.0, .66, .06, 1)
p.inputs['Metallic'].default_value = .35
p.inputs['Roughness'].default_value = .32
p.inputs['Emission Color'].default_value = (1.0, .5, .02, 1)
p.inputs['Emission Strength'].default_value = .38

bm = bmesh.new()
def xf(verts, M4):
    bmesh.ops.transform(bm, matrix=M4, verts=verts)
def cyl_z(z0, z1, r0, r1, seg):
    """Zylinder entlang Spiel-z (Muenzachse)."""
    g = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r0, radius2=r1, depth=abs(z1 - z0))
    # Blender-Kegel liegt entlang Blender-z = Spiel-y -> um Blender-x drehen, damit er entlang Spiel-z (Blender -y) liegt
    xf(g['verts'], Matrix.Translation(G(0, 0, (z0 + z1) / 2)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    return g
R, T = .62, .07
cyl_z(-T, T, R * .94, R * .94, 20)                   # Kern
for s in (-1, 1):
    cyl_z(s * T, s * (T + .045), R, R * .97, 20)        # erhabener Rand
    cyl_z(s * T, s * (T + .012), R * .8, R * .8, 20)    # Spiegelflaeche leicht erhaben
# geriffelte Kante: 24 flache Rippen
for k in range(0):
    a = 2 * math.pi * k / 24
    g = bmesh.ops.create_cube(bm, size=1)
    xf(g['verts'], Matrix.Translation(G(math.cos(a) * R * .97, math.sin(a) * R * .97, 0)) @ Matrix.Rotation(a, 4, 'Y') @ Matrix.Diagonal((.05, T * 1.9, .05, 1)))
# gepraegter Pilz beidseitig: Hut (abgeflachte Halbkugel), Stiel, drei Tupfen als Mulden-Buckel
for s in (-1, 1):
    zc = s * (T + .012)
    g = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=4, radius=1)
    for v in g['verts']:
        if v.co.z < 0:
            v.co.z = 0
    # Halbkugel: Blender-z nach aussen (Muenzflaeche) drehen
    xf(g['verts'], Matrix.Translation(G(0, .07, zc)) @ Matrix.Rotation(s * math.pi / 2, 4, 'X') @ Matrix.Diagonal((.34, .2, .06, 1)))
    g = bmesh.ops.create_cube(bm, size=1)
    xf(g['verts'], Matrix.Translation(G(0, -.17, zc + s * .02)) @ Matrix.Diagonal((.16, .045, .24, 1)))
    for dx, dy in ((-.16, .12), (.14, .15), (0, .2)):
        g = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=3, radius=1)
        xf(g['verts'], Matrix.Translation(G(dx, dy, zc + s * .055)) @ Matrix.Diagonal((.045, .045, .035, 1)))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('RC_Coin')
bm.to_mesh(me)
bm.free()
me.materials.append(m)
for poly in me.polygons:
    poly.use_smooth = False
ob = bpy.data.objects.new('RC_Coin', me)
scene.collection.objects.link(ob)
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
me.calc_loop_triangles()
target = ROOT / 'assets' / 'coin.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
print('REPORT', json.dumps({'triangles': len(me.loop_triangles), 'bytes': target.stat().st_size}))
