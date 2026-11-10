# Einmaliges Hilfsskript: Abzeichen-Daten, Fortschrittsfelder, Texte
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:70])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


def g(id, name, icon, color, shape, npc, what):
    return {"id": id, "name": name, "icon": icon, "color": color, "shape": shape, "npc": npc, "what": what}


worlds = {
    "wald": {
        "title": "Wald", "icon": "🌲",
        "master": g("master", "Waldmeister", "🌲", "#3f9a4a", "star", "Eule Olga", "Mathearbeit im Wald bestanden"),
        "games": [
            g("punkte", "Punkte-Profi", "🎯", "#e9803a", "circle", "Igel Ingo", "Punkte zählen"),
            g("steine", "Steine-Meister", "🪨", "#8a8f99", "hex", "Dachs Bruno", "Steine-Meister"),
            g("kaertchen", "Kärtchen-König", "🃏", "#c0509a", "shield", "Hase Hugo", "Kärtchen-Duell"),
            g("angeln", "Zahlen-Angler", "🎣", "#3a8fe0", "flower", "Angelteich", "Zahlen-Angeln"),
            g("pilze", "Pilz-Sammler", "🍄", "#e0483f", "circle", "Zahlenpilze", "Pilze pflücken"),
        ]},
    "wiese": {
        "title": "Wiese", "icon": "🌼",
        "master": g("master", "Wiesenkönig", "🌼", "#e9b410", "star", "Eule Olga", "Mathearbeit auf der Wiese bestanden"),
        "games": [
            g("plus", "Honig-Rechner", "🍯", "#e9b410", "hex", "Biene Bella", "Honig-Plus"),
            g("minus", "Rückwärts-Wanderer", "🐌", "#a8703a", "shield", "Schnecke Schorsch", "Minus-Wanderung"),
            g("partner", "Paar-Finder", "🦋", "#9a6ad9", "flower", "Schmetterling Fritzi", "Schmetterlings-Paare"),
            g("strahl", "Strahl-Hüpfer", "🦗", "#5fbf4a", "circle", "Grashüpfer Hannes", "Zahlenstrahl-Hüpfer"),
            g("check", "Wiesen-Held", "⭐", "#f2a43a", "star", "Blumentruhe", "Wiesen-Check"),
        ]},
    "fluss": {
        "title": "Fluss", "icon": "🌊",
        "master": g("master", "Flusskapitän", "🌊", "#2f7bd9", "star", "Eule Olga", "Mathearbeit am Fluss bestanden"),
        "games": [
            g("mal", "Stapel-Biber", "🪵", "#a8703a", "shield", "Biber Bruno", "Baumstamm-Mal"),
            g("teilen", "Fisch-Verteiler", "🦆", "#e9b410", "circle", "Ente Emma", "Fische teilen"),
            g("reihe", "Seerosen-Springer", "🐸", "#4aa83a", "flower", "Frosch Fred", "Seerosen-Reihen"),
            g("paare", "Kiesel-Kenner", "🦦", "#8a5a3a", "hex", "Otter Otto", "Mal-Paare"),
            g("check", "Fluss-Held", "⭐", "#4a90d9", "star", "Flusstruhe", "Fluss-Check"),
        ]},
}
T = {
    "badge.run1": ["mia", "Fehlerfrei! Noch ein fehlerfreier Durchgang, dann gehört mir das Abzeichen „{name}“."],
    "badge.new": ["mia", "Ein neues Abzeichen: {name}! Das kommt ins Abzeichenbuch."],
    "badge.master": ["mia", "Ich habe die Mathearbeit bestanden! Das Abzeichen „{name}“ gehört mir."],
    "tor.closed": ["mia", "Der Nebel lässt mich nicht durch. Davor steht Eule Olga – vielleicht kann sie helfen."],
    "tor.hello.missing": ["eule", "Hu-hu! Hinter dem Nebel liegt die nächste Welt. Zuerst brauchst du alle Abzeichen dieser Welt. Dir fehlen noch {n}: {names}."],
    "tor.hello.ready": ["eule", "Hu-hu! Du hast alle Abzeichen! Dann kommt jetzt meine kleine Mathearbeit: fünf Aufgaben, eine aus jedem Spiel. Mit vier richtigen bestehst du. Ein Fehler ist erlaubt!"],
    "tor.hello.passed": ["eule", "Du hast meine Mathearbeit bestanden. Der Nebel ist weg, geh nur weiter!"],
    "tor.hello.last": ["eule", "Du hast meine Mathearbeit bestanden! Hinter dem Nebel wächst noch alles heran, die nächste Welt kommt bald."],
    "exam.intro": ["eule", "Los geht's! Fünf Aufgaben, eine aus jedem Spiel. Denk in Ruhe nach, es gibt keinen Zeitdruck."],
    "exam.pass.5": ["eule", "Alle fünf richtig! Das war eine Eins mit Sternchen. Der Nebel lichtet sich!"],
    "exam.pass.4": ["eule", "Vier von fünf, das reicht! Bestanden. Der Nebel lichtet sich!"],
    "exam.fail": ["eule", "Das war noch nicht ganz genug, aber das ist nicht schlimm. Übe noch ein bisschen bei deinen Freunden und komm wieder. Du darfst es so oft versuchen, wie du magst."],
    "exam.open": ["mia", "Der Nebel lichtet sich! Auf in die nächste Welt!"],
    "exam.reihe.prompt": ["eule", "Setze die Reihe fort: {seq}, … Welche Zahl kommt als Nächstes?"],
    "exam.choice.prompt": ["eule", "Wie viel ist {a} mal {b}? Tippe die richtige Zahl an."],
    "exam.reihe.hint": ["eule", "Schau, um wie viel die Zahlen jedes Mal größer werden, und zähle genauso weiter."],
    "exam.choice.hint": ["eule", "Rechne {a} mal {b}: {b} gleich große Gruppen mit je {a}. Zähle in {a}er-Schritten."],
}
json.dump({"worlds": worlds, "texts": T}, open('content/badges.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

ed('src/core/texts.ts', [("export interface MealDef", """export interface BadgeGameDef { id: string; name: string; icon: string; color: string; shape: string; npc: string; what: string }
export const badgeCfg = files['/content/badges.json'] as { worlds: Record<string, { title: string; icon: string; master: BadgeGameDef; games: BadgeGameDef[] }> };

export interface MealDef""")])
ed('src/core/progress.ts', [
    ("  charge: Record<string, number>;", "  charge: Record<string, number>;\n  /** Fehlerfreie Durchläufe je Spiel (\"wald.punkte\" → 0..), ab 2 gehört das Abzeichen Mia */\n  badges: Record<string, number>;\n  /** Bestandene Mathearbeiten je Welt (Punkte 4–5) */\n  passed: Record<string, number>;"),
    ("  charge: {},", "  charge: {},\n  badges: {},\n  passed: {},")])
print('ok')
