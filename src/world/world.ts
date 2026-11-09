/**
 * Baut die Welt aus den Content-JSONs: eine Zone je Welt (Reihenfolge = meta.order), durch einen Weg verbunden.
 * Gebiete mit status "locked" (oder ohne Station) bekommen ein Nebeltor. Dekoration entsteht deterministisch (Zufall mit festem Seed).
 */
import { worlds, textOf, type WorldContent } from '../core/texts';
import { getProgress } from '../core/progress';
import { equippedFor } from '../core/rewards';
import { stationStarters, type Npc } from '../stations';
import { S, drawSprite, drawSway, npcSprite } from './sprites';
import { ZW, WW, WH, pathY, riverOf } from './terrain';

export interface Circle { x: number; y: number; r: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Drawable { x: number; y: number; ext: number; draw: (c: CanvasRenderingContext2D, sx: number, sy: number, t: number) => void }
export interface Interact { id: string; x: number; y: number; r: number; label: string; icon: string; run: () => void; follow?: { x: number; y: number } }
export interface Critter { x: number; y: number; vx: number; vy: number; hx: number; hy: number; tx: number; ty: number; wait: number; face: number; fleeing: boolean }
export interface Bush { x: number; y: number; occupied: boolean }
export interface Star { id: string; x: number; y: number; got: boolean }

export interface WorldModel {
  solids: Circle[]; rects: Rect[]; drawables: Drawable[]; interacts: Interact[];
  fogs: { x: number; y: number; s: number; ph: number }[];
  critters: Critter[]; bushes: Bush[]; stars: Star[];
  butterflies: { x: number; y: number; ph: number; col: string }[];
  spawns: Record<string, { x: number; y: number }>;
}

export interface Hooks {
  onNpc: (npc: Npc, worldId: string) => void;
  onGate: () => void;
  onBush: (b: Bush) => void;
  onSquirrel: (c: Critter) => void;
}

export const isOpen = (w: WorldContent) => w.meta.status === 'open' && !!stationStarters[w.id];

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ellipse = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = fill; c.fill();
};

function drawSquirrel(c: CanvasRenderingContext2D, x: number, y: number, t: number, cr: Critter) {
  const moving = Math.hypot(cr.vx, cr.vy) > 10;
  c.save();
  c.translate(x, y);
  c.scale(cr.face < 0 ? -1 : 1, 1);
  ellipse(c, 0, 2, 16, 5, 'rgba(0,0,0,.2)');
  const hop = moving ? Math.abs(Math.sin(t * 16)) * 6 : 0;
  c.translate(0, -hop);
  c.strokeStyle = '#a8602b'; c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-8, -10); c.bezierCurveTo(-30, -6, -28, -38, -12 + Math.sin(t * 5) * 3, -42); c.stroke();
  ellipse(c, 0, -10, 12, 9, '#b8692f');
  ellipse(c, 2, -6, 7, 5, '#f1d4a6');
  ellipse(c, 10, -20, 8, 7.5, '#b8692f');
  c.fillStyle = '#b8692f'; c.beginPath(); c.moveTo(6, -26); c.lineTo(8, -34); c.lineTo(12, -26); c.fill();
  ellipse(c, 12, -21, 1.8, 2.4, '#3b2a1e');
  ellipse(c, 17, -19, 1.8, 1.4, '#3b2a1e');
  c.restore();
}

export async function buildWorld(hooks: Hooks): Promise<WorldModel> {
  const m: WorldModel = { solids: [], rects: [], drawables: [], interacts: [], fogs: [], critters: [], bushes: [], stars: [], butterflies: [], spawns: {} };
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
      if (n.kind === 'chest') {
        addSolid(nx, ny, 28);
        m.drawables.push({ x: nx, y: ny, ext: 80, draw: (c, sx, sy, t) => { drawSprite(c, S.chest, sx, sy, 1.1); if (Math.sin(t * 3) > 0.9) ellipse(c, sx + 20, sy - 50, 4, 4, '#fff6b0'); } });
      } else {
        const spr = await npcSprite(n.kind, equippedFor(n.id));
        addSolid(nx, ny, 20);
        m.drawables.push({
          x: nx, y: ny, ext: 160,
          draw: (c, sx, sy, t) => {
            c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(sx, sy + 2, spr.w * 0.34, 8, 0, 0, 7); c.fill();
            c.save(); c.translate(sx, sy); c.scale(1 - Math.sin(t * 2 + nx) * 0.012, 1 + Math.sin(t * 2 + nx) * 0.02); drawSprite(c, spr, 0, 0); c.restore();
          },
        });
      }
      // Namensschild + „sprich mich an“-Zeichen
      m.drawables.push({
        x: nx, y: ny + 0.1, ext: 200,
        draw: (c, sx, sy, t) => {
          const near = mia.d(nx, ny) < 260;
          const top = n.kind === 'chest' ? 78 : 150;
          if (near) {
            c.font = '800 18px ui-rounded, system-ui, sans-serif';
            const wv = c.measureText(n.name).width + 22;
            c.fillStyle = '#fff6e3'; c.strokeStyle = '#d6bf93'; c.lineWidth = 3;
            c.beginPath(); c.roundRect(sx - wv / 2, sy - top - 30, wv, 28, 10); c.fill(); c.stroke();
            c.fillStyle = '#3b2a1e'; c.textAlign = 'center'; c.fillText(n.name, sx, sy - top - 10);
          }
          c.font = '26px system-ui, sans-serif'; c.textAlign = 'center';
          c.fillText(n.kind === 'chest' ? '⭐' : '💬', sx, sy - top - 38 + Math.sin(t * 3 + nx) * 4);
        },
      });
      m.interacts.push({ id: `npc.${n.id}`, x: nx, y: ny, r: 120, label: n.kind === 'chest' ? 'Öffnen' : 'Ansprechen', icon: n.kind === 'chest' ? '🗝️' : '💬', run: () => hooks.onNpc(npc, w.id) });
    }

    for (const b of d.bushes ?? []) {
      const bush: Bush = { x: x0 + b.x, y: b.y, occupied: false };
      m.bushes.push(bush);
      keep.push({ x: bush.x, y: bush.y, r: 90 });
      m.drawables.push({
        x: bush.x, y: bush.y, ext: 100,
        draw: (c, sx, sy, t) => {
          const shake = bush.occupied ? Math.sin(t * 30) * 1.6 * Math.max(0, 1 - ((t * 2) % 2)) : 0;
          drawSprite(c, S.bush, sx + shake, sy, 1.15);
          if (bush.occupied) {
            const blink = Math.sin(t * 1.3) > 0.95 ? 0.15 : 1;
            c.fillStyle = '#fff';
            for (const ex of [-12, 12]) { c.beginPath(); c.ellipse(sx + ex, sy - 48, 8, 9 * blink, 0, 0, 7); c.fill(); }
            c.fillStyle = '#3b2a1e';
            for (const ex of [-10, 14]) { c.beginPath(); c.arc(sx + ex, sy - 47, 4 * blink, 0, 7); c.fill(); }
          }
        },
      });
      m.interacts.push({ id: `bush.${m.bushes.length}`, x: bush.x, y: bush.y, r: 70, label: 'Verstecken', icon: '🌿', run: () => hooks.onBush(bush) });
    }

    for (const s of d.stars ?? []) {
      const star: Star = { id: `${w.id}.${s.id}`, x: x0 + s.x, y: s.y, got: !!disc[`${w.id}.${s.id}`] };
      m.stars.push(star);
      keep.push({ x: star.x, y: star.y, r: 60 });
      m.drawables.push({
        x: star.x, y: star.y, ext: 60,
        draw: (c, sx, sy, t) => {
          if (star.got) return;
          const yy = sy - 34 + Math.sin(t * 3 + sx) * 5;
          const g = c.createRadialGradient(sx, yy, 2, sx, yy, 32);
          g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(1, 'rgba(255,240,150,0)');
          c.fillStyle = g; c.fillRect(sx - 34, yy - 34, 68, 68);
          c.fillStyle = '#f4b942'; c.strokeStyle = '#c98a14'; c.lineWidth = 3; c.lineJoin = 'round';
          c.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 7 : 16; c.lineTo(sx + Math.cos(a) * rr, yy + Math.sin(a) * rr); }
          c.closePath(); c.fill(); c.stroke();
        },
      });
    }

    for (const cr of d.critters ?? []) {
      const c0: Critter = { x: x0 + cr.x, y: cr.y, vx: 0, vy: 0, hx: x0 + cr.x, hy: cr.y, tx: x0 + cr.x, ty: cr.y, wait: Math.random() * 2, face: 1, fleeing: false };
      m.critters.push(c0);
      m.drawables.push({ get x() { return c0.x; }, get y() { return c0.y; }, ext: 80, draw: (c, sx, sy, t) => drawSquirrel(c, sx, sy, t, c0) } as Drawable);
      m.interacts.push({ id: `critter.${m.critters.length}`, x: c0.x, y: c0.y, r: 70, label: 'Streicheln', icon: '🐿️', follow: c0, run: () => hooks.onSquirrel(c0) });
    }
  }

  /* ── Nebeltore zwischen gesperrten Gebieten ── */
  for (let zi = 1; zi < worlds.length; zi++) {
    const bx = zi * ZW, py = pathY(bx);
    keep.push({ x: bx, y: py, r: 190 });
    if (isOpen(worlds[zi])) continue;
    m.rects.push({ x: bx - 22, y: 0, w: 44, h: WH });
    const r = rng(zi * 31 + 5);
    for (let y = 120; y < WH; y += 90) m.fogs.push({ x: bx + (r() - 0.5) * 110, y: y + r() * 40, s: 0.9 + r() * 0.8, ph: r() * 6 });
    m.drawables.push({
      x: bx - 150, y: py + 90, ext: 120,
      draw: (c, sx, sy) => {
        c.fillStyle = '#7a4d26'; c.fillRect(sx - 5, sy - 70, 10, 70);
        c.fillStyle = '#c07b45'; c.strokeStyle = '#6a3f1c'; c.lineWidth = 4;
        c.beginPath(); c.roundRect(sx - 62, sy - 100, 124, 44, 8); c.fill(); c.stroke();
        c.fillStyle = '#3b2a1e'; c.font = '800 20px ui-rounded, system-ui, sans-serif'; c.textAlign = 'center';
        c.fillText('Bald dabei', sx, sy - 71);
      },
    });
    m.interacts.push({ id: `gate.${zi}`, x: bx - 70, y: py, r: 190, label: 'Nebeltor', icon: '🌫️', run: hooks.onGate });
  }

  /* ── Bäume, Felsen, Berge, Häuser ── */
  const free = (x: number, y: number, minGap: number, corridor: number) => {
    if (Math.abs(y - pathY(x)) < corridor) return false;
    for (const k of keep) if (Math.hypot(x - k.x, y - k.y) < k.r) return false;
    for (const s of m.solids) if (Math.hypot(x - s.x, y - s.y) < s.r + minGap) return false;
    return true;
  };
  const tree = (x: number, y: number, key: string, sc: number) => {
    addSolid(x, y, key === 'pine' ? 12 * sc : 14 * sc);
    m.drawables.push({
      x, y, ext: 120,
      draw: (c, sx, sy, t) => {
        const g = c.createRadialGradient(sx + 20 * sc, sy + 4, 2, sx + 20 * sc, sy + 4, 46 * sc);
        g.addColorStop(0, 'rgba(15,40,10,.32)'); g.addColorStop(1, 'rgba(15,40,10,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(sx + 20 * sc, sy + 4, 50 * sc, 15 * sc, 0, 0, 7); c.fill();
        drawSway(c, S[key], sx, sy, sc, Math.sin(t * 1.1 + x * 0.013) * 0.022 + Math.sin(t * 2.3 + y) * 0.006);
      },
    });
  };

  for (let zi = 0; zi < worlds.length; zi++) {
    const theme = worlds[zi].meta.theme;
    const x0 = zi * ZW;
    const r = rng(zi * 977 + 3);
    const rv = riverOf(zi);
    const place = (n: number, gap: number, corridor: number, fn: (x: number, y: number) => void, edgeBias = 0.4) => {
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
    if (theme === 'forest') {
      place(150, 38, 105, (x, y) => tree(x, y, ['tree_forest', 'tree_dark', 'tree_forest', 'pine'][Math.floor(r() * 4)], 0.85 + r() * 0.4), 0.5);
      place(14, 30, 100, (x, y) => { addSolid(x, y, 16); const k = 0.8 + r() * 0.3; m.drawables.push({ x, y, ext: 70, draw: (c, sx, sy) => drawSprite(c, S.rock, sx, sy, k) }); }, 0.1);
    } else if (theme === 'meadow') {
      place(22, 60, 130, (x, y) => tree(x, y, 'tree_light', 0.9 + r() * 0.3), 0.3);
      place(18, 40, 120, (x, y) => { addSolid(x, y, 16); m.drawables.push({ x, y, ext: 70, draw: (c, sx, sy) => drawSprite(c, S.rock, sx, sy, 0.7) }); }, 0);
    } else if (theme === 'river') {
      place(50, 50, 130, (x, y) => tree(x, y, ['tree_light', 'tree_forest'][Math.floor(r() * 2)], 0.9 + r() * 0.3), 0.4);
    } else if (theme === 'mountain') {
      place(10, 130, 150, (x, y) => { addSolid(x - 50, y, 40); addSolid(x + 50, y, 40); addSolid(x, y, 45); m.drawables.push({ x, y, ext: 190, draw: (c, sx, sy) => drawSprite(c, S.mountain, sx, sy, 1.1) }); }, 0.9);
      place(55, 40, 120, (x, y) => tree(x, y, 'pine', 0.9 + r() * 0.4), 0.45);
      place(26, 40, 110, (x, y) => { addSolid(x, y, 20); const k = 0.9 + r() * 0.5; m.drawables.push({ x, y, ext: 70, draw: (c, sx, sy) => drawSprite(c, S.rock, sx, sy, k) }); }, 0.2);
    } else if (theme === 'village') {
      for (let k = 0; k < 6; k++) {
        const hx = x0 + 180 + k * 190, hy = pathY(hx) + (k % 2 ? 250 : -230);
        const key = k % 2 ? 'house_blue' : 'house_red';
        m.rects.push({ x: hx - 78, y: hy - 56, w: 156, h: 56 });
        keep.push({ x: hx, y: hy, r: 130 });
        m.drawables.push({ x: hx, y: hy, ext: 160, draw: (c, sx, sy) => drawSprite(c, S[key], sx, sy, 0.95) });
      }
      place(34, 50, 150, (x, y) => tree(x, y, ['tree_autumn', 'tree_light'][Math.floor(r() * 2)], 0.9 + r() * 0.3), 0.5);
    }
  }

  // Schmetterlinge
  const br = rng(99);
  for (let i = 0; i < 28; i++) m.butterflies.push({ x: br() * Math.min(WW, ZW * 3), y: 200 + br() * 1400, ph: br() * 6.3, col: ['#ff8fab', '#ffd166', '#8fd3ff', '#c3a6ff'][i % 4] });

  return m;
}

/** Mias aktuelle Position (für Beschriftungen, die auf Nähe reagieren) */
export const mia = { x: 0, y: 0, d(x: number, y: number) { return Math.hypot(this.x - x, this.y - y); } };
void textOf;
