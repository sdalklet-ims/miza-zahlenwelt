# Einmaliges Hilfsskript: Münzen nur noch durch Mathe-Aufgaben, Weg zum Haus (Pfeil + Schnellreise).
import json
import re


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


# ---------- A) Münzen in der Welt entfernen ----------
def world(s):
    a = s.index("  /* ── Münzen")
    b = s.index("  /* ── Nebeltore")
    s = s[:a] + s[b:]
    s = s.replace("export interface Coin { id: string; x: number; y: number; got: boolean }\n", "")
    s = s.replace(" coins: Coin[];", "").replace(" coins: [],", "")
    return s


sub('src/world/world.ts', world)


def wscreen(s):
    a = s.index("  const coinViews = model.coins.map((c) => {")
    b = s.index("\n  });\n", a) + len("\n  });\n")
    s = s[:a] + s[b:]
    a = s.index("    // Münzen\n")
    b = s.index("    if (shakeFog > 0)")
    s = s[:a] + s[b:]
    a = s.index("    for (const cw of coinViews) if (cw.m.visible) {")
    b = s.index("\n    }\n", a) + len("\n    }\n")
    s = s[:a] + s[b:]
    s = s.replace("      addCoins(5);\n", "")
    s = s.replace("import { equippedFor, addCoins } from '../core/rewards';", "import { equippedFor } from '../core/rewards';")
    # ---------- C) Weg zum Haus ----------
    s = s.replace("import { openHouseUi, setBuilder } from '../ui/houseUi';", "import { openHouseUi, setBuilder, setHomeNav } from '../ui/houseUi';")
    s = s.replace("  const labels = h('div', { class: 'labels' });", "  const labels = h('div', { class: 'labels' });\n  const radar = h('div', { class: 'radar' }, h('i', {}), h('b', {}));")
    s = s.replace("cv, labels, banner, controls.el", "cv, labels, radar, banner, controls.el")
    s = s.replace("  /** Teil aufbauen – nur, wenn Mia beim Bauplatz ist */", """  /** Wegweiser zum Haus und Schnellreise dorthin */
  setHomeNav(plot ? {
    dist: () => Math.hypot(st.x - plot.x, st.y - plot.y),
    go: () => {
      const f = h('div', { class: 'flash' });
      el.append(f);
      setTimeout(() => {
        st.x = plot.x; st.y = plot.y + 340; st.vx = st.vy = 0; tap = null;
        stage.follow(st.x, st.y, 0, 0, DT, true);
        speak('wald.haus.plot');
      }, 350);
      setTimeout(() => f.remove(), 900);
    },
  } : null);
  /** Teil aufbauen – nur, wenn Mia beim Bauplatz ist */""", 1)
    s = s.replace("    fx.update(DT);\n", """    fx.update(DT);

    // Pfeil zum Haus, wenn es nicht im Bild ist
    let showRadar = false;
    if (plot) {
      const dd = Math.hypot(plot.x - st.x, plot.y - st.y);
      v3.set(plot.x * S, 2.5, plot.y * S);
      const pp = stage.project(v3);
      if (dd > 450 && (pp.x < 80 || pp.x > VW - 80 || pp.y < 110 || pp.y > 720)) {
        const cx = VW / 2, cy = 410, a = Math.atan2(pp.y - cy, pp.x - cx);
        radar.style.transform = `translate(${clamp(cx + Math.cos(a) * 540, 70, VW - 70)}px, ${clamp(cy + Math.sin(a) * 330, 120, 700)}px)`;
        (radar.firstChild as HTMLElement).style.transform = `rotate(${a * 57.3}deg)`;
        (radar.lastChild as HTMLElement).textContent = `🏠 Zuhause · ${Math.round(dd / 50)} m`;
        showRadar = true;
      }
    }
    radar.style.display = showRadar ? 'flex' : 'none';
""", 1)
    s = s.replace("      offHouse();\n      setBuilder(null);\n", "      offHouse();\n      setBuilder(null);\n      setHomeNav(null);\n")
    return s


sub('src/world/worldScreen.ts', wscreen)

j = json.load(open('content/worlds/wald.json', encoding='utf-8'))
j['world'].pop('coins', None)
j['texts']['wald.fuchs.hello'] = ['fuchs', 'Willkommen im Supermarkt, Mia! Vom Fundament bis zur Deko, dazu Tierbedarf. Münzen verdienst du mit deinen Mathe-Aufgaben!']
json.dump(j, open('content/worlds/wald.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)


# ---------- B) Mathe-Aufgaben zahlen ----------
def shell(s):
    s = s.replace("import { speak, say } from '../audio/speak';", "import { speak, say } from '../audio/speak';\nimport { addCoins } from '../core/rewards';\nimport { sfx } from '../audio/music';")
    s = s.replace("  dead: boolean;\n}", "  dead: boolean;\n  /** Münzen, die in diesem Spiel verdient wurden */\n  earned: number;\n  /** Münzen für richtige Aufgaben gutschreiben (mit kleiner Anzeige) */\n  pay(n: number): void;\n}", 1)
    s = s.replace("    dead: false,\n    onHint: null,", """    dead: false,
    earned: 0,
    pay(n) {
      if (n <= 0) return;
      addCoins(n);
      shell.earned += n;
      sfx.coin();
      const pop = h('div', { class: 'coin-pop' }, `+${n} 🪙`);
      el.append(pop);
      setTimeout(() => pop.remove(), 1500);
    },
    onHint: null,""", 1)
    return s


sub('src/ui/shell.ts', shell)


def games(s):
    s = s.replace("import { addCoins } from '../../core/rewards';\n", "")
    s = s.replace("    if (res.firstTry) hits++;", "    shell.pay(res.firstTry ? 4 : 1);\n    if (res.firstTry) hits++;", 1)
    s = s.replace("  addCoins(stars * 2);\n", "  shell.pay(stars * 3);\n")
    s = s.replace("    text: `${hits} von ${total} gleich beim ersten Versuch richtig.  +${stars * 2} 🪙`,", "    text: `${hits} von ${total} gleich beim ersten Versuch richtig.  Verdient: ${shell.earned} 🪙`,")
    s = s.replace("      addCoins(1);\n", "      shell.pay(2);\n")
    s = s.replace("      marks[i] = res.firstTry ? '●' : '◐';", "      shell.pay(res.firstTry ? 4 : 1);\n      marks[i] = res.firstTry ? '●' : '◐';")
    s = s.replace("    addCoins(stars * 3);\n    await award('wald.check', stars);", "    shell.pay(stars * 4);\n    await award('wald.check', stars);")
    s = s.replace("      text: `${hits} von ${tasks.length} gleich beim ersten Versuch richtig.`,", "      text: `${hits} von ${tasks.length} gleich beim ersten Versuch richtig.  Verdient: ${shell.earned} 🪙`,")
    return s


sub('src/stations/wald/games.ts', games)


def mini(s):
    s = s.replace("import { addCoins } from '../../core/rewards';\n", "")
    s = s.replace("  addCoins(stars * 3);\n", "  shell.pay(stars * 5);\n")
    s = s.replace("text: `${text}  +${stars * 3} 🪙`", "text: `${text}  Verdient: ${shell.earned} 🪙`")
    s = s.replace("      matched++;\n", "      matched++;\n      shell.pay(1);\n", 1)
    s = s.replace("      });\n    }\n    if (shell.dead) return;\n    const stars = wrong <= 1", "      });\n      shell.pay(3);\n    }\n    if (shell.dead) return;\n    const stars = wrong <= 1", 1)
    return s


sub('src/stations/wald/minigames.ts', mini)

# ---------- houseUi: Schnellreise-Knopf ----------
def hui(s):
    s = s.replace("/** Wird vom Welt-Bildschirm gesetzt: baut ein Teil am Bauplatz (nur wenn Mia dort ist) */", """/** Wegweiser zum Haus: Entfernung in Pixeln und Schnellreise dorthin */
let nav: { dist: () => number; go: () => void } | null = null;
export const setHomeNav = (n: typeof nav) => void (nav = n);

/** Wird vom Welt-Bildschirm gesetzt: baut ein Teil am Bauplatz (nur wenn Mia dort ist) */""", 1)
    s = s.replace("  const colors = h('div', { class: 'hu-colors' });\n", "  const colors = h('div', { class: 'hu-colors' });\n  let closeFn: () => void = () => {};\n", 1)
    s = s.replace("      ...(o.mode === 'plan' && readyCount() > 0 && builder", "      ...(nav && nav.dist() > 500 ? [h('button', { class: 'btn sky', onclick: () => { closeFn(); nav!.go(); } }, '🏃 Zum Haus gehen')] : []),\n      ...(o.mode === 'plan' && readyCount() > 0 && builder", 1)
    s = s.replace("  openModal({\n    title: o.mode === 'shop'", "  closeFn = openModal({\n    title: o.mode === 'shop'", 1)
    return s


sub('src/ui/houseUi.ts', hui)
print('ok')
