/** Dev-Testseite (mia-test.html): spielt alle Mia-Animationen nebeneinander ab, hell/dunkel, normal/gespiegelt. */
import '../styles/base.css';
import '../styles/polish.css';
import '../styles/wiese.css';
import atlas from '../../assets/mia/atlas.json';
import report from '../../assets/mia/report.json';
import { createMiaView } from '../ui/miaView';
import { BASE, CELL_H, CELL_W, MiaAnimator, loadMia, portraitImg, type Facing, type Face } from '../world3d/miaAnim';

const frames = atlas.frames as unknown as Record<string, { x: number; y: number; w: number; h: number }>;
const anims = atlas.animations as unknown as Record<string, string[]>;
const fps = atlas.fps as Record<string, number>;
const $ = (id: string) => document.getElementById(id)!;
const spd = $('spd') as HTMLInputElement, grid = $('grid') as HTMLInputElement;
spd.oninput = () => ($('spdv').textContent = spd.value);

type Painter = (ctx: CanvasRenderingContext2D, t: number, dt: number) => void;
const tickers: (() => void)[] = [];

function card(parent: HTMLElement, title: string, paint: Painter) {
  const d = document.createElement('div'); d.className = 'card';
  d.innerHTML = `<h3>${title}</h3><div class="pair"></div>`;
  const pair = d.querySelector('.pair')!;
  const ctxs = ['light', 'dark'].map((c) => {
    const cv = document.createElement('canvas'); cv.width = CELL_W; cv.height = CELL_H; cv.className = c; pair.append(cv);
    return cv.getContext('2d')!;
  });
  parent.append(d);
  let last = performance.now();
  tickers.push(() => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    ctxs.forEach((c, i) => {
      c.clearRect(0, 0, CELL_W, CELL_H);
      paint(c, now / 1000, i === 0 ? dt : 0);
      if (grid.checked) {
        c.save(); c.strokeStyle = 'rgba(255,0,0,.8)'; c.beginPath(); c.moveTo(0, BASE + 0.5); c.lineTo(CELL_W, BASE + 0.5); c.stroke();
        c.strokeStyle = 'rgba(128,128,128,.6)'; c.beginPath(); c.moveTo(CELL_W / 2, 0); c.lineTo(CELL_W / 2, CELL_H); c.stroke(); c.restore();
      }
    });
  });
}

let img: HTMLImageElement;
function drawFrame(c: CanvasRenderingContext2D, name: string, flip: boolean) {
  const f = frames[name];
  c.save();
  if (flip) { c.translate(CELL_W, 0); c.scale(-1, 1); }
  c.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  c.restore();
}

async function main() {
  await loadMia();
  img = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = new URL('../../assets/mia/atlas.png', import.meta.url).href; });
  const raw = $('raw');
  for (const [name, list] of Object.entries(anims)) {
    const rate = fps[name] ?? 4;
    card(raw, `${name} (${list.length}, ${rate} fps)`, (c, t) => drawFrame(c, list[Math.floor(t * rate) % list.length], false));
    if (name === 'walk_right') card(raw, 'walk_left = gespiegelt', (c, t) => drawFrame(c, list[Math.floor(t * rate) % list.length], true));
    if (name === 'idle' || name === 'celebrate') card(raw, `${name} gespiegelt`, (c, t) => drawFrame(c, list[Math.floor(t * rate) % list.length], true));
  }
  // Zustandsautomat
  const sm = $('sm');
  const make = (title: string, dir: Facing, speedFn: () => number, extra?: (a: MiaAnimator) => void) => {
    const a = new MiaAnimator(); extra?.(a);
    card(sm, title, (c, _t, dt) => a.draw(c, dt || 0.016, { dir, speed: speedFn() }));
    return a;
  };
  const s = () => Number(spd.value);
  make('rechts laufen', 'right', s); make('links laufen', 'left', s); make('unten laufen', 'down', s); make('oben laufen', 'up', s);
  make('stehen rechts', 'right', () => 0); make('stehen links', 'left', () => 0); make('stehen unten', 'down', () => 0); make('stehen oben', 'up', () => 0);
  const cel = make('feiern (Knopf)', 'right', () => 0);
  $('cel').onclick = () => cel.celebrate();
  const sleepA = new MiaAnimator(); card(sm, 'schlafen', (c, _t, dt) => sleepA.draw(c, dt || 0.016, { dir: 'right', speed: 0, sleep: true }));
  const carA = new MiaAnimator(); card(sm, 'Auto (Kopf)', (c, _t, dt) => carA.draw(c, dt || 0.016, { dir: 'right', speed: 1, ride: 'car', wind: s() }));
  const rideA = new MiaAnimator(); card(sm, 'Roller/Rad', (c, _t, dt) => rideA.draw(c, dt || 0.016, { dir: 'right', speed: s(), ride: 'scooter', wind: s() }));
  // Übergang: laufen → stehen → laufen (Überblendung)
  const trA = new MiaAnimator(); card(sm, 'Übergang laufen ↔ stehen', (c, t, dt) => trA.draw(c, dt || 0.016, { dir: 'right', speed: Math.floor(t / 2) % 2 ? 0 : 0.8 }));
  const trB = new MiaAnimator(); card(sm, 'Übergang rechts → unten → links', (c, t, dt) => trB.draw(c, dt || 0.016, { dir: (['right', 'down', 'left', 'up'] as Facing[])[Math.floor(t / 1.5) % 4], speed: 0.8 }));

  // Aufgaben-Ansicht (wie im Spiel): Ausdrücke wechseln
  const view = createMiaView({ height: 160 });
  const box = document.createElement('div'); box.className = 'card'; box.style.padding = '40px 60px 8px'; box.innerHTML = '<h3 style="margin:-40px -60px 10px">Aufgaben-Ansicht (shell)</h3>';
  box.append(view.el); const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap';
  for (const f of ['neutral', 'happy', 'think', 'sad', 'surprised'] as Face[]) { const b = document.createElement('button'); b.textContent = f; b.onclick = () => view.setFace(f); btns.append(b); }
  box.append(btns); sm.append(box);
  // Porträts
  for (const f of ['neutral', 'happy', 'think', 'surprised', 'sad'] as Face[]) {
    const p = portraitImg(f)!;
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<h3>${f}</h3><div class="pair"><img class="light" style="width:50%" src="${p.src}"><img class="dark" style="width:50%" src="${p.src}"></div>`;
    $('por').append(d);
  }
  // Messwerte
  const rows = Object.entries(report.frames as Record<string, { size: number[]; iris: number; edge_px: number; bright_edge_px: number; bottom: number; jump: number }>)
    .map(([n, v]) => {
      const bad = v.bright_edge_px > 40 || (v.bottom !== BASE && v.jump === 0);
      return `<tr class="${bad ? 'bad' : ''}"><td>${n}</td><td>${v.size.join('×')}</td><td>${v.iris}</td><td>${v.edge_px}</td><td>${v.bright_edge_px}</td><td>${v.bottom}</td><td>${v.jump}</td></tr>`;
    }).join('');
  $('rep').innerHTML = `<table><tr><th>Frame</th><th>Größe</th><th>Iris px</th><th>Kantenpixel</th><th>helle Kantenpixel</th><th>Unterkante (Soll ${BASE})</th><th>Sprunghöhe</th></tr>${rows}</table>`;
  const loop = () => { tickers.forEach((t) => t()); requestAnimationFrame(loop); };
  loop();
}
void main();
