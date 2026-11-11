import { openBackpack } from './ui/backpack';
import { openGarage } from './ui/carshop';
import { openBadgeBook } from './ui/badges';
import './styles/base.css';
import './styles/map.css';
import './styles/polish.css';
import { initStage } from './ui/stage';
import { hud } from './ui/hud';
import { show } from './core/router';
import { mapScreen } from './core/map';
import { enterWorld } from './world/worldScreen';
import { startScreen } from './ui/start';
import { openSettings } from './ui/settings';
import { openAlbum } from './ui/album';
import { openHouseUi } from './ui/houseUi';
import { speak, unlockAudio } from './audio/speak';
import './worlds/wald'; // registriert die Welt "wald"
import './worlds/fluss'; // registriert die Welt "fluss"
import './worlds/wiese'; // registriert die Welt "wiese" (gesperrt, bis freigeschaltet)

initStage();

function goMap() {
  show(mapScreen(), { back: null });
}

hud.init({ onMap: goMap, onAlbum: openAlbum, onSettings: openSettings, onHouse: () => openHouseUi({ mode: 'plan' }), onPack: openBackpack, onRide: openGarage, onBadges: () => openBadgeBook() });

show(
  startScreen(() => {
    unlockAudio(); // iPad: Sprache erst nach Berührung erlaubt
    void enterWorld();
    speak('common.start');
  }),
  { hud: false, framed: false }
);

// Offline-Start: Service Worker nur über https oder localhost; updateViaCache 'none', damit Updates sofort ankommen
if ('serviceWorker' in navigator && import.meta.env.PROD && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((r) => void r.update()).catch(() => {});
}
// Spielstand dauerhaft sichern lassen (Safari räumt ihn dann nicht so schnell weg)
void navigator.storage?.persist?.().catch(() => {});

// Bildschirm wach halten, solange das Spiel sichtbar ist
let wake: { release(): Promise<void> } | null = null;
async function keepAwake() {
  try {
    const nav = navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (nav.wakeLock && document.visibilityState === 'visible' && !wake) {
      wake = await nav.wakeLock.request('screen');
      (wake as unknown as EventTarget).addEventListener('release', () => (wake = null));
    }
  } catch { /* nicht verfügbar oder abgelehnt */ }
}
document.addEventListener('visibilitychange', () => void keepAwake());
document.addEventListener('pointerdown', () => void keepAwake(), { passive: true }); // iPad erlaubt es oft erst nach einer Berührung

// Zuverlässige Knöpfe: Wird ein Knopf getroffen, aber der Finger rutscht beim Loslassen bis ~24 px daneben
// (z. B. weil der Knopf beim Drücken schrumpft), löst trotzdem ein Tipp aus.
{
  const TOL = 24;
  let down: { el: HTMLButtonElement; x: number; y: number; id: number } | null = null;
  let lastClick = 0;
  document.addEventListener('click', () => (lastClick = performance.now()), true);
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element | null)?.closest?.('button') as HTMLButtonElement | null;
    down = el && !el.disabled ? { el, x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  }, true);
  document.addEventListener('pointerup', (e) => {
    const d = down;
    down = null;
    if (!d || d.id !== e.pointerId || !d.el.isConnected) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 40) return; // war eine Wischgeste
    const t0 = performance.now();
    setTimeout(() => {
      if (lastClick >= t0 - 5 || !d.el.isConnected) return; // ein normaler Klick kam an
      const r = d.el.getBoundingClientRect();
      if (e.clientX >= r.left - TOL && e.clientX <= r.right + TOL && e.clientY >= r.top - TOL && e.clientY <= r.bottom + TOL) d.el.click();
    }, 60);
  }, true);
}

// Kein Scrollen/Zoomen der Seite, Multi-Touch bleibt erlaubt (Joystick + Knopf gleichzeitig)
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
