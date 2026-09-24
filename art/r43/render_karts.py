"""R43 Vorschau: alle vier Fahrer im Kart (Workbench), zum Vorher/Nachher-Vergleich.
Aufruf: blender -b --factory-startup --python art/r43/render_karts.py -- <prefix>
Setzt die Karts wie im Spiel zusammen (Radpositionen und Fahrerversatz aus game.js)."""
import bpy, sys, pathlib, math
from mathutils import Vector

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
A = ROOT / 'assets'
OUT = ROOT / 'art' / 'r43'
prefix = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'before'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def G(x, y, z):  # Spielkoordinaten (y hoch, z vorwaerts) -> Blender
    return Vector((x, -z, y))

def load(fn):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(A / fn))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(fn, None)
    scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    return root, new

def tint(objs, matname, rgb):
    for o in objs:
        if o.type != 'MESH':
            continue
        for i, m in enumerate(o.data.materials):
            if m and m.name.split('.')[0] == matname:
                c = m.copy()
                c.diffuse_color = (*rgb, 1)
                if c.use_nodes:
                    b = c.node_tree.nodes.get('Principled BSDF')
                    if b:
                        b.inputs['Base Color'].default_value = (*rgb, 1)
                o.data.materials[i] = c

DRV = ['driver.glb', 'driver_turtle.glb', 'driver_robot.glb', 'driver_cat.glb']
COL = [(1, .12, .18), (.2, .75, .15), (1, .7, 0), (.45, .3, 1)]
WHEELS = [(-1, .42, 1, 1, 1), (1, .42, 1, 1, 1), (-1.05, .48, -.9, 1.14, 1.3), (1.05, .48, -.9, 1.14, 1.3)]
for k, dfile in enumerate(DRV):
    ox = (k - 1.5) * 3.4
    root = bpy.data.objects.new('Kart%d' % k, None)
    scene.collection.objects.link(root)
    root.location = (ox, 0, 0)
    kr, ko = load('kart.glb')
    tint(ko, 'BodyPaint', COL[k])
    kr.parent = root
    for x, y, z, s, w in WHEELS:
        wr, wo = load('kartwheel.glb')
        wr.parent = root
        wr.location = G(x, y, z)
        wr.scale = (w * (-1 if x > 0 else 1), s, s)
    if (A / 'kartkit.glb').exists():
        xr, xo = load('kartkit.glb')
        xr.parent = root
        for o in xo:
            if o.parent == xr and not o.name.startswith('KX_%d' % k):
                for c in [o] + list(o.children_recursive):
                    c.hide_render = True
        tint(xo, 'BodyPaint', COL[k])
    dr, do = load(dfile)
    tint(do, 'CapPaint', COL[k])
    dr.parent = root
    dr.location = G(0, .95, -.35)

scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
sh.light = 'STUDIO'
sh.color_type = 'MATERIAL'
sh.show_object_outline = True
sh.show_cavity = True
sh.cavity_type = 'BOTH'
sh.show_shadows = True
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('W')
scene.render.resolution_x = 1400
scene.render.resolution_y = 620
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 50

def look(pos, tgt):
    cam.location = pos
    cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()

for name, pos, tgt, lens in [('front', (5, -13, 4.2), (0, 0, .9), 42), ('rear', (-5, 12, 4.8), (0, 0, .9), 42)]:
    cam.data.lens = lens
    look(pos, tgt)
    scene.render.filepath = str(OUT / f'{prefix}_{name}.png')
    bpy.ops.render.render(write_still=True)
# Nahaufnahme Pilzi-Kart (Dreiviertel vorne)
scene.render.resolution_x = 900
scene.render.resolution_y = 700
cam.data.lens = 55
look((-5.1 + 3.2, -4.2, 2.6), (-5.1, 0, .85))
scene.render.filepath = str(OUT / f'{prefix}_close.png')
bpy.ops.render.render(write_still=True)
print('RENDER DONE')
# Gesichter: Pilzi (Kart 0) und Volt (Kart 2) von vorn
scene.render.resolution_x = 700
scene.render.resolution_y = 520
cam.data.lens = 85
for k, nm in ((0, 'face_pilzi'), (2, 'face_volt')):
    ox = (k - 1.5) * 3.4
    look((ox + .5, -3.4, 2.0), (ox, .25, 1.6))
    scene.render.filepath = str(OUT / f'{prefix}_{nm}.png')
    bpy.ops.render.render(write_still=True)
print('FACES DONE')
