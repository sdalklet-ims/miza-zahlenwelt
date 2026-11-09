/** Kleines Partikelsystem (Funken, Staub, Glitzer) als Punktwolke mit eigenem Shader (Größe und Transparenz je Teilchen). */
import * as THREE from 'three';

const MAX = 400;

export class Particles {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private max = new Float32Array(MAX);
  private base = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private n = 0;
  private geo = new THREE.BufferGeometry();

  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setDrawRange(0, 0);
    this.points = new THREE.Points(
      this.geo,
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        vertexShader: 'attribute float aSize; attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC; void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * (420.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.15, d)); }',
      })
    );
    this.points.frustumCulled = false;
  }

  add(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: string, gravity = 0) {
    if (this.n >= MAX) return;
    const i = this.n++, c = new THREE.Color(color);
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.col.set([c.r, c.g, c.b], i * 3);
    this.life[i] = this.max[i] = life;
    this.base[i] = size;
    this.grav[i] = gravity;
  }

  update(dt: number) {
    for (let i = this.n - 1; i >= 0; i--) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // letztes Teilchen in die Lücke ziehen
        const l = --this.n;
        if (i !== l) {
          for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[l * 3 + k]; this.vel[i * 3 + k] = this.vel[l * 3 + k]; this.col[i * 3 + k] = this.col[l * 3 + k]; }
          this.life[i] = this.life[l]; this.max[i] = this.max[l]; this.base[i] = this.base[l]; this.grav[i] = this.grav[l];
        }
        continue;
      }
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
    }
    for (let i = 0; i < this.n; i++) {
      const a = this.life[i] / this.max[i];
      this.alpha[i] = Math.min(1, a * 1.6);
      this.size[i] = this.base[i] * (0.6 + a * 0.6);
    }
    const g = this.geo;
    g.setDrawRange(0, this.n);
    for (const k of ['position', 'aColor', 'aSize', 'aAlpha']) (g.attributes[k] as THREE.BufferAttribute).needsUpdate = true;
  }
}
