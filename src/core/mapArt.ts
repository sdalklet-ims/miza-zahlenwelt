import { treeSvg } from '../ui/art';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mountain = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-46 34 L0 -48 L46 34Z" fill="#8b93a7" stroke="#6b7388" stroke-width="3" stroke-linejoin="round"/><path d="M-16 -8 L0 -48 L16 -8 L7 -2 L0 -12 L-7 -2Z" fill="#fff"/></g>`;
const house = (x: number, y: number, s: number, c: string) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-22" y="-8" width="44" height="34" rx="3" fill="#fff0d4" stroke="#b8905a" stroke-width="3"/><path d="M-28 -6 L0 -34 L28 -6Z" fill="${c}" stroke="#8a3a28" stroke-width="3" stroke-linejoin="round"/><rect x="-6" y="8" width="12" height="18" rx="2" fill="#8a5a2b"/><rect x="9" y="2" width="9" height="9" fill="#9ad6f0"/></g>`;
const flower = (x: number, y: number, c: string) =>
  `<g transform="translate(${x} ${y})"><circle r="9" fill="${c}"/><circle cx="0" cy="-9" r="6" fill="${c}"/><circle cx="9" cy="0" r="6" fill="${c}"/><circle cx="0" cy="9" r="6" fill="${c}"/><circle cx="-9" cy="0" r="6" fill="${c}"/><circle r="5" fill="#fff3b0"/></g>`;

interface St { x: number; y: number; theme: string }

/** Statischer Hintergrund der Weltkarte: Wasser, Land, je Station ein kleines Gebiet. */
export function mapBackground(stations: St[]): string {
  const r = rng(7);
  const near = (x: number, y: number, d: number) => stations.some((s) => Math.hypot(s.x - x, s.y - y) < d);
  let deco = '';
  for (const s of stations) {
    const { x, y } = s;
    if (s.theme === 'forest') {
      deco += `<ellipse cx="${x}" cy="${y - 10}" rx="190" ry="140" fill="#5fae5e" opacity=".55"/>`;
      for (let i = 0; i < 11; i++) {
        const a = r() * 6.28, d = 100 + r() * 90;
        const tx = x + Math.cos(a) * d, ty = y - 10 + Math.sin(a) * d * 0.7;
        if (!near(tx, ty, 80)) deco += treeSvg(tx, ty, 0.9 + r() * 0.5);
      }
    } else if (s.theme === 'meadow') {
      deco += `<ellipse cx="${x}" cy="${y}" rx="190" ry="130" fill="#c8e88a" opacity=".7"/>`;
      for (let i = 0; i < 16; i++) {
        const a = r() * 6.28, d = 90 + r() * 90;
        const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d * 0.65;
        if (!near(fx, fy, 70)) deco += flower(fx, fy, ['#ff8fab', '#ffd166', '#fff', '#c3a6ff'][Math.floor(r() * 4)]);
      }
    } else if (s.theme === 'river') {
      deco += `<path d="M${x - 330} ${y + 110} Q${x - 140} ${y - 130} ${x + 20} ${y + 60} T${x + 340} ${y - 40}" fill="none" stroke="#4f9fd8" stroke-width="84" stroke-linecap="round"/>
      <path d="M${x - 330} ${y + 110} Q${x - 140} ${y - 130} ${x + 20} ${y + 60} T${x + 340} ${y - 40}" fill="none" stroke="#7cc4ee" stroke-width="64" stroke-linecap="round"/>
      <path d="M${x - 250} ${y + 40} q20 -10 40 0 t40 0 M${x + 60} ${y + 70} q20 -10 40 0 t40 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
    } else if (s.theme === 'mountain') {
      deco += `<ellipse cx="${x}" cy="${y + 10}" rx="200" ry="140" fill="#b7c0a8" opacity=".6"/>`;
      for (const [dx, dy, sc] of [[-120, -30, 1.3], [110, -20, 1.5], [-60, 70, 1], [150, 70, 1.1], [0, -90, 1.4]] as number[][])
        if (!near(x + dx, y + dy, 0)) deco += mountain(x + dx, y + dy, sc);
    } else if (s.theme === 'village') {
      deco += `<ellipse cx="${x}" cy="${y + 10}" rx="180" ry="120" fill="#e5d3a2" opacity=".7"/>`;
      deco += house(x - 120, y - 30, 1, '#d9674a') + house(x + 120, y - 20, 1.1, '#4a90d9') + house(x - 80, y + 70, 0.9, '#e9b949') + house(x + 90, y + 80, 1, '#8b6fd6');
    }
  }
  // Füll-Bäume am Rand
  for (let i = 0; i < 22; i++) {
    const tx = 90 + r() * 1000, ty = 150 + r() * 600;
    if (!near(tx, ty, 190)) deco += treeSvg(tx, ty, 0.7 + r() * 0.5, '#4a9a55', '#57a963');
  }

  return `<svg viewBox="0 0 1180 820" class="map-bg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fdcf7"/><stop offset="1" stop-color="#6cc0ea"/></linearGradient></defs>
  <rect width="1180" height="820" fill="url(#sea)"/>
  <path d="M-10 810 q40 -14 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="#fff" stroke-width="5" opacity=".5"/>
  <path d="M70 130 Q300 30 700 70 T1120 150 Q1170 420 1110 700 Q800 800 500 770 T60 720 Q10 420 70 130Z" fill="#a4d98a" stroke="#6bb25a" stroke-width="8" stroke-linejoin="round"/>
  <path d="M70 130 Q300 30 700 70 T1120 150 Q1170 420 1110 700 Q800 800 500 770 T60 720 Q10 420 70 130Z" fill="none" stroke="#f6e7b4" stroke-width="16" opacity=".6" transform="translate(0 0)" stroke-dasharray="0 1"/>
  ${deco}
  <g class="cloud c1"><ellipse cx="200" cy="90" rx="60" ry="22" fill="#fff" opacity=".9"/><ellipse cx="240" cy="78" rx="40" ry="22" fill="#fff" opacity=".9"/></g>
  <g class="cloud c2"><ellipse cx="800" cy="60" rx="70" ry="24" fill="#fff" opacity=".9"/><ellipse cx="850" cy="46" rx="44" ry="24" fill="#fff" opacity=".9"/></g>
  </svg>`;
}
