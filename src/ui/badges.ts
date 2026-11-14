/** Abzeichen: Grafik, Feier beim Erwerb, Meldung nach einem Durchlauf und das Abzeichenbuch. */
import { h } from '../core/dom';
import { worlds } from '../core/texts';
import { getProgress } from '../core/progress';
import { worldUnlocked } from '../core/unlock';
import {
  badgeCount, badgeWorlds, examPassed, gameBadges, hasBadge, masterBadge, NEED_RUNS, recordRun, runsOf, type BadgeDef,
} from '../core/badges';
import { openModal } from './modal';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

const star8 = () => Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 40 : 50; return `${(60 + Math.cos(a) * r).toFixed(1)},${(62 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
const hex = () => Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return `${(60 + Math.cos(a) * 48).toFixed(1)},${(62 + Math.sin(a) * 48).toFixed(1)}`; }).join(' ');
const flower = (fill: string, stroke: string) => Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return `<circle cx="${(60 + Math.cos(a) * 33).toFixed(1)}" cy="${(62 + Math.sin(a) * 33).toFixed(1)}" r="17" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`; }).join('');

function outline(shape: string, fill: string, dark: string): string {
  switch (shape) {
    case 'star': return `<polygon points="${star8()}" fill="${fill}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'hex': return `<polygon points="${hex()}" fill="${fill}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'shield': return `<path d="M18 18 Q60 30 102 18 L102 66 Q102 100 60 116 Q18 100 18 66Z" fill="${fill}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'flower': return flower(fill, dark) + `<circle cx="60" cy="62" r="34" fill="${fill}"/>`;
    default: return `<circle cx="60" cy="62" r="48" fill="${fill}" stroke="${dark}" stroke-width="4"/>`;
  }
}

/** Mehr Schatten oder Licht auf eine Farbe */
function shade(hex6: string, k: number) {
  const n = parseInt(hex6.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function badgeSvg(b: BadgeDef, own = true): string {
  const dark = shade(b.color, -0.38), light = shade(b.color, 0.35);
  const ribbon = b.master ? '#e8504a' : '#4a90d9', ribbon2 = b.master ? '#b9302a' : '#2e69a6';
  const id = 'g' + b.key.replace(/\W/g, '');
  return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" class="badge-svg${own ? '' : ' locked'}">
  <defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${b.color}"/></radialGradient></defs>
  <path d="M38 92 l-16 54 l20 -10 l10 14 l10 -52z" fill="${ribbon}" stroke="${ribbon2}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M82 92 l16 54 l-20 -10 l-10 14 l-10 -52z" fill="${ribbon}" stroke="${ribbon2}" stroke-width="3" stroke-linejoin="round"/>
  ${outline(b.shape, `url(#${id})`, dark)}
  <circle cx="60" cy="62" r="33" fill="none" stroke="${shade(b.color, 0.55)}" stroke-width="3" stroke-dasharray="3 5" opacity=".9"/>
  <text x="60" y="76" text-anchor="middle" font-size="40">${b.icon}</text>
  <ellipse cx="44" cy="38" rx="16" ry="7" fill="#fff" opacity=".35" transform="rotate(-28 44 38)"/>
  ${b.master ? `<text x="60" y="104" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" stroke="${dark}" stroke-width="3" paint-order="stroke">★ ★ ★</text>` : ''}
</svg>`;
}

/** Feier-Fenster für ein neues Abzeichen */
export function celebrateBadge(b: BadgeDef): Promise<void> {
  return new Promise((resolve) => {
    sfx.star();
    const close = openModal({
      title: b.master ? 'Mathearbeit bestanden!' : 'Neues Abzeichen!',
      closable: false,
      onClose: resolve,
      content: h('div', { class: 'badge-cel' },
        h('div', { class: 'badge-big pop', html: badgeSvg(b, true) }),
        h('div', { class: 'cel-name' }, b.name),
        h('small', {}, b.what),
        h('button', { class: 'btn sun', onclick: () => close() }, 'Toll!')),
    });
    for (let i = 0; i < 18; i++) setTimeout(() => { const c = h('div', { class: 'confetti', style: { left: Math.random() * 1100 + 'px', animationDelay: Math.random() * 0.8 + 's' } }, ['⭐', '🎉', '🏅', '✨'][i % 4]); document.querySelector('.modal-back')?.append(c); setTimeout(() => c.remove(), 4200); }, i * 40);
    speak(b.master ? 'badge.master' : 'badge.new', { name: b.name });
  });
}

/** Meldet das Ergebnis eines Durchlaufs; gibt eine Zeile für das Ergebnis-Fenster zurück ("" = nichts zu sagen). */
export async function badgeRun(key: string, clean: boolean): Promise<string> {
  const def = gameBadges(key.split('.')[0]).find((b) => b.key === key);
  if (!def) return '';
  if (hasBadge(key)) return '';
  if (!clean) return `🏅 „${def.name}“: ${runsOf(key)} von ${NEED_RUNS} fehlerfreien Durchgängen.`;
  const r = recordRun(key, true);
  if (r.newly) { await celebrateBadge(def); return `🏅 Abzeichen „${def.name}“ erhalten!`; }
  speak('badge.run1', { name: def.name });
  return `🏅 Fehlerfrei! Noch ${NEED_RUNS - r.runs} fehlerfreier Durchgang, dann bekommst du das Abzeichen „${def.name}“ (${r.runs} von ${NEED_RUNS}).`;
}

/** Das Abzeichenbuch: eine Seite je Welt */
export function openBadgeBook(focus?: string) {
  const ws = badgeWorlds();
  let cur = focus && ws.some((w) => w.id === focus) ? focus : ws.find((w) => worldUnlocked(w.id))?.id ?? ws[0].id;
  const body = h('div', { class: 'bbook' });
  function render() {
    const w = worlds.find((x) => x.id === cur)!;
    const open = worldUnlocked(cur);
    const pips = (n: number) => '●'.repeat(Math.min(n, NEED_RUNS)) + '○'.repeat(Math.max(0, NEED_RUNS - n));
    const m = masterBadge(cur)!;
    body.replaceChildren(
      h('div', { class: 'bb-tabs' }, ...ws.map((x) => h('button', { class: 'bb-tab' + (x.id === cur ? ' on' : '') + (worldUnlocked(x.id) ? '' : ' off'), onclick: () => { cur = x.id; sfx.pop(); render(); } }, x.meta.icon, ' ' + x.meta.title))),
      open ? h('div', { class: 'bb-grid' },
        ...gameBadges(cur).map((b) => {
          const own = hasBadge(b.key);
          return h('div', { class: 'bb-card' + (own ? ' own' : '') },
            h('div', { class: 'bb-art', html: badgeSvg(b, own) }),
            h('b', {}, own ? b.name : b.name),
            h('small', {}, `${b.npc} · ${b.what}`),
            h('div', { class: 'bb-pips' }, own ? '✓ erhalten' : `${pips(runsOf(b.key))} fehlerfrei`));
        }),
        h('div', { class: 'bb-card master' + (examPassed(cur) ? ' own' : '') },
          h('div', { class: 'bb-art', html: badgeSvg(m, examPassed(cur)) }),
          h('b', {}, m.name),
          h('small', {}, 'Eule Olga am Nebeltor'),
          h('div', { class: 'bb-pips' }, examPassed(cur) ? `✓ bestanden (${getProgress().passed[cur]} von 5)` : 'Mathearbeit: alle Abzeichen nötig, dann 4 von 5 richtig')))
        : h('div', { class: 'bb-closed' }, h('div', { class: 'bb-lock' }, '🌫️'), h('p', {}, `Die ${w.meta.title} liegt noch hinter dem Nebel. Zuerst die vorige Welt meistern!`)),
      h('small', { class: 'pet-hint' }, `Ein Abzeichen bekommst du, wenn du ein Spiel ${NEED_RUNS}× ohne einen einzigen Fehler schaffst. Mit allen Abzeichen darfst du bei Eule Olga die Mathearbeit schreiben.`));
  }
  render();
  openModal({ title: '📖 Abzeichenbuch', wide: true, content: body });
}

export const badgeChipText = () => { const { got, all } = badgeCount(); return `🏅 ${got}/${all}`; };
