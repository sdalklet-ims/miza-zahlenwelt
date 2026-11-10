# Einmaliges Hilfsskript: Eule Olga am Nebeltor, Nebel löst sich auf, Autohaus in die Wiese, Ladestationen erst ab der Wiese
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


# ── Welt-Modell ──
ed('src/world/world.ts', [
    ("import { worlds, type WorldContent } from '../core/texts';", "import { worlds, badgeCfg, type WorldContent } from '../core/texts';"),
    ("  fogs: { x: number; y: number; s: number; ph: number }[];", "  fogs: { x: number; y: number; s: number; ph: number; dissolve?: number }[];"),
    ("""    keep.push({ x: bx, y: py, r: 190 });
    if (isOpen(worlds[zi])) continue;""", """    keep.push({ x: bx, y: py, r: 190 });
    // Eule Olga steht vor dem Nebel: Mathearbeit der Welt davor (nur Welten mit Abzeichen)
    const prev = worlds[zi - 1];
    if (badgeCfg.worlds[prev.id]) {
      const gx = bx - 210, gy = Math.round(py + 135);
      keep.push({ x: gx, y: gy, r: 150 });
      const npc: Npc = { id: `tor.${prev.id}`, kind: 'owl', name: 'Eule Olga', x: gx, y: gy, hello: 'tor.hello.missing', offers: ['pruefung'] };
      m.npcs.push({ npc, id: npc.id, kind: 'owl', name: npc.name, x: gx, y: gy, worldId: prev.id });
      addSolid(gx, gy, 20);
      m.interacts.push({ id: `npc.${npc.id}`, x: gx, y: gy, r: 130, label: 'Mathearbeit', icon: '📝', run: () => hooks.onNpc(npc, prev.id) });
    }
    if (isOpen(worlds[zi])) {
      // Nebel löst sich beim ersten Besuch nach bestandener Mathearbeit sichtbar auf
      if (!getProgress().seen['gateopen.' + zi]) {
        const r0 = rng(zi * 31 + 5);
        for (let y = 120; y < WH; y += 90) m.fogs.push({ x: bx + (r0() - 0.5) * 110, y: y + r0() * 40, s: 0.9 + r0() * 0.8, ph: r0() * 6, dissolve: zi });
      }
      continue;
    }"""),
    ("    m.interacts.push({ id: `gate.${zi}`, x: bx - 70, y: py, r: 190, label: 'Nebeltor', icon: '🌫️', run: hooks.onGate });", "    m.interacts.push({ id: `gate.${zi}`, x: bx - 40, y: py, r: 120, label: 'Nebeltor', icon: '🌫️', run: hooks.onGate });"),
    # Ladestationen erst ab der Wiese (Zone 1), am Bauplatz immer
    ("  for (let zi = 0; zi < worlds.length; zi++) for (const lx of [900, 1900, 2900]) addStation(", "  for (let zi = 1; zi < worlds.length; zi++) for (const lx of [900, 1900, 2900]) addStation("),
])

# ── Rocky und das Autohaus gehören in die Wiese ──
w = json.load(open('content/worlds/wald.json', encoding='utf-8'))
w['world']['npcs'] = [n for n in w['world']['npcs'] if n['id'] != 'rocky']
w['texts'].pop('wald.rocky.hello', None)
json.dump(w, open('content/worlds/wald.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
v = json.load(open('content/worlds/wiese.json', encoding='utf-8'))
v['world']['npcs'].append({"id": "rocky", "kind": "raccoon", "name": "Waschbär Rocky", "x": 1650, "y": 1790, "hello": "wiese.rocky.hello", "offers": ["autos"]})
v['texts']['wiese.rocky.hello'] = ["rocky", "Brumm, brumm! Ich bin Rocky. Bei mir gibt es ein Fahrrad, einen E-Roller und ein E-Auto. Die Welten werden immer größer, da lohnt sich Tempo! Die Elektro-Fahrzeuge laden an den Ladestationen."]
json.dump(v, open('content/worlds/wiese.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
c = json.load(open('content/vehicles.json', encoding='utf-8'))
c['texts'].pop('wald.rocky.hello', None)
json.dump(c, open('content/vehicles.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ── worldScreen ──
ed('src/world/worldScreen.ts', [
    ("import { openCarShop } from '../ui/carshop';", "import { openCarShop } from '../ui/carshop';\nimport { openBadgeBook } from '../ui/badges';\nimport { examPassed, gameBadges, missingBadges, allBadges } from '../core/badges';\nimport { examScreen } from '../stations/exam';"),
    ("    onGate: () => { speak('common.gate.soon'); shakeFog = 1; },", "    onGate: () => { speak('tor.closed'); shakeFog = 1; },"),
    ("      fig = await svgFigure(npcSvg(e.kind, e.id === 'eule' ? eulerAcc : []), fh);", "      fig = await svgFigure(npcSvg(e.kind, e.id === 'eule' || e.id.startsWith('tor.') ? eulerAcc : []), fh);"),
    ("e.kind === 'raccoon' ? '🚗' : '💬');", "e.kind === 'raccoon' ? '🚗' : e.id.startsWith('tor.') ? '📝' : '💬');"),
    ("  function openDialog(npc: Npc, worldId: string) {\n    closeDialog();\n    frozenByDialog = true;", """  /** Eule Olga am Nebeltor: Abzeichen prüfen, Mathearbeit starten */
  function openGateDialog(npc: Npc, worldId: string) {
    closeDialog();
    frozenByDialog = true;
    const idx = worlds.findIndex((w) => w.id === worldId);
    const next = worlds[idx + 1];
    const nextOpen = !!next && next.meta.status === 'open' && !!stationStarters[next.id];
    const done = examPassed(worldId);
    const miss = missingBadges(worldId);
    const id = done ? (nextOpen ? 'tor.hello.passed' : 'tor.hello.last') : allBadges(worldId) ? 'tor.hello.ready' : 'tor.hello.missing';
    const params = { n: miss.length, names: miss.map((b) => b.name).join(', ') };
    const btns: HTMLElement[] = [];
    if (!done && allBadges(worldId)) btns.push(h('button', { class: 'btn sun', onclick: () => { savePos(); closeDialog(); show(examScreen(worldId, () => void enterWorld()), { back: () => void enterWorld() }); } }, '📝 Mathearbeit starten'));
    btns.push(h('button', { class: 'btn', onclick: () => { closeDialog(); openBadgeBook(worldId); } }, '📖 Abzeichenbuch', !done && !allBadges(worldId) ? h('small', { class: 'btn-stars' }, `${gameBadges(worldId).length - miss.length}/${gameBadges(worldId).length}`) : null));
    bubble = h('div', { class: 'bubble world-bubble' },
      h('div', { class: 'bubble-name' }, npc.name),
      h('p', {}, textOf(id, params)),
      h('div', { class: 'bubble-btns' }, ...btns, h('button', { class: 'btn ghost', onclick: closeDialog }, 'Tschüss')));
    el.append(bubble);
    speak(id, params);
  }

  function openDialog(npc: Npc, worldId: string) {
    if (npc.id.startsWith('tor.')) return openGateDialog(npc, worldId);
    closeDialog();
    frozenByDialog = true;"""),
    # Nebel löst sich auf
    ("    return { f, sp, sc };\n  });", "    return { f, sp, sc, born: -1 };\n  });\n  const dissolving = fogSprites.filter((x) => x.f.dissolve);\n  if (dissolving.length) {\n    const zi = dissolving[0].f.dissolve!;\n    mutate((p) => void (p.seen['gateopen.' + zi] = true));\n    speak('exam.open');\n  }"),
    ("    for (const fs of fogSprites) {\n      const sh = shakeFog * Math.sin(timeSec * 40) * 0.2;", "    for (const fs of fogSprites) {\n      if (fs.f.dissolve) { // Nebel hebt sich nach oben und verblasst in ca. 4 s\n        if (fs.born < 0) fs.born = timeSec;\n        const k = Math.min(1, (timeSec - fs.born) / 4);\n        (fs.sp.material as THREE.SpriteMaterial).opacity = 0.95 * (1 - k);\n        fs.sp.position.y = 2.4 + (fs.f.ph % 1) * 1.2 + k * 3;\n        fs.sp.visible = k < 1;\n      }\n      const sh = shakeFog * Math.sin(timeSec * 40) * 0.2;"),
])
print('ok')
