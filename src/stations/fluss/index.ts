import { show } from '../../core/router';
import { hungerBlocked } from '../../core/hunger';
import { speak } from '../../audio/speak';
import { registerStations, type Npc, type Offer } from '../index';
import { checkScreen, malScreen, teilenScreen } from './games';
import { reiheScreen } from './reihe';
import { paareScreen } from './paare';
import { videoScreen } from './video';
import '../../styles/games.css';
import '../../styles/wiese.css';
import '../../styles/fluss.css';

function start(offer: Offer, npc: Npc, back: () => void) {
  if (hungerBlocked(offer)) { void speak('mia.hunger.nogame'); back(); return; } // leerer Magen: erst essen
  const again = () => start(offer, npc, back);
  switch (offer) {
    case 'mal': return show(malScreen(back, again), { back });
    case 'teilen': return show(teilenScreen(back, again), { back });
    case 'reihe': return show(reiheScreen(back, again), { back });
    case 'malpaare': return show(paareScreen(back, again), { back });
    case 'check': return show(checkScreen(back, again), { back });
    case 'video': return show(videoScreen(back, again), { back });
    default: return;
  }
}

registerStations('fluss', start);
