import { show } from '../../core/router';
import { hungerBlocked } from '../../core/hunger';
import { speak } from '../../audio/speak';
import { registerStations, type Npc, type Offer } from '../index';
import { checkScreen, minusScreen, plusScreen } from './games';
import { partnerScreen } from './partner';
import { strahlScreen } from './strahl';
import { videoScreen } from './video';
import '../../styles/games.css';
import '../../styles/wiese.css';

function start(offer: Offer, npc: Npc, back: () => void) {
  if (hungerBlocked(offer)) { void speak('mia.hunger.nogame'); back(); return; } // leerer Magen: erst essen
  const again = () => start(offer, npc, back);
  switch (offer) {
    case 'plus': return show(plusScreen(back, again), { back });
    case 'minus': return show(minusScreen(back, again), { back });
    case 'partner': return show(partnerScreen(back, again), { back });
    case 'strahl': return show(strahlScreen(back, again), { back });
    case 'check': return show(checkScreen(back, again), { back });
    case 'video': return show(videoScreen(back, again), { back });
    default: return;
  }
}

registerStations('wiese', start);
