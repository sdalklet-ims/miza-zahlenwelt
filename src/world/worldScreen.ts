/**
 * Der Welt-Bildschirm (3D, three.js): feste Spielschleife (60 Hz), Kollisionen und Interaktionen in der Fläche (x/y in Pixeln),
 * dargestellt als 3D-Welt mit Verfolgerkamera. Joystick, Pfote, Verstecken, Entdecker-Sterne, Münzen, Gadgets, Dialoge.
 */
import * as THREE from 'three';
import { h, clamp, pick } from '../core/dom';
import { worlds, textOf } from '../core/texts';
import { getProgress, mutate } from '../core/progress';
import { equippedFor } from '../core/rewards';
import { build as buildPart, isBuilt } from '../core/house';
import { onProgress } from '../core/progress';
import { show } from '../core/router';
import { createControls } from '../input/controls';
import { speak } from '../audio/speak';
import { hungerBlocked, hungerLevel, hungerSpeed, mealStock, meals } from '../core/hunger';
import { openBackpack } from '../ui/backpack';
import { tickWeather, weather, forceRain } from '../core/weather';
import { award } from '../ui/results';
import { openHouseUi, setBuilder, setHomeNav } from '../ui/houseUi';
import { openSupermarket } from '../ui/supermarket';
import { openPetUi } from '../ui/petUi';
import { pets as getPets, mood as petMood } from '../core/pet';
import { sfx, setStation, currentStation } from '../audio/music';
import { openRadio } from '../ui/radio';
import { openModal } from '../ui/modal';
import { createHouse3D } from '../world3d/house';
import { getScale, layers, W as VW, H as VH } from '../ui/stage';
import { stationStarters, type Npc, type Offer } from '../stations';
import { buildWorld, PROC_KINDS, type Bush, type Critter, type Interact } from './world';
import { WW, WH, S, heightAt, zoneIndex, riverOf } from './terrain';
import { createStage3D } from '../world3d/scene';
import { buildDecor, windUniform } from '../world3d/decor';
import { Particles } from '../world3d/fx';
import * as M from '../world3d/models';
import { createMiaSprite, svgFigure, SPR_Y, type Billboard } from '../world3d/sprites';
import type { Facing as Dir } from '../world3d/miaAnim';
import { npcSvg, squirrelSvg, petSvg, type PetKind } from '../ui/art';
import { mouseSvg } from '../ui/artWiese';
import { chickSvg } from '../ui/artFluss';
import { createCarShop, createChargeStation, createVehicle, rideKindOf, type ChargeStation3D, type Vehicle3D } from '../world3d/vehicles';
import { batteryEmpty, chargeAll, chargeOf, currentRide, drainBattery, needsCharge, ownsElectric, rideSpeed, saveCharge } from '../core/vehicles';
import { openCarShop } from '../ui/carshop';
import { openBadgeBook } from '../ui/badges';
import { examPassed, gameBadges, missingBadges, allBadges } from '../core/badges';
import { examScreen } from '../stations/exam';
import '../styles/world.css';
import '../styles/wald.css';

export interface EnterOpts { spawnWorld?: string }

const R = 13; // Mias Kollisionsradius (an den Füßen)
const DT = 1 / 60;
const IN_X = 285, IN_Y = 135; // Innenraum des Hauses (Pixel, halbe Breite/Tiefe)
const RUN = 235;
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
    onGate: () => { speak('tor.closed'); shakeFog = 1; },
    onBush: (b) => toggleHide(b),
    onSquirrel: (c) => pet(c),
    onPlot: () => { speak('wald.haus.plot'); openHouseUi({ mode: 'plan' }); },
    onCharge: (s) => startCharge(s),
  });
  // Wasser (mit Lücke an der Brücke)
  worlds.forEach((_, i) => {
    const rv = riverOf(i);
    if (!rv) return;
    model.rects.push({ x: rv.x0, y: 0, w: rv.x1 - rv.x0, h: rv.by - 56 }, { x: rv.x0, y: rv.by + 56, w: rv.x1 - rv.x0, h: WH - rv.by - 56 });
  });

  const saved = getProgress().posV === 3 ? getProgress().pos : undefined;
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
  const rainTint = h('div', { class: 'rain-tint' });
  const rainCv = h('canvas', { class: 'rain-cv', width: VW, height: VH });
  const sizeRain = () => { rainCv.width = VW; rainCv.height = VH; };
  window.addEventListener('stage-resize', sizeRain);
  const el = h('div', { class: 'worldscreen' }, cv, rainTint, rainCv, labels, radar, banner, controls.el);
  const pixelRatio = () => clamp(getScale() * (window.devicePixelRatio || 1), 1, 2);
  const stage = createStage3D(cv, pixelRatio());
  const fit = () => stage.setPixelRatio(pixelRatio());
  window.addEventListener('resize', fit);

  /* ── 3D-Inhalte ── */
  const scene = stage.scene;
  scene.add(buildDecor(model));
  const fx = new Particles();
  scene.add(fx.points);

  /* ── Mias Haus ── */
  const plot = model.plot;
  const house = createHouse3D();
  let dyn = { rects: [] as { x: number; y: number; w: number; h: number }[], solids: [] as { x: number; y: number; r: number }[], petRects: [] as { x: number; y: number; w: number; h: number }[] };
  if (plot) {
    house.group.position.set(plot.x * S, heightAt(plot.x, plot.y), plot.y * S);
    scene.add(house.group);
  }
  const plotMarker = M.createPlotMarker();
  if (plot) { plotMarker.position.set(plot.x * S, heightAt(plot.x, plot.y), plot.y * S); scene.add(plotMarker); }
  const plotName = h('div', { class: 'npc3-name' }, 'Mias Bauplatz');
  const plotMark = h('div', { class: 'npc3-mark' }, '🏠');
  labels.append(plotName, plotMark);
  let houseInside = false;
  function syncHouse(animate: boolean) {
    if (!plot) return;
    plotMarker.visible = !isBuilt('fundament');
    const hs = getProgress().house;
    house.sync(hs.built, { roof: hs.roof, wall: hs.wall }, animate);
    dyn = house.collisions(hs.built, plot.x, plot.y);
    if (hs.built.radio && !model.interacts.some((i) => i.id === 'radio')) model.interacts.push({ id: 'radio', x: plot.x - 125, y: plot.y - 120, r: 150, label: 'Radio', icon: '📻', run: () => openRadio() });
    if (hs.built.bett && !model.interacts.some((i) => i.id === 'bed')) model.interacts.push({ id: 'bed', x: plot.x - 200, y: plot.y + 60, r: 110, label: 'Schlafen', icon: '😴', run: () => startSleep() });
  }
  syncHouse(false);
  house.onLand = (_id, p) => {
    sfx.build();
    for (let i = 0; i < 16; i++) fx.add(p.x + (Math.random() - 0.5) * 2.5, p.y - 0.3, p.z + (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, 0.6 + Math.random(), (Math.random() - 0.5) * 1.5, 0.8, 0.5, '#e2cda0');
  };
  /* ── Haustier ── */
  const PET_H: Record<string, number> = { meerschwein: 0.85, kaninchen: 1.45, hamster: 0.8, wellensittich: 1.2 };
  const trail: { x: number; y: number }[] = [];
  let lastTrail = { x: 0, y: 0 };
  interface PetView { x: number; y: number; vx: number; vy: number; wait: number; kind: string; fig: Billboard | null; mark: HTMLElement; ia: Interact | null; warnAt: number }
  const petViews: PetView[] = [];
  let petSync = false;
  async function ensurePet() {
    if (!plot || petSync) return;
    petSync = true;
    const list = getPets();
    while (petViews.length > list.length) {
      const v = petViews.pop()!;
      if (v.fig) scene.remove(v.fig.group);
      v.mark.remove();
      if (v.ia) model.interacts.splice(model.interacts.indexOf(v.ia), 1);
    }
    for (let i = 0; i < list.length; i++) {
      let v = petViews[i];
      if (!v) {
        const mark = h('div', { class: 'pet-mark' }, '🍽️');
        labels.append(mark);
        v = { x: plot.x - 60 + i * 40, y: plot.y + 20 + (i % 2) * 20, vx: 0, vy: 0, wait: 1, kind: '', fig: null, mark, ia: null, warnAt: 0 };
        petViews[i] = v;
      }
      if (v.kind !== list[i].kind) {
        v.kind = list[i].kind;
        if (v.fig) scene.remove(v.fig.group);
        v.fig = await svgFigure(petSvg(v.kind as PetKind), PET_H[v.kind] ?? 1);
        scene.add(v.fig.group);
      }
      if (!v.ia) {
        const idx = i;
        v.ia = { id: 'pet' + i, x: 0, y: 0, r: 110, label: 'Füttern', icon: '🥕', follow: v, run: () => openPetUi(idx) };
        model.interacts.push(v.ia);
      }
    }
    petSync = false;
  }
  const offHouse = onProgress(() => { syncHouse(true); void ensurePet(); miaSpr.setAccessories(equippedFor('mia')); });
  void ensurePet();

  /* ── Schlafen ── */
  const night = h('div', { class: 'night' },
    ...Array.from({ length: 40 }, (_, i) => h('i', { class: 'nstar', style: { left: (i * 97) % 100 + '%', top: (i * 53) % 70 + '%', animationDelay: -(i % 7) * 0.4 + 's' } })),
    h('div', { class: 'night-text' }, '😴 Mia schläft …'),
    h('button', { class: 'btn sun night-btn', onclick: () => wakeUp() }, '☀️ Aufwachen'));
  let stationBefore = 'wald';
  function startSleep() {
    if (!plot || sleeping || hidden) return;
    sleeping = true;
    st.x = plot.x - 200; st.y = plot.y + 60; st.vx = st.vy = 0; tap = null;
    stationBefore = currentStation();
    setStation('nacht', false);
    el.append(night);
    requestAnimationFrame(() => night.classList.add('on'));
    speak('wald.haus.sleep');
  }
  function wakeUp() {
    if (!sleeping) return;
    night.classList.remove('on');
    setTimeout(() => night.remove(), 900);
    sleeping = false;
    st.y = (plot?.y ?? st.y) + 150; st.x = (plot?.x ?? st.x) - 100;
    setStation(stationBefore, false);
    speak('wald.haus.wake');
  }

  function confetti() {
    for (let i = 0; i < 40; i++) {
      const c = h('div', { class: 'confetti', style: { left: Math.random() * 1150 + 'px', animationDelay: Math.random() * 1.2 + 's' } }, ['🎉', '🎊', '⭐', '🌸', '🎈'][i % 5]);
      el.append(c);
      setTimeout(() => c.remove(), 4800);
    }
  }
  function milestone(stage: number) {
    const info = [null, ['🏗️', 'Der Rohbau steht!', 'wald.haus.roh'], ['🏡', 'Mias Haus ist bewohnbar!', 'wald.haus.done'], ['🏆', 'Alles gebaut!', 'wald.haus.master']][stage] as [string, string, string];
    if (stage >= 2) confetti();
    award('wald.haus', stage);
    const close = openModal({ title: info[1], content: h('div', { class: 'milestone' }, h('div', { class: 'big' }, info[0]), h('p', {}, textOf(info[2])), h('button', { class: 'btn', onclick: () => close() }, 'Weiter bauen!')) });
    speak(info[2]);
  }
  /** Wegweiser zum Haus und Schnellreise dorthin */
  setHomeNav(plot ? {
    dist: () => Math.hypot(st.x - plot.x, st.y - plot.y),
    go: () => {
      const f = h('div', { class: 'flash' });
      el.append(f);
      setTimeout(() => {
        st.x = plot.x; st.y = plot.y + 340; st.vx = st.vy = 0; tap = null;
        stage.follow(st.x, st.y, 0, 0, DT, true);
        speak('wald.haus.plot');
      }, 350);
      setTimeout(() => f.remove(), 900);
    },
  } : null);
  /** Teil aufbauen – nur, wenn Mia beim Bauplatz ist */
  setBuilder((id) => {
    if (!plot || Math.hypot(st.x - plot.x, st.y - plot.y) > 700) return void speak('wald.haus.far');
    const stage = buildPart(id);
    if (stage) setTimeout(() => milestone(stage), 1500);
    else speak('wald.haus.built');
  });

  // Figuren sind Comic-Sprites (2,5D): Mia wird jedes Bild neu gezeichnet, die Tiere sind Zeichnungen
  const miaSpr = createMiaSprite(equippedFor('mia'));
  scene.add(miaSpr.group);
  // Regenschirm (nur sichtbar, wenn aufgespannt)
  const umbrella = new THREE.Group();
  {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 12), M.toon({ color: '#e0525a' }));
    cone.position.y = 2.55;
    const stripe = new THREE.Mesh(new THREE.ConeGeometry(0.96, 0.5, 12, 1, true, 0, 1.05), M.toon({ color: '#fff3d6' }));
    stripe.position.y = 2.55;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), M.toon({ color: '#7a4d26' }));
    stick.position.y = 1.95;
    umbrella.add(cone, stripe, stick);
    umbrella.visible = false;
    scene.add(umbrella);
  }
  const rainCtx = rainCv.getContext('2d')!;
  const drops = Array.from({ length: 260 }, () => ({ x: Math.random() * 1500, y: Math.random() * 900, v: 700 + Math.random() * 500, l: 14 + Math.random() * 16 }));
  let umbT = 0;
  let charging: { x: number; y: number } | null = null, chargeSound = 0, lastBat = 100;
  const chargeBar = h('div', { class: 'charge-bar off' }, h('span', {}, '🔋 Akku lädt …'), h('div', { class: 'cb-track' }, h('i', {})));
  el.append(chargeBar);
  let hungerTick = 3, lastHunger = hungerLevel(), lastSpd = 0, hungerSaid = 0;
  const miaMark = h('div', { class: 'pet-mark mia-mark' }, '🍽️');
  labels.append(miaMark);
  let vehicle: Vehicle3D | null = null, vehKind = '', vehYaw = 0, lastRiding = false, pedal = 0, steerNow = 0, leanNow = 0;
  const stationViews: { s: { x: number; y: number }; v: ChargeStation3D }[] = model.stations.map((s) => {
    const v = createChargeStation();
    v.group.position.set(s.x * S, heightAt(s.x, s.y), s.y * S);
    scene.add(v.group);
    return { s, v };
  });
  let miaDir: Dir = 'down';
  let lastRT = 0;

  interface NpcView { ent: (typeof model.npcs)[number]; root: THREE.Object3D; fig?: Billboard; label: HTMLElement; mark: HTMLElement; top: number }
  const npcViews: NpcView[] = [];
  let shopTick: ((t: number) => void) | null = null;
  const eulerAcc = equippedFor('eule');
  const FIG_H: Record<string, number> = { owl: 2.5, hedgehog: 1.3, badger: 1.7, hare: 2.1, fox: 2.0, bee: 2.0, snail: 1.4, butterfly: 2.1, grasshopper: 2.0, beaver: 2.0, frog: 1.5, duck: 1.8, otter: 2.0 };
  for (const e of model.npcs) {
    let root: THREE.Object3D, fig: Billboard | undefined, top = 3.4;
    if (e.kind === 'chest') { root = M.createChest(); top = 1.9; }
    else if (e.kind === 'pond') { root = M.createPond(); top = 2.4; }
    else if (e.kind === 'shroom') { root = M.createShroomRing(); top = 1.8; }
    else {
      const fh = FIG_H[e.kind] ?? 1.8;
      fig = await svgFigure(npcSvg(e.kind, e.id === 'eule' || e.id.startsWith('tor.') ? eulerAcc : []), fh);
      root = fig.group;
      top = fh + 0.15;
    }
    root.position.set(e.x * S, heightAt(e.x, e.y), e.y * S);
    scene.add(root);
    if (e.kind === 'raccoon') {
      const shop = createCarShop();
      shop.position.set(e.x * S, heightAt(e.x, e.y - 230), (e.y - 230) * S);
      scene.add(shop);
      shopTick = shop.userData.tick as (t: number) => void;
    }
    if (e.kind === 'fox') {
      const market = M.createSupermarket();
      market.position.set(e.x * S, heightAt(e.x, e.y - 230), (e.y - 230) * S);
      scene.add(market);
    }
    const label = h('div', { class: 'npc3-name' }, e.name);
    const mark = h('div', { class: 'npc3-mark' }, e.kind === 'chest' ? '⭐' : PROC_KINDS.includes(e.kind) ? '🎮' : e.kind === 'fox' ? '🛒' : e.kind === 'raccoon' ? '🚗' : e.id.startsWith('tor.') ? '📝' : '💬');
    labels.append(label, mark);
    npcViews.push({ ent: e, root, fig, label, mark, top });
  }

  const critters: { c: (typeof model.critters)[number]; fig: Billboard }[] = [];
  for (const c of model.critters) {
    const fig = await svgFigure(c.kind === 'mouse' ? mouseSvg() : c.kind === 'chick' ? chickSvg() : squirrelSvg(), c.kind === 'squirrel' ? 1.0 : 0.8);
    scene.add(fig.group);
    critters.push({ c, fig });
  }

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
    return { f, sp, sc, born: -1 };
  });
  const dissolving = fogSprites.filter((x) => x.f.dissolve);
  if (dissolving.length) {
    const zi = dissolving[0].f.dissolve!;
    mutate((p) => void (p.seen['gateopen.' + zi] = true));
    speak('exam.open');
  }
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
  let sleeping = false;
  const frozen = () => frozenByDialog || sleeping || !!charging || layers.overlay.childElementCount > 0;

  function startCharge(s: { x: number; y: number }) {
    if (dead || charging) return;
    if (!ownsElectric()) { speak('car.charge.none'); return; }
    if (!needsCharge()) { speak('car.charge.full'); return; }
    charging = s;
    chargeSound = 0;
    st.vx = st.vy = 0;
    tap = null;
    chargeBar.classList.remove('off');
    speak('car.charge.start');
  }

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
    const wid = worlds[zoneIndex(c.x)].id;
    const kind = c.kind === 'squirrel' ? 'squirrel' : 'critter';
    const id = `${wid}.${kind}`;
    if (!getProgress().discovered[id]) {
      mutate((p) => void (p.discovered[id] = true));
      speak(`${wid}.${kind}.pet`);
      award(`${wid}.entdecker.${kind}`, 1);
    } else speak(`${wid}.${kind}.again`);
  }

  /** Eule Olga am Nebeltor: Abzeichen prüfen, Mathearbeit starten */
  function openGateDialog(npc: Npc, worldId: string) {
    closeDialog();
    frozenByDialog = true;
    const idx = worlds.findIndex((w) => w.id === worldId);
    const next = worlds[idx + 1];
    const nextOpen = !!next && next.meta.status === 'open' && !!stationStarters[next.id];
    const done = examPassed(worldId);
    const miss = missingBadges(worldId);
    const id = done ? (nextOpen ? 'tor.hello.passed' : 'tor.hello.last') : allBadges(worldId) ? 'tor.hello.ready' : 'tor.hello.missing';
    const params = { n: miss.length === 1 ? 'ein Abzeichen' : `${miss.length} Abzeichen`, names: miss.map((b) => b.name).join(', ') };
    const btns: HTMLElement[] = [];
    if (!done && allBadges(worldId)) btns.push(h('button', { class: 'btn sun', onclick: () => { if (hungerBlocked('pruefung')) { closeDialog(); speak('mia.hunger.nogame'); openBackpack(); return; } savePos(); closeDialog(); show(examScreen(worldId, () => void enterWorld()), { back: () => void enterWorld() }); } }, '📝 Mathearbeit starten'));
    btns.push(h('button', { class: 'btn', onclick: () => { closeDialog(); openBadgeBook(worldId); } }, '📖 Abzeichenbuch', !done && !allBadges(worldId) ? h('small', { class: 'btn-stars' }, `${gameBadges(worldId).length - miss.length}/${gameBadges(worldId).length}`) : null));
    bubble = h('div', { class: 'bubble world-bubble' },
      h('div', { class: 'bubble-name' }, npc.name),
      h('p', {}, textOf(id, params)),
      h('div', { class: 'bubble-btns' }, ...btns, h('button', { class: 'btn ghost', onclick: closeDialog }, 'Tschüss')));
    el.append(bubble);
    speak(id, params);
  }

  function openDialog(npc: Npc, worldId: string) {
    if (npc.id.startsWith('tor.')) return openGateDialog(npc, worldId);
    closeDialog();
    frozenByDialog = true;
    const start = stationStarters[worldId];
    const labelsTxt: Record<string, string> = {
      video: '▶ Erklärvideo', discover: '🔍 Ausprobieren', check: '⭐ Mini-Check',
      mal: '🪵 Baumstamm-Mal', teilen: '🦆 Fische teilen', reihe: '🐸 Seerosen-Reihen', malpaare: '🦦 Mal-Paare',
      plus: '🍯 Honig-Plus', minus: '🐌 Minus-Wanderung', partner: '🦋 Schmetterlings-Paare', strahl: '🦗 Zahlenstrahl-Hüpfer',
      punkte: '🎯 Punkte zählen', steine: '🪨 Steine-Meister', kaertchen: '🃏 Kärtchen-Duell',
      angeln: '🎣 Zahlen-Angeln', pilze: '🍄 Pilze pflücken', shop: '🛒 Zum Laden', autos: '🚗 Zum Autohaus',
    };
    const starKey: Record<string, string> = { check: `${worldId}.check`, punkte: `${worldId}.punkte`, steine: `${worldId}.steine`, kaertchen: `${worldId}.kaertchen`, angeln: `${worldId}.angeln`, pilze: `${worldId}.pilze`, plus: `${worldId}.plus`, minus: `${worldId}.minus`, partner: `${worldId}.partner`, strahl: `${worldId}.strahl`, mal: `${worldId}.mal`, teilen: `${worldId}.teilen`, reihe: `${worldId}.reihe`, malpaare: `${worldId}.paare` };
    const btns = npc.offers.map((o) => {
      const s = starKey[o] ? getProgress().stars[starKey[o]] ?? 0 : null;
      return h('button', { class: 'btn ' + (o === 'video' || o === 'shop' || o === 'autos' ? 'sun' : o === 'check' ? 'coral' : ''), onclick: () => { if (hungerBlocked(o)) { closeDialog(); speak('mia.hunger.nogame'); openBackpack(); return; } savePos(); closeDialog(); if (o === 'shop') openSupermarket(); else if (o === 'autos') openCarShop(); else start?.(o as Offer, npc, () => void enterWorld()); } },
        (labelsTxt[o] ?? o) + (hungerBlocked(o) ? ' 🍽️' : ''), s != null && h('small', { class: 'btn-stars' }, '★'.repeat(s) + '☆'.repeat(3 - s)));
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
    {
      const ev = tickWeather(DT, (houseInside && isBuilt('dach')) || !!currentRide()?.canopy || equippedFor('mia').includes('mia-regencape'));
      if (ev === 'start') speak('weather.rain');
      else if (ev === 'wet') speak('weather.wet');
      else if (ev === 'stop') speak('weather.dry');
    }
    hungerTick -= DT;
    if (hungerTick <= 0) {
      hungerTick = 2;
      const lv = hungerLevel();
      const hasFood = meals.some((m) => mealStock(m.id) > 0);
      if (lv !== lastHunger) {
        if (lv === 'rumble') speak('mia.hunger.rumble');
        else if (lv === 'hungry') speak(hasFood ? 'mia.hunger.hungry' : 'mia.hunger.nofood');
        else if (lv === 'weak') speak('mia.hunger.weak');
        else if (lv === 'empty') speak('mia.hunger.empty');
        if (lv === 'hungry' || lv === 'weak' || lv === 'empty') hungerSaid = st.t;
        lastHunger = lv;
      } else if ((lv === 'hungry' || lv === 'weak' || lv === 'empty') && st.t - hungerSaid > 70 && !frozen()) {
        speak(hasFood ? 'mia.hunger.again' : 'mia.hunger.nofood'); // erinnert sich alle ~70 s
        hungerSaid = st.t;
      }
    }
    if (charging) {
      chargeAll(DT, 100 / 5.5);
      chargeSound -= DT;
      if (chargeSound <= 0) { chargeSound = 0.35; sfx.zap(); }
      if (Math.random() < 0.5) fx.add(charging.x * S + (Math.random() - 0.5) * 0.8, 2.2 + Math.random() * 0.6, charging.y * S + 0.3, (Math.random() - 0.5) * 0.8, 0.6, 0.2, 0.7, 0.22, Math.random() < 0.5 ? '#fff6a0' : '#7dff9a');
      const v = currentRide();
      const lvl = v && v.range ? chargeOf(v.id) : 100;
      (chargeBar.querySelector('i') as HTMLElement).style.width = lvl + '%';
      if (!needsCharge()) { chargeAll(10, 100); charging = null; chargeBar.classList.add('off'); saveCharge(); sfx.star(); speak('car.charge.done'); lastBat = 100; }
    }
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
      const riding = !!currentRide() && !houseInside;
      const sp = RUN * (1 - 0.22 * weather.wet) * hungerSpeed() * (riding ? rideSpeed() : 1);
      const len = Math.hypot(ix, iy) || 1, mag = Math.min(1, Math.hypot(ix, iy));
      const tvx = (ix / len) * sp * mag, tvy = (iy / len) * sp * mag;
      const a = 1 - Math.exp(-(mag > 0 ? (riding ? 5 : 11) : riding ? 3.2 : 15) * DT); // sanftes Beschleunigen; Fahrzeuge rollen aus
      st.vx += (tvx - st.vx) * a;
      st.vy += (tvy - st.vy) * a;
      const steps = Math.max(1, Math.ceil((Math.hypot(st.vx, st.vy) * DT) / 7)); // bei Tempo in Teilschritten, damit nichts durchrutscht
      for (let k = 0; k < steps; k++) { st.x += (st.vx * DT) / steps; st.y += (st.vy * DT) / steps; collide(); }
      if (Math.hypot(st.x - lastTrail.x, st.y - lastTrail.y) > 12) { trail.push({ x: st.x, y: st.y }); lastTrail = { x: st.x, y: st.y }; if (trail.length > 60) trail.shift(); }
      const spd = Math.hypot(st.vx, st.vy);
      if (riding && currentRide()?.range) {
        const lv = drainBattery(DT, Math.min(1, spd / (RUN * Math.max(1, rideSpeed()))));
        if (lastBat > 25 && lv <= 25 && lv > 0.5) speak('car.battery.low');
        if (lastBat > 0.5 && lv <= 0.5) speak('car.battery.empty');
        lastBat = lv;
      }
      st.phase += spd * DT * 0.062;
      const gy = heightAt(st.x, st.y);
      dustT -= DT;
      if (riding && spd > 60 && vehicle && Math.random() < (vehicle.electric ? 0.3 : 0.5)) {
        const ex = vehicle.exhaust, ca = Math.cos(vehYaw), sa = Math.sin(vehYaw);
        const px = st.x * S + (ex.x * ca - ex.z * sa) * 0.8, pz = st.y * S - (ex.x * sa + ex.z * ca) * 0.8;
        if (vehicle.electric && !batteryEmpty()) fx.add(px, gy + ex.y, pz, (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6, 0.45, 0.16, Math.random() < 0.5 ? '#7dffcf' : '#fff6a0'); // Funken statt Abgase
        else fx.add(px, gy + 0.2, pz, (Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4, 0.5, 0.26, '#d8d4cc');
      }
      if (spd > 120 && dustT <= 0) {
        dustT = riding ? 0.04 : 0.09;
        fx.add(st.x * S - (st.vx / spd) * 0.3, gy + 0.08, st.y * S - (st.vy / spd) * 0.3, (Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4, 0.55, 0.3, '#e2cda0');
      }
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

    // Haustiere: laufen im Haus (oder im Garten, solange es keinen Boden gibt) umher
    const plist = getPets();
    petViews.forEach((pt, pi) => {
      if (!pt.fig || !plot) return;
      const px0 = pt.x, py0 = pt.y;
      if (plist[pi]?.follow) {
        // folgt Mias Spur (so läuft es durch Türen statt durch Wände), jedes Tier etwas weiter hinten
        const tg = trail.length > 7 + pi * 5 ? trail[trail.length - 7 - pi * 5] : { x: st.x - 40 - pi * 25, y: st.y + 20 };
        const dx = tg.x - pt.x, dy = tg.y - pt.y, dd = Math.hypot(dx, dy), dm = Math.hypot(st.x - pt.x, st.y - pt.y);
        if (dm > 800) { pt.x = tg.x; pt.y = tg.y; pt.vx = pt.vy = 0; }
        else if (dd > 12 && dm > 75 + pi * 25) { const sp = Math.min(300, 60 + dd * 3); pt.vx = (dx / dd) * sp; pt.vy = (dy / dd) * sp; }
        else pt.vx = pt.vy = 0;
        pt.x += pt.vx * DT; pt.y += pt.vy * DT;
      } else {
        const indoor = isBuilt('boden') && isBuilt('waende');
        const r = indoor ? { x0: plot.x - 250, x1: plot.x + 250, y0: plot.y - 50, y1: plot.y + 85 } : { x0: plot.x - 230, x1: plot.x + 230, y0: plot.y + 190, y1: plot.y + 300 };
        if (pt.x < r.x0 - 4 || pt.x > r.x1 + 4 || pt.y < r.y0 - 4 || pt.y > r.y1 + 4) { pt.x = clamp(pt.x, r.x0, r.x1); pt.y = clamp(pt.y, r.y0, r.y1); }
        pt.wait -= DT;
        if (pt.wait <= 0) {
          if (Math.hypot(pt.vx, pt.vy) > 1 || Math.random() < 0.4) { pt.vx = pt.vy = 0; pt.wait = 1.5 + Math.random() * 3; }
          else { const a = Math.random() * 6.28; pt.vx = Math.cos(a) * 34; pt.vy = Math.sin(a) * 34; pt.wait = 0.8 + Math.random() * 1.6; }
        }
        pt.x = clamp(pt.x + pt.vx * DT, r.x0, r.x1);
        pt.y = clamp(pt.y + pt.vy * DT, r.y0, r.y1);
      }
      // Möbel sind für Haustiere fest: erst x, dann y zurücknehmen; steckt es schon drin, wird es herausgeschoben
      const inBlock = (x: number, y: number) => dyn.petRects.find((r) => x > r.x - 8 && x < r.x + r.w + 8 && y > r.y - 6 && y < r.y + r.h + 6);
      if (dyn.petRects.length && inBlock(pt.x, pt.y)) {
        if (!inBlock(pt.x, py0)) pt.y = py0;
        else if (!inBlock(px0, pt.y)) pt.x = px0;
        else if (!inBlock(px0, py0)) { pt.x = px0; pt.y = py0; }
        else { const r = inBlock(pt.x, pt.y)!; pt.y = r.y + r.h + 10; }
        pt.vx = pt.vy = 0; pt.wait = 0.3;
      }
      const pm = plist[pi];
      if (pm && petMood(pm) === 'hungry' && st.t > pt.warnAt && Math.hypot(st.x - pt.x, st.y - pt.y) < 320) {
        pt.warnAt = st.t + 300;
        speak('pet.hungry', { name: pm.name });
      }
    });

    // Entdecker-Sterne
    for (const sv of starViews) {
      const s = sv.s;
      if (s.got || Math.hypot(s.x - st.x, s.y - st.y) > 52) continue;
      s.got = true;
      sv.m.visible = false;
      mutate((p) => void (p.discovered[s.id] = true));
      for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28; fx.add(s.x * S, heightAt(s.x, s.y) + 1.1, s.y * S, Math.cos(a) * 2.6, 1 + Math.random() * 2, Math.sin(a) * 2.6, 0.9, 0.3, '#ffd54a', -3); }
      const swid = s.id.split('.')[0];
      miaSpr.celebrate();
      speak(`${swid}.star.found`);
      sfx.star();
      award(`${swid}.entdecker.${s.id}`, 1);
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
      for (const s of dyn.solids) {
        const m = s.r + R;
        const dx = st.x - s.x, dy = st.y - s.y, d = Math.hypot(dx, dy);
        if (d < m && d > 0.001) { st.x = s.x + (dx / d) * m; st.y = s.y + (dy / d) * m; }
      }
      for (const r of [...model.rects, ...dyn.rects, ...dyn.petRects]) {
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
    mutate((p) => { p.pos = { x: Math.round(st.x), y: Math.round(st.y) }; p.posV = 3; });
  }

  /* ── Darstellung ── */
  const houseRoofCovers = () => isBuilt('dach') && !houseInside;
  const v3 = new THREE.Vector3();
  function render(timeSec: number) {
    const t = st.t;
    windUniform.value = timeSec;
    const gy = heightAt(st.x, st.y);
    const spd = Math.hypot(st.vx, st.vy);
    // Blickrichtung: schräg zählt nach der horizontalen Komponente
    if (spd > 12) miaDir = Math.abs(st.vx) > 0.3 * spd ? (st.vx < 0 ? 'left' : 'right') : st.vy < 0 ? 'up' : 'down';
    const rdt = Math.min(0.1, Math.max(0, timeSec - lastRT));
    lastRT = timeSec;
    miaSpr.setHidden(!!hidden);
    const wantRide = !houseInside && !hidden && !sleeping ? currentRide() : null;
    if ((wantRide?.id ?? '') !== vehKind) {
      if (vehicle) scene.remove(vehicle.group);
      vehicle = null;
      vehKind = wantRide?.id ?? '';
      if (wantRide) { vehicle = createVehicle(wantRide.id); scene.add(vehicle.group); if (!lastRiding) (wantRide.range ? sfx.whirr : sfx.pop)(); }
    }
    lastRiding = !!vehicle;
    let seatLift = 0;
    let rideStyle: 'bike' | 'scooter' | 'car' | undefined, wind = 0;
    if (vehicle) {
      let dA = 0;
      if (spd > 25) { const target = Math.atan2(st.vy, st.vx); dA = target - vehYaw; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); vehYaw += dA * 0.14; }
      steerNow += (Math.max(-0.5, Math.min(0.5, dA * 1.6)) - steerNow) * 0.2; // Vorderräder schlagen ein
      leanNow += (Math.max(-0.22, Math.min(0.22, dA * (spd / 400))) - leanNow) * 0.15; // Neigung in Kurven
      const accel = Math.max(-0.08, Math.min(0.08, (spd - lastSpd) * -0.004));
      lastSpd = spd;
      vehicle.group.position.set(st.x * S, gy + Math.abs(Math.sin(timeSec * 22)) * 0.012 * Math.min(1, spd / 200), st.y * S);
      vehicle.group.rotation.y = -vehYaw;
      vehicle.group.rotation.x = leanNow;
      vehicle.group.rotation.z = accel + Math.sin(timeSec * 26) * 0.006 * Math.min(1, spd / 300); // Nicken beim Beschleunigen, feines Rütteln
      vehicle.update((spd / 60) * S, timeSec, steerNow);
      seatLift = vehicle.seat;
      rideStyle = rideKindOf(vehKind);
      wind = Math.min(1, spd / (RUN * 2.2));
      pedal += (spd / 60) * 0.1;
    }
    shopTick?.(timeSec);
    {
      const lvM = hungerLevel(), show = (lvM === 'hungry' || lvM === 'weak' || lvM === 'empty') && !sleeping && !hidden;
      miaMark.style.display = show ? '' : 'none';
      if (show) {
        v3.set(st.x * S, gy + seatLift + 2.4, st.y * S);
        const mp = stage.project(v3);
        miaMark.textContent = lvM === 'empty' ? '🥺🍽️' : '🍽️';
        miaMark.style.transform = `translate(${mp.x}px, ${mp.y + Math.sin(timeSec * 4) * 4}px) translate(-50%, -100%)`;
      }
    }
    miaSpr.group.position.set(st.x * S, gy + seatLift + (sleeping ? 1.0 : 0), st.y * S);
    miaSpr.update(rdt, vehicle ? Math.min(1, spd / (RUN * Math.max(1, rideSpeed()))) : Math.min(1, spd / RUN), miaDir, sleeping, rideStyle, wind);
    for (const sv of stationViews) sv.v.setCharging(charging === sv.s, timeSec, vehicle ? chargeOf(vehKind) : 100);

    // Regenschirm
    umbrella.visible = weather.umbrella && !hidden && !sleeping && !vehicle;
    if (umbrella.visible) {
      umbT += 1 / 60;
      umbrella.position.set(st.x * S, gy + Math.sin(umbT * 2) * 0.02, st.y * S + 0.05);
      umbrella.rotation.z = Math.sin(umbT * 1.5) * 0.04;
    }
    // Regen: Streifen + leichte Verdunkelung (im überdachten Haus nicht)
    {
      const covered = houseInside && isBuilt('dach');
      const lvl = covered ? 0 : weather.level;
      rainTint.style.opacity = String(lvl * 0.22);
      rainCtx.clearRect(0, 0, VW, VH);
      if (lvl > 0.03) {
        rainCtx.strokeStyle = 'rgba(200,225,255,0.65)';
        rainCtx.lineWidth = 2;
        rainCtx.beginPath();
        const n = Math.floor(drops.length * lvl);
        for (let i = 0; i < n; i++) {
          const d = drops[i];
          d.y += d.v / 60; d.x -= d.v / 60 * 0.18;
          if (d.y > VH || d.x < -20) { d.y = -30; d.x = Math.random() * (VW + 80); }
          rainCtx.moveTo(d.x, d.y); rainCtx.lineTo(d.x + d.l * 0.18, d.y - d.l);
        }
        rainCtx.stroke();
      }
      // Tropfen von der nassen Mia
      if (weather.wet > 0.3 && !weather.umbrella && Math.random() < 0.12) fx.add(st.x * S + (Math.random() - 0.5) * 0.5, gy + 1.5, st.y * S, (Math.random() - 0.5) * 0.3, -0.2, 0, 0.5, 0.15, '#8fd3ff');
    }

    stage.follow(st.x, st.y, st.vx, st.vy, DT);
    stage.streamChunks(st.x, st.y, 2);
    stage.tick(timeSec);

    for (const nv of npcViews) {
      const d = Math.hypot(nv.ent.x - st.x, nv.ent.y - st.y);
      if (nv.fig) {
        nv.fig.mesh.scale.y = SPR_Y * (1 + Math.sin(timeSec * 2.2 + nv.ent.x) * 0.018); // atmet
        if (nv.ent.kind === 'hedgehog') nv.fig.mesh.scale.x = st.x > nv.ent.x ? -1 : 1; // schaut zu Mia
        const k = nv.ent.kind, ph = timeSec + nv.ent.x * 0.01;
        const lift = k === 'bee' || k === 'butterfly' ? 0.45 + Math.sin(ph * 3) * 0.14 : k === 'grasshopper' ? Math.pow(Math.abs(Math.sin(ph * 1.1)), 10) * 0.55 : 0;
        if (lift) nv.root.position.y = heightAt(nv.ent.x, nv.ent.y) + lift;
        if (k === 'bee' || k === 'butterfly' || k === 'grasshopper' || k === 'snail') nv.fig.mesh.scale.x = st.x < nv.ent.x ? -1 : 1; // schaut zu Mia
      }
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
      c.fig.group.position.set(cr.x * S, heightAt(cr.x, cr.y) + (moving ? Math.abs(Math.sin(timeSec * 14)) * 0.14 : 0), cr.y * S);
      if (Math.abs(cr.vx) > 5) c.fig.mesh.scale.x = cr.vx < 0 ? -1 : 1;
    }
    for (const bv of bushViews) {
      bv.eyes.visible = bv.b.occupied;
      bv.root.rotation.z = bv.b.occupied ? Math.sin(timeSec * 30) * 0.02 * Math.max(0, 1 - ((timeSec * 1.5) % 2)) : 0;
    }
    for (const sv of starViews) if (sv.m.visible) { sv.m.rotation.y = timeSec * 1.8; sv.m.position.y = heightAt(sv.s.x, sv.s.y) + 1.2 + Math.sin(timeSec * 2.6 + sv.s.x) * 0.18; }
    for (const f of flies) {
      const b = f.b, bx = b.x + Math.sin(timeSec * 0.6 + b.ph) * 70, by = b.y + Math.cos(timeSec * 0.8 + b.ph) * 36;
      f.v.root.position.set(bx * S, heightAt(bx, by) + 1.2 + Math.sin(timeSec * 2 + b.ph) * 0.2, by * S);
      f.v.root.rotation.y = timeSec * 0.6 + b.ph;
      const fl = Math.sin(timeSec * 16 + b.ph) * 0.9;
      f.v.wings[0].rotation.z = fl; f.v.wings[1].rotation.z = -fl;
    }
    for (const fs of fogSprites) {
      if (fs.f.dissolve) { // Nebel hebt sich nach oben und verblasst in ca. 4 s
        if (fs.born < 0) fs.born = timeSec;
        const k = Math.min(1, (timeSec - fs.born) / 4);
        (fs.sp.material as THREE.SpriteMaterial).opacity = 0.95 * (1 - k);
        fs.sp.position.y = 2.4 + (fs.f.ph % 1) * 1.2 + k * 3;
        fs.sp.visible = k < 1;
      }
      const sh = shakeFog * Math.sin(timeSec * 40) * 0.2;
      fs.sp.position.x = fs.f.x * S + Math.sin(timeSec * 0.5 + fs.f.ph) * 0.5 + sh;
    }
    petViews.forEach((pt, pi) => {
      if (!pt.fig) return;
      const moving = Math.hypot(pt.vx, pt.vy) > 5;
      const petIn = !!plot && isBuilt('boden') && Math.abs(pt.x - plot.x) < IN_X && pt.y > plot.y - IN_Y && pt.y < plot.y + IN_Y;
      pt.fig.group.position.set(pt.x * S, heightAt(pt.x, pt.y) + (petIn ? 0.45 : 0) + (moving ? Math.abs(Math.sin(timeSec * 12 + pi)) * 0.1 : 0), pt.y * S);
      if (Math.abs(pt.vx) > 3) pt.fig.mesh.scale.x = pt.vx < 0 ? -1 : 1;
      v3.set(pt.x * S, pt.fig.group.position.y + (PET_H[pt.kind] ?? 1) + 0.3, pt.y * S);
      const pp = stage.project(v3);
      const hungry = petMood(getPets()[pi]) === 'hungry';
      pt.mark.style.display = hungry && !(petIn && houseRoofCovers()) ? '' : 'none';
      pt.mark.style.transform = `translate(${pp.x}px, ${pp.y + Math.sin(timeSec * 4) * 4}px) translate(-50%, -100%)`;
    });
    if (plot && isBuilt('radio') && currentStation() !== 'wald' && Math.random() < 0.07) {
      fx.add((plot.x - 125) * S, 3.2, (plot.y - 120) * S, (Math.random() - 0.5) * 0.5, 0.9, 0.1, 1.6, 0.35, ['#ffd54a', '#ff8fab', '#8fd3ff'][Math.floor(Math.random() * 3)]);
    }
    if (plot) {
      const inh = isBuilt('fundament') && Math.abs(st.x - plot.x) < IN_X && st.y > plot.y - IN_Y && st.y < plot.y + IN_Y && isBuilt('waende');
      if (inh !== houseInside) { houseInside = inh; house.setInside(inh); if (inh && currentRide()) speak('car.house'); }
      stage.setZoom(houseInside ? 11.5 : 15 + (vehicle ? (rideSpeed() - 1) * 1.5 : 0));
      house.update(timeSec, DT);
      const ch = house.chimney();
      if (ch && Math.random() < 0.06) fx.add(ch.x + (Math.random() - 0.5) * 0.2, ch.y, ch.z, 0.25, 0.9, 0.1, 2.6, 0.9, '#d8d8d8');
    }
    fx.update(DT);

    // Beschriftung des Bauplatzes (solange nichts gebaut ist)
    if (plot) {
      const empty = !isBuilt('fundament');
      v3.set(plot.x * S, 2.6, plot.y * S);
      const bp = stage.project(v3);
      const dd0 = Math.hypot(plot.x - st.x, plot.y - st.y);
      const on = empty && bp.x > -60 && bp.x < VW + 60 && bp.y > -40 && dd0 < 1100;
      plotMark.style.display = on ? '' : 'none';
      plotName.style.display = on && dd0 < 420 ? '' : 'none';
      plotMark.style.transform = `translate(${bp.x}px, ${bp.y - 6 + Math.sin(timeSec * 3) * 5}px) translate(-50%, -100%)`;
      plotName.style.transform = `translate(${bp.x}px, ${bp.y + 6}px) translate(-50%, 0)`;
    }

    // Pfeil zum Haus, wenn es nicht im Bild ist
    let showRadar = false;
    if (plot) {
      const dd = Math.hypot(plot.x - st.x, plot.y - st.y);
      v3.set(plot.x * S, 2.5, plot.y * S);
      const pp = stage.project(v3);
      if (dd > 450 && (pp.x < 80 || pp.x > VW - 80 || pp.y < 110 || pp.y > VH - 100)) {
        const cx = VW / 2, cy = VH / 2, a = Math.atan2(pp.y - cy, pp.x - cx);
        radar.style.transform = `translate(${clamp(cx + Math.cos(a) * 540, 70, VW - 70)}px, ${clamp(cy + Math.sin(a) * (VH * 0.4), 120, VH - 120)}px)`;
        (radar.firstChild as HTMLElement).style.transform = `rotate(${a * 57.3}deg)`;
        (radar.lastChild as HTMLElement).textContent = `🏠 Zuhause · ${Math.round(dd / 50)} m`;
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
      window.removeEventListener('stage-resize', sizeRain);
      controls.dispose();
      savePos();
      stage.dispose();
      offHouse();
      setBuilder(null);
      setHomeNav(null);
    },
  };
  stage.follow(st.x, st.y, 0, 0, DT, true);
  stage.streamChunks(st.x, st.y, 30); // die nächsten Kacheln sofort, der Rest läuft nach
  if (import.meta.env.DEV) (window as unknown as { __mia: unknown; __w: unknown }).__mia = st;
  if (import.meta.env.DEV) (window as unknown as { __w: unknown }).__w = { weather, forceRain };
  show(screen, { back: null, framed: false });
  if (!getProgress().seen.goal) {
    mutate((p) => void (p.seen.goal = true));
    speak('wald.haus.goal');
  } else if (opts.spawnWorld && model.spawns[opts.spawnWorld] === spawn) speak(`${opts.spawnWorld}.arrive`);
  raf = requestAnimationFrame(frame);
}
