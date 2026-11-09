/** Weltkarte: 5 Stationen, Mia läuft animiert hin. Gleichzeitig die Schnellreise-Übersicht. */
import { h } from './dom';
import { worlds, type WorldContent } from './texts';
import { getProgress, mutate, worldStars } from './progress';
import { equippedFor } from './rewards';
import { miaSvg } from '../ui/art';
import { mapBackground } from './mapArt';
import { modules } from '../worlds';
import { speak } from '../audio/speak';
import type { Screen } from './router';

interface Pt { x: number; y: number }

const MAX_STARS_PER_WORLD = 17;
const isOpen = (w: WorldContent) => w.meta.status === 'open' && !!modules[w.id];

/** Pfad durch alle Stationen (leicht geschwungen), als Punktliste + Index je Station */
function buildPath(stations: Pt[]) {
  const pts: Pt[] = [];
  const idx: number[] = [];
  stations.forEach((s, i) => {
    idx.push(pts.length);
    pts.push(s);
    const n = stations[i + 1];
    if (!n) return;
    const dx = n.x - s.x, dy = n.y - s.y, len = Math.hypot(dx, dy) || 1;
    const off = (i % 2 ? -1 : 1) * 60;
    const c = { x: (s.x + n.x) / 2 - (dy / len) * off, y: (s.y + n.y) / 2 + (dx / len) * off };
    for (let k = 1; k <= 14; k++) {
      const t = k / 15;
      pts.push({
        x: (1 - t) * (1 - t) * s.x + 2 * (1 - t) * t * c.x + t * t * n.x,
        y: (1 - t) * (1 - t) * s.y + 2 * (1 - t) * t * c.y + t * t * n.y,
      });
    }
  });
  return { pts, idx };
}

export function mapScreen(): Screen {
  const st = worlds.map((w) => ({ w, ...w.meta.map }));
  const { pts, idx } = buildPath(st);
  let cur = Math.max(0, st.findIndex((s) => s.w.id === getProgress().mapAt));
  let busy = false;
  let dead = false;

  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const pathSvg = `<svg viewBox="0 0 1180 820" class="map-path" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${poly}" fill="none" stroke="#c79a54" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
    <polyline points="${poly}" fill="none" stroke="#f7e3ae" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${poly}" fill="none" stroke="#d9b36c" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 14"/></svg>`;

  const miaInner = h('div', { class: 'mia-inner', html: miaSvg(equippedFor('mia')) });
  const mia = h('div', { class: 'map-mia' }, miaInner);
  const place = (p: Pt) => (mia.style.transform = `translate(${p.x - 45}px, ${p.y - 98}px)`);
  place(pts[idx[cur]]);

  const stationEls = st.map((s, i) => {
    const open = isOpen(s.w);
    const stars = worldStars(s.w.id);
    const b = h(
      'button',
      {
        class: 'station ' + (open ? 'open' : 'locked'),
        style: { left: s.x + 'px', top: s.y + 'px', '--c': s.w.meta.color },
        'aria-label': `${s.w.meta.title}${open ? '' : ' (gesperrt)'}`,
        onclick: () => go(i),
      },
      h('span', { class: 'st-ring' }, h('span', { class: 'st-icon' }, s.w.meta.icon), !open && h('span', { class: 'st-lock' }, '🔒')),
      h('span', { class: 'st-label' }, `${s.w.meta.order} · ${s.w.meta.title}`),
      open ? h('span', { class: 'st-stars' }, `⭐ ${stars}/${MAX_STARS_PER_WORLD}`) : h('span', { class: 'st-topic' }, '???')
    );
    return b;
  });
  const fogs = st
    .filter((s) => !isOpen(s.w))
    .map((s) => h('div', { class: 'fog', style: { left: s.x + 'px', top: s.y + 'px' } }));

  const el = h(
    'div',
    { class: 'map' },
    h('div', { class: 'map-art', html: mapBackground(st.map((s) => ({ x: s.x, y: s.y, theme: s.w.meta.theme }))) }),
    h('div', { class: 'map-art', html: pathSvg }),
    ...fogs,
    ...stationEls,
    mia,
    h('div', { class: 'map-title' }, 'Weltkarte')
  );

  function walkAlong(path: Pt[]): Promise<void> {
    return new Promise((resolve) => {
      const cum = [0];
      for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
      const total = cum[cum.length - 1];
      const dur = Math.max(400, (total / 320) * 1000);
      const t0 = performance.now();
      miaInner.classList.add('walking');
      const tick = (now: number) => {
        if (dead) return resolve();
        const t = Math.min(1, (now - t0) / dur);
        const d = t * total;
        let k = 1;
        while (k < cum.length - 1 && cum[k] < d) k++;
        const seg = (d - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1);
        const a = path[k - 1], b = path[k];
        place({ x: a.x + (b.x - a.x) * seg, y: a.y + (b.y - a.y) * seg });
        miaInner.style.setProperty('--flip', b.x < a.x ? '-1' : '1');
        if (t < 1) requestAnimationFrame(tick);
        else {
          miaInner.classList.remove('walking');
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  async function go(i: number) {
    if (busy) return;
    const s = st[i];
    if (!isOpen(s.w)) {
      stationEls[i].classList.remove('shake');
      void stationEls[i].offsetWidth;
      stationEls[i].classList.add('shake');
      speak('common.locked');
      return;
    }
    busy = true;
    if (i !== cur) {
      const a = idx[cur], b = idx[i];
      const path = a < b ? pts.slice(a, b + 1) : pts.slice(b, a + 1).reverse();
      await walkAlong(path);
      cur = i;
      mutate((p) => void (p.mapAt = s.w.id));
    }
    if (dead) return;
    miaInner.classList.add('hop');
    await new Promise((r) => setTimeout(r, 350));
    busy = false;
    modules[s.w.id].enter();
  }

  return { el, dispose: () => void (dead = true) };
}
