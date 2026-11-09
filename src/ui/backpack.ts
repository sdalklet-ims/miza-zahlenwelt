/** Rucksack: hier steckt der Regenschirm (und man sieht den Futtervorrat für die Haustiere). */
import { h } from '../core/dom';
import { openModal } from './modal';
import { foods, stock } from '../core/pet';
import { hasUmbrella, onWeather, setUmbrella, weather } from '../core/weather';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

export function openBackpack() {
  const body = h('div', { class: 'pack' });
  function render() {
    const up = weather.umbrella;
    body.replaceChildren(
      h('div', { class: 'pack-grid' },
        hasUmbrella() ? h('button', { class: 'pack-item' + (up ? ' on' : '') + (weather.raining && !up ? ' hint' : ''), onclick: () => { setUmbrella(!up); sfx.pop(); speak(!up ? 'weather.umb.on' : 'weather.umb.off'); } },
          h('span', { class: 'pk-icon' }, '☂️'), h('b', {}, 'Regenschirm'), h('small', {}, up ? 'aufgespannt – tippen zum Zuklappen' : weather.raining ? 'Es regnet! Tippen zum Aufspannen' : 'tippen zum Aufspannen')) : null,
        ...foods.filter((f) => stock(f.id) > 0).map((f) => h('div', { class: 'pack-item food' }, h('span', { class: 'pk-icon' }, f.icon), h('b', {}, f.name), h('small', {}, `Vorrat ${stock(f.id)}`)))),
      h('small', { class: 'pet-hint' }, 'Im Rucksack ist alles, was Mia mitnimmt. Der Schirm schützt vor Regen.'));
  }
  render();
  const off = onWeather(render);
  openModal({ title: '🎒 Rucksack', wide: false, onClose: off, content: body });
}
