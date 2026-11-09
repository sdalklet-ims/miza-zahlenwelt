/**
 * Malnehmen und Teilen (Einmaleins) mit Punktefeld und Rechenstrich.
 * Stufen (Reihen): 1 → 2er, 5er, 10er · 2 → 3er, 4er · 3 → 6er, 8er · 4 → 7er, 9er · 5 → alle gemischt.
 * Mal: Bild aus Reihen/Spalten (nur auf den unteren Stufen sofort sichtbar), Hilfe = Sprünge gleicher Größe auf dem Rechenstrich.
 * Teilen: „Wie oft passt die Zahl hinein?“ – gleiche Sprünge vom Start bis zur großen Zahl, die Sprünge werden gezählt.
 */
import { h, pick, rnd, wait } from '../../core/dom';
import { textOf } from '../../core/texts';
import type { Shell } from '../../ui/shell';
import { createKeypad } from '../../ui/keypad';
import { createStrich } from '../../ui/strich';
import { dotsEl } from '../../ui/dots';
import type { TaskHooks, TaskResult } from '../wald/tasks';

export interface MulQ { a: number; b: number; op: '×' | ':' }
export const answerOf = (q: MulQ) => (q.op === '×' ? q.a * q.b : q.a / q.b);

const TABLES: Record<number, number[]> = { 1: [2, 5, 10], 2: [3, 4], 3: [6, 8], 4: [7, 9], 5: [2, 3, 4, 5, 6, 7, 8, 9, 10] };

let lastKey = '';
export function genMul(op: '×' | ':', level: number): MulQ {
  const lv = Math.max(1, Math.min(5, level));
  for (let i = 0; i < 100; i++) {
    const t = pick(TABLES[lv]), k = rnd(lv === 1 ? 2 : 1, 10);
    // Mal: 3 × 6 oder 6 × 3 (Tauschaufgaben kommen vor); Teilen: (t·k) : t
    const q: MulQ = op === '×' ? (Math.random() < 0.5 ? { a: k, b: t, op } : { a: t, b: k, op }) : { a: t * k, b: t, op };
    const key = `${q.a}${op}${q.b}`;
    if (key === lastKey) continue;
    lastKey = key;
    return q;
  }
  return { a: 4, b: 5, op };
}

async function cheer(shell: Shell) {
  const id = pick(['common.cheer.1', 'common.cheer.2', 'common.cheer.3', 'common.cheer.4', 'common.cheer.5']);
  shell.face('happy');
  shell.feedback('good', textOf(id));
  await shell.speakId(id);
}

/** Eine Mal- oder Teilaufgabe. level steuert, ob das Punktebild gleich zu sehen ist. */
export function runMul(shell: Shell, q: MulQ, level: number, hooks: TaskHooks = {}): Promise<TaskResult> {
  const res = answerOf(q);
  return new Promise((resolve) => {
    let attempt = 0, busy = false;
    const total = q.op === '×' ? res : q.a;
    const max = Math.min(100, Math.max(total, q.op === '×' ? res : q.a) + 10);
    const strich = createStrich(0, Math.ceil(max / 10) * 10);
    const strichBox = h('div', { class: 'strich-box off' }, strich.el);
    const picBox = h('div', { class: 'dots-box' });
    const showPic = () => {
      picBox.replaceChildren(q.op === '×' ? dotsEl(q.a, q.b) : dotsEl(res, q.b, true));
      picBox.classList.add('on');
    };
    if (level <= 2) showPic();
    const pad = createKeypad(3, submit);
    const eq = h('div', { class: 'calc-eq' }, h('span', {}, String(q.a)), h('span', { class: 'op' }, q.op), h('span', {}, String(q.b)), h('span', { class: 'op' }, '='), h('span', { class: 'q' }, '?'));
    shell.main.replaceChildren(h('div', { class: 'task calc mul' }, h('div', { class: 'calc-left' }, eq, picBox, strichBox), pad.el));
    shell.face('neutral');
    shell.pulseHint(false);
    shell.setPrompt(q.op === '×' ? 'fluss.mal.prompt' : 'fluss.geteilt.prompt', { a: q.a, b: q.b });

    async function showSteps() {
      showPic();
      strichBox.classList.remove('off');
      strich.start(0);
      await wait(400);
      const hops = q.op === '×' ? q.a : res;
      const size = q.b;
      const list: number[] = [];
      for (let i = 1; i <= hops; i++) list.push(i * size);
      const talk = shell.speakId(q.op === '×' ? 'fluss.mal.hint' : 'fluss.geteilt.hint', { a: q.a, b: q.b, list: list.join(', '), k: res, n: q.a });
      for (let i = 0; i < hops; i++) {
        if (shell.dead) return;
        await strich.hop(size, `+${size}`, undefined, hops > 5);
      }
      if (!shell.dead) strich.mark(q.op === '×' ? res : q.a, q.op === '×' ? String(res) : `${res} Sprünge`);
      await talk;
    }

    shell.onHint = () => { if (!busy) { busy = true; shell.pulseHint(false); showSteps().then(() => (busy = false)); } };

    async function submit(v: number) {
      if (busy || shell.dead) return;
      busy = true;
      pad.lock(true);
      attempt++;
      const ok = v === res;
      const change = hooks.onAttempt?.(ok, attempt) ?? null;
      if (ok) {
        eq.querySelector('.q')!.textContent = String(res);
        await cheer(shell);
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
        return;
      }
      pad.shake();
      shell.face('think');
      shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
      if (q.op === '×' && v === q.a + q.b) await shell.speakId('fluss.mal.hint.plus');
      else if (q.op === ':' && v === q.a * q.b) await shell.speakId('fluss.geteilt.hint.mal');
      if (shell.dead) return;
      await showSteps();
      if (shell.dead) return;
      if (attempt >= 3) {
        eq.querySelector('.q')!.textContent = String(res);
        await shell.speakId(q.op === '×' ? 'fluss.mal.reveal' : 'fluss.geteilt.reveal', { a: q.a, b: q.b, r: res });
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: false, attempts: attempt });
        return;
      }
      await hooks.afterFeedback?.(change);
      pad.clear();
      strichBox.classList.add('off');
      shell.face('neutral');
      pad.lock(false);
      busy = false;
    }
  });
}
