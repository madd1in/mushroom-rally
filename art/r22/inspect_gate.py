"""Inspect the existing gate.glb: bounds (glTF coords), objects, materials, triangles.
Run headless: blender --background --python inspect_gate.py
"""
import bpy, json, pathlib

SRC = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/assets/gate.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))

mins = [1e9]*3
maxs = [-1e9]*3
objs = []
tris = 0
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    t = sum(len(p.vertices) - 2 for p in o.data.polygons)
    tris += t
    mats = [m.name for m in o.data.materials if m]
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        for k in range(3):
            mins[k] = min(mins[k], w[k])
            maxs[k] = max(maxs[k], w[k])
    objs.append({'name': o.name, 'tris': t, 'mats': mats,
                 'dims_blender': [round(b, 2) for b in o.dimensions]})

# Blender is Z-up; glTF is Y-up: gltf_x = bl_x, gltf_y = bl_z, gltf_z = bl_y
report = {
    'file': str(SRC),
    'size_kb': round(SRC.stat().st_size / 1024, 1),
    'triangles': tris,
    'objects': objs,
    'bounds_blender_xyz': [[round(b, 3) for b in mins], [round(b, 3) for b in maxs]],
    'bounds_gltf_xyz': [[mins[0], mins[2], mins[1]], [maxs[0], maxs[2], maxs[1]]],
}
print('REPORT_JSON ' + json.dumps(report, indent=1))
pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/art/r22/gate_inspect.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
