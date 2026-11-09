/** Sprites der Welt: eigene SVG-Zeichnungen, einmal in Bilder gewandelt (schnell zu zeichnen). */
import { treeSvg, bushSvg, npcSvg } from '../ui/art';

export interface Sprite { img: CanvasImageSource; w: number; h: number; ax: number; ay: number }

function load(svg: string, w: number, h: number): Promise<HTMLImageElement> {
  const sized = svg.replace(/^<svg([^>]*)>/, (_m, a: string) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} width="${w}" height="${h}">`);
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(im);
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  });
}

export const S: Record<string, Sprite> = {};

async function def(key: string, svg: string, w: number, h: number, ax: number, ay: number) {
  S[key] = { img: await load(svg, w, h), w, h, ax, ay };
}

const ball = (id: string, l: string, m: string, d: string) =>
  `<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient>`;
const shade = (hex: string, k: number) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');
const tree = (c1: string, c2: string) =>
  `<svg viewBox="-48 -56 96 104" xmlns="http://www.w3.org/2000/svg"><defs>${ball('a', shade(c2, 1.35), c2, shade(c1, 0.62))}${ball('b', shade(c2, 1.4), c1, shade(c1, 0.55))}${ball('c', shade(c2, 1.5), c2, shade(c1, 0.7))}
<linearGradient id="t" x1="0" x2="1"><stop offset="0" stop-color="#b07a44"/><stop offset="1" stop-color="#5d3a1c"/></linearGradient></defs>
<rect x="-6" y="-2" width="12" height="28" rx="3" fill="url(#t)"/>
<circle cx="14" cy="6" r="18" fill="url(#b)"/><circle cx="-15" cy="5" r="18" fill="url(#a)"/><circle cx="0" cy="-8" r="25" fill="url(#c)"/>
<ellipse cx="6" cy="14" rx="26" ry="8" fill="rgba(0,40,10,.18)"/><circle cx="-8" cy="-18" r="8" fill="#fff" opacity=".16"/></svg>`;

const pine = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="140" rx="26" ry="7" fill="rgba(0,0,0,.15)"/><defs><linearGradient id="p1" x1="0" x2="1"><stop offset="0" stop-color="#4fb284"/><stop offset=".5" stop-color="#2f7d58"/><stop offset="1" stop-color="#1d5a3f"/></linearGradient></defs><rect x="43" y="106" width="14" height="34" rx="3" fill="#7a4d26"/>
<polygon points="50,4 84,56 16,56" fill="url(#p1)" stroke="#245f44" stroke-width="3" stroke-linejoin="round"/><polygon points="50,28 90,84 10,84" fill="url(#p1)" stroke="#245f44" stroke-width="3" stroke-linejoin="round"/><polygon points="50,54 96,114 4,114" fill="url(#p1)" stroke="#245f44" stroke-width="3" stroke-linejoin="round"/>
<polygon points="50,4 62,20 38,20" fill="#fff" opacity=".85"/></svg>`;

const bush3d = `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#6fcf86"/><stop offset=".55" stop-color="#3a9d55"/><stop offset="1" stop-color="#1f6b39"/></radialGradient></defs>
<circle cx="40" cy="62" r="34" fill="url(#g)"/><circle cx="122" cy="62" r="34" fill="url(#g)"/><circle cx="82" cy="46" r="40" fill="url(#g)"/><circle cx="82" cy="72" r="30" fill="url(#g)"/>
<circle cx="64" cy="34" r="9" fill="#fff" opacity=".18"/><circle cx="30" cy="56" r="5" fill="#e8504a"/><circle cx="118" cy="52" r="5" fill="#e8504a"/><circle cx="84" cy="74" r="5" fill="#e8504a"/><circle cx="29" cy="54" r="1.6" fill="#fff" opacity=".7"/></svg>`;

const rock = `<svg viewBox="0 0 80 56" xmlns="http://www.w3.org/2000/svg"><ellipse cx="40" cy="48" rx="34" ry="7" fill="rgba(0,0,0,.16)"/><defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4d0c6"/><stop offset=".6" stop-color="#a09c92"/><stop offset="1" stop-color="#6f6b63"/></linearGradient></defs><path d="M6 46 Q4 20 28 14 Q56 6 74 46Z" fill="url(#r)" stroke="#7f7b72" stroke-width="3" stroke-linejoin="round"/><path d="M24 22 Q34 16 44 20" fill="none" stroke="#c9c5bb" stroke-width="4" stroke-linecap="round"/></svg>`;

const mountain = `<svg viewBox="-110 -100 220 130" xmlns="http://www.w3.org/2000/svg"><ellipse cx="0" cy="24" rx="100" ry="10" fill="rgba(0,0,0,.15)"/><path d="M-100 26 L-10 -92 L30 -40 L56 -66 L102 26Z" fill="#8b93a7" stroke="#6b7388" stroke-width="4" stroke-linejoin="round"/><path d="M-26 -62 L-10 -92 L10 -66 L0 -58 L-8 -68 L-16 -56Z" fill="#fff"/><path d="M42 -50 L56 -66 L66 -52 L58 -48 L52 -56Z" fill="#fff"/></svg>`;

const house = (roof: string) => `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="176" rx="86" ry="10" fill="rgba(0,0,0,.16)"/><rect x="22" y="80" width="156" height="96" rx="6" fill="#fff0d4" stroke="#b8905a" stroke-width="5"/><path d="M8 88 L100 14 L192 88Z" fill="${roof}" stroke="#7d3a28" stroke-width="5" stroke-linejoin="round"/><rect x="82" y="116" width="36" height="60" rx="5" fill="#8a5a2b"/><rect x="36" y="104" width="30" height="30" rx="4" fill="#9ad6f0" stroke="#b8905a" stroke-width="4"/><rect x="134" y="104" width="30" height="30" rx="4" fill="#9ad6f0" stroke="#b8905a" stroke-width="4"/></svg>`;

const chest = `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="72" rx="42" ry="7" fill="rgba(0,0,0,.18)"/><rect x="10" y="30" width="80" height="40" rx="6" fill="#a8693a" stroke="#6a3f1c" stroke-width="4"/><path d="M10 34 Q10 8 50 8 Q90 8 90 34Z" fill="#c07b45" stroke="#6a3f1c" stroke-width="4" stroke-linejoin="round"/><rect x="42" y="30" width="16" height="18" rx="3" fill="#f4c430" stroke="#c9971c" stroke-width="3"/><path d="M10 40 H90" stroke="#6a3f1c" stroke-width="3"/></svg>`;

export const spritesReady: Promise<void> = (async () => {
  await Promise.all([
    def('tree_forest', tree('#3f8f4f', '#4aa05a'), 150, 156, 75, 122),
    def('tree_dark', tree('#2f7d46', '#3a8d52'), 150, 156, 75, 122),
    def('tree_light', tree('#6bb85f', '#7cc76d'), 150, 156, 75, 122),
    def('tree_autumn', tree('#d98a3d', '#e5a24f'), 150, 156, 75, 122),
    def('pine', pine, 90, 135, 45, 126),
    def('bush', bush3d, 130, 81, 65, 74),
    def('rock', rock, 80, 56, 40, 48),
    def('mountain', mountain, 286, 169, 143, 132),
    def('house_red', house('#d9674a'), 200, 190, 100, 176),
    def('house_blue', house('#4a90d9'), 200, 190, 100, 176),
    def('chest', chest, 90, 72, 45, 65),
  ]);
})();

/** Auftraggeber-Sprite (mit angezogenen Accessoires) */
const NPC_W: Record<string, number> = { owl: 150, hedgehog: 140, badger: 130, hare: 110, fox: 130 };
const NPC_ASPECT: Record<string, number> = { owl: 270 / 220, hedgehog: 170 / 230, badger: 195 / 200, hare: 235 / 180, fox: 210 / 200 };
export async function npcSprite(kind: string, acc: string[]): Promise<Sprite> {
  const w = NPC_W[kind] ?? 130, h = Math.round(w * (NPC_ASPECT[kind] ?? 1));
  return { img: await load(npcSvg(kind, acc), w, h), w, h, ax: w / 2, ay: h * 0.96 };
}

/** Sprite, das sich im Wind neigt (oben mehr als am Fuß) */
export function drawSway(c: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale: number, sway: number) {
  c.save();
  c.translate(x, y);
  c.transform(1, 0, sway, 1, 0, 0);
  c.drawImage(s.img, -s.ax * scale, -s.ay * scale, s.w * scale, s.h * scale);
  c.restore();
}

export function drawSprite(c: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale = 1, flip = false) {
  if (flip) {
    c.save();
    c.translate(x, y);
    c.scale(-scale, scale);
    c.drawImage(s.img, -s.ax, -s.ay, s.w, s.h);
    c.restore();
  } else c.drawImage(s.img, x - s.ax * scale, y - s.ay * scale, s.w * scale, s.h * scale);
}

/** Weiche Nebelwolke (einmal vorgerendert) */
export const fogCloud: HTMLCanvasElement = (() => {
  const cv = document.createElement('canvas');
  cv.width = 260; cv.height = 190;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(130, 95, 10, 130, 95, 120);
  gr.addColorStop(0, 'rgba(244,248,252,.95)');
  gr.addColorStop(0.55, 'rgba(236,243,250,.7)');
  gr.addColorStop(1, 'rgba(236,243,250,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 260, 190);
  return cv;
})();
