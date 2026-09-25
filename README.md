# Mushroom Rally

Spielbarer 3D-Arcade-Kart-Prototyp fuer den Browser, gebaut am 13.09.2026.

Live: https://madd1in.github.io/mushroom-rally/

## Runde 44 (25.09.2026): Fluessig auf Handys, Bunny-Hop-Drift, Touch-Steuerung im Mario-Kart-Stil

**Ruckeln in Runde 1 - Ursache gefunden (Profil auf echter GPU, Kopflos-Chrome mit Intel UHD):**
Die automatische Grafikanpassung startete mit Schatten und schaltete sie im Rennen ab, sobald die
Bildrate unter 50 fps fiel. Schatten aus aendert den Shader-Schluessel aller Materialien - jedes
Objekt wurde beim ersten Auftauchen neu kompiliert (Spitzen bis 200-490 ms, nur in Runde 1). Dazu
kompilierten ausgeblendete Teile (Drache vor seiner Zone, Boot-/Flugzeugteile) erst beim ersten
Sichtkontakt. Jetzt:
- mitten im Rennen wird nur noch die Aufloesung (und der Schattenrhythmus) angepasst, nie Schatten oder Material
- die gelernte Stufe wird gespeichert und beim naechsten Start gleich angewandt; ein fluessiges Rennen (>58 fps) erlaubt wieder eine Stufe hoeher
- die Vorkompilierung blendet alle versteckten Teile der Strecke kurz ein (Drache, Transformationen, Unterwasser-Deko)
- Shaderfehler-Pruefung (getProgramInfoLog, blockiert bis der Treiber fertig ist) nur noch im Testmodus

**Audio frass 16 % CPU:** Motor- und Mischpult-Regler bekamen jeden Frame neue
setTargetAtTime-Ereignisse. Bei pausiertem Audiokontext (Handy vor dem ersten Tippen, Ton aus) laeuft
die Zeit nicht weiter und die Ereignislisten wachsen endlos. Jetzt nur bei laufendem Kontext und
spuerbarer Aenderung, alte Ereignisse werden vorher verworfen.

**Leicht-Modus (Handys automatisch, sonst Grafik "Sparsam"):** Lambert- statt PBR-Material,
keine Schatten und kein Scheinwerfer-Punktlicht von Anfang an, halbe Streudeko, und Low-Poly-Modelle
aus Blender (art/r44/make_lod.py, Decimate: Burg 24k -> 10k, Fahrer 7k -> 3k, Kart 5,2k -> 2,2k,
Baeume/Pilze/Tribuenen halbiert; assets/lo/). Messung mit Handy-Emulation (412x915, 4x CPU-Drossel):
schlimmster Frame in Runde 1 486 -> 100 ms, Frames ueber 50 ms in Runde 2 125 -> 53, Dreiecke
400k -> 212k, Draw-Calls 142 -> 103. Handys starten mit 1,5facher Aufloesung und regeln nur die
Aufloesung herunter. Neue Kartraeder auch im normalen Modus leichter (1352 -> 852 Dreiecke).
Mit **?fps** in der Adresse zeigt das Spiel Bildrate, Modus, Aufloesung und Draw-Calls an.

**Bunny-Hop-Drift wie in Mario Kart:** Die Drifttaste laesst das Kart hopsen (0,3 s, Chiptune-
Sprung). Waehrend des Hopsers bestimmt die Lenkung die Richtung (und dreht etwas williger), bei der
Landung mit gehaltener Taste beginnt der Funkendrift - erst blau, dann rot (lila fuer sehr lange
Drifts), Loslassen gibt den Turbo. Ohne Lenkung bleibt es ein Hopser. Die KI haelt die Taste ueber
den Hopser und lenkt in die Kurve.

**Touch-Steuerung neu im Mario-Kart-Tour/World-Stil:** runde Knoepfe mit weissem Rand und Verlauf,
GAS (gruen, gross) und HOPS (rot) jetzt getrennt - vorher gab der Drift-Knopf automatisch Gas mit,
mit dem Hopser waere jeder Gasstoss ein Sprung geworden. Item-Blase gelb leuchtend, Bremse klein,
Lenkung als zwei grosse Kapseln. Auto-Gas bleibt auf dem Handy standardmaessig aus.

**Rechtwinklige Kurven wie im SNES-Mario-Kart:** Pilz-Promenade, Sonnen-Canyon und Neon-Pilzwald haben je
eine enge Ecke (Radius 11-15 m statt mindestens 24 m). Dafuer zieht der Streckenbau zwei Hilfspunkte eng um den
Eckpunkt und schwaecht die Radius-Glaettung nur dort ab; alle Bauten bleiben an ihrem Platz. Mit Grip geht so
eine Ecke nur mit etwa 19-23 m/s, im Drift mit 26-35 m/s plus Mini-Turbo - Driften lohnt sich. Dazu etwas mehr
Untersteuern bei Hoechsttempo (vorher war jede Kurve der Spiele mit Vollgas und Grip fahrbar).

**Keine toedlichen Spruenge vor Kurven mehr:** Audit aller Schanzen und Luecken - 12 Landungen lagen in einer
Kurve mit 24-35 m Radius (Neon allein 4). Neu ist eine Luftfuehrung: in der Luft folgt das Kart sanft dem
Streckenverlauf und wird Richtung Mitte gezogen. Regenbogenpiste: 2 -> 0 Abstuerze in der Regression.

**Regenbogen-Spirale entschaerft:** der kurvige Dreifach-Looping (Radius 22 m, 3 Umdrehungen) drehte die Kamera
zu schnell - jetzt 28 m Radius mit 2 Umdrehungen.

**Muenzen und Chiptune-Sound:** Die Sporen sind jetzt echte Sporenmuenzen aus Blender (art/r44/create_coin.py:
gepraegter Pilz, erhabener Rand, ein Material = ein Draw-Call fuer alle) und drehen sich aufrecht. Neue,
selbst synthetisierte Chiptune-Effekte (art/r44/make_chiptune.mjs, NES-artig: Rechteck 12,5/25/50 %, Dreieck,
LFSR-Rauschen): Muenze (H5 -> E6), Item-Box, Rundenfanfare, Mini-Turbo in drei Stufen, Turbo, Treffer,
Rempler, Banane, Trick, Ring, Raketenstart, Countdown - 15 WAVs, zusammen 270 KB.

**Neue Hindernisse aus Blender (art/r44/create_hazards.py, assets/hazards.glb, eigene Entwuerfe):**
- **Stampfer** - zorniger Stachel-Steinblock mit Gesicht. Wartet oben (Schatten auf der Bahn wird dunkler, kurzes
  Zittern), kracht herunter (Staub, Wackelkamera), liegt kurz als Hindernis und zieht sich hoch. Wer im Fall darunter
  ist, wird plattgedrueckt. Regenbogenpiste (drei, wie auf der SNES-Regenbogenstrasse) und Lava-Feste (zwei vor dem Ziel),
  abwechselnd links und rechts - Spurwahl und Timing entscheiden.
- **Roehren mit Schnappblume** am Fahrbahnrand (Pilz-Promenade, Neon-Pilzwald): die Pflanze dreht sich zum naechsten
  Kart, lehnt sich heraus und schnappt zu - wer die Kurve zu weit aussen nimmt, wird erwischt. Dazu Roehrengruppen
  als Deko im Wald.
- **Feuerkoenig-Statuen** (Lava-Feste): riesige gehoernte Steinbuesten mit gluehenden Augen spucken die Feuerbaelle,
  die im Bogen auf Fahrhoehe fallen und quer ueber die Bahn fliegen; Treffer = Dreher. Jetzt drei statt einem.
- **Roehrenkanone mit Kugelblitzen** (Lava-Feste, Ende der Burggeraden): feuert alle 1,6 s ein Geschoss mit Augen die
  Gerade hinunter, jedes leicht versetzt (Spuren -3,5 / 0 / 3,5 / -1,5 / 2 ...) - ausweichen!
- **Befahrbare Roehre** statt Magmaschacht auf der Lava-Feste, **"Achtung Lava"-Schilder** als Blender-Modell.
Takte und Bahnen in hazards.mjs (4 Unit-Tests), die KI weicht Stampfern, Kugelblitzen und Feuerbaellen aus.

**Tribuene neu (art/r44/create_grandstand.py):** Betonstufen mit farbigen Setzstufen und Baenken, niedrige Bruestung
mit Sponsorband und Schachbrettstreifen (die Zuschauer sind jetzt sichtbar), gestufte Seitenwaende mit Gelaender,
geschwungenes rot-weiss gestreiftes Dach mit Bogenkante, Wimpelkette, Fahnenmasten und Pilz-Schild. Sitzgeometrie
unveraendert. **Sporentor neu (art/r44/create_gate.py):** Pilztuerme auf Steinsockeln mit Goldringen und
Schachbrettband, getupfte Huete mit Wimpeln, Bannerbalken mit Schachbrettleisten und Gluehbirnenreihe; der
Schriftzug ist jetzt ganz lesbar (vorher verdeckten die Huete M und Y). **Jubel als Chiptune:** 8-Bit-Applaus
(Rauschen in zufaelligen Stoessen), Pfiffe und Hurra-Arpeggio.

**Mehr Platz zum Driften - Auslaufzonen:** Die Strassen waren zum Driften zu eng (Nutzer: "knalle immer gleich gegen
die Bande"). Beidseitig liegt jetzt ein befestigter Randstreifen von 8,6 bis 11,2 m (heller Belag, weisse
Randlinie), der als Fahrbahn zaehlt - nutzbare Breite 22 statt 17 m. Die Planken in Kurven stehen an seiner
Aussenkante, und ein Anschlag nimmt nur noch die Bewegung nach aussen weg (vorher Rueckprall mit 25 % Ueberschuss
und bis 16 % Tempoverlust, jetzt ohne Rueckprall, hoechstens 8 %) - man gleitet an der Bande entlang. Nicht auf
Bruecken, an Luecken, in Loopings, Roll-, Wasser-, Flug- und Achterbahnzonen, nicht auf der Abzweigseite.
Roehren, Kanone, Schilder und Grasbueschel sind entsprechend nach aussen gerueckt; das Untersteuern bei
Hoechsttempo ist wieder etwas zurueckgenommen, die engen Ecken haben 13 statt 11 m Radius.

**Gas- und Hops-Knopf getrennt, kein Auto-Gas:** war Auto-Gas auf einem Geraet einmal an, blieb die Einstellung
gespeichert und der Gas-Knopf verschwand - einmalig fuer alle auf AUS zurueckgesetzt.

**Achterbahnen ruhiger:** Die Twists drehten die Kamera mit bis zu 15 rad/s (eine Umdrehung auf 17-22 m). Der
Drache hat jetzt einen Korkenzieher mit einer statt zwei Umdrehungen auf fast doppelter Laenge, die kurzen
Achterbahnen (Geisterhaus, Regenbogen) keinen Twist mehr. Die Kamera dreht bei Achterbahn-Twists nur zu 40 % mit
und hoechstens 3,2 rad/s schnell. Die Anti-Grav-Spirale der Magnet-Kirmes ist 70 % laenger.

**Laengere Wasser- und Flugphasen:** Flug auf der Lava-Feste startet direkt nach der Schanze (+33 %), See im
Geisterhaus +46 %, See der Magnet-Kirmes +40 %, dazu Bach und Regenbogen-Flug laenger. Die Ueberlaenge eines Sees
geht nicht mehr nur unter Wasser: je 20 % an die Bootsfahrt an der Oberflaeche davor und danach (16-29 m statt 6 m).

**Lava-Feste aufpoliert (art/r44/polish_castle.py, Anbauten auf das bestehende Modell):** Feuerkoenig-Relief mit
Hoernern und gluehenden Augen ueber beiden Toren, Fallgitter-Zaehne in der Durchfahrt, Fackeln an Toren und
Fluegeln, gluehendes Lavaband am Fuss, Stachelkraenze und goldene Spitzen auf den Tuermen.

**Lava-Feste: Burgturm mit Mauerdurchbruch und Kanonen-Portal (art/r44/create_tower.py):** Die Hochstrasse vor dem
Ziel steigt jetzt auf 14 m (vorher 8) und windet sich in der Kurve an einem runden Basalt-Bergfried hinauf (30 m, gluehende
Lava-Risse, Zinnenkranz, leuchtende Fenster, Flammenbanner, spitzes rotes Stachel-Dach). Oben geht es durch einen
Mauerdurchbruch (kurzer Tunnel im Basalt-Stil) und dann frontal auf ein Steinportal zu, auf dem eine Roehrenkanone
thront: ihre Kugelblitze stuerzen von oben herab und fliegen in versetzten Spuren die Rampe hinunter - ausweichen.
Der Sprungpilz auf der Bruecke ist weg (haette von der Hochstrasse geschleudert). Ehrlich: die Kurve dort dreht nur
etwa 60-70 Grad - eine Spirale ueber mehrere Umdrehungen braeuchte einen Umbau der ganzen Streckenfuehrung.

**Pilzland wirklich frei befahrbar:** Abseits der Ringstrasse bremste das Gras auf 12,5 m/s, Querfeldein wurde
als Abkuerzung zurueckgesetzt und die Hoehe neben der Strasse aus der Querneigung hochgerechnet (auf 200 m bis zu
24 m daneben). Jetzt faehrt man ueber die ganze Insel mit 95 % Tempo, der Boden ist flach, nichts setzt zurueck.
**Sandwege** fuehren von jedem Portal quer ueber die Wiese zum Pilzberg und verbinden alle Gebiete. Neue Mission
**Muenzjagd**: 24 Muenzen sind ueber die ganze Insel verstreut (mindestens 25 m neben der Strasse), jede zaehlt
einmal und bleibt gespeichert. Test: 116 m Wiese in 5,6 s mit 29 m/s Richtung Pilzberg, Hoehe 0, kein Zuruecksetzen.

**Mehr Erfolgserlebnis - Fahrerstufen, Erfolge, Lackierungen (progress.mjs, 4 Unit-Tests):**
- Jedes Rennen bringt **XP**: Platzierung (100 bis 28) plus Mini-Turbos (blau 4, rot 8, lila 15), Tricks, Windschatten,
  Ueberholen, Ringe, +30 ohne Treffer; mal 1 / 1,25 / 1,6 je Klasse. Der Ergebnisschirm zeigt die Aufschluesselung und
  einen XP-Balken, der sich fuellt (auch ueber einen Stufenaufstieg hinweg, mit Chiptune-Fanfare).
- **Fahrerstufen** schalten neue Lackierungen frei: Blitz (Stufe 2), Lava (3), Wald (5), Bonbon (7), Diamant (10).
- **23 Erfolge** mit Abzeichen: Erster Sieg, Treppchen, Turbo-Profi, Lila Funken, Combo-Koenig, Unberuehrbar,
  Luftakrobat, Windschatten-Jaeger, Ueberholkuenstler, Muenzsammler, Raketenstart, 150cc-Champion, Grand-Prix-Sieger,
  Weltenbummler, Pokalsammler, Achterbahn-Fan, Entdecker (Pilzland) - und je Strecke einer zur eigenen Idee:
  Kuhfluesterer, Wuestenfuchs, Taktgefuehl, Geisterjaeger, Stampfer-Taenzer, Sternenkind.
- Im Menue zeigt **"ERFOLGE"** Stufe, XP-Balken, alle Erfolge und die Lackierungen mit ihrer Stufe.

**Jede Strecke mit eigener Idee (art/r44/create_critters.py, assets/critters.glb):**
- **Pilz-Promenade "Almwiese":** drei Kuehe (Fleckvieh mit Glocke, Hoernern, grasendem Kopf und laufenden Beinen)
  wandern nach der engen Ecke ueber die Strasse und bleiben zum Grasen stehen - ausweichen, sonst Dreher und "Muh".
- **Neon-Pilzwald "Beat":** drei Taktschranken (Neon-Schlagbaeume von beiden Seiten) senken sich im 120-bpm-Takt
  abwechselnd links und rechts - die offene Seite im Takt waehlen. Turbo-Felder geben auf dem Schlag getroffen
  deutlich mehr Schub ("IM TAKT!").
- **Geisterhaus "Spuk":** Geisterhaende schiessen im ersten Abschnitt aus dem Boden (dunkler Riss als Warnung) und
  packen zu; dazu Gewitter mit Blitz (weisses Aufleuchten) und Donner.
- **Regenbogenpiste "Sternenstrasse":** Sternschnuppen schlagen mit Warnkreis auf der Bahn ein, dazu die Stampfer
  und der Sprung ueber den Abgrund. (Eine Mondschwerkraft-Zone war im Test, aber mit dem Gleiter flogen die Karts
  seitlich weg - wieder entfernt.)
- Die KI weicht Kuehen, Haenden, Einschlagkreisen aus und waehlt an den Schranken die offene Seite.
Neue Chiptune-Effekte: Muh, Zupacken, fallende Sternschnuppe, Einschlag, Donner.
Fehler behoben: die Auslaufzone endete direkt an Hochstrecken - wer auf ihr fuhr, kam an die Kante (Neon-Absturz).

**Eigener Streckencharakter - Sonnen-Canyon wird zum "Wuestensturm":** Der Canyon war ein Baukasten aus allem
(drei Loopings, Wandfahrt, Hochstrecke, Tafelberg, Luecke, Abzweigung, Tunnel) ohne Wuestengefuehl. Zwei Loopings
und die Wandfahrt sind raus, dafuer:
- **Duenen** auf der Startgeraden: rhythmische Sandkaemme (1,7 m, alle 18 m). Mit Tempo hebt man auf jedem Kamm ab -
  Hopser/Drift in der Luft gibt den Trick-Turbo bei der Landung.
- **Sandhosen**: drei wandernde Wirbelstuerme (wirbelnder Sandtrichter mit Staub), die quer ueber die Bahn und etwas
  vor und zurueck ziehen. Wer hineinfaehrt, wird hochgehoben und gedreht; die KI weicht aus.
- **Treibsand** an der Innenseite der engen Ecke: wer abkuerzt, wird stark gebremst und zur Mitte gezogen
  (ausser mit Turbo) - die Drift-Linie lohnt sich.
- **Dampf-Gueterzug** mit Pfeife und Schrankenglocke (Chiptune) an den Uebergaengen.
Neue Chiptune-Effekte: Sandhose, Treibsand-Blubbern, Dampfpfeife, Schrankenglocke.
Neon-Pilzwald: die Schanze kurz vor dem Ziel entfernt (landete in der letzten Kurve, wiederkehrender Absturz).

**Themen-Wahrzeichen aus Blender (art/r44/create_landmarks.py, assets/landmarks.glb):**
- Pilz-Promenade mit Bayern-Note: Maerchenschloss im Neuschwanstein-Stil (weisse Mauern, schlanke Tuerme mit
  schieferblauen Kegeldaechern, roter Torbau) auf einem Felssockel am Inselrand, Maibaeume, blau-weisse Wimpel.
- Neon-Pilzwald mit Oktoberfest: Festzelt mit blau-weiss gestreiftem Dach und Leuchtschild "O'ZAPFT IS!",
  Maibaeume, Lebkuchenherzen und Riesenbrezeln als Neonschilder am Streckenrand.
- Sonnen-Canyon: Dampf-Gueterzug (Lok mit Schlot, Dampfdom, roten Speichenraedern und Dampfwolken, drei Wagen mit
  Kisten und Faessern) auf einem Gleisring - eine Sehne quer durch die Insel mit zwei Bahnuebergaengen ueber die
  Strasse, zurueck am Inselrand. Blinksignale und Glocke, wenn er kommt; wer erwischt wird, fliegt seitlich weg.
  Die KI wartet am Uebergang. Die Uebergaenge werden automatisch auf freie Strecke gelegt (keine Luecken,
  Loopings, Tunnel, Rampen, Abzweigungen).

**Neon-Pilzwald:** die enge Ecke wieder entfernt - direkt dahinter liegt eine Schanze, das fuehrte zu Abstuerzen
(Regression 3 -> 0).

**Fehler behoben:** Der Portal-Knopf der Open World ("... fahren") blieb nach dem Antippen im Rennen
und sogar im Hauptmenue sichtbar.

**Verifikation:** 72/72 Unit-Tests (neue Hop-Tests), Rennregression aller Strecken normal und im
Leicht-Modus ohne Fehler, Screenshot der Touch-Steuerung in Handy-Emulation.

## Runde 43 (24.09.2026): Karts und Fahrer neu in Blender - jede Figur mit eigenem Bausatz

**Neue Karosserie (Blender, art/r43/create_karts.py):** Statt flacher Wanne mit dickem
Rammrohr eine gerundete Karosserie aus Superellipsen-Querschnitten: gewoelbte Haube mit
Zierstreifen und Pilz-Emblem, zwei leuchtende Scheinwerfer, flacher Frontfluegel mit
Endplatten, Seitenkaesten mit Lufteinlass, Cockpitwangen, gepolsterter Sitz, Lenkrad mit
Goldnabe, sichtbare Radaufhaengung, Chrom-Motorblock mit Kuehlrippen, Auspuffrohre genau an
den Flammenpunkten, Rueckleuchten-Gehaeuse unter den Bremslichtern, schmale Heckstange.
Masse, Radpositionen und Fahrerplatz unveraendert (Physik, Transformationen und Gleiter passen).

**Neue Raeder:** Reifen mit gerundeter Schulter und flachem Pfeilprofil, weisser Flankenring,
Fuenfspeichen-Felge mit Goldnabe (1352 Dreiecke).

**Jede Figur faehrt ihr eigenes Kart (assets/kartkit.glb):**
- Pilzi "Sporenflitzer": Heckspoiler als Pilzhut auf Stiel mit weissen Tupfen, Tupfen auf den Seitenkaesten
- Schildi "Panzerwagen": schwerer Heckfluegel, Sechseck-Panzerplatten, Rammschild mit Goldnieten, Panzerkuppel ueberm Motor
- Volt "Voltstoss": zwei Raketenbooster mit leuchtenden Duesen und Heckflossen, Blitzfinne
- Mochi "Kurvenkatze": Pfeilfluegel mit Katzenohr-Endplatten, geschwungene Schwanzantenne, Pfotenabdruecke

Die Bausaetze werden beim Laden mit der Karosserie zu einem Prototyp je Figur verschmolzen
(auch fuer die instanzierten KI-Karts: Karosserie-Instanzen jetzt je Fahrertyp). Die alten
Box-Anbauteile hingen am Fahrer und schwankten mit ihm - bei KI-Karts lagen sie wegen der
Instanzierung sogar ohne Versatz mitten im Fahrer; beides ist damit weg. Die Siegerehrung
zeigt jetzt jede Figur in ihrem eigenen Kart (vorher immer Pilzi).

**Fahrer-Feinschliff (art/r43/driver_touchup.py):** Pilzi laechelt jetzt (gebogener Mund auf
der Kopfoberflaeche mit Zungenspitze statt erschrockenem "O"), Volt hat gefaste Kastenteile
mit gehaerteten Normalen, leuchtende LED-Augen und ein LED-Pixel-Laecheln.

**Verifikation:** Blender-Workbench-Renders vorher/nachher (art/r43/before_*.png, v2_*.png),
Kopflos-Chrome-Screenshots von Startaufstellung vorn/hinten, 71/71 Unit-Tests,
Rennregression aller sieben Strecken. Blender-MCP war nicht erreichbar (Verbindungs-Timeout),
deshalb Blender 5.2 ueber die Kommandozeile.

## Runde 42 (24.09.2026): Open World "Pilzland" mit Missionen, lange Boots- und Flugparcours

Neuer Modus **Pilzland** im Menue: eine grosse Insel (680 m Radius) mit einer 3,7 km langen
Rundstrasse, die die Rennstrecken verbindet - wie in Mario Kart World. Kein Zieleinlauf, frei
fahren, Missionen erledigen, Rennen ueber Portale starten.

- **Portale zu allen 7 Rennstrecken:** Torbogen in der Farbe der Strecke mit Namensschild und
  leuchtendem Schleier. Beim Durchfahren erscheint "▶ Strecke fahren" (Enter oder tippen) und
  startet direkt das Rennen. Neben jedem Portal das Wahrzeichen der Strecke (Wurzelbaum,
  Felsen, Neon-Tor, Villa, Burg, Kristalle, Riesenrad), in der Inselmitte der Pilzberg.
- **Missionen (7, Fortschritt gespeichert):**
  - **P-Schalter (4x):** Ueberfahren -> 8 blaue Muenzen erscheinen als Schlangenlinie auf der
    Strasse, alle in 22 s einsammeln. Zeit um: Schalter setzt sich nach 3 s zurueck.
  - **Bojen-Slalom (2x):** als Rennboot auf den Fluessen die Bojentore der Reihe nach
    durchfahren; ein verpasstes Tor startet den Slalom neu.
  - **Ringflug:** in der langen Flugschneise alle 8 Ringe in einem Flug.
  Belohnung je Mission: Turbo und 3 Sporen, Anzeige oben links ("★ 3/7").
- **Lange Bootsfahrten an der Wasseroberflaeche:** zwei Fluesse mit 293 m und 245 m Boot.
- **Langer Flugparcours:** 314 m Flug in 26 m Hoehe mit 8 Ringen (Ringe jetzt alle ~34 m, auch
  auf den Rennstrecken bei laengeren Fluegen).
- Dazu See mit Tauch-Spirale, Looping, gekruemmte Dreifach-Helix, Wandfahrt und Rundgang.
- Logik in `ow.mjs` (Tests `ow.test.mjs`), Modelle aus Blender (`art/r41/create_ow_assets.py`,
  `assets/ow.glb`: P-Schalter mit eindrueckbarer Kappe, Muenze mit Pilz-Emblem).

Technik: Inselgroesse, Meer, Streufelder, Kulisse und Kart-Inselgrenze haengen jetzt am
Weltradius je Strecke (Rennstrecken unveraendert 210 m). Bojen als Instanzen (vorher bis 280
Draw-Calls an langen Fluessen; Pilzland jetzt 150-230). Item-Boxen und Sporen lassen sich auch
im Flug und auf dem See einsammeln. Autopilot 120 s durch Pilzland: 2,97 km, keine Stuerze, keine
Fehler; alle 7 Rennstrecken weiter im Ziel. Tests: 71.
## Runde 41 (24.09.2026): Fenster im Menuestil, Handy-Menue repariert

- **Pause, Ergebnis, Siegerehrung, Fehler- und Ladeanzeige** im Stil des neuen Menues: helle Karte
  mit Zielflaggen-Streifen, kursive Titel mit dicker Kontur und rotem Versatzschatten, roter
  schraeger Hauptknopf, weisse Nebenknoepfe, Rangliste als kleine Karten (eigene Zeile gelb),
  Sterne gelb mit Kontur. Vorher waren diese Fenster noch im alten Dunkelgruen.
- **Ergebnis auf dem Desktop kompakter:** Werte in drei Spalten, damit "Nochmal" ohne Scrollen
  sichtbar ist.
- **Handy-Menue:** Ton- und Vollbild-Knopf lagen ueber dem Titel, Kartfarben stapelten sich
  senkrecht und "Grafik" lief rechts aus dem Bild. Jetzt beginnt das Menue unter der Kopfleiste,
  die Auswahl steht im Raster (Grafik eigene Zeile), das Menue scrollt.
- **Gewaehlte Streckenkarte** wurde oben und links vom scrollenden Raster abgeschnitten - das Raster
  hat jetzt Luft fuer die angehobene Karte.
- Doppelte `#speedlines`-ID in `index.html` entfernt.
- **Startknopf wirkte grau:** Die Rand-Vignette des Renn-HUD lag ueber dem Menue und dunkelte
  die Panel-Ecken ab - "Los geht's" unten links war dadurch grau statt weiss. Menue liegt jetzt
  darueber.
- **Countdown und Einblendungen** (3-2-1, LOS!, RUNDE 2) in der Display-Schrift mit Kontur und
  rotem Schatten, springen bei jedem Wechsel auf, stehen tiefer und ueberlappen die
  Streckeneinblendung nicht mehr.
- **Handy:** "Los geht's" klebt unten am Menue, auch beim Scrollen der Streckenliste; "Grand Prix"
  bricht nicht mehr um; im Rennen zeigt die Kopfleiste nur das Icon, Ton/Pause/Vollbild sind
  einzeilige kleine Knoepfe statt gestreckter Ovale.

## Runde 40 (24.09.2026): Menue im Mario-Kart-World-Stil, Drache durchsichtig, keine Ruckler in Runde 1

- **Menue und Schrift:** fette kursive Display-Schrift (Rubik 900) mit dicker dunkler Kontur und
  rotem Versatzschatten, helle Karte mit Zielflaggen-Streifen, schraege Knoepfe (Auswahl
  gelb-orange), Strecken-Karten mit weissem Rand und Glanzlauf, grosser roter "LOS GEHT'S"-Knopf
  mit Zielflagge. Platz, Runde, Zeit und Einblendungen im HUD in derselben Schrift.
- **Streckenliste ueberlappte:** das Raster durfte schrumpfen und quetschte die Zeilen auf 77 px
  (Karten 152 px) - jetzt vier Spalten, schmal zwei, das Menue scrollt statt zu quetschen.
- **Drache durchsichtig**, solange man in seiner Achterbahn faehrt (12 %); von aussen bleibt er
  voll sichtbar.
- **Ruckler nur in Runde 1:** das On-Ride-Foto kostete einen Frame mit zwei Zusatz-Bildern,
  blockierendem Pixel-Ruecklauf und JPEG-Kodierung. Jetzt ein Bild, asynchroner Schnappschuss,
  Kodierung im Leerlauf. Dazu werden ausgeblendete Kartteile (Boot, Tauchboot, Flugzeug, Schild,
  Gleiter) und alle Texturen beim Start vorab kompiliert bzw. hochgeladen.

## Runde 39 (24.09.2026): Elemente-Parcours, Schraeg- und Mehrfach-Loopings, Drache, Flow

**Elemente-Parcours** (Logik in `elem.mjs`, ohne Browser getestet): Das Kart verwandelt sich je
nach Element - auf dem Wasser in ein **Rennboot** (V-Rumpf, Duese, Gischt, schaukelt), unter
Wasser in ein **Tauchboot** (Propellerring, Flossen, Blasen), in der Luft in ein **Flugzeug**
(Tragflaechen mit Pilzpunkten, Luftschraube, Kondensstreifen). Beim Durchstossen der
Wasseroberflaeche spritzt es, jede Verwandlung hat ihren Klang. Teile und Deko aus Blender
(`art/r39/create_elements.py`, `assets/transform.glb`, `assets/elements.glb`).

- **Seen:** echtes Loch im Inselboden (Alpha-Maske im Bodendeckel), Becken mit animiertem
  Kaustik-Licht, Uferstrand, Wasseroberflaeche, Seetang, Korallen, Fischschwaerme, Bojen an der
  Bootsspur. Unter Wasser faerbt sich die Sicht (Nebel, Hintergrund), die Musik klingt gedaempft.
- **Tauch-Spirale:** Auf der Magnet-Kirmes (Wildwasser-Spirale) und im Neon-Pilzwald (Neon-Riff)
  liegt ein Mehrfach-Looping am Seegrund - die unteren Boegen jeder Windung tauchen ein, die
  oberen ragen in die Luft: Boot, abtauchen, Spirale durch Wasser und Luft, auftauchen, an Land.
- **Geistersee** (Geisterhaus) mit Tauchgang, **Pilzbach** (Pilz-Promenade) als Bootsstrecke.
- **Flug:** Startrampe mit Leuchtkante, dann traegt die Luft - die Fahrbahn verschwindet,
  Flugringe geben Turbo, Landung auf der Gegenrampe. **Feuerflug** (Lava-Feste) und
  **Sternenflug** (Regenbogenpiste).

**Loopings neu** (`loop.mjs`): Jede Windung ist zur Seite geneigt - Ein- und Ausfahrt laufen
aneinander vorbei, statt sich zu schneiden (ein ebener Looping mit Ausfahrt vor der Einfahrt
kreuzt sich zwangslaeufig selbst). Die Ausfahrt schliesst jetzt ohne den bisherigen 9-m-Sprung
an die Strasse an. Bis drei Windungen hintereinander ergeben Spiralen, auch in Kurven
(gekruemmte Spirale). Ein Test prueft fuer alle Groessen mindestens 4 m Abstand zwischen den
Bahnteilen, im Spiel werden 3,65 bis 5,5 m gemessen. Kart und Kamera folgen der geneigten Bahn.
Jede Strecke hat ihren eigenen Looping-Charakter: Doppel-Looping (Pilz-Promenade, Geisterhaus,
Lava-Feste), Looping-Kette aus drei Einzel-Loopings (Sonnen-Canyon), gekruemmte
Dreifach-Helix (Neon-Pilzwald), Sternenspirale (Regenbogenpiste).

**Laengere Wand- und Ueberkopffahrten:** Rollzonen sind jetzt Folgen aus Drehungen und
Haltephasen - lange 90-Grad-Wandfahrt, lange Ueberkopffahrt, Wandwechsel ueber Kopf und der
Rundgang ueber alle vier Seiten (Lava-Feste).

**Drachen-Achterbahn** (Magnet-Kirmes): Fliegenpilz-Drache aus Blender, die Bahn schraubt sich
im Korkenzieher um seinen Leib, am Ausgang speit er Feuer. Dazu Steilkurven aus der Kruemmung.

**Flow (Spielgefuehl):**
- **Glatter Belag:** Kurvenueberhoehung und Kurvenhub kamen aus der rohen Kruemmung des
  Streckenzugs, die von Stuetzpunkt zu Stuetzpunkt schwankt - die Fahrbahn hob und senkte sich in
  jeder Kurvenfolge um bis zu 1,2 m (Buckelpiste). Jetzt ueber die Strecke geglaettet.
- **Kein Hueperln mehr auf dem Handy:** Der Kuppenabsprung wurde je Frame entschieden - bei
  20 fps hob das Kart schon an sanften Wellen ab. Jetzt aus der Hoehenkruemmung, unabhaengig von
  der Bildrate.
- **Lenkhilfe** (Menue, Standard an): das Kart folgt der Kurve auf der eigenen Spur, die eigene
  Lenkung kommt obendrauf; vor zu engen Kurven geht sie vom Gas. Freihaendig auf dem
  Neon-Pilzwald: 982 m statt 321 m in 45 s, keine Stuerze statt zwei.
- **Leitplanken** schon ab 65 m Kurvenradius und in jeder Landezone hinter Schanzen.
- **Handy:** Touch-Geraete starten mit Aufloesungsdeckel 1,0 und Schatten jeden zweiten Frame.

Rundenzeiten werden durch die Spiralen laenger - Medaillen neu, Rekorde aller Strecken einmalig
zurueckgesetzt. Autopilot-Rennen auf allen sieben Strecken: alle im Ziel, keine JS-Fehler.
Tests: 65 (neu `loop.test.mjs`, `elem.test.mjs`).

## Runde 38 (23.09.2026): Magnet-Achterbahn, neue Strecke Magnet-Kirmes, On-Ride-Foto

Die Magnetbahn wird zur Super-Achterbahn. Neues Streckenelement `coaster` (Logik in
`coaster.mjs`, ohne Browser getestet), gefahren wie Rollzone und Looping flach, gezeichnet als
Achterbahn:

- **Magnet-Katapult:** sechs Hufeisen-Magnetboegen ueber einer Abschussstrecke. Jeder Bogen gibt
  beim Durchfahren genau einmal +7 m/s Schub, gedeckelt bei 46 m/s (Turbo sonst 40). Die
  Pol-Leuchten laufen als Lauflicht in Fahrtrichtung und blitzen beim Durchfahren auf. Danach
  traegt die Magnetbahn das Tempo durch die ganze Achterbahn.
- **Airtime-Huegel:** Top-Hat, Kamelruecken, Bunny-Hop. Jeder Buckel ist (1-x^2)^3, also C2-glatt
  (auch die Kruemmung ist an den Raendern null, kein Ruck), Steigung hoechstens ~45 Grad. Auf
  kurzen Zonen wird die Hoehe automatisch gedeckelt; das hat der Unit-Test gefunden.
- **Energietempo:** bergauf langsamer, bergab schneller (Energieerhaltung relativ zu 44 m/s, oben
  nie unter 52 %), dazu der laengere Bildweg am Hang. Der Tacho zeigt das Bildtempo: auf der
  Top-Hat-Kuppe gut 80 km/h, bergab wieder ueber 100.
- **Airtime:** Faellt das Lastvielfache an der Kuppe unter 0,35, schwebt das Kart bis 0,5 m ueber
  der Bahn, der Fahrer lehnt sich zurueck, das Sichtfeld weitet sich. "AIRTIME!" je Huegel.
- **Wertung bei der Ausfahrt:** sauber (nie an der Magnetbande) und mindestens zwei Airtimes =
  SUPER-ACHTERBAHN (1,25 s Turbo, 2 Sporen), sonst ACHTERBAHN-SCHWUNG (0,9 s, 1 Spore). Wer per
  Rettungspilz aus der Zone kommt, bekommt nichts.
- **On-Ride-Foto:** An der ersten Abfahrt blitzt es: eine Streckenkamera VOR dem Kart schaut
  zurueck aufs Gesicht (mit Sichtlinien-Pruefung, damit kein Rivale davor steht), das Bild landet
  als Polaroid im Ergebnisschirm ("ON-RIDE-FOTO · MAGNET-KIRMES").

**Neue Strecke 7 "Magnet-Kirmes"** (Kirmes in der Abenddaemmerung): 266-m-Super-Achterbahn mit
23-m-Top-Hat, Looping auf der rechten Geraden, Korkenzieher links, Lichterketten und ein
drehendes **Riesenrad** im Innenfeld (zwoelf Gondeln mit Pilzhut, haengen immer senkrecht).
Medaillen 100 / 106 / 117 s.

**Auch auf bestehenden Strecken:** Geisterhaus bekommt Geisterbahn-Wellen hinter der Villa
(violette Boegen, giftgruenes Leuchten), die Regenbogenpiste eine Sternen-Achterbahn vor dem Ziel
(Glasbahn ohne Unterseite, keine Stuetzen im All). Rekorde und Geister werden seit dieser Runde
**nur fuer geaenderte Strecken** verworfen (`TRACK_VER` je Strecke statt globalem `LAYOUT_VER`),
hier also nur Geisterhaus und Regenbogenpiste.

**Blender (MCP, Blender 5.2):** `magnetarch.glb` (Hufeisenmagnet mit Stahl-Polschuhen, Feldringen,
Blitz-Emblem; 1.332 Dreiecke, 62 KB), `coastertruss.glb` (4-m-Fachwerksegment, im Spiel gestapelt
statt gestreckt, plus Betonfuss; 764 Dreiecke, 20 KB), `ferriswheel.glb` (Gestell, Rad und
Gondel-Vorlage in einer Datei, im Spiel ueber die Materialnamen getrennt; ~8.000 Dreiecke,
171 KB). Quellen und Vorschauen in `art/r38/`.

**ElevenLabs (claude.ai-Connector):** Katapult-Sound (Sound Effects v2) und zwei Ansagen mit
Stimme Leo: "Magnet-Katapult!" (erster Abschuss im Rennen) und "Super-Achterbahn!" (erste
Super-Wertung und letzte Runde). Danach waren die Credits aufgebraucht; der Airtime-Klang nutzt
den vorhandenen Schanzen-Whoosh plus Synth-Schimmer. Der lokale ElevenLabs-MCP-Server war nicht
verbunden.

**Unreal (5.8):** Import aller drei Modelle validiert (29 / 3 / 8 Static Meshes unter
`/Game/MushroomRally/*_r38/`). Showcase "Magnet-Katapult" (Tunnel aus fuenf Boegen, Hero-Kart,
18-m-Huegel auf Fachwerkstuetzen, Riesenrad) abseits im Keyart-Level aufgebaut, ueber eine eigene
SceneCapture gerendert (`media/r38_magnet_katapult.jpg`) und danach wieder entfernt. Der Level
wurde nicht gespeichert: Er hatte schon vorher ungespeicherte Aenderungen (u. a. einen Ordner
`R38_HauntedKeyart`), die unangetastet bleiben. Neu aufbauen: `art/r38/unreal_coaster_r38.py`.

**Fixes nebenbei:** Der Strecken-Cache sicherte Achterbahn-Daten und die Energiewaende der
Rollzonen nicht mit (beim Zurueckwechseln lief die Animation der zuletzt gebauten Strecke).
Bananen in Magnetzonen liegen im Bild jetzt auf der gehobenen Bahn statt darunter; Item-Boxen und
Sporen auf Huegeln lassen sich einsammeln.

**Gameplay-Video (Nachtrag):** `media/r38_magnet_achterbahn.mp4` (Hochformat 1080x1920, 30 fps,
mit Ton) plus `..._small.mp4` (810x1440) unter 10 MB. Kopflos-Chrome rendert ohne GPU (~130 ms je Bild), deshalb
wird nicht in Echtzeit aufgenommen, sondern Bild fuer Bild in Spielzeit (`art/r38/capture_frames.mjs`,
`performance.now` laeuft virtuell mit). Die Spielereignisse werden mitprotokolliert; Schnitt,
Endkarte (On-Ride-Foto, Link, Credits) und Ton (Musik, Katapult, Ansagen, Airtime-Whoosh exakt auf
die Ereignisse gelegt) entstehen im Blender-Videoschnitt (`art/r38/edit_video_blender.py`), Export
als H.264/AAC. Post-Texte je Plattform: `media/social-texte-r38.md`.

**Verifikation:** 46/46 Unit-Tests (9 neue fuer `coaster.mjs`). Autopilot-Regression auf allen
sieben Strecken bei 100 ccm: alle im Ziel, 0 JS-Fehler, 0 fehlende Dateien, je Runde eine
Achterbahn-Wertung auf den drei Achterbahn-Strecken; zusaetzlich 150 ccm auf Geisterhaus,
Regenbogenpiste und Kirmes. Draw Calls im Rennen 118-183. Fahrt-Screenshots von Katapult, Kuppe
(Airtime) und Abfahrt sowie des On-Ride-Fotos gesichtet.

## Runde 37 (23.09.2026): Keyart mit allen Facelift-Assets erneuert

Das Teaserbild (og:image) und die Hochformat-Variante fuer Story-Posts zeigen jetzt die
faceliftete Ausstattung: drei schwebende Item-Boxen mit goldenen Eckkappen vor dem Sporentor,
zwei Sprungpilze mit welliger Krempe am Strassenrand und die Pilzschanze mit Fussbalken
seitlich - dazu Tor, Ballonbogen und Kart wie gehabt. Aufnahmen aus dem Unreal-Keyart-Level
(HighResShot quer 1920x1080 und hoch 1080x1920, JPG Qualitaet 88); alte Bilder in
art/r37/backup/. Level mit der neuen Deko-Gruppe R37_KeyartRefresh gespeichert.

**Verifikation:** Sichtpruefung beider Aufnahmen (Komposition teilbar, nichts abgeschnitten,
Belichtung gut); Dateien lokal 1920x1080 und 1080x1920 bestätigt.

## Runde 36 (23.09.2026): Tribuene, Geist, Trophaee, Podium

Vier Facelifts in einem Zug, alle rein dekorativ (Korpus, Materialzuordnung und alle
Mesh-Namen unveraendert, Backups in art/r36/):

- **Tribuene:** Festliche Wimpelgirlande ueber die Dachvorderkante (leicht durchhaengende
  Linie mit 14 Dreieckswimpeln, ein Mesh) und zwei Knaufe auf den Dachenden. 778 Dreiecke.
- **Geist:** Er hat vorher kein Gesicht gehabt - jetzt zwei dunkle ovale Augen und ein
  Mund-Oval auf der Vorderseite. Pendelt wie gehabt; das Gesicht liest sich aus jeder
  Schwenkrichtung. 4208 Dreiecke.
- **Trophäee:** Zwei klassische Pokal-Henkel (12-seitige Halbringe, TrophyGold). 1576 Dreiecke.
  Rotiert weiter auf Platz 1 der Siegerehrung.
- **Podium:** Goldene Fussleiste an der Front. 1068 Dreiecke.

Unreal: Importe validiert (grandstand 4, ghost 19, trophy 3, podium 2 Static-Meshes).

**Verifikation:** 37/37 Unit-Tests; Geisterhaus-Rennen ohne Fehler; Workbench-Previews:
Geist-Gesicht lesbar und auf der Fläche, Wimpel haengen korrekt.

## Runde 35 (23.09.2026): Sprungpilz-Facelift

Die Sprungpilze (mindestens zwei pro Strecke) bekommen eine gewellte Creme-Krempe am
Kapprand und vier zusaetzliche Sporen-Sprenkel auf dem Hut. Die Squash-Animation erfasst
die Deko automatisch (Gruppenskalierung). Korpus und Materialzuordnung unveraendert.
592 statt 536 Dreiecke, 48 KB. Blender-Quelle in art/r35/, Backup dort.

Unreal: Import validiert (/Game/MushroomRally/bouncepad_r35/, 6 Static-Meshes inkl. PadBrim).

**Verifikation:** 37/37 Unit-Tests; Kopflos-Chrome-Rennen ohne Fehler; Workbench-Preview mit
sauber sitzender Krempe.

## Runde 34 (23.09.2026): Item-Box-Facelift

Die schwebenden Item-Boxen (auf jeder Strecke, staendig im Blick) bekommen acht goldene
Eckkappen - als EIN gemergtes Mesh, also nur ein zusaetzlicher Zeichenaufruf fuer alle Boxen
einer Strecke. Bänder und Schleife sind jetzt sattes Gold mit leichtem Metallglanz statt
flachem Beige. Korpus, Masse und alle Mesh-Namen unveraendert (Instanz-System und
Drehradius greifen unverändert weiter). 492 statt 396 Dreiecke, 40 KB. Blender-Quelle in
art/r34/, Backup dort.

Unreal: Import validiert (/Game/MushroomRally/itembox_r34/, 7 Static-Meshes inkl. CornerCaps).

**Verifikation:** 37/37 Unit-Tests; Kopflos-Chrome-Rennen ohne Fehler; Workbench-Preview mit
sauber sitzenden Kappen.

## Runde 33 (23.09.2026): Schanzen-Facelift

Die Sprungschanzen (auf jeder Strecke, vor jedem grossen Sprung) bekommen Fussdeko: zwei
Holzbalken mit Streifenkante entlang der Flanken und je drei kleine Pilze (Stiel plus gewoelbte
Kappe) auf den Balken. Die Fahrflaeche, Masse und Materialzuordnung (RampPaint fuer die
Gelb-Toenung der Schluchtschanzen) bleiben unberuehrt - die Sprungphysik ist unveraendert.
680 statt 308 Dreiecke, 54 KB. Blender-Quelle in art/r33/, Backup des alten Modells dort.

Unreal: Import ins Showcase-Set (/Game/MushroomRally/ramp_r33/, 17 Static-Meshes mit aller
Deko) als Engine-seitige Strukturvalidierung.

Sound: Der ElevenLabs-Fundus (vier BGM-Loops plus SFX) ist vollstaendig im Spiel; neue
Generierungen waren nicht moeglich - in dieser Umgebung existiert kein ElevenLabs-Zugang
(API-Key/Werkzeug). Nachgereichte Clips lassen sich direkt einbinden.

**Verifikation:** 37/37 Unit-Tests; Kopflos-Chrome-Rennen ohne Fehler; Workbench-Preview mit
sauber sitzenden Balken und lesbaren Pilzen.

## Runde 32 (22.09.2026): Windringe und Praezisionsflug

Die Sprungringe haben ein eigenes Blender-Modell: ein schlanker tuerkiser Leuchtring,
sechs goldene Federpfeile und dunkle Verbindungen. Die Oeffnung bleibt frei; 1.536 Dreiecke,
44 KB GLB und zwei zusammengefuehrte Zeichenaufrufe pro Ring in der Browserfassung.
Die Ringe drehen langsam und leuchten beim Durchflug kurz auf.

Wer mit geoeffnetem Pilzgleiter hoechstens 1,35 m vom Ringmittelpunkt abweicht, bekommt
**Praezisionsflug**: 1,55 statt 1,30 Sekunden Ring-Turbo. Nur echte Gleitfluege zaehlen;
Rettungsdrops, Treffer und Anti-Grav-Ringe sind ausgeschlossen. Die Ergebnisanzeige zaehlt
Praezisionsfluege. Sprungweiten, Schwerkraft und Ring-Kontaktbereich bleiben erhalten.

Der Gleiter bekommt einen leisen Oeffnungsklang; Praezision nutzt einen weich gemischten
vorhandenen ElevenLabs-Effekt. Die normalen Ringtoene liegen tiefer und sind leiser.
Es wurden fuer dieses Update bisher keine neuen ElevenLabs-Generierungen berechnet.

**Lade-Fix R31:** Die vorhandenen drei Ladeversuche bleiben erhalten. Fehlende Prototypen
werden beim ersten Weltaufbau erfasst. Kommen sie nach dem Neun-Sekunden-Fallback doch an,
werden veraltete Strecken-Caches entfernt und das Menue einmal aktualisiert; im Rennen
wird der Neuaufbau bis zum Wechsel aufgeschoben. Ein dauerhafter Fehler loest keinen
nutzlosen Neuaufbau aus.

**Verifikation:** 37/37 Unit-Tests (Physik, Gleiter, Audio, Lader, Praezisionsflug).
Blender-Quellen und Unreal-Importskript liegen lokal unter `art/r32/`.

## Runde 30 (22.09.2026): Konfettistart, Ziel-Feuerwerk, Fahrer-Varianten

**Konfettiregen beim LOS!** Springt die Ampel auf Gruen, regnen 130 drehende Konfettizettel
(eigenes Instanz-System, nicht die kleinen Funken) ueber die Startaufstellung - acht Farben,
Schwanken und Taumeln im Fall, 2,6-3,8 s Lebensdauer. Erste Fassung mit 46 Funken-Partikeln war
zu blass; die Zettel-Version besteht die Sichtpruefung deutlich.

**Feuerwerk beim Zieleinlauf:** Wer ins Ziel kommt, bekommt drei gestaffelte Bursts ueber dem
Sporentor (Theme-Farben, weisse Glanzpunkte dazu) - sichtbar auch noch im Result-Schirm, weil
die Abarbeitung vor dem Spielzustands-Check laeuft.

**Fahrer-Varianten verjuengt:** Mochi (Katze) und Schildi (Schildkroete) bekamen groessere
Augen mit Highlights und rosige Wangen, Volt (Roboter) das breitere Mundband - derselbe
Charm-Pass wie Pilzi in Runde 29, per generischem Blender-Skript ueber die Mesh-Namen.
Backups aller drei Modelle in art/r29/.

**Verifikation:** 26/26 Unit-Tests; Kopflos-Chrome-Rennen ohne Fehler; Screenshots: Konfetti
klar als fallende Zettel lesbar, Feuerwerk als radiale Farbbursts ueber dem Tor.

## Runde 29 (22.09.2026): Glasbahn transparenter, Fahrer-Facelift

**Glasbahn:** 80 % Deckkraft war noch zu dicht - jetzt 60 % und die Emission von 0,85 auf 0,7
zurueckgenommen. Der Sternenhimmel scheint jetzt deutlich durch die Fahrbahn, auch unter den
Karts; Sichtpruefung bestaetigt: Glas-Lesbarkeit und Rennbarkeit bleiben erhalten.

**Fahrer-Facelift (Blender):** Die Fahrer wirkten aus der Distanz flach - Kappen lasen sich als
Blobs, Augen waren zu klein, Arme dünn. Pass auf dem bestehenden Modell (Struktur und Namen
unveraendert, damit Menue-Thumbnails und Podium-Referenzen weiterlaufen): Augen und Highlights
+38 %, Wangen +50 % und rosa statt blass, Mund 35 % breiter (Laecheln), Aermel +24 %, Ellbogen
und Handschuhe dicker, Kopf 4 % kleiner (Proportion), und ein Creme-Kappenrand (D_CapBrim,
20-seitiger Ring) gibt dem Pilzhut die fehlende Krempe. 6806 Dreiecke (+40), 252 KB. Backup
des alten Modells in art/r29/.

**Verifikation:** 26/26 Unit-Tests; Workbench-Preview (Front/Hero) und In-Game-Screenshots -
Augen mit Highlights von Startaufstellungs-Distanz lesbar, Krempe sitzt, keine Clipping- oder
Renderfehler.

## Runde 28 (22.09.2026): Regenbogenpiste als Glasbahn

Die Regenbogenpiste ist jetzt halbtransparent: Das Farbband bekommt `transparent:true` bei 80 %
Deckkraft, doppelte Seite und kein Tiefenschreiben - der Sternenhimmel (700 Punkte) scheint
durch die Fahrbahn, besonders in Kurven, an Kuppen und im Looping (Nutzerwunsch R28). Die
blickdichte dunkle Unterseite aus frueheren Runden entfiel dafuer; sie haette genau den Blick
auf die Sterne verbaut. Randsteine, Mittellinie und Energiebander bleiben opak, damit die Spur
lesbar bleibt. Sichtpruefung: Sterne durch die Bahn sichtbar, Farben kraeftig, keine
Transparenz-Artefakte.

**Verifikation:** 26/26 Unit-Tests; Regenbogen-Rennen im Kopflos-Chrome mehrfach ohne Spiel-
fehler durchlaufen.

**Nachtrag Hotfix (R28b):** Die Live-Seite hing danach im Ladeschirm fest. Ursache war ein Fehler
aus den Zielflaggen (R25), der beim Auslesen der sample()-Rueckgabe `p.x` statt `p.p.x` nutzte -
buildWorld crashte bei jeder Strecke, der Loader blieb stehen. Der isVector3-Fehler, den das
Verify-Skript schon vorher meldete, war genau dieser Bug (die Verwechslung als Skript-Artefakt
war falsch - die scheinbar sauberen Laeufe fingen ihn nur nicht ein). Nach dem Fix laedt das
Spiel lokal in ~10-15 s und live in ~10 s ohne Exceptions.

## Runde 27 (22.09.2026): Durchgaengige Bahnmagnetik in den Spiralen

In den Anti-Grav-Spiralen gab es innerhalb eines freien Bands (+/-7 m um die Ideallinie) keinerlei
Fuehrung - erst dahinter griff der starke Magnet. Wer in einem Korkenzieher lenkte oder getroffen
wurde, sackte seitlich weg und klebte an der Energiebande, bis die Zone endete (Nutzerbericht;
im deterministischen Sim-Test: Voll-Lenkung trieb das Kart auf 8,4 m Versatz, 5 von 6 Messpunkten
klebten am Rand).

Drei Aenderungen zusammen, jede allein ungenuegend:
- **Winkel-Klemme:** Das Kart steht in Rollzonen maximal 20 Grad schraeg zur Bahn. Die Lenkrate
  dort (Grip 2,3) schlug jede weiche Richtungsnachfuehrung - das Kart stand quer und sackte durch
  die Kurve. Mit Klemme fuehrt die Bahn, Lenken waehlt die Linie.
- **Freies Band von 7 auf 3,2 m verkleinert:** der bewaehrte starke Magnet greift frueher.
- **Grundzug im Band:** proportionaler Zug zur Mitte plus Cap der Drift nach aussen (~3,2 m/s).

Sim-Test (Neon-Korkenzieher, Zeitfahren, gesetzt Start, Dauer-Voll-Lenkung):
**maximaler Versatz 8,45 -> 6,08 m, Kleben am Rand 5/6 -> 0/5 Messpunkte**, Rueckkehr nach
Zonenende. Die Ideallinie bleibt unberuehrt (unter 0,4 m wirkt nichts): Autopilot-Regression auf
Neon, Geisterhaus und Lava-Feste mit 0 Respawns, Geisterhaus-Mindesttempo sogar 15,8 -> 26 m/s.

**Verifikation:** 26/26 Unit-Tests; deterministischer Zone-Sim (art/r27_sim.mjs) vorher/nachher;
Autopilot-Runden Neon/Geisterhaus/Lava ohne Zuruecksetzungen.

## Runde 26 (21.09.2026): Fahrflow - Kanten-Gnade, offene Looping-Spirale, glatte Rampenflanken

**Die Ursache fuer haengenbleibenden Fahrflow war messbar:** Der Autopilot stuerzte auf dem
Sonnen-Canyon 429- und auf der Regenbogenpiste 372-mal je Rennen in einen Respawn-Zyklus -
immer an derselben Stelle. Wer eine Schlucht knapp zu kurz sprang, kreuzte die Landekante UNTER
Kantenniveau, und die Absturzpruefung (y < ground-1.5) lief VOR der Landung: Respawn am
Rettungspilz, wieder anrollen, wieder zu kurz - Endlosschleife. Menschen merken dasselbe als
"bleibe haengen" und "kein smoother Flow".

**Kanten-Gnade:** Wer die Landekante weniger als 6 m unter Niveau kreuzt, knallt jetzt hart auf
die Fahrbahn und faehrt weiter (mit Squash und Kamera-Ruck - es soll weh tun, aber im Rennen
bleiben). Canyon: **429 -> 0** Respawns, Regenbogen: **372 -> 3**, Geisterhaus und Lava-Feste
bleiben bei 0.

**Looping-Spirale geoeffnet (Nutzerwunsch):** Der Looping war ein geschlossener Tropfen -
Einfahrt und Ausfahrt trafen sich im selben Punkt. Jetzt schiebt ein linearer Vorschub
(gap = 34 % des Radius, ~9 m) die Ausfahrt seitlich vorbei: eine echte Achterbahn-Spirale.
Sichtpruefung bestaetigt zwei getrennte Fahrbahnbaender am Boden; Zeiten unveraendert.

**Haengenbleiben generell:** Die Stuck-Befreiung (1,6 s Gas ohne Tempo -> Rettungspilz) gilt
jetzt auch fuer den Spieler (2,6 s, erst nach dem Countdown - der Raketenstart darf nicht
ausloesen). Wer irgendwo an Deko oder in einer Spirale festhaengt, kommt ohne Taste R frei.

**Zwei Glättungen gegen Holpern:** Der Sichthub der Anti-Grav-Bahn baut sich ueber die letzten
38 % statt 30 % der Zone ab - der gemessene Geschwindigkeitsruck am Zonenaustritt sank von 13
auf 9,2 m/s (Geisterhaus). Rampenflanken (Viadukte, Plateaus) steigen statt mit smoothstep
(C1) jetzt mit smootherstep (C2) - die Steigung ist an den Flankenenden stetig, Hoehen
unveraendert.

**Verifikation:** 26/26 Unit-Tests; Autopilot-Runden auf allen sechs Strecken (0-5 Rest-Respawns,
Rundenzeiten im Medaillenrahmen); Looping-Screenshot mit getrennter Ein-/Ausfahrt.

## Runde 25 (21.09.2026): Wehende Zielflaggen am Start-Ziel-Bereich

Links und rechts neben dem Sporentor stehen jetzt zwei sieben-Meter-Masten mit grossen
Schachbrett-Fahnen (3,0 x 1,8 m), die im Wind der Wimpel-Leinen wiegen - dieselbe
Vertex-Animation, mit eigener Amplitude (`amp`), weil die Tuecher groesser sind. Die Flaggen
ragen von aussen ueber die Streckenraender, ohne die Durchfahrt (Halbbreite 7,6 m) oder die
Ampelzone zu beruehren; die Masten haben Kollisionskreise. Zwei Draw Calls gesamt (Masten
gemergt, Fahnen gemergt), die Schachbrett-Textur teilt sich die Palette mit der Ziellinie.

Dazu: Hochformat-Keyart fuer Social-Posts erneuert (`media/keyart_hoch.jpg`, 1080x1920 aus
dem Unreal-Keyart-Level, gleiche Session wie Runde 24).

**Verifikation:** 26/26 Unit-Tests; Kopflos-Chrome-Start ohne JS-Fehler; Screenshot-Check -
beide Masten und Fahnen sichtbar, Textur richtig gemappt, kein Clipping mit Tor, Ballons oder
Karts.

## Runde 24 (21.09.2026): Keyart mit Sporentor und Ballonbogen

Das Vorschaubild beim Teilen (`assets/keyart.jpg`, og:image) zeigte noch den Stand vor Tor und
Ballonbogen. Im Unreal-Keyart-Level (`L_MR_Keyart`, Projekt test123 5.8) stehen jetzt sieben
Ballonhuellen im Bogen hinter dem Tor (Showcase-Materialvarianten `MI_Balloon_0..3`), und der
SceneCapture schaut neu: Kart mit Fahrer vorne, Sporentor mittig, Ballonbogen als Tiefenschicht
- Abendlicht, 1920x1080.

Der RT-Export fiel als Float-PNG unlesbar aus; gesetzt hat schliesslich der bewaehrte Weg aus
Runde 20: Viewport-Kamera auf die Capture-Pose (`set_level_viewport_camera_info`) und
`HighResShot` - der Viewport bringt seine eigene belichtete Nachbearbeitung mit. JPG-Umwandlung
per GDI+ (Qualitaet 88, 138 KB). Altes Bild als `art/r24/keyart_r19_backup.jpg` gesichert.

**Verifikation:** Sichtpruefung des Renders (Tor prominent, Ballonbogen lesbar, Belichtung
warm, Komposition share-tauglich); Level gespeichert.

## Runde 23 (21.09.2026): Ballonbogen am Start

Zwoelf Meter hinter dem Start-Ziel-Tor spannt sich jetzt ein Bogen aus sieben Heissluftballons
ueber die Fahrbahn, an einem Seil aufgehaengt, das an zwei Pfosten im Boden verankert ist. Beim
Countdown steht er hinter dem Sporentor im Bild, beim Zieleinlauf faehrt man durch ihn hindurch
ins Ziel. Die Ballonkoerbe haengen in Bogenform (Scheitel 12,6 m), die Farben rotieren durch die
Fan-Palette, auf Leuchtstrecken bekommen die Huete einen sanften Emissionsanteil.

Kosten: alle sieben Ballons teilen sich vier Instanz-Meshes (`scatterColored`, CapPaint je
Instanz gefaerbt), dazu Seil (CatmullRom-Tube) und Pfosten - **6 Draw Calls** gesamt.

**Verifikation:** 26/26 Unit-Tests; Kopflos-Chrome-Start ohne JS-Fehler, Bogen im
Startaufstellungs-Screenshot vollstaendig (bunt, verankert, kein Clipping mit dem Tor).

## Runde 22 (21.09.2026): Sporentor - neues Start-Ziel-Tor

Das Start-Ziel-Tor war das letzte einfache Bauwerk im Spiel: zwei duenne Pfosten, ein schmaler
Balken, zwei Pilzkappen. Jetzt steht dort das **Sporentor**: konische Creme-Pfeiler mit Sockel
und Wulstringen, breite Pilzkappen mit Lamellen und Sporenpunkten als Kapitell, ein gebogener
Rotbalken mit Konsolen und Creme-Bannerband, darueber eine ganze Pilzhut-Markise mit
hochgezogenen Traufen, Sporenpunkten und Finial, zwei warm leuchtende Haengelaternen und vier
kleine Fusspilze an der Basis. **1810 Dreiecke, 46 KB** - weniger als die Haelfte der alten
Datei (1412 Dreiecke, 114 KB), weil die alten Kugel-Sporen entfielen.

Die Kopplungen blieben unangetastet: Pfeiler bei +/-9,3 m (Kollisionskreise), Ampelzone
4,8-6,4 m frei, Balken nur 0,48 m dick, damit die MUSHROOM-RALLY-Labels bei z=+/-0,26 weiterhin
vor dem Bauwerk schweben. Einzige Codezeile: die Pilzkappen (Material `CapPaint`) werden je
Strecke auf `theme.caps[0]` getoent - das Tor traegt jetzt Waldrot, Canyon-Orange,
Neon-Pink, Geister-Violett, Lava-Orange und Regenbogen-Pink.

Blender-Quelle in `art/r22/` (create_gate.py, gate_r22.blend, Backup des alten Tors);
Workbench-Previews bestanden die Sichtpruefung nach zwei Iterationen (Kappen sind Gewoelbe,
keine Truechter - die Umkehr der Profilformel war der Knackpunkt).

Unreal: Tor als `gate_r22` ins Showcase-Projekt importiert (test123 5.8,
`/Game/MushroomRally/gate_r22/`), im Keyart-Level `L_MR_Keyart` bei (0, -1000) auf der
Strasse platziert und gespeichert; Viewport-Nachweis in `art/r22/unreal_gate_view.png`.

**Wetter-Wolken dazu:** Canyon und Lava-Feste waren die einzigen wolkenlosen Tageslicht-Strecken.
Jetzt haengen ueber dem Sonnen-Canyon warm leuchtende Abendwolken und ueber der Lava-Feste
dunkle Glutwolken (`theme.cloudCols`, flache Kugelhaufen mit Emissionsanteil, ein Draw Call je
Strecke). Forest behaelt seine weissen Wolken.

**Verifikation:** 26/26 Unit-Tests; Kopflos-Chrome-Rennen ohne JS-Fehler, Tor im
Startaufstellungs-Screenshot vollstaendig (Banner lesbar, Ampel sichtbar, keine Glitches);
Canyon-Screenshot mit Abendwolken verifiziert.

## Runde 21 (20.09.2026): Neon-Torbogen

Der Neon-Pilzwald war die letzte Strecke ohne Durchfahr-Bauwerk. Jetzt steht dort ein Torbogen:
zwei Pfeiler mit Leuchtroehren, drei gestaffelte Daecher mit hochgezogenen Traufen, ein Banner
ueber der Fahrbahn und Laternen an den Traufen. 40 m breit, 29 m hoch, **480 Dreiecke, 46 KB**.

Die Leuchtroehren bleiben als eigene Materialien stehen, weil `mergeByMaterial` emissive
Materialien nicht zusammenfasst - alles andere faellt in einen einzigen Zeichenaufruf. Die
Strecke kostet dadurch praktisch nichts: 151 statt 153 Draw Calls.

Das Bauwerk-System aus Runde 17 hat dafuer gereicht, es brauchte nur einen Eintrag in `BUILDINGS`
und `builds:[[11.45,'neongate']]` an der Strecke.

## Runde 20 (20.09.2026): Pilzgleiter

Nach einer Schanze oder einem Sprungpilz klappt jetzt ein Gleitschirm auf. Er ist **rein
optisch**: Sprungweite, Schwerkraft und Renngleichgewicht bleiben unveraendert - die Rundenzeit
auf der Pilz-Promenade liegt mit und ohne Schirm bei 86,3 s.

Die Ausloeselogik steht als eigenes Modul `glider.mjs` neben der Darstellung, damit sie ohne
Browser pruefbar ist:
- Nur Schanze und Sprungpilz spannen den Schirm vor, nichts anderes.
- Es braucht mindestens 0,12 s Flugzeit **und** 0,7 m Abstand zum Boden. Rettungssprunge,
  Treffer-Huepfer und kleine Bodenwellen loesen dadurch nichts aus.
- Landung, Treffer, Rollzone und Zieleinlauf falten ihn sofort wieder ein.
- Das Auf- und Zuklappen laeuft bildratenunabhaengig (`1-exp(-rate*dt)`).

Das Modell (`assets/glider.glb`, 56 KB, 2527 Dreiecke, vier Materialien) entsteht in Blender;
die Quellen liegen in `art/r20/`. Faellt die Datei aus, baut `fallbackGlider()` einen Ersatz im
Code - und der Schirm steht in der Signatur des Kart-Pools, damit nicht versehentlich der
Ersatzschirm zwischengespeichert wird.

Der Schirm uebernimmt die Lackfarbe des Karts. Beim ersten Aufklappen im Rennen erscheint der
Hinweis "PILZGLEITER! DRIFT = TRICK".

**Verifikation:** 20 Unit-Tests (Kern und Gleiter) plus 6 fuer die Tonmischung. Die Tonreihe lief
bisher nie mit - sie stand in keiner Testzeile und ist jetzt in `npm test` aufgenommen. Alle
sechs Strecken im Autopilot durchgefahren, der Schirm oeffnet auf jeder (6-18 Messpunkte je
Runde), 95-163 Draw Calls.

## Runde 19 (20.09.2026): Schluesselbild aus Unreal

Das Unreal-MCP war wieder erreichbar, also ist der Showcase dort nachgeholt worden. Im Projekt
`test123 5.8` liegt jetzt ein eigenes Set unter `/Game/MushroomRally/` mit dem Level
`L_MR_Keyart` - das vorhandene Level `L_Kristalljaeger` bleibt unberuehrt.

Die GLB-Modelle des Spiels (Kart, Fahrer, Rad, Pilz, Baum, Item-Box, Wurzeltor) sind importiert
und zu einer Szene zusammengesetzt: Fahrbahn mit Randsteinen und Mittellinie, das Wurzeltor
darueber, Pilze und Baeume am Rand, Abendsonne mit Himmelsatmosphaere und Bodennebel.

Zwei Stolpersteine dabei, beide nicht offensichtlich:
- **Der Himmel blieb schwarz**, bis am Richtungslicht `atmosphere_sun_light` gesetzt war. Ohne
  das beleuchtet die Sonne die Atmosphaere nicht, und damit fehlt auch das gesamte Umgebungslicht.
- **Die Aufnahme kam fast schwarz heraus**, weil eine SceneCapture ihre eigene Nachbearbeitung
  hat und das unbegrenzte PostProcessVolume nicht uebernimmt. Belichtung also direkt an der
  Aufnahme setzen (Histogramm, `always_persist_rendering_state`, mehrfach aufnehmen, damit sich
  die Belichtung einpendelt).

Das Ergebnis ersetzt `assets/keyart.jpg` - das ist das Vorschaubild, das beim Teilen des Links
angezeigt wird (`og:image`). Hochformat fuer Social-Posts liegt in `media/keyart_hoch.jpg`.

## Runde 18 (19.09.2026): Beschleunigungsstreifen, kein Tempoverlust mehr in den Spiralen

**Warum man in den Spiralen haengen blieb - drei Ursachen, alle gemessen.**

1. *Die Offroad-Bremse griff auf der schwebenden Bahn.* Neben einer Anti-Grav-Bahn gibt es kein
   Gelaende - sie schwebt, daneben ist nichts. Trotzdem galt dort das Offroad-Hoechsttempo von
   12,5 m/s. Wer einen Meter zu weit aussen fuhr, wurde also auf Schrittgeschwindigkeit gebremst.
2. *Die Seitenhaftung war die normale.* Auf einer magnetisch haltenden Bahn schob das Kart quer
   weg (gemessene Querbewegung bis 10 m/s) und landete damit erst recht zu weit aussen.
3. *Der Boden fiel neben der Bahn ab.* Dadurch loeste sich der Haltemagnet, das Kart fiel heraus -
   und der Rettungspilz setzte es auf die **Sichthoehe** der schwebenden Bahn, also 12,5 m ueber
   dem physikalischen Boden. Von dort fiel es wieder. Auf der Lava-Feste ergab das 28
   Zuruecksetzungen je Rennen und eine Rundenzeit von 184 statt 90 Sekunden.

Dazu kam ein Feuerball mitten im Korkenzieher: in einer Rollzone bildet der Querversatz auf die
Hoehe ab, das Pendel stand deshalb in x/z still auf der Mittellinie - genau auf der Ideallinie -
waehrend die Kollision weiter flach rechnete. Pendel und Geister werden jetzt aus Rollzonen
herausgeschoben.

Gemessen im Korkenzieher, vorher/nachher: **10,8 -> 30,5 m/s Mindesttempo**, Lava-Feste im
Zeitfahren **184 -> 89,9 s**, Zuruecksetzungen **28 -> 0**.

**Beschleunigungsstreifen:** drei je Rollzone, breiter als die normalen (12,4 m statt 11 m) und
mit groesserem Auffangband, weil man sie beim Drehen sonst verfehlt. Turbo liegt jetzt auf
71-96 % der Zonenlaenge an.

**Spiralen laenger:** alle Zonen noch einmal gestreckt, jetzt 85-147 m statt 59-113 m.

**Tempolinien beim Turbo** waren in CSS und im Code laengst vorhanden - nur das Element fehlte im
Markup, die Funktion war also tot. Jetzt ziehen die Striche wieder vom Bildrand nach innen.

**Verifikation:** Alle sechs Strecken im Autopilot bei 100 ccm durchgefahren (89,8 / 144,9 / 83,3
/ 106,4 / 97,6 / 117,5 s), Plaetze 1-5, keine Zuruecksetzungen, 92-157 Draw Calls, 15/15
Unit-Tests. Medaillenzeiten fuer Neon-Pilzwald, Lava-Feste und Regenbogenpiste neu kalibriert,
`LAYOUT_VER` auf 18.

## Runde 17 (19.09.2026): Wurzeltor, einseitige Korkenzieher, freie Sicht, lauterer Sound

**Looping mit Tropfenform.** Ein geschlossener Kreis liess Ein- und Ausfahrt uebereinanderliegen.
Jetzt Tropfen (unten enger, oben runder) und deutlich mehr Vorlage: der Fussabdruck ist von
R*1,26 auf R*1,85 gewachsen, Ein- und Ausfahrt laufen sichtbar auseinander.

**Korkenzieher drehen nur noch in eine Richtung.** Vorher drehten sie ein und wieder zurueck -
dieses Gegenlaufen war der Grund fuers Verkanten. Jetzt: eindrehen, den Winkel ein Stueck halten,
in derselben Richtung bis zur vollen Umdrehung weiterdrehen. Zwei Bauarten:
- `wall` haelt 90 Grad Wandfahrt,
- `over` haelt kopfueber.

Alle Anti-Grav-Abschnitte sind deutlich gestreckt (die Drehung war zu hastig), und im
Neon-Pilzwald liegt der Korkenzieher jetzt **im Neontunnel** - das Gewoelbe dreht mit.

**Freie Sicht in den Spiralen.** Die Fahrbahn ist ein 17,8 m breites Band, das um die Mittellinie
schwenkt. Alles, was naeher als die halbe Bahnbreite an dieser Achse sitzt, wird davon
ueberstrichen - und die Kamera sass 3,7 m ueber der Bahn, also mitten drin. Gemessen per
Strahlentest: in 19-45 % der Bilder lag etwas zwischen Kamera und Kart. Jetzt rueckt die Kamera
in Rollzonen nach aussen und dafuer naeher heran, folgt der Steigung der sichtbaren Fahrbahn und
setzt sich auf die Bahn an ihrer eigenen Stelle. Ergebnis: **0-8,8 %**. Stuetzen stehen nur noch
unter kaum gedrehter Fahrbahn.

**Wurzeltor** (neu, in Blender gebaut): zwei Baumstaemme mit Wurzelfaechern, ein Bogen aus
Wurzeln darueber, Laubdach, haengende Ranken, Pilze am Fuss - 95 KB. Das Bauwerk-System ist
dafuer verallgemeinert: `BUILDINGS` beschreibt Kollider und Sperrzone je Bauart, und eine Strecke
kann mehrere Bauwerke tragen (`course.builds`).

**Ein Fehler, der lange schlummerte:** weit neben der Fahrbahn wurde die gerollte Abbildung
benutzt. In einer Rollzone steht die Bahn senkrecht, dort zeigt die Querachse nach oben - ein
Querversatz von 19 m landete damit senkrecht ueber der Mittellinie. Tribuene und Baeume standen
also mitten auf der Strecke; die Pilz-Promenade brauchte dadurch 189,6 statt 99,4 s. `sample()`
rechnet ab 10,6 m Querversatz jetzt flach.

**Leichter:** 100 ccm von ai .91 / skill .68 auf .855 / .52, Aufholhilfe von .035 auf .055.

**Sound:** Effekte lagen auf .6 und gingen in der Musik unter. Jetzt Effekte auf 1,25, Musik von
.62 auf .46, und die Klangangleichung hebt auf Effektivpegel .20 statt .12 an. Neu von
ElevenLabs: Zuschauerjubel, Turbo, Rundenglocke, Rempler und Driftquietschen.
**Die Musik konnte nicht erzeugt werden - das ElevenLabs-Konto hat dafuer zu wenig Guthaben**
(Effekte 50 Credits, Musik 900).

**Tribuene** besteht jetzt aus drei Segmenten statt einem - rund 50 statt 16 m.

**Verifikation:** Alle sechs Strecken im Autopilot bei 100 ccm durchgefahren (99,4 / 127,1 /
98,3 / 108,0 / 95,6 / 123,9 s), Platz 1-5 statt durchweg hinten, 89-158 Draw Calls, 15/15
Unit-Tests. Medaillenzeiten fuer Sonnen-Canyon, Neon-Pilzwald und Regenbogenpiste neu kalibriert,
`LAYOUT_VER` auf 17.

## Runde 16 (19.09.2026): Looping neu gebaut, Anti-Grav ohne Ruckeln

**Looping: von Grund auf anders.** Bisher wurde eine 360-Grad-Kehre waagerecht in die Mittellinie
eingesetzt und nur im Bild aufgestellt. Gefahren wurde also eine unfahrbar enge Kurve. Gemessen:
das Kart brach zweimal je Runde von 28 auf 7,6 m/s ein, die Strecke kreuzte sich selbst, und am
Ausgang sprang das Kart 30 m weit.

Jetzt bleibt die Mittellinie unangetastet. Ein kurzes, moeglichst gerades Stueck Fahrbahn (34 m)
wird im Bild zu einem senkrechten Kreis aufgestellt — gefahren wird geradeaus. Damit das Bild
nicht im Zeitraffer laeuft, wird der Vorschub auf der Fahrbahn um genau den Faktor gebremst, um
den das Bild gestreckt ist (`moveMul` in `driveKart`). Der Winkel faehrt weich an und aus, sodass
die Bildgeschwindigkeit an beiden Enden stetig uebergeht.

Messung vorher/nachher im Looping: Tempo 7,6–28 → 30–38,6 m/s, groesster Bildsprung 30 m → 0,87 m,
Hoehe 55,6 m, Durchfahrt 7,9 s.

**Anti-Grav: vier Ursachen fuer das Ruckeln.**

1. *Darstellungswechsel.* Kart und Kamera schalteten erst bei Rollwinkel 0,004 auf die gehobene
   Fahrbahnabbildung um. Der Sichthub faehrt aber viel frueher hoch — die Fahrbahn stand schon
   4,2 m hoch, waehrend das Kart noch auf dem Boden gezeichnet wurde, und sprang dann in einem
   Bild hinterher. Jetzt laeuft immer derselbe Weg; ohne Rolle und Hub liefert er exakt die
   physikalische Lage, flach aendert sich also nichts.
2. *Bezugshoehe.* Als Hoehe wurde der Abstand zu `groundAt()` eingesetzt — das rechnet neben der
   Fahrbahn die Boeschung mit ein. Wer mit Querversatz ueber 8,9 m in eine Rollzone einfuhr,
   sprang 1,95 m nach oben. Bezug ist jetzt die Fahrbahnebene selbst.
3. *Tabellenraster.* Rollwinkel und Sichthub kamen aus einer Tabelle mit 2048 Stuetzstellen; linear
   dazwischen heisst treppenfoermige Drehrate. Jetzt analytisch und C2-glatt (smootherstep), damit
   auch die Drehbeschleunigung an den Raendern stetig ist.
4. *Projektion.* `project()` rechnete gegen die naechstgelegene Stuetzstelle. Die wechselt bei
   Tempo fast jedes Bild, und mit ihr springen Bezugspunkt und Tangente — gemessen bis 0,33 m
   Querversatz von Bild zu Bild. Flach faellt das kaum auf, senkrecht wird daraus eine Hoehe.
   Jetzt wird auf das Streckensegment projiziert und die Tangente interpoliert.

Groesster Bildsprung in den sieben Rollzonen aller Strecken: 4,1 m → 0,06–0,35 m.

**Fuehrung:** In Rollzonen wird die Fahrtrichtung gedreht statt das Tempo gedaempft — Daempfen
kostet Schwung, und genau dieser Tempoverlust fuehlte sich wie Anecken an.

**Grafik und neue Ideen:** Der Looping bekommt ein Traggeruest wie eine Achterbahn (zwei Holme
entlang der Bahn, Querstreben, Neonringe am Fuss) und ein Leuchtband auf der Fahrbahn. Das
Energieband der Anti-Grav-Bahn bekam seine Textur nie — `boostTex` entstand erst nach dem
Strassenbau; jetzt wandert es wieder. Neu: **Looping-Schwung** (sauber durchfahren gibt Boost)
und eine Funkenspur bei Ueberkopf-Fahrt.

**Verifikation:** Alle sechs Strecken im Autopilot durchgefahren (99,4 / 122,4 / 100,2 / 93,4 /
98,3 / 115,0 s bei 150 ccm), KI 0,5–9,3 % neben der Strecke, 49–141 Draw Calls, 15/15 Unit-Tests.
Medaillenzeiten fuer Sonnen-Canyon und Regenbogenpiste neu kalibriert (die Rundenlaenge hat sich
geaendert, weil der Looping keine 224 m mehr in die Mittellinie einsetzt), `LAYOUT_VER` auf 16.

## Runde 14/15 (19.09.2026): Looping, Regenbogenpiste, ruhigere Fuehrung

**Looping (neu):** Der Sonnen-Canyon hat jetzt ein echtes Looping — 55 m hoch, oben faehrt man
ueber Kopf. Technisch wird nach der Kurvenglaettung eine 360-Grad-Kehre in Tropfenform in die
Mittellinie eingesetzt (Tropfen statt Kreis, damit der Einlauf weich ist), und beim Zeichnen wird
diese Kehre senkrecht aufgestellt. Physik und Projektion arbeiten weiter flach, deshalb musste am
Rest nichts geaendert werden. Punkte, die die Schleife ueberholt, werden aus der Mittellinie
entfernt — sonst sprang die Linie am Ausgang 40 m zurueck.

**Regenbogenpiste (neu, 6. Strecke):** schwebt frei im Weltall — kein Boden, keine Boeschung, wer
herunterfaellt, faellt ins Leere. Leuchtende Farbbahn, die langsam wandert, schwebende
Kristallinseln, Sternenstaub. Mit Korkenzieher, Wandfahrt, Sprung und eigenem Looping.

**Ruhiger fahren:** Die Fuehrung in Spiralen und Looping wirkt jetzt wie Seitenhaftung statt wie
eine Wand: innerhalb von +-6 m ist das Lenken voellig frei, darueber zieht es ueber die
Geschwindigkeit zurueck statt die Position zu verschieben (ein Positions-Snap fuehlt sich beim
Fahren wie Verkanten an). In Roll- und Loopzonen greifen die Leitplanken nicht mehr zusaetzlich —
vorher korrigierten zwei Systeme gegeneinander.

**Kamera:** flach, Spirale und Looping laufen jetzt ueber *eine* Kameraführung. Position,
Hochachse und Blickpunkt kommen aus demselben Rahmen und werden durchgehend geglaettet; vorher
waren es drei Modi mit harten Umschaltern, genau dort ruckte das Bild.

**Gemessen** (Autopilot, 150cc): alle sechs Strecken fahren durch — 94,3 / 140,6 / 88,4 / 101,6 /
100,8 / 129,4 s, KI 0,1–6,4 % neben der Strecke. Medaillenzeiten fuer Canyon und Regenbogenpiste
neu gesetzt, alte Rekorde einmalig verworfen (`LAYOUT_VER=15`).

## Runde 13 (18.09.2026): Korkenzieher, kein Haengenbleiben, vier Karts

**Anti-Grav, zweite Stufe:** Die Rolle wirkt jetzt nur noch auf die Darstellung — gefahren wird
weiter in der flachen Streckenebene, die Drehung und der Sichthub kommen erst beim Zeichnen dazu.
Damit sind Dinge moeglich, die die physikalische Neigung nicht konnte: **volle Korkenzieher
(360 Grad)** auf Neon-Pilzwald und Lava-Feste, eine **Ueberkopf-Passage** im Geisterhaus und
steilere Waende (bis 84 Grad) im Wald, Canyon und Neonwald. Dazu Energieband, Torringe an Ein- und
Ausfahrt und Pylonen unter der schwebenden Bahn. Wer sauber durchkommt, bekommt beim Ausgang einen
**Anti-Grav-Schub**.

**Kein Haengenbleiben mehr:** Die Felsen am Tunnel hatten Kollisionskoerper direkt hinter der
Tunnelwand — die sind weg. Leitplanken laufen jetzt auch durch Tunnel, Villa und Burg (dort standen
vorher Feuerschalen und Mauern ungeschuetzt). Aus dem Abprallen an Hindernissen ist ein
Entlanggleiten geworden (Rueckstoss 1,06 statt 1,4, Tempoverlust hoechstens 35 statt 60 Prozent),
und wer mit Gas laenger als 1,6 Sekunden fast steht, wird automatisch zurueckgesetzt.

**Drift haelt die Linie:** Seitenhalt im Drift von 2,6 auf 4,4 erhoeht, der Driftwinkel ist bei
etwa 27 Grad gedeckelt, der Schub nach aussen halbiert, Einstieg ab 9 statt 11 m/s und die
Mini-Turbos laden schneller (0,55 / 1,15 / 1,9 s statt 0,7 / 1,4 / 2,3 s). Driften traegt jetzt
nicht mehr von der Strecke, sondern zieht die Kurve enger.

**Vier Karts statt einem:** Jede Figur faehrt ihr eigenes Kart mit eigenen Werten und eigenem
Heckteil — Pilzi "Sporenflitzer" (ausgewogen), Schildi "Panzerwagen" (Hoechsttempo +9 %,
Beschleunigung -13 %, Heckfluegel), Volt "Voltstoss" (Beschleunigung +18 %, Auspuffrohre und
Ueberrollbuegel), Mochi "Kurvenkatze" (Lenkung +15 %, Diffusor und Seitenschweller).

**Item-Fenster:** Die Symbole sind jetzt gerenderte Bilder der echten Modelle (Panzer, Banane,
Item-Box, Bombe) bzw. extrudierte Formen fuer Blitz und Stern — kein Emoji und kein flaches Icon
mehr.

**Gemessen** (Autopilot, 150cc): alle fuenf Strecken 93,1 / 104,5 / 95,1 / 102,2 / 102,5 s,
Medaillenzeiten neu gesetzt, alte Rekorde einmalig verworfen (`LAYOUT_VER=13`).

## Runde 12 (18.09.2026): Ruckler am Start behoben, Grafikschalter, Anti-Grav

**Rennstart:** Karts, Raeder und Fahrerinstanzen bleiben zwischen Rennen stehen, solange Figur,
Farbe und Feldgroesse gleich sind — der Start kostet damit 5–12 ms statt bis zu 600 ms, weil
nichts mehr neu gebaut und zur Grafikkarte geschoben wird. Schattenkarte von 1024 auf 768,
engerer Schattenausschnitt, Aufloesung standardmaessig auf 1,25 gedeckelt.

**Grafikstufe von Hand:** Im Menue gibt es jetzt Auto / Mittel / Sparsam. Gemessen auf einem
ausgelasteten Rechner (Unreal und Blender liefen parallel): 47 / 35 / 13 ms je Bild. Auto regelt
weiterhin selbst nach, jetzt schon waehrend des Countdowns und alle 1,2 s statt alle 2 s.

**Anti-Grav (neu):** Die Streckentabelle hat eine Rollachse (`TP.rl`). Markierte Abschnitte kippen
die Fahrbahn um die Fahrtrichtung, die Mittellinie hebt sich dabei an, sodass eine echte Wand
entsteht statt einer Grube. Die Fahrbahn haelt magnetisch fest (sonst wirft die Kuppe jeden ab),
die Kamera rollt zu 90 % mit, die Raeder klappen nach aussen, Leitplanken und Randsteine folgen
der Drehung, darunter liegt ein dunkler Kiel. Die Projektion rechnet den verkuerzten
Horizontalabstand wieder auf den echten Querabstand zurueck, damit Physik und Optik zusammenpassen.
Abschnitte: Neon-Pilzwald (75 m, 58°) und Lava-Feste (ca. 48 m, 56°).

**Gemessen** (Autopilot, 150cc, 3 Runden): alle fuenf Strecken fahren durch — 92,2 / 109,9 /
100,8 / 99,8 / 95,6 s, KI 0,3–5,6 % neben der Strecke. Medaillenzeiten fuer Neon-Pilzwald und
Lava-Feste neu gemessen, alte Rekorde einmalig verworfen (`LAYOUT_VER=12`).

**Noch offen:** Echte Loopings und Korkenzieher (Fahrbahn ueber Kopf) brauchen eine
Streckentabelle in 3D — die aktuelle Tabelle ist eine Funktion ueber x/z und kann sich nicht
selbst ueberlagern. Die Wandfahrten sind der erste Schritt dahin.

## Runde 11 (18.09.2026): Lava-Feste, Fahrer-Vorschau, neues Item-Fenster

**Neue Strecke "Lava-Feste"** (eigene Welt, kein fremdes Markenmaterial): schwarze Basaltnadeln,
gluehende Lavaseen, Vulkane am Horizont, Glutflocken in der Luft und ein Lavameer statt Wasser.
Die Strecke fuehrt durch eine **Torburg** mit Spitzbogen, Zinnen, Fallgitter, Bannern und
Feuerschalen (in Blender gebaut, nach Material zusammengefasst). Dazu ein Magmaschacht-Tunnel,
ein Sprung ueber eine Lavaschlucht, ein Viadukt und drei **Feuerbaelle**, die quer ueber die
Fahrbahn pendeln. Layout mit zwei langen Geraden und einer S-Passage: KI faehrt 0,4 % der Zeit
neben der Strecke (erster Entwurf lag bei 10,5 %), engster Radius 23,7 m, Rundenzeit 91,8 s.

**Fahrer-Vorschau:** Die Auswahl im Menue zeigt die Figuren jetzt als kleine gerenderte Bilder
(Render-Target aus dem laufenden Renderer, einmal beim Start und bei jedem Farbwechsel neu) statt
als Emoji — inklusive der gewaehlten Kartfarbe.

**Item-Fenster:** Statt Emoji jetzt gezeichnete SVG-Symbole (Turbo, Panzer, Banane, Schild,
Bombe, Dreifach-Turbo mit Zaehler), Rahmen und Schein in der Item-Farbe, Pop-Animation beim
Erhalten und ein Zittern waehrend die Item-Walze laeuft.

**Nachladen:** Villa und Burg (zusammen ~2 MB) werden erst nach dem Spielstart geladen; die
betroffenen Strecken bauen sich danach automatisch neu. Der Start wartet nicht mehr darauf.

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
