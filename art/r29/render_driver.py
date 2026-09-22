"""Workbench preview of the facelifted driver (front + three-quarter)."""
import bpy, pathlib

OUT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/art/r29')
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'driver_facelift.blend'))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_object_outline = True
scene.render.resolution_x = 560
scene.render.resolution_y = 760

cam_data = bpy.data.cameras.new('PrevCam')
cam_data.lens = 60
cam = bpy.data.objects.new('PrevCam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

def look_at(obj, target):
    from mathutils import Vector
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

for name, pos, tgt in [('driver_front', (0.0, -2.6, 1.1), (0, 0, 0.75)),
                       ('driver_hero', (1.6, -2.2, 1.35), (-0.05, 0.1, 0.8))]:
    cam.location = pos
    look_at(cam, tgt)
    scene.render.filepath = str(OUT / (name + '.png'))
    bpy.ops.render.render(write_still=True)
print('DONE previews')
