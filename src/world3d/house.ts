/**
 * Mias Haus in 3D: jedes Teil aus content/house.json hat hier ein Modell (Bauteile aus Grundformen).
 * Ursprung = Hausmitte am Boden; +z = Vorderseite (Tür, zur Kamera). 1 Einheit = 50 Pixel der Spiellogik.
 * Neue Teile erscheinen mit einer Fall-und-Hüpf-Animation.
 */
import * as THREE from 'three';
import { box, cyl, cone, sph, mat, canvasTex, at, rot } from './models';
import { parts } from '../core/house';

const Y0 = 0.35; // Fußbodenhöhe auf dem Fundament
const HW = 3.5, HD = 2.8, WH = 2.9; // halbe Breite, halbe Tiefe, Wandhöhe
const ROOF_H = 2.2;
const WOOD = '#a8693a', WOOD_D = '#7a4d26', STONE = '#9a968c';

export interface Colliders { rects: { x: number; y: number; w: number; h: number }[]; solids: { x: number; y: number; r: number }[] }

export interface HouseView {
  group: THREE.Group;
  /** Zeigt/versteckt Teile passend zum Baufortschritt; liefert neu erschienene Teile (für Effekte) */
  sync(built: Record<string, boolean>, colors: { roof: string; wall: string }, animate: boolean): string[];
  /** Mia ist im Haus: Dach und Vorderwand verschwinden (Puppenhaus-Ansicht) */
  setInside(inside: boolean): void;
  update(t: number, dt: number): void;
  chimney(): THREE.Vector3 | null;
  collisions(built: Record<string, boolean>, cx: number, cy: number): Colliders;
  onLand: ((id: string, pos: THREE.Vector3) => void) | null;
}

/* ───────── Materialien ───────── */
function plankTex() {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = '#d3a56a'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#c89a5e' : '#d9ad72'; c.fillRect(0, i * 32, 256, 30); c.fillStyle = 'rgba(80,45,15,.35)'; c.fillRect(0, i * 32 + 30, 256, 2); }
  });
}
function tileTex() {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = '#dcdcdc'; c.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
      const x = k * 32 + (r % 2) * 16, y = r * 32;
      c.fillStyle = (r + k) % 3 ? '#f4f4f4' : '#e2e2e2';
      c.beginPath(); c.roundRect(x + 1, y + 1, 30, 30, [2, 2, 14, 14]); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; c.stroke();
    }
  });
}
const glass = () => new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 });
const emissive = (c: string, i = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.6 });
const flowerCols = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff', '#ff9f5a'];

function flowers(w: number, d: number, n: number, y: number, seed = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const k = Math.sin((i + seed) * 12.9898) * 43758.5453, fr = k - Math.floor(k), k2 = Math.sin((i + seed) * 78.233) * 12345.6, fr2 = k2 - Math.floor(k2);
    const x = (fr - 0.5) * w, z = (fr2 - 0.5) * d;
    g.add(at(cyl(0.012, 0.012, 0.3, '#4a9a50', 4), x, y + 0.15, z), at(sph(0.08, flowerCols[i % 5], 1, 1, 1, 6), x, y + 0.32, z));
  }
  return g;
}

export function createHouse3D(): HouseView {
  const group = new THREE.Group();
  const wallMat = mat('#fff0d4');
  const roofTex = tileTex();
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
  roofTex.repeat.set(4, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: '#d9534f', map: roofTex, roughness: 0.8 });
  const floorTex = plankTex();
  const wood = mat(WOOD), woodD = mat(WOOD_D);
  const anim: ((t: number) => void)[] = [];
  const flags: Record<string, { roof?: boolean; front?: boolean }> = {};

  /** Wand-Box mit Wandfarbe */
  const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  };

  const B: Record<string, () => THREE.Object3D> = {
    fundament: () => {
      const g = new THREE.Group();
      g.add(at(box(7.7, 0.35, 6.3, STONE), 0, 0.175, 0));
      for (let i = 0; i < 12; i++) g.add(at(box(0.5, 0.1, 0.34, i % 2 ? '#b4b0a6' : '#8a867c'), -3.5 + i * 0.64, 0.4, 3.1));
      return g;
    },
    geruest: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.24, 3.1, 0.24, WOOD), sx * HW, Y0 + 1.55, sz * HD));
      for (const sz of [-1, 1]) for (const y of [Y0 + 1.5, Y0 + 3.1]) g.add(at(box(7.2, 0.18, 0.2, WOOD_D), 0, y, sz * HD));
      for (const sx of [-1, 1]) for (const y of [Y0 + 1.5, Y0 + 3.1]) g.add(at(box(0.2, 0.18, 5.6, WOOD_D), sx * HW, y, 0));
      for (const sx of [-1, 1]) g.add(at(rot(box(0.14, 2.0, 0.14, WOOD), Math.PI / 4), sx * HW, Y0 + 2.3, -1.7));
      return g;
    },
    boden: () => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.1, 5.5), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 }));
      m.position.set(0, Y0 + 0.05, 0);
      m.receiveShadow = true;
      return m;
    },
    wand_hinten: () => wall(7, WH, 0.2, 0, Y0 + WH / 2 + 0.05, -2.7),
    wand_links: () => wall(0.2, WH, 5.6, -3.4, Y0 + WH / 2 + 0.05, 0),
    wand_rechts: () => wall(0.2, WH, 5.6, 3.4, Y0 + WH / 2 + 0.05, 0),
    wand_vorn: () => {
      const g = new THREE.Group();
      g.add(wall(2.75, WH, 0.2, -2.125, Y0 + WH / 2 + 0.05, 2.7), wall(2.75, WH, 0.2, 2.125, Y0 + WH / 2 + 0.05, 2.7), wall(1.5, 0.75, 0.2, 0, Y0 + WH - 0.325 + 0.05, 2.7));
      return g;
    },
    dachgeruest: () => {
      const g = new THREE.Group();
      const L = Math.hypot(HW + 0.4, ROOF_H), a = Math.atan2(ROOF_H, HW + 0.4), top = Y0 + WH + 0.05;
      for (let i = 0; i < 7; i++) {
        const z = -2.7 + i * 0.9;
        for (const s of [-1, 1]) g.add(at(rot(box(L, 0.16, 0.16, WOOD), 0, 0, s * a), s * (HW + 0.4) / 2, top + ROOF_H / 2, z));
        g.add(at(box(2 * (HW + 0.4), 0.12, 0.14, WOOD_D), 0, top + 0.06, z));
      }
      g.add(at(box(0.2, 0.2, 6.2, WOOD_D), 0, top + ROOF_H, 0));
      return g;
    },
    dach: () => {
      const g = new THREE.Group();
      const L = Math.hypot(HW + 0.4, ROOF_H), a = Math.atan2(ROOF_H, HW + 0.4), top = Y0 + WH + 0.05;
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.14, 6.5), roofMat);
        p.position.set(s * (HW + 0.4) / 2, top + ROOF_H / 2 + 0.1, 0);
        p.rotation.z = s * a;
        p.castShadow = p.receiveShadow = true;
        g.add(p);
      }
      const ridge = cyl(0.15, 0.15, 6.5, '#8a8a8a', 6);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.set(0, top + ROOF_H + 0.12, 0);
      g.add(ridge);
      const sh = new THREE.Shape([new THREE.Vector2(-HW - 0.2, 0), new THREE.Vector2(HW + 0.2, 0), new THREE.Vector2(0, ROOF_H)]);
      for (const z of [-2.7, 2.7]) {
        const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }), wallMat);
        gm.position.set(0, top, z - 0.09);
        gm.castShadow = true;
        g.add(gm);
      }
      return g;
    },
    tuer: () => {
      const g = new THREE.Group();
      g.add(at(box(1.3, 2.15, 0.1, '#8a5a2b'), 0, Y0 + 1.13, 2.74), at(box(1.5, 0.1, 0.16, '#f1e2c6'), 0, Y0 + 2.25, 2.74));
      for (const sx of [-1, 1]) g.add(at(box(0.1, 2.2, 0.16, '#f1e2c6'), sx * 0.7, Y0 + 1.15, 2.74));
      g.add(at(sph(0.07, '#f4c430', 1, 1, 1, 8), 0.45, Y0 + 1.1, 2.82), at(box(0.7, 0.55, 0.04, '#6f4624'), 0, Y0 + 1.6, 2.8), at(box(0.7, 0.55, 0.04, '#6f4624'), 0, Y0 + 0.7, 2.8));
      return g;
    },
    fenster_vorn: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) g.add(windowAt(sx * 2.2, Y0 + 1.8, 2.76, 0));
      return g;
    },
    fenster_seite: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) g.add(windowAt(sx * 3.46, Y0 + 1.8, 0, Math.PI / 2));
      return g;
    },
    schornstein: () => {
      const g = new THREE.Group();
      g.add(at(box(0.95, 2.8, 0.95, '#b5543c'), 2.3, Y0 + 4.5, -0.6), at(box(1.15, 0.2, 1.15, '#7a3a2a'), 2.3, Y0 + 5.95, -0.6));
      for (let i = 0; i < 4; i++) g.add(at(box(0.95, 0.04, 0.96, '#8a3a2a'), 2.3, Y0 + 3.4 + i * 0.6, -0.6));
      return g;
    },
    treppe: () => {
      const g = new THREE.Group();
      [[0.33, 3.15], [0.22, 3.6], [0.11, 4.05]].forEach(([h, z]) => g.add(at(box(2.2, h, 0.5, '#b4b0a6'), 0, h / 2, z)));
      return g;
    },
    veranda: () => {
      const g = new THREE.Group();
      g.add(at(box(5.4, 0.16, 2.0, WOOD), 0, Y0 - 0.03, 3.8), at(box(2.4, 0.12, 0.5, '#b4b0a6'), 0, 0.12, 5.1), at(box(2.4, 0.2, 0.5, '#b4b0a6'), 0, 0.1, 4.95));
      for (const sx of [-1, 1]) g.add(at(box(0.18, 2.9, 0.18, WOOD_D), sx * 2.5, Y0 + 1.45, 4.7), at(box(0.1, 0.5, 0.1, WOOD_D), sx * 2.5, Y0 + 0.3, 4.7));
      const r = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.14, 2.3), roofMat);
      r.position.set(0, Y0 + 3.0, 3.85);
      r.rotation.x = 0.13;
      r.castShadow = true;
      g.add(r);
      return g;
    },
    dachrinne: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) { const c = cyl(0.08, 0.08, 6.5, '#b8bec6', 8); c.rotation.x = Math.PI / 2; c.position.set(sx * (HW + 0.42), Y0 + WH + 0.0, 0); g.add(c); }
      g.add(at(cyl(0.06, 0.06, 2.9, '#b8bec6', 6), HW + 0.42, Y0 + 1.5, 3.1), at(cyl(0.06, 0.06, 2.9, '#b8bec6', 6), -HW - 0.42, Y0 + 1.5, 3.1));
      return g;
    },
    blumenkasten: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) { g.add(at(box(1.3, 0.28, 0.32, WOOD), sx * 2.2, Y0 + 1.0, 2.95)); g.add(at(flowers(1.1, 0.2, 9, Y0 + 1.14, sx + 3), sx * 2.2, 0, 2.95)); }
      return g;
    },
    namensschild: () => {
      const tex = canvasTex(128, 64, (c) => { c.fillStyle = '#c07b45'; c.fillRect(0, 0, 128, 64); c.strokeStyle = '#6a3f1c'; c.lineWidth = 6; c.strokeRect(3, 3, 122, 58); c.fillStyle = '#fff'; c.font = '900 40px sans-serif'; c.textAlign = 'center'; c.fillText('Mia', 64, 46); });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.06), [mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), new THREE.MeshStandardMaterial({ map: tex }), mat('#6a3f1c')]);
      m.position.set(-1.25, Y0 + 1.7, 2.83);
      return m;
    },
    fussmatte: () => {
      const tex = canvasTex(128, 64, (c) => { c.fillStyle = '#7fb56a'; c.fillRect(0, 0, 128, 64); c.strokeStyle = '#4a7a3a'; c.lineWidth = 5; c.strokeRect(4, 4, 120, 56); c.fillStyle = '#fff'; c.font = '700 15px sans-serif'; c.textAlign = 'center'; c.fillText('Willkommen', 64, 38); });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.75), [mat('#4a7a3a'), mat('#4a7a3a'), new THREE.MeshStandardMaterial({ map: tex }), mat('#4a7a3a'), mat('#4a7a3a'), mat('#4a7a3a')]);
      m.position.set(0, Y0 + 0.02, 3.25);
      return m;
    },
    katzentuer: () => {
      const g = new THREE.Group();
      g.add(at(box(0.42, 0.42, 0.05, '#3b2a1e'), 0.42, Y0 + 0.3, 2.8), at(box(0.32, 0.32, 0.04, '#6f4624'), 0.42, Y0 + 0.28, 2.83), at(sph(0.025, '#f4c430', 1, 1, 1, 6), 0.42, Y0 + 0.44, 2.86));
      return g;
    },
    wimpel: () => {
      const g = new THREE.Group();
      const cols = ['#d9534f', '#f4c430', '#4a90d9', '#4f9d5d', '#c3a6ff'];
      const n = 12, top = Y0 + WH - 0.1;
      const flagsArr: THREE.Mesh[] = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = (u - 0.5) * 2 * (HW + 0.35), y = top - 0.35 * (1 - Math.pow(2 * u - 1, 2));
        if (i < n) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 3), mat(cols[i % 5])); f.rotation.set(Math.PI, 0, 0); f.position.set(x + 0.28, y - 0.3, 3.05); f.castShadow = true; g.add(f); flagsArr.push(f); }
        g.add(at(sph(0.03, '#444', 1, 1, 1, 4), x, y, 3.05));
      }
      anim.push((t) => flagsArr.forEach((f, i) => (f.rotation.z = Math.sin(t * 3 + i) * 0.15)));
      return g;
    },
    wetterhahn: () => {
      const g = new THREE.Group(), top = Y0 + WH + ROOF_H + 0.2;
      g.add(at(cyl(0.04, 0.04, 0.9, '#444', 6), 0, top + 0.45, 0));
      const rooster = new THREE.Group();
      rooster.position.set(0, top + 1.0, 0);
      rooster.add(box(1.0, 0.04, 0.04, '#333'), at(sph(0.2, '#d9534f', 1.2, 1, 0.5, 8), 0, 0.2, 0), at(sph(0.1, '#d9534f', 1, 1, 0.5, 8), 0.28, 0.4, 0), at(cone(0.05, 0.12, '#f4a23a', 4), 0.4, 0.4, 0), at(rot(cone(0.1, 0.3, '#d9534f', 3), 0, 0, Math.PI / 2), -0.4, 0.3, 0));
      g.add(rooster);
      anim.push((t) => (rooster.rotation.y = Math.sin(t * 0.8) * 1.2 + t * 0.1));
      return g;
    },
    fahne: () => {
      const g = new THREE.Group(), top = Y0 + WH + ROOF_H;
      g.add(at(cyl(0.035, 0.035, 1.7, '#7a4d26', 6), 0, top + 0.8, -2.6));
      const tex = canvasTex(128, 80, (c) => { c.fillStyle = '#ffb347'; c.fillRect(0, 0, 128, 80); c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 48, 18, 0, 7); for (const [x, y] of [[40, 22], [58, 14], [76, 14], [92, 22]]) c.arc(x, y, 8, 0, 7); c.fill(); });
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56, 6, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
      cloth.position.set(0.48, top + 1.35, -2.6);
      g.add(cloth);
      const pos = cloth.geometry.attributes.position;
      anim.push((t) => { for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(t * 5 + pos.getX(i) * 6) * 0.06 * (pos.getX(i) + 0.45)); pos.needsUpdate = true; });
      return g;
    },
    zaun: () => {
      const g = new THREE.Group();
      const XL = 6.6, Z0 = -5.0, Z1 = 6.8, GAP = 1.1;
      const board = (x: number, z: number, ry: number) => {
        const b = at(box(0.2, 1.0, 0.07, '#e8d3a8'), x, 0.5, z);
        b.rotation.y = ry;
        g.add(b, at(cone(0.12, 0.16, '#e8d3a8', 3), x, 1.07, z));
      };
      for (let x = -XL; x <= XL + 0.01; x += 0.5) { if (Math.abs(x) > GAP) board(x, Z1, 0); board(x, Z0, 0); }
      for (let z = Z0; z <= Z1; z += 0.5) { board(-XL, z, Math.PI / 2); board(XL, z, Math.PI / 2); }
      const rail = (len: number, x: number, z: number, ry: number) => { const r = at(box(len, 0.08, 0.08, '#b89860'), x, 0.35, z); r.rotation.y = ry; const r2 = at(box(len, 0.08, 0.08, '#b89860'), x, 0.75, z); r2.rotation.y = ry; g.add(r, r2); };
      rail(2 * XL, 0, Z0, 0); rail(XL - GAP, -(XL + GAP) / 2, Z1, 0); rail(XL - GAP, (XL + GAP) / 2, Z1, 0); rail(Z1 - Z0, -XL, (Z0 + Z1) / 2, Math.PI / 2); rail(Z1 - Z0, XL, (Z0 + Z1) / 2, Math.PI / 2);
      return g;
    },
    tor: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) {
        g.add(at(box(0.22, 1.3, 0.22, WOOD_D), sx * 1.2, 0.65, 6.8), at(sph(0.14, '#f4c430', 1, 1, 1, 6), sx * 1.2, 1.4, 6.8));
        const leaf = new THREE.Group();
        leaf.position.set(sx * 1.1, 0, 6.8);
        leaf.rotation.y = sx * -0.9;
        leaf.add(at(box(0.95, 0.9, 0.06, '#e8d3a8'), -sx * 0.48, 0.55, 0), at(box(0.95, 0.07, 0.08, '#b89860'), -sx * 0.48, 0.35, 0), at(box(0.95, 0.07, 0.08, '#b89860'), -sx * 0.48, 0.75, 0));
        g.add(leaf);
      }
      return g;
    },
    weg: () => {
      const g = new THREE.Group();
      for (let i = 0; i < 12; i++) {
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), mat(i % 2 ? '#b4b0a6' : '#a09c92', { flat: true }));
        s.scale.set(1.2, 0.18, 0.85);
        s.position.set(Math.sin(i * 1.7) * 0.22, 0.06, 4.9 + i * 0.85);
        s.rotation.y = i;
        s.receiveShadow = true;
        g.add(s);
      }
      return g;
    },
    briefkasten: () => {
      const g = new THREE.Group();
      g.add(at(box(0.12, 1.1, 0.12, WOOD_D), 2.1, 0.55, 7.4), at(box(0.6, 0.4, 0.4, '#d9534f'), 2.1, 1.25, 7.4), at(box(0.5, 0.08, 0.3, '#a63a37'), 2.1, 1.48, 7.4), at(box(0.04, 0.3, 0.04, '#f4c430'), 2.45, 1.45, 7.4), at(box(0.2, 0.05, 0.05, '#f4c430'), 2.5, 1.58, 7.4));
      return g;
    },
    laterne: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) {
        g.add(at(cyl(0.05, 0.07, 1.4, '#3a3a40', 6), sx * 1.7, 0.7, 6.1), at(box(0.3, 0.34, 0.3, '#ffd88a'), sx * 1.7, 1.55, 6.1), at(cone(0.28, 0.2, '#3a3a40', 4), sx * 1.7, 1.82, 6.1));
        (g.children[g.children.length - 2] as THREE.Mesh).material = emissive('#ffcf66', 1.2);
      }
      return g;
    },
    blumenbeet: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) {
        g.add(at(box(2.2, 0.28, 0.8, WOOD_D), sx * 2.7, 0.14, 5.6), at(box(2.0, 0.12, 0.62, '#5a3a22'), sx * 2.7, 0.3, 5.6), at(flowers(1.9, 0.55, 22, 0.32, sx * 7), sx * 2.7, 0, 5.6));
      }
      return g;
    },
    bank: () => {
      const g = new THREE.Group();
      g.add(at(box(1.6, 0.1, 0.5, WOOD), 0, 0.5, 0), at(box(1.6, 0.4, 0.08, WOOD), 0, 0.85, -0.22));
      for (const sx of [-1, 1]) g.add(at(box(0.1, 0.5, 0.5, WOOD_D), sx * 0.7, 0.25, 0));
      g.position.set(5.2, 0, 0.8);
      g.rotation.y = -Math.PI / 2;
      return g;
    },
    apfelbaum: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.16, 0.24, 1.3, '#7a4d26', 7), 0, 0.65, 0));
      for (const [x, y, z, r] of [[0, 2.0, 0, 1.1], [0.7, 1.6, 0.2, 0.75], [-0.7, 1.6, -0.1, 0.8]]) g.add(at(sph(r, '#4f9d5d', 1, 0.9, 1, 10, true), x, y, z));
      for (let i = 0; i < 9; i++) { const a = i * 2.3; g.add(at(sph(0.1, '#e8504a', 1, 1, 1, 6), Math.cos(a) * 0.95, 1.5 + (i % 3) * 0.3, Math.sin(a) * 0.95)); }
      g.position.set(-5.3, 0, -3.6);
      return g;
    },
    vogelhaus: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.06, 0.07, 1.9, WOOD_D, 6), 0, 0.95, 0), at(box(0.55, 0.45, 0.5, '#e8d3a8'), 0, 2.1, 0), at(rot(cone(0.5, 0.35, '#d9534f', 4), 0, Math.PI / 4), 0, 2.5, 0), at(sph(0.09, '#2a1a10', 1, 1, 0.5, 6), 0, 2.1, 0.26), at(box(0.3, 0.04, 0.2, WOOD), 0, 1.85, 0.3));
      const bird = new THREE.Group();
      bird.add(sph(0.1, '#4a90d9', 1, 0.9, 1.3, 8), at(sph(0.07, '#4a90d9', 1, 1, 1, 6), 0, 0.08, 0.1), at(cone(0.025, 0.07, '#f4a23a', 4), 0, 0.08, 0.2));
      bird.position.set(0.12, 1.98, 0.3);
      g.add(bird);
      anim.push((t) => { bird.position.y = 1.98 + Math.max(0, Math.sin(t * 2)) * 0.03; bird.rotation.y = Math.sin(t * 0.7) * 0.6; });
      g.position.set(5.4, 0, -3.8);
      return g;
    },
    brunnen: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.9, 1.0, 0.7, '#a8a49a', 12), 0, 0.35, 0), at(cyl(0.72, 0.72, 0.05, '#5db7e8', 12), 0, 0.68, 0));
      const w = g.children[1] as THREE.Mesh;
      w.material = new THREE.MeshStandardMaterial({ color: '#5db7e8', roughness: 0.1, emissive: '#1d5f94', emissiveIntensity: 0.3 });
      for (const sx of [-1, 1]) g.add(at(cyl(0.07, 0.07, 1.6, WOOD_D, 6), sx * 0.8, 1.2, 0));
      g.add(at(rot(cone(1.1, 0.5, '#9a6a3a', 4), 0, Math.PI / 4), 0, 2.2, 0), at(cyl(0.18, 0.15, 0.22, '#8a5a2b', 8), 0.35, 1.35, 0));
      g.position.set(-4.9, 0, 3.6);
      return g;
    },
    schaukel: () => {
      const g = new THREE.Group();
      for (const sz of [-1, 1]) { g.add(at(rot(cyl(0.06, 0.06, 2.5, WOOD_D, 6), 0, 0, 0.35), 0.45, 1.2, sz * 1.0), at(rot(cyl(0.06, 0.06, 2.5, WOOD_D, 6), 0, 0, -0.35), -0.45, 1.2, sz * 1.0)); }
      g.add(at(rot(cyl(0.07, 0.07, 2.3, WOOD, 6), Math.PI / 2), 0, 2.35, 0));
      const seat = new THREE.Group();
      seat.position.set(0, 2.35, 0);
      seat.add(at(cyl(0.012, 0.012, 1.6, '#c9b07a', 4), 0, -0.8, 0.45), at(cyl(0.012, 0.012, 1.6, '#c9b07a', 4), 0, -0.8, -0.45), at(box(0.3, 0.07, 1.0, '#d9534f'), 0, -1.6, 0));
      g.add(seat);
      anim.push((t) => (seat.rotation.x = Math.sin(t * 1.6) * 0.35));
      g.position.set(5.4, 0, -1.2);
      return g;
    },
    kratzbaum: () => {
      const g = new THREE.Group();
      g.add(at(box(1.1, 0.12, 1.1, '#8a6a4a'), 0, 0.06, 0), at(cyl(0.16, 0.16, 2.6, '#d9c08a', 8), 0, 1.3, 0), at(cyl(0.5, 0.5, 0.1, '#7fb5d6', 10), 0, 1.2, 0), at(cyl(0.5, 0.5, 0.1, '#7fb5d6', 10), 0.1, 2.3, 0.0), at(sph(0.35, '#f1d9a6', 1.2, 0.6, 1.2, 10), 0.1, 2.55, 0), at(cyl(0.1, 0.1, 1.0, '#d9c08a', 6), 0.5, 0.55, 0.3));
      g.position.set(-5.4, 0, -0.6);
      return g;
    },
    teich: () => {
      const g = new THREE.Group();
      g.add(at(cyl(1.35, 1.4, 0.12, '#a8a49a', 16), 0, 0.06, 0));
      const water = at(cyl(1.15, 1.15, 0.05, '#5db7e8', 16), 0, 0.14, 0);
      water.material = new THREE.MeshStandardMaterial({ color: '#5db7e8', roughness: 0.1, emissive: '#1d5f94', emissiveIntensity: 0.3 });
      g.add(water);
      for (let i = 0; i < 4; i++) { const a = i * 1.6, p = at(cyl(0.22, 0.22, 0.02, '#4f9d5d', 10), Math.cos(a) * 0.6, 0.18, Math.sin(a) * 0.5); g.add(p); if (i % 2) g.add(at(sph(0.1, '#ffb3d1', 1, 0.7, 1, 6), Math.cos(a) * 0.6, 0.24, Math.sin(a) * 0.5)); }
      g.position.set(4.9, 0, 3.6);
      return g;
    },
    /* ───── Innenraum ───── */
    korb: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.55, 0.45, 0.28, '#c9975a', 12), 0, 0.14, 0), at(cyl(0.42, 0.42, 0.1, '#f2a2c0', 12), 0, 0.24, 0), at(sph(0.12, '#fff', 1, 0.6, 1, 6), 0.1, 0.32, 0.05));
      g.position.set(-2.5, Y0 + 0.1, -1.7);
      return g;
    },
    teppich: () => {
      const g = new THREE.Group();
      const o = cyl(1.7, 1.7, 0.03, '#c0504d', 20), i = cyl(1.2, 1.2, 0.04, '#f1d9a6', 20), c = cyl(0.7, 0.7, 0.05, '#4a90d9', 20);
      for (const m of [o, i, c]) m.scale.z = 0.78;
      g.add(o, i, c);
      g.position.set(0, Y0 + 0.1, 0.4);
      return g;
    },
    tisch: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.6, 0.6, 0.07, '#b07a44', 14), 0, 0.85, 0), at(cyl(0.07, 0.1, 0.85, WOOD_D, 8), 0, 0.42, 0));
      for (const s of [-1, 1]) g.add(at(cyl(0.22, 0.2, 0.08, '#c0504d', 10), s * 0.95, 0.5, 0.1), at(cyl(0.05, 0.06, 0.5, WOOD_D, 6), s * 0.95, 0.25, 0.1));
      g.add(at(cyl(0.12, 0.1, 0.12, '#fff', 8), 0, 0.95, 0), at(sph(0.1, '#e8504a', 1, 1, 1, 6), 0.2, 0.95, 0.1));
      g.position.set(1.9, Y0 + 0.1, -1.3);
      return g;
    },
    sofa: () => {
      const g = new THREE.Group();
      g.add(at(box(2.6, 0.5, 1.0, '#3f8f9a'), 0, 0.25, 0), at(box(2.6, 0.8, 0.28, '#357a84'), 0, 0.75, -0.42), at(box(0.28, 0.65, 1.0, '#357a84'), -1.3, 0.4, 0), at(box(0.28, 0.65, 1.0, '#357a84'), 1.3, 0.4, 0));
      for (const s of [-1, 1]) g.add(at(box(1.0, 0.18, 0.8, '#5bb0bc'), s * 0.55, 0.55, 0.05));
      g.add(at(box(0.4, 0.4, 0.14, '#f4b942'), -0.9, 0.85, -0.1));
      g.position.set(-0.4, Y0 + 0.1, -2.05);
      return g;
    },
    regal: () => {
      const g = new THREE.Group();
      g.add(at(box(0.5, 2.4, 2.2, '#8a5a2b'), 0, 1.2, 0));
      const cols = ['#d9534f', '#4a90d9', '#f4c430', '#4f9d5d', '#c3a6ff'];
      for (let s = 0; s < 4; s++) { g.add(at(box(0.52, 0.05, 2.2, '#6f4624'), 0.01, 0.3 + s * 0.62, 0)); for (let b = 0; b < 8; b++) g.add(at(box(0.3, 0.42 + (b % 3) * 0.06, 0.18, cols[(b + s) % 5]), 0.12, 0.54 + s * 0.62 + (b % 3) * 0.03, -0.9 + b * 0.25)); }
      g.position.set(-3.05, Y0 + 0.1, 0.5);
      return g;
    },
    lampe: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.2, 0.25, 0.06, '#3a3a40', 8), 0, 0.03, 0), at(cyl(0.03, 0.03, 1.6, '#3a3a40', 6), 0, 0.8, 0));
      const shade = at(cyl(0.22, 0.36, 0.42, '#ffe9a8', 10), 0, 1.7, 0);
      shade.material = emissive('#ffe0a0', 0.9);
      g.add(shade);
      g.position.set(2.9, Y0 + 0.1, -2.2);
      return g;
    },
    bild: () => {
      const g = new THREE.Group();
      const pic = (x: number, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
        const t = canvasTex(128, 96, draw);
        g.add(at(box(w + 0.1, h + 0.1, 0.06, '#7a4d26'), x, Y0 + 2.0, -2.57), at(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t })), x, Y0 + 2.0, -2.53));
      };
      pic(-1.9, 1.0, 0.75, (c) => { c.fillStyle = '#9ad6f0'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#4f9d5d'; c.beginPath(); c.moveTo(0, 96); c.lineTo(50, 30); c.lineTo(100, 96); c.fill(); c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(100, 22, 12, 0, 7); c.fill(); });
      pic(1.6, 0.8, 0.8, (c) => { c.fillStyle = '#fff0d4'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#e9a24b'; c.beginPath(); c.arc(64, 54, 30, 0, 7); c.fill(); c.fillStyle = '#3b2a1e'; c.beginPath(); c.arc(54, 48, 4, 0, 7); c.arc(74, 48, 4, 0, 7); c.fill(); });
      return g;
    },
    pflanze: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.28, 0.2, 0.4, '#c0704a', 8), 0, 0.2, 0));
      for (let i = 0; i < 6; i++) { const l = cone(0.12, 0.7, '#4f9d5d', 4); l.position.set(Math.cos(i) * 0.15, 0.7, Math.sin(i) * 0.15); l.rotation.set(Math.sin(i) * 0.5, 0, -Math.cos(i) * 0.5); g.add(l); }
      g.position.set(3.0, Y0 + 0.1, 1.8);
      return g;
    },
    napf: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.2, 0.16, 0.1, '#4a90d9', 10), 0, 0.05, 0), at(cyl(0.16, 0.16, 0.04, '#9a6a3a', 10), 0, 0.1, 0), at(cyl(0.2, 0.16, 0.1, '#f4b942', 10), 0.5, 0.05, 0.1), at(cyl(0.16, 0.16, 0.03, '#5db7e8', 10), 0.5, 0.1, 0.1));
      g.position.set(-2.7, Y0 + 0.1, -0.4);
      return g;
    },
    kamin: () => {
      const g = new THREE.Group();
      g.add(at(box(0.7, 1.9, 2.0, '#8a867c'), 0, 0.95, 0), at(box(0.72, 0.9, 1.1, '#2a2020'), 0.03, 0.55, 0), at(box(0.9, 0.12, 2.2, '#6f6b63'), 0, 1.95, 0));
      const fire = new THREE.Group();
      for (let i = 0; i < 4; i++) { const f = cone(0.14, 0.45, i % 2 ? '#ffb300' : '#ff6a00', 5); f.material = emissive(i % 2 ? '#ffb300' : '#ff6a00', 1.4); f.position.set(0.1, 0.4, -0.3 + i * 0.2); fire.add(f); }
      g.add(fire);
      anim.push((t) => fire.children.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 9 + i * 2) * 0.35; f.scale.x = 0.9 + Math.sin(t * 7 + i) * 0.15; }));
      g.position.set(3.0, Y0 + 0.1, 0.4);
      return g;
    },
    vorhang: () => {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const dx of [-0.75, 0.75]) g.add(at(box(0.3, 1.5, 0.08, '#f2a2c0'), sx * 2.2 + dx, Y0 + 1.75, 2.55));
      g.add(at(box(6.0, 0.05, 0.05, '#7a4d26'), 0, Y0 + 2.55, 2.55));
      return g;
    },
  };

  function windowAt(x: number, y: number, z: number, ry: number) {
    const g = new THREE.Group();
    g.add(at(box(1.35, 1.35, 0.12, '#f4ead8'), 0, 0, 0), at(new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 0.06), glass()), 0, 0, 0.05), at(box(1.05, 0.05, 0.08, '#f4ead8'), 0, 0, 0.06), at(box(0.05, 1.05, 0.08, '#f4ead8'), 0, 0, 0.06), at(box(1.5, 0.08, 0.2, '#f4ead8'), 0, -0.7, 0.05));
    g.position.set(x, y, z);
    g.rotation.y = ry;
    return g;
  }

  // Zugehörigkeiten für die Innenansicht
  for (const id of ['dachgeruest', 'dach', 'schornstein', 'dachrinne', 'wimpel', 'wetterhahn', 'fahne', 'veranda']) flags[id] = { roof: true };
  for (const id of ['wand_vorn', 'tuer', 'fenster_vorn', 'blumenkasten', 'namensschild', 'katzentuer', 'vorhang']) flags[id] = { front: true };

  const objs: Record<string, THREE.Object3D> = {};
  const state: Record<string, { drop: number; base: number }> = {};
  let inside = false;
  let colors = { roof: '', wall: '' };

  const view: HouseView = {
    group,
    onLand: null,
    sync(built, col, animate) {
      if (col.roof !== colors.roof) roofMat.color.set(col.roof);
      if (col.wall !== colors.wall) wallMat.color.set(col.wall);
      colors = { ...col };
      const fresh: string[] = [];
      for (const p of parts) {
        const has = !!built[p.id];
        let o = objs[p.id];
        if (has && !o) {
          o = B[p.id]?.();
          if (!o) continue;
          o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
          objs[p.id] = o;
          group.add(o);
          if (animate) { state[p.id] = { drop: 0.0001, base: o.position.y }; fresh.push(p.id); }
        }
        if (o) o.visible = has;
      }
      view.setInside(inside);
      return fresh;
    },
    setInside(v) {
      inside = v;
      for (const [id, o] of Object.entries(objs)) {
        const f = flags[id];
        o.visible = !!(group.userData.built?.[id] ?? true) && !(v && (f?.roof || f?.front));
      }
    },
    update(t, dt) {
      for (const [id, s] of Object.entries(state)) {
        const o = objs[id];
        s.drop += dt / 0.75;
        const u = Math.min(1, s.drop);
        // Fallhöhe 5 → 0 mit kleinem Aufprall-Hüpfer
        const fall = u < 0.7 ? 5 * (1 - (u / 0.7) ** 2) : Math.sin(((u - 0.7) / 0.3) * Math.PI) * 0.25 * (1 - (u - 0.7) / 0.3);
        o.position.y = s.base + Math.max(0, fall);
        if (u >= 1) {
          o.position.y = s.base;
          delete state[id];
          view.onLand?.(id, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).setY(group.position.y + 0.5));
        }
      }
      anim.forEach((f) => f(t));
    },
    chimney() {
      return objs.schornstein?.visible ? new THREE.Vector3(2.3, Y0 + 6.1, -0.6).add(group.position) : null;
    },
    collisions(built, cx, cy) {
      const rects: Colliders['rects'] = [], solids: Colliders['solids'] = [];
      const U = 50;
      const rect = (x: number, z: number, w: number, d: number) => rects.push({ x: cx + x * U, y: cy + z * U, w: w * U, h: d * U });
      const has = (id: string) => !!built[id];
      if (has('geruest') && !(has('wand_hinten') && has('wand_links') && has('wand_rechts') && has('wand_vorn'))) for (const sx of [-1, 1]) for (const sz of [-1, 1]) solids.push({ x: cx + sx * HW * U, y: cy + sz * HD * U, r: 8 });
      if (has('wand_hinten')) rect(-3.5, -2.8, 7, 0.2);
      if (has('wand_links')) rect(-3.5, -2.8, 0.2, 5.6);
      if (has('wand_rechts')) rect(3.3, -2.8, 0.2, 5.6);
      if (has('wand_vorn')) { rect(-3.5, 2.6, 2.75, 0.2); rect(0.75, 2.6, 2.75, 0.2); }
      if (has('veranda')) for (const sx of [-1, 1]) solids.push({ x: cx + sx * 2.5 * U, y: cy + 4.7 * U, r: 8 });
      if (has('zaun')) {
        rect(-6.7, -5.05, 13.4, 0.2); rect(-6.7, -5.05, 0.2, 11.9); rect(6.5, -5.05, 0.2, 11.9);
        rect(-6.7, 6.7, 5.6, 0.2); rect(1.1, 6.7, 5.6, 0.2);
      }
      if (has('apfelbaum')) solids.push({ x: cx - 5.3 * U, y: cy - 3.6 * U, r: 20 });
      if (has('vogelhaus')) solids.push({ x: cx + 5.4 * U, y: cy - 3.8 * U, r: 7 });
      if (has('schaukel')) for (const z of [-2.2, -0.2]) solids.push({ x: cx + 5.4 * U, y: cy + z * U, r: 9 });
      if (has('bank')) solids.push({ x: cx + 5.2 * U, y: cy + 0.8 * U, r: 22 });
      if (has('teich')) solids.push({ x: cx + 4.9 * U, y: cy + 3.6 * U, r: 50 });
      if (has('brunnen')) solids.push({ x: cx - 4.9 * U, y: cy + 3.6 * U, r: 32 });
      if (has('kratzbaum')) solids.push({ x: cx - 5.4 * U, y: cy - 0.6 * U, r: 20 });
      if (has('briefkasten')) solids.push({ x: cx + 2.1 * U, y: cy + 7.4 * U, r: 7 });
      if (has('laterne')) for (const sx of [-1, 1]) solids.push({ x: cx + sx * 1.7 * U, y: cy + 6.1 * U, r: 6 });
      if (has('blumenbeet')) for (const sx of [-1, 1]) rect(sx * 2.7 - 1.1, 5.25, 2.2, 0.7);
      return { rects, solids };
    },
  };
  // Welche Teile gerade gebaut sind (für setInside)
  const origSync = view.sync;
  view.sync = (built, col, animate) => {
    group.userData.built = built;
    return origSync(built, col, animate);
  };
  return view;
}
