# Einmaliges Hilfsskript: Welt-Bildschirm auf Comic-Sprites umstellen (Mia, Auftraggeber, Eichhörnchen).
p = 'src/world/worldScreen.ts'
s = open(p, encoding='utf-8').read()

a = s.index("  const miaRig = M.createMia(equippedFor('mia'));")
b = s.index("  const bushViews = model.bushes.map")
new = """  // Figuren sind Comic-Sprites (2,5D): Mia wird jedes Bild neu gezeichnet, die Tiere sind Zeichnungen
  const miaSpr = createMiaSprite(equippedFor('mia'));
  scene.add(miaSpr.group);
  let miaDir: Dir = 'down';

  interface NpcView { ent: (typeof model.npcs)[number]; root: THREE.Object3D; fig?: Billboard; label: HTMLElement; mark: HTMLElement; top: number }
  const npcViews: NpcView[] = [];
  const eulerAcc = equippedFor('eule');
  const FIG_H: Record<string, number> = { owl: 2.5, hedgehog: 1.3, badger: 1.7, hare: 2.1, fox: 2.0 };
  for (const e of model.npcs) {
    let root: THREE.Object3D, fig: Billboard | undefined, top = 3.4;
    if (e.kind === 'chest') { root = M.createChest(); top = 1.9; }
    else if (e.kind === 'board') { root = M.createBoard(); top = 2.6; }
    else if (e.kind === 'shroom') { root = M.createShroomRing(); top = 1.8; }
    else {
      const fh = FIG_H[e.kind] ?? 1.8;
      fig = await svgFigure(npcSvg(e.kind, e.id === 'eule' ? eulerAcc : []), fh);
      root = fig.group;
      top = fh + 0.15;
    }
    root.position.set(e.x * S, heightAt(e.x, e.y), e.y * S);
    scene.add(root);
    if (e.kind === 'fox') {
      const stall = M.createStall();
      stall.position.set(e.x * S, heightAt(e.x, e.y + 40), (e.y + 40) * S);
      stall.scale.setScalar(1.25);
      scene.add(stall);
    }
    const label = h('div', { class: 'npc3-name' }, e.name);
    const mark = h('div', { class: 'npc3-mark' }, e.kind === 'chest' ? '⭐' : PROC_KINDS.includes(e.kind) ? '🎮' : e.kind === 'fox' ? '🛒' : '💬');
    labels.append(label, mark);
    npcViews.push({ ent: e, root, fig, label, mark, top });
  }

  const critters: { c: (typeof model.critters)[number]; fig: Billboard }[] = [];
  for (const c of model.critters) {
    const fig = await svgFigure(squirrelSvg(), 1.0);
    scene.add(fig.group);
    critters.push({ c, fig });
  }

"""
s = s[:a] + new + s[b:]

s = s.replace("import * as M from '../world3d/models';", "import * as M from '../world3d/models';\nimport { createMiaSprite, svgFigure, SPR_Y, type Billboard } from '../world3d/sprites';\nimport type { Dir } from '../world3d/comic';\nimport { npcSvg, squirrelSvg } from '../ui/art';")

s = s.replace("      if (spd > 12) st.yaw += angDiff(st.yaw, Math.atan2(st.vx, st.vy)) * Math.min(1, 13 * DT);\n", "")

s = s.replace("""    miaRig.root.visible = !hidden;
    miaRig.root.position.set(st.x * S, gy, st.y * S);
    miaRig.root.rotation.y = st.yaw;
    miaRig.animate(t, st.phase, Math.min(1, spd / RUN));
""", """    if (spd > 12) miaDir = Math.abs(st.vx) > Math.abs(st.vy) ? (st.vx < 0 ? 'left' : 'right') : st.vy < 0 ? 'up' : 'down';
    miaSpr.setHidden(!!hidden);
    miaSpr.group.position.set(st.x * S, gy, st.y * S);
    miaSpr.update(t, st.phase, Math.min(1, spd / RUN), miaDir, false);
""")

a = s.index("    for (const nv of npcViews) {\n      nv.rig?.update(timeSec);")
b = s.index("      v3.set(nv.ent.x * S, heightAt(nv.ent.x, nv.ent.y) + nv.top, nv.ent.y * S);")
s = s[:a] + """    for (const nv of npcViews) {
      const d = Math.hypot(nv.ent.x - st.x, nv.ent.y - st.y);
      if (nv.fig) {
        nv.fig.mesh.scale.y = SPR_Y * (1 + Math.sin(timeSec * 2.2 + nv.ent.x) * 0.018); // atmet
        if (nv.ent.kind === 'hedgehog') nv.fig.mesh.scale.x = st.x > nv.ent.x ? -1 : 1; // schaut zu Mia
      }
""" + s[b:]

a = s.index("    for (const c of critters) {\n      const cr = c.c, moving")
b = s.index("    for (const bv of bushViews) {")
s = s[:a] + """    for (const c of critters) {
      const cr = c.c, moving = Math.hypot(cr.vx, cr.vy) > 8;
      c.fig.group.position.set(cr.x * S, heightAt(cr.x, cr.y) + (moving ? Math.abs(Math.sin(timeSec * 14)) * 0.14 : 0), cr.y * S);
      if (Math.abs(cr.vx) > 5) c.fig.mesh.scale.x = cr.vx < 0 ? -1 : 1;
    }
""" + s[b:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
