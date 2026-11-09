import { h, type Child } from '../core/dom';
import { layers } from './stage';

/** Einfaches Fenster über allem. Gibt close() zurück. */
export function openModal(opts: { title?: string; content: Child; wide?: boolean; onClose?: () => void; closable?: boolean }) {
  const closable = opts.closable !== false;
  const close = () => {
    back.remove();
    opts.onClose?.();
  };
  const card = h(
    'div',
    { class: 'modal-card' + (opts.wide ? ' wide' : '') },
    opts.title ? h('h2', {}, opts.title) : null,
    h('div', { class: 'modal-body' }, opts.content),
    closable ? h('button', { class: 'modal-x', 'aria-label': 'Schließen', onclick: close }, '✕') : null
  );
  const back = h('div', { class: 'modal-back', onpointerdown: (e: Event) => closable && e.target === back && close() }, card);
  layers.overlay.append(back);
  return close;
}
