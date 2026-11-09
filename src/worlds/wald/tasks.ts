/**
 * Aufgaben-Bausteine (für die Spiele UND den Mini-Check):
 *   runCount  – Punkte in der Stellentafel zählen, Zahl eintippen
 *   runBuild  – Zahl mit Steinen in die Stellentafel legen
 *   runCards  – drei Kärtchen zur größten/kleinsten Zahl legen
 * Fehler → freundlicher Hinweis, der das Prinzip zeigt (Spalten hervorheben), dann neuer Versuch.
 * Nach 3 Versuchen wird die Lösung gezeigt.
 */
import { h, pick, wait } from '../../core/dom';
import { textOf } from '../../core/texts';
import type { LevelChange } from '../../core/adaptive';
import type { Shell } from '../../ui/shell';
import { createBoard, COLS } from '../../ui/board';
import { createKeypad } from '../../ui/keypad';
import { createStoneBoard } from '../../ui/stones';
import { createCardBoard } from '../../ui/cards';
import { bestNumber, classifyError, digitsOf, hugoNumber, noteMistake, type ErrorKind } from './generators';

export interface TaskHooks {
  /** Meldet jeden Versuch (für die adaptive Stufe) */
  onAttempt?: (correct: boolean, attempt: number) => LevelChange;
  /** Wird nach der Rückmeldung abgewartet (z. B. "Stufe hoch"-Hinweis) */
  afterFeedback?: (change: LevelChange) => Promise<void>;
}
export interface TaskResult { firstTry: boolean; attempts: number; me?: number; hugo?: number }

const MAX_ATTEMPTS = 3;

async function cheer(shell: Shell) {
  const id = pick(['common.cheer.1', 'common.cheer.2', 'common.cheer.3', 'common.cheer.4', 'common.cheer.5']);
  shell.face('happy');
  shell.feedback('good', textOf(id));
  await shell.speakId(id);
}

function retryBanner(shell: Shell) {
  shell.face('think');
  shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
}

/* ───────────────────────── Punkte zählen ───────────────────────── */
export function runCount(shell: Shell, n: number, hooks: TaskHooks = {}): Promise<TaskResult> {
  const [H, Z, E] = digitsOf(n);
  const board = createBoard();
  board.setCounts(H, Z, E);
  return new Promise((resolve) => {
    let attempt = 0;
    let busy = false;
    const pad = createKeypad(3, submit);
    shell.main.replaceChildren(h('div', { class: 'task count' }, board.el, pad.el));
    shell.face('neutral');
    shell.pulseHint(false);
    shell.setPrompt('wald.punkte.prompt');

    async function explain(kind: ErrorKind) {
      const id = ({ dreher: 'wald.punkte.hint.dreher', null: 'wald.punkte.hint.null', kurz: 'wald.punkte.hint.kurz', other: 'wald.punkte.hint.other', ok: 'wald.punkte.hint.other' } as const)[kind];
      const speech = shell.speakId(id, { h: H, z: Z, e: E });
      board.hideValues();
      for (const c of COLS) {
        if (shell.dead) return;
        board.highlight([c]);
        board.showValue(c, 'count');
        await wait(1000);
      }
      board.highlight('all');
      await speech;
    }

    shell.onHint = () => {
      if (busy) return;
      busy = true;
      shell.pulseHint(false);
      explain('other').then(() => {
        board.highlight(null);
        busy = false;
      });
    };

    async function submit(v: number) {
      if (busy || shell.dead) return;
      busy = true;
      pad.lock(true);
      attempt++;
      const ok = v === n;
      const change = hooks.onAttempt?.(ok, attempt) ?? null;
      if (ok) {
        board.highlight(null);
        await cheer(shell);
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
        return;
      }
      const kind = classifyError(n, v);
      noteMistake(kind);
      pad.shake();
      retryBanner(shell);
      await explain(kind);
      if (shell.dead) return;
      if (attempt >= MAX_ATTEMPTS) {
        board.setSum([H, Z, E]);
        await shell.speakId('wald.punkte.reveal', { n, h: H, z: Z, e: E });
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: false, attempts: attempt });
        return;
      }
      await hooks.afterFeedback?.(change);
      pad.clear();
      board.highlight(null);
      board.hideValues();
      shell.face('neutral');
      pad.lock(false);
      busy = false;
    }
  });
}

/* ───────────────────────── Zahl mit Steinen legen ───────────────────────── */
export function runBuild(shell: Shell, n: number, hooks: TaskHooks = {}): Promise<TaskResult> {
  const [H, Z, E] = digitsOf(n);
  const board = createBoard();
  return new Promise((resolve) => {
    let attempt = 0;
    let busy = false;
    const stones = createStoneBoard(board, null, {
      onChange: () => (okBtn.disabled = stones.placed() === 0),
      onFull: (c) => {
        board.flash(c);
        shell.feedback('info', 'Mehr als 9 passen nicht in eine Spalte. Bündle: zehn Einer sind ein Zehner!');
      },
    });
    const okBtn = h('button', { class: 'btn', disabled: true, onclick: submit }, '✓ Fertig!');
    shell.main.replaceChildren(
      h('div', { class: 'task build' }, h('div', { class: 'target-num' }, String(n)), board.el, h('div', { class: 'tray-row' }, stones.tray, okBtn))
    );
    shell.face('neutral');
    shell.pulseHint(false);
    shell.setPrompt('wald.check.build', { n });

    const hint = async () => {
      board.highlight('all');
      await shell.speakId('wald.build.hint', { n, h: H, z: Z, e: E });
      board.highlight(null);
    };
    shell.onHint = () => {
      if (!busy) {
        busy = true;
        hint().then(() => (busy = false));
      }
    };

    async function submit() {
      if (busy || shell.dead) return;
      busy = true;
      stones.lock(true);
      attempt++;
      const got = stones.counts();
      const want = [H, Z, E];
      const ok = got.every((g, i) => g === want[i]);
      const change = hooks.onAttempt?.(ok, attempt) ?? null;
      if (ok) {
        await cheer(shell);
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
        return;
      }
      COLS.forEach((c, i) => {
        if (got[i] !== want[i]) board.flash(c);
        else board.flash(c, 'good');
      });
      retryBanner(shell);
      await hint();
      if (shell.dead) return;
      if (attempt >= MAX_ATTEMPTS) {
        stones.set(H, Z, E);
        await shell.speakId('wald.build.reveal', { n, h: H, z: Z, e: E });
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: false, attempts: attempt });
        return;
      }
      await hooks.afterFeedback?.(change);
      stones.lock(false);
      shell.face('neutral');
      busy = false;
    }
  });
}

/* ───────────────────────── Kärtchen: größte / kleinste Zahl ───────────────────────── */
export function runCards(shell: Shell, digits: number[], mode: 'max' | 'min', hooks: TaskHooks = {}): Promise<TaskResult> {
  const best = bestNumber(digits, mode);
  const hugo = hugoNumber(digits, mode);
  const board = createBoard();
  return new Promise((resolve) => {
    let attempt = 0;
    let busy = false;
    const cb = createCardBoard(board, digits, () => (okBtn.disabled = !cb.complete()));
    const okBtn = h('button', { class: 'btn', disabled: true, onclick: submit }, '✓ Fertig!');
    const hugoBox = h('div', { class: 'hugo-box' });
    shell.main.replaceChildren(h('div', { class: 'task cards' }, board.el, h('div', { class: 'tray-row' }, cb.tray, okBtn), hugoBox));
    shell.face('neutral');
    shell.pulseHint(false);
    const zeroNote = mode === 'min' && digits.includes(0);
    shell.setPrompt(mode === 'max' ? 'wald.kaertchen.prompt.max' : 'wald.kaertchen.prompt.min').then(() => {
      if (zeroNote && !shell.dead) {
        shell.feedback('info', textOf('wald.kaertchen.note.zero'));
        shell.speakId('wald.kaertchen.note.zero');
      }
    });

    const hintId = (zeroFront: boolean) => (mode === 'max' ? 'wald.kaertchen.hint.max' : zeroFront || zeroNote ? 'wald.kaertchen.hint.minzero' : 'wald.kaertchen.hint.min');
    const hint = async (zeroFront: boolean) => {
      board.highlight(['H']);
      await shell.speakId(hintId(zeroFront));
      board.highlight(null);
    };
    shell.onHint = () => {
      if (!busy) {
        busy = true;
        hint(false).then(() => (busy = false));
      }
    };

    async function submit() {
      if (busy || shell.dead || !cb.complete()) return;
      busy = true;
      cb.lock(true);
      attempt++;
      const num = cb.number();
      const zeroFront = cb.placed()[0] === 0;
      const ok = !zeroFront && num === best;
      const change = hooks.onAttempt?.(ok, attempt) ?? null;
      if (ok) {
        shell.face('happy');
        hugoBox.replaceChildren(h('span', {}, 'Hugo legt:'), ...String(hugo).split('').map((d) => h('div', { class: 'card mini' }, d)));
        const id = hugo === num ? 'wald.kaertchen.tie' : mode === 'max' ? 'wald.kaertchen.win.max' : 'wald.kaertchen.win.min';
        shell.feedback('good', textOf(id, { me: num, hugo }));
        await shell.speakId(id, { me: num, hugo });
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt, me: num, hugo });
        return;
      }
      board.flash('H');
      retryBanner(shell);
      await hint(zeroFront);
      if (shell.dead) return;
      if (attempt >= MAX_ATTEMPTS) {
        const arr = [...String(best)].map(Number);
        cb.arrange(arr);
        await shell.speakId('wald.kaertchen.reveal', { n: best });
        await hooks.afterFeedback?.(change);
        if (!shell.dead) resolve({ firstTry: false, attempts: attempt, me: best, hugo });
        return;
      }
      await hooks.afterFeedback?.(change);
      cb.reset();
      cb.lock(false);
      shell.face('neutral');
      busy = false;
    }
  });
}
