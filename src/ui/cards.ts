/** Zahlenkärtchen: aus der Hand in die Spalten der Stellentafel legen. */
import { h } from '../core/dom';
import { makeDraggable } from './drag';
import { COLS, type Board, type Col } from './board';

export interface CardBoard {
  tray: HTMLElement;
  /** Ziffern je Spalte (H, Z, E) oder null */
  placed: () => (number | null)[];
  complete: () => boolean;
  number: () => number;
  reset: () => void;
  /** Legt die Kärtchen automatisch (für die Auflösung) */
  arrange: (digits: number[]) => void;
  lock: (on: boolean) => void;
}

export function createCardBoard(board: Board, digits: number[], onChange: () => void): CardBoard {
  const tray = h('div', { class: 'tray cards' });
  const cards: HTMLElement[] = digits.map((d) => h('div', { class: 'card pop', 'data-d': String(d) }, String(d)));
  let locked = false;

  const slotOf = (c: Col) => board.body[c].querySelector<HTMLElement>('.card');
  const colOf = (el: HTMLElement): Col | null => COLS.find((c) => board.body[c].contains(el)) ?? null;
  const targets = () => [...board.drops(), tray];

  function putIn(card: HTMLElement, c: Col | 'tray') {
    if (c === 'tray') tray.append(card);
    else {
      const occupant = slotOf(c);
      const from = colOf(card);
      if (occupant && occupant !== card) {
        // Tausch: der bisherige Kärtchen-Besitzer wandert an den alten Platz (oder zurück in die Hand)
        if (from) board.body[from].append(occupant);
        else tray.append(occupant);
      }
      board.body[c].append(card);
    }
    onChange();
  }

  for (const card of cards) {
    tray.append(card);
    makeDraggable({
      el: card,
      targets,
      onDrop: (t) => {
        if (locked || !t) return;
        putIn(card, t === tray ? 'tray' : ((t.dataset.drop as Col) ?? 'tray'));
      },
      onTap: () => {
        if (locked) return;
        if (colOf(card)) putIn(card, 'tray');
        else {
          const free = COLS.find((c) => !slotOf(c));
          if (free) putIn(card, free);
        }
      },
    });
  }

  const placed = () => COLS.map((c) => {
    const el = slotOf(c);
    return el ? Number(el.dataset.d) : null;
  });

  return {
    tray,
    placed,
    complete: () => placed().every((p) => p != null),
    number: () => placed().reduce<number>((a, p, i) => a + (p ?? 0) * [100, 10, 1][i], 0),
    reset() {
      cards.forEach((c) => tray.append(c));
      onChange();
    },
    arrange(ds) {
      const pool = [...cards];
      COLS.forEach((c, i) => {
        const k = pool.findIndex((el) => Number(el.dataset.d) === ds[i]);
        if (k >= 0) board.body[c].append(pool.splice(k, 1)[0]);
      });
      onChange();
    },
    lock(on) {
      locked = on;
      tray.classList.toggle('locked', on);
    },
  };
}
