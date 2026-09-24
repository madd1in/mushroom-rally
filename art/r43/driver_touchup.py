"""Mushroom Rally R43: Fahrer-Feinschliff auf den bestehenden Modellen (Struktur und Namen bleiben).
Aufruf: blender -b --factory-startup --python art/r43/driver_touchup.py
  Pilzi (driver.glb):       offener "O"-Mund -> Laecheln (gebogener Wulst auf der Kopfoberflaeche) mit Zungenspitze
  Volt (driver_robot.glb):  Kastenteile mit Fase und gehaerteten Normalen, LED-Augen und LED-Pixel-Laecheln (leuchtend)
Backups der Vorversion in art/r43/*_r42_backup.glb.
"""
import bpy, bmesh, math, pathlib, shutil, json
from mathutils import Vector, Matrix

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r43'
report = {}

def backup(fn):
    bak = OUT / fn.replace('.glb', '_r42_backup.glb')
    if not bak.exists():
        shutil.copy2(ROOT / 'assets' / fn, bak)
    return bak

def load(fn):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # immer von der Sicherung aus arbeiten: Skript ist wiederholbar
    bpy.ops.import_scene.gltf(filepath=str(backup(fn)))
    return {o.name: o for o in bpy.data.objects if o.type == 'MESH'}

def export(fn):
    for o in bpy.data.objects:
        o.select_set(o.type == 'MESH')
    bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
    target = ROOT / 'assets' / fn
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_cameras=False, export_lights=False)
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.data.objects:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            tris += len(me.loop_triangles)
    report[fn] = {'triangles': tris, 'bytes': target.stat().st_size}

def world_bounds(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector([min(v[i] for v in bb) for i in range(3)]), Vector([max(v[i] for v in bb) for i in range(3)])

def new_mesh_obj(name, build, mat, smooth=True):
    bm = bmesh.new()
    build(bm)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob

def emissive(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Emission Color'].default_value = (*rgb, 1)
    p.inputs['Emission Strength'].default_value = strength
    p.inputs['Roughness'].default_value = .25
    m.diffuse_color = (*rgb, 1)
    return m

# ------------------------------------------------------------------ Pilzi: Laecheln
O = load('driver.glb')
head = O['D_Head']
hmin, hmax = world_bounds(head)
hc, hr = (hmin + hmax) / 2, (hmax - hmin) / 2
mouth = O['D_Mouth']
mmin, mmax = world_bounds(mouth)
dark = mouth.data.materials[0]
mc = (mmin + mmax) / 2

def on_head(x, z, lift):
    """Punkt auf der Vorderseite des Kopf-Ellipsoids (Blender: -y ist vorne)."""
    u = ((x - hc.x) / hr.x) ** 2 + ((z - hc.z) / hr.z) ** 2
    y = hc.y - hr.y * math.sqrt(max(0.0, 1 - u))
    n = Vector(((x - hc.x) / hr.x ** 2, (y - hc.y) / hr.y ** 2, (z - hc.z) / hr.z ** 2)).normalized()
    return Vector((x, y, z)) + n * lift

def smile(bm):
    seg, rseg, R, r = 16, 8, .085, .019
    cz = mc.z + .045
    rings = []
    for i in range(seg + 1):
        a = math.radians(205 + 130 * i / seg)
        p = on_head(mc.x + R * math.cos(a), cz + R * math.sin(a) * .8, .004)
        # Tangente und Normale fuer den Rohrquerschnitt
        a2 = math.radians(205 + 130 * min(i + 1, seg) / seg) if i < seg else math.radians(205 + 130 * (i - 1) / seg)
        q = on_head(mc.x + R * math.cos(a2), cz + R * math.sin(a2) * .8, .004)
        t = (q - p).normalized() * (1 if i < seg else -1)
        nrm = (p - hc).normalized()
        b = t.cross(nrm).normalized()
        nrm = b.cross(t).normalized()
        taper = .55 + .45 * math.sin(math.pi * i / seg)
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * math.pi * j / rseg) + b * math.sin(2 * math.pi * j / rseg)) * r * taper) for j in range(rseg)])
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(rseg):
            k = (j + 1) % rseg
            bm.faces.new((r0[j], r1[j], r1[k], r0[k]))
    for ring in (rings[0], rings[-1]):
        bm.faces.new(ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

bpy.data.objects.remove(mouth)
new_mesh_obj('D_Mouth', smile, dark)
# kleine Zunge in der Mitte des Laechelns
pink = next((m for m in bpy.data.materials if m.name.startswith('Cheek')), dark)
def tongue(bm):
    p = on_head(mc.x, mc.z + .045 - .085 * .8 + .012, .002)
    g = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=6, radius=1)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(p) @ Matrix.Diagonal((.03, .012, .02, 1)), verts=g['verts'])
new_mesh_obj('D_Tongue', tongue, pink)
export('driver.glb')

# ------------------------------------------------------------------ Volt: Fasen, LED-Augen, LED-Laecheln
O = load('driver_robot.glb')
BOXY = ['D_Head', 'D_HelmTop', 'D_Torso', 'D_Chest', 'D_Back', 'D_Pad', 'D_Pad.001', 'D_Visor', 'D_Mouth', 'D_Glove', 'D_Glove.001']
for n in BOXY:
    o = O.get(n)
    if not o:
        continue
    dims = o.dimensions
    w = min(.035, min(d for d in dims if d > 1e-4) * .22)
    m = o.modifiers.new('Fase', 'BEVEL')
    m.width = w
    m.segments = 3
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(35)
    m.harden_normals = True
    for p in o.data.polygons:
        p.use_smooth = True
led = emissive('VoltEye', (.35, .95, 1.0), 2.6)
visor = O['D_Visor']
vmin, vmax = world_bounds(visor)
front = vmin.y - .004
# Augen: gerundete Leuchtovale statt weisser Quadrate
for name in ('D_Pupil', 'D_Pupil.001'):
    o = O.get(name)
    if not o:
        continue
    pmin, pmax = world_bounds(o)
    c = (pmin + pmax) / 2
    bpy.data.objects.remove(o)
    def eye(bm, c=c):
        g = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=1)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector((c.x, front, c.z))) @ Matrix.Diagonal((.048, .012, .062, 1)), verts=g['verts'])
    new_mesh_obj(name, eye, led)
# LED-Pixel-Laecheln vor dem Mundschlitz
mo = O['D_Mouth']
mmin, mmax = world_bounds(mo)
mc = (mmin + mmax) / 2
mfront = mmin.y - .003
def pixels(bm):
    for i, (dx, dz) in enumerate(((-.12, .018), (-.07, -.004), (-.024, -.014), (.024, -.014), (.07, -.004), (.12, .018))):
        g = bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector((mc.x + dx, mfront, mc.z + dz))) @ Matrix.Diagonal((.036, .012, .026, 1)), verts=g['verts'])
new_mesh_obj('D_MouthLED', pixels, led, smooth=False)
export('driver_robot.glb')

(OUT / 'driver_touchup_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('REPORT', json.dumps(report))
