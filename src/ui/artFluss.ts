/** Comic-Figuren am Fluss: Biber Bruno, Frosch Fred, Ente Emma, Otter Otto und ein Küken (streichelbar). */
const INK = '#3b2a1e';

const eyes = (lx: number, rx: number, y: number, r = 8) =>
  `<circle cx="${lx}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${rx}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="${lx + 1.5}" cy="${y + 1}" r="${r * 0.55}" fill="${INK}"/><circle cx="${rx + 1.5}" cy="${y + 1}" r="${r * 0.55}" fill="${INK}"/>
  <circle cx="${lx + 3}" cy="${y - 2}" r="${r * 0.2}" fill="#fff"/><circle cx="${rx + 3}" cy="${y - 2}" r="${r * 0.2}" fill="#fff"/>`;

/** Biber Bruno mit Baumstamm */
export function beaverSvg(): string {
  return `<svg viewBox="0 0 210 220" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M146 176 q50 -6 56 26 q-30 18 -62 -8z" fill="#6b4a2b" stroke="#3f2a15" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M158 184 l30 6 M154 194 l30 4 M162 176 l26 8" stroke="#3f2a15" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="100" cy="158" rx="50" ry="52" fill="#a8703a" stroke="#6b4521" stroke-width="3.5"/>
  <ellipse cx="100" cy="172" rx="28" ry="34" fill="#e6c08a"/>
  <ellipse cx="74" cy="210" rx="18" ry="8" fill="#6b4521"/><ellipse cx="126" cy="210" rx="18" ry="8" fill="#6b4521"/>
  <circle cx="58" cy="52" r="15" fill="#a8703a" stroke="#6b4521" stroke-width="3.5"/><circle cx="142" cy="52" r="15" fill="#a8703a" stroke="#6b4521" stroke-width="3.5"/>
  <circle cx="58" cy="53" r="7" fill="#e6a8a0"/><circle cx="142" cy="53" r="7" fill="#e6a8a0"/>
  <ellipse cx="100" cy="92" rx="48" ry="44" fill="#a8703a" stroke="#6b4521" stroke-width="3.5"/>
  <ellipse cx="100" cy="108" rx="30" ry="22" fill="#e6c08a"/>
  ${eyes(80, 120, 84, 9)}
  <ellipse cx="100" cy="100" rx="9" ry="6.5" fill="#3b2a1e"/>
  <rect x="91" y="108" width="18" height="17" rx="4" fill="#fff" stroke="${INK}" stroke-width="2.5"/><line x1="100" y1="108" x2="100" y2="125" stroke="${INK}" stroke-width="2"/>
  <path d="M84 106 q-4 8 4 8 M116 106 q4 8 -4 8" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
  <g transform="rotate(-8 100 160)"><rect x="56" y="150" width="88" height="30" rx="14" fill="#c98a4a" stroke="#6b4521" stroke-width="3.5"/><ellipse cx="144" cy="165" rx="9" ry="15" fill="#e6c08a" stroke="#6b4521" stroke-width="3"/><circle cx="144" cy="165" r="4" fill="#c98a4a"/><text x="96" y="172" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="18" fill="#fff6d8">3 × 4</text></g>
</svg>`;
}

/** Frosch Fred */
export function frogSvg(): string {
  return `<svg viewBox="0 0 210 200" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M40 172 q-30 6 -26 24 q30 4 52 -8z M170 172 q30 6 26 24 q-30 4 -52 -8z" fill="#5fbf4a" stroke="#2f7a2a" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="105" cy="148" rx="56" ry="50" fill="#6fd055" stroke="#2f7a2a" stroke-width="3.5"/>
  <ellipse cx="105" cy="162" rx="34" ry="32" fill="#e9f8c0"/>
  <ellipse cx="78" cy="194" rx="20" ry="7" fill="#2f7a2a"/><ellipse cx="132" cy="194" rx="20" ry="7" fill="#2f7a2a"/>
  <ellipse cx="105" cy="94" rx="58" ry="40" fill="#6fd055" stroke="#2f7a2a" stroke-width="3.5"/>
  <circle cx="68" cy="58" r="22" fill="#6fd055" stroke="#2f7a2a" stroke-width="3.5"/><circle cx="142" cy="58" r="22" fill="#6fd055" stroke="#2f7a2a" stroke-width="3.5"/>
  ${eyes(68, 142, 58, 14).replace(/stroke-width="2.5"/g, 'stroke-width="3"')}
  <ellipse cx="62" cy="112" rx="10" ry="6" fill="#ff9aa8" opacity=".65"/><ellipse cx="148" cy="112" rx="10" ry="6" fill="#ff9aa8" opacity=".65"/>
  <path d="M70 104 q35 36 70 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="100" cy="92" r="2.5" fill="#2f7a2a"/><circle cx="110" cy="92" r="2.5" fill="#2f7a2a"/>
  <g transform="translate(138 150) rotate(10)"><circle r="19" fill="#4aa8e8" stroke="#2e69a6" stroke-width="3"/><text y="7" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="20" fill="#fff">7×</text></g>
</svg>`;
}

/** Ente Emma */
export function duckSvg(): string {
  return `<svg viewBox="0 0 200 215" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M150 168 q36 -18 40 -44 q-26 10 -48 26z" fill="#ffd23f" stroke="#b38700" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="100" cy="158" rx="52" ry="48" fill="#ffd94a" stroke="#b38700" stroke-width="3.5"/>
  <path d="M60 150 q-18 20 6 40 q26 -10 28 -34z" fill="#ffc41a" stroke="#b38700" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="82" cy="204" rx="22" ry="8" fill="#ff9a3c" stroke="#b9531a" stroke-width="3"/><ellipse cx="124" cy="204" rx="22" ry="8" fill="#ff9a3c" stroke="#b9531a" stroke-width="3"/>
  <circle cx="100" cy="82" r="46" fill="#ffd94a" stroke="#b38700" stroke-width="3.5"/>
  <path d="M86 40 q4 -22 18 -22 q-6 8 -4 22z" fill="#ffd94a" stroke="#b38700" stroke-width="3" stroke-linejoin="round"/>
  ${eyes(82, 118, 74, 9)}
  <ellipse cx="68" cy="92" rx="9" ry="6" fill="#ff9aa8" opacity=".65"/><ellipse cx="132" cy="92" rx="9" ry="6" fill="#ff9aa8" opacity=".65"/>
  <path d="M74 92 Q100 84 126 92 Q128 112 100 114 Q72 112 74 92Z" fill="#ff9a3c" stroke="#b9531a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M86 100 q14 7 28 0" fill="none" stroke="#b9531a" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(70 150)"><path d="M0 0 q30 -8 60 0 q-4 22 -30 22 q-26 0 -30 -22z" fill="#fff" stroke="#4a90d9" stroke-width="3.5" stroke-linejoin="round"/><text x="30" y="17" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="15" fill="#2e69a6">12 : 3</text></g>
</svg>`;
}

/** Otter Otto mit Kieseln */
export function otterSvg(): string {
  return `<svg viewBox="0 0 210 225" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M146 182 q54 -8 54 22 q-28 14 -60 -6z" fill="#8a5a3a" stroke="#4f3220" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="100" cy="162" rx="48" ry="54" fill="#8a5a3a" stroke="#4f3220" stroke-width="3.5"/>
  <ellipse cx="100" cy="172" rx="28" ry="38" fill="#e8c9a4"/>
  <ellipse cx="76" cy="215" rx="18" ry="8" fill="#4f3220"/><ellipse cx="124" cy="215" rx="18" ry="8" fill="#4f3220"/>
  <circle cx="62" cy="56" r="13" fill="#8a5a3a" stroke="#4f3220" stroke-width="3.5"/><circle cx="138" cy="56" r="13" fill="#8a5a3a" stroke="#4f3220" stroke-width="3.5"/>
  <ellipse cx="100" cy="94" rx="46" ry="42" fill="#8a5a3a" stroke="#4f3220" stroke-width="3.5"/>
  <ellipse cx="100" cy="110" rx="32" ry="24" fill="#e8c9a4"/>
  ${eyes(82, 118, 86, 8.5)}
  <ellipse cx="100" cy="102" rx="9" ry="6.5" fill="#3b2a1e"/>
  <path d="M100 109 q-9 10 -17 3 M100 109 q9 10 17 3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M66 106 l-22 -4 M66 112 l-22 6 M134 106 l22 -4 M134 112 l22 6" stroke="#4f3220" stroke-width="2.2" stroke-linecap="round"/>
  <g transform="translate(70 150)"><ellipse cx="14" cy="14" rx="15" ry="12" fill="#b9bcc6" stroke="#6b6e78" stroke-width="3"/><ellipse cx="42" cy="10" rx="13" ry="11" fill="#cfd2da" stroke="#6b6e78" stroke-width="3"/><ellipse cx="32" cy="26" rx="14" ry="11" fill="#a9acb6" stroke="#6b6e78" stroke-width="3"/></g>
</svg>`;
}

/** Küken (streichelbar) */
export function chickSvg(): string {
  return `<svg viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="126" rx="46" ry="38" fill="#ffe14d" stroke="#b38700" stroke-width="3.5"/>
  <path d="M44 126 q-16 6 -8 20 q14 0 22 -12z M116 126 q16 6 8 20 q-14 0 -22 -12z" fill="#ffd21a" stroke="#b38700" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="62" cy="162" rx="12" ry="5" fill="#ff9a3c"/><ellipse cx="98" cy="162" rx="12" ry="5" fill="#ff9a3c"/>
  <circle cx="80" cy="70" r="38" fill="#ffe14d" stroke="#b38700" stroke-width="3.5"/>
  <path d="M74 34 q4 -16 12 -14 q-2 8 0 14z" fill="#ffe14d" stroke="#b38700" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="66" cy="66" r="6" fill="${INK}"/><circle cx="94" cy="66" r="6" fill="${INK}"/><circle cx="68" cy="63" r="2" fill="#fff"/><circle cx="96" cy="63" r="2" fill="#fff"/>
  <path d="M70 78 L90 78 L80 92z" fill="#ff9a3c" stroke="#b9531a" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="54" cy="80" rx="7" ry="5" fill="#ff9aa8" opacity=".65"/><ellipse cx="106" cy="80" rx="7" ry="5" fill="#ff9aa8" opacity=".65"/>
</svg>`;
}

/** Waschbär Rocky (Autohändler) mit Schlüssel und Kappe */
export function raccoonSvg(): string {
  return `<svg viewBox="0 0 210 220" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M148 170 q52 -10 54 26 q-30 16 -62 -6z" fill="#8d919e" stroke="#4a4e5a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M160 176 l6 22 M174 174 l4 22 M188 178 l-2 18" stroke="#3a3d48" stroke-width="9" stroke-linecap="round"/>
  <ellipse cx="100" cy="160" rx="50" ry="52" fill="#9a9eab" stroke="#4a4e5a" stroke-width="3.5"/>
  <ellipse cx="100" cy="172" rx="28" ry="34" fill="#e9ebf0"/>
  <ellipse cx="76" cy="212" rx="18" ry="8" fill="#3a3d48"/><ellipse cx="124" cy="212" rx="18" ry="8" fill="#3a3d48"/>
  <polygon points="56,58 52,16 92,44" fill="#9a9eab" stroke="#4a4e5a" stroke-width="3.5" stroke-linejoin="round"/><polygon points="144,58 148,16 108,44" fill="#9a9eab" stroke="#4a4e5a" stroke-width="3.5" stroke-linejoin="round"/>
  <polygon points="60,50 58,28 80,44" fill="#3a3d48"/><polygon points="140,50 142,28 120,44" fill="#3a3d48"/>
  <ellipse cx="100" cy="92" rx="50" ry="44" fill="#9a9eab" stroke="#4a4e5a" stroke-width="3.5"/>
  <path d="M52 84 Q74 70 100 84 Q126 70 148 84 Q150 106 126 104 Q112 102 100 96 Q88 102 74 104 Q50 106 52 84Z" fill="#33363f"/>
  <ellipse cx="100" cy="112" rx="26" ry="20" fill="#e9ebf0"/>
  <circle cx="78" cy="88" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="122" cy="88" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="80" cy="89" r="5" fill="${INK}"/><circle cx="124" cy="89" r="5" fill="${INK}"/><circle cx="82" cy="86" r="1.8" fill="#fff"/><circle cx="126" cy="86" r="1.8" fill="#fff"/>
  <ellipse cx="100" cy="106" rx="8" ry="6" fill="#3b2a1e"/>
  <path d="M100 112 q-9 10 -17 3 M100 112 q9 10 17 3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M56 46 Q100 14 144 46 L136 54 Q100 36 64 54Z" fill="#e0483f" stroke="#a02820" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M130 52 q34 -2 38 8 q-20 8 -42 0z" fill="#e0483f" stroke="#a02820" stroke-width="3" stroke-linejoin="round"/>
  <g transform="translate(120 150) rotate(12)"><circle r="10" fill="none" stroke="#e9b410" stroke-width="5"/><rect x="8" y="-3" width="30" height="6" rx="3" fill="#e9b410"/><rect x="28" y="2" width="5" height="9" fill="#e9b410"/><rect x="36" y="2" width="5" height="7" fill="#e9b410"/></g>
</svg>`;
}
