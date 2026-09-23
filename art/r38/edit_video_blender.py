"""R38 Gameplay-Video, Schritt 2: Schnitt und Ton im Blender-Videoschnitt (VSE), Export als MP4.
Bilder aus art/r38/capture_frames.mjs (.scratch/r38-frames), Toene aus dem Spiel (ElevenLabs-Fundus),
exakt auf die protokollierten Spielereignisse gelegt. Eigene Szene, die Nutzer-Szene bleibt unberuehrt.
"""
import bpy, json, os, pathlib

ROOT = pathlib.Path(r'C:/Users/User/Documents/Playground/mushroom-rally')
FR = ROOT / '.scratch' / 'r38-frames'
AU = ROOT / 'assets' / 'audio'
OUT = ROOT / 'media' / 'r38_magnet_achterbahn.mp4'
FPS, END_SEC = 30, 4.5
ev = json.loads((FR / 'events.json').read_text(encoding='utf-8'))
N = ev['frames']

sc = bpy.data.scenes.get('R38_Video') or bpy.data.scenes.new('R38_Video')
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100
sc.render.fps, sc.render.fps_base = FPS, 1.0
# Farben 1:1 wie im Spiel: 'Standard' statt AgX (AgX dunkelte die Bilder um ~10 % ab)
try:
    sc.view_settings.view_transform = 'Standard'
except TypeError:
    pass
se = sc.sequence_editor_create()
for s in list(se.strips_all):
    se.strips.remove(s)

frames = sorted(f for f in os.listdir(FR) if f.startswith('f') and f.endswith('.jpg'))
img = se.strips.new_image('gameplay', str(FR / frames[0]), channel=1, frame_start=1)
for f in frames[1:]:
    img.elements.append(f)
total = N + int(END_SEC * FPS)
card = se.strips.new_image('endcard', str(FR / 'endcard.jpg'), channel=2, frame_start=N - 7)
card.frame_final_duration = total - (N - 7) + 1
card.blend_type = 'ALPHA_OVER'
card.blend_alpha = 0.0
card.keyframe_insert('blend_alpha', frame=N - 7)
card.blend_alpha = 1.0
card.keyframe_insert('blend_alpha', frame=N + 3)

def snd(name, rel, t, vol=1.0, ch=3):
    s = se.strips.new_sound(name, str(AU / rel), channel=ch, frame_start=max(1, int(round(t * FPS)) + 1))
    s.volume = vol
    return s

placed = []
# Musik unter allem, am Ende ausblenden; Startansage zum Countdown
bgm = snd('bgm', 'bgm_race.mp3', 0, .5, ch=3)
bgm.frame_final_end = min(bgm.frame_final_end, N + 12)
bgm.volume = .5
bgm.keyframe_insert('volume', frame=N - 20)
bgm.volume = 0.0
bgm.keyframe_insert('volume', frame=N + 10)
snd('start', 'voice/start.mp3', .15, 1.0, ch=4)
ch = 5
MAP = [('MAGNET-KATAPULT', [('sfx/launch.mp3', 0, 1.0), ('voice/launch.mp3', .35, 1.0)]),
       ('AIRTIME', [('sfx/ramp.mp3', 0, .8)]),
       ('SUPER-ACHTERBAHN', [('voice/coaster.mp3', .05, 1.0), ('sfx/boost.mp3', 0, .7)]),
       ('ACHTERBAHN-SCHWUNG', [('sfx/boost.mp3', 0, .7)]),
       ('LOOPING-SCHWUNG', [('sfx/boost.mp3', 0, .7)]),
       ('WINDSCHATTEN', [('sfx/boost.mp3', 0, .45)]),
       ('MINI-TURBO', [('sfx/boost.mp3', 0, .4)]), ('SUPER-TURBO', [('sfx/boost.mp3', 0, .45)]),
       ('ÜBERKOPF', [('sfx/trick.mp3', 0, .45)])]
for e in ev['events']:
    for key, parts in MAP:
        if e['text'].upper().startswith(key):
            for rel, dt, vol in parts:
                snd(f"{key}_{e['i']}_{rel.split('/')[-1]}", rel, e['t'] + dt, vol, ch=ch)
                ch = 5 + (ch - 4) % 6
                placed.append((e['t'], rel))
            break
# Endkarte: Siegesjingle und Jubel
snd('jingle', 'sfx/jingle.mp3', N / FPS, .8, ch=11)
snd('cheer', 'sfx/cheer.mp3', N / FPS + .2, .45, ch=12)

sc.frame_start, sc.frame_end = 1, total
sc.render.use_sequencer = True
sc.render.use_compositing = False
isett = sc.render.image_settings
if 'media_type' in isett.bl_rna.properties:
    items = [i.identifier for i in isett.bl_rna.properties['media_type'].enum_items]
    isett.media_type = 'VIDEO' if 'VIDEO' in items else items[-1]
formats = [i.identifier for i in isett.bl_rna.properties['file_format'].enum_items]
isett.file_format = 'FFMPEG' if 'FFMPEG' in formats else formats[0]
ff = sc.render.ffmpeg
def pick(obj, prop, want):
    items = [i.identifier for i in obj.bl_rna.properties[prop].enum_items]
    setattr(obj, prop, want if want in items else items[0])
    return getattr(obj, prop)
report = {'container': pick(ff, 'format', 'MPEG4'), 'codec': pick(ff, 'codec', 'H264'),
          'crf': pick(ff, 'constant_rate_factor', 'HIGH'), 'preset': pick(ff, 'ffmpeg_preset', 'GOOD'),
          'audio': pick(ff, 'audio_codec', 'AAC')}
ff.audio_bitrate = 192
ff.audio_mixrate = 48000
pick(ff, 'audio_channels', 'STEREO')
ff.gopsize = 30
sc.render.filepath = str(OUT)
report.update({'frames': total, 'events': len(ev['events']), 'sounds': len(placed) + 5, 'placed': placed})
(ROOT / 'art' / 'r38' / 'video_edit_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))


def render(out=None, percent=100, kbps=None):
    """Rendert die Schnittfolge. kbps=None: Qualitaet ueber CRF (HIGH); sonst feste Bitrate
    (fuer die kleine Social-Fassung unter 10 MB)."""
    sc.render.resolution_percentage = int(percent)   # ganzzahlig; 75 % = 810x1440 (gerade Kanten fuer H.264)
    if kbps:
        pick(ff, 'constant_rate_factor', 'NONE')
        ff.video_bitrate = kbps
        ff.minrate, ff.maxrate, ff.buffersize = 0, int(kbps * 1.6), int(kbps * 2)
        ff.audio_bitrate = 160
    else:
        pick(ff, 'constant_rate_factor', 'HIGH')
        ff.audio_bitrate = 192
    sc.render.filepath = str(out or OUT)
    bpy.ops.render.render(animation=True, scene=sc.name)
    return sc.render.filepath
