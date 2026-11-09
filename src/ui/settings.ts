/** Einstellungen: Musik, Tippen-zum-Laufen, Fortschritt zurücksetzen. */
import { h } from '../core/dom';
import { getProgress, mutate, resetProgress } from '../core/progress';
import { openModal } from './modal';
import { applyMusicSettings, sfx } from '../audio/music';

export function openSettings() {
  const p = getProgress().settings;

  const volOut = h('b', {}, Math.round(p.music * 100) + ' %');
  const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(p.music), class: 'set-range', 'aria-label': 'Lautstärke der Musik' });
  vol.addEventListener('input', () => {
    mutate((s) => void (s.settings.music = Number(vol.value)));
    volOut.textContent = Math.round(Number(vol.value) * 100) + ' %';
    applyMusicSettings();
  });
  vol.addEventListener('change', () => sfx.pop());

  const toggle = (label: string, get: () => boolean, set: (v: boolean) => void) => {
    const b = h('button', { class: 'set-toggle' }, '');
    const refresh = () => {
      b.textContent = (get() ? '✅ ' : '⬜ ') + label;
    };
    b.addEventListener('click', () => {
      set(!get());
      refresh();
      applyMusicSettings();
    });
    refresh();
    return b;
  };

  let armed = false;
  const resetBtn = h('button', { class: 'btn ghost set-reset' }, '🗑 Fortschritt löschen');
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'Wirklich alles löschen? Nochmal tippen.';
      setTimeout(() => {
        armed = false;
        resetBtn.textContent = '🗑 Fortschritt löschen';
      }, 4000);
      return;
    }
    resetProgress();
    location.reload();
  });

  openModal({
    title: 'Einstellungen',
    wide: true,
    content: h('div', { class: 'settings' },
      h('label', {}, h('span', {}, '🎵 Musik-Lautstärke ', volOut), vol),
      h('div', { class: 'set-row' },
        toggle('Musik an', () => getProgress().settings.musicOn, (v) => mutate((s) => void (s.settings.musicOn = v))),
        toggle('Tippen = dorthin laufen', () => getProgress().settings.tapWalk, (v) => mutate((s) => void (s.settings.tapWalk = v)))),
      h('div', { class: 'set-hint' }, 'Alle Texte werden gelesen – es gibt keine Stimmen.'),
      h('div', { class: 'set-row' }, resetBtn)),
  });
}
