"""Vorschau Tribuene (Workbench) mit Zuschauern auf den Stufen wie im Spiel (4 Reihen x 18)."""
import bpy, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
A = r'C:/Users/User/Documents/Playground/mushroom-rally/assets/'
bpy.ops.import_scene.gltf(filepath=A + 'grandstand.glb')
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=A + 'spectator.glb')
spec = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
def G(x, y, z): return Vector((x, -z, y))
for row in range(4):
    for i in range(18):
        for o in spec:
            c = o.copy(); c.data = o.data; bpy.context.scene.collection.objects.link(c)
            c.location = G(-8.1 + i * .95, .45 + row * .75 + .16, -(row * 1.1 - .2)); c.scale = (1.5, 1.5, 1.5)
for o in spec: o.hide_render = True
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True; sh.show_cavity = True
sc.world = bpy.data.worlds.new('W'); sc.render.resolution_x = 1200; sc.render.resolution_y = 620
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 32
for nm, pos, tgt in (('front', G(7, 3.2, 17), G(0, 3.2, -1)), ('side', G(-19, 7, 12), G(0, 3, -1.5))):
    cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = r'C:/Users/User/Documents/Playground/mushroom-rally/art/r44/stand_' + nm + '.png'; bpy.ops.render.render(write_still=True)
