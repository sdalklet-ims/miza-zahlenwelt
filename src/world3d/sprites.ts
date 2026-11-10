/**
 * 2,5D-Figuren: gezeichnete Comic-Sprites, die senkrecht in der 3D-Welt stehen.
 * Die feste Kamera schaut schräg von oben; die Sprites werden senkrecht um 1/cos(Neigung) gestreckt,
 * damit sie auf dem Bildschirm unverzerrt aussehen (wie in klassischen 2,5D-Spielen).
 */
import * as THREE from 'three';
import { BASE, CANVAS_H, CANVAS_W, CELL_H, MiaAnimator, type Facing, type RideKind } from './miaAnim';

export const PITCH = (40 * Math.PI) / 180;
export const SPR_Y = 1 / Math.cos(PITCH);

export interface Billboard { group: THREE.Group; mesh: THREE.Mesh; shadow: THREE.Mesh }

function shadowBlob(rx: number, rz: number) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#1b3a14', transparent: true, opacity: 0.28, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.y = 0.04;
  m.renderOrder = 1;
  return m;
}

const spriteMat = (tex: THREE.Texture) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, toneMapped: false });

export function billboard(tex: THREE.Texture, w: number, h: number, anchorUp = 0): Billboard {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2 - anchorUp, 0);
  const mesh = new THREE.Mesh(g, spriteMat(tex));
  mesh.scale.y = SPR_Y;
  const group = new THREE.Group();
  const shadow = shadowBlob(w * 0.34, w * 0.14);
  group.add(shadow, mesh);
  return { group, mesh, shadow };
}

const texCache = new Map<string, Promise<THREE.CanvasTexture>>();
/** SVG-Text → scharfe Textur */
export function svgTexture(svg: string, pxH = 360): Promise<THREE.CanvasTexture> {
  let p = texCache.get(svg);
  if (!p) {
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
    const aspect = vb ? Number(vb[1]) / Number(vb[2]) : 1;
    const pxW = Math.round(pxH * aspect);
    const sized = svg.replace(/^<svg([^>]*)>/, (_m, a: string) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} width="${pxW}" height="${pxH}">`);
    p = new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = pxW; cv.height = pxH;
        cv.getContext('2d')!.drawImage(im, 0, 0, pxW, pxH);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        res(t);
      };
      im.onerror = () => res(new THREE.CanvasTexture(document.createElement('canvas')));
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    });
    texCache.set(svg, p);
  }
  return p;
}

export function aspectOf(svg: string) {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return vb ? Number(vb[1]) / Number(vb[2]) : 1;
}

/** Figur aus SVG: Höhe in Welt-Einheiten */
export async function svgFigure(svg: string, height: number): Promise<Billboard> {
  const tex = await svgTexture(svg);
  return billboard(tex, height * aspectOf(svg), height);
}

/* ───────── Mia (gezeichnete Grafiken, siehe miaAnim.ts) ───────── */
export interface MiaSprite {
  group: THREE.Group;
  /** dt in Sekunden; speed 0..1 (1 = normales Laufen) */
  update(dt: number, speed: number, dir: Facing, sleep?: boolean, ride?: RideKind, wind?: number): void;
  /** angelegte Mia-Items (Mütze, Brille, Regencape) */
  setAccessories(acc: string[]): void;
  /** Freude-Animation (celebrate) */
  celebrate(): void;
  setHidden(h: boolean): void;
}

/** Höhe des Sprites in Welt-Einheiten: sitzende Mia ≈ 1,75 hoch (wie bisher) */
const MIA_UNITS = 1.87;

export function createMiaSprite(acc: string[] = []): MiaSprite {
  const cv = document.createElement('canvas');
  cv.width = CANVAS_W; cv.height = CANVAS_H;
  const c = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const k = MIA_UNITS / 320; // Welt-Einheiten je Bildpunkt (wie vorher, jetzt mit Platz für Mütze und Kapuze)
  const H = CANVAS_H * k, W = CANVAS_W * k, up = (CELL_H - BASE) * k;
  const bb = billboard(tex, W, H, up);
  // Silhouette: erscheint nur, wo Mia hinter etwas steht
  const sil = new THREE.Mesh(bb.mesh.geometry, new THREE.MeshBasicMaterial({ map: tex, color: '#ffcf80', transparent: true, opacity: 0.45, alphaTest: 0.04, depthFunc: THREE.GreaterDepth, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  sil.scale.y = SPR_Y;
  sil.renderOrder = 20;
  bb.group.add(sil);
  const anim = new MiaAnimator();
  anim.setAccessories(acc);
  return {
    setAccessories: (a) => anim.setAccessories(a),
    group: bb.group,
    celebrate: () => anim.celebrate(),
    setHidden: (h) => void (bb.group.visible = !h),
    update(dt, speed, dir, sleep, ride, wind) {
      anim.draw(c, dt, { dir, speed, sleep, ride, wind });
      tex.needsUpdate = true;
    },
  };
}
