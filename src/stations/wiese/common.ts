/** Gemeinsame Bausteine der Wiesen-Spiele: Runden mit adaptiver Stufe und Abschluss. */
import { wait } from '../../core/dom';
import { mutate } from '../../core/progress';
import type { Adaptive, LevelChange } from '../../core/adaptive';
import type { Shell } from '../../ui/shell';
import { award, showResult } from '../../ui/results';
import type { Screen } from '../../core/router';
import type { TaskHooks, TaskResult } from '../wald/tasks';

export const starsFor = (hits: number, total: number) => (hits / total >= 0.8 ? 3 : hits / total >= 0.4 ? 2 : 1);
export const screenOf = (shell: Shell): Screen => ({ el: shell.el, dispose: () => void (shell.dead = true) });

export function levelHooks(shell: Shell, ad: Adaptive, key: string): TaskHooks {
  const save = () => mutate((p) => void (p.levels[key] = ad.level));
  return {
    onAttempt: (ok, attempt) => (!ok ? ad.record(false) : attempt === 1 ? ad.record(true) : null),
    afterFeedback: async (ch: LevelChange) => {
      if (ch === 'up') {
        save();
        shell.feedback('info', `⬆ Stufe ${ad.level}`);
        await shell.speakId('common.level.up');
      } else if (ch === 'down' || ch === 'hint') {
        save();
        shell.pulseHint(true);
        await shell.speakId('common.level.down');
      }
    },
  };
}

/** Mehrere Aufgaben hintereinander; liefert die Treffer beim ersten Versuch (-1 = abgebrochen). */
export async function playRounds(o: { shell: Shell; total: number; key: string; ad: Adaptive; task: (level: number, i: number, hooks: TaskHooks) => Promise<TaskResult> }) {
  const { shell, ad } = o;
  const hooks = levelHooks(shell, ad, o.key);
  let hits = 0;
  for (let i = 0; i < o.total; i++) {
    shell.setInfo(`Aufgabe ${i + 1} von ${o.total} · Stufe ${ad.level}`);
    const res = await o.task(ad.level, i, hooks);
    if (shell.dead) return -1;
    shell.pay(res.firstTry ? 4 : 1);
    if (res.firstTry) hits++;
    await wait(500);
  }
  return hits;
}

export async function finish(shell: Shell, key: string, stars: number, text: string, done: () => void, again: () => void, bonus = 3) {
  shell.pay(stars * bonus);
  await award(key, stars);
  if (shell.dead) return;
  shell.pulseHint(false);
  showResult({
    title: 'Geschafft!', stars, text: `${text}  Verdient: ${shell.earned} 🪙`, speakId: 'common.round.done',
    buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück auf die Wiese', onClick: done }],
  });
}
