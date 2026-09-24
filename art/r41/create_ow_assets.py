"""Mushroom Rally R41: Modelle fuer die Open World Pilzland (eigenes prozedurales Blender-Modell).
Aufruf (Kommandozeile): blender -b --factory-startup --python art/r41/create_ow_assets.py
Export: assets/ow.glb mit
  EL_PSwitch     Sockel des P-Schalters (dunkel, abgerundet)
  EL_PSwitchCap  Kappe (blau, weisses P) - Ursprung unten, wird im Spiel beim Ueberfahren gestaucht
  EL_Coin        blaue Muenze mit Pilz-Emblem (steht aufrecht, dreht sich im Spiel um die Hochachse)
Koordinaten wie in create_elements.py: G(x, y, z) nimmt Spielkoordinaten (y hoch, z vorwaerts).
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix, Euler

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r41'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
for ob in list(scene.objects):
    bpy.data.objects.remove(ob)
col = bpy.data.collections.new('R41_OW_Export')
scene.collection.children.link(col)

def G(x, y, z):
    return Vector((x, -z, y))

def material(name, color, rough, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = color
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = color
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = emit
        p.inputs['Emission Strength'].default_value = strength
    return m

M = {
    'base': material('SwitchBase', (.16, .17, .22, 1), .6, .2),
    'rim': material('SwitchRim', (.75, .77, .82, 1), .3, .8),
    'blue': material('SwitchBlue', (.12, .36, .98, 1), .35, .05, (.1, .3, 1, 1), .6),
    'white': material('SwitchWhite', (.98, .98, 1, 1), .4),
    'coin': material('CoinBlue', (.2, .55, 1, 1), .25, .6, (.15, .45, 1, 1), 1.4),
    'coinrim': material('CoinRim', (.85, .93, 1, 1), .2, .8),
    'emblem': material('CoinEmblem', (1, 1, 1, 1), .3, 0, (1, 1, 1, 1), .8),
}
KEYS = list(M)

class Part:
    def __init__(self, name, origin=(0, 0, 0)):
        self.name, self.origin = name, G(*origin)
        self.bm = bmesh.new()
        self.bm.faces.layers.int.new('mat')
    def add(self, key, build):
        before = set(self.bm.faces)
        build(self.bm)
        lay = self.bm.faces.layers.int['mat']
        for f in self.bm.faces:
            if f not in before:
                f[lay] = KEYS.index(key)
    def finish(self, smooth=()):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.transform(self.bm, matrix=Matrix.Translation(-self.origin), verts=self.bm.verts)
        lay = self.bm.faces.layers.int['mat']
        used = sorted({f[lay] for f in self.bm.faces})
        remap = {k: i for i, k in enumerate(used)}
        for k in used:
            me.materials.append(M[KEYS[k]])
        idx = [remap[f[lay]] for f in self.bm.faces]
        sm = [KEYS[f[lay]] in smooth for f in self.bm.faces]
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for p, i, s in zip(me.polygons, idx, sm):
            p.material_index = i
            p.use_smooth = s
        ob = bpy.data.objects.new(self.name, me)
        ob.location = self.origin
        col.objects.link(ob)
        return ob

def xf(bm, verts, M4):
    bmesh.ops.transform(bm, matrix=M4, verts=verts)

def cyl(a, b_, r1, r2, seg=24):
    a, b_ = G(*a), G(*b_)
    def b(bm):
        d = b_ - a
        g = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        xf(bm, g['verts'], Matrix.Translation((a + b_) / 2) @ q.to_matrix().to_4x4())
    return b

def box(center, size, rot_z=0.0):
    def b(bm):
        g = bmesh.ops.create_cube(bm, size=1)
        R = Matrix.Rotation(rot_z, 4, 'Y')   # Drehung um die Spiel-Laengsachse (Blender -Y)
        xf(bm, g['verts'], Matrix.Translation(G(*center)) @ R @ Matrix.Diagonal((size[0], size[2], size[1], 1)))
    return b

def sphere(center, r, scale=(1, 1, 1), seg=16, ring=10):
    def b(bm):
        g = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
        xf(bm, g['verts'], Matrix.Translation(G(*center)) @ Matrix.Diagonal((scale[0] * r, scale[2] * r, scale[1] * r, 1)))
    return b

# ---------------- P-Schalter: Sockel (dunkel mit Metallring) und Kappe (blau, weisses P obenauf)
base = Part('EL_PSwitch')
base.add('base', cyl((0, 0, 0), (0, .45, 0), 1.55, 1.45, 32))
base.add('rim', cyl((0, .42, 0), (0, .52, 0), 1.5, 1.5, 32))
base.finish()
PY = 1.46
# Bogen des P separat bauen (flach liegend) und in die Kappe mergen
arcpart = Part('EL_PArc', origin=(0, .5, 0))
def flat_arc(bm):
    rings = []
    seg, rseg, R, r = 14, 8, .3, .09
    for i in range(seg + 1):
        a = -math.pi / 2 + math.pi * i / seg
        cx, cz = -.18 + math.cos(a) * R, .3 + math.sin(a) * R
        ring = []
        for j in range(rseg):
            t = 2 * math.pi * j / rseg
            x = cx + math.cos(a) * r * math.cos(t)
            z = cz + math.sin(a) * r * math.cos(t)
            y = PY + r * math.sin(t)
            ring.append(bm.verts.new(G(x, y, z)))
        rings.append(ring)
    for i in range(seg):
        for j in range(rseg):
            a_, b2 = rings[i], rings[i + 1]
            bm.faces.new((a_[j], b2[j], b2[(j + 1) % rseg], a_[(j + 1) % rseg]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
arcpart.add('white', flat_arc)
arcob = arcpart.finish()
# Kappe: blauer Knopf mit Kuppel, Stamm des P obenauf; der Bogen wird danach eingefuegt
cap = Part('EL_PSwitchCap', origin=(0, .5, 0))
cap.add('blue', cyl((0, .5, 0), (0, 1.25, 0), 1.25, 1.12, 32))
cap.add('blue', sphere((0, 1.25, 0), 1.12, (1, .18, 1), 32, 10))
cap.add('white', box((-.28, PY, 0), (.2, .1, 1.2)))
capob = cap.finish(smooth=('blue',))
# Bogen in die Kappe einfuegen
for o in scene.objects:
    o.select_set(False)
arcob.select_set(True); capob.select_set(True)
bpy.context.view_layer.objects.active = capob
bpy.ops.object.join()
capob = bpy.context.view_layer.objects.active
capob.name = 'EL_PSwitchCap'

# ---------------- Muenze: steht aufrecht (Achse Spiel-z), Rand, Pilz-Emblem beidseitig
coin = Part('EL_Coin', origin=(0, 0, 0))
coin.add('coin', cyl((0, 0, -.09), (0, 0, .09), .72, .72, 32))
coin.add('coinrim', cyl((0, 0, -.12), (0, 0, -.07), .78, .78, 32))
coin.add('coinrim', cyl((0, 0, .07), (0, 0, .12), .78, .78, 32))
for s in (-1, 1):
    coin.add('emblem', sphere((0, .08, .1 * s), .34, (1, .62, .35), 16, 8))      # Pilzhut
    coin.add('emblem', box((0, -.2, .1 * s), (.2, .3, .08)))                       # Stiel
coin.finish(smooth=('coin', 'emblem'))

objs = [o for o in col.objects]
for o in scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
tris = 0
for o in objs:
    o.data.calc_loop_triangles()
    tris += len(o.data.loop_triangles)
target = ROOT / 'assets' / 'ow.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_cameras=False, export_lights=False)
report = {'triangles': tris, 'bytes': target.stat().st_size, 'objects': sorted(o.name for o in objs)}
(OUT / 'ow_assets_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('REPORT', json.dumps(report))
