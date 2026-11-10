/** Rucksack: hier steckt der Regenschirm (und man sieht den Futtervorrat für die Haustiere). */
import { h } from '../core/dom';
import { openModal } from './modal';
import { foods, stock } from '../core/pet';
import { eat, eatTextId, fullness, hungerLevel, mealStock, meals } from '../core/hunger';
import { onProgress } from '../core/progress';
import { hasUmbrella, onWeather, setUmbrella, weather } from '../core/weather';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

export function openBackpack() {
  const body = h('div', { class: 'pack' });
  const timer = window.setInterval(() => render(), 5000);
  function render() {
    const up = weather.umbrella;
    const full = Math.round(fullness()), lvl = hungerLevel();
    body.replaceChildren(
      h('div', { class: 'pack-hunger' }, h('span', {}, lvl === 'empty' ? '🥺 Mias Magen ist leer – erst essen, dann spielen!' : lvl === 'weak' ? '🥴 Mia ist ganz schwindelig vor Hunger' : lvl === 'hungry' ? '😫 Mia hat großen Hunger' : lvl === 'rumble' ? '😋 Mias Magen knurrt' : lvl === 'ok' ? '🙂 Mia ist ganz gut satt' : '😊 Mia ist satt'), h('div', { class: 'pet-bar ' + (lvl === 'hungry' || lvl === 'weak' || lvl === 'empty' ? 'hungry' : lvl === 'rumble' ? 'ok' : 'happy') }, h('i', { style: { width: full + '%' } }))),
      h('div', { class: 'pack-grid' },
        ...meals.filter((m) => mealStock(m.id) > 0).map((m) => h('button', { class: 'pack-item meal', disabled: full >= 97, onclick: () => { if (eat(m.id)) { sfx.munch(); speak(eatTextId(m), { name: m.name }); } else speak('mia.eat.full'); } },
          h('span', { class: 'pk-icon' }, m.icon), h('b', {}, m.name), h('small', {}, `Vorrat ${mealStock(m.id)} · +${m.fill}`))),
        hasUmbrella() ? h('button', { class: 'pack-item' + (up ? ' on' : '') + (weather.raining && !up ? ' hint' : ''), onclick: () => { setUmbrella(!up); sfx.pop(); speak(!up ? 'weather.umb.on' : 'weather.umb.off'); } },
          h('span', { class: 'pk-icon' }, '☂️'), h('b', {}, 'Regenschirm'), h('small', {}, up ? 'aufgespannt – tippen zum Zuklappen' : weather.raining ? 'Es regnet! Tippen zum Aufspannen' : 'tippen zum Aufspannen')) : null,
        ...foods.filter((f) => stock(f.id) > 0).map((f) => h('div', { class: 'pack-item food' }, h('span', { class: 'pk-icon' }, f.icon), h('b', {}, f.name), h('small', {}, `Vorrat ${stock(f.id)}`)))),
      h('small', { class: 'pet-hint' }, 'Im Rucksack ist alles, was Mia mitnimmt: Essen (tippen = essen), Haustierfutter und der Schirm gegen Regen.'));
  }
  render();
  const off1 = onWeather(render), off2 = onProgress(render);
  openModal({ title: '🎒 Rucksack', wide: false, onClose: () => { off1(); off2(); clearInterval(timer); }, content: body });
}
