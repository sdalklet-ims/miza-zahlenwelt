/**
 * Schmetterlings-Paare: Je zwei Schmetterlinge ergeben zusammen 100 (oder 1000). Antippen, zwei passende Flügelzahlen finden.
 * Stufen: 1 volle Zehner zu 100 · 2 beliebige Zahlen zu 100 · 3 volle Hunderter zu 1000 · 4 Zehner zu 1000.
 * Kein Zeitdruck; bei Fehlern wackeln die Falter und ein Tipp zeigt, wie viel noch fehlt.
 */
import { h, pick, rnd, shuffle, wait } from '../../core/dom';
import { getProgress, mutate } from '../../core/progress';
import { textOf } from '../../core/texts';
import { Adaptive } from '../../core/adaptive';
import { createShell } from '../../ui/shell';
import type { Screen } from '../../core/router';
import { finish } from './common';

const COLORS = ['#c9a3ff', '#ff9ec4', '#ffd166', '#8fd3ff', '#9be08a', '#ffa87a', '#b0b8ff', '#f59bd6'];

const butterflyEl = (n: number, col: string) =>
  h('span', { class: 'bf-body', html: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="38" cy="38" rx="34" ry="30" fill="${col}" stroke="#4a3566" stroke-width="3"/><ellipse cx="82" cy="38" rx="34" ry="30" fill="${col}" stroke="#4a3566" stroke-width="3"/><ellipse cx="42" cy="72" rx="22" ry="20" fill="${col}" stroke="#4a3566" stroke-width="3" opacity=".9"/><ellipse cx="78" cy="72" rx="22" ry="20" fill="${col}" stroke="#4a3566" stroke-width="3" opacity=".9"/><rect x="55" y="22" width="10" height="64" rx="5" fill="#4a3566"/><path d="M57 24 q-8 -16 -16 -18 M63 24 q8 -16 16 -18" fill="none" stroke="#4a3566" stroke-width="3" stroke-linecap="round"/></svg>` }, h('b', {}, String(n)));

/** Vier Paare, die zusammen `target` ergeben */
export function makePairs(level: number): { target: number; nums: [number, number][] } {
  const target = level <= 2 ? 100 : 1000;
  const used = new Set<number>();
  const nums: [number, number][] = [];
  let guard = 0;
  while (nums.length < 4 && guard++ < 200) {
    let a: number;
    if (level === 1) a = rnd(1, 9) * 10;
    else if (level === 2) a = rnd(5, 95);
    else if (level === 3) a = rnd(1, 9) * 100;
    else a = rnd(1, 9) * 100 + rnd(1, 9) * 10;
    const b = target - a;
    if (b <= 0 || a === b || used.has(a) || used.has(b)) continue;
    // Hinweis: ähnliche Zahlen vermeiden, damit nicht zwei Lösungen entstehen
    used.add(a); used.add(b);
    nums.push([a, b]);
  }
  return { target, nums };
}

export function partnerScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'fritzi', kind: 'butterfly', name: 'Schmetterling Fritzi' });
  const ad = new Adaptive(Math.min(4, getProgress().levels['wiese.partner'] ?? 1), 1, 4);
  const field = h('div', { class: 'bf-field' });
  const target = h('div', { class: 'bf-target' });
  const sel = h('div', { class: 'bf-sel' });
  shell.main.append(h('div', { class: 'task partner' }, target, sel, field));
  let wrong = 0;
  const ROUNDS = 3;

  (async () => {
    for (let r = 0; r < ROUNDS && !shell.dead; r++) {
      const { target: T, nums } = makePairs(ad.level);
      shell.setInfo(`Runde ${r + 1} von ${ROUNDS} · Stufe ${ad.level}`);
      target.innerHTML = `Zusammen ergeben sie <b>${T}</b>`;
      field.replaceChildren();
      sel.textContent = '';
      let first: { n: number; el: HTMLElement } | null = null;
      let left = nums.length, roundWrong = 0, busy = false;
      const flat = shuffle(nums.flat());
      const slots = shuffle(Array.from({ length: flat.length }, (_, i) => i));
      shell.onHint = () => {
        const tgt = first?.n ?? flat.find((n) => !field.querySelector(`[data-n="${n}"].gone`)) ?? 0;
        void shell.speakId('wiese.partner.hint', { a: tgt, t: T, r: T - tgt });
      };
      await new Promise<void>((res) => {
        flat.forEach((n, i) => {
          const s = slots[i];
          const el = h('button', { class: 'bf', 'data-n': String(n), style: { left: 24 + (s % 4) * 205 + 'px', top: 14 + Math.floor(s / 4) * 190 + (i % 2) * 18 + 'px', animationDelay: -i * 0.6 + 's' } }, butterflyEl(n, COLORS[i % COLORS.length]));
          el.addEventListener('click', async () => {
            if (busy || shell.dead || el.classList.contains('gone')) return;
            if (!first) {
              first = { n, el };
              el.classList.add('sel');
              sel.textContent = `${n} + ? = ${T}`;
              return;
            }
            if (first.el === el) { el.classList.remove('sel'); first = null; sel.textContent = ''; return; }
            busy = true;
            const a = first;
            if (a.n + n === T) {
              for (const e of [a.el, el]) e.classList.add('gone');
              sel.textContent = `${a.n} + ${n} = ${T} ✓`;
              shell.face('happy');
              shell.pay(a.n && roundWrong === 0 ? 2 : 1);
              ad.record(true);
              left--;
              first = null;
              await wait(700);
              sel.textContent = '';
              if (left === 0) { await wait(300); res(); }
            } else {
              wrong++; roundWrong++;
              ad.record(false);
              for (const e of [a.el, el]) { e.classList.remove('sel'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
              sel.textContent = `${a.n} + ${n} = ${a.n + n} – das sind nicht ${T}`;
              shell.face('think');
              shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
              await shell.speakId('wiese.partner.hint', { a: a.n, t: T, r: T - a.n });
              first = null;
              await wait(300);
              sel.textContent = '';
            }
            busy = false;
          });
          field.append(el);
        });
        shell.face('neutral');
        shell.setPrompt('wiese.partner.prompt', { t: T });
      });
      if (shell.dead) return;
      mutate((p) => void (p.levels['wiese.partner'] = ad.level));
      if (roundWrong === 0 && ad.level < 4) { ad.level++; mutate((p) => void (p.levels['wiese.partner'] = ad.level)); }
    }
    if (shell.dead) return;
    const stars = wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1;
    await finish(shell, 'wiese.partner', stars, wrong === 0 ? 'Alle Paare auf Anhieb gefunden!' : `${wrong} Mal daneben getippt – aber alle Paare gefunden.`, done, again, 4, 'Zurück auf die Wiese', wrong === 0);
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
