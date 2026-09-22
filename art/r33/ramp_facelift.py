"""R33 ramp facelift: foot-frame beams with little mushroom hats along both sides.
The driving surface, dimensions and existing mesh stay untouched (physics-safe deco).
Run headless: blender --background --python ramp_facelift.py
"""
import bpy, math, json, shutil, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
SRC = ROOT / 'assets' / 'ramp.glb'
OUT = ROOT / 'art' / 'r33'
BACKUP = OUT / 'ramp_r32_backup.glb'
OUT.mkdir(parents=True, exist_ok=True)
if SRC.exists() and not BACKUP.exists():
    shutil.copy2(SRC, BACKUP)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
mats = {m.name: m for m in bpy.data.materials}
side = mats.get('RampSide')
paint = mats.get('RampPaint')
stripe = mats.get('RampStripe')

def add_box(name, x, y, z, sx, sy, sz, mat):
    b = bpy.data.meshes.new(name)
    b.from_pydata([(-.5, -.5, 0), (.5, -.5, 0), (.5, .5, 0), (-.5, .5, 0),
                   (-.5, -.5, 1), (.5, -.5, 1), (.5, .5, 1), (-.5, .5, 1)],
                  [], [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    if mat:
        b.materials.append(mat)
    o = bpy.data.objects.new(name, b)
    o.location = (x, y, z)
    o.scale = (sx, sy, sz)
    bpy.context.scene.collection.objects.link(o)
    return o

def add_cap(name, x, y, z, r, mat):
    """Little mushroom cap: flat dome disc + tiny stem."""
    seg = 10
    verts, faces = [], []
    for i in range(seg):
        a = i / seg * math.tau
        verts.append((x + r * math.cos(a), y + r * math.sin(a), z))
    for i in range(seg):
        a = (i + .5) / seg * math.tau
        verts.append((x + r * .62 * math.cos(a), y + r * .62 * math.sin(a), z + r * .34))
    verts.append((x, y, z + r * .42))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
        faces.append((seg + i, seg + j, 2 * seg))
    b = bpy.data.meshes.new(name)
    b.from_pydata(verts, [], faces)
    if mat:
        b.materials.append(mat)
    o = bpy.data.objects.new(name, b)
    bpy.context.scene.collection.objects.link(o)
    return o

def add_stem(name, x, y, z, r, h, mat):
    cyl = bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=7, location=(x, y, z + h / 2))
    o = bpy.context.active_object
    o.name = name
    if mat:
        o.data.materials.append(mat)
    return o

# foot-frame beams along both flanks (x = +/- 3.7), spanning the ramp depth
for sx in (-1, 1):
    add_box('RampRail_' + ('L' if sx < 0 else 'R'), sx * 3.72, 0, 0, .34, 5.3, .34, side)
    add_box('RampRailTop_' + ('L' if sx < 0 else 'R'), sx * 3.72, 0, .34, .26, 5.3, .12, stripe)
    # three little mushrooms per side, sitting on the beam
    for k, (yy, rr) in enumerate([(-1.8, .42), (0.0, .5), (1.8, .42)]):
        add_stem('RampShroomS%d%d' % (sx < 0, k), sx * 3.72, yy, .46, rr * .32, rr * .7, side)
        add_cap('RampShroomC%d%d' % (sx < 0, k), sx * 3.72, yy, .46 + rr * .7, rr, paint)

for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=str(SRC), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
report = {'triangles': tri, 'kb': round(SRC.stat().st_size / 1024, 1), 'added': '2 rails + rail tops + 6 mini mushrooms'}
(OUT / 'ramp_facelift_report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'ramp_facelift.blend'))
print('RAMPLIFT ' + json.dumps(report))
