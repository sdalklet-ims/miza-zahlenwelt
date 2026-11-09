/** Steine zum Legen in die Stellentafel (Drag and Drop; Antippen als Alternative). */
import { h } from '../core/dom';
import { makeDraggable } from './drag';
import { COLS, type Board, type Col } from './board';

export interface StoneBoard {
  tray: HTMLElement;
  counts: () => [number, number, number];
  remaining: () => number;
  placed: () => number;
  /** Alle Steine zurück in den Vorrat (bei fester Anzahl) bzw. Tafel leeren */
  reset: () => void;
  set: (h: number, z: number, e: number) => void;
  lock: (on: boolean) => void;
}

const MAX_PER_COL = 9;

/** total = feste Zahl Steine (z. B. 5) oder null = unbegrenzter Vorrat */
export function createStoneBoard(board: Board, total: number | null, hooks: { onChange?: () => void; onFull?: (c: Col) => void } = {}): StoneBoard {
  const tray = h('div', { class: 'tray' + (total == null ? ' infinite' : '') });
  const stones = new Set<HTMLElement>();
  let locked = false;

  const colOf = (s: HTMLElement): Col | null => COLS.find((c) => board.body[c].contains(s)) ?? null;
  const count = (c: Col) => board.body[c].querySelectorAll('.stone').length;
  const targets = () => [...board.drops(), tray];

  function putIn(s: HTMLElement, c: Col | 'tray') {
    if (c === 'tray') {
      if (total == null) {
        s.remove();
        stones.delete(s);
      } else tray.append(s);
    } else {
      if (colOf(s) !== c && count(c) >= MAX_PER_COL) return hooks.onFull?.(c);
      board.body[c].append(s);
    }
    hooks.onChange?.();
  }

  function dropTarget(t: HTMLElement | null): Col | 'tray' | null {
    if (!t) return null;
    if (t === tray) return 'tray';
    return (t.dataset.drop as Col) ?? null;
  }

  function makeStone(): HTMLElement {
    const s = h('div', { class: 'stone pop' }, h('i'));
    stones.add(s);
    makeDraggable({
      el: s,
      targets,
      onDrop: (t) => {
        if (locked) return;
        const d = dropTarget(t);
        if (d) putIn(s, d);
        else if (total == null) putIn(s, 'tray'); // daneben losgelassen → wegwerfen (unbegrenzter Vorrat)
      },
      onTap: () => {
        if (locked) return;
        if (colOf(s)) putIn(s, 'tray');
      },
    });
    return s;
  }

  if (total != null) for (let i = 0; i < total; i++) tray.append(makeStone());
  else {
    const src = h('div', { class: 'stone source' }, h('i'));
    tray.append(src, h('span', { class: 'tray-label' }, 'Stein nehmen und in die Tafel ziehen'));
    makeDraggable({
      el: src,
      targets,
      onDrop: (t) => {
        const d = dropTarget(t);
        if (locked || !d || d === 'tray') return;
        putIn(makeStone(), d);
      },
    });
  }

  // Antippen einer Spalte legt einen Stein hinein (auch ohne Ziehen bedienbar)
  for (const c of COLS)
    board.col[c].addEventListener('click', (e) => {
      if (locked || (e.target as HTMLElement).closest('.stone')) return;
      if (total == null) putIn(makeStone(), c);
      else {
        const s = tray.querySelector<HTMLElement>('.stone');
        if (s) putIn(s, c);
      }
    });

  return {
    tray,
    counts: () => COLS.map(count) as [number, number, number],
    remaining: () => tray.querySelectorAll('.stone:not(.source)').length,
    placed: () => COLS.reduce((a, c) => a + count(c), 0),
    reset() {
      if (total == null) {
        stones.forEach((s) => s.remove());
        stones.clear();
      } else stones.forEach((s) => tray.append(s));
      hooks.onChange?.();
    },
    set(hh, z, e) {
      this.reset();
      const want = { H: hh, Z: z, E: e };
      for (const c of COLS)
        for (let i = 0; i < want[c]; i++) {
          if (total == null) board.body[c].append(makeStone());
          else {
            const s = tray.querySelector<HTMLElement>('.stone');
            if (s) board.body[c].append(s);
          }
        }
      hooks.onChange?.();
    },
    lock(on) {
      locked = on;
      tray.classList.toggle('locked', on);
    },
  };
}
