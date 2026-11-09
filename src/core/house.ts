/**
 * Mias Haus: Teile werden bei Fuchs Fritz gekauft (Münzen) und am Bauplatz aufgebaut.
 * Katalog und Preise stehen in content/house.json; die 3D-Modelle je Teil in src/world3d/house.ts.
 * Meilensteine: Rohbau (1 Stern) → bewohnbar (2 Sterne) → alles gebaut (3 Sterne).
 */
import { houseCfg, type HousePart } from './texts';
import { getProgress, mutate } from './progress';
import { coins } from './rewards';

export const parts: HousePart[] = houseCfg.parts;
export const partById = (id: string) => parts.find((p) => p.id === id)!;

export const isOwned = (id: string) => !!getProgress().house.owned[id];
export const isBuilt = (id: string) => !!getProgress().house.built[id];
export const missing = (id: string) => partById(id).requires.filter((r) => !isBuilt(r));
export const canBuild = (id: string) => isOwned(id) && !isBuilt(id) && missing(id).length === 0;
export const builtCount = () => parts.filter((p) => isBuilt(p.id)).length;
export const readyCount = () => parts.filter((p) => canBuild(p.id)).length;

const ROH = ['fundament', 'waende'];
export const stageNow = () => (parts.every((p) => isBuilt(p.id)) ? 3 : houseCfg.core.every(isBuilt) ? 2 : ROH.every(isBuilt) ? 1 : 0);

/** Kauft ein Teil (Material liegt dann beim Bauplatz bereit). */
export function buy(id: string): 'ok' | 'poor' | 'have' {
  const p = partById(id);
  if (isOwned(id)) return 'have';
  if (coins() < p.price) return 'poor';
  mutate((s) => {
    s.coins -= p.price;
    s.house.owned[id] = true;
  });
  return 'ok';
}

/** Baut ein Teil auf. Meldet einen neu erreichten Meilenstein (1–3) oder 0. */
export function build(id: string): number {
  if (!canBuild(id)) return 0;
  const before = getProgress().house.stage;
  mutate((s) => void (s.house.built[id] = true));
  const now = stageNow();
  if (now > before) {
    mutate((s) => void (s.house.stage = now));
    return now;
  }
  return 0;
}

export function setColor(kind: 'roof' | 'wall', value: string) {
  mutate((s) => void (s.house[kind] = value));
}
