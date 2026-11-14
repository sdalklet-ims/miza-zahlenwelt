/**
 * Zahlenstrahl-Hüpfer: Wo liegt die Zahl? (Marker verschieben) und Welche Zahl ist das? (Auswahl).
 * Stufen: 1 Strahl 0–100 · 2 Strahl 0–1000 mit allen Hundertern · 3 ein Hunderterabschnitt (z. B. 300–400) · 4 Strahl 0–1000 nur mit 0, 500, 1000.
 * Fehler: Der Hüpfer zeigt die richtige Stelle und hilft mit der Mitte des Strahls.
 */
import { drawScale } from '../../ui/scale';
import { h, pick, rnd, shuffle, wait } from '../../core/dom';
import { getProgress } from '../../core/progress';
import { textOf } from '../../core/texts';
import { Adaptive } from '../../core/adaptive';
import { createShell, type Shell } from '../../ui/shell';
import type { Screen } from '../../core/router';
import type { TaskHooks, TaskResult } from '../wald/tasks';
import { finish, levelHooks } from './common';

const NS = 'http://www.w3.org/2000/svg';
const W = 900, H = 210, X0 = 50, X1 = 850, Y = 120;

interface Line { lo: number; hi: number; tick: number; label: number; tol: number; step: number }

export function lineFor(level: number): Line {
  if (level <= 1) return { lo: 0, hi: 100, tick: 10, label: 10, tol: 6, step: 5 };
  if (level === 2) return { lo: 0, hi: 1000, tick: 100, label: 100, tol: 45, step: 10 };
  if (level === 3) { const b = rnd(0, 9) * 100; return { lo: b, hi: b + 100, tick: 10, label: 10, tol: 6, step: 1 }; }
  return { lo: 0, hi: 1000, tick: 100, label: 500, tol: 40, step: 10 };
}

function svgEl(tag: string, attrs: Record<string, string | number>, text?: string) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text != null) e.textContent = text;
  return e;
}

function drawLine(l: Line) {
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'strahl-svg' }) as SVGSVGElement;
  const x = (n: number) => X0 + ((n - l.lo) / (l.hi - l.lo)) * (X1 - X0);
  svg.append(svgEl('line', { x1: X0 - 16, y1: Y, x2: X1 + 16, y2: Y, class: 'st-line' }));
  drawScale(svg, x, l.lo, l.hi, Y); // Einer als kleine Striche, Fünfer länger, Zehner am längsten
  for (let n = l.lo; n <= l.hi; n += l.tick) {
    const big = (n - l.lo) % l.label === 0;
    if (big) svg.append(svgEl('line', { x1: x(n), y1: Y - 20, x2: x(n), y2: Y + 20, class: 'st-tick' }));
    if (big) svg.append(svgEl('text', { x: x(n), y: Y + 46, class: 'st-num', 'text-anchor': 'middle' }, String(n)));
  }
  const layer = svgEl('g', {});
  svg.append(layer);
  return { svg, layer, x, valueAt: (px: number) => l.lo + ((px - X0) / (X1 - X0)) * (l.hi - l.lo) };
}

const hopper = (cx: number, color = '#79c24a') => `<g transform="translate(${cx} ${Y - 18})"><g class="hop-guy"><ellipse cx="0" cy="-16" rx="17" ry="14" fill="${color}" stroke="#3a6b22" stroke-width="3"/><circle cx="-6" cy="-22" r="4" fill="#fff"/><circle cx="6" cy="-22" r="4" fill="#fff"/><circle cx="-5" cy="-21" r="2" fill="#222"/><circle cx="7" cy="-21" r="2" fill="#222"/><path d="M-9 -9 q9 7 18 0" fill="none" stroke="#3a6b22" stroke-width="2.5" stroke-linecap="round"/><path d="M-8 -28 q-6 -14 -16 -14 M8 -28 q6 -14 16 -14" fill="none" stroke="#3a6b22" stroke-width="2.5" stroke-linecap="round"/></g></g>`;

/** Eine Aufgabe: kind 'find' (Marker setzen) oder 'read' (Zahl wählen) */
export function runStrahl(shell: Shell, level: number, kind: 'find' | 'read', hooks: TaskHooks = {}): Promise<TaskResult> {
  const l = lineFor(level);
  const span = l.hi - l.lo;
  let n = l.lo + rnd(1, span / l.step - 1) * l.step;
  if ((n - l.lo) % l.label === 0) n += l.step; // nicht genau auf einer beschrifteten Marke
  const d = drawLine(l);
  return new Promise((resolve) => {
    let attempt = 0, busy = false, value = l.lo + span / 2, placed = false;
    const box = h('div', { class: 'strahl-box' }, d.svg as unknown as Node);
    const okBtn = h('button', { class: 'btn', disabled: true, onclick: () => void checkFind() }, '✓ Hierhin!');
    const choices = h('div', { class: 'strahl-choices' });
    const readout = h('div', { class: 'strahl-readout' }, kind === 'find' ? String(n) : '?');
    shell.main.replaceChildren(h('div', { class: 'task strahl' }, readout, box, kind === 'find' ? h('div', { class: 'tray-row' }, okBtn) : choices));
    shell.face('neutral');
    shell.pulseHint(false);

    const marker = (v: number, color: string, id: string) => {
      d.layer.querySelector('#' + id)?.remove();
      const g = svgEl('g', { id });
      g.innerHTML = `<line x1="${d.x(v)}" y1="${Y - 60}" x2="${d.x(v)}" y2="${Y}" stroke="${color}" stroke-width="5" stroke-linecap="round"/><circle cx="${d.x(v)}" cy="${Y - 66}" r="13" fill="${color}" stroke="#fff" stroke-width="3"/>`;
      d.layer.append(g);
    };

    function hint(): Promise<void> {
      const mid = l.lo + span / 2;
      return shell.speakId(n < mid ? 'wiese.strahl.hint.left' : n > mid ? 'wiese.strahl.hint.right' : 'wiese.strahl.hint.mid', { n, mid, lo: l.lo, hi: l.hi });
    }
    shell.onHint = () => void hint();

    async function done(ok: boolean) {
      const change = hooks.onAttempt?.(ok, attempt) ?? null;
      await hooks.afterFeedback?.(change);
    }

    async function celebrate() {
      d.layer.querySelector('.hop-wrap')?.remove();
      const g = svgEl('g', { class: 'hop-wrap' });
      g.innerHTML = hopper(d.x(n));
      d.layer.append(g);
      marker(n, '#2f9e44', 'right');
      shell.face('happy');
      const id = pick(['common.cheer.1', 'common.cheer.2', 'common.cheer.3', 'common.cheer.4', 'common.cheer.5']);
      shell.feedback('good', textOf(id));
      await shell.speakId(id);
    }

    /* ── Marker setzen ── */
    if (kind === 'find') {
      shell.setPrompt('wiese.strahl.prompt.find', { n });
      const pick_ = (e: PointerEvent) => {
        if (busy) return;
        const r = d.svg.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        value = Math.max(l.lo, Math.min(l.hi, Math.round(d.valueAt(px) / (l.step >= 5 ? 1 : 1))));
        placed = true;
        marker(value, '#e8504a', 'mine');
        okBtn.disabled = false;
      };
      let dragging = false;
      d.svg.addEventListener('pointerdown', (e) => { dragging = true; d.svg.setPointerCapture(e.pointerId); pick_(e); });
      d.svg.addEventListener('pointermove', (e) => { if (dragging) pick_(e); });
      d.svg.addEventListener('pointerup', () => (dragging = false));
    }
    async function checkFind() {
      if (busy || shell.dead || !placed) return;
      busy = true;
      okBtn.disabled = true;
      attempt++;
      const ok = Math.abs(value - n) <= l.tol;
      if (ok) {
        await celebrate();
        await done(true);
        if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
        return;
      }
      shell.face('think');
      shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
      marker(value, '#e8504a', 'mine');
      await hint();
      if (shell.dead) return;
      if (attempt >= 3) {
        await celebrate();
        await shell.speakId('wiese.strahl.reveal', { n });
        await done(false);
        if (!shell.dead) resolve({ firstTry: false, attempts: attempt });
        return;
      }
      await done(false);
      d.layer.querySelector('#mine')?.remove();
      placed = false;
      busy = false;
    }

    /* ── Zahl ablesen ── */
    if (kind === 'read') {
      shell.setPrompt('wiese.strahl.prompt.read');
      marker(n, '#e8504a', 'mine');
      const opts = new Set<number>([n]);
      const near = [2, -2, 5, -5, 1, -1, 10, -10, 3, -3].map((k) => n + k * l.step);
      for (const v of shuffle(near)) if (opts.size < 4 && v > l.lo && v < l.hi && (v - l.lo) % l.label !== 0) opts.add(v);
      while (opts.size < 4) { const v = l.lo + rnd(1, span / l.step - 1) * l.step; if ((v - l.lo) % l.label) opts.add(v); }
      choices.replaceChildren(...shuffle([...opts]).map((v) => {
        const b = h('button', { class: 'btn big-choice', onclick: async () => {
          if (busy || shell.dead) return;
          busy = true;
          attempt++;
          if (v === n) {
            readout.textContent = String(n);
            await celebrate();
            await done(true);
            if (!shell.dead) resolve({ firstTry: attempt === 1, attempts: attempt });
            return;
          }
          b.classList.add('shake');
          shell.face('think');
          shell.feedback('oops', textOf(pick(['common.retry.1', 'common.retry.2', 'common.retry.3'])));
          await hint();
          if (shell.dead) return;
          if (attempt >= 3) {
            readout.textContent = String(n);
            await celebrate();
            await shell.speakId('wiese.strahl.reveal', { n });
            await done(false);
            if (!shell.dead) resolve({ firstTry: false, attempts: attempt });
            return;
          }
          await done(false);
          b.classList.remove('shake');
          busy = false;
        } }, String(v));
        return b;
      }));
    }
  });
}

export function strahlScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'hannes', kind: 'grasshopper', name: 'Grashüpfer Hannes' });
  const ad = new Adaptive(Math.min(4, getProgress().levels['wiese.strahl'] ?? 1), 1, 4);
  const hooks = levelHooks(shell, ad, 'wiese.strahl');
  const TOTAL = 6;
  (async () => {
    let hits = 0;
    for (let i = 0; i < TOTAL && !shell.dead; i++) {
      shell.setInfo(`Aufgabe ${i + 1} von ${TOTAL} · Stufe ${ad.level}`);
      const res = await runStrahl(shell, ad.level, i % 2 === 0 ? 'find' : 'read', hooks);
      if (shell.dead) return;
      shell.pay(res.firstTry ? 4 : 1);
      if (res.firstTry) hits++;
      await wait(500);
    }
    if (shell.dead) return;
    await finish(shell, 'wiese.strahl', hits / TOTAL >= 0.8 ? 3 : hits / TOTAL >= 0.4 ? 2 : 1, `${hits} von ${TOTAL} gleich beim ersten Versuch richtig.`, done, again, 3, 'Zurück auf die Wiese', hits === TOTAL);
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
