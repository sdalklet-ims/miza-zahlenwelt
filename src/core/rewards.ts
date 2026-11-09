import { common, type RewardItem } from './texts';
import { getProgress, mutate } from './progress';

export const items: RewardItem[] = common.rewards.items;

export const totalStars = () => Object.values(getProgress().stars).reduce((s, v) => s + v, 0);

export const isUnlocked = (it: RewardItem) => totalStars() >= it.stars;

/** Vergibt Sterne (zählt nur, wenn besser als bisher) und meldet neu freigeschaltete Items. */
export function awardStars(key: string, n: number): { gained: number; newItems: RewardItem[] } {
  const before = totalStars();
  mutate((p) => {
    p.stars[key] = Math.max(p.stars[key] ?? 0, n);
  });
  const after = totalStars();
  const newItems = items.filter((i) => i.stars > before && i.stars <= after);
  mutate((p) => {
    for (const it of newItems) {
      const k = `${it.target}.${it.slot}`;
      if (!p.equipped[k]) p.equipped[k] = it.id; // Neues gleich anziehen, wenn der Platz frei ist
    }
  });
  return { gained: after - before, newItems };
}

/** IDs der aktuell angelegten Items einer Figur ("mia", "eule" …) */
export function equippedFor(target: string): string[] {
  const p = getProgress();
  return Object.entries(p.equipped)
    .filter(([k, id]) => k.startsWith(target + '.') && items.some((i) => i.id === id && isUnlocked(i)))
    .map(([, id]) => id);
}

export function toggleEquip(it: RewardItem) {
  mutate((p) => {
    const k = `${it.target}.${it.slot}`;
    if (p.equipped[k] === it.id) delete p.equipped[k];
    else p.equipped[k] = it.id;
  });
}

/* ── Münzen & Gadgets ── */
export const coins = () => getProgress().coins;
export const addCoins = (n: number) => mutate((p) => void (p.coins += n));
export const hasGadget = (id: string) => !!getProgress().gadgets[id];

/** Kauft ein Gadget; false, wenn zu wenig Münzen oder schon vorhanden */
export function buyGadget(id: string, price: number): boolean {
  if (hasGadget(id) || coins() < price) return false;
  mutate((p) => {
    p.coins -= price;
    p.gadgets[id] = true;
  });
  return true;
}
