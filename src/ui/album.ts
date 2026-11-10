/** Album: gesammelte Mützen und Accessoires für Mia und die Tiere – anlegen und ablegen. */
import { h } from '../core/dom';
import { openModal } from './modal';
import { miaSvg, owlSvg } from './art';
import { items, isUnlocked, toggleEquip, totalStars, equippedFor } from '../core/rewards';
import { itemPreview } from './results';

// Mias Kleidung liegt im Rucksack; im Album gibt es noch die Sachen für Eule Olga
const TARGETS = [{ id: 'eule', name: 'Eule Olga' }];

export function openAlbum() {
  let tab = 'eule';
  const preview = h('div', { class: 'alb-preview' });
  const grid = h('div', { class: 'alb-grid' });
  const tabs = h('div', { class: 'alb-tabs' });

  function render() {
    tabs.replaceChildren(
      ...TARGETS.map((t) => h('button', { class: 'alb-tab' + (t.id === tab ? ' on' : ''), onclick: () => { tab = t.id; render(); } }, t.name))
    );
    const acc = equippedFor(tab);
    preview.innerHTML = tab === 'mia' ? miaSvg(acc, 'happy') : owlSvg(acc);
    grid.replaceChildren(
      ...items.filter((i) => i.target === tab).map((it) => {
        const open = isUnlocked(it);
        const on = acc.includes(it.id);
        return h('button', { class: 'alb-item' + (open ? '' : ' locked') + (on ? ' on' : ''), disabled: !open, onclick: () => { toggleEquip(it); render(); } },
          h('div', { class: 'alb-thumb', html: itemPreview(it) }),
          h('div', { class: 'alb-name' }, it.name),
          h('div', { class: 'alb-sub' }, open ? (on ? '✓ angezogen' : 'anziehen') : `🔒 ab ${it.stars} ⭐`));
      })
    );
  }
  render();

  openModal({
    title: `Album  ·  ⭐ ${totalStars()} gesammelt`,
    wide: true,
    content: h('div', { class: 'album' }, h('div', { class: 'alb-left' }, tabs, preview), grid),
  });
}
