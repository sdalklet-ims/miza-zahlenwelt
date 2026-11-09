# Mia und die Zahlenwelt

Mathe-Lern-App (Prototyp) für ein Kind der 3. Klasse: Zahlenraum bis 1000, Hauptfigur ist **Mia**, eine Tabby-Katze.
Gemütliche Cartoon-Welt, kleine Aufträge, Minispiele, Sammeln – **ohne Zeitdruck, ohne Game Over**.

Dieser Prototyp enthält die Weltkarte und **Welt 1 „Wald“ (Stellenwerte H/Z/E)**. Welten 2–5 sind auf der Karte sichtbar, aber gesperrt (Nebel/Schloss).

## Start

```bash
npm install
npm run dev        # Entwicklung, http://localhost:5173 (im Netzwerk erreichbar, z. B. fürs iPad)
npm run build      # Typprüfung + Produktions-Build nach dist/ (inkl. Service Worker)
npm run preview    # Build lokal ansehen
npm run typecheck  # nur TypeScript prüfen
npm run icons      # PNG-Icons neu erzeugen (tools/make-icons.mjs)
```

Technik: Vite + TypeScript, ohne UI-Framework (kleiner DOM-Helfer `h()`), Grafik als SVG im Code, Fortschritt in `localStorage`.

### Aufs iPad bringen (PWA)

1. `dist/` auf einen HTTPS-Webspace legen (Service Worker und „Zum Home-Bildschirm“ brauchen HTTPS; `localhost` geht auch).
2. In Safari öffnen → **Teilen → Zum Home-Bildschirm**. Danach startet die App im Vollbild ohne Browserleiste und funktioniert offline
   (der Service Worker legt beim ersten Laden alle Dateien ab).
3. Querformat verwenden. Im Hochformat erscheint die Bitte, das iPad zu drehen.

### Bessere Stimmen am iPad

Die App nutzt die Systemstimme (Web Speech API). Für deutlich schönere Stimmen:
**Einstellungen › Bedienungshilfen › Gesprochene Inhalte › Stimmen › Deutsch** und dort eine **Premium-/Erweitert-Stimme** laden.
In der App (⚙️ oben rechts) kann man Stimme, Sprechtempo und Hörprobe einstellen; ohne Auswahl wird automatisch die beste verfügbare deutsche Stimme genommen.
Die Eule klingt etwas tiefer, Mia heller (Tonhöhe pro Figur aus `content/common.json`, soweit das System es erlaubt).

> iPad-Safari erlaubt Sprache und Ton erst nach einer Berührung – deshalb gibt es den Startbildschirm „Tippe zum Starten“.

## Steuerung (iPad, Querformat)

- **Joystick** links unten: Mia läuft in Zeigerichtung, Tempo nach Auslenkung, sanftes Anfahren und Abbremsen.
- **Pfoten-Knopf** rechts unten: erscheint nur, wenn etwas in Reichweite ist (💬 Ansprechen, 🗝️ Öffnen, 🌿 Verstecken, 🐿️ Streicheln, 🌫️ Nebeltor).
- **Verstecken:** Am Busch den Pfoten-Knopf drücken; Mia ist versteckt (nur die Augen gucken heraus). Joystick bewegen = wieder herauskommen.
- **Tippen** auf die Welt = dorthin laufen (in den Einstellungen abschaltbar). Joystick und Knopf funktionieren gleichzeitig (Multi-Touch).
- Oben rechts: ⭐ Sterne, 🗺️ Weltkarte (Schnellreise), 🎩 Album, ⚙️ Einstellungen.
- Am Rechner: Pfeile/WASD, Leertaste/E = Pfote.

**Hauptziel: Mias Haus bauen.** Münzen (🪙) liegen überall im Wald und gibt es für jedes Spiel und jeden Stern. Bei **Fuchs Fritz** (Baumarkt) kauft man Baumaterial, am **Bauplatz** (Pfote bei der Wiese südwestlich vom Start) baut Mia es auf. Das Haus hat **47 Teile** in vier Gruppen: Rohbau (Fundament, Gerüst, Boden, vier Wände, Dachstuhl, Dach, Tür, Fenster), Außen (Schornstein mit Rauch, Veranda, Dachrinne, Blumenkästen, Namensschild, Wimpelkette, Wetterhahn, Fahne …), Garten (Zaun, Tor, Steinweg, Laternen, Beete, Bank, Apfelbaum, Vogelhaus, Brunnen, Schaukel, Kratzbaum, Teich …) und Innen (Katzenkorb, Teppich, Tisch, Sofa, Regal, Lampe, Bilder, Kamin, Vorhänge …). Teile bauen aufeinander auf (ohne Fundament kein Gerüst, ohne Wände kein Dach). Dach- und Wandfarbe sind frei wählbar. Meilensteine: Rohbau (1 ⭐), bewohnbar (2 ⭐, Einzugsparty), alles gebaut (3 ⭐). Läuft Mia ins fertige Haus, verschwinden Dach und Vorderwand (Puppenhaus-Ansicht). Die Preise werden als Mini-Stellentafel gezeigt.

Katalog und Preise: `content/house.json`; 3D-Modell je Teil: `src/world3d/house.ts`; Logik: `src/core/house.ts`; Oberfläche: `src/ui/houseUi.ts`. Ein neues Teil = Eintrag in der JSON + eine Modellfunktion in `house.ts`.

**Minispiele für Sterne und Münzen** (ohne Zeitdruck, beliebig oft spielbar): **Memory** am Memory-Brett (Zahl ↔ Punkte in der Stellentafel) und **Zahlenpilze** im Pilzring (Zahlen auf- oder absteigend ordnen). Sie liegen in `src/stations/wald/minigames.ts`.

Sterne gibt es auch fürs Entdecken (8 versteckte im Wald): 4 versteckte Sterne im Wald und das Eichhörnchen-Kraulen (langsam herangehen); jeder Stern bringt auch 5 Münzen.

## Aufbau

```
content/
  common.json            Sprecher (Name/Tonhöhe/Tempo), gemeinsame Texte, Belohnungs-Items
  world.json             Welt: Höhe, Zonenbreite, Wegverlauf, Farben/Bodenstil je Thema
  worlds/<id>.json       je Gebiet: Kartenposition, Texte (stabile IDs), world.* (Startpunkt, Auftraggeber,
                         Büsche, Sterne, Tiere), Aufgabenregeln, Videoskript
src/
  world/                 worldScreen (Schleife, Kollision, Interaktion), world (Aufbau aus JSON),
  world3d/               3D-Darstellung: scene, models, decor, fx
                         terrain (Boden-Kacheln-Maler, Höhenfunktion)
  input/controls.ts      Joystick, Pfoten- und Schleichen-Knopf, Tastatur
  stations/              Mathe-Spiele als Module (stations/<welt>/: games, tasks, generators, video) + Register
  core/                  Karte, Router, Fortschritt, Belohnungen, adaptive Schwierigkeit, Textzugriff
  audio/speak.ts         speak(textId): erst /audio/<textId>.mp3, sonst Systemstimme
  ui/                    Bühne (1180×820, skaliert), HUD, Stellentafel, Drag & Drop, Figuren-SVGs, Album, Einstellungen
  worlds/                Register der Gebiete (enter())
```

**Engine:** three.js (WebGL). Die Spiellogik (Bewegung, Kollisionen, Interaktionen) läuft weiter in der Fläche in `src/world/`, dargestellt wird in 3D in `src/world3d/`: Low-Poly-Figuren aus Grundformen mit Laufanimation (`models.ts`), Boden-Kacheln mit sanften Hügeln, instanziertes Gras/Bäume mit Wind (`decor.ts`), Himmel, Wolken, Sonne mit weichen Schatten, Fluss und Brücke (`scene.ts`), Partikel (`fx.ts`). Verfolgerkamera schräg von oben. Mia bleibt hinter Bäumen als leuchtende Silhouette sichtbar. Die Spiel-Bildschirme (Stellentafel usw.) bleiben DOM.

## Wie es funktioniert

- **Aufgaben werden erzeugt**, nicht hartcodiert: `src/worlds/wald/generators.ts` liest die Regeln je Stufe aus `wald.json` (`games.*.levels`).
  Stolpersteine (Zahlendreher 237/273, ähnliche Paare 898/989, Nullen in der Mitte 101/105, unterschiedliche Stellenzahl 62/26, Zehner-/Hunderterübergänge)
  kommen ab höheren Stufen häufiger vor – und noch häufiger, wenn das Kind genau dort Fehler macht (`weak`-Zähler im Fortschritt).
- **Adaptiv** (`src/core/adaptive.ts`): 3 richtige in Folge → Stufe hoch; 2 Fehler in Folge → Stufe runter und Tipp anbieten.
- **Fehler** zeigen immer das Prinzip: Die Spalten der Stellentafel werden nacheinander hervorgehoben, ein passender Hinweis wird gesprochen (Zahlendreher, fehlende Null, …), dann gibt es einen neuen Versuch. Nach 3 Versuchen wird die Lösung gezeigt.
- **Sterne:** je Spiel 1–3 (Runde: Treffer beim ersten Versuch; Steine-Meister: 7/14/21 gefunden; Mini-Check: 6 Aufgaben).
  Mit gesammelten Sternen werden Album-Teile freigeschaltet (1, 2, 4, 6, 9, 12 ⭐).
- **Fortschritt** liegt in `localStorage` (`mia.progress.v1`), Reset unter ⚙️ → „Fortschritt löschen“.

### Sprache austauschbar (MP3 später)

Jeder sprechbare Text hat eine stabile ID in den JSONs (z. B. `wald.video.03`). `speak(textId)` prüft zuerst, ob `public/audio/<textId>.mp3` existiert, und nutzt sonst die Systemstimme.
MP3s können also später einfach in `public/audio/` gelegt werden, ohne Code zu ändern. (Texte mit Platzhaltern wie `{n}` bleiben bei der Systemstimme.)

## Neues Gebiet / neuen Auftrag hinzufügen

**Gebiet (z. B. „Wiese“):**
1. `content/worlds/wiese.json` ausfüllen und `meta.status` auf `"open"` setzen. Das Gebiet ist automatisch eine Zone der Welt (Reihenfolge = `meta.order`); das Nebeltor davor verschwindet.
   - `world.spawn`, `world.npcs` (Auftraggeber mit `offers`), `world.bushes`, `world.stars`, `world.critters`: Koordinaten **relativ zur Zone** (Zone = 2200 × 2600, siehe `content/world.json`).
   - Look: `meta.theme` (`forest|meadow|river|mountain|village`), Farben in `content/world.json`.
   - `texts`: sprechbare Texte als `"<welt>.<name>": ["<sprecher>", "Text"]`.
2. **Station:** `src/stations/wiese/` anlegen (Vorlage `src/stations/wald/`) und `registerStations('wiese', start)` aufrufen; `start(offer, npc, back)` zeigt den Spielbildschirm per `show(...)` und ruft am Ende `back()`.
3. `src/worlds/wiese/index.ts` mit `registerWorld('wiese', { enter })` (wie beim Wald) und `import './worlds/wiese';` in `src/main.ts`.

**Auftrag in einem bestehenden Gebiet:** Eintrag in `world.npcs` (neue Figur: Zeichnung in `src/ui/art.ts` ergänzen) mit `offers`, passend zu einem Fall in `src/stations/<welt>/index.ts`.

Gebiete ohne Station oder mit `status: "locked"` bleiben hinter dem Nebeltor („Bald dabei“).

## Bekannte Grenzen des Prototyps

- Die Zonen Wiese, Fluss, Berg und Dorf sind nur Kulisse hinter dem Nebeltor (nicht betretbar, solange sie gesperrt sind).
- Im Mini-Check sprechen die Hinweise noch mit der Stimme der jeweiligen Spiel-Figur (Igel/Hase), obwohl die Eule fragt.
- Kein Login, kein Backend, kein Shop, kein TTS-Anbieter.
