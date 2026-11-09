/** Handgezeichnete Cartoon-Figuren als SVG-Strings. Keine fremden Figuren – alles selbst gebaut. */
const INK = '#3b2a1e';
const OR = '#e9a24b';
const ORD = '#b8691f';
const CREAM = '#fff0d4';
const PINK = '#f2a2a2';

export type Expr = 'neutral' | 'happy' | 'think';

/* ───────────── Mia (Tabby-Katze) ───────────── */
export function miaSvg(acc: string[] = [], expr: Expr = 'neutral'): string {
  const eyes: Record<Expr, string> = {
    neutral:
      `<ellipse cx="78" cy="92" rx="9" ry="11" fill="${INK}"/><ellipse cx="122" cy="92" rx="9" ry="11" fill="${INK}"/>` +
      `<circle cx="81" cy="88" r="3.5" fill="#fff"/><circle cx="125" cy="88" r="3.5" fill="#fff"/>`,
    happy:
      `<path d="M66 96 q12 -18 24 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M110 96 q12 -18 24 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="62" cy="112" rx="9" ry="5" fill="#f58a8a" opacity=".6"/><ellipse cx="138" cy="112" rx="9" ry="5" fill="#f58a8a" opacity=".6"/>`,
    think:
      `<ellipse cx="78" cy="92" rx="9" ry="11" fill="${INK}"/><ellipse cx="122" cy="92" rx="9" ry="11" fill="${INK}"/>` +
      `<circle cx="83" cy="86" r="3.5" fill="#fff"/><circle cx="127" cy="86" r="3.5" fill="#fff"/>` +
      `<path d="M110 74 q12 -9 24 -2" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="168" cy="52" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="180" cy="34" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
  };
  const mouth: Record<Expr, string> = {
    neutral: `<path d="M100 114 v5 M100 119 q-9 9 -16 2 M100 119 q9 9 16 2" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
    happy: `<path d="M86 117 q14 22 28 0 z" fill="#c0392b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M93 126 q7 7 14 0 q-7 -4 -14 0z" fill="#f08a8a"/>`,
    think: `<path d="M90 122 q10 -5 20 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  };
  const has = (id: string) => acc.includes(id);
  return `<svg viewBox="0 0 200 225" xmlns="http://www.w3.org/2000/svg" class="mia-svg">
  <g class="mia-tail"><path d="M148 196 C196 196 202 140 170 124" fill="none" stroke="${OR}" stroke-width="17" stroke-linecap="round"/>
    <path d="M148 196 C196 196 202 140 170 124" fill="none" stroke="${ORD}" stroke-width="17" stroke-linecap="butt" stroke-dasharray="7 16" opacity=".55"/></g>
  <ellipse cx="100" cy="165" rx="52" ry="55" fill="${OR}"/>
  <ellipse cx="100" cy="176" rx="30" ry="38" fill="${CREAM}"/>
  <path d="M52 150 q12 3 17 13 M50 170 q12 1 18 9 M148 150 q-12 3 -17 13 M150 170 q-12 1 -18 9" fill="none" stroke="${ORD}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="78" cy="212" rx="17" ry="10" fill="${CREAM}" stroke="${ORD}" stroke-width="2"/>
  <ellipse cx="122" cy="212" rx="17" ry="10" fill="${CREAM}" stroke="${ORD}" stroke-width="2"/>
  ${has('mia-halstuch') ? `<path d="M64 136 Q100 160 136 136 L100 186 Z" fill="#d9534f" stroke="#a63a37" stroke-width="3" stroke-linejoin="round"/><circle cx="92" cy="152" r="3" fill="#fff"/><circle cx="108" cy="154" r="3" fill="#fff"/><circle cx="100" cy="168" r="3" fill="#fff"/>` : ''}
  <polygon points="52,72 46,20 94,48" fill="${OR}"/><polygon points="148,72 154,20 106,48" fill="${OR}"/>
  <polygon points="58,62 56,34 80,50" fill="${PINK}"/><polygon points="142,62 144,34 120,50" fill="${PINK}"/>
  <ellipse cx="100" cy="95" rx="58" ry="50" fill="${OR}"/>
  <path d="M100 47 v15 M87 50 l3 13 M113 50 l-3 13 M44 90 h12 M45 104 l11 -3 M156 90 h-12 M155 104 l-11 -3" fill="none" stroke="${ORD}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="100" cy="112" rx="27" ry="19" fill="${CREAM}"/>
  ${eyes[expr]}
  <polygon points="93,104 107,104 100,112" fill="${PINK}" stroke="#d98080" stroke-width="1.5" stroke-linejoin="round"/>
  ${mouth[expr]}
  <path d="M70 112 l-30 -6 M70 118 l-30 4 M130 112 l30 -6 M130 118 l30 4" fill="none" stroke="#7a5a3b" stroke-width="2.2" stroke-linecap="round"/>
  ${has('mia-brille') ? `<g><rect x="60" y="80" width="34" height="24" rx="9" fill="#23262e"/><rect x="106" y="80" width="34" height="24" rx="9" fill="#23262e"/><path d="M94 90 h12 M60 88 l-12 -6 M140 88 l12 -6" stroke="#23262e" stroke-width="4" stroke-linecap="round"/><path d="M66 86 l10 0 M112 86 l10 0" stroke="#8fb4ff" stroke-width="3" stroke-linecap="round" opacity=".8"/></g>` : ''}
  ${has('mia-zipfel') ? `<g><path d="M62 66 Q66 4 134 6 Q114 36 140 64 Q100 52 62 66Z" fill="#d9534f" stroke="#a63a37" stroke-width="3" stroke-linejoin="round"/><path d="M56 62 Q100 48 146 62 Q146 74 100 70 Q56 74 56 62Z" fill="#fff" stroke="#e1d7c6" stroke-width="2"/><circle cx="134" cy="8" r="11" fill="#fff" stroke="#e1d7c6" stroke-width="2"/></g>` : ''}
  ${has('mia-krone') ? `<g><path d="M64 58 L70 26 L86 44 L100 18 L114 44 L130 26 L136 58 Z" fill="#f4c430" stroke="#c9971c" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="42" r="5" fill="#e8504a"/><circle cx="78" cy="50" r="3.5" fill="#4a90d9"/><circle cx="122" cy="50" r="3.5" fill="#4a90d9"/></g>` : ''}
</svg>`;
}

/* ───────────── Eule Olga (Lehrerin) ───────────── */
export function owlSvg(acc: string[] = []): string {
  const has = (id: string) => acc.includes(id);
  let scallops = '';
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4 - (r % 2); c++) {
      const x = 80 + c * 20 + (r % 2) * 10;
      const y = 150 + r * 18;
      scallops += `<path d="M${x} ${y} q10 12 20 0" fill="none" stroke="#c9a46e" stroke-width="3" stroke-linecap="round"/>`;
    }
  return `<svg viewBox="0 0 220 270" xmlns="http://www.w3.org/2000/svg" class="npc-svg owl">
  <ellipse cx="110" cy="170" rx="72" ry="84" fill="#8a5a2b"/>
  <ellipse cx="110" cy="190" rx="50" ry="62" fill="#f1dcb5"/>${scallops}
  <path d="M44 150 Q18 205 56 250 Q74 200 62 150Z" fill="#6d4420"/><path d="M176 150 Q202 205 164 250 Q146 200 158 150Z" fill="#6d4420"/>
  <path d="M82 252 h14 l-5 12 z M124 252 h14 l-5 12 z" fill="#f4a23a" stroke="#c97a1a" stroke-width="2" stroke-linejoin="round"/>
  <path d="M54 66 L40 22 L88 46Z M166 66 L180 22 L132 46Z" fill="#8a5a2b"/>
  <ellipse cx="110" cy="96" rx="68" ry="58" fill="#8a5a2b"/>
  <ellipse cx="110" cy="102" rx="54" ry="44" fill="#f1dcb5"/>
  <circle cx="84" cy="98" r="23" fill="#fff"/><circle cx="136" cy="98" r="23" fill="#fff"/>
  <circle cx="86" cy="100" r="11" fill="${INK}"/><circle cx="134" cy="100" r="11" fill="${INK}"/>
  <circle cx="90" cy="95" r="4" fill="#fff"/><circle cx="138" cy="95" r="4" fill="#fff"/>
  <g fill="none" stroke="#5a3a1c" stroke-width="4.5"><circle cx="84" cy="98" r="27"/><circle cx="136" cy="98" r="27"/><path d="M111 98 h-0 M110 96 q0 -6 0 0"/><path d="M107 96 h6"/></g>
  <path d="M110 108 L97 128 L110 140 L123 128 Z" fill="#f4a23a" stroke="#c97a1a" stroke-width="2" stroke-linejoin="round"/>
  <path class="beak-low" d="M100 132 Q110 150 120 132 Q110 140 100 132Z" fill="#e2872a" stroke="#c97a1a" stroke-width="2" stroke-linejoin="round"/>
  ${has('eule-schleife') ? `<g><path d="M110 156 L82 142 L82 170Z M110 156 L138 142 L138 170Z" fill="#d9534f" stroke="#a63a37" stroke-width="3" stroke-linejoin="round"/><circle cx="110" cy="156" r="8" fill="#b9413e"/></g>` : ''}
  ${has('eule-hut') ? `<g><path d="M44 52 L110 26 L176 52 L110 80Z" fill="#2c2c34" stroke="#15151a" stroke-width="3" stroke-linejoin="round"/><path d="M84 66 v14 q26 12 52 0 v-14" fill="#2c2c34"/><path d="M176 52 v32" stroke="#f4b942" stroke-width="3"/><circle cx="176" cy="88" r="6" fill="#f4b942"/></g>` : ''}
</svg>`;
}

/* ───────────── Igel Ingo ───────────── */
export function hedgehogSvg(): string {
  let spikes = '';
  const pts: string[] = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const a = Math.PI * (0.88 + (1.24 * i) / N);
    const r = i % 2 ? 1.3 : 1.0;
    pts.push(`${(122 + Math.cos(a) * 80 * r).toFixed(1)},${(100 + Math.sin(a) * 60 * r).toFixed(1)}`);
  }
  spikes = `<polygon points="${pts.join(' ')} 122,110" fill="#5e3e22" stroke="#3f2915" stroke-width="3" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 230 170" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  ${spikes}
  <ellipse cx="122" cy="108" rx="82" ry="50" fill="#7a5230"/>
  <ellipse cx="86" cy="152" rx="20" ry="9" fill="#e0b88a"/><ellipse cx="150" cy="152" rx="20" ry="9" fill="#e0b88a"/>
  <ellipse cx="56" cy="112" rx="42" ry="34" fill="#f3cfa0"/>
  <path d="M18 108 Q26 94 50 94 Q40 120 18 116Z" fill="#f3cfa0"/>
  <circle cx="16" cy="108" r="8" fill="${INK}"/><circle cx="14" cy="105" r="2.5" fill="#fff"/>
  <circle cx="56" cy="98" r="7" fill="${INK}"/><circle cx="58" cy="95" r="2.5" fill="#fff"/>
  <ellipse cx="74" cy="76" rx="11" ry="9" fill="#e8b98a" stroke="#7a5230" stroke-width="3"/>
  <path d="M30 124 q10 8 22 2" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="60" cy="120" rx="8" ry="5" fill="#f08a8a" opacity=".5"/>
</svg>`;
}

/* ───────────── Dachs Bruno ───────────── */
export function badgerSvg(): string {
  return `<svg viewBox="0 0 200 195" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <ellipse cx="100" cy="146" rx="62" ry="46" fill="#8e9096"/>
  <ellipse cx="100" cy="156" rx="38" ry="32" fill="#b9bcc6"/>
  <ellipse cx="70" cy="188" rx="19" ry="8" fill="#43444b"/><ellipse cx="130" cy="188" rx="19" ry="8" fill="#43444b"/>
  <circle cx="62" cy="50" r="13" fill="#43444b"/><circle cx="138" cy="50" r="13" fill="#43444b"/>
  <circle cx="62" cy="50" r="6" fill="#fff"/><circle cx="138" cy="50" r="6" fill="#fff"/>
  <ellipse cx="100" cy="86" rx="53" ry="44" fill="#fff"/>
  <ellipse cx="74" cy="82" rx="17" ry="40" fill="#2f3036" transform="rotate(8 74 82)"/>
  <ellipse cx="126" cy="82" rx="17" ry="40" fill="#2f3036" transform="rotate(-8 126 82)"/>
  <circle cx="76" cy="84" r="8" fill="#fff"/><circle cx="124" cy="84" r="8" fill="#fff"/>
  <circle cx="77" cy="85" r="4.5" fill="${INK}"/><circle cx="123" cy="85" r="4.5" fill="${INK}"/>
  <ellipse cx="100" cy="106" rx="12" ry="9" fill="#2f3036"/><ellipse cx="97" cy="103" rx="4" ry="2.5" fill="#777a85"/>
  <path d="M100 114 v5 q-10 9 -18 1 M100 119 q10 9 18 1" fill="none" stroke="#2f3036" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M138 176 q16 -22 36 -4 q4 12 -8 16 q-20 4 -28 -12z" fill="#a8a29a" stroke="#6b665e" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
}

/* ───────────── Hase Hugo ───────────── */
export function hareSvg(): string {
  return `<svg viewBox="0 0 180 235" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <ellipse cx="66" cy="52" rx="16" ry="52" fill="#f1e6d8" stroke="#cdbba3" stroke-width="3" transform="rotate(-8 66 52)"/>
  <ellipse cx="114" cy="52" rx="16" ry="52" fill="#f1e6d8" stroke="#cdbba3" stroke-width="3" transform="rotate(8 114 52)"/>
  <ellipse cx="66" cy="54" rx="7" ry="38" fill="${PINK}" transform="rotate(-8 66 54)"/>
  <ellipse cx="114" cy="54" rx="7" ry="38" fill="${PINK}" transform="rotate(8 114 54)"/>
  <ellipse cx="90" cy="190" rx="50" ry="42" fill="#f1e6d8" stroke="#cdbba3" stroke-width="3"/>
  <ellipse cx="90" cy="124" rx="48" ry="42" fill="#f1e6d8" stroke="#cdbba3" stroke-width="3"/>
  <circle cx="72" cy="116" r="6.5" fill="${INK}"/><circle cx="108" cy="116" r="6.5" fill="${INK}"/>
  <circle cx="74" cy="113" r="2.5" fill="#fff"/><circle cx="110" cy="113" r="2.5" fill="#fff"/>
  <polygon points="83,128 97,128 90,136" fill="#ee8f9b"/>
  <path d="M90 136 q-8 10 -15 4 M90 136 q8 10 15 4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <rect x="84" y="141" width="12" height="11" rx="3" fill="#fff" stroke="#cdbba3" stroke-width="2"/>
  <ellipse cx="56" cy="132" rx="8" ry="5" fill="#f5a3b0" opacity=".6"/><ellipse cx="124" cy="132" rx="8" ry="5" fill="#f5a3b0" opacity=".6"/>
  <g transform="rotate(-6 90 190)"><rect x="62" y="166" width="56" height="50" rx="8" fill="#fff" stroke="#6b8fd6" stroke-width="4"/><text x="90" y="204" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="34" fill="#4a6cc0">7</text></g>
  <ellipse cx="62" cy="206" rx="13" ry="9" fill="#f1e6d8" stroke="#cdbba3" stroke-width="3"/><ellipse cx="118" cy="206" rx="13" ry="9" fill="#f1e6d8" stroke="#cdbba3" stroke-width="3"/>
</svg>`;
}

/* ───────────── Fuchs Fritz (Händler) ───────────── */
export function foxSvg(): string {
  return `<svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M146 170 C196 176 206 112 168 98 C170 126 150 138 138 146Z" fill="#e8742f" stroke="#b9531a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M176 104 C198 120 196 150 178 164 C186 144 184 124 170 108Z" fill="#fff" />
  <ellipse cx="100" cy="150" rx="46" ry="48" fill="#f08a3c"/>
  <ellipse cx="100" cy="162" rx="26" ry="34" fill="#fff2dc"/>
  <ellipse cx="74" cy="198" rx="17" ry="8" fill="#5b3a22"/><ellipse cx="126" cy="198" rx="17" ry="8" fill="#5b3a22"/>
  <polygon points="52,70 42,16 92,46" fill="#f08a3c" stroke="#b9531a" stroke-width="3" stroke-linejoin="round"/><polygon points="148,70 158,16 108,46" fill="#f08a3c" stroke="#b9531a" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="58,60 54,30 80,46" fill="#4a2a18"/><polygon points="142,60 146,30 120,46" fill="#4a2a18"/>
  <path d="M42 96 Q46 52 100 50 Q154 52 158 96 Q160 122 100 128 Q40 122 42 96Z" fill="#f08a3c" stroke="#b9531a" stroke-width="3"/>
  <path d="M42 100 Q70 104 100 124 Q130 104 158 100 Q150 128 100 130 Q50 128 42 100Z" fill="#fff2dc"/>
  <ellipse cx="78" cy="88" rx="8" ry="10" fill="#3b2a1e"/><ellipse cx="122" cy="88" rx="8" ry="10" fill="#3b2a1e"/><circle cx="81" cy="84" r="3" fill="#fff"/><circle cx="125" cy="84" r="3" fill="#fff"/>
  <ellipse cx="100" cy="108" rx="7" ry="5" fill="#3b2a1e"/><path d="M100 113 q-8 10 -16 3 M100 113 q8 10 16 3" fill="none" stroke="#3b2a1e" stroke-width="3" stroke-linecap="round"/>
  <path d="M60 146 h80 l-6 22 h-68z" fill="#4a90d9" stroke="#2e69a6" stroke-width="3" stroke-linejoin="round" opacity=".0"/>
  <circle cx="100" cy="146" r="9" fill="#f4c430" stroke="#c9971c" stroke-width="3"/><text x="100" y="151" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="13" fill="#8a5a00">€</text>
</svg>`;
}

import { beeSvg, snailSvg, butterflySvg, grasshopperSvg } from './artWiese';
import { raccoonSvg } from './artFluss';
import { beaverSvg, frogSvg, duckSvg, otterSvg } from './artFluss';

export function npcSvg(kind: string, acc: string[] = []): string {
  switch (kind) {
    case 'raccoon': return raccoonSvg();
    case 'beaver': return beaverSvg();
    case 'frog': return frogSvg();
    case 'duck': return duckSvg();
    case 'otter': return otterSvg();
    case 'bee': return beeSvg();
    case 'snail': return snailSvg();
    case 'butterfly': return butterflySvg();
    case 'grasshopper': return grasshopperSvg();
    case 'owl': return owlSvg(acc);
    case 'hedgehog': return hedgehogSvg();
    case 'badger': return badgerSvg();
    case 'hare': return hareSvg();
    case 'fox': return foxSvg();
    default: return miaSvg(acc);
  }
}

/* ───────────── Kleinteile ───────────── */
export const treeSvg = (x: number, y: number, s = 1, c1 = '#3f8f4f', c2 = '#4aa05a') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="0" width="12" height="26" rx="3" fill="#8a5a2b"/><circle cx="0" cy="-8" r="24" fill="${c1}"/><circle cx="-14" cy="4" r="17" fill="${c2}"/><circle cx="15" cy="5" r="17" fill="${c2}"/><circle cx="-6" cy="-16" r="8" fill="#5fb96d" opacity=".55"/></g>`;

export const bushSvg = (s = 1) =>
  `<svg viewBox="0 0 160 100" width="${160 * s}" height="${100 * s}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="80" cy="92" rx="70" ry="8" fill="rgba(0,0,0,.15)"/><circle cx="40" cy="62" r="34" fill="#2f8a4a"/><circle cx="82" cy="46" r="40" fill="#3a9d55"/><circle cx="122" cy="62" r="34" fill="#2f8a4a"/><circle cx="82" cy="70" r="30" fill="#3a9d55"/><circle cx="60" cy="38" r="9" fill="#56b96f" opacity=".7"/><circle cx="104" cy="30" r="7" fill="#56b96f" opacity=".7"/><circle cx="30" cy="56" r="5" fill="#e8504a"/><circle cx="118" cy="52" r="5" fill="#e8504a"/><circle cx="84" cy="74" r="5" fill="#e8504a"/></svg>`;


/* ───────────── Comic-Tiere für die 2,5D-Welt ───────────── */
const OUT = '#3a2412';
const ol = `stroke="${OUT}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

export function squirrelSvg(): string {
  return `<svg viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg">
  <path d="M60 130 C8 140 4 70 40 52 C26 78 46 96 74 104Z" fill="#d9772b" ${ol}/>
  <path d="M30 62 C20 80 30 100 48 108" fill="none" stroke="#f3b36a" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="86" cy="116" rx="36" ry="32" fill="#e8873a" ${ol}/>
  <ellipse cx="96" cy="124" rx="20" ry="20" fill="#ffe3b8"/>
  <circle cx="108" cy="72" r="32" fill="#e8873a" ${ol}/>
  <path d="M92 48 L88 22 L112 40Z" fill="#e8873a" ${ol}/><path d="M92 44 L91 30 L104 40Z" fill="#ffb3a0"/>
  <ellipse cx="122" cy="84" rx="16" ry="12" fill="#ffe3b8"/>
  <ellipse cx="116" cy="66" rx="8" ry="10" fill="#2a1a10"/><circle cx="119" cy="62" r="3.4" fill="#fff"/>
  <ellipse cx="136" cy="78" rx="5" ry="4" fill="#2a1a10"/>
  <path d="M120 90 q6 6 12 0" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="72" cy="146" rx="16" ry="9" fill="#d9772b" ${ol}/><ellipse cx="108" cy="146" rx="16" ry="9" fill="#d9772b" ${ol}/>
</svg>`;
}

export type PetKind = 'meerschwein' | 'kaninchen' | 'hamster' | 'wellensittich';

export function petSvg(kind: PetKind): string {
  const eye = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="9" fill="#2a1a10"/><circle cx="${x + 2.5}" cy="${y - 3.5}" r="3" fill="#fff"/>`;
  switch (kind) {
    case 'meerschwein':
      return `<svg viewBox="0 0 190 130" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="88" cy="78" rx="70" ry="42" fill="#c8864a" ${ol}/>
  <path d="M40 60 Q64 30 96 42 Q76 62 84 90 Q50 92 36 78Z" fill="#fff2dc"/>
  <ellipse cx="150" cy="76" rx="34" ry="30" fill="#c8864a" ${ol}/>
  <path d="M146 50 q-4 -18 8 -22 q12 8 6 24z" fill="#a8683a" ${ol}/>
  <path d="M158 54 q10 -16 22 -10 q2 14 -10 22z" fill="#a8683a" ${ol}/>
  <ellipse cx="166" cy="86" rx="14" ry="11" fill="#fff2dc"/>${eye(158, 68)}
  <ellipse cx="180" cy="82" rx="6" ry="5" fill="#ff9fa8" ${ol}/>
  <path d="M168 94 q6 5 11 -1" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="60" cy="118" rx="14" ry="8" fill="#a8683a" ${ol}/><ellipse cx="118" cy="118" rx="14" ry="8" fill="#a8683a" ${ol}/>
</svg>`;
    case 'kaninchen':
      return `<svg viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="62" cy="52" rx="14" ry="44" fill="#d8d2ca" ${ol} transform="rotate(-8 62 52)"/><ellipse cx="62" cy="54" rx="6" ry="32" fill="#ffb3c0" transform="rotate(-8 62 54)"/>
  <ellipse cx="104" cy="52" rx="14" ry="44" fill="#d8d2ca" ${ol} transform="rotate(10 104 52)"/><ellipse cx="104" cy="54" rx="6" ry="32" fill="#ffb3c0" transform="rotate(10 104 54)"/>
  <ellipse cx="82" cy="146" rx="46" ry="38" fill="#e8e2da" ${ol}/><ellipse cx="82" cy="152" rx="26" ry="26" fill="#fff"/>
  <ellipse cx="82" cy="98" rx="44" ry="38" fill="#e8e2da" ${ol}/>
  ${eye(66, 94)}${eye(98, 94)}
  <path d="M74 108 L90 108 L82 118Z" fill="#ff9fa8" ${ol}/><path d="M82 118 q-8 8 -16 2 M82 118 q8 8 16 2" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
  <rect x="75" y="122" width="14" height="13" rx="3" fill="#fff" ${ol}/>
  <ellipse cx="52" cy="110" rx="9" ry="6" fill="#ffb3c0" opacity=".7"/><ellipse cx="112" cy="110" rx="9" ry="6" fill="#ffb3c0" opacity=".7"/>
  <ellipse cx="54" cy="178" rx="18" ry="9" fill="#e8e2da" ${ol}/><ellipse cx="110" cy="178" rx="18" ry="9" fill="#e8e2da" ${ol}/>
</svg>`;
    case 'hamster':
      return `<svg viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="82" rx="56" ry="48" fill="#f0b45a" ${ol}/>
  <ellipse cx="80" cy="96" rx="34" ry="30" fill="#fff0d4"/>
  <circle cx="44" cy="44" r="14" fill="#f0b45a" ${ol}/><circle cx="44" cy="44" r="7" fill="#ffb3a0"/>
  <circle cx="116" cy="44" r="14" fill="#f0b45a" ${ol}/><circle cx="116" cy="44" r="7" fill="#ffb3a0"/>
  <ellipse cx="42" cy="86" rx="18" ry="15" fill="#ffd89a" ${ol}/><ellipse cx="118" cy="86" rx="18" ry="15" fill="#ffd89a" ${ol}/>
  ${eye(62, 66)}${eye(98, 66)}
  <ellipse cx="80" cy="80" rx="7" ry="5" fill="#ff9fa8" ${ol}/><path d="M80 85 q-6 8 -12 2 M80 85 q6 8 12 2" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="56" cy="130" rx="14" ry="8" fill="#e0a04a" ${ol}/><ellipse cx="104" cy="130" rx="14" ry="8" fill="#e0a04a" ${ol}/>
  <ellipse cx="80" cy="112" rx="9" ry="6" fill="#8a5a2b" ${ol}/>
</svg>`;
    default:
      return `<svg viewBox="0 0 130 170" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 120 L40 168 L62 150 L70 168 L80 120Z" fill="#2aa7d8" ${ol}/>
  <ellipse cx="65" cy="98" rx="38" ry="46" fill="#5fcf6a" ${ol}/>
  <ellipse cx="65" cy="106" rx="24" ry="32" fill="#a6ec8a"/>
  <circle cx="68" cy="46" r="32" fill="#ffe14a" ${ol}/>
  <ellipse cx="48" cy="52" rx="10" ry="7" fill="#4aa8e8"/><ellipse cx="86" cy="52" rx="10" ry="7" fill="#4aa8e8"/>
  ${eye(54, 40)}${eye(82, 40)}
  <path d="M60 50 L76 50 L68 66Z" fill="#ff9a3c" ${ol}/>
  <path d="M30 100 q-14 20 4 44 q10 -22 8 -44z" fill="#4fbf5a" ${ol}/>
  <path d="M92 100 q14 20 -4 44 q-10 -22 -8 -44z" fill="#4fbf5a" ${ol}/>
  <path d="M52 140 h10 M72 140 h10" stroke="#ff9a3c" stroke-width="6" stroke-linecap="round"/>
</svg>`;
  }
}
