"""Mushroom Rally R45: Tintenpilz (eigener Entwurf nach dem Schopftintling), Export assets/inkcap.glb.
  IC_Inkcap  schlanker Stiel mit Ring, hoher glockenfoermiger Hut: oben weiss mit abstehenden Schuppen, zum Rand hin grau,
             unten schwarz zerfliessend mit Tropfen; zwei grosse Comic-Augen. Ursprung am Stielfuss, Hoehe ~2,2 m.
Das Spiel setzt ihn ueber getroffene Karts, laesst ihn wackeln und zu Tinte zerlaufen (Tropfen = eigenes Material 'InkDrip').
Aufruf: blender -b --factory-startup --python art/r45/create_inkcap.py
"""
import sys, math, json, pathlib, random
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
TAU = 2 * math.pi
init('R45_Inkcap')
use_materials({
    'CapWhite': material('InkCapWhite', (.96, .95, .92, 1), .6),
    'CapGrey': material('InkCapGrey', (.55, .53, .56, 1), .55),
    'Ink': material('InkBlack', (.03, .03, .05, 1), .18, .1),
    'InkDrip': material('InkDrip', (.02, .02, .04, 1), .12, .1),
    'Stem': material('InkStem', (.95, .93, .88, 1), .7),
    'Eye': material('InkEyeWhite', (1, 1, 1, 1), .3),
    'Pupil': material('InkPupil', (.05, .05, .08, 1), .2),
})

def lathe_ring(bm, profile, seg, key_of=None):
    """Drehkoerper-Schale: profile [(r, y)] von oben nach unten; Normalen nach aussen (vom Achspunkt weg)."""
    rings = []
    for r, y in profile:
        rings.append([bm.verts.new(G(math.cos(TAU * k / seg) * r, y, math.sin(TAU * k / seg) * r)) for k in range(seg)] if r > 1e-4 else [bm.verts.new(G(0, y, 0))])
    fs = []
    for (p0, p1, a, c) in zip(profile, profile[1:], rings, rings[1:]):
        ref = G(0, (p0[1] + p1[1]) / 2, 0)
        for k in range(seg):
            kk = (k + 1) % seg
            if len(a) == 1:
                f = bm.faces.new((a[0], c[kk], c[k]))
            else:
                f = bm.faces.new((a[k], a[kk], c[kk], c[k]))
            f.normal_update()
            if (f.calc_center_median() - ref).dot(f.normal) < 0:
                f.normal_flip()
            fs.append(f)
    return rings, fs

p = Part('IC_Inkcap')
# Stiel mit leichter Verdickung am Fuss und Ring
def stem(bm):
    lathe_ring(bm, [(.16, 1.5), (.17, 1.1), (.19, .6), (.24, .2), (.3, .04), (.001, 0)], 12)
p.add('Stem', stem)
p.add('Stem', torus((0, .95, 0), .2, .045, (0, 1, 0), 14, 5))
# Hut: hohe Glocke, oben weiss, Mitte grau, unterer Saum schwarz (drei Materialbaender)
H0 = 2.2
def bell(t):   # t 0 = Spitze, 1 = Saum -> (r, y)
    return .06 + .55 * math.sin(min(1, t * 1.05) * math.pi * .5) ** .8, H0 - t * 1.05
def band(t0, t1, n):
    def b(bm):
        prof = [bell(t0 + (t1 - t0) * i / n) for i in range(n + 1)]
        if t0 == 0:
            prof = [(0.0, H0 + .03)] + prof
        lathe_ring(bm, prof, 20)
    return b
p.add('CapWhite', band(0, .55, 6))
p.add('CapGrey', band(.55, .8, 3))
p.add('Ink', band(.8, 1.0, 2))
# Innenseite (schwarz, von unten sichtbar)
def under(bm):
    r1, y1 = bell(1.0)
    rings, fs = lathe_ring(bm, [(r1 - .01, y1 + .005), (.2, y1 + .45)], 20)
    for f in fs:
        f.normal_flip()
p.add('Ink', under)
# abstehende weisse Schuppen oben
rnd = random.Random(45)
for k in range(22):
    t = rnd.uniform(.12, .6)
    a = rnd.uniform(0, TAU)
    r, y = bell(t)
    c = (math.cos(a) * (r + .02), y, math.sin(a) * (r + .02))
    n = Vector((math.cos(a), .35, math.sin(a))).normalized()
    p.add('CapWhite', sphere(c, .075, (1, .45, 1), 6, 4, rot=Vector((0, 0, 1)).rotation_difference(G(*n)).to_matrix()))
# Tropfen am Saum (eigenes Material, damit das Spiel sie beim Zerlaufen strecken kann)
for k in range(9):
    a = k * TAU / 9 + .2
    r, y = bell(1.0)
    L = .18 + .14 * ((k * 37) % 5) / 4
    c = (math.cos(a) * (r - .035), y - L * .28, math.sin(a) * (r - .035))
    p.add('InkDrip', sphere(c, .065, (1, L / .13, 1), 8, 6))
# grosse Comic-Augen vorn (Spiel-z = vorn)
for sx in (-1, 1):
    r, y = bell(.62)
    ex, ez = sx * .2, r * .93
    p.add('Eye', sphere((ex, y, ez), .15, (1, 1.25, .55), 12, 8))
    p.add('Pupil', sphere((ex * .9, y - .02, ez + .07), .065, (1, 1.3, .5), 10, 6))
p.finish()

objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
target = ROOT / 'assets' / 'inkcap.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
tr = 0
for o in objs:
    o.data.calc_loop_triangles()
    tr += len(o.data.loop_triangles)
rep = {'triangles': tr, 'bytes': target.stat().st_size}
# Vorschau
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light, sh.color_type, sh.show_object_outline, sh.show_cavity, sh.show_backface_culling = 'STUDIO', 'MATERIAL', True, True, True
sh.background_type, sh.background_color = 'VIEWPORT', (.55, .78, .98)
sc.world = bpy.data.worlds.new('W')
sc.render.resolution_x, sc.render.resolution_y = 700, 700
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C'))
sc.collection.objects.link(cam)
sc.camera = cam
for tag, pos, tgt in (('front', (1.2, -4.2, 1.9), (0, 0, 1.3)), ('low', (.8, -2.2, .3), (0, 0, 1.4))):
    pos, tgt = Vector(pos), Vector(tgt)
    cam.location = pos
    cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = str(ROOT / 'art' / 'r45' / f'inkcap_{tag}.png')
    bpy.ops.render.render(write_still=True)
print('REPORT', json.dumps(rep))
