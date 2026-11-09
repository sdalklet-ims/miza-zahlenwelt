/**
 * Haustier: Wenn Mias Haus bewohnbar ist, kann sie ein Haustier einziehen lassen (Supermarkt, Tierabteilung).
 * Es wird mit der Zeit hungrig und muss gefüttert werden; das Futter kauft man im Supermarkt.
 * Kein Game Over: ein hungriges Tier ist nur traurig und freut sich umso mehr über Futter.
 */
import { petCfg, type PetKindDef, type PetFoodDef } from './texts';
import { getProgress, mutate } from './progress';
import { stageNow } from './house';

export const kinds: PetKindDef[] = petCfg.kinds;
export const foods: PetFoodDef[] = petCfg.foods;
export const kindById = (id: string) => kinds.find((k) => k.id === id)!;
export const foodById = (id: string) => foods.find((f) => f.id === id)!;

/** Sättigung sinkt langsam mit der echten Zeit (100 → 0 in etwa zweieinhalb Stunden). */
const DECAY_PER_MIN = 0.7;

export const pet = () => getProgress().pet;
export const petUnlocked = () => stageNow() >= 2;

export function fullness(): number {
  const p = getProgress().pet;
  if (!p) return 0;
  return Math.max(0, Math.min(100, p.fill - ((Date.now() - p.t) / 60000) * DECAY_PER_MIN));
}
export type Mood = 'happy' | 'ok' | 'hungry';
export const mood = (): Mood => (fullness() > 55 ? 'happy' : fullness() > 25 ? 'ok' : 'hungry');

export function adopt(kind: string, name: string) {
  mutate((p) => void (p.pet = { kind, name, fill: 70, t: Date.now(), stock: {}, fed: 0 }));
}

export const stock = (food: string) => getProgress().petStock[food] ?? 0;

/** Futter für später kaufen (auch schon vor dem Einzug) */
export function addFood(food: string, n: number) {
  mutate((p) => void (p.petStock[food] = (p.petStock[food] ?? 0) + n));
}

export function feed(food: string): { ok: boolean; favorite: boolean; gain: number } {
  const pt = getProgress().pet;
  if (!pt || stock(food) <= 0) return { ok: false, favorite: false, gain: 0 };
  const def = foodById(food), fav = kindById(pt.kind).likes.includes(food);
  const gain = def.fill + (fav ? 12 : 0);
  const now = fullness();
  mutate((p) => {
    p.petStock[food] -= 1;
    if (p.pet) {
      p.pet.fill = Math.min(100, now + gain);
      p.pet.t = Date.now();
      p.pet.fed += 1;
    }
  });
  return { ok: true, favorite: fav, gain };
}
