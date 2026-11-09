/**
 * Mia als Comic-Figur (gezeichnet per Canvas): dicke Kontur, großer Kopf, große Augen, Laufzyklus, 4 Blickrichtungen.
 * Wird jedes Bild in eine kleine Textur gezeichnet und als stehendes Sprite in der 2,5D-Welt gezeigt.
 */
export type Dir = 'down' | 'up' | 'left' | 'right';
export interface MiaPose { dir: Dir; t: number; phase: number; speed: number; acc: string[]; happy?: boolean }

export const MIA_CANVAS = 256;
const INK = '#3a2412', OR = '#f5a63e', ORL = '#ffc36a', ORD = '#cf7420', CR = '#fff2da', PK = '#ff9fa8';
const LW = 5;

type C = CanvasRenderingContext2D;
const path = (c: C, f: () => void, fill: string, stroke = true) => {
  c.beginPath(); f(); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = INK; c.lineWidth = LW; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
};
const ell = (c: C, x: number, y: number, rx: number, ry: number, fill: string, stroke = true) => path(c, () => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), fill, stroke);
const tri = (c: C, a: number[], b: number[], d: number[], fill: string, stroke = true) => path(c, () => { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); }, fill, stroke);

function eye(c: C, x: number, y: number, happy: boolean, blink: boolean, look = 0) {
  if (happy) {
    c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y + 4, 11, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    return;
  }
  if (blink) { c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 9, y + 2); c.lineTo(x + 9, y + 2); c.stroke(); return; }
  ell(c, x, y, 12, 15, INK, false);
  ell(c, x + look, y - 2, 10, 13, '#2a1a10', false);
  ell(c, x + 4 + look, y - 7, 5, 6, '#fff', false);
  ell(c, x - 4 + look, y + 5, 2.6, 3, '#fff', false);
}

/** Zeichnet Mia mit den Füßen bei (cx, cy). */
export function drawMia(c: C, cx: number, cy: number, p: MiaPose) {
  const { dir, t, phase, speed, acc } = p;
  const side = dir === 'left' || dir === 'right', back = dir === 'up';
  const mv = speed > 0.05;
  const bob = mv ? Math.abs(Math.cos(phase)) * 9 * speed : Math.sin(t * 2.1) * 1.6;
  const sq = 1 + (mv ? Math.cos(phase * 2) * 0.035 * speed : Math.sin(t * 2.1) * 0.014);
  const wag = Math.sin(t * (mv ? 9 : 2.4));
  const blink = Math.sin(t * 0.8) > 0.985;
  const lean = (dir === 'right' ? 1 : dir === 'left' ? -1 : 0) * 0.07 * speed;

  c.save();
  c.translate(cx, cy);
  c.translate(0, -bob);
  c.rotate(lean);
  c.scale(dir === 'left' ? -1 : 1, sq);

  // Schwanz (hinten)
  const tail = () => {
    c.save(); c.lineCap = 'round';
    const pts = side ? [[-34, -56], [-84, -48 + wag * 14], [-86, -108], [-62 + wag * 8, -128]] : [[18, -40], [70, -34 + wag * 12], [74, -100], [48 + wag * 8, -118]];
    const stroke = (w: number, col: string) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    stroke(26, INK); stroke(16, OR);
    c.setLineDash([9, 16]); stroke(16, ORD); c.setLineDash([]);
    c.restore();
  };
  if (!back) tail();

  // Beine
  const leg = (x: number, off: number, front: boolean) => {
    const s = Math.sin(phase + off) * speed, lift = Math.max(0, Math.cos(phase + off)) * 11 * speed;
    const px = side ? x + s * 20 : x, py = -8 - lift + (side ? 0 : s * 5);
    path(c, () => { c.moveTo(x - 9, -40); c.lineTo(px - 10, py - 4); c.quadraticCurveTo(px, py + 12, px + 14, py - 4); c.lineTo(x + 9, -40); c.closePath(); }, front ? OR : ORD);
    ell(c, px + 2, py, 14, 9, CR);
  };
  if (side) { leg(-26, 0, false); leg(30, Math.PI, false); } else { leg(-20, 0, true); leg(20, Math.PI, true); }

  // Körper
  if (side) {
    ell(c, 0, -62, 52, 36, OR);
    path(c, () => c.ellipse(4, -44, 34, 16, 0, 0, Math.PI * 2), CR, false);
    c.strokeStyle = ORD; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-26, -90); c.lineTo(-22, -74); c.moveTo(-6, -94); c.lineTo(-4, -78); c.moveTo(16, -92); c.lineTo(16, -76); c.stroke();
  } else {
    ell(c, 0, -64, 40, 42, OR);
    if (!back) path(c, () => c.ellipse(0, -54, 24, 30, 0, 0, Math.PI * 2), CR, false);
    c.strokeStyle = ORD; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-38, -78); c.lineTo(-24, -72); c.moveTo(-40, -58); c.lineTo(-26, -56); c.moveTo(38, -78); c.lineTo(24, -72); c.moveTo(40, -58); c.lineTo(26, -56); c.stroke();
  }
  if (back) tail();
  if (side) { leg(-10, Math.PI, true); leg(44, 0, true); }

  if (acc.includes('mia-halstuch')) tri(c, side ? [8, -96] : [-26, -98], side ? [40, -92] : [26, -98], side ? [24, -64] : [0, -62], '#e0483f');

  // Kopf
  const hx = side ? 30 : 0, hy = -130 + (mv ? Math.sin(phase * 2) * 2 : 0);
  const rx = side ? 50 : 58, ry = side ? 46 : 50;
  // Ohren
  tri(c, [hx - rx + 6, hy - 14], [hx - rx + 12, hy - 78], [hx - 8, hy - ry + 8], OR);
  tri(c, [hx + rx - 6, hy - 14], [hx + rx - 12, hy - 78], [hx + 8, hy - ry + 8], side ? ORD : OR);
  if (!back) {
    tri(c, [hx - rx + 16, hy - 24], [hx - rx + 18, hy - 62], [hx - 14, hy - ry + 12], PK, false);
    tri(c, [hx + rx - 16, hy - 24], [hx + rx - 18, hy - 62], [hx + 14, hy - ry + 12], PK, false);
  }
  ell(c, hx, hy, rx, ry, OR);
  if (!side) { // Wangenbüschel
    tri(c, [hx - rx + 2, hy + 8], [hx - rx - 14, hy + 20], [hx - rx + 10, hy + 26], OR);
    tri(c, [hx + rx - 2, hy + 8], [hx + rx + 14, hy + 20], [hx + rx - 10, hy + 26], OR);
    ell(c, hx, hy, rx - 2.5, ry - 2.5, OR, false);
  }
  c.strokeStyle = ORD; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(hx, hy - ry + 6); c.lineTo(hx, hy - ry + 24); c.moveTo(hx - 15, hy - ry + 9); c.lineTo(hx - 11, hy - ry + 25); c.moveTo(hx + 15, hy - ry + 9); c.lineTo(hx + 11, hy - ry + 25); c.stroke();
  if (back) {
    c.beginPath(); c.moveTo(hx - 22, hy - 8); c.lineTo(hx - 14, hy + 8); c.moveTo(hx + 22, hy - 8); c.lineTo(hx + 14, hy + 8); c.stroke();
  } else {
    const mx = hx + (side ? 20 : 0);
    ell(c, mx, hy + 18, side ? 26 : 28, 19, CR, false);
    if (side) { eye(c, hx + 26, hy - 6, !!p.happy, blink); } else { eye(c, hx - 24, hy - 6, !!p.happy, blink); eye(c, hx + 24, hy - 6, !!p.happy, blink); }
    ell(c, hx + (side ? 52 : -42), hy + 14, 10, 6, 'rgba(255,120,130,.55)', false);
    if (!side) ell(c, hx + 42, hy + 14, 10, 6, 'rgba(255,120,130,.55)', false);
    const nx = hx + (side ? 44 : 0);
    tri(c, [nx - 7, hy + 8], [nx + 7, hy + 8], [nx, hy + 17], PK);
    c.strokeStyle = INK; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(nx, hy + 17); c.lineTo(nx, hy + 22);
    c.moveTo(nx, hy + 22); c.quadraticCurveTo(nx - 8, hy + 32, nx - 16, hy + 24);
    c.moveTo(nx, hy + 22); c.quadraticCurveTo(nx + 8, hy + 32, nx + 16, hy + 24); c.stroke();
    c.strokeStyle = 'rgba(58,36,18,.7)'; c.lineWidth = 2.5;
    c.beginPath();
    if (side) { c.moveTo(nx - 4, hy + 16); c.lineTo(nx + 26, hy + 10); c.moveTo(nx - 4, hy + 20); c.lineTo(nx + 26, hy + 24); }
    else { for (const s of [-1, 1]) { c.moveTo(nx + s * 18, hy + 16); c.lineTo(nx + s * 56, hy + 8); c.moveTo(nx + s * 18, hy + 22); c.lineTo(nx + s * 56, hy + 26); } }
    c.stroke();
    if (acc.includes('mia-brille')) {
      c.fillStyle = '#23262e'; c.strokeStyle = INK; c.lineWidth = 3;
      const lens = (x: number) => { c.beginPath(); c.roundRect(x - 17, hy - 16, 34, 22, 8); c.fill(); c.stroke(); };
      if (side) lens(hx + 26); else { lens(hx - 24); lens(hx + 24); c.fillRect(hx - 8, hy - 10, 16, 5); }
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo((side ? hx + 18 : hx - 32), hy - 11); c.lineTo((side ? hx + 26 : hx - 24), hy - 11); c.stroke();
    }
  }
  if (acc.includes('mia-zipfel')) {
    path(c, () => { c.moveTo(hx - 44, hy - 30); c.quadraticCurveTo(hx - 30, hy - 100, hx + 40, hy - 104); c.quadraticCurveTo(hx + 20, hy - 70, hx + 46, hy - 30); c.closePath(); }, '#e0483f');
    path(c, () => c.ellipse(hx + 1, hy - 28, 50, 9, 0, 0, Math.PI * 2), '#ffffff');
    ell(c, hx + 40 + wag * 3, hy - 104, 11, 11, '#ffffff');
  } else if (acc.includes('mia-krone')) {
    path(c, () => { c.moveTo(hx - 32, hy - 34); c.lineTo(hx - 38, hy - 80); c.lineTo(hx - 16, hy - 58); c.lineTo(hx, hy - 90); c.lineTo(hx + 16, hy - 58); c.lineTo(hx + 38, hy - 80); c.lineTo(hx + 32, hy - 34); c.closePath(); }, '#ffd23f');
    ell(c, hx, hy - 48, 5, 5, '#e0483f', false);
  }
  c.restore();
}
