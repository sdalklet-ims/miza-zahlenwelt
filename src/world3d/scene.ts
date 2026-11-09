/** three.js-Szene: Renderer, Himmel mit Wolken, Sonne mit Schatten, Boden-Kacheln mit Hügeln, Fluss, Brücke, Kamera. */
import * as THREE from 'three';
import { worlds } from '../core/texts';
import { S, CHUNK, WW, WH, getChunk, heightAt, riverOf } from '../world/terrain';
import { W as VW, H as VH } from '../ui/stage';
import { canvasTex, mat, toon } from './models';
import { PITCH } from './sprites';

export interface Stage3D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  setPixelRatio(k: number): void;
  /** Kamera und Sonne folgen (Position in Spiel-Pixeln) */
  follow(x: number, y: number, vx: number, vy: number, dt: number, snap?: boolean): void;
  streamChunks(x: number, y: number, budget: number): void;
  tick(t: number): void;
  /** Sichtbare Höhe in Einheiten (kleiner = näher heran); weicher Übergang */
  setZoom(h: number): void;
  project(v: THREE.Vector3): { x: number; y: number; behind: boolean };
  pickGround(clientX: number, clientY: number): { x: number; y: number } | null;
  dispose(): void;
}

const VIEW_H = 15; // sichtbare Höhe in Einheiten (Bildschirm)
const CAM_DIST = 70;
const CAM_OFFSET = new THREE.Vector3(0, CAM_DIST * Math.sin(PITCH), CAM_DIST * Math.cos(PITCH));

export function createStage3D(canvas: HTMLCanvasElement, pixelRatio: number): Stage3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(VW, VH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const HORIZON = new THREE.Color('#bfe6f5');
  scene.background = HORIZON;
  scene.fog = new THREE.Fog(HORIZON, 74, 135);

  const asp = VW / VH;
  const camera = new THREE.OrthographicCamera((-VIEW_H * asp) / 2, (VIEW_H * asp) / 2, VIEW_H / 2, -VIEW_H / 2, 1, 260);

  /* Licht: warme Sonne + Himmelslicht */
  scene.add(new THREE.HemisphereLight('#ffffff', '#9ab87a', 1.55));
  const sun = new THREE.DirectionalLight('#fff3d6', 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const ext = 18;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.42).normalize().multiplyScalar(40);

  /* Untergrund außerhalb der Welt */
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), toon({ color: '#5f9a55' }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.6;
  under.receiveShadow = true;
  scene.add(under);

  /* Boden-Kacheln (Textur aus dem 2D-Maler, Höhe aus heightAt) */
  const terrain = new THREE.Group();
  scene.add(terrain);
  const chunks = new Map<string, THREE.Mesh>();
  const SEG = 20, CS = CHUNK * S;
  const cx1 = Math.ceil(WW / CHUNK) - 1, cy1 = Math.ceil(WH / CHUNK) - 1;
  const makeChunk = (cx: number, cy: number) => {
    const geo = new THREE.PlaneGeometry(CS, CS, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, n = geo.attributes.normal;
    const ox = cx * CHUNK, oy = cy * CHUNK;
    for (let i = 0; i < p.count; i++) {
      const px = ox + (p.getX(i) / CS + 0.5) * CHUNK, py = oy + (p.getZ(i) / CS + 0.5) * CHUNK;
      p.setY(i, heightAt(px, py));
      const e = 12;
      const dx = heightAt(px + e, py) - heightAt(px - e, py), dz = heightAt(px, py + e) - heightAt(px, py - e);
      const v = new THREE.Vector3(-dx / (2 * e * S), 1, -dz / (2 * e * S)).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
    geo.translate(ox * S + CS / 2, 0, oy * S + CS / 2);
    const tex = new THREE.CanvasTexture(getChunk(cx, cy));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const mesh = new THREE.Mesh(geo, toon({ map: tex }));
    mesh.receiveShadow = true;
    terrain.add(mesh);
    chunks.set(cx + ',' + cy, mesh);
  };

  /* Fluss: bewegte Wellen + Brücke */
  const waveTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#7cc4ee'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const y = (i * 29 + 10) % 256, x = (i * 71) % 200; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 30, y - 12, x + 60, y); c.stroke(); }
  });
  waveTex.wrapS = waveTex.wrapT = THREE.RepeatWrapping;
  const waters: THREE.Mesh[] = [];
  worlds.forEach((_, i) => {
    const rv = riverOf(i);
    if (!rv) return;
    waveTex.repeat.set(((rv.x1 - rv.x0) * S) / 4, (WH * S) / 4);
    const w = new THREE.Mesh(new THREE.PlaneGeometry((rv.x1 - rv.x0) * S, WH * S), new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, opacity: 0.8 }));
    w.rotation.x = -Math.PI / 2;
    w.position.set(((rv.x0 + rv.x1) / 2) * S, 0.03, (WH / 2) * S);
    waters.push(w);
    scene.add(w);
    const br = new THREE.Group();
    const bw = (rv.x1 - rv.x0 + 70) * S;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.18, 2.3), mat('#b07a44'));
    deck.position.y = 0.16; deck.castShadow = deck.receiveShadow = true;
    br.add(deck);
    for (let k = 0; k < 18; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 2.32), mat('#7a4d26')); pl.position.set(-bw / 2 + (k + 0.5) * (bw / 18), 0.17, 0); br.add(pl); }
    for (const sz of [-1.12, 1.12]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.1, 0.12), mat('#7a4d26'));
      rail.position.set(0, 0.78, sz); rail.castShadow = true; br.add(rail);
      for (let k = 0; k <= 6; k++) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 6), mat('#7a4d26')); po.position.set(-bw / 2 + (k / 6) * bw, 0.5, sz); po.castShadow = true; br.add(po); }
    }
    br.position.set(((rv.x0 + rv.x1) / 2) * S, 0, rv.by * S);
    scene.add(br);
  });

  const cam = { x: 0, y: 0, z: 0, init: false };
  let view = VIEW_H, viewTarget = VIEW_H;
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
  const tmp = new THREE.Vector3();
  let last = '';

  return {
    renderer, scene, camera,
    setPixelRatio: (k) => { renderer.setPixelRatio(k); renderer.setSize(VW, VH, false); },
    follow(x, y, vx, vy, dt, snap = false) {
      const tx = (x + vx * 0.28) * S, tz = (y + vy * 0.28) * S;
      if (!cam.init || snap) { cam.x = tx; cam.z = tz; cam.init = true; }
      const a = 1 - Math.exp(-4.5 * dt);
      cam.x += (tx - cam.x) * a;
      cam.z += (tz - cam.z) * a;
      camera.position.set(cam.x + CAM_OFFSET.x, CAM_OFFSET.y, cam.z + CAM_OFFSET.z);
      camera.lookAt(cam.x, 0.6, cam.z);
      // Sonne folgt Mia (in Schritten, damit Schatten nicht flimmern)
      const sx = Math.round(x * S * 2) / 2, sz = Math.round(y * S * 2) / 2;
      sun.target.position.set(sx, 0, sz);
      sun.position.set(sx + SUN_DIR.x, SUN_DIR.y, sz + SUN_DIR.z);
    },
    streamChunks(x, y, budget) {
      const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
      const key = cx + ',' + cy;
      if (key === last && budget === 0) return;
      last = key;
      // Reihenfolge: nahe zuerst
      const want: [number, number, number][] = [];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx < 0 || gy < 0 || gx > cx1 || gy > cy1 || chunks.has(gx + ',' + gy)) continue;
        want.push([gx, gy, dx * dx + dy * dy]);
      }
      want.sort((a, b) => a[2] - b[2]);
      for (let i = 0; i < Math.min(budget || want.length, want.length); i++) makeChunk(want[i][0], want[i][1]);
    },
    setZoom(hh) {
      viewTarget = hh;
    },
    tick(t) {
      if (Math.abs(view - viewTarget) > 0.002) {
        view += (viewTarget - view) * 0.07;
        camera.left = (-view * asp) / 2; camera.right = (view * asp) / 2; camera.top = view / 2; camera.bottom = -view / 2;
        camera.updateProjectionMatrix();
      }
      waveTex.offset.y = -t * 0.12;
      waveTex.offset.x = Math.sin(t * 0.4) * 0.05;
    },
    project(v) {
      tmp.copy(v).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * VW, y: (-tmp.y * 0.5 + 0.5) * VH, behind: tmp.z > 1 };
    },
    pickGround(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const nx = ((clientX - r.left) / r.width) * 2 - 1, ny = -(((clientY - r.top) / r.height) * 2 - 1);
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      return ray.ray.intersectPlane(plane, tmp) ? { x: tmp.x / S, y: tmp.z / S } : null;
    },
    dispose() {
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
      });
    },
  };
}
