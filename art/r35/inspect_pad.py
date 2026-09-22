"""Inspect driver.glb: objects, materials, bounds - basis for the R29 driver facelift."""
import bpy, json, pathlib

SRC = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/assets/bouncepad.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
objs = []
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    dims = [round(v, 3) for v in o.dimensions]
    loc = [round(v, 3) for v in o.location]
    objs.append({'name': o.name, 'tris': sum(len(p.vertices) - 2 for p in o.data.polygons),
                 'mats': [m.name for m in o.data.materials if m], 'dim': dims, 'loc': loc})
report = {'file': str(SRC), 'kb': round(SRC.stat().st_size / 1024, 1),
          'tris': sum(o['tris'] for o in objs), 'objects': objs}
pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/art/r35/bouncepad_inspect.json').write_text(
    json.dumps(report, indent=1), encoding='utf-8')
print('PAD ' + json.dumps(report))
