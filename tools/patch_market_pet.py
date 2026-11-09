# Einmaliges Hilfsskript: Supermarkt-Gebäude, Haustier in der Welt, Effekte.
def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


MARKET = r"""

/** Supermarkt: Gebäude mit Schild, gestreifter Markise, Schaufenstern, Glastür und Einkaufswagen. Vorderseite = +z. */
export function createSupermarket(): THREE.Group {
  const g = new THREE.Group();
  const W = 6.8, D = 3.6, H = 3.0;
  g.add(at(box(W, H, D, '#fdf1d8'), 0, H / 2, 0), at(box(W + 0.4, 0.3, D + 0.4, '#b9302a'), 0, H + 0.15, 0));
  const signTex = canvasTex(512, 128, (c) => { c.fillStyle = '#e0483f'; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116); c.fillStyle = '#fff'; c.font = '900 74px sans-serif'; c.textAlign = 'center'; c.fillText('SUPERMARKT', 256, 92); });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 1.0, 0.25), [mat('#b9302a'), mat('#b9302a'), mat('#b9302a'), mat('#b9302a'), toon({ map: signTex }), mat('#b9302a')]);
  sign.position.set(0, H + 0.95, D / 2 - 0.2);
  sign.castShadow = true;
  g.add(sign);
  const shelves = canvasTex(256, 128, (c) => {
    c.fillStyle = '#e8f4ff'; c.fillRect(0, 0, 256, 128);
    const cols = ['#e8504a', '#f4c430', '#4f9d5d', '#4a90d9', '#ff9f5a', '#c3a6ff'];
    for (let r = 0; r < 3; r++) { c.fillStyle = '#b8956a'; c.fillRect(0, 36 + r * 40, 256, 5); for (let k = 0; k < 9; k++) { c.fillStyle = cols[(k + r * 2) % 6]; c.fillRect(8 + k * 27, 10 + r * 40 + (k % 3) * 3, 20, 24 - (k % 3) * 3); } }
  });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: shelves }));
    w.position.set(sx * 2.25, 1.35, D / 2 + 0.02);
    g.add(w, at(box(2.5, 0.12, 0.12, '#7a4d26'), sx * 2.25, 0.55, D / 2 + 0.06), at(box(2.5, 0.12, 0.12, '#7a4d26'), sx * 2.25, 2.15, D / 2 + 0.06));
  }
  for (const sx of [-1, 1]) g.add(at(box(0.08, 2.2, 0.1, '#dfe6ea'), sx * 0.8, 1.1, D / 2 + 0.05));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ color: '#aee2ff', transparent: true, opacity: 0.55 }));
  door.position.set(0, 1.08, D / 2 + 0.03);
  g.add(door, at(box(0.06, 2.1, 0.06, '#dfe6ea'), 0, 1.08, D / 2 + 0.05));
  for (let i = 0; i < 8; i++) { const s = at(rot(box(0.95, 0.08, 1.2, i % 2 ? '#ffffff' : '#e0483f'), 0.35), -3.3 + i * 0.95 + 0.47, 2.65, D / 2 + 0.5); s.castShadow = true; g.add(s); }
  for (let k = 0; k < 2; k++) {
    const cart = new THREE.Group();
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.5, 1.1)), new THREE.LineBasicMaterial({ color: '#8a929a' }));
    wire.position.y = 0.75;
    cart.add(wire, at(box(0.8, 0.05, 1.1, '#8a929a'), 0, 0.5, 0), at(box(0.8, 0.05, 0.05, '#e0483f'), 0, 1.0, -0.55));
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.45, 0.45]) cart.add(at(sph(0.06, '#333', 1, 1, 1, 6), sx, 0.12, sz));
    cart.position.set(-3.9 - k * 0.5, 0, D / 2 + 1.3 + k * 0.4);
    cart.rotation.y = 0.3 + k * 0.4;
    g.add(cart);
  }
  for (const sx of [-1, 1]) g.add(at(cyl(0.3, 0.24, 0.5, '#c0704a', 8), sx * 3.5, 0.25, D / 2 + 0.6), at(sph(0.38, '#4f9d5d', 1, 1, 1, 8), sx * 3.5, 0.75, D / 2 + 0.6), at(sph(0.1, '#ff8fab', 1, 1, 1, 6), sx * 3.5 + 0.1, 1.0, D / 2 + 0.75));
  return g;
}
"""

sub('src/world3d/models.ts', lambda s: s + MARKET)

# world.ts: Supermarkt als feste Fläche statt Standpfosten
sub('src/world/world.ts', lambda s: s.replace(
    "      if (n.kind === 'fox') { addSolid(nx - 100, ny + 6, 22); addSolid(nx + 100, ny + 6, 22); }",
    "      if (n.kind === 'fox') m.rects.push({ x: nx - 175, y: ny - 330, w: 350, h: 190 }); // Supermarkt-Gebäude hinter dem Händler"
).replace("n.kind === 'fox' ? 'Zum Laden' : 'Ansprechen'", "n.kind === 'fox' ? 'Einkaufen' : 'Ansprechen'"))


def ws(s):
    # Supermarkt statt Stand
    s = s.replace("""      const stall = M.createStall();
      stall.position.set(e.x * S, heightAt(e.x, e.y + 40), (e.y + 40) * S);
      stall.scale.setScalar(1.25);
      scene.add(stall);""", """      const market = M.createSupermarket();
      market.position.set(e.x * S, heightAt(e.x, e.y - 230), (e.y - 230) * S);
      scene.add(market);""")
    s = s.replace("if (o === 'shop') openHouseUi({ mode: 'shop' });", "if (o === 'shop') openSupermarket();")
    s = s.replace("import { openHouseUi, setBuilder } from '../ui/houseUi';", "import { openHouseUi, setBuilder } from '../ui/houseUi';\nimport { openSupermarket } from '../ui/supermarket';\nimport { openPetUi } from '../ui/petUi';\nimport { pet as getPet, mood as petMood } from '../core/pet';\nimport { sfx } from '../audio/music';")
    s = s.replace("import { npcSvg, squirrelSvg } from '../ui/art';", "import { npcSvg, squirrelSvg, petSvg, type PetKind } from '../ui/art';")
    # Effekte
    s = s.replace("      speak('wald.star.found');\n      addCoins(5);", "      speak('wald.star.found');\n      sfx.star();\n      addCoins(5);")
    s = s.replace("        co.got = true;\n        cw.m.visible = false;", "        co.got = true;\n        sfx.coin();\n        cw.m.visible = false;")
    s = s.replace("  house.onLand = (_id, p) => {", "  house.onLand = (_id, p) => {\n    sfx.build();")
    # Haustier
    s = s.replace("  const offHouse = onProgress(() => syncHouse(true));", """  /* ── Haustier ── */
  const PET_H: Record<string, number> = { meerschwein: 0.85, kaninchen: 1.45, hamster: 0.8, wellensittich: 1.2 };
  const pt = { x: plot?.x ?? 0, y: plot?.y ?? 0, vx: 0, vy: 0, wait: 1, kind: '', fig: null as Billboard | null };
  const petMark = h('div', { class: 'pet-mark' }, '🍽️');
  labels.append(petMark);
  let petInteract: Interact | null = null;
  let petWarnAt = 0;
  async function ensurePet() {
    const p = getPet();
    if (!p || !plot || pt.kind === p.kind) return;
    pt.kind = p.kind;
    if (pt.fig) scene.remove(pt.fig.group);
    pt.fig = await svgFigure(petSvg(p.kind as PetKind), PET_H[p.kind] ?? 1);
    scene.add(pt.fig.group);
    if (!petInteract) {
      petInteract = { id: 'pet', x: 0, y: 0, r: 110, label: 'Füttern', icon: '🥕', follow: pt, run: () => openPetUi() };
      model.interacts.push(petInteract);
    }
  }
  const offHouse = onProgress(() => { syncHouse(true); void ensurePet(); });
  void ensurePet();""")
    # Haustier-Bewegung im Update (nach Tiere)
    s = s.replace("    // Entdecker-Sterne\n", """    // Haustier: läuft im Haus (oder im Garten, solange es keinen Boden gibt) umher
    if (pt.fig && plot) {
      const indoor = isBuilt('boden') && isBuilt('waende');
      const r = indoor ? { x0: plot.x - 120, x1: plot.x + 120, y0: plot.y - 60, y1: plot.y + 80 } : { x0: plot.x - 230, x1: plot.x + 230, y0: plot.y + 190, y1: plot.y + 300 };
      if (pt.x < r.x0 - 4 || pt.x > r.x1 + 4 || pt.y < r.y0 - 4 || pt.y > r.y1 + 4) { pt.x = clamp(pt.x, r.x0, r.x1); pt.y = clamp(pt.y, r.y0, r.y1); }
      pt.wait -= DT;
      if (pt.wait <= 0) {
        if (Math.hypot(pt.vx, pt.vy) > 1 || Math.random() < 0.4) { pt.vx = pt.vy = 0; pt.wait = 1.5 + Math.random() * 3; }
        else { const a = Math.random() * 6.28; pt.vx = Math.cos(a) * 34; pt.vy = Math.sin(a) * 34; pt.wait = 0.8 + Math.random() * 1.6; }
      }
      pt.x = clamp(pt.x + pt.vx * DT, r.x0, r.x1);
      pt.y = clamp(pt.y + pt.vy * DT, r.y0, r.y1);
      const pm = getPet();
      if (pm && petMood() === 'hungry' && st.t > petWarnAt && Math.hypot(st.x - pt.x, st.y - pt.y) < 320) {
        petWarnAt = st.t + 300;
        speak('pet.hungry', { name: pm.name });
      }
    }

    // Entdecker-Sterne
""", 1)
    # Haustier im Render (vor fx.update)
    s = s.replace("    if (plot) {\n      const inh = isBuilt('fundament')", """    if (pt.fig) {
      const moving = Math.hypot(pt.vx, pt.vy) > 5;
      pt.fig.group.position.set(pt.x * S, heightAt(pt.x, pt.y) + (isBuilt('boden') ? 0.45 : 0) + (moving ? Math.abs(Math.sin(timeSec * 12)) * 0.1 : 0), pt.y * S);
      if (Math.abs(pt.vx) > 3) pt.fig.mesh.scale.x = pt.vx < 0 ? -1 : 1;
      v3.set(pt.x * S, pt.fig.group.position.y + (PET_H[pt.kind] ?? 1) + 0.3, pt.y * S);
      const pp = stage.project(v3);
      const hungry = petMood() === 'hungry';
      petMark.style.display = hungry && !houseRoofCovers() ? '' : 'none';
      petMark.style.transform = `translate(${pp.x}px, ${pp.y + Math.sin(timeSec * 4) * 4}px) translate(-50%, -100%)`;
    }
    if (plot) {
      const inh = isBuilt('fundament')""", 1)
    s = s.replace("  /* ── Darstellung ── */", "  /* ── Darstellung ── */\n  const houseRoofCovers = () => isBuilt('dach') && !houseInside;", 1)
    return s


sub('src/world/worldScreen.ts', ws)
print('ok')
