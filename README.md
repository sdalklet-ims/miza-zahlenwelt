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
- **Haustier** (ab „bewohnbar“): Im Supermarkt (Tierbedarf) aussuchen – Meerschweinchen, Kaninchen, Hamster oder Wellensittich – und benennen. Es läuft im Haus umher, wird mit der Zeit hungrig (nur traurig, nie Game Over) und freut sich über Futter aus dem Supermarkt; Lieblingsfutter macht extra satt.
- **Lernspiele** (Wald): Punkte zählen, Steine-Meister, Kärtchen-Duell, Zahlen-Angeln (Nachfolger, Vorgänger, Stellenwerte, größte/kleinste Zahl, „zwischen“), Zahlenpilze, Erklärvideo, Mini-Check. Adaptive Stufen, freundliche Hinweise bei Fehlern.
- **Musik:** leichte Ambient-Musik, live erzeugt (WebAudio, keine Audiodateien), einstellbar unter ⚙️.

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
