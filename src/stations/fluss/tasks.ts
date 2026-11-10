/** Einzelaufgaben am Fluss für die Mathearbeit: Reihe fortsetzen und Malaufgabe aus vier Zahlen wählen. */
import { h, pick, rnd, shuffle, wait } from '../../core/dom';
import { textOf } from '../../core/texts';
import type { Shell } from '../../ui/shell';
import { createKeypad } from '../../ui/keypad';
import type { TaskResult } from '../wald/tasks';

const cheerIds = ['common.cheer.1', 'common.cheer.2', 'common.cheer.3', 'common.cheer.4', 'common.cheer.5'];

/** „6, 12, 18, ?“ – nächste Zahl der Einmaleins-Reihe */
export function runSeq(shell: Shell, level: number): Promise<TaskResult> {
  const tables = level <= 2 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9];
  const t = pick(tables), start = rnd(0, 2);
  const shown = [1, 2, 3].map((k) => (start + k) * t), ans = (start + 4) * t;
  const seq = shown.join(', ');
  return new Promise((resolve) => {
    let attempt = 0, busy = false;
    const pad = createKeypad(3, submit);
    shell.main.replaceChildren(h('div', { class: 'task calc' }, h('div', { class: 'calc-left' }, h('div', { class: 'calc-eq' }, ...shown.map((n) => h('span', {}, String(n) + ','))), h('div', { class: 'calc-eq' }, h('span', { class: 'q' }, '?'))), pad.el));
    shell.face('neutral');
    shell.setPrompt('exam.reihe.prompt', { seq });
    shell.onHint = () => void shell.speakId('exam.reihe.hint');
    async function submit(v: number) {
      if (busy || shell.dead) return;
      busy = true; pad.lock(true); attempt++;
      if (v === ans) {
        shell.face('happy');
        shell.feedback('good', textOf(pick(cheerIds)));
        await wait(900);
        if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
        return;
      }
      pad.shake(); shell.face('think');
      shell.feedback('oops', textOf('common.retry.1'));
      await shell.speakId('exam.reihe.hint');
      if (attempt >= 3) { await shell.sayText(`Die nächste Zahl ist ${ans}.`); if (!shell.dead) resolve({ firstTry: false, attempts: attempt }); return; }
      pad.clear(); pad.lock(false); busy = false;
    }
  });
}

/** „7 × 8 = ?“ mit vier Antwortknöpfen */
export function runChoice(shell: Shell, level: number): Promise<TaskResult> {
  const tabs = level <= 2 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9];
  const a = rnd(2, 10), b = pick(tabs), ans = a * b;
  const opts = new Set<number>([ans]);
  for (const d of shuffle([a, -a, b, -b, 1, -1, 10, -10, 2 * a])) { const v = ans + d; if (v > 0 && v !== ans && opts.size < 4) opts.add(v); }
  while (opts.size < 4) opts.add(ans + rnd(-12, 12) || ans + 13);
  return new Promise((resolve) => {
    let attempt = 0, busy = false;
    const row = h('div', { class: 'strahl-choices' });
    shell.main.replaceChildren(h('div', { class: 'task strahl' }, h('div', { class: 'strahl-readout' }, `${a} × ${b} = ?`), row));
    shell.face('neutral');
    shell.setPrompt('exam.choice.prompt', { a, b });
    shell.onHint = () => void shell.speakId('exam.choice.hint', { a, b });
    shuffle([...opts]).forEach((v) => {
      const btn = h('button', { class: 'btn big-choice', onclick: async () => {
        if (busy || shell.dead) return;
        busy = true; attempt++;
        if (v === ans) {
          shell.face('happy');
          shell.feedback('good', textOf(pick(cheerIds)));
          await wait(900);
          if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
          return;
        }
        btn.classList.add('shake'); shell.face('think');
        shell.feedback('oops', textOf('common.retry.2'));
        await shell.speakId('exam.choice.hint', { a, b });
        if (attempt >= 3) { await shell.sayText(`${a} mal ${b} ist ${ans}.`); if (!shell.dead) resolve({ firstTry: false, attempts: attempt }); return; }
        btn.classList.remove('shake'); busy = false;
      } }, String(v));
      row.append(btn);
    });
  });
}
