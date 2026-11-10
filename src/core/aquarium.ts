/**
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
