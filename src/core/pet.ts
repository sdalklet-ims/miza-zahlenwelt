/**
 * Haustiere: Wenn Mias Haus bewohnbar ist, können Haustiere einziehen (Supermarkt, Tierabteilung) – auch mehrere.
 * Jedes wird mit der Zeit hungrig und muss gefüttert werden; das Futter kauft man im Supermarkt.
 * Kein Game Over: ein hungriges Tier ist nur traurig und freut sich umso mehr über Futter.
 */
import { petCfg, type PetKindDef, type PetFoodDef } from './texts';
import { getProgress, mutate } from './progress';
import { stageNow } from './house';

export const kinds: PetKindDef[] = petCfg.kinds;
export const foods: PetFoodDef[] = petCfg.foods;
export const kindById = (id: string) => kinds.find((k) => k.id === id)!;
export const foodById = (id: string) => foods.find((f) => f.id === id)!;

/** Sättigung sinkt langsam mit der echten Zeit (100 → 0 in etwa 45 Minuten). */
const DECAY_PER_MIN = 2.2;
export const MAX_PETS = 6;

export type PetState = ReturnType<typeof pets>[number];
export const pets = () => getProgress().pets;
export const petUnlocked = () => stageNow() >= 2;

export function fullness(p: PetState | undefined): number {
  if (!p) return 0;
  return Math.max(0, Math.min(100, p.fill - ((Date.now() - p.t) / 60000) * DECAY_PER_MIN));
}
export type Mood = 'happy' | 'ok' | 'hungry';
export const mood = (p: PetState | undefined): Mood => { const f = fullness(p); return f > 55 ? 'happy' : f > 25 ? 'ok' : 'hungry'; };

export function adopt(kind: string, name: string) {
  mutate((p) => void p.pets.push({ kind, name, fill: 70, t: Date.now(), fed: 0 }));
}

export const stock = (food: string) => getProgress().petStock[food] ?? 0;

/** Futter für später kaufen (auch schon vor dem Einzug) */
export function addFood(food: string, n: number) {
  mutate((p) => void (p.petStock[food] = (p.petStock[food] ?? 0) + n));
}

export function feed(idx: number, food: string): { ok: boolean; favorite: boolean; gain: number } {
  const pt = pets()[idx];
  if (!pt || stock(food) <= 0) return { ok: false, favorite: false, gain: 0 };
  const def = foodById(food), fav = kindById(pt.kind).likes.includes(food);
  const gain = def.fill + (fav ? 12 : 0);
  const now = fullness(pt);
  mutate((p) => {
    p.petStock[food] -= 1;
    const q = p.pets[idx];
    if (q) { q.fill = Math.min(100, now + gain); q.t = Date.now(); q.fed += 1; }
  });
  return { ok: true, favorite: fav, gain };
}

/** Haustier mitnehmen (folgt Mia) oder zuhause lassen */
export function setFollow(idx: number, on: boolean) {
  mutate((p) => void (p.pets[idx] && (p.pets[idx].follow = on)));
}
