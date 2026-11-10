/** Spiele auf der Wiese: Honig-Plus (Biene), Minus-Wanderung (Schnecke) und der Mini-Check. */
import { rnd, wait } from '../../core/dom';
import { getProgress } from '../../core/progress';
import { Adaptive } from '../../core/adaptive';
import { createShell } from '../../ui/shell';
import { award, showResult } from '../../ui/results';
import type { Screen } from '../../core/router';
import { genCalc, runCalc, runErgaenzen } from './calc';
import { runStrahl } from './strahl';
import { finish, playRounds, screenOf, starsFor } from './common';
import { badgeRun } from '../../ui/badges';

const ROUNDS = 6;

function calcScreen(op: '+' | '-', npc: { id: string; kind: string; name: string }, key: string) {
  return (done: () => void, again: () => void): Screen => {
    const shell = createShell(npc);
    const ad = new Adaptive(getProgress().levels[key] ?? 1);
    (async () => {
      const hits = await playRounds({ shell, total: ROUNDS, key, ad, task: (lvl, _i, hooks) => runCalc(shell, genCalc(op, lvl), hooks) });
      if (hits >= 0) await finish(shell, key, starsFor(hits, ROUNDS), `${hits} von ${ROUNDS} gleich beim ersten Versuch richtig.`, done, again, 3, 'Zurück auf die Wiese', hits === ROUNDS);
    })();
    return screenOf(shell);
  };
}

export const plusScreen = calcScreen('+', { id: 'bella', kind: 'bee', name: 'Biene Bella' }, 'wiese.plus');
export const minusScreen = calcScreen('-', { id: 'schorsch', kind: 'snail', name: 'Schnecke Schorsch' }, 'wiese.minus');

/** Mini-Check: sechs gemischte Aufgaben */
export function checkScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'bella', kind: 'bee', name: 'Biene Bella' });
  const tasks = ['plus', 'minus', 'erg', 'read', 'plus', 'minus'];
  const lp = Math.max(2, getProgress().levels['wiese.plus'] ?? 1);
  const lm = Math.max(2, getProgress().levels['wiese.minus'] ?? 1);
  const ls = Math.max(2, getProgress().levels['wiese.strahl'] ?? 1);
  (async () => {
    await shell.speakId('wiese.check.intro');
    let hits = 0;
    const marks = tasks.map(() => '○');
    for (let i = 0; i < tasks.length && !shell.dead; i++) {
      shell.setInfo(`Aufgabe ${i + 1} von ${tasks.length}   ${marks.join(' ')}`);
      const t = tasks[i];
      let res;
      if (t === 'plus') res = await runCalc(shell, genCalc('+', lp));
      else if (t === 'minus') res = await runCalc(shell, genCalc('-', lm));
      else if (t === 'erg') {
        const target = rnd(0, 1) ? 100 : 1000;
        const a = target === 100 ? rnd(11, 89) : rnd(1, 9) * 100 + rnd(1, 9) * 10;
        res = await runErgaenzen(shell, a, target);
      } else res = await runStrahl(shell, ls, 'read');
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
    await award('wiese.check', stars);
    if (shell.dead) return;
    const note = await badgeRun('wiese.check', hits === tasks.length);
    if (shell.dead) return;
    showResult({
      title: 'Wiesen-Check geschafft!', stars, speakId: `wiese.check.done.${stars}`,
      text: `${hits} von ${tasks.length} gleich beim ersten Versuch richtig.  Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`,
      buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück auf die Wiese', onClick: done }],
    });
  })();
  return screenOf(shell);
}
