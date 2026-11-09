export type Child = Node | string | number | null | undefined | false;

/** Minimaler DOM-Helfer: h('div', {class:'x', onclick: fn}, kinder...) */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, any> = {},
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Record<string, string>))
        sk.startsWith('--') ? el.style.setProperty(sk, sv) : ((el.style as any)[sk] = sv);
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  return el;
}

export function append(el: Element, kids: Child[]) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
