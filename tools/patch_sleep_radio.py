# Einmaliges Hilfsskript: Schlafen, Radio, Sender-Einstellung.
import json


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


sub('src/core/progress.ts', lambda s: s.replace("  musicOn: boolean;", "  musicOn: boolean;\n  /** Radio-Sender (wald = Standardmusik) */\n  station: string;").replace("settings: { music: 0.6, musicOn: true, tapWalk: true },", "settings: { music: 0.6, musicOn: true, station: 'wald', tapWalk: true },"))

SLEEP = r"""

/** Mia schläft eingerollt im Bett (Seitenansicht), mit atmendem Körper und Zzz */
export function drawSleepingMia(c: C, cx: number, cy: number, t: number, acc: string[]) {
  const br = Math.sin(t * 1.5) * 3;
  c.save();
  c.translate(cx, cy);
  // Schwanz eingerollt vorn
  c.save(); c.lineCap = 'round';
  const tail = (w: number, col: string) => { c.beginPath(); c.moveTo(48, -26); c.bezierCurveTo(80, -20, 70, 6, 24, 2); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  tail(24, INK); tail(14, OR); c.setLineDash([8, 14]); tail(14, ORD); c.setLineDash([]);
  c.restore();
  ell(c, 0, -34 - br * 0.3, 66, 32 + br, OR);
  path(c, () => c.ellipse(6, -22, 44, 14, 0, 0, Math.PI * 2), CR, false);
  c.strokeStyle = ORD; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-6, -62); c.lineTo(-2, -48); c.moveTo(18, -62); c.lineTo(20, -48); c.moveTo(40, -56); c.lineTo(40, -44); c.stroke();
  // Kopf links, auf den Pfoten
  ell(c, -64, -40, 38, 32, OR);
  tri(c, [-94, -58], [-100, -92], [-78, -66], OR); tri(c, [-60, -66], [-54, -98], [-42, -64], OR);
  tri(c, [-92, -62], [-95, -84], [-80, -66], PK, false); tri(c, [-58, -68], [-55, -90], [-46, -66], PK, false);
  ell(c, -78, -28, 22, 14, CR, false);
  c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.arc(-76, -44, 8, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.beginPath(); c.arc(-52, -44, 8, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  tri(c, [-70, -34], [-60, -34], [-65, -27], PK);
  ell(c, -92, -34, 7, 4, 'rgba(255,120,130,.5)', false);
  ell(c, -88, -4, 18, 9, CR);
  if (acc.includes('mia-zipfel')) { path(c, () => { c.moveTo(-96, -66); c.quadraticCurveTo(-110, -112, -50, -110); c.quadraticCurveTo(-60, -84, -40, -66); c.closePath(); }, '#e0483f'); ell(c, -50, -110, 9, 9, '#ffffff'); }
  else if (acc.includes('mia-krone')) path(c, () => { c.moveTo(-92, -68); c.lineTo(-96, -96); c.lineTo(-80, -80); c.lineTo(-68, -102); c.lineTo(-56, -80); c.lineTo(-42, -96); c.lineTo(-46, -68); c.closePath(); }, '#ffd23f');
  // Zzz
  c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 4; c.font = '900 34px sans-serif'; c.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.5 + i / 3) % 1), x = -40 + k * 40 + i * 10, y = -110 - k * 70, sc = 0.5 + k * 0.7;
    c.globalAlpha = 1 - k * 0.8;
    c.save(); c.translate(x, y); c.scale(sc, sc); c.strokeText('Z', 0, 0); c.fillText('Z', 0, 0); c.restore();
  }
  c.globalAlpha = 1;
  c.restore();
}
"""
sub('src/world3d/comic.ts', lambda s: s + SLEEP)


def spr(s):
    s = s.replace("import { drawMia, MIA_CANVAS, type Dir } from './comic';", "import { drawMia, drawSleepingMia, MIA_CANVAS, type Dir } from './comic';")
    s = s.replace("  update(t: number, phase: number, speed: number, dir: Dir, happy: boolean): void;", "  update(t: number, phase: number, speed: number, dir: Dir, happy: boolean, sleep?: boolean): void;")
    s = s.replace("    update(t, phase, speed, dir, happy) {\n      c.clearRect(0, 0, MIA_CANVAS, MIA_CANVAS);\n      drawMia(c, MIA_CANVAS / 2, MIA_CANVAS - 24, { dir, t, phase, speed, acc: accList, happy });",
                  "    update(t, phase, speed, dir, happy, sleep) {\n      c.clearRect(0, 0, MIA_CANVAS, MIA_CANVAS);\n      if (sleep) drawSleepingMia(c, MIA_CANVAS / 2 + 14, MIA_CANVAS - 24, t, accList);\n      else drawMia(c, MIA_CANVAS / 2, MIA_CANVAS - 24, { dir, t, phase, speed, acc: accList, happy });")
    return s


sub('src/world3d/sprites.ts', spr)


def ws(s):
    s = s.replace("import { sfx } from '../audio/music';", "import { sfx, setStation, currentStation } from '../audio/music';\nimport { openRadio } from '../ui/radio';")
    s = s.replace("  const frozen = () => frozenByDialog || layers.overlay.childElementCount > 0;", "  let sleeping = false;\n  const frozen = () => frozenByDialog || sleeping || layers.overlay.childElementCount > 0;")
    # dynamische Interaktionen
    s = s.replace("    dyn = house.collisions(hs.built, plot.x, plot.y);\n  }", """    dyn = house.collisions(hs.built, plot.x, plot.y);
    if (hs.built.radio && !model.interacts.some((i) => i.id === 'radio')) model.interacts.push({ id: 'radio', x: plot.x - 152, y: plot.y + 35, r: 140, label: 'Radio', icon: '📻', run: () => openRadio() });
    if (hs.built.bett && !model.interacts.some((i) => i.id === 'bed')) model.interacts.push({ id: 'bed', x: plot.x - 110, y: plot.y + 72, r: 110, label: 'Schlafen', icon: '😴', run: () => startSleep() });
  }""", 1)
    # Schlafen
    s = s.replace("  function confetti() {", """  /* ── Schlafen ── */
  const night = h('div', { class: 'night' },
    ...Array.from({ length: 40 }, (_, i) => h('i', { class: 'nstar', style: { left: (i * 97) % 100 + '%', top: (i * 53) % 70 + '%', animationDelay: -(i % 7) * 0.4 + 's' } })),
    h('div', { class: 'night-text' }, '😴 Mia schläft …'),
    h('button', { class: 'btn sun night-btn', onclick: () => wakeUp() }, '☀️ Aufwachen'));
  let stationBefore = 'wald';
  function startSleep() {
    if (!plot || sleeping || hidden) return;
    sleeping = true;
    st.x = plot.x - 110; st.y = plot.y + 72; st.vx = st.vy = 0; tap = null;
    stationBefore = currentStation();
    setStation('nacht', false);
    el.append(night);
    requestAnimationFrame(() => night.classList.add('on'));
    speak('wald.haus.sleep');
  }
  function wakeUp() {
    if (!sleeping) return;
    night.classList.remove('on');
    setTimeout(() => night.remove(), 900);
    sleeping = false;
    st.y = (plot?.y ?? st.y) + 150; st.x = (plot?.x ?? st.x) - 100;
    setStation(stationBefore, false);
    speak('wald.haus.wake');
  }

  function confetti() {""", 1)
    # Render: Mia-Sprite im Bett
    s = s.replace("    miaSpr.group.position.set(st.x * S, gy, st.y * S);\n    miaSpr.update(t, st.phase, Math.min(1, spd / RUN), miaDir, false);",
                  "    miaSpr.group.position.set(st.x * S, gy + (sleeping ? 1.0 : 0), st.y * S);\n    miaSpr.update(t, st.phase, Math.min(1, spd / RUN), miaDir, false, sleeping);")
    # Radio: Notenfunken
    s = s.replace("    if (plot) {\n      const inh = isBuilt('fundament')", """    if (plot && isBuilt('radio') && currentStation() !== 'wald' && Math.random() < 0.07) {
      fx.add((plot.x - 152) * S, 3.2, (plot.y + 35) * S, (Math.random() - 0.5) * 0.5, 0.9, 0.1, 1.6, 0.35, ['#ffd54a', '#ff8fab', '#8fd3ff'][Math.floor(Math.random() * 3)]);
    }
    if (plot) {
      const inh = isBuilt('fundament')""", 1)
    return s


sub('src/world/worldScreen.ts', ws)

j = json.load(open('content/worlds/wald.json', encoding='utf-8'))
j['texts'].update({
    'wald.haus.sleep': ['mia', 'Gute Nacht … zzz …'],
    'wald.haus.wake': ['mia', 'Guten Morgen! Ich habe so gut geschlafen.'],
    'wald.haus.radio': ['mia', 'Musik an! Das gefällt mir.'],
})
json.dump(j, open('content/worlds/wald.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('ok')
