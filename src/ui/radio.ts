/** Radio im Haus: Sender wählen (ändert die Musik im ganzen Spiel). */
import { h } from '../core/dom';
import { STATIONS, currentStation, setStation, sfx } from '../audio/music';
import { openModal } from './modal';
import { speak } from '../audio/speak';

export function openRadio() {
  const list = h('div', { class: 'radio-list' });
  const render = () => {
    const cur = currentStation();
    list.replaceChildren(
      ...STATIONS.map((s) => h('button', { class: 'radio-btn' + (s.id === cur ? ' on' : ''), onclick: () => { setStation(s.id); sfx.click(); render(); if (s.id !== 'wald') speak('wald.haus.radio'); } },
        h('span', { class: 'radio-icon' }, s.icon), h('span', { class: 'radio-name' }, s.id === 'wald' ? 'Radio aus (Wald-Musik)' : s.name), s.id === cur ? h('small', {}, '▶ läuft') : null))
    );
  };
  render();
  openModal({ title: '📻 Radio', content: h('div', { class: 'radio' }, h('div', { class: 'radio-dial' }, '📻'), list) });
}
