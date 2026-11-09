import { h } from '../core/dom';

export interface Keypad {
  el: HTMLElement;
  value: () => string;
  clear: () => void;
  lock: (on: boolean) => void;
  shake: () => void;
}

/** Großer Ziffernblock (kein System-Keyboard auf dem iPad). */
export function createKeypad(maxLen: number, onSubmit: (v: number) => void): Keypad {
  let v = '';
  let locked = false;
  const show = h('div', { class: 'answer-box' }, '?');
  const refresh = () => {
    show.textContent = v === '' ? '?' : v;
    show.classList.toggle('empty', v === '');
  };
  const key = (label: string, fn: () => void, cls = '') =>
    h('button', { class: 'key ' + cls, onclick: () => !locked && fn() }, label);
  const digit = (d: string) => key(d, () => {
    if (v.length < maxLen) v += d;
    refresh();
  });
  const del = key('⌫', () => {
    v = v.slice(0, -1);
    refresh();
  }, 'del');
  const ok = key('✓', () => {
    if (v !== '') onSubmit(Number(v));
  }, 'ok');
  const pad = h('div', { class: 'keys' }, ...['1', '2', '3', '4', '5'].map(digit), del, ...['6', '7', '8', '9', '0'].map(digit), ok);
  const el = h('div', { class: 'keypad' }, show, pad);
  refresh();
  return {
    el,
    value: () => v,
    clear() {
      v = '';
      refresh();
    },
    lock(on) {
      locked = on;
      el.classList.toggle('locked', on);
    },
    shake() {
      show.classList.remove('shake');
      void show.offsetWidth;
      show.classList.add('shake');
    },
  };
}
