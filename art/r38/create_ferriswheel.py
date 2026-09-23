"""Mushroom Rally R38 Riesenrad fuer die Magnet-Kirmes. Eigenes prozedurales Blender-Modell.
Drei Teile in EINER GLB, getrennt ueber die Materialnamen (das Spiel fasst nach Material zusammen):
  statisch:  FerrisSteel, FerrisBase, FerrisBooth (werden gebacken)
  Rad:       WheelPaint, WheelLights (dreht im Spiel um die Nabe)
  Gondel:    GondolaPaint (Pilzhut, je Gondel getoent), GondolaTrim - Aufhaengepunkt im Ursprung
Blender: Z hoch, Radebene XZ, Drehachse Y (glTF -Z). Nabe bei (0,0,HUB).
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r38'
TARGET = ROOT / 'assets' / 'ferriswheel.glb'
SCENE = 'R38_FerrisWheel_Asset'
if bpy.data.scenes.get(SCENE):
    bpy.data.scenes.remove(bpy.data.scenes[SCENE])
scene = bpy.data.scenes.new(SCENE)
col = bpy.data.collections.new('R38_FerrisWheel_Export')
scene.collection.children.link(col)
bpy.context.window.scene = scene

HUB, R, HALF = 24.0, 20.0, 1.7      # Nabenhoehe, Radius, halber Abstand der beiden Radkraenze
NG = 12                              # Gondeln

def material(name, color, rough, metal, emit=None, strength=0.0):
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

MATS = {
    'steel': material('FerrisSteel', (.93, .91, .88, 1), .4, .4),
    'base': material('FerrisBase', (.45, .42, .5, 1), .9, 0),
    'booth': material('FerrisBooth', (.95, .75, .25, 1), .6, 0),
    'boothroof': material('FerrisBoothRoof', (.9, .22, .24, 1), .55, 0),
    'wheel': material('WheelPaint', (.96, .3, .42, 1), .45, .25),
    'lights': material('WheelLights', (1, .93, .6, 1), .3, 0, (1, .85, .45, 1), 4.0),
    'gondola': material('GondolaPaint', (.95, .2, .2, 1), .5, .05),
    'trim': material('GondolaTrim', (.98, .95, .88, 1), .5, .1),
}
BM = {k: bmesh.new() for k in MATS}

def xform(bm, geom_verts, M):
    bmesh.ops.transform(bm, matrix=M, verts=geom_verts)

def cyl(key, a, b, r, seg=8):
    a, b = Vector(a), Vector(b)
    d = b - a
    g = bmesh.ops.create_cone(BM[key], cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    xform(BM[key], g['verts'], Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())

def torus_y(key, center, major, minor, nmaj=56, nmin=8):
    """Ring in der XZ-Ebene um center (Achse Y)."""
    bm = BM[key]
    cx, cy, cz = center
    rings = []
    for i in range(nmaj):
        a = i * math.tau / nmaj
        ring = []
        for j in range(nmin):
            b = j * math.tau / nmin
            rr = major + minor * math.cos(b)
            ring.append(bm.verts.new((cx + rr * math.cos(a), cy + minor * math.sin(b), cz + rr * math.sin(a))))
        rings.append(ring)
    for i in range(nmaj):
        r0, r1 = rings[i], rings[(i + 1) % nmaj]
        for j in range(nmin):
            bm.faces.new((r0[j], r1[j], r1[(j + 1) % nmin], r0[(j + 1) % nmin]))

def box(key, center, size, bevel=0.0):
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    bmesh.ops.scale(tmp, vec=Vector(size), verts=tmp.verts)
    if bevel:
        bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=bevel, segments=2, affect='EDGES')
    bmesh.ops.translate(tmp, vec=Vector(center), verts=tmp.verts)
    me = bpy.data.meshes.new('tmp')
    tmp.to_mesh(me)
    tmp.free()
    BM[key].from_mesh(me)
    bpy.data.meshes.remove(me)

def ico(key, center, r, sub=1):
    g = bmesh.ops.create_icosphere(BM[key], subdivisions=sub, radius=r)
    bmesh.ops.translate(BM[key], vec=Vector(center), verts=g['verts'])

def dome(key, center, r, h, seg=12):
    """Pilzhut: Halbkugel, flachgedrueckt."""
    g = bmesh.ops.create_uvsphere(BM[key], u_segments=seg, v_segments=6, radius=1)
    vs = [v for v in g['verts']]
    for v in vs:
        if v.co.z < 0:
            v.co.z = 0
    bmesh.ops.scale(BM[key], vec=(r, r, h), verts=vs)
    bmesh.ops.translate(BM[key], vec=Vector(center), verts=vs)

# ---------------- Rad (dreht): zwei Kraenze, Speichen, Querrohre, Nabe, Lichter
for sy in (-HALF, HALF):
    torus_y('wheel', (0, sy, HUB), R, .32)
    torus_y('wheel', (0, sy, HUB), R * .55, .2, 40, 6)
    for i in range(16):
        a = i * math.tau / 16
        cyl('wheel', (0, sy, HUB), (R * math.cos(a), sy, HUB + R * math.sin(a)), .13, 6)
for i in range(16):
    a = i * math.tau / 16
    p = (R * math.cos(a), 0, HUB + R * math.sin(a))
    cyl('wheel', (p[0], -HALF, p[2]), (p[0], HALF, p[2]), .16, 6)
cyl('wheel', (0, -HALF - .9, HUB), (0, HALF + .9, HUB), 1.2, 16)
for sy in (-HALF - .35, HALF + .35):
    for i in range(48):
        a = (i + .5) * math.tau / 48
        ico('lights', (R * math.cos(a), sy, HUB + R * math.sin(a)), .28, 0)
    for i in range(16):
        a = i * math.tau / 16
        for f in (.33, .66):
            ico('lights', (R * f * math.cos(a), sy, HUB + R * f * math.sin(a)), .22, 0)

# ---------------- Gestell (statisch): zwei A-Boecke, Querstreben, Plattform, Kassenhaeuschen
for sy in (-HALF - 1.4, HALF + 1.4):
    for sx in (-1, 1):
        cyl('steel', (sx * 10.5, sy * 1.6, .6), (0, sy, HUB), .42, 10)
    cyl('steel', (-6.2, sy * 1.25, HUB * .4), (6.2, sy * 1.25, HUB * .4), .22, 8)
    cyl('steel', (-3.4, sy * 1.12, HUB * .68), (3.4, sy * 1.12, HUB * .68), .2, 8)
cyl('steel', (0, -HALF - 1.6, HUB), (0, HALF + 1.6, HUB), .55, 12)
box('base', (0, 0, .3), (26, 11, .6), .15)
box('base', (0, -6.4, .15), (6, 2.2, .3), .08)          # Treppe
box('booth', (-9.5, -3.4, 1.9), (3.2, 2.4, 2.6), .12)   # Kassenhaeuschen
dome('boothroof', (-9.5, -3.4, 3.2), 2.2, 1.1)          # Pilzhut-Dach (statisch, eigenes Material)

# ---------------- Gondel (Aufhaengepunkt im Ursprung, haengt nach unten)
cyl('trim', (0, -1.05, 0), (0, 1.05, 0), .12, 8)          # Achse
for sy in (-.9, .9):
    cyl('trim', (0, sy, 0), (0, sy, -1.4), .07, 6)        # Haenger
box('trim', (0, 0, -2.9), (2.3, 1.9, .25), .06)           # Boden
box('gondola', (0, 0, -2.2), (2.3, 1.9, 1.2), .14)        # Wanne
dome('gondola', (0, 0, -1.42), 1.55, .75)                 # Pilzhut-Dach
for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
    cyl('trim', (sx * .95, sy * .75, -1.6), (sx * .95, sy * .75, -2.2), .05, 6)
for a in range(5):                                        # Sprenkel auf dem Hut
    t = a * math.tau / 5
    ico('trim', (math.cos(t) * .9, math.sin(t) * .8, -1.05), .16, 1)

objs = []
for key, bm in BM.items():
    me = bpy.data.meshes.new('FW_' + key)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MATS[key])
    for p in me.polygons:
        p.use_smooth = key in ('wheel', 'steel', 'gondola', 'lights', 'trim')
    ob = bpy.data.objects.new('FW_' + key, me)
    col.objects.link(ob)
    objs.append(ob)

for sc in bpy.data.scenes:
    for vl in sc.view_layers:
        for ob in sc.objects:
            try:
                ob.select_set(False, view_layer=vl)
            except RuntimeError:
                pass
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_cameras=False, export_lights=False)
report = {'triangles': tris, 'glb_bytes': TARGET.stat().st_size, 'hub': HUB, 'radius': R, 'gondolas': NG,
          'materials': [m.name for m in MATS.values()]}
(OUT / 'ferriswheel_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
