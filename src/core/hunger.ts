/**
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
export type Hunger = 'full' | 'ok' | 'rumble' | 'hungry' | 'weak' | 'empty';
export const hungerLevel = (): Hunger => { const f = fullness(); return f > 70 ? 'full' : f > 40 ? 'ok' : f > 20 ? 'rumble' : f > 8 ? 'hungry' : f > 0.5 ? 'weak' : 'empty'; };
/** Magen ganz leer: Mia kann keine Spiele machen, bis sie gegessen hat (Einkaufen geht weiter) */
export const hungerEmpty = () => fullness() <= 0.5;
const FREE_OFFERS = ['shop', 'autos', 'video', 'discover'];
export const hungerBlocked = (offer: string) => hungerEmpty() && !FREE_OFFERS.includes(offer);
/** Spruch beim Essen passend zur Sorte */
export const eatTextId = (m: MealDef) => (m.kind === 'premium' ? 'mia.eat.premium' : m.kind === 'cat' ? 'mia.eat.cat' : 'mia.eat');
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
