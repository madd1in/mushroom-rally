# Mushroom Rally Wind Ring — R32

Original Blender-authored wind gate for the Mushroom Rally airborne route. No external models, textures, providers, or paid generation were used.

## Integration contract

- Runtime asset: `assets/windring.glb`
- Origin: center of the empty circular opening.
- glTF plane: XY. Ring normal / local travel axis: Z.
- Most decorated side faces glTF +Z (Blender −Y).
- Gold feather fronts, dark teal feather backs, turquoise tube visible from either side.
- Clear opening radius: at least 3.06579 m, including chord geometry.
- Maximum outer radius: 3.684902 m.
- Overall depth: 0.227584 m.
- glTF bounds: min (-3.482983, -3.680000, -0.097584); max (3.482983, 3.680000, 0.130000).
- 1,536 triangles, three meshes, three material primitives, 44,288 bytes.
- No central disk, collision body, lights, camera, or animation is exported.

## Materials

- `WindGlow`: turquoise ring and inset quills; emission strength 2.4; roughness 0.28.
- `WindGold`: warm cream/gold feather faces; metallic 0.13; roughness 0.44.
- `WindFrame`: dark teal structure and feather sides; metallic 0.12; roughness 0.53.

The GLB uses the standard `KHR_materials_emissive_strength` and `KHR_materials_specular` extensions. Preserve material names when merging at runtime.

## Files

- `WindRing_R32.blend`: isolated editable source scene.
- `WindRing_R32.fbx`: engine import counterpart.
- `create_windring.py`: reproducible authoring script; refuses to overwrite an existing runtime asset or scene.
- `render_windring.py`: separate preview studio script.
- `WindRing_R32_preview.png`: studio preview, generated separately.
- `WindRing_R32_studio.blend`: source plus preview studio.
- `windring_blender_report.json`: dimensions, budget, original-scene preservation.
- `windring_glb_validation.json`: independent GLB header/count/hash validation.

The originally active Blender scene and project file are preserved; authoring adds only a uniquely named R32 scene and new datablocks.

