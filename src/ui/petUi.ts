/** Haustier füttern: Sättigung, Futtervorrat, Lieblingsfutter. */
import { h } from '../core/dom';
import { onProgress } from '../core/progress';
import { petSvg, type PetKind } from './art';
import { openModal } from './modal';
import { feed, foods, fullness, kindById, mood, pet, stock } from '../core/pet';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

export function openPetUi(onFed?: () => void) {
  const body = h('div', { class: 'pet-ui' });
  function render() {
    const p = pet();
    if (!p) return;
    const k = kindById(p.kind), full = Math.round(fullness()), m = mood();
    body.replaceChildren(
      h('div', { class: 'pet-art', html: petSvg(p.kind as PetKind) }),
      h('div', { class: 'pet-info' },
        h('h3', {}, `${p.name} (${k.name})`),
        h('div', { class: 'pet-bar ' + m }, h('i', { style: { width: full + '%' } })),
        h('div', { class: 'pet-mood' }, m === 'happy' ? '😊 Satt und glücklich' : m === 'ok' ? '😐 Etwas Hunger' : '😢 Hat großen Hunger!'),
        h('div', { class: 'pet-foods' }, ...foods.map((f) => {
          const n = stock(f.id), fav = k.likes.includes(f.id);
          return h('button', { class: 'pet-food' + (fav ? ' fav' : ''), disabled: n <= 0 || full >= 100,
            onclick: () => {
              const r = feed(f.id);
              if (!r.ok) return;
              sfx.munch();
              speak(r.favorite ? 'pet.fed.fav' : 'pet.fed', { name: p.name });
              onFed?.();
            } },
          h('span', { class: 'pf-icon' }, f.icon), h('span', { class: 'pf-name' }, f.name), h('small', {}, `Vorrat ${n}` + (fav ? ' ❤️' : '')));
        })),
        h('small', { class: 'pet-hint' }, 'Futter gibt es im Supermarkt. ❤️ = Lieblingsfutter (macht extra satt).'))
    );
  }
  render();
  const off = onProgress(render);
  const timer = window.setInterval(render, 4000);
  openModal({ title: 'Mein Haustier', wide: false, onClose: () => { off(); clearInterval(timer); }, content: body });
}
