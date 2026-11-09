/**
 * Fahrzeuge und Autohaus in 3D (nur Grundformen, Comic-Stil). Ein Fahrzeug blickt nach +x; Mia sitzt in der Mitte
 * (ihr Bild steht senkrecht, die Karosserie davor verdeckt die Beine – so sieht es aus, als säße sie wirklich drin).
 */
import * as THREE from 'three';
import { at, box, canvasTex, cone, cyl, mat, rot, sph, toon } from './models';

export interface Vehicle3D {
  group: THREE.Group;
  /** Sitzhöhe: Mias Füße stehen hier */
  seat: number;
  /** Räder drehen (dist = zurückgelegte Strecke in Einheiten) und kleine Animationen */
  roll(dist: number, t: number): void;
  /** Auspuff-/Feuerposition relativ zum Fahrzeug (lokal) */
  exhaust: THREE.Vector3;
  fire: boolean;
}

function wheel(r: number, w: number, col = '#2b2b30', hub = '#d9dde3') {
  const g = new THREE.Group();
  g.add(rot(cyl(r, r, w, col, 14), Math.PI / 2), rot(cyl(r * 0.55, r * 0.55, w + 0.02, hub, 10), Math.PI / 2));
  return g;
}
const glass = () => new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.5, depthWrite: false });

export function createVehicle(kind: string): Vehicle3D {
  const g = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const extra: ((t: number) => void)[] = [];
  let seat = 0.45, fire = false;
  const exhaust = new THREE.Vector3(-1.5, 0.35, 0);
  const addWheel = (x: number, y: number, z: number, r: number, w = 0.2, spin = true) => {
    const wh = wheel(r, w);
    wh.position.set(x, y, z);
    g.add(wh);
    if (spin) wheels.push(wh);
    wh.userData.r = r;
  };

  switch (kind) {
    case 'roller': {
      seat = 0.3;
      g.add(at(box(1.5, 0.1, 0.5, '#e8504a'), 0, 0.28, 0), at(rot(cyl(0.05, 0.05, 1.3, '#cfd3d9', 6), 0, 0, -0.18), 0.78, 0.9, 0), at(box(0.1, 0.1, 0.7, '#2b2b30'), 0.9, 1.5, 0));
      addWheel(0.78, 0.2, 0, 0.2, 0.1); addWheel(-0.7, 0.2, 0, 0.18, 0.1);
      exhaust.set(-0.9, 0.15, 0);
      break;
    }
    case 'fahrrad': {
      seat = 0.62;
      const tire = new THREE.TorusGeometry(0.42, 0.045, 6, 18);
      for (const x of [0.78, -0.78]) {
        const w = new THREE.Group();
        w.add(new THREE.Mesh(tire, mat('#2b2b30')), cyl(0.04, 0.04, 0.1, '#cfd3d9', 6));
        w.add(...[0, 1, 2].map((i) => at(rot(box(0.84, 0.02, 0.02, '#cfd3d9'), 0, 0, (i * Math.PI) / 3), 0, 0, 0)));
        w.position.set(x, 0.46, 0);
        g.add(w);
        wheels.push(w);
        w.userData.r = 0.42;
      }
      g.add(at(rot(box(1.5, 0.07, 0.07, '#3a8fe0'), 0, 0, 0.1), 0, 0.92, 0), at(rot(box(1.0, 0.07, 0.07, '#3a8fe0'), 0, 0, -0.9), 0.3, 0.7, 0), at(rot(box(0.85, 0.07, 0.07, '#3a8fe0'), 0, 0, 1.05), -0.35, 0.65, 0), at(rot(box(0.7, 0.07, 0.07, '#3a8fe0'), 0, 0, -1.2), 0.62, 0.78, 0));
      g.add(at(box(0.45, 0.1, 0.22, '#2b2b30'), -0.55, 1.08, 0), at(box(0.07, 0.07, 0.8, '#2b2b30'), 0.72, 1.18, 0), at(box(0.45, 0.28, 0.4, '#f2a43a'), -1.05, 0.9, 0));
      exhaust.set(-1.2, 0.2, 0);
      break;
    }
    case 'gokart': {
      seat = 0.4;
      g.add(at(box(2.1, 0.22, 1.1, '#ffd23f'), 0, 0.42, 0), at(box(0.7, 0.2, 0.9, '#ffd23f'), 0.95, 0.5, 0), at(box(0.6, 0.12, 0.9, '#2b2b30'), -0.1, 0.58, 0), at(box(0.12, 0.7, 0.9, '#2b2b30'), -0.6, 0.9, 0), at(box(0.7, 0.3, 0.1, '#e8504a'), 0.1, 0.62, 0.56), at(box(0.7, 0.3, 0.1, '#e8504a'), 0.1, 0.62, -0.56));
      g.add(at(rot(cyl(0.2, 0.2, 0.05, '#2b2b30', 10), 0.8), 0.55, 0.95, 0), at(sph(0.2, '#fff', 1, 0.7, 1.4, 8), -0.9, 0.55, 0));
      addWheel(0.85, 0.3, 0.62, 0.3, 0.26); addWheel(0.85, 0.3, -0.62, 0.3, 0.26); addWheel(-0.8, 0.32, 0.65, 0.34, 0.3); addWheel(-0.8, 0.32, -0.65, 0.34, 0.3);
      exhaust.set(-1.2, 0.4, 0);
      break;
    }
    case 'cabrio': {
      seat = 0.62;
      g.add(at(box(3.2, 0.5, 1.5, '#e0483f'), 0, 0.6, 0), at(box(1.0, 0.4, 1.4, '#e0483f'), 1.15, 0.9, 0), at(box(0.2, 0.2, 1.6, '#dfe6ea'), 1.7, 0.5, 0), at(box(0.2, 0.2, 1.6, '#dfe6ea'), -1.7, 0.5, 0));
      g.add(at(box(0.5, 0.55, 1.3, '#e8c9a4'), -0.7, 1.0, 0), at(box(0.1, 0.5, 1.5, '#b9302a'), -1.1, 1.1, 0));
      const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), glass());
      ws.position.set(0.5, 1.2, 0); ws.rotation.set(0, Math.PI / 2, 0); ws.rotation.z = 0.3;
      g.add(ws);
      for (const z of [-0.5, 0.5]) g.add(at(sph(0.17, '#fff6a0', 1, 1, 1, 8), 1.72, 0.82, z));
      addWheel(1.0, 0.38, 0.82, 0.38); addWheel(1.0, 0.38, -0.82, 0.38); addWheel(-1.0, 0.38, 0.82, 0.38); addWheel(-1.0, 0.38, -0.82, 0.38);
      exhaust.set(-1.8, 0.4, 0.4);
      break;
    }
    case 'rennauto': {
      seat = 0.46;
      g.add(at(box(3.5, 0.38, 1.3, '#2f7bd9'), 0, 0.5, 0), at(rot(box(1.4, 0.22, 1.1, '#2f7bd9'), 0, 0, -0.12), 1.4, 0.55, 0), at(box(0.9, 0.5, 1.2, '#2f7bd9'), -0.7, 0.85, 0));
      g.add(at(box(3.5, 0.06, 0.28, '#ffffff'), 0, 0.72, 0), at(rot(box(0.8, 0.1, 1.6, '#e8504a'), 0, 0, 0.1), -1.65, 1.25, 0), at(box(0.1, 0.5, 0.1, '#2b2b30'), -1.6, 0.95, 0.5), at(box(0.1, 0.5, 0.1, '#2b2b30'), -1.6, 0.95, -0.5));
      const dome = sph(0.8, '#bfe8ff', 1.1, 0.7, 0.8, 12);
      (dome as THREE.Mesh).material = glass();
      dome.position.set(0.1, 1.0, 0);
      g.add(dome);
      addWheel(1.15, 0.4, 0.78, 0.4, 0.34); addWheel(1.15, 0.4, -0.78, 0.4, 0.34); addWheel(-1.15, 0.42, 0.8, 0.44, 0.38); addWheel(-1.15, 0.42, -0.8, 0.44, 0.38);
      exhaust.set(-1.8, 0.5, 0);
      break;
    }
    default: {
      // rakete
      seat = 0.6;
      fire = true;
      const body = rot(cyl(0.62, 0.62, 3.0, '#e9edf2', 14), 0, 0, Math.PI / 2);
      body.position.set(0, 0.9, 0);
      g.add(body, at(rot(cone(0.62, 1.2, '#e0483f', 14), 0, 0, -Math.PI / 2), 2.1, 0.9, 0), at(rot(cyl(0.66, 0.66, 0.35, '#e0483f', 14), 0, 0, Math.PI / 2), -1.3, 0.9, 0), at(rot(cyl(0.64, 0.64, 0.2, '#e0483f', 14), 0, 0, Math.PI / 2), 0.9, 0.9, 0));
      for (const [ry, z] of [[0, 0.7], [Math.PI, -0.7]] as const) g.add(at(rot(box(0.9, 0.12, 0.8, '#e0483f'), ry, 0, 0.0), -1.3, 0.55, z));
      g.add(at(box(0.9, 0.9, 0.1, '#e0483f'), -1.4, 1.5, 0));
      const dome = sph(0.62, '#bfe8ff', 1.0, 0.8, 0.8, 12);
      (dome as THREE.Mesh).material = glass();
      dome.position.set(0.1, 1.45, 0);
      g.add(dome);
      const flame = new THREE.Group();
      for (let i = 0; i < 3; i++) { const f = rot(cone(0.38 - i * 0.08, 1.3 + i * 0.3, i === 0 ? '#ff9a3c' : i === 1 ? '#ffd23f' : '#ffffff', 8), 0, 0, Math.PI / 2); (f as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: i === 0 ? '#ff7a1c' : i === 1 ? '#ffd23f' : '#ffffff' }); f.position.set(-1.9 - i * 0.12, 0.9, 0); flame.add(f); }
      g.add(flame);
      extra.push((t) => { flame.scale.set(0.85 + Math.sin(t * 40) * 0.2, 1, 1); flame.children.forEach((f, i) => (f.scale.y = 0.9 + Math.sin(t * 33 + i) * 0.15)); });
      addWheel(1.0, 0.36, 0.85, 0.36); addWheel(1.0, 0.36, -0.85, 0.36); addWheel(-0.9, 0.36, 0.85, 0.36); addWheel(-0.9, 0.36, -0.85, 0.36);
      exhaust.set(-2.2, 0.9, 0);
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  return {
    group: g, seat, exhaust, fire,
    roll(dist, t) {
      for (const w of wheels) w.rotation.z -= dist / (w.userData.r as number);
      for (const f of extra) f(t);
    },
  };
}

/** Autohaus mit Glasfront, Schild, Wimpeln und zwei Schaufahrzeugen, die sich langsam drehen */
export function createCarShop(): THREE.Group {
  const g = new THREE.Group();
  const W = 7.6, D = 3.8, H = 3.2;
  g.add(at(box(W, H, D, '#eaf2fb'), 0, H / 2, 0), at(box(W + 0.5, 0.3, D + 0.5, '#2a62b8'), 0, H + 0.15, 0), at(box(W, 0.5, 0.4, '#2a62b8'), 0, 0.25, D / 2 + 0.2));
  const signTex = canvasTex(512, 128, (c) => {
    c.fillStyle = '#2a62b8'; c.fillRect(0, 0, 512, 128);
    c.strokeStyle = '#ffd23f'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116);
    c.fillStyle = '#fff'; c.font = '900 78px sans-serif'; c.textAlign = 'center'; c.fillText('AUTOHAUS', 256, 94);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, 1.05, 0.25), [mat('#1d4a94'), mat('#1d4a94'), mat('#1d4a94'), mat('#1d4a94'), toon({ map: signTex }), mat('#1d4a94')]);
  sign.position.set(0, H + 1.0, D / 2 - 0.2);
  sign.castShadow = true;
  g.add(sign);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.0, 2.0), new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.55 }));
  win.position.set(0, 1.55, D / 2 + 0.03);
  g.add(win);
  for (let i = 0; i <= 4; i++) g.add(at(box(0.08, 2.1, 0.1, '#dfe6ea'), -3.2 + i * 1.6, 1.5, D / 2 + 0.06));
  // Wimpelkette
  for (let i = 0; i < 12; i++) { const f = at(rot(cone(0.2, 0.45, ['#e8504a', '#ffd23f', '#4f9d5d', '#4a90d9'][i % 4], 3), Math.PI, 0, 0), -3.6 + i * 0.65, 3.1 - Math.abs(Math.sin(i * 0.5)) * 0.05, D / 2 + 0.7); g.add(f); }
  // Podeste mit Schaufahrzeugen
  const display: THREE.Group[] = [];
  for (const [kind, x, sc] of [['cabrio', -2.2, 0.7], ['rennauto', 2.2, 0.7]] as const) {
    const pod = new THREE.Group();
    pod.add(at(cyl(1.5, 1.6, 0.3, '#f2f2f2', 20), 0, 0.15, 0), at(cyl(1.4, 1.4, 0.06, '#2a62b8', 20), 0, 0.32, 0));
    const v = createVehicle(kind);
    v.group.scale.setScalar(sc);
    v.group.position.y = 0.35;
    pod.add(v.group);
    pod.position.set(x, 0, D / 2 + 2.2);
    g.add(pod);
    display.push(v.group);
  }
  g.userData.tick = (t: number) => display.forEach((d, i) => (d.rotation.y = t * 0.5 + i * 1.5));
  // Ballons
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    b.add(at(sph(0.28, ['#e8504a', '#ffd23f', '#4a90d9', '#5fbf4a'][i], 1, 1.2, 1, 10), 0, 0, 0), at(box(0.015, 1.1, 0.015, '#999'), 0, -0.75, 0));
    b.position.set(-3.9 + i * 0.35 + (i > 1 ? 7.0 : 0), 2.4 + (i % 2) * 0.3, D / 2 + 0.9);
    g.add(b);
  }
  return g;
}
