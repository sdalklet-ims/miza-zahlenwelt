/** Die Stellentafel (H/Z/E): Spalten mit Punkten – gleichzeitig Ablagefläche für Steine und Kärtchen. */
import { h, wait } from '../core/dom';

export type Col = 'H' | 'Z' | 'E';
export const COLS: Col[] = ['H', 'Z', 'E'];
export const COL_NAME: Record<Col, string> = { H: 'Hunderter', Z: 'Zehner', E: 'Einer' };
export const COL_VALUE: Record<Col, number> = { H: 100, Z: 10, E: 1 };

export interface Board {
  el: HTMLElement;
  col: Record<Col, HTMLElement>;
  body: Record<Col, HTMLElement>;
  drops: () => HTMLElement[];
  counts: () => [number, number, number];
  setCounts: (h: number, z: number, e: number, delay?: number, cancelled?: () => boolean) => Promise<void>;
  addDot: (c: Col) => HTMLElement;
  clear: () => void;
  highlight: (cols: Col[] | 'all' | null) => void;
  /** Zeigt unter der Spalte die Anzahl ('count') oder den Wert ('value', z. B. = 300) */
  showValue: (c: Col, mode: 'count' | 'value', count?: number) => void;
  hideValues: () => void;
  setSum: (parts: [number, number, number] | null) => void;
  bundle: (from: 'E' | 'Z') => Promise<void>;
  flash: (c: Col, kind?: 'bad' | 'good') => void;
}

export function createBoard(opts: { small?: boolean } = {}): Board {
  const col = {} as Record<Col, HTMLElement>;
  const body = {} as Record<Col, HTMLElement>;
  const val = {} as Record<Col, HTMLElement>;
  const colEls = COLS.map((c) => {
    body[c] = h('div', { class: 'bbody' });
    val[c] = h('div', { class: 'bval' });
    col[c] = h(
      'div',
      { class: `bcol ${c}`, 'data-drop': c },
      h('div', { class: 'bhead' }, h('span', { class: 'bletter' }, c), h('span', { class: 'bname' }, COL_NAME[c])),
      body[c],
      val[c]
    );
    return col[c];
  });
  const sum = h('div', { class: 'bsum' });
  const el = h('div', { class: 'board' + (opts.small ? ' small' : '') }, h('div', { class: 'brow' }, ...colEls), sum);

  const dot = (c: Col) => h('div', { class: `dot ${c} pop` });

  const api: Board = {
    el,
    col,
    body,
    drops: () => COLS.map((c) => col[c]),
    counts: () => COLS.map((c) => body[c].querySelectorAll('.dot').length) as [number, number, number],
    addDot(c) {
      const d = dot(c);
      body[c].append(d);
      return d;
    },
    async setCounts(hh, z, e, delay = 0, cancelled = () => false) {
      api.clear();
      const want: Record<Col, number> = { H: hh, Z: z, E: e };
      for (const c of COLS)
        for (let i = 0; i < want[c]; i++) {
          if (cancelled()) return;
          api.addDot(c);
          if (delay) await wait(delay);
        }
    },
    clear() {
      COLS.forEach((c) => body[c].replaceChildren());
      api.hideValues();
      api.setSum(null);
    },
    highlight(cols) {
      COLS.forEach((c) => {
        const on = cols === 'all' || (Array.isArray(cols) && cols.includes(c));
        col[c].classList.toggle('hl', on);
        col[c].classList.toggle('dim', cols != null && cols !== 'all' && !on);
      });
    },
    showValue(c, mode, count) {
      const k = count ?? body[c].querySelectorAll('.dot').length;
      val[c].replaceChildren(
        h('b', {}, String(k)),
        h('span', {}, mode === 'count' ? COL_NAME[c] : `= ${k * COL_VALUE[c]}`)
      );
      val[c].classList.add('on');
    },
    hideValues() {
      COLS.forEach((c) => {
        val[c].classList.remove('on');
        val[c].replaceChildren();
      });
    },
    setSum(parts) {
      if (!parts) {
        sum.classList.remove('on');
        sum.textContent = '';
        return;
      }
      const [a, b, c] = parts.map((p, i) => p * [100, 10, 1][i]);
      sum.textContent = `${a} + ${b} + ${c} = ${a + b + c}`;
      sum.classList.add('on');
    },
    async bundle(from) {
      const to: Col = from === 'E' ? 'Z' : 'H';
      body[from].querySelectorAll('.dot').forEach((d) => d.classList.add('merge'));
      await wait(800);
      body[from].replaceChildren();
      api.addDot(to).classList.add('big');
      await wait(600);
    },
    flash(c, kind = 'bad') {
      const cl = kind === 'bad' ? 'flash-bad' : 'flash-good';
      col[c].classList.remove(cl);
      void col[c].offsetWidth;
      col[c].classList.add(cl);
      setTimeout(() => col[c].classList.remove(cl), 900);
    },
  };
  return api;
}
