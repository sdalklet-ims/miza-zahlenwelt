import { layers } from '../ui/stage';
import { hud } from '../ui/hud';
import { stopSpeaking } from '../audio/speak';

export interface Screen {
  el: HTMLElement;
  dispose?: () => void;
}

let cur: Screen | null = null;

/** Zeigt einen Bildschirm. Der vorherige wird abgebaut (Sprache stoppt). */
export function show(s: Screen, opts: { hud?: boolean; back?: (() => void) | null } = {}) {
  stopSpeaking();
  cur?.dispose?.();
  cur?.el.remove();
  layers.overlay.replaceChildren(); // offene Fenster schließen
  cur = s;
  s.el.classList.add('screen-in');
  layers.screen.append(s.el);
  hud.show(opts.hud !== false);
  hud.setBack(opts.back ?? null);
}
