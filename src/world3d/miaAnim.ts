/**
 * Mia aus den gezeichneten Grafiken (assets/mia, erzeugt von tools/mia_assets.py).
 * Ein Animator wählt je Zustand das passende Bild und malt es in einen Canvas:
 *   rechts = walk_right · links = walk_right gespiegelt · unten = walk_down · oben = walk_up
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
      if (inp.dir === 'down') return { group: 'walkdown', d: { ...base, name: `walk_down_${Math.floor(this.walkT) % 6}` } };
      if (inp.dir === 'up') return { group: 'walkup', d: { ...base, name: `walk_up_${Math.floor(this.walkT) % 6}` } };
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
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CELL_W / 2 + d.ox, BASE + d.oy);
    ctx.rotate(d.rot);
    ctx.scale(d.flip ? -d.sx : d.sx, d.sy);
    ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, -CELL_W / 2, -BASE, f.w, f.h);
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
