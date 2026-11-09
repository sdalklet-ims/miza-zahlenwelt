import './styles/base.css';
import './styles/map.css';
import { initStage } from './ui/stage';
import { hud } from './ui/hud';
import { show } from './core/router';
import { mapScreen } from './core/map';
import { startScreen } from './ui/start';
import { openSettings } from './ui/settings';
import { speak, unlockAudio } from './audio/speak';
import './worlds/wald'; // registriert die Welt "wald"

initStage();

function goMap() {
  show(mapScreen(), { back: null });
}

hud.init({ onMap: goMap, onSettings: openSettings });

show(
  startScreen(() => {
    unlockAudio(); // iPad: Sprache erst nach Berührung erlaubt
    goMap();
    speak('common.start');
  }),
  { hud: false }
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
