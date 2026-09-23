# R38 Unreal-Showcase "Magnet-Katapult": baut im offenen Keyart-Level eine abgegrenzte Szene in den
# Ordner R38_MagnetCoaster (hinter der bestehenden Keyart-Kamera, Y um -90 m), rendert sie ueber eine
# EIGENE SceneCapture in ein eigenes Render Target und speichert den Level NICHT.
# Aufruf im Editor: exec(open(r'.../art/r38/unreal_coaster_r38.py').read()); build(); shot(...)
import unreal, math, json

SUB = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
EAL = unreal.EditorAssetLibrary
FOLDER = 'R38_MagnetCoaster'
BASE = '/Game/MushroomRally/'
MA = BASE + 'magnetarch_r38/magnetarch/StaticMeshes/'
CT = BASE + 'coastertruss_r38/coastertruss/StaticMeshes/'
FW = BASE + 'ferriswheel_r38/ferriswheel/StaticMeshes/'
SY = -9000.0            # Strassenachse (Welt-Y), Strasse laeuft entlang +X
HILL_C, HILL_W, HILL_H = 1800.0, 3200.0, 1800.0
ROAD_W = 1760.0

def world():
    return unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()

def ours():
    return [a for a in SUB.get_all_level_actors() if str(a.get_folder_path()) == FOLDER]

def clear():
    for a in ours():
        SUB.destroy_actor(a)

def spawn_mesh(path, loc, rot=(0, 0, 0), scale=(1, 1, 1), label=None, mat=None):
    mesh = unreal.load_asset(path)
    assert mesh, path
    a = SUB.spawn_actor_from_object(mesh, unreal.Vector(*loc), unreal.Rotator(roll=rot[0], pitch=rot[1], yaw=rot[2]))
    a.set_actor_scale3d(unreal.Vector(*scale))
    a.set_folder_path(FOLDER)
    a.set_actor_enable_collision(False)
    if label:
        a.set_actor_label(label)
    if mat:
        a.static_mesh_component.set_material(0, mat)
    return a

def hill(x):
    t = (x - HILL_C) / HILL_W
    if abs(t) >= 1:
        return 0.0, 0.0
    a = 1 - t * t
    return HILL_H * a ** 3, HILL_H * (-6 * t * a * a) / HILL_W

def build():
    clear()
    road_mat = None
    for a in SUB.get_all_level_actors():
        if a.get_actor_label() == 'Cube' and str(a.get_folder_path()) == 'Set':
            road_mat = a.static_mesh_component.get_material(0)
    red = unreal.load_asset(BASE + 'magnetarch_r38/magnetarch/Materials/MagnetPaint')
    cube = '/Engine/BasicShapes/Cube.Cube'
    # Abschussstrecke (flach) und Auslauf
    spawn_mesh(cube, (-4200, SY, -2), scale=(46, ROAD_W / 100, .06), label='R38_LaunchRoad', mat=road_mat)
    # Huegel als Kette gekippter Platten + rote Seitenwangen
    step = 220.0
    x = HILL_C - HILL_W - 400
    while x < HILL_C + HILL_W + 600:
        h0, _ = hill(x)
        h1, _ = hill(x + step)
        mid = x + step / 2
        pitch = math.degrees(math.atan2(h1 - h0, step))
        L = math.hypot(step, h1 - h0) + 6
        z = (h0 + h1) / 2
        spawn_mesh(cube, (mid, SY, z - 3), (0, pitch, 0), (L / 100, ROAD_W / 100, .06), mat=road_mat)
        for side in (-1, 1):
            spawn_mesh(cube, (mid, SY + side * 900, z - 40), (0, pitch, 0), (L / 100, .3, .9), mat=red)
        x += step
    # Fachwerkstuetzen unter dem Huegel (Segmente 4 m, gestapelt) + Fuesse
    x = HILL_C - HILL_W + 500
    while x < HILL_C + HILL_W - 400:
        h, _ = hill(x)
        top = h - 90
        if top > 300:
            for side in (-620, 620):
                spawn_mesh(CT + 'CT_foot', (x, SY + side, 0))
                spawn_mesh(CT + 'CT_cap', (x, SY + side, 0))
                z = 0.0
                while z < top - 5:
                    seg = min(400.0, top - z)
                    spawn_mesh(CT + 'CT_truss', (x, SY + side, z), scale=(1, 1, seg / 400.0))
                    z += 400
        x += 700
    # Magnetboegen quer ueber die Abschussstrecke (Bogen spannt lokal X, Strasse laeuft entlang Welt-X)
    arch_parts = [a for a in EAL.list_assets(MA, recursive=False) if '.' in a.split('/')[-1] or True]
    arch_parts = [p for p in EAL.list_assets(MA) if EAL.find_asset_data(p).asset_class_path.asset_name == 'StaticMesh']
    for i, ax in enumerate([-6600, -5900, -5200, -4500, -3800]):
        for p in arch_parts:
            spawn_mesh(p.split('.')[0], (ax, SY, 0), (0, 0, 90))
    # Riesenrad im Hintergrund (Rad leicht gedreht, Gondeln haengen senkrecht)
    fx, fy, yaw = 2600.0, SY + 5200, -25.0
    for n in ('FW_base_001', 'FW_booth_001', 'FW_boothroof', 'FW_steel_001'):
        spawn_mesh(FW + n, (fx, fy, 0), (0, 0, yaw))
    rot = 11.0
    for n in ('FW_wheel_001', 'FW_lights_001'):
        # Rad um die Nabe (2400 cm) drehen: Drehung um lokale Y-Achse = Pitch in Unreal
        a = spawn_mesh(FW + n, (fx, fy, 0), (0, 0, yaw))
        a.set_actor_location(unreal.Vector(fx, fy, 0), False, False)
        a.add_actor_local_rotation(unreal.Rotator(pitch=rot), False, False)
        # Pivot liegt im Ursprung - nach der Drehung die Nabe zurueck auf 24 m schieben
        c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        hub = unreal.Vector(0, 0, 2400)
        f = a.get_actor_forward_vector()
        # Nabe im gedrehten Rahmen: R*(0,0,2400); Versatz = hub - R*hub (nur X/Z-Anteil in lokaler Ebene)
        dx, dz = 2400 * s, 2400 * (1 - c)
        a.set_actor_location(unreal.Vector(fx - f.x * dx, fy - f.y * dx, dz), False, False)
    yawr = math.radians(yaw)
    for i in range(12):
        ang = math.radians(rot) + i * math.tau / 12
        lx, lz = math.cos(ang) * 2000, 2400 + math.sin(ang) * 2000
        spawn_mesh(FW + 'FW_gondola_001', (fx + lx * math.cos(yawr), fy + lx * math.sin(yawr), lz), (0, 0, yaw))
        spawn_mesh(FW + 'FW_trim_001', (fx + lx * math.cos(yawr), fy + lx * math.sin(yawr), lz), (0, 0, yaw))
    # Hero-Kart duplizieren und auf die Abschussstrecke stellen (Blick entlang +X)
    hero = [a for a in SUB.get_all_level_actors() if str(a.get_folder_path()) == 'Hero/Kart']
    copies = SUB.duplicate_actors(hero, world(), unreal.Vector(0, 0, 0))
    piv = unreal.Vector(0, 0, 0)
    target = unreal.Vector(-5400, SY - 150, 0)
    dyaw = -104.0
    cy, sy_ = math.cos(math.radians(dyaw)), math.sin(math.radians(dyaw))
    for a in copies:
        p = a.get_actor_location()
        rx, ry = p.x * cy - p.y * sy_, p.x * sy_ + p.y * cy
        a.set_actor_location(unreal.Vector(target.x + rx, target.y + ry, p.z + 24), False, False)
        r = a.get_actor_rotation()
        a.set_actor_rotation(unreal.Rotator(roll=r.roll, pitch=r.pitch, yaw=r.yaw + dyaw), False)
        a.set_folder_path(FOLDER)
    return len(ours())

def capture(name, loc, look, fov=58, w=1920, h=1080):
    rt_path = BASE + 'r38/RT_R38_' + name
    rt = unreal.load_asset(rt_path) if EAL.does_asset_exist(rt_path) else None
    if not rt:
        EAL.make_directory(BASE + 'r38')
        rt = unreal.AssetToolsHelpers.get_asset_tools().create_asset('RT_R38_' + name, BASE + 'r38', unreal.TextureRenderTarget2D, unreal.TextureRenderTargetFactoryNew())
    rt.set_editor_property('size_x', w)
    rt.set_editor_property('size_y', h)
    rt.set_editor_property('render_target_format', unreal.TextureRenderTargetFormat.RTF_RGBA8)
    cap = next((a for a in ours() if a.get_actor_label() == 'R38_Capture'), None)
    if not cap:
        src = next(a for a in SUB.get_all_level_actors() if a.get_class().get_name() == 'SceneCapture2D' and str(a.get_folder_path()) == 'Render')
        cap = SUB.duplicate_actors([src], world(), unreal.Vector(0, 0, 0))[0]
        cap.set_actor_label('R38_Capture')
        cap.set_folder_path(FOLDER)
    L = unreal.Vector(*loc)
    cap.set_actor_location(L, False, False)
    cap.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(L, unreal.Vector(*look)), False)
    cc = cap.capture_component2d
    cc.set_editor_property('texture_target', rt)
    cc.set_editor_property('fov_angle', fov)
    for _ in range(6):
        cc.capture_scene()
    out = 'C:/Users/User/Documents/Playground/mushroom-rally/art/r38/'
    unreal.RenderingLibrary.export_render_target(world(), rt, out, 'ue_' + name)
    return out + 'ue_' + name
