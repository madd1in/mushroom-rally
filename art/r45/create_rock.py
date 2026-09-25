"""Mushroom Rally R45: Felsen neu (ersetzt die drei 20-Flaechen-Ikosaeder mit Moos-Scheibe aus R9).
Aufruf: blender -b --factory-startup --python art/r45/create_rock.py
    oder mit dem bpy-Modul (pip install bpy==5.0.1): python art/r45/create_rock.py
Schreibt assets/rock.glb und die Leicht-Fassung assets/lo/rock.glb.

Gestaltung: gemeisselte Felsbrocken im Low-Poly-Comicstil. Jeder Brocken ist eine verbeulte Ikosaeder-Kugel,
von 7 bis 11 zufaelligen Ebenen "abgeschlagen" (alles jenseits einer Ebene wird auf sie projiziert) - das
ergibt grosse flache Facetten mit klaren Kanten. Gleich ausgerichtete Dreiecke werden zu Flaechen verschmolzen
(dissolve_limit), damit trotz feiner Grundkugel wenige Dreiecke bleiben. Unten flach und etwas eingesunken.
Hauptfels, zwei Nebenfelsen und Kiesel am Fuss; Moospolster (eigene Flaechenkopie mit Wulst) auf den nach oben
zeigenden Facetten von Haupt- und Nebenfels.

Schattierung als Vertexfarbe je Facette (linear, 0..1): oben hell und leicht warm, Seiten mittel, Unterseiten
und Fuss dunkler und kuehler, dazu +-6 % Zufall je Facette. Das Spiel faerbt per Materialname ein
(StonePaint: Tunnelwand, Canyonrot, Lavabasalt; MossPaint: Sand in der Wueste) - die Vertexfarbe multipliziert
sich damit, jede Tonung bekommt so dieselbe Plastizitaet. Fussabdruck und Hoehe wie beim alten Modell
(x -2..3, z -1.8..1.2, Hoehe ~3.5), damit die Hindernisradien im Spiel weiter passen.
"""
import bpy, bmesh, math, random, pathlib, json
from mathutils import Vector, Matrix, noise

ROOT = pathlib.Path(__file__).resolve().parents[2]


def material(name, color, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = color
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = 0.0
    return m


def cut(bm, n, dist):
    """Alles jenseits der Ebene (Normale n, Abstand dist) auf die Ebene projizieren."""
    n = n.normalized()
    for v in bm.verts:
        d = v.co.dot(n) - dist
        if d > 0:
            v.co -= n * d


def chisel(bm, rnd, cuts, lo=.72, hi=.9):
    """Ebenen-Schnitte: ein schraeges Gipfelplateau (Platz fuers Moos), dann Seitenfacetten rundherum."""
    tilt = rnd.uniform(0, 2 * math.pi)
    cut(bm, Vector((math.cos(tilt) * .28, math.sin(tilt) * .28, 1)), rnd.uniform(.58, .7))
    for k in range(cuts):
        th = (k + rnd.uniform(-.35, .35)) * 2 * math.pi / cuts   # gleichmaessig ums Rund, keine Luecken
        el = rnd.uniform(-.28, .62)                               # Seiten und Schultern, nie von unten
        r = math.sqrt(1 - el * el)
        cut(bm, Vector((math.cos(th) * r, math.sin(th) * r, el)), rnd.uniform(lo, hi))


def boulder(seed, size, subdiv=3, cuts=9, sink=.14, bumps=.16):
    """Ein Brocken in Blender-Koordinaten (z oben), Fuss bei z=-sink, Hoehe size[2]."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    off = Vector((rnd.uniform(-40, 40), rnd.uniform(-40, 40), rnd.uniform(-40, 40)))
    for v in bm.verts:
        d = v.co.normalized()
        v.co = d * (1 + bumps * noise.fractal(d * 1.4 + off, .7, 2.0, 3))
    chisel(bm, rnd, cuts)
    # Kugel -1..1 auf Groesse bringen, Unterseite flach abschneiden
    H = size[2]
    lean = Vector((rnd.uniform(-.12, .12), rnd.uniform(-.12, .12)))
    for v in bm.verts:
        z = (v.co.z + .7) * H / 1.35
        v.co = Vector((v.co.x * size[0] + lean.x * z, v.co.y * size[1] + lean.y * z, max(z, -sink)))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.004)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(3.5), verts=bm.verts, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def shade(bm, H, rnd, top=(1.0, .97, .92), side=(.8, .8, .83), low=(.52, .56, .66), strata=True):
    """Vertexfarbe je Facette: Ausrichtung + Hoehe + Zufall."""
    col = bm.loops.layers.float_color.new('Col')
    for f in bm.faces:
        nz = f.normal.z
        c = f.calc_center_median()
        h = max(0.0, min(1.0, c.z / max(H, 1e-3)))
        if nz >= 0:
            t = min(1.0, nz / .8)
            base = [side[k] + (top[k] - side[k]) * t for k in range(3)]
        else:
            t = min(1.0, -nz / .6)
            base = [side[k] + (low[k] - side[k]) * t for k in range(3)]
        foot = .74 + .26 * math.sqrt(h)                  # am Boden dunkler (Kontaktschatten)
        j = 1 + rnd.uniform(-.07, .07)
        # Gesteinsschichten: schmale dunklere Baender auf den Seitenfacetten
        if strata and abs(nz) < .6 and math.sin(c.z * 5.3 + .8) > .72:
            j *= .86
        rgb = [min(1.0, base[k] * foot * j) for k in range(3)]
        for l in f.loops:
            l[col] = (*rgb, 1.0)
    return col


def moss_cap(src_bm, H, rnd, min_nz=.62, min_h=.5, lift=.04, lip=.07):
    """Moospolster: nach oben zeigende Facetten im oberen Teil kopieren, anheben und mit Wulst nach unten."""
    bm = bmesh.new()
    vmap = {}
    for f in src_bm.faces:
        c = f.calc_center_median()
        if f.normal.z < min_nz or c.z < min_h * H:
            continue
        vs = []
        for v in f.verts:
            if v.index not in vmap:
                vmap[v.index] = bm.verts.new(v.co)
            vs.append(vmap[v.index])
        try:
            bm.faces.new(vs)
        except ValueError:
            pass
    if not bm.faces:
        return None
    bm.normal_update()
    # anheben entlang der gemittelten Normalen, damit das Polster ueber dem Stein liegt
    for v in bm.verts:
        n = sum((f.normal for f in v.link_faces), Vector())
        v.co += (n.normalized() if n.length > 1e-6 else Vector((0, 0, 1))) * lift
    # Wulst: Randkanten nach unten und etwas nach aussen ziehen
    edges = [e for e in bm.edges if e.is_boundary]
    if edges:
        cen = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
        res = bmesh.ops.extrude_edge_only(bm, edges=edges)
        for v in [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]:
            out = Vector((v.co.x - cen.x, v.co.y - cen.y, 0))
            out = out.normalized() if out.length > 1e-6 else Vector()
            v.co += Vector((0, 0, -lip * rnd.uniform(.8, 1.2))) + out * .02
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    col = bm.loops.layers.float_color.new('Col')
    for f in bm.faces:
        t = max(0.0, f.normal.z)
        j = 1 + rnd.uniform(-.08, .08)
        rgb = [min(1.0, (.72 + .28 * t) * j * k) for k in (1.0, 1.0, .96)]
        for l in f.loops:
            l[col] = (*rgb, 1.0)
    return bm


def to_object(name, bm, mat, loc=(0, 0, 0), rot=0.0, coll=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    # Vertexfarbe als aktive Farbe markieren: der Exporter nimmt sie als COLOR_0 mit (export_vertex_color='ACTIVE')
    if 'Col' in me.color_attributes:
        me.color_attributes.active_color = me.color_attributes['Col']
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z')
    coll.objects.link(ob)
    return ob


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def build(lite):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.data.collections.new('Rock')
    bpy.context.scene.collection.children.link(coll)
    stone = material('StonePaint', (.29, .31, .34, 1), .9)
    moss = material('MossPaint', (.17, .39, .12, 1), .95)
    sub = 2 if lite else 3
    # (Name, Samen, Groesse x/y/Hoehe, Lage in Spielkoordinaten x/z, Drehung, Schnitte, Moos)
    # Spiel (x, y, z) -> Blender (x, -z, y)
    parts = [('rock0', 11, (1.65, 1.4, 3.4), (0, 0), .3, 13, True),
             ('rock1', 23, (1.1, .95, 2.1), (1.8, -.6), 1.4, 10, True),
             ('rock2', 37, (.9, .8, 1.4), (-1.3, -1.05), 2.3, 9, False)]
    pebbles = [(51, .42, (1.05, .95)), (53, .34, (-.75, .85)), (57, .3, (2.6, .25)), (59, .38, (-1.95, -.15))]
    if lite:
        pebbles = pebbles[:2]
    report = {}
    for name, seed, size, (gx, gz), rot, cuts, has_moss in parts:
        rnd = random.Random(seed * 7)
        bm = boulder(seed, size, subdiv=sub, cuts=cuts)
        cap = moss_cap(bm, size[2], rnd, min_h=.55 if name == 'rock0' else .5) if has_moss else None
        shade(bm, size[2], rnd)
        loc = Vector((gx, -gz, 0))
        ob = to_object(name, bm, stone, loc, rot, coll)
        report[name] = tris(ob)
        if cap:
            mo = to_object(name + '_moss', cap, moss, loc, rot, coll)
            report[mo.name] = tris(mo)
    for seed, s, (gx, gz) in pebbles:
        rnd = random.Random(seed)
        bm = boulder(seed, (s * 1.25, s, s * 1.05), subdiv=1, cuts=4, sink=.06, bumps=.1)
        shade(bm, s * 1.05, rnd, strata=False)
        ob = to_object(f'pebble{seed}', bm, stone, Vector((gx, -gz, 0)), rnd.uniform(0, 6.28), coll)
        report[ob.name] = tris(ob)
    out = ROOT / 'assets' / ('lo/rock.glb' if lite else 'rock.glb')
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_active_collection=False,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_normals=True, export_yup=True, export_apply=True, export_materials='EXPORT')
    return {'file': str(out.relative_to(ROOT)), 'tris': sum(report.values()), 'parts': report}


rep = [build(False), build(True)]
(ROOT / 'art' / 'r45' / 'rock_report.json').write_text(json.dumps(rep, indent=1))
print(json.dumps(rep))
