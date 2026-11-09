# Einmaliges Hilfsskript: Welt "Fluss" (Einmaleins) einbinden
import json, math, random

random.seed(11)
X0 = 6400
path = lambda lx: 1500 + math.sin((X0 + lx) / 430) * 260
npcs = []


def npc(id, kind, name, lx, off, offers):
    npcs.append({"id": id, "kind": kind, "name": name, "x": lx, "y": round(path(lx) + off), "hello": f"fluss.{id}.hello", "offers": offers})


npc("bruno", "beaver", "Biber Bruno", 650, -210, ["video", "mal"])
npc("fred", "frog", "Frosch Fred", 1250, 230, ["reihe"])
npc("emma", "duck", "Ente Emma", 2050, -230, ["teilen"])
npc("otto", "otter", "Otter Otto", 2550, 210, ["malpaare"])
npc("truhe", "chest", "Flusstruhe", 2950, 40, ["check"])
spawn = {"x": 330, "y": round(path(330)) + 40}
placed = [(n["x"], n["y"]) for n in npcs] + [(spawn["x"], spawn["y"])]
RIVER = (1600 - 130, 1600 + 130)


def spot(minpath=170, gap=170):
    for _ in range(600):
        x = random.randint(140, 3040)
        y = random.randint(160, 2840)
        if abs(y - path(x)) < minpath or RIVER[0] < x < RIVER[1]:
            continue
        if any(math.hypot(x - px, y - py) < gap for px, py in placed):
            continue
        placed.append((x, y))
        return {"x": x, "y": y}


bushes = [spot(150, 200) for _ in range(12)]
stars = [dict(id=f"s{i+1}", **spot(180, 260)) for i in range(12)]
critters = [dict(kind="chick", **spot(160, 240)) for _ in range(6)]
T = {}


def t(id, sp, txt):
    T[id] = [sp, txt]


t("fluss.arrive", "mia", "Ein glitzernder Fluss! Hier plätschert und quakt es.")
t("fluss.bruno.hello", "bruno", "Hallo! Ich bin Biber Bruno. Ich staple Baumstämme in Reihen. Soll ich dir zeigen, wie das Malnehmen funktioniert?")
t("fluss.fred.hello", "fred", "Quak! Ich bin Fred. Ich hüpfe von Seerosen zu Seerosen, immer im gleichen Abstand. Hüpfst du mit?")
t("fluss.emma.hello", "emma", "Schnatter! Ich bin Emma. Meine Fische müssen gerecht verteilt werden. Dabei brauche ich deine Hilfe!")
t("fluss.otto.hello", "otto", "Hi! Ich bin Otto. Ich sammle Kieselsteine mit Mal-Aufgaben und Ergebnissen. Welche gehören zusammen?")
t("fluss.truhe.hello", "mia", "Eine Truhe am Ufer! Darin liegt der Fluss-Check mit sechs Mal- und Teilaufgaben.")
t("fluss.critter.pet", "mia", "Ein flauschiges Küken! Piep, piep. Es freut sich über das Streicheln.")
t("fluss.critter.again", "mia", "Das Küken kuschelt sich an meine Hand.")
t("fluss.star.found", "mia", "Ein Entdeckerstern am Ufer! Glitzer, glitzer!")
V = ["Malnehmen heißt: gleich große Gruppen zusammenzählen. So sparen wir uns das lange Plus-Rechnen.",
     "Hier liegen drei Reihen mit je vier Baumstämmen. Das ist drei mal vier. Wir schreiben: 3 mal 4.",
     "Auf dem Rechenstrich gehe ich dreimal vier weiter: 4, 8, 12. Also ist 3 mal 4 gleich 12.",
     "Jetzt drehe ich das Bild um: vier Reihen mit je drei Stämmen. Das ist 4 mal 3.",
     "Auch hier kommt 12 heraus! Man darf die Zahlen beim Malnehmen tauschen. Das nennt man Tauschaufgabe.",
     "Teilen ist die Umkehrung. Zwölf Stämme sollen in Gruppen zu je vier. Wie viele Gruppen sind das?",
     "Wie oft passt die 4 in die 12? Ich hüpfe in Viererschritten: 4, 8, 12. Das sind drei Sprünge. Also 12 geteilt durch 4 ergibt 3.",
     "Ein Trick: Wenn du 3 mal 4 kennst, ist 6 mal 4 genau das Doppelte, also 24. Verdoppeln hilft bei schweren Reihen!",
     "Jetzt kennst du meine Tricks. Probier sie bei mir, bei Fred, bei Emma und bei Otto aus!"]
for i, v in enumerate(V, 1):
    t(f"fluss.video.{i:02d}", "bruno", v)
t("fluss.video.done", "bruno", "Prima! Malnehmen und Teilen sind jetzt deine Werkzeuge.")
t("fluss.mal.prompt", "mia", "Wie viel ist {a} mal {b}? Tipp: Das sind {a} Gruppen mit je {b}.")
t("fluss.geteilt.prompt", "mia", "Wie viel ist {a} geteilt durch {b}? Tipp: Wie oft passt die {b} in die {a}?")
t("fluss.mal.hint", "mia", "{a} mal {b}: Wir gehen {a} Mal in {b}er-Schritten weiter. Das sind {list}.")
t("fluss.geteilt.hint", "mia", "Wie oft passt die {b} in die {n}? Wir hüpfen in {b}er-Schritten: {list}. Das sind {k} Sprünge.")
t("fluss.mal.hint.plus", "mia", "Achtung, hier wird nicht plus gerechnet. Malnehmen heißt: gleich große Gruppen.")
t("fluss.geteilt.hint.mal", "mia", "Fast! Beim Teilen wird die Zahl kleiner. Wie oft passt die kleine Zahl hinein?")
t("fluss.mal.reveal", "mia", "{a} mal {b} ergibt {r}. Das merken wir uns.")
t("fluss.geteilt.reveal", "mia", "{a} geteilt durch {b} ergibt {r}.")
t("fluss.reihe.prompt", "fred", "Wir hüpfen in der {t}er-Reihe! Tippe alle Seerosen, deren Zahl in die {t}er-Reihe gehört.")
t("fluss.reihe.hint", "fred", "Die {t}er-Reihe geht so: {list} und immer weiter. Suche diese Zahlen.")
t("fluss.reihe.oops", "fred", "Die {n} gehört nicht in die {t}er-Reihe. Zähle die Reihe in {t}er-Schritten.")
t("fluss.paare.prompt", "otto", "Welche Kiesel gehören zusammen? Aufgabe und Ergebnis, oder zwei gleiche Aufgaben mit getauschten Zahlen. Tippe zwei an.")
t("fluss.paare.hint", "otto", "Rechne die Aufgabe im Kopf aus und suche den Kiesel mit dem Ergebnis. Bei einer Tauschaufgabe sind die Zahlen vertauscht.")
t("fluss.check.intro", "bruno", "Der Fluss-Check! Sechs Aufgaben, ganz ohne Zeitdruck. Du schaffst das.")
for i, txt in ((3, "Fantastisch! Fast alles auf Anhieb richtig. Du bist ein Einmaleins-Meister!"), (2, "Prima, das war schon richtig gut. Mit etwas Übung wirst du noch sicherer."), (1, "Geschafft! Übe ruhig noch bei meinen Freunden, dann klappt es immer besser.")):
    t(f"fluss.check.done.{i}", "bruno", txt)
d = {"id": "fluss", "meta": {"title": "Fluss", "topic": "Malnehmen & Teilen", "order": 3, "icon": "🌊", "theme": "river", "color": "#4a90d9", "map": {"x": 640, "y": 600}, "status": "open"},
     "world": {"spawn": spawn, "npcs": npcs, "bushes": bushes, "stars": stars, "critters": critters}, "texts": T}
json.dump(d, open('content/worlds/fluss.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

c = json.load(open('content/common.json', encoding='utf-8'))
c['speakers'].update({
    "bruno": {"name": "Biber Bruno", "pitch": 0.75, "rate": 0.95, "color": "#a8703a"},
    "fred": {"name": "Frosch Fred", "pitch": 1.0, "rate": 1.15, "color": "#4aa83a"},
    "emma": {"name": "Ente Emma", "pitch": 1.45, "rate": 1.05, "color": "#e9b410"},
    "otto": {"name": "Otter Otto", "pitch": 0.9, "rate": 1.1, "color": "#8a5a3a"}})
json.dump(c, open('content/common.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:60])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/stations/index.ts', [("| 'plus' | 'minus' | 'partner' | 'strahl';", "| 'plus' | 'minus' | 'partner' | 'strahl' | 'mal' | 'teilen' | 'reihe' | 'malpaare';")])
ed('src/main.ts', [("import './worlds/wiese';", "import './worlds/fluss'; // registriert die Welt \"fluss\"\nimport './worlds/wiese';")])
ed('src/ui/art.ts', [("import { beeSvg, snailSvg, butterflySvg, grasshopperSvg } from './artWiese';", "import { beeSvg, snailSvg, butterflySvg, grasshopperSvg } from './artWiese';\nimport { beaverSvg, frogSvg, duckSvg, otterSvg } from './artFluss';"),
                      ("    case 'bee': return beeSvg();", "    case 'beaver': return beaverSvg();\n    case 'frog': return frogSvg();\n    case 'duck': return duckSvg();\n    case 'otter': return otterSvg();\n    case 'bee': return beeSvg();")])
ed('src/world/worldScreen.ts', [
    ("import { mouseSvg } from '../ui/artWiese';", "import { mouseSvg } from '../ui/artWiese';\nimport { chickSvg } from '../ui/artFluss';"),
    ("grasshopper: 2.0 }", "grasshopper: 2.0, beaver: 2.0, frog: 1.5, duck: 1.8, otter: 2.0 }"),
    ("c.kind === 'mouse' ? mouseSvg() : squirrelSvg(), c.kind === 'mouse' ? 0.8 : 1.0)", "c.kind === 'mouse' ? mouseSvg() : c.kind === 'chick' ? chickSvg() : squirrelSvg(), c.kind === 'squirrel' ? 1.0 : 0.8)"),
    ("const kind = c.kind === 'mouse' ? 'critter' : 'squirrel';", "const kind = c.kind === 'squirrel' ? 'squirrel' : 'critter';"),
    ("      plus: '🍯 Honig-Plus',", "      mal: '🪵 Baumstamm-Mal', teilen: '🦆 Fische teilen', reihe: '🐸 Seerosen-Reihen', malpaare: '🦦 Mal-Paare',\n      plus: '🍯 Honig-Plus',"),
    ("strahl: `${worldId}.strahl` };", "strahl: `${worldId}.strahl`, mal: `${worldId}.mal`, teilen: `${worldId}.teilen`, reihe: `${worldId}.reihe`, malpaare: `${worldId}.paare` };")])
ed('src/world/world.ts', [("icon: cr.kind === 'mouse' ? '🐭' : '🐿️',", "icon: cr.kind === 'mouse' ? '🐭' : cr.kind === 'chick' ? '🐥' : '🐿️',")])
ed('src/ui/settings.ts', [("toggle('🔧 Test: Wiese freischalten (lädt neu)', () => worldUnlocked('wiese'), (v) => { setWorldUnlocked('wiese', v); setTimeout(() => location.reload(), 300); })),",
                          "toggle('🔧 Test: Wiese freischalten (lädt neu)', () => worldUnlocked('wiese'), (v) => { setWorldUnlocked('wiese', v); setTimeout(() => location.reload(), 300); }),\n        toggle('🔧 Test: Fluss freischalten (lädt neu)', () => worldUnlocked('fluss'), (v) => { setWorldUnlocked('fluss', v); setWorldUnlocked('wiese', v || worldUnlocked('wiese')); setTimeout(() => location.reload(), 300); })),")])
print('ok')
