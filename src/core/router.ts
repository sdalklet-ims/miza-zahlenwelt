import { layers } from '../ui/stage';
import { hud } from '../ui/hud';
import { stopSpeaking } from '../audio/speak';

export interface Screen {
  el: HTMLElement;
  dispose?: () => void;
  /** Hintergrund der Bühne neben dem festen 1180×820-Rahmen (z. B. Meer bei der Karte) */
  bg?: string;
}

let cur: Screen | null = null;

/** Zeigt einen Bildschirm. Der vorherige wird abgebaut (Sprache stoppt). */
export function show(s: Screen, opts: { hud?: boolean; back?: (() => void) | null; framed?: boolean } = {}) {
  stopSpeaking();
  cur?.dispose?.();
  cur?.el.remove();
  layers.overlay.replaceChildren(); // offene Fenster schließen
  cur = s;
  s.el.classList.add('screen-in');
  s.el.classList.toggle('framed', opts.framed !== false);
  layers.stage.style.background = s.bg ?? '';
  layers.screen.append(s.el);
  hud.show(opts.hud !== false);
  hud.setBack(opts.back ?? null);
}
