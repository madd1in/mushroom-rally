"""Original Blender-authored Mushroom Rally glider; no external models/textures.
Run inside Blender's connected MCP editor. Writes only new R20 files + glider.glb.
GLTF Y-up coordinates: root kart origin; suspension Y .92; canopy ~2.4..3.3.
"""
import bpy, math, json, pathlib
from mathutils import Vector

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r20'
OUT.mkdir(parents=True, exist_ok=True)
assert not (ROOT / 'assets' / 'glider.glb').exists(), 'Refusing to overwrite glider source'
old_scene = bpy.context.window.scene
scene = bpy.data.scenes.new('R20_SporeSail_Studio')
bpy.context.window.scene = scene
col = bpy.data.collections.new('R20_SporeSail_Export')
scene.collection.children.link(col)

palette = [
    ('GliderPaint', (0.90, 0.18, 0.105, 1), .55),
    ('GliderCream', (0.96, 0.86, 0.64, 1), .67),
    ('GliderTrim', (0.035, 0.39, 0.38, 1), .48),
    ('GliderRope', (0.025, 0.066, 0.067, 1), .60),
]
mats = []
for name, color, rough in palette:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Specular IOR Level'].default_value = .28
    mat.use_backface_culling = False
    mats.append(mat)
buffers = [{'v': [], 'f': []} for _ in mats]

def surface(u, t, lift=0):
    x = 2.5*u
    chord = .92*(1-.27*abs(u)**2)
    y = chord*t + .28*abs(u)**2
    z = 3.05-.68*abs(u)**1.65 + .19*(1-t*t)
    # Shallow inflated cells between nine structural ribs.
    z += .026*math.sin((u+1)*math.pi*4)**2*(.6+.4*(1-t*t))
    return (x, y, z+lift)

def poly(points, material):
    b = buffers[material]
    n = len(b['v'])
    b['v'].extend(points)
    b['f'].append(tuple(range(n,n+len(points))))

def tube(points, radius, material, sides=5):
    b=buffers[material]; start=len(b['v'])
    for i, p in enumerate(points):
        tangent = Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize()
        helper=Vector((0,0,1)) if abs(tangent.z)<.92 else Vector((0,1,0))
        a=tangent.cross(helper).normalized(); d=tangent.cross(a).normalized()
        for j in range(sides):
            v=Vector(p)+radius*(math.cos(j*2*math.pi/sides)*a+math.sin(j*2*math.pi/sides)*d)
            b['v'].append(tuple(v))
    for i in range(len(points)-1):
        for j in range(sides):
            a=start+i*sides+j; c=start+i*sides+(j+1)%sides
            b['f'].append((a,c,c+sides,a+sides))
    b['f'].append(tuple(start+j for j in reversed(range(sides))))
    b['f'].append(tuple(start+(len(points)-1)*sides+j for j in range(sides)))

def panel_color(u):
    a=abs(u)
    return 2 if a>.76 else 1 if a>.53 else 0 if a<.30 else 2

# Closed aerodynamic fabric wing, 24 span segments x eight chord segments.
NU=24; NT=8
for i in range(NU):
    u0=-1+2*i/NU; u1=-1+2*(i+1)/NU; color=panel_color((u0+u1)/2)
    for j in range(NT):
        t0=-1+2*j/NT; t1=-1+2*(j+1)/NT
        poly([surface(u0,t0),surface(u1,t0),surface(u1,t1),surface(u0,t1)],color)
        poly([surface(u0,t1,-.045),surface(u1,t1,-.045),surface(u1,t0,-.045),surface(u0,t0,-.045)],color)
    for t in [-1,1]:
        poly([surface(u0,t),surface(u0,t,-.045),surface(u1,t,-.045),surface(u1,t)],2)
for u in [-1,1]:
    for j in range(NT):
        t0=-1+2*j/NT;t1=-1+2*(j+1)/NT
        poly([surface(u,t0),surface(u,t1),surface(u,t1,-.045),surface(u,t0,-.045)],2)

# Bound edging, rib stitches, and tapered trailing wingtip tabs.
for t in [-1,1]:
    tube([surface(-1+2*i/NU,t,.002) for i in range(NU+1)],.023,2,5)
for u in [-1,-.75,-.5,-.25,0,.25,.5,.75,1]:
    tube([surface(u,-1+2*j/NT,.009) for j in range(NT+1)],.0085,1,4)
for sign in [-1,1]:
    a=surface(sign*.95,.77,-.01);b=surface(sign,1,-.01)
    c=(sign*2.46,1.13,2.17)
    poly([a,b,c],0)
    poly([a,c,b],0)

# Eight taut suspension lines meet two reinforced kart attachment points.
for sign in [-1,1]:
    for frac in [.34,.76]:
        for t in [-.87,.83]:
            top=Vector(surface(sign*frac,t,-.038))
            bottom=Vector((sign*.67,.20 if t>0 else -.20,.92))
            mid=bottom.lerp(top,.5)+Vector((sign*.015,0,-.015))
            tube([tuple(bottom),tuple(mid),tuple(top)],.012,3,5)
            tube([tuple(top-Vector((0,0,.075))),tuple(top+Vector((0,0,.035)))],.025,1,6)
    tube([(sign*.67,-.24,.92),(sign*.67,.24,.92)],.026,2,6)
    tube([(sign*.67,-.24,.92),(sign*.67,-.24,1.06)],.032,1,6)
    tube([(sign*.67,.24,.92),(sign*.67,.24,1.06)],.032,1,6)

# Inlaid cream mushroom insignia, following the center canopy's curve.
def badge_pt(x,y,lift=.029):
    return surface(x/2.5,y/.92,lift)
cap=[badge_pt(-.31,-.09)]
for i in range(13):
    a=math.pi-math.pi*i/12
    cap.append(badge_pt(.31*math.cos(a),-.09-.27*math.sin(a)))
cap.append(badge_pt(.31,-.09))
poly(list(reversed(cap)),1)
poly([badge_pt(-.078,-.09),badge_pt(.078,-.09),badge_pt(.068,.16),badge_pt(-.068,.16)],1)
for x,y,r in [(-.145,-.185,.046),(.10,-.24,.054),(.205,-.14,.034)]:
    poly([badge_pt(x+math.cos(i*math.tau/10)*r,y+math.sin(i*math.tau/10)*r,.035) for i in range(10)],2)

objects=[]
for idx,b in enumerate(buffers):
    mesh=bpy.data.meshes.new(palette[idx][0]+'_Mesh')
    mesh.from_pydata(b['v'],[],b['f']);mesh.materials.append(mats[idx]);mesh.update()
    obj=bpy.data.objects.new(palette[idx][0]+'_Geometry',mesh);col.objects.link(obj)
    for face in mesh.polygons: face.use_smooth=True
    objects.append(obj)
# Weld duplicated patch borders within each material for clean smooth shading.
for obj in objects:
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.0001);bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets'/'glider.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)

# Save an isolated authoring scene, preserving the originally opened scene/file.
scene['asset_name']='Spore Sail';scene['source']='Original local Blender authorship'
scene['coordinate_contract']='GLTF X lateral, Y up, Z fore/aft; kart origin (0,0,0)'
scene['user_prompt']=r'C:\Users\User\Documents\Unreal Projects\test123 5.8\Content\MushroomRally kannst das mit unreal und blender grafisch aufwerten, sfx sind auch etwas zu laut bzw fügen sich net ganz so harmonisch in die bgm soundkulisse ein, und add new ideas please zb. beim schweben nach sprung so flügel hinzufügen bzw. para glider'
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
bounds=[min(v.co[k] for o in objects for v in o.data.vertices) for k in range(3)],[max(v.co[k] for o in objects for v in o.data.vertices) for k in range(3)]
report={'name':'Spore Sail','triangles':triangles,'materials':[m.name for m in mats],'objects':len(objects),'blender_bounds':bounds,'gltf_bounds':[[bounds[0][0],bounds[0][2],-bounds[1][1]],[bounds[1][0],bounds[1][2],-bounds[0][1]]],'export':str(ROOT/'assets'/'glider.glb'),'original_scene':old_scene.name,'original_scene_objects':len(old_scene.objects)}
assert triangles<3500,report
(OUT/'glider_blender_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
bpy.data.libraries.write(str(OUT/'SporeSail_r20.blend'),{scene},fake_user=True,compress=True)
bpy.context.window.scene=old_scene
print(json.dumps(report))
