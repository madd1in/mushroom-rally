"""Mushroom Rally R45: Tunnelportale je Stil (eigene Entwuerfe), Export assets/tunnelkit.glb.
Der Tunnel im Spiel ist ein halber elliptischer Bogen: seitlich R = 13,4 m, Hoehe R * 0,8 = 10,72 m (TUNNEL_R, TUNNEL_TH).
Jedes Portal umrahmt diesen Bogen von R - 0,3 bis R + 3,2 (deckt die Erdhuelle bei R + 2,8 ab); Ursprung = Strassenmitte
am Boden, Bogen in der Ebene x/y, Tiefe entlang z (vorne = +z = nach aussen).
  TK_wood   hohler Baumstamm: dicke Rinde mit Rillen, Moos obenauf, drei kleine Pilze, zwei Baumpilz-Konsolen
  TK_rock   Sandstein-Bogen aus Keilsteinen, grosser Schlussstein mit Pilz-Relief, Sockelsteine
  TK_neon   dunkler Metallrahmen mit zwei Leuchtroehren (tuerkis/pink) und Gluehbirnenkette
  TK_crypt  dunkler Gruftbogen mit gruen leuchtendem Rundfenster im Schlussstein, zwei Haengelaternen, Efeu
  TK_pipe   Roehrenmuendung: dicker gruener Wulst mit hellem Rand und goldenem Band
Aufruf: blender -b --factory-startup --python art/r45/create_tunnelkit.py
"""
import sys, math, json, pathlib, random
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
R, TH = 13.4, .8
init('R45_TunnelKit')
use_materials({
    'Bark': material('TK_Bark', (.36, .23, .13, 1), .92),
    'BarkDark': material('TK_BarkDark', (.24, .15, .08, 1), .95),
    'Wood': material('TK_WoodInner', (.72, .52, .3, 1), .85),
    'Moss': material('TK_Moss', (.36, .62, .2, 1), .9),
    'CapRed': material('TK_CapRed', (.86, .15, .12, 1), .5),
    'CapWhite': material('TK_CapWhite', (.97, .95, .9, 1), .6),
    'Shelf': material('TK_Shelf', (.85, .62, .32, 1), .7),
    'Sand': material('TK_Sandstone', (.86, .6, .38, 1), .9),
    'SandDark': material('TK_SandDark', (.66, .42, .25, 1), .9),
    'Metal': material('TK_Metal', (.12, .1, .22, 1), .4, .6),
    'NeonA': material('TK_NeonCyan', (.3, 1, 1, 1), .3, 0, (.18, .9, .92, 1), 3.2),
    'NeonB': material('TK_NeonPink', (1, .3, .7, 1), .3, 0, (1, .23, .67, 1), 3.2),
    'Bulb': material('TK_Bulb', (1, .95, .7, 1), .3, 0, (1, .9, .5, 1), 2.5),
    'Crypt': material('TK_CryptStone', (.3, .27, .38, 1), .92),
    'CryptDark': material('TK_CryptDark', (.18, .16, .24, 1), .95),
    'Ghost': material('TK_GhostGlow', (.55, 1, .78, 1), .3, 0, (.5, 1, .75, 1), 3.0),
    'Iron': material('TK_Iron', (.15, .15, .17, 1), .5, .7),
    'Ivy': material('TK_Ivy', (.16, .38, .2, 1), .85),
    'Pipe': material('TK_PipeGreen', (.1, .55, .22, 1), .35, .1),
    'PipeLight': material('TK_PipeLight', (.25, .8, .38, 1), .3, .1),
    'Gold': material('TK_Gold', (1, .76, .22, 1), .3, .85),
})

def ell(a, r):
    """Punkt auf dem elliptischen Bogen (a 0 = rechts am Boden, pi = links am Boden)."""
    return (math.cos(a) * r, math.sin(a) * r * TH)

def arch_block(a0, a1, r0, r1, z0, z1, n=3):
    """Keilstein: Bogenstueck zwischen Winkeln a0..a1, Radien r0..r1, Tiefe z0..z1 (geschlossen, Normalen nach aussen)."""
    def b(bm):
        vs = {}
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            for j, r in enumerate((r0, r1)):
                x, y = ell(a, r)
                for k, z in enumerate((z0, z1)):
                    vs[i, j, k] = bm.verts.new(G(x, y, z))
        fs = []
        for i in range(n):
            for j in (0, 1):   # innen / aussen
                fs.append(bm.faces.new((vs[i, j, 0], vs[i + 1, j, 0], vs[i + 1, j, 1], vs[i, j, 1])))
            for k in (0, 1):   # vorne / hinten
                fs.append(bm.faces.new((vs[i, 0, k], vs[i + 1, 0, k], vs[i + 1, 1, k], vs[i, 1, k])))
        for i in (0, n):       # Stirnseiten
            fs.append(bm.faces.new((vs[i, 0, 0], vs[i, 1, 0], vs[i, 1, 1], vs[i, 0, 1])))
        am = (a0 + a1) / 2
        cx, cy = ell(am, (r0 + r1) / 2)
        fix_normals(bm, fs, G(cx, cy, (z0 + z1) / 2))
    return b

def arc_pts(r, a0=-.08, a1=math.pi + .08, n=36, z=0.0, dy=0.0):
    return [(ell(a0 + (a1 - a0) * i / n, r)[0], ell(a0 + (a1 - a0) * i / n, r)[1] + dy, z) for i in range(n + 1)]

def ring_tube(r, rad, z=0.0, a0=-.08, a1=math.pi + .08, n=36, seg=10):
    return tube(arc_pts(r, a0, a1, n, z), rad, seg)

objs = []
# ---------------------------------------------------------------- Sandstein (Canyon)
p = Part('TK_rock')
N = 11
gap = .0045
for i in range(N):
    a0, a1 = math.pi * i / N + gap, math.pi * (i + 1) / N - gap
    key = i == N // 2
    p.add('Sand' if i % 2 else 'SandDark', arch_block(a0, a1, R - .3, R + (3.9 if key else 3.2), -1.3, 1.3 + (.3 if key else 0), 3), smooth=False)
# Pilz-Relief auf dem Schlussstein
p.add('SandDark', sphere((0, (R + 2.4) * TH + .1, 1.72), .95, (1, .55, .35), 14, 8))
p.add('SandDark', cyl((0, (R + 1.6) * TH - .2, 1.62), (0, (R + 2.4) * TH - .2, 1.62), .32, .38, 10))
for sx in (-1, 1):
    p.add('SandDark', rbox((sx * (R + 1.45), .6, 0), (4.0, 1.2, 3.2), .12, 2))
objs.append(p.finish())

# ---------------------------------------------------------------- hohler Baumstamm (Promenade)
p = Part('TK_wood')
p.add('Bark', ring_tube(R + 1.35, 1.75, 0, seg=14))
rnd = random.Random(7)
for k in range(10):                      # Rindenrillen rund um den Wulst
    phi = k * 2 * math.pi / 10
    pts = []
    for (x, y, z) in arc_pts(R + 1.35, n=26):
        a = math.atan2(y / TH, x)
        nx, ny = math.cos(a), math.sin(a)
        pts.append((x + nx * math.cos(phi) * 1.72, y + ny * math.cos(phi) * 1.72 * TH, z + math.sin(phi) * 1.72))
    p.add('BarkDark', tube(pts, .2 + rnd.random() * .08, 5))
p.add('Wood', ring_tube(R - .05, .38, 1.55, seg=8))     # heller Schnittrand innen
p.add('Moss', tube(arc_pts(R + 2.6, .55, math.pi - .55, 24, .2), .75, 8))
for (a, s) in ((1.25, 1), (1.62, .8), (1.95, .9)):     # Pilze oben auf dem Stamm
    x, y = ell(a, R + 3.0)
    p.add('CapWhite', cyl((x, y - .2, .3), (x, y + .75 * s, .3), .22 * s, .18 * s, 8))
    p.add('CapRed', sphere((x, y + .8 * s, .3), .75 * s, (1, .55, 1), 12, 7))
    for d in range(3):
        dx, dz = math.cos(d * 2.1) * .42 * s, math.sin(d * 2.1) * .42 * s
        p.add('CapWhite', sphere((x + dx, y + 1.08 * s, .3 + dz), .13 * s, (1, .45, 1), 6, 4))
for sx, a in ((1, .45), (-1, math.pi - .35)):          # Baumpilz-Konsolen seitlich
    x, y = ell(a, R + 2.9)
    for t in range(2):
        p.add('Shelf', sphere((x + sx * .3, y - t * .7, 1.2), .8 - t * .2, (1, .28, .85), 12, 6))
objs.append(p.finish())

# ---------------------------------------------------------------- Neon-Rahmen (Neon-Pilzwald)
p = Part('TK_neon')
p.add('Metal', arch_block(-.05, math.pi + .05, R - .2, R + 3.1, -.9, .9, 36), smooth=False)
p.add('NeonA', ring_tube(R + .45, .24, 1.0))
p.add('NeonB', ring_tube(R + 2.65, .24, 1.0))
for i in range(19):
    a = .1 + (math.pi - .2) * i / 18
    x, y = ell(a, R + 1.55)
    p.add('Bulb', sphere((x, y, 1.0), .28, (1, 1, 1), 8, 6))
objs.append(p.finish())

# ---------------------------------------------------------------- Gruftbogen (Geisterhaus)
p = Part('TK_crypt')
N = 9
for i in range(N):
    a0, a1 = math.pi * i / N + gap, math.pi * (i + 1) / N - gap
    key = i == N // 2
    p.add('Crypt' if i % 2 else 'CryptDark', arch_block(a0, a1, R - .3, R + (4.1 if key else 3.2), -1.3, 1.3 + (.25 if key else 0), 3), smooth=False)
p.add('Ghost', cyl((0, (R + 2.1) * TH, 1.5), (0, (R + 2.1) * TH, 1.72), .8, .8, 16))
p.add('Iron', torus((0, (R + 2.1) * TH, 1.62), .85, .12, (0, 0, 1), 16, 5))
for sx in (-1, 1):
    x, y = ell(math.pi / 2 - sx * .62, R + .6)
    p.add('Iron', cyl((x, y, 1.6), (x, y - 1.6, 1.6), .05, .05, 5), smooth=False)
    p.add('Iron', cyl((x, y - 1.6, 1.6), (x, y - 2.5, 1.6), .42, .3, 6), smooth=False)
    p.add('Ghost', sphere((x, y - 2.05, 1.6), .3, (1, 1.2, 1), 10, 6))
    for k in range(7):                                    # Efeu haengt ueber die Kante
        a = math.pi / 2 + sx * (.35 + k * .12)
        ex, ey = ell(a, R + 3.2)
        p.add('Ivy', sphere((ex, ey - k % 3 * .35, 1.25), .55, (1, .7, .5), 8, 5))
objs.append(p.finish())

# ---------------------------------------------------------------- Roehrenmuendung (Lava-Feste)
p = Part('TK_pipe')
p.add('Pipe', ring_tube(R + 1.35, 1.7, -.3, seg=16))
p.add('PipeLight', ring_tube(R + 1.35, 1.95, 1.05, seg=16))
p.add('Gold', ring_tube(R + 1.35, 1.78, -1.55, seg=16))
objs.append(p.finish())

for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
target = ROOT / 'assets' / 'tunnelkit.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
rep = {}
for o in objs:
    o.data.calc_loop_triangles()
    rep[o.name] = len(o.data.loop_triangles)
rep['bytes'] = target.stat().st_size
# Vorschau: alle fuenf nebeneinander
for i, o in enumerate(objs):
    o.location.x += (i - 2) * 34
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light, sh.color_type, sh.show_object_outline, sh.show_cavity, sh.show_backface_culling = 'STUDIO', 'MATERIAL', True, True, True
sh.background_type, sh.background_color = 'VIEWPORT', (.55, .78, .98)
sc.world = bpy.data.worlds.new('W')
sc.render.resolution_x, sc.render.resolution_y = 1600, 420
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 175
pos, tgt = Vector((0, -120, 9)), Vector((0, 0, 9))
cam.location = pos
cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = str(ROOT / 'art' / 'r45' / 'tunnelkit.png')
bpy.ops.render.render(write_still=True)
print('REPORT', json.dumps(rep))
