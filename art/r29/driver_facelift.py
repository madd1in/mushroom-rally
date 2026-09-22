"""R29 driver facelift: bigger eyes, rosy cheeks, wider smile, thicker sleeves,
mushroom-cap brim - charm pass on the existing driver.glb (structure/names preserved).
Run headless: blender --background --python driver_facelift.py
"""
import bpy, math, json, shutil, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
SRC = ROOT / 'assets' / 'driver.glb'
OUT = ROOT / 'art' / 'r29'
BACKUP = OUT / 'driver_r28_backup.glb'
OUT.mkdir(parents=True, exist_ok=True)
if SRC.exists() and not BACKUP.exists():
    shutil.copy2(SRC, BACKUP)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
M = {o.name.lower(): o for o in bpy.data.objects if o.type == 'MESH'}

def scale_parts(names, sx, sy=None, sz=None):
    hits = []
    for n in names:
        for key, o in M.items():
            if key.startswith(n.lower()):
                o.scale.x *= sx
                o.scale.y *= sy if sy is not None else sx
                o.scale.z *= sz if sz is not None else 1
                hits.append(o.name)
    return hits

changes = []
# Chibi charm: bigger eyes with highlights stay, rosier cheeks, wider smile
changes += scale_parts(['d_eye'], 1.38, sz=1.0)
changes += scale_parts(['d_eyehi'], 1.38, sz=1.0)
changes += scale_parts(['d_cheek'], 1.5)
for key in ['d_mouth']:
    if key in M:
        M[key].scale.x *= 1.35
        M[key].scale.y *= 1.05
        changes.append(M[key].name)
# sturdier limbs
changes += scale_parts(['d_upper', 'd_lower'], 1.24, sz=1.0)
changes += scale_parts(['d_elbow'], 1.22)
changes += scale_parts(['d_glove'], 1.12)
# slightly smaller head for proportions (facial features are siblings, they stay put)
if 'd_head' in M:
    M['d_head'].scale *= 0.96
    changes.append('D_Head')

# rosy cheeks material
for mat in bpy.data.materials:
    if mat.name == 'Cheek' and mat.use_nodes:
        b = mat.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (0.98, 0.42, 0.5, 1)
        b.inputs['Roughness'].default_value = 0.55

# mushroom-cap brim: flat cream ring around the cap base (z ~ 0.86 in authoring space)
brim = bpy.data.meshes.new('D_CapBrim')
ri, ro, seg = 0.56, 0.74, 20
verts, faces = [], []
for i in range(seg):
    a = i / seg * math.tau
    ca, sa = math.cos(a), math.sin(a)
    verts.append((ca * ri, sa * ri, 0.86))
    verts.append((ca * ro, sa * ro, 0.855))
for i in range(seg):
    j = (i + 1) % seg
    faces.append((i * 2, j * 2, j * 2 + 1, i * 2 + 1))
    faces.append((i * 2, i * 2 + 1, j * 2 + 1, j * 2))
brim.from_pydata(verts, [], faces)
cream = next((m for m in bpy.data.materials if m.name == 'Cream'), None)
if cream:
    brim.materials.append(cream)
obj = bpy.data.objects.new('D_CapBrim', brim)
bpy.context.scene.collection.objects.link(obj)
changes.append('D_CapBrim')

for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=str(SRC), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_cameras=False, export_lights=False)

tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
report = {'changed': changes, 'triangles': tri, 'kb': round(SRC.stat().st_size / 1024, 1)}
(OUT / 'driver_facelift_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'driver_facelift.blend'))
print('FACELIFT ' + json.dumps(report))
