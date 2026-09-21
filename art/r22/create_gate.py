"""R22 start/finish gate "Sporentor" - replaces assets/gate.glb (backup kept in art/r22).
Run headless: blender --background --python create_gate.py
Authoring coords: Blender Z-up (Z height, X across the road, Y along the road);
exported with export_yup so the GLB is Y-up like the old gate.

Contract with game.js (must not change):
- pillars stand at x = +/-9.3 (collision circles r=1 there)
- light panel zone height 4.8..6.4, |x|<2.8, depth -0.75 stays clear
- "MUSHROOM RALLY" labels sit at height 8.0, depth +/-0.26 -> beam depth +/-0.24
- old glb bounds X +/-10.7, Y 0..10.7 (new: X +/-10.6, Y 0..11.2 - display only)
"""
import bpy, math, json, shutil, pathlib
from mathutils import Vector

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r22'
GLB = ROOT / 'assets' / 'gate.glb'
BACKUP = OUT / 'gate_r21_backup.glb'
OUT.mkdir(parents=True, exist_ok=True)
if GLB.exists() and not BACKUP.exists():
    shutil.copy2(GLB, BACKUP)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = bpy.data.collections.new('R22_Sporentor')
scene.collection.children.link(col)

# ---------------------------------------------------------------- materials
palette = [
    # name, base color, roughness, emissive color or None, emissive strength
    ('ArchPaint',   (0.92, 0.23, 0.16, 1), .62, None, 0),
    ('PillarPaint', (0.96, 0.88, 0.67, 1), .72, None, 0),
    ('CapPaint',    (0.86, 0.19, 0.12, 1), .55, (0.05, 0.01, 0.0), .12),
    ('RoofPaint',   (0.94, 0.31, 0.20, 1), .48, (0.06, 0.012, 0.004), .14),
    ('DotPaint',    (0.98, 0.95, 0.86, 1), .6, None, 0),
    ('BannerPaint', (0.97, 0.91, 0.73, 1), .8, None, 0),
    ('LampPaint',   (0.99, 0.87, 0.58, 1), .4, (1.0, 0.78, 0.42), 1.1),
    ('ShroomPaint', (0.89, 0.26, 0.16, 1), .58, None, 0),
]
mats = []
for name, color, rough, emi, emi_i in palette:
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = .3
    if emi:
        b.inputs['Emission Color'].default_value = (*emi, 1)
        b.inputs['Emission Strength'].default_value = emi_i
    m.use_backface_culling = False
    mats.append(m)
M = {p[0]: i for i, p in enumerate(palette)}

buffers = [{'v': [], 'f': []} for _ in mats]

def poly(points, material):
    b = buffers[material]
    n = len(b['v'])
    b['v'].extend([tuple(p) for p in points])
    b['f'].append(tuple(range(n, n + len(points))))

def tube(points, radius, material, sides=5):
    """Open tube along a polyline with end caps; radius may be a number or fn of t in [0,1]."""
    b = buffers[material]
    start = len(b['v'])
    pts = [tuple(p) for p in points]
    n = len(pts)
    for i, p in enumerate(pts):
        t = i / max(1, n - 1)
        r = radius(t) if callable(radius) else radius
        tangent = Vector(pts[min(i + 1, n - 1)]) - Vector(pts[max(0, i - 1)])
        if tangent.length < 1e-9:
            tangent = Vector((0, 0, 1))
        tangent.normalize()
        helper = Vector((0, 0, 1)) if abs(tangent.z) < .92 else Vector((0, 1, 0))
        a = tangent.cross(helper).normalized()
        d = tangent.cross(a).normalized()
        for j in range(sides):
            ang = j * 2 * math.pi / sides
            b['v'].append(tuple(Vector(p) + r * (math.cos(ang) * a + math.sin(ang) * d)))
    for i in range(n - 1):
        off1 = start + (i + 1) * sides
        for j in range(sides):
            j2 = (j + 1) % sides
            b['f'].append((start + i * sides + j, start + i * sides + j2, off1 + j2, off1 + j))
    b['f'].append(tuple(start + j for j in reversed(range(sides))))
    b['f'].append(tuple(start + (n - 1) * sides + j for j in range(sides)))

def disc(cx, cy, cz, r, seg, material):
    """Flat filled circle facing up (normal +Z)."""
    ring = [(cx + r * math.cos(i * 2 * math.pi / seg), cy + r * math.sin(i * 2 * math.pi / seg), cz)
            for i in range(seg)]
    poly(ring, material)

PX = 9.3   # pillar x

# ---------------------------------------------------------------- pillars
def pillar(sx):
    x = sx * PX
    heights = [0, 1.9, 3.8, 5.7, 7.5]
    tube([(x, 0, h) for h in heights], lambda t: .88 - .28 * t, M['PillarPaint'], sides=8)
    tube([(x, 0, .05), (x, 0, .55)], 1.18, M['PillarPaint'], sides=10)   # base plinth
    disc(x, 0, .56, 1.18, 10, M['PillarPaint'])
    for h, w in [(2.6, .10), (5.0, .08)]:                                # bulge rings
        r0 = .88 - .28 * (h / 7.5) + w
        tube([(x, 0, h - .16), (x, 0, h + .16)], r0, M['PillarPaint'], sides=8)
    # capital: broad flat mushroom cap with overhang (highest at the stem, drooping rim)
    seg_u, cap_h, cap_r, cap_z0 = 14, .85, 1.85, 7.5
    for i in range(seg_u):
        u0, u1 = i / seg_u, (i + 1) / seg_u
        r0 = max(cap_r * math.sin(u0 * math.pi / 2), .02)
        r1 = max(cap_r * math.sin(u1 * math.pi / 2), .02)
        z0 = cap_z0 + cap_h * math.cos(u0 * math.pi / 2)
        z1 = cap_z0 + cap_h * math.cos(u1 * math.pi / 2)
        for k in range(8):
            a0, a1 = k * 2 * math.pi / 8, (k + 1) * 2 * math.pi / 8
            poly([(x + r0 * math.cos(a0), r0 * math.sin(a0), z0),
                  (x + r1 * math.cos(a0), r1 * math.sin(a0), z1),
                  (x + r1 * math.cos(a1), r1 * math.sin(a1), z1),
                  (x + r0 * math.cos(a1), r0 * math.sin(a1), z0)], M['CapPaint'])
    disc(x, 0, cap_z0 + cap_h, .55, 8, M['CapPaint'])                    # rounded crown disc
    for k in range(8):                                                   # short gill fins under the cap
        a, a2 = k * 2 * math.pi / 8, k * 2 * math.pi / 8 + .18
        poly([(x + 1.55 * math.cos(a), 1.55 * math.sin(a), cap_z0 + .02),
              (x + .55 * math.cos(a), .55 * math.sin(a), cap_z0 - .26),
              (x + .55 * math.cos(a2), .55 * math.sin(a2), cap_z0 - .26),
              (x + 1.55 * math.cos(a2), 1.55 * math.sin(a2), cap_z0 + .02)], M['DotPaint'])
    for (dx, dy, r) in [(.6, .35, .18), (-.25, .7, .15), (-.7, -.3, .13)]:  # spore dots
        zz = cap_z0 + cap_h * (1 - (math.hypot(dx, dy) / cap_r) ** 2) ** .5
        disc(x + dx, dy, zz + .01, r, 7, M['DotPaint'])

for sx in (-1, 1):
    pillar(sx)

# ---------------------------------------------------------------- arch beam
def beam_z(u):
    return 7.45 + 1.0 * math.cos(u * math.pi / 2) ** 1.6   # u in [-1,1]

NS, half_w, half_h = 12, .24, .34
for i in range(NS):
    u0, u1 = -1 + 2 * i / NS, -1 + 2 * (i + 1) / NS
    x0, x1 = u0 * PX, u1 * PX
    z0, z1 = beam_z(u0), beam_z(u1)
    c00 = (x0, -half_w, z0 - half_h); c01 = (x0, half_w, z0 - half_h)
    c02 = (x0, half_w, z0 + half_h);  c03 = (x0, -half_w, z0 + half_h)
    c10 = (x1, -half_w, z1 - half_h); c11 = (x1, half_w, z1 - half_h)
    c12 = (x1, half_w, z1 + half_h);  c13 = (x1, -half_w, z1 + half_h)
    poly([c00, c10, c11, c01], M['ArchPaint'])   # bottom
    poly([c03, c02, c12, c13], M['ArchPaint'])   # top
    poly([c01, c11, c12, c02], M['ArchPaint'])   # +y face
    poly([c00, c03, c13, c10], M['ArchPaint'])   # -y face
for sx in (-1, 1):
    x = sx * PX
    poly([(x, -half_w, beam_z(sx) - half_h), (x, half_w, beam_z(sx) - half_h),
          (x, half_w, beam_z(sx) + half_h), (x, -half_w, beam_z(sx) + half_h)], M['ArchPaint'])
    tube([(x - sx * .72, 0, 6.4), (x - sx * .26, 0, 7.34)], .10, M['ArchPaint'], sides=4)  # bracket strut

# cream banner band across the front face (runtime text label floats 2 cm in front of it)
poly([(-7.4, .28, 7.85), (7.4, .28, 7.85), (7.4, .28, 8.85), (-7.4, .28, 8.85)], M['BannerPaint'])

# ---------------------------------------------------------------- roof canopy
def roof_pt(u, t):
    """u in [-1,1] across, t in [0,1] from eave to crown."""
    x = u * 10.6
    crown = 10.55 - .85 * u * u
    z = 8.62 + (crown - 8.62) * math.sin(t * math.pi / 2) ** .75
    z += .40 * (1 - t) ** 2 * (1 - .3 * u * u)           # eaves curl up at the rim
    y = (1 - t) * .95 * math.cos(u * math.pi / 2)         # rim droops toward the road
    return (x, y, z)

RU, RT = 22, 4
for i in range(RU):
    u0, u1 = -1 + 2 * i / RU, -1 + 2 * (i + 1) / RU
    for j in range(RT):
        t0, t1 = j / RT, (j + 1) / RT
        poly([roof_pt(u0, t0), roof_pt(u1, t0), roof_pt(u1, t1), roof_pt(u0, t1)], M['RoofPaint'])
tube([roof_pt(-1 + 2 * i / RU, 0) for i in range(RU + 1)], .16, M['ArchPaint'], sides=4)  # rim tube
disc(0, 0, 8.6, 2.8, 10, M['RoofPaint'])                 # skirt so the cap reads closed from below

for (u, t, r) in [(-.72, .38, .26), (-.38, .62, .22), (0, .8, .30), (.35, .55, .22),
                  (.68, .4, .26), (-.15, .3, .20), (.5, .82, .18)]:     # spore dots on the roof
    p = roof_pt(u, t)
    disc(p[0], p[1] - .12, p[2] + .02, r, 7, M['DotPaint'])

# finial: small stem + tiny cap on the crown
tube([(0, 0, 10.45), (0, 0, 10.90)], .14, M['PillarPaint'], sides=5)
tube([(0, 0, 10.90), (0, 0, 11.12)], .34, M['CapPaint'], sides=7)
disc(0, 0, 11.14, .34, 7, M['CapPaint'])

# ---------------------------------------------------------------- hanging lanterns
for sx in (-1, 1):
    x = sx * 9.9
    hook = roof_pt(sx * (9.9 / 10.6), 0)
    tube([(x, hook[1] * .9, hook[2] - .05), (x, 0, hook[2] - .72)], .05, M['ArchPaint'], sides=4)
    tube([(x, 0, hook[2] - .78), (x, 0, hook[2] - 1.28)], .24, M['LampPaint'], sides=7)  # glowing glass
    tube([(x, 0, hook[2] - .72), (x, 0, hook[2] - 1.02)], .34, M['ArchPaint'], sides=7)  # little roof cone
    disc(x, 0, hook[2] - 1.30, .24, 7, M['LampPaint'])

# ---------------------------------------------------------------- foot mushrooms
def shroom(x, s, rot):
    tube([(x, 0, 0), (x, 0, .55 * s), (x, 0, .95 * s)], .22 * s, M['PillarPaint'], sides=6)
    z0 = .95 * s
    for i in range(8):
        a0, a1 = rot + i * 2 * math.pi / 8, rot + (i + 1) * 2 * math.pi / 8
        r = .62 * s
        poly([(x + r * math.cos(a0), r * math.sin(a0), z0),
              (x + r * math.cos(a1), r * math.sin(a1), z0),
              (x + r * .82 * math.cos(a1), r * .82 * math.sin(a1), z0 + .42 * s),
              (x + r * .82 * math.cos(a0), r * .82 * math.sin(a0), z0 + .42 * s)], M['ShroomPaint'])
        poly([(x + r * .82 * math.cos(a0), r * .82 * math.sin(a0), z0 + .42 * s),
              (x + r * .82 * math.cos(a1), r * .82 * math.sin(a1), z0 + .42 * s),
              (x, 0, z0 + .46 * s)], M['ShroomPaint'])
    disc(x + .2 * s, .25 * s, z0 + .40 * s, .12 * s, 5, M['DotPaint'])

shroom(8.35, .95, .4)
shroom(-8.25, .80, 2.1)
shroom(10.15, .62, 1.2)
shroom(-10.10, .70, 4.4)

# ---------------------------------------------------------------- build objects
objects = []
for idx, b in enumerate(buffers):
    if not b['v']:
        continue
    mesh = bpy.data.meshes.new(palette[idx][0] + '_Mesh')
    mesh.from_pydata(b['v'], [], b['f'])
    mesh.materials.append(mats[idx])
    mesh.update()
    obj = bpy.data.objects.new(palette[idx][0] + '_Geometry', mesh)
    col.objects.link(obj)
    for face in mesh.polygons:
        face.use_smooth = True
    objects.append(obj)

# weld duplicated patch borders within each material for clean smooth shading
for obj in objects:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.0001)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)

for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_cameras=False, export_lights=False)

triangles = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objects)
mins = [min(v.co[k] for o in objects for v in o.data.vertices) for k in range(3)]
maxs = [max(v.co[k] for o in objects for v in o.data.vertices) for k in range(3)]
report = {
    'name': 'Sporentor R22', 'triangles': triangles,
    'materials': [p[0] for p in palette],
    'objects': len(objects),
    'bounds_blender_xyz': [[round(b, 3) for b in mins], [round(b, 3) for b in maxs]],
    'bounds_gltf_xyz': [[round(mins[0], 3), round(mins[2], 3), round(mins[1], 3)],
                        [round(maxs[0], 3), round(maxs[2], 3), round(maxs[1], 3)]],
    'kb': round(GLB.stat().st_size / 1024, 1),
    'backup_of_r21_gate': str(BACKUP),
    'contract': 'pillars +/-9.3, panel zone clear 4.8..6.4, labels at h8 z+/-.26',
}
assert triangles < 2400, report
(OUT / 'gate_blender_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'gate_r22.blend'))
print('REPORT ' + json.dumps(report))
