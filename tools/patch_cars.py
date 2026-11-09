# Einmaliges Hilfsskript: Autohaus und Fahrzeuge einbinden (Daten, Fortschritt, Texte, Waschbär Rocky im Wald)
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:60])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


vehicles = [
    {"id": "roller", "name": "Tretroller", "icon": "🛴", "price": 30, "speed": 1.25, "blurb": "Flink und wendig – der Einstieg."},
    {"id": "fahrrad", "name": "Fahrrad", "icon": "🚲", "price": 60, "speed": 1.5, "blurb": "Klingeling! Viel schneller als zu Fuß."},
    {"id": "gokart", "name": "Go-Kart", "icon": "🏎️", "price": 110, "speed": 1.8, "blurb": "Tief, laut und gelb. Driften erlaubt!"},
    {"id": "cabrio", "name": "Cabrio", "icon": "🚗", "price": 180, "speed": 2.1, "blurb": "Fahrtwind im Fell. Mit Hupe!"},
    {"id": "rennauto", "name": "Rennauto", "icon": "🏁", "price": 280, "speed": 2.6, "canopy": True, "blurb": "Mit Dach, Spoiler und Streifen."},
    {"id": "rakete", "name": "Raketenwagen", "icon": "🚀", "price": 450, "speed": 3.2, "canopy": True, "blurb": "Das schnellste Gefährt der ganzen Welt!"},
]
texts = {
    "wald.rocky.hello": ["rocky", "Brumm, brumm! Ich bin Rocky. In meinem Autohaus gibt es Fahrzeuge für jeden Geldbeutel. Die Welt ist groß, da lohnt sich Tempo!"],
    "car.buy": ["mia", "Der {name} gehört jetzt mir! Auf geht's!"],
    "car.poor": ["mia", "Dafür fehlen mir noch ein paar Münzen. Ich sammle weiter bei den Aufgaben."],
    "car.ride.on": ["mia", "Los geht's mit dem {name}! Brumm, brumm!"],
    "car.ride.off": ["mia", "Ich gehe wieder zu Fuß."],
    "car.house": ["mia", "Im Haus laufe ich lieber zu Fuß."],
    "car.rocky.visit": ["rocky", "Schau dich in Ruhe um. Probefahren ist inklusive, sobald du dein Fahrzeug gekauft hast!"],
}
json.dump({"vehicles": vehicles, "texts": texts}, open('content/vehicles.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

c = json.load(open('content/common.json', encoding='utf-8'))
c['speakers']['rocky'] = {"name": "Waschbär Rocky", "pitch": 0.85, "rate": 1.1, "color": "#7a7f8c"}
json.dump(c, open('content/common.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

w = json.load(open('content/worlds/wald.json', encoding='utf-8'))
w['world']['npcs'].append({"id": "rocky", "kind": "raccoon", "name": "Waschbär Rocky", "x": 2650, "y": 2000, "hello": "wald.rocky.hello", "offers": ["autos"]})
json.dump(w, open('content/worlds/wald.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

ed('src/core/texts.ts', [("export interface MealDef", "export interface VehicleDef { id: string; name: string; icon: string; price: number; speed: number; blurb: string; canopy?: boolean }\nexport const vehicleCfg = files['/content/vehicles.json'] as { vehicles: VehicleDef[] };\n\nexport interface MealDef")])
ed('src/core/progress.ts', [
    ("  meals: Record<string, number>;", "  meals: Record<string, number>;\n  /** Gekaufte Fahrzeuge und das gerade benutzte (null = zu Fuß) */\n  vehicles: Record<string, boolean>;\n  ride: string | null;"),
    ("  meals: { apfel: 2 },", "  meals: { apfel: 2 },\n  vehicles: {},\n  ride: null,")])
ed('src/stations/index.ts', [("| 'malpaare';", "| 'malpaare' | 'autos';")])
ed('src/audio/music.ts', [("  click: () => tone(1200, 0.05, 'square', 0.04),", "  click: () => tone(1200, 0.05, 'square', 0.04),\n  honk: () => { tone(330, 0.16, 'sawtooth', 0.09); tone(415, 0.16, 'sawtooth', 0.08, 0.02); tone(330, 0.22, 'sawtooth', 0.09, 0.22); tone(415, 0.22, 'sawtooth', 0.08, 0.24); },\n  vroom: () => { tone(70, 0.5, 'sawtooth', 0.07, 0, 260); tone(140, 0.5, 'square', 0.03, 0.02, 520); },")])
ed('src/ui/art.ts', [("import { beaverSvg,", "import { raccoonSvg } from './artFluss';\nimport { beaverSvg,"), ("    case 'beaver': return beaverSvg();", "    case 'raccoon': return raccoonSvg();\n    case 'beaver': return beaverSvg();")])
print('ok')
