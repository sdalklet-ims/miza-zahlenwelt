# Einmaliges Hilfsskript: Haus noch breiter (halbe Breite 5,5), Regal/Kamin/Aquarium... an die Rückwand, Seitenwände niedrig beim Hineingehen.
import re

misses = []
cache = {}


def get(p):
    if p not in cache:
        cache[p] = open(p, encoding='utf-8').read()
    return cache[p]


def rep(p, old, new):
    s = get(p)
    if old not in s:
        misses.append((p, old[:80]))
        return
    cache[p] = s.replace(old, new, 1)


def block_edit(p, bid, fn):
    s = get(p)
    start = s.find(f"    {bid}: () => {{")
    if start < 0:
        misses.append((p, 'Block ' + bid))
        return
    end = s.index("\n    },\n", start) + len("\n    },\n")
    cache[p] = s[:start] + fn(s[start:end]) + s[end:]


def set_pos(p, bid, pos, rot_y=None):
    def f(b):
        b2 = re.sub(r"(\w+)\.position\.set\([^;]*\);", lambda m: f"{m.group(1)}.position.set({pos});", b, count=1)
        if b2 == b:
            misses.append((p, 'position in ' + bid))
        if rot_y is not None:
            b2 = b2.replace("\n      return g;", f"\n      g.rotation.y = {rot_y};\n      return g;", 1)
        return b2
    block_edit(p, bid, f)


H = 'src/world3d/house.ts'
E = 'src/world3d/houseExtra.ts'
W = 'src/world/worldScreen.ts'

# ---------- Hülle ----------
rep(H, "HW = 4.5", "HW = 5.5")
rep(H, "box(9.7, 0.35, 6.3, STONE)", "box(11.7, 0.35, 6.3, STONE)")
rep(H, "for (let i = 0; i < 15; i++)", "for (let i = 0; i < 18; i++)")
rep(H, "-4.5 + i * 0.64, 0.4, 3.1", "-5.5 + i * 0.64, 0.4, 3.1")
rep(H, "new THREE.BoxGeometry(8.9, 0.1, 5.5)", "new THREE.BoxGeometry(10.9, 0.1, 5.5)")

NEW_WAENDE = """    waende: () => {
      const g = new THREE.Group();
      // Seitenwände und vordere Pfosten werden beim Hineingehen niedrig (userData.lowerInside), damit man die Möbel sieht
      const low = <T extends THREE.Object3D>(o: T, h: number) => { o.userData.lowerInside = true; o.userData.baseY = o.position.y; o.userData.h = h; return o; };
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const post = at(box(0.28, WH + 0.1, 0.28, WOOD), sx * HW, Y0 + WH / 2 + 0.05, sz * HD);
        g.add(sz === 1 || true ? low(post, WH + 0.1) : post);
      }
      g.add(wall(11, WH, 0.2, 0, Y0 + WH / 2 + 0.05, -2.7));
      g.add(low(wall(0.2, WH, 5.6, -5.4, Y0 + WH / 2 + 0.05, 0), WH), low(wall(0.2, WH, 5.6, 5.4, Y0 + WH / 2 + 0.05, 0), WH));
      const front = new THREE.Group();
      front.userData.hideInside = true;
      front.add(wall(4.75, WH, 0.2, -3.125, Y0 + WH / 2 + 0.05, 2.7), wall(4.75, WH, 0.2, 3.125, Y0 + WH / 2 + 0.05, 2.7), wall(1.5, 0.75, 0.2, 0, Y0 + WH - 0.325 + 0.05, 2.7));
      g.add(front);
      g.add(at(box(11.2, 0.18, 0.2, WOOD_D), 0, Y0 + WH, -HD));
      const fb = at(box(11.2, 0.18, 0.2, WOOD_D), 0, Y0 + WH, HD);
      fb.userData.hideInside = true;
      g.add(fb);
      for (const sx of [-1, 1]) { const sb = at(box(0.2, 0.18, 5.6, WOOD_D), sx * HW, Y0 + WH, 0); sb.userData.hideInside = true; g.add(sb); }
      return g;
    },
"""
block_edit(H, 'waende', lambda b: NEW_WAENDE)
rep(H, "windowAt(sx * 2.7, Y0 + 1.8, 2.76, 0)", "windowAt(sx * 3.2, Y0 + 1.8, 2.76, 0)")
rep(H, "for (const sx of [-1, 1]) g.add(windowAt(sx * 4.46, Y0 + 1.8, 0, Math.PI / 2));", "for (const sx of [-1, 1]) { const sw = windowAt(sx * 5.46, Y0 + 1.8, 0, Math.PI / 2); sw.userData.hideInside = true; g.add(sw); }")
s = get(H)
a = s.index("    schornstein: () => {")
b = s.index("    treppe: () => {")
cache[H] = s[:a] + s[a:b].replace("3.0,", "4.0,") + s[b:]
rep(H, "new THREE.Vector3(3.0, Y0 + 6.1, -0.6)", "new THREE.Vector3(4.0, Y0 + 6.1, -0.6)")
rep(H, "box(6.4, 0.16, 2.0, WOOD)", "box(7.4, 0.16, 2.0, WOOD)")
rep(H, "sx * 3.0, Y0 + 1.45, 4.7", "sx * 3.5, Y0 + 1.45, 4.7")
rep(H, "sx * 3.0, Y0 + 0.3, 4.7", "sx * 3.5, Y0 + 0.3, 4.7")
rep(H, "BoxGeometry(6.8, 0.14, 2.3)", "BoxGeometry(7.8, 0.14, 2.3)")
rep(H, "sx * 2.7, Y0 + 1.0, 2.95", "sx * 3.2, Y0 + 1.0, 2.95")
rep(H, "sx * 2.7, 0, 2.95", "sx * 3.2, 0, 2.95")
rep(H, "const XL = 7.6, Z0 = -5.0, Z1 = 6.8, GAP = 1.1;", "const XL = 8.8, Z0 = -5.0, Z1 = 6.8, GAP = 1.1;")
rep(H, "g.position.set(6.4, 0, 0.8);", "g.position.set(7.6, 0, 0.8);")
rep(H, "g.position.set(-6.3, 0, -3.6);", "g.position.set(-7.5, 0, -3.6);")
rep(H, "g.position.set(6.4, 0, -3.8);", "g.position.set(7.6, 0, -3.8);")
rep(H, "g.position.set(-5.8, 0, 4.2);", "g.position.set(-7.0, 0, 4.2);")
rep(H, "g.position.set(6.4, 0, -1.8);", "g.position.set(7.6, 0, -1.8);")
rep(H, "g.position.set(-6.4, 0, -1.6);", "g.position.set(-7.6, 0, -1.6);")
rep(H, "g.position.set(5.9, 0, 3.6);", "g.position.set(7.0, 0, 3.6);")
rep(H, "sx * 2.7 + dx, Y0 + 1.75, 2.55", "sx * 3.2 + dx, Y0 + 1.75, 2.55")
rep(H, "box(7.4, 0.05, 0.05, '#7a4d26'), 0, Y0 + 2.55, 2.55", "box(8.4, 0.05, 0.05, '#7a4d26'), 0, Y0 + 2.55, 2.55")
# Innen (Rückwand-Reihe)
set_pos(H, 'korb', "-4.4, Y0 + 0.1, -0.8")
set_pos(H, 'tisch', "3.0, Y0 + 0.1, -0.7")
set_pos(H, 'sofa', "0.2, Y0 + 0.1, -2.05")
set_pos(H, 'regal', "-2.5, Y0 + 0.1, -2.45", "-Math.PI / 2")
set_pos(H, 'lampe', "5.0, Y0 + 0.1, -0.9")
set_pos(H, 'pflanze', "5.0, Y0 + 0.1, 1.0")
set_pos(H, 'napf', "-3.3, Y0 + 0.1, -0.2")
set_pos(H, 'kamin', "2.6, Y0 + 0.1, -2.45", "-Math.PI / 2")
# Kollisionen
rep(H, "rect(-4.5, -2.8, 9, 0.2); rect(-4.5, -2.8, 0.2, 5.6); rect(4.3, -2.8, 0.2, 5.6); rect(-4.5, 2.6, 3.75, 0.2); rect(0.75, 2.6, 3.75, 0.2);", "rect(-5.5, -2.8, 11, 0.2); rect(-5.5, -2.8, 0.2, 5.6); rect(5.3, -2.8, 0.2, 5.6); rect(-5.5, 2.6, 4.75, 0.2); rect(0.75, 2.6, 4.75, 0.2);")
rep(H, "x: cx + sx * 3.0 * U, y: cy + 4.7 * U", "x: cx + sx * 3.5 * U, y: cy + 4.7 * U")
rep(H, "rect(-7.7, -5.05, 15.4, 0.2); rect(-7.7, -5.05, 0.2, 11.9); rect(7.5, -5.05, 0.2, 11.9);", "rect(-8.9, -5.05, 17.8, 0.2); rect(-8.9, -5.05, 0.2, 11.9); rect(8.7, -5.05, 0.2, 11.9);")
rep(H, "rect(-7.7, 6.7, 6.6, 0.2); rect(1.1, 6.7, 6.6, 0.2);", "rect(-8.9, 6.7, 7.8, 0.2); rect(1.1, 6.7, 7.8, 0.2);")
rep(H, "x: cx - 6.3 * U, y: cy - 3.6 * U", "x: cx - 7.5 * U, y: cy - 3.6 * U")
rep(H, "x: cx + 6.4 * U, y: cy - 3.8 * U", "x: cx + 7.6 * U, y: cy - 3.8 * U")
rep(H, "solids.push({ x: cx + 6.4 * U", "solids.push({ x: cx + 7.6 * U")
rep(H, "x: cx + 6.4 * U, y: cy + 0.8 * U", "x: cx + 7.6 * U, y: cy + 0.8 * U")
rep(H, "x: cx + 5.9 * U, y: cy + 3.6 * U", "x: cx + 7.0 * U, y: cy + 3.6 * U")
rep(H, "x: cx - 5.8 * U, y: cy + 4.2 * U", "x: cx - 7.0 * U, y: cy + 4.2 * U")
rep(H, "x: cx - 6.4 * U, y: cy - 1.6 * U", "x: cx - 7.6 * U, y: cy - 1.6 * U")
rep(H, "x: cx + 4.6 * U, y: cy - 4.1 * U", "x: cx + 5.6 * U, y: cy - 4.1 * U")
rep(H, "rect(-4.2 - 1.0, -4.0 - 1.0, 2.0, 2.0)", "rect(-5.2 - 1.0, -4.0 - 1.0, 2.0, 2.0)")
rep(H, "rect(-5.9 - 1.1, 5.9 - 0.85, 2.2, 1.7)", "rect(-7.0 - 1.1, 5.9 - 0.85, 2.2, 1.7)")
rep(H, "x: cx - 6.0 * U, y: cy + 1.2 * U", "x: cx - 7.2 * U, y: cy + 1.2 * U")
rep(H, "x: cx + 6.6 * U, y: cy + 5.9 * U", "x: cx + 7.8 * U, y: cy + 5.9 * U")
# Innenansicht: niedrige Seitenwände
rep(H, "        o.traverse((ch) => { if (ch !== o && ch.userData.hideInside) ch.visible = !v; });",
    """        o.traverse((ch) => {
          if (ch === o) return;
          if (ch.userData.hideInside) ch.visible = !v;
          if (ch.userData.lowerInside) {
            const k = v ? 0.28 : 1, hh = ch.userData.h as number;
            ch.scale.y = k;
            ch.position.y = (ch.userData.baseY as number) - hh / 2 + (hh * k) / 2;
          }
        });""")

# ---------- houseExtra.ts ----------
rep(E, "g.position.set(4.6, 0, -4.1);", "g.position.set(5.6, 0, -4.1);")
rep(E, "g.position.set(-4.2, 0, -4.0);", "g.position.set(-5.2, 0, -4.0);")
rep(E, "g.position.set(-5.9, 0, 5.9);", "g.position.set(-7.0, 0, 5.9);")
rep(E, "g.position.set(-6.0, 0, 1.2);", "g.position.set(-7.2, 0, 1.2);")
rep(E, "g.position.set(6.6, 0, 5.9);", "g.position.set(7.8, 0, 5.9);")
rep(E, "const XL = 7.6, Z0 = -5.0, Z1 = 6.8;", "const XL = 8.8, Z0 = -5.0, Z1 = 6.8;")
set_pos(E, 'bett', "-4.0, Y0 + 0.1, 1.2")
set_pos(E, 'schreibtisch', "4.5, Y0 + 0.1, -2.25")
set_pos(E, 'spielzeugkiste', "4.0, Y0 + 0.1, 1.9")
set_pos(E, 'wandregal', "4.5, Y0 + 1.95, -2.5", "-Math.PI / 2")
set_pos(E, 'kerzen', "2.95, Y0 + 2.06, -2.4", "-Math.PI / 2")
set_pos(E, 'radio', "-2.5, Y0 + 2.62, -2.4")
set_pos(E, 'aquarium', "-4.5, Y0 + 0.1, -2.3")
set_pos(E, 'uhr', "0.2, Y0 + 2.6, -2.58")
rep(E, "-1.5, 0.95, -1.75", "-0.7, 0.95, -1.75")
rep(E, "0.3, 0.93, -1.75", "1.1, 0.93, -1.75")
rep(E, "pic(-1.9, 1.0, 0.75", "pic(-0.7, 1.0, 0.75")
rep(E, "pic(1.6, 0.8, 0.8", "pic(1.1, 0.8, 0.8")
s = get(H)
a = s.index("    bild: () => {")
b = s.index("\n    },\n", a)
cache[H] = s[:a] + s[a:b].replace("Y0 + 2.0", "Y0 + 1.75") + s[b:]
NEW_SPIEGEL = """    spiegel: () => {
      const g = new THREE.Group();
      g.add(at(box(1.0, 1.3, 0.08, '#d9b45a'), 0, 0, 0), at(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), new THREE.MeshBasicMaterial({ color: '#d6f0ff' })), 0, 0, 0.05), at(box(0.1, 0.5, 0.01, '#ffffff'), -0.2, 0.2, 0.06));
      g.position.set(-4.5, Y0 + 2.35, -2.58);
      return g;
    },
"""
block_edit(E, 'spiegel', lambda b: NEW_SPIEGEL)

# ---------- worldScreen.ts ----------
rep(W, "x: plot.x - 202, y: plot.y + 35, r: 140", "x: plot.x - 125, y: plot.y - 120, r: 150")
rep(W, "x: plot.x - 155, y: plot.y + 72, r: 110", "x: plot.x - 200, y: plot.y + 60, r: 110")
rep(W, "st.x = plot.x - 155; st.y = plot.y + 72;", "st.x = plot.x - 200; st.y = plot.y + 60;")
rep(W, "fx.add((plot.x - 202) * S, 3.2, (plot.y + 35) * S,", "fx.add((plot.x - 125) * S, 3.2, (plot.y - 120) * S,")
rep(W, "const IN_X = 230, IN_Y = 135;", "const IN_X = 285, IN_Y = 135;")
rep(W, "x0: plot.x - 190, x1: plot.x + 190, y0: plot.y - 60, y1: plot.y + 80", "x0: plot.x - 250, x1: plot.x + 250, y0: plot.y - 50, y1: plot.y + 85")
rep(W, "if (inh !== houseInside) { houseInside = inh; house.setInside(inh); }", "if (inh !== houseInside) { houseInside = inh; house.setInside(inh); stage.setZoom(inh ? 11.5 : 15); }")
rep('src/world3d/models.ts', "const hx = 5.0, hz = 3.2;", "const hx = 6.2, hz = 3.2;")
rep('src/world/world.ts', "keep.push({ x: PLOT.x, y: PLOT.y, r: 480 });", "keep.push({ x: PLOT.x, y: PLOT.y, r: 560 });")
rep('src/world/terrain.ts', "smooth(480, 700, Math.hypot(x - PLOT.x, y - PLOT.y))", "smooth(560, 800, Math.hypot(x - PLOT.x, y - PLOT.y))")
rep('src/world3d/decor.ts', "Math.abs(x - PLOT.x) < 450", "Math.abs(x - PLOT.x) < 540")

# ---------- scene.ts: Zoom ----------
rep('src/world3d/scene.ts', "  tick(t: number): void;", "  tick(t: number): void;\n  /** Sichtbare Höhe in Einheiten (kleiner = näher heran); weicher Übergang */\n  setZoom(h: number): void;")
rep('src/world3d/scene.ts', "  const cam = { x: 0, y: 0, z: 0, init: false };", "  const cam = { x: 0, y: 0, z: 0, init: false };\n  let view = VIEW_H, viewTarget = VIEW_H;")
rep('src/world3d/scene.ts', "    tick(t) {", """    setZoom(hh) {
      viewTarget = hh;
    },
    tick(t) {
      if (Math.abs(view - viewTarget) > 0.002) {
        view += (viewTarget - view) * 0.07;
        camera.left = (-view * asp) / 2; camera.right = (view * asp) / 2; camera.top = view / 2; camera.bottom = -view / 2;
        camera.updateProjectionMatrix();
      }""")

for p, s in cache.items():
    open(p, 'w', encoding='utf-8').write(s)
print('fertig, nicht gefunden:', len(misses))
for m in misses:
    print(' -', m)
