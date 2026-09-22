"""R29b charm pass on the three alternate drivers (cat, robot, turtle):
bigger eyes, rosier cheeks where present, wider mouths - same treatment as the main driver.
Run headless: blender --background --python variant_facelift.py
"""
import bpy, json, shutil, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r29'
OUT.mkdir(parents=True, exist_ok=True)
report = {}

def charm_pass(fname):
    src = ROOT / 'assets' / fname
    backup = OUT / (fname.replace('.glb', '_r28_backup.glb'))
    if src.exists() and not backup.exists():
        shutil.copy2(src, backup)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))
    changed = []
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in meshes:
        n = o.name.lower()
        if 'eye' in n and 'hi' not in n and 'highlight' not in n:
            o.scale.x *= 1.32; o.scale.y *= 1.32
            changed.append(o.name)
        elif 'eyehi' in n or 'highlight' in n:
            o.scale.x *= 1.32; o.scale.y *= 1.32
            changed.append(o.name)
        elif 'cheek' in n or 'blush' in n:
            o.scale.x *= 1.45; o.scale.y *= 1.45
            changed.append(o.name)
        elif 'mouth' in n or 'smile' in n:
            o.scale.x *= 1.3
            changed.append(o.name)
    for mat in bpy.data.materials:
        if mat.name.lower() in ('cheek', 'blush') and mat.use_nodes:
            b = mat.node_tree.nodes.get('Principled BSDF')
            if b:
                b.inputs['Base Color'].default_value = (0.98, 0.42, 0.5, 1)
                b.inputs['Roughness'].default_value = 0.55
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.export_scene.gltf(filepath=str(src), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    report[fname] = {'changed': changed, 'triangles': tri, 'kb': round(src.stat().st_size / 1024, 1)}

for f in ['driver_cat.glb', 'driver_robot.glb', 'driver_turtle.glb']:
    charm_pass(f)

(OUT / 'variant_facelift_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
print('VARIANTS ' + json.dumps(report))
