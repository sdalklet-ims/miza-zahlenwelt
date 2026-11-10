import { h, wait } from '../core/dom';
import { openModal } from './modal';
import { miaSvg, npcSvg, owlSvg, type Expr } from './art';
import { equippedFor, awardStars } from '../core/rewards';
import { speak, say } from '../audio/speak';
import { items } from '../core/rewards';
import type { RewardItem } from '../core/texts';
import { dressedUrl } from '../world3d/miaAnim';

export function itemPreview(it: RewardItem): string {
  if (it.target === 'eule') return owlSvg([it.id]);
  const u = dressedUrl([it.id], 'front_idle', 260); // neue Mia mit dem Teil; Rückfall auf die alte Zeichnung, solange die Bilder laden
  return u ? `<img class="item-img" src="${u}" alt="">` : miaSvg([it.id], 'happy');
}

/** Zeigt neu freigeschaltete Album-Teile (nacheinander). */
export async function celebrateItems(newItems: RewardItem[]) {
  for (const it of newItems) {
    await new Promise<void>((resolve) => {
      const close = openModal({
        title: it.target === 'mia' ? 'Neu im Rucksack!' : 'Neu im Album!',
        onClose: resolve,
        content: h('div', { class: 'celebrate' },
          h('div', { class: 'cel-art', html: itemPreview(it) }),
          h('div', { class: 'cel-name' }, it.name),
          h('button', { class: 'btn', onclick: () => close() }, 'Toll!')),
      });
      speak(it.target === 'mia' ? 'common.pack.new' : 'common.album.new', { name: it.name });
    });
  }
}

export interface ResultButton { label: string; cls?: string; onClick: () => void }

/** Ergebnis-Fenster mit Sternen. */
export async function showResult(opts: { title: string; stars: number; text: string; buttons: ResultButton[]; speakId?: string; speaker?: string }) {
  const starEls = [1, 2, 3].map((i) => h('span', { class: 'rstar' + (i <= opts.stars ? ' on' : '') }, '★'));
  const close = openModal({
    title: opts.title,
    closable: false,
    content: h('div', { class: 'result' },
      h('div', { class: 'rstars' }, ...starEls),
      h('p', {}, opts.text),
      h('div', { class: 'rbtns' }, ...opts.buttons.map((b) => h('button', { class: 'btn ' + (b.cls ?? ''), onclick: () => { close(); b.onClick(); } }, b.label)))),
  });
  starEls.forEach(async (s, i) => {
    if (!s.classList.contains('on')) return;
    s.classList.remove('on');
    await wait(450 + i * 450);
    s.classList.add('on', 'drop');
  });
  if (opts.speakId) speak(opts.speakId);
  else say(opts.text, opts.speaker ?? 'mia');
}

/** Sterne eintragen und ggf. neue Items feiern */
export async function award(key: string, stars: number) {
  const { newItems } = awardStars(key, stars);
  if (newItems.length) await celebrateItems(newItems);
}

export { items, npcSvg, equippedFor };
