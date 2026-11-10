/** Fortschritt in localStorage (kein Login). Fällt still auf Arbeitsspeicher zurück, wenn Speichern nicht geht. */
export interface Settings {
  /** Musik: Lautstärke 0–1 und an/aus */
  music: number;
  musicOn: boolean;
  /** Radio-Sender (wald = Standardmusik) */
  station: string;
  /** Tippen auf die Welt = dorthin laufen */
  tapWalk: boolean;
}

export interface Progress {
  v: 1;
  /** Sterne je Spiel, Schlüssel "<welt>.<spiel>", Wert = bestes Ergebnis (0–3) */
  stars: Record<string, number>;
  /** Aktuelle Stufe je Spiel (adaptiv) */
  levels: Record<string, number>;
  /** Steine-Meister: gefundene Zahlen */
  found: number[];
  /** Angelegte Items: "<figur>.<slot>" → Item-ID */
  equipped: Record<string, string>;
  settings: Settings;
  /** Fehler-Zähler je Stolperstein (dreher, null, kurz) – steuert, was häufiger geübt wird */
  weak: Record<string, number>;
  seen: Record<string, boolean>;
  mapAt: string;
  /** Letzte Position in der Welt */
  pos?: { x: number; y: number };
  /** Gefundene Entdecker-Belohnungen */
  discovered: Record<string, boolean>;
  /** Münzen (Währung für den Laden) und eingesammelte Münzen in der Welt */
  coins: number;
  coinsGot: Record<string, boolean>;
  /** Mias Haus: gekaufte und aufgebaute Teile, Farben, Meilensteine */
  house: { owned: Record<string, boolean>; built: Record<string, boolean>; roof: string; wall: string; stage: number };
  posV: number;
  /** Haustier (null = noch keins) und Futtervorrat */
  pets: { kind: string; name: string; fill: number; t: number; fed: number; follow?: boolean }[];
  petStock: Record<string, number>;
  /** Rucksack: Gegenstände (z. B. Regenschirm) */
  pack: Record<string, boolean>;
  /** Freigeschaltete Welten (die erste ist immer offen) */
  unlocked: Record<string, boolean>;
  /** Mias eigener Hunger (Sättigung 0–100 zum Zeitpunkt t) und Essensvorrat im Rucksack */
  hunger: { fill: number; t: number };
  meals: Record<string, number>;
  /** Gekaufte Fahrzeuge und das gerade benutzte (null = zu Fuß) */
  vehicles: Record<string, boolean>;
  ride: string | null;
  /** Akkustand (0–100) der Elektro-Fahrzeuge */
  charge: Record<string, number>;
  /** Fehlerfreie Durchläufe je Spiel ("wald.punkte" → 0..), ab 2 gehört das Abzeichen Mia */
  badges: Record<string, number>;
  /** Bestandene Mathearbeiten je Welt (Punkte 4–5) */
  passed: Record<string, number>;
}

const KEY = 'mia.progress.v1';

const defaults = (): Progress => ({
  v: 1,
  stars: {},
  levels: {},
  found: [],
  equipped: {},
  settings: { music: 0.6, musicOn: true, station: 'wald', tapWalk: true },
  weak: {},
  seen: {},
  mapAt: "wald",
  discovered: {},
  coins: 0,
  coinsGot: {},
  house: { owned: {}, built: {}, roof: '#d9534f', wall: '#fff0d4', stage: 0 },
  posV: 0,
  pets: [],
  petStock: {},
  pack: { umbrella: true },
  unlocked: {},
  hunger: { fill: 85, t: Date.now() },
  meals: { apfel: 2 },
  vehicles: {},
  ride: null,
  charge: {},
  badges: {},
  passed: {},
});

let state: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.pet && !p.pets) p.pets = [p.pet];
      delete p.pet;
      return { ...d, ...p, settings: { ...d.settings, ...(p.settings ?? {}) } };
    }
  } catch {
    /* ignorieren */
  }
  return d;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Privater Modus o. Ä. – dann gilt der Fortschritt nur für diese Sitzung */
  }
}

export const getProgress = () => state;

export function mutate(fn: (p: Progress) => void) {
  fn(state);
  save();
  listeners.forEach((l) => l());
}

export function onProgress(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function resetProgress() {
  const settings = state.settings;
  state = { ...defaults(), settings };
  save();
  listeners.forEach((l) => l());
}

export const worldStars = (worldId: string) =>
  Object.entries(state.stars)
    .filter(([k]) => k.startsWith(worldId + '.'))
    .reduce((s, [, v]) => s + v, 0);
