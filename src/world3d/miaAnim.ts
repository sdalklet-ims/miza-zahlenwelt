/**
 * Mia aus den gezeichneten Grafiken (assets/mia, erzeugt von tools/mia_assets.py).
 * Ein Animator wählt je Zustand das passende Bild und malt es in einen Canvas:
 *   rechts = walk_right · links = walk_right gespiegelt · unten = front_idle (wippt, neigt sich) · oben = back_idle (wippt)
 *   Stehen = idle (mit Blinzeln und Schwanzwippen aus den Pose-Bildern) · Feiern = celebrate · Schlafen = geduckt mit Z-Zeichen
 * Beim Wechsel zwischen Animationen wird 0,14 s übergeblendet. Alle Bilder haben denselben Maßstab, mittigen Schwerpunkt und gleiche Bodenlinie,
 * deshalb gibt es keine Positionssprünge.
 */
import atlas from '../../assets/mia/atlas.json';
import atlasUrl from '../../assets/mia/atlas.png';

export const CELL_W: number = atlas.cell.w;
export const CELL_H: number = atlas.cell.h;
export const BASE: number = atlas.baseline;

export type Face = 'neutral' | 'happy' | 'think' | 'surprised' | 'sad';
export type Facing = 'left' | 'right' | 'up' | 'down';
export type RideKind = 'bike' | 'scooter' | 'car';

const portraitUrls: Record<Face, string> = {
  neutral: new URL('../../assets/mia/portraits/portrait_neutral.png', import.meta.url).href,
  happy: new URL('../../assets/mia/portraits/portrait_happy.png', import.meta.url).href,
  think: new URL('../../assets/mia/portraits/portrait_think.png', import.meta.url).href,
  surprised: new URL('../../assets/mia/portraits/portrait_surprised.png', import.meta.url).href,
  sad: new URL('../../assets/mia/portraits/portrait_sad.png', import.meta.url).href,
};

type FrameDef = { x: number; y: number; w: number; h: number };
const frames = atlas.frames as unknown as Record<string, FrameDef>;

let atlasImg: HTMLImageElement | null = null;
const portraits: Partial<Record<Face, HTMLImageElement>> = {};
let loading: Promise<void> | null = null;

const loadImg = (src: string) => new Promise<HTMLImageElement>((res) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => res(im);
  im.src = src;
});

/** Lädt Atlas und Porträts (einmal). */
export function loadMia(): Promise<void> {
  loading ??= (async () => {
    const [a, ...ps] = await Promise.all([loadImg(atlasUrl), ...(Object.keys(portraitUrls) as Face[]).map((k) => loadImg(portraitUrls[k]))]);
    atlasImg = a;
    (Object.keys(portraitUrls) as Face[]).forEach((k, i) => (portraits[k] = ps[i]));
  })();
  return loading;
}
void loadMia();
export const miaLoaded = () => !!atlasImg;
export const portraitImg = (f: Face) => portraits[f] ?? null;

/** Dauer (s) der Ruhebilder: überwiegend Bild 0, dazwischen Schwanz-/Ohrenwechsel, Blinzeln (Bild 2) und kurzes Pfötchen (Bild 4) */
const IDLE_SEQ: [number, number][] = [[0, 2.3], [1, 0.32], [0, 1.4], [3, 0.3], [1, 0.3], [0, 2.0], [2, 0.16], [0, 1.6], [3, 0.3], [4, 0.45], [0, 1.2], [2, 0.16]];
const IDLE_LEN = IDLE_SEQ.reduce((s, x) => s + x[1], 0);
const idleFrame = (t: number) => {
  let k = t % IDLE_LEN;
  for (const [f, d] of IDLE_SEQ) { if (k < d) return f; k -= d; }
  return 0;
};

export interface AnimInput {
  /** Blickrichtung (Bewegungsrichtung; schräg zählt nach der horizontalen Komponente) */
  dir: Facing;
  /** Tempo 0..1 (1 = normales Laufen; im Fahrzeug auch mehr) */
  speed: number;
  sleep?: boolean;
  ride?: RideKind;
  /** Fahrtwind 0..1 (nur Fahrzeuge) */
  wind?: number;
}

interface Draw { name: string; flip: boolean; ox: number; oy: number; rot: number; sx: number; sy: number; /** Schritt-Phase (rad) für die Vorder-/Rückansicht: Pfoten heben abwechselnd */ step?: number; amp?: number }

/** Für Vorder-/Rückansicht gibt es kein Laufbild: das Standbild wird in Oberkörper und zwei Pfotenhälften zerlegt (nur Ausschnitte, nichts neu gezeichnet). */
interface Legs { cutY: number; cutX: number }
const legCache: Record<string, Legs> = {};
function legsOf(name: string): Legs | null {
  if (legCache[name]) return legCache[name];
  const f = frames[name];
  if (!f || !atlasImg) return null;
  const cv = document.createElement('canvas'); cv.width = f.w; cv.height = f.h;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(atlasImg, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const d = c.getImageData(0, 0, f.w, f.h).data;
  let top = f.h, bottom = 0;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x += 2) if (d[(y * f.w + x) * 4 + 3] > 40) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const cutY = Math.round(bottom - (bottom - top) * 0.2);
  // senkrechter Schnitt: Spalte mit den wenigsten sichtbaren Pixeln im Pfotenbereich nahe der Mitte
  let best = Math.round(f.w / 2), bestN = 1e9;
  for (let x = Math.round(f.w * 0.38); x <= Math.round(f.w * 0.62); x++) {
    let n = 0;
    for (let y = cutY; y <= bottom; y++) if (d[(y * f.w + x) * 4 + 3] > 40) n++;
    if (n < bestN) { bestN = n; best = x; }
  }
  return (legCache[name] = { cutY, cutX: best });
}
interface Layer { group: string; d: Draw }

export class MiaAnimator {
  private t = 0;
  private walkT = 0;
  private bobT = 0;
  private celebT = -1;
  private side: 'left' | 'right' = 'right';
  private cur: Layer | null = null;
  private prev: Layer | null = null;
  private fade = 1;
  private idleT = 0;

  /** Feier-Animation (zweimal celebrate) starten */
  celebrate() { this.celebT = 0; }
  get celebrating() { return this.celebT >= 0; }

  private decide(inp: AnimInput): Layer {
    if (inp.dir === 'left' || inp.dir === 'right') this.side = inp.dir;
    const flip = this.side === 'left';
    const moving = inp.speed > 0.05;
    const bob = Math.abs(Math.sin(this.bobT)), sway = Math.sin(this.bobT);
    const base: Draw = { name: 'idle_0', flip, ox: 0, oy: 0, rot: 0, sx: 1, sy: 1 };
    if (inp.sleep) {
      const br = Math.sin(this.t * 1.6) * 0.012;
      return { group: 'sleep', d: { ...base, name: 'sneak_2', flip, sy: 0.96 + br, sx: 1.02 - br, oy: 0 } };
    }
    if (this.celebT >= 0) {
      const f = Math.min(4, Math.floor((this.celebT * 9) % 5));
      return { group: 'celebrate', d: { ...base, name: `celebrate_${f}`, flip } };
    }
    if (inp.ride === 'car') return { group: 'car', d: { ...base, name: 'front_idle', oy: 0, ox: 0 } };
    if (inp.ride) {
      const tilt = (flip ? -1 : 1) * (inp.ride === 'bike' ? 0.05 : 0.04 + (inp.wind ?? 0) * 0.05);
      if (inp.dir === 'up') return { group: 'back', d: { ...base, name: 'back_idle', rot: sway * 0.02 } };
      if (inp.dir === 'down') return { group: 'front', d: { ...base, name: 'front_idle', rot: sway * 0.02 } };
      return { group: 'ride', d: { ...base, name: 'idle_' + (inp.ride === 'bike' ? 0 : 3), rot: tilt, oy: -bob * 2 * Math.min(1, inp.speed) } };
    }
    if (moving) {
      const amp = Math.min(1, inp.speed + 0.3);
      if (inp.dir === 'down') return { group: 'front', d: { ...base, name: 'front_idle', step: this.bobT, amp, rot: sway * 0.04 } };
      if (inp.dir === 'up') return { group: 'back', d: { ...base, name: 'back_idle', step: this.bobT, amp, rot: sway * 0.04 } };
      return { group: 'walk', d: { ...base, name: `walk_right_${Math.floor(this.walkT) % 6}` } };
    }
    // Stehen
    if (inp.dir === 'down') return { group: 'front', d: { ...base, name: 'front_idle', sy: 1 + Math.sin(this.t * 2.2) * 0.012, rot: Math.sin(this.t * 0.9) * 0.015 } };
    if (inp.dir === 'up') return { group: 'back', d: { ...base, name: 'back_idle', sy: 1 + Math.sin(this.t * 2.2) * 0.012 } };
    return { group: 'idle', d: { ...base, name: `idle_${idleFrame(this.idleT)}` } };
  }

  /** Zeit voranschreiten, Zustand wählen, in ctx (Größe CELL_W×CELL_H) zeichnen. */
  draw(ctx: CanvasRenderingContext2D, dt: number, inp: AnimInput): void {
    dt = Math.min(0.1, Math.max(0, dt));
    this.t += dt;
    const moving = inp.speed > 0.05;
    if (moving) { this.walkT += dt * (4 + 10 * Math.min(1.3, inp.speed)); this.bobT += dt * (6 + 11 * Math.min(1.3, inp.speed)); this.idleT = 0; }
    else { this.idleT += dt; this.bobT = Math.round(this.bobT / Math.PI) * Math.PI; if (!inp.sleep) this.walkT = 0; }
    if (this.celebT >= 0) { this.celebT += dt; if (this.celebT > 1.15) this.celebT = -1; }
    const next = this.decide(inp);
    if (!this.cur) this.cur = next;
    else if (next.group !== this.cur.group || next.d.flip !== this.cur.d.flip) {
      this.prev = this.cur; this.cur = next; this.fade = 0;
    } else this.cur = next;
    this.fade = Math.min(1, this.fade + dt / 0.14);

    ctx.clearRect(0, 0, CELL_W, CELL_H);
    if (!atlasImg) return;
    if (this.prev && this.fade < 1) this.paint(ctx, this.prev.d, 1 - this.fade);
    this.paint(ctx, this.cur.d, this.prev && this.fade < 1 ? this.fade : 1);
    if (this.cur.group === 'sleep') this.zzz(ctx);
    else if (this.cur.group === 'car') this.carHead(ctx, inp);
  }

  private paint(ctx: CanvasRenderingContext2D, d: Draw, alpha: number) {
    const f = frames[d.name];
    if (!f || !atlasImg) return;
    if (d.step !== undefined) { const lg = legsOf(d.name); if (lg) return this.paintStep(ctx, d, f, lg, alpha); }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CELL_W / 2 + d.ox, BASE + d.oy);
    ctx.rotate(d.rot);
    ctx.scale(d.flip ? -d.sx : d.sx, d.sy);
    ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, -CELL_W / 2, -BASE, f.w, f.h);
    ctx.restore();
  }

  private paintStep(ctx: CanvasRenderingContext2D, d: Draw, f: FrameDef, lg: Legs, alpha: number) {
    const p = d.step!, A = 15 * (d.amp ?? 1);
    const liftL = Math.max(0, Math.sin(p)) * A, liftR = Math.max(0, -Math.sin(p)) * A;
    const bounce = Math.abs(Math.cos(p)) * 7 * (d.amp ?? 1); // Körper federt mit jedem Schritt
    const img = atlasImg!;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CELL_W / 2, BASE);
    // Pfoten: linke und rechte Hälfte heben abwechselnd
    const lw = lg.cutX, rw = f.w - lg.cutX, lh = f.h - lg.cutY;
    ctx.drawImage(img, f.x, f.y + lg.cutY, lw, lh, -CELL_W / 2, -BASE + lg.cutY - liftL, lw, lh);
    ctx.drawImage(img, f.x + lg.cutX, f.y + lg.cutY, rw, lh, -CELL_W / 2 + lg.cutX, -BASE + lg.cutY - liftR, rw, lh);
    // Oberkörper (überlappt den Schnitt um 5 px), wiegt sich zur Seite des angehobenen Beins
    ctx.translate(0, -bounce * 0.4);
    ctx.rotate(d.rot + Math.sin(p) * 0.035);
    ctx.drawImage(img, f.x, f.y, f.w, lg.cutY + 5, -CELL_W / 2, -BASE, f.w, lg.cutY + 5);
    ctx.restore();
  }

  /** Im Auto: nur Kopf und Halstuch (fröhliches Porträt), Ohren flattern im Fahrtwind */
  private carHead(ctx: CanvasRenderingContext2D, inp: AnimInput) {
    ctx.clearRect(0, 0, CELL_W, CELL_H);
    const p = portraits[inp.speed > 0.4 ? 'happy' : 'neutral'];
    if (!p || !p.naturalWidth) return;
    const s = 0.9, w = p.naturalWidth * s, h = p.naturalHeight * s;
    const wind = inp.wind ?? 0;
    ctx.save();
    ctx.translate(CELL_W / 2 + Math.sin(this.t * 24) * 1.5 * wind, CELL_H - 18 + Math.sin(this.t * 2.3) * 1.5 - Math.abs(Math.sin(this.t * 19)) * 3 * wind);
    ctx.rotate(Math.sin(this.t * 1.4) * 0.03 + (this.side === 'left' ? -1 : 1) * wind * 0.04);
    ctx.drawImage(p, -w / 2, -h, w, h);
    ctx.restore();
  }

  private zzz(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = '900 34px "Baloo 2", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const k = (this.t * 0.6 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      const x = CELL_W * 0.62 + k * 36, y = CELL_H * 0.42 - k * 64, sz = 0.7 + i * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.scale(sz, sz); ctx.strokeText('z', 0, 0); ctx.fillText('z', 0, 0); ctx.restore();
    }
    ctx.restore();
  }
}

/** Bildname einer Pose für Standbilder (z. B. Startseite) */
export function drawStill(ctx: CanvasRenderingContext2D, name: string, flip = false) {
  const f = frames[name];
  if (!f || !atlasImg) return;
  ctx.clearRect(0, 0, CELL_W, CELL_H);
  ctx.save();
  if (flip) { ctx.translate(CELL_W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  ctx.restore();
}
