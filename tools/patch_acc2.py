# Einmaliges Hilfsskript: Kleidung im Rucksack, Vorschau/Feier, Album nur noch für die Eule
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/ui/results.ts', [
    ("import type { RewardItem } from '../core/texts';", "import type { RewardItem } from '../core/texts';\nimport { dressedUrl } from '../world3d/miaAnim';"),
    ("  return it.target === 'eule' ? owlSvg([it.id]) : miaSvg([it.id], 'happy');", "  if (it.target === 'eule') return owlSvg([it.id]);\n  const u = dressedUrl([it.id], 'front_idle', 260); // neue Mia mit dem Teil; Rückfall auf die alte Zeichnung, solange die Bilder laden\n  return u ? `<img class=\"item-img\" src=\"${u}\" alt=\"\">` : miaSvg([it.id], 'happy');"),
    ("        title: 'Neu im Album!',", "        title: it.target === 'mia' ? 'Neu im Rucksack!' : 'Neu im Album!',"),
    ("      speak('common.album.new', { name: it.name });", "      speak(it.target === 'mia' ? 'common.pack.new' : 'common.album.new', { name: it.name });"),
])
ed('src/ui/album.ts', [
    ("const TARGETS = [\n  { id: 'mia', name: 'Mia' },\n  { id: 'eule', name: 'Eule Olga' },\n];", "// Mias Kleidung liegt im Rucksack; im Album gibt es noch die Sachen für Eule Olga\nconst TARGETS = [{ id: 'eule', name: 'Eule Olga' }];"),
    ("  let tab = 'mia';", "  let tab = 'eule';"),
])
ed('src/ui/backpack.ts', [
    ("import { onProgress } from '../core/progress';", "import { onProgress } from '../core/progress';\nimport { equippedFor, isUnlocked, items, toggleEquip } from '../core/rewards';\nimport { dressedUrl, loadMia, miaLoaded } from '../world3d/miaAnim';"),
    ("      h('small', { class: 'pet-hint' }, 'Im Rucksack ist alles, was Mia mitnimmt: Essen (tippen = essen), Haustierfutter und der Schirm gegen Regen.'));",
     """      h('div', { class: 'pack-clothes' },
        h('h4', {}, '👕 Kleidung'),
        h('div', { class: 'pack-grid' }, ...items.filter((i) => i.target === 'mia').map((it) => {
          const open = isUnlocked(it), on = equippedFor('mia').includes(it.id), u = dressedUrl([it.id], 'front_idle', 150);
          return h('button', { class: 'pack-item cloth' + (on ? ' on' : '') + (open ? '' : ' locked'), disabled: !open, onclick: () => {
            toggleEquip(it); sfx.pop();
            if (!on) speak(it.id === 'mia-regencape' ? 'mia.wear.cape' : 'mia.wear');
          } },
          u ? h('img', { src: u, alt: '' }) : h('span', { class: 'pk-icon' }, '👕'),
          h('b', {}, it.name),
          h('small', {}, open ? (on ? '✓ an – tippen zum Ausziehen' : 'tippen zum Anziehen') : `🔒 ab ${it.stars} ⭐`));
        }))),
      h('small', { class: 'pet-hint' }, 'Im Rucksack ist alles, was Mia mitnimmt: Essen (tippen = essen), Haustierfutter, Schirm und Kleidung. Mit dem Regencape bleibt Mia im Regen trocken.'));"""),
    ("  render();\n  const off1", "  if (!miaLoaded()) void loadMia().then(render);\n  render();\n  const off1"),
])
open('src/styles/polish.css', 'a', encoding='utf-8').write("""
/* Kleidung im Rucksack */
.pack-clothes h4 { margin: 6px 0 8px; font: 900 24px var(--font); }
.pack-item.cloth { width: 190px; } .pack-item.cloth img { height: 150px; width: auto; display: block; filter: drop-shadow(0 4px 3px rgba(0,0,0,.25)); }
.pack-item.cloth.on { background: #bfe6ff; } .pack-item.cloth.locked img { filter: grayscale(1) opacity(.45); }
.item-img { height: 260px; width: auto; display: block; margin: 0 auto; }
""")
w = json.load(open('content/weather.json', encoding='utf-8'))
w['texts']['mia.wear'] = ["mia", "Das steht mir gut!"]
w['texts']['mia.wear.cape'] = ["mia", "Mit dem Regencape bleibe ich im Regen trocken, und die Pfoten sind frei."]
json.dump(w, open('content/weather.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('ok')
