/** Laden von Fuchs Fritz: Gadgets für Münzen. */
import { h } from '../core/dom';
import { common } from '../core/texts';
import { buyGadget, coins, hasGadget } from '../core/rewards';
import { onProgress } from '../core/progress';
import { openModal } from './modal';
import { speak } from '../audio/speak';

export function openShop() {
  const grid = h('div', { class: 'shop-grid' });
  const head = h('div', { class: 'shop-coins' });

  function render() {
    head.textContent = `Du hast 🪙 ${coins()} Münzen`;
    grid.replaceChildren(
      ...common.shop.items.map((it) => {
        const own = hasGadget(it.id);
        const can = coins() >= it.price;
        return h('div', { class: 'shop-item' + (own ? ' own' : '') },
          h('div', { class: 'shop-icon' }, it.icon),
          h('div', { class: 'shop-name' }, it.name),
          h('div', { class: 'shop-desc' }, it.desc),
          own
            ? h('div', { class: 'shop-own' }, '✓ gekauft')
            : h('button', {
                class: 'btn ' + (can ? 'sun' : 'ghost'),
                onclick: () => {
                  if (buyGadget(it.id, it.price)) speak('wald.fuchs.buy');
                  else speak('wald.fuchs.poor');
                  render();
                },
              }, `🪙 ${it.price}`));
      })
    );
  }
  render();
  const off = onProgress(render);
  openModal({
    title: '🛒 Fritz’ Laden',
    wide: true,
    onClose: () => void off(),
    content: h('div', { class: 'shop' }, head, grid, h('small', { class: 'shop-note' }, 'Münzen findest du überall im Wald und bei den Minispielen.')),
  });
}
