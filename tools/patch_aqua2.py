# Einmaliges Hilfsskript: Aquarium im Supermarkt, im Haus (Ansehen-Knopf, Hunger-Meldungen) und im 3D-Becken
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


open('src/world3d/aquaShared.ts', 'w', encoding='utf-8').write("""/** Gemeinsamer Zustand für das 3D-Becken im Haus: Farben der gekauften Fische (von der Welt gesetzt, vom Becken gelesen). */
export const aquaLook = { colors: [] as string[] };
""")

ed('src/world3d/houseExtra.ts', [
    ("import { box, cyl, cone, sph, mat, canvasTex, at, rot, toon } from './models';", "import { box, cyl, cone, sph, mat, canvasTex, at, rot, toon } from './models';\nimport { aquaLook } from './aquaShared';"),
    ("      const fish = [0, 1, 2].map((i) => { const f = new THREE.Group(); f.add(sph(0.09, ['#ff8c2a', '#ff5a8a', '#ffd23f'][i], 1.4, 1, 0.7, 8), at(cone(0.07, 0.12, ['#ff8c2a', '#ff5a8a', '#ffd23f'][i], 3), -0.14, 0, 0)); g.add(f); return f; });\n      anim.push((t) => fish.forEach((f, i) => { f.position.set(Math.sin(t * 0.6 + i * 2) * 0.5, 1.05 + i * 0.15, 0.05 * i); f.rotation.y = Math.cos(t * 0.6 + i * 2) > 0 ? 0 : Math.PI; }));",
     """      // Fische nur, wenn welche gekauft wurden (bis zu 6 sichtbar), in den Farben der gekauften Arten
      const fish = [0, 1, 2, 3, 4, 5].map((i) => { const f = new THREE.Group(); f.add(sph(0.09, '#ff8c2a', 1.4, 1, 0.7, 8), at(cone(0.07, 0.12, '#ff8c2a', 3), -0.14, 0, 0)); g.add(f); return f; });
      let looked = '';
      anim.push((t) => {
        const cols = aquaLook.colors, key = cols.join();
        if (key !== looked) { looked = key; fish.forEach((f, i) => { const c = cols[i % Math.max(1, cols.length)] ?? '#ff8c2a'; (f.children[0] as THREE.Mesh).material = mat(c); (f.children[1] as THREE.Mesh).material = mat(c); }); }
        fish.forEach((f, i) => { f.visible = i < cols.length; f.position.set(Math.sin(t * 0.6 + i * 1.7) * 0.5, 1.0 + (i % 3) * 0.14, 0.05 * (i % 3)); f.rotation.y = Math.cos(t * 0.6 + i * 1.7) > 0 ? 0 : Math.PI; });
      });"""),
])

# Supermarkt
ed('src/ui/supermarket.ts', [
    ("import { meals, addMeal, mealStock } from '../core/hunger';", "import { meals, addMeal, mealStock } from '../core/hunger';\nimport { MAX_AQUA, addAqua, addFishFood, aquaCount, aquaReady, aquaTotal, fishFood, fishFoods, species, speciesById } from '../core/aquarium';"),
    ("{ id: 'essen', name: 'Essen', icon: '🍎' }, { id: 'tier', name: 'Tierbedarf', icon: '🐾' }]", "{ id: 'essen', name: 'Essen', icon: '🍎' }, { id: 'aqua', name: 'Aquarium', icon: '🐠' }, { id: 'tier', name: 'Tierbedarf', icon: '🐾' }]"),
    ("    if (aisle === 'essen') {", """    if (aisle === 'aqua') {
      const ICON: Record<string, string> = { goldfisch: '🐠', guppy: '🐟', neon: '🐟', skalar: '🐡', kampffisch: '🐠', wels: '🐟', schnecke: '🐌', garnele: '🦐' };
      const inCart = [...cart.values()].filter((l) => l.key.startsWith('aq:')).reduce((a, l) => a + l.qty, 0);
      const full = aquaTotal() + inCart >= MAX_AQUA;
      for (const s of species) {
        const st = !aquaReady() ? 'locked' : full ? 'owned' : 'free';
        items.push(product(ICON[s.id] ?? '🐟', s.name, s.price, 'aq:' + s.id, st, !aquaReady() ? 'erst das Aquarium aufstellen' : full ? 'Becken ist voll' : `${s.blurb} · im Becken: ${aquaCount(s.id)}`, true));
      }
      for (const f of fishFoods) items.push(product(f.icon, f.name, f.price, 'ff:' + f.id, 'free', `${f.portions} Portion${f.portions > 1 ? 'en' : ''} · Vorrat: ${fishFood()}`, true));
    } else if (aisle === 'essen') {"""),
    ("l.key.startsWith('food:') || l.key.startsWith('meal:') ? h('span', { class: 'sm-qty' },", "l.key.startsWith('food:') || l.key.startsWith('meal:') || l.key.startsWith('aq:') || l.key.startsWith('ff:') ? h('span', { class: 'sm-qty' },"),
    ("    for (const l of cart.values()) if (l.key.startsWith('meal:')) addMeal(l.key.slice(5), l.qty);", """    for (const l of cart.values()) if (l.key.startsWith('meal:')) addMeal(l.key.slice(5), l.qty);
    for (const l of cart.values()) if (l.key.startsWith('ff:')) addFishFood((fishFoods.find((f) => f.id === l.key.slice(3))?.portions ?? 1) * l.qty);
    const aqLines = [...cart.values()].filter((l) => l.key.startsWith('aq:'));
    for (const l of aqLines) addAqua(l.key.slice(3), l.qty);
    if (aqLines.length) speak('aqua.new', { name: aqLines.length > 1 ? 'Die neuen Tiere' : speciesById(aqLines[0].key.slice(3)).name });"""),
])

# Welt: Ansehen-Knopf, Hunger-Meldungen, Marker, 3D-Farben
ed('src/world/worldScreen.ts', [
    ("import { openBadgeBook } from '../ui/badges';", "import { openBadgeBook } from '../ui/badges';\nimport { openAquarium } from '../ui/aquarium';\nimport { aquaColors, aquaHungry, fishFood } from '../core/aquarium';\nimport { aquaLook } from '../world3d/aquaShared';"),
    ("    if (hs.built.bett && !model.interacts.some((i) => i.id === 'bed'))", "    aquaLook.colors = aquaColors();\n    if (hs.built.aquarium && !model.interacts.some((i) => i.id === 'aquarium')) model.interacts.push({ id: 'aquarium', x: plot.x - 225, y: plot.y - 78, r: 120, label: 'Aquarium ansehen', icon: '🐠', run: () => openAquarium() });\n    if (hs.built.bett && !model.interacts.some((i) => i.id === 'bed'))"),
    ("let hungerTick = 3, lastHunger = hungerLevel(), lastSpd = 0, hungerSaid = 0;", "let hungerTick = 3, lastHunger = hungerLevel(), lastSpd = 0, hungerSaid = 0, aquaSaid = 0;\n  const aquaMark = h('div', { class: 'pet-mark mia-mark' }, '🐟🍽️');\n  labels.append(aquaMark);"),
    ("      const hasFood = meals.some((m) => mealStock(m.id) > 0);", "      if (aquaHungry() && st.t - aquaSaid > 160 && !frozen()) { // ab und zu: die Fische haben Hunger\n        aquaSaid = st.t;\n        speak(fishFood() > 0 ? 'aqua.hungry.food' : 'aqua.hungry');\n      }\n      const hasFood = meals.some((m) => mealStock(m.id) > 0);"),
    ("    shopTick?.(timeSec);", "    shopTick?.(timeSec);\n    if (plot) {\n      const showA = aquaHungry() && houseInside;\n      aquaMark.style.display = showA ? '' : 'none';\n      if (showA) {\n        v3.set((plot.x - 225) * S, heightAt(plot.x, plot.y) + 2.9, (plot.y - 115) * S);\n        const ap = stage.project(v3);\n        aquaMark.style.transform = `translate(${ap.x}px, ${ap.y + Math.sin(timeSec * 4) * 4}px) translate(-50%, -100%)`;\n      }\n    }"),
])
open('src/styles/polish.css', 'a', encoding='utf-8').write("""
/* Aquarium-Ansicht */
.aq { min-width: 880px; }
.aq-frame { border: 10px solid #8a5a2b; border-radius: 18px; background: #5a3a1c; box-shadow: 0 8px 0 rgba(0,0,0,.25), inset 0 0 0 4px #c98a4a; overflow: hidden; }
.aq-canvas { display: block; width: 100%; height: auto; touch-action: manipulation; }
.aq-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 14px; }
.aq-state { font: 800 22px var(--font); margin-bottom: 4px; } .aq-status { flex: 1; } .aq-status .pet-bar { height: 20px; }
.aq-feed { white-space: nowrap; }
.aq-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; } .aq-chip { padding: 4px 14px; border-radius: 999px; background: #fff; border: 3px solid #cfe9f5; font: 800 18px var(--font); } .aq-chip.empty { border-style: dashed; color: #6b5a44; }
""")
print('ok')
