"""R36 facelifts: grandstand bunting, ghost face, trophy handles, podium base trim.
All deco-only, existing geometry and material bindings untouched. Backups per model.
Run headless: blender --background --python r36_facelifts.py
"""
import bpy, math, json, shutil, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r36'
OUT.mkdir(parents=True, exist_ok=True)
report = {}

def export_current(src):
    for o in bpy.data.objects:
        o.select_set(o.type == 'MESH')
    bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=str(src), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    return tri, round(src.stat().st_size / 1024, 1)

def load_model(name):
    src = ROOT / 'assets' / (name + '.glb')
    backup = OUT / (name + '_r35_backup.glb')
    if src.exists() and not backup.exists():
        shutil.copy2(src, backup)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))
    return src, {m.name: m for m in bpy.data.materials}

def link(obj):
    bpy.context.scene.collection.objects.link(obj)

def new_mesh(name, verts, faces, mat=None):
    m = bpy.data.meshes.new(name)
    m.from_pydata(verts, [], faces)
    if mat:
        m.materials.append(mat)
    o = bpy.data.objects.new(name, m)
    link(o)
    return o

# ---------------- grandstand: bunting garland across the roof + finials
src, mats = load_model('grandstand')
flag = mats.get('StandFlag')
cream = mats.get('StandCream')
verts, faces = [], []
seg, W, D = 14, 9.0, 0.9
for i in range(seg):
    x0 = -W + 2 * W * i / seg
    x1 = -W + 2 * W * (i + 1) / seg
    sag0 = 0.5 * (x0 / W) ** 2
    sag1 = 0.5 * (x1 / W) ** 2
    z0, z1 = 8.2 - sag0 * 1.4, 8.2 - sag1 * 1.4
    # little triangle pennant hanging from the line
    tip0 = (x1, D, z1 - 0.85 - sag1)
    b0 = len(verts)
    verts += [(x0, D, z0), (x1, D, z1), tip0]
    faces += [(b0, b0 + 1, b0 + 2), (b0, b0 + 2, b0 + 1)]
    # line segment
    b1 = len(verts)
    verts += [(x0, D, z0), (x1, D, z1), (x1, D, z1 - 0.06), (x0, D, z0 - 0.06)]
    faces += [(b1, b1 + 1, b1 + 2, b1 + 3)]
garland = new_mesh('StandBunting', verts, faces, flag)
for sx in (-1, 1):  # roof finials
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.32, segments=8, ring_count=6,
                                         location=(sx * 8.6, 0.4, 8.75))
    fin = bpy.context.active_object
    fin.name = 'StandFinial' + ('L' if sx < 0 else 'R')
    if cream:
        fin.data.materials.append(cream)
report['grandstand'] = export_current(src)

# ---------------- ghost: face (eyes + mouth), front on +Y
src, mats = load_model('ghost')
face_col = (0.13, 0.1, 0.24, 1)
face = bpy.data.materials.new('GhostFace')
face.use_nodes = True
b = face.node_tree.nodes.get('Principled BSDF')
b.inputs['Base Color'].default_value = face_col
b.inputs['Roughness'].default_value = 0.5
def eye(x, y, z, rx, rz, segs=10):
    vs = [(x + rx * math.cos(i / segs * math.tau), y, z + rz * math.sin(i / segs * math.tau)) for i in range(segs)]
    return vs
verts, faces = [], []
def add_disc2(vs, mat):
    b = len(verts)
    verts.extend(vs)
    faces.append(tuple(range(b, b + len(vs))))
add_disc2(eye(-0.36, 0.92, 2.05, 0.15, 0.2), face)
add_disc2(eye(0.36, 0.92, 2.05, 0.15, 0.2), face)
add_disc2(eye(0.0, 0.97, 1.55, 0.16, 0.12), face)
new_mesh('GhostFace', verts, faces, face)
report['ghost'] = export_current(src)

# ---------------- trophy: two side handles (half rings)
src, mats = load_model('trophy')
gold = mats.get('TrophyGold')
for sx in (-1, 1):
    vs, fs = [], []
    seg, R, r_tube = 12, 0.52, 0.09
    for i in range(seg + 1):
        a = -0.5 * math.pi + math.pi * i / seg  # upper half arc
        cx, cz = sx * 0.72, 1.18 + R * math.sin(a) - R * 0.4
        cy = 0.28
        for j in range(6):
            t = j / 6 * math.tau
            # small tube cross-section around the arc point
            ox, oy, oz = math.cos(t) * r_tube, math.sin(t) * r_tube, 0
            vs.append((cx + ox, cy + oy, cz + oz))
    for i in range(seg):
        for j in range(6):
            j2 = (j + 1) % 6
            a0 = i * 6 + j
            fs.append((a0, i * 6 + j2, (i + 1) * 6 + j2, (i + 1) * 6 + j))
    new_mesh('TrophyHandle' + ('L' if sx < 0 else 'R'), vs, fs, gold)
report['trophy'] = export_current(src)

# ---------------- podium: golden base trim strip
src, mats = load_model('podium')
pgold = mats.get('PodiumGold')
new_mesh('PodiumTrim',
         [(-3.9, -1.15, 0.05), (3.9, -1.15, 0.05), (3.9, -1.15, 0.3), (-3.9, -1.15, 0.3),
          (-3.9, 1.15, 0.05), (3.9, 1.15, 0.05), (3.9, 1.15, 0.3), (-3.9, 1.15, 0.3)],
         [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)],
         pgold)
report['podium'] = export_current(src)

(OUT / 'r36_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
print('R36 ' + json.dumps(report))
