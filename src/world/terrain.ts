/** Boden: in 512er-Kacheln, lazy gezeichnet und gecacht (Gras, Blumen, Weg, Fluss, Brücke). */
import { worldCfg, worlds } from '../core/texts';

export const CHUNK = 512;
export const ZW = worldCfg.zoneWidth;
export const WH = worldCfg.height;
export const WW = worlds.length * ZW;

export const pathY = (x: number) => worldCfg.pathY + Math.sin(x / 430) * worldCfg.pathAmp;
export const zoneIndex = (x: number) => Math.max(0, Math.min(worlds.length - 1, Math.floor(x / ZW)));
const themeOf = (i: number) => worldCfg.themes[worlds[i].meta.theme] ?? worldCfg.themes.forest;

/** Mittelpunkt und Breite des Flusses (falls die Zone ein Fluss ist) */
export function riverOf(i: number) {
  if (worlds[i].meta.theme !== 'river') return null;
  const cx = i * ZW + ZW / 2;
  return { x0: cx - 90, x1: cx + 90, by: pathY(cx) };
}

function mul(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, HTMLCanvasElement>();

export function getChunk(cx: number, cy: number): HTMLCanvasElement {
  const key = cx + ',' + cy;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = cv.height = CHUNK;
  const c = cv.getContext('2d')!;
  const ox = cx * CHUNK, oy = cy * CHUNK;

  // Grundfarbe: weicher Übergang zwischen den Zonen
  const gr = c.createLinearGradient(-ox, 0, WW - ox, 0);
  worlds.forEach((_, i) => {
    const col = themeOf(i).ground;
    gr.addColorStop(Math.max(0, (i * ZW + ZW * 0.2) / WW), col);
    gr.addColorStop(Math.min(1, ((i + 1) * ZW - ZW * 0.2) / WW), col);
  });
  c.fillStyle = gr;
  c.fillRect(0, 0, CHUNK, CHUNK);

  // Textur: Grasbüschel, Blumen, Kiesel
  const r = mul(cx * 7919 + cy * 104729 + 17);
  for (let i = 0; i < 90; i++) {
    const x = r() * CHUNK, y = r() * CHUNK, z = zoneIndex(ox + x), th = themeOf(z);
    const rocky = worlds[z].meta.theme === 'mountain';
    c.strokeStyle = th.ground2;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    if (rocky) { c.ellipse(x, y, 3 + r() * 3, 2, 0, 0, 7); c.fillStyle = th.ground2; c.fill(); }
    else { c.moveTo(x, y); c.lineTo(x - 3, y - 9); c.moveTo(x, y); c.lineTo(x + 1, y - 11); c.moveTo(x, y); c.lineTo(x + 4, y - 8); c.stroke(); }
  }
  for (let z = 0; z < worlds.length; z++) {
    const th = themeOf(z);
    const n = Math.round((th.flower / 100) * 60 + th.flower / 4);
    for (let i = 0; i < n; i++) {
      const x = r() * CHUNK, y = r() * CHUNK;
      if (zoneIndex(ox + x) !== z) continue;
      c.fillStyle = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff', '#ff9f5a'][Math.floor(r() * 5)];
      c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
      c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(x, y, 1.7, 0, 7); c.fill();
    }
  }

  // Weg
  c.save();
  c.translate(-ox, -oy);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const trace = () => {
    c.beginPath();
    for (let x = ox - 80; x <= ox + CHUNK + 80; x += 40) (x === ox - 80 ? c.moveTo(x, pathY(x)) : c.lineTo(x, pathY(x)));
  };
  trace(); c.strokeStyle = '#cfae72'; c.lineWidth = 104; c.stroke();
  trace(); c.strokeStyle = '#e8d3a0'; c.lineWidth = 88; c.stroke();
  trace(); c.strokeStyle = '#d9bc84'; c.lineWidth = 3; c.setLineDash([2, 22]); c.stroke(); c.setLineDash([]);

  // Fluss + Brücke
  for (let i = 0; i < worlds.length; i++) {
    const rv = riverOf(i);
    if (!rv || rv.x1 + 40 < ox || rv.x0 - 40 > ox + CHUNK) continue;
    c.fillStyle = '#e8d6a0'; c.fillRect(rv.x0 - 16, 0, rv.x1 - rv.x0 + 32, WH);
    c.fillStyle = '#4fa4dc'; c.fillRect(rv.x0, 0, rv.x1 - rv.x0, WH);
    c.fillStyle = '#7cc4ee'; c.fillRect(rv.x0 + 14, 0, rv.x1 - rv.x0 - 28, WH);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4;
    for (let y = 0; y < WH; y += 90) {
      c.beginPath(); c.moveTo(rv.x0 + 24 + (y % 3) * 20, y); c.quadraticCurveTo(rv.x0 + 50, y + 14, rv.x0 + 78 + (y % 4) * 10, y); c.stroke();
    }
    c.fillStyle = '#b07a44'; c.fillRect(rv.x0 - 30, rv.by - 56, rv.x1 - rv.x0 + 60, 112);
    c.strokeStyle = '#7a4d26'; c.lineWidth = 3;
    for (let x = rv.x0 - 30; x < rv.x1 + 30; x += 18) { c.beginPath(); c.moveTo(x, rv.by - 56); c.lineTo(x, rv.by + 56); c.stroke(); }
    c.fillStyle = '#7a4d26'; c.fillRect(rv.x0 - 30, rv.by - 60, rv.x1 - rv.x0 + 60, 8); c.fillRect(rv.x0 - 30, rv.by + 52, rv.x1 - rv.x0 + 60, 8);
  }
  c.restore();
  cache.set(key, cv);
  return cv;
}
