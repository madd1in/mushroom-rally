"""Vorschau der Themen-Wahrzeichen (Workbench)."""
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r'C:/Users/User/Documents/Playground/mushroom-rally/assets/landmarks.glb')
O = {o.name: o for o in bpy.data.objects}
def G(x, y, z): return Vector((x, -z, y))
lay = {'LM_Castle': (-40, 0, -20), 'LM_Maypole': (-8, 0, 6), 'LM_Tent': (10, 0, 0), 'LM_Heart': (2, 9, 8), 'LM_Pretzel': (-2, 0, 9), 'LM_Loco': (32, 0, 8), 'LM_Wagon': (32, 0, -1), 'LM_Crossing': (27, 0, 12)}
for n, p in lay.items(): O[n].location = G(*p)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True; sh.show_cavity = True
sc.world = bpy.data.worlds.new('W'); sc.render.resolution_x = 1500; sc.render.resolution_y = 700
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 30
for nm, pos, tgt in (('all', G(-6, 22, 75), G(-6, 12, -4)), ('train', G(46, 8, 22), G(31, 2, 3))):
    cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = r'C:/Users/User/Documents/Playground/mushroom-rally/art/r44/landmarks_' + nm + '.png'; bpy.ops.render.render(write_still=True)
