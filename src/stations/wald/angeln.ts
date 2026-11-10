/**
 * Zahlen-Angeln: Fische tragen Zahlen, Mia fängt die richtige.
 * Aufgaben: Nachfolger, Vorgänger, Stellenwerte, 10 mehr, 100 weniger, größte/kleinste Zahl, Zahl dazwischen.
 * Kein Zeitdruck. Fehler = freundlicher Hinweis, nach 3 Fehlversuchen leuchtet der richtige Fisch.
 */
import { h, pick, rnd, shuffle, wait } from '../../core/dom';
import { getProgress } from '../../core/progress';
import { getWorld, textOf, type Params } from '../../core/texts';
import { createShell, type Shell } from '../../ui/shell';
import type { TaskResult } from './tasks';
import { digitsOf, NumberGen, type PunkteRule } from './generators';
import { finish } from './minigames';
import type { Screen } from '../../core/router';

const world = getWorld('wald')!;
const MIA = { id: 'mia', kind: 'mia', name: 'Mia' };
const KINDS = ['next', 'prev', 'stellen', 'plus10', 'minus100', 'big', 'small', 'between'] as const;
type Kind = (typeof KINDS)[number];

/** Zahlen an Zehner-/Hunderterübergängen: hier passieren die meisten Fehler */
const NEXT_POOL = [99, 109, 119, 199, 299, 399, 499, 599, 699, 799, 899, 909, 989, 990, 998];
const PREV_POOL = [100, 110, 120, 200, 300, 400, 500, 600, 700, 800, 900, 910, 990];

interface Round { kind: Kind; params: Params; fish: number[]; right: (n: number) => boolean }

const ok = (n: number) => n >= 1 && n <= 999;

function distractors(ans: number, avoid: (n: number) => boolean, count: number): number[] {
  const s = String(ans).padStart(3, '0');
  const cand = [ans + 1, ans - 1, ans + 10, ans - 10, ans + 100, ans - 100, Number(s[0] + s[2] + s[1]), Number(s[1] + s[0] + s[2]), ans + 2, ans - 2, ans + 20, ans - 20];
  const out = new Set<number>();
  for (const c of shuffle(cand)) if (ok(c) && c !== ans && !avoid(c)) out.add(c);
  while (out.size < count) { const r = ans + rnd(-150, 150); if (ok(r) && r !== ans && !avoid(r)) out.add(r); }
  return [...out].slice(0, count);
}

function makeRound(kind: Kind, gen: NumberGen, lvl: number): Round {
  const num = () => { let n = gen.next(lvl); while (n < 100) n = gen.next(lvl); return n; };
  if (kind === 'next' || kind === 'prev' || kind === 'plus10' || kind === 'minus100') {
    let b = num();
    if (kind === 'next') b = Math.random() < 0.55 ? pick(NEXT_POOL) : Math.min(b, 998);
    if (kind === 'prev') b = Math.random() < 0.55 ? pick(PREV_POOL) : Math.max(b, 101);
    if (kind === 'plus10') b = Math.min(b, 980);
    if (kind === 'minus100') b = Math.max(b, 210);
    const ans = kind === 'next' ? b + 1 : kind === 'prev' ? b - 1 : kind === 'plus10' ? b + 10 : b - 100;
    const fish = shuffle([ans, ...distractors(ans, () => false, 4)]);
    return { kind, params: { n: b }, fish, right: (n) => n === ans };
  }
  if (kind === 'stellen') {
    const n = num(), [a, b, c] = digitsOf(n);
    return { kind, params: { h: a, z: b, e: c }, fish: shuffle([n, ...distractors(n, () => false, 4)]), right: (x) => x === n };
  }
  if (kind === 'big' || kind === 'small') {
    const set = new Set<number>();
    while (set.size < 5) set.add(num());
    const arr = [...set];
    const t = kind === 'big' ? Math.max(...arr) : Math.min(...arr);
    return { kind, params: {}, fish: shuffle(arr), right: (x) => x === t };
  }
  // between: genau ein Fisch liegt zwischen a und b
  const a = rnd(1, 8) * 100 + rnd(0, 8) * 10, b = a + 10 * rnd(2, 4);
  const ans = a + rnd(2, b - a - 2);
  const bad = (n: number) => n > a && n < b;
  return { kind, params: { a, b }, fish: shuffle([ans, ...distractors(ans, bad, 4)]), right: (x) => x > a && x < b };
}

export function angelnScreen(done: () => void, again: () => void): Screen {
  const shell = createShell(MIA);
  const lvl = Math.max(2, getProgress().levels['wald.punkte'] ?? 1);
  const gen = new NumberGen(world.games.punkte.levels as PunkteRule[]);
  const field = h('div', { class: 'pond-field' });
  const bucket = h('div', { class: 'bucket' }, '🪣 0');
  shell.main.append(h('div', { class: 'task angeln' }, field, bucket));
  let wrong = 0;

  (async () => {
    const order = shuffle([...KINDS]);
    for (let r = 0; r < order.length && !shell.dead; r++) {
      const rd = makeRound(order[r], gen, lvl);
      shell.setInfo(`Fang ${r + 1} von ${order.length}`);
      field.replaceChildren();
      let tries = 0, solved = false;
      const slots = shuffle([0, 1, 2, 3, 4]);
      shell.onHint = () => void shell.speakId(`wald.angeln.hint.${rd.kind}`, rd.params);
      const fishEls = rd.fish.map((n, i) => {
        const s = slots[i];
        const el = h('button', { class: 'fish', style: { left: 40 + (s % 3) * 270 + (s > 2 ? 130 : 0) + 'px', top: 26 + Math.floor(s / 3) * 175 + (i % 2) * 20 + 'px', animationDelay: -i * 0.7 + 's' } },
          h('span', { class: 'fish-body' }, h('i', { class: 'fish-tail' }), h('i', { class: 'fish-eye' }), h('b', {}, String(n))));
        el.addEventListener('click', async () => {
          if (solved || shell.dead) return;
          if (rd.right(n)) {
            solved = true;
            el.classList.add('caught');
            bucket.textContent = `🪣 ${r + 1}`;
            shell.face('happy');
            shell.pay(tries === 0 ? 4 : 1);
            shell.feedback('good', textOf('common.cheer.' + rnd(1, 5)));
          } else {
            tries++; wrong++;
            el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
            shell.face('think');
            shell.feedback('oops', 'Nicht ganz – schau noch einmal genau hin!');
            void shell.speakId(`wald.angeln.hint.${rd.kind}`, rd.params);
            if (tries >= 3) fishEls.find((_, k) => rd.right(rd.fish[k]))?.classList.add('glow');
          }
        });
        field.append(el);
        return el;
      });
      shell.face('neutral');
      shell.setPrompt(`wald.angeln.${rd.kind}`, rd.params);
      while (!solved && !shell.dead) await wait(150);
      await wait(1100);
    }
    if (shell.dead) return;
    const stars = wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1;
    await finish(shell, 'wald.angeln', stars, wrong === 0 ? 'Kein einziger Fehlgriff!' : `${wrong} Mal daneben gegriffen – aber alle gefangen.`, done, again, wrong === 0);
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}

/** Eine einzelne Fang-Aufgabe (für die Mathearbeit): richtig beim ersten Griff = Punkt */
export function runFishTask(shell: Shell, lvl: number): Promise<TaskResult> {
  const gen = new NumberGen(world.games.punkte.levels as PunkteRule[]);
  const rd = makeRound(pick([...KINDS]), gen, Math.max(2, lvl));
  const field = h('div', { class: 'pond-field' });
  const bucket = h('div', { class: 'bucket' }, '🎣');
  shell.main.replaceChildren(h('div', { class: 'task angeln' }, field, bucket));
  return new Promise((resolve) => {
    let tries = 0, solved = false;
    const slots = shuffle([0, 1, 2, 3, 4]);
    shell.onHint = () => void shell.speakId(`wald.angeln.hint.${rd.kind}`, rd.params);
    const fishEls = rd.fish.map((n, i) => {
      const s = slots[i];
      const el = h('button', { class: 'fish', style: { left: 40 + (s % 3) * 270 + (s > 2 ? 130 : 0) + 'px', top: 26 + Math.floor(s / 3) * 175 + (i % 2) * 20 + 'px', animationDelay: -i * 0.7 + 's' } },
        h('span', { class: 'fish-body' }, h('i', { class: 'fish-tail' }), h('i', { class: 'fish-eye' }), h('b', {}, String(n))));
      el.addEventListener('click', async () => {
        if (solved || shell.dead) return;
        if (rd.right(n)) {
          solved = true;
          el.classList.add('caught');
          shell.face('happy');
          shell.feedback('good', textOf('common.cheer.' + rnd(1, 5)));
          await wait(1000);
          if (!shell.dead) resolve({ firstTry: tries === 0, attempts: tries + 1 });
        } else {
          tries++;
          el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
          shell.face('think');
          shell.feedback('oops', 'Nicht ganz – schau noch einmal genau hin!');
          void shell.speakId(`wald.angeln.hint.${rd.kind}`, rd.params);
          if (tries >= 3) fishEls.find((_, k) => rd.right(rd.fish[k]))?.classList.add('glow');
        }
      });
      field.append(el);
      return el;
    });
    shell.face('neutral');
    shell.setPrompt(`wald.angeln.${rd.kind}`, rd.params);
  });
}
