# Einmaliges Hilfsskript: Memory raus, Zahlen-Angeln rein (Angelteich in der Welt).
import json


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


# minigames.ts: Memory und dotsCard entfernen, finish exportieren
def mini(s):
    a = s.index("/** Mini-Stellentafel als Kartenbild */")
    b = s.index("/* ───────────── Zahlenpilze ───────────── */")
    s = s[:a] + s[b:]
    s = s.replace("async function finish(", "export async function finish(")
    s = s.replace("Memory (Zahl ↔ Punkte) und Zahlenpilze (Zahlen ordnen)", "Zahlenpilze (Zahlen ordnen); Zahlen-Angeln steht in angeln.ts")
    return s


sub('src/stations/wald/minigames.ts', mini)
sub('src/stations/index.ts', lambda s: s.replace("'memory'", "'angeln'"))
sub('src/stations/wald/index.ts', lambda s: s.replace("import { memoryScreen, pilzeScreen } from './minigames';", "import { pilzeScreen } from './minigames';\nimport { angelnScreen } from './angeln';").replace("case 'memory': return show(memoryScreen(back, again), { back });", "case 'angeln': return show(angelnScreen(back, again), { back });"))
sub('src/world/world.ts', lambda s: s.replace("export const PROC_KINDS = ['chest', 'board', 'shroom'];", "export const PROC_KINDS = ['chest', 'pond', 'shroom'];").replace("addSolid(nx, ny, proc ? 28 : 20);", "addSolid(nx, ny, n.kind === 'pond' ? 100 : proc ? 28 : 20);"))
sub('src/world/worldScreen.ts', lambda s: s.replace("else if (e.kind === 'board') { root = M.createBoard(); top = 2.6; }", "else if (e.kind === 'pond') { root = M.createPond(); top = 2.4; }").replace("memory: '🃏 Memory spielen'", "angeln: '🎣 Zahlen-Angeln'").replace("memory: `${worldId}.memory`", "angeln: `${worldId}.angeln`"))

POND = r"""

/** Angelteich: Wasserfläche mit Steg, Schilf und Angel */
export function createPond(): THREE.Group {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.12, 24), new THREE.MeshBasicMaterial({ color: '#5db7e8' }));
  water.scale.z = 0.8;
  water.position.y = 0.08;
  g.add(at(cyl(2.55, 2.6, 0.1, '#a8a49a', 24), 0, 0.05, 0), water);
  g.children[0].scale.z = 0.8;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 4, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  ring.scale.y = 0.8;
  g.add(ring);
  for (let i = 0; i < 6; i++) g.add(at(cyl(0.22, 0.22, 0.02, '#4f9d5d', 10), Math.cos(i * 2.1) * 1.2, 0.16, Math.sin(i * 2.1) * 0.8));
  for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.28; g.add(at(cone(0.06, 0.9 + (i % 3) * 0.2, '#6aa84f', 4), Math.cos(a) * 2.5, 0.5, Math.sin(a) * 1.95)); }
  // Steg mit Angel
  g.add(at(box(0.9, 0.12, 2.4, '#a8693a'), 0, 0.3, 2.4));
  for (const sx of [-1, 1]) for (const z of [1.5, 3.2]) g.add(at(cyl(0.06, 0.06, 0.5, '#7a4d26', 6), sx * 0.4, 0.15, z));
  const rod = at(cyl(0.025, 0.04, 2.2, '#7a4d26', 6), 0.35, 1.3, 2.9);
  rod.rotation.set(-0.9, 0, 0.15);
  g.add(rod, at(cyl(0.006, 0.006, 1.5, '#ddd', 4), 0.4, 1.0, 1.7), at(sph(0.09, '#e8504a', 1, 1, 1, 8), 0.4, 0.2, 1.1));
  for (let i = 0; i < 3; i++) g.add(at(sph(0.16, ['#ff8c2a', '#ff5a8a', '#ffd23f'][i], 1.5, 0.6, 0.8, 8), Math.cos(i * 2.4) * 1.0, 0.1, Math.sin(i * 2.4) * 0.6));
  return g;
}
"""
sub('src/world3d/models.ts', lambda s: s + POND)

j = json.load(open('content/worlds/wald.json', encoding='utf-8'))
for n in j['world']['npcs']:
    if n['id'] == 'memory':
        n.update(id='angeln', kind='pond', name='Angelteich', hello='wald.angeln.hello', offers=['angeln'])
        n['x'], n['y'] = 1700, 2450
t = j['texts']
for k in [k for k in t if k.startswith('wald.memory')]:
    del t[k]
t.update({
    'wald.angeln.hello': ['mia', 'Ein Angelteich! Die Fische tragen Zahlen. Ich fange immer die richtige!'],
    'wald.angeln.next': ['mia', 'Fange den Nachfolger von {n}!'],
    'wald.angeln.prev': ['mia', 'Fange den Vorgänger von {n}!'],
    'wald.angeln.stellen': ['mia', 'Fange die Zahl mit {h} Hundertern, {z} Zehnern und {e} Einern!'],
    'wald.angeln.plus10': ['mia', 'Fange die Zahl, die 10 mehr ist als {n}!'],
    'wald.angeln.minus100': ['mia', 'Fange die Zahl, die 100 weniger ist als {n}!'],
    'wald.angeln.big': ['mia', 'Fange die größte Zahl!'],
    'wald.angeln.small': ['mia', 'Fange die kleinste Zahl!'],
    'wald.angeln.between': ['mia', 'Fange die Zahl, die zwischen {a} und {b} liegt!'],
    'wald.angeln.hint.next': ['mia', 'Der Nachfolger kommt direkt nach {n}. Zähle einen weiter. Achtung bei den Zehner- und Hunderterwechseln!'],
    'wald.angeln.hint.prev': ['mia', 'Der Vorgänger steht direkt vor {n}. Zähle einen zurück. Achtung bei den Zehner- und Hunderterwechseln!'],
    'wald.angeln.hint.stellen': ['mia', 'Schreibe zuerst die Hunderter, dann die Zehner, dann die Einer: {h}, {z}, {e}. Eine Null hält den Platz frei.'],
    'wald.angeln.hint.plus10': ['mia', 'Zehn mehr heißt: Bei den Zehnern kommt eins dazu. Die Einer bleiben gleich.'],
    'wald.angeln.hint.minus100': ['mia', 'Hundert weniger heißt: Bei den Hundertern geht eins weg. Zehner und Einer bleiben gleich.'],
    'wald.angeln.hint.big': ['mia', 'Vergleiche zuerst die Hunderter. Die Zahl mit den meisten Hundertern ist am größten. Bei Gleichstand zählen die Zehner.'],
    'wald.angeln.hint.small': ['mia', 'Vergleiche zuerst die Hunderter. Die Zahl mit den wenigsten Hundertern ist am kleinsten. Bei Gleichstand zählen die Zehner.'],
    'wald.angeln.hint.between': ['mia', 'Die Zahl muss größer als {a} und kleiner als {b} sein. Probiere die Fische einzeln aus.'],
})
json.dump(j, open('content/worlds/wald.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('ok')
