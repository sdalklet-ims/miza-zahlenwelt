# Einmaliges Hilfsskript: house.ts auf den einfachen Rohbau umstellen und neue Deko-Teile einhängen.
p = 'src/world3d/house.ts'
s = open(p, encoding='utf-8').read()

# 1) Rohbau: geruest/boden/wand_*/dachgeruest/dach -> boden, waende, dach
a = s.index("    geruest: () => {")
b = s.index("    tuer: () => {")
new_core = """    boden: () => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.1, 5.5), toon({ map: floorTex }));
      m.position.set(0, Y0 + 0.05, 0);
      m.receiveShadow = true;
      return m;
    },
    waende: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.28, WH + 0.1, 0.28, WOOD), sx * HW, Y0 + WH / 2 + 0.05, sz * HD));
      g.add(wall(7, WH, 0.2, 0, Y0 + WH / 2 + 0.05, -2.7), wall(0.2, WH, 5.6, -3.4, Y0 + WH / 2 + 0.05, 0), wall(0.2, WH, 5.6, 3.4, Y0 + WH / 2 + 0.05, 0));
      const front = new THREE.Group();
      front.userData.hideInside = true;
      front.add(wall(2.75, WH, 0.2, -2.125, Y0 + WH / 2 + 0.05, 2.7), wall(2.75, WH, 0.2, 2.125, Y0 + WH / 2 + 0.05, 2.7), wall(1.5, 0.75, 0.2, 0, Y0 + WH - 0.325 + 0.05, 2.7));
      g.add(front);
      for (const sz of [-1, 1]) g.add(at(box(7.2, 0.18, 0.2, WOOD_D), 0, Y0 + WH + 0.0, sz * HD));
      for (const sx of [-1, 1]) g.add(at(box(0.2, 0.18, 5.6, WOOD_D), sx * HW, Y0 + WH + 0.0, 0));
      return g;
    },
    dach: () => {
      const g = new THREE.Group();
      const L = Math.hypot(HW + 0.4, ROOF_H), a = Math.atan2(ROOF_H, HW + 0.4), top = Y0 + WH + 0.05;
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.14, 6.5), roofMat);
        p.position.set(s * (HW + 0.4) / 2, top + ROOF_H / 2 + 0.1, 0);
        p.rotation.z = s * a;
        p.castShadow = p.receiveShadow = true;
        g.add(p);
      }
      const ridge = cyl(0.15, 0.15, 6.5, '#8a8a8a', 6);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.set(0, top + ROOF_H + 0.12, 0);
      g.add(ridge);
      const sh = new THREE.Shape([new THREE.Vector2(-HW - 0.2, 0), new THREE.Vector2(HW + 0.2, 0), new THREE.Vector2(0, ROOF_H)]);
      for (const z of [-2.7, 2.7]) {
        const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }), wallMat);
        gm.position.set(0, top, z - 0.09);
        gm.castShadow = true;
        g.add(gm);
      }
      return g;
    },
"""
s = s[:a] + new_core + s[b:]

# 2) Fenster: vorn + seite zusammen
a = s.index("    fenster_vorn: () => {")
b = s.index("    schornstein: () => {")
s = s[:a] + """    fenster: () => {
      const g = new THREE.Group();
      const front = new THREE.Group();
      front.userData.hideInside = true;
      for (const sx of [-1, 1]) front.add(windowAt(sx * 2.2, Y0 + 1.8, 2.76, 0));
      g.add(front);
      for (const sx of [-1, 1]) g.add(windowAt(sx * 3.46, Y0 + 1.8, 0, Math.PI / 2));
      return g;
    },
""" + s[b:]

# 3) Innen-Ansicht über userData statt fester Listen
s = s.replace("for (const id of ['dachgeruest', 'dach', 'schornstein', 'dachrinne', 'wimpel', 'wetterhahn', 'fahne', 'veranda']) flags[id] = { roof: true };",
              "for (const id of ['dach', 'schornstein', 'dachrinne', 'wimpel', 'wetterhahn', 'fahne', 'veranda', 'windspiel']) flags[id] = { roof: true };")
s = s.replace("for (const id of ['wand_vorn', 'tuer', 'fenster_vorn', 'blumenkasten', 'namensschild', 'katzentuer', 'vorhang']) flags[id] = { front: true };",
              "for (const id of ['tuer', 'blumenkasten', 'namensschild', 'hausnummer', 'kranz', 'katzentuer', 'vorhang']) flags[id] = { front: true };")
s = s.replace("""      for (const [id, o] of Object.entries(objs)) {
        const f = flags[id];
        o.visible = !!(group.userData.built?.[id] ?? true) && !(v && (f?.roof || f?.front));
      }""", """      for (const [id, o] of Object.entries(objs)) {
        const f = flags[id];
        o.visible = !!(group.userData.built?.[id] ?? true) && !(v && (f?.roof || f?.front));
        o.traverse((ch) => { if (ch !== o && ch.userData.hideInside) ch.visible = !v; });
      }""")

# 4) Kollisionen
a = s.index("      if (has('geruest')")
b = s.index("      if (has('veranda'))")
s = s[:a] + """      if (has('waende')) { rect(-3.5, -2.8, 7, 0.2); rect(-3.5, -2.8, 0.2, 5.6); rect(3.3, -2.8, 0.2, 5.6); rect(-3.5, 2.6, 2.75, 0.2); rect(0.75, 2.6, 2.75, 0.2); }
""" + s[b:]
s = s.replace("      if (has('blumenbeet'))", """      if (has('sonnenschirm')) solids.push({ x: cx + 3.6 * U, y: cy - 4.1 * U, r: 34 });
      if (has('hochbeet')) rect(1.0 - 1.15, -4.2 - 0.5, 2.3, 1.0);
      if (has('windrad')) solids.push({ x: cx - 1.2 * U, y: cy - 4.3 * U, r: 6 });
      if (has('sandkasten')) rect(-3.2 - 1.0, -4.0 - 1.0, 2.0, 2.0);
      if (has('gewaechshaus')) rect(-4.9 - 1.1, 5.9 - 0.85, 2.2, 1.7);
      if (has('feuerstelle')) solids.push({ x: cx - 4.2 * U, y: cy + 1.5 * U, r: 34 });
      if (has('schmetterling')) solids.push({ x: cx + 5.6 * U, y: cy + 5.9 * U, r: 26 });
      if (has('gartenzwerg')) solids.push({ x: cx - 0.95 * U, y: cy + 5.0 * U, r: 7 });
      if (has('blumenbeet'))""", 1)

# 5) Zusatz-Modelle einhängen
s = s.replace("import { parts } from '../core/house';", "import { parts } from '../core/house';\nimport { extraBuilders } from './houseExtra';")
s = s.replace("  function windowAt(", "  Object.assign(B, extraBuilders(anim));\n\n  function windowAt(", 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
