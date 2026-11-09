import { h } from '../core/dom';
import { totalStars, coins } from '../core/rewards';
import { builtCount, parts } from '../core/house';
import { onProgress } from '../core/progress';
import { layers } from './stage';
import { onWeather, weather } from '../core/weather';
import { fullness, hungerLevel } from '../core/hunger';
import { currentRide, ownedAny } from '../core/vehicles';

export interface HudHandlers {
  onMap?: () => void;
  onAlbum?: () => void;
  onSettings?: () => void;
  onHouse?: () => void;
  onPack?: () => void;
  onRide?: () => void;
}

let root: HTMLElement;
let backBtn: HTMLButtonElement;
let starsEl: HTMLElement;
let coinEl: HTMLElement;
let houseEl: HTMLElement;
let packEl: HTMLElement | null = null;
let hungerEl: HTMLElement;
let rideEl: HTMLElement;
let hungerFill: HTMLElement;

export const hud = {
  init(handlers: HudHandlers) {
    backBtn = h('button', { class: 'hud-btn back', 'aria-label': 'Zurück' }, '◀ Zurück');
    starsEl = h('div', { class: 'hud-stars', 'aria-label': 'Sterne' });
    coinEl = h('div', { class: 'hud-stars coin', 'aria-label': 'Münzen' });
    hungerFill = h('i', {});
    hungerEl = h('button', { class: 'hud-hunger', 'aria-label': 'Hunger – Rucksack öffnen', onclick: () => handlers.onPack?.() }, h('span', { class: 'hg-icon' }, '🍽️'), h('div', { class: 'hg-bar' }, hungerFill));
    rideEl = h('button', { class: 'hud-btn icon ride', 'aria-label': 'Garage', title: 'Garage', onclick: () => handlers.onRide?.() }, '🚶');
    houseEl = h('button', { class: 'hud-stars house', 'aria-label': 'Mias Haus', onclick: () => handlers.onHouse?.() });
    const btn = (icon: string, label: string, fn?: () => void) =>
      fn ? h('button', { class: 'hud-btn icon', 'aria-label': label, title: label, onclick: fn }, icon) : null;
    root = h(
      'div',
      { class: 'hud-bar' },
      backBtn,
      h('div', { class: 'spacer' }),
      houseEl,
      hungerEl,
      coinEl,
      starsEl,
      rideEl,
      (packEl = btn('🎒', 'Rucksack', handlers.onPack)),
      btn('🗺️', 'Karte', handlers.onMap),
      btn('🎩', 'Album', handlers.onAlbum),
      btn('⚙️', 'Einstellungen', handlers.onSettings)
    );
    layers.hud.append(root);
    onProgress(hud.refresh);
    window.setInterval(hud.refresh, 5000);
    onWeather(() => packEl?.classList.toggle('pulse', weather.raining && !weather.umbrella));
    hud.refresh();
    hud.show(false);
  },
  show(on: boolean) {
    root.style.display = on ? 'flex' : 'none';
  },
  setBack(fn: (() => void) | null) {
    backBtn.style.display = fn ? '' : 'none';
    backBtn.onclick = fn;
  },
  refresh() {
    const set = (e: HTMLElement | undefined, t: string) => {
      if (!e || e.textContent === t) return;
      const had = !!e.textContent;
      e.textContent = t;
      if (had) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
    };
    if (hungerEl) {
      const lvl = hungerLevel();
      hungerFill.style.width = Math.round(fullness()) + '%';
      hungerEl.dataset.lvl = lvl;
      (hungerEl.firstChild as HTMLElement).textContent = lvl === 'hungry' ? '😫' : lvl === 'rumble' ? '😋' : '🍽️';
    }
    if (rideEl) {
      rideEl.style.display = ownedAny() ? '' : 'none';
      rideEl.textContent = currentRide()?.icon ?? '🚶';
    }
    set(starsEl, `⭐ ${totalStars()}`);
    set(coinEl, `🪙 ${coins()}`);
    if (houseEl) houseEl.textContent = `🏠 ${builtCount()}/${parts.length}`;
  },
};
