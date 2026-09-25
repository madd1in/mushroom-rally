"""Vorschau fuer Pilz, Baum und Wolken (R44): art/r44/nature_<name>.png
Aufruf: blender -b --factory-startup --python art/r44/render_nature.py -- [assets-Unterordner, z. B. lo]
CapPaint wird wie im Spiel eingefaerbt (Pilz rot, Baum gruen)."""
import bpy, sys
from mathutils import Vector
SUB = sys.argv[sys.argv.index('--') + 1] + '/' if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1 else ''
ROOT = r'C:/Users/User/Documents/Playground/mushroom-rally/'
bpy.ops.wm.read_factory_settings(use_empty=True)
TINT = {'mushroom': (.9, .16, .13, 1), 'tree': (.3, .62, .22, 1)}
for f, x in (('mushroom', -3.2), ('tree', 2.6)):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ROOT + 'assets/' + SUB + f + '.glb')
    for o in bpy.data.objects:
        if o not in before and o.parent is None:
            o.location.x += x
        if o not in before and o.type == 'MESH':
            for m in o.data.materials:
                if m.name.startswith('CapPaint'):
                    m.diffuse_color = TINT[f]
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=ROOT + 'assets/' + SUB + 'clouds.glb')
for i, o in enumerate(o for o in bpy.data.objects if o not in before and o.parent is None):
    o.location = Vector((-14 + i * 16, 30, 13 + i * 1.5))
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light = 'STUDIO'
sh.color_type = 'MATERIAL'
sh.show_object_outline = True
sh.show_cavity = True
sh.show_backface_culling = True
sh.background_type = 'VIEWPORT'
sh.background_color = (.55, .78, .98)
sc.world = bpy.data.worlds.new('W')
sc.render.resolution_x, sc.render.resolution_y = 1100, 620
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 32
for tag, pos, tgt in (('front', (0, -13, 3.2), (0, 0, 3.8)), ('low', (-1.5, -6.5, .6), (-2.6, 0, 2.6))):
    pos, tgt = Vector(pos), Vector(tgt)
    cam.location = pos
    cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = ROOT + 'art/r44/nature_%s%s.png' % (SUB.strip('/') + '_' if SUB else '', tag)
    bpy.ops.render.render(write_still=True)
