import unreal,json,os
sub=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
w=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
assert w.get_path_name().startswith('/Game/MushroomRally/'), 'Unexpected project level'
base='/Game/MushroomRally/WindFlight_R32'
unreal.EditorAssetLibrary.make_directory(base)
t=unreal.AssetImportTask();t.filename='C:/Users/User/Documents/Playground/mushroom-rally/art/r32/WindRing_R32.fbx';t.destination_path=base;t.destination_name='SM_WindRing';t.automated=True;t.save=True;t.replace_existing=False
opt=unreal.FbxImportUI();opt.import_mesh=True;opt.import_as_skeletal=False;opt.import_materials=True;opt.static_mesh_import_data.combine_meshes=True;opt.static_mesh_import_data.auto_generate_collision=False;t.options=opt
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([t])
print('IMPORTED',t.imported_object_paths)
target='/Game/MushroomRally/L_MR_WindFlight_R32'
assert not unreal.EditorAssetLibrary.does_asset_exist(target),'Variant exists; inspect before overwriting'
assert not unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages(),'Unsaved editor level; stop before loading variant'
assert unreal.EditorAssetLibrary.duplicate_asset('/Game/MushroomRally/L_MR_Keyart',target),'Map copy failed'
w=unreal.EditorLoadingAndSavingUtils.load_map(target)
actors=sub.get_all_level_actors()
hero=[a for a in actors if a.get_actor_label().startswith(('K_','D_'))]
for a in hero:
 p=a.get_actor_location();a.set_actor_location(unreal.Vector(p.x,p.y,p.z+170),False,False)
mesh=unreal.load_asset(base+'/SM_WindRing')
assert mesh,'Windring import missing'
a=sub.spawn_actor_from_object(mesh,unreal.Vector(0,240,355));a.set_actor_label('R32_Precision_WindRing');a.set_folder_path('R32_Flight');a.set_actor_enable_collision(False)
ml=unreal.MaterialEditingLibrary
palette={'WindGlow':(.04,.64,.43,1),'WindGold':(.97,.71,.28,1),'WindFrame':(.012,.095,.085,1)}
for i,slot in enumerate(mesh.static_materials):
 key=next((k for k in palette if k in str(slot.material_slot_name)),'WindGold')
 m=unreal.AssetToolsHelpers.get_asset_tools().create_asset('M_R32_'+key,base,unreal.Material,unreal.MaterialFactoryNew())
 c=ml.create_material_expression(m,unreal.MaterialExpressionConstant3Vector,-400,-50);c.constant=unreal.LinearColor(*palette[key]);ml.connect_material_property(c,'',unreal.MaterialProperty.MP_BASE_COLOR)
 rough=ml.create_material_expression(m,unreal.MaterialExpressionConstant,-400,100);rough.r=.42 if key=='WindGold' else .65;ml.connect_material_property(rough,'',unreal.MaterialProperty.MP_ROUGHNESS)
 if key=='WindGlow':ml.connect_material_property(c,'',unreal.MaterialProperty.MP_EMISSIVE_COLOR)
 ml.recompile_material(m);unreal.EditorAssetLibrary.save_loaded_asset(m);a.static_mesh_component.set_material(i,m)
glider=unreal.load_asset('/Game/MushroomRally/Glider/SM_SporeSail')
if glider:
 g=sub.spawn_actor_from_object(glider,unreal.Vector(0,0,170));g.set_actor_label('R32_SporeSail');g.set_folder_path('R32_Flight');g.set_actor_enable_collision(False)
loc=unreal.Vector(650,-1450,570);rot=unreal.MathLibrary.find_look_at_rotation(loc,unreal.Vector(0,80,305))
unreal.EditorLevelLibrary.set_level_viewport_camera_info(loc,rot)
unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level()
report={'map':target,'hero_parts':len(hero),'ring_bounds':str(mesh.get_bounds()),'glider_added':bool(glider),'mesh':mesh.get_path_name()}
with open('C:/Users/User/Documents/Playground/mushroom-rally/art/r32/unreal_import_report.json','w') as f:json.dump(report,f,indent=2)
print(json.dumps(report))
unreal.SystemLibrary.execute_console_command(w,'HighResShot 1280x720 filename="C:/Users/User/Documents/Playground/mushroom-rally/art/r32/Unreal_WindFlight_R32.png"')
