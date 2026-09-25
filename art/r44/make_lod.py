"""Mushroom Rally R44: Low-Poly-Fassungen aller schweren Modelle fuer den Leicht-Modus (Handys).
Aufruf: blender -b --factory-startup --python art/r44/make_lod.py
Liest assets/*.glb, reduziert Objekte ueber MIN_TRIS mit Decimate (Collapse) so, dass das Modell auf etwa
TARGET seiner Dreiecke kommt (je Objekt nie unter FLOOR), und schreibt assets/lo/<name>.glb mit gleichen
Objekt- und Materialnamen (Tint per Materialname, Drachen-/Transformteile per Objektname bleiben gueltig).
Kleine Teile (Augen, Knoepfe, Glanzpunkte) bleiben unangetastet.
"""
import bpy, pathlib, json, sys
# optional: nur bestimmte Modelle neu erzeugen (blender ... --python make_lod.py -- castle gate)
ONLY = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else None

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
SRC = ROOT / 'assets'
DST = SRC / 'lo'
DST.mkdir(exist_ok=True)
MIN_MODEL = 2500      # Modelle darunter lohnen nicht
MIN_TRIS = 180        # Objekte darunter bleiben unveraendert
TARGET = .42
FLOOR = .25
SKIP = {'kart_merged.glb', 'hazards.glb'}
# Kleine Modelle, die hundertfach instanziert stehen: halbieren, auch wenn sie unter MIN_MODEL liegen
MANY = {'coin', 'tree', 'mushroom', 'rock', 'fence', 'spectator', 'pumpkin', 'gravestone', 'crystal', 'balloon', 'kartwheel', 'grandstand', 'coastertruss', 'elements', 'itembox'}
report = {}

def tris_of(o):
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)

for f in sorted(SRC.glob('*.glb')):
    if f.name in SKIP or (ONLY and f.stem not in ONLY):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(f))
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    before = {o.name: tris_of(o) for o in meshes}
    total = sum(before.values())
    many = f.stem in MANY
    if total < MIN_MODEL and not (many and total > 150):
        continue
    lim = 60 if many else MIN_TRIS
    big = sum(t for t in before.values() if t >= lim)
    small = total - big
    # Anteil fuer die grossen Teile, damit das Ganze auf TARGET kommt (Vielfach-Modelle: halbieren)
    tgt = .5 if many and total < MIN_MODEL else TARGET
    ratio = max(FLOOR, min(1.0, (tgt * total - small) / max(1, big)))
    for o in meshes:
        if before[o.name] < lim:
            continue
        m = o.modifiers.new('LOD', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = ratio
        m.use_collapse_triangulate = False
    dg = bpy.context.evaluated_depsgraph_get()
    after = 0
    for o in meshes:
        me = o.evaluated_get(dg).to_mesh()
        me.calc_loop_triangles()
        after += len(me.loop_triangles)
        o.evaluated_get(dg).to_mesh_clear()
    for o in bpy.data.objects:
        o.select_set(True)
    target = DST / f.name
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_cameras=False, export_lights=False)
    report[f.stem] = {'before': total, 'after': after, 'ratio': round(ratio, 3), 'kb': round(target.stat().st_size / 1024, 1)}
    print('LOD', f.stem, total, '->', after)

rp = ROOT / 'art' / 'r44' / 'lod_report.json'
old = json.loads(rp.read_text(encoding='utf-8')) if (ONLY and rp.exists()) else {}
old.update(report)
rp.write_text(json.dumps(old, indent=1), encoding='utf-8')
print('REPORT', json.dumps(report))
