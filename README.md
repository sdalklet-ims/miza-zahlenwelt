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

## Aufbau

```
content/
  common.json            Sprecher (Name/Tonhöhe/Tempo), gemeinsame Texte, Belohnungs-Items
  worlds/<id>.json       je Welt: Kartenposition, Texte (stabile IDs), Figuren, Aufgabenregeln, Videoskript
src/
  core/                  Karte, Router, Fortschritt, Belohnungen, adaptive Schwierigkeit, Textzugriff
  audio/speak.ts         speak(textId): erst /audio/<textId>.mp3, sonst Systemstimme
  ui/                    Bühne (1180×820, skaliert), HUD, Stellentafel, Drag & Drop, Figuren-SVGs, Album, Einstellungen
  worlds/index.ts        Register der Welten
  worlds/wald/           Gebiet, Spiele, Aufgaben-Bausteine, Generatoren, Erklärvideo
public/                  Manifest, Icons, (später) audio/<textId>.mp3
tools/                   Service-Worker-Vorlage, Icon-Generator
```

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

## Neue Welt hinzufügen (z. B. „Wiese“)

1. **Inhalt:** `content/worlds/wiese.json` ausfüllen (die Stub-Dateien für Wiese, Fluss, Berg, Dorf gibt es schon):
   - `meta`: Titel, Thema, `order`, `icon`, `theme` (`forest|meadow|river|mountain|village`), `color`, `map` (Position auf der Karte), `status` auf `"open"` setzen.
   - `texts`: alle sprechbaren Texte als `"<welt>.<name>": ["<sprecher>", "Text"]` (Sprecher aus `common.json → speakers`; neue Figuren dort ergänzen).
   - weitere Daten nach Muster des Waldes: `npcs`, `games.*.levels`, `video.steps`, `check`.
2. **Modul:** Ordner `src/worlds/wiese/` anlegen. Vorlage ist `src/worlds/wald/`:
   - `area.ts` (begehbare Fläche, Auftraggeber) – bei Bedarf wiederverwenden/anpassen,
   - `tasks.ts`/`games.ts` für neue Aufgabentypen; Spiele nutzen `createShell`, `createBoard`, `runCount`-artige Bausteine und `Adaptive`,
   - `index.ts` mit `registerWorld('wiese', { enter })`.
3. **Registrieren:** in `src/main.ts` die Zeile `import './worlds/wiese';` ergänzen.
4. Fertig: Die Karte liest die Station aus der JSON, öffnet sie und zeigt Sterne (`stars["wiese.<spiel>"]`). Neue Album-Items kommen in `common.json → rewards.items` (Grafik in `src/ui/art.ts`).

Eine Welt ohne Modul (oder mit `status: "locked"`) bleibt automatisch im Nebel.

## Bekannte Grenzen des Prototyps

- Mia läuft im Wald in alle Richtungen mit derselben Frontansicht (nur gespiegelt).
- Im Mini-Check sprechen die Hinweise noch mit der Stimme der jeweiligen Spiel-Figur (Igel/Hase), obwohl die Eule fragt.
- Kein Login, kein Backend, kein Shop, kein TTS-Anbieter.
