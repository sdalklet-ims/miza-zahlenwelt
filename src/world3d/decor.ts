/** Dekoration als Instanzen (Bäume, Tannen, Felsen, Berge, Gras, Blumen) mit Wind-Schwanken im Vertex-Shader. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { worlds, worldCfg } from '../core/texts';
import { S, ZW, WH, PLOT, heightAt, pathY, riverOf } from '../world/terrain';
import type { WorldModel, Decor } from '../world/world';
import { createHouse, toon } from './models';

export const windUniform = { value: 0 };

function wind(m: THREE.MeshToonMaterial, amp: number, base: number) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniform;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float sw = max(0.0, position.y - ${base.toFixed(2)});
         float ph = uTime * 1.5 + instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.4;
         transformed.x += sin(ph) * sw * sw * ${amp.toFixed(3)};
         transformed.z += cos(ph * 0.8) * sw * sw * ${(amp * 0.7).toFixed(3)};
       #endif`
    );
  };
  return m;
}

/** Vertexfarben als Verlauf von unten (dunkel) nach oben (hell) */
function gradient(g: THREE.BufferGeometry, lo: string, hi: string, y0: number, y1: number) {
  const a = new THREE.Color(lo), b = new THREE.Color(hi), pos = g.attributes.position, arr: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, (pos.getY(i) - y0) / (y1 - y0)));
    c.copy(a).lerp(b, t);
    arr.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

function jitter(g: THREE.BufferGeometry, amt: number, seed: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = Math.sin((p.getX(i) + seed) * 12.9898 + (p.getY(i) - seed) * 78.233 + p.getZ(i) * 37.719) * 43758.5453;
    const f = (k - Math.floor(k) - 0.5) * amt;
    p.setXYZ(i, p.getX(i) * (1 + f), p.getY(i) * (1 + f * 0.6), p.getZ(i) * (1 + f));
  }
  g.computeVertexNormals();
  return g;
}

const prep = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; };

function roundTree(lo: string, hi: string) {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.13, 0.2, 1.4, 6);
  trunk.translate(0, 0.7, 0);
  parts.push(gradient(prep(trunk), '#5d3a1c', '#8a5a2b', 0, 1.4));
  for (const [x, y, z, r, s] of [[0, 2.2, 0, 1.15, 0], [0.75, 1.7, 0.2, 0.85, 1], [-0.7, 1.65, -0.2, 0.9, 2], [0.05, 3.05, 0, 0.75, 3], [0.1, 1.9, -0.7, 0.7, 4]]) {
    const g = jitter(new THREE.IcosahedronGeometry(r, 1), 0.28, s * 3);
    g.translate(x, y, z);
    parts.push(gradient(prep(g), lo, hi, y - r, y + r));
  }
  return mergeGeometries(parts)!;
}

function pineTree() {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6);
  trunk.translate(0, 0.6, 0);
  parts.push(gradient(prep(trunk), '#5d3a1c', '#7a4d26', 0, 1.2));
  [[1.5, 1.15, 1.7], [2.3, 0.95, 1.5], [3.0, 0.75, 1.35], [3.65, 0.5, 1.2]].forEach(([y, r, h], i) => {
    const g = jitter(new THREE.ConeGeometry(r, h, 7), 0.1, i);
    g.translate(0, y, 0);
    parts.push(gradient(prep(g), '#1d5a3f', '#3f9a6e', y - h / 2, y + h / 2));
  });
  return mergeGeometries(parts)!;
}

function rockGeo() {
  const g = jitter(new THREE.DodecahedronGeometry(0.75, 0), 0.35, 5);
  g.scale(1, 0.62, 0.9);
  g.translate(0, 0.3, 0);
  return gradient(prep(g), '#6f6b63', '#bdb9ae', 0, 0.7);
}

function mountainGeo() {
  const g = jitter(new THREE.ConeGeometry(3.3, 7, 8, 5), 0.34, 9);
  g.translate(0, 3.5, 0);
  const n = prep(g), pos = n.attributes.position, arr: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 7;
    if (t > 0.68) c.set('#ffffff'); else c.set('#8b93a7').lerp(new THREE.Color('#5f6679'), 1 - t / 0.68).lerp(new THREE.Color('#9aa28a'), t < 0.18 ? 0.5 : 0);
    arr.push(c.r, c.g, c.b);
  }
  n.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return n;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: Decor[], scale: number, shadow = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const d = new THREE.Object3D();
  items.forEach((it, i) => {
    d.position.set(it.x * S, heightAt(it.x, it.y) - 0.05, it.y * S);
    d.rotation.set(0, it.rot, 0);
    d.scale.setScalar(it.s * scale);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function buildDecor(model: WorldModel): THREE.Group {
  const g = new THREE.Group();
  const vm = (flat: boolean, amp = 0, base = 1) => {
    const m = toon({ vertexColors: true });
    void flat;
    return amp ? wind(m, amp, base) : m;
  };
  const byKind = (k: string) => model.decor.filter((d) => d.kind === k);
  const pal: Record<string, [string, string]> = {
    tree_forest: ['#2f7d46', '#5fbf6a'], tree_dark: ['#245f3a', '#4aa05a'], tree_light: ['#4e9f4c', '#9bdc6a'], tree_autumn: ['#c2692a', '#f0b04a'],
  };
  for (const [k, [lo, hi]] of Object.entries(pal)) {
    const it = byKind(k);
    if (it.length) g.add(instanced(roundTree(lo, hi), vm(true, 0.028, 0.9), it, 0.82));
  }
  const pines = byKind('pine');
  if (pines.length) g.add(instanced(pineTree(), vm(true, 0.03, 1.0), pines, 0.8));
  const rocks = byKind('rock');
  if (rocks.length) g.add(instanced(rockGeo(), vm(true), rocks, 1.0));
  const mts = byKind('mountain');
  if (mts.length) g.add(instanced(mountainGeo(), vm(true), mts, 1.1));
  for (const h of model.decor.filter((d) => d.kind.startsWith('house'))) {
    const house = createHouse(h.kind === 'house_blue' ? '#4a90d9' : '#d9674a');
    house.position.set(h.x * S, heightAt(h.x, h.y), h.y * S);
    house.scale.setScalar(1.15);
    g.add(house);
  }

  /* Gras und Blumen: dicht um den Weg, in jeder Zone nach Thema */
  let seed = 4242;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const tuft = (() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.ConeGeometry(0.05, 0.5 + i * 0.05, 3);
      c.translate(0, 0.25, 0);
      c.rotateZ((i - 1.5) * 0.28);
      c.rotateY(i * 1.7);
      parts.push(gradient(prep(c), '#3c8f48', '#8fd870', 0, 0.55));
    }
    return mergeGeometries(parts)!;
  })();
  const inPlot = (x: number, y: number) => !!PLOT && Math.abs(x - PLOT.x) < 380 && y > PLOT.y - 300 && y < PLOT.y + 420;
  const grassItems: Decor[] = [], flowerItems: { d: Decor; c: THREE.Color }[] = [];
  const colors = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff', '#ff9f5a'].map((c) => new THREE.Color(c));
  worlds.forEach((w, zi) => {
    const th = worldCfg.themes[w.meta.theme] ?? worldCfg.themes.forest;
    const rv = riverOf(zi);
    const nG = w.meta.theme === 'mountain' ? 1400 : w.meta.theme === 'village' ? 900 : 4400;
    for (let i = 0; i < nG; i++) {
      const x = zi * ZW + rnd() * ZW, y = 60 + rnd() * (WH - 120);
      if (Math.abs(y - pathY(x)) < 62 || inPlot(x, y) || (rv && x > rv.x0 - 30 && x < rv.x1 + 30)) continue;
      grassItems.push({ kind: 'g', x, y, s: 0.8 + rnd() * 0.9, rot: rnd() * 6.28 });
    }
    const nF = Math.round(th.flower * 26);
    for (let i = 0; i < nF; i++) {
      const x = zi * ZW + rnd() * ZW, y = 60 + rnd() * (WH - 120);
      if (Math.abs(y - pathY(x)) < 62 || inPlot(x, y) || (rv && x > rv.x0 - 30 && x < rv.x1 + 30)) continue;
      flowerItems.push({ d: { kind: 'f', x, y, s: 0.8 + rnd() * 0.5, rot: 0 }, c: colors[Math.floor(rnd() * 5)] });
    }
  });
  const gm = toon({ vertexColors: true, side: THREE.DoubleSide });
  const grass = instanced(tuft, wind(gm, 0.25, 0.0), grassItems, 1, false);
  grass.castShadow = false;
  g.add(grass);

  if (flowerItems.length) {
    const stemG = new THREE.CylinderGeometry(0.012, 0.014, 0.36, 4);
    stemG.translate(0, 0.18, 0);
    const stems = instanced(stemG, toon({ color: '#4a9a50' }), flowerItems.map((f) => f.d), 1, false);
    const headG = new THREE.SphereGeometry(0.085, 7, 5);
    headG.translate(0, 0.38, 0);
    const heads = instanced(headG, toon({}), flowerItems.map((f) => f.d), 1, false);
    flowerItems.forEach((f, i) => heads.setColorAt(i, f.c));
    g.add(stems, heads);
  }
  return g;
}
