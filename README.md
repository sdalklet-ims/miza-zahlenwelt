# Mia und die Zahlenwelt

Mathe-Lern-App (Prototyp) für ein Kind der 3. Klasse: Zahlenraum bis 1000, Hauptfigur ist **Mia**, eine Tabby-Katze.
Gemütliche Comic-Welt in 2,5D, kleine Aufträge, Minispiele, Sammeln – **ohne Zeitdruck, ohne Game Over, ohne Stimmen** (alle Texte werden gelesen).

**Hauptziel:** Mia baut sich ein Haus und richtet es liebevoll ein – später zieht ein Haustier ein, das gefüttert werden will.
Dieser Prototyp enthält die Welt mit dem Gebiet „Wald“ (Stellenwerte H/Z/E); Wiese, Fluss, Berg und Dorf liegen hinter Nebeltoren („Bald dabei“).

## Start

```bash
npm install
npm run dev        # Entwicklung, http://localhost:5173 (im Netzwerk erreichbar, z. B. fürs iPad)
npm run build      # Typprüfung + Produktions-Build nach dist/ (inkl. Service Worker, offlinefähig)
npm run preview    # Build lokal ansehen
npm run typecheck  # nur TypeScript prüfen
npm run icons      # PNG-Icons neu erzeugen
```

Technik: Vite + TypeScript, three.js (WebGL), kein UI-Framework (kleiner DOM-Helfer `h()`), Fortschritt in `localStorage`, PWA.

**Aufs iPad bringen:** `dist/` auf HTTPS-Webspace legen, in Safari öffnen, *Teilen → Zum Home-Bildschirm*. Querformat verwenden.

## Steuerung (iPad, Querformat)

- **Joystick** links unten, **Pfoten-Knopf** rechts unten (erscheint nur, wenn etwas in Reichweite ist: ansprechen, öffnen, verstecken, streicheln, einkaufen, bauen, füttern).
- **Tippen** auf die Welt = dorthin laufen (in den Einstellungen abschaltbar). Multi-Touch geht (Joystick und Knopf gleichzeitig).
- Oben: 🏠 Hausfortschritt/Bauplan, 🪙 Münzen, ⭐ Sterne, 🗺️ Weltkarte, 🎩 Album, ⚙️ Einstellungen. Am Rechner: Pfeile/WASD, Leertaste/E.

## Das Spiel

- **Münzen** verdient man **nur mit Mathe-Aufgaben**: 4 🪙 für jede Aufgabe, die gleich beim ersten Versuch stimmt (1 🪙 nach einem Fehler), dazu Bonus für die Sterne einer Runde. Im Wald liegt kein Geld herum.
- **Weg zum Haus:** Liegt das Haus außerhalb des Bildes, zeigt ein Pfeil „🏠 Zuhause · N m“ den Weg. Oben im Menü öffnet 🏠 den Bauplan; dort bringt „Zum Haus gehen“ Mia per Schnellreise vor die Haustür.
- **Supermarkt** (Fuchs Fritz): Gänge mit Regalen, Preisschildern, Einkaufswagen und Kasse. An der Kasse wird die Summe addiert (und als Mini-Stellentafel gezeigt). Gänge: Rohbau, Außen, Garten, Innen, Tierbedarf.
- **Hausbau:** Ein einfacher Rohbau (Fundament, Boden, Wände, Dach, Tür, Fenster), danach geht es um die **Deko**: 64 Teile (Veranda, Schornstein mit Rauch, Wimpel, Zaun mit Lichterkette, Teich, Schaukel, Feuerstelle, Gewächshaus … innen Sofa, Bett, Aquarium, Kamin, Bücherregal …). Gekauftes Material baut Mia am **Bauplatz** auf (Pfote). Dach- und Wandfarbe sind frei wählbar. Meilensteine: Rohbau, bewohnbar, alles gebaut (1–3 ⭐). Im fertigen Haus verschwinden Dach und Vorderwand (Puppenhaus-Ansicht).
- **Haustier** (ab „bewohnbar“): Im Supermarkt (Tierbedarf) aussuchen – Meerschweinchen, Kaninchen, Hamster oder Wellensittich – und benennen. Es läuft im Haus umher oder kommt auf Wunsch mit nach draußen (Pfote am Tier → „Mitnehmen“), wird mit der Zeit hungrig (nach etwa 45 Minuten ganz leer; nur traurig, nie Game Over) und freut sich über Futter aus dem Supermarkt; Lieblingsfutter macht extra satt.
- **Lernspiele** (Wald): Punkte zählen, Steine-Meister, Kärtchen-Duell, Zahlen-Angeln (Nachfolger, Vorgänger, Stellenwerte, größte/kleinste Zahl, „zwischen“), Zahlenpilze, Erklärvideo, Mini-Check. Adaptive Stufen, freundliche Hinweise bei Fehlern.
- **Spielstand:** Der Fortschritt wird automatisch im Browser gespeichert. Unter ⚙️ gibt es zusätzlich eine Sicherung als Code (kopieren) oder Datei, die man wieder laden kann (z. B. nach Gerätewechsel). `mia-haus-stand.txt` ist ein Code, der nur den Haus-Stand „Rohbau, Mias Bett, Bücherregal“ ergänzt.
- **Musik:** leichte Musik, live erzeugt (WebAudio, keine Audiodateien), Lautstärke unter ⚙️. Das **Radio** im Haus (auf dem Bücherregal, Pfote) wechselt den Sender: Fröhlicher Wald (Standard, mit entspanntem Beat), Sonnenschein, Lagerfeuer, Gute Nacht.
- **Schlafen:** Mit Bett im Haus kann Mia sich hinlegen (Pfote am Bett): Nachtansicht, Gute-Nacht-Musik, Aufwachen per Knopf.

## Aufbau

```
content/
  common.json            Sprecher (Namen/Farben), gemeinsame Texte, Album-Items
  world.json             Welt: Größe, Zonenbreite, Weg, Bodenstil je Thema
  house.json             Katalog und Preise aller Haus-Teile, Farben
  pets.json              Haustiere, Futter, Texte
  worlds/<id>.json       je Gebiet: Karte, Texte, world.* (Auftraggeber, Büsche, Sterne, Tiere, Bauplatz), Aufgabenregeln, Videoskript
src/
  world/                 worldScreen (Schleife, Kollision, Interaktion), world (Aufbau aus JSON), terrain
  world3d/               2,5D-Darstellung: scene (feste Parallel-Kamera, Toon-Look), sprites + comic (Comic-Figuren), models, decor,
                         house + houseExtra (Haus-Teile), fx (Partikel)
  stations/              Mathe-Spiele als Module (stations/<welt>/)
  core/                  Karte, Router, Fortschritt, Belohnungen, house, pet, adaptive Schwierigkeit, Texte
  audio/                 music (Ambient + Effekte), speak (Texte lesen, ohne Stimme)
  ui/                    Bühne, HUD, Stellentafel, Supermarkt, Bauplan, Haustier, Album, Einstellungen, Figuren-SVGs
  input/controls.ts      Joystick, Pfoten-Knopf, Tastatur
```

**2,5D:** Die Welt ist 3D (three.js), aber die Kamera ist fest und parallel (Orthographic), der Look ist Comic (Toon-Schattierung). Figuren (Mia, Tiere, Haustiere) sind gezeichnete Comic-Sprites, die senkrecht in der Welt stehen; Mia wird jedes Bild mit Laufzyklus neu gezeichnet (`src/world3d/comic.ts`).

## Erweitern

- **Haus-Teil:** Eintrag in `content/house.json` (Name, Preis, Voraussetzungen) + eine Modellfunktion unter gleicher ID in `src/world3d/house.ts` bzw. `houseExtra.ts`.
- **Haustier / Futter:** `content/pets.json` (+ Zeichnung in `src/ui/art.ts → petSvg`).
- **Gebiet:** `content/worlds/<id>.json` (`meta.status: "open"`, `world.*` Koordinaten relativ zur Zone), Station unter `src/stations/<id>/` registrieren (Vorlage: Wald), `registerWorld` in `src/worlds/<id>/`, Import in `src/main.ts`. Gebiete ohne Station bleiben hinter dem Nebeltor.
- **Auftrag:** Eintrag in `world.npcs` mit `offers`, passender Fall in `src/stations/<welt>/index.ts`.

## Bekannte Grenzen

- Die Zonen Wiese, Fluss, Berg und Dorf sind nur Kulisse hinter dem Nebeltor.
- Nicht auf einem echten iPad gemessen (Bildrate, Touch-Gefühl).
- Die Musik ist generativ und bewusst schlicht; für feinere Musik könnten später Audiodateien ergänzt werden.

## Update: noch breiteres Haus, mehrere Haustiere, Regen & Rucksack
- **Haus** noch breiter (halbe Breite 5,5). Regal, Kamin, Sofa, Uhr, Spiegel usw. hängen an der **Rückwand** und sind von vorn gut zu sehen. Geht Mia hinein, werden die **Seitenwände niedrig** und die Kamera **zoomt sanft heran**.
- **Mehrere Haustiere** (bis 6): im Supermarkt, Gang „Tiere“, immer wieder neue kaufen. Jedes hat eigenen Hunger, eigenen Namen und kann einzeln mitgenommen werden. Im Füttern-Fenster wählt man oben das Tier aus.
- **Regen**: ab und zu regnet es draußen (Wetter-Zyklus in `src/core/weather.ts`). Der **Regenschirm liegt im Rucksack** (🎒 in der oberen Leiste, blinkt bei Regen). Ohne Schirm wird Mia nass und etwas langsamer – kein Game Over. Im überdachten Haus regnet es nicht.
- Spielstand: altes einzelnes `pet` wird automatisch zu `pets[]` migriert.

## Neue Welt: Wiese (Plus & Minus bis 1000)
Eine Zone mit bunten Blumen, 12 Entdeckersternen, Feldmäusen zum Streicheln, Büschen und fünf Stationen. Alle Texte stehen in `content/worlds/wiese.json`.

| Figur | Angebot | Inhalt |
|---|---|---|
| Biene Bella | ▶ Erklärvideo, 🍯 Honig-Plus | Rechenstrich erklärt (Hunderter, Zehner, Einer, Minus rückwärts, Zehner voll machen); Plus-Aufgaben, 5 Stufen |
| Schnecke Schorsch | 🐌 Minus-Wanderung | Minus-Aufgaben, 5 Stufen (von vollen Zehnern bis dreistellig mit Übergang) |
| Schmetterling Fritzi | 🦋 Schmetterlings-Paare | Zahlenpaare zu 100 und zu 1000 (Ergänzen), 4 Stufen |
| Grashüpfer Hannes | 🦗 Zahlenstrahl-Hüpfer | Zahl am Zahlenstrahl finden (Marker setzen) und ablesen, 4 Stufen |
| Blumentruhe | ⭐ Wiesen-Check | 6 gemischte Aufgaben |

- **Rechenstrich** (`src/ui/strich.ts`): zeigt Sprünge als Bögen. Bei Fehlern rechnet er die Aufgabe Schritt für Schritt vor (Hunderter → Zehner → Einer; bei Einern mit Übergang erst zum vollen Zehner).
- Stufen passen sich an (3 richtig in Folge = hoch, 2 Fehler = runter), kein Zeitdruck, Münzen wie im Wald.
- **Zugang**: Wie Mia in die Wiese kommt, ist noch offen. Bis dahin gibt es in den Einstellungen den Schalter „🔧 Test: Wiese freischalten“. Im Code: `src/core/unlock.ts` (`worldUnlocked`, `setWorldUnlocked`) – dort später die echte Bedingung eintragen.

## Feinschliff in dieser Version
Weichere Knöpfe und Hover, Münz-/Sterne-Anzeige „hüpft“ bei Änderung, Ziffernfeld-Feedback, leuchtender Aktionsknopf, Haustier „mampft“ beim Füttern, Bienen/Schmetterlinge schweben, Grashüpfer hüpft, NPCs schauen zu Mia, Spielstand-Import übernimmt alte Einzel-Haustiere, Konsolenwarnungen von three.js beseitigt, `prefers-reduced-motion` wird beachtet.

## Neu: Fluss (Einmaleins), Autohaus, Mias Hunger, Möbel
- **Fluss** (Thema „Malnehmen & Teilen“, `content/worlds/fluss.json`): Biber Bruno (Erklärung + Baumstamm-Mal mit Punktefeld und Rechenstrich), Frosch Fred (Seerosen-Reihen), Ente Emma (Fische teilen), Otter Otto (Mal-Paare mit Tauschaufgaben), Flusstruhe (Check), Küken zum Streicheln. Freischalten wie die Wiese über die Test-Schalter in den Einstellungen (der Fluss öffnet auch die Wiese).
- **Autohaus** bei Waschbär Rocky (Wald, hinter dem Supermarkt): nur noch drei Fahrzeuge – **Fahrrad** (40 🪙, Tempo ×1,35), **E-Roller** (120 🪙, ×1,8) und **E-Auto als Cabrio** (300 🪙, ×2,5). Kauf mit Rechnung „Münzen − Preis = Rest“. Garage-Knopf in der oberen Leiste.
- **Akku**: E-Roller und E-Auto entladen sich beim Fahren (Anzeige neben dem Hunger-Balken, Warnung bei 25 %). Ist er leer, geht es nur noch im Schneckentempo (kein Game Over). **Ladestationen** (Solardach, Kabel, Parkfeld) stehen drei je Zone am Weg und eine am Bauplatz: hinfahren, „Aufladen“ tippen, ca. 5 Sekunden warten (Balken, Funken, Blinklicht).
- **Mia im Fahrzeug**: im E-Auto sieht man nur Kopf und Schultern über der Karosserie, auf dem Roller steht sie mit flatterndem Halstuch und Ohren im Fahrtwind, auf dem Fahrrad tritt sie in die Pedale (Kurbel dreht sich). Vorderräder schlagen in Kurven ein, die Karosserie neigt sich, nickt beim Beschleunigen und rüttelt leicht; E-Fahrzeuge sprühen Funken statt Abgase. Im Haus geht Mia zu Fuß.
- **Mias Hunger**: Sättigung sinkt langsam (HUD-Balken). Essen im Supermarkt (Gang „Essen“), im Rucksack antippen zum Essen. Hungrig = etwas langsamer, kein Game Over.
- **Möbel**: Mia läuft jetzt nicht mehr durch Möbel (wie die Haustiere).

## Mia-Grafiken (gezeichnete Bilder statt Canvas-Figur)
- Originale: `assets/mia-source/` (unverändert). Aufbereitung: `python tools/mia_assets.py` (braucht Pillow, numpy, scipy) → `assets/mia/` (frames/, portraits/, atlas.png + atlas.json, report.json). Weiß wird per Flood-Fill + weicher Kante entfernt, alle Frames haben denselben Maßstab, Schwerpunkt mittig und gemeinsame Bodenlinie (Sprungbild behält seine Höhe).
- Im Spiel: `src/world3d/miaAnim.ts` (Zustandsautomat: rechts/links = walk_right (gespiegelt), unten/oben = walk_down/walk_up (6 Bilder je Richtung), Stehen = idle mit Blinzeln, Feiern = celebrate, Schlafen, E-Auto = nur Kopf). Laufgeschwindigkeit hängt am Tempo, Übergänge werden 0,14 s übergeblendet. Menüs (Aufgaben-Ansicht, Karte, Start) nutzen `src/ui/miaView.ts` inkl. Porträt-Sprechblase.
- Testseite (nur Entwicklung): `npm run dev` und `http://localhost:5173/mia-test.html`.

## Abzeichen, Abzeichenbuch und Mathearbeit (Welten freischalten)
- **Abzeichen** (`content/badges.json`, Logik `src/core/badges.ts`, Anzeige `src/ui/badges.ts`): Jedes Spiel einer Welt hat ein eigenes Abzeichen (Form, Farbe, Symbol). Es gehört Mia, wenn sie das Spiel **zweimal ohne Fehler** geschafft hat (alle Aufgaben beim ersten Versuch; beim Steine-Meister: 5 neue Zahlen in Folge ohne Wiederholung). Nach jedem Spiel steht im Ergebnisfenster der Stand („1 von 2“); beim Erwerb gibt es eine Feier.
- **Abzeichenbuch**: Knopf „🏅 n/N“ in der oberen Leiste. Eine Seite je Welt, graue Platzhalter mit Fortschritt, dazu das goldene Meister-Abzeichen der Welt (Waldmeister, Wiesenkönig, Flusskapitän).
- **Eule Olga am Nebeltor** (am Ende jeder Welt): Fehlen Abzeichen, zählt sie auf, welche. Sind alle da, startet sie die **Mathearbeit**: 5 Aufgaben, **eine aus jedem Spiel** der Welt (`src/stations/exam.ts`), **mindestens 4 Punkte** (Punkt = beim ersten Versuch richtig), also ein Fehler ist erlaubt. Bei zu wenig gibt es Zuspruch und beliebig viele neue Versuche. Bestanden = Meister-Abzeichen, Sterne, Münzen, die **nächste Welt ist frei** und der Nebel löst sich sichtbar auf.
- Die Test-Schalter in den Einstellungen („Wiese/Fluss freischalten“) gibt es weiter. Entwicklung: `window.__examAuto = 4` im Browser lässt die ersten 4 Prüfungsaufgaben als richtig zählen.
- **Autohaus und Fahrzeuge** gibt es erst ab der Wiese (Waschbär Rocky), Ladestationen ab der Wiese (und eine am Bauplatz).

## Vollbild
Das Fenster wird ganz ausgefüllt: Die 3D-Welt nutzt die komplette Fläche (breiter Bildschirm = mehr Welt zu sehen), Menüs, Karte und Aufgaben-Bildschirme bleiben 1180×820 und stehen mittig (`src/ui/stage.ts`, Klasse `.framed`). Auf dem iPad im Querformat bleibt alles wie vorher; für Vollbild am PC F11 drücken.
