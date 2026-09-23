"""Mushroom Rally R38 Magnet-Katapult-Bogen: ein Hufeisenmagnet, der die Katapultstrecke ueberspannt.
Eigenes prozedurales Blender-Modell. Blender: X quer, Z hoch, Fahrtrichtung -Y (glTF +Z).
Fuesse (Polschuhe) bei x=+-12.2, Scheitel ~17.7 m. Vier Materialien:
MagnetPaint (rot, im Spiel toenbar), MagnetSteel (Polschuhe/Nieten), MagnetGlow (Lauflicht,
im Spiel je Bogen eingefaerbt), MagnetBase (Sockel).
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r38'
OUT.mkdir(parents=True, exist_ok=True)
TARGET = ROOT / 'assets' / 'magnetarch.glb'
SCENE = 'R38_MagnetArch_Asset'
if bpy.data.scenes.get(SCENE):
    bpy.data.scenes.remove(bpy.data.scenes[SCENE])
old_scene = bpy.context.window.scene
scene = bpy.data.scenes.new(SCENE)
scene.unit_settings.system = 'METRIC'
col = bpy.data.collections.new('R38_MagnetArch_Export')
scene.collection.children.link(col)
bpy.context.window.scene = scene

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
    'paint': material('MagnetPaint', (.78, .09, .08, 1), .38, .12),
    'steel': material('MagnetSteel', (.82, .85, .9, 1), .22, .85),
    'glow': material('MagnetGlow', (.35, .95, 1, 1), .4, 0, (.3, .95, 1, 1), 3.0),
    'base': material('MagnetBase', (.34, .32, .38, 1), .9, .05),
}

def new_obj(name, mat_key):
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    me.materials.append(MATS[mat_key])
    return ob, me

def finish(ob, me, bm, smooth=False):
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    return ob

def sweep_rect(name, mat_key, path, w, d, closed=False, smooth=False):
    """Rechteck-Querschnitt (w radial in der XZ-Ebene, d in Y) entlang eines Pfads in der XZ-Ebene."""
    ob, me = new_obj(name, mat_key)
    bm = bmesh.new()
    rings = []
    n = len(path)
    for i, p in enumerate(path):
        a = path[max(0, i - 1)]
        b = path[min(n - 1, i + 1)]
        t = (Vector(b) - Vector(a)).normalized()
        nrm = Vector((-t.z, 0, t.x))  # senkrecht zum Pfad in XZ
        ring = []
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            q = Vector(p) + nrm * (sx * w / 2) + Vector((0, sy * d / 2, 0))
            ring.append(bm.verts.new(q))
        rings.append(ring)
    for i in range(n - 1):
        r0, r1 = rings[i], rings[i + 1]
        for k in range(4):
            bm.faces.new((r0[k], r0[(k + 1) % 4], r1[(k + 1) % 4], r1[k]))
    if not closed:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(ob, me, bm, smooth)

def box(name, mat_key, center, size, bevel=0.0):
    ob, me = new_obj(name, mat_key)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES')
    return finish(ob, me, bm)

def sphere(name, mat_key, center, r, seg=8, ring=5):
    ob, me = new_obj(name, mat_key)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    return finish(ob, me, bm, True)

X = 12.2      # Beinmitte
Z0 = 2.6      # Oberkante Polschuh
ZC = 4.6      # Mittelpunkt des Halbkreises
W, D = 2.0, 1.7

# Hufeisen: rechtes Bein hoch, Halbkreis, linkes Bein runter
path = [(X, 0, Z0), (X, 0, ZC)]
N = 28
for i in range(1, N):
    a = math.pi * i / N
    path.append((X * math.cos(a), 0, ZC + X * math.sin(a)))
path += [(-X, 0, ZC), (-X, 0, Z0)]
sweep_rect('MA_Body', 'paint', path, W, D)

# Polschuhe (Stahl) mit Fase, Sockel darunter
for sx in (-1, 1):
    box(f'MA_Pole_{sx}', 'steel', (sx * X, 0, Z0 / 2 + .35), (2.7, 2.3, Z0 - .7 + .02), bevel=.12)
    box(f'MA_Base_{sx}', 'base', (sx * X, 0, .2), (3.6, 3.2, .4), bevel=.08)
    # Leuchtband ueber dem Polschuh (Feld-Ring)
    box(f'MA_GlowRing_{sx}', 'glow', (sx * X, 0, Z0 + .22), (W + .34, D + .34, .32))
    # Nieten an den Beinen, vorn und hinten
    for z in (3.4, 4.3):
        for sy in (-1, 1):
            for dx in (-.55, .55):
                sphere(f'MA_Rivet_{sx}_{z}_{sy}_{dx}', 'steel', (sx * X + dx, sy * (D / 2 + .02), z), .13, 6, 4)

# Leuchtband an der Innenkante des Halbkreises (Lauflicht, von unten sichtbar)
inner = []
for i in range(0, N + 1):
    a = math.pi * i / N
    r = X - W / 2 - .09
    inner.append((r * math.cos(a), 0, ZC + r * math.sin(a)))
sweep_rect('MA_GlowInner', 'glow', inner, .22, 1.05)

# Blitz-Emblem am Scheitel, vorn und hinten (leuchtet mit dem Lauflicht)
bolt = [(-.55, 1.35), (.35, 1.35), (-.05, .25), (.7, .25), (-.45, -1.45), (-.05, -.25), (-.75, -.25)]
for sy in (-1, 1):
    ob, me = new_obj(f'MA_Bolt_{sy}', 'glow')
    bm = bmesh.new()
    front = [bm.verts.new((x * 1.2, sy * (D / 2 + .02), ZC + X + z * 1.2 - .1)) for x, z in bolt]
    back = [bm.verts.new((x * 1.2, sy * (D / 2 + .2), ZC + X + z * 1.2 - .1)) for x, z in bolt]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    for k in range(len(bolt)):
        bm.faces.new((front[k], front[(k + 1) % len(bolt)], back[(k + 1) % len(bolt)], back[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    finish(ob, me, bm)

# Stahl-Kappen am Scheitel (Schraubplatten), damit der Bogen nicht wie ein Rohr wirkt
for i in (7, 14, 21):
    a = math.pi * i / N
    c = Vector((X * math.cos(a), 0, ZC + X * math.sin(a)))
    ob = box(f'MA_Clamp_{i}', 'steel', c, (.5, D + .22, W + .22))
    ob.rotation_euler = (0, -(a - math.pi / 2) if False else 0, 0)
    # Querschnitt folgt der Tangente: um Y drehen
    ob.rotation_euler = (0, math.pi / 2 - a, 0)
    ob.location = c
    me = ob.data
    for v in me.vertices:
        v.co -= c
bpy.context.view_layer.update()

# Export: in ALLEN Szenen abwaehlen - sonst exportiert use_selection den Startwuerfel der Nutzer-Szene mit
for sc in bpy.data.scenes:
    for vl in sc.view_layers:
        for ob in sc.objects:
            try:
                ob.select_set(False, view_layer=vl)
            except RuntimeError:
                pass
objs = [o for o in col.objects if o.type == 'MESH']
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
tris = 0
for o in objs:
    dg = bpy.context.evaluated_depsgraph_get()
    m = o.evaluated_get(dg).to_mesh()
    m.calc_loop_triangles()
    tris += len(m.loop_triangles)
    o.evaluated_get(dg).to_mesh_clear()
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_cameras=False, export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'MagnetArch_R38.blend'), copy=True)
report = {'triangles': tris, 'objects': len(objs), 'glb_bytes': TARGET.stat().st_size,
          'materials': sorted({m.name for o in objs for m in o.data.materials})}
(OUT / 'magnetarch_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
