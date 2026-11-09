/** Spiele am Fluss: Baumstamm-Mal (Biber), Fische teilen (Ente) und der Mini-Check. */
import { wait } from '../../core/dom';
import { getProgress } from '../../core/progress';
import { Adaptive } from '../../core/adaptive';
import { createShell } from '../../ui/shell';
import { award, showResult } from '../../ui/results';
import type { Screen } from '../../core/router';
import { genMul, runMul } from './mal';
import { finish, playRounds, screenOf, starsFor } from '../wiese/common';

const ROUNDS = 6;

function mulScreen(op: '×' | ':', npc: { id: string; kind: string; name: string }, key: string) {
  return (done: () => void, again: () => void): Screen => {
    const shell = createShell(npc);
    const ad = new Adaptive(getProgress().levels[key] ?? 1);
    (async () => {
      const hits = await playRounds({ shell, total: ROUNDS, key, ad, task: (lvl, _i, hooks) => runMul(shell, genMul(op, lvl), lvl, hooks) });
      if (hits >= 0) await finish(shell, key, starsFor(hits, ROUNDS), `${hits} von ${ROUNDS} gleich beim ersten Versuch richtig.`, done, again, 3, 'Zurück zum Fluss');
    })();
    return screenOf(shell);
  };
}

export const malScreen = mulScreen('×', { id: 'bruno', kind: 'beaver', name: 'Biber Bruno' }, 'fluss.mal');
export const teilenScreen = mulScreen(':', { id: 'emma', kind: 'duck', name: 'Ente Emma' }, 'fluss.teilen');

export function checkScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'bruno', kind: 'beaver', name: 'Biber Bruno' });
  const tasks: ('×' | ':')[] = ['×', ':', '×', ':', '×', ':'];
  const lm = Math.max(2, getProgress().levels['fluss.mal'] ?? 1);
  const lt = Math.max(2, getProgress().levels['fluss.teilen'] ?? 1);
  (async () => {
    await shell.speakId('fluss.check.intro');
    let hits = 0;
    const marks = tasks.map(() => '○');
    for (let i = 0; i < tasks.length && !shell.dead; i++) {
      shell.setInfo(`Aufgabe ${i + 1} von ${tasks.length}   ${marks.join(' ')}`);
      const op = tasks[i], lvl = op === '×' ? lm : lt;
      const res = await runMul(shell, genMul(op, lvl), 3);
      if (shell.dead) return;
      shell.pay(res.firstTry ? 4 : 1);
      marks[i] = res.firstTry ? '●' : '◐';
      if (res.firstTry) hits++;
      await wait(500);
    }
    if (shell.dead) return;
    shell.setInfo(`Geschafft!   ${marks.join(' ')}`);
    const stars = hits >= 5 ? 3 : hits >= 3 ? 2 : 1;
    shell.pay(stars * 4);
    await award('fluss.check', stars);
    if (shell.dead) return;
    showResult({
      title: 'Fluss-Check geschafft!', stars, speakId: `fluss.check.done.${stars}`,
      text: `${hits} von ${tasks.length} gleich beim ersten Versuch richtig.  Verdient: ${shell.earned} 🪙`,
      buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück zum Fluss', onClick: done }],
    });
  })();
  return screenOf(shell);
}
