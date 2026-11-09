import { registerWorld } from '../index';
import { show } from '../../core/router';
import { mapScreen } from '../../core/map';
import { areaScreen, type Npc, type Offer } from './area';
import { checkScreen, discoverScreen, kaertchenScreen, punkteScreen, steineScreen } from './games';
import '../../styles/wald.css';
import '../../styles/games.css';

function toMap() {
  show(mapScreen(), { back: null });
}

export function enterArea(focusNpc?: string, arrive = false) {
  show(areaScreen({ onOffer: startOffer, focusNpc, arrive }), { back: toMap });
}

function startOffer(offer: Offer, npc: Npc) {
  const back = () => enterArea(npc.id);
  const play = (o: Offer) => () => startOffer(o, npc);
  switch (offer) {
    case 'punkte':
      return show(punkteScreen(back, play('punkte')), { back });
    case 'kaertchen':
      return show(kaertchenScreen(back, play('kaertchen')), { back });
    case 'steine':
      return show(steineScreen(back), { back });
    case 'discover':
      return show(discoverScreen(), { back });
    case 'check':
      return show(checkScreen(back, play('check')), { back });
    case 'video':
      // Etappe d
      return show(discoverScreen(), { back });
  }
}

registerWorld('wald', { enter: () => enterArea(undefined, true) });
