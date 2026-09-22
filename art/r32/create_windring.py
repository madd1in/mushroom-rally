"""Mushroom Rally R32 Wind Ring, original procedural Blender authorship.
GLTF XY plane, origin centered, local +Z travel. Unobstructed opening radius 3.07m.
Three materials, explicit mesh budget, no textures/external assets/paid services.
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector
ROOT=pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT=ROOT/'art'/'r32'
OUT.mkdir(parents=True,exist_ok=True)
TARGET=ROOT/'assets'/'windring.glb'
assert not TARGET.exists(), 'Refusing to overwrite existing windring.glb'
assert bpy.data.scenes.get('R32_WindRing_Asset') is None, 'Use a unique new scene'
old_scene=bpy.context.window.scene
old_filepath=bpy.data.filepath
old_count=len(old_scene.objects)
scene=bpy.data.scenes.new('R32_WindRing_Asset')
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.0
col=bpy.data.collections.new('R32_WindRing_Export')
scene.collection.children.link(col)
bpy.context.window.scene=scene
palette=[
('WindGlow',(.04,.74,.64,1),.28,.0,2.4),
('WindGold',(.93,.70,.33,1),.44,.13,0),
('WindFrame',(.035,.14,.13,1),.53,.12,0)]
materials=[]
for name,color,rough,metal,emission in palette:
    assert bpy.data.materials.get(name) is None, 'New asset material name collision'
    mat=bpy.data.materials.new(name);mat.diffuse_color=color;mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=color
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    p.inputs['Specular IOR Level'].default_value=.32
    if emission:
        p.inputs['Emission Color'].default_value=(.02,.82,.70,1)
        p.inputs['Emission Strength'].default_value=emission
    materials.append(mat)
buffers=[{'v':[],'f':[],'s':[]} for _ in materials]
def poly(points,material,smooth=False):
    b=buffers[material];start=len(b['v'])
    b['v'].extend(points);b['f'].append(tuple(range(start,start+len(points))));b['s'].append(smooth)
def torus(radius,tube,center_y,major,minor,mat,phase=0):
    b=buffers[mat];start=len(b['v'])
    for i in range(major):
        a=i*math.tau/major
        for j in range(minor):
            q=j*math.tau/minor+phase
            r=radius+tube*math.cos(q)
            b['v'].append((r*math.cos(a),center_y+tube*math.sin(q),r*math.sin(a)))
    for i in range(major):
        for j in range(minor):
            b['f'].append((start+i*minor+j,start+((i+1)%major)*minor+j,start+((i+1)%major)*minor+(j+1)%minor,start+i*minor+(j+1)%minor))
            b['s'].append(True)
torus(3.20,.13,-.015,60,6,0)
torus(3.425,.082,.035,48,4,2,math.pi/4)
# Six swept, softly beveled feather-arrow vanes around the outer edge.
shape=[(-.66,3.46),(-.49,3.59),(-.38,3.58),(-.19,3.68),(.12,3.62),(.30,3.52),(.56,3.48),(.15,3.30),(-.08,3.44),(-.26,3.38),(-.31,3.48),(-.50,3.41)]
center=(sum(p[0] for p in shape)/len(shape),sum(p[1] for p in shape)/len(shape))
def vane_point(t,r,y,angle):
    return (r*math.cos(angle)-t*math.sin(angle),y,r*math.sin(angle)+t*math.cos(angle))
for k in range(6):
    angle=math.pi/2+k*math.tau/6
    layers=[]
    for shrink,y in [(.91,-.125),(1.0,-.077),(.94,.069)]:
        layers.append([vane_point(center[0]+(t-center[0])*shrink,center[1]+(r-center[1])*shrink,y,angle) for t,r in shape])
    poly(layers[0],1)
    poly(list(reversed(layers[2])),2)
    for layer,mat in [(0,1),(1,2)]:
        for j in range(len(shape)):
            nj=(j+1)%len(shape)
            poly([layers[layer][j],layers[layer][nj],layers[layer+1][nj],layers[layer+1][j]],mat)
    # A small inset turquoise quill repeats the wind direction.
    quill=[(-.40,3.481),(.34,3.483),(.12,3.537),(-.20,3.523)]
    poly([vane_point(t,r,-.128,angle) for t,r in quill],0)
    # Short inset dark barb; decorative geometry stays outside radius 3.2.
    barb=[(-.28,3.576),(-.13,3.551),(-.045,3.571),(-.14,3.586)]
    poly([vane_point(t,r,-.130,angle) for t,r in barb],2)
objects=[]
for index,b in enumerate(buffers):
    mesh=bpy.data.meshes.new(palette[index][0]+'_WindRingMesh')
    mesh.from_pydata(b['v'],[],b['f']);mesh.materials.append(materials[index]);mesh.update()
    for f,smooth in zip(mesh.polygons,b['s']):f.use_smooth=smooth
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
    obj=bpy.data.objects.new(palette[index][0]+'_R32',mesh);col.objects.link(obj)
    obj.select_set(True);objects.append(obj)
bpy.context.view_layer.objects.active=objects[0]
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
allverts=[v.co.copy() for o in objects for v in o.data.vertices]
bounds=[[min(v[k] for v in allverts) for k in range(3)],[max(v[k] for v in allverts) for k in range(3)]]
radii=[math.hypot(v.x,v.z) for v in allverts]
report={'name':'Mushroom Rally Wind Ring','triangles':triangles,'meshes':len(objects),'materials':[m.name for m in materials],'blender_bounds':bounds,'gltf_bounds':[[bounds[0][0],bounds[0][2],-bounds[1][1]],[bounds[1][0],bounds[1][2],-bounds[0][1]]],'clear_opening_radius':min(radii),'outer_radius':max(radii),'depth':bounds[1][1]-bounds[0][1],'axis':'Blender XZ plane, Blender -Y front; glTF XY plane, glTF +Z front/travel; root at origin','original_scene':old_scene.name,'original_scene_objects':old_count,'provider':'none; original procedural Blender authorship','user_prompt':'kannst weiter mit blender, unreal, elevenlabs und neuen ideen das spiel verbessern please'}
assert triangles<2500,report
assert min(radii)>=3.05 and max(radii)<=3.701 and report['depth']<.4,report
scene['asset_name']=report['name'];scene['user_prompt']=report['user_prompt'];scene['axis']=report['axis']
bpy.ops.export_scene.gltf(filepath=str(TARGET),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
bpy.ops.export_scene.fbx(filepath=str(OUT/'WindRing_R32.fbx'),use_selection=True,object_types={'MESH'},use_mesh_modifiers=True,add_leaf_bones=False,axis_forward='-Z',axis_up='Y',path_mode='AUTO')
bpy.data.libraries.write(str(OUT/'WindRing_R32.blend'),{scene},fake_user=True,compress=True)
(OUT/'windring_blender_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
bpy.context.window.scene=old_scene
assert len(old_scene.objects)==old_count
assert bpy.data.filepath==old_filepath
print(json.dumps(report))

