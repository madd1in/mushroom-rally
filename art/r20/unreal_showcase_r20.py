import unreal, json, math
lev=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
sub=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
target='/Game/MushroomRally/L_MR_GliderShowcase'
assert world.get_path_name().startswith('/Game/MushroomRally/'), 'Unexpected level; stopping'
if not world.get_path_name().startswith(target+'.'):
 assert not unreal.EditorAssetLibrary.does_asset_exist(target), 'Showcase already exists; inspect before replacing'
 assert lev.save_current_level_as(target), 'Could not save showcase variant'
actors=sub.get_all_level_actors()
hero=[a for a in actors if a.get_actor_label().startswith(('K_','D_'))]
for a in hero:
 p=a.get_actor_location(); a.set_actor_location(unreal.Vector(p.x,p.y,p.z+170),False,False)
mesh=unreal.load_asset('/Game/MushroomRally/Glider/SM_SporeSail')
glider=sub.spawn_actor_from_object(mesh,unreal.Vector(0,0,170),unreal.Rotator(0,0,0))
glider.set_actor_label('R20_SporeSail_Hero'); glider.set_actor_enable_collision(False)
glider.set_folder_path('R20_Glider')
# New material variants preserve imported FBX sources and balance fabric highlights.
colors={'GliderPaint':(.025,.46,.40,1),'GliderCream':(.96,.87,.63,1),'GliderTrim':(.82,.12,.07,1),'GliderRope':(.20,.12,.055,1)}
ml=unreal.MaterialEditingLibrary
for i,slot in enumerate(mesh.static_materials):
 name=str(slot.material_slot_name)
 key=next((k for k in colors if k in name),'GliderCream')
 path='/Game/MushroomRally/Glider/M_R20_'+key
 mat=unreal.AssetToolsHelpers.get_asset_tools().create_asset('M_R20_'+key,'/Game/MushroomRally/Glider',unreal.Material,unreal.MaterialFactoryNew())
 mat.set_editor_property('two_sided',True)
 col=ml.create_material_expression(mat,unreal.MaterialExpressionConstant3Vector,-400,-100)
 col.set_editor_property('constant',unreal.LinearColor(*colors[key])); ml.connect_material_property(col,'',unreal.MaterialProperty.MP_BASE_COLOR)
 rough=ml.create_material_expression(mat,unreal.MaterialExpressionConstant,-400,80);rough.set_editor_property('r',.82 if key=='GliderRope' else .67);ml.connect_material_property(rough,'',unreal.MaterialProperty.MP_ROUGHNESS)
 ml.recompile_material(mat);unreal.EditorAssetLibrary.save_loaded_asset(mat)
 glider.static_mesh_component.set_material(i,mat)
# Soft warm edge light and cool fill separate the airborne kart from the trees.
for label,pos,color,intensity,radius in [('R20_WarmRim',(320,240,650),(1,.70,.40,1),140000,1100),('R20_SkyFill',(-260,-400,480),(.47,.79,1,1),65000,900)]:
 a=sub.spawn_actor_from_class(unreal.PointLight,unreal.Vector(*pos));a.set_actor_label(label);a.set_folder_path('R20_Glider')
 c=a.point_light_component;c.set_intensity(intensity);c.set_light_color(unreal.LinearColor(*color));c.set_editor_property('attenuation_radius',radius);c.set_editor_property('source_radius',90);c.set_editor_property('cast_shadows',False)
for a in actors:
 if isinstance(a,unreal.SceneCapture2D):
  c=a.get_component_by_class(unreal.SceneCaptureComponent2D)
  oldrt=c.get_editor_property('texture_target')
  rt=unreal.EditorAssetLibrary.duplicate_asset(oldrt.get_path_name().split('.')[0],'/Game/MushroomRally/Glider/RT_R20_Showcase')
  if rt:c.set_editor_property('texture_target',rt)
  loc=unreal.Vector(-740,-1120,560);aim=unreal.Vector(0,20,275)
  a.set_actor_location(loc,False,False);a.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc,aim),False)
  c.set_editor_property('fov_angle',51);c.set_editor_property('capture_every_frame',True);c.set_editor_property('always_persist_rendering_state',True)
  c.capture_scene()
lev.save_current_level()
unreal.EditorLevelLibrary.set_level_viewport_camera_info(unreal.Vector(-740,-1120,560),unreal.MathLibrary.find_look_at_rotation(unreal.Vector(-740,-1120,560),unreal.Vector(0,20,275)))
print(json.dumps({'level':target,'hero_parts':len(hero),'glider':glider.get_path_name(),'bounds':str(mesh.get_bounds()),'materials':[str(x.material_slot_name) for x in mesh.static_materials]},indent=2))
