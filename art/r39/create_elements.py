"""Mushroom Rally R39: Verwandlungs-Teile und Unterwasser-Deko fuer den Elemente-Parcours.
Eigenes prozedurales Blender-Modell, zwei GLB-Dateien (das Spiel laedt sie ohne Materialverschmelzung
und greift die Teile ueber den Namen):

assets/transform.glb - wird an jedes Kart gehaengt und je nach Element eingeblendet
  TF_Boat       Rennboot-Rumpf (V-Rumpf, Bug mit Pilzpunkten, Duese, Windschutz)
  TF_Dive       Tauch-Kit: Propellerring hinten, Seitenflossen, Rueckenflosse, Scheinwerfer
  TF_DiveProp   Propeller (Ursprung = Nabe, dreht um die Laengsachse)
  TF_Plane      Flugzeug: Tragflaechen mit Pilzpunkten, Leitwerk, Nasenkonus
  TF_PlaneProp  Luftschraube (Ursprung = Nabe)
assets/elements.glb - Deko fuer Seen
  UW_Kelp  Seetang (6 m), UW_Fish Fisch (1 m, Farbe per Instanz), UW_Coral Korallenstock,
  EL_Buoy  Boje mit Licht (Bootsspur)

Koordinaten: Hilfsfunktion G(x, y, z) nimmt Spielkoordinaten (x rechts, y hoch, z vorwaerts) und
gibt Blender-Koordinaten (glTF +Z vorwaerts = Blender -Y). Kart: Raeder bei x +-1,05, z -0,9..1,0.
Materialien mit *Paint werden im Spiel auf die Kartfarbe getoent.
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector, Matrix, Euler

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r39'
SCENE = 'R39_Elements_Asset'
if bpy.data.scenes.get(SCENE):
    bpy.data.scenes.remove(bpy.data.scenes[SCENE])
for ob in [o for o in bpy.data.objects if o.name.startswith(('TF_', 'UW_', 'EL_'))]:
    bpy.data.objects.remove(ob)
for me in [m for m in bpy.data.meshes if m.name.startswith(('TF_', 'UW_', 'EL_')) and m.users == 0]:
    bpy.data.meshes.remove(me)
scene = bpy.data.scenes.new(SCENE)
bpy.context.window.scene = scene
cols = {k: bpy.data.collections.new('R39_' + k) for k in ('transform', 'elements')}
for c in cols.values():
    scene.collection.children.link(c)

def G(x, y, z):
    return Vector((x, -z, y))

def material(name, color, rough, metal=0.0, emit=None, strength=0.0, alpha=1.0):
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
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    return m

M = {
    'boat': material('BoatPaint', (.9, .9, .9, 1), .35, .05),
    'hullw': material('BoatWhite', (.97, .96, .92, 1), .4),
    'dark': material('BoatDark', (.12, .13, .16, 1), .5, .4),
    'metal': material('TFMetal', (.72, .74, .78, 1), .3, .85),
    'glass': material('BoatGlass', (.55, .85, 1, 1), .05, 0, None, 0, .45),
    'dive': material('DivePaint', (.9, .9, .9, 1), .35, .1),
    'glow': material('DiveGlow', (.5, 1, 1, 1), .2, 0, (.45, 1, 1, 1), 5.0),
    'wing': material('WingPaint', (.9, .9, .9, 1), .4, .05),
    'spot': material('WingSpot', (.98, .97, .93, 1), .5),
    'wood': material('PropWood', (.62, .38, .18, 1), .55),
    'kelp': material('KelpPaint', (.2, .62, .3, 1), .6),
    'fish': material('FishPaint', (.95, .95, .95, 1), .45),
    'fin': material('FishFin', (1, .85, .6, 1), .5),
    'eye': material('FishEye', (.05, .05, .08, 1), .2),
    'coral': material('CoralPaint', (1, .5, .6, 1), .7),
    'buoyr': material('BuoyRed', (.9, .12, .1, 1), .45),
    'buoyw': material('BuoyWhite', (.97, .96, .92, 1), .45),
    'light': material('BuoyLight', (1, .9, .5, 1), .2, 0, (1, .85, .4, 1), 6.0),
}
KEYS = list(M)

class Part:
    """Sammelt Geometrie je Material fuer ein Objekt; origin = Spielkoordinate des Objektursprungs."""
    def __init__(self, name, col, origin=(0, 0, 0)):
        self.name, self.col, self.origin = name, col, G(*origin)
        self.bm = bmesh.new()
        self.bm.faces.layers.int.new('mat')
    def add(self, key, build, keep=False):
        before = set(self.bm.faces)
        build(self.bm)
        if keep:            # build() hat die Materialien selbst gesetzt (Rumpf: Baender)
            return
        lay = self.bm.faces.layers.int['mat']
        for f in self.bm.faces:
            if f not in before:
                f[lay] = KEYS.index(key)
    def finish(self, smooth_keys=()):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.transform(self.bm, matrix=Matrix.Translation(-self.origin), verts=self.bm.verts)
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
        ob.location = self.origin
        self.col.objects.link(ob)
        return ob

def xf(bm, verts, M4):
    bmesh.ops.transform(bm, matrix=M4, verts=verts)

def sphere(center, r, scale=(1, 1, 1), seg=14, ring=9):
    """Kugel/Ellipsoid in Spielkoordinaten (scale = x, y, z im Spiel)."""
    def b(bm):
        g = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
        xf(bm, g['verts'], Matrix.Translation(G(*center)) @ Matrix.Diagonal((scale[0] * r, scale[2] * r, scale[1] * r, 1)))
    return b

def cyl(a, b_, r1, r2, seg=12):
    a, b_ = G(*a), G(*b_)
    def b(bm):
        d = b_ - a
        g = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        xf(bm, g['verts'], Matrix.Translation((a + b_) / 2) @ q.to_matrix().to_4x4())
    return b

def slab(outline, thick, center, rot=(0, 0, 0)):
    """Flache Platte aus 2D-Umriss (u, v) in der Spiel-xz-Ebene, Dicke in y; rot in Grad um Spielachsen."""
    def b(bm):
        top = [bm.verts.new((u, v, thick / 2)) for u, v in outline]
        bot = [bm.verts.new((u, v, -thick / 2)) for u, v in outline]
        bm.faces.new(top)
        bm.faces.new(list(reversed(bot)))
        n = len(outline)
        for i in range(n):
            bm.faces.new((top[i], bot[i], bot[(i + 1) % n], top[(i + 1) % n]))
        # lokal (u = Spiel-x, v = Spiel-z, w = Spiel-y) -> Blender (x, -z, y)
        to_b = Matrix(((1, 0, 0, 0), (0, -1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)))
        rx, ry, rz = (math.radians(a) for a in rot)
        R = Euler((rx, -rz, ry), 'XYZ').to_matrix().to_4x4()
        xf(bm, top + bot, Matrix.Translation(G(*center)) @ R @ to_b)
    return b

def torus(center, R, r, axis='z', seg=20, rseg=8):
    def b(bm):
        verts = []
        rings = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            ring = []
            for j in range(rseg):
                t = 2 * math.pi * j / rseg
                x, y = (R + r * math.cos(t)) * math.cos(a), (R + r * math.cos(t)) * math.sin(a)
                z = r * math.sin(t)
                ring.append(bm.verts.new((x, y, z)))
            rings.append(ring)
        for i in range(seg):
            for j in range(rseg):
                a, b2 = rings[i], rings[(i + 1) % seg]
                bm.faces.new((a[j], b2[j], b2[(j + 1) % rseg], a[(j + 1) % rseg]))
        # Ring liegt in der lokalen xy-Ebene (Achse z) -> Spiel-Laengsachse z = Blender -Y
        rot = Matrix.Rotation(math.pi / 2, 4, 'X') if axis == 'z' else Matrix()
        xf(bm, [v for rg in rings for v in rg], Matrix.Translation(G(*center)) @ rot)
    return b

def loft(sections, keys):
    """Rumpf aus Querschnitten: sections = [(z, [(x, y), ...])], gleiche Punktzahl je Schnitt; keys[i]
    = Material des Bandes zwischen Punkt i und i+1. Enden werden geschlossen."""
    def b(bm):
        rows = [[bm.verts.new(G(x, y, z)) for x, y in pts] for z, pts in sections]
        n = len(rows[0])
        faces = []
        for r0, r1 in zip(rows, rows[1:]):
            for i in range(n):
                f = bm.faces.new((r0[i], r0[(i + 1) % n], r1[(i + 1) % n], r1[i]))
                faces.append((f, i))
        bm.faces.new(list(reversed(rows[0])))
        bm.faces.new(rows[-1])
        lay = bm.faces.layers.int['mat']
        return faces
    return b

# ---------------- TF_Boat: V-Rumpf mit Bug, Duese und Windschutz
boat = Part('TF_Boat', cols['transform'])
def hull_section(w, top, chine, keel):
    return [(-w, top), (-w * .93, chine), (0, keel), (w * .93, chine), (w, top)]
secs = [(-2.0, hull_section(1.28, .66, .16, -.12)), (-1.2, hull_section(1.34, .66, .12, -.2)), (0, hull_section(1.36, .66, .1, -.26)),
        (1.05, hull_section(1.2, .7, .18, -.18)), (1.75, hull_section(.82, .78, .34, .02)), (2.3, hull_section(.18, .88, .62, .42))]
def hull_build(bm):
    lay = bm.faces.layers.int['mat']
    rows = [[bm.verts.new(G(x, y, z)) for x, y in pts] for z, pts in secs]
    n = len(rows[0])
    for r0, r1 in zip(rows, rows[1:]):
        for i in range(n):
            f = bm.faces.new((r0[i], r0[(i + 1) % n], r1[(i + 1) % n], r1[i]))
            # Band 0 und 3: Bordwand, 4: Deck (Kartfarbe); 1 und 2: Unterwasserschiff (weiss)
            f[lay] = KEYS.index('hullw' if i in (1, 2) else 'boat')
    f = bm.faces.new(list(reversed(rows[0])))
    f[lay] = KEYS.index('dark')
    f = bm.faces.new(rows[-1])
    f[lay] = KEYS.index('boat')
boat.add('hullw', hull_build, keep=True)
# Duese hinten, Pilzpunkte am Bug, Windschutz, Scheuerleiste
boat.add('dark', cyl((0, .28, -2.0), (0, .28, -2.45), .34, .26, 14))
boat.add('metal', cyl((0, .28, -2.42), (0, .28, -2.52), .27, .3, 14))
for x, y, z, r in ((.55, .78, 1.55, .17), (-.5, .8, 1.7, .13), (.2, .84, 1.95, .1), (-.95, .72, 1.1, .12), (.98, .71, .95, .1)):
    boat.add('hullw', sphere((x, y, z), r, (1, .28, 1), 10, 5))
boat.add('glass', slab([(-.8, 0), (.8, 0), (.6, .38), (-.6, .38)], .05, (0, .98, 1.05), (-62, 0, 0)))
boat.add('dark', cyl((-1.38, .66, -1.9), (-1.38, .66, 1.1), .06, .06, 6))
boat.add('dark', cyl((1.38, .66, -1.9), (1.38, .66, 1.1), .06, .06, 6))
boat.finish()

# ---------------- TF_Dive: Propellerring, Flossen, Scheinwerfer; TF_DiveProp an der Nabe
dive = Part('TF_Dive', cols['transform'])
PROP_D = (0, .78, -2.05)
dive.add('dive', torus(PROP_D, .56, .09, 'z', 22, 8))
for a in (0, 120, 240):
    t = math.radians(a)
    dive.add('metal', cyl((PROP_D[0], PROP_D[1], PROP_D[2] + .12), (PROP_D[0] + math.sin(t) * .52, PROP_D[1] + math.cos(t) * .52, PROP_D[2] + .02), .035, .035, 6))
dive.add('dark', cyl((0, .78, -1.62), (0, .78, -1.98), .16, .12, 12))
for s in (-1, 1):
    dive.add('dive', slab([(0, .55), (.95 * s, -.35), (.95 * s, -.62), (0, -.3)], .07, (1.02 * s, .52, -.1), (0, 0, 8 * s)))
    dive.add('glow', sphere((.62 * s, .74, 1.62), .14, (1, 1, .6), 10, 6))
dive.add('dive', slab([(0, .5), (0, -.55), (.0, -.55)], .06, (0, 1.2, -1.25), (0, 0, 90)))
dive.add('dive', slab([(-.03, -.6), (.03, -.6), (.03, .35), (-.03, .5)], .5, (0, 1.2, -1.3), (0, 0, 0)))
dive.finish()
prop = Part('TF_DiveProp', cols['transform'], origin=PROP_D)
prop.add('metal', sphere(PROP_D, .12, (1, 1, 1.4), 10, 6))
for a in (0, 120, 240):
    t = math.radians(a)
    cx, cy = PROP_D[0] + math.sin(t) * .27, PROP_D[1] + math.cos(t) * .27
    prop.add('glow', slab([(-.09, -.2), (.1, -.2), (.08, .2), (-.07, .2)], .03, (cx, cy, PROP_D[2]), (90, 0, -a + 25)))
prop.finish()

# ---------------- TF_Plane: Tragflaechen, Leitwerk, Nase; TF_PlaneProp an der Nabe
plane = Part('TF_Plane', cols['transform'])
wing = [(-.05, .55), (2.55, .35), (2.95, .15), (2.95, -.2), (2.6, -.38), (-.05, -.45)]
for s in (-1, 1):
    pts = [(x * s, z) for x, z in wing]
    if s < 0:
        pts = list(reversed(pts))
    plane.add('wing', slab(pts, .14, (0, .82, .1), (0, 0, -6 * s)))
    for x, z, r in ((1.2, .1, .22), (2.1, -.02, .17), (2.65, .05, .11)):
        plane.add('spot', sphere((x * s, .92 + .1 * (x / 2.9), .1 + z), r, (1, .18, 1), 10, 4))
    plane.add('metal', cyl((.95 * s, .5, .2), (1.35 * s, .86, .1), .045, .045, 6))
# Leitwerk: Hoehenruder und Seitenflosse am Heck
plane.add('wing', slab([(-1.15, -.1), (1.15, -.1), (1.0, -.5), (-1.0, -.5)], .09, (0, 1.15, -1.55)))
plane.add('wing', slab([(0, .15), (0, -.55), (.0, -.55)], .06, (0, 1.4, -1.7), (0, 0, 90)))
plane.add('wing', slab([(-.03, -.5), (.03, -.5), (.03, .1), (-.03, .3)], .95, (0, 1.62, -1.72)))
plane.add('spot', sphere((0, 1.95, -1.75), .12, (.3, 1, 1), 8, 5))
PROP_P = (0, .72, 2.0)
plane.add('metal', cyl((0, .72, 1.55), (0, .72, 1.95), .3, .2, 14))
plane.finish()
pprop = Part('TF_PlaneProp', cols['transform'], origin=PROP_P)
pprop.add('boat', sphere(PROP_P, .17, (1, 1, 1.5), 12, 7))
for a in (0, 180):
    t = math.radians(a)
    pprop.add('wood', slab([(-.1, -.55), (.1, -.55), (.12, .55), (-.12, .55)], .04, (math.sin(t) * .5, PROP_P[1] + math.cos(t) * .5, PROP_P[2] + .05), (90, 0, a + 12)))
pprop.finish()

# ---------------- Unterwasser-Deko
kelp = Part('UW_Kelp', cols['elements'])
for i in range(9):
    y = .4 + i * .66
    sway = math.sin(i * .9) * .35
    kelp.add('kelp', cyl((sway * .6, y - .35, 0), (sway, y + .35, 0), .07, .06, 6))
    for s in (-1, 1):
        kelp.add('kelp', slab([(0, 0), (.62 * s, .22), (.9 * s, .05), (.6 * s, -.12)], .03, (sway, y, 0), (0, 25 * s + i * 20, 35 * s)))
kelp.add('kelp', sphere((math.sin(8.1) * .35, 6.4, 0), .16, (1, 1.6, 1), 8, 5))
kelp.finish()

fish = Part('UW_Fish', cols['elements'])
fish.add('fish', sphere((0, 0, 0), .5, (.55, .75, 1), 12, 8))
fish.add('fin', slab([(0, 0), (-.34, -.42), (.34, -.42)], .05, (0, 0, -.45), (0, 0, 90)))
fish.add('fin', slab([(0, .18), (-.05, -.25), (.05, -.25)], .3, (0, .38, -.05), (0, 0, 0)))
for s in (-1, 1):
    fish.add('eye', sphere((.2 * s, .12, .3), .065, (1, 1, 1), 8, 5))
    fish.add('fin', slab([(0, .05), (.28 * s, -.18), (.12 * s, -.22)], .03, (.24 * s, -.1, .05), (0, 0, 20 * s)))
fish.finish(smooth_keys=('fish',))

coral = Part('UW_Coral', cols['elements'])
def branch(p, d, L, r, depth):
    q = (p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L)
    coral.add('coral', cyl(p, q, r, r * .72, 7))
    if depth > 0:
        for k, (dx, dz) in enumerate(((.55, .2), (-.5, .35), (.1, -.6))):
            nd = Vector((d[0] + dx, d[1], d[2] + dz)).normalized()
            branch(q, tuple(nd), L * .72, r * .72, depth - 1)
    else:
        coral.add('coral', sphere(q, r * 1.25, (1, 1, 1), 8, 5))
branch((0, 0, 0), (0, 1, 0), 1.1, .2, 2)
branch((.5, 0, .3), (.3, 1, .1), .8, .15, 1)
coral.finish()

buoy = Part('EL_Buoy', cols['elements'])
buoy.add('buoyr', cyl((0, -.5, 0), (0, .25, 0), .55, .62, 16))
buoy.add('buoyw', cyl((0, .25, 0), (0, .75, 0), .62, .45, 16))
buoy.add('buoyr', cyl((0, .75, 0), (0, 1.3, 0), .45, .3, 16))
buoy.add('dark', cyl((0, 1.3, 0), (0, 1.75, 0), .06, .06, 6))
buoy.add('light', sphere((0, 1.85, 0), .16, (1, 1, 1), 10, 6))
buoy.finish(smooth_keys=('light',))

def export(colname, target):
    objs = list(cols[colname].objects)
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
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_cameras=False, export_lights=False)
    return {'file': target.name, 'triangles': tris, 'bytes': target.stat().st_size, 'objects': sorted(o.name for o in objs)}

report = [export('transform', ROOT / 'assets' / 'transform.glb'), export('elements', ROOT / 'assets' / 'elements.glb')]
(OUT / 'elements_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
