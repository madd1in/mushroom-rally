"""Mushroom Rally R46: Fahrer und Karts aufgehuebscht - Anbauten auf die bestehenden Modelle (Namen bleiben).
Aufruf: blender -b --factory-startup --python art/r46/polish_karts.py
    oder mit dem bpy-Modul (pip install bpy==5.0.1): python art/r46/polish_karts.py
Arbeitet immer von den Sicherungen art/r46/*_r45_backup.glb aus (wiederholbar).

  kartkit.glb       Startnummer je Figur (Pilzi 7, Schildi 3, Volt 9, Mochi 5): Rundschild mit Goldrand auf der Haube,
                    Nummernschild hinten (im Rennen sieht man die Karts meist von hinten). Die Teile sitzen per
                    Strahltest genau auf der Karosserie (kart.glb) bzw. dem Bausatz. Auf den stark gewoelbten
                    Seitenkaesten sass ein flaches Schild immer schief - dort bewusst keine Nummer.
  driver.glb        Pilzi: Rennbrille - Gummiband rund um den Hut (folgt der Hutform), zwei Glaeser mit Goldrand
                    vorn auf der Krempe, leicht nach oben geklappt.
  driver_robot.glb  Volt: das Visier war fast weiss und ueberstrahlte die LED-Augen - jetzt dunkles Glas mit feinem
                    Glanz, die Augen sind groesser und leuchten, dazu leuchtende Antennenkugel.

Koordinaten: G(x, y, z) nimmt Spielkoordinaten (x rechts, y hoch, z vorwaerts); Export mit +Y oben.
"""
import bpy, bmesh, math, pathlib, shutil, json
from mathutils import Vector, Matrix

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'art' / 'r46'
report = {}


def G(x, y, z):
    return Vector((x, -z, y))


def backup(fn):
    bak = OUT / fn.replace('.glb', '_r45_backup.glb')
    if not bak.exists():
        shutil.copy2(ROOT / 'assets' / fn, bak)
    return bak


def load(*fns):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for fn in fns:
        src = backup(fn) if fn != 'kart.glb' else ROOT / 'assets' / fn
        bpy.ops.import_scene.gltf(filepath=str(src))
    return {o.name: o for o in bpy.data.objects}


def export(fn, objs):
    bad = sorted({m.name for o in objs if o.type == 'MESH' for m in o.data.materials if m and '.' in m.name})
    assert not bad, f'{fn}: umbenannte Materialien {bad}'
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    target = ROOT / 'assets' / fn
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_cameras=False, export_lights=False)
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0
    for o in objs:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            tris += len(me.loop_triangles)
    report[fn] = {'triangles': tris, 'bytes': target.stat().st_size}


def mat(name, color, rough=.5, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
    m.diffuse_color = color
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = color
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = emit
        p.inputs['Emission Strength'].default_value = strength
    return m


def ray(objs, origin, direction):
    """Naechster Treffer (Weltkoordinaten) gegen eine Liste von Mesh-Objekten: (Punkt, Normale) oder None."""
    best = None
    for o in objs:
        inv = o.matrix_world.inverted()
        o_l = inv @ origin
        d_l = (inv.to_3x3() @ direction).normalized()
        ok, loc, nrm, _ = o.ray_cast(o_l, d_l)
        if ok:
            w = o.matrix_world @ loc
            dist = (w - origin).length
            if best is None or dist < best[0]:
                n = (o.matrix_world.inverted().transposed().to_3x3() @ nrm).normalized()
                best = (dist, w, n)
    return None if best is None else (best[1], best[2])


def frame(n, up_hint=Vector((0, 0, 1))):
    """Drehung: lokales +Z auf die Normale n, lokales +Y moeglichst nach oben (Blender-Z)."""
    n = n.normalized()
    up = (up_hint - n * up_hint.dot(n))
    if up.length < 1e-4:
        up = Vector((0, 1, 0)) - n * n.y
    up.normalize()
    right = up.cross(n).normalized()
    return Matrix((right, up, n)).transposed().to_4x4()


def mesh_obj(name, bm, material, parent=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
        ob.matrix_parent_inverse = parent.matrix_world.inverted()
    return ob


def disc(M, rx, ry, depth, seg=20):
    bm = bmesh.new()
    top = [bm.verts.new(M @ Vector((math.cos(a) * rx, math.sin(a) * ry, depth))) for a in (i / seg * 2 * math.pi for i in range(seg))]
    bot = [bm.verts.new(M @ Vector((math.cos(a) * rx, math.sin(a) * ry, 0))) for a in (i / seg * 2 * math.pi for i in range(seg))]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def ring(M, r_out, r_in, depth, seg=20, ry_scale=1.0):
    bm = bmesh.new()
    def pt(r, a, z):
        return M @ Vector((math.cos(a) * r, math.sin(a) * r * ry_scale, z))
    rows = []
    for (r, z) in ((r_out, 0), (r_out, depth), (r_in, depth), (r_in, 0)):
        rows.append([bm.verts.new(pt(r, i / seg * 2 * math.pi, z)) for i in range(seg)])
    for k in range(4):
        a, b = rows[k], rows[(k + 1) % 4]
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def text_mesh(txt, M, size, depth):
    cu = bpy.data.curves.new('num', 'FONT')
    cu.body = txt
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.size = size
    cu.extrude = depth / 2
    cu.bevel_depth = 0
    cu.resolution_u = 2                  # grob genug fuer die kleine Ziffer, spart Dreiecke
    cu.offset = size * .07               # fettere Ziffern (die Standardschrift ist duenn)
    tmp = bpy.data.objects.new('numtmp', cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bm = bmesh.new()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    # Mitte der Glyphen auf den Ursprung, dann auf das Schild setzen
    c = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
    for v in bm.verts:
        v.co = M @ (v.co - Vector((c.x, c.y, -depth / 2)))
    return bm


# ------------------------------------------------------------------ Karts: Startnummern
NUMBERS = {0: '7', 1: '3', 2: '9', 3: '5'}
# Bausatz zuerst laden: sonst bekaemen seine Materialien den Zusatz .001 (BodyPaint.001) und das Spiel faerbte nicht mehr
O = load('kartkit.glb', 'kart.glb')
body = O['K_Body']
white = mat('White', (.96, .96, .94, 1), .4)
dark = mat('Dark', (.075, .08, .1, 1), .55, .2)
gold = mat('Gold', (1, .74, .22, 1), .3, .85)
kit_objs = []
for i in range(4):
    root = O['KX_%d' % i]
    parts = [o for o in root.children if o.type == 'MESH']
    targets = [body] + parts
    num = NUMBERS[i]
    added = []
    # Haube: Strahl von oben auf die Nase
    hit = ray([body], G(0, 2.5, 1.35), Vector((0, 0, -1)))
    if hit:
        p, n = hit
        M = Matrix.Translation(p + n * .004) @ frame(n, up_hint=G(0, 0, 1).normalized())
        added.append(mesh_obj('KX_%d_HoodDisc' % i, disc(M, .17, .17, .014), white, root))
        added.append(mesh_obj('KX_%d_HoodRim' % i, ring(M, .195, .165, .02), gold, root))
        added.append(mesh_obj('KX_%d_HoodNum' % i, text_mesh(num, M @ Matrix.Translation((0, 0, .014)), .23, .01), dark, root))
    # Heck: Nummernschild auf dem aeussersten Teil zwischen den Auspuffrohren (Karosserie oder Bausatz)
    hit = ray(targets, G(0, .56, -3.5), G(0, 0, 1))       # von hinten nach vorn (Spiel +z = Blender -y)
    if hit:
        p, n = hit
        n = Vector((0, n.y, n.z)).normalized() if n.y > .3 else G(0, 0, -1)
        M = Matrix.Translation(p + n * .006) @ frame(n)
        added.append(mesh_obj('KX_%d_Plate' % i, disc(M, .25, .14, .02), white, root))
        added.append(mesh_obj('KX_%d_PlateRim' % i, ring(M, .27, .235, .026, ry_scale=.56), dark, root))
        added.append(mesh_obj('KX_%d_PlateNum' % i, text_mesh(num, M @ Matrix.Translation((0, 0, .02)), .2, .01), dark, root))
    kit_objs += [root] + parts + added
bpy.data.objects.remove(body)
export('kartkit.glb', kit_objs)

# ------------------------------------------------------------------ Pilzi: Rennbrille am Hut
O = load('driver.glb')
cap = O['D_Cap']
drv = [o for o in bpy.data.objects if o.type == 'MESH']
strap_m = mat('Strap', (.12, .1, .12, 1), .7)
glass = mat('Glass', (.35, .75, 1.0, 1), .08, .1, (.2, .55, .9, 1), .35)
gold = mat('Gold', (1, .74, .22, 1), .3, .85)
Y = .95                                   # Hoehe des Bandes (Spiel-y), knapp ueber der Krempe
cmin = Vector((min((cap.matrix_world @ Vector(c)).x for c in cap.bound_box), 0, 0))
ctr = G(0, Y, .07)
pts = []
for k in range(40):
    a = k / 40 * 2 * math.pi
    d = Vector((math.sin(a), -math.cos(a), 0))           # Richtung in Blender (Spiel: x=sin, z=cos)
    hit = ray([cap], ctr + d * 2.0, -d)
    if hit:
        pts.append((hit[0] + hit[1] * .014, hit[1]))
bm = bmesh.new()
lo = [bm.verts.new(p - Vector((0, 0, .035))) for p, _ in pts]
hi = [bm.verts.new(p + Vector((0, 0, .035))) for p, _ in pts]
for k in range(len(pts)):
    j = (k + 1) % len(pts)
    bm.faces.new((lo[k], lo[j], hi[j], hi[k]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces:
    c = f.calc_center_median()
    if f.normal.dot(Vector((c.x - ctr.x, c.y - ctr.y, 0))) < 0:
        f.normal_flip()
strap = mesh_obj('D_GoggleStrap', bm, strap_m, smooth=True)
goggles = [strap]
for side in (-1, 1):
    hit = ray([cap], G(side * .17, Y + .03, 2.0), G(0, 0, -1))
    if not hit:
        continue
    p, n = hit
    n = (n + G(0, .35, 0)).normalized()                 # leicht nach oben geklappt
    M = Matrix.Translation(p + n * .01) @ frame(n)
    goggles.append(mesh_obj('D_GoggleCup%d' % side, disc(M, .105, .09, .06, 22), strap_m))
    goggles.append(mesh_obj('D_GoggleLens%d' % side, disc(M @ Matrix.Translation((0, 0, .061)), .085, .072, .012, 22), glass))
    goggles.append(mesh_obj('D_GoggleRim%d' % side, ring(M @ Matrix.Translation((0, 0, .05)), .112, .085, .025, 22, ry_scale=.86), gold))
export('driver.glb', drv + goggles)

# ------------------------------------------------------------------ Volt: dunkles Visier, groessere LED-Augen
O = load('driver_robot.glb')
robot = [o for o in bpy.data.objects if o.type == 'MESH']
visor = O['D_Visor']
dark_glass = mat('VisorGlass', (.025, .04, .07, 1), .12, .35)
visor.data.materials[0] = dark_glass
led = mat('VoltEye', (.3, .95, 1, 1), .2, 0, (.25, .9, 1, 1), 4.0)
for nm in ('D_Pupil', 'D_Pupil.001'):
    o = O[nm]
    c = sum((o.matrix_world @ v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        w = c + Vector(((w - c).x * 1.3, (w - c).y, (w - c).z * 1.25))
        v.co = o.matrix_world.inverted() @ w
bulb = O['D_Bulb']
bulb.data.materials[0] = mat('BulbGlow', (1, .45, .35, 1), .3, 0, (1, .35, .2, 1), 2.5)
export('driver_robot.glb', robot)

(OUT / 'polish_report.json').write_text(json.dumps(report, indent=1))
print(json.dumps(report))
