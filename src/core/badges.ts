/**
 * Abzeichen: Für jedes Spiel einer Welt gibt es ein Abzeichen. Es gehört Mia, wenn sie das Spiel zweimal ohne Fehler geschafft hat.
 * Haben alle Abzeichen einer Welt den Besitzer gewechselt, darf Mia bei Eule Olga am Nebeltor die Mathearbeit schreiben
 * (eine Aufgabe aus jedem Spiel, mindestens 4 von 5 Punkten) – das öffnet die nächste Welt.
 */
import { badgeCfg, worlds, type BadgeGameDef } from './texts';
import { getProgress, mutate } from './progress';

export const NEED_RUNS = 2;
export const EXAM_PASS = 4;

export interface BadgeDef extends BadgeGameDef { key: string; world: string; master?: boolean }

export const badgeWorlds = () => worlds.filter((w) => badgeCfg.worlds[w.id]);
export function gameBadges(world: string): BadgeDef[] {
  return (badgeCfg.worlds[world]?.games ?? []).map((g) => ({ ...g, key: `${world}.${g.id}`, world }));
}
export function masterBadge(world: string): BadgeDef | null {
  const m = badgeCfg.worlds[world]?.master;
  return m ? { ...m, key: `${world}.master`, world, master: true } : null;
}
export const badgeByKey = (key: string) => {
  const [w] = key.split('.');
  return gameBadges(w).find((b) => b.key === key) ?? null;
};

export const runsOf = (key: string) => getProgress().badges[key] ?? 0;
export const hasBadge = (key: string) => runsOf(key) >= NEED_RUNS;
export const allBadges = (world: string) => gameBadges(world).every((b) => hasBadge(b.key));
export const missingBadges = (world: string) => gameBadges(world).filter((b) => !hasBadge(b.key));
export const examPassed = (world: string) => (getProgress().passed[world] ?? 0) >= EXAM_PASS;
export const hasMaster = (world: string) => examPassed(world);

/** Alle gesammelten Abzeichen (Spiele + bestandene Mathearbeiten) und alle möglichen */
export function badgeCount() {
  let got = 0, all = 0;
  for (const w of badgeWorlds()) {
    for (const b of gameBadges(w.id)) { all++; if (hasBadge(b.key)) got++; }
    all++; if (examPassed(w.id)) got++;
  }
  return { got, all };
}

/** Meldet einen Durchlauf. Liefert, ob das Abzeichen dadurch neu erworben wurde. */
export function recordRun(key: string, clean: boolean): { runs: number; newly: boolean } {
  const before = runsOf(key);
  if (!clean || before >= NEED_RUNS) return { runs: before, newly: false };
  mutate((p) => void (p.badges[key] = before + 1));
  return { runs: before + 1, newly: before + 1 >= NEED_RUNS };
}

export function recordExam(world: string, score: number) {
  mutate((p) => void (p.passed[world] = Math.max(p.passed[world] ?? 0, score)));
}
