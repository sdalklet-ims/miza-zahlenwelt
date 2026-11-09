import { show } from '../../core/router';
import { registerStations, type Npc, type Offer } from '../index';
import { checkScreen, discoverScreen, kaertchenScreen, punkteScreen, steineScreen } from './games';
import { videoScreen } from './video';
import { pilzeScreen } from './minigames';
import { angelnScreen } from './angeln';
import '../../styles/games.css';
import '../../styles/video.css';

function start(offer: Offer, npc: Npc, back: () => void) {
  const again = () => start(offer, npc, back);
  switch (offer) {
    case 'punkte': return show(punkteScreen(back, again), { back });
    case 'kaertchen': return show(kaertchenScreen(back, again), { back });
    case 'steine': return show(steineScreen(back), { back });
    case 'discover': return show(discoverScreen(), { back });
    case 'check': return show(checkScreen(back, again), { back });
    case 'angeln': return show(angelnScreen(back, again), { back });
    case 'pilze': return show(pilzeScreen(back, again), { back });
    case 'shop': return;
    case 'video': return show(videoScreen({ onDone: back, onSkip: back }), { back });
  }
}

registerStations('wald', start);
