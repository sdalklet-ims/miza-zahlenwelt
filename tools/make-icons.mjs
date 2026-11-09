// Erzeugt PNG-Icons (Katzengesicht) ohne Abhängigkeiten: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const poly = (pts) => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
// Gezeichnet im 512er-Raster, Reihenfolge = Ebenen
const shapes = [
  [rgb('#4f9d5d'), () => true],
  [rgb('#e9a24b'), poly([[130, 200], [120, 70], [230, 130]])],
  [rgb('#e9a24b'), poly([[382, 200], [392, 70], [282, 130]])],
  [rgb('#f2a2a2'), poly([[145, 180], [142, 105], [200, 140]])],
  [rgb('#f2a2a2'), poly([[367, 180], [370, 105], [312, 140]])],
  [rgb('#e9a24b'), ell(256, 280, 150, 130)],
  [rgb('#fff0d4'), ell(256, 330, 74, 50)],
  [rgb('#3b2a1e'), ell(200, 255, 22, 28)],
  [rgb('#3b2a1e'), ell(312, 255, 22, 28)],
  [rgb('#ffffff'), ell(208, 244, 9, 9)],
  [rgb('#ffffff'), ell(320, 244, 9, 9)],
  [rgb('#f2a2a2'), poly([[240, 300], [272, 300], [256, 320]])],
  [rgb('#b8691f'), ell(256, 200, 6, 26)],
  [rgb('#b8691f'), ell(222, 206, 5, 20)],
  [rgb('#b8691f'), ell(290, 206, 5, 20)],
  [rgb('#3b2a1e'), (x, y) => y > 322 && y < 328 && Math.abs(x - 256) < 3],
];

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const S = 3;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const u = ((x + (sx + 0.5) / S) / size) * 512, v = ((y + (sy + 0.5) / S) / size) * 512;
          let c = shapes[0][0];
          for (const [col, test] of shapes) if (test(u, v)) c = col;
          r += c[0]; g += c[1]; b += c[2];
        }
      const o = (y * size + x) * 4;
      px[o] = r / (S * S); px[o + 1] = g / (S * S); px[o + 2] = b / (S * S); px[o + 3] = 255;
    }
  return px;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(size) {
  const raw = render(size);
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    raw.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(`public/icons/${name}`, png(size));
  console.log('geschrieben:', name);
}
