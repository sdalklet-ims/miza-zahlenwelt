# Einmaliges Hilfsskript: Mias Hunger, Essen im Supermarkt, Möbel-Kollision für Mia
import json

meals = [("apfel", "Apfel", "🍎", 2, 14), ("banane", "Banane", "🍌", 2, 16), ("brot", "Butterbrot", "🥪", 4, 30), ("kuchen", "Kuchen", "🍰", 5, 26),
         ("nudeln", "Nudeln", "🍝", 6, 45), ("pizza", "Pizza", "🍕", 8, 60), ("eis", "Eis", "🍦", 3, 10), ("saft", "Apfelsaft", "🧃", 2, 10)]
d = {"meals": [{"id": i, "name": n, "icon": ic, "price": p, "fill": f} for i, n, ic, p, f in meals], "texts": {
    "mia.hunger.rumble": ["mia", "Mein Magen knurrt ein bisschen. Zeit für einen Snack aus dem Rucksack!"],
    "mia.hunger.hungry": ["mia", "Ich habe großen Hunger und werde ganz müde. Im Supermarkt gibt es leckeres Essen!"],
    "mia.hunger.nofood": ["mia", "In meinem Rucksack ist kein Essen mehr. Auf zum Supermarkt!"],
    "mia.eat": ["mia", "Mmm, lecker! {name} schmeckt toll."],
    "mia.eat.full": ["mia", "Ich bin schon pappsatt, danke."]}}
json.dump(d, open('content/meals.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:60])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/core/texts.ts', [("export interface PetKindDef", "export interface MealDef { id: string; name: string; icon: string; price: number; fill: number }\nexport const mealCfg = files['/content/meals.json'] as { meals: MealDef[] };\n\nexport interface PetKindDef")])
ed('src/core/progress.ts', [
    ("  unlocked: Record<string, boolean>;", "  unlocked: Record<string, boolean>;\n  /** Mias eigener Hunger (Sättigung 0–100 zum Zeitpunkt t) und Essensvorrat im Rucksack */\n  hunger: { fill: number; t: number };\n  meals: Record<string, number>;"),
    ("  unlocked: {},", "  unlocked: {},\n  hunger: { fill: 85, t: Date.now() },\n  meals: { apfel: 2 },")])
open('src/core/hunger.ts', 'w', encoding='utf-8').write("""/**
 * Mias Hunger: Die Sättigung sinkt langsam mit der echten Zeit. Essen kauft Mia im Supermarkt und isst es aus dem Rucksack.
 * Kein Game Over: Ist sie hungrig, läuft sie nur etwas langsamer und erinnert sich ans Essen.
 */
import { mealCfg, type MealDef } from './texts';
import { getProgress, mutate } from './progress';

export const meals: MealDef[] = mealCfg.meals;
export const mealById = (id: string) => meals.find((m) => m.id === id)!;
const DECAY_PER_MIN = 1.3;

export function fullness(): number {
  const h = getProgress().hunger;
  return Math.max(0, Math.min(100, h.fill - ((Date.now() - h.t) / 60000) * DECAY_PER_MIN));
}
export type Hunger = 'full' | 'ok' | 'rumble' | 'hungry';
export const hungerLevel = (): Hunger => { const f = fullness(); return f > 70 ? 'full' : f > 40 ? 'ok' : f > 20 ? 'rumble' : 'hungry'; };
/** Tempo-Faktor: ab „hungrig“ etwas langsamer */
export const hungerSpeed = () => { const f = fullness(); return f > 20 ? 1 : 0.84 + (f / 20) * 0.16; };

export const mealStock = (id: string) => getProgress().meals[id] ?? 0;
export const addMeal = (id: string, n: number) => mutate((p) => void (p.meals[id] = (p.meals[id] ?? 0) + n));

export function eat(id: string): boolean {
  if (mealStock(id) <= 0 || fullness() >= 97) return false;
  const gain = mealById(id).fill, now = fullness();
  mutate((p) => { p.meals[id] -= 1; p.hunger = { fill: Math.min(100, now + gain), t: Date.now() }; });
  return true;
}
""")
ed('src/ui/backpack.ts', [
    ("import { foods, stock } from '../core/pet';", "import { foods, stock } from '../core/pet';\nimport { eat, fullness, hungerLevel, mealStock, meals } from '../core/hunger';\nimport { onProgress } from '../core/progress';"),
    ("  const body = h('div', { class: 'pack' });", "  const body = h('div', { class: 'pack' });\n  const timer = window.setInterval(() => render(), 5000);"),
    ("    body.replaceChildren(\n      h('div', { class: 'pack-grid' },",
     "    const full = Math.round(fullness()), lvl = hungerLevel();\n    body.replaceChildren(\n      h('div', { class: 'pack-hunger' }, h('span', {}, lvl === 'hungry' ? '😫 Mia hat großen Hunger' : lvl === 'rumble' ? '😋 Mias Magen knurrt' : lvl === 'ok' ? '🙂 Mia ist ganz gut satt' : '😊 Mia ist satt'), h('div', { class: 'pet-bar ' + (lvl === 'hungry' ? 'hungry' : lvl === 'rumble' ? 'ok' : 'happy') }, h('i', { style: { width: full + '%' } }))),\n      h('div', { class: 'pack-grid' },\n        ...meals.filter((m) => mealStock(m.id) > 0).map((m) => h('button', { class: 'pack-item meal', disabled: full >= 97, onclick: () => { if (eat(m.id)) { sfx.munch(); speak('mia.eat', { name: m.name }); } else speak('mia.eat.full'); } },\n          h('span', { class: 'pk-icon' }, m.icon), h('b', {}, m.name), h('small', {}, `Vorrat ${mealStock(m.id)} · +${m.fill}`))),"),
    ("  const off = onWeather(render);\n  openModal({ title: '🎒 Rucksack', wide: false, onClose: off, content: body });",
     "  const off1 = onWeather(render), off2 = onProgress(render);\n  openModal({ title: '🎒 Rucksack', wide: false, onClose: () => { off1(); off2(); clearInterval(timer); }, content: body });"),
    ("'Im Rucksack ist alles, was Mia mitnimmt. Der Schirm schützt vor Regen.'", "'Im Rucksack ist alles, was Mia mitnimmt: Essen (tippen = essen), Haustierfutter und der Schirm gegen Regen.'")])
ed('src/ui/hud.ts', [
    ("import { onWeather, weather } from '../core/weather';", "import { onWeather, weather } from '../core/weather';\nimport { fullness, hungerLevel } from '../core/hunger';"),
    ("let packEl: HTMLElement | null = null;", "let packEl: HTMLElement | null = null;\nlet hungerEl: HTMLElement;\nlet hungerFill: HTMLElement;"),
    ("    houseEl = h('button',", "    hungerFill = h('i', {});\n    hungerEl = h('button', { class: 'hud-hunger', 'aria-label': 'Hunger – Rucksack öffnen', onclick: () => handlers.onPack?.() }, h('span', { class: 'hg-icon' }, '🍽️'), h('div', { class: 'hg-bar' }, hungerFill));\n    houseEl = h('button',"),
    ("      houseEl,\n      coinEl,", "      houseEl,\n      hungerEl,\n      coinEl,"),
    ("    onProgress(hud.refresh);", "    onProgress(hud.refresh);\n    window.setInterval(hud.refresh, 5000);"),
    ("    set(starsEl,", "    if (hungerEl) {\n      const lvl = hungerLevel();\n      hungerFill.style.width = Math.round(fullness()) + '%';\n      hungerEl.dataset.lvl = lvl;\n      (hungerEl.firstChild as HTMLElement).textContent = lvl === 'hungry' ? '😫' : lvl === 'rumble' ? '😋' : '🍽️';\n    }\n    set(starsEl,")])
open('src/styles/polish.css', 'a', encoding='utf-8').write("""
/* Mias Hunger */
.hud-hunger { display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 14px; border-radius: 20px; border: 0; border-bottom: 5px solid #d6bf93; background: #fff6e3; font-size: 28px; }
.hg-bar { width: 64px; height: 14px; border-radius: 8px; background: #e6dcc4; overflow: hidden; border: 2px solid #cbb98f; } .hg-bar i { display: block; height: 100%; background: #7ddc7a; transition: width .6s, background .3s; }
.hud-hunger[data-lvl="ok"] .hg-bar i { background: #b9df6a; } .hud-hunger[data-lvl="rumble"] .hg-bar i { background: #ffd23f; } .hud-hunger[data-lvl="hungry"] .hg-bar i { background: #ff8a6a; }
.hud-hunger[data-lvl="hungry"], .hud-hunger[data-lvl="rumble"] { animation: breathe 1.4s ease-in-out infinite; }
.pack-hunger { margin-bottom: 14px; font: 800 24px var(--font); } .pack-hunger .pet-bar { margin-top: 6px; }
.pack-item.meal:disabled { opacity: .55; }
""")
ed('src/ui/supermarket.ts', [
    ("import { openModal } from './modal';", "import { meals, addMeal, mealStock } from '../core/hunger';\nimport { openModal } from './modal';"),
    ("{ id: 'tier', name: 'Tierbedarf', icon: '🐾' }]", "{ id: 'essen', name: 'Essen', icon: '🍎' }, { id: 'tier', name: 'Tierbedarf', icon: '🐾' }]"),
    ("    if (aisle !== 'tier') {", "    if (aisle === 'essen') {\n      for (const m of meals) items.push(product(m.icon, m.name, m.price, 'meal:' + m.id, 'free', `sättigt +${m.fill} · Vorrat ${mealStock(m.id)}`, true));\n    } else if (aisle !== 'tier') {"),
    ("l.key.startsWith('food:') ? h('span', { class: 'sm-qty' },", "l.key.startsWith('food:') || l.key.startsWith('meal:') ? h('span', { class: 'sm-qty' },"),
    ("    for (const l of cart.values()) if (l.key.startsWith('food:')) addFood(l.key.slice(5), l.qty);", "    for (const l of cart.values()) if (l.key.startsWith('food:')) addFood(l.key.slice(5), l.qty);\n    for (const l of cart.values()) if (l.key.startsWith('meal:')) addMeal(l.key.slice(5), l.qty);")])
ed('src/world/worldScreen.ts', [
    ("for (const r of [...model.rects, ...dyn.rects]) {", "for (const r of [...model.rects, ...dyn.rects, ...dyn.petRects]) {"),
    ("const sp = RUN * (1 - 0.22 * weather.wet);", "const sp = RUN * (1 - 0.22 * weather.wet) * hungerSpeed();"),
    ("import { tickWeather,", "import { hungerLevel, hungerSpeed, mealStock, meals } from '../core/hunger';\nimport { tickWeather,"),
    ("    const isFrozen = frozen();\n    let { x: ix", "    hungerTick -= DT;\n    if (hungerTick <= 0) {\n      hungerTick = 2;\n      const lv = hungerLevel();\n      if (lv !== lastHunger) {\n        if (lv === 'rumble' && lastHunger !== 'hungry') speak('mia.hunger.rumble');\n        else if (lv === 'hungry') speak(meals.some((m) => mealStock(m.id) > 0) ? 'mia.hunger.hungry' : 'mia.hunger.nofood');\n        lastHunger = lv;\n      }\n    }\n    const isFrozen = frozen();\n    let { x: ix"),
    ("  let umbT = 0;", "  let umbT = 0;\n  let hungerTick = 3, lastHunger = hungerLevel();")])
print('ok')
