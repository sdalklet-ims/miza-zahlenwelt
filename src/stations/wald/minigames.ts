/** Kleine Spiele für Sterne und Münzen: Zahlenpilze (Zahlen ordnen); Zahlen-Angeln steht in angeln.ts. Kein Zeitdruck. */
import { h, rnd, shuffle, wait } from '../../core/dom';
import { getProgress } from '../../core/progress';
import { createShell } from '../../ui/shell';
import { award, showResult } from '../../ui/results';
import { badgeRun } from '../../ui/badges';
import { digitsOf, NumberGen, type PunkteRule } from './generators';
import { getWorld } from '../../core/texts';
import type { Screen } from '../../core/router';
import type { TaskResult } from './tasks';

const world = getWorld('wald')!;
const MIA = { id: 'mia', kind: 'mia', name: 'Mia' };

export async function finish(shell: ReturnType<typeof createShell>, key: string, stars: number, text: string, done: () => void, again: () => void, clean = false) {
  shell.pay(stars * 5);
  await award(key, stars);
  if (shell.dead) return;
  const note = await badgeRun(key, clean);
  if (shell.dead) return;

  showResult({
    title: 'Geschafft!', stars, text: `${text}  Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`, speakId: 'common.round.done',
    buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück in den Wald', onClick: done }],
  });
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
    await finish(shell, 'wald.pilze', stars, wrong === 0 ? 'Kein einziger Fehler!' : `${wrong} Mal vertippt – aber du hast es geschafft.`, done, again, wrong === 0);
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}

/** Eine einzelne Pilz-Aufgabe (für die Mathearbeit): Zahlen der Größe nach pflücken, jeder Fehlgriff nimmt den Punkt */
export function runPilzeTask(shell: ReturnType<typeof createShell>): Promise<TaskResult> {
  const round = rnd(0, 2), up = Math.random() < 0.6;
  const nums = pickNumbers(round);
  const order = [...nums].sort((a, b) => (up ? a - b : b - a));
  const basket = h('div', { class: 'basket' }, '🧺 0');
  const field = h('div', { class: 'shroom-field' });
  shell.main.replaceChildren(h('div', { class: 'task pilze' }, field, basket));
  return new Promise((resolve) => {
    let next = 0, wrong = 0;
    const slots = shuffle(Array.from({ length: 7 }, (_, i) => i));
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
          if (next === order.length) { await wait(600); if (!shell.dead) resolve({ firstTry: wrong === 0, attempts: wrong + 1 }); }
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
    shell.face('neutral');
    shell.setPrompt(up ? 'wald.pilze.prompt.up' : 'wald.pilze.prompt.down');
    shell.onHint = () => void shell.speakId(up ? 'wald.pilze.oops.up' : 'wald.pilze.oops.down');
  });
}
