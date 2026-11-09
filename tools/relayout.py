# Einmaliges Hilfsskript: setzt Weltgröße und Wald-Layout (Positionen) neu. Nur zum Nachvollziehen aufgehoben.
import json, math, random

H = 3000
PY, AMP = 1500, 260
path = lambda x: PY + math.sin(x / 430) * AMP

cfg = json.load(open('content/world.json', encoding='utf-8'))
cfg.update(height=H, zoneWidth=3200, pathY=PY, pathAmp=AMP)
json.dump(cfg, open('content/world.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

f = 'content/worlds/wald.json'
j = json.load(open(f, encoding='utf-8'))
w = j['world']
w['spawn'] = {'x': 760, 'y': round(path(760) - 170)}
npcs = [
    ('eule', 'owl', 'Eule Olga', 560, 1330, 'wald.eule.hello', ['video', 'discover']),
    ('igel', 'hedgehog', 'Igel Ingo', 1250, path(1250) + 190, 'wald.igel.hello', ['punkte']),
    ('dachs', 'badger', 'Dachs Bruno', 1650, 1150, 'wald.dachs.hello', ['steine']),
    ('hase', 'hare', 'Hase Hugo', 2050, path(2050) + 230, 'wald.hase.hello', ['kaertchen']),
    ('fuchs', 'fox', 'Fuchs Fritz', 1250, path(1250) - 300, 'wald.fuchs.hello', ['shop']),
    ('memory', 'board', 'Memory-Brett', 1500, 2450, 'wald.memory.hello', ['memory']),
    ('pilze', 'shroom', 'Zahlenpilze', 2200, 900, 'wald.pilze.hello', ['pilze']),
    ('truhe', 'chest', 'Schatzkiste', 3000, path(3000) - 150, 'wald.truhe.hello', ['check']),
]
w['npcs'] = [dict(id=i, kind=k, name=n, x=x, y=round(y), hello=h, offers=o) for i, k, n, x, y, h, o in npcs]
w['plot'] = {'x': 520, 'y': 2250}

rnd = random.Random(5)
keep = [(n[3], n[4]) for n in npcs] + [(520, 2250)]


def pick(n, lo, hi, d):
    out = []
    while len(out) < n:
        x, y = rnd.uniform(200, 3000), rnd.uniform(160, H - 160)
        if not (lo <= abs(y - path(x)) <= hi) or any(math.hypot(x - a, y - b) <= d for a, b in keep):
            continue
        out.append((round(x), round(y)))
        keep.append((x, y))
    return out


w['bushes'] = [dict(x=x, y=y) for x, y in pick(16, 120, 500, 200)]
w['stars'] = [dict(id='s%d' % (i + 1), x=x, y=y) for i, (x, y) in enumerate(pick(12, 420, 1300, 380))]
w['critters'] = [dict(kind='squirrel', x=x, y=y) for x, y in pick(8, 160, 700, 260)]
w['coins'] = 90

t = j['texts']
t.update({
    'wald.fuchs.hello': ['fuchs', 'Willkommen im Baumarkt, Mia! Hier gibt es alles für dein Haus: vom Fundament bis zur Deko. Sammle Münzen und kauf ein!'],
    'wald.fuchs.buy': ['fuchs', 'Prima Wahl! Das Material liegt bereit. Bau es am Bauplatz auf.'],
    'wald.fuchs.poor': ['fuchs', 'Dafür brauchst du noch ein paar Münzen. Such welche im Wald oder spiel die Minispiele!'],
    'wald.haus.goal': ['mia', 'Mein Ziel: ein eigenes Haus! Ich sammle Münzen und kaufe bei Fuchs Fritz Baumaterial.'],
    'wald.haus.plot': ['mia', 'Das ist mein Bauplatz. Hier entsteht mein Haus!'],
    'wald.haus.built': ['mia', 'Wieder ein Stück vom Haus gebaut!'],
    'wald.haus.roh': ['eule', 'Hu-hu! Der Rohbau steht. Das sieht schon nach einem Haus aus!'],
    'wald.haus.done': ['eule', 'Mias Haus ist bewohnbar! Zeit für eine Einzugsparty!'],
    'wald.haus.master': ['eule', 'Alles ist fertig! Mia ist die beste Baumeisterin im ganzen Wald!'],
})
json.dump(j, open(f, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

k = json.load(open('content/common.json', encoding='utf-8'))
k.pop('shop', None)
json.dump(k, open('content/common.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('ok', w['spawn'])
