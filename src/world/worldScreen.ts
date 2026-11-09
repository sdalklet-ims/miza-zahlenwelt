/**
 * Der Welt-Bildschirm (3D, three.js): feste Spielschleife (60 Hz), Kollisionen und Interaktionen in der Fläche (x/y in Pixeln),
 * dargestellt als 3D-Welt mit Verfolgerkamera. Joystick, Pfote, Verstecken, Entdecker-Sterne, Münzen, Gadgets, Dialoge.
 */
import * as THREE from 'three';
import { h, clamp, pick } from '../core/dom';
import { worlds, textOf } from '../core/texts';
import { getProgress, mutate } from '../core/progress';
import { equippedFor, hasGadget, addCoins } from '../core/rewards';
import { show } from '../core/router';
import { createControls } from '../input/controls';
import { speak } from '../audio/speak';
import { award } from '../ui/results';
import { openShop } from '../ui/shop';
import { getScale, layers, W as VW } from '../ui/stage';
import { stationStarters, type Npc, type Offer } from '../stations';
import { buildWorld, PROC_KINDS, type Bush, type Critter, type Interact } from './world';
import { WW, WH, S, heightAt, zoneIndex, riverOf } from './terrain';
import { createStage3D } from '../world3d/scene';
import { buildDecor, windUniform } from '../world3d/decor';
import { Particles } from '../world3d/fx';
import * as M from '../world3d/models';
import '../styles/world.css';
import '../styles/wald.css';

export interface EnterOpts { spawnWorld?: string }

const R = 13; // Mias Kollisionsradius (an den Füßen)
const DT = 1 / 60;
const RUN = 235;
const GLITTER = ['#ff8fab', '#ffd166', '#8fd3ff', '#c3a6ff', '#9ae6a0'];
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

function fogTexture() {
  return M.canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 6, 64, 64, 62);
    g.addColorStop(0, 'rgba(245,249,253,.95)'); g.addColorStop(0.55, 'rgba(236,243,250,.7)'); g.addColorStop(1, 'rgba(236,243,250,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

export async function enterWorld(opts: EnterOpts = {}) {
  const first = worlds[0].id;

  /* ── Zustand ── */
  let frozenByDialog = false;
  let dead = false;
  let bubble: HTMLElement | null = null;
  let hidden: Bush | null = null;
  let tap: { x: number; y: number } | null = null;
  let shakeFog = 0;

  const model = buildWorld({
    onNpc: (npc, wid) => openDialog(npc, wid),
    onGate: () => { speak('common.gate.soon'); shakeFog = 1; },
    onBush: (b) => toggleHide(b),
    onSquirrel: (c) => pet(c),
  });
  // Wasser (mit Lücke an der Brücke)
  worlds.forEach((_, i) => {
    const rv = riverOf(i);
    if (!rv) return;
    model.rects.push({ x: rv.x0, y: 0, w: rv.x1 - rv.x0, h: rv.by - 56 }, { x: rv.x0, y: rv.by + 56, w: rv.x1 - rv.x0, h: WH - rv.by - 56 });
  });

  const saved = getProgress().pos;
  const spawnZone = opts.spawnWorld ? worlds.findIndex((w) => w.id === opts.spawnWorld) : -1;
  const spawn = opts.spawnWorld && !(saved && zoneIndex(saved.x) === spawnZone) ? model.spawns[opts.spawnWorld] : saved ?? model.spawns[first];
  const st = { x: spawn.x, y: spawn.y, vx: 0, vy: 0, t: 0, phase: 0, yaw: 0 };
  let dustT = 0;

  /* ── Oberfläche ── */
  const cv = h('canvas', { class: 'world-canvas' });
  const labels = h('div', { class: 'labels' });
  const radar = h('div', { class: 'radar' }, h('i', {}), h('b', {}));
  const controls = createControls(() => act());
  const banner = h('div', { class: 'zone-banner' });
  const el = h('div', { class: 'worldscreen' }, cv, labels, radar, banner, controls.el);
  const pixelRatio = () => clamp(getScale() * (window.devicePixelRatio || 1), 1, 2);
  const stage = createStage3D(cv, pixelRatio());
  const fit = () => stage.setPixelRatio(pixelRatio());
  window.addEventListener('resize', fit);

  /* ── 3D-Inhalte ── */
  const scene = stage.scene;
  scene.add(buildDecor(model));
  const fx = new Particles();
  scene.add(fx.points);

  const miaRig = M.createMia(equippedFor('mia'));
  scene.add(miaRig.root);
  // Silhouette: Mia bleibt auch hinter Bäumen und Häusern sichtbar (zeichnet nur dort, wo etwas davor ist)
  const silhouette = new THREE.MeshBasicMaterial({ color: '#ffb84d', transparent: true, opacity: 0.5, depthFunc: THREE.GreaterDepth, depthWrite: false });
  const bodyMeshes: THREE.Mesh[] = [];
  miaRig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) bodyMeshes.push(o as THREE.Mesh); });
  for (const m of bodyMeshes) { const sm = new THREE.Mesh(m.geometry, silhouette); sm.renderOrder = 20; m.add(sm); }

  interface NpcView { ent: (typeof model.npcs)[number]; root: THREE.Object3D; rig?: M.NpcRig; label: HTMLElement; mark: HTMLElement; top: number }
  const npcViews: NpcView[] = [];
  const eulerAcc = equippedFor('eule');
  for (const e of model.npcs) {
    let root: THREE.Object3D, rig: M.NpcRig | undefined, top = 3.4;
    if (e.kind === 'chest') { root = M.createChest(); top = 1.9; }
    else if (e.kind === 'board') { root = M.createBoard(); top = 2.6; }
    else if (e.kind === 'shroom') { root = M.createShroomRing(); top = 1.8; }
    else { rig = M.createNpc(e.kind, e.id === 'eule' ? eulerAcc : []); root = rig.root; top = e.kind === 'owl' ? 3.3 : e.kind === 'fox' ? 2.7 : e.kind === 'hare' ? 3.0 : 2.1; }
    root.position.set(e.x * S, heightAt(e.x, e.y), e.y * S);
    scene.add(root);
    if (e.kind === 'fox') {
      const stall = M.createStall();
      stall.position.set(e.x * S, heightAt(e.x, e.y + 40), (e.y + 40) * S);
      stall.scale.setScalar(1.25);
      scene.add(stall);
    }
    const label = h('div', { class: 'npc3-name' }, e.name);
    const mark = h('div', { class: 'npc3-mark' }, e.kind === 'chest' ? '⭐' : PROC_KINDS.includes(e.kind) ? '🎮' : e.kind === 'fox' ? '🛒' : '💬');
    labels.append(label, mark);
    npcViews.push({ ent: e, root, rig, label, mark, top });
  }

  const critters = model.critters.map((c) => {
    const sq = M.createSquirrel();
    sq.root.scale.setScalar(1.3);
    scene.add(sq.root);
    return { c, sq, yaw: 0 };
  });

  const bushViews = model.bushes.map((b) => {
    const v = M.createBush();
    v.root.scale.setScalar(1.15);
    v.root.position.set(b.x * S, heightAt(b.x, b.y) - 0.05, b.y * S);
    v.root.rotation.y = (b.x * 0.37) % 6.28;
    scene.add(v.root);
    return { b, ...v };
  });

  const starViews = model.stars.map((s) => {
    const m = M.createStar();
    m.position.set(s.x * S, heightAt(s.x, s.y) + 1.1, s.y * S);
    m.visible = !s.got;
    scene.add(m);
    return { s, m };
  });
  const coinViews = model.coins.map((c) => {
    const m = M.createCoin();
    m.position.set(c.x * S, heightAt(c.x, c.y) + 0.7, c.y * S);
    m.visible = !c.got;
    scene.add(m);
    return { c, m };
  });
  for (const g of model.gates) {
    const s = M.createGateSign();
    s.position.set(g.x * S, heightAt(g.x, g.y), g.y * S);
    s.rotation.y = 0.25;
    scene.add(s);
  }
  const fogTex = fogTexture();
  const fogSprites = model.fogs.map((f) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.95 }));
    const sc = 7.5 * f.s;
    sp.scale.set(sc, sc * 0.8, 1);
    sp.position.set(f.x * S, 2.4 + (f.ph % 1) * 1.2, f.y * S);
    scene.add(sp);
    return { f, sp, sc };
  });
  const flies = model.butterflies.map((b) => {
    const v = M.createButterfly(b.col);
    scene.add(v.root);
    return { b, v };
  });

  /* ── Gebietsname ── */
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
  const frozen = () => frozenByDialog || layers.overlay.childElementCount > 0;

  function act() {
    if (dead || frozen()) return;
    if (hidden) return toggleHide(hidden);
    near?.run();
  }

  function toggleHide(b: Bush) {
    if (hidden === b) {
      b.occupied = false;
      hidden = null;
      st.y = b.y + 38;
      return;
    }
    hidden = b;
    b.occupied = true;
    st.x = b.x; st.y = b.y + 2; st.vx = st.vy = 0; tap = null;
    speak(pick(['wald.hide.1', 'wald.hide.2', 'wald.hide.3']));
  }

  function heart(x: number, y: number, z: number) {
    const p = stage.project(new THREE.Vector3(x, y, z));
    const e = h('div', { class: 'heart-pop', style: { left: p.x + (Math.random() - 0.5) * 50 + 'px', top: p.y + 'px' } }, '❤️');
    el.append(e);
    setTimeout(() => e.remove(), 1300);
  }

  function pet(c: Critter) {
    for (let i = 0; i < 6; i++) setTimeout(() => heart(c.x * S, heightAt(c.x, c.y) + 1.3, c.y * S), i * 90);
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
    const labelsTxt: Record<string, string> = {
      video: '▶ Erklärvideo', discover: '🔍 Ausprobieren', check: '⭐ Mini-Check',
      punkte: '🎯 Punkte zählen', steine: '🪨 Steine-Meister', kaertchen: '🃏 Kärtchen-Duell',
      memory: '🃏 Memory spielen', pilze: '🍄 Pilze pflücken', shop: '🛒 Zum Laden',
    };
    const starKey: Record<string, string> = { check: `${worldId}.check`, punkte: `${worldId}.punkte`, steine: `${worldId}.steine`, kaertchen: `${worldId}.kaertchen`, memory: `${worldId}.memory`, pilze: `${worldId}.pilze` };
    const btns = npc.offers.map((o) => {
      const s = starKey[o] ? getProgress().stars[starKey[o]] ?? 0 : null;
      return h('button', { class: 'btn ' + (o === 'video' || o === 'shop' ? 'sun' : o === 'check' ? 'coral' : ''), onclick: () => { savePos(); closeDialog(); if (o === 'shop') openShop(); else start?.(o as Offer, npc, () => void enterWorld()); } },
        labelsTxt[o] ?? o, s != null && h('small', { class: 'btn-stars' }, '★'.repeat(s) + '☆'.repeat(3 - s)));
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
    const g = stage.pickGround(e.clientX, e.clientY);
    if (!g) return;
    tap = { x: clamp(g.x, 30, WW - 30), y: clamp(g.y, 50, WH - 24) };
    const r = layers.stage.getBoundingClientRect(), sc = getScale();
    const rip = h('div', { class: 'tap-ripple', style: { left: (e.clientX - r.left) / sc + 'px', top: (e.clientY - r.top) / sc + 'px' } });
    el.append(rip);
    setTimeout(() => rip.remove(), 700);
  });

  /* ── Update (fester Zeitschritt, Logik in Pixeln wie bisher) ── */
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

    if (hidden) {
      if (Math.hypot(ix, iy) > 0.3) toggleHide(hidden);
      else ix = iy = 0;
    }
    if (!hidden) {
      const sp = hasGadget('turbo') ? RUN * 1.35 : RUN;
      const len = Math.hypot(ix, iy) || 1, mag = Math.min(1, Math.hypot(ix, iy));
      const tvx = (ix / len) * sp * mag, tvy = (iy / len) * sp * mag;
      const a = 1 - Math.exp(-(mag > 0 ? 11 : 15) * DT); // sanftes Beschleunigen und Abbremsen
      st.vx += (tvx - st.vx) * a;
      st.vy += (tvy - st.vy) * a;
      st.x += st.vx * DT;
      st.y += st.vy * DT;
      collide();
      const spd = Math.hypot(st.vx, st.vy);
      st.phase += spd * DT * 0.062;
      const gy = heightAt(st.x, st.y);
      if (hasGadget('glitzer') && spd > 60 && Math.random() < 0.6) fx.add(st.x * S + (Math.random() - 0.5) * 0.5, gy + 0.3 + Math.random() * 1.0, st.y * S + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6, 0.9, 0.22, GLITTER[Math.floor(Math.random() * 5)], -0.4);
      dustT -= DT;
      if (spd > 120 && dustT <= 0) {
        dustT = 0.09;
        fx.add(st.x * S - (st.vx / spd) * 0.3, gy + 0.08, st.y * S - (st.vy / spd) * 0.3, (Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4, 0.55, 0.3, '#e2cda0');
      }
      if (spd > 12) st.yaw += angDiff(st.yaw, Math.atan2(st.vx, st.vy)) * Math.min(1, 13 * DT);
    }

    const z = zoneIndex(st.x);
    if (z !== lastZone) { lastZone = z; showZone(z); }

    // Tiere
    for (const cr of model.critters) {
      const d = Math.hypot(cr.x - st.x, cr.y - st.y);
      const scare = 80;
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
    }

    // Entdecker-Sterne
    for (const sv of starViews) {
      const s = sv.s;
      if (s.got || Math.hypot(s.x - st.x, s.y - st.y) > 52) continue;
      s.got = true;
      sv.m.visible = false;
      mutate((p) => void (p.discovered[s.id] = true));
      for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28; fx.add(s.x * S, heightAt(s.x, s.y) + 1.1, s.y * S, Math.cos(a) * 2.6, 1 + Math.random() * 2, Math.sin(a) * 2.6, 0.9, 0.3, '#ffd54a', -3); }
      speak('wald.star.found');
      award(`wald.entdecker.${s.id}`, 1);
    }

    // Münzen (mit Magnet fliegen sie zu Mia)
    const mag = hasGadget('magnet');
    for (const cw of coinViews) {
      const co = cw.c;
      if (co.got) continue;
      const d = Math.hypot(co.x - st.x, co.y - st.y);
      if (mag && d < 170 && d > 20) { co.x += ((st.x - co.x) / d) * 260 * DT; co.y += ((st.y - co.y) / d) * 260 * DT; }
      if (d < 30) {
        co.got = true;
        cw.m.visible = false;
        mutate((p) => void (p.coinsGot[co.id] = true));
        addCoins(1);
        for (let i = 0; i < 10; i++) fx.add(co.x * S, heightAt(co.x, co.y) + 0.8, co.y * S, (Math.random() - 0.5) * 2.2, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2.2, 0.6, 0.22, '#ffd54a', -4);
      }
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
        if (hidden && !i.id.startsWith('bush.')) continue;
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

  /* ── Darstellung ── */
  const v3 = new THREE.Vector3();
  function render(timeSec: number) {
    const t = st.t;
    windUniform.value = timeSec;
    const gy = heightAt(st.x, st.y);
    const spd = Math.hypot(st.vx, st.vy);
    miaRig.root.visible = !hidden;
    miaRig.root.position.set(st.x * S, gy, st.y * S);
    miaRig.root.rotation.y = st.yaw;
    miaRig.animate(t, st.phase, Math.min(1, spd / RUN));

    stage.follow(st.x, st.y, st.vx, st.vy, DT);
    stage.streamChunks(st.x, st.y, 2);
    stage.tick(timeSec);

    for (const nv of npcViews) {
      nv.rig?.update(timeSec);
      const d = Math.hypot(nv.ent.x - st.x, nv.ent.y - st.y);
      if (nv.rig && d < 420) {
        const want = Math.atan2(st.x - nv.ent.x, st.y - nv.ent.y);
        nv.root.rotation.y += angDiff(nv.root.rotation.y, want) * 0.06;
      } else if (nv.rig) nv.root.rotation.y += angDiff(nv.root.rotation.y, 0) * 0.03;
      v3.set(nv.ent.x * S, heightAt(nv.ent.x, nv.ent.y) + nv.top, nv.ent.y * S);
      const p = stage.project(v3);
      const vis = !p.behind && p.x > -60 && p.x < VW + 60 && p.y > -40;
      nv.mark.style.display = vis && d < 900 ? '' : 'none';
      nv.label.style.display = vis && d < 280 ? '' : 'none';
      nv.mark.style.transform = `translate(${p.x}px, ${p.y - 6 + Math.sin(timeSec * 3 + nv.ent.x) * 5}px) translate(-50%, -100%)`;
      nv.label.style.transform = `translate(${p.x}px, ${p.y + 6}px) translate(-50%, 0)`;
    }

    for (const c of critters) {
      const cr = c.c, moving = Math.hypot(cr.vx, cr.vy) > 8;
      c.sq.root.position.set(cr.x * S, heightAt(cr.x, cr.y), cr.y * S);
      if (moving) c.yaw += angDiff(c.yaw, Math.atan2(cr.vx, cr.vy)) * 0.2;
      c.sq.root.rotation.y = c.yaw;
      c.sq.update(timeSec, moving);
    }
    for (const bv of bushViews) {
      bv.eyes.visible = bv.b.occupied;
      bv.root.rotation.z = bv.b.occupied ? Math.sin(timeSec * 30) * 0.02 * Math.max(0, 1 - ((timeSec * 1.5) % 2)) : 0;
    }
    for (const sv of starViews) if (sv.m.visible) { sv.m.rotation.y = timeSec * 1.8; sv.m.position.y = heightAt(sv.s.x, sv.s.y) + 1.2 + Math.sin(timeSec * 2.6 + sv.s.x) * 0.18; }
    for (const cw of coinViews) if (cw.m.visible) {
      cw.m.rotation.z = timeSec * 2.6 + cw.c.x;
      cw.m.position.set(cw.c.x * S, heightAt(cw.c.x, cw.c.y) + 0.75 + Math.sin(timeSec * 3 + cw.c.y) * 0.1, cw.c.y * S);
    }
    for (const f of flies) {
      const b = f.b, bx = b.x + Math.sin(timeSec * 0.6 + b.ph) * 70, by = b.y + Math.cos(timeSec * 0.8 + b.ph) * 36;
      f.v.root.position.set(bx * S, heightAt(bx, by) + 1.2 + Math.sin(timeSec * 2 + b.ph) * 0.2, by * S);
      f.v.root.rotation.y = timeSec * 0.6 + b.ph;
      const fl = Math.sin(timeSec * 16 + b.ph) * 0.9;
      f.v.wings[0].rotation.z = fl; f.v.wings[1].rotation.z = -fl;
    }
    for (const fs of fogSprites) {
      const sh = shakeFog * Math.sin(timeSec * 40) * 0.2;
      fs.sp.position.x = fs.f.x * S + Math.sin(timeSec * 0.5 + fs.f.ph) * 0.5 + sh;
    }
    fx.update(DT);

    // Sternen-Fernglas: Pfeil zum nächsten versteckten Stern
    let showRadar = false;
    if (hasGadget('fernglas')) {
      let best: { x: number; y: number } | null = null, bd = 1e9;
      for (const s of model.stars) { if (s.got) continue; const d = Math.hypot(s.x - st.x, s.y - st.y); if (d < bd) { bd = d; best = s; } }
      if (best && bd > 160) {
        v3.set(best.x * S, heightAt(best.x, best.y) + 1.2, best.y * S);
        const p = stage.project(v3);
        const cx = VW / 2, cy = 410, a = Math.atan2(p.y - cy, p.x - cx) + (p.behind ? Math.PI : 0);
        const inside = !p.behind && p.x > 60 && p.x < VW - 60 && p.y > 110 && p.y < 720;
        const ax = inside ? p.x : clamp(cx + Math.cos(a) * 520, 70, VW - 70), ay = inside ? p.y - 60 : clamp(cy + Math.sin(a) * 330, 120, 700);
        radar.style.transform = `translate(${ax}px, ${ay}px)`;
        (radar.firstChild as HTMLElement).style.transform = `rotate(${inside ? 90 : a * 57.3}deg)`;
        (radar.lastChild as HTMLElement).textContent = `⭐ ${Math.round(bd / 50)} m`;
        showRadar = true;
      }
    }
    radar.style.display = showRadar ? 'flex' : 'none';

    stage.renderer.render(scene, stage.camera);
  }

  /* ── Schleife ── */
  let acc = 0, last = performance.now(), raf = 0;
  const t0 = last;
  const frame = (now: number) => {
    if (dead) return;
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) { update(); acc -= DT; }
    render((now - t0) / 1000);
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
      stage.dispose();
    },
  };
  stage.follow(st.x, st.y, 0, 0, DT, true);
  stage.streamChunks(st.x, st.y, 30); // die nächsten Kacheln sofort, der Rest läuft nach
  if (import.meta.env.DEV) (window as unknown as { __mia: unknown }).__mia = st;
  show(screen, { back: null });
  if (opts.spawnWorld && model.spawns[opts.spawnWorld] === spawn) speak(`${opts.spawnWorld}.arrive`);
  raf = requestAnimationFrame(frame);
}
