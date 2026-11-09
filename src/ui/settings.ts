/** Einstellungen: Stimme, Sprechtempo, Hörprobe, Untertitel, Ton, Fortschritt zurücksetzen. */
import { h } from '../core/dom';
import { getProgress, mutate, resetProgress } from '../core/progress';
import { openModal } from './modal';
import { activeVoice, germanVoices, scoreVoice, speak } from '../audio/speak';

function voiceLabel(v: SpeechSynthesisVoice): string {
  const n = v.name.toLowerCase();
  const q = n.includes('premium') ? ' ⭐ Premium' : n.includes('enhanced') || n.includes('erweitert') ? ' ⭐ Erweitert' : '';
  return `${v.name} (${v.lang})${q}`;
}

export function openSettings() {
  const p = getProgress().settings;
  const voiceSel = h('select', { class: 'set-select', 'aria-label': 'Stimme' });
  const fillVoices = () => {
    const vs = germanVoices();
    voiceSel.replaceChildren(
      h('option', { value: '' }, vs.length ? `Automatisch (beste: ${vs[0].name})` : 'Keine deutsche Stimme gefunden'),
      ...vs.map((v) => h('option', { value: v.voiceURI }, voiceLabel(v)))
    );
    voiceSel.value = getProgress().settings.voiceURI ?? '';
  };
  fillVoices();
  voiceSel.addEventListener('change', () => mutate((s) => void (s.settings.voiceURI = voiceSel.value || null)));

  const rateOut = h('b', {}, p.rate.toFixed(2));
  const rate = h('input', { type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(p.rate), class: 'set-range', 'aria-label': 'Sprechtempo' });
  rate.addEventListener('input', () => {
    mutate((s) => void (s.settings.rate = Number(rate.value)));
    rateOut.textContent = Number(rate.value).toFixed(2);
  });

  const toggle = (label: string, get: () => boolean, set: (v: boolean) => void) => {
    const b = h('button', { class: 'set-toggle' }, '');
    const refresh = () => {
      b.textContent = (get() ? '✅ ' : '⬜ ') + label;
    };
    b.addEventListener('click', () => {
      set(!get());
      refresh();
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

  const close = openModal({
    title: 'Einstellungen',
    wide: true,
    content: h('div', { class: 'settings' },
      h('label', {}, h('span', {}, '🗣 Stimme'), voiceSel),
      h('div', { class: 'set-hint' }, activeVoice() ? `Aktiv: ${activeVoice()!.name}` : 'Tipp: Bessere Stimmen laden – am iPad unter Einstellungen › Bedienungshilfen › Gesprochene Inhalte › Stimmen › Deutsch.'),
      h('label', {}, h('span', {}, '🐢 Sprechtempo ', rateOut), h('div', { class: 'set-range-row' }, h('small', {}, 'langsamer'), rate, h('small', {}, 'schneller'))),
      h('div', { class: 'set-row' },
        h('button', { class: 'btn sun', onclick: () => speak('common.settings.test') }, '🔊 Hörprobe Eule'),
        h('button', { class: 'btn sky', onclick: () => speak('common.settings.test.mia') }, '🔊 Hörprobe Mia'),
        h('button', { class: 'btn ghost', onclick: () => { fillVoices(); } }, '↻ Stimmen neu laden')),
      h('div', { class: 'set-row' },
        toggle('Untertitel anzeigen', () => getProgress().settings.subtitles, (v) => mutate((s) => void (s.settings.subtitles = v))),
        toggle('Ton an', () => !getProgress().settings.muted, (v) => mutate((s) => void (s.settings.muted = !v))),
        toggle('Tippen = dorthin laufen', () => getProgress().settings.tapWalk, (v) => mutate((s) => void (s.settings.tapWalk = v)))),
      h('div', { class: 'set-row' }, resetBtn)),
  });
}
