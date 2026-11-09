/** Feste Bühne 1180×820, skaliert auf jedes Fenster (iPad quer). */
export const W = 1180;
export const H = 820;

export interface Layers {
  stage: HTMLElement;
  screen: HTMLElement;
  hud: HTMLElement;
  subs: HTMLElement;
  overlay: HTMLElement;
}

export let layers: Layers;
let scale = 1;
export const getScale = () => scale;

export function initStage(): Layers {
  const stage = document.getElementById('stage')!;
  const mk = (id: string) => {
    const d = document.createElement('div');
    d.id = id;
    d.className = 'layer';
    stage.append(d);
    return d;
  };
  layers = { stage, screen: mk('screen'), hud: mk('hud'), subs: mk('subs'), overlay: mk('overlay') };
  const fit = () => {
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    scale = Math.min(vw / W, vh / H);
    stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
  };
  fit();
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  return layers;
}
