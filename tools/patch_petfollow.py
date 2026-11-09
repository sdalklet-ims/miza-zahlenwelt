# Einmaliges Hilfsskript: Haustier kann mitkommen (folgt Mias Spur), Hunger kommt schneller.
import json


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


sub('src/core/progress.ts', lambda s: s.replace("stock: Record<string, number>; fed: number } | null;", "stock: Record<string, number>; fed: number; follow?: boolean } | null;"))
sub('src/core/pet.ts', lambda s: s.replace("const DECAY_PER_MIN = 0.7;", "const DECAY_PER_MIN = 2.2;").replace("(100 → 0 in etwa zweieinhalb Stunden)", "(100 → 0 in etwa 45 Minuten)") + """
/** Haustier mitnehmen (folgt Mia) oder zuhause lassen */
export function setFollow(on: boolean) {
  mutate((p) => void (p.pet && (p.pet.follow = on)));
}
""")

j = json.load(open('content/pets.json', encoding='utf-8'))
j['texts']['pet.follow.on'] = ['mia', '{name} kommt mit! Aber den Hunger nicht vergessen.']
j['texts']['pet.follow.off'] = ['mia', '{name} bleibt zuhause und wartet auf mich.']
json.dump(j, open('content/pets.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)


def pui(s):
    s = s.replace("import { feed, foods, fullness, kindById, mood, pet, stock } from '../core/pet';", "import { feed, foods, fullness, kindById, mood, pet, stock, setFollow } from '../core/pet';")
    s = s.replace("        h('small', { class: 'pet-hint' },", "        h('button', { class: 'btn ' + (p.follow ? 'ghost' : 'sky') + ' pet-follow', onclick: () => { setFollow(!p.follow); sfx.pop(); speak(!p.follow ? 'pet.follow.on' : 'pet.follow.off', { name: p.name }); } }, p.follow ? '🏠 Zuhause lassen' : '🦮 Mitnehmen'),\n        h('small', { class: 'pet-hint' },", 1)
    return s


sub('src/ui/petUi.ts', pui)


def ws(s):
    s = s.replace("  const pt = { x: plot?.x ?? 0,", "  const trail: { x: number; y: number }[] = [];\n  let lastTrail = { x: 0, y: 0 };\n  const pt = { x: plot?.x ?? 0,", 1)
    # Spur von Mia
    s = s.replace("      collide();\n      const spd = Math.hypot(st.vx, st.vy);", "      collide();\n      if (Math.hypot(st.x - lastTrail.x, st.y - lastTrail.y) > 12) { trail.push({ x: st.x, y: st.y }); lastTrail = { x: st.x, y: st.y }; if (trail.length > 60) trail.shift(); }\n      const spd = Math.hypot(st.vx, st.vy);", 1)
    a = s.index("      const indoor = isBuilt('boden') && isBuilt('waende');")
    b = s.index("      const pm = getPet();")
    old = s[a:b]
    new = """      if (getPet()?.follow) {
        // Haustier folgt Mias Spur (so läuft es durch Türen statt durch Wände)
        const tg = trail.length > 7 ? trail[trail.length - 7] : { x: st.x - 40, y: st.y + 20 };
        const dx = tg.x - pt.x, dy = tg.y - pt.y, dd = Math.hypot(dx, dy), dm = Math.hypot(st.x - pt.x, st.y - pt.y);
        if (dm > 800) { pt.x = tg.x; pt.y = tg.y; pt.vx = pt.vy = 0; }
        else if (dd > 12 && dm > 75) { const sp = Math.min(300, 60 + dd * 3); pt.vx = (dx / dd) * sp; pt.vy = (dy / dd) * sp; }
        else pt.vx = pt.vy = 0;
        pt.x += pt.vx * DT; pt.y += pt.vy * DT;
      } else {
""" + "".join("  " + ln + "\n" if ln else "\n" for ln in old.rstrip("\n").split("\n")) + "      }\n"
    s = s[:a] + new + s[b:]
    # Rendering: Höhe nur im Haus, Markierung nur wenn nicht vom Dach verdeckt
    s = s.replace("pt.fig.group.position.set(pt.x * S, heightAt(pt.x, pt.y) + (isBuilt('boden') ? 0.45 : 0) + (moving ? Math.abs(Math.sin(timeSec * 12)) * 0.1 : 0), pt.y * S);",
                  "const petIn = !!plot && isBuilt('boden') && Math.abs(pt.x - plot.x) < IN_X && pt.y > plot.y - IN_Y && pt.y < plot.y + IN_Y;\n      pt.fig.group.position.set(pt.x * S, heightAt(pt.x, pt.y) + (petIn ? 0.45 : 0) + (moving ? Math.abs(Math.sin(timeSec * 12)) * 0.1 : 0), pt.y * S);")
    s = s.replace("petMark.style.display = hungry && !houseRoofCovers() ? '' : 'none';", "petMark.style.display = hungry && !(petIn && houseRoofCovers()) ? '' : 'none';")
    s = s.replace("const DT = 1 / 60;", "const DT = 1 / 60;\nconst IN_X = 230, IN_Y = 135; // Innenraum des Hauses (Pixel, halbe Breite/Tiefe)", 1)
    s = s.replace("Math.abs(st.x - plot.x) < 160 && st.y > plot.y - 125 && st.y < plot.y + 125 && isBuilt('waende')", "Math.abs(st.x - plot.x) < IN_X && st.y > plot.y - IN_Y && st.y < plot.y + IN_Y && isBuilt('waende')")
    return s


sub('src/world/worldScreen.ts', ws)
print('ok')
