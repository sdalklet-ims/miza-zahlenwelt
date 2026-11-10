/**
 * Supermarkt von Fuchs Fritz: Gänge (Abteilungen) mit Regalen, Preisschildern, Einkaufswagen und Kasse.
 * An der Kasse wird die Summe gezeigt (Addieren, Stellentafel) – bezahlt wird mit Münzen.
 */
import { h } from '../core/dom';
import { houseCfg } from '../core/texts';
import { getProgress, mutate, onProgress } from '../core/progress';
import { coins } from '../core/rewards';
import { isOwned, isBuilt, parts, partById } from '../core/house';
import { kinds, foods, kindById, foodById, adopt, addFood, pets, petUnlocked, MAX_PETS } from '../core/pet';
import { meals, addMeal, mealStock } from '../core/hunger';
import { MAX_AQUA, addAqua, addFishFood, aquaCount, aquaReady, aquaTotal, fishFood, fishFoods, species, speciesById } from '../core/aquarium';
import { openModal } from './modal';
import { priceDots } from './houseUi';
import { speak } from '../audio/speak';
import { sfx } from '../audio/music';

interface Line { key: string; name: string; icon: string; price: number; qty: number }

export function openSupermarket() {
  const cart = new Map<string, Line>();
  const aisles = [...houseCfg.categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })), { id: 'essen', name: 'Essen', icon: '🍎' }, { id: 'aqua', name: 'Aquarium', icon: '🐠' }, { id: 'tier', name: 'Tierbedarf', icon: '🐾' }];
  let aisle = aisles[0].id;

  const shelf = h('div', { class: 'sm-shelf' });
  const tabs = h('div', { class: 'sm-aisles' });
  const cartBox = h('div', { class: 'sm-cart' });

  const total = () => [...cart.values()].reduce((a, l) => a + l.price * l.qty, 0);

  function toggle(l: Omit<Line, 'qty'>, multi = false) {
    const ex = cart.get(l.key);
    if (ex && !multi) cart.delete(l.key);
    else if (ex) ex.qty++;
    else cart.set(l.key, { ...l, qty: 1 });
    sfx.pop();
    render();
  }

  function product(icon: string, name: string, price: number, key: string, state: 'free' | 'owned' | 'locked', note = '', multi = false) {
    const inCart = cart.get(key);
    const card = h('button', {
      class: 'sm-prod' + (inCart ? ' in' : '') + (state !== 'free' ? ' off' : ''),
      disabled: state !== 'free',
      onclick: () => toggle({ key, name, icon, price }, multi),
    },
      h('div', { class: 'sm-pic' }, icon), h('div', { class: 'sm-name' }, name),
      h('div', { class: 'sm-tag' }, state === 'owned' ? '✓' : state === 'locked' ? '🔒' : `🪙 ${price}`),
      note ? h('small', { class: 'sm-note' }, note) : null,
      inCart ? h('div', { class: 'sm-badge' }, multi ? `×${inCart.qty}` : '🛒') : null);
    return card;
  }

  function renderShelf() {
    const items: HTMLElement[] = [];
    if (aisle === 'aqua') {
      const ICON: Record<string, string> = { goldfisch: '🐠', guppy: '🐟', neon: '🐟', skalar: '🐡', kampffisch: '🐠', wels: '🐟', schnecke: '🐌', garnele: '🦐' };
      const inCart = [...cart.values()].filter((l) => l.key.startsWith('aq:')).reduce((a, l) => a + l.qty, 0);
      const full = aquaTotal() + inCart >= MAX_AQUA;
      for (const s of species) {
        const st = !aquaReady() ? 'locked' : full ? 'owned' : 'free';
        items.push(product(ICON[s.id] ?? '🐟', s.name, s.price, 'aq:' + s.id, st, !aquaReady() ? 'erst das Aquarium aufstellen' : full ? 'Becken ist voll' : `${s.blurb} · im Becken: ${aquaCount(s.id)}`, true));
      }
      for (const f of fishFoods) items.push(product(f.icon, f.name, f.price, 'ff:' + f.id, 'free', `${f.portions} Portion${f.portions > 1 ? 'en' : ''} · Vorrat: ${fishFood()}`, true));
    } else if (aisle === 'essen') {
      for (const m of meals) items.push(product(m.icon, m.name, m.price, 'meal:' + m.id, 'free', `sättigt +${m.fill} · Vorrat ${mealStock(m.id)}`, true));
    } else if (aisle !== 'tier') {
      for (const p of parts.filter((x) => x.cat === aisle)) {
        const owned = isOwned(p.id) || isBuilt(p.id);
        items.push(product(p.icon, p.name, p.price, 'part:' + p.id, owned ? 'owned' : 'free', !owned && p.requires.length ? 'baut auf: ' + p.requires.map((r) => partById(r).name).join(', ') : ''));
      }
    } else {
      const full = pets().length >= MAX_PETS;
      for (const k of kinds) {
        const locked = !petUnlocked();
        items.push(product(k.icon, k.name, k.price, 'pet:' + k.id, full ? 'owned' : locked ? 'locked' : 'free', full ? 'Dein Haus ist voll mit Tieren' : locked ? 'erst wenn das Haus bewohnbar ist' : pets().length ? `${pets().length} Tier(e) zuhause – noch eins?` : 'zieht bei Mia ein'));
      }
      for (const f of foods) items.push(product(f.icon, f.name, f.price, 'food:' + f.id, 'free', `Vorrat: ${getProgress().petStock[f.id] ?? 0}`, true));
    }
    shelf.replaceChildren(...items);
  }

  function renderCart() {
    const lines = [...cart.values()];
    const sum = total(), have = coins(), enough = have >= sum;
    const eq = lines.length <= 6 ? lines.map((l) => (l.qty > 1 ? `${l.qty}×${l.price}` : `${l.price}`)).join(' + ') + ' = ' : '';
    cartBox.replaceChildren(
      h('div', { class: 'sm-cart-title' }, '🛒 Einkaufswagen'),
      h('div', { class: 'sm-lines' },
        ...(lines.length
          ? lines.map((l) => h('div', { class: 'sm-line' },
              h('span', { class: 'sm-l-name' }, `${l.icon} ${l.name}`),
              l.key.startsWith('food:') || l.key.startsWith('meal:') || l.key.startsWith('aq:') || l.key.startsWith('ff:') ? h('span', { class: 'sm-qty' },
                h('button', { onclick: () => { l.qty--; if (l.qty <= 0) cart.delete(l.key); render(); } }, '−'), `${l.qty}`, h('button', { onclick: () => { l.qty++; render(); } }, '+')) : null,
              h('b', {}, `${l.price * l.qty}`),
              h('button', { class: 'sm-del', 'aria-label': 'Entfernen', onclick: () => { cart.delete(l.key); render(); } }, '✕')))
          : [h('div', { class: 'sm-empty' }, 'Noch leer. Tippe auf Waren, um sie einzupacken.')])),
      h('div', { class: 'sm-till' },
        h('div', { class: 'sm-sum' }, 'Kasse'),
        h('div', { class: 'sm-eq' }, sum ? `${eq}${sum}` : '0'),
        sum ? priceDots(sum) : null,
        h('div', { class: 'sm-have' }, `Du hast 🪙 ${have}` + (sum && enough ? `  ·  danach 🪙 ${have - sum}` : '')),
        h('button', { class: 'btn ' + (enough && sum ? 'sun' : 'ghost'), disabled: !sum || !enough, onclick: checkout }, !sum ? 'Bezahlen' : enough ? `🪙 ${sum} bezahlen` : 'Zu wenig Münzen'))
    );
  }

  function renderTabs() {
    tabs.replaceChildren(...aisles.map((a, i) => h('button', { class: 'sm-aisle' + (a.id === aisle ? ' on' : ''), onclick: () => { aisle = a.id; render(); } }, h('small', {}, `Gang ${i + 1}`), `${a.icon} ${a.name}`)));
  }

  function render() {
    renderTabs();
    renderShelf();
    renderCart();
  }

  function checkout() {
    const sum = total();
    if (!sum || coins() < sum) return;
    const petLines = [...cart.values()].filter((l) => l.key.startsWith('pet:'));
    mutate((p) => {
      p.coins -= sum;
      for (const l of cart.values()) if (l.key.startsWith('part:')) p.house.owned[l.key.slice(5)] = true;
    });
    for (const l of cart.values()) if (l.key.startsWith('food:')) addFood(l.key.slice(5), l.qty);
    for (const l of cart.values()) if (l.key.startsWith('meal:')) addMeal(l.key.slice(5), l.qty);
    for (const l of cart.values()) if (l.key.startsWith('ff:')) addFishFood((fishFoods.find((f) => f.id === l.key.slice(3))?.portions ?? 1) * l.qty);
    const aqLines = [...cart.values()].filter((l) => l.key.startsWith('aq:'));
    for (const l of aqLines) addAqua(l.key.slice(3), l.qty);
    if (aqLines.length) speak('aqua.new', { name: aqLines.length > 1 ? 'Die neuen Tiere' : speciesById(aqLines[0].key.slice(3)).name });
    sfx.buy();
    speak('wald.fuchs.buy');
    cart.clear();
    render();
    if (petLines.length) chooseNames(petLines.map((l) => l.key.slice(4)));
  }

  function chooseNames(ids: string[]) {
    const [first, ...rest] = ids;
    chooseName(first, () => rest.length && chooseNames(rest));
  }

  function chooseName(kindId: string, then?: () => void) {
    const k = kindById(kindId);
    const used = new Set(pets().map((q) => q.name));
    const close = openModal({
      title: `Wie soll dein ${k.name} heißen?`,
      closable: false,
      content: h('div', { class: 'sm-names' }, h('div', { class: 'sm-bigicon' }, k.icon),
        h('div', { class: 'sm-name-btns' }, ...(k.names.filter((n) => !used.has(n)).length ? k.names.filter((n) => !used.has(n)) : [k.names[0] + ' 2', k.names[1] + ' 2']).map((n) => h('button', { class: 'btn sun', onclick: () => { adopt(kindId, n); sfx.star(); close(); speak('pet.adopt', { name: n }); then?.(); } }, n)))),
    });
  }

  render();
  const off = onProgress(() => { renderShelf(); renderCart(); });
  openModal({
    title: '',
    wide: true,
    onClose: () => off(),
    content: h('div', { class: 'sm' },
      h('div', { class: 'sm-sign' }, '🛒 SUPERMARKT'),
      tabs,
      h('div', { class: 'sm-body' }, shelf, cartBox)),
  });
  void foodById;
}
