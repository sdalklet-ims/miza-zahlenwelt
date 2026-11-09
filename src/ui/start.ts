import { h } from '../core/dom';
import { miaSvg } from './art';
import { equippedFor } from '../core/rewards';
import type { Screen } from '../core/router';

export function startScreen(onStart: () => void): Screen {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '100', '10', '1000', '347'];
  const floaters = digits.map((d, i) =>
    h('span', {
      class: 'floater',
      style: {
        left: 5 + ((i * 67) % 90) + '%',
        top: 8 + ((i * 41) % 60) + '%',
        animationDelay: -i * 0.7 + 's',
        fontSize: 40 + ((i * 13) % 40) + 'px',
        '--c': ['#e8704a', '#4a90d9', '#4f9d5d', '#e9b949'][i % 4],
      },
    }, d)
  );
  const el = h(
    'div',
    { class: 'start', onclick: onStart, role: 'button', 'aria-label': 'Tippe zum Starten' },
    h('div', { class: 'start-hills' }),
    ...floaters,
    h('div', { class: 'start-title' }, h('span', {}, 'Mia'), h('small', {}, 'und die'), h('span', { class: 'zw' }, 'Zahlenwelt')),
    h('div', { class: 'start-mia', html: miaSvg(equippedFor('mia'), 'happy') }),
    h('div', { class: 'start-tap' }, 'Tippe zum Starten')
  );
  return { el };
}
