/**
 * Bühne: Grundmaß 1180×820 (iPad quer). Das Fenster wird ganz ausgefüllt: Die Bühne wächst in der längeren Richtung mit (W/H sind die aktuellen
 * logischen Maße). Die 3D-Welt nutzt die ganze Fläche, Menüs und Aufgaben-Bildschirme bleiben 1180×820 und stehen mittig.
 */
export const BASE_W = 1180;
export const BASE_H = 820;
export let W = BASE_W;
export let H = BASE_H;

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
    scale = Math.min(vw / BASE_W, vh / BASE_H);
    W = Math.max(BASE_W, Math.round(vw / scale));
    H = Math.max(BASE_H, Math.round(vh / scale));
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';
    stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
    window.dispatchEvent(new Event('stage-resize'));
  };
  fit();
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  return layers;
}
