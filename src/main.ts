import { openBackpack } from './ui/backpack';
import { openGarage } from './ui/carshop';
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

hud.init({ onMap: goMap, onAlbum: openAlbum, onSettings: openSettings, onHouse: () => openHouseUi({ mode: 'plan' }), onPack: openBackpack, onRide: openGarage });

show(
  startScreen(() => {
    unlockAudio(); // iPad: Sprache erst nach Berührung erlaubt
    void enterWorld();
    speak('common.start');
  }),
  { hud: false }
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Kein Scrollen/Zoomen der Seite, Multi-Touch bleibt erlaubt (Joystick + Knopf gleichzeitig)
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
