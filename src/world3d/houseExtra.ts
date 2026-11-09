/** Zusätzliche Deko-Teile für Mias Haus (Garten, Außen, Innen). Gleiche Konventionen wie house.ts. */
import * as THREE from 'three';
import { box, cyl, cone, sph, mat, canvasTex, at, rot, toon } from './models';

const Y0 = 0.35;
const WOOD = '#a8693a', WOOD_D = '#7a4d26';
const glassMat = () => new THREE.MeshBasicMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.4 });
const glow = (c: string, i = 1) => toon({ color: c, emissive: c, emissiveIntensity: i });

export function extraBuilders(anim: ((t: number) => void)[]): Record<string, () => THREE.Object3D> {
  const B: Record<string, () => THREE.Object3D> = {
    /* ───── Garten ───── */
    sonnenschirm: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.8, 0.8, 0.08, '#f1e2c6', 14), 0, 0.78, 0), at(cyl(0.07, 0.1, 0.78, WOOD_D, 6), 0, 0.39, 0));
      for (const a of [0.6, 2.7]) g.add(at(cyl(0.28, 0.26, 0.08, '#4a90d9', 10), Math.cos(a) * 1.15, 0.5, Math.sin(a) * 1.15), at(cyl(0.05, 0.06, 0.5, WOOD_D, 6), Math.cos(a) * 1.15, 0.25, Math.sin(a) * 1.15));
      g.add(at(cyl(0.04, 0.04, 2.5, '#777', 6), 0, 1.25, 0));
      const top = cone(1.9, 0.65, '#ffb347', 10);
      top.position.y = 2.65;
      g.add(top, at(sph(0.1, '#e0483f', 1, 1, 1, 6), 0, 3.0, 0));
      g.position.set(3.6, 0, -4.1);
      return g;
    },
    hochbeet: () => {
      const g = new THREE.Group();
      g.add(at(box(2.3, 0.6, 1.0, WOOD), 0, 0.3, 0), at(box(2.1, 0.1, 0.8, '#5a3a22'), 0, 0.62, 0));
      for (let i = 0; i < 6; i++) {
        const x = -0.9 + i * 0.36;
        g.add(at(cone(0.1, 0.4, '#4f9d5d', 5), x, 0.85, -0.2), at(sph(0.14, '#ff8c2a', 1, 1.5, 1, 6), x, 0.68, -0.2));
        g.add(at(sph(0.17, '#e8504a', 1, 1, 1, 8), x + 0.1, 0.8, 0.22), at(sph(0.22, '#4f9d5d', 1, 0.8, 1, 8), x, 0.75, 0.0));
      }
      g.position.set(1.0, 0, -4.2);
      return g;
    },
    windrad: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.05, 0.07, 1.8, WOOD_D, 6), 0, 0.9, 0));
      const rotor = new THREE.Group();
      rotor.position.set(0, 1.8, 0.1);
      ['#e8504a', '#f4c430', '#4a90d9', '#4f9d5d'].forEach((c, i) => { const b = at(box(0.5, 0.5, 0.04, c), 0.3, 0.3, 0); const pv = new THREE.Group(); pv.rotation.z = (i * Math.PI) / 2; pv.add(b); rotor.add(pv); });
      rotor.add(at(sph(0.1, '#333', 1, 1, 1, 6), 0, 0, 0.04));
      g.add(rotor);
      anim.push((t) => (rotor.rotation.z = -t * 2.4));
      g.position.set(-1.2, 0, -4.3);
      return g;
    },
    sandkasten: () => {
      const g = new THREE.Group();
      g.add(at(box(1.8, 0.3, 1.8, '#e7c27a'), 0, 0.12, 0));
      for (const [x, z, w, d] of [[0, -0.95, 2.0, 0.12], [0, 0.95, 2.0, 0.12], [-0.95, 0, 0.12, 1.8], [0.95, 0, 0.12, 1.8]]) g.add(at(box(w, 0.3, d, WOOD), x, 0.15, z));
      g.add(at(cyl(0.16, 0.12, 0.2, '#e8504a', 8), -0.4, 0.38, 0.2), at(box(0.06, 0.3, 0.16, '#4a90d9'), 0.3, 0.42, -0.2), at(sph(0.2, '#e7c27a', 1, 0.6, 1, 8), 0.1, 0.32, 0.5));
      g.position.set(-3.2, 0, -4.0);
      return g;
    },
    gewaechshaus: () => {
      const g = new THREE.Group();
      g.add(at(box(2.2, 0.25, 1.7, WOOD_D), 0, 0.12, 0));
      const gl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.25, 1.5), glassMat());
      gl.position.y = 0.9;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.7, 4), glassMat());
      roof.rotation.y = Math.PI / 4;
      roof.scale.z = 0.8;
      roof.position.y = 1.9;
      g.add(gl, roof);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.07, 1.3, 0.07, '#dfe6ea'), sx * 1.0, 0.9, sz * 0.75));
      for (let i = 0; i < 5; i++) g.add(at(sph(0.2, '#4f9d5d', 1, 1.2, 1, 6), -0.7 + i * 0.35, 0.5, (i % 2) * 0.3 - 0.15), at(sph(0.09, '#e8504a', 1, 1, 1, 6), -0.7 + i * 0.35, 0.75, (i % 2) * 0.3 - 0.05));
      g.position.set(-4.9, 0, 5.9);
      return g;
    },
    feuerstelle: () => {
      const g = new THREE.Group();
      for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), mat('#8a867c')); r.scale.set(1.2, 0.8, 1); r.position.set(Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62); g.add(r); }
      g.add(at(rot(cyl(0.07, 0.07, 0.7, WOOD_D, 6), 0, 0.5, Math.PI / 2), 0, 0.1, 0), at(rot(cyl(0.07, 0.07, 0.7, WOOD_D, 6), 0, -0.5, Math.PI / 2), 0, 0.17, 0));
      const fire = new THREE.Group();
      for (let i = 0; i < 4; i++) { const f = cone(0.16, 0.55, i % 2 ? '#ffb300' : '#ff6a00', 5); f.material = glow(i % 2 ? '#ffb300' : '#ff6a00', 1.4); f.position.set(Math.cos(i * 1.6) * 0.15, 0.4, Math.sin(i * 1.6) * 0.15); fire.add(f); }
      g.add(fire);
      anim.push((t) => fire.children.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 9 + i * 2) * 0.35; f.scale.x = 0.9 + Math.sin(t * 7 + i) * 0.15; }));
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; const l = rot(cyl(0.16, 0.16, 0.9, '#9a6a3a', 8), 0, -a + Math.PI / 2, Math.PI / 2); l.position.set(Math.cos(a) * 1.5, 0.17, Math.sin(a) * 1.5); g.add(l); }
      g.position.set(-4.2, 0, 1.5);
      return g;
    },
    lichterkette: () => {
      const g = new THREE.Group();
      const cols = ['#ff6b6b', '#ffd166', '#6bcBff', '#8aff8a', '#d59bff'];
      const XL = 6.6, Z0 = -5.0, Z1 = 6.8;
      const bulbs: THREE.Mesh[] = [];
      const seg = (x0: number, z0: number, x1: number, z1: number) => {
        const n = 10;
        for (let i = 0; i <= n; i++) {
          const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, y = 1.45 - Math.sin(u * Math.PI) * 0.18;
          const b = at(sph(0.07, cols[(i + Math.round(x0 + z0)) % 5], 1, 1.2, 1, 6), x, y, z);
          b.material = glow(cols[(i + Math.round(x0 + z0)) % 5], 1.1);
          g.add(b);
          bulbs.push(b);
        }
      };
      seg(-XL, Z0, XL, Z0); seg(-XL, Z0, -XL, Z1); seg(XL, Z0, XL, Z1); seg(-XL, Z1, -1.1, Z1); seg(1.1, Z1, XL, Z1);
      anim.push((t) => bulbs.forEach((b, i) => ((b.material as THREE.MeshToonMaterial).emissiveIntensity = 0.7 + Math.sin(t * 3 + i) * 0.5)));
      return g;
    },
    schmetterling: () => {
      const g = new THREE.Group();
      g.add(at(sph(0.7, '#3a8a4a', 1.2, 0.9, 1, 8), 0, 0.55, 0));
      for (let i = 0; i < 14; i++) g.add(at(sph(0.13, i % 2 ? '#c66bff' : '#ff8fe0', 1, 1, 1, 6), Math.cos(i * 1.4) * 0.6, 0.8 + (i % 4) * 0.18, Math.sin(i * 1.4) * 0.5));
      g.position.set(5.6, 0, 5.9);
      return g;
    },
    gartenzwerg: () => {
      const g = new THREE.Group();
      g.add(at(cyl(0.2, 0.24, 0.5, '#4a90d9', 8), 0, 0.25, 0), at(sph(0.17, '#ffd9b0', 1, 1, 1, 8), 0, 0.62, 0.02), at(sph(0.2, '#fff', 1, 1.1, 0.8, 8), 0, 0.46, 0.14), at(cone(0.2, 0.5, '#e8504a', 8), 0, 0.97, 0), at(sph(0.04, '#e8504a', 1, 1, 1, 6), 0.04, 0.6, 0.18));
      g.position.set(-0.95, 0, 5.0);
      return g;
    },
    /* ───── Außen ───── */
    windspiel: () => {
      const g = new THREE.Group();
      const tubes: THREE.Mesh[] = [];
      g.add(at(cyl(0.3, 0.3, 0.05, WOOD, 8), 0, 0, 0));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28, t = at(cyl(0.025, 0.025, 0.5 + (i % 3) * 0.15, '#c8d2dc', 5), Math.cos(a) * 0.2, -0.35, Math.sin(a) * 0.2); g.add(t); tubes.push(t); }
      anim.push((t) => tubes.forEach((m, i) => (m.rotation.z = Math.sin(t * 2 + i) * 0.12)));
      g.position.set(-2.2, Y0 + 2.8, 4.6);
      return g;
    },
    schaukelstuhl: () => {
      const g = new THREE.Group();
      const ch = new THREE.Group();
      ch.add(at(box(0.8, 0.1, 0.8, WOOD), 0, 0.55, 0), at(box(0.8, 0.9, 0.08, WOOD), 0, 1.0, -0.38), at(box(0.1, 0.45, 0.6, WOOD_D), -0.36, 0.7, 0.05), at(box(0.1, 0.45, 0.6, WOOD_D), 0.36, 0.7, 0.05));
      for (const sx of [-1, 1]) ch.add(at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 5, 14, Math.PI * 0.6), mat(WOOD_D)), 0, Math.PI / 2, -Math.PI / 2 - 0.3), sx * 0.36, 0.55, 0));
      g.add(ch);
      anim.push((t) => (ch.rotation.x = Math.sin(t * 1.3) * 0.08));
      g.position.set(-1.9, Y0 + 0.08, 3.7);
      return g;
    },
    hausnummer: () => {
      const tex = canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#4a90d9'; c.lineWidth = 6; c.strokeRect(3, 3, 58, 58); c.fillStyle = '#4a90d9'; c.font = '900 40px sans-serif'; c.textAlign = 'center'; c.fillText('7', 32, 46); });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.05), [mat('#fff'), mat('#fff'), mat('#fff'), mat('#fff'), toon({ map: tex }), mat('#fff')]);
      m.position.set(1.25, Y0 + 1.85, 2.83);
      return m;
    },
    kranz: () => {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 14), mat('#4f9d5d')), 0, Y0 + 1.75, 2.82));
      for (let i = 0; i < 6; i++) { const a = i * 1.05; g.add(at(sph(0.05, '#e8504a', 1, 1, 1, 6), Math.cos(a) * 0.28, Y0 + 1.75 + Math.sin(a) * 0.28, 2.9)); }
      g.add(at(box(0.3, 0.14, 0.04, '#e0483f'), 0, Y0 + 1.48, 2.88));
      return g;
    },
    /* ───── Innen ───── */
    bett: () => {
      const g = new THREE.Group();
      const blanket = canvasTex(64, 64, (c) => { c.fillStyle = '#f08aa8'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect(i * 16, j * 16, 16, 16); });
      g.add(at(box(1.7, 0.3, 2.3, WOOD), 0, 0.2, 0), at(box(1.6, 0.25, 2.2, '#fff6e3'), 0, 0.46, 0), at(box(1.8, 1.0, 0.12, WOOD_D), 0, 0.7, -1.18), at(box(1.1, 0.14, 0.45, '#fff'), 0, 0.66, -0.8));
      const bl = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.12, 1.3), toon({ map: blanket }));
      bl.position.set(0, 0.62, 0.35);
      g.add(bl);
      g.position.set(-2.2, Y0 + 0.1, 1.45);
      return g;
    },
    uhr: () => {
      const g = new THREE.Group();
      g.add(at(rot(cyl(0.38, 0.38, 0.08, '#fff', 20), Math.PI / 2), 0, 0, 0), at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 6, 20), mat('#7a4d26')), 0, 0, 0), 0, 0, 0.03));
      const hand = (len: number, w: number) => { const p = new THREE.Group(); p.add(at(box(w, len, 0.03, '#222'), 0, len / 2, 0.06)); g.add(p); return p; };
      const hh = hand(0.2, 0.04), mh = hand(0.3, 0.03);
      anim.push((t) => { mh.rotation.z = -t * 0.5; hh.rotation.z = -t * 0.04; });
      g.position.set(-0.15, Y0 + 2.5, -2.58);
      return g;
    },
    spiegel: () => {
      const g = new THREE.Group();
      g.add(at(box(0.08, 1.4, 0.9, '#d9b45a'), 0, 0, 0), at(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshBasicMaterial({ color: '#d6f0ff' })), 0.05, 0, 0));
      g.children[1].rotation.y = Math.PI / 2;
      g.add(at(box(0.01, 0.1, 0.5, '#fff'), 0.055, 0.3, 0.05));
      g.position.set(-3.28, Y0 + 1.7, -1.7);
      return g;
    },
    aquarium: () => {
      const g = new THREE.Group();
      g.add(at(box(1.5, 0.7, 0.7, WOOD_D), 0, 0.35, 0));
      const tank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.6), new THREE.MeshBasicMaterial({ color: '#7fd6ff', transparent: true, opacity: 0.45 }));
      tank.position.y = 1.1;
      g.add(tank, at(box(1.36, 0.1, 0.56, '#e7c27a'), 0, 0.75, 0));
      for (let i = 0; i < 3; i++) g.add(at(cone(0.06, 0.4, '#3fa65a', 4), -0.4 + i * 0.35, 1.0, -0.15));
      const fish = [0, 1, 2].map((i) => { const f = new THREE.Group(); f.add(sph(0.09, ['#ff8c2a', '#ff5a8a', '#ffd23f'][i], 1.4, 1, 0.7, 8), at(cone(0.07, 0.12, ['#ff8c2a', '#ff5a8a', '#ffd23f'][i], 3), -0.14, 0, 0)); g.add(f); return f; });
      anim.push((t) => fish.forEach((f, i) => { f.position.set(Math.sin(t * 0.6 + i * 2) * 0.5, 1.05 + i * 0.15, 0.05 * i); f.rotation.y = Math.cos(t * 0.6 + i * 2) > 0 ? 0 : Math.PI; }));
      g.position.set(-2.7, Y0 + 0.1, -2.2);
      return g;
    },
    schreibtisch: () => {
      const g = new THREE.Group();
      g.add(at(box(1.7, 0.08, 0.8, '#b07a44'), 0, 0.85, 0));
      for (const sx of [-1, 1]) g.add(at(box(0.08, 0.85, 0.7, WOOD_D), sx * 0.78, 0.42, 0));
      g.add(at(box(0.6, 0.35, 0.7, WOOD_D), -0.45, 0.6, 0), at(cyl(0.22, 0.2, 0.08, '#4a90d9', 10), 0.1, 0.5, 0.75), at(cyl(0.04, 0.05, 0.5, WOOD_D, 6), 0.1, 0.25, 0.75));
      const globe = new THREE.Group();
      globe.add(sph(0.26, '#4a90d9', 1, 1, 1, 12), at(sph(0.1, '#4f9d5d', 1.4, 0.8, 0.5, 6), 0.1, 0.1, 0.2), at(sph(0.08, '#4f9d5d', 1, 1.2, 0.5, 6), -0.12, -0.05, 0.22));
      globe.position.set(0.55, 1.28, 0);
      g.add(globe, at(cyl(0.03, 0.03, 0.25, '#d9b45a', 6), 0.55, 1.0, 0), at(box(0.45, 0.04, 0.3, '#fff'), -0.2, 0.9, 0.1));
      anim.push((t) => (globe.rotation.y = t * 0.4));
      g.position.set(2.0, Y0 + 0.1, -2.25);
      return g;
    },
    spielzeugkiste: () => {
      const g = new THREE.Group();
      g.add(at(box(1.1, 0.6, 0.7, '#e8504a'), 0, 0.3, 0), at(box(1.14, 0.08, 0.74, '#b9413e'), 0, 0.62, 0));
      const toys: [number, number, string, string][] = [[-0.3, 0.2, '#f4c430', 's'], [0.1, -0.1, '#4a90d9', 'b'], [0.35, 0.15, '#4f9d5d', 's'], [-0.05, 0.2, '#fff', 'b']];
      toys.forEach(([x, z, c, k]) => g.add(k === 's' ? at(sph(0.14, c, 1, 1, 1, 8), x, 0.75, z) : at(box(0.2, 0.2, 0.2, c), x, 0.75, z)));
      g.add(at(sph(0.16, '#c08a5a', 1, 1, 1, 8), -0.4, 0.82, -0.15), at(sph(0.09, '#c08a5a', 1, 1, 1, 6), -0.4, 0.98, -0.15));
      g.position.set(2.0, Y0 + 0.1, 1.9);
      return g;
    },
    wandregal: () => {
      const g = new THREE.Group();
      for (const y of [0, 0.6]) g.add(at(box(0.4, 0.07, 1.6, WOOD), 0, y, 0));
      g.add(at(box(0.2, 0.3, 0.14, '#d9534f'), 0, 0.2, -0.5), at(box(0.2, 0.34, 0.14, '#4a90d9'), 0, 0.22, -0.34), at(cyl(0.1, 0.08, 0.2, '#c0704a', 8), 0, 0.8, 0.3), at(cone(0.1, 0.3, '#4f9d5d', 5), 0, 1.0, 0.3), at(sph(0.14, '#f4c430', 1, 1, 1, 8), 0, 0.2, 0.4));
      g.position.set(3.3, Y0 + 1.7, -1.3);
      return g;
    },
    kerzen: () => {
      const g = new THREE.Group();
      const flames: THREE.Mesh[] = [];
      for (const z of [-0.2, 0.15, 0.55, 0.9]) {
        const h = 0.2 + Math.abs(z) * 0.08;
        g.add(at(cyl(0.05, 0.05, h, '#fff6e3', 8), 0, h / 2, z));
        const f = cone(0.04, 0.12, '#ffb300', 5);
        f.material = glow('#ffb300', 1.6);
        f.position.set(0, h + 0.08, z);
        g.add(f);
        flames.push(f);
      }
      anim.push((t) => flames.forEach((f, i) => (f.scale.y = 0.8 + Math.sin(t * 11 + i) * 0.3)));
      g.position.set(3.0, Y0 + 2.06, 0.2);
      return g;
    },
    radio: () => {
      const g = new THREE.Group();
      g.add(at(box(0.7, 0.4, 0.3, '#d9534f'), 0, 0.2, 0), at(cyl(0.12, 0.12, 0.04, '#333', 12), -0.18, 0.2, 0.17), at(box(0.2, 0.05, 0.02, '#ffd88a'), 0.15, 0.28, 0.16), at(cyl(0.01, 0.01, 0.5, '#999', 4), 0.3, 0.55, 0));
      g.children[1].rotation.x = Math.PI / 2;
      g.position.set(-3.05, Y0 + 2.62, 0.7);
      return g;
    },
    kissen: () => {
      const g = new THREE.Group();
      g.add(at(rot(box(0.45, 0.45, 0.14, '#f4b942'), 0.2, 0.3, 0.1), -1.0, 0.95, -1.75), at(rot(box(0.42, 0.42, 0.14, '#e8504a'), 0.2, -0.3, -0.1), 0.2, 0.93, -1.75));
      g.position.set(0, Y0 + 0.1, 0);
      return g;
    },
  };
  return B;
}
