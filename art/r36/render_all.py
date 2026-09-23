"""Workbench previews for the four R36 facelifted models."""
import bpy, pathlib

OUT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/art/r36')
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_object_outline = True
scene.render.resolution_x = 620
scene.render.resolution_y = 480

cam_data = bpy.data.cameras.new('PrevCam')
cam_data.lens = 55
cam = bpy.data.objects.new('PrevCam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

def look_at(obj, target):
    from mathutils import Vector
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# ghost first (currently open after last export? no - reopen each)
import bpy.ops as ops
for blend_name, pos, tgt in [
    ('ghost_facelift', (1.4, 4.2, 2.4), (0, 0, 1.6)),
    ('grandstand_facelift', (14, 16, 7), (0, 0, 4)),
    ('trophy_facelift', (1.9, -3.2, 1.9), (0, 0.15, 1.1)),
    ('podium_facelift', (7, -9, 4), (0, 0.4, 0.8)),
]:
    # saves were not kept per model; re-import the exported glb instead
    pass

for glb, pos, tgt in [
    ('ghost', (1.4, 4.2, 2.4), (0, 0, 1.6)),
    ('grandstand', (14, 16, 7), (0, 0, 4)),
    ('trophy', (1.9, -3.2, 1.9), (0, 0.15, 1.1)),
    ('podium', (7, -9, 4), (0, 0.4, 0.8)),
]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/assets') / (glb + '.glb')))
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_object_outline = True
    sc.render.resolution_x = 620
    sc.render.resolution_y = 480
    cd = bpy.data.cameras.new('C')
    cd.lens = 55
    c = bpy.data.objects.new('C', cd)
    sc.collection.objects.link(c)
    sc.camera = c
    c.location = pos
    look_at(c, tgt)
    sc.render.filepath = str(OUT / ('preview_' + glb + '.png'))
    bpy.ops.render.render(write_still=True)
print('DONE previews')
