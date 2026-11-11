/** Einstellungen: Musik, Tippen-zum-Laufen, Fortschritt zurücksetzen. */
import { h } from '../core/dom';
import { getProgress, mutate, resetProgress } from '../core/progress';
import { openModal } from './modal';
import { applyMusicSettings, sfx } from '../audio/music';
import { exportSave, importSave } from '../core/save';
import { addCoins, coins, totalStars } from '../core/rewards';
import { setWorldUnlocked, worldUnlocked } from '../core/unlock';

export function openSettings() {
  const p = getProgress().settings;

  const coinNow = h('span', {}, `Du hast ${coins()} Münzen`);
  const starNow = h('span', {}, `Sterne: ${totalStars()}`);
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
  const resetBtn = h('button', { class: 'btn ghost set-reset' }, '🔄 Alles zurücksetzen und neu anfangen');
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'Wirklich ALLES löschen? Zum Bestätigen nochmal tippen.';
      setTimeout(() => {
        armed = false;
        resetBtn.textContent = '🔄 Alles zurücksetzen und neu anfangen';
      }, 4000);
      return;
    }
    resetProgress();
    location.reload();
  });

  const box = h('textarea', { class: 'save-box', rows: '3', placeholder: 'Spielstand-Code hier einfügen oder kopieren' }) as HTMLTextAreaElement;
  const msg = h('div', { class: 'set-hint' }, '');
  const file = h('input', { type: 'file', accept: '.txt,text/plain', style: { display: 'none' } }) as HTMLInputElement;
  const doLoad = (text: string) => {
    const r = importSave(text);
    msg.textContent = r.msg;
    if (r.ok) setTimeout(() => location.reload(), 900);
  };
  file.addEventListener('change', async () => { const f = file.files?.[0]; if (f) doLoad(await f.text()); });
  const saveRow = h('div', { class: 'set-row' },
    h('button', { class: 'btn sky', onclick: async () => { box.value = exportSave(); box.focus(); box.select(); try { await navigator.clipboard.writeText(box.value); msg.textContent = 'Code kopiert – an einem sicheren Ort einfügen (z. B. Notizen).'; } catch { msg.textContent = 'Code markiert – bitte kopieren (lange tippen).'; } } }, '💾 Spielstand sichern'),
    h('button', { class: 'btn ghost', onclick: () => { const url = URL.createObjectURL(new Blob([exportSave()], { type: 'text/plain' })); const a = h('a', { href: url, download: 'mia-spielstand.txt' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); msg.textContent = 'Datei gespeichert.'; } }, '⬇️ Als Datei'),
    h('button', { class: 'btn sun', onclick: () => doLoad(box.value) }, '📂 Code laden'),
    h('button', { class: 'btn ghost', onclick: () => file.click() }, '📄 Datei laden'),
    file);

  openModal({
    title: 'Einstellungen',
    wide: true,
    content: h('div', { class: 'settings' },
      h('div', { class: 'set-row' }, h('button', { class: 'btn sun', onclick: () => { addCoins(20); sfx.coin(); coinNow.textContent = `Du hast ${coins()} Münzen`; } }, '🪙 +20 Münzen (Test)'), h('span', { class: 'set-hint' }, coinNow)),
      h('div', { class: 'set-row' }, h('button', { class: 'btn sun', onclick: () => { mutate((q) => void (q.stars['test.bonus'] = (q.stars['test.bonus'] ?? 0) + 1)); sfx.star(); starNow.textContent = `Sterne: ${totalStars()}`; } }, '⭐ +1 Stern (Test)'), h('span', { class: 'set-hint' }, starNow)),
      h('div', { class: 'set-row' }, resetBtn),
      h('div', { class: 'set-hint' }, 'Löscht Sterne, Münzen, Haus, Tiere, Fahrzeuge und alle Abzeichen. Danach beginnt das Spiel ganz neu.'),
      h('label', {}, h('span', {}, '🎵 Musik-Lautstärke ', volOut), vol),
      h('div', { class: 'set-row' },
        toggle('Musik an', () => getProgress().settings.musicOn, (v) => mutate((s) => void (s.settings.musicOn = v))),
        toggle('Tippen = dorthin laufen', () => getProgress().settings.tapWalk, (v) => mutate((s) => void (s.settings.tapWalk = v)))),
      h('div', { class: 'set-row' }, toggle('🔧 Test: Wiese freischalten (lädt neu)', () => worldUnlocked('wiese'), (v) => { setWorldUnlocked('wiese', v); setTimeout(() => location.reload(), 300); }),
        toggle('🔧 Test: Fluss freischalten (lädt neu)', () => worldUnlocked('fluss'), (v) => { setWorldUnlocked('fluss', v); setWorldUnlocked('wiese', v || worldUnlocked('wiese')); setTimeout(() => location.reload(), 300); })),
      h('div', { class: 'set-hint' }, 'Alle Texte werden gelesen – es gibt keine Stimmen. Der Spielstand wird automatisch auf diesem Gerät gespeichert.'),
      h('h3', { class: 'set-h' }, '💾 Spielstand sichern'), box, saveRow, msg,
      ),
  });
}
