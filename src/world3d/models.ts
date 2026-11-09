/** 3D-Figuren und Objekte, alles aus Grundformen gebaut (kein Fremdmaterial). Blickrichtung der Figuren: +z (zur Kamera). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(col: string, o: { rough?: number; emissive?: string; flat?: boolean } = {}) {
  const key = col + (o.rough ?? '') + (o.emissive ?? '') + (o.flat ? 'f' : '');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: col, roughness: o.rough ?? 0.75, metalness: 0, flatShading: !!o.flat, emissive: o.emissive ?? '#000000' });
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

const OR = '#ea9f46', ORD = '#c27a28', CR = '#fff0d4', PK = '#f2a2a2', INK = '#3b2a1e';

/* ───────────── Mia ───────────── */
export interface MiaRig {
  root: THREE.Group;
  setAccessories(acc: string[]): void;
  animate(t: number, phase: number, speed: number): void;
}

export function createMia(acc: string[]): MiaRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.9;
  root.add(body);
  body.add(sph(0.5, OR, 0.72, 0.72, 1.3, 18));
  body.add(at(sph(0.42, CR, 0.66, 0.5, 1.05, 14), 0, -0.17, 0.12));
  for (let i = 0; i < 4; i++) body.add(at(sph(0.1, ORD, 2.2, 0.22, 0.9, 8), 0, 0.34 - Math.abs(i - 1.5) * 0.03, -0.42 + i * 0.28));

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.66);
  body.add(head);
  head.add(sph(0.37, OR, 1.06, 0.92, 0.96, 18));
  head.add(at(sph(0.17, CR, 1, 0.72, 0.8, 12), 0, -0.11, 0.29));
  head.add(at(sph(0.045, PK, 1.2, 0.8, 0.8, 8), 0, -0.04, 0.37));
  const eyes: THREE.Mesh[] = [];
  const ears: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const e = at(sph(0.078, INK, 1, 1.3, 0.6, 10), sx * 0.15, 0.07, 0.32);
    head.add(e);
    eyes.push(e);
    head.add(at(sph(0.026, '#ffffff', 1, 1, 1, 6), sx * 0.15 + 0.02, 0.12, 0.36));
    const ear = new THREE.Group();
    ear.position.set(sx * 0.23, 0.31, -0.02);
    ear.rotation.z = -sx * 0.28;
    ear.add(at(cone(0.16, 0.34, OR, 4), 0, 0.1, 0), at(cone(0.09, 0.22, PK, 4), 0, 0.06, 0.05));
    head.add(ear);
    ears.push(ear);
    for (let w = -1; w <= 1; w++) {
      const wh = cyl(0.004, 0.004, 0.42, '#7a5a3b', 4);
      at(wh, sx * 0.32, -0.1 + w * 0.045, 0.3);
      wh.rotation.set(0, 0, Math.PI / 2 + w * 0.12 * sx);
      wh.rotation.y = sx * 0.2;
      head.add(wh);
    }
  }

  // Beine: Hüftgelenke zum Schwingen
  const legs: { g: THREE.Group; off: number }[] = [];
  for (const [lx, lz, off] of [[-0.2, 0.46, 0], [0.2, 0.46, Math.PI], [-0.2, -0.46, Math.PI], [0.2, -0.46, 0]] as number[][]) {
    const g = new THREE.Group();
    g.position.set(lx, 0.62, lz);
    g.add(at(cyl(0.075, 0.06, 0.66, OR, 8), 0, -0.33, 0), at(sph(0.09, CR, 1, 0.65, 1.35, 8), 0, -0.66, 0.04));
    body.add(g);
    legs.push({ g, off });
  }

  // Schwanz: Kette aus Gliedern, wedelt wellenförmig
  const tailSegs: THREE.Group[] = [];
  let parent: THREE.Object3D = body;
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Group();
    s.position.set(0, i === 0 ? 0.1 : 0.27, i === 0 ? -0.66 : 0);
    s.rotation.x = i === 0 ? -2.0 : 0.38;
    s.add(at(cyl(0.075 - i * 0.004, 0.08 - i * 0.004, 0.3, i % 2 ? ORD : OR, 8), 0, 0.15, 0));
    parent.add(s);
    parent = s;
    tailSegs.push(s);
  }
  (parent as THREE.Group).add(at(sph(0.085, ORD, 1, 1, 1, 8), 0, 0.32, 0));

  // Accessoires
  const accs: Record<string, THREE.Object3D> = {};
  const hat = new THREE.Group();
  hat.add(at(rot(cone(0.3, 0.8, '#d9534f', 10), -0.35), 0, 0.5, -0.12), at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.06, 8, 16), mat('#ffffff')), Math.PI / 2 - 0.1), 0, 0.2, 0), at(sph(0.1, '#ffffff', 1, 1, 1, 8), 0, 0.82, -0.4));
  head.add(hat);
  accs['mia-zipfel'] = hat;
  const crown = new THREE.Group();
  crown.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.2, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#f4c430', side: THREE.DoubleSide, metalness: 0.4, roughness: 0.35 })), 0, 0, 0));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; crown.add(at(cone(0.06, 0.17, '#f4c430', 4), Math.cos(a) * 0.24, 0.17, Math.sin(a) * 0.24)); }
  crown.position.set(0, 0.42, 0);
  head.add(crown);
  accs['mia-krone'] = crown;
  const glasses = new THREE.Group();
  for (const sx of [-1, 1]) glasses.add(at(box(0.2, 0.14, 0.05, '#23262e'), sx * 0.17, 0.08, 0.42));
  glasses.add(at(box(0.14, 0.03, 0.04, '#23262e'), 0, 0.1, 0.43));
  head.add(glasses);
  accs['mia-brille'] = glasses;
  const scarf = at(rot(cone(0.34, 0.5, '#d9534f', 4), Math.PI, Math.PI / 4), 0, -0.34, 0.2);
  head.add(scarf);
  accs['mia-halstuch'] = scarf;

  const setAcc = (list: string[]) => Object.entries(accs).forEach(([id, o]) => (o.visible = list.includes(id)));
  setAcc(acc);
  root.traverse((o) => ((o as THREE.Mesh).isMesh && (o.castShadow = true)));

  return {
    root,
    setAccessories: setAcc,
    animate(t, phase, sp) {
      const moving = sp > 0.05;
      body.position.y = 0.9 + (moving ? Math.abs(Math.cos(phase)) * 0.13 * sp : Math.sin(t * 2) * 0.012);
      body.rotation.z = Math.sin(phase) * 0.06 * sp;
      body.rotation.x = sp * 0.09;
      for (const l of legs) l.g.rotation.x = Math.sin(phase + l.off) * 0.95 * sp;
      head.rotation.x = -sp * 0.06;
      head.rotation.y = Math.sin(phase) * 0.06 * sp + Math.sin(t * 0.7) * 0.07 * (1 - sp);
      const freq = moving ? 8 : 2.6;
      tailSegs.forEach((s, i) => (s.rotation.z = Math.sin(t * freq - i * 0.7) * (moving ? 0.22 : 0.16)));
      const blink = Math.sin(t * 0.9) > 0.985 ? 0.12 : 1;
      eyes.forEach((e) => (e.scale.y = 0.078 * 1.3 * blink));
      ears[0].rotation.x = Math.max(0, Math.sin(t * 0.4 + 1)) > 0.97 ? 0.35 : 0;
    },
  };
}

/* ───────────── Auftraggeber ───────────── */
export interface NpcRig { root: THREE.Group; update(t: number): void }

function eye(parent: THREE.Object3D, x: number, y: number, z: number, r = 0.06) {
  parent.add(at(sph(r, INK, 1, 1.2, 0.6, 8), x, y, z), at(sph(r * 0.35, '#fff', 1, 1, 1, 6), x + r * 0.3, y + r * 0.4, z + r * 0.4));
}

function owl(acc: string[]): NpcRig {
  const g = new THREE.Group(), BR = '#8a5a2b', CRM = '#f1dcb5';
  const body = at(sph(0.62, BR, 1, 1.25, 0.92, 16), 0, 0.9, 0);
  g.add(body, at(sph(0.48, CRM, 0.9, 1.15, 0.55, 14), 0, 0.85, 0.32));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.add(at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 8, Math.PI), mat('#c9a46e')), 0, 0, Math.PI), -0.2 + c * 0.2 + (r % 2) * 0.1, 1.1 - r * 0.2, 0.62));
  const head = at(sph(0.56, BR, 1.1, 0.95, 0.95, 16), 0, 1.85, 0.05);
  g.add(head, at(sph(0.46, CRM, 1.1, 0.9, 0.4, 14), 0, 1.82, 0.4));
  for (const sx of [-1, 1]) {
    g.add(at(sph(0.23, '#fff', 1, 1, 0.6, 12), sx * 0.27, 1.9, 0.56), at(sph(0.11, INK, 1, 1, 0.6, 10), sx * 0.27, 1.9, 0.7), at(sph(0.035, '#fff', 1, 1, 1, 6), sx * 0.3, 1.94, 0.76));
    g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 8, 20), mat('#4a2e14')), sx * 0.27, 1.9, 0.68));
    g.add(at(rot(cone(0.14, 0.4, BR, 4), 0, 0, -sx * 0.3), sx * 0.4, 2.42, 0));
    g.add(at(rot(sph(0.3, '#6d4420', 0.4, 1.5, 0.8, 10), 0, 0, sx * 0.18), sx * 0.7, 0.92, -0.04));
    g.add(at(box(0.16, 0.08, 0.26, '#f4a23a'), sx * 0.22, 0.04, 0.35));
  }
  g.add(at(rot(cone(0.12, 0.3, '#f4a23a', 6), Math.PI / 2), 0, 1.74, 0.76));
  const hatG = new THREE.Group();
  hatG.add(at(box(1.15, 0.07, 1.15, '#2c2c34'), 0, 2.42, 0), at(cyl(0.38, 0.4, 0.25, '#2c2c34'), 0, 2.28, 0), at(cyl(0.012, 0.012, 0.4, '#f4b942', 4), 0.55, 2.2, 0.55), at(sph(0.06, '#f4b942'), 0.55, 1.98, 0.55));
  g.add(hatG);
  hatG.visible = acc.includes('eule-hut');
  const bow = new THREE.Group();
  bow.add(at(rot(cone(0.16, 0.34, '#d9534f', 4), 0, 0, Math.PI / 2), -0.2, 1.3, 0.62), at(rot(cone(0.16, 0.34, '#d9534f', 4), 0, 0, -Math.PI / 2), 0.2, 1.3, 0.62), at(sph(0.08, '#b9413e'), 0, 1.3, 0.64));
  g.add(bow);
  bow.visible = acc.includes('eule-schleife');
  g.scale.set(0.95, 1.0, 0.95);
  return { root: g, update: (t) => { body.scale.y = 0.62 * 1.25 * (1 + Math.sin(t * 2) * 0.012); head.rotation.y = Math.sin(t * 0.8) * 0.18; } };
}

function hedgehog(): NpcRig {
  const g = new THREE.Group();
  g.add(at(sph(0.7, '#7a5230', 1.1, 0.8, 1.25, 16), 0, 0.62, 0));
  const spikes: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.random() * 1.15 + 0.1;
    const dir = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b) * 0.9 + 0.1, Math.sin(b) * Math.sin(a) * 0.9 - 0.25).normalize();
    const geo = new THREE.ConeGeometry(0.09, 0.42, 5);
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(dir.x * 0.78, 0.62 + dir.y * 0.6, dir.z * 0.92), new THREE.Quaternion().setFromUnitVectors(up, dir), new THREE.Vector3(1, 1, 1)));
    spikes.push(geo);
  }
  const sp = new THREE.Mesh(mergeGeometries(spikes)!, mat('#5a3a20', { flat: true }));
  sp.castShadow = true;
  g.add(sp);
  g.add(at(sph(0.42, '#f3cfa0', 1, 0.9, 1.1, 14), 0, 0.5, 0.85), at(sph(0.08, '#2a1a10', 1, 1, 1, 8), 0, 0.46, 1.27));
  for (const sx of [-1, 1]) {
    eye(g, sx * 0.17, 0.62, 1.15, 0.055);
    g.add(at(sph(0.1, '#e8b98a', 1, 1, 0.5, 8), sx * 0.3, 0.88, 0.8), at(sph(0.16, '#e0b88a', 1, 0.5, 1.2, 8), sx * 0.35, 0.06, 0.4), at(sph(0.16, '#e0b88a', 1, 0.5, 1.2, 8), sx * 0.35, 0.06, -0.4));
  }
  g.scale.setScalar(0.9);
  return { root: g, update: (t) => (g.scale.y = 0.9 * (1 + Math.sin(t * 2.4) * 0.015)) };
}

function badger(): NpcRig {
  const g = new THREE.Group();
  g.add(at(sph(0.7, '#8e9096', 1, 0.88, 1.15, 16), 0, 0.72, 0), at(sph(0.5, '#c4c6cf', 0.9, 0.7, 0.8, 12), 0, 0.6, 0.3));
  const head = new THREE.Group();
  head.position.set(0, 1.4, 0.55);
  g.add(head);
  head.add(sph(0.52, '#ffffff', 1.1, 0.88, 1.1, 16));
  for (const sx of [-1, 1]) {
    head.add(at(sph(0.14, '#2f3036', 0.6, 1.05, 2.3, 10), sx * 0.27, 0.0, 0.18));
    head.add(at(sph(0.07, '#fff', 1, 1, 0.6, 8), sx * 0.28, 0.05, 0.5), at(sph(0.035, INK, 1, 1, 0.6, 6), sx * 0.28, 0.05, 0.54));
    head.add(at(sph(0.17, '#43444b', 1, 1, 0.7, 8), sx * 0.4, 0.42, -0.1), at(sph(0.1, '#fff', 1, 1, 0.5, 8), sx * 0.4, 0.42, -0.04));
    g.add(at(sph(0.2, '#43444b', 1, 0.5, 1.3, 8), sx * 0.35, 0.05, 0.4));
  }
  head.add(at(sph(0.1, '#2f3036', 1.1, 0.8, 1, 8), 0, -0.12, 0.56));
  g.add(at(new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat('#a8a29a', { flat: true })), 0.75, 0.22, 0.8));
  g.scale.setScalar(0.88);
  return { root: g, update: (t) => (head.rotation.y = Math.sin(t * 0.9) * 0.2) };
}

function hare(): NpcRig {
  const g = new THREE.Group(), FUR = '#f1e6d8';
  g.add(at(sph(0.55, FUR, 0.9, 1, 1.05, 14), 0, 0.72, 0), at(sph(0.2, FUR, 1, 1, 1, 8), 0, 0.6, -0.58));
  const head = new THREE.Group();
  head.position.set(0, 1.38, 0.28);
  g.add(head);
  head.add(sph(0.42, FUR, 1, 0.95, 1, 14));
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.18, 0.4, -0.05);
    ear.rotation.z = -sx * 0.14;
    ear.add(at(sph(0.14, FUR, 0.6, 3.6, 0.55, 10), 0, 0.5, 0), at(sph(0.08, PK, 0.5, 3.0, 0.4, 8), 0, 0.5, 0.05));
    head.add(ear);
    eye(head, sx * 0.17, 0.08, 0.38, 0.06);
    head.add(at(sph(0.1, '#f5a3b0', 1, 0.7, 0.4, 8), sx * 0.3, -0.12, 0.3));
    g.add(at(sph(0.14, FUR, 1, 0.5, 1.3, 8), sx * 0.32, 0.06, 0.4));
  }
  head.add(at(sph(0.05, '#ee8f9b', 1.3, 0.9, 0.8, 8), 0, -0.04, 0.42), at(box(0.08, 0.1, 0.03, '#fff'), 0, -0.17, 0.4));
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.8), new THREE.MeshStandardMaterial({ map: canvasTex(128, 160, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 160); c.strokeStyle = '#6b8fd6'; c.lineWidth = 10; c.strokeRect(5, 5, 118, 150); c.fillStyle = '#3f62b8'; c.font = '900 110px sans-serif'; c.textAlign = 'center'; c.fillText('7', 64, 118); }), side: THREE.DoubleSide }));
  at(rot(card, -0.2, 0, -0.1), 0, 0.85, 0.62);
  g.add(card);
  g.scale.set(0.85, 0.95, 0.85);
  return { root: g, update: (t) => { head.rotation.z = Math.sin(t * 1.2) * 0.05; } };
}

function fox(): NpcRig {
  const g = new THREE.Group(), OF = '#f08a3c';
  g.add(at(sph(0.56, OF, 0.9, 0.86, 1.35, 16), 0, 0.78, 0), at(sph(0.42, '#fff2dc', 0.8, 0.8, 0.7, 12), 0, 0.72, 0.55));
  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.65);
  g.add(head);
  head.add(sph(0.43, OF, 1.05, 0.95, 1, 16), at(rot(cone(0.2, 0.5, '#fff2dc', 8), Math.PI / 2), 0, -0.1, 0.5), at(sph(0.06, INK, 1, 0.8, 0.8, 8), 0, -0.04, 0.76));
  for (const sx of [-1, 1]) {
    eye(head, sx * 0.18, 0.1, 0.34, 0.06);
    head.add(at(cone(0.16, 0.42, OF, 4), sx * 0.26, 0.42, -0.05), at(cone(0.09, 0.2, '#4a2a18', 4), sx * 0.26, 0.55, -0.05));
    for (const lz of [0.4, -0.45]) g.add(at(cyl(0.09, 0.08, 0.5, '#5b3a22', 8), sx * 0.26, 0.25, lz));
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.85, -0.85);
  tail.add(at(sph(0.3, OF, 0.8, 0.8, 2, 12), 0, 0.1, -0.3), at(sph(0.2, '#fff', 1, 1, 1, 10), 0, 0.12, -0.85));
  tail.rotation.x = -0.4;
  g.add(tail);
  g.add(at(rot(cyl(0.13, 0.13, 0.03, '#f4c430', 16), Math.PI / 2), 0, 1.0, 0.92));
  g.scale.set(0.85, 0.95, 0.85);
  return { root: g, update: (t) => { tail.rotation.y = Math.sin(t * 2.5) * 0.35; head.rotation.y = Math.sin(t * 0.7) * 0.15; } };
}

export function createNpc(kind: string, acc: string[]): NpcRig {
  switch (kind) {
    case 'owl': return owl(acc);
    case 'hedgehog': return hedgehog();
    case 'badger': return badger();
    case 'hare': return hare();
    case 'fox': return fox();
    default: return { root: new THREE.Group(), update: () => {} };
  }
}

/* ───────────── Eichhörnchen ───────────── */
export interface Squirrel { root: THREE.Group; update(t: number, moving: boolean): void }
export function createSquirrel(): Squirrel {
  const g = new THREE.Group(), BR = '#b8692f';
  const inner = new THREE.Group();
  g.add(inner);
  inner.add(at(sph(0.22, BR, 0.9, 1, 1.35, 12), 0, 0.3, 0), at(sph(0.14, '#f1d4a6', 0.8, 0.8, 1.0, 8), 0, 0.26, 0.08));
  const head = at(sph(0.17, BR, 1, 1, 1, 12), 0, 0.5, 0.26);
  inner.add(head, at(sph(0.04, INK, 1, 1, 1, 6), 0, 0.5, 0.42));
  for (const sx of [-1, 1]) { inner.add(at(cone(0.05, 0.14, BR, 4), sx * 0.09, 0.66, 0.22)); eye(inner, sx * 0.09, 0.55, 0.38, 0.032); }
  const tail: THREE.Mesh[] = [];
  [[0, 0.36, -0.3, 0.17, 1.2], [0, 0.6, -0.42, 0.2, 1.3], [0, 0.88, -0.36, 0.2, 1.3], [0, 1.06, -0.18, 0.17, 1.1]].forEach(([x, y, z, r, s]) => { const m = at(sph(r, '#a8602b', 0.9, s, 0.9, 10), x, y, z); inner.add(m); tail.push(m); });
  g.traverse((o) => ((o as THREE.Mesh).isMesh && (o.castShadow = true)));
  return { root: g, update(t, moving) { inner.position.y = moving ? Math.abs(Math.sin(t * 16)) * 0.14 : 0; tail.forEach((m, i) => (m.position.x = Math.sin(t * 4 + i) * 0.05)); } };
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
  const body = new THREE.Mesh(bushGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);
  const eyes = new THREE.Group();
  for (const sx of [-1, 1]) eyes.add(at(sph(0.17, '#fff', 1, 1.15, 0.6, 10), sx * 0.3, 0.85, 1.12), at(sph(0.09, INK, 1, 1, 0.6, 8), sx * 0.3, 0.85, 1.2));
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
