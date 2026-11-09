/**
 * Plus und Minus bis 1000 mit dem Rechenstrich.
 * Stufen (steuern, was geübt wird): 1 volle Hunderter/Zehner · 2 Hunderter oder Zehner dazu/weg ohne Übergang · 3 Zehner mit Übergang oder Einer ohne ·
 * 4 Einer mit Übergang · 5 dreistellige Zahlen. Bei Fehlern zeigt der Rechenstrich die Rechenschritte (Hunderter, Zehner, Einer).
 */
import { h, pick, rnd, wait } from '../../core/dom';
import { textOf } from '../../core/texts';
import type { Shell } from '../../ui/shell';
import { createKeypad } from '../../ui/keypad';
import { createStrich } from '../../ui/strich';
import type { TaskHooks, TaskResult } from '../wald/tasks';

export interface CalcQ { a: number; b: number; op: '+' | '-' }
export const answerOf = (q: CalcQ) => (q.op === '+' ? q.a + q.b : q.a - q.b);

const dig = (n: number) => [Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];

/** Gibt es beim Rechnen einen Übergang (Zehner- oder Hunderterübergang)? */
function crossing(q: CalcQ): { ones: boolean; tens: boolean } {
  const [, az, ae] = dig(q.a), [, bz, be] = dig(q.b);
  if (q.op === '+') {
    const c1 = ae + be >= 10;
    return { ones: c1, tens: az + bz + (c1 ? 1 : 0) >= 10 };
  }
  const c1 = ae < be;
  return { ones: c1, tens: az - (c1 ? 1 : 0) < bz };
}

type Kind = 'H' | 'Z' | 'E' | 'HZ' | 'HZE';
function kindOf(b: number): Kind {
  const [bh, bz, be] = dig(b);
  if (bh && !bz && !be) return 'H';
  if (!bh && bz && !be) return 'Z';
  if (!bh && !bz && be) return 'E';
  if (!be && bh && bz) return 'HZ';
  return 'HZE';
}

function fits(q: CalcQ, level: number): boolean {
  const k = kindOf(q.b), c = crossing(q), any = c.ones || c.tens;
  switch (level) {
    case 1: return q.a % 10 === 0 && (k === 'H' || k === 'Z') && !any;
    case 2: return (k === 'H' || k === 'Z') && !any;
    case 3: return (k === 'Z' && any && !c.ones) || (k === 'E' && !any) || (k === 'HZ' && !any);
    case 4: return (k === 'E' && any) || (k === 'HZ' && any) || (k === 'Z' && any);
    default: return (k === 'HZE' || k === 'HZ') && true;
  }
}

let lastKey = '';
export function genCalc(op: '+' | '-', level: number): CalcQ {
  const lv = Math.max(1, Math.min(5, level));
  for (let i = 0; i < 400; i++) {
    let a: number, b: number;
    if (lv === 1) {
      const hundreds = Math.random() < 0.5;
      a = hundreds ? rnd(1, 8) * 100 : rnd(1, 9) * 10;
      b = hundreds ? rnd(1, 9) * 100 : rnd(1, 9) * 10;
    } else {
      a = rnd(101, 960);
      const kind = pick(lv === 2 ? ['H', 'Z'] : lv === 3 ? ['Z', 'E', 'HZ'] : lv === 4 ? ['E', 'E', 'Z', 'HZ'] : ['HZE', 'HZE', 'HZ']);
      b = kind === 'H' ? rnd(1, 7) * 100 : kind === 'Z' ? rnd(1, 9) * 10 : kind === 'E' ? rnd(2, 9) : kind === 'HZ' ? rnd(1, 5) * 100 + rnd(1, 9) * 10 : rnd(101, 699);
    }
    const q: CalcQ = { a, b, op };
    const r = answerOf(q);
    if (r < 10 || r > 999 || r % 1 !== 0) continue;
    if (!fits(q, lv)) continue;
    const key = `${a}${op}${b}`;
    if (key === lastKey) continue;
    lastKey = key;
    return q;
  }
  return { a: 340, b: 50, op };
}

/** Rechenschritte für den Rechenstrich: erst Hunderter, dann Zehner, dann Einer (Einer mit Zehnerübergang in zwei Sprüngen). */
export function stepsOf(q: CalcQ): { n: number; part: string }[] {
  const sign = q.op === '+' ? 1 : -1;
  const [bh, bz, be] = dig(q.b);
  const steps: { n: number; part: string }[] = [];
  if (bh) steps.push({ n: sign * bh * 100, part: 'Hunderter' });
  if (bz) steps.push({ n: sign * bz * 10, part: 'Zehner' });
  if (be) {
    const cur = q.a + steps.reduce((s, x) => s + x.n, 0);
    const e = cur % 10;
    if (q.op === '+' && e + be > 10) {
      steps.push({ n: 10 - e, part: 'bis zum vollen Zehner' }, { n: be - (10 - e), part: 'Rest' });
    } else if (q.op === '-' && be > e && e > 0) {
      steps.push({ n: -e, part: 'bis zum vollen Zehner' }, { n: -(be - e), part: 'Rest' });
    } else steps.push({ n: sign * be, part: 'Einer' });
  }
  return steps;
}

export function strichFor(q: CalcQ) {
  const r = answerOf(q);
  const lo = Math.max(0, Math.floor((Math.min(q.a, r) - 40) / 10) * 10);
  const hi = Math.min(1000, Math.ceil((Math.max(q.a, r) + 40) / 10) * 10);
  return createStrich(lo, hi);
}

async function cheer(shell: Shell) {
  const id = pick(['common.cheer.1', 'common.cheer.2', 'common.cheer.3', 'common.cheer.4', 'common.cheer.5']);
  shell.face('happy');
  shell.feedback('good', textOf(id));
  await shell.speakId(id);
}

/** Eine Rechenaufgabe: Gleichung, Ziffernblock, bei Fehlern der Rechenstrich. Nach 3 Versuchen wird die Lösung gezeigt. */
export function runCalc(shell: Shell, q: CalcQ, hooks: TaskHooks = {}): Promise<TaskResult> {
  const res = answerOf(q);
  return new Promise((resolve) => {
    let attempt = 0, busy = false;
    const strich = strichFor(q);
    const strichBox = h('div', { class: 'strich-box off' }, strich.el);
    const pad = createKeypad(3, submit);
    const eq = h('div', { class: 'calc-eq' }, h('span', {}, String(q.a)), h('span', { class: 'op' }, q.op === '+' ? '+' : '−'), h('span', {}, String(q.b)), h('span', { class: 'op' }, '='), h('span', { class: 'q' }, '?'));
    shell.main.replaceChildren(h('div', { class: 'task calc' }, h('div', { class: 'calc-left' }, eq, strichBox), pad.el));
    shell.face('neutral');
    shell.pulseHint(false);
    shell.setPrompt(q.op === '+' ? 'wiese.calc.prompt.plus' : 'wiese.calc.prompt.minus');

    async function showSteps(withText = true) {
      strichBox.classList.remove('off');
      strich.start(q.a);
      await wait(400);
      for (const s of stepsOf(q)) {
        if (shell.dead) return;
        const from = strich.pos(), to = from + s.n;
        const sp = withText ? shell.speakId(s.n > 0 ? 'wiese.calc.hop.plus' : 'wiese.calc.hop.minus', { part: s.part, from, to, n: Math.abs(s.n) }) : Promise.resolve();
        await strich.hop(s.n);
        await sp;
      }
      if (!shell.dead) strich.mark(res, String(res));
    }

    shell.onHint = () => {
      if (busy) return;
      busy = true;
      shell.pulseHint(false);
      showSteps().then(() => (busy = false));
    };

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
      if (q.op === '-' && v === q.a + q.b) await shell.speakId('wiese.calc.hint.opminus');
      else if (v === res + 10 || v === res - 10 || v === res + 100 || v === res - 100) await shell.speakId('wiese.calc.hint.stelle');
      if (shell.dead) return;
      await showSteps();
      if (shell.dead) return;
      if (attempt >= 3) {
        eq.querySelector('.q')!.textContent = String(res);
        await shell.speakId('wiese.calc.reveal', { a: q.a, b: q.b, op: q.op === '+' ? 'plus' : 'minus', r: res });
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

/* ───────────── Ergänzen: a + ? = Ziel ───────────── */
function ergSteps(a: number, t: number): { n: number; part: string }[] {
  const steps: { n: number; part: string }[] = [];
  let cur = a;
  const go = (to: number, part: string) => { if (to > cur && to <= t) { steps.push({ n: to - cur, part }); cur = to; } };
  if (cur % 10) go(Math.ceil(cur / 10) * 10, 'bis zum vollen Zehner');
  if (cur % 100 && t - cur >= 100 - (cur % 100)) go(Math.ceil(cur / 100) * 100, 'bis zum vollen Hunderter');
  const rest = t - cur;
  if (rest >= 100) go(cur + Math.floor(rest / 100) * 100, 'Hunderter');
  if (t - cur >= 10) go(cur + Math.floor((t - cur) / 10) * 10, 'Zehner');
  if (t - cur > 0) go(t, 'Rest');
  return steps;
}

export function runErgaenzen(shell: Shell, a: number, t: number, hooks: TaskHooks = {}): Promise<TaskResult> {
  const res = t - a;
  return new Promise((resolve) => {
    let attempt = 0, busy = false;
    const strich = createStrich(Math.max(0, Math.floor((a - 40) / 10) * 10), Math.min(1000, Math.ceil((t + 40) / 10) * 10));
    const strichBox = h('div', { class: 'strich-box off' }, strich.el);
    const pad = createKeypad(3, submit);
    const eq = h('div', { class: 'calc-eq' }, h('span', {}, String(a)), h('span', { class: 'op' }, '+'), h('span', { class: 'q' }, '?'), h('span', { class: 'op' }, '='), h('span', {}, String(t)));
    shell.main.replaceChildren(h('div', { class: 'task calc' }, h('div', { class: 'calc-left' }, eq, strichBox), pad.el));
    shell.face('neutral');
    shell.pulseHint(false);
    shell.setPrompt('wiese.erg.prompt', { a, t });

    async function showSteps() {
      strichBox.classList.remove('off');
      strich.start(a);
      await wait(400);
      for (const s of ergSteps(a, t)) {
        if (shell.dead) return;
        const from = strich.pos();
        const sp = shell.speakId('wiese.calc.hop.plus', { part: s.part, from, to: from + s.n, n: s.n });
        await strich.hop(s.n);
        await sp;
      }
      if (!shell.dead) strich.mark(t, String(t));
    }
    shell.onHint = () => { if (!busy) { busy = true; showSteps().then(() => (busy = false)); } };

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
      await showSteps();
      if (shell.dead) return;
      if (attempt >= 3) {
        eq.querySelector('.q')!.textContent = String(res);
        await shell.speakId('wiese.erg.reveal', { a, t, r: res });
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
