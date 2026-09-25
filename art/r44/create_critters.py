"""Mushroom Rally R44: Figuren und Stuecke fuer den Streckencharakter (eigene Entwuerfe), Export assets/critters.glb:
  CR_CowBody     Almkuh (Fleckvieh-Art): Rumpf mit braunen Flecken, Euter, Schwanz, Glocke am Halsband
  CR_CowHead     Kopf mit Hoernern, Ohren und Maul (Drehpunkt am Hals, nickt beim Grasen)
  CR_CowLeg      ein Bein mit Huf (Drehpunkt an der Huefte, vier Instanzen je Kuh)
  CR_Hand        Geisterhand aus dem Grab: fahl leuchtend, Finger gekruemmt, zerrissener Aermel (waechst aus dem Boden)
  CR_Meteor      Sternschnuppe: zackiger Stein mit gluehendem Kern und Flammenschweif (fliegt nach -y)
  CR_Bar         Neon-Taktschranke (halbe Schranke, Leuchtband, Scharnier-Pfosten) fuer den Neon-Pilzwald
"""
import sys, math, json, pathlib
sys.path.append(r'C:/Users/User/Documents/Playground/mushroom-rally/art/lib')
import bpy, bmesh
from mathutils import Vector, Matrix
from blib import *
import blib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
init('R44_Critters')
use_materials({
    'CowWhite': material('CowWhite', (.97, .95, .9, 1), .7),
    'CowBrown': material('CowBrown', (.55, .3, .14, 1), .75),
    'Pink': material('Pink', (1, .62, .66, 1), .6),
    'Dark': material('Dark', (.08, .07, .07, 1), .5),
    'Horn': material('Horn', (.93, .88, .74, 1), .5),
    'Gold': material('Gold', (1, .76, .22, 1), .3, .85),
    'Strap': material('Strap', (.75, .12, .12, 1), .6),
    'GhostSkin': material('GhostSkin', (.7, 1, .85, 1), .5, 0, (.35, .9, .6, 1), 1.2),
    'Rag': material('Rag', (.2, .17, .24, 1), .9),
    'Rock': material('MeteorRock', (.32, .26, .38, 1), .85),
    'Star': material('StarGlow', (1, .85, .45, 1), .3, 0, (1, .7, .3, 1), 3.5),
    'Trail': material('TrailGlow', (1, .45, .85, 1), .3, 0, (1, .4, .9, 1), 2.8),
    'Neon': material('BarNeon', (.2, .95, 1, 1), .3, 0, (.2, .9, 1, 1), 3.0),
    'BarPaint': material('BarPaint', (1, 1, 1, 1), .4, .1),
    'Post': material('PostDark', (.12, .12, .2, 1), .5, .4),
})
rep = {}
def cone(a, b, r, seg=8):
    return cyl(a, b, r, 0.0, seg)

# ---------------- Kuh (Spielkoordinaten, schaut nach +z, Ursprung Boden Mitte)
b = Part('CR_CowBody')
b.add('CowWhite', sphere((0, 1.45, 0), 1, (.72, .66, 1.25), 20, 12))
for (x, y, z, s) in ((.55, 1.7, .3, .42), (-.6, 1.45, -.4, .5), (.2, 1.95, -.7, .38), (-.45, 1.9, .55, .32), (.6, 1.3, -.8, .3)):
    b.add('CowBrown', sphere((x * .98, y, z), s, (.6, 1, 1), 12, 8))
b.add('Pink', sphere((0, .88, -.35), .28, (1, .7, 1), 12, 8))
b.add('CowWhite', tube([(0, 1.7, -1.2), (0, 1.3, -1.45), (.05, .8, -1.5)], .06, 6))
b.add('Dark', sphere((.05, .72, -1.5), .12, (1, 1.6, 1), 8, 5))
b.add('Strap', torus((0, 1.55, 1.0), .38, .06, (0, .3, 1), 16, 5))
b.add('Gold', cone((0, 1.15, 1.25), (0, 1.5, 1.2), .2, 10))
b.add('Gold', sphere((0, 1.08, 1.25), .08, (1, 1, 1), 8, 5))
b.finish()
h = Part('CR_CowHead')
NECK = (0, 1.75, .95)
h.add('CowWhite', sphere((0, 1.95, 1.45), .44, (.85, .9, 1.1), 16, 10))
h.add('CowBrown', sphere((.18, 2.12, 1.4), .22, (.8, .8, .8), 10, 6))
h.add('Pink', sphere((0, 1.78, 1.88), .3, (1, .75, .7), 14, 8))
for sx in (-1, 1):
    h.add('Dark', sphere((sx * .1, 1.8, 2.07), .05, (1, 1, .5), 6, 4))
    h.add('Dark', sphere((sx * .22, 2.1, 1.78), .07, (1, 1, .6), 8, 5))
    h.add('Horn', tube([(sx * .25, 2.3, 1.4), (sx * .45, 2.42, 1.42), (sx * .52, 2.62, 1.5)], .06, 6))
    h.add('CowBrown', sphere((sx * .52, 2.12, 1.32), .16, (1.3, .5, .7), 10, 6))
h.finish(origin=NECK)
lg = Part('CR_CowLeg')
lg.add('CowWhite', cyl((0, 1.1, 0), (0, .18, 0), .15, .12, 10))
lg.add('Dark', cyl((0, .2, 0), (0, 0, 0), .14, .15, 10))
lg.finish(origin=(0, 1.1, 0))

# ---------------- Geisterhand (waechst nach +y aus dem Boden, Handflaeche nach +z)
ha = Part('CR_Hand')
ha.add('Rag', cyl((0, 0, 0), (0, 1.1, 0), .42, .32, 12))
for k in range(6):
    a = k * math.pi / 3
    ha.add('Rag', cone((math.cos(a) * .38, 1.0, math.sin(a) * .38), (math.cos(a) * .5, 1.35, math.sin(a) * .5), .12, 4), smooth=False)
ha.add('GhostSkin', cyl((0, 1.0, 0), (0, 1.7, .05), .26, .24, 12))
ha.add('GhostSkin', sphere((0, 2.0, .08), .38, (1, 1.05, .5), 14, 8))
for i, x in enumerate((-.27, -.09, .09, .27)):
    top = 2.62 + (.1 if i in (1, 2) else 0)
    ha.add('GhostSkin', tube([(x, 2.25, .1), (x * 1.1, top - .15, .2), (x * 1.15, top, .38)], .075, 6))
    ha.add('Dark', sphere((x * 1.15, top + .02, .44), .05, (1, .6, 1), 6, 4))
ha.add('GhostSkin', tube([(.36, 1.95, .1), (.55, 2.2, .25), (.6, 2.45, .38)], .08, 6))
ha.finish()

# ---------------- Sternschnuppe (Kern oben, Schweif nach +y, faellt nach -y)
me = Part('CR_Meteor')
def rock(bm):
    g = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1)
    import random
    rnd = random.Random(7)
    for v in g['verts']:
        v.co *= .8 + rnd.random() * .45
    xf(bm, g['verts'], Matrix.Translation(G(0, 0, 0)) @ Matrix.Diagonal((1.2, 1.2, 1.2, 1)))
me.add('Rock', rock, smooth=False)
for k in range(7):
    a = k * 2 * math.pi / 7
    me.add('Star', cone((math.cos(a) * .9, math.sin(a * 2) * .4, math.sin(a) * .9), (math.cos(a) * 1.6, math.sin(a * 2) * .6, math.sin(a) * 1.6), .28, 5), smooth=False)
me.add('Trail', cone((0, .6, 0), (0, 7.5, 0), 1.25, 12))
me.add('Star', cone((0, .8, 0), (0, 4.5, 0), .75, 10))
me.finish()

# ---------------- Neon-Taktschranke (halbe Schranke von x=0 bis x=7.4, Scharnier bei x=0)
br = Part('CR_Bar')
br.add('Post', cyl((0, 0, 0), (0, 2.6, 0), .32, .28, 12))
br.add('Neon', torus((0, 2.62, 0), .3, .06, (0, 1, 0), 14, 5))
br.add('BarPaint', rbox((3.75, 1.55, 0), (7.3, .5, .28), .12, 2))
for k in range(5):
    br.add('Dark', rbox((.9 + k * 1.45, 1.55, 0), (.55, .52, .3), .04, 1))
br.add('Neon', rbox((3.75, 1.22, 0), (7.2, .08, .3), .03, 1))
br.add('Neon', rbox((3.75, 1.88, 0), (7.2, .08, .3), .03, 1))
br.add('Neon', sphere((7.35, 1.55, 0), .22, (1, 1, 1), 10, 6))
br.finish()

objs = [o for o in blib.EXPORT.objects]
for o in bpy.context.scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
for o in objs:
    o.data.calc_loop_triangles()
    rep[o.name] = len(o.data.loop_triangles)
target = ROOT / 'assets' / 'critters.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
rep['bytes'] = target.stat().st_size
(ROOT / 'art' / 'r44' / 'critters_report.json').write_text(json.dumps(rep, indent=1), encoding='utf-8')
print('REPORT', json.dumps(rep))
