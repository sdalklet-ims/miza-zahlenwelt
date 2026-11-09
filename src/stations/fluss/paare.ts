/**
 * Mal-Paare: Aufgabe und Ergebnis finden zusammen (z. B. 7 × 8 und 56), auch Tauschaufgaben (3 × 7 und 7 × 3) und Teilaufgaben.
 * Otter Otto legt Kiesel mit Aufgaben und Ergebnissen aus – tippe zwei, die zusammengehören.
 */
import { h, pick, rnd, shuffle, wait } from '../../core/dom';
import { getProgress, mutate } from '../../core/progress';
import { textOf } from '../../core/texts';
import { Adaptive } from '../../core/adaptive';
import { createShell } from '../../ui/shell';
import type { Screen } from '../../core/router';
import { finish } from '../wiese/common';

const TABLES: Record<number, number[]> = { 1: [2, 5, 10], 2: [3, 4, 2, 5], 3: [6, 8, 4, 3], 4: [7, 9, 6, 8], 5: [3, 4, 6, 7, 8, 9] };
const SHAPES = ['#d9d6cf', '#cfd8e0', '#e0d3c4', '#d6dccd', '#dcd0d8'];

interface Pair { a: string; b: string }

export function makePairs(level: number): Pair[] {
  const used = new Set<number>();
  const pairs: Pair[] = [];
  let g = 0;
  while (pairs.length < 5 && g++ < 300) {
    const t = pick(TABLES[level] ?? TABLES[5]), k = rnd(2, 10);
    const res = t * k;
    if (used.has(res)) continue;
    used.add(res);
    const kind = level >= 3 ? pick(['mal', 'tausch', 'geteilt']) : pick(['mal', 'mal', 'geteilt']);
    if (kind === 'mal') pairs.push({ a: `${k} × ${t}`, b: String(res) });
    else if (kind === 'geteilt') pairs.push({ a: `${res} : ${t}`, b: String(k) });
    else pairs.push({ a: `${k} × ${t}`, b: `${t} × ${k}` });
  }
  return pairs;
}

export function paareScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'otto', kind: 'otter', name: 'Otter Otto' });
  const ad = new Adaptive(Math.min(5, getProgress().levels['fluss.paare'] ?? 1), 1, 5);
  const field = h('div', { class: 'peb-field' });
  const sel = h('div', { class: 'bf-sel' });
  shell.main.append(h('div', { class: 'task paare' }, sel, field));
  let wrong = 0;
  const ROUNDS = 3;

  (async () => {
    for (let r = 0; r < ROUNDS && !shell.dead; r++) {
      const pairs = makePairs(ad.level);
      shell.setInfo(`Runde ${r + 1} von ${ROUNDS} · Stufe ${ad.level}`);
      field.replaceChildren();
      sel.textContent = '';
      const cards = shuffle(pairs.flatMap((p, i) => [{ t: p.a, i }, { t: p.b, i }]));
      let first: { i: number; el: HTMLElement; t: string } | null = null;
      let left = pairs.length, roundWrong = 0, busy = false;
      shell.onHint = () => void shell.speakId('fluss.paare.hint');
      await new Promise<void>((res) => {
        cards.forEach((c, k) => {
          const el = h('button', { class: 'peb', style: { '--c': SHAPES[k % SHAPES.length], animationDelay: -k * 0.4 + 's' } }, c.t);
          el.addEventListener('click', async () => {
            if (busy || shell.dead || el.classList.contains('gone')) return;
            if (!first) { first = { i: c.i, el, t: c.t }; el.classList.add('sel'); sel.textContent = c.t; return; }
            if (first.el === el) { el.classList.remove('sel'); first = null; sel.textContent = ''; return; }
            busy = true;
            const a = first;
            if (a.i === c.i) {
              for (const e of [a.el, el]) e.classList.add('gone');
              sel.textContent = `${pairs[c.i].a} = ${pairs[c.i].b} ✓`;
              shell.face('happy');
              shell.pay(roundWrong === 0 ? 2 : 1);
              ad.record(true);
              left--; first = null;
              await wait(700);
              sel.textContent = '';
              if (left === 0) { await wait(300); res(); }
            } else {
              wrong++; roundWrong++;
              ad.record(false);
              for (const e of [a.el, el]) { e.classList.remove('sel', 'shake'); void e.offsetWidth; e.classList.add('shake'); }
              shell.face('think');
              shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
              await shell.speakId('fluss.paare.hint');
              first = null;
              sel.textContent = '';
            }
            busy = false;
          });
          field.append(el);
        });
        shell.face('neutral');
        shell.setPrompt('fluss.paare.prompt');
      });
      if (shell.dead) return;
      mutate((p) => void (p.levels['fluss.paare'] = ad.level));
      if (roundWrong === 0 && ad.level < 5) { ad.level++; mutate((p) => void (p.levels['fluss.paare'] = ad.level)); }
    }
    if (shell.dead) return;
    const stars = wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1;
    await finish(shell, 'fluss.paare', stars, wrong === 0 ? 'Alle Kiesel auf Anhieb zugeordnet!' : `${wrong} Mal falsch gelegt – aber alles zugeordnet.`, done, again, 4, 'Zurück zum Fluss');
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
