"""Mushroom Rally: gemeinsame bmesh-Bausteine fuer die prozeduralen Blender-Modelle (aus art/r43/create_karts.py).
Nutzung: import sys; sys.path.append(<art/lib>); from blib import *; M.update({...material(...)}); KEYS[:] = list(M)
Koordinaten: G(x, y, z) nimmt Spielkoordinaten (x rechts, y hoch, z vorwaerts); Export mit +Y oben.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix
EXPORT = None
KEYS = []

def init(collection_name='Export'):
    """Leere Szene mit Export-Sammlung anlegen."""
    global EXPORT
    bpy.ops.wm.read_factory_settings(use_empty=True)
    EXPORT = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(EXPORT)
    M.clear()
    KEYS.clear()
    return EXPORT

def use_materials(d):
    M.update(d)
    KEYS[:] = list(M)

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

M = {}

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
    def finish(self, origin=None):
        """origin (Spielkoordinaten): Drehpunkt des Objekts, z. B. Kiefer-Scharnier; Geometrie bleibt an Ort und Stelle."""
        o = G(*origin) if origin is not None else None
        if o is not None:
            bmesh.ops.transform(self.bm, matrix=Matrix.Translation(-o), verts=self.bm.verts)
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
        (EXPORT or bpy.context.scene.collection).objects.link(ob)
        if o is not None:
            ob.location = o
        if self.parent:
            ob.parent = self.parent
        return ob

def xf(bm, verts, M4):
    bmesh.ops.transform(bm, matrix=M4, verts=verts)

def fix_normals(bm, faces, center):
    """Normalen nach aussen (vom Mittelpunkt weg) - recalc_face_normals scheitert an offenen Streifen."""
    for f in faces:
        f.normal_update()
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

