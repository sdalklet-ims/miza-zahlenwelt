/** Haustiere füttern: Auswahl des Tiers, Sättigung, Futtervorrat, Lieblingsfutter, Mitnehmen. */
import { h } from '../core/dom';
import { onProgress } from '../core/progress';
import { petSvg, type PetKind } from './art';
import { openModal } from './modal';
import { feed, foods, fullness, kindById, mood, pets, stock, setFollow } from '../core/pet';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

export function openPetUi(startIdx = 0, onFed?: () => void) {
  const body = h('div', { class: 'pet-ui' });
  let sel = startIdx;
  let fedNow = false;
  function render() {
    const list = pets();
    if (!list.length) return;
    if (sel >= list.length) sel = 0;
    const p = list[sel];
    const k = kindById(p.kind), full = Math.round(fullness(p)), m = mood(p);
    body.replaceChildren(
      h('div', { class: 'pet-tabs', style: { display: list.length > 1 ? '' : 'none' } }, ...list.map((q, i) => h('button', { class: 'pet-tab ' + mood(q) + (i === sel ? ' on' : ''), onclick: () => { sel = i; render(); } },
        kindById(q.kind).icon, ' ' + q.name, mood(q) === 'hungry' ? ' 🍽️' : ''))),
      h('div', { class: 'pet-main' },
      h('div', { class: 'pet-art' + (fedNow ? ' munch' : ''), html: petSvg(p.kind as PetKind) }),
      h('div', { class: 'pet-info' },
        h('h3', {}, `${p.name} (${k.name})`),
        h('div', { class: 'pet-bar ' + m }, h('i', { style: { width: full + '%' } })),
        h('div', { class: 'pet-mood' }, m === 'happy' ? '😊 Satt und glücklich' : m === 'ok' ? '😐 Etwas Hunger' : '😢 Hat großen Hunger!'),
        h('div', { class: 'pet-foods' }, ...foods.map((f) => {
          const n = stock(f.id), fav = k.likes.includes(f.id);
          return h('button', { class: 'pet-food' + (fav ? ' fav' : ''), disabled: n <= 0 || full >= 100,
            onclick: () => {
              const r = feed(sel, f.id);
              if (!r.ok) return;
              sfx.munch();
              speak(r.favorite ? 'pet.fed.fav' : 'pet.fed', { name: p.name });
              fedNow = true;
              setTimeout(() => { fedNow = false; }, 900);
              onFed?.();
            } },
          h('span', { class: 'pf-icon' }, f.icon), h('span', { class: 'pf-name' }, f.name), h('small', {}, `Vorrat ${n}` + (fav ? ' ❤️' : '')));
        })),
        h('button', { class: 'btn ' + (p.follow ? 'ghost' : 'sky') + ' pet-follow', onclick: () => { setFollow(sel, !p.follow); sfx.pop(); speak(!p.follow ? 'pet.follow.on' : 'pet.follow.off', { name: p.name }); } }, p.follow ? '🏠 Zuhause lassen' : '🦮 Mitnehmen'),
        h('small', { class: 'pet-hint' }, 'Futter gibt es im Supermarkt. ❤️ = Lieblingsfutter (macht extra satt).')))
    );
  }
  render();
  const off = onProgress(render);
  const timer = window.setInterval(render, 4000);
  openModal({ title: pets().length > 1 ? 'Meine Haustiere' : 'Mein Haustier', wide: false, onClose: () => { off(); clearInterval(timer); }, content: body });
}
