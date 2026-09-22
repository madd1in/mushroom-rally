"""R34 itembox facelift: golden corner caps (one merged mesh, +1 draw call) and richer
ribbon gold. Box body, dimensions and band layout stay untouched.
Run headless: blender --background --python itembox_facelift.py
"""
import bpy, json, shutil, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
SRC = ROOT / 'assets' / 'itembox.glb'
OUT = ROOT / 'art' / 'r34'
BACKUP = OUT / 'itembox_r33_backup.glb'
OUT.mkdir(parents=True, exist_ok=True)
if SRC.exists() and not BACKUP.exists():
    shutil.copy2(SRC, BACKUP)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
mats = {m.name: m for m in bpy.data.materials}
ribbon = mats.get('RibbonPaint')

# richer gold for ribbon + bow
if ribbon and ribbon.use_nodes:
    b = ribbon.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (0.96, 0.72, 0.16, 1)
    b.inputs['Roughness'].default_value = 0.35
    b.inputs['Metallic'].default_value = 0.25

# eight corner caps as ONE mesh (single draw call in game)
verts, faces = [], []
S = 0.13  # half size
base = 0
for cx in (-1, 1):
    for cy in (-1, 1):
        for cz in (0.10, 1.30):
            px, py, pz = cx * 0.62, cy * 0.62, cz
            base = len(verts)
            # 8 cube corners
            for dx in (-1, 1):
                for dy in (-1, 1):
                    for dz in (-1, 1):
                        verts.append((px + dx * S, py + dy * S, pz + dz * S))
            # 6 faces of this cube
            q = base
            faces += [(q, q + 1, q + 3, q + 2), (q + 4, q + 5, q + 7, q + 6),
                      (q, q + 1, q + 5, q + 4), (q + 2, q + 3, q + 7, q + 6),
                      (q, q + 2, q + 6, q + 4), (q + 1, q + 3, q + 7, q + 5)]
mesh = bpy.data.meshes.new('CornerCaps')
mesh.from_pydata(verts, [], faces)
if ribbon:
    mesh.materials.append(ribbon)
obj = bpy.data.objects.new('CornerCaps', mesh)
bpy.context.scene.collection.objects.link(obj)

for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=str(SRC), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
report = {'triangles': tri, 'kb': round(SRC.stat().st_size / 1024, 1), 'added': '8 golden corner caps (1 mesh) + gold ribbon'}
(OUT / 'itembox_facelift_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'itembox_facelift.blend'))
print('BOXLIFT ' + json.dumps(report))
