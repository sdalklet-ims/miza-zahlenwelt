/**
 * Fahrzeuge, Ladestation und Autohaus in 3D (nur Grundformen, Comic-Stil). Ein Fahrzeug blickt nach +x.
 * Mia sitzt in der Mitte: Im E-Auto sieht man nur ihren Kopf über der Karosserie, auf Fahrrad und Roller ihren ganzen Körper.
 */
import * as THREE from 'three';
import { at, box, canvasTex, cone, cyl, mat, rot, sph, toon } from './models';

export type RideKind = 'bike' | 'scooter' | 'car';
export const rideKindOf = (id: string): RideKind => (id === 'eauto' ? 'car' : id === 'eroller' ? 'scooter' : 'bike');

export interface Vehicle3D {
  group: THREE.Group;
  /** Höhe von Mias Bildunterkante über dem Boden */
  seat: number;
  /** Räder und Kurbel drehen, Lenkung einschlagen (steer in rad), Lichter (night 0–1) */
  update(dist: number, t: number, steer: number): void;
  /** Auspuff-/Funkenposition relativ zum Fahrzeug (lokal) */
  exhaust: THREE.Vector3;
  electric: boolean;
}

function wheelParts(r: number, w: number, col = '#2b2b30', hub = '#d9dde3') {
  const spin = new THREE.Group();
  spin.add(rot(cyl(r, r, w, col, 14), Math.PI / 2), rot(cyl(r * 0.55, r * 0.55, w + 0.02, hub, 10), Math.PI / 2), at(box(r * 1.5, 0.03, w + 0.03, hub), 0, 0, 0));
  const outer = new THREE.Group();
  outer.add(spin);
  return { outer, spin };
}
const glass = () => new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.5, depthWrite: false });
const glow = (col: string) => new THREE.MeshBasicMaterial({ color: col });

export function createVehicle(kind: string): Vehicle3D {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const spins: THREE.Object3D[] = [];
  const steerers: THREE.Object3D[] = [];
  const extra: ((t: number, dist: number) => void)[] = [];
  let seat = 0.45;
  let electric = true;
  const exhaust = new THREE.Vector3(-1.5, 0.35, 0);
  const addWheel = (x: number, y: number, z: number, r: number, w = 0.2, steer = false) => {
    const wp = wheelParts(r, w);
    wp.outer.position.set(x, y, z);
    wp.spin.userData.r = r;
    g.add(wp.outer);
    spins.push(wp.spin);
    if (steer) steerers.push(wp.outer);
  };

  if (kind === 'fahrrad') {
    electric = false;
    seat = 0.52;
    const tire = new THREE.TorusGeometry(0.42, 0.045, 6, 18);
    for (const [x, front] of [[0.78, true], [-0.78, false]] as const) {
      const w = new THREE.Group(), s = new THREE.Group();
      s.add(new THREE.Mesh(tire, mat('#2b2b30')), cyl(0.04, 0.04, 0.1, '#cfd3d9', 6));
      for (let i = 0; i < 3; i++) s.add(at(rot(box(0.84, 0.02, 0.02, '#cfd3d9'), 0, 0, (i * Math.PI) / 3), 0, 0, 0));
      s.userData.r = 0.42;
      w.add(s);
      w.position.set(x, 0.46, 0);
      g.add(w);
      spins.push(s);
      if (front) steerers.push(w);
    }
    g.add(at(rot(box(1.5, 0.07, 0.07, '#3a8fe0'), 0, 0, 0.1), 0, 0.92, 0), at(rot(box(1.0, 0.07, 0.07, '#3a8fe0'), 0, 0, -0.9), 0.3, 0.7, 0), at(rot(box(0.85, 0.07, 0.07, '#3a8fe0'), 0, 0, 1.05), -0.35, 0.65, 0), at(rot(box(0.7, 0.07, 0.07, '#3a8fe0'), 0, 0, -1.2), 0.62, 0.78, 0));
    g.add(at(box(0.45, 0.1, 0.22, '#2b2b30'), -0.55, 1.08, 0), at(box(0.07, 0.07, 0.8, '#2b2b30'), 0.72, 1.18, 0), at(box(0.45, 0.28, 0.4, '#f2a43a'), -1.05, 0.9, 0));
    const crank = new THREE.Group();
    crank.add(at(box(0.04, 0.04, 0.5, '#2b2b30'), 0, 0, 0), at(box(0.34, 0.04, 0.12, '#2b2b30'), 0.17, 0, 0.26), at(box(0.34, 0.04, 0.12, '#2b2b30'), -0.17, 0, -0.26));
    crank.position.set(0.0, 0.5, 0);
    g.add(crank);
    extra.push((_t, d) => (crank.rotation.z = -d * 1.6));
    exhaust.set(-1.2, 0.2, 0);
  } else if (kind === 'eroller') {
    seat = 0.34;
    g.add(at(box(1.7, 0.1, 0.55, '#2fa37a'), 0, 0.3, 0), at(box(0.7, 0.22, 0.5, '#1f7a5a'), -0.5, 0.2, 0), at(box(0.5, 0.05, 0.3, '#8be9c0'), -0.5, 0.33, 0));
    const stem = rot(cyl(0.055, 0.055, 1.35, '#cfd3d9', 6), 0, 0, -0.16);
    stem.position.set(0.85, 0.98, 0);
    g.add(stem, at(box(0.1, 0.1, 0.8, '#2b2b30'), 0.98, 1.65, 0), at(box(0.18, 0.12, 0.24, '#2b2b30'), 0.98, 1.72, 0));
    const lamp = sph(0.1, '#fff6a0', 1, 1, 1, 8);
    (lamp as THREE.Mesh).material = glow('#fff6a0');
    lamp.position.set(1.05, 1.5, 0);
    g.add(lamp);
    const bolt = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, boltPaint), transparent: true }));
    bolt.position.set(-0.5, 0.2, 0.26);
    g.add(bolt);
    addWheel(0.88, 0.24, 0, 0.24, 0.12, true); addWheel(-0.8, 0.22, 0, 0.22, 0.12);
    exhaust.set(-0.9, 0.2, 0);
  } else {
    // E-Auto (Cabrio): weiß/mint, offen, mit Blitz-Zeichen
    seat = 0.45;
    g.add(at(box(3.3, 0.5, 1.5, '#f4f7fa'), 0, 0.6, 0), at(box(1.1, 0.4, 1.4, '#f4f7fa'), 1.1, 0.88, 0), at(box(3.3, 0.1, 1.54, '#2fa37a'), 0, 0.46, 0), at(box(0.2, 0.2, 1.6, '#cfd8df'), 1.78, 0.5, 0), at(box(0.2, 0.2, 1.6, '#cfd8df'), -1.78, 0.5, 0));
    g.add(at(box(0.5, 0.55, 1.3, '#d9c2a0'), -0.75, 1.0, 0), at(box(0.1, 0.55, 1.5, '#e8eef3'), -1.2, 1.1, 0), at(box(0.55, 0.12, 0.9, '#cfd8df'), 0.1, 0.92, 0));
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), glass());
    ws.position.set(0.45, 1.2, 0); ws.rotation.set(0, Math.PI / 2, 0); ws.rotation.z = 0.3;
    g.add(ws);
    const sw = rot(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 14), mat('#2b2b30')), 0.9);
    sw.position.set(0.28, 1.02, 0);
    g.add(sw, at(box(0.06, 0.06, 0.45, '#2b2b30'), 0.15, 0.95, 0));
    for (const z of [-0.5, 0.5]) {
      const hl = sph(0.17, '#fff6a0', 1, 1, 1, 8);
      (hl as THREE.Mesh).material = glow('#fff6a0');
      hl.position.set(1.7, 0.84, z);
      g.add(hl);
    }
    const bolt = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, boltPaint), transparent: true }));
    bolt.position.set(0.2, 0.62, 0.76);
    const bolt2 = bolt.clone(); bolt2.position.z = -0.76; bolt2.rotation.y = Math.PI;
    g.add(bolt, bolt2);
    addWheel(1.05, 0.38, 0.82, 0.38, 0.24, true); addWheel(1.05, 0.38, -0.82, 0.38, 0.24, true); addWheel(-1.05, 0.38, 0.82, 0.38); addWheel(-1.05, 0.38, -0.82, 0.38);
    exhaust.set(-1.9, 0.4, 0);
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  let rolled = 0;
  return {
    group: g, seat, exhaust, electric,
    update(dist, t, steer) {
      rolled += dist;
      for (const w of spins) w.rotation.z -= dist / (w.userData.r as number);
      for (const s of steerers) s.rotation.y = steer;
      for (const f of extra) f(t, rolled);
    },
  };
}

function boltPaint(c: CanvasRenderingContext2D) {
  c.fillStyle = '#2fa37a'; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff6a0'; c.beginPath(); c.moveTo(36, 8); c.lineTo(16, 36); c.lineTo(29, 36); c.lineTo(25, 56); c.lineTo(48, 26); c.lineTo(34, 26); c.closePath(); c.fill();
}

export interface ChargeStation3D { group: THREE.Group; setCharging(on: boolean, t: number, level: number): void }

/** Ladestation: Säule mit Bildschirm, Solardach, Kabel und Parkfeld; leuchtet beim Laden */
export function createChargeStation(): ChargeStation3D {
  const g = new THREE.Group();
  g.add(at(box(2.6, 0.06, 1.7, '#8f959c'), 0, 0.03, 0.4), at(box(0.08, 0.02, 1.5, '#ffffff'), -1.1, 0.07, 0.4), at(box(0.08, 0.02, 1.5, '#ffffff'), 1.1, 0.07, 0.4));
  g.add(at(box(0.7, 0.18, 0.5, '#555c66'), 0, 0.15, 0), at(box(0.42, 2.0, 0.34, '#2fa37a'), 0, 1.2, 0), at(box(0.52, 0.12, 0.44, '#1f7a5a'), 0, 2.26, 0));
  const solar = at(rot(box(1.5, 0.07, 0.9, '#2a3f6b'), -0.25, 0, 0.06), 0, 2.75, -0.05);
  for (let i = 0; i < 3; i++) solar.add(at(box(0.04, 0.09, 0.88, '#9fb6e0'), -0.5 + i * 0.5, 0, 0));
  g.add(solar, at(box(0.06, 0.5, 0.06, '#555c66'), 0, 2.5, 0));
  const screenTex = canvasTex(128, 192, (c) => {
    c.fillStyle = '#0d2b22'; c.fillRect(0, 0, 128, 192);
    c.fillStyle = '#fff6a0'; c.beginPath(); c.moveTo(78, 12); c.lineTo(34, 84); c.lineTo(64, 84); c.lineTo(52, 136); c.lineTo(100, 66); c.lineTo(70, 66); c.closePath(); c.fill();
    c.fillStyle = '#8be9c0'; c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.fillText('LADEN', 64, 176);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.45), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0, 1.45, 0.18);
  g.add(screen);
  const led = sph(0.08, '#7dff9a', 1, 1, 1, 8);
  (led as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: '#7dff9a' });
  led.position.set(0, 1.98, 0.18);
  g.add(led);
  // Kabel
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.22, 1.0, 0.1), new THREE.Vector3(0.7, 0.55, 0.35), new THREE.Vector3(0.9, 0.12, 0.8)]), 12, 0.035, 5), mat('#2b2b30'));
  g.add(cable, at(box(0.14, 0.14, 0.2, '#2b2b30'), 0.9, 0.14, 0.85));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 28), new THREE.MeshBasicMaterial({ color: '#7dff9a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(0, 0.1, 0.4);
  g.add(halo);
  return {
    group: g,
    setCharging(on, t, level) {
      const m = halo.material as THREE.MeshBasicMaterial;
      m.opacity = on ? 0.35 + Math.sin(t * 8) * 0.25 : 0;
      halo.scale.setScalar(on ? 1 + Math.sin(t * 6) * 0.08 : 1);
      ((led as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(on ? (Math.sin(t * 14) > 0 ? '#fff6a0' : '#7dff9a') : level >= 99 ? '#7dff9a' : '#ffb347');
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
  for (let i = 0; i < 12; i++) g.add(at(rot(cone(0.2, 0.45, ['#e8504a', '#ffd23f', '#4f9d5d', '#4a90d9'][i % 4], 3), Math.PI, 0, 0), -3.6 + i * 0.65, 3.1, D / 2 + 0.7));
  const display: THREE.Group[] = [];
  for (const [kind, x, sc] of [['eauto', -2.2, 0.7], ['eroller', 2.2, 0.9]] as const) {
    const pod = new THREE.Group();
    pod.add(at(cyl(1.5, 1.6, 0.3, '#f2f2f2', 20), 0, 0.15, 0), at(cyl(1.4, 1.4, 0.06, '#2fa37a', 20), 0, 0.32, 0));
    const v = createVehicle(kind);
    v.group.scale.setScalar(sc);
    v.group.position.y = 0.35;
    pod.add(v.group);
    pod.position.set(x, 0, D / 2 + 2.2);
    g.add(pod);
    display.push(v.group);
  }
  g.userData.tick = (t: number) => display.forEach((d, i) => (d.rotation.y = t * 0.5 + i * 1.5));
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    b.add(at(sph(0.28, ['#e8504a', '#ffd23f', '#4a90d9', '#5fbf4a'][i], 1, 1.2, 1, 10), 0, 0, 0), at(box(0.015, 1.1, 0.015, '#999'), 0, -0.75, 0));
    b.position.set(-3.9 + i * 0.35 + (i > 1 ? 7.0 : 0), 2.4 + (i % 2) * 0.3, D / 2 + 0.9);
    g.add(b);
  }
  return g;
}
