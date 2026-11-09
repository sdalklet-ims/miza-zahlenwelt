# Einmaliges Hilfsskript: baut Mias Haus in den Welt-Bildschirm ein (Hausmodell, Kollisionen, Innenansicht, Meilensteine).
import json


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


def hu(s):
    s = s.replace("""      o.mode === 'plan' && readyCount() > 0
        ? h('button', { class: 'btn sun', onclick: () => parts.filter((p) => canBuild(p.id)).forEach((p, i) => setTimeout(() => o.onBuild?.(p.id), i * 700)) }, `🔨 Alles bauen (${readyCount()})`)
        : null
    );""", """      ...(o.mode === 'plan' && readyCount() > 0 && builder
        ? [h('button', { class: 'btn sun', onclick: () => parts.filter((p) => canBuild(p.id)).forEach((p, i) => setTimeout(() => builder!(p.id), i * 700)) }, `🔨 Alles bauen (${readyCount()})`)]
        : [])
    );""")
    s = s.replace("export function openHouseUi(o: HouseUiOpts) {", """/** Wird vom Welt-Bildschirm gesetzt: baut ein Teil am Bauplatz (nur wenn Mia dort ist) */
let builder: ((id: string) => void) | null = null;
export const setBuilder = (fn: ((id: string) => void) | null) => void (builder = fn);

export function openHouseUi(o: HouseUiOpts) {""")
    s = s.replace("} else if (canBuild(p.id)) action = h('button', { class: 'btn', onclick: () => o.onBuild?.(p.id) }, '🔨 Bauen');",
                  "} else if (canBuild(p.id)) action = builder ? h('button', { class: 'btn', onclick: () => builder!(p.id) }, '🔨 Bauen') : h('div', { class: 'hu-state ok' }, 'bereit – am Bauplatz bauen');")
    s = s.replace("  onBuild?: (id: string) => void;\n", "")
    s = s.replace("import { build, builtCount, buy,", "import { builtCount, buy,")
    return s


sub('src/ui/houseUi.ts', hu)
sub('src/core/map.ts', lambda s: s.replace("const MAX_STARS_PER_WORLD = 27;", "const MAX_STARS_PER_WORLD = 30;"))
j = json.load(open('content/worlds/wald.json', encoding='utf-8'))
j['texts']['wald.haus.far'] = ['mia', 'Dafür muss ich beim Bauplatz sein!']
json.dump(j, open('content/worlds/wald.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)


def ws(s):
    s = s.replace("import { equippedFor, hasGadget, addCoins } from '../core/rewards';",
                  "import { equippedFor, addCoins } from '../core/rewards';\nimport { build as buildPart, isBuilt } from '../core/house';\nimport { onProgress } from '../core/progress';")
    s = s.replace("import { openShop } from '../ui/shop';",
                  "import { openHouseUi, setBuilder } from '../ui/houseUi';\nimport { openModal } from '../ui/modal';\nimport { createHouse3D } from '../world3d/house';")
    s = s.replace("const GLITTER = ['#ff8fab', '#ffd166', '#8fd3ff', '#c3a6ff', '#9ae6a0'];\n", "")
    s = s.replace("    onSquirrel: (c) => pet(c),\n  });",
                  "    onSquirrel: (c) => pet(c),\n    onPlot: () => { speak('wald.haus.plot'); openHouseUi({ mode: 'plan' }); },\n  });")
    s = s.replace("const saved = getProgress().pos;", "const saved = getProgress().posV === 3 ? getProgress().pos : undefined;")
    s = s.replace("  const radar = h('div', { class: 'radar' }, h('i', {}), h('b', {}));\n", "")
    s = s.replace("cv, labels, radar, banner, controls.el", "cv, labels, banner, controls.el")
    a = s.index("    // Sternen-Fernglas")
    b = s.index("    stage.renderer.render(scene, stage.camera);")
    s = s[:a] + s[b:]
    s = s.replace("      const sp = hasGadget('turbo') ? RUN * 1.35 : RUN;", "      const sp = RUN;")
    a = s.index("      if (hasGadget('glitzer')")
    b = s.index("      dustT -= DT;")
    s = s[:a] + s[b:]
    s = s.replace("    const mag = hasGadget('magnet');\n", "")
    s = s.replace("      if (mag && d < 170 && d > 20) { co.x += ((st.x - co.x) / d) * 260 * DT; co.y += ((st.y - co.y) / d) * 260 * DT; }\n", "")
    s = s.replace("    // Münzen (mit Magnet fliegen sie zu Mia)", "    // Münzen")
    s = s.replace("if (o === 'shop') openShop();", "if (o === 'shop') openHouseUi({ mode: 'shop' });")
    s = s.replace("mutate((p) => void (p.pos = { x: Math.round(st.x), y: Math.round(st.y) }));",
                  "mutate((p) => { p.pos = { x: Math.round(st.x), y: Math.round(st.y) }; p.posV = 3; });")
    s = s.replace("      speak('wald.star.found');\n      award(`wald.entdecker.${s.id}`, 1);",
                  "      speak('wald.star.found');\n      addCoins(5);\n      award(`wald.entdecker.${s.id}`, 1);")
    s = s.replace("  const miaRig = M.createMia(equippedFor('mia'));", """  /* ── Mias Haus ── */
  const plot = model.plot;
  const house = createHouse3D();
  let dyn = { rects: [] as { x: number; y: number; w: number; h: number }[], solids: [] as { x: number; y: number; r: number }[] };
  if (plot) {
    house.group.position.set(plot.x * S, heightAt(plot.x, plot.y), plot.y * S);
    scene.add(house.group);
  }
  let houseInside = false;
  function syncHouse(animate: boolean) {
    if (!plot) return;
    const hs = getProgress().house;
    house.sync(hs.built, { roof: hs.roof, wall: hs.wall }, animate);
    dyn = house.collisions(hs.built, plot.x, plot.y);
  }
  syncHouse(false);
  house.onLand = (_id, p) => {
    for (let i = 0; i < 16; i++) fx.add(p.x + (Math.random() - 0.5) * 2.5, p.y - 0.3, p.z + (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, 0.6 + Math.random(), (Math.random() - 0.5) * 1.5, 0.8, 0.5, '#e2cda0');
  };
  const offHouse = onProgress(() => syncHouse(true));

  function confetti() {
    for (let i = 0; i < 40; i++) {
      const c = h('div', { class: 'confetti', style: { left: Math.random() * 1150 + 'px', animationDelay: Math.random() * 1.2 + 's' } }, ['🎉', '🎊', '⭐', '🌸', '🎈'][i % 5]);
      el.append(c);
      setTimeout(() => c.remove(), 4800);
    }
  }
  function milestone(stage: number) {
    const info = [null, ['🏗️', 'Der Rohbau steht!', 'wald.haus.roh'], ['🏡', 'Mias Haus ist bewohnbar!', 'wald.haus.done'], ['🏆', 'Alles gebaut!', 'wald.haus.master']][stage] as [string, string, string];
    if (stage >= 2) confetti();
    award('wald.haus', stage);
    const close = openModal({ title: info[1], content: h('div', { class: 'milestone' }, h('div', { class: 'big' }, info[0]), h('p', {}, textOf(info[2])), h('button', { class: 'btn', onclick: () => close() }, 'Weiter bauen!')) });
    speak(info[2]);
  }
  /** Teil aufbauen – nur, wenn Mia beim Bauplatz ist */
  setBuilder((id) => {
    if (!plot || Math.hypot(st.x - plot.x, st.y - plot.y) > 700) return void speak('wald.haus.far');
    const stage = buildPart(id);
    if (stage) setTimeout(() => milestone(stage), 1500);
    else speak('wald.haus.built');
  });

  const miaRig = M.createMia(equippedFor('mia'));""")
    s = s.replace("      for (const r of model.rects) {\n        if (st.x < r.x - R",
                  "      for (const s of dyn.solids) {\n        const m = s.r + R;\n        const dx = st.x - s.x, dy = st.y - s.y, d = Math.hypot(dx, dy);\n        if (d < m && d > 0.001) { st.x = s.x + (dx / d) * m; st.y = s.y + (dy / d) * m; }\n      }\n      for (const r of [...model.rects, ...dyn.rects]) {\n        if (st.x < r.x - R", 1)
    s = s.replace("    fx.update(DT);\n", """    if (plot) {
      const inh = isBuilt('fundament') && Math.abs(st.x - plot.x) < 160 && st.y > plot.y - 125 && st.y < plot.y + 125 && isBuilt('wand_hinten');
      if (inh !== houseInside) { houseInside = inh; house.setInside(inh); }
      house.update(timeSec, DT);
      const ch = house.chimney();
      if (ch && Math.random() < 0.06) fx.add(ch.x + (Math.random() - 0.5) * 0.2, ch.y, ch.z, 0.25, 0.9, 0.1, 2.6, 0.9, '#d8d8d8');
    }
    fx.update(DT);
""", 1)
    s = s.replace("  if (opts.spawnWorld && model.spawns[opts.spawnWorld] === spawn) speak(`${opts.spawnWorld}.arrive`);", """  if (!getProgress().seen.goal) {
    mutate((p) => void (p.seen.goal = true));
    speak('wald.haus.goal');
  } else if (opts.spawnWorld && model.spawns[opts.spawnWorld] === spawn) speak(`${opts.spawnWorld}.arrive`);""")
    s = s.replace("      stage.dispose();\n", "      stage.dispose();\n      offHouse();\n      setBuilder(null);\n")
    return s


sub('src/world/worldScreen.ts', ws)
sub('src/main.ts', lambda s: s.replace("hud.init({ onMap: goMap, onAlbum: openAlbum, onSettings: openSettings });",
                                       "hud.init({ onMap: goMap, onAlbum: openAlbum, onSettings: openSettings, onHouse: () => openHouseUi({ mode: 'plan' }) });").replace("import { openAlbum } from './ui/album';", "import { openAlbum } from './ui/album';\nimport { openHouseUi } from './ui/houseUi';"))
print('ok')
