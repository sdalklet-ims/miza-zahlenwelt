import { treeSvg } from '../../ui/art';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const flower = (x: number, y: number, c: string) =>
  `<g transform="translate(${x} ${y})"><path d="M0 0 v14" stroke="#3a8a46" stroke-width="3"/><circle r="6" fill="${c}"/><circle r="2.6" fill="#fff3b0"/></g>`;
const mushroom = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="0" width="8" height="12" rx="3" fill="#f6ead2"/><path d="M-14 2 Q0 -20 14 2Z" fill="#e8504a"/><circle cx="-4" cy="-5" r="2.4" fill="#fff"/><circle cx="5" cy="-3" r="2" fill="#fff"/></g>`;
const tuft = (x: number, y: number) =>
  `<path d="M${x} ${y} q-4 -14 -9 -16 M${x} ${y} q1 -18 0 -20 M${x} ${y} q5 -14 10 -15" fill="none" stroke="#3c8f48" stroke-width="3" stroke-linecap="round"/>`;
const rock = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="4" rx="22" ry="6" fill="rgba(0,0,0,.14)"/><path d="M-20 4 Q-18 -14 -2 -14 Q16 -14 20 4Z" fill="#a9a59c" stroke="#7f7b72" stroke-width="2.5"/></g>`;

/** Hintergrundbild des Waldes (1180×820), alles per Code gezeichnet. */
export function waldScene(): string {
  const r = rng(11);
  let s = `<defs>
    <linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dff2"/><stop offset=".7" stop-color="#e6f6d6"/></linearGradient>
    <linearGradient id="wgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86cb6f"/><stop offset="1" stop-color="#4f9d5d"/></linearGradient>
  </defs>
  <rect width="1180" height="820" fill="url(#wsky)"/>
  <circle cx="930" cy="110" r="70" fill="#fff6c2" opacity=".75"/><circle cx="930" cy="110" r="42" fill="#fff0a0"/>
  <path d="M0 400 Q200 290 430 360 T830 340 T1180 350 V480 H0Z" fill="#b2dba0"/>`;
  for (let x = -20; x < 1220; x += 52) s += treeSvg(x + r() * 20, 318 + r() * 28, 1.05 + r() * 0.45, '#72b872', '#7fc47f');
  s += `<path d="M0 418 Q300 380 620 408 T1180 396 V820 H0Z" fill="url(#wgr)"/>`;
  s += `<path d="M-30 640 Q260 520 560 600 T1220 540" fill="none" stroke="#e2c88c" stroke-width="84" stroke-linecap="round" opacity=".85"/>
        <path d="M-30 640 Q260 520 560 600 T1220 540" fill="none" stroke="#f0dba8" stroke-width="62" stroke-linecap="round" opacity=".9"/>`;
  for (const x of [90, 330, 640, 960, 1120]) s += treeSvg(x, 392 + r() * 22, 1.9 + r() * 0.4, '#2f7d46', '#3a8d52');
  for (let i = 0; i < 40; i++) {
    const x = 30 + r() * 1120, y = 450 + r() * 350, k = r();
    if (k < 0.45) s += flower(x, y, ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff', '#ff9f5a'][Math.floor(r() * 5)]);
    else if (k < 0.7) s += tuft(x, y);
    else if (k < 0.85) s += mushroom(x, y, 0.8 + r() * 0.5);
    else s += rock(x, y, 0.7 + r() * 0.6);
  }
  s += `<polygon points="150,0 260,0 420,470 210,470" fill="#fff" opacity=".10"/><polygon points="560,0 640,0 760,470 620,470" fill="#fff" opacity=".08"/><polygon points="860,0 920,0 1100,470 940,470" fill="#fff" opacity=".09"/>`;
  s += treeSvg(18, 330, 3.4, '#27693c', '#2f7a45') + treeSvg(1165, 340, 3.6, '#27693c', '#2f7a45');
  return `<svg viewBox="0 0 1180 820" width="1180" height="820" xmlns="http://www.w3.org/2000/svg" class="wald-bg">${s}</svg>`;
}
