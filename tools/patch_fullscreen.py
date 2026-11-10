# Einmaliges Hilfsskript: Spielfeld füllt das ganze Fenster (Bühne wächst mit, Menüs bleiben 1180×820 zentriert)
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/ui/stage.ts', [
    ("/** Feste Bühne 1180×820, skaliert auf jedes Fenster (iPad quer). */\nexport const W = 1180;\nexport const H = 820;",
     "/**\n * Bühne: Grundmaß 1180×820 (iPad quer). Das Fenster wird ganz ausgefüllt: Die Bühne wächst in der längeren Richtung mit (W/H sind die aktuellen\n * logischen Maße). Die 3D-Welt nutzt die ganze Fläche, Menüs und Aufgaben-Bildschirme bleiben 1180×820 und stehen mittig.\n */\nexport const BASE_W = 1180;\nexport const BASE_H = 820;\nexport let W = BASE_W;\nexport let H = BASE_H;"),
    ("    scale = Math.min(vw / W, vh / H);\n    stage.style.transform = `translate(-50%,-50%) scale(${scale})`;",
     "    scale = Math.min(vw / BASE_W, vh / BASE_H);\n    W = Math.max(BASE_W, Math.round(vw / scale));\n    H = Math.max(BASE_H, Math.round(vh / scale));\n    stage.style.width = W + 'px';\n    stage.style.height = H + 'px';\n    stage.style.transform = `translate(-50%,-50%) scale(${scale})`;\n    window.dispatchEvent(new Event('stage-resize'));"),
])
ed('src/styles/base.css', [
    ("#screen > * { position: absolute; inset: 0; }", "#screen > * { position: absolute; inset: 0; }\n/* Menüs und Aufgaben-Bildschirme behalten ihr festes Maß 1180×820 und stehen mittig auf der (größeren) Bühne */\n#screen > .framed { inset: auto; left: 50%; top: 50%; width: 1180px; height: 820px; margin: -410px 0 0 -590px; }"),
])
ed('src/styles/world.css', [(".world-canvas { position: absolute; left: 0; top: 0; width: 1180px; height: 820px; display: block; touch-action: none; }", ".world-canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; touch-action: none; }")])
ed('src/core/router.ts', [
    ("export interface Screen {\n  el: HTMLElement;\n  dispose?: () => void;\n}", "export interface Screen {\n  el: HTMLElement;\n  dispose?: () => void;\n  /** Hintergrund der Bühne neben dem festen 1180×820-Rahmen (z. B. Meer bei der Karte) */\n  bg?: string;\n}"),
    ("opts: { hud?: boolean; back?: (() => void) | null } = {}", "opts: { hud?: boolean; back?: (() => void) | null; framed?: boolean } = {}"),
    ("  s.el.classList.add('screen-in');", "  s.el.classList.add('screen-in');\n  s.el.classList.toggle('framed', opts.framed !== false);\n  layers.stage.style.background = s.bg ?? '';"),
])
ed('src/world3d/scene.ts', [
    ("  const asp = VW / VH;\n  const camera = new THREE.OrthographicCamera((-VIEW_H * asp) / 2, (VIEW_H * asp) / 2, VIEW_H / 2, -VIEW_H / 2, 1, 260);",
     "  let asp = VW / VH;\n  const camera = new THREE.OrthographicCamera((-VIEW_H * asp) / 2, (VIEW_H * asp) / 2, VIEW_H / 2, -VIEW_H / 2, 1, 260);\n  const frustum = () => {\n    camera.left = (-view * asp) / 2; camera.right = (view * asp) / 2; camera.top = view / 2; camera.bottom = -view / 2;\n    camera.updateProjectionMatrix();\n  };\n  // Bühne wird größer/kleiner (Fenstergröße): Auflösung und Bildverhältnis nachziehen\n  const onResize = () => { asp = VW / VH; renderer.setSize(VW, VH, false); frustum(); };\n  window.addEventListener('stage-resize', onResize);"),
    ("        camera.left = (-view * asp) / 2; camera.right = (view * asp) / 2; camera.top = view / 2; camera.bottom = -view / 2;\n        camera.updateProjectionMatrix();\n      }\n      waveTex", "        frustum();\n      }\n      waveTex"),
    ("    dispose() {\n      renderer.dispose();", "    dispose() {\n      window.removeEventListener('stage-resize', onResize);\n      renderer.dispose();"),
])
ed('src/core/map.ts', [("  return { el, dispose: () => void (dead = true) };", "  return { el, bg: '#8ed3ee', dispose: () => void (dead = true) };")])
ed('src/ui/start.ts', [("  return { el };", "  return { el, bg: '#a9e0f7' };")])
ed('src/world/worldScreen.ts', [
    ("import { getScale, layers, W as VW } from '../ui/stage';", "import { getScale, layers, W as VW, H as VH } from '../ui/stage';"),
    ("  const rainCv = h('canvas', { class: 'rain-cv', width: 1180, height: 820 });", "  const rainCv = h('canvas', { class: 'rain-cv', width: VW, height: VH });\n  const sizeRain = () => { rainCv.width = VW; rainCv.height = VH; };\n  window.addEventListener('stage-resize', sizeRain);"),
    ("x: Math.random() * 1180, y: Math.random() * 820,", "x: Math.random() * 1500, y: Math.random() * 900,"),
    ("rainCtx.clearRect(0, 0, 1180, 820);", "rainCtx.clearRect(0, 0, VW, VH);"),
    ("if (d.y > 820 || d.x < -20) { d.y = -30; d.x = Math.random() * 1250; }", "if (d.y > VH || d.x < -20) { d.y = -30; d.x = Math.random() * (VW + 80); }"),
    ("(pp.x < 80 || pp.x > VW - 80 || pp.y < 110 || pp.y > 720)", "(pp.x < 80 || pp.x > VW - 80 || pp.y < 110 || pp.y > VH - 100)"),
    ("const cx = VW / 2, cy = 410, a =", "const cx = VW / 2, cy = VH / 2, a ="),
    ("clamp(cy + Math.sin(a) * 330, 120, 700)", "clamp(cy + Math.sin(a) * (VH * 0.4), 120, VH - 120)"),
    ("      window.removeEventListener('resize', fit);", "      window.removeEventListener('resize', fit);\n      window.removeEventListener('stage-resize', sizeRain);"),
    ("  show(screen, { back: null });", "  show(screen, { back: null, framed: false });"),
])
print('ok')
