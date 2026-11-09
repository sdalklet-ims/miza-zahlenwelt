/** Mia, Top-down-Ansicht, per Canvas gezeichnet: Idle/Laufen/Schleichen in 4 Blickrichtungen. */
export type Dir = 'down' | 'up' | 'left' | 'right';
export interface MiaPose { dir: Dir; t: number; moving: boolean; sneak: boolean; acc: string[]; alpha?: number }

const OR = '#e9a24b', ORD = '#b8691f', CR = '#fff0d4', PK = '#f2a2a2', INK = '#3b2a1e';

const ell = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
};
const poly = (c: CanvasRenderingContext2D, pts: number[][], fill: string, stroke?: string) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke(); }
};

/** Zeichnet Mia mit den Füßen bei (x, y). */
export function drawMia(c: CanvasRenderingContext2D, x: number, y: number, p: MiaPose) {
  const { dir, t, moving, sneak, acc } = p;
  const side = dir === 'left' || dir === 'right';
  const back = dir === 'up';
  const ph = moving ? t * (sneak ? 8 : 13) : 0;
  const bob = moving ? Math.abs(Math.sin(ph)) * (sneak ? 1.5 : 4) : Math.sin(t * 2) * 0.8;
  const wag = Math.sin(t * (moving ? 9 : 2.6)) * 0.5;

  c.save();
  c.globalAlpha = p.alpha ?? 1;
  c.translate(x, y);
  ell(c, 0, 2, side ? 26 : 21, 8, 'rgba(0,0,0,.22)');
  c.translate(0, -bob + (sneak ? 6 : 0));
  c.scale(dir === 'left' ? -1 : 1, sneak ? 0.84 : 1);

  const tail = () => {
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    if (side) { c.moveTo(-18, -26); c.bezierCurveTo(-44, -24 + wag * 12, -46, -54, -32 + wag * 8, -62); }
    else { c.moveTo(10, -18); c.bezierCurveTo(36, -16 + wag * 10, 38, -52, 22 + wag * 8, -60); }
    c.strokeStyle = OR; c.lineWidth = 9; c.stroke();
    c.strokeStyle = ORD; c.setLineDash([5, 9]); c.globalAlpha *= 0.6; c.stroke();
    c.restore();
  };
  if (!back) tail();

  // Beine
  const legs = side ? [[-12, 0], [-4, 1], [8, 0], [15, 1]] : [[-9, 0], [9, 1]];
  legs.forEach(([lx, k]) => ell(c, lx, -3 + (moving ? Math.sin(ph + k * Math.PI) * -4 : 0), 6, 5.5, p.sneak ? OR : CR, ORD));

  // Körper
  if (side) {
    ell(c, 0, -26, 25, 17, OR);
    ell(c, 3, -17, 16, 7, CR);
    c.strokeStyle = ORD; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-12, -40); c.lineTo(-10, -32); c.moveTo(-2, -42); c.lineTo(0, -34); c.moveTo(8, -41); c.lineTo(9, -33); c.stroke();
  } else {
    ell(c, 0, -26, 18, 21, OR);
    if (!back) ell(c, 0, -22, 10, 13, CR);
    c.strokeStyle = ORD; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-17, -32); c.lineTo(-10, -30); c.moveTo(-17, -22); c.lineTo(-10, -22); c.moveTo(17, -32); c.lineTo(10, -30); c.moveTo(17, -22); c.lineTo(10, -22); c.stroke();
  }
  if (back) tail();

  // Halstuch
  if (acc.includes('mia-halstuch')) {
    poly(c, side ? [[4, -44], [20, -42], [14, -28]] : [[-14, -44], [14, -44], [0, -26]], '#d9534f', '#a63a37');
  }

  // Kopf
  const hx = side ? 14 : 0, hy = side ? -54 : -58;
  const ex = side ? 1 : 0;
  poly(c, [[hx - 18, hy - 6], [hx - 15, hy - 28], [hx - 2, hy - 14]], OR, ORD);
  poly(c, [[hx + 18 - 2 * ex, hy - 6], [hx + 15 - 2 * ex, hy - 28], [hx + 2, hy - 14]], OR, ORD);
  poly(c, [[hx - 14, hy - 10], [hx - 13, hy - 23], [hx - 5, hy - 14]], PK);
  poly(c, [[hx + 14 - 2 * ex, hy - 10], [hx + 13 - 2 * ex, hy - 23], [hx + 5, hy - 14]], PK);
  ell(c, hx, hy, side ? 19 : 22, side ? 16 : 18, OR);
  if (back) {
    c.strokeStyle = ORD; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy - 16); c.lineTo(hx, hy - 6); c.moveTo(hx - 8, hy - 14); c.lineTo(hx - 6, hy - 6); c.moveTo(hx + 8, hy - 14); c.lineTo(hx + 6, hy - 6); c.stroke();
  } else {
    ell(c, hx + (side ? 7 : 0), hy + 7, side ? 10 : 12, 8, CR);
    const eyes = side ? [hx + 7] : [hx - 8, hx + 8];
    const blink = Math.sin(t * 0.9) > 0.985;
    eyes.forEach((e) => (blink ? (c.fillStyle = INK, c.fillRect(e - 3, hy - 1, 6, 2)) : (ell(c, e, hy - 1, 3.2, 4.2, INK), ell(c, e + 1, hy - 2.5, 1.2, 1.2, '#fff'))));
    const nx = hx + (side ? 16 : 0);
    poly(c, [[nx - 3.5, hy + 4], [nx + 3.5, hy + 4], [nx, hy + 8.5]], PK);
    c.strokeStyle = INK; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(nx, hy + 8.5); c.lineTo(nx, hy + 11); c.stroke();
    c.strokeStyle = '#7a5a3b'; c.lineWidth = 1.3;
    c.beginPath();
    if (side) { c.moveTo(nx - 2, hy + 8); c.lineTo(nx + 14, hy + 5); c.moveTo(nx - 2, hy + 10); c.lineTo(nx + 14, hy + 12); }
    else { c.moveTo(-8, hy + 8); c.lineTo(-24, hy + 5); c.moveTo(-8, hy + 10); c.lineTo(-24, hy + 13); c.moveTo(8, hy + 8); c.lineTo(24, hy + 5); c.moveTo(8, hy + 10); c.lineTo(24, hy + 13); }
    c.stroke();
    if (acc.includes('mia-brille')) {
      c.fillStyle = '#23262e';
      const rr = (ax: number) => { c.beginPath(); c.roundRect(ax - 7, hy - 6, 14, 10, 4); c.fill(); };
      eyes.forEach(rr);
      if (!side) c.fillRect(hx - 3, hy - 3, 6, 2.5);
    }
  }

  // Kopfschmuck
  if (acc.includes('mia-zipfel')) {
    poly(c, [[hx - 18, hy - 12], [hx + 18, hy - 12], [hx + 10, hy - 30], [hx + 24, hy - 42 + wag * 3]], '#d9534f', '#a63a37');
    ell(c, hx, hy - 12, 20, 5, '#fff', '#e1d7c6');
    ell(c, hx + 24, hy - 42 + wag * 3, 6, 6, '#fff', '#e1d7c6');
  } else if (acc.includes('mia-krone')) {
    poly(c, [[hx - 14, hy - 14], [hx - 16, hy - 32], [hx - 7, hy - 24], [hx, hy - 36], [hx + 7, hy - 24], [hx + 16, hy - 32], [hx + 14, hy - 14]], '#f4c430', '#c9971c');
    ell(c, hx, hy - 20, 2.6, 2.6, '#e8504a');
  }
  c.restore();
}
