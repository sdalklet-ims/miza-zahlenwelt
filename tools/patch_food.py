# Einmaliges Hilfsskript: Mias Essen (Obst, Katzenfutter normal/premium), Äußerungen bei Hunger, Spielsperre bei leerem Magen
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


meals = [
    {"id": "apfel", "name": "Apfel", "icon": "🍎", "price": 2, "fill": 14, "kind": "obst"},
    {"id": "banane", "name": "Banane", "icon": "🍌", "price": 2, "fill": 16, "kind": "obst"},
    {"id": "birne", "name": "Birne", "icon": "🍐", "price": 3, "fill": 18, "kind": "obst"},
    {"id": "katzenfutter", "name": "Katzenfutter normal", "icon": "🥫", "price": 6, "fill": 40, "kind": "cat"},
    {"id": "premium", "name": "Katzenfutter Premium", "icon": "🐟", "price": 10, "fill": 75, "kind": "premium"},
]
texts = {
    "mia.hunger.rumble": ["mia", "Mein Magen knurrt ein bisschen. Zeit für einen Snack aus dem Rucksack!"],
    "mia.hunger.hungry": ["mia", "Ich habe großen Hunger und werde ganz müde. Ich sollte bald etwas essen!"],
    "mia.hunger.nofood": ["mia", "Ich habe großen Hunger und im Rucksack ist nichts mehr. Auf zum Supermarkt!"],
    "mia.hunger.weak": ["mia", "Oh je, mein Magen ist fast leer! Mir wird ganz schwindelig. Ich muss ganz schnell etwas essen."],
    "mia.hunger.empty": ["mia", "Mein Magen ist ganz leer! So kann ich nicht spielen. Erst muss ich etwas essen. Einkaufen im Supermarkt geht zum Glück noch."],
    "mia.hunger.again": ["mia", "Mein Magen knurrt schon wieder laut. Ich brauche etwas zu essen!"],
    "mia.hunger.nogame": ["mia", "Ich habe zu großen Hunger zum Spielen. Erst essen, dann spielen!"],
    "mia.eat": ["mia", "Mmm, lecker! {name} schmeckt gut."],
    "mia.eat.cat": ["mia", "Mmm, Katzenfutter! Das schmeckt einer Katze am besten. Schnurr."],
    "mia.eat.premium": ["mia", "Premium-Katzenfutter! Das ist das Allerbeste. Schnurr, schnurr, schnurr!"],
    "mia.eat.full": ["mia", "Ich bin schon pappsatt, danke."],
}
json.dump({"meals": meals, "texts": texts}, open('content/meals.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

ed('src/core/texts.ts', [("export interface MealDef { id: string; name: string; icon: string; price: number; fill: number }", "export interface MealDef { id: string; name: string; icon: string; price: number; fill: number; kind?: 'obst' | 'cat' | 'premium' }")])

ed('src/core/hunger.ts', [
    ("export type Hunger = 'full' | 'ok' | 'rumble' | 'hungry';\nexport const hungerLevel = (): Hunger => { const f = fullness(); return f > 70 ? 'full' : f > 40 ? 'ok' : f > 20 ? 'rumble' : 'hungry'; };",
     """export type Hunger = 'full' | 'ok' | 'rumble' | 'hungry' | 'weak' | 'empty';
export const hungerLevel = (): Hunger => { const f = fullness(); return f > 70 ? 'full' : f > 40 ? 'ok' : f > 20 ? 'rumble' : f > 8 ? 'hungry' : f > 0.5 ? 'weak' : 'empty'; };
/** Magen ganz leer: Mia kann keine Spiele machen, bis sie gegessen hat (Einkaufen geht weiter) */
export const hungerEmpty = () => fullness() <= 0.5;
const FREE_OFFERS = ['shop', 'autos', 'video', 'discover'];
export const hungerBlocked = (offer: string) => hungerEmpty() && !FREE_OFFERS.includes(offer);
/** Spruch beim Essen passend zur Sorte */
export const eatTextId = (m: MealDef) => (m.kind === 'premium' ? 'mia.eat.premium' : m.kind === 'cat' ? 'mia.eat.cat' : 'mia.eat');"""),
])
ed('src/ui/backpack.ts', [
    ("speak('mia.eat', { name: m.name })", "speak(eatTextId(m), { name: m.name })"),
    ("import { eat, fullness, hungerLevel, mealStock, meals } from '../core/hunger';", "import { eat, eatTextId, fullness, hungerLevel, mealStock, meals } from '../core/hunger';"),
    ("lvl === 'hungry' ? '😫 Mia hat großen Hunger' :", "lvl === 'empty' ? '🥺 Mias Magen ist leer – erst essen, dann spielen!' : lvl === 'weak' ? '🥴 Mia ist ganz schwindelig vor Hunger' : lvl === 'hungry' ? '😫 Mia hat großen Hunger' :"),
    ("'pet-bar ' + (lvl === 'hungry' ? 'hungry' :", "'pet-bar ' + (lvl === 'hungry' || lvl === 'weak' || lvl === 'empty' ? 'hungry' :"),
])
ed('src/ui/hud.ts', [("(hungerEl.firstChild as HTMLElement).textContent = lvl === 'hungry' ? '😫' : lvl === 'rumble' ? '😋' : '🍽️';", "(hungerEl.firstChild as HTMLElement).textContent = lvl === 'empty' ? '🥺' : lvl === 'weak' || lvl === 'hungry' ? '😫' : lvl === 'rumble' ? '😋' : '🍽️';")])
open('src/styles/polish.css', 'a', encoding='utf-8').write("""
.hud-hunger[data-lvl="weak"] .hg-bar i, .hud-hunger[data-lvl="empty"] .hg-bar i { background: #ff6a4a; }
.hud-hunger[data-lvl="weak"], .hud-hunger[data-lvl="empty"] { animation: breathe .9s ease-in-out infinite; background: #ffe2d9; }
""")

# Welt: Äußerungen, Marker über Mia, Sperre in der Dialogauswahl
ed('src/world/worldScreen.ts', [
    ("import { hungerLevel, hungerSpeed, mealStock, meals } from '../core/hunger';", "import { hungerBlocked, hungerLevel, hungerSpeed, mealStock, meals } from '../core/hunger';\nimport { openBackpack } from '../ui/backpack';"),
    ("""      if (lv !== lastHunger) {
        if (lv === 'rumble' && lastHunger !== 'hungry') speak('mia.hunger.rumble');
        else if (lv === 'hungry') speak(meals.some((m) => mealStock(m.id) > 0) ? 'mia.hunger.hungry' : 'mia.hunger.nofood');
        lastHunger = lv;
      }""", """      const hasFood = meals.some((m) => mealStock(m.id) > 0);
      if (lv !== lastHunger) {
        if (lv === 'rumble') speak('mia.hunger.rumble');
        else if (lv === 'hungry') speak(hasFood ? 'mia.hunger.hungry' : 'mia.hunger.nofood');
        else if (lv === 'weak') speak('mia.hunger.weak');
        else if (lv === 'empty') speak('mia.hunger.empty');
        if (lv === 'hungry' || lv === 'weak' || lv === 'empty') hungerSaid = st.t;
        lastHunger = lv;
      } else if ((lv === 'hungry' || lv === 'weak' || lv === 'empty') && st.t - hungerSaid > 70 && !frozen()) {
        speak(hasFood ? 'mia.hunger.again' : 'mia.hunger.nofood'); // erinnert sich alle ~70 s
        hungerSaid = st.t;
      }"""),
    ("let hungerTick = 3, lastHunger = hungerLevel(), lastSpd = 0;", "let hungerTick = 3, lastHunger = hungerLevel(), lastSpd = 0, hungerSaid = 0;\n  const miaMark = h('div', { class: 'pet-mark mia-mark' }, '🍽️');\n  labels.append(miaMark);"),
    # Marker über Mia
    ("    shopTick?.(timeSec);", "    shopTick?.(timeSec);\n    {\n      const lvM = hungerLevel(), show = (lvM === 'hungry' || lvM === 'weak' || lvM === 'empty') && !sleeping && !hidden;\n      miaMark.style.display = show ? '' : 'none';\n      if (show) {\n        v3.set(st.x * S, gy + seatLift + 2.4, st.y * S);\n        const mp = stage.project(v3);\n        miaMark.textContent = lvM === 'empty' ? '🥺🍽️' : '🍽️';\n        miaMark.style.transform = `translate(${mp.x}px, ${mp.y + Math.sin(timeSec * 4) * 4}px) translate(-50%, -100%)`;\n      }\n    }"),
    # Dialogknöpfe
    ("onclick: () => { savePos(); closeDialog(); if (o === 'shop') openSupermarket();", "onclick: () => { if (hungerBlocked(o)) { closeDialog(); speak('mia.hunger.nogame'); openBackpack(); return; } savePos(); closeDialog(); if (o === 'shop') openSupermarket();"),
    ("        labelsTxt[o] ?? o, s != null &&", "        (labelsTxt[o] ?? o) + (hungerBlocked(o) ? ' 🍽️' : ''), s != null &&"),
    ("    if (!done && allBadges(worldId)) btns.push(h('button', { class: 'btn sun', onclick: () => { savePos();", "    if (!done && allBadges(worldId)) btns.push(h('button', { class: 'btn sun', onclick: () => { if (hungerBlocked('pruefung')) { closeDialog(); speak('mia.hunger.nogame'); openBackpack(); return; } savePos();"),
])
# Stationen: auch beim „Nochmal“ prüfen
for w, ret in (('wald', 'wald'), ('wiese', 'wiese'), ('fluss', 'fluss')):
    p = f'src/stations/{w}/index.ts'
    ed(p, [("function start(offer: Offer, npc: Npc, back: () => void) {\n  const again", "function start(offer: Offer, npc: Npc, back: () => void) {\n  if (hungerBlocked(offer)) { void speak('mia.hunger.nogame'); back(); return; } // leerer Magen: erst essen\n  const again"),
                ("import { show } from '../../core/router';", "import { show } from '../../core/router';\nimport { hungerBlocked } from '../../core/hunger';\nimport { speak } from '../../audio/speak';")])
ed('src/stations/exam.ts', [
    ("import { show, type Screen } from '../core/router';", "import { show, type Screen } from '../core/router';\nimport { hungerBlocked } from '../core/hunger';\nimport { speak } from '../audio/speak';"),
    ("onClick: () => show(examScreen(worldId, done), { back: done }) }", "onClick: () => { if (hungerBlocked('pruefung')) { void speak('mia.hunger.nogame'); done(); return; } show(examScreen(worldId, done), { back: done }); } }"),
])
print('ok')
