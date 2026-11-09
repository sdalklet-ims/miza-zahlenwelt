/** 3D-Figuren und Objekte, alles aus Grundformen gebaut (kein Fremdmaterial). Blickrichtung der Figuren: +z (zur Kamera). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Comic-Schattierung: wenige harte Helligkeitsstufen statt weichem Verlauf */
export const toonGradient = (() => {
  const d = new Uint8Array([120, 175, 225, 255]);
  const t = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
export const toon = (o: THREE.MeshToonMaterialParameters) => new THREE.MeshToonMaterial({ gradientMap: toonGradient, ...o });

const matCache = new Map<string, THREE.MeshToonMaterial>();
export function mat(col: string, o: { rough?: number; emissive?: string; flat?: boolean } = {}) {
  const key = col + (o.emissive ?? '');
  let m = matCache.get(key);
  if (!m) {
    m = toon({ color: col, emissive: o.emissive ?? '#000000' });
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
const sphereGeo = (seg: number) => {
  const k = 's' + seg;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.65))));
  return geoCache.get(k)!;
};

/** Ellipsoid (Kugel mit Radius r, gestreckt) */
export function sph(r: number, col: string, sx = 1, sy = 1, sz = 1, seg = 14, flat = false) {
  const m = new THREE.Mesh(sphereGeo(seg), mat(col, { flat }));
  m.scale.set(r * sx, r * sy, r * sz);
  m.castShadow = true;
  return m;
}
export function cone(r: number, h: number, col: string, seg = 8, flat = false) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(col, { flat }));
  m.castShadow = true;
  return m;
}
export function cyl(rt: number, rb: number, h: number, col: string, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(col));
  m.castShadow = true;
  return m;
}
export function box(w: number, h: number, d: number, col: string) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => (o.position.set(x, y, z), o);
export const rot = <T extends THREE.Object3D>(o: T, x: number, y = 0, z = 0) => (o.rotation.set(x, y, z), o);

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}


/* ───────────── Objekte ───────────── */
export function createChest(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(1.1, 0.6, 0.75, '#a8693a'), 0, 0.3, 0));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 1.1, 14, 1, false, 0, Math.PI), mat('#c07b45'));
  at(lid, 0, 0.6, 0);
  lid.rotation.set(0, 0, Math.PI / 2);
  lid.castShadow = true;
  g.add(lid, at(box(0.16, 0.2, 0.06, '#f4c430'), 0, 0.55, 0.39), at(box(1.14, 0.1, 0.8, '#6a3f1c'), 0, 0.28, 0));
  g.add(at(sph(0.06, '#fff6b0', 1, 1, 1, 6), 0.4, 1.05, 0.2));
  return g;
}

export function createBoard(): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(at(cyl(0.07, 0.08, 1.6, '#7a4d26', 6), sx * 0.9, 0.8, 0));
  const tex = canvasTex(256, 160, (c) => {
    c.fillStyle = '#c07b45'; c.fillRect(0, 0, 256, 160);
    const cols = ['#4a90d9', '#e8704a', '#4f9d5d', '#f4b942'];
    for (let i = 0; i < 4; i++) { c.fillStyle = '#fff'; c.fillRect(12 + i * 60, 20, 50, 120); c.fillStyle = cols[i]; c.fillRect(20 + i * 60, 40, 34, 14); }
    c.fillStyle = '#3b2a1e'; c.font = '900 34px sans-serif'; c.textAlign = 'center'; c.fillText('?', 37, 110); c.fillText('347', 125, 110);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.25, 0.12), [mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), new THREE.MeshStandardMaterial({ map: tex }), mat('#8a5a2b')]);
  at(board, 0, 1.55, 0);
  board.castShadow = true;
  g.add(board);
  return g;
}

export function createShroomRing(): THREE.Group {
  const g = new THREE.Group();
  const cols = ['#e8504a', '#e9a24b', '#c3a6ff', '#e8504a'];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.28 + 0.6, m = new THREE.Group();
    m.position.set(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.55);
    m.add(at(cyl(0.12, 0.16, 0.5, '#f6ead2', 8), 0, 0.25, 0));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(cols[i]));
    cap.position.y = 0.45; cap.castShadow = true;
    m.add(cap, at(sph(0.06, '#fff', 1, 0.6, 1, 6), -0.15, 0.82, 0.1), at(sph(0.05, '#fff', 1, 0.6, 1, 6), 0.14, 0.86, -0.05));
    m.scale.setScalar(0.9 + (i % 2) * 0.35);
    g.add(m);
  }
  return g;
}

export function createStall(): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(at(cyl(0.08, 0.09, 2.2, '#7a4d26', 6), sx * 1.5, 1.1, -0.3));
  g.add(at(box(3.1, 0.8, 0.8, '#c07b45'), 0, 0.4, 0.1));
  for (let i = 0; i < 7; i++) g.add(at(rot(box(0.46, 0.06, 1.5, i % 2 ? '#ffffff' : '#d9534f'), 0.28), -1.38 + i * 0.46, 2.3, 0));
  const goods = ['#4a90d9', '#f4c430', '#4f9d5d', '#e8504a'];
  goods.forEach((c, i) => g.add(at(sph(0.2, c, 1, 0.9, 1, 10), -1.1 + i * 0.73, 0.98, 0.1)));
  return g;
}

export function createGateSign(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(0.07, 0.09, 1.7, '#7a4d26', 6), 0, 0.85, 0));
  const tex = canvasTex(256, 96, (c) => { c.fillStyle = '#c07b45'; c.fillRect(0, 0, 256, 96); c.strokeStyle = '#6a3f1c'; c.lineWidth = 8; c.strokeRect(4, 4, 248, 88); c.fillStyle = '#3b2a1e'; c.font = '800 44px ui-rounded, sans-serif'; c.textAlign = 'center'; c.fillText('Bald dabei', 128, 62); });
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 0.1), [mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), new THREE.MeshStandardMaterial({ map: tex }), mat('#8a5a2b')]);
  at(b, 0, 1.6, 0.06);
  b.castShadow = true;
  g.add(b);
  return g;
}

export function createStar(): THREE.Mesh {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.17 : 0.4; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  geo.translate(0, 0, -0.06);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffd54a', emissive: '#ffb300', emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3 }));
  m.castShadow = true;
  return m;
}

export function createCoin(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 18), new THREE.MeshStandardMaterial({ color: '#f4c430', emissive: '#a67c00', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.5 }));
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  return m;
}

export interface Butterfly { root: THREE.Group; wings: THREE.Mesh[] }
export function createButterfly(col: string): Butterfly {
  const g = new THREE.Group();
  const wings: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.17, 8), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    w.rotation.x = -Math.PI / 2;
    w.position.x = s * 0.15;
    piv.add(w);
    g.add(piv);
    wings.push(piv as unknown as THREE.Mesh);
  }
  g.add(at(cyl(0.015, 0.015, 0.16, '#333', 4), 0, 0, 0));
  g.children[2].rotation.x = Math.PI / 2;
  return { root: g, wings };
}

/** Busch mit Beeren als ein zusammengefasstes Mesh; Augen erscheinen, wenn Mia sich versteckt */
let bushGeo: THREE.BufferGeometry | null = null;
export function createBush(): { root: THREE.Group; eyes: THREE.Group; body: THREE.Mesh } {
  if (!bushGeo) {
    const parts: THREE.BufferGeometry[] = [];
    const blob = (x: number, y: number, z: number, r: number, c: string) => {
      const g = new THREE.IcosahedronGeometry(r, 1);
      g.translate(x, y, z);
      const col = new THREE.Color(c), pos = g.attributes.position, arr: number[] = [];
      for (let i = 0; i < pos.count; i++) { const k = 0.75 + Math.max(0, Math.min(1, (pos.getY(i) - y + r) / (2 * r))) * 0.5; arr.push(col.r * k, col.g * k, col.b * k); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
      parts.push(g.toNonIndexed());
    };
    blob(0, 0.75, 0, 0.95, '#3a9d55'); blob(0.85, 0.55, 0.2, 0.7, '#2f8a4a'); blob(-0.85, 0.55, -0.1, 0.72, '#2f8a4a'); blob(0.1, 0.5, 0.8, 0.62, '#3fa65a');
    for (const [x, y, z] of [[0.5, 1.15, 0.55], [-0.6, 0.95, 0.65], [0.9, 0.75, 0.65], [-0.2, 1.4, 0.2], [1.2, 0.5, 0.3]]) {
      const b = new THREE.SphereGeometry(0.09, 6, 5);
      b.translate(x, y, z);
      const n = b.attributes.position.count, arr: number[] = [];
      for (let i = 0; i < n; i++) arr.push(0.91, 0.31, 0.29);
      b.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
      parts.push(b.toNonIndexed());
    }
    bushGeo = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; }))!;
  }
  const root = new THREE.Group();
  const body = new THREE.Mesh(bushGeo, toon({ vertexColors: true }));
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);
  const eyes = new THREE.Group();
  for (const sx of [-1, 1]) eyes.add(at(sph(0.17, '#fff', 1, 1.15, 0.6, 10), sx * 0.3, 0.85, 1.12), at(sph(0.09, '#3b2a1e', 1, 1, 0.6, 8), sx * 0.3, 0.85, 1.2));
  eyes.visible = false;
  root.add(eyes);
  return { root, eyes, body };
}

/** Haus */
export function createHouse(roof: string): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(3.4, 2.1, 2.7, '#fff0d4'), 0, 1.05, 0));
  const r = cone(2.7, 1.7, roof, 4, true);
  r.rotation.y = Math.PI / 4;
  r.scale.z = 0.85;
  at(r, 0, 2.95, 0);
  g.add(r, at(box(0.65, 1.2, 0.1, '#8a5a2b'), 0, 0.6, 1.36), at(box(0.55, 0.5, 0.1, '#9ad6f0'), -1.0, 1.3, 1.36), at(box(0.55, 0.5, 0.1, '#9ad6f0'), 1.0, 1.3, 1.36), at(box(0.4, 1.0, 0.4, '#b8905a'), 0.9, 3.2, -0.3));
  return g;
}


/** Supermarkt: Gebäude mit Schild, gestreifter Markise, Schaufenstern, Glastür und Einkaufswagen. Vorderseite = +z. */
export function createSupermarket(): THREE.Group {
  const g = new THREE.Group();
  const W = 6.8, D = 3.6, H = 3.0;
  g.add(at(box(W, H, D, '#fdf1d8'), 0, H / 2, 0), at(box(W + 0.4, 0.3, D + 0.4, '#b9302a'), 0, H + 0.15, 0));
  const signTex = canvasTex(512, 128, (c) => { c.fillStyle = '#e0483f'; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116); c.fillStyle = '#fff'; c.font = '900 74px sans-serif'; c.textAlign = 'center'; c.fillText('SUPERMARKT', 256, 92); });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 1.0, 0.25), [mat('#b9302a'), mat('#b9302a'), mat('#b9302a'), mat('#b9302a'), toon({ map: signTex }), mat('#b9302a')]);
  sign.position.set(0, H + 0.95, D / 2 - 0.2);
  sign.castShadow = true;
  g.add(sign);
  const shelves = canvasTex(256, 128, (c) => {
    c.fillStyle = '#e8f4ff'; c.fillRect(0, 0, 256, 128);
    const cols = ['#e8504a', '#f4c430', '#4f9d5d', '#4a90d9', '#ff9f5a', '#c3a6ff'];
    for (let r = 0; r < 3; r++) { c.fillStyle = '#b8956a'; c.fillRect(0, 36 + r * 40, 256, 5); for (let k = 0; k < 9; k++) { c.fillStyle = cols[(k + r * 2) % 6]; c.fillRect(8 + k * 27, 10 + r * 40 + (k % 3) * 3, 20, 24 - (k % 3) * 3); } }
  });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: shelves }));
    w.position.set(sx * 2.25, 1.35, D / 2 + 0.02);
    g.add(w, at(box(2.5, 0.12, 0.12, '#7a4d26'), sx * 2.25, 0.55, D / 2 + 0.06), at(box(2.5, 0.12, 0.12, '#7a4d26'), sx * 2.25, 2.15, D / 2 + 0.06));
  }
  for (const sx of [-1, 1]) g.add(at(box(0.08, 2.2, 0.1, '#dfe6ea'), sx * 0.8, 1.1, D / 2 + 0.05));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ color: '#aee2ff', transparent: true, opacity: 0.55 }));
  door.position.set(0, 1.08, D / 2 + 0.03);
  g.add(door, at(box(0.06, 2.1, 0.06, '#dfe6ea'), 0, 1.08, D / 2 + 0.05));
  for (let i = 0; i < 8; i++) { const s = at(rot(box(0.95, 0.08, 1.2, i % 2 ? '#ffffff' : '#e0483f'), 0.35), -3.3 + i * 0.95 + 0.47, 2.65, D / 2 + 0.5); s.castShadow = true; g.add(s); }
  for (let k = 0; k < 2; k++) {
    const cart = new THREE.Group();
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.5, 1.1)), new THREE.LineBasicMaterial({ color: '#8a929a' }));
    wire.position.y = 0.75;
    cart.add(wire, at(box(0.8, 0.05, 1.1, '#8a929a'), 0, 0.5, 0), at(box(0.8, 0.05, 0.05, '#e0483f'), 0, 1.0, -0.55));
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.45, 0.45]) cart.add(at(sph(0.06, '#333', 1, 1, 1, 6), sx, 0.12, sz));
    cart.position.set(-3.9 - k * 0.5, 0, D / 2 + 1.3 + k * 0.4);
    cart.rotation.y = 0.3 + k * 0.4;
    g.add(cart);
  }
  for (const sx of [-1, 1]) g.add(at(cyl(0.3, 0.24, 0.5, '#c0704a', 8), sx * 3.5, 0.25, D / 2 + 0.6), at(sph(0.38, '#4f9d5d', 1, 1, 1, 8), sx * 3.5, 0.75, D / 2 + 0.6), at(sph(0.1, '#ff8fab', 1, 1, 1, 6), sx * 3.5 + 0.1, 1.0, D / 2 + 0.75));
  return g;
}
