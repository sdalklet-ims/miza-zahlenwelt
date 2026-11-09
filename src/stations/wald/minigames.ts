/** Kleine Spiele für Sterne und Münzen: Memory (Zahl ↔ Punkte) und Zahlenpilze (Zahlen ordnen). Kein Zeitdruck. */
import { h, rnd, shuffle, wait } from '../../core/dom';
import { getProgress } from '../../core/progress';
import { createShell } from '../../ui/shell';
import { award, showResult } from '../../ui/results';
import { digitsOf, NumberGen, type PunkteRule } from './generators';
import { getWorld } from '../../core/texts';
import type { Screen } from '../../core/router';

const world = getWorld('wald')!;
const MIA = { id: 'mia', kind: 'mia', name: 'Mia' };

async function finish(shell: ReturnType<typeof createShell>, key: string, stars: number, text: string, done: () => void, again: () => void) {
  shell.pay(stars * 5);
  await award(key, stars);
  if (shell.dead) return;
  showResult({
    title: 'Geschafft!', stars, text: `${text}  Verdient: ${shell.earned} 🪙`, speakId: 'common.round.done',
    buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück in den Wald', onClick: done }],
  });
}

/** Mini-Stellentafel als Kartenbild */
function dotsCard(n: number) {
  const [a, b, c] = digitsOf(n);
  const col = (cls: string, k: number) => h('div', { class: 'mb-col ' + cls }, ...Array.from({ length: k }, () => h('i', { class: 'mb-dot ' + cls })));
  return h('div', { class: 'mini-board' }, col('H', a), col('Z', b), col('E', c));
}

/* ───────────── Memory ───────────── */
export function memoryScreen(done: () => void, again: () => void): Screen {
  const shell = createShell(MIA);
  const rules = world.games.punkte.levels as PunkteRule[];
  const lvl = Math.max(2, getProgress().levels['wald.punkte'] ?? 1);
  const gen = new NumberGen(rules);
  const nums = new Set<number>();
  while (nums.size < 6) nums.add(gen.next(lvl));
  const cards = shuffle([...nums].flatMap((n) => [{ n, kind: 'num' as const }, { n, kind: 'dots' as const }]));

  let moves = 0, matched = 0, open: HTMLElement[] = [], busy = false;
  const grid = h('div', { class: 'mem-grid' });
  const els = cards.map((cd) => {
    const front = cd.kind === 'num' ? h('div', { class: 'mem-num' }, String(cd.n)) : dotsCard(cd.n);
    const el = h('button', { class: 'mem-card', 'data-n': String(cd.n) }, h('div', { class: 'mem-back' }, '?'), h('div', { class: 'mem-front' }, front));
    el.addEventListener('click', () => flip(el));
    return el;
  });
  grid.append(...els);
  shell.main.append(h('div', { class: 'task mem' }, grid));
  shell.setInfo('Züge: 0');
  shell.setPrompt('wald.memory.prompt');
  shell.onHint = async () => {
    const pair = els.filter((e) => !e.classList.contains('done') && !e.classList.contains('up'));
    const n = pair[0]?.dataset.n;
    pair.filter((e) => e.dataset.n === n).forEach((e) => e.classList.add('glow'));
    await shell.speakId('wald.memory.hint');
    els.forEach((e) => e.classList.remove('glow'));
  };

  async function flip(el: HTMLElement) {
    if (busy || shell.dead || el.classList.contains('up') || el.classList.contains('done')) return;
    el.classList.add('up');
    open.push(el);
    if (open.length < 2) return;
    busy = true;
    moves++;
    shell.setInfo(`Züge: ${moves}`);
    const [a, b] = open;
    open = [];
    if (a.dataset.n === b.dataset.n) {
      a.classList.add('done'); b.classList.add('done');
      matched++;
      shell.pay(1);
      shell.face('happy');
      const said = shell.speakId('wald.memory.match', { n: a.dataset.n! });
      if (matched === 6 && !shell.dead) {
        await said;
        const stars = moves <= 8 ? 3 : moves <= 12 ? 2 : 1;
        await finish(shell, 'wald.memory', stars, `Geschafft in ${moves} Zügen.`, done, again);
      }
    } else {
      shell.face('think');
      await wait(1100);
      a.classList.remove('up'); b.classList.remove('up');
      shell.face('neutral');
    }
    busy = false;
  }
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}

/* ───────────── Zahlenpilze ───────────── */
const SHROOM = ['#e8504a', '#e9a24b', '#c3a6ff', '#4a90d9', '#f08aa8', '#4f9d5d', '#f4c430'];

function pickNumbers(round: number): number[] {
  const set = new Set<number>();
  while (set.size < 7) {
    if (round === 0) set.add(rnd(1, 9) * 100 + rnd(0, 9) * 10 + rnd(0, 9)); // verschiedene Hunderter
    else if (round === 1) { const hh = rnd(2, 8) * 100; set.add(hh + rnd(0, 9) * 10 + rnd(0, 9)); } // gleiche Hunderter
    else { const base = rnd(1, 8) * 100 + rnd(0, 9) * 10; set.add(base + rnd(0, 9)); } // gleiche Hunderter und Zehner
  }
  const arr = [...set];
  // genau ein Paar gleiche Hunderter in Runde 0 vermeiden ist nicht nötig – Zufall reicht
  return shuffle(arr);
}

export function pilzeScreen(done: () => void, again: () => void): Screen {
  const shell = createShell(MIA);
  let wrong = 0;
  const basket = h('div', { class: 'basket' }, '🧺 0');
  const field = h('div', { class: 'shroom-field' });
  shell.main.append(h('div', { class: 'task pilze' }, field, basket));

  (async () => {
    for (let round = 0; round < 3 && !shell.dead; round++) {
      const up = Math.random() < 0.6 ? true : round !== 0;
      const nums = pickNumbers(round);
      const order = [...nums].sort((a, b) => (up ? a - b : b - a));
      shell.setInfo(`Runde ${round + 1} von 3`);
      field.replaceChildren();
      let next = 0;
      basket.textContent = '🧺 0';
      const slots = shuffle(Array.from({ length: 7 }, (_, i) => i));
      await new Promise<void>((res) => {
        nums.forEach((n, i) => {
          const s = slots[i];
          const el = h('button', { class: 'shroom', style: { left: 30 + (s % 4) * 200 + (s > 3 ? 100 : 0) + 'px', top: 20 + Math.floor(s / 4) * 170 + (i % 2) * 14 + 'px', '--c': SHROOM[i] } },
            h('span', { class: 'cap' }, h('b', {}, String(n))), h('span', { class: 'stem' }));
          el.addEventListener('click', async () => {
            if (shell.dead || el.classList.contains('gone')) return;
            if (n === order[next]) {
              el.classList.add('gone');
              next++;
              basket.textContent = `🧺 ${next}`;
              shell.face('happy');
              if (next === order.length) { await wait(500); res(); }
            } else {
              wrong++;
              el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
              shell.face('think');
              shell.feedback('oops', 'Schau noch einmal genau hin!');
              await shell.speakId(up ? 'wald.pilze.oops.up' : 'wald.pilze.oops.down');
            }
          });
          field.append(el);
        });
        shell.setPrompt(up ? 'wald.pilze.prompt.up' : 'wald.pilze.prompt.down');
        shell.onHint = () => void shell.speakId(up ? 'wald.pilze.oops.up' : 'wald.pilze.oops.down');
      });
      shell.pay(3);
    }
    if (shell.dead) return;
    const stars = wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1;
    await finish(shell, 'wald.pilze', stars, wrong === 0 ? 'Kein einziger Fehler!' : `${wrong} Mal vertippt – aber du hast es geschafft.`, done, again);
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
