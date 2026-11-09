/** Mia in 2,5D: schattierte Formen, echter Laufzyklus (Beine, Hüpfen, Neigen), 4 Blickrichtungen. */
export type Dir = 'down' | 'up' | 'left' | 'right';
export interface MiaPose {
  dir: Dir; t: number;
  /** Laufphase (läuft mit der zurückgelegten Strecke) */
  phase: number;
  /** 0 = steht, 1 = volles Tempo */
  speed: number;
  acc: string[];
  alpha?: number;
}

const ORD = '#b8691f', CR = '#fff0d4', PK = '#f2a2a2', INK = '#3b2a1e';
const LO = '#f8c477', MO = '#e9a24b', DO = '#c27a28';

/** Schattierte Ellipse, Licht von links oben */
function eg(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, l: string, m: string, d: string) {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(-rx * 0.35, -rx * 0.42, rx * 0.1, 0, 0, rx * 1.05);
  g.addColorStop(0, l); g.addColorStop(0.55, m); g.addColorStop(1, d);
  c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2);
  c.fillStyle = g; c.fill();
  c.restore();
}
const flat = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
};
const poly = (c: CanvasRenderingContext2D, pts: number[][], fill: string, stroke?: string) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath(); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke(); }
};

/** Zeichnet Mia mit den Füßen bei (x, y). */
export function drawMia(c: CanvasRenderingContext2D, x: number, y: number, p: MiaPose) {
  const { dir, t, phase, speed, acc } = p;
  const side = dir === 'left' || dir === 'right';
  const back = dir === 'up';
  const moving = speed > 0.05;
  const bob = moving ? Math.abs(Math.cos(phase)) * 5 * speed : Math.sin(t * 2) * 0.9;
  const squash = 1 + (moving ? Math.cos(phase * 2) * 0.04 * speed : Math.sin(t * 2) * 0.012);
  const lean = (dir === 'right' ? 1 : dir === 'left' ? -1 : 0) * 0.08 * speed;
  const wag = Math.sin(t * (moving ? 9 : 2.6)) * 0.5;

  c.save();
  c.globalAlpha = p.alpha ?? 1;
  c.translate(x, y);

  // weicher Kontaktschatten: wird kleiner, wenn Mia in der Luft ist
  const sh = 1 - bob / 14;
  const sg = c.createRadialGradient(side ? 3 : 0, 3, 2, side ? 3 : 0, 3, 30 * sh);
  sg.addColorStop(0, 'rgba(25,45,12,.42)'); sg.addColorStop(1, 'rgba(25,45,12,0)');
  c.fillStyle = sg;
  c.beginPath(); c.ellipse(side ? 3 : 0, 3, 31 * sh, 11 * sh, 0, 0, Math.PI * 2); c.fill();

  c.translate(0, -bob);
  c.rotate(lean);
  c.scale(dir === 'left' ? -1 : 1, squash);

  const tail = () => {
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    if (side) { c.moveTo(-18, -26); c.bezierCurveTo(-44, -24 + wag * 12, -46, -54, -32 + wag * 9, -62); }
    else { c.moveTo(10, -18); c.bezierCurveTo(36, -16 + wag * 10, 38, -52, 22 + wag * 8, -60); }
    c.strokeStyle = DO; c.lineWidth = 11; c.stroke();
    c.strokeStyle = MO; c.lineWidth = 8; c.stroke();
    c.strokeStyle = ORD; c.lineWidth = 8; c.setLineDash([5, 9]); c.globalAlpha *= 0.55; c.stroke();
    c.restore();
  };
  if (!back) tail();

  // Beine: Laufzyklus (diagonale Paare)
  const leg = (lx: number, off: number, far: boolean) => {
    const s = Math.sin(phase + off) * speed, lift = Math.max(0, Math.cos(phase + off)) * 6 * speed;
    const px = side ? lx + s * 11 : lx;
    const py = side ? -3 - lift : -3 - lift - s * 3.5;
    c.lineCap = 'round';
    c.strokeStyle = far ? '#b06a24' : DO; c.lineWidth = 9;
    c.beginPath(); c.moveTo(lx, -17); c.lineTo(px, py); c.stroke();
    flat(c, px, py, side ? 6.4 : 6.8 + s * 0.9, 4.8, far ? '#e6d2b0' : CR);
  };
  if (side) { leg(-12, 0, true); leg(13, Math.PI, true); } else { leg(-9, 0, false); leg(9, Math.PI, false); }

  // Körper
  if (side) {
    eg(c, 0, -26, 25, 17, LO, MO, DO);
    eg(c, 3, -17, 16, 7, '#fff8e8', CR, '#e7cfa0');
    c.strokeStyle = ORD; c.lineWidth = 4; c.lineCap = 'round'; c.globalAlpha *= 0.8;
    c.beginPath(); c.moveTo(-12, -40); c.lineTo(-10, -32); c.moveTo(-2, -42); c.lineTo(0, -34); c.moveTo(8, -41); c.lineTo(9, -33); c.stroke();
    c.globalAlpha = p.alpha ?? 1;
  } else {
    eg(c, 0, -26, 18, 21, LO, MO, DO);
    if (!back) eg(c, 0, -22, 10, 13, '#fff8e8', CR, '#e7cfa0');
    c.strokeStyle = ORD; c.lineWidth = 4; c.lineCap = 'round'; c.globalAlpha *= 0.8;
    c.beginPath(); c.moveTo(-17, -32); c.lineTo(-10, -30); c.moveTo(-17, -22); c.lineTo(-10, -22); c.moveTo(17, -32); c.lineTo(10, -30); c.moveTo(17, -22); c.lineTo(10, -22); c.stroke();
    c.globalAlpha = p.alpha ?? 1;
  }
  if (back) tail();
  if (side) { leg(-9, Math.PI, false); leg(16, 0, false); } // vordere Beine über dem Körper

  if (acc.includes('mia-halstuch')) poly(c, side ? [[4, -44], [20, -42], [14, -28]] : [[-14, -44], [14, -44], [0, -26]], '#d9534f', '#a63a37');

  // Kopf (wippt leicht gegenläufig)
  const hx = side ? 14 : 0, hy = (side ? -54 : -58) + (moving ? Math.sin(phase * 2) * 1.3 : 0);
  const ex = side ? 1 : 0;
  poly(c, [[hx - 18, hy - 6], [hx - 15, hy - 28], [hx - 2, hy - 14]], MO, ORD);
  poly(c, [[hx + 18 - 2 * ex, hy - 6], [hx + 15 - 2 * ex, hy - 28], [hx + 2, hy - 14]], DO, ORD);
  poly(c, [[hx - 14, hy - 10], [hx - 13, hy - 23], [hx - 5, hy - 14]], PK);
  poly(c, [[hx + 14 - 2 * ex, hy - 10], [hx + 13 - 2 * ex, hy - 23], [hx + 5, hy - 14]], '#e48f8f');
  eg(c, hx, hy, side ? 19 : 22, side ? 16 : 18, LO, MO, DO);
  if (back) {
    c.strokeStyle = ORD; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy - 16); c.lineTo(hx, hy - 6); c.moveTo(hx - 8, hy - 14); c.lineTo(hx - 6, hy - 6); c.moveTo(hx + 8, hy - 14); c.lineTo(hx + 6, hy - 6); c.stroke();
  } else {
    eg(c, hx + (side ? 7 : 0), hy + 7, side ? 10 : 12, 8, '#fffaf0', CR, '#e7cfa0');
    const eyes = side ? [hx + 7] : [hx - 8, hx + 8];
    const blink = Math.sin(t * 0.9) > 0.985;
    eyes.forEach((e) => {
      if (blink) { c.fillStyle = INK; c.fillRect(e - 3, hy - 1, 6, 2); }
      else { flat(c, e, hy - 1, 3.4, 4.4, INK); flat(c, e + 1, hy - 2.6, 1.3, 1.3, '#fff'); }
    });
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
      eyes.forEach((e) => { c.beginPath(); c.roundRect(e - 7, hy - 6, 14, 10, 4); c.fill(); });
      if (!side) c.fillRect(hx - 3, hy - 3, 6, 2.5);
    }
  }
  // Glanzlicht oben links (Rim-Light)
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.arc(hx, hy, (side ? 17 : 20), Math.PI * 1.08, Math.PI * 1.4); c.stroke();

  if (acc.includes('mia-zipfel')) {
    poly(c, [[hx - 18, hy - 12], [hx + 18, hy - 12], [hx + 10, hy - 30], [hx + 24, hy - 42 + wag * 3]], '#d9534f', '#a63a37');
    eg(c, hx, hy - 12, 20, 5, '#fff', '#f4efe6', '#d7ccba');
    eg(c, hx + 24, hy - 42 + wag * 3, 6.5, 6.5, '#fff', '#f4efe6', '#d7ccba');
  } else if (acc.includes('mia-krone')) {
    poly(c, [[hx - 14, hy - 14], [hx - 16, hy - 32], [hx - 7, hy - 24], [hx, hy - 36], [hx + 7, hy - 24], [hx + 16, hy - 32], [hx + 14, hy - 14]], '#f4c430', '#c9971c');
    flat(c, hx, hy - 20, 2.6, 2.6, '#e8504a');
  }
  c.restore();
}
