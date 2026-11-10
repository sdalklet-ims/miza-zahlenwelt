/**
 * Tierhaus-Ansicht (Zoom): Jedes Haustier hat eine Wohnnische an der Rückwand, läuft frei auf dem Boden herum,
 * schläft, grüßt Mia (Antippen) und spielt mit den Gadgets, die über Sterne freigeschaltet wurden.
 * Das Lieblingsstück eines Tieres löst besondere Freude aus (Herzchen, Hüpfer, Text).
 * Gezeichnet wird per Canvas im Comic-Look; die Tiere sind dieselben SVG-Bilder wie in der Welt (petSvg).
 */
import { h } from '../core/dom';
import { openModal } from './modal';
import { pets as getPets, kindById, mood } from '../core/pet';
import { gadgets, gadgetActive, gadgetUnlocked, markGadgetsSeen, newGadgets } from '../core/tierhaus';
import { totalStars } from '../core/rewards';
import { onProgress } from '../core/progress';
import { petSvg, type PetKind } from './art';
import type { TierGadget } from '../core/texts';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

const W = 1300, H = 470, K = 1.1, FY = 420, WALL = 300;
const INK = '#3a2412';
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** Bildhöhe (Pixel) je Tierart */
const PH: Record<string, number> = { meerschwein: 74, kaninchen: 118, hamster: 78, wellensittich: 110 };
/** Standplatz (Mitte) jedes Gadgets, nach Tierarten gruppiert; Brunnen und Bühne ganz rechts */
const SLOT: Record<string, number> = { tunnel: 80, gurkenmatte: 237, huegel: 410, sandkiste: 575, laufrad: 692, burg: 792, schaukel: 905, spiegel: 1002, brunnen: 1115, buehne: 1228 };
const slotOf = (g: TierGadget) => SLOT[g.id] ?? 600;

const imgs: Record<string, { img: HTMLImageElement; w: number; h: number }> = {};
function petImg(kind: string) {
  if (imgs[kind]) return imgs[kind];
  const svg = petSvg(kind as PetKind), vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
  const img = new Image(), hh = PH[kind] ?? 70;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return (imgs[kind] = { img, w: (hh * +vb[1]) / +vb[2], h: hh });
}

type State = 'idle' | 'walk' | 'play' | 'sleep';
interface Pet { idx: number; kind: string; name: string; x: number; y: number; tx: number; face: number; st: State; t: number; niche: number; gad: TierGadget | null; hop: number; love: number; said: boolean; ph: number }
interface Fx { x: number; y: number; vx: number; vy: number; life: number; txt: string; size: number }

function path(c: CanvasRenderingContext2D, fill: string, stroke = true) {
  c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke(); }
}
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, r: number, fill: string) => { c.beginPath(); c.roundRect(x, y, w, hh, r); path(c, fill); };
const circ = (c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) => { c.beginPath(); c.arc(x, y, r, 0, 7); path(c, fill); };

/* ───────── Gadgets ───────── */
/** Zeichnet ein Gadget; a = Tier spielt gerade damit, p = Spielfortschritt (Sekunden), over = vor dem Tier zeichnen */
function drawGadget(c: CanvasRenderingContext2D, g: TierGadget, x: number, t: number, a: boolean, p: number, part: 'back' | 'front') {
  c.save(); c.translate(x, FY);
  switch (g.anim) {
    case 'tunnel': { // Tunnel aus Gurke: Tier läuft dahinter hindurch, die Vorderseite verdeckt es
      if (part === 'back') { c.beginPath(); c.ellipse(0, -28, 74, 34, 0, Math.PI, 0); c.lineTo(74, 0); c.lineTo(-74, 0); c.closePath(); path(c, '#7ec850'); }
      else { c.beginPath(); c.roundRect(-74, -34, 148, 34, [10, 10, 4, 4]); c.save(); c.clip(); c.fillStyle = '#6ab43e'; c.fillRect(-80, -40, 160, 50);
        c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * 22, -14, 4, 0, 7); c.fill(); } c.restore(); c.beginPath(); c.roundRect(-74, -34, 148, 34, [10, 10, 4, 4]); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
        c.beginPath(); c.ellipse(-70, -17, 10, 17, 0, 0, 7); path(c, '#2f6f1e'); }
      break; }
    case 'hammock': {
      if (part === 'back') { rr(c, -78, -86, 8, 86, 3, '#a86b34'); rr(c, 70, -86, 8, 86, 3, '#a86b34');
        const sw = a ? Math.sin(p * 2.2) * 6 : 0;
        c.beginPath(); c.moveTo(-70, -78); c.quadraticCurveTo(sw, -30, 70, -78); c.lineTo(70, -70); c.quadraticCurveTo(sw, -18, -70, -70); c.closePath(); path(c, '#9bd05a'); }
      break; }
    case 'hill': {
      if (part === 'back') { c.beginPath(); c.moveTo(-90, 0); c.quadraticCurveTo(-30, -78, 10, -64); c.quadraticCurveTo(50, -50, 90, 0); c.closePath(); path(c, '#8fcf62');
        c.beginPath(); c.moveTo(14, -62); c.lineTo(28, -70); c.lineTo(22, -52); c.closePath(); path(c, '#ff9a2a'); c.beginPath(); c.moveTo(14, -62); c.lineTo(8, -78); c.lineTo(20, -72); path(c, '#4ca83a'); }
      break; }
    case 'sandbox': {
      if (part === 'back') { rr(c, -72, -34, 144, 34, 6, '#c68a4a'); c.beginPath(); c.roundRect(-64, -30, 128, 18, 6); c.fillStyle = '#f0d58c'; c.fill();
        if (a && Math.sin(p * 3) > 0.7) { c.beginPath(); c.moveTo(20, -30); c.lineTo(32, -42); c.lineTo(26, -26); path(c, '#ff9a2a'); } }
      break; }
    case 'wheel': {
      if (part === 'back') { rr(c, -50, -6, 100, 8, 3, '#a86b34'); rr(c, -6, -80, 12, 76, 3, '#c8c8d0'); }
      else { const r = 42, rot = a ? p * 5 : t * 0.2; c.translate(0, -58);
        c.beginPath(); c.arc(0, 0, r, 0, 7); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#ff6fa8'; c.lineWidth = 4; c.stroke();
        for (let i = 0; i < 8; i++) { const an = rot + (i * Math.PI) / 4, cols = ['#ff4a4a', '#ffd23f', '#4ac8ff', '#6fdc5a']; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * r, Math.sin(an) * r); c.strokeStyle = 'rgba(58,36,18,.5)'; c.lineWidth = 2; c.stroke();
          c.beginPath(); c.arc(Math.cos(an) * r, Math.sin(an) * r, a ? 6 : 4, 0, 7); c.fillStyle = a || Math.sin(t * 3 + i) > 0 ? cols[i % 4] : '#8a8a8a'; c.fill(); } }
      break; }
    case 'castle': {
      if (part === 'back') { rr(c, -50, -62, 100, 62, 4, '#d9b27c'); rr(c, -32, -108, 64, 50, 4, '#e6c28e'); for (const bx of [-32, -12, 8, 24]) rr(c, bx, -122, 12, 18, 2, '#e6c28e');
        c.beginPath(); c.roundRect(-14, -34, 28, 34, [14, 14, 0, 0]); path(c, '#5a3a1c'); c.beginPath(); c.roundRect(-8, -92, 16, 22, 8); path(c, '#5a3a1c');
        c.beginPath(); c.moveTo(0, -122); c.lineTo(0, -146); path(c, INK); c.beginPath(); c.moveTo(0, -146); c.lineTo(20, -139); c.lineTo(0, -132); path(c, '#ff5a5a'); }
      break; }
    case 'swing': {
      if (part === 'back') { rr(c, -62, -168, 124, 8, 3, '#a86b34'); rr(c, -62, -168, 8, 168, 3, '#a86b34'); rr(c, 54, -168, 8, 168, 3, '#a86b34'); }
      else { const an = a ? Math.sin(p * 2.6) * 0.5 : Math.sin(t) * 0.04; c.translate(0, -164); c.rotate(an);
        c.beginPath(); c.moveTo(-18, 0); c.lineTo(-18, 104); c.moveTo(18, 0); c.lineTo(18, 104); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); rr(c, -26, 100, 52, 8, 3, '#ffb347');
        c.rotate(-an); c.translate(0, 20); const bump = a ? Math.sin(p * 9) * 3 : 0; c.beginPath(); c.arc(0, bump, 7, 0, 7); path(c, '#ffd23f'); }
      break; }
    case 'mirror': {
      if (part === 'back') { rr(c, -6, -16, 12, 16, 3, '#a86b34'); c.beginPath(); c.ellipse(0, -76, 40, 56, 0, 0, 7); path(c, '#ffd23f');
        c.beginPath(); c.ellipse(0, -76, 31, 47, 0, 0, 7); c.fillStyle = '#d8f2ff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
        const sh = ((t * 40) % 160) - 40; c.save(); c.beginPath(); c.ellipse(0, -76, 31, 47, 0, 0, 7); c.clip(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(sh - 60, -130, 10, 120); c.restore();
        for (const [sx, sy] of [[-46, -128], [48, -118]]) { c.save(); c.translate(sx, sy); c.rotate(t); c.beginPath(); for (let i = 0; i < 8; i++) { const r2 = i % 2 ? 4 : 9; c.lineTo(Math.cos((i * Math.PI) / 4) * r2, Math.sin((i * Math.PI) / 4) * r2); } c.closePath(); path(c, '#fff3a0', false); c.restore(); } }
      break; }
    case 'fountain': {
      if (part === 'back') { c.beginPath(); c.ellipse(0, -12, 56, 14, 0, 0, 7); path(c, '#8fd4ff'); rr(c, -62, -22, 124, 12, 5, '#b8b0a0'); rr(c, -10, -64, 20, 44, 4, '#c8c0b0'); c.beginPath(); c.ellipse(0, -66, 26, 8, 0, 0, 7); path(c, '#9be0ff');
        for (let i = 0; i < 5; i++) { const ph = (t * 1.3 + i * 0.2) % 1, an = (i - 2) * 0.35; c.beginPath(); c.arc(Math.sin(an) * ph * 38, -70 - Math.sin(ph * Math.PI) * 26 + ph * ph * 34, 3, 0, 7); c.fillStyle = 'rgba(190,235,255,.95)'; c.fill(); }
        rr(c, 34, -34, 22, 14, 4, '#ffb347'); } // Futternapf
      break; }
    case 'stage': {
      if (part === 'back') { rr(c, -62, -22, 124, 22, 4, '#9a5a2a'); rr(c, -62, -28, 124, 8, 3, '#d98a46');
        c.beginPath(); c.moveTo(-62, -28); c.lineTo(-62, -128); c.quadraticCurveTo(-34, -92, -18, -128); c.lineTo(-18, -128); c.lineTo(-18, -28); path(c, '#d93a4a');
        c.beginPath(); c.moveTo(62, -28); c.lineTo(62, -128); c.quadraticCurveTo(34, -92, 18, -128); c.lineTo(18, -28); path(c, '#d93a4a');
        c.beginPath(); c.moveTo(-62, -128); c.quadraticCurveTo(0, -150, 62, -128); c.lineTo(62, -144); c.quadraticCurveTo(0, -164, -62, -144); c.closePath(); path(c, '#b02a3a');
        if (a) { c.globalAlpha = 0.22 + 0.1 * Math.sin(t * 6); c.beginPath(); c.moveTo(-30, -146); c.lineTo(30, -146); c.lineTo(52, -28); c.lineTo(-52, -28); c.closePath(); c.fillStyle = '#fff6b0'; c.fill(); c.globalAlpha = 1; } }
      break; }
  }
  c.restore();
}

/* ───────── Raum ───────── */
function room(c: CanvasRenderingContext2D, t: number, n: number, activeLights: boolean) {
  const wg = c.createLinearGradient(0, 0, 0, WALL); wg.addColorStop(0, '#f2cf93'); wg.addColorStop(1, '#e0b070');
  c.fillStyle = wg; c.fillRect(0, 0, W, WALL);
  c.strokeStyle = 'rgba(120,80,30,.25)'; c.lineWidth = 2; for (let x = 0; x < W; x += 58) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, WALL); c.stroke(); }
  c.fillStyle = '#b8793a'; c.fillRect(0, WALL - 4, W, 8); // Leiste
  const fg = c.createLinearGradient(0, WALL, 0, H); fg.addColorStop(0, '#c98d52'); fg.addColorStop(1, '#a8703a'); c.fillStyle = fg; c.fillRect(0, WALL + 4, W, H);
  c.strokeStyle = 'rgba(80,45,15,.3)'; c.lineWidth = 2; for (let y = WALL + 40; y < H; y += 36) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // Nischen
  for (let i = 0; i < n; i++) {
    const x = nicheX(i, n);
    c.beginPath(); c.moveTo(x - 52, WALL - 4); c.lineTo(x - 52, 150); c.arc(x, 150, 52, Math.PI, 0); c.lineTo(x + 52, WALL - 4); c.closePath(); path(c, '#8a5428');
    c.beginPath(); c.moveTo(x - 42, WALL - 4); c.lineTo(x - 42, 152); c.arc(x, 152, 42, Math.PI, 0); c.lineTo(x + 42, WALL - 4); c.closePath(); c.fillStyle = '#ffe9b8'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x, 270, 34, 8, 0, 0, 7); c.fill();
  }
  // Girlande
  if (activeLights) {
    c.beginPath(); c.moveTo(0, 16); c.quadraticCurveTo(W / 2, 74, W, 16); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
    const cols = ['#ff5a5a', '#ffd23f', '#5ac8ff', '#6fdc5a', '#ff8ad8'];
    for (let i = 0; i < 13; i++) { const u = i / 12, x = u * W, y = 16 + 2 * u * (1 - u) * 58 + 6, on = 0.65 + 0.35 * Math.sin(t * 2.5 + i);
      c.globalAlpha = 0.3 * on; c.beginPath(); c.arc(x, y + 14, 26, 0, 7); c.fillStyle = cols[i % 5]; c.fill(); c.globalAlpha = 1;
      c.beginPath(); c.roundRect(x - 8, y, 16, 22, 7); path(c, cols[i % 5]); }
  }
}
const nicheX = (i: number, n: number) => (n === 1 ? W / 2 : 90 + (i * (W - 180)) / (n - 1));

export function openTierhaus() {
  const cv = h('canvas', { class: 'aq-canvas', width: W * K, height: H * K }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d')!;
  const chips = h('div', { class: 'aq-chips' });
  const stat = h('div', { class: 'aq-state' });
  const body = h('div', { class: 'aq' }, h('div', { class: 'aq-frame' }, cv), h('div', { class: 'aq-bar' }, h('div', { class: 'aq-status' }, stat)), chips);

  let crowd: Pet[] = [], fx: Fx[] = [], alive = true, last = performance.now(), clock = 0, bubble: { p: Pet; t: number } | null = null;
  let cheer = 0;
  const playedFav = new Set<string>();

  function build() {
    const list = getPets(), n = list.length;
    crowd = list.map((pt, i) => {
      const old = crowd.find((o) => o.idx === i && o.kind === pt.kind);
      return old ? { ...old, name: pt.name, niche: i } : { idx: i, kind: pt.kind, name: pt.name, x: nicheX(i, n), y: FY, tx: nicheX(i, n), face: 1, st: 'sleep' as State, t: rnd(2, 5), niche: i, gad: null, hop: 0, love: 0, said: false, ph: rnd(0, 6) };
    });
  }
  function refresh() {
    const n = getPets().length;
    stat.textContent = n === 0 ? 'Das Tierhaus ist noch leer.' : `🏠 ${n} Bewohner  ·  ⭐ ${totalStars()} gesammelt`;
    chips.replaceChildren(...gadgets.map((g) => {
      const open = gadgetUnlocked(g), live = gadgetActive(g);
      return h('span', { class: 'aq-chip' + (open && live ? '' : ' empty'), title: g.desc.replace('{name}', 'das Tier') },
        open ? (live ? `${g.emoji} ${g.name}` : `${g.emoji} ${g.name} (wartet auf ${g.animal === 'alle' ? 'ein Tier' : kindById(g.animal).name})`) : `🔒 ${g.name} · ab ${g.stars} ⭐`);
    }));
  }

  function gadgetFor(p: Pet): TierGadget[] { return gadgets.filter((g) => gadgetActive(g) && (g.animal === p.kind || g.animal === 'alle')); }
  const say = (p: Pet, txt: string) => { bubble = { p, t: 2.2 }; fx.push({ x: p.x, y: p.y - (PH[p.kind] ?? 70) - 30, vx: 0, vy: -16, life: 1.6, txt, size: 26 }); };

  function pickNext(p: Pet) {
    const hungry = mood(getPets()[p.idx]) === 'hungry', r = Math.random();
    p.gad = null;
    if (hungry) { p.st = 'walk'; p.tx = rnd(60, W - 60); p.t = 0; return; }
    const opts = gadgetFor(p);
    if (opts.length && r < 0.55) {
      // Lieblingsstück bevorzugt
      const fav = opts.find((g) => g.fav), g = fav && Math.random() < 0.6 ? fav : opts[Math.floor(Math.random() * opts.length)];
      p.gad = g; p.st = 'walk'; p.tx = slotOf(g) + (g.anim === 'tunnel' ? -90 : g.anim === 'fountain' ? -50 : 0);
    } else if (r < 0.75) { p.st = 'sleep'; p.t = 0; }
    else if (r < 0.9) { p.st = 'walk'; p.tx = rnd(60, W - 60); }
    else { p.st = 'idle'; p.t = rnd(1.5, 3); }
  }

  function update(dt: number) {
    clock += dt;
    for (const p of crowd) {
      p.t -= dt; p.hop = Math.max(0, p.hop - dt * 2.4); p.love = Math.max(0, p.love - dt);
      if (p.st === 'sleep') {
        const nx = nicheX(p.niche, crowd.length);
        if (Math.abs(p.x - nx) > 6) { p.x += Math.sign(nx - p.x) * 90 * dt; p.face = Math.sign(nx - p.x) || p.face; p.y = FY; }
        else { if (p.y !== 262) { p.y = 262; p.x = nx; p.t = rnd(6, 10); } else if (p.t <= 0) pickNext(p); }
      } else if (p.st === 'walk') {
        p.y = Math.min(FY, p.y + 220 * dt);
        const dx = p.tx - p.x, sp = (p.kind === 'hamster' ? 110 : 80) * (mood(getPets()[p.idx]) === 'hungry' ? 0.6 : 1);
        if (Math.abs(dx) > 5) { p.x += Math.sign(dx) * sp * dt; p.face = Math.sign(dx); }
        else if (p.gad) { p.st = 'play'; p.t = rnd(5, 8); p.said = false; p.x = p.tx; begin(p); }
        else { p.st = 'idle'; p.t = rnd(1.2, 3); }
      } else if (p.st === 'idle') { p.y = Math.min(FY, p.y + 220 * dt); if (p.t <= 0) pickNext(p); }
      else if (p.st === 'play') {
        const g = p.gad!, pp = p.t;
        if (g.fav && Math.random() < dt * 3) fx.push({ x: p.x + rnd(-24, 24), y: p.y - rnd(30, 80), vx: rnd(-8, 8), vy: -28, life: 1.1, txt: '❤️', size: 20 });
        if (pp <= 0) { p.st = 'idle'; p.t = 1.5; p.gad = null; }
      }
    }
    for (const f of fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }
    fx = fx.filter((f) => f.life > 0);
    if (bubble) { bubble.t -= dt; if (bubble.t <= 0) bubble = null; }
    if (cheer > 0) { cheer -= dt; if (Math.random() < dt * 8 && crowd.length) { const p = crowd[Math.floor(Math.random() * crowd.length)]; fx.push({ x: p.x + rnd(-30, 30), y: p.y - 60, vx: rnd(-10, 10), vy: -30, life: 1.4, txt: Math.random() < 0.5 ? '❤️' : '⭐', size: 24 }); } }
  }
  function begin(p: Pet) { // Spielbeginn: Freude beim Lieblingsstück, Bühne mit Applaus
    const g = p.gad!;
    if (g.fav) { p.hop = 1; sfx.star(); if (!playedFav.has(p.kind)) { playedFav.add(p.kind); speak('tierhaus.fav', { name: p.name, gadget: g.name }); } }
    if (g.anim === 'stage') fx.push({ x: slotOf(g) - 90, y: FY - 70, vx: 0, vy: -10, life: 2, txt: '👏', size: 34 });
  }

  /** Spielbewegung des Tieres am Gadget (Versatz und Drehung) */
  function playPose(p: Pet, pp: number): { dx: number; dy: number; rot: number; sx: number; hidden: boolean } {
    const g = p.gad!, cx = slotOf(g), r = { dx: 0, dy: 0, rot: 0, sx: 1, hidden: false };
    switch (g.anim) {
      case 'tunnel': { const u = Math.sin(pp * 1.6); r.dx = cx - p.x + u * 84; p.face = Math.cos(pp * 1.6) >= 0 ? 1 : -1; r.hidden = false; break; }
      case 'hammock': r.dx = cx - p.x; r.dy = -62; r.rot = Math.sin(pp * 2.2) * 0.12; break;
      case 'hill': { const u = (pp * 0.5) % 1, hx = -70 + u * 140; r.dx = cx - p.x + hx; r.dy = -(Math.max(0, 62 - Math.abs(hx + 16) * 0.9)) - (u > 0.85 ? Math.sin((u - 0.85) / 0.15 * Math.PI) * 30 : 0); p.face = 1; break; }
      case 'sandbox': r.dx = cx - p.x; r.dy = -16 + Math.abs(Math.sin(pp * 6)) * -6; r.rot = Math.sin(pp * 6) * 0.1; break;
      case 'wheel': r.dx = cx - p.x; r.dy = -14 + Math.abs(Math.sin(pp * 10)) * -3; p.face = 1; break;
      case 'castle': r.dx = cx - p.x - 62; r.sx = 1 + Math.abs(Math.sin(pp * 2.4)) * 0.08; break;
      case 'swing': r.dx = cx - p.x; r.dy = -48; r.rot = 0; break; // wird im Zeichnen an Schaukel gebunden
      case 'mirror': r.dx = cx - p.x - 70; r.sx = 1 + Math.abs(Math.sin(pp * 3)) * 0.12; break;
      case 'stage': r.dx = cx - p.x + Math.sin(pp * 1.4) * 30; r.dy = -30 - Math.abs(Math.sin(pp * 3.5)) * 26; r.rot = Math.sin(pp * 3.5) * 0.25; break;
      case 'fountain': r.dx = cx - p.x - 56; r.dy = -(Math.max(0, Math.sin(pp * 4)) * 5); break;
      default: break;
    }
    return r;
  }

  function drawPet(c: CanvasRenderingContext2D, p: Pet, t: number) {
    const im = petImg(p.kind);
    if (!im.img.complete || !im.img.naturalWidth) return;
    let x = p.x, y = p.y, rot = 0, sx = 1, sleepy = p.st === 'sleep' && p.y > 255;
    if (p.st === 'play' && p.gad) {
      const g = p.gad, pp = 7 - p.t + p.ph, pose = playPose(p, pp);
      x += pose.dx; y += pose.dy; rot = pose.rot; sx = pose.sx;
      if (g.anim === 'swing') { const an = Math.sin(pp * 2.6) * 0.5; x = slotOf(g) + Math.sin(an) * 96; y = FY - 164 + Math.cos(an) * 96 + 8; rot = an * 0.8; }
    }
    if (sleepy) { y = 276; }
    const hop = p.hop > 0 ? Math.sin(p.hop * Math.PI) * 26 : 0;
    const walk = p.st === 'walk' ? Math.abs(Math.sin(t * (p.kind === 'hamster' ? 14 : 10) + p.ph)) * 5 : p.st === 'idle' ? Math.sin(t * 2 + p.ph) * 1.2 : 0;
    const breathe = sleepy ? Math.sin(t * 2 + p.ph) * 1.5 : 0;
    // Schatten
    if (!sleepy) { c.beginPath(); c.ellipse(p.x, FY + 6, im.w * 0.42, 6, 0, 0, 7); c.fillStyle = 'rgba(60,30,10,.28)'; c.fill(); }
    c.save(); c.translate(x, y - hop - walk + breathe); c.rotate(rot * (p.face >= 0 ? 1 : -1));
    c.scale((p.face >= 0 ? 1 : -1) * sx, sleepy ? 0.9 : 1);
    if (sleepy) c.globalAlpha = 0.96;
    c.drawImage(im.img, -im.w / 2, -im.h, im.w, im.h);
    c.restore();
    if (sleepy) { c.font = '900 20px "Baloo 2", system-ui'; c.fillStyle = '#6b5a44'; c.textAlign = 'center'; for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - u; c.fillText('z', x + 26 + u * 18, 232 - u * 32); } c.globalAlpha = 1; }
    if (mood(getPets()[p.idx]) === 'hungry') { c.font = '24px system-ui'; c.textAlign = 'center'; c.fillText('🍽️', p.x, p.y - im.h - 8 + Math.sin(t * 4) * 3 - (sleepy ? 0 : 0)); }
  }

  function draw(t: number) {
    const c = ctx; c.setTransform(K, 0, 0, K, 0, 0);
    const n = Math.max(1, crowd.length);
    room(c, t, n, gadgets.some((g) => g.anim === 'lights' && gadgetActive(g)));
    const act = gadgets.filter((g) => gadgetActive(g) && g.anim !== 'lights');
    const prog = (g: TierGadget) => { const pl = crowd.find((p) => p.gad === g && p.st === 'play'); return pl ? 7 - pl.t + pl.ph : 0; };
    for (const g of act) drawGadget(c, g, slotOf(g), t, crowd.some((p) => p.gad === g && p.st === 'play'), prog(g), 'back');
    // Tiere in Reihenfolge: spielende hinter der Gadget-Vorderseite (Tunnel, Rad, Schaukel), sonst davor
    const order = [...crowd].sort((a, b) => a.y - b.y);
    for (const p of order) {
      drawPet(c, p, t);
    }
    for (const g of act) if (g.anim === 'tunnel' || g.anim === 'wheel' || g.anim === 'swing') {
      drawGadget(c, g, slotOf(g), t, crowd.some((p) => p.gad === g && p.st === 'play'), prog(g), 'front');
    }
    // Namensschilder
    c.font = '800 17px "Baloo 2", system-ui'; c.textAlign = 'center';
    crowd.forEach((p, i) => { const x = nicheX(i, crowd.length), lab = p.name, wd = c.measureText(lab).width + 20; c.beginPath(); c.roundRect(x - wd / 2, WALL + 10, wd, 26, 9); c.fillStyle = '#fff6e3'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.fillStyle = INK; c.fillText(lab, x, WALL + 29); });
    if (!crowd.length) { c.font = '900 28px "Baloo 2", system-ui'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('Hier ziehen bald Tiere ein …', W / 2, 360); }
    // Effekte
    for (const f of fx) { c.globalAlpha = Math.min(1, f.life * 1.6); c.font = `${f.size}px system-ui`; c.textAlign = 'center'; c.fillText(f.txt, f.x, f.y); }
    c.globalAlpha = 1;
    if (bubble) { const p = bubble.p, txt = p.name; c.font = '900 20px "Baloo 2", system-ui'; const wd = c.measureText(txt).width + 24, x = Math.max(wd / 2 + 6, Math.min(W - wd / 2 - 6, p.x)), y = Math.max(34, p.y - (PH[p.kind] ?? 70) - 52);
      c.beginPath(); c.roundRect(x - wd / 2, y - 22, wd, 32, 12); c.fillStyle = '#fff6e3'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); c.fillStyle = INK; c.textAlign = 'center'; c.fillText(txt, x, y); }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    let best: Pet | null = null, bd = 70;
    for (const p of crowd) { const d = Math.hypot(p.x - px, p.y - (PH[p.kind] ?? 70) / 2 - py); if (d < bd) { bd = d; best = p; } }
    if (!best) return;
    sfx.pop(); say(best, '❤️'); best.hop = 1;
    if (best.st === 'sleep' && best.y > 255) { best.st = 'idle'; best.t = 1.2; }
    if (best.st === 'play' && best.gad && best.gad.reaction) speak('tierhaus.play', { text: best.gad.reaction.replace('{name}', best.name) });
    else speak('tierhaus.hi', { name: best.name });
  });

  build(); refresh();
  const off = onProgress(() => { build(); refresh(); });
  openModal({ title: '🏠 Tierhaus', wide: true, onClose: () => { alive = false; off(); }, content: body });

  const fresh = newGadgets();
  if (!crowd.length) speak('tierhaus.empty');
  else if (fresh.length) {
    cheer = 4; sfx.star();
    if (fresh.length > 2) speak('tierhaus.new.many', { n: fresh.length });
    else speak('tierhaus.new', { name: fresh.map((g) => g.name).join(' und ') });
    markGadgetsSeen();
  }
  const frame = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw(now / 1000);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__tier = openTierhaus;
