"""Vorschau: Kuh (Kopf + vier Beine zusammengesetzt), Geisterhand, Sternschnuppe, Neon-Schranke (Workbench)."""
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r'C:/Users/User/Documents/Playground/mushroom-rally/assets/critters.glb')
O = {o.name: o for o in bpy.data.objects}
def G(x, y, z): return Vector((x, -z, y))
O['CR_CowBody'].location = G(-6, 0, 0)
O['CR_CowHead'].location = G(-6, 1.75, .95)
leg = O['CR_CowLeg']
for i, (x, z) in enumerate(((-.38, .7), (.38, .7), (-.38, -.75), (.38, -.75))):
    c = leg if i == 0 else leg.copy()
    if i: bpy.context.scene.collection.objects.link(c)
    c.location = G(-6 + x, 1.1, z)
O['CR_Hand'].location = G(-1.5, 0, 0)
O['CR_Meteor'].location = G(2.5, 3, 0)
O['CR_Bar'].location = G(5, 0, 0)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True; sh.show_cavity = True
sc.world = bpy.data.worlds.new('W'); sc.render.resolution_x = 1400; sc.render.resolution_y = 600
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 32
pos, tgt = G(0, 4, 13), G(0, 2, 0)
cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = r'C:/Users/User/Documents/Playground/mushroom-rally/art/r44/critters.png'; bpy.ops.render.render(write_still=True)
