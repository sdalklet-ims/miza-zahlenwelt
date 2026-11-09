/**
 * Spielstand sichern und laden: als Text-Code (Kopieren/Einfügen) oder Datei.
 * Der Code ist Base64 von {"mia":1,"data":{…}}. Ein Code mit "partial": true ergänzt nur (z. B. nur Haus-Teile).
 */
import { getProgress, mutate, type Progress } from './progress';

const enc = (s: string) => btoa(unescape(encodeURIComponent(s)));
const dec = (s: string) => decodeURIComponent(escape(atob(s.trim())));

export function exportSave(): string {
  return enc(JSON.stringify({ mia: 1, data: getProgress() }));
}

export function importSave(code: string): { ok: boolean; msg: string } {
  let obj: { mia?: number; partial?: boolean; data?: Partial<Progress> };
  try {
    obj = JSON.parse(dec(code.replace(/\s+/g, '')));
  } catch {
    return { ok: false, msg: 'Das ist kein gültiger Spielstand-Code.' };
  }
  if (obj.mia !== 1 || !obj.data) return { ok: false, msg: 'Das ist kein Spielstand von Mia.' };
  const d = obj.data;
  mutate((p) => {
    if (obj.partial) {
      // Ergänzen: Haus-Teile vereinen, Meilenstein nie zurücksetzen
      if (d.house) {
        Object.assign(p.house.owned, d.house.owned);
        Object.assign(p.house.built, d.house.built);
        if (d.house.roof) p.house.roof = d.house.roof;
        if (d.house.wall) p.house.wall = d.house.wall;
        p.house.stage = Math.max(p.house.stage, d.house.stage ?? 0);
      }
      if (typeof d.coins === 'number') p.coins = Math.max(p.coins, d.coins);
    } else {
      Object.assign(p, d, { settings: { ...p.settings, ...(d.settings ?? {}) } });
    }
  });
  return { ok: true, msg: 'Spielstand geladen!' };
}
