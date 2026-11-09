/**
 * Der Welt-Bildschirm: Canvas-Renderer, fester Zeitschritt (60 Hz), weiche Kamera, Kollisionen,
 * Tiefensortierung, Interaktionen (Pfote), Verstecken/Schleichen, Entdecker-Sterne, Dialoge.
 */
import { h, clamp, pick } from '../core/dom';
import { worlds, textOf } from '../core/texts';
import { getProgress, mutate } from '../core/progress';
import { equippedFor } from '../core/rewards';
import { show } from '../core/router';
import { createControls } from '../input/controls';
import { speak } from '../audio/speak';
import { award } from '../ui/results';
import { getScale, layers, W as VW, H as VH } from '../ui/stage';
import { stationStarters, type Npc, type Offer } from '../stations';
import { spritesReady, fogCloud } from './sprites';
import { drawMia, type Dir } from './miaSprite';
import { buildWorld, mia as miaPos, type Bush, type Critter, type Drawable, type Interact, type WorldModel } from './world';
import { getChunk, CHUNK, WW, WH, ZW, riverOf, zoneIndex } from './terrain';
import '../styles/world.css';
import '../styles/wald.css';

export interface EnterOpts { spawnWorld?: string }

const R = 13; // Mias Kollisionsradius (an den Füßen)
const DT = 1 / 60;
const RUN = 235, SNEAK = 105;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: 'heart' | 'spark' | 'ring'; col?: string }

let vignette: HTMLCanvasElement | null = null;
function getVignette() {
  if (vignette) return vignette;
  vignette = document.createElement('canvas');
  vignette.width = VW; vignette.height = VH;
  const g = vignette.getContext('2d')!;
  const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VW * 0.65);
  gr.addColorStop(0, 'rgba(255,214,140,0)');
  gr.addColorStop(1, 'rgba(60,70,30,.32)');
  g.fillStyle = gr;
  g.fillRect(0, 0, VW, VH);
  return vignette;
}

export async function enterWorld(opts: EnterOpts = {}) {
  await spritesReady;
  const first = worlds[0].id;

  /* ── Zustand ── */
  let frozenByDialog = false;
  let dead = false;
  let bubble: HTMLElement | null = null;
  let hidden: Bush | null = null;
  let tap: { x: number; y: number } | null = null;
  const parts: Particle[] = [];

  // Hooks werden unten gefüllt, brauchen aber Zustand → Funktionen sind hoisted
  const model: WorldModel = await buildWorld({
    onNpc: (npc, wid) => openDialog(npc, wid),
    onGate: () => { speak('common.gate.soon'); shakeFog = 1; },
    onBush: (b) => toggleHide(b),
    onSquirrel: (c) => pet(c),
  });
  let shakeFog = 0;

  // Wasser (mit Lücke an der Brücke)
  worlds.forEach((_, i) => {
    const rv = riverOf(i);
    if (!rv) return;
    model.rects.push({ x: rv.x0, y: 0, w: rv.x1 - rv.x0, h: rv.by - 56 }, { x: rv.x0, y: rv.by + 56, w: rv.x1 - rv.x0, h: WH - rv.by - 56 });
  });

  const saved = getProgress().pos;
  const spawnZone = opts.spawnWorld ? worlds.findIndex((w) => w.id === opts.spawnWorld) : -1;
  // Schnellreise in dieselbe Zone: dort weitermachen, wo Mia stand; sonst an den Zonen-Startpunkt
  const spawn = opts.spawnWorld && !(saved && zoneIndex(saved.x) === spawnZone) ? model.spawns[opts.spawnWorld] : saved ?? model.spawns[first];
  const st = { x: spawn.x, y: spawn.y, vx: 0, vy: 0, dir: 'down' as Dir, t: 0 };
  const cam = { x: clamp(st.x - VW / 2, 0, WW - VW), y: clamp(st.y - VH / 2, 0, WH - VH) };
  miaPos.x = st.x; miaPos.y = st.y;

  /* ── Aufbau der Oberfläche ── */
  const cv = h('canvas', { class: 'world-canvas' });
  const ctx = cv.getContext('2d')!;
  let k = 1;
  const fit = () => {
    k = clamp(getScale() * (window.devicePixelRatio || 1), 1, 2);
    cv.width = Math.round(VW * k);
    cv.height = Math.round(VH * k);
  };
  fit();
  window.addEventListener('resize', fit);

  const controls = createControls(() => act());
  const banner = h('div', { class: 'zone-banner' });
  const el = h('div', { class: 'worldscreen' }, cv, banner, controls.el);

  let lastZone = -1;
  function showZone(i: number) {
    const w = worlds[i];
    banner.replaceChildren(h('b', {}, w.meta.icon + ' ' + w.meta.title), h('small', {}, w.meta.topic));
    banner.classList.remove('on');
    void banner.offsetWidth;
    banner.classList.add('on');
    mutate((p) => void (p.mapAt = w.id));
  }

  /* ── Interaktionen ── */
  let near: Interact | null = null;
  const pos = (i: Interact) => i.follow ?? i;

  function act() {
    if (dead || frozen()) return;
    if (hidden) return toggleHide(hidden);
    near?.run();
  }

  function frozen() {
    return frozenByDialog || layers.overlay.childElementCount > 0;
  }

  function toggleHide(b: Bush) {
    if (hidden === b) {
      b.occupied = false;
      hidden = null;
      st.y = b.y + 34;
      return;
    }
    hidden = b;
    b.occupied = true;
    st.x = b.x; st.y = b.y + 2; st.vx = st.vy = 0; tap = null;
    speak(pick(['wald.hide.1', 'wald.hide.2', 'wald.hide.3']));
  }

  function pet(c: Critter) {
    for (let i = 0; i < 6; i++) parts.push({ x: c.x + (Math.random() - 0.5) * 30, y: c.y - 40, vx: (Math.random() - 0.5) * 40, vy: -50 - Math.random() * 30, life: 1.2, max: 1.2, kind: 'heart' });
    c.fleeing = false; c.wait = 3;
    const id = 'wald.squirrel';
    if (!getProgress().discovered[id]) {
      mutate((p) => void (p.discovered[id] = true));
      speak('wald.squirrel.pet');
      award('wald.entdecker.squirrel', 1);
    } else speak('wald.squirrel.again');
  }

  function openDialog(npc: Npc, worldId: string) {
    closeDialog();
    frozenByDialog = true;
    const start = stationStarters[worldId];
    const labels: Record<string, string> = {
      video: '▶ Erklärvideo', discover: '🔍 Ausprobieren', check: '⭐ Mini-Check',
      punkte: '🎯 Punkte zählen', steine: '🪨 Steine-Meister', kaertchen: '🃏 Kärtchen-Duell',
    };
    const starKey: Record<string, string> = { check: `${worldId}.check`, punkte: `${worldId}.punkte`, steine: `${worldId}.steine`, kaertchen: `${worldId}.kaertchen` };
    const btns = npc.offers.map((o) => {
      const s = starKey[o] ? getProgress().stars[starKey[o]] ?? 0 : null;
      return h('button', { class: 'btn ' + (o === 'video' ? 'sun' : o === 'check' ? 'coral' : ''), onclick: () => { savePos(); closeDialog(); start?.(o as Offer, npc, () => void enterWorld()); } },
        labels[o] ?? o, s != null && h('small', { class: 'btn-stars' }, '★'.repeat(s) + '☆'.repeat(3 - s)));
    });
    bubble = h('div', { class: 'bubble world-bubble' },
      h('div', { class: 'bubble-name' }, npc.name),
      h('p', {}, textOf(npc.hello)),
      h('div', { class: 'bubble-btns' }, ...btns, h('button', { class: 'btn ghost', onclick: closeDialog }, 'Tschüss')));
    el.append(bubble);
    speak(npc.hello);
  }
  function closeDialog() {
    bubble?.remove();
    bubble = null;
    frozenByDialog = false;
  }

  // Tippen auf die Welt = dorthin laufen
  cv.addEventListener('pointerdown', (e) => {
    if (dead || frozen() || !getProgress().settings.tapWalk || hidden) return;
    const r = layers.stage.getBoundingClientRect();
    const sc = getScale();
    tap = { x: cam.x + (e.clientX - r.left) / sc, y: cam.y + (e.clientY - r.top) / sc };
    parts.push({ x: tap.x, y: tap.y, vx: 0, vy: 0, life: 0.6, max: 0.6, kind: 'ring' });
  });

  /* ── Update (fester Zeitschritt) ── */
  let saveT = 0;
  let stall = { x: st.x, y: st.y, t: 0 };
  const dist = (a: { x: number; y: number }) => Math.hypot(a.x - st.x, a.y - st.y);

  function update() {
    st.t += DT;
    const isFrozen = frozen();
    let { x: ix, y: iy } = isFrozen ? { x: 0, y: 0 } : controls.vec();
    const stick = ix !== 0 || iy !== 0;
    if (stick) tap = null;
    if (!stick && tap && !isFrozen) {
      const dx = tap.x - st.x, dy = tap.y - st.y, d = Math.hypot(dx, dy);
      if (d < 10) tap = null;
      else { ix = dx / d; iy = dy / d; }
      stall.t += DT;
      if (stall.t > 0.5) {
        if (Math.hypot(st.x - stall.x, st.y - stall.y) < 8) tap = null;
        stall = { x: st.x, y: st.y, t: 0 };
      }
    }

    const sneaking = controls.sneaking();
    if (hidden) {
      if (Math.hypot(ix, iy) > 0.3) toggleHide(hidden);
      else { ix = iy = 0; }
    }
    if (!hidden) {
      const sp = sneaking ? SNEAK : RUN;
      const mag = Math.min(1, Math.hypot(ix, iy));
      const tvx = (ix / (Math.hypot(ix, iy) || 1)) * sp * mag, tvy = (iy / (Math.hypot(ix, iy) || 1)) * sp * mag;
      const a = 1 - Math.exp(-(mag > 0 ? 11 : 15) * DT); // sanftes Beschleunigen und Abbremsen
      st.vx += (tvx - st.vx) * a;
      st.vy += (tvy - st.vy) * a;
      st.x += st.vx * DT;
      st.y += st.vy * DT;
      collide();
      if (Math.hypot(st.vx, st.vy) > 12) st.dir = Math.abs(st.vx) > Math.abs(st.vy) ? (st.vx < 0 ? 'left' : 'right') : st.vy < 0 ? 'up' : 'down';
    }
    miaPos.x = st.x; miaPos.y = st.y;

    // Kamera (weich nachgezogen, leicht vorausschauend)
    const tx = clamp(st.x + st.vx * 0.3 - VW / 2, 0, WW - VW), ty = clamp(st.y + st.vy * 0.3 - VH / 2, 0, WH - VH);
    const c = 1 - Math.exp(-5 * DT);
    cam.x += (tx - cam.x) * c;
    cam.y += (ty - cam.y) * c;

    // Zone
    const z = zoneIndex(st.x);
    if (z !== lastZone) { lastZone = z; showZone(z); }

    // Tiere
    for (const cr of model.critters) {
      const d = Math.hypot(cr.x - st.x, cr.y - st.y);
      const scare = sneaking ? 75 : 185;
      if (d < scare && !hidden) {
        const ang = Math.atan2(cr.y - st.y, cr.x - st.x);
        cr.vx = Math.cos(ang) * 190; cr.vy = Math.sin(ang) * 190; cr.fleeing = true; cr.wait = 1;
      } else if (cr.fleeing && cr.wait <= 0) { cr.fleeing = false; cr.vx = cr.vy = 0; }
      if (!cr.fleeing) {
        cr.wait -= DT;
        if (cr.wait <= 0) {
          if (Math.hypot(cr.vx, cr.vy) > 1 || Math.random() < 0.4) { cr.vx = cr.vy = 0; cr.wait = 1 + Math.random() * 3; }
          else {
            cr.tx = cr.hx + (Math.random() - 0.5) * 320; cr.ty = cr.hy + (Math.random() - 0.5) * 200;
            const a = Math.atan2(cr.ty - cr.y, cr.tx - cr.x);
            cr.vx = Math.cos(a) * 55; cr.vy = Math.sin(a) * 55; cr.wait = Math.hypot(cr.tx - cr.x, cr.ty - cr.y) / 55;
          }
        }
      } else cr.wait -= DT;
      cr.x = clamp(cr.x + cr.vx * DT, 40, WW - 40); cr.y = clamp(cr.y + cr.vy * DT, 60, WH - 40);
      if (Math.abs(cr.vx) > 5) cr.face = cr.vx < 0 ? -1 : 1;
    }

    // Entdecker-Sterne einsammeln
    for (const s of model.stars) {
      if (s.got || Math.hypot(s.x - st.x, s.y - st.y) > 48) continue;
      s.got = true;
      mutate((p) => void (p.discovered[s.id] = true));
      for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; parts.push({ x: s.x, y: s.y - 34, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.8, max: 0.8, kind: 'spark', col: '#ffd54a' }); }
      speak('wald.star.found');
      award(`wald.entdecker.${s.id}`, 1);
    }

    // Partikel
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= DT; p.x += p.vx * DT; p.y += p.vy * DT;
      if (p.life <= 0) parts.splice(i, 1);
    }
    if (shakeFog > 0) shakeFog = Math.max(0, shakeFog - DT);

    // Aktionsknopf: nächstes Ziel in Reichweite
    near = null;
    if (!isFrozen) {
      let best = 1e9;
      for (const i of model.interacts) {
        const p = pos(i);
        const d = dist(p);
        if (d > i.r) continue;
        if (hidden && i.id.indexOf('bush.') !== 0) continue;
        if (d / i.r < best) { best = d / i.r; near = i; }
      }
    }
    if (hidden) controls.setAction('Rauskommen', '🐾');
    else if (near) {
      const n: Interact = near;
      controls.setAction(n.id.startsWith('bush.') ? 'Verstecken' : n.label, n.icon);
    } else controls.setAction(null);

    saveT += DT;
    if (saveT > 4) { saveT = 0; savePos(); }
  }

  function collide() {
    for (let it = 0; it < 2; it++) {
      for (const s of model.solids) {
        const m = s.r + R;
        if (Math.abs(s.x - st.x) > m || Math.abs(s.y - st.y) > m) continue;
        const dx = st.x - s.x, dy = st.y - s.y, d = Math.hypot(dx, dy);
        if (d < m) {
          const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : 1;
          st.x = s.x + nx * m; st.y = s.y + ny * m;
        }
      }
      for (const r of model.rects) {
        if (st.x < r.x - R || st.x > r.x + r.w + R || st.y < r.y - R || st.y > r.y + r.h + R) continue;
        const cx = clamp(st.x, r.x, r.x + r.w), cy = clamp(st.y, r.y, r.y + r.h);
        const dx = st.x - cx, dy = st.y - cy, d = Math.hypot(dx, dy);
        if (d < R && d > 0.001) { st.x = cx + (dx / d) * R; st.y = cy + (dy / d) * R; }
        else if (d <= 0.001) {
          const l = st.x - r.x, rr = r.x + r.w - st.x, t = st.y - r.y, b = r.y + r.h - st.y, mn = Math.min(l, rr, t, b);
          if (mn === l) st.x = r.x - R; else if (mn === rr) st.x = r.x + r.w + R; else if (mn === t) st.y = r.y - R; else st.y = r.y + r.h + R;
        }
      }
    }
    st.x = clamp(st.x, 30, WW - 30);
    st.y = clamp(st.y, 50, WH - 24);
  }

  function savePos() {
    mutate((p) => void (p.pos = { x: Math.round(st.x), y: Math.round(st.y) }));
  }

  /* ── Zeichnen ── */
  const miaDrawable: Drawable = {
    get x() { return st.x; }, get y() { return st.y; }, ext: 90,
    draw: (c, sx, sy, t) => {
      if (hidden) return;
      drawMia(c, sx, sy, { dir: st.dir, t, moving: Math.hypot(st.vx, st.vy) > 12, sneak: controls.sneaking(), acc: equippedFor('mia') });
    },
  } as Drawable;

  function render() {
    const c = ctx;
    c.setTransform(k, 0, 0, k, 0, 0);
    const cx = Math.round(cam.x * k) / k, cy = Math.round(cam.y * k) / k;
    const t = st.t;

    // Boden
    const c0 = Math.floor(cx / CHUNK), c1 = Math.floor((cx + VW) / CHUNK), r0 = Math.floor(cy / CHUNK), r1 = Math.floor((cy + VH) / CHUNK);
    for (let gy = r0; gy <= r1; gy++) for (let gx = c0; gx <= c1; gx++) c.drawImage(getChunk(gx, gy), gx * CHUNK - cx, gy * CHUNK - cy);

    // Dinge (Tiefensortierung nach Fußposition)
    const vis: Drawable[] = [miaDrawable];
    for (const d of model.drawables) {
      if (d.x < cx - d.ext || d.x > cx + VW + d.ext || d.y < cy - 60 || d.y > cy + VH + d.ext) continue;
      vis.push(d);
    }
    vis.sort((a, b) => a.y - b.y);
    c.textAlign = 'left';
    for (const d of vis) { c.save(); d.draw(c, d.x - cx, d.y - cy, t); c.restore(); }

    // Schmetterlinge und Partikel
    for (const b of model.butterflies) {
      const bx = b.x + Math.sin(t * 0.6 + b.ph) * 70 - cx, by = b.y + Math.cos(t * 0.8 + b.ph) * 36 - cy - 30;
      if (bx < -20 || bx > VW + 20 || by < -20 || by > VH + 20) continue;
      const fl = Math.abs(Math.sin(t * 12 + b.ph));
      c.fillStyle = b.col;
      c.beginPath(); c.ellipse(bx - 4 * fl, by, 5 * fl + 1, 6, 0, 0, 7); c.ellipse(bx + 4 * fl, by, 5 * fl + 1, 6, 0, 0, 7); c.fill();
    }
    for (const p of parts) {
      const a = p.life / p.max, sx = p.x - cx, sy = p.y - cy;
      c.globalAlpha = a;
      if (p.kind === 'heart') { c.font = '24px system-ui'; c.fillText('❤️', sx - 12, sy); }
      else if (p.kind === 'spark') { c.fillStyle = p.col ?? '#fff'; c.beginPath(); c.arc(sx, sy, 5 * a + 1, 0, 7); c.fill(); }
      else { c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.ellipse(sx, sy, 30 * (1 - a) + 6, 15 * (1 - a) + 3, 0, 0, 7); c.stroke(); }
      c.globalAlpha = 1;
    }

    // Nebel an den Toren
    for (const f of model.fogs) {
      if (f.x < cx - 200 || f.x > cx + VW + 200 || f.y < cy - 200 || f.y > cy + VH + 200) continue;
      const w = 260 * f.s, hh = 190 * f.s, sh = shakeFog * Math.sin(t * 40) * 6;
      c.globalAlpha = 0.96;
      c.drawImage(fogCloud, f.x - cx - w / 2 + Math.sin(t * 0.5 + f.ph) * 18 + sh, f.y - cy - hh / 2, w, hh);
      c.globalAlpha = 1;
    }

    // Stimmung: warme Tönung + Vignette
    c.fillStyle = 'rgba(255,205,120,.06)';
    c.fillRect(0, 0, VW, VH);
    c.drawImage(getVignette(), 0, 0);
  }

  /* ── Schleife ── */
  let acc = 0, last = performance.now(), raf = 0;
  const frame = (now: number) => {
    if (dead) return;
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) { update(); acc -= DT; }
    render();
    raf = requestAnimationFrame(frame);
  };

  const screen = {
    el,
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      controls.dispose();
      savePos();
    },
  };
  if (import.meta.env.DEV) (window as unknown as { __mia: unknown }).__mia = st;
  show(screen, { back: null });
  if (opts.spawnWorld && model.spawns[opts.spawnWorld] === spawn) speak(`${opts.spawnWorld}.arrive`);
  raf = requestAnimationFrame(frame);
  void ZW;
}
