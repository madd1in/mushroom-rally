"""Workbench preview renders of the R22 gate (cheap, no Cycles).
Run headless: blender --background --python render_gate.py
"""
import bpy, pathlib

OUT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/art/r22')
BLEND = OUT / 'gate_r22.blend'

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_object_outline = True
scene.render.resolution_x = 900
scene.render.resolution_y = 640

cam_data = bpy.data.cameras.new('PrevCam')
cam_data.lens = 42
cam = bpy.data.objects.new('PrevCam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

def look_at(obj, target):
    import mathutils
    d = mathutils.Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# front three-quarter view
cam.location = (17, 30, 8)
look_at(cam, (0, 0, 5.2))
scene.render.filepath = str(OUT / 'gate_preview_front.png')
bpy.ops.render.render(write_still=True)

# low hero view from the road, looking up through the gate
cam.location = (3, 16, 2.2)
look_at(cam, (-2, -2, 7.5))
scene.render.filepath = str(OUT / 'gate_preview_hero.png')
bpy.ops.render.render(write_still=True)
print('DONE renders ->', OUT)
