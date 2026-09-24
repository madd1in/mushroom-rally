"""Mushroom Rally R39: Fliegenpilz-Drache fuer die Drachen-Achterbahn der Magnet-Kirmes.
Eigenes prozedurales Blender-Modell. Vier Objekte (das Spiel laedt die GLB ohne Materialverschmelzung
und greift sie ueber den Namen):
  DR_Segment  Koerperglied 1,8 m (Laengsachse Blender -Y = glTF +Z), Radius ~2,2 m - wird im Spiel
              entlang der Bahn aufgereiht (Instanzen), zur Schwanzspitze hin verkleinert
  DR_Head     Kopf mit Pilzhut-Krone, Hoernern, Augen, Barthaaren (Blickrichtung -Y = glTF +Z)
  DR_Jaw      Unterkiefer, Drehpunkt im Ursprung (Scharnier) - klappt im Spiel beim Feuerspeien
  DR_TailTip  Schwanzflamme
Materialien: DragonScale (rot), DragonSpot (weiss), DragonBelly (creme), DragonFin (gold),
DragonHorn (elfenbein), DragonEye (leuchtend gelb), DragonMouth (dunkelrot), DragonTooth (weiss).
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix, Euler

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r39'
OUT.mkdir(parents=True, exist_ok=True)
TARGET = ROOT / 'assets' / 'dragon.glb'
SCENE = 'R39_Dragon_Asset'
if bpy.data.scenes.get(SCENE):
    bpy.data.scenes.remove(bpy.data.scenes[SCENE])
# Alte Objekte/Meshes gleichen Namens entfernen, sonst exportiert Blender 'DR_Segment.001' usw.
for ob in [o for o in bpy.data.objects if o.name.startswith('DR_')]:
    bpy.data.objects.remove(ob)
for me in [m for m in bpy.data.meshes if m.name.startswith('DR_') and m.users == 0]:
    bpy.data.meshes.remove(me)
scene = bpy.data.scenes.new(SCENE)
col = bpy.data.collections.new('R39_Dragon_Export')
scene.collection.children.link(col)
bpy.context.window.scene = scene

def material(name, color, rough, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
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

M = {
    'scale': material('DragonScale', (.78, .07, .06, 1), .45, .05),
    'spot': material('DragonSpot', (.97, .95, .9, 1), .6),
    'belly': material('DragonBelly', (1, .84, .55, 1), .55),
    'fin': material('DragonFin', (1, .68, .12, 1), .4, .2),
    'horn': material('DragonHorn', (.96, .92, .8, 1), .5),
    'eye': material('DragonEye', (1, .9, .25, 1), .3, 0, (1, .85, .2, 1), 6.0),
    'mouth': material('DragonMouth', (.35, .02, .05, 1), .7),
    'tooth': material('DragonTooth', (1, 1, .97, 1), .4),
}
KEYS = list(M)

class Part:
    """Sammelt Geometrie je Material fuer ein Objekt."""
    def __init__(self, name):
        self.name, self.bm = name, bmesh.new()
        self.bm.faces.layers.int.new('mat')
    def add(self, key, build):
        before = set(self.bm.faces)
        build(self.bm)
        lay = self.bm.faces.layers.int['mat']
        for f in self.bm.faces:
            if f not in before:
                f[lay] = KEYS.index(key)
    def finish(self, smooth_keys=('scale', 'belly', 'horn', 'eye', 'spot')):
        me = bpy.data.meshes.new(self.name)
        lay = self.bm.faces.layers.int['mat']
        used = sorted({f[lay] for f in self.bm.faces})
        remap = {k: i for i, k in enumerate(used)}
        for k in used:
            me.materials.append(M[KEYS[k]])
        idx = [remap[f[lay]] for f in self.bm.faces]
        smooth = [KEYS[f[lay]] in smooth_keys for f in self.bm.faces]
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for p, i, s in zip(me.polygons, idx, smooth):
            p.material_index = i
            p.use_smooth = s
        ob = bpy.data.objects.new(self.name, me)
        col.objects.link(ob)
        return ob

def xf(bm, verts, M4):
    bmesh.ops.transform(bm, matrix=M4, verts=verts)

def sphere(center, r, scale=(1, 1, 1), seg=16, ring=10, rot=None):
    def b(bm):
        g = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
        M4 = Matrix.Translation(center) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((scale[0] * r, scale[1] * r, scale[2] * r, 1))
        xf(bm, g['verts'], M4)
    return b

def cone(a, b_, r1, r2, seg=10):
    a, b_ = Vector(a), Vector(b_)
    def b(bm):
        d = b_ - a
        g = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        xf(bm, g['verts'], Matrix.Translation((a + b_) / 2) @ q.to_matrix().to_4x4())
    return b

def prism(pts2d, depth, center, rot):
    """Flaches Blatt (Flosse/Zahn) aus 2D-Umriss (x,z), Dicke in y."""
    def b(bm):
        vs1 = [bm.verts.new((x, -depth / 2, z)) for x, z in pts2d]
        vs2 = [bm.verts.new((x, depth / 2, z)) for x, z in pts2d]
        bm.faces.new(vs1)
        bm.faces.new(list(reversed(vs2)))
        n = len(pts2d)
        for i in range(n):
            bm.faces.new((vs1[i], vs1[(i + 1) % n], vs2[(i + 1) % n], vs2[i]))
        xf(bm, vs1 + vs2, Matrix.Translation(center) @ rot.to_matrix().to_4x4())
    return b

R, SEG = 2.2, 1.8
# ---------------- Koerperglied (Laengsachse -Y): Schuppenfass, Bauchplatte, Rueckenflosse, Punkte
seg = Part('DR_Segment')
# Ueberlappendes Ellipsoid (2,6 m lang, im Spiel alle ~1,6 m gesetzt): der Leib wirkt glatt statt
# wie eine Spiralfeder aus offenen Fassringen
seg.add('scale', sphere((0, 0, 0), 1, (R, 1.3, R * .92), 18, 10))
seg.add('belly', sphere((0, 0, -R * .7), 1, (R * .8, 1.15, .5), 14, 8))
seg.add('fin', prism([(-.2, 0), (.9, .15), (.35, 1.25), (-.55, .1)], .14, (0, .2, R * .86), Euler((0, 0, math.pi / 2))))
for a, y, s in ((.6, -.3, .42), (2.3, .35, .34), (3.6, -.2, .4), (5.2, .3, .3)):
    seg.add('spot', sphere((math.cos(a) * R * 1.0, y, math.sin(a) * R * .92), s, (1, 1, .35), 10, 6,
                           rot=Vector((math.cos(a), 0, math.sin(a))).to_track_quat('Z', 'Y')))

# ---------------- Kopf (Blick -Y): Schaedel, Schnauze, Augen, Hoerner, Pilzhut-Krone, Barthaare
head = Part('DR_Head')
head.add('scale', sphere((0, 0, .4), 1, (2.3, 2.6, 2.0), 20, 12))
head.add('scale', sphere((0, -2.6, -.1), 1, (1.6, 2.2, 1.15), 18, 10))
head.add('belly', sphere((0, -2.9, -.75), 1, (1.35, 1.9, .5), 16, 8))
for sx in (-1, 1):
    head.add('eye', sphere((sx * 1.2, -1.4, 1.25), .62, (1, .8, 1), 14, 10))
    head.add('mouth', sphere((sx * 1.28, -1.75, 1.3), .26, (1, .6, 1), 10, 6))
    head.add('mouth', sphere((sx * .55, -4.6, .35), .22, (1, .7, 1), 8, 6))                       # Nuestern
    head.add('horn', cone((sx * .9, .4, 1.9), (sx * 1.9, 2.4, 3.6), .42, .08, 10))              # Hoerner
    head.add('horn', cone((sx * 1.9, 2.4, 3.6), (sx * 2.1, 3.3, 3.2), .1, .03, 6))
    # Barthaare: vier kurze Stuecke, geschwungen nach aussen und hinten
    pts = [Vector((sx * 1.2, -4.3, .1)), Vector((sx * 2.4, -4.0, -.3)), Vector((sx * 3.4, -3.0, -1.0)), Vector((sx * 4.0, -1.6, -1.9)), Vector((sx * 4.2, -.4, -2.5))]
    for k in range(len(pts) - 1):
        head.add('fin', cone(pts[k], pts[k + 1], .13 - k * .025, .1 - k * .025, 6))
    # Kinnlappen/Ohrflossen
    head.add('fin', prism([(0, 0), (1.4, .6), (1.8, -.3), (.6, -.8)], .12, (sx * 2.0, .6, .2), Euler((0, 0, 0 if sx > 0 else math.pi))))
# Pilzhut-Krone: roter Fliegenpilzhut mit weissen Tupfen oben auf dem Kopf
head.add('scale', sphere((0, .3, 2.25), 1, (2.0, 2.0, .85), 18, 10))
head.add('spot', sphere((0, .3, 1.8), 1, (1.7, 1.7, .25), 16, 6))
for a, r_ in ((0, .9), (1.3, 1.1), (2.6, .8), (3.9, 1.05), (5.1, .95), (0, 0)):
    p = Vector((math.cos(a) * r_, .3 + math.sin(a) * r_, 2.25 + .85 * math.sqrt(max(0, 1 - (r_ / 2.0) ** 2)) - .05))
    head.add('spot', sphere(p, .28 if r_ else .34, (1, 1, .4), 10, 6))
# Obere Zahnreihe
for k in range(6):
    x = -1.0 + k * .4
    head.add('tooth', cone((x * 1.0, -4.1 + abs(x) * .6, -.55), (x * 1.0, -4.1 + abs(x) * .6, -1.05), .13, .02, 6))
# Nackenflosse
head.add('fin', prism([(-.2, 0), (1.4, .3), (.6, 1.6), (-.8, .5)], .16, (0, 1.9, 1.5), Euler((0, 0, math.pi / 2))))

# ---------------- Unterkiefer: Scharnier im Ursprung (entspricht Kopfpunkt (0,-1.1,-.7))
jaw = Part('DR_Jaw')
jaw.add('scale', sphere((0, -2.0, -.3), 1, (1.3, 2.1, .55), 16, 8))
jaw.add('mouth', sphere((0, -2.1, .05), 1, (1.05, 1.8, .25), 14, 6))
for k in range(5):
    x = -.8 + k * .4
    jaw.add('tooth', cone((x, -3.6 + abs(x) * .5, .1), (x, -3.6 + abs(x) * .5, .55), .12, .02, 6))

# ---------------- Schwanzflamme
tail = Part('DR_TailTip')
tail.add('fin', prism([(0, 0), (1.2, -.4), (2.6, .3), (1.5, .6), (3.2, 1.6), (1.2, 1.0), (.4, 1.9), (-.3, .8)], .18, (0, 0, 0), Euler((0, 0, -math.pi / 2))))
tail.add('scale', sphere((0, 0, .1), .55, (1, 1.2, 1), 10, 8))

objs = [seg.finish(), head.finish(), jaw.finish(), tail.finish()]
# Vorschau-Anordnung nur in Blender (Export setzt die Objekte am Ursprung ab)
for sc in bpy.data.scenes:
    for vl in sc.view_layers:
        for ob in sc.objects:
            try:
                ob.select_set(False, view_layer=vl)
            except RuntimeError:
                pass
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
tris = 0
for o in objs:
    o.data.calc_loop_triangles()
    tris += len(o.data.loop_triangles)
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_cameras=False, export_lights=False)
report = {'triangles': tris, 'glb_bytes': TARGET.stat().st_size, 'objects': [o.name for o in objs]}
(OUT / 'dragon_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
