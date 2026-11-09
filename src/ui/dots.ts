/** Punktefeld: `rows` Reihen mit je `cols` Punkten (Malbild). Mit `group` werden die Gruppen farbig abgesetzt (Teilen). */
import { h } from '../core/dom';

const COLORS = ['#e9803a', '#4a90d9', '#5fbf4a', '#c0509a', '#e9b949', '#7d52c9', '#e8504a', '#2e9e9a', '#8a5a2b', '#6b7a8f'];

export function dotsEl(rows: number, cols: number, byGroups = false): HTMLElement {
  const box = h('div', { class: 'dots' + (rows > 5 || cols > 8 ? ' sm' : ''), style: { '--cols': String(cols) } });
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const row = h('div', { class: 'dots-row', style: { animationDelay: r * 0.12 + 's' } });
    for (let c = 0; c < cols; c++, i++) row.append(h('i', { class: 'dot', style: { background: byGroups ? COLORS[r % COLORS.length] : COLORS[r % 2 ? 1 : 0] } }));
    box.append(row);
  }
  return box;
}
