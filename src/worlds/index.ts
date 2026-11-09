/**
 * Welt-Register. Eine neue Welt = content/worlds/<id>.json + ein Modul hier eintragen.
 * Ohne Eintrag (oder mit meta.status = "locked") bleibt die Station auf der Karte gesperrt.
 */
export interface WorldModule {
  /** Betritt die Welt (ruft intern router.show auf). */
  enter(): void;
}

export const modules: Record<string, WorldModule> = {};

export function registerWorld(id: string, m: WorldModule) {
  modules[id] = m;
}
