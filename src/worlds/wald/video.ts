/**
 * Erklärvideo (ca. 60–90 s): Eule Olga erklärt H/Z/E an der Stellentafel.
 * Animierte Szene + Sprecherstimme + Untertitel, überspringbar und wiederholbar.
 * Das Skript liegt in content/worlds/wald.json → video.steps (Text-ID + Animationsbefehle).
 */
import { h, wait } from '../../core/dom';
import { getWorld } from '../../core/texts';
import { mutate } from '../../core/progress';
import { owlSvg } from '../../ui/art';
import { equippedFor } from '../../core/rewards';
import { createBoard, COLS, type Col } from '../../ui/board';
import { speak, stopSpeaking } from '../../audio/speak';
import type { Screen } from '../../core/router';

interface Cmd { c: string; h?: number; z?: number; e?: number; delay?: number; col?: Col | 'all' | null; on?: boolean; stagger?: number; ms?: number }
interface Step { text: string; do: Cmd[] }

const steps: Step[] = getWorld('wald')!.video.steps;

export function videoScreen(opts: { onDone: () => void; onSkip: () => void }): Screen {
  let run = 0;
  let dead = false;
  let valuesOn = false;

  const board = createBoard();
  const owl = h('div', { class: 'vid-owl', html: owlSvg(equippedFor('eule')) });
  const bar = h('div', { class: 'vid-bar' }, ...steps.map(() => h('i')));
  const frame = h('div', { class: 'vid-frame hidden' }, h('div', { class: 'vid-title' }, 'Die Stellentafel'), board.el);
  const end = h('div', { class: 'vid-end hidden' },
    h('div', { class: 'vid-end-text' }, 'Jetzt bist du dran!'),
    h('button', { class: 'btn sun', onclick: () => start() }, '🔁 Nochmal ansehen'),
    h('button', { class: 'btn', onclick: () => opts.onDone() }, 'Weiter zum Üben'));
  const skipBtn = h('button', { class: 'btn ghost vid-skip', onclick: skip }, '⏭ Überspringen');
  const replayBtn = h('button', { class: 'btn ghost vid-replay', onclick: () => start() }, '🔁 Von vorn');
  const el = h('div', { class: 'video' }, h('div', { class: 'vid-sun' }), bar, owl, frame, end, h('div', { class: 'vid-ctl' }, replayBtn, skipBtn));

  const counts = () => board.counts();

  /** Passt die Punkte schrittweise an (nur neue Punkte werden animiert). */
  async function applyCounts(my: number, hh = 0, z = 0, e = 0, delay = 0) {
    const want: Record<Col, number> = { H: hh, Z: z, E: e };
    for (const c of COLS) {
      let have = board.body[c].querySelectorAll('.dot').length;
      while (have > want[c]) {
        board.body[c].querySelector('.dot:last-child')?.remove();
        have--;
      }
      while (have < want[c]) {
        if (my !== run) return;
        board.addDot(c);
        have++;
        if (delay) await wait(delay);
      }
    }
    if (valuesOn) COLS.forEach((c) => board.showValue(c, 'value'));
  }

  async function cmd(my: number, c: Cmd) {
    if (my !== run) return;
    switch (c.c) {
      case 'show':
        frame.classList.remove('hidden');
        return;
      case 'clear':
        board.clear();
        valuesOn = false;
        return;
      case 'set':
        return applyCounts(my, c.h, c.z, c.e, c.delay ?? 0);
      case 'hl':
        board.highlight(c.col === undefined ? null : c.col === 'all' ? 'all' : c.col ? [c.col] : null);
        return;
      case 'values':
        if (!c.on) {
          valuesOn = false;
          board.hideValues();
          return;
        }
        valuesOn = true;
        for (const col of COLS) {
          if (my !== run) return;
          board.showValue(col, 'value');
          if (c.stagger) await wait(c.stagger);
        }
        return;
      case 'sum':
        board.setSum(c.on ? counts() : null);
        return;
      case 'bundle':
        await board.bundle(c.col as 'E' | 'Z');
        return;
      case 'swap':
        board.flash('Z', 'good');
        board.flash('E', 'good');
        return;
      case 'wait':
        await wait(c.ms ?? 500);
        return;
    }
  }

  async function runCmds(my: number, list: Cmd[]) {
    for (const c of list) {
      if (my !== run) return;
      await cmd(my, c);
    }
  }

  async function start() {
    const my = ++run;
    stopSpeaking();
    board.clear();
    board.highlight(null);
    valuesOn = false;
    frame.classList.add('hidden');
    end.classList.add('hidden');
    replayBtn.classList.add('hidden');
    skipBtn.classList.remove('hidden');
    bar.querySelectorAll('i').forEach((i) => i.classList.remove('done', 'now'));
    await wait(350);
    for (let i = 0; i < steps.length; i++) {
      if (my !== run || dead) return;
      const s = steps[i];
      bar.querySelectorAll('i').forEach((b, k) => {
        b.classList.toggle('now', k === i);
        b.classList.toggle('done', k < i);
      });
      owl.classList.add('talking');
      await Promise.all([speak(s.text), runCmds(my, s.do)]);
      owl.classList.remove('talking');
      await wait(300);
    }
    if (my !== run || dead) return;
    bar.querySelectorAll('i').forEach((b) => b.classList.replace('now', 'done') || b.classList.add('done'));
    mutate((p) => void (p.seen.video = true));
    skipBtn.classList.add('hidden');
    replayBtn.classList.remove('hidden');
    end.classList.remove('hidden');
  }

  function skip() {
    run++;
    stopSpeaking();
    opts.onSkip();
  }

  start();
  return {
    el,
    dispose() {
      dead = true;
      run++;
    },
  };
}
