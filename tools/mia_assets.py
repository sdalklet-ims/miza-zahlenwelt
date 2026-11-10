#!/usr/bin/env python3
"""
Mia-Grafiken aufbereiten (reproduzierbar):  python tools/mia_assets.py
Quelle:  assets/mia-source/{charakterblatt,sprites-pose,laufzyklus}.png   (bleiben unverändert)
Ausgabe: assets/mia/frames/*.png (einzelne Frames, einheitliche Zelle), assets/mia/portraits/*.png,
         assets/mia/atlas.png + atlas.json, assets/mia/report.json (Messwerte für die Prüfung)

Schritte
 1. Weiß → transparent: Flood-Fill vom Rand (nur mit dem Rand verbundenes Weiß), weiche Kante mit Farb-Entmischung
    (kein weißer Halo); eingeschlossenes Weiß (Augenglanz, helle Pfoten) bleibt.
 2. Einzelbilder per Zusammenhangskomponenten finden und zuschneiden.
 3. Gleicher Maßstab: Regenbogenhaut (grüne Iris) als Messlatte – je Quelle der Median über alle Seitenansichten.
 4. Einheitliche Zelle: Schwerpunkt horizontal mittig (ruhige Laufanimation), Füße auf gemeinsamer Bodenlinie
    (Sprungbilder behalten ihre Höhe über dem Boden).
"""
import json
import os
import sys
from collections import OrderedDict

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'mia-source')
OUT = os.path.join(ROOT, 'assets', 'mia')

# Zielgröße: Regenbogenhaut-Durchmesser in Atlas-Pixeln (bestimmt den Gesamtmaßstab; Mia sitzend ≈ 300 px hoch)
TARGET_IRIS = 0.0  # wird unten aus TARGET_SIT_HEIGHT berechnet
TARGET_SIT_HEIGHT = 300
PAD = 8


# ───────────────────────── Freistellen ─────────────────────────
def cutout_white(rgb: np.ndarray) -> np.ndarray:
    """RGB (H,W,3 uint8) → RGBA mit sauber entferntem weißem Hintergrund."""
    a = rgb.astype(np.float32)
    mn = a.min(axis=2)
    white = mn > 236
    lab, n = ndi.label(white)  # 4er-Nachbarschaft
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    # eingeschlossene Hintergrund-Inseln (z. B. Lücke zwischen Schwanz und Körper) ebenfalls entfernen; kleine Weißflächen (Augenglanz) bleiben
    sizes = ndi.sum(white, lab, range(1, n + 1))
    for i in range(1, n + 1):
        if i not in border and sizes[i - 1] >= 250:
            bg |= lab == i
    alpha = np.ones(mn.shape, np.float32)
    alpha[bg] = 0.0
    band = ndi.binary_dilation(bg, iterations=3) & ~bg
    # Kantenpixel: Mischung aus Kontur (dunkelbraun ≈ 60) und Weiß
    ea = np.clip((255.0 - mn) / (255.0 - 60.0), 0.0, 1.0)
    alpha[band] = np.minimum(1.0, ea[band] * 1.15)
    out = np.zeros(rgb.shape[:2] + (4,), np.float32)
    ap = np.maximum(alpha, 0.04)[..., None]
    col = np.where(band[..., None], (a - 255.0 * (1 - alpha[..., None])) / ap, a)
    out[..., :3] = np.clip(col, 0, 255)
    out[..., 3] = alpha * 255
    out[bg, :3] = 0
    return out.astype(np.uint8)


def components(alpha: np.ndarray, grow: int, min_area: int):
    """Bounding-Boxen zusammenhängender Figuren (nach Vergrößern, damit Schwanz/Ohren/Zeichen mitkommen)."""
    m = alpha > 40
    d = ndi.binary_dilation(m, iterations=grow)
    lab, n = ndi.label(d)
    objs = ndi.find_objects(lab)
    res = []
    for i, sl in enumerate(objs, 1):
        area = int(((lab[sl] == i) & m[sl]).sum())
        if area >= min_area:
            res.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, area))
    return res


def figures(alpha: np.ndarray, grow: int, big=8000, near=70):
    """Große Figuren plus kleine Teile (z. B. Ausrufezeichen) in der Nähe zu je einer Box vereinen, von links nach rechts."""
    comps = components(alpha, grow, 120)
    bigs = [list(c) for c in comps if c[4] >= big]
    for c in comps:
        if c[4] >= big:
            continue
        best, bd = None, 1e9
        for b in bigs:
            dx = max(b[0] - c[2], c[0] - b[2], 0); dy = max(b[1] - c[3], c[1] - b[3], 0)
            d = (dx * dx + dy * dy) ** 0.5
            if d < bd:
                best, bd = b, d
        if best is not None and bd < near:
            best[0], best[1], best[2], best[3] = min(best[0], c[0]), min(best[1], c[1]), max(best[2], c[2]), max(best[3], c[3])
    return sorted([tuple(b) for b in bigs], key=lambda b: b[0])


def column_groups(alpha: np.ndarray, min_gap: int):
    """Figuren einer Reihe über leere Spalten trennen (Lücke ≥ min_gap px); Box je Gruppe."""
    occ = (alpha > 40).any(axis=0)
    groups, start, gap = [], None, 0
    for x, v in enumerate(occ):
        if v:
            if start is None:
                start = x
            gap = 0
            end = x + 1
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                groups.append((start, end)); start = None
    if start is not None:
        groups.append((start, end))
    boxes = []
    for a, b in groups:
        ys = np.where((alpha[:, a:b] > 40).any(axis=1))[0]
        boxes.append((a, int(ys.min()), b, int(ys.max()) + 1, 0))
    return boxes


def crop_rgba(img: np.ndarray, box, pad=2):
    x0, y0, x1, y1 = box[:4]
    h, w = img.shape[:2]
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
    return img[y0:y1, x0:x1].copy()


def tight(img: np.ndarray, thr=12):
    """Auf sichtbare Pixel zuschneiden."""
    ys, xs = np.where(img[..., 3] > thr)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()


def keep_main(img: np.ndarray, grow=18):
    """Nur die größte Figur behalten (entfernt Nachbarreste des Rasters)."""
    m = img[..., 3] > 40
    d = ndi.binary_dilation(m, iterations=grow)
    lab, n = ndi.label(d)
    if n <= 1:
        return img
    sizes = ndi.sum(m, lab, range(1, n + 1))
    keep = lab == (1 + int(np.argmax(sizes)))
    out = img.copy()
    out[~keep, 3] = 0
    return out


# ───────────────────────── Messen ─────────────────────────
def iris_size(img: np.ndarray) -> float:
    """Durchmesser (px) der größten grünen Iris-Fläche; 0 wenn keine sichtbar (z. B. Blinzeln)."""
    r, g, b, a = [img[..., i].astype(int) for i in range(4)]
    m = (a > 200) & (g > r + 18) & (g > b + 6) & (r < 170)
    lab, n = ndi.label(m)
    if n == 0:
        return 0.0
    areas = ndi.sum(m, lab, range(1, n + 1))
    return float(2 * np.sqrt(areas.max() / np.pi))


def scarf_height(img: np.ndarray) -> float:
    r, g, b, a = [img[..., i].astype(int) for i in range(4)]
    m = (a > 200) & (b > r + 50) & (b > g + 10)
    ys, xs = np.where(m)
    return float(ys.max() - ys.min() + 1) if len(ys) > 20 else 0.0


def scale_img(img: np.ndarray, s: float) -> np.ndarray:
    im = Image.fromarray(img, 'RGBA').convert('RGBa')  # vormultipliziert: kein Halo beim Skalieren
    w, h = max(1, round(img.shape[1] * s)), max(1, round(img.shape[0] * s))
    im = im.resize((w, h), Image.LANCZOS).convert('RGBA')
    return np.array(im)


def main():
    os.makedirs(os.path.join(OUT, 'frames'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'portraits'), exist_ok=True)
    report = OrderedDict()

    # ── Quellen laden und freistellen ──
    sheet = cutout_white(np.array(Image.open(os.path.join(SRC, 'charakterblatt.png')).convert('RGB')))
    pose = cutout_white(np.array(Image.open(os.path.join(SRC, 'sprites-pose.png')).convert('RGB')))
    walk_full = np.array(Image.open(os.path.join(SRC, 'laufzyklus.png')).convert('RGBA'))

    # ── Charakterblatt: Figuren oben (Reihe 1) und Gesichter unten (Reihe 2) ──
    DIV_TOP, DIV_BOT = 575, 603  # Trennlinie bei y≈592 ausblenden (obere Figuren enden ≤ 570, Gesichter beginnen ≥ 605)
    top = sheet.copy(); top[DIV_TOP:, :, 3] = 0
    bot = sheet.copy(); bot[:DIV_BOT, :, 3] = 0
    top_c = figures(top[..., 3], 4, big=20000)
    bot_c = figures(bot[..., 3], 4, big=20000)
    if len(top_c) != 4 or len(bot_c) != 5:
        sys.exit(f'Charakterblatt: erwartet 4+5 Figuren, gefunden {len(top_c)}+{len(bot_c)}')
    names_top = ['front', 'side', 'back', 'three_quarter']
    names_face = ['neutral', 'fröhlich', 'nachdenklich', 'überrascht', 'traurig']
    sheet_fig = {n: tight(keep_main(crop_rgba(top, b))) for n, b in zip(names_top, top_c)}
    sheet_face = {n: tight(keep_main(crop_rgba(bot, b), 30)) for n, b in zip(names_face, bot_c)}

    # ── Sprites: 5×4 Raster ──
    ph, pw = pose.shape[:2]
    cw, ch = pw / 5, ph / 4
    pose_c = components(pose[..., 3], 14, 6000)
    grid = {}
    for box in pose_c:
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        key = (min(3, int(cy // ch)), min(4, int(cx // cw)))
        grid.setdefault(key, []).append(box)
    rows = []
    for r in range(4):
        row = []
        for c in range(5):
            boxes = grid.get((r, c))
            if not boxes:
                sys.exit(f'Sprites: Zelle {r},{c} leer')
            x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
            row.append(tight(crop_rgba(pose, (x0, y0, x1, y1))))
        rows.append(row)

    # ── Laufzyklus: 6 Bilder (schon transparent) ──
    wa = walk_full[..., 3]
    colhas = (wa > 40).any(axis=0)
    segs, start = [], None
    for x, v in enumerate(colhas):
        if v and start is None:
            start = x
        if not v and start is not None:
            segs.append([start, x]); start = None
    if start is not None:
        segs.append([start, len(colhas)])
    # zu nahe Lücken (< 12 px) zusammenfassen
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < 12:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    if len(merged) != 6:
        sys.exit(f'Laufzyklus: erwartet 6 Frames, gefunden {len(merged)}: {merged}')
    walk = [tight(walk_full[:, a:b].copy()) for a, b in merged]

    # ── Laufen nach unten/oben: je 6 Einzelbilder (schon transparent, harte Alpha-Kante) ──
    def load_dir(name):
        import glob
        fs = sorted(glob.glob(os.path.join(SRC, name, '*.png')))
        if len(fs) != 6:
            sys.exit(f'{name}: erwartet 6 Bilder, gefunden {len(fs)}')
        return [tight(np.array(Image.open(f).convert('RGBA'))) for f in fs]
    walk_down = load_dir('Mia_laeuft_nach_unten')
    walk_up = load_dir('Mia_laeuft_nach_oben')

    # ── Maßstab über Iris-Durchmesser ──
    def med(imgs):
        v = [iris_size(i) for i in imgs]
        v = [x for x in v if x > 0]
        return float(np.median(v)) if v else 0.0

    iris_pose = med([im for row in rows[:3] for im in row] + [im for im in rows[3]])
    iris_walk = med(walk)
    iris_side = iris_size(sheet_fig['side'])
    sit_h = float(np.median([im.shape[0] for im in rows[0]]))
    target = TARGET_SIT_HEIGHT / sit_h * iris_pose  # Ziel-Irisdurchmesser
    s_pose = target / iris_pose
    # Laufzyklus: Iris-Abgleich, danach Kopfbreite von Hand nachjustiert (Kopf im Lauf war ~5 % breiter als beim Sitzen)
    WALK_FIX = 0.95
    s_walk = target / iris_walk * WALK_FIX
    # Charakterblatt: gleiche Pose (sitzende Seitenansicht) wie sprites-pose Reihe 1 → Höhenverhältnis; Augen sind dort anders gezeichnet
    s_sheet = (sit_h * s_pose) / sheet_fig['side'].shape[0]
    report['iris'] = {'pose': iris_pose, 'walk': iris_walk, 'sheet_side': iris_side, 'target': target,
                      'scale': {'pose': s_pose, 'walk': s_walk, 'sheet': s_sheet}, 'note': 'Charakterblatt über Pose, Laufzyklus über Iris+Kopfbreite'}
    # Gegenprobe über Halstuch-Höhe (Seitenansichten)
    sc = lambda imgs: float(np.median([x for x in (scarf_height(i) for i in imgs) if x > 0]))
    report['scarf_check'] = {'pose_scaled': sc(rows[0] + rows[1] + rows[2]) * s_pose, 'walk_scaled': sc(walk) * s_walk,
                             'sheet_side_scaled': scarf_height(sheet_fig['side']) * s_sheet}

    # ── Frames skalieren ──
    F = OrderedDict()  # Name → (RGBA, ground_offset_hint)
    def add(name, img, s):
        F[name] = scale_img(img, s)
    for i, im in enumerate(walk): add(f'walk_right_{i}', im, s_walk)
    for i, im in enumerate(rows[0]): add(f'idle_{i}', im, s_pose)
    for i, im in enumerate(rows[1]): add(f'paw_{i}', im, s_pose)
    for i, im in enumerate(rows[2]): add(f'sneak_{i}', im, s_pose)
    for i, im in enumerate(rows[3]): add(f'celebrate_{i}', im, s_pose)
    add('front_idle', sheet_fig['front'], s_sheet)
    add('back_idle', sheet_fig['back'], s_sheet)
    # Maßstab Laufen unten/oben: Halstuchbreite gegen front_idle/back_idle (gleiche Ansicht, schon im Gesamtmaßstab)
    def scarf_w(img):
        r, g, b, a = [img[..., i].astype(int) for i in range(4)]
        m = (a > 200) & (b > r + 50) & (b > g + 10)
        xs = np.where(m.any(axis=0))[0]
        return float(xs.max() - xs.min() + 1) if len(xs) else 0.0
    s_down = scarf_w(F['front_idle']) / float(np.median([scarf_w(i) for i in walk_down]))
    def head_w(img):  # Breite von Kopf und Ohren (obere 35 % der Figur); in der Rückansicht ragt dort nichts anderes heraus
        a = img[..., 3] > 40
        ys = np.where(a.any(axis=1))[0]
        top = a[ys.min(): ys.min() + int((ys.max() - ys.min()) * 0.35)]
        xs = np.where(top.any(axis=0))[0]
        return float(xs.max() - xs.min() + 1)
    s_up = head_w(F['back_idle']) / float(np.median([head_w(i) for i in walk_up]))
    report['scale_updown'] = {'down': s_down, 'up': s_up, 'note': 'unten: Halstuchbreite, oben: Kopfbreite – jeweils gegen front_idle/back_idle'}
    for i, im in enumerate(walk_down): add(f'walk_down_{i}', im, s_down)
    for i, im in enumerate(walk_up): add(f'walk_up_{i}', im, s_up)
    add('side_idle', sheet_fig['side'], s_sheet)
    add('three_quarter', sheet_fig['three_quarter'], s_sheet)

    # ── Einheitliche Zelle ──
    cell_w = int(max(f.shape[1] for f in F.values())) + 2 * PAD
    cell_h = int(max(f.shape[0] for f in F.values())) + 2 * PAD
    cell_w += cell_w % 2
    cell_h += cell_h % 2
    BASE = cell_h - PAD  # Bodenlinie in der Zelle

    anims = OrderedDict([
        ('walk_right', [f'walk_right_{i}' for i in range(6)]),
        ('idle', [f'idle_{i}' for i in range(5)]),
        ('paw', [f'paw_{i}' for i in range(5)]),
        ('sneak', [f'sneak_{i}' for i in range(5)]),
        ('celebrate', [f'celebrate_{i}' for i in range(5)]),
        ('walk_down', [f'walk_down_{i}' for i in range(6)]),
        ('walk_up', [f'walk_up_{i}' for i in range(6)]),
        ('front_idle', ['front_idle']),
        ('back_idle', ['back_idle']),
        ('side_idle', ['side_idle']),
        ('three_quarter', ['three_quarter']),
    ])
    cells = {}
    meta = {}
    for an, names in anims.items():
        # gemeinsamer Horizontal-Anker je Animation: mittlerer Schwerpunkt; Bodenlinie: tiefster Fußpunkt
        cxs = []
        for n in names:
            im0 = F[n]
            if an in ('walk_down', 'walk_up'):
                # Körperachse = Halstuchmitte (der Schwanz ragt seitlich heraus und würde den Schwerpunkt verschieben)
                r, g, b, a = [im0[..., i].astype(int) for i in range(4)]
                m = (a > 200) & (b > r + 50) & (b > g + 10)
                xs0 = np.where(m.any(axis=0))[0]
                cxs.append(float((xs0.min() + xs0.max()) / 2) if len(xs0) else im0.shape[1] / 2)
                continue
            a = im0[..., 3].astype(np.float32)
            xs = np.arange(a.shape[1])[None, :]
            cxs.append(float((a * xs).sum() / a.sum()))
        for n, cx in zip(names, cxs):
            im = F[n]
            h, w = im.shape[:2]
            # Schwerpunkt jedes Frames mittig (ruhig); Sprung: Höhe über der Bodenlinie bleibt
            x = int(round(cell_w / 2 - cx))
            grounded_bottom = max(F[m].shape[0] for m in names)
            lift = 0
            if an == 'celebrate':  # Raster-Zellen: Sprungbilder sind kleiner/höher – über Rasterlage ermitteln
                lift = 0
            cells[n] = (im, x, BASE - h)
            meta[n] = {'cx': cx}
    # Sprünge: Bodenabstand aus der Quelllage im Raster ableiten (Unterkante relativ zur tiefsten Unterkante der Reihe)
    def row_bottoms(row_imgs_boxes):
        return None
    # Quell-Unterkanten je Reihe 4 aus dem Raster
    jump = {}
    for r, tag in ((3, 'celebrate'),):
        bottoms = []
        for c in range(5):
            bx = grid[(r, c)]
            bottoms.append(max(b[3] for b in bx))
        ground = max(bottoms)
        for c in range(5):
            lift_src = ground - bottoms[c]
            hh = rows[r][c].shape[0]
            jump[f'{tag}_{c}'] = lift_src * s_pose if lift_src > 0.06 * hh else 0.0
    for n, lift in jump.items():
        im, x, y = cells[n]
        cells[n] = (im, x, int(round(y - lift)))

    # ── Einzel-PNGs und Atlas ──
    atlas_cols = 6
    atlas_rows = len(anims)
    atlas = Image.new('RGBA', (atlas_cols * cell_w, atlas_rows * cell_h), (0, 0, 0, 0))
    frames_json = OrderedDict()
    anims_json = OrderedDict()
    for ri, (an, names) in enumerate(anims.items()):
        anims_json[an] = []
        for ci, n in enumerate(names):
            im, x, y = cells[n]
            cell = Image.new('RGBA', (cell_w, cell_h), (0, 0, 0, 0))
            cell.alpha_composite(Image.fromarray(im, 'RGBA'), (max(0, x), max(0, y)))
            cell.save(os.path.join(OUT, 'frames', n + '.png'), optimize=True)
            atlas.alpha_composite(cell, (ci * cell_w, ri * cell_h))
            frames_json[n] = {'x': ci * cell_w, 'y': ri * cell_h, 'w': cell_w, 'h': cell_h}
            anims_json[an].append(n)
    atlas.save(os.path.join(OUT, 'atlas.png'), optimize=True)

    # ── Porträts (gleicher Maßstab wie Charakterblatt, quadratische Leinwand) ──
    side = 0
    scaled_faces = {n: scale_img(im, s_sheet) for n, im in sheet_face.items()}
    side = int(max(max(f.shape[:2]) for f in scaled_faces.values())) + 2 * PAD
    side += side % 2
    portraits = OrderedDict()
    for n, im in scaled_faces.items():
        can = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        can.alpha_composite(Image.fromarray(im, 'RGBA'), ((side - im.shape[1]) // 2, (side - im.shape[0]) // 2))
        key = {'fröhlich': 'happy', 'nachdenklich': 'think', 'überrascht': 'surprised', 'traurig': 'sad', 'neutral': 'neutral'}[n]
        can.save(os.path.join(OUT, 'portraits', f'portrait_{key}.png'), optimize=True)
        portraits[key] = f'portraits/portrait_{key}.png'

    # ── JSON ──
    atlas_json = {
        'image': 'atlas.png', 'cell': {'w': cell_w, 'h': cell_h}, 'baseline': BASE, 'scale_note': 'alle Frames gleicher Maßstab (Iris-Messung)',
        'frames': frames_json, 'animations': anims_json, 'portraits': portraits,
        'fps': {'walk_right': 12, 'walk_down': 12, 'walk_up': 12, 'idle': 4, 'paw': 6, 'sneak': 8, 'celebrate': 10},
    }
    with open(os.path.join(OUT, 'atlas.json'), 'w', encoding='utf-8') as f:
        json.dump(atlas_json, f, ensure_ascii=False, indent=2)

    # ── Prüfwerte ──
    chk = OrderedDict()
    for n, (im, x, y) in cells.items():
        a = im[..., 3]
        edge = int(((a > 8) & (a < 250)).sum())
        # weiße Reste an der Kante: helle, schwach transparente Randpixel
        rim = (a > 8) & (a < 250)
        bright = int((rim & (im[..., :3].min(axis=2) > 215)).sum())
        chk[n] = {'size': [int(im.shape[1]), int(im.shape[0])], 'iris': round(iris_size(im), 1), 'edge_px': edge, 'bright_edge_px': bright,
                  'bottom': int(y + im.shape[0]), 'jump': round(float(jump.get(n, 0)), 1)}
    report['cell'] = [cell_w, cell_h]
    report['frames'] = chk
    with open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print('Zelle', cell_w, 'x', cell_h, '| Iris', report['iris'], '| Halstuch', report['scarf_check'])


if __name__ == '__main__':
    main()
