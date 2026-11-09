/** Autohaus von Waschbär Rocky und die Garage: Fahrzeuge kaufen (teurer als Supermarkt-Ware), auswählen und losfahren. */
import { h } from '../core/dom';
import { coins } from '../core/rewards';
import { onProgress } from '../core/progress';
import { buyVehicle, currentRide, owns, setRide, vehicles } from '../core/vehicles';
import { openModal } from './modal';
import { priceDots } from './houseUi';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

const bars = (speed: number) => h('div', { class: 'cs-speed', title: `Tempo ×${speed}` }, ...Array.from({ length: 8 }, (_, i) => h('i', { class: i < Math.round(speed * 2.2) ? 'on' : '' })));

export function openCarShop() {
  const body = h('div', { class: 'carshop' });
  let pick: string | null = null;
  function render() {
    const have = coins(), ride = currentRide();
    body.replaceChildren(
      h('div', { class: 'cs-head' }, h('div', { class: 'cs-purse' }, `Du hast 🪙 ${have}`), h('small', {}, 'Je teurer, desto schneller – und die Welt ist groß!')),
      h('div', { class: 'cs-grid' }, ...vehicles.map((v) => {
        const mine = owns(v.id), can = have >= v.price, on = ride?.id === v.id;
        const sel = pick === v.id;
        return h('div', { class: 'cs-card' + (mine ? ' own' : '') + (sel ? ' sel' : '') + (!mine && !can ? ' poor' : ''), onclick: () => { pick = v.id; sfx.pop(); render(); } },
          h('div', { class: 'cs-icon' }, v.icon), h('b', {}, v.name), bars(v.speed),
          h('small', {}, v.blurb),
          mine ? h('button', { class: 'btn ' + (on ? 'ghost' : 'sun'), onclick: (e: Event) => { e.stopPropagation(); setRide(on ? null : v.id); sfx.honk(); speak(on ? 'car.ride.off' : 'car.ride.on', { name: v.name }); } }, on ? '🚶 Aussteigen' : '▶ Fahren')
            : h('div', { class: 'cs-price' }, `🪙 ${v.price}`));
      })),
      (() => {
        const v = vehicles.find((x) => x.id === pick);
        if (!v || owns(v.id)) return h('div', { class: 'cs-buy empty' }, 'Tippe ein Fahrzeug an, das dir gefällt.');
        const can = have >= v.price;
        return h('div', { class: 'cs-buy' },
          h('div', { class: 'cs-calc' }, h('span', {}, `${v.icon} ${v.name}`), h('b', {}, `🪙 ${have} − ${v.price} = ${can ? have - v.price : '?'}`), priceDots(v.price)),
          h('button', { class: 'btn ' + (can ? 'sun' : 'ghost'), disabled: !can, onclick: () => {
            if (!buyVehicle(v.id)) { speak('car.poor'); return; }
            sfx.buy(); setTimeout(() => sfx.honk(), 250);
            speak('car.buy', { name: v.name });
            pick = null;
            render();
          } }, can ? `🪙 ${v.price} bezahlen` : 'Zu wenig Münzen'));
      })());
  }
  render();
  const off = onProgress(render);
  openModal({ title: '🚗 Autohaus', wide: true, onClose: off, content: body });
  speak('car.rocky.visit');
}

/** Garage: gekaufte Fahrzeuge auswählen */
export function openGarage() {
  const body = h('div', { class: 'carshop garage' });
  function render() {
    const ride = currentRide();
    body.replaceChildren(h('div', { class: 'cs-grid' },
      h('div', { class: 'cs-card own' + (!ride ? ' sel' : ''), onclick: () => { setRide(null); sfx.pop(); speak('car.ride.off'); } }, h('div', { class: 'cs-icon' }, '🚶'), h('b', {}, 'Zu Fuß'), h('small', {}, 'Immer dabei')),
      ...vehicles.filter((v) => owns(v.id)).map((v) => h('div', { class: 'cs-card own' + (ride?.id === v.id ? ' sel' : ''), onclick: () => { setRide(v.id); sfx.honk(); speak('car.ride.on', { name: v.name }); } }, h('div', { class: 'cs-icon' }, v.icon), h('b', {}, v.name), bars(v.speed)))));
  }
  render();
  const off = onProgress(render);
  openModal({ title: '🅿️ Meine Garage', onClose: off, content: body });
}
