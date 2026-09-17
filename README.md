# Mushroom Rally

Spielbarer 3D-Arcade-Kart-Prototyp fuer den Browser, gebaut am 13.09.2026.

Live: https://madd1in.github.io/mushroom-rally/

## Runde 10 (18.09.2026): Menue im Spiel-Look, Tunnel & Bruecken, vier Fahrerfiguren

**Menue:** Statt Formularleisten jetzt eine Karte mit Glas-/Schattenrand, Marken-Kopf und eigener
Schrift (Baloo 2). Jede Strecke ist eine Bildkarte: Der Mini-Streckenplan wird aus derselben
Mittellinie gezeichnet, die auch im Spiel gefahren wird (Canvas, einmal pro Strecke), dazu Icon,
Name, Bestzeit/Medaille und die Themenfarben der Welt als Verlauf. Neu ist eine Fahrerauswahl
neben der Kartfarbe; die Wahl wird gespeichert und sofort im Startfeld gezeigt.

**Fahrerfiguren:** Es gibt vier statt einer: Pilzi (Pilz), Schildi (Schildkroete mit Panzer und
Schwimmbrille), Volt (Roboter mit Visier und Antenne) und Mochi (Katze mit Helm). Alle in Blender
gebaut, gleiche Masse wie die alte Figur, faerbbare Flaeche (`CapPaint`) fuer die Kartfarbe. Das
KI-Feld mischt die Figuren; die Instanzierung baut pro Figurtyp einen eigenen Satz Instanzen,
Zeichenaufrufe bleiben dadurch bei 79–133 je Strecke.

**Geisterhaus:** Die Villa ist neu gebaut — Torbogen aus Keilsteinen ueber der Fahrbahn (Durchfahrt
24 m breit, 17 m hoch), Fensterrose, Balkon mit Eisengelaender, zwei Fluegel mit Fachwerk, Erkern,
Gauben und schiefen Schornsteinen, dazu zwei Tuerme mit Zinnen und krummen Spitzen sowie Laternen
in der Durchfahrt. Nach Material zusammengefasst: 9 Meshes, 18,5k Dreiecke, 720 kB.

**Tunnel (neu):** Gewoelbe ueber der Strecke mit Portalen, Wandlichtern und Fels aussen herum.
Vier Ausfuehrungen: Pilzstamm (Wald), Felstunnel (Canyon), Neonroehre mit Leuchtringen (Neonwald),
Gruft (Geisterhaus). Drinnen sinkt die Belichtung um ein Viertel und der Scheinwerfer geht an;
Leitplanken laufen durch den Tunnel mit, Deko haelt Abstand.

**Mehr Bruecken und Spruenge:** Canyon und Neonwald bekommen je einen Viadukt-Abschnitt (Deck,
Seitenwaende, Pfeiler), das Geisterhaus einen Viadukt ueber die Senke; Wald und Neonwald bekommen
je einen Sprung ueber eine Schlucht mit Anlauframpe und Boostfeld davor. Schluchten sind jetzt
eine Liste statt einer einzelnen Stelle.

**Gabelungen muenden sauber:** Die Abzweigung waechst als Keil aus der Aussenkante der
Hauptstrecke heraus und laeuft dort auch wieder hinein (variable Breite je Stuetzpunkt), statt als
Rechteck mitten auf der Fahrbahn zu enden. Randsteine laufen aussen durch, innen nur dort, wo
wirklich eine Insel dazwischen liegt. Die Fahrphysik nutzt dasselbe Band (`forkBand`), damit
Fahrbahn und Kollision zusammenpassen.

**Sonstiges:** Gras wiegt sich im Wind (Vertex-Shader auf den Gras-Instanzen), Streckenlayouts von
Canyon und Geisterhaus haben eine echte Haarnadel bzw. einen schaerferen Haken bekommen,
Medaillenzeiten neu gemessen (85/93/99/92 s Gold), alte Rekorde einmalig verworfen
(`LAYOUT_VER=10`).

**Gemessen** (Autopilot, 150cc, 3 Runden): alle vier Strecken fahren durch, KI ist 0,1–4,4 % der
Zeit neben der Strecke; 79–133 Zeichenaufrufe, 205k–370k Dreiecke. Die CPU-Zeit pro Bild war
waehrend der Messung 48–62 ms — auf diesem Rechner liefen parallel Unreal Editor und Blender, die
sich die GPU teilen; ohne sie lagen dieselben Szenen in Runde 9 bei 10–22 ms.

## Runde 9 (17.09.2026): Leitplanken, Viadukt, Abzweigungen, schnelle Streckenwahl

**Ladezeiten im Menue:** Jede gebaute Strecke bleibt als eigene Szenengruppe im Speicher; ein
Wechsel tauscht nur die Gruppe (gemessen 11–45 ms statt 1–2 s). Waehrend das Menue im Leerlauf
ist, werden die restlichen Strecken im Hintergrund vorgebaut (~215 ms je Strecke) und ihre Shader
per `compileAsync` kompiliert. Eine frisch gebaute Strecke wird ausserdem ueber mehrere Frames
schrittweise eingeblendet, statt den ersten Frame ~500 ms blockieren zu lassen. Dazu schnellere
Bauschritte: Projektion grob→fein (statt 2048 Vergleiche), Streifen-Geometrie ohne
Zwischenobjekte, gecachte Boden-/Strassen-Texturen.

**Leitplanken:** Aussen an kritischen Kurven (Radius < 48 m) und beidseitig auf erhoehten
Abschnitten stehen durchgehende Planken mit Pfosten (Farben je Welt, im Neon-/Spuk-Wald
leuchtend). Die Kollision laesst das Kart entlanggleiten statt zu stoppen: Rueckstellung an die
Plankenlinie, kleiner Geschwindigkeitsverlust, Funken und Kratzgeraeusch — harte Treffer setzen
die Drift-Combo zurueck.

**Unterfuehrung:** Die Pilz-Promenade ist jetzt eine Acht. Die Strecke kreuzt sich selbst, der
zweite Durchgang laeuft als Viadukt (8 m hoch, Deck, Seitenwaende, Pfeiler) ueber den ersten.
Dafuer: hoehenbewusste Projektion (die Ebene mit passender Hoehe gewinnt), keine Boeschung unter
der Bruecke, Pfeiler nur ausserhalb der unteren Fahrbahn, und Hoehenpruefung bei Bananen und
Bomben, damit von oben nichts nach unten trifft.

**Weggabelungen:** Sonnen-Canyon und Neon-Pilzwald haben eine Abkuerzung: eine tangential
anschliessende Bezier-Innenlinie mit eigener (schmalerer) Fahrbahn, Curbs, Insel mit Pilzen und
Schild. Canyon spart 25 m (Radius 63 m), der Neon-Pilzwald 20 m (Radius 132 m); die Hauptlinie
behaelt dafuer Boost-Pad bzw. Pendelpilz. Sporen und zwei Item-Boxen liegen auf der Abkuerzung.
Die KI entscheidet sich je nach Koennen fuer eine Route und bremst auf der Innenlinie passend.

**Flow:** Die Mittellinie wird beim Bauen automatisch geglaettet — enge Stellen (< 24 m Radius)
werden iterativ aufgeweitet, der Rest bleibt wie entworfen. Ergebnis: kleinster Radius auf allen
vier Strecken 23,6–24 m (vorher 6–14 m), KI-Anteil abseits der Strecke 0–7 % (vorher 7–17 %).
Fahnen, Laternen, Pfeiltafeln und Kuerbisse stehen weiter aussen (12,6–13 m statt 9,8–12 m), damit
man am Rand nicht mehr haengen bleibt; Item-Boxen liegen nicht mehr im Startfeld. Die Zaeune sind
durch die Leitplanken ersetzt.

Weil sich die Layouts geaendert haben, werden alte Bestzeiten, Geister und Medaillen einmalig
verworfen (`LAYOUT_VER`); die Medaillenzeiten sind per Autopilot neu kalibriert. Draw-Calls im
Rennen 56–128, Frame-CPU 10–22 ms.

## Runde 8 (17.09.2026): Fluessiger, minimales Menue, Pilzbombe & Drift-Combos

**Performance (gemessen auf Intel UHD, `rallyTest.bench()`):** Draw-Calls im Rennen von 310–460 auf
70–150, Render-Zeit pro Frame auf der Pilz-Promenade von ~39 ms auf 8–15 ms (bei freier GPU). Die
wichtigsten Schritte:
- Schattenkamera nur noch ±62 m um den Spieler statt der ganzen Insel, einfacher PCF-Filter. Auf
  Touch-Geraeten und bei niedriger FPS werden Schatten nur jeden zweiten Frame aktualisiert.
- GLB-Teile ohne Einfaerbung werden beim Laden in Vertexfarben gebacken (ein Mesh statt vieler).
- Baeume, Pilze, Felsen, Zaeune, Grabsteine, Kuerbisse und Gras laufen instanziert in raeumlichen
  Kacheln. Die Lackfarbe kommt pro Instanz, das Leuchten wird per Shader mit eingefaerbt.
- Die 7 KI-Karts teilen sich je Bauteil ein InstancedMesh (Karosserie, Lack, Fahrer, Kappe, Raeder).
- Funken, Reifenspuren und Staubwolken sind je ein InstancedMesh. Fahnen, Pfeiltafeln, Wolken,
  Huegel und Tafelberge sind zu wenigen Meshes verschmolzen.
- **Ruckler am Anfang:** Ein Neustart auf derselben Strecke baut die Welt nicht mehr neu auf
  (vorher ~1 s, jetzt ~20 ms). Shader werden per `compileAsync` im Hintergrund kompiliert; bis dahin
  zeigt das Menue „Strecke lädt …“ und der Countdown wartet. Flammen, Schild, Banane, Panzer, Bombe
  und Geist werden vorab mitkompiliert. Audio wird nacheinander dekodiert, Rausch-SFX nutzen einen
  gemeinsamen Puffer, und die Minimap zeichnet ihre statische Ebene nur einmal.
- Hinweis: Ein laufender Unreal Editor belegt auf demselben Rechner dauerhaft GPU und CPU. Damit
  schwankten die Messungen um den Faktor 5–10. Zum Spielen Unreal schliessen.

**Menue minimal:** Titel, Modus (Rennen/Grand Prix/Zeitfahren), Klasse, vier Strecken-Kacheln,
Kartfarben als Kreise, Start-Knopf, eine Zeile fuer Pokale/Medaillen. Behoben: Die normalen
Kartfarben wurden faelschlich als gesperrt markiert (`classList.toggle` mit `undefined`).
Kart- und KI-Farben sind jetzt kraeftiger.

**Neu im Spiel:** **Pilzbombe 💣** (vor allem Mittelfeld-Item): fliegt im Bogen voraus, zischt
nach der Landung und explodiert nach 1,1 s oder bei Kontakt. Die Druckwelle (6,5 m) schleudert
Karts hoch und kostet Sporen, das Sternenschild blockt. **Drift-Combo:** Mini-Turbos im Abstand von
hoechstens 4,5 s zaehlen hoch (×2, ×3 …) und geben je eine Spore. Wiese, Wand oder Treffer setzen
die Combo zurueck, die beste Combo steht im Ergebnis. Dazu Grasbueschel am Strassenrand je Welt
und ein Druckwellen-Ring bei Explosionen. Tests: 15 (neu: Bombe, Combo).

## Runde 7 (17.09.2026): Koennen statt Schienen, Geisterhaus, Zeitfahren

**Fahrphysik neu (`core.mjs`):** Das Kart faehrt nicht mehr auf der Strecke entlang, sondern frei
(Position, Richtung, Geschwindigkeit). Die Strecke wird nur noch fuer Rundenfortschritt und Offroad
projiziert. Wer nicht lenkt, faehrt geradeaus in die Wiese. Tempo nach Mario-Kart-Vorbild: 30 m/s
Spitze (108 km/h), Turbo 40 m/s. Offroad bremst hart auf 12,5 m/s. Driften ist steuerbar: Gegenlenken
ergibt einen weiten Bogen, Einlenken einen engen. Mini-Turbos laden in drei Stufen
(blau/orange/lila). Karts rempeln sich, Baeume/Felsen/Zaeune sind Hindernisse, grosse Abkuerzungen
zaehlen nicht. Ein Rettungspilz setzt nach Schluchtstuerzen zurueck.

**KI mit Koennen:** Ideallinie, Pure-Pursuit-Lenkung, Bremspunkte aus einer
Kurvengeschwindigkeits-Tabelle und Drift-Einsatz je Klasse (50cc/100cc/150cc). Das Gummiband ist
nur noch mild, der Spieler startet von Platz 6.

**Erfolgserlebnis:** Klassenwahl, Grand-Prix-Pokale je Klasse, freischaltbares Goldpilz-Kart,
Sterne (bei Sieg ohne Treffer: „Perfekt"), Ergebnis-Statistik (beste Runde, Mini-Turbos, Tricks,
Ringe, Windschatten, Ueberholmanoever, Treffer), Rundenzeiten-Einblendung. **Zeitfahren 👻**: Deine
Bestfahrt wird aufgezeichnet und faehrt als Geist mit; im HUD steht der Abstand zum Geist, dazu
Gold-/Silber-/Bronze-Medaillen je Strecke.

**Strecken:** Pilz-Promenade (sattes Gruen), Sonnen-Canyon (Abendrot, rote Felsnadeln, Kakteen,
Plateau mit Schluchtsprung), Neon-Pilzwald (Pendel-Pilze, leuchtende Curbs, Gluehwuermchen) und neu
das **Geisterhaus**: Die Strasse fuehrt mitten durch eine Spukvilla (Blender: Halle mit
Kronleuchtern und Portraits, zwei schiefe Tuerme). Buh-Geister schweben quer ueber die Fahrbahn
(Dreher + Sporenverlust), dazu Friedhof, Kuerbislaternen und Fledermaeuse. Schanzen, Pads und
Boost-Felder suchen sich automatisch gerade Abschnitte. Die Strassen-Ueberhoehung kippt jetzt um die
Innenkante, damit die Wiese die Strecke nicht mehr verschluckt. Pfeiltafeln kuendigen enge Kurven
frueh an, eine Startampel zeigt das Raketenstart-Timing.

**Fahrermodelle (Blender):** Pilzkinder mit Gesicht, gepunkteter Kappe in Kartfarbe, Schal,
Latzhose und Handschuhen. Kart, Raeder (`kartwheel.glb`) und Fahrer (`driver.glb`) sind getrennt:
Raeder drehen und lenken, der Fahrer lehnt sich in Kurven, wackelt bei Treffern und jubelt im Ziel
und auf dem Podest. Neu sind ausserdem Windschatten-Boost, Speedlines beim Turbo,
Landungs-Stauchung und Scheinwerfer auf Nachtstrecken.

**Mobile:** DRIFT sitzt direkt ueber GAS in der rechten Daumenspalte und gibt selbst Gas. Der Daumen
darf zwischen den Tasten gleiten (Toleranz zwischen den Tasten). Mit Auto-Gas (Menue oder Pause)
wird DRIFT zur grossen Einzeltaste. Die Stimme ist lauter, die Musik wird beim Sprechen staerker
abgesenkt. `assets/keyart.jpg` ist jetzt eine Spielszene aus dem Geisterhaus.

Tests: `node --test core.test.mjs` (13 Tests: Beschleunigung, freies Lenken, Offroad, Drift-Stufen,
Kurventabelle, Abkuerzungen, Kollision, Items, Sterne). Unter `?test=1` faehrt
`rallyTest.autopilot(true)` alle vier Strecken durch; damit wurden Rundenzeiten, Offroad-Anteile
der KI und die Medaillenzeiten kalibriert.

## Mobile-Nachbesserung 16.09.2026 (diese Session)

Long-Press auf GAS erzeugte Textmarkierung: jetzt `user-select:none` + `-webkit-touch-callout:none`
global, `touch-action:manipulation` auf allen Buttons und `oncontextmenu`-Block auf den
Touch-Tasten (per Touch-emuliertem Browser-Test bestaetigt: 1,8-s-Hold, Selektion bleibt leer).
Das Hochformat-Layout dieser Sektion unten wurde pixelgenau bei 390x844 nachgeprueft: zwei
Vollbreiten-Reihen, alle Tasten ~98 px, GAS anteilig breiter, Tacho/Minimap darueber, kein
Overflow, safe-area-Abstand. Offener Punkt: `assets/keyart.jpg` ist in og:image referenziert,
existiert aber noch nicht (nur Share-Vorschau betroffen).

## Runde 5 (16.09.2026): ElevenLabs-Sound, neue Items, Unreal-Showcase

**Musik (ElevenLabs Music v2, instrumental):** drei neue BGM-Tracks ersetzen die selbst
synthetisierten Loops — `assets/audio/bgm_race.mp3` (Funk/Chiptune, 150 BPM, 96 s) fuer die
Tag-Kurse, `bgm_night.mp3` (Synthwave, 140 BPM, 96 s) fuer den Nacht-Kurs Sternen-Garten und
`bgm_menu.mp3` (Ukulele/Marimba-Cafe, 104 BPM, 64 s). KI-Musik loopt nicht nahtlos, deshalb hat
jeder Track zwei `<audio>`-Elemente, die 2,2 s vor dem Ende per Equal-Power-Kurve ueberblenden
(`bgmTick`). Die Renn-Tracks laufen weiter durch den tempoabhaengigen Tiefpass. Im Ziel stoppt die
Rennmusik, eine Siegesfanfare (`sfx/jingle.mp3`) spielt, danach setzt die Menue-Musik ein.
Die alten Loops (`race_own.wav`, `menu_own.wav`) liegen noch im Ordner, werden aber nicht geladen.

**Sprecher (ElevenLabs TTS, Stimme "Leo", deutsch):** 14 Ansagen unter `assets/audio/voice/`
(Start, Runde 2, letzte Runde, Turbo, Volltreffer, Autsch, Banane, Sternenschild, Fuehrung,
Sieg/Podium/Ziel, Bestzeit, Willkommen). Sie laufen als WebAudio-Puffer; die Musik wird waehrend
einer Ansage abgesenkt (Zeitstempel statt `onended`). Wichtige Ansagen werden von Item-Rufen nicht
unterbrochen, zwei wichtige laufen nacheinander. Web-Speech bleibt nur als Ersatz, falls eine Datei fehlt.

**SFX (ElevenLabs Text-to-Sound):** Item-Pickup, Bananen-Rutscher, Panzer-Treffer, Jubel im Ziel
(Platz 1–3). Solange ein Puffer noch nicht dekodiert ist, greift die alte WebAudio-Synthese.

**Neue Item-Modelle (Blender-MCP, Blender 5.2):** `assets/banana.glb` (Bananenschale, 3 Materialien)
und `assets/shell.glb` (Such-Panzer mit Sechseck-Flecken). Der Such-Panzer fliegt jetzt sichtbar
entlang der Strecke zum Ziel; der Treffer (Dreher) wirkt erst bei Ankunft. **Auch die KI legt jetzt
Bananen und schiesst Panzer auf den Spieler** — Bananen treffen jeden ausser dem Leger (Spieler
1,5 s Dreher, KI 2 s), das Sternenschild wehrt beides ab. Kamerawackler bei Treffern, Ansage
"Du fuehrst!" beim Uebernehmen von Platz 1.

**Mobile Hochformat:** Touch-Tasten in zwei Vollbreiten-Reihen; Runde/Zeit sitzen rechts oben, damit
die Positionsanzeige bei 375 px nicht mehr unter der Zeit-Box liegt.

**Unreal (UE 5.8, Projekt `test123 5.8`):** Alle GLBs (Kart, Tor, Baum, Pilz, Fels, Zaun, Ballon,
Item-Box, Banane, Panzer) liegen unter `/Game/MushroomRally`. Neu ist das Showcase-Level
`/Game/MushroomRally/Maps/L_MushroomRally`: Insel mit ovaler Strecke, Curbs, Boost-Pads,
Start-Ziel-Tor mit Schild, Startgitter aus 8 eingefaerbten Karts, Item-Boxen, Bananen/Panzern,
34 Pilz-Baeumen, Riesenpilzen, Felsen, Zaeunen, Ballons, Huegeln, Himmel/Nebel und drei
CineCameras (`MR_Cam_StartGrid`, `MR_Cam_Overview`, `MR_Cam_Infield`).

Testschnittstelle (`?test=1`): `rallyTest.tick(n)` treibt die Simulation ohne `requestAnimationFrame`
voran (noetig in nicht sichtbaren Fenstern), dazu `aiUse(id,item)`, `items()`, `voice()`,
`bgmTrack()`. `server.cjs` beantwortet jetzt Range-Requests wie GitHub Pages (sonst kann `<audio>`
beim Ueberblenden nicht zurueckspringen).

## Grafik & Musik Runde 4 (16.09.2026)

Item-Boxen sind jetzt Geschenk-Modelle aus Blender (`assets/itembox.glb`, goldene
Rundbox mit rotem Band und Schleife, 396 Dreiecke) mit einem schwebenden roten
„?"-Sprite darueber (billboardet, bleibt also immer lesbar). Der Spieler-Kart pustet
beim Anfahren graue Auspuff-Puffs (Pool, max. 24, steigen auf und verwehen). Der
Nacht-Kurs Sternen-Garten hat zusaetzlich zum Sternenhimmel jetzt einen Mond, und um
die Insel pulsiert ein heller Kuestenschaum-Ring auf dem Wasser.

Musik komplett eigenständig: Auch das Menue läuft jetzt mit einem eigenen Track
(`assets/audio/menu_own.wav`, „Pilz-Cafe", 100 BPM, C-Dur, 58 s) — Dreieck-Melodie
ueber Cmaj7/Am7/F/G7, weicher Bass, Besen-Percussion. Die Rennmusik laeuft zudem
durch einen dynamischen Tiefpass (WebAudio), der sich mit dem Tempo oeffnet: Im
Stand klingt die Musik geschlossen, bei Vollgas und Turbo voll auf. Neu ist auch
ein Bestzeiten-Jubel (goldene Konfetti, Ansage und Einblendung bei neuer Bestzeit).

## Grafik- & Sound-Update 16.09.2026, Runde 2

Drei neue Blender-Assets (headless gebaut, numerisch geprueft, EEVEE-Rendercheck):
`rock.glb` (Felsformation mit Mooskappe, per InstancedMesh ueber die Landschaft gestreut),
`fence.glb` (Zaunstueck; wird automatisch auf die Aussenseiten scharfer Kurven gesetzt,
Kurvenkruemmung aus den Streckensamples berechnet, instanziert = 1 Draw-Call je Material)
und `balloon.glb` (Heissluftballon mit Bannern, Korb und Seilen; 4 pro Kurs, getintet,
schweben langsam). Dazu im Code: dunkle Reifenspuren (Skid marks) beim Driften aus einem
90er-Quad-Pool ohne Allokierung im Frame-Loop, und ein 500-Punkte-Sternenhimmel fuer den
Nacht-Kurs Sternen-Garten (weiter Nebel dort). Draw-Calls im Rennen blieben bei ~378.

Musik und SFX sind jetzt komplett selbst erstellt: Die Renn-BGM `assets/audio/race_own.wav`
ist ein eigener Chiptune-Track („Pilz-Grand-Prix", 150 BPM, A-Moll, 51 s Loop) — komponiert
als Notendaten und per Node.js-Skript synthetisiert (Square-Lead mit Delay, Triangle-Bass,
Arp-Flaeche, Kick/Snare/Hat), 32 kHz Mono, 3,1 MB, numerisch geprueft (RMS/Peaks, Loop-Fade).
Die SFX-Suite ist reines WebAudio ohne Dateien: geschichteter Motor-Sound (Saegenzahn +
Sub-Square durch Tiefpass, drehzahlabhaengig geglaettet), Drift-Screech (Bandpass-Rauschen),
Turbo-Whoosh, Item-Klaenge, Runden-Chime und Ziel-Fanfare. ElevenLabs war nicht einbindbar:
Der MCP-Server ist konfiguriert, aber in dieser Session nicht verbunden und ein API-Key
liegt nicht vor; sobald beides vorhanden ist, koennen Musik/Sprachausgabe dort erzeugt werden.

## Sound-Update 16.09.2026

Musik steht jetzt standardmaessig auf AN (♪ AN); Browser-Autoplay-Beschraenkungen werden
abgefangen: Der Ton startet mit der ersten Nutzereingabe (Klick oder Taste), fruehere
Autoplay-Blockaden werden beim Arming aufgeraeumt und erneut versucht. Die Renn-BGM ist
jetzt `Five Star Mayhem` (A-Variante, aus dem Shuffle-Bestand des Nutzers) statt des
entspannteren Boulevard-Heat-Loops; im Menue bleibt Radio Chrom. Neu sind deutsche
Ansagen ueber die lokale Web-Speech-API (kein Netz, keine Kosten): Startfreigabe,
Rundenwechsel, Volltreffer, Turbo und Endplatzierung; pausierbar ueber den Ton-Schalter.
Die Sprecherqualitaet haengt vom installierten Windows-Stimme ab. ElevenLabs war in
dieser Session nicht erreichbar (MCP nicht verbunden, kein API-Key) — fuer Eleven-Music-
Tracks oder hochwertiges TTS muss der ElevenLabs-MCP erst wieder verbunden werden.
Entfernt: das Speedlines-Overlay (gleichmaessige senkrechte Streifen beim Turbo), das
als Renderfehler wahrgenommen wurde; Boost-Feedback kommt jetzt nur aus FOV-Kick,
Kamerabeben, Funken und HUD.

## Asset-Update 15.09.2026, Runde 2 (Blender-CLI)

Start-Ziel-Tor und Streckenbaeume sind jetzt echte Blender-Modelle: `assets/gate.glb`
(Pfeiler mit Pilzkappen, dunkler Ellipsenbogen, rotes Bannerbrett fuer das MUSHROOM-RALLY-
Schild, 1.412 Dreiecke, 5 Materialien) und `assets/tree.glb` (Pilz-Baum mit zweistoeckiger
Krone, 828 Dreiecke, 3 Materialien). Gebaut headless per Blender 5.2 (`--background`),
numerisch verifiziert (Dreiecke, Boundingbox, Materialnamen) und per EEVEE-Rendercheck
geprueft; exportiert als glTF. Der Pilz-Baum ersetzt pro Instanz den frueheren
Prozedural-Bau (gleiche Draw-Call-Zahl, drei Kronengruentoene per `CapPaint` getintet);
das Tor loest den alten Kasten-Bogen ab, das MUSHROOM-RALLY-Textschild bleibt Canvas-
basiert liegen. Bei fehlenden Dateien greift weiter der prozedurale Fallback. `npm test`
unveraendert gruen (4/4). Beide neuen GLB-Dateien wurden ebenfalls per offiziellem
Unreal-MCP (UE 5.8, Testprojekt test123, /Game/MushroomRally) importiert und dort als
StaticMeshes mit Materialinstanzen verifiziert; im Spiel geaendert hat das nichts.

## Asset-Update 15.09.2026 (Blender-MCP)

Kart und Pilz-Requisite sind kein reiner Code mehr: Beide wurden am 15.09.2026 per Blender-MCP (Blender 5.2, Collection `MushroomRally`) als Low-Poly-Modelle gebaut, numerisch verifiziert, visuell per Render geprüft und als glTF exportiert (`assets/kart.glb` 38 Teile, `assets/mushroom.glb`, zusaetzlich `assets/kart_merged.glb` als Ein-Mesh-Variante, 3.644 Dreiecke). `vendor/GLTFLoader.js` und `vendor/BufferGeometryUtils.js` (three.js r165) wurden als lokale Kopien ergaenzt; es bleibt bei einer lokalen Runtime ohne CDN. Das Spiel laedt die Prototypen beim Start und faerbt `BodyPaint` pro Fahrer bzw. `CapPaint` pro Pilz; faellen die Dateien aus, greift automatisch der bisherige prozedurale Bau als Fallback. `npm test` bleibt unberuehrt (4/4). Dieselben GLB-Dateien wurden zusaetzlich per offiziellem Unreal-MCP (UE 5.8) in ein Testprojekt importiert, um die Pipeline Blender -> glTF -> Unreal zu validieren; im Spiel geaendert hat das nichts.

## Performance und Mobile (15.09.2026)

Das Spiel ist auf FPS und schwache Hardware ausgelegt: GLB-Prototypen werden beim Laden
nach Material zu wenigen Meshs verschmolzen (Kart 38 Teile -> ~8 Meshs, Rennen ~356 Draw-
Calls statt ~600), die Schattenkarte ist auf 1024 px begrenzt, auf Touch-Geraeten startet
der Renderer ohne Antialiasing mit hoechstens 1.25x Pixel-Ratio. Eine adaptive Qualitaet
misst alle 2 Sekunden die FPS im Rennen und senkt unter 45 FPS zuerst die Aufloesung,
dann die Schatten. Unter `?test=1` liefert `window.rallyTest.perf()` Draw-Calls, Dreiecke,
DPR und Qualitaetsstufe fuer Messungen. Touch-Steuerung ist enthalten.

## Musik (15.09.2026)

Echte BGM statt nur Synthese: `assets/audio/menu.mp3` (Radio Chrom, 18-s-Loop) im Menue
und `assets/audio/race.mp3` (Boulevard Heat Loop, 2:52, als Web-MP3 auf 96 kbps komprimiert)
im Rennen, als `<audio>`-Loops mit 15 % Lautstaerke. Beide stammen aus vom Nutzer
bereitgestellten Musikdateien (Downloads-Ordner); Lizenzen vor spaeterer kommerzieller
Nutzung pruefen. Der Ton-Schalter steuert Musik, Motor und Effekte zusammen; fehlen die
Dateien, springt automatisch der prozedurale Chiptune-Sequencer ein. Weitere Kandidaten
fuer schnellere Tausch-Aktionen liegen unter `Downloads/assets/audio/shuffle/`
(Five Star Mayhem, Neon Heist Run, Vice Coast Run — je A/B-Variante) und
`Downloads/assets/audio/` (basskeller, betonhain-night, funk-88-8, nachtfalter-fm).

## Start

Im Projektordner `npm start` ausfuehren und http://127.0.0.1:4218 oeffnen. Node.js wird benoetigt. Das Spiel verwendet eine lokale Three.js-Datei und benoetigt keine CDN-Verbindung, API-Keys oder Build-Installation.

## Steuerung

- WASD / Pfeiltasten: Gas, Bremse und Lenken.
- Shift beim Lenken halten, dann loslassen: Drift und Mini-Turbo (blau → orange → lila). In der Luft Shift: Trick-Turbo.
- Leertaste oder Item-Slot anklicken: Item einsetzen.
- P / Escape: Pause. R: zur Streckenmitte zuruecksetzen.
- Optionales Auto-Gas im Hauptmenue.
- Auf Touch-Geraeten: Bildschirmtasten; Item-Slot antippen.
- Musik/Engine/SFX mit dem Ton-Schalter aktivieren.

## Umfang

Drei eigene Kurse (Pilz-Promenade, Sunset Valley, Sternen-Garten), acht Fahrer, vier Kart-Farben, drei Runden, Verfolgungskamera, Minimap, Platzierung, Ergebnisliste, lokal gespeicherte Bestzeiten und vier Items: Turbo, Such-Panzer, Banane, Sternenschild. Die Arcade-Steuerung bewegt das Kart entlang der Strecke mit seitlicher Lenkung, Kurvendruck und Offroad-Bremse. Kein Multiplayer und keine native Store-App.

Alle Karts, Landschaften und UI-Elemente entstehen im Code. Lokale Three.js-Runtime aus dem vorhandenen Prisma-Kart-Projekt uebernommen; neuer Spielcode, neue Kurse und neues UI in diesem Ordner. Das Blender-MCP war beim Verbindungsversuch nicht erreichbar; Meshy/Tripo/Unreal und Store-MCPs sind nicht fuer die Erstellung oder Veroeffentlichung eingesetzt worden. Keine externen Generierungskosten, kein Store-Upload.

## Verifikation

`npm test` prueft Rundenabschluss, Drift-Boost, Offroad-Bremse, Item-Verbrauch, Schildwirkung und Zieleinlauf-Reihenfolge. Im integrierten Browser wurden Menue und Rennansicht visuell geprueft; Strassenflimmern korrigiert; Start, Beschleunigung, Item-Aufnahme, Turbo, Pause, Ergebnisanzeige und Streckenwechsel getestet. Der beschleunigte Zieltest verwendet die ausschliesslich unter `?test=1` sichtbaren Test-Buttons. Er ersetzt keinen menschlichen Langzeit-Spieltest.

Die API-unabhaengige Browserfassung ist lokal spielbar. Fuer native Android-/iOS-Verpackung und Store-Veroeffentlichung waere ein eigener Folgeschritt erforderlich.

Mobile Sichtpruefung: Menue bei 390 x 844 Pixeln ohne horizontales Abschneiden geprueft. Alle drei Kurse lassen sich umschalten; abschliessender Browser-Fehlerlog leer.
