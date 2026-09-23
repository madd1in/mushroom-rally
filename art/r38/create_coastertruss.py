"""Mushroom Rally R38 Achterbahn-Fachwerkstuetze: ein 4-m-Segment (wird im Spiel gestapelt, das
oberste gestaucht) plus Betonfuss mit Pilzkappen-Bolzen. Blender: Z hoch, Ursprung am Fuss.
Materialien: TrussPaint (Segment, im Spiel toenbar) und FootConcrete/FootCap (Fuss, werden gebacken).
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r38'
TARGET = ROOT / 'assets' / 'coastertruss.glb'
SCENE = 'R38_CoasterTruss_Asset'
if bpy.data.scenes.get(SCENE):
    bpy.data.scenes.remove(bpy.data.scenes[SCENE])
scene = bpy.data.scenes.new(SCENE)
col = bpy.data.collections.new('R38_CoasterTruss_Export')
scene.collection.children.link(col)
bpy.context.window.scene = scene

def material(name, color, rough, metal):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = color
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = color
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

MATS = {'truss': material('TrussPaint', (.93, .9, .84, 1), .45, .35),
        'foot': material('FootConcrete', (.52, .5, .5, 1), .95, 0),
        'cap': material('FootCap', (.86, .18, .16, 1), .5, .05)}

bm_by = {k: bmesh.new() for k in MATS}

def cyl(key, a, b, r, seg=6):
    a, b = Vector(a), Vector(b)
    d = b - a
    L = d.length
    bm = bm_by[key]
    geom = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=L)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=geom['verts'])

def cube(key, center, size, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES')
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    me = bpy.data.meshes.new('tmp')
    bm.to_mesh(me)
    bm.free()
    bm_by[key].from_mesh(me)
    bpy.data.meshes.remove(me)

H, S = 4.0, .62          # Segmenthoehe, halbe Kantenlaenge
corners = [(-S, -S), (S, -S), (S, S), (-S, S)]
# vier Eckpfosten
for x, y in corners:
    cyl('truss', (x, y, 0), (x, y, H), .1, 8)
# Ringriegel unten (oben liefert das naechste Segment bzw. der Quertraeger)
for i in range(4):
    (x0, y0), (x1, y1) = corners[i], corners[(i + 1) % 4]
    cyl('truss', (x0, y0, .04), (x1, y1, .04), .06, 6)
    cyl('truss', (x0, y0, H / 2), (x1, y1, H / 2), .05, 6)
    # Kreuzverband je Seite (zwei Diagonalen pro Halbfeld)
    for z0, z1 in ((0, H / 2), (H / 2, H)):
        cyl('truss', (x0, y0, z0), (x1, y1, z1), .045, 5)
        cyl('truss', (x1, y1, z0), (x0, y0, z1), .045, 5)

# Fuss: Betonsockel mit Fase und vier rote Pilzkappen-Bolzen
cube('foot', (0, 0, .28), (2.0, 2.0, .56), .1)
for x, y in corners:
    bm = bm_by['cap']
    g = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=4, radius=.2)
    bmesh.ops.scale(bm, vec=(1, 1, .6), verts=g['verts'])
    bmesh.ops.translate(bm, vec=(x * 1.25, y * 1.25, .58), verts=g['verts'])

objs = []
for key, bm in bm_by.items():
    me = bpy.data.meshes.new('CT_' + key)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(MATS[key])
    for p in me.polygons:
        p.use_smooth = key != 'foot'
    ob = bpy.data.objects.new('CT_' + key, me)
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
tris = sum(len(o.data.polygons) and sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_cameras=False, export_lights=False)
report = {'triangles': tris, 'glb_bytes': TARGET.stat().st_size, 'materials': [m.name for m in MATS.values()]}
(OUT / 'coastertruss_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
