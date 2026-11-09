# Einmaliges Hilfsskript: Haus breiter (halbe Breite 3,5 → 4,5), Einrichtung und Garten neu verteilt.
misses = []
cache = {}


def rep(path, old, new, all_=False):
    s = cache.get(path)
    if s is None:
        s = open(path, encoding='utf-8').read()
    if old not in s:
        misses.append((path, old[:70]))
        cache[path] = s
        return
    cache[path] = s.replace(old, new) if all_ else s.replace(old, new, 1)


H = 'src/world3d/house.ts'
E = 'src/world3d/houseExtra.ts'
W = 'src/world/worldScreen.ts'

# ---- house.ts: Hülle ----
rep(H, "HW = 3.5", "HW = 4.5")
rep(H, "box(7.7, 0.35, 6.3, STONE)", "box(9.7, 0.35, 6.3, STONE)")
rep(H, "for (let i = 0; i < 12; i++) g.add(at(box(0.5, 0.1, 0.34, i % 2 ? '#b4b0a6' : '#8a867c'), -3.5 + i * 0.64, 0.4, 3.1));", "for (let i = 0; i < 15; i++) g.add(at(box(0.5, 0.1, 0.34, i % 2 ? '#b4b0a6' : '#8a867c'), -4.5 + i * 0.64, 0.4, 3.1));")
rep(H, "new THREE.BoxGeometry(6.9, 0.1, 5.5)", "new THREE.BoxGeometry(8.9, 0.1, 5.5)")
rep(H, "wall(7, WH, 0.2, 0, Y0 + WH / 2 + 0.05, -2.7), wall(0.2, WH, 5.6, -3.4, Y0 + WH / 2 + 0.05, 0), wall(0.2, WH, 5.6, 3.4, Y0 + WH / 2 + 0.05, 0)", "wall(9, WH, 0.2, 0, Y0 + WH / 2 + 0.05, -2.7), wall(0.2, WH, 5.6, -4.4, Y0 + WH / 2 + 0.05, 0), wall(0.2, WH, 5.6, 4.4, Y0 + WH / 2 + 0.05, 0)")
rep(H, "wall(2.75, WH, 0.2, -2.125, Y0 + WH / 2 + 0.05, 2.7), wall(2.75, WH, 0.2, 2.125, Y0 + WH / 2 + 0.05, 2.7)", "wall(3.75, WH, 0.2, -2.625, Y0 + WH / 2 + 0.05, 2.7), wall(3.75, WH, 0.2, 2.625, Y0 + WH / 2 + 0.05, 2.7)")
rep(H, "box(7.2, 0.18, 0.2, WOOD_D), 0, Y0 + WH + 0.0", "box(9.2, 0.18, 0.2, WOOD_D), 0, Y0 + WH + 0.0")
rep(H, "windowAt(sx * 2.2, Y0 + 1.8, 2.76, 0)", "windowAt(sx * 2.7, Y0 + 1.8, 2.76, 0)")
rep(H, "windowAt(sx * 3.46, Y0 + 1.8, 0, Math.PI / 2)", "windowAt(sx * 4.46, Y0 + 1.8, 0, Math.PI / 2)")
# Schornstein
s = open(H, encoding='utf-8').read() if H not in cache else cache[H]
a = s.index("    schornstein: () => {")
b = s.index("    treppe: () => {")
s = s[:a] + s[a:b].replace("2.3,", "3.0,") + s[b:]
cache[H] = s
rep(H, "new THREE.Vector3(2.3, Y0 + 6.1, -0.6)", "new THREE.Vector3(3.0, Y0 + 6.1, -0.6)")
# Veranda, Blumenkästen
rep(H, "box(5.4, 0.16, 2.0, WOOD)", "box(6.4, 0.16, 2.0, WOOD)")
rep(H, "sx * 2.5, Y0 + 1.45, 4.7", "sx * 3.0, Y0 + 1.45, 4.7")
rep(H, "sx * 2.5, Y0 + 0.3, 4.7", "sx * 3.0, Y0 + 0.3, 4.7")
rep(H, "BoxGeometry(5.8, 0.14, 2.3)", "BoxGeometry(6.8, 0.14, 2.3)")
rep(H, "sx * 2.2, Y0 + 1.0, 2.95", "sx * 2.7, Y0 + 1.0, 2.95")
rep(H, "sx * 2.2, 0, 2.95", "sx * 2.7, 0, 2.95")
# Garten
rep(H, "const XL = 6.6, Z0 = -5.0, Z1 = 6.8, GAP = 1.1;", "const XL = 7.6, Z0 = -5.0, Z1 = 6.8, GAP = 1.1;")
rep(H, "g.position.set(5.2, 0, 0.8);", "g.position.set(6.4, 0, 0.8);")
rep(H, "g.position.set(-5.3, 0, -3.6);", "g.position.set(-6.3, 0, -3.6);")
rep(H, "g.position.set(5.4, 0, -3.8);", "g.position.set(6.4, 0, -3.8);")
rep(H, "g.position.set(-4.9, 0, 3.6);", "g.position.set(-5.8, 0, 4.2);")
rep(H, "g.position.set(5.4, 0, -1.2);", "g.position.set(6.4, 0, -1.8);")
rep(H, "g.position.set(-5.4, 0, -0.6);", "g.position.set(-6.4, 0, -1.6);")
rep(H, "g.position.set(4.9, 0, 3.6);", "g.position.set(5.9, 0, 3.6);")
# Innen
rep(H, "g.position.set(-2.5, Y0 + 0.1, -1.7);", "g.position.set(-3.3, Y0 + 0.1, -1.5);")
rep(H, "g.position.set(1.9, Y0 + 0.1, -1.3);", "g.position.set(2.6, Y0 + 0.1, -1.3);")
rep(H, "g.position.set(-0.4, Y0 + 0.1, -2.05);", "g.position.set(-0.6, Y0 + 0.1, -2.05);")
rep(H, "g.position.set(-3.05, Y0 + 0.1, 0.5);", "g.position.set(-4.05, Y0 + 0.1, 0.5);")
rep(H, "g.position.set(2.9, Y0 + 0.1, -2.2);", "g.position.set(4.1, Y0 + 0.1, -2.3);")
rep(H, "g.position.set(3.0, Y0 + 0.1, 1.8);", "g.position.set(4.0, Y0 + 0.1, 1.8);")
rep(H, "g.position.set(-2.7, Y0 + 0.1, -0.4);", "g.position.set(-3.4, Y0 + 0.1, -0.4);")
rep(H, "g.position.set(3.0, Y0 + 0.1, 0.4);", "g.position.set(4.0, Y0 + 0.1, 0.4);")
# Kollisionen
rep(H, "rect(-3.5, -2.8, 7, 0.2); rect(-3.5, -2.8, 0.2, 5.6); rect(3.3, -2.8, 0.2, 5.6); rect(-3.5, 2.6, 2.75, 0.2); rect(0.75, 2.6, 2.75, 0.2);", "rect(-4.5, -2.8, 9, 0.2); rect(-4.5, -2.8, 0.2, 5.6); rect(4.3, -2.8, 0.2, 5.6); rect(-4.5, 2.6, 3.75, 0.2); rect(0.75, 2.6, 3.75, 0.2);")
rep(H, "x: cx + sx * 2.5 * U, y: cy + 4.7 * U", "x: cx + sx * 3.0 * U, y: cy + 4.7 * U")
rep(H, "rect(-6.7, -5.05, 13.4, 0.2); rect(-6.7, -5.05, 0.2, 11.9); rect(6.5, -5.05, 0.2, 11.9);", "rect(-7.7, -5.05, 15.4, 0.2); rect(-7.7, -5.05, 0.2, 11.9); rect(7.5, -5.05, 0.2, 11.9);")
rep(H, "rect(-6.7, 6.7, 5.6, 0.2); rect(1.1, 6.7, 5.6, 0.2);", "rect(-7.7, 6.7, 6.6, 0.2); rect(1.1, 6.7, 6.6, 0.2);")
rep(H, "x: cx - 5.3 * U, y: cy - 3.6 * U", "x: cx - 6.3 * U, y: cy - 3.6 * U")
rep(H, "x: cx + 5.4 * U, y: cy - 3.8 * U", "x: cx + 6.4 * U, y: cy - 3.8 * U")
rep(H, "for (const z of [-2.2, -0.2]) solids.push({ x: cx + 5.4 * U", "for (const z of [-2.8, -0.8]) solids.push({ x: cx + 6.4 * U")
rep(H, "x: cx + 5.2 * U, y: cy + 0.8 * U", "x: cx + 6.4 * U, y: cy + 0.8 * U")
rep(H, "x: cx + 4.9 * U, y: cy + 3.6 * U", "x: cx + 5.9 * U, y: cy + 3.6 * U")
rep(H, "x: cx - 4.9 * U, y: cy + 3.6 * U", "x: cx - 5.8 * U, y: cy + 4.2 * U")
rep(H, "x: cx - 5.4 * U, y: cy - 0.6 * U", "x: cx - 6.4 * U, y: cy - 1.6 * U")
rep(H, "x: cx + 3.6 * U, y: cy - 4.1 * U", "x: cx + 4.6 * U, y: cy - 4.1 * U")
rep(H, "rect(-3.2 - 1.0, -4.0 - 1.0, 2.0, 2.0)", "rect(-4.2 - 1.0, -4.0 - 1.0, 2.0, 2.0)")
rep(H, "rect(-4.9 - 1.1, 5.9 - 0.85, 2.2, 1.7)", "rect(-5.9 - 1.1, 5.9 - 0.85, 2.2, 1.7)")
rep(H, "x: cx - 4.2 * U, y: cy + 1.5 * U", "x: cx - 6.0 * U, y: cy + 1.2 * U")
rep(H, "x: cx + 5.6 * U, y: cy + 5.9 * U", "x: cx + 6.6 * U, y: cy + 5.9 * U")

# ---- houseExtra.ts ----
rep(E, "g.position.set(3.6, 0, -4.1);", "g.position.set(4.6, 0, -4.1);")
rep(E, "g.position.set(-3.2, 0, -4.0);", "g.position.set(-4.2, 0, -4.0);")
rep(E, "g.position.set(-4.9, 0, 5.9);", "g.position.set(-5.9, 0, 5.9);")
rep(E, "g.position.set(-4.2, 0, 1.5);", "g.position.set(-6.0, 0, 1.2);")
rep(E, "g.position.set(5.6, 0, 5.9);", "g.position.set(6.6, 0, 5.9);")
rep(E, "const XL = 6.6, Z0 = -5.0, Z1 = 6.8;", "const XL = 7.6, Z0 = -5.0, Z1 = 6.8;")
rep(E, "g.position.set(-2.2, Y0 + 0.1, 1.45);", "g.position.set(-3.1, Y0 + 0.1, 1.45);")
rep(E, "g.position.set(2.0, Y0 + 0.1, -2.25);", "g.position.set(3.0, Y0 + 0.1, -2.25);")
rep(E, "g.position.set(2.0, Y0 + 0.1, 1.9);", "g.position.set(3.0, Y0 + 0.1, 1.9);")
rep(E, "g.position.set(3.3, Y0 + 1.7, -1.3);", "g.position.set(4.3, Y0 + 1.7, -1.3);")
rep(E, "g.position.set(3.0, Y0 + 2.06, 0.2);", "g.position.set(4.0, Y0 + 2.06, 0.2);")
rep(E, "g.position.set(-3.05, Y0 + 2.62, 0.7);", "g.position.set(-4.05, Y0 + 2.62, 0.7);")
rep(E, "g.position.set(-3.28, Y0 + 1.7, -1.7);", "g.position.set(-4.28, Y0 + 1.7, -1.7);")
rep(E, "g.position.set(-2.7, Y0 + 0.1, -2.2);", "g.position.set(-3.6, Y0 + 0.1, -2.3);")
rep(E, "sx * 2.2 + dx, Y0 + 1.75, 2.55", "sx * 2.7 + dx, Y0 + 1.75, 2.55")
rep(E, "box(6.0, 0.05, 0.05, '#7a4d26'), 0, Y0 + 2.55, 2.55", "box(7.4, 0.05, 0.05, '#7a4d26'), 0, Y0 + 2.55, 2.55")
rep(E, "-1.0, 0.95, -1.75", "-1.5, 0.95, -1.75")
rep(E, "0.2, 0.93, -1.75", "0.3, 0.93, -1.75")

# ---- worldScreen.ts ----
rep(W, "x: plot.x - 152, y: plot.y + 35, r: 140", "x: plot.x - 202, y: plot.y + 35, r: 140")
rep(W, "x: plot.x - 110, y: plot.y + 72, r: 110", "x: plot.x - 155, y: plot.y + 72, r: 110")
rep(W, "st.x = plot.x - 110; st.y = plot.y + 72;", "st.x = plot.x - 155; st.y = plot.y + 72;")
rep(W, "fx.add((plot.x - 152) * S, 3.2,", "fx.add((plot.x - 202) * S, 3.2,")
rep(W, "x0: plot.x - 120, x1: plot.x + 120, y0: plot.y - 60, y1: plot.y + 80", "x0: plot.x - 190, x1: plot.x + 190, y0: plot.y - 60, y1: plot.y + 80")

# ---- Marker, Weltgröße um den Bauplatz ----
rep('src/world3d/models.ts', "const hx = 3.9, hz = 3.2;", "const hx = 5.0, hz = 3.2;")
rep('src/world/world.ts', "keep.push({ x: PLOT.x, y: PLOT.y, r: 430 });", "keep.push({ x: PLOT.x, y: PLOT.y, r: 480 });")
rep('src/world/terrain.ts', "smooth(430, 640, Math.hypot(x - PLOT.x, y - PLOT.y))", "smooth(480, 700, Math.hypot(x - PLOT.x, y - PLOT.y))")
rep('src/world3d/decor.ts', "Math.abs(x - PLOT.x) < 380", "Math.abs(x - PLOT.x) < 450")

for p, s in cache.items():
    open(p, 'w', encoding='utf-8').write(s)
print('fertig, nicht gefunden:', len(misses))
for m in misses:
    print(' -', m)
