/**
 * Seerosen-Reihen: Frosch Fred hüpft in einer Einmaleins-Reihe. Tippe alle Seerosen, deren Zahl zur Reihe gehört.
 * Stufe 1: 2er, 5er, 10er · 2: 3er, 4er · 3: 6er, 8er · 4: 7er, 9er. Falsche Seerosen wackeln, der Tipp zählt die Reihe vor.
 */
import { h, pick, shuffle, wait } from '../../core/dom';
import { getProgress, mutate } from '../../core/progress';
import { textOf } from '../../core/texts';
import { Adaptive } from '../../core/adaptive';
import { createShell } from '../../ui/shell';
import type { Screen } from '../../core/router';
import { finish } from '../wiese/common';

const TABLES: Record<number, number[]> = { 1: [2, 5, 10], 2: [3, 4], 3: [6, 8], 4: [7, 9] };

function padsFor(t: number): { nums: number[]; right: Set<number> } {
  const mult = new Set<number>();
  const all = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const k of all.slice(0, 5)) mult.add(k * t);
  // Ablenker: Nachbarn der Vielfachen und Zahlen anderer Reihen, die nicht zur Reihe gehören
  const wrong = new Set<number>();
  for (const m of shuffle([...mult])) for (const d of shuffle([1, -1, 2, -2, t])) {
    const v = m + d;
    if (wrong.size < 7 && v > 0 && v <= t * 10 && v % t !== 0) wrong.add(v);
  }
  let g = 0;
  while (wrong.size < 7 && g++ < 100) { const v = 1 + Math.floor(Math.random() * t * 10); if (v % t !== 0) wrong.add(v); }
  return { nums: shuffle([...mult, ...wrong]), right: mult };
}

export function reiheScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'fred', kind: 'frog', name: 'Frosch Fred' });
  const ad = new Adaptive(Math.min(4, getProgress().levels['fluss.reihe'] ?? 1), 1, 4);
  const field = h('div', { class: 'lily-field' });
  const frog = h('div', { class: 'lily-frog' }, '🐸');
  const count = h('div', { class: 'lily-count' });
  shell.main.append(h('div', { class: 'task reihe' }, count, field));
  let wrong = 0;
  const ROUNDS = 4;

  (async () => {
    for (let r = 0; r < ROUNDS && !shell.dead; r++) {
      const t = pick(TABLES[ad.level]);
      const { nums, right } = padsFor(t);
      shell.setInfo(`Runde ${r + 1} von ${ROUNDS} · Stufe ${ad.level}`);
      field.replaceChildren(frog);
      frog.style.left = '20px'; frog.style.top = '210px';
      let left = right.size, roundWrong = 0, busy = false;
      count.textContent = `Gefunden: 0 von ${right.size}`;
      shell.onHint = () => void shell.speakId('fluss.reihe.hint', { t, list: [1, 2, 3, 4, 5].map((k) => k * t).join(', ') });
      const slots = shuffle(Array.from({ length: nums.length }, (_, i) => i));
      await new Promise<void>((res) => {
        nums.forEach((n, i) => {
          const s = slots[i];
          const left_ = 40 + (s % 6) * 150 + (Math.floor(s / 6) % 2) * 50, top = 18 + Math.floor(s / 6) * 130 + (i % 2) * 12;
          const el = h('button', { class: 'lily', 'data-n': String(n), style: { left: left_ + 'px', top: top + 'px', animationDelay: -i * 0.5 + 's' } }, h('b', {}, String(n)));
          el.addEventListener('click', async () => {
            if (busy || shell.dead || el.classList.contains('got')) return;
            if (right.has(n)) {
              el.classList.add('got');
              frog.style.left = left_ + 40 + 'px'; frog.style.top = top - 34 + 'px';
              frog.classList.remove('jump'); void frog.offsetWidth; frog.classList.add('jump');
              shell.face('happy');
              ad.record(true);
              left--;
              count.textContent = `Gefunden: ${right.size - left} von ${right.size}`;
              if (left === 0) { busy = true; await wait(900); res(); }
            } else {
              wrong++; roundWrong++;
              ad.record(false);
              el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
              shell.face('think');
              shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
              busy = true;
              await shell.speakId('fluss.reihe.oops', { n, t });
              busy = false;
            }
          });
          field.append(el);
        });
        shell.face('neutral');
        shell.setPrompt('fluss.reihe.prompt', { t });
      });
      if (shell.dead) return;
      shell.pay(roundWrong === 0 ? 3 : 1);
      mutate((p) => void (p.levels['fluss.reihe'] = ad.level));
      if (roundWrong === 0 && ad.level < 4) { ad.level++; mutate((p) => void (p.levels['fluss.reihe'] = ad.level)); }
    }
    if (shell.dead) return;
    const stars = wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1;
    await finish(shell, 'fluss.reihe', stars, wrong === 0 ? 'Fred ist begeistert: kein Fehlsprung!' : `${wrong} Fehlsprünge – aber alle Seerosen gefunden.`, done, again, 4, 'Zurück zum Fluss', wrong === 0);
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
