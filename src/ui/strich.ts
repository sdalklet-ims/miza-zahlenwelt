/** Rechenstrich: ein Zahlenstrahl-Ausschnitt, auf dem Sprünge (Bögen) gezeigt werden – das wichtigste Rechenbild der 3. Klasse. */
import { wait } from '../core/dom';
import { drawScale } from './scale';

export interface Strich {
  el: HTMLElement;
  /** Startpunkt setzen (löscht alte Sprünge) */
  start(n: number): void;
  /** Sprung von der aktuellen Position um delta (negativ = rückwärts); wartet, bis der Bogen gezeichnet ist */
  hop(delta: number, label?: string, color?: string, fast?: boolean): Promise<number>;
  /** Punkt markieren (z. B. das Ergebnis) */
  mark(n: number, label?: string, color?: string): void;
  clear(): void;
  pos(): number;
}

const W = 900, H = 190, X0 = 50, X1 = 850, Y = 128;
const NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text != null) e.textContent = text;
  return e;
}

export function createStrich(lo: number, hi: number): Strich {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'strich-svg' });
  const x = (n: number) => X0 + ((n - lo) / (hi - lo)) * (X1 - X0);
  svg.append(el('line', { x1: X0 - 20, y1: Y, x2: X1 + 20, y2: Y, class: 'st-line' }));
  drawScale(svg, x, lo, hi, Y); // Einer, Fünfer und Zehner als Striche
  const layer = el('g');
  svg.append(layer);
  const wrap = document.createElement('div');
  wrap.className = 'strich';
  wrap.append(svg);
  let cur = lo;
  let flip = 1;

  const tick = (n: number, label: boolean, color = '#3b2a1e') => {
    layer.append(el('line', { x1: x(n), y1: Y - 12, x2: x(n), y2: Y + 12, class: 'st-tick', stroke: color }));
    if (label) layer.append(el('text', { x: x(n), y: Y + 40, class: 'st-num', fill: color, 'text-anchor': 'middle' }, String(n)));
  };

  return {
    el: wrap,
    pos: () => cur,
    clear() { layer.replaceChildren(); },
    start(n) {
      layer.replaceChildren();
      cur = n; flip = 1;
      tick(n, true);
      layer.append(el('circle', { cx: x(n), cy: Y, r: 9, class: 'st-dot' }));
    },
    mark(n, label, color = '#2f9e44') {
      tick(n, true, color);
      layer.append(el('circle', { cx: x(n), cy: Y, r: 11, fill: color, stroke: '#fff', 'stroke-width': 3 }));
      if (label) layer.append(el('text', { x: x(n), y: Y - 24, class: 'st-lab', fill: color, 'text-anchor': 'middle' }, label));
    },
    async hop(delta, label, color = '#e9a24b', fast = false) {
      const a = cur, b = cur + delta;
      const xa = x(a), xb = x(b), mid = (xa + xb) / 2;
      const up = Y - 22 - Math.min(78, 28 + Math.abs(xb - xa) * 0.18) * (flip === 1 ? 1 : 0.55);
      flip = -flip;
      const path = el('path', { d: `M${xa} ${Y - 10} Q${mid} ${up} ${xb} ${Y - 10}`, class: 'st-hop', stroke: color, pathLength: 1 });
      const arrow = el('path', { d: `M${xb - (delta > 0 ? 12 : -12)} ${Y - 26} L${xb} ${Y - 8} L${xb - (delta > 0 ? 2 : -2)} ${Y - 30}`, class: 'st-arrow', stroke: color });
      layer.append(path);
      await wait(30);
      path.classList.add('draw');
      await wait(fast ? 260 : 520);
      layer.append(arrow);
      layer.append(el('text', { x: mid, y: up - 6, class: 'st-lab', fill: color, 'text-anchor': 'middle' }, label ?? (delta > 0 ? `+${delta}` : `${delta}`)));
      tick(b, true);
      layer.append(el('circle', { cx: xb, cy: Y, r: 9, class: 'st-dot' }));
      cur = b;
      await wait(fast ? 120 : 380);
      return b;
    },
  };
}
