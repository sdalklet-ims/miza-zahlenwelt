import { h } from '../core/dom';
import { speakerOf } from '../core/texts';
import { layers } from './stage';

let box: HTMLElement | null = null;
let timer: number | undefined;

export function showSubtitle(text: string, speakerId: string) {
  const sp = speakerOf(speakerId);
  clearTimeout(timer);
  box?.remove();
  box = h('div', { class: 'sub' }, h('b', { style: { color: sp.color } }, sp.name + ': '), text);
  layers.subs.append(box);
}

export function hideSubtitle(delay = 0) {
  clearTimeout(timer);
  const b = box;
  timer = window.setTimeout(() => {
    b?.classList.add('out');
    window.setTimeout(() => b?.remove(), 250);
    if (box === b) box = null;
  }, delay);
}
