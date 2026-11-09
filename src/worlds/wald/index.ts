import { registerWorld } from '../index';
import { show } from '../../core/router';
import { mapScreen } from '../../core/map';
import { say } from '../../audio/speak';
import { areaScreen, type Npc, type Offer } from './area';
import '../../styles/wald.css';

function toMap() {
  show(mapScreen(), { back: null });
}

export function enterArea(focusNpc?: string, arrive = false) {
  show(areaScreen({ onOffer: startOffer, focusNpc, arrive }), { back: toMap });
}

function startOffer(offer: Offer, _npc: Npc) {
  // Etappe c/d hängt hier Spiele, Video und Check ein
  say('Das kommt gleich! Dieses Spiel baue ich noch.', 'mia');
  void offer;
}

registerWorld('wald', { enter: () => enterArea(undefined, true) });
