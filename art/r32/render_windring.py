"""Preview-only studio; does not export its floor, camera, or lights into windring."""
import bpy, pathlib, json
from mathutils import Vector
ROOT=pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT=ROOT/'art'/'r32'
scene=bpy.data.scenes['R32_WindRing_Asset']
old_scene=bpy.context.window.scene
bpy.context.window.scene=scene
studio=bpy.data.collections.new('R32_WindRing_PreviewOnly');scene.collection.children.link(studio)
def move_to_studio(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    studio.objects.link(o)
def point(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
floor_mat=bpy.data.materials.new('R32_Preview_Floor');floor_mat.use_nodes=True
p=floor_mat.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.022,.042,.05,1);p.inputs['Roughness'].default_value=.76
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-3.91))
floor=bpy.context.object;floor.name='R32_Preview_Ground';floor.data.materials.append(floor_mat);move_to_studio(floor)
cam_data=bpy.data.cameras.new('R32_Preview_Camera');cam=bpy.data.objects.new('R32_Preview_Camera',cam_data);studio.objects.link(cam)
cam.location=(5.5,-16,5.4);point(cam,(0,0,-.2))
cam_data.type='ORTHO';cam_data.ortho_scale=9.3;scene.camera=cam
for name,loc,energy,size,color in [
('R32_Key',(-4,-6,8),1800,7,(1,.83,.56)),
('R32_Fill',(5,-2,4),1200,5,(.45,.8,1)),
('R32_Rim',(-2,5,6),2200,5,(.47,1,.78))]:
    ld=bpy.data.lights.new(name,'AREA');ld.energy=energy;ld.shape='DISK';ld.size=size;ld.color=color
    lo=bpy.data.objects.new(name,ld);studio.objects.link(lo);lo.location=loc;point(lo,(0,0,0))
scene.world=bpy.data.worlds.new('R32_Preview_World');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.16,.18,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.30
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.render.filepath=str(OUT/'WindRing_R32_preview.png')
bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'WindRing_R32_studio.blend'),{scene},fake_user=True,compress=True)
bpy.context.window.scene=old_scene
print(json.dumps({'preview':str(OUT/'WindRing_R32_preview.png'),'source':str(OUT/'WindRing_R32_studio.blend'),'original_scene_restored':old_scene.name}))

