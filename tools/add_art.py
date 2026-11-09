# Einmaliges Hilfsskript: hängt Comic-Zeichnungen für Eichhörnchen und Haustiere an src/ui/art.ts an.
add = r'''

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
'''
p = 'src/ui/art.ts'
s = open(p, encoding='utf-8').read()
if 'squirrelSvg' not in s:
    s += add
open(p, 'w', encoding='utf-8').write(s)
print('ok')
