/** Lädt alle Content-JSONs (common + worlds/*) und stellt Texte per stabiler ID bereit. */
export interface SpeakerDef { name: string; pitch: number; rate: number; color: string }
export interface WorldMeta {
  title: string; topic: string; order: number; icon: string; theme: string; color: string;
  map: { x: number; y: number }; status: 'open' | 'locked';
}
export interface WorldContent { id: string; meta: WorldMeta; texts: Record<string, [string, string]>; [k: string]: any }
export interface HousePart { id: string; cat: string; icon: string; name: string; price: number; requires: string[] }
export interface HouseCfg {
  title: string; categories: { id: string; name: string; icon: string }[]; core: string[];
  roofColors: [string, string][]; wallColors: [string, string][]; parts: HousePart[];
}
export interface RewardItem { id: string; target: string; slot: string; name: string; stars: number }

const files = import.meta.glob('/content/**/*.json', { eager: true, import: 'default' }) as Record<string, any>;

export const common = files['/content/common.json'] as {
  speakers: Record<string, SpeakerDef>;
  texts: Record<string, [string, string]>;
  rewards: { items: RewardItem[] };
};

export const worlds: WorldContent[] = Object.entries(files)
  .filter(([p]) => p.startsWith('/content/worlds/'))
  .map(([, v]) => v as WorldContent)
  .sort((a, b) => a.meta.order - b.meta.order);

const table: Record<string, [string, string]> = {};
for (const f of Object.values(files)) Object.assign(table, f.texts ?? {});

export type Params = Record<string, string | number>;

export function fmt(text: string, params?: Params): string {
  return params ? text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : text;
}

export function entry(id: string): [string, string] | undefined {
  return table[id];
}

export function textOf(id: string, params?: Params): string {
  const e = table[id];
  if (!e) {
    console.warn('Text-ID fehlt:', id);
    return '';
  }
  return fmt(e[1], params);
}

export function speakerOf(id: string): SpeakerDef {
  return common.speakers[id] ?? common.speakers.mia;
}

export const getWorld = (id: string) => worlds.find((w) => w.id === id);

export interface WorldCfg {
  height: number; zoneWidth: number; pathY: number; pathAmp: number;
  themes: Record<string, { ground: string; ground2: string; flower: number; corridor: number }>;
}
export const worldCfg = files['/content/world.json'] as WorldCfg;

export const houseCfg = files['/content/house.json'] as HouseCfg;

export interface VehicleDef { id: string; name: string; icon: string; price: number; speed: number; blurb: string; canopy?: boolean }
export const vehicleCfg = files['/content/vehicles.json'] as { vehicles: VehicleDef[] };

export interface MealDef { id: string; name: string; icon: string; price: number; fill: number }
export const mealCfg = files['/content/meals.json'] as { meals: MealDef[] };

export interface PetKindDef { id: string; name: string; icon: string; price: number; likes: string[]; names: string[] }
export interface PetFoodDef { id: string; name: string; icon: string; price: number; fill: number }
export const petCfg = files['/content/pets.json'] as { kinds: PetKindDef[]; foods: PetFoodDef[] };
