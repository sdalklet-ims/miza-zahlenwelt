/** Wald-Gebiet: frei begehbare 2D-Fläche. Antippen = Mia schleicht dorthin; Büsche = Versteck. */
import { h, pick } from '../../core/dom';
import { getWorld, textOf } from '../../core/texts';
import { getProgress } from '../../core/progress';
import { equippedFor } from '../../core/rewards';
import { miaSvg, npcSvg, bushSvg } from '../../ui/art';
import { getScale, layers } from '../../ui/stage';
import { speak, say } from '../../audio/speak';
import { waldScene } from './scene';
import type { Screen } from '../../core/router';

interface Pt { x: number; y: number }
export interface Npc { id: string; kind: string; name: string; x: number; y: number; hello: string; offers: string[] }
export type Offer = 'video' | 'discover' | 'check' | 'punkte' | 'steine' | 'kaertchen';

const world = getWorld('wald')!;
const NPCS: Npc[] = world.npcs;
const BUSHES: Pt[] = world.bushes;
const Y_MIN = 440, Y_MAX = 790, X_MIN = 50, X_MAX = 1130;
const NPC_W: Record<string, number> = { owl: 200, hedgehog: 175, badger: 170, hare: 150 };

const OFFER_LABEL: Record<Offer, string> = {
  video: '▶ Erklärvideo', discover: '🔍 Ausprobieren', check: '⭐ Mini-Check',
  punkte: '🎯 Punkte zählen', steine: '🪨 Steine-Meister', kaertchen: '🃏 Kärtchen-Duell',
};
const OFFER_STAR_KEY: Partial<Record<Offer, string>> = { check: 'wald.check', punkte: 'wald.punkte', steine: 'wald.steine', kaertchen: 'wald.kaertchen' };

let pos: Pt = { ...world.start };

const starRow = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export interface AreaOpts {
  onOffer: (offer: Offer, npc: Npc) => void;
  /** Nach einem Spiel: Mia steht beim Auftraggeber */
  focusNpc?: string;
  arrive?: boolean;
}

export function areaScreen(opts: AreaOpts): Screen {
  let dead = false;
  let token = 0;
  let hiddenIn: number | null = null;
  let bubble: HTMLElement | null = null;
  let hideTimer: number | undefined;

  const focus = NPCS.find((n) => n.id === opts.focusNpc);
  if (focus) pos = spot(focus);

  /* ── Figuren ── */
  const miaInner = h('div', { class: 'wmia-inner', html: miaSvg(equippedFor('mia')) });
  const mia = h('div', { class: 'wmia' }, miaInner);
  function render() {
    const s = 0.72 + ((pos.y - Y_MIN) / (Y_MAX - Y_MIN)) * 0.5;
    mia.style.transform = `translate(${pos.x - 60}px, ${pos.y - 132}px) scale(${s})`;
    mia.style.zIndex = String(Math.round(pos.y) + (hiddenIn != null ? -60 : 0));
  }
  render();

  const npcEls = new Map<string, HTMLElement>();
  for (const n of NPCS) {
    const w = NPC_W[n.kind] ?? 170;
    const starKey = OFFER_STAR_KEY[n.offers.includes('check') ? 'check' : (n.offers[0] as Offer)];
    const stars = starKey ? getProgress().stars[starKey] ?? 0 : 0;
    const acc = equippedFor(n.id);
    const el = h(
      'button',
      { class: 'npc', style: { left: n.x - w / 2 + 'px', top: n.y - w * 1.0 + 'px', width: w + 'px', zIndex: String(n.y) }, 'aria-label': n.name, onclick: () => talkTo(n) },
      h('div', { class: 'npc-art', html: npcSvg(n.kind, acc) }),
      h('div', { class: 'npc-tag' }, n.name, h('span', { class: 'npc-stars' }, starRow(stars)))
    );
    npcEls.set(n.id, el);
  }

  const bushEls = BUSHES.map((b, i) => {
    const el = h(
      'button',
      { class: 'bush', style: { left: b.x - 80 + 'px', top: b.y - 96 + 'px', zIndex: String(b.y) }, 'aria-label': 'Busch zum Verstecken', onclick: () => hideIn(i) },
      h('div', { html: bushSvg(1) }),
      h('div', { class: 'peek-eyes', html: '<svg viewBox="0 0 60 26" width="60" height="26"><ellipse cx="16" cy="14" rx="9" ry="10" fill="#fff"/><ellipse cx="44" cy="14" rx="9" ry="10" fill="#fff"/><circle cx="18" cy="15" r="5" fill="#3b2a1e"/><circle cx="46" cy="15" r="5" fill="#3b2a1e"/><path d="M4 3 l4 6 M56 3 l-4 6" stroke="#e9a24b" stroke-width="4" stroke-linecap="round"/></svg>' }),
      h('div', { class: 'peek-tail' })
    );
    return el;
  });

  const el = h('div', { class: 'wald' }, h('div', { class: 'wald-art', html: waldScene() }), ...npcEls.values(), ...bushEls, mia);
  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.npc, .bush, .bubble')) return;
    closeBubble();
    const r = layers.stage.getBoundingClientRect();
    const sc = getScale();
    walkTo(clampPt({ x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }));
  });

  /* ── Bewegen ── */
  function clampPt(p: Pt): Pt {
    return { x: Math.max(X_MIN, Math.min(X_MAX, p.x)), y: Math.max(Y_MIN, Math.min(Y_MAX, p.y)) };
  }

  function leaveBush() {
    if (hiddenIn == null) return;
    bushEls[hiddenIn].classList.remove('occupied');
    hiddenIn = null;
    clearTimeout(hideTimer);
    mia.classList.remove('hidden');
    render();
  }

  function walkTo(p: Pt): Promise<boolean> {
    const my = ++token;
    leaveBush();
    const from = { ...pos };
    const dx = p.x - from.x, dy = p.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return Promise.resolve(true);
    const dur = Math.max(200, (dist / 300) * 1000);
    if (Math.abs(dx) > 6) miaInner.style.setProperty('--flip', dx < 0 ? '-1' : '1');
    miaInner.classList.add('walking');
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        if (my !== token || dead) return resolve(false);
        const t = Math.min(1, (now - t0) / dur);
        pos = { x: from.x + dx * t, y: from.y + dy * t };
        render();
        if (t < 1) requestAnimationFrame(tick);
        else {
          miaInner.classList.remove('walking');
          resolve(true);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  function spot(n: Npc): Pt {
    return clampPt({ x: n.x + (n.x > 900 ? -135 : 135), y: n.y + 55 });
  }

  /* ── Verstecken ── */
  async function hideIn(i: number) {
    closeBubble();
    const b = BUSHES[i];
    if (hiddenIn === i) return;
    const ok = await walkTo({ x: b.x, y: b.y - 4 });
    if (!ok || dead) return;
    hiddenIn = i;
    mia.classList.add('hidden');
    bushEls[i].classList.add('occupied');
    render();
    speak(pick(['wald.hide.1', 'wald.hide.2', 'wald.hide.3']));
    hideTimer = window.setTimeout(() => {
      if (hiddenIn !== i) return;
      bushEls[i].classList.add('tail');
      speak('wald.hide.found');
    }, 7000);
  }

  /* ── Gespräche ── */
  function closeBubble() {
    bubble?.remove();
    bubble = null;
    npcEls.forEach((e) => e.classList.remove('talking'));
  }

  async function talkTo(n: Npc) {
    closeBubble();
    const ok = await walkTo(spot(n));
    if (!ok || dead) return;
    miaInner.style.setProperty('--flip', n.x < pos.x ? '-1' : '1');
    openBubble(n);
  }

  function openBubble(n: Npc) {
    const npcEl = npcEls.get(n.id)!;
    const w = NPC_W[n.kind] ?? 170;
    const bw = 420;
    const left = n.x < 600 ? n.x + w / 2 + 6 : n.x - w / 2 - bw - 6;
    const top = Math.max(96, Math.min(170, n.y - w * 0.95));
    const btns = n.offers.map((o) => {
      const key = OFFER_STAR_KEY[o as Offer];
      const stars = key ? getProgress().stars[key] ?? 0 : null;
      return h('button', { class: 'btn ' + (o === 'video' ? 'sun' : o === 'check' ? 'coral' : ''), onclick: () => { closeBubble(); opts.onOffer(o as Offer, n); } },
        OFFER_LABEL[o as Offer], stars != null && h('small', { class: 'btn-stars' }, starRow(stars)));
    });
    bubble = h('div', { class: 'bubble', style: { left: left + 'px', top: top + 'px', width: bw + 'px' } },
      h('div', { class: 'bubble-name' }, n.name),
      h('p', {}, textOf(n.hello)),
      h('div', { class: 'bubble-btns' }, ...btns, h('button', { class: 'btn ghost', onclick: closeBubble }, 'Später'))
    );
    el.append(bubble);
    npcEl.classList.add('talking');
    speak(n.hello).then(() => npcEl.classList.remove('talking'));
  }

  if (opts.arrive) speak('wald.arrive');
  else if (focus) setTimeout(() => !dead && openBubble(focus), 400);

  return {
    el,
    dispose() {
      dead = true;
      clearTimeout(hideTimer);
    },
  };
}

export { say };
