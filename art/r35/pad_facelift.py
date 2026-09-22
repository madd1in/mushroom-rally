"""R35 bouncepad facelift: wavy cap brim + extra asymmetric spore dots.
Existing geometry untouched; deco follows the squash animation (group scale).
Run headless: blender --background --python pad_facelift.py
"""
import bpy, math, json, shutil, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
SRC = ROOT / 'assets' / 'bouncepad.glb'
OUT = ROOT / 'art' / 'r35'
BACKUP = OUT / 'bouncepad_r34_backup.glb'
OUT.mkdir(parents=True, exist_ok=True)
if SRC.exists() and not BACKUP.exists():
    shutil.copy2(SRC, BACKUP)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
mats = {m.name: m for m in bpy.data.materials}
stem = mats.get('PadStem')
dot = mats.get('PadDot')

# wavy brim: ring r 1.58..1.88 at cap edge, top edge slightly curled (16 segments)
verts, faces = [], []
seg = 16
for i in range(seg):
    a = i / seg * math.tau
    wave = 0.06 * math.sin(a * 3)  # gentle waves around the rim
    ca, sa = math.cos(a), math.sin(a)
    verts.append((ca * 1.56, sa * 1.56, 0.44 + wave))
    verts.append((ca * 1.88, sa * 1.88, 0.50 + wave))
for i in range(seg):
    j = (i + 1) % seg
    faces.append((i * 2, j * 2, j * 2 + 1, i * 2 + 1))
    faces.append((i * 2, i * 2 + 1, j * 2 + 1, j * 2))
brim = bpy.data.meshes.new('PadBrim')
brim.from_pydata(verts, [], faces)
if stem:
    brim.materials.append(stem)
o = bpy.data.objects.new('PadBrim', brim)
bpy.context.scene.collection.objects.link(o)

# extra spore dots (flat discs) on the cap, asymmetric placement
def add_disc(name, x, y, z, r, mat, segs=8):
    vs, fs = [], []
    for i in range(segs):
        a = i / segs * math.tau
        vs.append((x + r * math.cos(a), y + r * math.sin(a), z))
    fs.append(tuple(range(segs)))
    m = bpy.data.meshes.new(name)
    m.from_pydata(vs, [], fs)
    if mat:
        m.materials.append(mat)
    ob = bpy.data.objects.new(name, m)
    bpy.context.scene.collection.objects.link(ob)

for k, (x, y, r) in enumerate([(0.62, 0.34, 0.16), (-0.38, 0.72, 0.13), (-0.72, -0.4, 0.12), (0.3, -0.75, 0.14)]):
    add_disc('PadSpot2_%d' % k, x, y, 0.585, r, dot)

for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=str(SRC), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
report = {'triangles': tri, 'kb': round(SRC.stat().st_size / 1024, 1), 'added': 'wavy brim + 4 spore dots'}
(OUT / 'pad_facelift_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'pad_facelift.blend'))
print('PADLIFT ' + json.dumps(report))
