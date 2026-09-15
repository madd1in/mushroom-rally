# Mushroom Rally

Spielbarer 3D-Arcade-Kart-Prototyp fuer den Browser, gebaut am 13.09.2026.

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
unveraendert gruen (4/4).

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
- Shift beim Lenken halten, dann loslassen: Drift und Mini-Turbo.
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
