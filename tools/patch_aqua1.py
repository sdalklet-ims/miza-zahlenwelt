# Einmaliges Hilfsskript: Aquarium-Daten (Arten, Futter, Texte), Fortschrittsfelder
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


species = [
    {"id": "goldfisch", "name": "Goldfisch", "kind": "fish", "shape": "gold", "price": 4, "color": "#ff9a2a", "color2": "#ffd27a", "size": 1.0, "speed": 0.9, "blurb": "Rund, orange und gemütlich."},
    {"id": "guppy", "name": "Guppy", "kind": "fish", "shape": "guppy", "price": 3, "color": "#ff6fa8", "color2": "#5fd0ff", "size": 0.62, "speed": 1.25, "blurb": "Klein mit bunter Schwanzflosse."},
    {"id": "neon", "name": "Neon-Salmler", "kind": "fish", "shape": "neon", "price": 3, "color": "#4aa8ff", "color2": "#ff4a4a", "size": 0.5, "speed": 1.6, "school": True, "blurb": "Schwimmt gern im Schwarm, leuchtet blau-rot."},
    {"id": "skalar", "name": "Silber-Skalar", "kind": "fish", "shape": "angel", "price": 6, "color": "#dfe7ee", "color2": "#4b5662", "size": 1.15, "speed": 0.7, "blurb": "Hoch wie ein Segel, silbern mit Streifen."},
    {"id": "kampffisch", "name": "Kampffisch", "kind": "fish", "shape": "betta", "price": 7, "color": "#e0483f", "color2": "#3a4cc0", "size": 0.95, "speed": 0.8, "blurb": "Mit langen, wallenden Flossen."},
    {"id": "wels", "name": "Panzerwels", "kind": "bottom", "shape": "cory", "price": 5, "color": "#b9935f", "color2": "#f0dcb0", "size": 0.75, "speed": 0.7, "blurb": "Wuselt am Boden und sucht Krümel."},
    {"id": "schnecke", "name": "Apfelschnecke", "kind": "snail", "shape": "snail", "price": 3, "color": "#f2c14a", "color2": "#8a5a2a", "size": 0.7, "speed": 0.25, "blurb": "Gemächlich mit gelbem Haus."},
    {"id": "garnele", "name": "Zwerggarnele", "kind": "shrimp", "shape": "shrimp", "price": 2, "color": "#ff8a7a", "color2": "#ffffff", "size": 0.5, "speed": 0.5, "blurb": "Winzig, durchsichtig und flink."},
]
foods = [
    {"id": "flocken", "name": "Fischfutter (Flocken)", "icon": "🥣", "price": 2, "portions": 1},
    {"id": "dose", "name": "Fischfutter-Dose", "icon": "🥫", "price": 6, "portions": 4},
]
T = {
    "aqua.new": ["mia", "{name} ist ins Aquarium eingezogen! Jetzt schwimmt dort etwas."],
    "aqua.locked": ["mia", "Erst muss das Aquarium aufgestellt sein, dann können die Fische einziehen."],
    "aqua.full": ["mia", "Das Becken ist voll. Noch mehr Tiere passen nicht hinein."],
    "aqua.hungry": ["mia", "Die Fische im Aquarium haben Hunger! Fischfutter gibt es im Supermarkt."],
    "aqua.hungry.food": ["mia", "Die Fische im Aquarium haben Hunger! Ich habe noch Fischfutter und gehe sie füttern."],
    "aqua.fed": ["mia", "Guten Appetit, ihr Lieben! Die Fische schnappen sich die Flocken."],
    "aqua.full.fed": ["mia", "Die Fische sind noch satt. Etwas später gibt es wieder Futter."],
    "aqua.nofood": ["mia", "Ich habe kein Fischfutter mehr. Im Supermarkt, Gang Aquarium, gibt es welches."],
    "aqua.nofish": ["mia", "Das Aquarium ist noch leer. Fische, Schnecken und Garnelen gibt es im Supermarkt im Gang Aquarium."],
}
json.dump({"species": species, "foods": foods, "texts": T}, open('content/aquarium.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

ed('src/core/texts.ts', [("export interface MealDef", """export interface AquaSpecies { id: string; name: string; kind: 'fish' | 'bottom' | 'snail' | 'shrimp'; shape: string; price: number; color: string; color2: string; size: number; speed: number; school?: boolean; blurb: string }
export interface AquaFood { id: string; name: string; icon: string; price: number; portions: number }
export const aquaCfg = files['/content/aquarium.json'] as { species: AquaSpecies[]; foods: AquaFood[] };

export interface MealDef""")])
ed('src/core/progress.ts', [
    ("  badges: Record<string, number>;", "  badges: Record<string, number>;\n  /** Aquarium: Tiere je Art, Futterportionen, Sättigung (0–100 zum Zeitpunkt t) */\n  aqua: { fish: Record<string, number>; food: number; fill: number; t: number };"),
    ("  badges: {},", "  badges: {},\n  aqua: { fish: {}, food: 0, fill: 80, t: Date.now() },")])
open('src/core/aquarium.ts', 'w', encoding='utf-8').write("""/**
 * Aquarium: Fische, Wasserschnecken und Garnelen müssen einzeln im Supermarkt gekauft werden (Aquarium muss aufgestellt sein),
 * ebenso das Fischfutter. Die Tiere werden mit der Zeit hungrig; ab und zu erinnert Mia ans Füttern. Kein Game Over: hungrige Tiere schwimmen nur träger.
 */
import { aquaCfg, type AquaSpecies, type AquaFood } from './texts';
import { getProgress, mutate } from './progress';
import { isBuilt } from './house';

export const species: AquaSpecies[] = aquaCfg.species;
export const fishFoods: AquaFood[] = aquaCfg.foods;
export const speciesById = (id: string) => species.find((s) => s.id === id)!;
export const MAX_AQUA = 14;
const DECAY_PER_MIN = 1.5;

export const aquaReady = () => isBuilt('aquarium');
export const aquaCount = (id: string) => getProgress().aqua.fish[id] ?? 0;
export const aquaTotal = () => Object.values(getProgress().aqua.fish).reduce((a, b) => a + b, 0);
export const fishFood = () => getProgress().aqua.food;

export function aquaFullness(): number {
  const a = getProgress().aqua;
  return Math.max(0, Math.min(100, a.fill - ((Date.now() - a.t) / 60000) * DECAY_PER_MIN));
}
export const aquaHungry = () => aquaTotal() > 0 && aquaFullness() < 30;

export function addAqua(id: string, n: number) {
  mutate((p) => {
    if (aquaTotal() === 0) p.aqua = { ...p.aqua, fill: 80, t: Date.now() }; // die ersten Tiere sind frisch gefüttert eingezogen
    p.aqua.fish[id] = (p.aqua.fish[id] ?? 0) + n;
  });
}
export const addFishFood = (portions: number) => mutate((p) => void (p.aqua.food += portions));

/** Füttern: braucht eine Portion; 'full' = Tiere sind noch satt */
export function feedAqua(): 'ok' | 'nofood' | 'full' | 'empty' {
  if (aquaTotal() === 0) return 'empty';
  if (fishFood() <= 0) return 'nofood';
  const now = aquaFullness();
  if (now > 85) return 'full';
  mutate((p) => { p.aqua.food -= 1; p.aqua.fill = Math.min(100, now + 50); p.aqua.t = Date.now(); });
  return 'ok';
}

/** Farben der Tiere im Becken (für das 3D-Aquarium im Haus) */
export function aquaColors(): string[] {
  const out: string[] = [];
  for (const s of species) if (s.kind === 'fish') for (let i = 0; i < aquaCount(s.id); i++) out.push(s.color);
  return out;
}
""")
print('ok')
