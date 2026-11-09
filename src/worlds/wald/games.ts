/** Die Spiele im Wald: Punkte zählen, Steine-Meister, Kärtchen-Duell, Ausprobieren und der Mini-Check. */
import { h, rnd, wait } from '../../core/dom';
import { getWorld, textOf } from '../../core/texts';
import { getProgress, mutate } from '../../core/progress';
import { Adaptive, type LevelChange } from '../../core/adaptive';
import { createShell, type Shell } from '../../ui/shell';
import { createBoard } from '../../ui/board';
import { createStoneBoard } from '../../ui/stones';
import { award, showResult } from '../../ui/results';
import type { Screen } from '../../core/router';
import { runBuild, runCards, runCount, type TaskHooks, type TaskResult } from './tasks';
import { genCards, NumberGen, numOf, type CardRule, type PunkteRule } from './generators';

const world = getWorld('wald')!;
const npcInfo = (id: string) => world.npcs.find((n: { id: string }) => n.id === id);

const starsFor = (hits: number, total: number) => (hits / total >= 0.8 ? 3 : hits / total >= 0.4 ? 2 : 1);

function screenOf(shell: Shell): Screen {
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}

/** Eine Runde mit adaptiver Stufe. Liefert die Treffer beim ersten Versuch (oder -1, wenn abgebrochen). */
async function playRounds(o: { shell: Shell; total: number; key: string; ad: Adaptive; task: (level: number, i: number, hooks: TaskHooks) => Promise<TaskResult> }) {
  const { shell, ad } = o;
  let hits = 0;
  const save = () => mutate((p) => void (p.levels[o.key] = ad.level));
  const hooks: TaskHooks = {
    onAttempt: (ok, attempt) => (!ok ? ad.record(false) : attempt === 1 ? ad.record(true) : null),
    afterFeedback: async (ch: LevelChange) => {
      if (ch === 'up') {
        save();
        shell.feedback('info', `⬆ Stufe ${ad.level}`);
        await shell.speakId('common.level.up');
      } else if (ch === 'down' || ch === 'hint') {
        save();
        shell.pulseHint(true);
        await shell.speakId('common.level.down');
      }
    },
  };
  for (let i = 0; i < o.total; i++) {
    shell.setInfo(`Aufgabe ${i + 1} von ${o.total} · Stufe ${ad.level}`);
    const res = await o.task(ad.level, i, hooks);
    if (shell.dead) return -1;
    if (res.firstTry) hits++;
    await wait(500);
  }
  return hits;
}

async function finishRound(shell: Shell, key: string, hits: number, total: number, done: () => void, again: () => void) {
  const stars = starsFor(hits, total);
  await award(key, stars);
  if (shell.dead) return;
  shell.pulseHint(false);
  showResult({
    title: 'Geschafft!',
    stars,
    text: `${hits} von ${total} gleich beim ersten Versuch richtig.`,
    speakId: 'common.round.done',
    buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück in den Wald', onClick: done }],
  });
}

/* ───────────── a) Punkte zählen ───────────── */
export function punkteScreen(done: () => void, again: () => void): Screen {
  const shell = createShell(npcInfo('igel'));
  const cfg = world.games.punkte;
  const ad = new Adaptive(getProgress().levels['wald.punkte'] ?? 1);
  const gen = new NumberGen(cfg.levels as PunkteRule[]);
  (async () => {
    const hits = await playRounds({ shell, total: cfg.rounds, key: 'wald.punkte', ad, task: (lvl, _i, hooks) => runCount(shell, gen.next(lvl), hooks) });
    if (hits >= 0) await finishRound(shell, 'wald.punkte', hits, cfg.rounds, done, again);
  })();
  return screenOf(shell);
}

/* ───────────── c) Kärtchen-Duell ───────────── */
export function kaertchenScreen(done: () => void, again: () => void): Screen {
  const shell = createShell(npcInfo('hase'));
  const cfg = world.games.kaertchen;
  const ad = new Adaptive(getProgress().levels['wald.kaertchen'] ?? 1);
  const first = Math.random() < 0.5;
  (async () => {
    const hits = await playRounds({
      shell,
      total: cfg.rounds,
      key: 'wald.kaertchen',
      ad,
      task: (lvl, i, hooks) => {
        const mode = (i % 2 === 0) === first ? 'max' : 'min';
        const rule = cfg.levels[Math.min(cfg.levels.length, lvl) - 1] as CardRule;
        return runCards(shell, genCards(rule, mode), mode, hooks);
      },
    });
    if (hits >= 0) await finishRound(shell, 'wald.kaertchen', hits, cfg.rounds, done, again);
  })();
  return screenOf(shell);
}

/* ───────────── b) Steine-Meister ───────────── */
export function steineScreen(done: () => void): Screen {
  const shell = createShell(npcInfo('dachs'));
  const STONES: number = world.games.steine.stones;
  const all: number[] = [];
  for (let a = 0; a <= STONES; a++) for (let b = 0; b <= STONES - a; b++) all.push(numOf(a, b, STONES - a - b));
  all.sort((x, y) => x - y);
  const found = new Set(getProgress().found.filter((n) => all.includes(n)));

  const board = createBoard({ small: true });
  const readout = () => {
    const c = stones.counts();
    board.setSum(stones.remaining() === 0 ? c : null);
    okBtn.disabled = stones.remaining() !== 0 || busy;
  };
  const stones = createStoneBoard(board, STONES, { onChange: readout, onFull: () => {} });
  let busy = false;
  const okBtn = h('button', { class: 'btn', disabled: true, onclick: submit }, '✓ Das ist meine Zahl!');
  const counter = h('div', { class: 'found-count' });
  const chips = new Map<number, HTMLElement>();
  const grid = h('div', { class: 'found-grid' }, ...all.map((n) => {
    const c = h('div', { class: 'chip' }, '?');
    chips.set(n, c);
    return c;
  }));
  const refresh = () => {
    counter.textContent = `${found.size} von ${all.length} gefunden`;
    for (const [n, c] of chips) {
      c.textContent = found.has(n) ? String(n) : '?';
      c.classList.toggle('on', found.has(n));
    }
  };
  refresh();
  shell.main.append(
    h('div', { class: 'task steine' },
      h('div', { class: 'left' }, board.el, h('div', { class: 'tray-row' }, stones.tray), okBtn),
      h('div', { class: 'found-panel' }, counter, h('small', {}, '⭐ bei 7 · 14 · 21'), grid))
  );
  shell.setInfo(`Genau ${STONES} Steine!`);
  shell.setPrompt('wald.steine.prompt');

  shell.onHint = async () => {
    if (busy) return;
    if (found.size < 3) return void shell.speakId('wald.steine.tip');
    const missing = all.filter((n) => !found.has(n));
    if (!missing.length) return;
    const n = missing[rnd(0, missing.length - 1)];
    const hh = Math.floor(n / 100);
    board.highlight(hh > 0 ? ['H'] : ['Z', 'E']);
    await shell.speakId(hh > 0 ? 'wald.steine.hint' : 'wald.steine.hint0', { h: hh });
    board.highlight(null);
  };

  async function submit() {
    if (busy || shell.dead) return;
    busy = true;
    stones.lock(true);
    okBtn.disabled = true;
    const [a, b, c] = stones.counts();
    const n = numOf(a, b, c);
    if (found.has(n)) {
      shell.face('think');
      shell.feedback('info', `${n} hattest du schon.`);
      await shell.speakId('wald.steine.dup', { n });
    } else {
      found.add(n);
      mutate((p) => void p.found.push(n));
      refresh();
      chips.get(n)?.classList.add('new');
      shell.face('happy');
      shell.feedback('good', `${n} ist neu!`);
      await shell.speakId('wald.steine.new', { n });
      const stars = Math.floor(found.size / 7);
      if (stars > (getProgress().stars['wald.steine'] ?? 0)) await award('wald.steine', stars);
      if (found.size === all.length) {
        await shell.speakId('wald.steine.done');
        showResult({ title: 'Steine-Meister!', stars: 3, text: 'Du hast alle 21 Zahlen gefunden!', buttons: [{ label: 'Zurück in den Wald', onClick: done }] });
        return;
      }
    }
    if (shell.dead) return;
    stones.reset();
    stones.lock(false);
    shell.face('neutral');
    busy = false;
    readout();
  }
  return screenOf(shell);
}

/* ───────────── Entdecken (ohne Wertung) ───────────── */
export function discoverScreen(): Screen {
  const shell = createShell(npcInfo('eule'));
  const board = createBoard();
  const num = h('div', { class: 'discover-num' }, '0');
  const stones = createStoneBoard(board, null, {
    onChange: () => {
      const c = stones.counts();
      num.textContent = String(numOf(...c));
      board.setSum(stones.placed() ? c : null);
    },
    onFull: (c) => board.flash(c),
  });
  shell.main.append(h('div', { class: 'task discover' }, h('div', { class: 'row' }, board.el, h('div', { class: 'discover-box' }, h('small', {}, 'Deine Zahl'), num)), h('div', { class: 'tray-row' }, stones.tray)));
  shell.setInfo('Ausprobieren – ohne Punkte');
  shell.setPrompt('wald.discover.intro');
  shell.onHint = () => void shell.speakId('wald.discover.intro');
  return screenOf(shell);
}

/* ───────────── Mini-Check: 6 gemischte Aufgaben ───────────── */
export function checkScreen(done: () => void, again: () => void): Screen {
  const shell = createShell(npcInfo('eule'));
  const tasks: string[] = world.check.tasks;
  const lvlP = Math.max(2, getProgress().levels['wald.punkte'] ?? 1);
  const lvlK = Math.max(2, getProgress().levels['wald.kaertchen'] ?? 1);
  const gen = new NumberGen(world.games.punkte.levels as PunkteRule[]);
  const cardRules = world.games.kaertchen.levels as CardRule[];
  (async () => {
    await shell.speakId('wald.check.intro');
    let hits = 0;
    const marks: string[] = tasks.map(() => '○');
    for (let i = 0; i < tasks.length && !shell.dead; i++) {
      shell.setInfo(`Aufgabe ${i + 1} von ${tasks.length}   ${marks.join(' ')}`);
      const t = tasks[i];
      let res: TaskResult;
      if (t === 'count') res = await runCount(shell, gen.next(lvlP));
      else if (t === 'build') res = await runBuild(shell, gen.next(lvlP));
      else {
        const mode = t === 'cardsMax' ? 'max' : 'min';
        res = await runCards(shell, genCards(cardRules[Math.min(cardRules.length, lvlK) - 1], mode), mode);
      }
      if (shell.dead) return;
      marks[i] = res.firstTry ? '●' : '◐';
      if (res.firstTry) hits++;
      await wait(500);
    }
    if (shell.dead) return;
    shell.setInfo(`Geschafft!   ${marks.join(' ')}`);
    const stars = hits >= 5 ? 3 : hits >= 3 ? 2 : 1;
    await award('wald.check', stars);
    if (shell.dead) return;
    showResult({
      title: 'Mini-Check geschafft!',
      stars,
      text: `${hits} von ${tasks.length} gleich beim ersten Versuch richtig.`,
      speakId: `wald.check.done.${stars}`,
      buttons: [{ label: '🔁 Nochmal', cls: 'sun', onClick: again }, { label: 'Zurück in den Wald', onClick: done }],
    });
  })();
  void textOf;
  return screenOf(shell);
}
