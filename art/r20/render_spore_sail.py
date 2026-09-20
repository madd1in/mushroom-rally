import bpy, math, json, pathlib
from mathutils import Vector
ROOT=pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT=ROOT/'art'/'r20'
scene=bpy.data.scenes.get('R20_SporeSail_Studio')
assert scene is not None
old=bpy.context.window.scene
bpy.context.window.scene=scene
objects=list(bpy.data.collections['R20_SporeSail_Export'].objects)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.fbx(filepath=str(OUT/'SporeSail_r20.fbx'),use_selection=True,object_types={'MESH'},use_mesh_modifiers=True,add_leaf_bones=False,axis_forward='-Z',axis_up='Y',path_mode='AUTO')
studio=bpy.data.collections.new('R20_PreviewOnly')
scene.collection.children.link(studio)
def move_to_studio(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    studio.objects.link(o)
def point(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
floor_mat=bpy.data.materials.new('R20_Preview_Sand')
floor_mat.diffuse_color=(.15,.20,.21,1);floor_mat.use_nodes=True
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.15,.20,.21,1)
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.42))
floor=bpy.context.object;floor.name='R20_Preview_Floor';move_to_studio(floor)
floor.data.materials.append(floor_mat)
camera_data=bpy.data.cameras.new('R20_Preview_Camera');camera=bpy.data.objects.new('R20_Preview_Camera',camera_data);studio.objects.link(camera)
camera.location=(5,-8,6.7);point(camera,(0,0,2.12))
camera_data.type='ORTHO';camera_data.ortho_scale=6.9;scene.camera=camera
for name,loc,energy,size,color in [
('R20_Key',(-3,-4,8),1300,5,(1,.88,.74)),
('R20_Fill',(4,-1,6),1000,4,(.62,.88,1)),
('R20_Rim',(0,4,6),1600,3,(1,.70,.46))]:
    ld=bpy.data.lights.new(name,'AREA');ld.energy=energy;ld.shape='DISK';ld.size=size;ld.color=color
    lo=bpy.data.objects.new(name,ld);studio.objects.link(lo);lo.location=loc;point(lo,(0,0,2))
scene.world=bpy.data.worlds.new('R20_Preview_World');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.23,.25,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.render.filepath=str(OUT/'SporeSail_r20_preview.png')
bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'SporeSail_r20_studio.blend'),{scene},fake_user=True,compress=True)
bpy.context.window.scene=old
print(json.dumps({'fbx':str(OUT/'SporeSail_r20.fbx'),'preview':str(OUT/'SporeSail_r20_preview.png'),'source':str(OUT/'SporeSail_r20_studio.blend')}))

