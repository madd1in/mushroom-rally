"""Mushroom Rally R43: neue Kart-Karosserie, neue Raeder und ein Bausatz je Fahrer (eigenes prozedurales Blender-Modell).
Aufruf (Kommandozeile): blender -b --factory-startup --python art/r43/create_karts.py
Export:
  assets/kart.glb       Grundkarosserie (gerundete Wanne, Frontfluegel statt Rammrohr, Scheinwerfer,
                        Seitenkaesten mit Lufteinlass, Motorblock, Auspuff, Radaufhaengung, Sitz, Lenkrad)
  assets/kartwheel.glb  Rad mit Profilbloecken, Flankenring und Fuenfspeichen-Felge
  assets/kartkit.glb    KX_0 Pilzi (Pilzhut-Spoiler), KX_1 Schildi (Panzerplatten, Rammschild),
                        KX_2 Volt (Raketenbooster, Blitzfinne), KX_3 Mochi (Katzenohr-Fluegel, Schwanzantenne)
Koordinaten: G(x, y, z) nimmt Spielkoordinaten (x rechts, y hoch, z vorwaerts); glTF-Export mit +Y oben.
Radpositionen, Fahrerplatz (0, .95, -.35), Auspuffflammen (+-.45, .72, -1.72) und Bremslichter
(+-.62, .62, -1.6) bleiben wie im Spiel (game.js), nur die Form wird neu gebaut.
"""
import bpy, bmesh, math, pathlib, json, shutil
from mathutils import Vector, Matrix

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
OUT = ROOT / 'art' / 'r43'
OUT.mkdir(parents=True, exist_ok=True)
for fn in ('kart.glb', 'kartwheel.glb'):
    bak = OUT / fn.replace('.glb', '_r42_backup.glb')
    if not bak.exists():
        shutil.copy2(ROOT / 'assets' / fn, bak)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def G(x, y, z):
    return Vector((x, -z, y))

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
    'BodyPaint': material('BodyPaint', (1, 1, 1, 1), .32, .15),
    'Dark': material('Dark', (.075, .08, .1, 1), .55, .2),
    'Rim': material('Rim', (.72, .75, .8, 1), .28, .85),
    'Gold': material('Gold', (1, .74, .22, 1), .3, .85),
    'White': material('White', (.96, .96, .94, 1), .4),
    'Seat': material('Seat', (.2, .16, .15, 1), .75),
    'Tire': material('Tire', (.06, .06, .07, 1), .9),
    'Cream': material('Cream', (.98, .9, .72, 1), .6),
    'Pink': material('Pink', (1, .55, .66, 1), .55),
    'KartLight': material('KartLight', (1, .97, .82, 1), .2, 0, (1, .93, .7, 1), 2.2),
    'VoltGlow': material('VoltGlow', (.3, .95, 1, 1), .2, 0, (.25, .9, 1, 1), 3.0),
}
KEYS = list(M)
EXPORT = bpy.data.collections.new('R43_Export')
scene.collection.children.link(EXPORT)

class Part:
    """Ein Objekt aus mehreren bmesh-Bausteinen, Material je Baustein; smooth je Materialschluessel oder je Aufruf."""
    def __init__(self, name, parent=None):
        self.name, self.parent = name, parent
        self.bm = bmesh.new()
        self.lay = self.bm.faces.layers.int.new('mat')
        self.sm = self.bm.faces.layers.int.new('sm')
    def add(self, key, build, smooth=True):
        before = set(self.bm.faces)
        build(self.bm)
        for f in self.bm.faces:
            if f not in before:
                f[self.lay] = KEYS.index(key)
                f[self.sm] = 1 if smooth else 0
        return self
    def finish(self):
        me = bpy.data.meshes.new(self.name)
        used = sorted({f[self.lay] for f in self.bm.faces})
        remap = {k: i for i, k in enumerate(used)}
        for k in used:
            me.materials.append(M[KEYS[k]])
        idx = [remap[f[self.lay]] for f in self.bm.faces]
        sm = [f[self.sm] for f in self.bm.faces]
        self.bm.to_mesh(me)
        self.bm.free()
        for p, i, s in zip(me.polygons, idx, sm):
            p.material_index = i
            p.use_smooth = bool(s)
        ob = bpy.data.objects.new(self.name, me)
        EXPORT.objects.link(ob)
        if self.parent:
            ob.parent = self.parent
        return ob

def xf(bm, verts, M4):
    bmesh.ops.transform(bm, matrix=M4, verts=verts)

def fix_normals(bm, faces, center):
    """Normalen nach aussen (vom Mittelpunkt weg) - recalc_face_normals scheitert an offenen Streifen."""
    for f in faces:
        if (f.calc_center_median() - center).dot(f.normal) < 0:
            f.normal_flip()

def superellipse(a, hw, hh, n):
    c, s = math.cos(a), math.sin(a)
    return (hw * math.copysign(abs(c) ** (2 / n), c), hh * math.copysign(abs(s) ** (2 / n), s))

def loft(sections, seg=28, cap=True, axis='z'):
    """Schlauch aus Superellipsen-Querschnitten. sections: (t, hw, yb, yt, n[, xc]) entlang Spiel-z (axis='z')
    bzw. Spiel-x (axis='x', dann ist hw die halbe Tiefe in z und xc der z-Mittelpunkt)."""
    def b(bm):
        rings = []
        for sec in sections:
            t, hw, yb, yt, n = sec[:5]
            c0 = sec[5] if len(sec) > 5 else 0.0
            ym, hh = (yb + yt) / 2, (yt - yb) / 2
            ring = []
            for i in range(seg):
                u, v = superellipse(2 * math.pi * i / seg, hw, hh, n)
                if axis == 'z':
                    ring.append(bm.verts.new(G(c0 + u, ym + v, t)))
                else:
                    ring.append(bm.verts.new(G(t, ym + v, c0 + u)))
            rings.append(ring)
        ctrs = [sum((v.co for v in r), Vector()) / seg for r in rings]
        for k, (r0, r1) in enumerate(zip(rings, rings[1:])):
            ref = (ctrs[k] + ctrs[k + 1]) / 2
            for i in range(seg):
                j = (i + 1) % seg
                f = bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
                if (f.calc_center_median() - ref).dot(f.normal) < 0:
                    f.normal_flip()
        if cap:
            for k, ring in ((0, rings[0]), (len(rings) - 1, rings[-1])):
                cv = bm.verts.new(ctrs[k])
                out = ctrs[k] - ctrs[1 if k == 0 else k - 1]
                for i in range(seg):
                    f = bm.faces.new((ring[i], ring[(i + 1) % seg], cv))
                    if f.normal.dot(out) < 0:
                        f.normal_flip()
    return b

def cyl(a, b_, r1, r2, seg=16, caps=True):
    a, b_ = G(*a), G(*b_)
    def b(bm):
        d = b_ - a
        g = bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        xf(bm, g['verts'], Matrix.Translation((a + b_) / 2) @ q.to_matrix().to_4x4())
    return b

def rbox(center, size, bevel=.04, segs=2, rot=(0, 0, 0)):
    """Gerundeter Quader; rot = Drehung um Spiel-x, -y, -z in Radiant."""
    def b(bm):
        g = bmesh.ops.create_cube(bm, size=1)
        vs = g['verts']
        xf(bm, vs, Matrix.Diagonal((size[0], size[2], size[1], 1)))
        edges = list({e for v in vs for e in v.link_edges})
        if bevel > 0:
            bmesh.ops.bevel(bm, geom=vs + edges, offset=bevel, offset_type='OFFSET', segments=segs, profile=.5, affect='EDGES', clamp_overlap=True)
    def build(bm):
        before = set(bm.verts)
        b(bm)
        new = [v for v in bm.verts if v not in before]
        R = Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(-rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
        # Spiel-x -> Blender x, Spiel-y -> Blender z, Spiel-z -> Blender -y
        Rg = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
        xf(bm, new, Matrix.Translation(G(*center)) @ Rg @ R @ Rg.inverted())
    return build

def sphere(center, r, scale=(1, 1, 1), seg=16, ring=10, rot=None):
    def b(bm):
        before = set(bm.verts)
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
        new = [v for v in bm.verts if v not in before]
        S = Matrix.Diagonal((scale[0] * r, scale[2] * r, scale[1] * r, 1))
        R = rot.to_4x4() if rot is not None else Matrix.Identity(4)
        xf(bm, new, Matrix.Translation(G(*center)) @ R @ S)
    return b

def torus(center, R, r, normal, seg=24, rseg=8, arc=(0, 2 * math.pi), up=None):
    """Ring um die Achse normal (Spielkoordinaten), optional nur ein Bogen."""
    def b(bm):
        n = G(*normal).normalized()
        u = (G(*up) if up else (Vector((0, 0, 1)) if abs(n.z) < .9 else Vector((1, 0, 0)))).cross(n).normalized()
        w = n.cross(u)
        c = G(*center)
        full = abs(arc[1] - arc[0] - 2 * math.pi) < 1e-6
        steps = seg if full else seg + 1
        rings = []
        for i in range(steps):
            a = arc[0] + (arc[1] - arc[0]) * i / seg
            d = u * math.cos(a) + w * math.sin(a)
            ring = []
            for j in range(rseg):
                t = 2 * math.pi * j / rseg
                ring.append(bm.verts.new(c + d * (R + r * math.cos(t)) + n * (r * math.sin(t))))
            rings.append(ring)
        pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if full else [])
        faces = []
        for r0, r1 in pairs:
            for j in range(rseg):
                k = (j + 1) % rseg
                faces.append(bm.faces.new((r0[j], r1[j], r1[k], r0[k])))
        if not full:
            faces.append(bm.faces.new(list(reversed(rings[0]))))
            faces.append(bm.faces.new(rings[-1]))
        for f in faces[:len(pairs) * rseg]:
            fc = f.calc_center_median()
            # naechster Punkt auf dem Mittelkreis
            p = fc - c
            p = p - n * p.dot(n)
            if p.length > 1e-6:
                p = c + p.normalized() * R
            if (fc - p).dot(f.normal) < 0:
                f.normal_flip()
        for f in faces[len(pairs) * rseg:]:
            pass
    return b

def disc(center, r, normal, seg=20, depth=.02):
    """Flache Scheibe (kurzer Zylinder) mit Achse normal."""
    c = Vector(center)
    n = Vector(normal).normalized()
    return cyl(tuple(c - n * depth / 2), tuple(c + n * depth / 2), r, r, seg)

def tube(points, r, seg=8, caps=True):
    """Rohr entlang einer Punktliste (Spielkoordinaten)."""
    def b(bm):
        P = [G(*p) for p in points]
        rings = []
        prev_u = None
        for i, p in enumerate(P):
            t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
            if prev_u is None:
                ref = Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0))
                u = ref.cross(t).normalized()
            else:
                u = (prev_u - t * prev_u.dot(t)).normalized()
            prev_u = u
            w = t.cross(u)
            rings.append([bm.verts.new(p + (u * math.cos(2 * math.pi * j / seg) + w * math.sin(2 * math.pi * j / seg)) * r) for j in range(seg)])
        for k, (r0, r1) in enumerate(zip(rings, rings[1:])):
            for j in range(seg):
                jj = (j + 1) % seg
                f = bm.faces.new((r0[j], r1[j], r1[jj], r0[jj]))
                if (f.calc_center_median() - (P[k] + P[k + 1]) / 2).dot(f.normal) < 0:
                    f.normal_flip()
        if caps:
            for ring, pc, sgn in ((rings[0], P[0], -1), (rings[-1], P[-1], 1)):
                cv = bm.verts.new(pc)
                for j in range(seg):
                    f = bm.faces.new((ring[j], ring[(j + 1) % seg], cv))
                    tt = (P[1] - P[0]) if sgn < 0 else (P[-1] - P[-2])
                    if f.normal.dot(tt) * sgn < 0:
                        f.normal_flip()
    return b

def prism(poly, x0, x1):
    """Flaches Profil (Liste (z, y)) quer zur Fahrtrichtung von x0 bis x1 extrudiert."""
    def b(bm):
        a = [bm.verts.new(G(x0, y, z)) for z, y in poly]
        c = [bm.verts.new(G(x1, y, z)) for z, y in poly]
        n = len(poly)
        fs = [bm.faces.new(a), bm.faces.new(list(reversed(c)))]
        for i in range(n):
            j = (i + 1) % n
            fs.append(bm.faces.new((a[i], a[j], c[j], c[i])))
        cen = sum((v.co for v in a + c), Vector()) / (2 * n)
        fix_normals(bm, fs, cen)
    return b

def side_prism(poly, x0, x1):
    """Profil (Liste (z, y)) als Platte in der Seitenebene: von x0 bis x1 dick."""
    return prism(poly, x0, x1)

def airfoil(x0, x1, zc, yc, chord, thick, sweep=0.0, twist=0.0, seg=14, n=2.4):
    """Fluegel quer (entlang x) mit tropfenfoermigem Profil."""
    def b(bm):
        prof = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            u, v = superellipse(a, chord / 2, thick / 2, n)
            # Tropfen: hintere Haelfte duenner
            if u < 0:
                v *= .55 + .45 * (1 + u / (chord / 2))
            prof.append((u, v))
        rings = []
        steps = 6
        for k in range(steps + 1):
            x = x0 + (x1 - x0) * k / steps
            s = abs(x) * sweep
            ring = []
            for u, v in prof:
                ring.append(bm.verts.new(G(x, yc + v + u * twist, zc + u - s)))
            rings.append(ring)
        fs = []
        for r0, r1 in zip(rings, rings[1:]):
            for i in range(seg):
                j = (i + 1) % seg
                fs.append(bm.faces.new((r0[i], r0[j], r1[j], r1[i])))
        fs.append(bm.faces.new(rings[0]))
        fs.append(bm.faces.new(list(reversed(rings[-1]))))
        for f in fs:
            fc = f.calc_center_median()
            # Bezugspunkt: Profilmitte bei gleichem x
            ref = Vector((fc.x, -(zc - abs(fc.x) * sweep), yc))
            if abs(f.normal.x) > .9:
                ref = Vector((0, fc.y, fc.z))
            if (fc - ref).dot(f.normal) < 0:
                f.normal_flip()
    return b

# ============================================================== Grundkarosserie
# Hoehe der Wannen-Oberkante entlang z (fuer Zierstreifen und Anbauteile)
TUB = [  # z, halbe Breite, Unterkante, Oberkante, Rundung
    (1.97, .24, .42, .58, 2.4),
    (1.86, .44, .38, .66, 2.6),
    (1.62, .58, .35, .74, 2.8),
    (1.20, .66, .34, .80, 3.0),
    (.70, .74, .34, .85, 3.2),
    (.40, .76, .34, .84, 3.4),
    (.22, .78, .34, .70, 3.6),
    (-.20, .80, .34, .66, 3.8),
    (-.80, .80, .34, .66, 3.8),
    (-1.00, .78, .34, .80, 3.4),
    (-1.36, .70, .35, .82, 3.0),
    (-1.56, .56, .38, .76, 2.6),
    (-1.64, .40, .42, .68, 2.4),
]
def tub_top(z):
    for (z0, _, _, t0, _), (z1, _, _, t1, _) in zip(TUB, TUB[1:]):
        if z1 <= z <= z0:
            k = (z - z0) / (z1 - z0)
            return t0 + (t1 - t0) * k
    return TUB[-1][3]

kart = Part('K_Body')
kart.add('BodyPaint', loft([(z, hw, yb, yt, n) for z, hw, yb, yt, n in TUB], seg=32))
# Unterboden (dunkel) und Splitter
kart.add('Dark', rbox((0, .31, .05), (1.46, .07, 3.25), .03))
# Cockpit-Seitenwangen links/rechts: heben den Rand um den Sitz
for s in (-1, 1):
    kart.add('BodyPaint', loft([
        (.30, .10, .56, .80, 2.4, s * .66),
        (.10, .13, .52, .90, 2.6, s * .67),
        (-.40, .14, .52, .92, 2.8, s * .68),
        (-.85, .13, .52, .90, 2.6, s * .67),
        (-1.02, .10, .56, .82, 2.4, s * .66)], seg=16))
# Zierstreifen (weiss) auf der Haube, folgt der Wannenoberkante
def hood_stripe(bm):
    zs = [1.92 - i * .08 for i in range(18)]
    left, right = [], []
    for z in zs:
        y = tub_top(z) + .006
        w = .16 if z < 1.8 else .16 * (1 - (z - 1.8) / .25)
        left.append(bm.verts.new(G(-w, y, z)))
        right.append(bm.verts.new(G(w, y, z)))
    for i in range(len(zs) - 1):
        f = bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
        if f.normal.z < 0:
            f.normal_flip()
kart.add('White', hood_stripe)
# Emblem auf der Haube: weisse Scheibe mit dunklem Rand und Pilz-Silhouette
hz = 1.02
hy = tub_top(hz)
kart.add('Dark', cyl((0, hy - .02, hz), (0, hy + .02, hz), .25, .25, 28))
kart.add('White', cyl((0, hy - .01, hz), (0, hy + .032, hz), .21, .21, 28))
kart.add('BodyPaint', sphere((0, hy + .03, hz + .03), .15, (1, .25, .75), 16, 6))
kart.add('Dark', rbox((0, hy + .04, hz - .08), (.07, .02, .1), .01, 1))
# Scheinwerfer: Chromring und leuchtende Linse auf der Nasenschraege
for s in (-1, 1):
    x, y, z = s * .33, .63, 1.80
    nrm = Vector((s * .25, .35, 1)).normalized()
    c = Vector((x, y, z))
    kart.add('Rim', disc(tuple(c), .13, tuple(nrm), 20, .06))
    kart.add('KartLight', disc(tuple(c + nrm * .02), .10, tuple(nrm), 20, .04))
# Frontfluegel statt Rammrohr: flaches Profil, dunkle Endplatten, zwei Halter
kart.add('BodyPaint', airfoil(-1.1, 1.1, 1.86, .43, .34, .07, sweep=.06, seg=12))
for s in (-1, 1):
    kart.add('Dark', side_prism([(1.62, .32), (2.06, .32), (2.06, .44), (1.98, .58), (1.70, .60), (1.60, .50)], s * 1.10, s * 1.16))
    kart.add('Dark', rbox((s * .34, .47, 1.84), (.06, .12, .2), .015, 1))
# Seitenkaesten zwischen den Raedern: Lufteinlass vorne, weisser Ring
for s in (-1, 1):
    pod = [(.52, .08, .45, .58, 2.4, s * .93), (.46, .16, .38, .68, 2.8, s * .95), (.30, .20, .36, .72, 3.0, s * .96),
           (-.10, .21, .36, .73, 3.2, s * .96), (-.26, .19, .37, .70, 3.0, s * .95), (-.36, .13, .40, .64, 2.6, s * .94)]
    kart.add('BodyPaint', loft(pod, seg=20))
    kart.add('White', loft([(.10, .215, .355, .735, 3.2, s * .96), (-.04, .215, .355, .735, 3.2, s * .96)], seg=20, cap=False))
    kart.add('Dark', loft([(.53, .05, .47, .56, 2.4, s * .93), (.49, .11, .42, .63, 2.6, s * .95)], seg=16))
    # Radaufhaengung: je zwei Lenker zu Vorder- und Hinterrad
    for (z, y, x0) in ((1.0, .42, .62), (-.9, .48, .72)):
        kart.add('Dark', cyl((s * x0, y + .07, z), (s * .86, y + .05, z), .028, .028, 8))
        kart.add('Dark', cyl((s * x0, y - .09, z), (s * .86, y - .05, z), .028, .028, 8))
        kart.add('Rim', cyl((s * (x0 - .04), y, z), (s * .84, y, z), .05, .05, 10))
# Sitz mit Wangen
kart.add('Seat', rbox((0, .70, -.42), (.66, .12, .70), .05))
kart.add('Seat', rbox((0, .96, -.84), (.68, .52, .15), .06, 2, rot=(-.22, 0, 0)))
for s in (-1, 1):
    kart.add('Seat', rbox((s * .36, .88, -.60), (.12, .34, .50), .05, 2, rot=(-.1, 0, 0)))
# Lenkung: Saeule, Lenkrad (Ring + zwei Speichen), goldene Nabe
kart.add('Dark', cyl((0, .80, .74), (0, 1.00, .52), .035, .035, 8))
tilt = Vector((0, .62, -.78)).normalized()   # Lenkradachse zeigt schraeg zum Fahrer
wc = (0, 1.02, .50)
kart.add('Dark', torus(wc, .2, .032, tuple(tilt), 24, 8, up=(1, 0, 0)))
kart.add('Gold', disc(wc, .06, tuple(tilt), 14, .05))
for s in (-1, 1):
    kart.add('Dark', cyl(wc, (s * .19, 1.02, .50), .022, .022, 6))
# Heck: Motorblock (Chrom) mit Kuehlrippen, Luftfilter, Auspuffrohre zu den Flammenpunkten
kart.add('Rim', rbox((0, .82, -1.28), (.74, .30, .46), .06))
for i in range(5):
    kart.add('Dark', rbox((-.28 + i * .14, 1.0, -1.28), (.05, .08, .40), .015, 1))
for s in (-1, 1):
    kart.add('Rim', sphere((s * .40, .96, -1.14), .09, (1, .7, 1), 12, 6))
    kart.add('Rim', tube([(s * .28, .74, -1.40), (s * .38, .72, -1.52), (s * .45, .72, -1.62), (s * .45, .72, -1.70)], .07, 10, caps=False))
    kart.add('Dark', cyl((s * .45, .72, -1.66), (s * .45, .72, -1.76), .085, .075, 12))
    # Rueckleuchten-Gehaeuse unter den Bremslicht-Quads
    kart.add('Dark', rbox((s * .62, .62, -1.52), (.26, .15, .1), .03, 1))
# Heckstossstange schmal und rund
kart.add('Dark', tube([(-.78, .46, -1.64), (-.70, .46, -1.72), (0, .46, -1.76), (.70, .46, -1.72), (.78, .46, -1.64)], .055, 8))
kart_obj = kart.finish()

# ============================================================== Rad
# Achse entlang Spiel-x; die Aussenseite (Felge, Nabe) zeigt nach -x (rechte Raeder werden im Spiel gespiegelt)
wheel = Part('K_Wheel')
R_T, W_T = .42, .17
def tire(bm):
    seg, pseg = 20, 4
    prof = []
    for i in range(pseg + 1):
        a = -math.pi / 2 + math.pi * i / pseg
        # gerundete Schulter: Profil vom Innen- zum Aussenrand ueber die Lauffläche
        x = W_T * math.sin(a)
        r = R_T - .1 + .1 * math.cos(a) ** .45
        prof.append((x, r))
    prof = [(-W_T, .26)] + prof + [(W_T, .26)]
    rings = []
    for k in range(seg):
        t = 2 * math.pi * k / seg
        rings.append([bm.verts.new(Vector((x, math.cos(t) * r, math.sin(t) * r))) for x, r in prof])
    for k in range(seg):
        r0, r1 = rings[k], rings[(k + 1) % seg]
        for i in range(len(prof) - 1):
            f = bm.faces.new((r0[i], r0[i + 1], r1[i + 1], r1[i]))
            c = f.calc_center_median()
            t = 2 * math.pi * (k + .5) / seg
            ref = Vector((0, math.cos(t) * .34, math.sin(t) * .34))
            if (c - ref).dot(f.normal) < 0:
                f.normal_flip()
    # Profilbloecke (Pfeilmuster) auf der Laufflaeche
    for k in range(10):
        t = 2 * math.pi * (k + .5) / 10
        for s in (-1, 1):
            cz, cy = math.sin(t) * (R_T - .004), math.cos(t) * (R_T - .004)
            g = bmesh.ops.create_cube(bm, size=1)
            xf(bm, g['verts'], Matrix.Translation(Vector((s * .07, cy, cz))) @ Matrix.Rotation(t, 4, 'X') @ Matrix.Rotation(s * .5, 4, 'Y') @ Matrix.Diagonal((.1, .022, .07, 1)))
wheel.add('Tire', tire)
# Flankenring (weiss) auf der Aussenseite, Felge mit fuenf Speichen, Nabe
wheel.add('White', torus((-W_T - .002, 0, 0), .31, .012, (-1, 0, 0), 18, 3))
wheel.add('Rim', cyl((-.10, 0, 0), (-.19, 0, 0), .27, .25, 14))
wheel.add('Dark', cyl((-.185, 0, 0), (-.20, 0, 0), .21, .21, 14))
for k in range(5):
    t = 2 * math.pi * k / 5
    wheel.add('Rim', rbox((-.2, math.cos(t) * .12, math.sin(t) * .12), (.05, .20, .07), 0, 1, rot=(t, 0, 0)), smooth=False)
wheel.add('Gold', cyl((-.18, 0, 0), (-.26, 0, 0), .075, .06, 10))
wheel.add('White', cyl((-.255, 0, 0), (-.27, 0, 0), .045, .045, 8))
wheel.add('Dark', cyl((.12, 0, 0), (.16, 0, 0), .27, .27, 10))
wheel_obj = wheel.finish()
# Die Radmitte muss im Ursprung liegen; die Achse ist Blender-x
# (Spiel-Rad: x Achse, y/z Kreis). Die Bausteine oben sind direkt in Blender-Koordinaten mit Achse x erstellt,
# nur die Scheiben/Zylinder ueber G() - dort ist Spiel-x = Blender-x, also konsistent.

# ============================================================== Fahrer-Bausaetze
KIT = []
def kit_root(i, name):
    e = bpy.data.objects.new('KX_%d' % i, None)
    EXPORT.objects.link(e)
    e['label'] = name
    KIT.append(e)
    return e

def spots(part, pts, key='White'):
    for c, r, sc in pts:
        part.add(key, sphere(c, r, sc, 12, 6))

# --- KX_0 Pilzi "Sporenflitzer": Spoiler als Pilzhut auf Stiel, Sporen-Tupfen auf den Seitenkaesten
e0 = kit_root(0, 'Sporenflitzer')
p0 = Part('KX_0_Parts', e0)
CAPC, CA, CB, CC = Vector((0, 1.30, -1.46)), .92, .40, .60
p0.add('Cream', cyl((0, .9, -1.40), (0, 1.3, -1.44), .11, .09, 14))
p0.add('Cream', sphere(tuple(CAPC + Vector((0, -.01, 0))), 1, (CA * .96, .035, CC * .96), 24, 4))
def cap_dome(bm):
    before = set(bm.verts)
    bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=10, radius=1)
    new = [v for v in bm.verts if v not in before]
    for v in new:
        if v.co.z < 0:
            v.co.z *= .18
    xf(bm, new, Matrix.Translation(G(*CAPC)) @ Matrix.Diagonal((CA, CC, CB, 1)))
p0.add('BodyPaint', cap_dome)
def cap_pt(th, ph, lift=.0):
    return tuple(CAPC + Vector((CA * math.sin(th) * math.cos(ph), CB * math.cos(th) + lift, CC * math.sin(th) * math.sin(ph))))
spots(p0, [(cap_pt(0, 0, -.02), .16, (1, .3, 1))] +
      [(cap_pt(.95, ph, -.03), .12, (1, .55, 1)) for ph in (0, math.pi, math.pi / 2, -math.pi / 2)] +
      [(cap_pt(1.3, ph, -.03), .08, (1, .8, 1)) for ph in (math.pi / 4, 3 * math.pi / 4, -math.pi / 4, -3 * math.pi / 4)])
for s in (-1, 1):
    spots(p0, [((s * 1.16, .56, .18), .07, (.35, 1, 1)), ((s * 1.15, .6, -.12), .05, (.35, 1, 1))])
p0.finish()

# --- KX_1 Schildi "Panzerwagen": schwerer Heckfluegel, Sechseck-Panzerplatten, Rammschild vorn
e1 = kit_root(1, 'Panzerwagen')
p1 = Part('KX_1_Parts', e1)
p1.add('BodyPaint', airfoil(-1.14, 1.14, -1.40, 1.36, .56, .12, seg=14))
for s in (-1, 1):
    p1.add('Dark', rbox((s * .4, 1.1, -1.38), (.14, .5, .2), .04))
    p1.add('Dark', side_prism([(-1.12, 1.1), (-1.72, 1.1), (-1.72, 1.5), (-1.12, 1.56)], s * 1.14, s * 1.22))
    for k, (z, y) in enumerate(((.32, .56), (.04, .56), (-.22, .54))):
        c = Vector((s * 1.17, y, z))
        p1.add('Cream', cyl(tuple(c - Vector((s * .03, 0, 0))), tuple(c + Vector((s * .03, 0, 0))), .13, .11, 6), smooth=False)
p1.add('Dark', tube([(-.9, .5, 2.08), (-.5, .52, 2.16), (0, .53, 2.18), (.5, .52, 2.16), (.9, .5, 2.08)], .075, 10))
for x in (-.6, -.2, .2, .6):
    p1.add('Gold', sphere((x, .53, 2.24), .035, (1, 1, .6), 8, 5))
# Panzerkuppel ueber dem Motor
def shell_dome(bm):
    before = set(bm.verts)
    bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=5, radius=1)
    new = [v for v in bm.verts if v not in before]
    for v in new:
        if v.co.z < 0:
            v.co.z = 0
    xf(bm, new, Matrix.Translation(G(0, .96, -1.30)) @ Matrix.Diagonal((.42, .30, .2, 1)))
p1.add('Cream', shell_dome, smooth=False)
p1.finish()

# --- KX_2 Volt "Voltstoss": zwei Raketenbooster mit Leuchtduesen, Blitzfinne
e2 = kit_root(2, 'Voltstoss')
p2 = Part('KX_2_Parts', e2)
for s in (-1, 1):
    x = s * .5
    p2.add('Rim', cyl((x, 1.06, -.98), (x, 1.06, -1.66), .16, .16, 18))
    p2.add('BodyPaint', sphere((x, 1.06, -.98), .16, (1, 1, 1.9), 18, 8))
    p2.add('BodyPaint', cyl((x, 1.06, -1.2), (x, 1.06, -1.3), .165, .165, 18))
    p2.add('Dark', cyl((x, 1.06, -1.66), (x, 1.06, -1.80), .13, .17, 18))
    p2.add('VoltGlow', cyl((x, 1.06, -1.78), (x, 1.06, -1.81), .12, .12, 18))
    p2.add('Dark', rbox((x, .9, -1.3), (.1, .16, .3), .03, 1))
    # kleine Heckflossen an den Boostern
    p2.add('BodyPaint', side_prism([(-1.46, 1.2), (-1.70, 1.2), (-1.74, 1.42), (-1.62, 1.42)], x - .015, x + .015))
bolt = [(-1.02, .98), (-1.22, 1.54), (-1.34, 1.34), (-1.52, 1.66), (-1.46, 1.30), (-1.34, 1.46), (-1.20, .98)]
p2.add('BodyPaint', side_prism(bolt, -.035, .035), smooth=False)
p2.add('VoltGlow', side_prism([(z, y + .005) for z, y in bolt[1:4]] + [(-1.36, 1.42)], -.04, .04), smooth=False)
p2.finish()

# --- KX_3 Mochi "Kurvenkatze": flacher Pfeilfluegel mit Katzenohren, Schwanzantenne, Pfotenabdruecke
e3 = kit_root(3, 'Kurvenkatze')
p3 = Part('KX_3_Parts', e3)
p3.add('BodyPaint', airfoil(-1.0, 1.0, -1.44, 1.24, .4, .07, sweep=.18, twist=-.08, seg=12))
for s in (-1, 1):
    p3.add('Dark', cyl((s * .34, .9, -1.34), (s * .34, 1.22, -1.46), .04, .04, 8))
    # Ohr: aussen Lack, innen rosa
    p3.add('BodyPaint', side_prism([(-1.40, 1.18), (-1.78, 1.18), (-1.66, 1.62)], s * .98, s * 1.05), smooth=False)
    p3.add('Pink', side_prism([(-1.46, 1.23), (-1.70, 1.23), (-1.64, 1.50)], s * (.965 if s > 0 else .965), s * .985), smooth=False)
    # Pfotenabdruck auf dem Seitenkasten
    px = s * 1.165
    p3.add('Pink', sphere((px, .53, .06), .08, (.35, .8, 1), 12, 6))
    for dz, dy in ((-.1, .66), (.02, .7), (.14, .66)):
        p3.add('Pink', sphere((px, dy, .06 + dz), .035, (.4, 1, 1), 10, 5))
tail = []
for i in range(14):
    t = i / 13
    tail.append((.3 + .08 * math.sin(t * 3), .84 + t * .92, -1.52 - .22 * math.sin(t * 2.2) + .12 * t * t))
p3.add('BodyPaint', tube(tail, .035, 8))
p3.add('White', sphere(tail[-1], .075, (1, 1, 1), 12, 8))
p3.finish()

# ============================================================== Export
def export(objs, fn):
    for o in scene.objects:
        o.select_set(False)
    sel = []
    for o in objs:
        sel.append(o)
        sel += list(o.children_recursive)
    for o in sel:
        o.select_set(True)
    bpy.context.view_layer.objects.active = sel[0]
    target = ROOT / 'assets' / fn
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_cameras=False, export_lights=False, export_extras=False)
    tris = 0
    for o in sel:
        if o.type == 'MESH':
            o.data.calc_loop_triangles()
            tris += len(o.data.loop_triangles)
    return {'file': fn, 'triangles': tris, 'bytes': target.stat().st_size}

report = [export([kart_obj], 'kart.glb'), export([wheel_obj], 'kartwheel.glb'), export(KIT, 'kartkit.glb')]
for e in KIT:
    tris = 0
    for o in e.children_recursive:
        if o.type == 'MESH':
            o.data.calc_loop_triangles()
            tris += len(o.data.loop_triangles)
    report.append({'kit': e.name, 'label': e['label'], 'triangles': tris})
(OUT / 'karts_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'karts_r43.blend'))
print('REPORT', json.dumps(report))
