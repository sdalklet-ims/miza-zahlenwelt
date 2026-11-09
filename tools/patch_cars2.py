# Einmaliges Hilfsskript: Autohaus + Fahrzeuge in Welt, HUD und Stile einbinden


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:70])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/ui/hud.ts', [
    ("  onPack?: () => void;\n}", "  onPack?: () => void;\n  onRide?: () => void;\n}"),
    ("import { fullness, hungerLevel } from '../core/hunger';", "import { fullness, hungerLevel } from '../core/hunger';\nimport { currentRide, ownedAny } from '../core/vehicles';"),
    ("let hungerEl: HTMLElement;", "let hungerEl: HTMLElement;\nlet rideEl: HTMLElement;"),
    ("    houseEl = h('button',", "    rideEl = h('button', { class: 'hud-btn icon ride', 'aria-label': 'Garage', title: 'Garage', onclick: () => handlers.onRide?.() }, '🚶');\n    houseEl = h('button',"),
    ("      (packEl = btn('🎒', 'Rucksack', handlers.onPack)),", "      rideEl,\n      (packEl = btn('🎒', 'Rucksack', handlers.onPack)),"),
    ("    set(starsEl,", "    if (rideEl) {\n      rideEl.style.display = ownedAny() ? '' : 'none';\n      rideEl.textContent = currentRide()?.icon ?? '🚶';\n    }\n    set(starsEl,")])
ed('src/main.ts', [("onPack: openBackpack }", "onPack: openBackpack, onRide: openGarage }"), ("import { openBackpack } from './ui/backpack';", "import { openBackpack } from './ui/backpack';\nimport { openGarage } from './ui/carshop';")])
ed('src/world/world.ts', [("if (n.kind === 'fox') m.rects.push({ x: nx - 175, y: ny - 330, w: 350, h: 190 }); // Supermarkt-Gebäude hinter dem Händler",
                          "if (n.kind === 'fox' || n.kind === 'raccoon') m.rects.push({ x: nx - 175, y: ny - 330, w: 350, h: 190 }); // Supermarkt bzw. Autohaus hinter dem Händler"),
                         ("label: n.kind === 'chest' ? 'Öffnen' : proc ? 'Spielen' : n.kind === 'fox' ? 'Einkaufen' : 'Ansprechen',", "label: n.kind === 'chest' ? 'Öffnen' : proc ? 'Spielen' : n.kind === 'fox' ? 'Einkaufen' : n.kind === 'raccoon' ? 'Autohaus' : 'Ansprechen',"),
                         ("icon: n.kind === 'chest' ? '🗝️' : proc ? '🎮' : n.kind === 'fox' ? '🛒' : '💬',", "icon: n.kind === 'chest' ? '🗝️' : proc ? '🎮' : n.kind === 'fox' ? '🛒' : n.kind === 'raccoon' ? '🚗' : '💬',")])
ed('src/world/worldScreen.ts', [
    ("import { chickSvg } from '../ui/artFluss';", "import { chickSvg } from '../ui/artFluss';\nimport { createCarShop, createVehicle, type Vehicle3D } from '../world3d/vehicles';\nimport { currentRide, rideSpeed } from '../core/vehicles';\nimport { openCarShop } from '../ui/carshop';"),
    ("    if (e.kind === 'fox') {\n      const market = M.createSupermarket();", "    if (e.kind === 'raccoon') {\n      const shop = createCarShop();\n      shop.position.set(e.x * S, heightAt(e.x, e.y - 230), (e.y - 230) * S);\n      scene.add(shop);\n      shopTick = shop.userData.tick as (t: number) => void;\n    }\n    if (e.kind === 'fox') {\n      const market = M.createSupermarket();"),
    ("e.kind === 'fox' ? '🛒' : '💬');", "e.kind === 'fox' ? '🛒' : e.kind === 'raccoon' ? '🚗' : '💬');"),
    ("  const npcViews: NpcView[] = [];", "  const npcViews: NpcView[] = [];\n  let shopTick: ((t: number) => void) | null = null;"),
    ("shop: '🛒 Zum Laden',", "shop: '🛒 Zum Laden', autos: '🚗 Zum Autohaus',"),
    ("if (o === 'shop') openSupermarket(); else start?.", "if (o === 'shop') openSupermarket(); else if (o === 'autos') openCarShop(); else start?."),
    ("o === 'video' || o === 'shop' ? 'sun'", "o === 'video' || o === 'shop' || o === 'autos' ? 'sun'"),
    # Bewegung mit Teilschritten und Fahrzeug-Trägheit
    ("""      const sp = RUN * (1 - 0.22 * weather.wet) * hungerSpeed();
      const len = Math.hypot(ix, iy) || 1, mag = Math.min(1, Math.hypot(ix, iy));
      const tvx = (ix / len) * sp * mag, tvy = (iy / len) * sp * mag;
      const a = 1 - Math.exp(-(mag > 0 ? 11 : 15) * DT); // sanftes Beschleunigen und Abbremsen
      st.vx += (tvx - st.vx) * a;
      st.vy += (tvy - st.vy) * a;
      st.x += st.vx * DT;
      st.y += st.vy * DT;
      collide();""", """      const riding = !!currentRide() && !houseInside;
      const sp = RUN * (1 - 0.22 * weather.wet) * hungerSpeed() * (riding ? rideSpeed() : 1);
      const len = Math.hypot(ix, iy) || 1, mag = Math.min(1, Math.hypot(ix, iy));
      const tvx = (ix / len) * sp * mag, tvy = (iy / len) * sp * mag;
      const a = 1 - Math.exp(-(mag > 0 ? (riding ? 5 : 11) : riding ? 3.2 : 15) * DT); // sanftes Beschleunigen; Fahrzeuge rollen aus
      st.vx += (tvx - st.vx) * a;
      st.vy += (tvy - st.vy) * a;
      const steps = Math.max(1, Math.ceil((Math.hypot(st.vx, st.vy) * DT) / 7)); // bei Tempo in Teilschritten, damit nichts durchrutscht
      for (let k = 0; k < steps; k++) { st.x += (st.vx * DT) / steps; st.y += (st.vy * DT) / steps; collide(); }"""),
    ("      if (spd > 120 && dustT <= 0) {\n        dustT = 0.09;", "      if (riding && spd > 60 && vehicle && Math.random() < 0.6) {\n        const ex = vehicle.exhaust, ca = Math.cos(vehYaw), sa = Math.sin(vehYaw);\n        const px = st.x * S + (ex.x * ca - ex.z * sa) * 0.8, pz = st.y * S - (ex.x * sa + ex.z * ca) * 0.8;\n        if (vehicle.fire) fx.add(px, gy + ex.y, pz, (Math.random() - 0.5) * 0.6 - (st.vx / spd) * 2.5, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6 - (st.vy / spd) * 2.5, 0.5, 0.45, Math.random() < 0.5 ? '#ffb347' : '#ff7a1c');\n        else fx.add(px, gy + 0.2, pz, (Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4, 0.5, 0.28, '#d8d4cc');\n      }\n      if (spd > 120 && dustT <= 0) {\n        dustT = riding ? 0.04 : 0.09;"),
    ("  let hungerTick = 3, lastHunger = hungerLevel();", "  let hungerTick = 3, lastHunger = hungerLevel();\n  let vehicle: Vehicle3D | null = null, vehKind = '', vehYaw = 0, lastRiding = false;"),
    # Darstellung
    ("    miaSpr.group.position.set(st.x * S, gy + (sleeping ? 1.0 : 0), st.y * S);\n    miaSpr.update(t, st.phase, Math.min(1, spd / RUN), miaDir, false, sleeping);",
     """    const wantRide = !houseInside && !hidden && !sleeping ? currentRide() : null;
    if ((wantRide?.id ?? '') !== vehKind) {
      if (vehicle) scene.remove(vehicle.group);
      vehicle = null;
      vehKind = wantRide?.id ?? '';
      if (wantRide) { vehicle = createVehicle(wantRide.id); scene.add(vehicle.group); if (!lastRiding) sfx.vroom(); }
    }
    lastRiding = !!vehicle;
    let seatLift = 0;
    if (vehicle) {
      if (spd > 25) { const target = Math.atan2(st.vy, st.vx); let dA = target - vehYaw; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); vehYaw += dA * 0.14; }
      vehicle.group.position.set(st.x * S, gy, st.y * S);
      vehicle.group.rotation.y = -vehYaw;
      vehicle.group.rotation.z = -Math.min(0.1, spd / 5000) * Math.sin(timeSec * 30); // leichtes Rütteln bei hohem Tempo
      vehicle.roll((spd / 60) * S, timeSec);
      seatLift = vehicle.seat;
    }
    shopTick?.(timeSec);
    miaSpr.group.position.set(st.x * S, gy + seatLift + (sleeping ? 1.0 : 0), st.y * S);
    miaSpr.update(t, st.phase, vehicle ? 0 : Math.min(1, spd / RUN), miaDir, !!vehicle, sleeping);"""),
    ("    umbrella.visible = weather.umbrella && !hidden && !sleeping;", "    umbrella.visible = weather.umbrella && !hidden && !sleeping && !vehicle;"),
    ("if (inh !== houseInside) { houseInside = inh; house.setInside(inh); stage.setZoom(inh ? 11.5 : 15); }", "if (inh !== houseInside) { houseInside = inh; house.setInside(inh); if (inh && currentRide()) speak('car.house'); }\n      stage.setZoom(houseInside ? 11.5 : 15 + (vehicle ? (rideSpeed() - 1) * 1.5 : 0));"),
    ("const ev = tickWeather(DT, houseInside && isBuilt('dach'));", "const ev = tickWeather(DT, (houseInside && isBuilt('dach')) || !!currentRide()?.canopy);")])
open('src/styles/polish.css', 'a', encoding='utf-8').write("""
/* Autohaus und Garage */
.carshop { min-width: 880px; }
.cs-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; } .cs-purse { font: 900 32px var(--font); } .cs-head small { font: 700 20px var(--font); color: #6b5a44; }
.cs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.garage .cs-grid { grid-template-columns: repeat(2, 1fr); }
.cs-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 10px; border-radius: 22px; border: 4px solid #fff; background: #fff8e6; cursor: pointer; transition: transform .15s, background .2s; box-shadow: 0 4px 0 rgba(0,0,0,.1); }
.cs-card:hover { transform: translateY(-3px); } .cs-card.sel { background: #bfe6ff; border-color: #4a90d9; } .cs-card.poor { opacity: .8; }
.cs-icon { font-size: 64px; line-height: 1.1; } .cs-card b { font: 900 26px var(--font); } .cs-card small { font: 700 17px/1.2 var(--font); color: #6b5a44; text-align: center; min-height: 40px; }
.cs-price { padding: 2px 18px; border-radius: 16px; background: #ffd23f; border-bottom: 4px solid #c99a00; font: 900 28px var(--font); }
.cs-speed { display: flex; gap: 3px; } .cs-speed i { width: 14px; height: 12px; border-radius: 4px; background: #e6dcc4; } .cs-speed i.on { background: linear-gradient(#7ddc7a, #3fa83a); }
.cs-card.own { border-color: #7ddc7a; }
.cs-buy { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px 18px; border-radius: 22px; background: #fff; border: 4px solid #e2cfa4; }
.cs-buy.empty { justify-content: center; font: 800 22px var(--font); color: #6b5a44; } .cs-calc { display: flex; flex-direction: column; gap: 4px; font: 800 24px var(--font); } .cs-calc b { font-size: 30px; }
.hud-btn.ride { font-size: 36px; }
""")
print('ok')
