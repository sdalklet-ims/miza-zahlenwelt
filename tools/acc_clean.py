#!/usr/bin/env python3
"""Accessoire-Sheets (assets/mia-source/Mia_Accessories_Final) säubern: Glow/Haze entfernen, Löcher (Gesichtsöffnung der Kapuze) freistellen.
Liefert 24 Zellbilder je Accessoire (6 Spalten × 4 Zeilen à 256 px) als RGBA-Arrays."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'mia-source', 'Mia_Accessories_Final')
FILES = {
    'hat': 'hat/mia_hat_red_zipfel_overlay_4dir_6frames.png',
    'cape': 'raincape/mia_raincape_yellow_hood_overlay_4dir_6frames.png',
    'glasses': 'sunglasses/mia_sunglasses_round_overlay_3dir_6frames.png',
}


def clean_alpha_glow(a: np.ndarray, lo=105, hi=200) -> np.ndarray:
    """Hut/Brille: der Schein um die Figur steckt im Alphakanal (niedrige Werte) – Rampe schneidet ihn ab."""
    al = a[..., 3].astype(np.float32)
    n = np.clip((al - lo) / (hi - lo), 0, 1)
    out = a.copy()
    out[..., 3] = (n * 255).astype(np.uint8)
    # Farbe in den Randpixeln: Schein ist gedämpft – Farbe bleibt, nur Alpha wird verstärkt (Rand dunkler Kontur)
    return out


def clean_cape(a: np.ndarray) -> np.ndarray:
    """Regencape: Hintergrund ist halbtransparentes Weiß mit gelbem Schein. Vordergrund = deutlich nicht-weiß (Blau-Kanal niedrig)."""
    rgb = a[..., :3].astype(np.float32)
    b = rgb[..., 2]
    fg = np.clip(((255.0 - b) - 55.0) / 70.0, 0, 1)  # 0 = Hintergrund/Schein, 1 = Stoff/Kontur
    out = np.zeros_like(a)
    out[..., :3] = rgb.astype(np.uint8)
    out[..., 3] = (fg * 255).astype(np.uint8)
    # nur größte zusammenhängende Teile je Zelle behalten (Staub weg)
    return out


def load(name: str):
    a = np.array(Image.open(os.path.join(SRC, FILES[name])).convert('RGBA'))
    a = clean_cape(a) if name == 'cape' else clean_alpha_glow(a)
    cells = []
    for r in range(4):
        row = []
        for c in range(6):
            row.append(a[r * 256:(r + 1) * 256, c * 256:(c + 1) * 256].copy())
        cells.append(row)
    return cells


if __name__ == '__main__':
    for n in FILES:
        cells = load(n)
        sheet = Image.new('RGBA', (256 * 6, 256 * 4), (90, 140, 200, 255))
        for r in range(4):
            for c in range(6):
                sheet.alpha_composite(Image.fromarray(cells[r][c], 'RGBA'), (c * 256, r * 256))
        sheet.convert('RGB').resize((768, 512)).save(os.path.join(ROOT, 'assets', 'mia', f'_acc_{n}.png'))
    print('ok')
