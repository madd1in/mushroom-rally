"""Vorschau aller Hindernis-Modelle (Workbench): Reihe mit Stampfer, Roehre+Schnappblume (Maul offen), Statue, Kanone+Kugelblitz, Schild."""
import bpy, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r'C:/Users/User/Documents/Playground/mushroom-rally/assets/hazards.glb')
O = {o.name: o for o in bpy.data.objects}
def G(x, y, z): return Vector((x, -z, y))
lay = {'HZ_Stamper': (-16, 0, 0), 'HZ_Pipe': (-9, 0, 0), 'HZ_PlantStem': (-9, 3.2, 0), 'HZ_Statue': (0, 0, -4), 'HZ_Cannon': (9, 0, 0), 'HZ_Missile': (9, 2.75, 4.5), 'HZ_Sign': (15, 0, 0), 'HZ_PipeRing': (0, 0, -30)}
for n, p in lay.items(): O[n].location = G(*p)
for n, ang in (('HZ_PlantJawTop', -.5), ('HZ_PlantJawBot', .25)):
    o = O[n]; o.location = G(-9, 3.2 + 2.3, -.85); o.rotation_euler = (ang * -1, 0, 0)
O['HZ_PipeRing'].hide_render = True
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_object_outline = True; sh.show_cavity = True
sc.world = bpy.data.worlds.new('W'); sc.render.resolution_x = 1500; sc.render.resolution_y = 640
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 38
for nm, pos, tgt in (('front', (2, -34, 9), (0, 0, 5)), ('side', (-30, -22, 8), (-4, 0, 4))):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = r'C:/Users/User/Documents/Playground/mushroom-rally/art/r44/hazards_' + nm + '.png'; bpy.ops.render.render(write_still=True)
