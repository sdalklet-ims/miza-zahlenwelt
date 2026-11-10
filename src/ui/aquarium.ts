/**
 * Aquarium-Ansicht (Zoom): Das Becken groß, mit den gekauften Fischen, Schnecken und Garnelen, die darin schwimmen, kriechen und hüpfen.
 * Füttern: Flocken sinken, hungrige Tiere schwimmen hin und fressen. Antippen eines Tieres zeigt den Namen.
 * Alles wird per Canvas gezeichnet (Comic-Look, dunkle Kontur) und läuft, solange das Fenster offen ist.
 */
import { h } from '../core/dom';
import { openModal } from './modal';
import { aquaCount, aquaFullness, aquaTotal, feedAqua, fishFood, species } from '../core/aquarium';
import { onProgress } from '../core/progress';
import type { AquaSpecies } from '../core/texts';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

const W = 880, H = 470, K = 1.5;
const SAND = H - 64;
const INK = 'rgba(58,36,18,.75)';

interface Critter { sp: AquaSpecies; x: number; y: number; vx: number; vy: number; tx: number; ty: number; wait: number; face: number; ph: number; hop: number; eaten: number }
interface Flake { x: number; y: number; vy: number; age: number }
interface Bubble { x: number; y: number; r: number; vy: number; ph: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function build(): Critter[] {
  const out: Critter[] = [];
  for (const sp of species) for (let i = 0; i < aquaCount(sp.id); i++) {
    const x = rnd(80, W - 80);
    const y = sp.kind === 'fish' ? rnd(70, SAND - 80) : SAND - 8;
    out.push({ sp, x, y, vx: 0, vy: 0, tx: x, ty: y, wait: rnd(0, 2), face: Math.random() < 0.5 ? 1 : -1, ph: rnd(0, 6.28), hop: 0, eaten: 0 });
  }
  return out;
}

/* ───────── Zeichnen der Tiere (Blick nach rechts, Ursprung in der Mitte) ───────── */
function path(c: CanvasRenderingContext2D, fill: string | CanvasGradient, stroke = true) {
  c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = INK; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke(); }
}

function eye(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath(); c.arc(x, y, r, 0, 7); path(c, '#fff');
  c.beginPath(); c.arc(x + r * 0.25, y, r * 0.55, 0, 7); c.fillStyle = '#20150c'; c.fill();
  c.beginPath(); c.arc(x + r * 0.45, y - r * 0.25, r * 0.2, 0, 7); c.fillStyle = '#fff'; c.fill();
}

function drawFish(c: CanvasRenderingContext2D, sp: AquaSpecies, t: number, ph: number, hungry: boolean) {
  const u = 34 * sp.size, wag = Math.sin(t * (hungry ? 5 : 8) + ph) * 0.4;
  const col = hungry ? shade(sp.color, -0.12) : sp.color;
  const g = c.createLinearGradient(0, -u * 0.6, 0, u * 0.6);
  g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.2));
  const tail = (len: number, spread: number, col2: string) => {
    c.save(); c.translate(-u * 0.85, 0); c.rotate(wag);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-len * 0.6, -spread, -len, -spread * 1.15); c.quadraticCurveTo(-len * 0.75, 0, -len, spread * 1.15); c.quadraticCurveTo(-len * 0.6, spread, 0, 0);
    path(c, col2); c.restore();
  };
  switch (sp.shape) {
    case 'angel': {
      // hohe Segelform: Rücken- und Bauchflosse als lange Spitzen
      c.beginPath(); c.moveTo(-u * 0.2, -u * 0.3); c.quadraticCurveTo(u * 0.1, -u * 1.9, u * 0.45, -u * 0.35); path(c, shade(sp.color2, 0.2));
      c.beginPath(); c.moveTo(-u * 0.2, u * 0.3); c.quadraticCurveTo(u * 0.05, u * 1.8, u * 0.4, u * 0.3); path(c, shade(sp.color2, 0.2));
      tail(u * 0.9, u * 0.55, shade(sp.color, -0.05));
      c.beginPath(); c.ellipse(0, 0, u * 0.85, u * 0.55, 0, 0, 7); path(c, g);
      c.save(); c.clip(); c.fillStyle = sp.color2; for (const x of [-0.25, 0.15, 0.5]) c.fillRect(u * x - 3, -u * 0.6, 6, u * 1.2); c.restore();
      c.beginPath(); c.ellipse(0, 0, u * 0.85, u * 0.55, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke();
      eye(c, u * 0.5, -u * 0.1, u * 0.14); break;
    }
    case 'betta': {
      tail(u * 1.5, u * 0.95, sp.color2);
      c.beginPath(); c.moveTo(-u * 0.3, -u * 0.35); c.quadraticCurveTo(-u * 0.1, -u * 1.1, u * 0.3, -u * 0.35); path(c, sp.color2);
      c.beginPath(); c.moveTo(-u * 0.2, u * 0.35); c.quadraticCurveTo(0, u * 1.0, u * 0.3, u * 0.35); path(c, sp.color2);
      c.beginPath(); c.ellipse(0, 0, u * 0.85, u * 0.42, 0, 0, 7); path(c, g);
      eye(c, u * 0.5, -u * 0.08, u * 0.13); break;
    }
    case 'guppy': {
      tail(u * 1.25, u * 0.7, sp.color2);
      c.beginPath(); c.ellipse(0, 0, u * 0.85, u * 0.36, 0, 0, 7); path(c, g);
      c.beginPath(); c.moveTo(-u * 0.1, -u * 0.3); c.quadraticCurveTo(0, -u * 0.8, u * 0.25, -u * 0.3); path(c, shade(sp.color, 0.2));
      eye(c, u * 0.5, -u * 0.06, u * 0.13); break;
    }
    case 'neon': {
      tail(u * 0.75, u * 0.35, shade(sp.color, 0.4));
      c.beginPath(); c.ellipse(0, 0, u * 0.95, u * 0.33, 0, 0, 7); path(c, '#cfe6f5');
      c.save(); c.clip();
      c.fillStyle = sp.color; c.fillRect(-u, -u * 0.12, u * 2, u * 0.12);
      c.fillStyle = sp.color2; c.fillRect(-u, u * 0.05, u * 1.0, u * 0.3);
      c.restore();
      c.beginPath(); c.ellipse(0, 0, u * 0.95, u * 0.33, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      eye(c, u * 0.6, -u * 0.04, u * 0.12); break;
    }
    default: { // Goldfisch
      tail(u * 1.1, u * 0.8, shade(sp.color, 0.15));
      c.beginPath(); c.moveTo(-u * 0.3, -u * 0.5); c.quadraticCurveTo(u * 0.1, -u * 1.0, u * 0.45, -u * 0.48); path(c, shade(sp.color, 0.1));
      c.beginPath(); c.ellipse(0, 0, u * 0.85, u * 0.6, 0, 0, 7); path(c, g);
      c.beginPath(); c.ellipse(u * 0.05, u * 0.18, u * 0.55, u * 0.28, 0, 0, 7); c.fillStyle = sp.color2; c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
      c.beginPath(); c.ellipse(-u * 0.1, 0.05 * u, u * 0.25, u * 0.2, 0.3, 0, 7); c.strokeStyle = 'rgba(58,36,18,.45)'; c.lineWidth = 1.6; c.stroke();
      eye(c, u * 0.52, -u * 0.12, u * 0.15);
    }
  }
  // Mund
  c.beginPath(); c.arc(u * (sp.shape === 'neon' ? 0.92 : 0.8), u * 0.06, 2, 0, 7); c.fillStyle = INK; c.fill();
}

function drawCory(c: CanvasRenderingContext2D, sp: AquaSpecies, t: number, ph: number) {
  const u = 30 * sp.size, wag = Math.sin(t * 9 + ph) * 0.15;
  c.save(); c.translate(-u * 0.9, 0); c.rotate(wag); c.beginPath(); c.moveTo(0, 0); c.lineTo(-u * 0.6, -u * 0.35); c.lineTo(-u * 0.6, u * 0.35); c.closePath(); path(c, shade(sp.color, -0.1)); c.restore();
  c.beginPath(); c.moveTo(-u * 0.2, -u * 0.35); c.lineTo(u * 0.1, -u * 0.8); c.lineTo(u * 0.3, -u * 0.3); path(c, shade(sp.color, 0.1));
  c.beginPath(); c.ellipse(0, 0, u * 0.9, u * 0.45, 0, 0, 7); path(c, sp.color);
  c.beginPath(); c.ellipse(u * 0.05, u * 0.12, u * 0.7, u * 0.25, 0, 0, 7); c.fillStyle = sp.color2; c.globalAlpha = 0.7; c.fill(); c.globalAlpha = 1;
  for (const [x, y] of [[-0.4, -0.15], [-0.1, -0.2], [0.2, -0.15], [-0.25, 0.0]]) { c.beginPath(); c.arc(u * x, u * y, u * 0.07, 0, 7); c.fillStyle = 'rgba(58,36,18,.5)'; c.fill(); }
  c.beginPath(); c.moveTo(u * 0.9, u * 0.1); c.lineTo(u * 1.1, u * 0.28); c.moveTo(u * 0.9, u * 0.15); c.lineTo(u * 1.05, u * 0.4); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  eye(c, u * 0.55, -u * 0.12, u * 0.14);
}

function drawSnail(c: CanvasRenderingContext2D, sp: AquaSpecies, t: number, ph: number) {
  const u = 30 * sp.size;
  c.beginPath(); c.ellipse(u * 0.1, 0, u * 1.0, u * 0.3, 0, 0, 7); path(c, '#cdb98a');
  c.beginPath(); c.moveTo(u * 0.9, -u * 0.1); c.lineTo(u * 1.1, -u * 0.8 + Math.sin(t * 2 + ph) * 3); c.moveTo(u * 0.7, -u * 0.12); c.lineTo(u * 0.8, -u * 0.8 + Math.sin(t * 2.3 + ph) * 3); c.strokeStyle = '#a9946a'; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
  for (const dx of [1.1, 0.8]) { c.beginPath(); c.arc(u * dx, -u * 0.85 + Math.sin(t * 2 + ph + dx) * 3, 3.5, 0, 7); c.fillStyle = '#20150c'; c.fill(); }
  c.beginPath(); c.arc(-u * 0.1, -u * 0.55, u * 0.75, 0, 7); path(c, sp.color);
  c.beginPath(); c.arc(-u * 0.1, -u * 0.55, u * 0.5, 0.4, 5.3); c.strokeStyle = sp.color2; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(-u * 0.05, -u * 0.55, u * 0.22, 0.8, 5.9); c.stroke();
}

function drawShrimp(c: CanvasRenderingContext2D, sp: AquaSpecies, t: number, ph: number, hopping: boolean) {
  const u = 26 * sp.size;
  c.save();
  c.globalAlpha = 0.92;
  // Schwanzfächer + gebogener Körper
  c.beginPath(); c.moveTo(-u * 1.2, u * 0.15); c.quadraticCurveTo(-u * 1.6, -u * 0.2, -u * 1.45, -u * 0.6); c.quadraticCurveTo(-u * 1.2, -u * 0.35, -u * 1.0, -u * 0.1); path(c, shade(sp.color, 0.2));
  c.beginPath(); c.moveTo(-u * 1.0, 0); c.quadraticCurveTo(-u * 0.4, -u * 0.8, u * 0.4, -u * 0.4); c.quadraticCurveTo(u * 0.8, -u * 0.15, u * 0.7, u * 0.15); c.quadraticCurveTo(0, u * 0.35, -u * 1.0, u * 0.2); c.closePath(); path(c, sp.color);
  c.beginPath(); c.moveTo(-u * 0.5, -u * 0.35); c.lineTo(-u * 0.5, u * 0.05); c.moveTo(-u * 0.1, -u * 0.4); c.lineTo(-u * 0.1, u * 0.1); c.strokeStyle = sp.color2; c.lineWidth = 2; c.stroke();
  // Beinchen
  c.strokeStyle = INK; c.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) { const x = -u * 0.5 + i * u * 0.35, w = hopping ? 0 : Math.sin(t * 10 + i * 1.3 + ph) * 2.5; c.beginPath(); c.moveTo(x, u * 0.2); c.lineTo(x + w, u * 0.55); c.stroke(); }
  // Fühler
  c.beginPath(); c.moveTo(u * 0.7, -u * 0.05); c.quadraticCurveTo(u * 1.3, -u * 0.6 + Math.sin(t * 3 + ph) * 3, u * 1.7, -u * 0.3); c.moveTo(u * 0.7, 0); c.quadraticCurveTo(u * 1.2, -u * 0.1 + Math.sin(t * 3.5 + ph) * 3, u * 1.5, u * 0.15); c.stroke();
  c.beginPath(); c.arc(u * 0.55, -u * 0.12, 2.6, 0, 7); c.fillStyle = '#20150c'; c.fill();
  c.restore();
}

function plant(c: CanvasRenderingContext2D, x: number, hgt: number, col: string, t: number, k = 1) {
  c.save();
  c.lineCap = 'round';
  for (let b = 0; b < 3; b++) {
    const bx = x + (b - 1) * 11 * k, hh = hgt * (0.7 + b * 0.18 - (b === 2 ? 0.1 : 0));
    c.beginPath(); c.moveTo(bx, SAND + 6);
    const sway = (s: number) => Math.sin(t * 1.1 + x * 0.03 + b + s * 2) * 12 * s;
    c.bezierCurveTo(bx + sway(0.3), SAND - hh * 0.3, bx + sway(0.7), SAND - hh * 0.65, bx + sway(1), SAND - hh);
    c.strokeStyle = shade(col, -0.35); c.lineWidth = 12; c.stroke();
    c.strokeStyle = col; c.lineWidth = 8; c.stroke();
  }
  c.restore();
}

export function openAquarium() {
  const cv = h('canvas', { class: 'aq-canvas', width: W * K, height: H * K }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d')!;
  const status = h('div', { class: 'aq-status' });
  const chips = h('div', { class: 'aq-chips' });
  const feedBtn = h('button', { class: 'btn sun aq-feed' });
  const body = h('div', { class: 'aq' }, h('div', { class: 'aq-frame' }, cv), h('div', { class: 'aq-bar' }, status, feedBtn), chips);
  let critters = build();
  const flakes: Flake[] = [];
  const bubbles: Bubble[] = [];
  let tag: { c: Critter; t: number } | null = null;
  let t0 = performance.now(), last = t0, bubT = 0, alive = true;

  function refresh() {
    const total = aquaTotal(), full = aquaFullness(), food = fishFood();
    const hungry = total > 0 && full < 30;
    status.replaceChildren(
      h('div', { class: 'aq-state' }, total === 0 ? 'Das Becken ist noch leer.' : hungry ? '😋 Die Tiere haben Hunger!' : full < 60 ? '🙂 Die Tiere könnten etwas Futter vertragen' : '😊 Alle sind satt und munter'),
      h('div', { class: 'pet-bar ' + (hungry ? 'hungry' : full < 60 ? 'ok' : 'happy') }, h('i', { style: { width: Math.round(full) + '%' } })));
    feedBtn.textContent = `🍽️ Füttern  (Vorrat ${food})`;
    const chipEls = species.filter((s) => aquaCount(s.id) > 0).map((s) => h('span', { class: 'aq-chip' }, `${aquaCount(s.id)}× ${s.name}`));
    if (total === 0) chipEls.push(h('span', { class: 'aq-chip empty' }, 'Fische, Schnecken und Garnelen gibt es im Supermarkt (Gang Aquarium).'));
    chips.replaceChildren(...chipEls);
  }
  feedBtn.onclick = () => {
    const r = feedAqua();
    if (r === 'empty') speak('aqua.nofish');
    else if (r === 'nofood') speak('aqua.nofood');
    else if (r === 'full') speak('aqua.full.fed');
    else { speak('aqua.fed'); sfx.munch(); for (let i = 0; i < 18; i++) flakes.push({ x: rnd(120, W - 120), y: rnd(20, 60), vy: rnd(14, 26), age: 0 }); }
    refresh();
  };
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    let best: Critter | null = null, bd = 60;
    for (const c of critters) { const d = Math.hypot(c.x - px, c.y - py); if (d < bd) { bd = d; best = c; } }
    if (best) { tag = { c: best, t: 2.4 }; sfx.pop(); }
  });
  refresh();
  const off = onProgress(() => { critters = build(); refresh(); });
  openModal({ title: '🐠 Aquarium', wide: true, onClose: () => { alive = false; off(); }, content: body });
  if (aquaTotal() === 0) speak('aqua.nofish');

  const frame = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    const hungry = aquaTotal() > 0 && aquaFullness() < 30;
    update(dt, hungry);
    draw(t, hungry);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  function update(dt: number, hungry: boolean) {
    bubT -= dt;
    if (bubT <= 0) { bubT = rnd(0.12, 0.3); bubbles.push({ x: 90 + rnd(-4, 4), y: SAND - 6, r: rnd(2, 6), vy: rnd(50, 90), ph: rnd(0, 6) }); }
    for (const b of bubbles) { b.y -= b.vy * dt; b.x += Math.sin(b.ph + b.y * 0.05) * 14 * dt; }
    while (bubbles.length && bubbles[0].y < 24) bubbles.shift();
    for (const f of flakes) { f.age += dt; f.y = Math.min(SAND - 4, f.y + f.vy * dt); f.x += Math.sin(f.age * 2 + f.x) * 8 * dt; }
    for (let i = flakes.length - 1; i >= 0; i--) if (flakes[i].age > 14) flakes.splice(i, 1);
    if (tag) { tag.t -= dt; if (tag.t <= 0) tag = null; }
    const leader = critters.find((c) => c.sp.school);
    for (const c of critters) {
      const sp = c.sp, sp0 = sp.speed * 46 * (hungry ? 0.65 : 1);
      c.wait -= dt;
      if (sp.kind === 'fish') {
        // Futter in der Nähe? Dann hin und fressen
        let fl: Flake | null = null, fd = 280;
        for (const f of flakes) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < fd) { fd = d; fl = f; } }
        if (fl) { c.tx = fl.x; c.ty = fl.y; if (fd < 16 * sp.size + 8) { flakes.splice(flakes.indexOf(fl), 1); c.eaten++; bubbles.push({ x: c.x + c.face * 20, y: c.y, r: 3, vy: 40, ph: 0 }); } }
        else if (c.wait <= 0) {
          c.wait = rnd(1.5, 4.5);
          if (sp.school && leader && leader !== c) { c.tx = leader.x + rnd(-70, 70); c.ty = leader.y + rnd(-40, 40); }
          else { c.tx = rnd(60, W - 60); c.ty = rnd(60, SAND - 70); }
        }
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy) || 1;
        const sp1 = fl ? sp0 * 1.9 : d > 20 ? sp0 : sp0 * 0.25;
        c.vx += ((dx / d) * sp1 - c.vx) * Math.min(1, dt * 1.8);
        c.vy += ((dy / d) * sp1 * 0.7 - c.vy) * Math.min(1, dt * 1.8);
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.y = Math.max(46, Math.min(SAND - 40, c.y));
        if (Math.abs(c.vx) > 6) c.face += ((c.vx > 0 ? 1 : -1) - c.face) * Math.min(1, dt * 6);
      } else {
        // Bodenbewohner: gehen ab und zu ein Stück
        if (sp.kind === 'shrimp' && c.hop > 0) {
          c.hop -= dt * 1.8;
          c.x += c.face * 90 * dt;
          if (c.hop <= 0) { c.hop = 0; c.wait = rnd(0.8, 3); }
        } else if (c.wait <= 0) {
          c.wait = rnd(1.5, 5);
          c.tx = Math.max(60, Math.min(W - 60, c.x + rnd(-220, 220)));
          if (sp.kind === 'shrimp') { c.face = Math.sign(c.tx - c.x) || 1; c.hop = 1; }
        }
        // Futterkrümel am Boden anlocken
        const fl = flakes.find((f) => f.y > SAND - 20 && Math.abs(f.x - c.x) < 220);
        if (fl) { c.tx = fl.x; if (Math.abs(fl.x - c.x) < 14) flakes.splice(flakes.indexOf(fl), 1); }
        if (sp.kind !== 'shrimp' || c.hop <= 0) {
          const dx = c.tx - c.x;
          if (Math.abs(dx) > 4) { c.x += Math.sign(dx) * sp.speed * (sp.kind === 'bottom' ? 55 : 14) * (hungry ? 0.7 : 1) * dt; c.face += (Math.sign(dx) - c.face) * Math.min(1, dt * 5); }
        }
      }
    }
  }

  function draw(t: number, hungry: boolean) {
    c0(t);
    function c0(tt: number) {
      const c = ctx;
      c.setTransform(K, 0, 0, K, 0, 0);
      const zoom = 1 + Math.max(0, 0.07 * (1 - tt / 0.9)); // beim Öffnen sanft herangezoomt
      c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-W / 2, -H / 2);
      // Wasser
      const wg = c.createLinearGradient(0, 0, 0, H);
      wg.addColorStop(0, '#9be8ff'); wg.addColorStop(0.5, '#4fb6e6'); wg.addColorStop(1, '#216f9e');
      c.fillStyle = wg; c.fillRect(-20, -20, W + 40, H + 40);
      // Lichtstrahlen
      for (let i = 0; i < 4; i++) {
        const x = ((i * 240 + tt * 14) % (W + 200)) - 100;
        const lg = c.createLinearGradient(x, 0, x + 60, SAND);
        lg.addColorStop(0, 'rgba(255,255,255,.28)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = lg; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 90, 0); c.lineTo(x + 40 + 70, SAND); c.lineTo(x - 70, SAND); c.closePath(); c.fill();
      }
      // Pflanzen hinten
      plant(c, 150, 190, '#2f9e5a', tt); plant(c, 330, 140, '#4cb86f', tt); plant(c, 640, 210, '#2f9e5a', tt); plant(c, 780, 150, '#c0509a', tt);
      // Boden
      const sg = c.createLinearGradient(0, SAND, 0, H);
      sg.addColorStop(0, '#f0d7a0'); sg.addColorStop(1, '#c8a46a');
      c.fillStyle = sg; c.beginPath(); c.moveTo(0, SAND + 8); for (let x = 0; x <= W; x += 40) c.lineTo(x, SAND + 6 + Math.sin(x * 0.03) * 5); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      for (let i = 0; i < 70; i++) { c.fillStyle = i % 3 ? 'rgba(160,120,70,.5)' : 'rgba(255,245,210,.6)'; c.beginPath(); c.arc((i * 97) % W, SAND + 14 + ((i * 53) % 44), 1.6 + (i % 3), 0, 7); c.fill(); }
      // Steine und Schatzkiste
      const rock = (x: number, y: number, w: number, hh: number, col: string) => { c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.9, y - hh, x, y - hh * 1.05); c.quadraticCurveTo(x + w * 0.9, y - hh, x + w, y); c.closePath(); path(c, col); };
      rock(250, SAND + 18, 60, 48, '#9aa3ad'); rock(300, SAND + 20, 40, 34, '#b3bbc4'); rock(700, SAND + 22, 70, 56, '#8f98a3');
      c.save(); c.translate(500, SAND + 16); c.beginPath(); c.roundRect(-34, -30, 68, 34, 6); path(c, '#b9793a'); c.beginPath(); c.roundRect(-34, -48, 68, 22, [14, 14, 4, 4]); path(c, '#d99a52'); c.fillStyle = '#f2c14a'; c.fillRect(-6, -34, 12, 14); c.restore();
      // Luftsprudler
      c.beginPath(); c.roundRect(76, SAND - 4, 28, 14, 5); path(c, '#8a929c');
      // Bodenbewohner zuerst, dann Fische
      const order = [...critters].sort((a, b) => (a.sp.kind === 'fish' ? 1 : 0) - (b.sp.kind === 'fish' ? 1 : 0));
      for (const cr of order) {
        c.save();
        const yOff = cr.sp.kind === 'shrimp' && cr.hop > 0 ? -Math.sin(cr.hop * Math.PI) * 34 : cr.sp.kind === 'fish' ? Math.sin(tt * 1.7 + cr.ph) * 2 : 0;
        c.translate(cr.x, cr.y + yOff);
        const tilt = cr.sp.kind === 'fish' ? Math.max(-0.35, Math.min(0.35, cr.vy / 90)) * cr.face : 0;
        c.rotate(tilt);
        c.scale(cr.face >= 0 ? Math.max(0.15, cr.face) : Math.min(-0.15, cr.face), 1);
        if (cr.sp.kind === 'fish') drawFish(c, cr.sp, tt, cr.ph, hungry);
        else if (cr.sp.kind === 'bottom') drawCory(c, cr.sp, tt, cr.ph);
        else if (cr.sp.kind === 'snail') drawSnail(c, cr.sp, tt, cr.ph);
        else drawShrimp(c, cr.sp, tt, cr.ph, cr.hop > 0);
        c.restore();
      }
      // Pflanzen vorn
      plant(c, 70, 90, '#3fae66', tt, 0.8); plant(c, 840, 100, '#3fae66', tt, 0.8); plant(c, 560, 70, '#2f9e5a', tt, 0.7);
      // Futter
      for (const f of flakes) { c.beginPath(); c.ellipse(f.x, f.y, 4, 2.4, f.age, 0, 7); c.fillStyle = '#ffc27a'; c.fill(); c.strokeStyle = 'rgba(120,70,20,.7)'; c.lineWidth = 1; c.stroke(); }
      // Blasen
      for (const b of bubbles) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fillStyle = 'rgba(255,255,255,.28)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.4; c.stroke(); c.beginPath(); c.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, 7); c.fillStyle = '#fff'; c.fill(); }
      // Wasseroberfläche
      c.beginPath(); c.moveTo(0, 0); for (let x = 0; x <= W; x += 20) c.lineTo(x, 12 + Math.sin(x * 0.04 + tt * 2) * 3); c.lineTo(W, 0); c.closePath(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill();
      // Namensschild
      if (tag) {
        c.font = '900 22px "Baloo 2", system-ui, sans-serif'; c.textAlign = 'center';
        const tx = Math.max(80, Math.min(W - 80, tag.c.x)), ty = Math.max(44, tag.c.y - 54), label = tag.c.sp.name, wd = c.measureText(label).width + 26;
        c.beginPath(); c.roundRect(tx - wd / 2, ty - 24, wd, 34, 12); c.fillStyle = '#fff6e3'; c.fill(); c.strokeStyle = '#3a2412'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#3a2412'; c.fillText(label, tx, ty); c.font = '700 16px system-ui'; c.fillStyle = '#6b5a44';
      }
      // Hunger-Hinweis
      if (hungry) { c.font = '900 30px "Baloo 2", system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = '#3a2412'; c.lineWidth = 6; c.lineJoin = 'round'; const y = 62 + Math.sin(tt * 4) * 4; c.strokeText('🍽️ Hunger!', W / 2, y); c.fillText('🍽️ Hunger!', W / 2, y); }
      // Glasglanz
      const gl = c.createLinearGradient(0, 0, W, 0);
      gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(0.12, 'rgba(255,255,255,0)'); gl.addColorStop(0.9, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,.12)');
      c.fillStyle = gl; c.fillRect(0, 0, W, H);
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
  }
}
