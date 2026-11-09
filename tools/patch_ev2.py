# Einmaliges Hilfsskript: Akku, Ladestationen, Fahr-Optik und Mias Sitzhaltung einbinden


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/world3d/sprites.ts', [("import { drawMia, drawSleepingMia, MIA_CANVAS, type Dir } from './comic';", "import { drawMia, drawSleepingMia, MIA_CANVAS, type Dir, type RideStyle } from './comic';")])

# ── world.ts: Ladestationen ──
ed('src/world/world.ts', [
    ("  plot: { x: number; y: number } | null;\n}", "  plot: { x: number; y: number } | null;\n  /** Ladestationen für E-Roller und E-Auto */\n  stations: { x: number; y: number }[];\n}"),
    ("  onPlot: () => void;\n}", "  onPlot: () => void;\n  onCharge: (s: { x: number; y: number }) => void;\n}"),
    ("butterflies: [], spawns: {}, plot: PLOT };", "butterflies: [], spawns: {}, plot: PLOT, stations: [] };"),
    ("  /* ── Nebeltore zwischen gesperrten Gebieten ── */", """  /* ── Ladestationen: drei je Zone am Weg, eine am Bauplatz ── */
  const addStation = (x: number, y: number) => {
    const s = { x, y };
    m.stations.push(s);
    keep.push({ x, y, r: 110 });
    addSolid(x, y - 6, 16);
    m.interacts.push({ id: `station.${m.stations.length}`, x, y: y + 20, r: 120, label: 'Aufladen', icon: '🔋', run: () => hooks.onCharge(s) });
  };
  for (let zi = 0; zi < worlds.length; zi++) for (const lx of [900, 1900, 2900]) addStation(zi * ZW + lx, Math.round(pathY(zi * ZW + lx) + 140));
  if (PLOT) addStation(PLOT.x + 520, PLOT.y + 150);

  /* ── Nebeltore zwischen gesperrten Gebieten ── */""")])

# ── worldScreen ──
ed('src/world/worldScreen.ts', [
    ("import { createCarShop, createVehicle, type Vehicle3D } from '../world3d/vehicles';\nimport { currentRide, rideSpeed } from '../core/vehicles';",
     "import { createCarShop, createChargeStation, createVehicle, rideKindOf, type ChargeStation3D, type Vehicle3D } from '../world3d/vehicles';\nimport { batteryEmpty, chargeAll, chargeOf, currentRide, drainBattery, needsCharge, ownsElectric, rideSpeed, saveCharge } from '../core/vehicles';"),
    ("    onPlot: () => { speak('wald.haus.plot'); openHouseUi({ mode: 'plan' }); },\n  });", "    onPlot: () => { speak('wald.haus.plot'); openHouseUi({ mode: 'plan' }); },\n    onCharge: (s) => startCharge(s),\n  });"),
    ("  let umbT = 0;", "  let umbT = 0;\n  let charging: { x: number; y: number } | null = null, chargeSound = 0, lastBat = 100;\n  const chargeBar = h('div', { class: 'charge-bar off' }, h('span', {}, '🔋 Akku lädt …'), h('div', { class: 'cb-track' }, h('i', {})));\n  el.append(chargeBar);"),
    ("  const frozen = () => frozenByDialog || sleeping ||", "  const frozen = () => frozenByDialog || sleeping || !!charging ||"),
    ("  function act() {", """  function startCharge(s: { x: number; y: number }) {
    if (dead || charging) return;
    if (!ownsElectric()) { speak('car.charge.none'); return; }
    if (!needsCharge()) { speak('car.charge.full'); return; }
    charging = s;
    chargeSound = 0;
    st.vx = st.vy = 0;
    tap = null;
    chargeBar.classList.remove('off');
    speak('car.charge.start');
  }

  function act() {"""),
    ("    const isFrozen = frozen();\n    let { x: ix", """    if (charging) {
      chargeAll(DT, 100 / 5.5);
      chargeSound -= DT;
      if (chargeSound <= 0) { chargeSound = 0.35; sfx.zap(); }
      if (Math.random() < 0.5) fx.add(charging.x * S + (Math.random() - 0.5) * 0.8, 2.2 + Math.random() * 0.6, charging.y * S + 0.3, (Math.random() - 0.5) * 0.8, 0.6, 0.2, 0.7, 0.22, Math.random() < 0.5 ? '#fff6a0' : '#7dff9a');
      const v = currentRide();
      const lvl = v && v.range ? chargeOf(v.id) : 100;
      (chargeBar.querySelector('i') as HTMLElement).style.width = lvl + '%';
      if (!needsCharge()) { charging = null; chargeBar.classList.add('off'); saveCharge(); sfx.star(); speak('car.charge.done'); lastBat = 100; }
    }
    const isFrozen = frozen();
    let { x: ix"""),
    # Akku entladen
    ("      const spd = Math.hypot(st.vx, st.vy);\n      st.phase += spd * DT * 0.062;", """      const spd = Math.hypot(st.vx, st.vy);
      if (riding && currentRide()?.range) {
        const lv = drainBattery(DT, Math.min(1, spd / (RUN * Math.max(1, rideSpeed()))));
        if (lastBat > 25 && lv <= 25 && lv > 0.5) speak('car.battery.low');
        if (lastBat > 0.5 && lv <= 0.5) speak('car.battery.empty');
        lastBat = lv;
      }
      st.phase += spd * DT * 0.062;"""),
    ("""      if (riding && spd > 60 && vehicle && Math.random() < 0.6) {
        const ex = vehicle.exhaust, ca = Math.cos(vehYaw), sa = Math.sin(vehYaw);
        const px = st.x * S + (ex.x * ca - ex.z * sa) * 0.8, pz = st.y * S - (ex.x * sa + ex.z * ca) * 0.8;
        if (vehicle.fire) fx.add(px, gy + ex.y, pz, (Math.random() - 0.5) * 0.6 - (st.vx / spd) * 2.5, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6 - (st.vy / spd) * 2.5, 0.5, 0.45, Math.random() < 0.5 ? '#ffb347' : '#ff7a1c');
        else fx.add(px, gy + 0.2, pz, (Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4, 0.5, 0.28, '#d8d4cc');
      }""", """      if (riding && spd > 60 && vehicle && Math.random() < (vehicle.electric ? 0.3 : 0.5)) {
        const ex = vehicle.exhaust, ca = Math.cos(vehYaw), sa = Math.sin(vehYaw);
        const px = st.x * S + (ex.x * ca - ex.z * sa) * 0.8, pz = st.y * S - (ex.x * sa + ex.z * ca) * 0.8;
        if (vehicle.electric && !batteryEmpty()) fx.add(px, gy + ex.y, pz, (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6, 0.45, 0.16, Math.random() < 0.5 ? '#7dffcf' : '#fff6a0'); // Funken statt Abgase
        else fx.add(px, gy + 0.2, pz, (Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4, 0.5, 0.26, '#d8d4cc');
      }"""),
    ("  let vehicle: Vehicle3D | null = null, vehKind = '', vehYaw = 0, lastRiding = false;", "  let vehicle: Vehicle3D | null = null, vehKind = '', vehYaw = 0, lastRiding = false, pedal = 0, steerNow = 0, leanNow = 0;\n  const stationViews: { s: { x: number; y: number }; v: ChargeStation3D }[] = model.stations.map((s) => {\n    const v = createChargeStation();\n    v.group.position.set(s.x * S, heightAt(s.x, s.y), s.y * S);\n    scene.add(v.group);\n    return { s, v };\n  });"),
    ("if (!lastRiding) sfx.vroom(); }", "if (!lastRiding) (wantRide.range ? sfx.whirr : sfx.pop)(); }"),
    ("""    if (vehicle) {
      if (spd > 25) { const target = Math.atan2(st.vy, st.vx); let dA = target - vehYaw; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); vehYaw += dA * 0.14; }
      vehicle.group.position.set(st.x * S, gy, st.y * S);
      vehicle.group.rotation.y = -vehYaw;
      vehicle.group.rotation.z = -Math.min(0.1, spd / 5000) * Math.sin(timeSec * 30); // leichtes Rütteln bei hohem Tempo
      vehicle.roll((spd / 60) * S, timeSec);
      seatLift = vehicle.seat;
    }""", """    let rideStyle: 'bike' | 'scooter' | 'car' | undefined, wind = 0;
    if (vehicle) {
      let dA = 0;
      if (spd > 25) { const target = Math.atan2(st.vy, st.vx); dA = target - vehYaw; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); vehYaw += dA * 0.14; }
      steerNow += (Math.max(-0.5, Math.min(0.5, dA * 1.6)) - steerNow) * 0.2; // Vorderräder schlagen ein
      leanNow += (Math.max(-0.22, Math.min(0.22, dA * (spd / 400))) - leanNow) * 0.15; // Neigung in Kurven
      const accel = Math.max(-0.08, Math.min(0.08, (spd - lastSpd) * -0.004));
      lastSpd = spd;
      vehicle.group.position.set(st.x * S, gy + Math.abs(Math.sin(timeSec * 22)) * 0.012 * Math.min(1, spd / 200), st.y * S);
      vehicle.group.rotation.y = -vehYaw;
      vehicle.group.rotation.x = leanNow;
      vehicle.group.rotation.z = accel + Math.sin(timeSec * 26) * 0.006 * Math.min(1, spd / 300); // Nicken beim Beschleunigen, feines Rütteln
      vehicle.update((spd / 60) * S, timeSec, steerNow);
      seatLift = vehicle.seat;
      rideStyle = rideKindOf(vehKind);
      wind = Math.min(1, spd / (RUN * 2.2));
      pedal += (spd / 60) * 0.1;
    }"""),
    ("    miaSpr.update(t, st.phase, vehicle ? 0 : Math.min(1, spd / RUN), miaDir, !!vehicle, sleeping);", "    miaSpr.update(t, vehicle ? pedal : st.phase, vehicle ? (rideStyle === 'bike' && spd > 20 ? 0.6 : 0) : Math.min(1, spd / RUN), miaDir, !!vehicle, sleeping, rideStyle, wind);\n    for (const sv of stationViews) sv.v.setCharging(charging === sv.s, timeSec, vehicle ? chargeOf(vehKind) : 100);"),
    ("let hungerTick = 3, lastHunger = hungerLevel();", "let hungerTick = 3, lastHunger = hungerLevel(), lastSpd = 0;")])

# ── HUD: Akku-Anzeige ──
ed('src/ui/hud.ts', [
    ("import { currentRide, ownedAny } from '../core/vehicles';", "import { chargeOf, currentRide, hasBattery, ownedAny } from '../core/vehicles';"),
    ("let rideEl: HTMLElement;", "let rideEl: HTMLElement;\nlet batEl: HTMLElement;\nlet batFill: HTMLElement;"),
    ("    rideEl = h('button',", "    batFill = h('i', {});\n    batEl = h('button', { class: 'hud-hunger bat', 'aria-label': 'Akku – Garage öffnen', onclick: () => handlers.onRide?.() }, h('span', { class: 'hg-icon' }, '⚡'), h('div', { class: 'hg-bar' }, batFill));\n    rideEl = h('button',"),
    ("      rideEl,\n", "      batEl,\n      rideEl,\n"),
    ("    window.setInterval(hud.refresh, 5000);", "    window.setInterval(hud.refresh, 1000);"),
    ("    if (rideEl) {", """    if (batEl) {
      const v = currentRide(), on = hasBattery(v);
      batEl.style.display = on ? '' : 'none';
      if (on) {
        const c = chargeOf(v!.id);
        batFill.style.width = Math.round(c) + '%';
        batEl.dataset.lvl = c > 50 ? 'full' : c > 25 ? 'rumble' : 'hungry';
        (batEl.firstChild as HTMLElement).textContent = c <= 0.5 ? '🪫' : '⚡';
      }
    }
    if (rideEl) {""")])

# ── Autohaus-Fenster und Garage ──
ed('src/ui/carshop.ts', [
    ("import { buyVehicle, currentRide, owns, setRide, vehicles } from '../core/vehicles';", "import { buyVehicle, chargeOf, currentRide, owns, setRide, vehicles } from '../core/vehicles';"),
    ("          h('small', {}, v.blurb),", "          h('small', {}, v.blurb),\n          v.range ? h('div', { class: 'cs-bat' }, `🔋 Reichweite ≈ ${Math.round(v.range / 60 * 10) / 10} Min.`, mine ? h('div', { class: 'hg-bar' }, h('i', { style: { width: Math.round(chargeOf(v.id)) + '%' } })) : null) : h('div', { class: 'cs-bat' }, '🦵 Ohne Strom'),"),
    ("h('b', {}, v.name), bars(v.speed)))));\n  }", "h('b', {}, v.name), bars(v.speed), v.range ? h('div', { class: 'hg-bar' }, h('i', { style: { width: Math.round(chargeOf(v.id)) + '%' } })) : null))));\n  }")])
open('src/styles/polish.css', 'a', encoding='utf-8').write("""
.cs-grid { grid-template-columns: repeat(3, 1fr); }
.cs-bat { display: flex; flex-direction: column; align-items: center; gap: 4px; font: 800 17px var(--font); color: #2a7a5a; margin: 2px 0; } .cs-bat .hg-bar { width: 110px; }
.hud-hunger.bat { background: #e0f7ec; border-bottom-color: #8fd9b6; }
.charge-bar { position: absolute; left: 50%; bottom: 70px; transform: translateX(-50%); z-index: 40; width: 420px; padding: 12px 22px 14px; border-radius: 24px; background: #fff; border-bottom: 7px solid #8fd9b6; box-shadow: 0 8px 18px rgba(0,0,0,.3); font: 900 28px var(--font); text-align: center; transition: opacity .3s, transform .3s; }
.charge-bar.off { opacity: 0; transform: translateX(-50%) translateY(20px); pointer-events: none; }
.cb-track { height: 24px; margin-top: 8px; border-radius: 14px; background: #e6dcc4; overflow: hidden; border: 3px solid #cbb98f; } .cb-track i { display: block; height: 100%; width: 0; background: repeating-linear-gradient(115deg, #7dff9a 0 16px, #4fd978 16px 32px); background-size: 45px 100%; animation: chargeFlow .6s linear infinite; }
@keyframes chargeFlow { to { background-position: 45px 0; } }
""")
print('ok')
