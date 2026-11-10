#!/usr/bin/env python3
"""
Accessoires (Zipfelmütze, Sonnenbrille, Regencape) auf die Mia-Frames abstimmen:  python tools/mia_accessories.py
Liest assets/mia/frames/*.png (aus tools/mia_assets.py) und die gesäuberten Overlays (tools/acc_clean.py) und schreibt
 assets/mia/accessories.png   Atlas der Overlay-Zellen (je Ansicht 6 Bilder, 256×256)
 assets/mia/accessories.json  je Mia-Frame und Accessoire: Zellname + Ziel-Rechteck in Zellkoordinaten (Mia-Zelle)
 assets/mia/_acc_review.png   Prüfbild (Mia mit Accessoires) – nur zum Anschauen
Ansichten: right (alle Seitenbilder, links = Spiegelung), front (walk_down, front_idle), back (walk_up, back_idle).
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import acc_clean

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR = os.path.join(ROOT, 'assets', 'mia', 'frames')
OUT = os.path.join(ROOT, 'assets', 'mia')

# Zeile im Overlay-Sheet je Ansicht (0-basiert): Zeile 3 zeigt nach rechts (Hut-Pompon hinten, Kapuzenöffnung rechts)
ROW = {'front': 0, 'back': 1, 'right': 2}
VIEWS_OF = lambda n: ('front' if n.startswith('walk_down') or n in ('front_idle', 'portrait_neutral', 'portrait_happy') else 'back' if n.startswith('walk_up') or n == 'back_idle' else None if n == 'three_quarter' else 'right')

# Abstimmwerte (Anteile an Kopfbreite Hw / Kopfhöhe Hh / Irisdurchmesser d)
TUNE = {
    'hat':   {'right': dict(w=1.02, rim=0.55, eye=1.5, dx=-0.05), 'front': dict(w=0.98, rim=0.5, eye=1.7, dx=0.0), 'back': dict(w=0.98, rim=0.6, eye=0, dx=0.0)},
    'cape':  {'right': dict(hole=0.78, cy=0.60, dx=0.10), 'front': dict(hole=0.92, cy=0.60, dx=0.0), 'back': dict(w=1.22, top=0.10)},
    'glasses': {'right': dict(lens=3.0, dx=0.15, dy=0.0), 'front': dict(w=2.15, dy=0.05)},
}


def load_frame(n):
    if n.startswith('portrait_'):
        return np.array(Image.open(os.path.join(OUT, 'portraits', n + '.png')).convert('RGBA'))
    return np.array(Image.open(os.path.join(FR, n + '.png')).convert('RGBA'))


def irises(img):
    r, g, b, a = [img[..., i].astype(int) for i in range(4)]
    m = (a > 200) & (g > r + 18) & (g > b + 6) & (r < 170)
    lab, n = ndi.label(m)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) >= 25:
            out.append((len(ys), float(xs.mean()), float(ys.mean()), float(2 * np.sqrt(len(ys) / np.pi))))
    return sorted(out, reverse=True)


def scarf_box(img):
    r, g, b, a = [img[..., i].astype(int) for i in range(4)]
    m = (a > 200) & (b > r + 50) & (b > g + 10)
    ys, xs = np.where(m)
    if len(ys) < 30:
        return None
    return xs.min(), ys.min(), xs.max(), ys.max()


def frame_geometry(n, img, view, prev):
    """Kopfgeometrie in Zellkoordinaten: eyes, d, head box (xL,xR,T,Bot), Mitte."""
    al = img[..., 3] > 40
    sc = scarf_box(img)
    ir = irises(img)
    geo = {}
    if view == 'front':
        e = ir[:2]
        if len(e) == 2:
            e = sorted(e, key=lambda t: t[1])
            geo['eyes'] = [(e[0][1], e[0][2]), (e[1][1], e[1][2])]
            geo['d'] = (e[0][3] + e[1][3]) / 2
    elif view == 'right':
        if ir:
            geo['eyes'] = [(ir[0][1], ir[0][2])]
            geo['d'] = ir[0][3]
    # Kopf-Box
    ys_any = np.where(al.any(axis=1))[0]
    if 'eyes' in geo:
        ex = float(np.mean([e[0] for e in geo['eyes']])); ey = float(np.mean([e[1] for e in geo['eyes']]))
        row = al[int(round(ey))]
        xs = np.where(row)[0]
        # zusammenhängender Lauf um die Augen
        lo = int(ex); hi = int(ex)
        while lo - 1 >= 0 and row[lo - 1]: lo -= 1
        while hi + 1 < len(row) and row[hi + 1]: hi += 1
        xL, xR = lo, hi
        cols = al[:, xL:xR + 1].any(axis=0)
        top = int(np.where(al[:, xL:xR + 1].any(axis=1))[0].min())
        geo.update(ex=ex, ey=ey, xL=xL, xR=xR, T=top)
    else:
        # Rückansicht oder geschlossene Augen: obere 35 % der Figur als Kopf
        top = int(ys_any.min())
        h35 = top + int((ys_any.max() - top) * 0.35)
        cols = np.where(al[top:h35].any(axis=0))[0]
        geo.update(xL=int(cols.min()), xR=int(cols.max()), T=top)
        if prev is not None and 'eyes' in prev:
            # geschlossene Augen: Augenposition aus Nachbarbild, um Kopfverschiebung korrigiert
            dy = top - prev['T']
            dx = (geo['xL'] + geo['xR']) / 2 - (prev['xL'] + prev['xR']) / 2
            geo['eyes'] = [(e[0] + dx, e[1] + dy) for e in prev['eyes']]
            geo['d'] = prev['d']
            geo['ex'] = prev['ex'] + dx; geo['ey'] = prev['ey'] + dy
            if view == 'right':
                geo['xL'] = int(prev['xL'] + dx); geo['xR'] = int(prev['xR'] + dx)
    geo['S'] = int(sc[1]) if sc else int(geo['T'] + 0.62 * (ys_any.max() - geo['T']) * 0.6)
    geo['cx'] = (geo['xL'] + geo['xR']) / 2
    geo['Hw'] = geo['xR'] - geo['xL']
    geo['Hh'] = max(10, geo['S'] - geo['T'])
    return geo


def trim(cell):
    ys, xs = np.where(cell[..., 3] > 20)
    return cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (xs.min(), ys.min())


def hole_box(cell):
    """Gesichtsöffnung der Kapuze: größter von außen nicht erreichbarer transparenter Bereich innerhalb der Kontur."""
    a = cell[..., 3] > 60
    filled = ndi.binary_fill_holes(a)
    hole = filled & ~a
    lab, n = ndi.label(hole)
    if n == 0:
        return None
    sizes = ndi.sum(hole, lab, range(1, n + 1))
    k = 1 + int(np.argmax(sizes))
    ys, xs = np.where(lab == k)
    return xs.min(), ys.min(), xs.max(), ys.max()


def place(acc, view, i, cell, geo):
    """Liefert (x, y, w, h) des Overlays in Zellkoordinaten (zugeschnitten)."""
    t = TUNE[acc][view]
    tr, (ox, oy) = trim(cell)
    th, tw = tr.shape[:2]
    if acc == 'hat':
        w = t['w'] * geo['Hw']
        s = w / tw
        h = th * s
        cx = geo['cx'] + t['dx'] * geo['Hw']
        rim = (geo['ey'] - t['eye'] * geo['d']) if 'ey' in geo else geo['T'] + t['rim'] * geo['Hh']
        return cx - w / 2, rim - h, w, h
    if acc == 'cape':
        if view == 'back':
            w = t['w'] * geo['Hw']
            s = w / tw
            return geo['cx'] - w / 2, geo['T'] - t['top'] * geo['Hh'], w, th * s
        hb = hole_box(cell)
        if hb is None:
            return None
        hw = max(1, hb[2] - hb[0])
        s = (t['hole'] * geo['Hw']) / hw  # Gesichtsöffnung so breit wie das sichtbare Gesicht
        hcx = ((hb[0] + hb[2]) / 2 - ox) * s
        hcy = ((hb[1] + hb[3]) / 2 - oy) * s
        cx = geo['cx'] + t['dx'] * geo['Hw']
        cy = geo['T'] + t['cy'] * geo['Hh']
        return cx - hcx, cy - hcy, tw * s, th * s
    if acc == 'glasses':
        if 'eyes' not in geo:
            return None
        if view == 'front':
            ex = np.mean([e[0] for e in geo['eyes']]); ey = np.mean([e[1] for e in geo['eyes']])
            D = abs(geo['eyes'][1][0] - geo['eyes'][0][0])
            w = t['w'] * D
            s = w / tw
            return ex - w / 2, ey + t['dy'] * D - th * s / 2, w, th * s
        lens = th  # Seitenansicht: Linsendurchmesser ≈ Höhe des zugeschnittenen Bildes
        s = (t['lens'] * geo['d']) / lens
        w, h = tw * s, th * s
        ex, ey = geo['eyes'][0]
        # Linse sitzt am rechten Ende des zugeschnittenen Bildes
        return ex + t['dx'] * geo['d'] - w + h / 2, ey + t['dy'] * geo['d'] - h / 2, w, h


def main():
    names = sorted(f[:-4] for f in os.listdir(FR) if f.endswith('.png')) + ['portrait_neutral', 'portrait_happy']
    cells = {a: acc_clean.load(a) for a in ('hat', 'cape', 'glasses')}
    # Atlas der benötigten Zellen
    rows = [('hat', 'front'), ('hat', 'back'), ('hat', 'right'), ('cape', 'front'), ('cape', 'back'), ('cape', 'right'), ('glasses', 'front'), ('glasses', 'right')]
    atlas = Image.new('RGBA', (256 * 6, 256 * len(rows)), (0, 0, 0, 0))
    for ri, (a, v) in enumerate(rows):
        for c in range(6):
            atlas.alpha_composite(Image.fromarray(cells[a][ROW[v] if not (a == 'glasses' and v == 'right') else 2][c], 'RGBA'), (c * 256, ri * 256))
    atlas.save(os.path.join(OUT, 'accessories.png'), optimize=True)
    # Zellen-Index im Atlas
    def cell_of(a, v, i):
        return {'x': i * 256, 'y': rows.index((a, v)) * 256, 'w': 256, 'h': 256}

    result = {}
    groups = {}
    for n in names:
        v = VIEWS_OF(n)
        if v:
            groups.setdefault(v, []).append(n)
    review = []
    for v, ns in groups.items():
        prev = None
        for k, n in enumerate(ns):
            img = load_frame(n)
            geo = frame_geometry(n, img, v, prev)
            if 'eyes' in geo:
                prev = geo
            i = k % 6
            entry = {}
            for a in ('hat', 'cape', 'glasses'):
                if a == 'glasses' and v == 'back':
                    continue
                cell = cells[a][ROW[v] if not (a == 'glasses' and v == 'right') else 2][i]
                p = place(a, v, i, cell, geo)
                if p is None:
                    continue
                tr, (ox, oy) = trim(cell)
                src = cell_of(a, v if not (a == 'glasses' and v == 'right') else 'right', i)
                entry[a] = {'sx': src['x'] + int(ox), 'sy': src['y'] + int(oy), 'sw': int(tr.shape[1]), 'sh': int(tr.shape[0]),
                            'x': round(p[0], 1), 'y': round(p[1], 1), 'w': round(p[2], 1), 'h': round(p[3], 1)}
            result[n] = {'view': v, **entry}
            review.append((n, img, entry, geo))
    with open(os.path.join(OUT, 'accessories.json'), 'w', encoding='utf-8') as f:
        json.dump({'image': 'accessories.png', 'frames': result}, f, ensure_ascii=False)
    # Prüfbild: ausgewählte Frames mit allen Accessoires
    sel = ['walk_right_0', 'walk_right_3', 'idle_0', 'idle_2', 'celebrate_2', 'sneak_2', 'walk_down_0', 'walk_down_3', 'front_idle', 'walk_up_0', 'walk_up_3', 'back_idle']
    atl = Image.open(os.path.join(OUT, 'accessories.png'))
    W, H = Image.open(os.path.join(FR, 'idle_0.png')).size
    for combo in (('hat', 'glasses'), ('cape', 'glasses')):
        M = 130
        sheet = Image.new('RGBA', (W * 6, (H + M) * 2), (150, 205, 150, 255))
        for k, n in enumerate(sel):
            base = Image.open(os.path.join(FR, n + '.png')).convert('RGBA')
            x0, y0 = (k % 6) * W, (k // 6) * (H + M) + M
            sheet.alpha_composite(base, (x0, y0))
            e = result[n]
            for a in combo:
                if a not in e:
                    continue
                d = e[a]
                piece = atl.crop((d['sx'], d['sy'], d['sx'] + d['sw'], d['sy'] + d['sh'])).resize((max(1, int(d['w'])), max(1, int(d['h']))), Image.LANCZOS)
                px, py = x0 + int(d['x']), y0 + int(d['y'])
                sheet2 = Image.new('RGBA', sheet.size, (0, 0, 0, 0)); sheet2.alpha_composite(piece, (max(0, px), max(0, py))); sheet.alpha_composite(sheet2)
        sheet.convert('RGB').resize((W * 6 // 2, (H + M))).save(os.path.join(OUT, f'_acc_review_{"_".join(combo)}.png'))
    print('ok', len(result))


if __name__ == '__main__':
    main()
