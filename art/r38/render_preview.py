"""Workbench-Vorschau eines R38-Assets in seiner eigenen Szene (Nutzer-Szene bleibt unberuehrt)."""
import bpy, pathlib
from mathutils import Vector

OUT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally/art/r38')

def render_preview(scene_name, name, pos, tgt, lens=40, res=(760, 520)):
    sc = bpy.data.scenes[scene_name]
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_object_outline = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    cam = bpy.data.objects.get('R38_PrevCam_' + scene_name)
    if cam is None:
        cd = bpy.data.cameras.new('R38_PrevCam_' + scene_name)
        cam = bpy.data.objects.new('R38_PrevCam_' + scene_name, cd)
        sc.collection.objects.link(cam)
    cam.data.lens = lens
    cam.location = pos
    d = Vector(tgt) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = str(OUT / ('preview_' + name + '.png'))
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return sc.render.filepath
