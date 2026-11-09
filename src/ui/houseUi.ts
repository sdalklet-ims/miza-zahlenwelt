/** Baumarkt (Material kaufen) und Bauplan (aufbauen, Farben wählen) für Mias Haus. */
import { h } from '../core/dom';
import { houseCfg } from '../core/texts';
import { onProgress, getProgress } from '../core/progress';
import { coins } from '../core/rewards';
import { builtCount, buy, canBuild, isBuilt, isOwned, missing, parts, partById, readyCount, setColor, stageNow } from '../core/house';
import { openModal } from './modal';
import { speak } from '../audio/speak';
import { digitsOf } from '../stations/wald/generators';

export interface HouseUiOpts {
  mode: 'shop' | 'plan';
  /** Wird aufgerufen, wenn ein Teil aufgebaut wird (Animation, Meilensteine übernimmt die Welt) */
  onClose?: () => void;
}

/** Preis als Mini-Stellentafel (Stellenwerte üben ganz nebenbei) */
function priceDots(n: number) {
  const [a, b, c] = digitsOf(n);
  const col = (cls: string, k: number) => h('div', { class: 'mb-col ' + cls + ' tiny' }, ...Array.from({ length: k }, () => h('i', { class: 'mb-dot ' + cls })));
  return h('div', { class: 'mini-board tiny', title: String(n) }, col('H', a), col('Z', b), col('E', c));
}

/** Wird vom Welt-Bildschirm gesetzt: baut ein Teil am Bauplatz (nur wenn Mia dort ist) */
let builder: ((id: string) => void) | null = null;
export const setBuilder = (fn: ((id: string) => void) | null) => void (builder = fn);

/** Baut der Reihe nach alles, was gerade geht – und danach, was dadurch frei wird */
let building = false;
function buildAll() {
  if (building || !builder) return;
  building = true;
  const go = () => {
    const list = parts.filter((p) => canBuild(p.id));
    if (!list.length) { building = false; return; }
    list.forEach((p, i) => setTimeout(() => builder?.(p.id), i * 600));
    setTimeout(go, list.length * 600 + 900);
  };
  go();
}

export function openHouseUi(o: HouseUiOpts) {
  let cat = houseCfg.categories[0].id;
  const head = h('div', { class: 'hu-head' });
  const tabs = h('div', { class: 'hu-tabs' });
  const grid = h('div', { class: 'hu-grid' });
  const colors = h('div', { class: 'hu-colors' });

  function render() {
    const st = stageNow();
    head.replaceChildren(
      h('div', { class: 'hu-coins' }, `🪙 ${coins()}`),
      h('div', { class: 'hu-prog' }, h('b', {}, `🏠 ${builtCount()} von ${parts.length} Teilen gebaut`),
        h('span', { class: 'hu-bar' }, h('i', { style: { width: (builtCount() / parts.length) * 100 + '%' } })),
        h('small', {}, st === 0 ? 'Ziel: Rohbau (Gerüst + 4 Wände)' : st === 1 ? 'Ziel: bewohnbar (Boden, Dach, Tür, Fenster)' : st === 2 ? 'Ziel: alles fertig und schön eingerichtet!' : '🏆 Alles gebaut – Meister-Baumeisterin!')),
      ...(o.mode === 'plan' && readyCount() > 0 && builder
        ? [h('button', { class: 'btn sun', onclick: () => buildAll() }, `🔨 Alles bauen (${readyCount()})`)]
        : [])
    );
    tabs.replaceChildren(
      ...houseCfg.categories.map((c) => {
        const list = parts.filter((p) => p.cat === c.id);
        const done = list.filter((p) => isBuilt(p.id)).length;
        return h('button', { class: 'hu-tab' + (c.id === cat ? ' on' : ''), onclick: () => { cat = c.id; render(); } }, `${c.icon} ${c.name}`, h('small', {}, `${done}/${list.length}`));
      })
    );
    grid.replaceChildren(
      ...parts.filter((p) => p.cat === cat).map((p) => {
        const built = isBuilt(p.id), owned = isOwned(p.id);
        let action: HTMLElement;
        if (built) action = h('div', { class: 'hu-state ok' }, '✓ gebaut');
        else if (o.mode === 'shop') {
          if (owned) action = h('div', { class: 'hu-state ok' }, '📦 gekauft – am Bauplatz aufbauen');
          else {
            const can = coins() >= p.price;
            action = h('button', {
              class: 'btn ' + (can ? 'sun' : 'ghost'),
              onclick: () => {
                const r = buy(p.id);
                speak(r === 'ok' ? 'wald.fuchs.buy' : 'wald.fuchs.poor');
              },
            }, `🪙 ${p.price} kaufen`);
          }
        } else if (canBuild(p.id)) action = builder ? h('button', { class: 'btn', onclick: () => builder!(p.id) }, '🔨 Bauen') : h('div', { class: 'hu-state ok' }, 'bereit – am Bauplatz bauen');
        else if (owned) action = h('div', { class: 'hu-state wait' }, 'braucht: ' + missing(p.id).map((m) => partById(m).name).join(', '));
        else action = h('div', { class: 'hu-state off' }, `nicht gekauft (🪙 ${p.price})`);
        const lockHint = o.mode === 'shop' && !owned && p.requires.length ? h('small', { class: 'hu-req' }, 'baut auf: ' + p.requires.map((r) => partById(r).name).join(', ')) : null;
        return h('div', { class: 'hu-card' + (built ? ' built' : '') },
          h('div', { class: 'hu-icon' }, p.icon), h('div', { class: 'hu-name' }, p.name),
          !owned ? h('div', { class: 'hu-price' }, h('span', {}, `🪙 ${p.price}`), priceDots(p.price)) : null,
          lockHint, action);
      })
    );
    const hs = getProgress().house;
    const chips = (label: string, list: [string, string][], key: 'roof' | 'wall') =>
      h('div', { class: 'hu-chips' }, h('span', {}, label),
        ...list.map(([n, c]) => h('button', { class: 'hu-chip' + (hs[key] === c ? ' on' : ''), style: { '--c': c }, title: n, onclick: () => setColor(key, c) })));
    colors.replaceChildren(chips('Dachfarbe', houseCfg.roofColors, 'roof'), chips('Wandfarbe', houseCfg.wallColors, 'wall'));
  }
  render();
  const off = onProgress(render);
  openModal({
    title: o.mode === 'shop' ? '🛒 Fritz’ Baumarkt' : '🏠 Mias Bauplan',
    wide: true,
    onClose: () => { off(); o.onClose?.(); },
    content: h('div', { class: 'hu' }, head, tabs, grid, colors),
  });
}
