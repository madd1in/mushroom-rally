"""Mushroom Rally R44: Pilz, Baum und Wolken neu (eigene Entwuerfe). Materialnamen wie bisher: CapPaint wird je Strecke
eingefaerbt (Pilz: Hut, Baum: Krone); Abmessungen wie die Vorgaenger, damit Platzierung und Kollision passen.
Aufruf: blender -b --factory-startup --python art/r44/create_nature.py
  assets/mushroom.glb  gewoelbter Hut mit eingerolltem Rand, Lamellen darunter, erhabene Tupfen verschiedener Groesse
                       (der Woelbung folgend), leicht geschwungener Stiel mit Knolle und Manschette (Hoehe ~3,7 m)
  assets/tree.glb      Stamm mit Wurzelansatz, Wurzeln und Seitenast, Krone aus sechs knubbeligen Bueschen (~4,9 m, ohne Tupfen)
  assets/clouds.glb    drei Comic-Wolken CL_Cloud0..2 mit flachem Boden und runden Hauben (5, 6 und 7 Bausche)
Die weiche Hoehenschattierung (unten dunkler, oben heller) setzt das Spiel beim Laden als Vertexfarbe (shadeProto),
damit sie auch in den Low-Poly-Fassungen erhalten bleibt und sich weiter je Instanz einfaerben laesst.
"""
import sys, math, json, pathlib, shutil, random
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
for fn in ('mushroom.glb', 'tree.glb'):
    bak = ROOT / 'art' / 'r44' / fn.replace('.glb', '_r43_backup.glb')
    if not bak.exists():
        shutil.copy2(ROOT / 'assets' / fn, bak)
rep = {}
TAU = 2 * math.pi

def export(objs, fn):
    for o in bpy.context.scene.objects:
        o.select_set(o in objs)
    bpy.context.view_layer.objects.active = objs[0]
    target = ROOT / 'assets' / fn
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
    tr = 0
    for o in objs:
        o.data.calc_loop_triangles()
        tr += len(o.data.loop_triangles)
    rep[fn] = {'triangles': tr, 'bytes': target.stat().st_size}

def lumpy(center, r, scale=(1, 1, 1), seed=1, seg=12, ring=8, amp=.1, flat=None):
    """Knubbelige Kugel (UV-Kugel mit Rauschen); flat: unterhalb dieser Hoehe (Einheitskugel) plattgedrueckt."""
    def b(bm):
        rnd = random.Random(seed)
        before = set(bm.verts)
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
        vs = [v for v in bm.verts if v not in before]
        for v in vs:
            n = v.co.normalized()
            v.co = n * (1 + (rnd.random() - .5) * 2 * amp)
            if flat is not None and v.co.z < flat:
                v.co.z = flat + (v.co.z - flat) * .15
        xf(bm, vs, Matrix.Translation(G(*center)) @ Matrix.Diagonal((scale[0] * r, scale[2] * r, scale[1] * r, 1)))
    return b

def lathe(profile, seg=16, bottom=True, top=False, inward=False):
    """Drehkoerper um die Hochachse: profile = [(r, y, dx, dz)]; Normalen vom Achspunkt gleicher Hoehe weg (inward: zur Achse hin)."""
    def b(bm):
        rings = [[bm.verts.new(G(dx + math.cos(TAU * k / seg) * r, y, dz + math.sin(TAU * k / seg) * r)) for k in range(seg)] for (r, y, dx, dz) in profile]
        for p0, p1, a, c in zip(profile, profile[1:], rings, rings[1:]):
            ref = G((p0[2] + p1[2]) / 2, (p0[1] + p1[1]) / 2, (p0[3] + p1[3]) / 2)
            for k in range(seg):
                kk = (k + 1) % seg
                f = bm.faces.new((a[k], a[kk], c[kk], c[k]))
                f.normal_update()
                if ((f.calc_center_median() - ref).dot(f.normal) < 0) != inward:
                    f.normal_flip()
        if bottom:
            f = bm.faces.new(rings[0])
            f.normal_update()
            if f.normal.z > 0:
                f.normal_flip()
        if top:
            f = bm.faces.new(rings[-1])
            f.normal_update()
            if f.normal.z < 0:
                f.normal_flip()
    return b

# ================================================================ Pilz
init('R44_Mushroom')
use_materials({
    'CapPaint': material('CapPaint', (1, 1, 1, 1), .45, .02),
    'White': material('White', (.98, .97, .93, 1), .5),
    'Cream': material('Cream', (.97, .91, .78, 1), .7),
    'Gill': material('Gill', (.93, .86, .72, 1), .85),
    'GillDark': material('GillDark', (.78, .66, .52, 1), .85),
})
Y0, RC = 3.7, 1.8                                        # Scheitel, Hutradius

def cap_pt(t, ang):
    """Punkt und Aussennormale auf dem Hut: t 0 = Scheitel, 1 = Rand."""
    def ry(t):
        a = t * math.pi * .5
        return math.sin(a) * RC, Y0 - 1.15 * (1 - math.cos(a)) - .1 * t * t
    r, y = ry(t)
    r1, y1 = ry(min(1, t + .01))
    r0, y0 = ry(max(0, t - .01))
    dr, dy = r1 - r0, y1 - y0
    L = math.hypot(dr, dy) or 1
    nr, ny = -dy / L, dr / L
    c, s = math.cos(ang), math.sin(ang)
    return (c * r, y, s * r), (c * nr, ny, s * nr)

m = Part('Pilz')
def cap(bm):
    seg, rings = 28, 10
    verts = [[bm.verts.new(G(0, Y0, 0))]]
    for j in range(1, rings + 1):
        verts.append([bm.verts.new(G(*cap_pt(j / rings, -TAU * i / seg)[0])) for i in range(seg)])
    # Rand nach innen eingerollt (Wulst)
    for (r, y) in ((1.76, Y0 - 1.4), (1.62, Y0 - 1.48)):
        verts.append([bm.verts.new(G(math.cos(-TAU * i / seg) * r, y, math.sin(-TAU * i / seg) * r)) for i in range(seg)])
    fs = [bm.faces.new((verts[0][0], verts[1][(i + 1) % seg], verts[1][i])) for i in range(seg)]
    for j in range(1, len(verts) - 1):
        for i in range(seg):
            k = (i + 1) % seg
            fs.append(bm.faces.new((verts[j][i], verts[j][k], verts[j + 1][k], verts[j + 1][i])))
    # Windungssinn pruefen: der Scheitel-Faecher muss nach oben zeigen, sonst die ganze Schale umdrehen
    fs[0].normal_update()
    if fs[0].normal.z < 0:
        for f in fs:
            f.normal_flip()
m.add('CapPaint', cap)
# helle Unterseite schraeg hinauf zum Stiel (Normalen nach unten)
m.add('Gill', lathe([(1.64, Y0 - 1.47, 0, 0), (.9, Y0 - 1.24, 0, 0), (.3, Y0 - 1.02, 0, 0)], 28, bottom=False, inward=True))

def y_under(r):
    return Y0 - 1.47 + (1.64 - r) / 1.22 * .39

def fin(ang):
    """Lamelle unter dem Hut: duenne Rippe von innen nach aussen, in der Mitte am tiefsten."""
    def b(bm):
        c, s = math.cos(ang), math.sin(ang)
        wx, wz = -s * .025, c * .025
        secs = []
        for r in (.6, 1.1, 1.6):
            h = .03 + .13 * math.sin(math.pi * (r - .5) / 1.15)
            yt, yb = y_under(r) + .03, y_under(r) - h
            secs.append([bm.verts.new(G(c * r + sx * wx, y, s * r + sx * wz)) for (y, sx) in ((yt, -1), (yt, 1), (yb, 1), (yb, -1))])
        fs = []
        for a, d in zip(secs, secs[1:]):
            for k in range(4):
                kk = (k + 1) % 4
                fs.append(bm.faces.new((a[k], a[kk], d[kk], d[k])))
        fs.append(bm.faces.new(secs[0]))
        fs.append(bm.faces.new(list(reversed(secs[-1]))))
        cen = G(c * 1.05, y_under(1.05) - .06, s * 1.05)
        fix_normals(bm, fs, cen)
    return b
for k in range(20):
    m.add('GillDark', fin(k * TAU / 20 + .1), smooth=False)
# Tupfen: erhaben, verschieden gross, der Woelbung folgend
for (t, a, s) in ((0, 0, .46), (.42, .3, .4), (.44, 2.25, .34), (.5, 4.1, .42), (.76, 1.25, .3), (.78, 3.15, .33), (.82, 5.2, .27), (.64, 5.85, .23)):
    p, n = cap_pt(t, a)
    nv = Vector(n).normalized()
    c = tuple(p[i] - nv[i] * s * .1 for i in range(3))   # halb eingelassen: nur eine flache Kuppe schaut heraus
    m.add('White', sphere(c, s, (1, .3, 1), 12, 6, rot=Vector((0, 0, 1)).rotation_difference(G(*nv)).to_matrix()))
# Stiel: leicht geschwungen, Knolle am Fuss, oben im Hut verschwindend
prof = []
for i in range(9):
    y = i * 2.68 / 8
    rr = .55 - .19 * (i / 8) + .2 * math.exp(-(i * .95) ** 2)
    prof.append((rr, y, math.sin(i * .38) * .07, 0))
m.add('Cream', lathe(prof, 16, bottom=True))
# Manschette (Ring) am Stiel
m.add('White', lathe([(.4, 1.8, .05, 0), (.5, 1.73, .05, 0), (.62, 1.56, .05, 0), (.67, 1.47, .05, 0), (.62, 1.47, .05, 0), (.41, 1.64, .05, 0), (.4, 1.8, .05, 0)], 20, bottom=False))
mush = m.finish()
export([mush], 'mushroom.glb')

# ================================================================ Baum
init('R44_Tree')
use_materials({
    'CapPaint': material('CapPaint', (1, 1, 1, 1), .8),
    'TrunkPaint': material('TrunkPaint', (.44, .27, .15, 1), .9),
})
t = Part('Tree')
t.add('TrunkPaint', lathe([(.62, 0, 0, 0), (.36, .3, .03, 0), (.3, 1.0, .08, .02), (.26, 1.9, .04, .05), (.22, 2.7, -.05, .03)], 10, bottom=True, top=True))
t.add('TrunkPaint', tube([(.05, 1.6, 0), (.45, 2.1, .08), (.72, 2.55, .12)], .11, 6))
for k in range(4):
    a = k * math.pi / 2 + .4
    t.add('TrunkPaint', cyl((math.cos(a) * .25, .22, math.sin(a) * .25), (math.cos(a) * .78, 0, math.sin(a) * .78), .14, .05, 6), smooth=False)
LUMPS = (((0, 3.4, 0), 1.4, (1.1, .9, 1.1)), ((.9, 2.95, .3), .95, (1, .85, 1)), ((-.88, 3.0, -.25), 1.0, (1, .85, 1)),
         ((.1, 2.85, .88), .9, (1, .82, 1)), ((-.15, 3.0, -.88), .86, (1, .85, 1)), ((.3, 4.2, -.15), .8, (1, .85, 1)))
for i, (c, r, sc) in enumerate(LUMPS):
    t.add('CapPaint', lumpy(c, r, sc, seed=11 + i, seg=16, ring=10, amp=.045))
tree = t.finish()
export([tree], 'tree.glb')

# ================================================================ Wolken
init('R44_Clouds')
use_materials({'Cloud': material('CloudWhite', (1, 1, 1, 1), .95)})
clouds = []
for v in range(3):
    rnd = random.Random(100 + v)
    c = Part('CL_Cloud%d' % v)
    n = 5 + v
    for i in range(n):
        mid = abs(i - (n - 1) / 2) / ((n - 1) / 2)          # 0 Mitte, 1 aussen
        x = (i - (n - 1) / 2) * 2.9 + rnd.uniform(-.5, .5)
        r = 2.3 + (1 - mid) * 1.9 + rnd.random() * .6
        c.add('Cloud', lumpy((x, r * .42, rnd.uniform(-.9, .9)), r, (1, .9, .85), seed=200 + v * 10 + i, seg=16, ring=10, amp=.035, flat=-.45))
    # zweite, kleinere Reihe hinten oben: macht die Wolke voller
    for i in range(n - 2):
        x = (i - (n - 3) / 2) * 3.0 + rnd.uniform(-.6, .6)
        r = 1.9 + rnd.random() * .9
        c.add('Cloud', lumpy((x, r * .8 + 1.2, -1.4 + rnd.uniform(-.3, .3)), r, (1, .9, .85), seed=300 + v * 10 + i, seg=14, ring=9, amp=.035, flat=-.45))
    clouds.append(c.finish())
export(clouds, 'clouds.glb')
(ROOT / 'art' / 'r44' / 'nature_report.json').write_text(json.dumps(rep, indent=1), encoding='utf-8')
print('REPORT', json.dumps(rep))
