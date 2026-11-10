/**
 * Baut die Weltdaten aus den Content-JSONs: eine Zone je Welt (Reihenfolge = meta.order), durch einen Weg verbunden.
 * Gebiete mit status "locked" (oder ohne Station) bekommen ein Nebeltor. Dekoration entsteht deterministisch (fester Seed).
 * Gezeichnet wird in src/world3d (three.js); hier stehen nur Positionen, Kollisionen und Interaktionen.
 */
import { worlds, badgeCfg, type WorldContent } from '../core/texts';
import { getProgress } from '../core/progress';
import { worldUnlocked } from '../core/unlock';
import { stationStarters, type Npc } from '../stations';
import { ZW, WW, WH, PLOT, pathY, riverOf } from './terrain';

export interface Circle { x: number; y: number; r: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Interact { id: string; x: number; y: number; r: number; label: string; icon: string; run: () => void; follow?: { x: number; y: number } }
export interface Critter { kind: string; x: number; y: number; vx: number; vy: number; hx: number; hy: number; tx: number; ty: number; wait: number; face: number; fleeing: boolean }
export interface Bush { x: number; y: number; occupied: boolean }
export interface Star { id: string; x: number; y: number; got: boolean }
export interface NpcEnt { npc: Npc; id: string; kind: string; name: string; x: number; y: number; worldId: string }
export interface Decor { kind: string; x: number; y: number; s: number; rot: number }

export interface WorldModel {
  solids: Circle[]; rects: Rect[]; interacts: Interact[];
  fogs: { x: number; y: number; s: number; ph: number; dissolve?: number }[];
  gates: { x: number; y: number }[];
  critters: Critter[]; bushes: Bush[]; stars: Star[]; npcs: NpcEnt[]; decor: Decor[];
  butterflies: { x: number; y: number; ph: number; col: string }[];
  spawns: Record<string, { x: number; y: number }>;
  plot: { x: number; y: number } | null;
  /** Ladestationen für E-Roller und E-Auto */
  stations: { x: number; y: number }[];
}

export interface Hooks {
  onNpc: (npc: Npc, worldId: string) => void;
  onGate: () => void;
  onBush: (b: Bush) => void;
  onSquirrel: (c: Critter) => void;
  onPlot: () => void;
  onCharge: (s: { x: number; y: number }) => void;
}

const AREA = (ZW * WH) / (1400 * 1800); // Dichte der Dekoration wächst mit der Zonengröße

export const isOpen = (w: WorldContent) => w.meta.status === 'open' && !!stationStarters[w.id] && worldUnlocked(w.id);
export const PROC_KINDS = ['chest', 'pond', 'shroom'];

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld(hooks: Hooks): WorldModel {
  const m: WorldModel = { solids: [], rects: [], interacts: [], fogs: [], gates: [], critters: [], bushes: [], stars: [], npcs: [], decor: [], butterflies: [], spawns: {}, plot: PLOT, stations: [] };
  const keep: Circle[] = [];
  const disc = getProgress().discovered;
  const addSolid = (x: number, y: number, r: number) => m.solids.push({ x, y, r });

  /* ── Inhalte je Zone (aus world.* in den JSONs) ── */
  for (let zi = 0; zi < worlds.length; zi++) {
    const w = worlds[zi];
    const x0 = zi * ZW;
    const d = w.world;
    if (!d) continue;
    m.spawns[w.id] = { x: x0 + d.spawn.x, y: d.spawn.y };
    keep.push({ x: x0 + d.spawn.x, y: d.spawn.y, r: 140 });

    for (const n of d.npcs ?? []) {
      const nx = x0 + n.x, ny = n.y;
      keep.push({ x: nx, y: ny, r: 150 });
      const npc: Npc = { ...n, x: nx, y: ny };
      const proc = PROC_KINDS.includes(n.kind);
      m.npcs.push({ npc, id: n.id, kind: n.kind, name: n.name, x: nx, y: ny, worldId: w.id });
      addSolid(nx, ny, n.kind === 'pond' ? 100 : proc ? 28 : 20);
      if (n.kind === 'fox' || n.kind === 'raccoon') m.rects.push({ x: nx - 175, y: ny - 330, w: 350, h: 190 }); // Supermarkt bzw. Autohaus hinter dem Händler
      m.interacts.push({
        id: `npc.${n.id}`, x: nx, y: ny, r: 120,
        label: n.kind === 'chest' ? 'Öffnen' : proc ? 'Spielen' : n.kind === 'fox' ? 'Einkaufen' : n.kind === 'raccoon' ? 'Autohaus' : 'Ansprechen',
        icon: n.kind === 'chest' ? '🗝️' : proc ? '🎮' : n.kind === 'fox' ? '🛒' : n.kind === 'raccoon' ? '🚗' : '💬',
        run: () => hooks.onNpc(npc, w.id),
      });
    }

    for (const b of d.bushes ?? []) {
      const bush: Bush = { x: x0 + b.x, y: b.y, occupied: false };
      m.bushes.push(bush);
      keep.push({ x: bush.x, y: bush.y, r: 90 });
      m.interacts.push({ id: `bush.${m.bushes.length}`, x: bush.x, y: bush.y, r: 70, label: 'Verstecken', icon: '🌿', run: () => hooks.onBush(bush) });
    }

    for (const s of d.stars ?? []) {
      const star: Star = { id: `${w.id}.${s.id}`, x: x0 + s.x, y: s.y, got: !!disc[`${w.id}.${s.id}`] };
      m.stars.push(star);
      keep.push({ x: star.x, y: star.y, r: 60 });
    }

    for (const cr of d.critters ?? []) {
      const c0: Critter = { kind: cr.kind ?? 'squirrel', x: x0 + cr.x, y: cr.y, vx: 0, vy: 0, hx: x0 + cr.x, hy: cr.y, tx: x0 + cr.x, ty: cr.y, wait: Math.random() * 2, face: 1, fleeing: false };
      m.critters.push(c0);
      m.interacts.push({ id: `critter.${m.critters.length}`, x: c0.x, y: c0.y, r: 70, label: 'Streicheln', icon: cr.kind === 'mouse' ? '🐭' : cr.kind === 'chick' ? '🐥' : '🐿️', follow: c0, run: () => hooks.onSquirrel(c0) });
    }
  }

  if (PLOT) {
    keep.push({ x: PLOT.x, y: PLOT.y, r: 560 });
    m.interacts.push({ id: 'plot', x: PLOT.x, y: PLOT.y + 330, r: 170, label: 'Bauplatz', icon: '🏠', run: hooks.onPlot });
  }

  /* ── Ladestationen: drei je Zone am Weg, eine am Bauplatz ── */
  const addStation = (x: number, y: number) => {
    const s = { x, y };
    m.stations.push(s);
    keep.push({ x, y, r: 110 });
    addSolid(x, y - 6, 16);
    m.interacts.push({ id: `station.${m.stations.length}`, x, y: y + 20, r: 120, label: 'Aufladen', icon: '🔋', run: () => hooks.onCharge(s) });
  };
  for (let zi = 1; zi < worlds.length; zi++) for (const lx of [900, 1900, 2900]) addStation(zi * ZW + lx, Math.round(pathY(zi * ZW + lx) + 140));
  if (PLOT) addStation(PLOT.x + 520, PLOT.y + 150);

  /* ── Nebeltore zwischen gesperrten Gebieten ── */
  for (let zi = 1; zi < worlds.length; zi++) {
    const bx = zi * ZW, py = pathY(bx);
    keep.push({ x: bx, y: py, r: 190 });
    // Eule Olga steht vor dem Nebel: Mathearbeit der Welt davor (nur Welten mit Abzeichen)
    const prev = worlds[zi - 1];
    if (badgeCfg.worlds[prev.id]) {
      const gx = bx - 210, gy = Math.round(py + 135);
      keep.push({ x: gx, y: gy, r: 150 });
      const npc: Npc = { id: `tor.${prev.id}`, kind: 'owl', name: 'Eule Olga', x: gx, y: gy, hello: 'tor.hello.missing', offers: ['pruefung'] };
      m.npcs.push({ npc, id: npc.id, kind: 'owl', name: npc.name, x: gx, y: gy, worldId: prev.id });
      addSolid(gx, gy, 20);
      m.interacts.push({ id: `npc.${npc.id}`, x: gx, y: gy, r: 130, label: 'Mathearbeit', icon: '📝', run: () => hooks.onNpc(npc, prev.id) });
    }
    if (isOpen(worlds[zi])) {
      // Nebel löst sich beim ersten Besuch nach bestandener Mathearbeit sichtbar auf
      if (!getProgress().seen['gateopen.' + zi]) {
        const r0 = rng(zi * 31 + 5);
        for (let y = 120; y < WH; y += 90) m.fogs.push({ x: bx + (r0() - 0.5) * 110, y: y + r0() * 40, s: 0.9 + r0() * 0.8, ph: r0() * 6, dissolve: zi });
      }
      continue;
    }
    m.rects.push({ x: bx - 22, y: 0, w: 44, h: WH });
    m.gates.push({ x: bx - 150, y: py + 90 });
    const r = rng(zi * 31 + 5);
    for (let y = 120; y < WH; y += 90) m.fogs.push({ x: bx + (r() - 0.5) * 110, y: y + r() * 40, s: 0.9 + r() * 0.8, ph: r() * 6 });
    m.interacts.push({ id: `gate.${zi}`, x: bx - 40, y: py, r: 120, label: 'Nebeltor', icon: '🌫️', run: hooks.onGate });
  }

  /* ── Bäume, Felsen, Berge, Häuser ── */
  const free = (x: number, y: number, minGap: number, corridor: number) => {
    if (Math.abs(y - pathY(x)) < corridor) return false;
    for (const k of keep) if (Math.hypot(x - k.x, y - k.y) < k.r) return false;
    for (const s of m.solids) if (Math.hypot(x - s.x, y - s.y) < s.r + minGap) return false;
    return true;
  };

  for (let zi = 0; zi < worlds.length; zi++) {
    const theme = worlds[zi].meta.theme;
    const x0 = zi * ZW;
    const r = rng(zi * 977 + 3);
    const rv = riverOf(zi);
    const place = (n0: number, gap: number, corridor: number, fn: (x: number, y: number) => void, edgeBias = 0.4) => {
      const n = Math.round(n0 * AREA);
      for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) {
        const edge = r() < edgeBias;
        const y = edge ? (r() < 0.5 ? 70 + r() * 260 : WH - 70 - r() * 260) : 70 + r() * (WH - 140);
        const x = x0 + 60 + r() * (ZW - 120);
        if (rv && x > rv.x0 - 70 && x < rv.x1 + 70) continue;
        if (!free(x, y, gap, corridor)) continue;
        fn(x, y);
        i++;
      }
    };
    const tree = (x: number, y: number, kind: string, s: number) => {
      addSolid(x, y, (kind === 'pine' ? 12 : 14) * s);
      m.decor.push({ kind, x, y, s, rot: r() * 6.28 });
    };
    const rock = (x: number, y: number, s: number) => {
      addSolid(x, y, 20 * s);
      m.decor.push({ kind: 'rock', x, y, s, rot: r() * 6.28 });
    };
    if (theme === 'forest') {
      place(52, 60, 105, (x, y) => tree(x, y, ['tree_forest', 'tree_dark', 'tree_forest', 'pine'][Math.floor(r() * 4)], 0.85 + r() * 0.4), 0.5);
      place(7, 40, 100, (x, y) => rock(x, y, 0.8 + r() * 0.3), 0.1);
    } else if (theme === 'meadow') {
      place(9, 80, 130, (x, y) => tree(x, y, 'tree_light', 0.9 + r() * 0.3), 0.3);
      place(8, 50, 120, (x, y) => rock(x, y, 0.7), 0);
    } else if (theme === 'river') {
      place(22, 70, 130, (x, y) => tree(x, y, ['tree_light', 'tree_forest'][Math.floor(r() * 2)], 0.9 + r() * 0.3), 0.4);
    } else if (theme === 'mountain') {
      place(10, 130, 150, (x, y) => { addSolid(x - 50, y, 40); addSolid(x + 50, y, 40); addSolid(x, y, 45); m.decor.push({ kind: 'mountain', x, y, s: 1.1 + r() * 0.5, rot: r() * 6.28 }); }, 0.9);
      place(24, 60, 120, (x, y) => tree(x, y, 'pine', 0.9 + r() * 0.4), 0.45);
      place(12, 50, 110, (x, y) => rock(x, y, 0.9 + r() * 0.5), 0.2);
    } else if (theme === 'village') {
      for (let k = 0; k < 6; k++) {
        const hx = x0 + 260 + k * 300, hy = pathY(hx) + (k % 2 ? 250 : -230);
        m.rects.push({ x: hx - 78, y: hy - 56, w: 156, h: 56 });
        keep.push({ x: hx, y: hy, r: 130 });
        m.decor.push({ kind: k % 2 ? 'house_blue' : 'house_red', x: hx, y: hy, s: 1, rot: 0 });
      }
      place(14, 70, 150, (x, y) => tree(x, y, ['tree_autumn', 'tree_light'][Math.floor(r() * 2)], 0.9 + r() * 0.3), 0.5);
    }
  }

  const br = rng(99);
  for (let i = 0; i < 40; i++) m.butterflies.push({ x: br() * Math.min(WW, ZW * 2), y: 200 + br() * (WH - 400), ph: br() * 6.3, col: ['#ff8fab', '#ffd166', '#8fd3ff', '#c3a6ff'][i % 4] });

  return m;
}
