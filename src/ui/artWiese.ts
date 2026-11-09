/** Comic-Figuren der Wiese: Biene Bella, Schnecke Schorsch, Schmetterling Fritzi, Grashüpfer Hannes, Feldmaus. */
const INK = '#3b2a1e';

const eyes = (lx: number, rx: number, y: number, r = 8) =>
  `<circle cx="${lx}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${rx}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="${lx + 1.5}" cy="${y + 1}" r="${r * 0.55}" fill="${INK}"/><circle cx="${rx + 1.5}" cy="${y + 1}" r="${r * 0.55}" fill="${INK}"/>
  <circle cx="${lx + 3}" cy="${y - 2}" r="${r * 0.2}" fill="#fff"/><circle cx="${rx + 3}" cy="${y - 2}" r="${r * 0.2}" fill="#fff"/>`;

/** Biene Bella (mit Honigtopf) */
export function beeSvg(): string {
  return `<svg viewBox="0 0 200 225" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <defs><clipPath id="bee-c"><ellipse cx="100" cy="150" rx="47" ry="54"/></clipPath></defs>
  <ellipse cx="62" cy="108" rx="34" ry="19" fill="#d8f1ff" stroke="#8cc4e6" stroke-width="3" transform="rotate(-28 62 108)" opacity=".92"/>
  <ellipse cx="138" cy="108" rx="34" ry="19" fill="#d8f1ff" stroke="#8cc4e6" stroke-width="3" transform="rotate(28 138 108)" opacity=".92"/>
  <ellipse cx="100" cy="150" rx="47" ry="54" fill="#ffd23f" stroke="#a67c00" stroke-width="3.5"/>
  <g clip-path="url(#bee-c)"><rect x="40" y="140" width="120" height="17" fill="${INK}"/><rect x="40" y="172" width="120" height="17" fill="${INK}"/></g>
  <ellipse cx="78" cy="206" rx="17" ry="8" fill="${INK}"/><ellipse cx="122" cy="206" rx="17" ry="8" fill="${INK}"/>
  <path d="M80 56 q-8 -26 -26 -28 M120 56 q8 -26 26 -28" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="54" cy="28" r="7" fill="#ffd23f" stroke="${INK}" stroke-width="3"/><circle cx="146" cy="28" r="7" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
  <circle cx="100" cy="88" r="42" fill="#ffd23f" stroke="#a67c00" stroke-width="3.5"/>
  ${eyes(82, 118, 84, 9)}
  <ellipse cx="68" cy="102" rx="9" ry="6" fill="#ff9aa8" opacity=".65"/><ellipse cx="132" cy="102" rx="9" ry="6" fill="#ff9aa8" opacity=".65"/>
  <path d="M86 104 q14 14 28 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
  <g transform="translate(138 160)"><path d="M0 0 h34 l-4 28 q-13 7 -26 0z" fill="#d9993a" stroke="#8a5a1c" stroke-width="3" stroke-linejoin="round"/><rect x="-2" y="-6" width="38" height="9" rx="4" fill="#f0b85a" stroke="#8a5a1c" stroke-width="3"/><text x="17" y="21" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="15" fill="#fff6d8">100</text></g>
</svg>`;
}

/** Schnecke Schorsch */
export function snailSvg(): string {
  return `<svg viewBox="0 0 230 200" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M18 176 Q22 154 54 154 L196 154 Q222 156 220 176 Q150 190 18 176Z" fill="#b9cf7a" stroke="#7f9a43" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M30 160 Q22 120 40 84 Q56 62 68 86 Q70 120 80 156Z" fill="#b9cf7a" stroke="#7f9a43" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M42 80 Q36 44 28 30 M62 80 Q62 46 70 28" fill="none" stroke="#7f9a43" stroke-width="6" stroke-linecap="round"/>
  <circle cx="26" cy="26" r="11" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="72" cy="24" r="11" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="24" cy="28" r="5" fill="${INK}"/><circle cx="70" cy="26" r="5" fill="${INK}"/>
  <path d="M38 118 q10 10 24 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="34" cy="106" rx="7" ry="5" fill="#ff9aa8" opacity=".6"/>
  <circle cx="132" cy="112" r="56" fill="#e9a24b" stroke="#a8641a" stroke-width="4"/>
  <path d="M132 112 m0 0 q0 -14 14 -14 q20 0 20 22 q0 30 -34 30 q-44 0 -44 -42 q0 -52 58 -52" fill="none" stroke="#a8641a" stroke-width="5" stroke-linecap="round"/>
  <circle cx="108" cy="92" r="6" fill="#f6c274" opacity=".7"/>
</svg>`;
}

/** Schmetterling Fritzi */
export function butterflySvg(): string {
  return `<svg viewBox="0 0 200 215" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M96 110 C44 22 2 56 12 104 C18 134 62 146 96 126Z" fill="#c9a3ff" stroke="#7d52c9" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M104 110 C156 22 198 56 188 104 C182 134 138 146 104 126Z" fill="#c9a3ff" stroke="#7d52c9" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M96 128 C52 130 36 176 62 190 C82 198 98 170 98 140Z" fill="#ff9ec4" stroke="#c9568a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M104 128 C148 130 164 176 138 190 C118 198 102 170 102 140Z" fill="#ff9ec4" stroke="#c9568a" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="52" cy="84" r="13" fill="#fff6d8"/><circle cx="148" cy="84" r="13" fill="#fff6d8"/><circle cx="66" cy="164" r="8" fill="#fff6d8"/><circle cx="134" cy="164" r="8" fill="#fff6d8"/>
  <ellipse cx="100" cy="132" rx="13" ry="50" fill="#5c3b7a" stroke="${INK}" stroke-width="3"/>
  <circle cx="100" cy="78" r="26" fill="#f6e3c8" stroke="${INK}" stroke-width="3.5"/>
  <path d="M90 56 q-8 -28 -24 -32 M110 56 q8 -28 24 -32" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="66" cy="24" r="6" fill="#ff9ec4" stroke="${INK}" stroke-width="3"/><circle cx="134" cy="24" r="6" fill="#ff9ec4" stroke="${INK}" stroke-width="3"/>
  ${eyes(90, 110, 76, 6.5)}
  <path d="M91 91 q9 9 18 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

/** Grashüpfer Hannes */
export function grasshopperSvg(): string {
  return `<svg viewBox="0 0 200 225" xmlns="http://www.w3.org/2000/svg" class="npc-svg">
  <path d="M142 170 L178 120 L190 200 L176 202 L166 160 L136 200Z" fill="#79c24a" stroke="#4a8a2a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M58 170 L22 120 L10 200 L24 202 L34 160 L64 200Z" fill="#79c24a" stroke="#4a8a2a" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="100" cy="162" rx="44" ry="50" fill="#8fd35a" stroke="#4a8a2a" stroke-width="3.5"/>
  <ellipse cx="100" cy="176" rx="26" ry="34" fill="#dff5b8"/>
  <ellipse cx="78" cy="212" rx="16" ry="7" fill="#4a8a2a"/><ellipse cx="122" cy="212" rx="16" ry="7" fill="#4a8a2a"/>
  <path d="M82 50 q-14 -34 -40 -34 M118 50 q14 -34 40 -34" fill="none" stroke="#4a8a2a" stroke-width="4" stroke-linecap="round"/>
  <circle cx="42" cy="16" r="5" fill="#4a8a2a"/><circle cx="158" cy="16" r="5" fill="#4a8a2a"/>
  <ellipse cx="100" cy="88" rx="40" ry="44" fill="#8fd35a" stroke="#4a8a2a" stroke-width="3.5"/>
  ${eyes(80, 120, 80, 11)}
  <ellipse cx="66" cy="104" rx="8" ry="5" fill="#ff9aa8" opacity=".6"/><ellipse cx="134" cy="104" rx="8" ry="5" fill="#ff9aa8" opacity=".6"/>
  <path d="M84 106 q16 14 32 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M78 134 h44 l-6 16 h-32z" fill="#fff" stroke="#d94a4a" stroke-width="3.5" stroke-linejoin="round"/><text x="100" y="147" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="12" fill="#d94a4a">0 – 1000</text>
</svg>`;
}

/** Feldmaus (streichelbar) */
export function mouseSvg(): string {
  return `<svg viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg">
  <path d="M120 150 q40 -2 30 -44 q-4 -14 -14 -10" fill="none" stroke="#e6a8a8" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="82" cy="126" rx="44" ry="38" fill="#b9a48a" stroke="#7d6a52" stroke-width="3.5"/>
  <ellipse cx="82" cy="136" rx="26" ry="26" fill="#efe2cc"/>
  <ellipse cx="60" cy="160" rx="13" ry="6" fill="#e6a8a8"/><ellipse cx="104" cy="160" rx="13" ry="6" fill="#e6a8a8"/>
  <circle cx="52" cy="54" r="22" fill="#b9a48a" stroke="#7d6a52" stroke-width="3.5"/><circle cx="52" cy="54" r="13" fill="#f2b8b8"/>
  <circle cx="112" cy="54" r="22" fill="#b9a48a" stroke="#7d6a52" stroke-width="3.5"/><circle cx="112" cy="54" r="13" fill="#f2b8b8"/>
  <ellipse cx="82" cy="84" rx="40" ry="34" fill="#b9a48a" stroke="#7d6a52" stroke-width="3.5"/>
  <circle cx="66" cy="78" r="6" fill="${INK}"/><circle cx="98" cy="78" r="6" fill="${INK}"/><circle cx="68" cy="75" r="2" fill="#fff"/><circle cx="100" cy="75" r="2" fill="#fff"/>
  <ellipse cx="82" cy="92" rx="6" ry="4.5" fill="#e07a8a"/>
  <path d="M82 96 q-6 8 -13 3 M82 96 q6 8 13 3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M52 92 l-24 -4 M52 98 l-24 6 M112 92 l24 -4 M112 98 l24 6" stroke="#7d6a52" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}
