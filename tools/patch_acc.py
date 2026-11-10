# Einmaliges Hilfsskript: Accessoires (Zipfelmütze, Sonnenbrille, Regencape) im Spiel, im Rucksack und als Regenschutz
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/world3d/miaAnim.ts', [
    ("import atlasUrl from '../../assets/mia/atlas.png';", """import atlasUrl from '../../assets/mia/atlas.png';
import accData from '../../assets/mia/accessories.json';
import accUrl from '../../assets/mia/accessories.png';"""),
    ("export const BASE: number = atlas.baseline;", """export const BASE: number = atlas.baseline;
/** Leinwand mit Rand: oben Platz für Mützenbommel/Kapuze, seitlich etwas Luft */
export const MARGIN_X = 30;
export const MARGIN_TOP = 110;
export const CANVAS_W = CELL_W + 2 * MARGIN_X;
export const CANVAS_H = CELL_H + MARGIN_TOP;"""),
    ("let atlasImg: HTMLImageElement | null = null;", """type AccPlace = { sx: number; sy: number; sw: number; sh: number; x: number; y: number; w: number; h: number };
const accFrames = (accData as unknown as { frames: Record<string, Record<string, AccPlace>> }).frames;
let accImg: HTMLImageElement | null = null;
/** Welche Mia-Items welches Accessoire-Bild bedeuten (Reihenfolge = Zeichenreihenfolge: Kapuze, Mütze, Brille) */
const ACC_ORDER: [string, string][] = [['mia-regencape', 'cape'], ['mia-zipfel', 'hat'], ['mia-brille', 'glasses']];

/** Accessoires auf ein Bild malen. (ox, oy) = linke obere Ecke des Mia-Bildes in ctx-Koordinaten, k = Maßstab des Bildes. */
function drawOverlays(ctx: CanvasRenderingContext2D, name: string, ox: number, oy: number, k: number, acc: string[]) {
  const e = accFrames[name];
  if (!e || !accImg || !acc.length) return;
  for (const [id, key] of ACC_ORDER) {
    const p = e[key];
    if (!p || !acc.includes(id)) continue;
    ctx.drawImage(accImg, p.sx, p.sy, p.sw, p.sh, ox + p.x * k, oy + p.y * k, p.w * k, p.h * k);
  }
}

let atlasImg: HTMLImageElement | null = null;"""),
    ("    const [a, ...ps] = await Promise.all([loadImg(atlasUrl), ...(Object.keys(portraitUrls) as Face[]).map((k) => loadImg(portraitUrls[k]))]);\n    atlasImg = a;",
     "    const [a, ac, ...ps] = await Promise.all([loadImg(atlasUrl), loadImg(accUrl), ...(Object.keys(portraitUrls) as Face[]).map((k) => loadImg(portraitUrls[k]))]);\n    atlasImg = a;\n    accImg = ac;"),
    ("  sleep?: boolean;\n  ride?: RideKind;", "  sleep?: boolean;\n  ride?: RideKind;\n  /** angelegte Mia-Items (z. B. 'mia-zipfel'); sonst die mit setAccessories gesetzten */\n  acc?: string[];"),
    ("  private idleT = 0;", "  private idleT = 0;\n  private acc: string[] = [];\n  setAccessories(a: string[]) { this.acc = a; }\n  private curAcc: string[] = [];"),
    ("    ctx.clearRect(0, 0, CELL_W, CELL_H);\n    if (!atlasImg) return;\n    if (this.prev && this.fade < 1) this.paint(ctx, this.prev.d, 1 - this.fade);\n    this.paint(ctx, this.cur.d, this.prev && this.fade < 1 ? this.fade : 1);\n    if (this.cur.group === 'sleep') this.zzz(ctx);\n    else if (this.cur.group === 'car') this.carHead(ctx, inp);",
     "    this.curAcc = inp.acc ?? this.acc;\n    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);\n    if (!atlasImg) return;\n    ctx.save();\n    ctx.translate(MARGIN_X, MARGIN_TOP);\n    if (this.prev && this.fade < 1) this.paint(ctx, this.prev.d, 1 - this.fade);\n    this.paint(ctx, this.cur.d, this.prev && this.fade < 1 ? this.fade : 1);\n    if (this.cur.group === 'sleep') this.zzz(ctx);\n    else if (this.cur.group === 'car') this.carHead(ctx, inp);\n    ctx.restore();"),
    ("    ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, -CELL_W / 2, -BASE, f.w, f.h);\n    ctx.restore();\n  }\n\n  /** Im Auto", "    ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, -CELL_W / 2, -BASE, f.w, f.h);\n    drawOverlays(ctx, d.name, -CELL_W / 2, -BASE, 1, this.curAcc);\n    ctx.restore();\n  }\n\n  /** Im Auto"),
    ("    ctx.clearRect(0, 0, CELL_W, CELL_H);\n    const p = portraits[inp.speed > 0.4 ? 'happy' : 'neutral'];", "    ctx.clearRect(-MARGIN_X, -MARGIN_TOP, CANVAS_W, CANVAS_H);\n    const pk: Face = this.curAcc.includes('mia-brille') || inp.speed <= 0.4 ? 'neutral' : 'happy';\n    const p = portraits[pk];"),
    ("    ctx.drawImage(p, -w / 2, -h, w, h);\n    ctx.restore();\n  }\n\n  private zzz", "    ctx.drawImage(p, -w / 2, -h, w, h);\n    drawOverlays(ctx, 'portrait_' + pk, -w / 2, -h, s, this.curAcc);\n    ctx.restore();\n  }\n\n  private zzz"),
])
# Standbild mit Accessoires (Vorschau im Rucksack/Album)
open('src/world3d/miaAnim.ts', 'a', encoding='utf-8').write("""
/** Mia (Vorderansicht, sitzend) mit Accessoires als Bild-URL, z. B. für Vorschaubilder; '' solange die Grafiken laden. */
export function dressedUrl(acc: string[], frame = 'front_idle', height = 200): string {
  const f = frames[frame];
  if (!f || !atlasImg) return '';
  const cv = document.createElement('canvas');
  cv.width = CANVAS_W; cv.height = CANVAS_H;
  const c = cv.getContext('2d')!;
  c.translate(MARGIN_X, MARGIN_TOP);
  c.drawImage(atlasImg, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  drawOverlays(c, frame, 0, 0, 1, acc);
  if (height >= CANVAS_H) return cv.toDataURL('image/png');
  const k = height / CANVAS_H, out = document.createElement('canvas');
  out.width = Math.round(CANVAS_W * k); out.height = height;
  out.getContext('2d')!.drawImage(cv, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
""")

ed('src/world3d/sprites.ts', [
    ("import { BASE, CELL_H, CELL_W, MiaAnimator, type Facing, type RideKind } from './miaAnim';", "import { BASE, CANVAS_H, CANVAS_W, CELL_H, MiaAnimator, type Facing, type RideKind } from './miaAnim';"),
    ("  /** Freude-Animation (celebrate) */", "  /** angelegte Mia-Items (Mütze, Brille, Regencape) */\n  setAccessories(acc: string[]): void;\n  /** Freude-Animation (celebrate) */"),
    ("export function createMiaSprite(_acc?: string[]): MiaSprite {\n  const cv = document.createElement('canvas');\n  cv.width = CELL_W; cv.height = CELL_H;",
     "export function createMiaSprite(acc: string[] = []): MiaSprite {\n  const cv = document.createElement('canvas');\n  cv.width = CANVAS_W; cv.height = CANVAS_H;"),
    ("  const H = (MIA_UNITS * CELL_H) / 320, W = (H * CELL_W) / CELL_H, up = H * ((CELL_H - BASE) / CELL_H);", "  const k = MIA_UNITS / 320; // Welt-Einheiten je Bildpunkt (wie vorher, jetzt mit Platz für Mütze und Kapuze)\n  const H = CANVAS_H * k, W = CANVAS_W * k, up = (CELL_H - BASE) * k;"),
    ("  const anim = new MiaAnimator();\n  return {", "  const anim = new MiaAnimator();\n  anim.setAccessories(acc);\n  return {\n    setAccessories: (a) => anim.setAccessories(a),"),
])
ed('src/ui/miaView.ts', [
    ("import { CELL_H, CELL_W, MiaAnimator, loadMia, portraitImg, type Face, type Facing } from '../world3d/miaAnim';", "import { CANVAS_H, CANVAS_W, CELL_H, MiaAnimator, loadMia, portraitImg, type Face, type Facing } from '../world3d/miaAnim';\nimport { equippedFor } from '../core/rewards';"),
    ("{ class: 'mia-cv', width: CELL_W, height: CELL_H }", "{ class: 'mia-cv', width: CANVAS_W, height: CANVAS_H }"),
    ("  cv.style.height = opts.height + 'px';\n  cv.style.width = (opts.height * CELL_W) / CELL_H + 'px';", "  const ch = (opts.height * CANVAS_H) / CELL_H; // Mia selbst bleibt opts.height hoch, dazu Platz für Mütze\n  cv.style.height = ch + 'px';\n  cv.style.width = (ch * CANVAS_W) / CANVAS_H + 'px';\n  cv.style.marginTop = -(ch - opts.height) + 'px';"),
    ("anim.draw(ctx, dt, { dir, speed: moving ? 0.7 : 0 });", "anim.draw(ctx, dt, { dir, speed: moving ? 0.7 : 0, acc: equippedFor('mia') });"),
])
ed('src/world/worldScreen.ts', [
    ("  const offHouse = onProgress(() => { syncHouse(true); void ensurePet(); });", "  const offHouse = onProgress(() => { syncHouse(true); void ensurePet(); miaSpr.setAccessories(equippedFor('mia')); });"),
    ("const ev = tickWeather(DT, (houseInside && isBuilt('dach')) || !!currentRide()?.canopy);", "const ev = tickWeather(DT, (houseInside && isBuilt('dach')) || !!currentRide()?.canopy || equippedFor('mia').includes('mia-regencape'));"),
])

# Belohnungen: Mia trägt Mütze, Brille und Regencape (Halstuch/Krone hatten keine Grafik mehr)
c = json.load(open('content/common.json', encoding='utf-8'))
its = [i for i in c['rewards']['items'] if i['target'] != 'mia']
mia = [
    {"id": "mia-zipfel", "target": "mia", "slot": "kopf", "name": "Zipfelmütze", "stars": 1},
    {"id": "mia-brille", "target": "mia", "slot": "gesicht", "name": "Sonnenbrille", "stars": 2},
    {"id": "mia-regencape", "target": "mia", "slot": "kopf", "name": "Regencape", "stars": 3},
]
c['rewards']['items'] = mia + its
c['texts']['common.pack.new'] = ["mia", "Hurra! Ein neues Teil für meinen Rucksack: {name}!"]
json.dump(c, open('content/common.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
w = json.load(open('content/weather.json', encoding='utf-8'))
w['texts']['weather.rain'] = ["mia", "Oh, es fängt an zu regnen! Ich spanne den Schirm aus dem Rucksack auf oder ziehe mein Regencape an."]
json.dump(w, open('content/weather.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('ok')
