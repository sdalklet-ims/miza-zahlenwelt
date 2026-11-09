# Einmaliges Hilfsskript: README auf Hausbau umstellen.
p = 'README.md'
s = open(p, encoding='utf-8').read()
a = s.index('**Münzen und Laden:**')
b = s.index('**Minispiele für Sterne und Münzen**')
haus = """**Hauptziel: Mias Haus bauen.** Münzen (🪙) liegen überall im Wald und gibt es für jedes Spiel und jeden Stern. Bei **Fuchs Fritz** (Baumarkt) kauft man Baumaterial, am **Bauplatz** (Pfote bei der Wiese südwestlich vom Start) baut Mia es auf. Das Haus hat **47 Teile** in vier Gruppen: Rohbau (Fundament, Gerüst, Boden, vier Wände, Dachstuhl, Dach, Tür, Fenster), Außen (Schornstein mit Rauch, Veranda, Dachrinne, Blumenkästen, Namensschild, Wimpelkette, Wetterhahn, Fahne …), Garten (Zaun, Tor, Steinweg, Laternen, Beete, Bank, Apfelbaum, Vogelhaus, Brunnen, Schaukel, Kratzbaum, Teich …) und Innen (Katzenkorb, Teppich, Tisch, Sofa, Regal, Lampe, Bilder, Kamin, Vorhänge …). Teile bauen aufeinander auf (ohne Fundament kein Gerüst, ohne Wände kein Dach). Dach- und Wandfarbe sind frei wählbar. Meilensteine: Rohbau (1 ⭐), bewohnbar (2 ⭐, Einzugsparty), alles gebaut (3 ⭐). Läuft Mia ins fertige Haus, verschwinden Dach und Vorderwand (Puppenhaus-Ansicht). Die Preise werden als Mini-Stellentafel gezeigt.

Katalog und Preise: `content/house.json`; 3D-Modell je Teil: `src/world3d/house.ts`; Logik: `src/core/house.ts`; Oberfläche: `src/ui/houseUi.ts`. Ein neues Teil = Eintrag in der JSON + eine Modellfunktion in `house.ts`.

"""
s = s[:a] + haus + s[b:]
s = s.replace('Eichhörnchen-Kraulen (langsam herangehen)', 'Eichhörnchen-Kraulen (langsam herangehen); jeder Stern bringt auch 5 Münzen')
open(p, 'w', encoding='utf-8').write(s)
print('ok')
