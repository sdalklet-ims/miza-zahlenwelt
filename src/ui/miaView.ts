/**
 * Mia als bewegtes Bild in Menüs (Aufgaben-Bildschirm, Karte, Startseite): dieselben Grafiken und Animationen wie in der Welt.
 * Die Schleife läuft nur, solange das Element im Dokument hängt.
 */
import { h } from '../core/dom';
import { CANVAS_H, CANVAS_W, CELL_H, MiaAnimator, loadMia, portraitImg, type Face, type Facing } from '../world3d/miaAnim';
import { equippedFor } from '../core/rewards';

export interface MiaView {
  el: HTMLElement;
  /** Ausdruck: happy = celebrate + fröhliches Porträt, think/sad/surprised = Porträt neben Mia, neutral = ruhig stehen */
  setFace(f: Face): void;
  setMoving(on: boolean): void;
  setDir(d: Facing): void;
  celebrate(): void;
}

export function createMiaView(opts: { height: number; portrait?: boolean; dir?: Facing; cls?: string }): MiaView {
  const cv = h('canvas', { class: 'mia-cv', width: CANVAS_W, height: CANVAS_H }) as HTMLCanvasElement;
  const ch = (opts.height * CANVAS_H) / CELL_H; // Mia selbst bleibt opts.height hoch, dazu Platz für Mütze
  cv.style.height = ch + 'px';
  cv.style.width = (ch * CANVAS_W) / CANVAS_H + 'px';
  cv.style.marginTop = -(ch - opts.height) + 'px';
  const bubble = h('div', { class: 'mia-portrait off' });
  const el = h('div', { class: 'mia-view ' + (opts.cls ?? '') }, cv, opts.portrait === false ? null : bubble);
  const ctx = cv.getContext('2d')!;
  const anim = new MiaAnimator();
  let moving = false, dir: Facing = opts.dir ?? 'right', face: Face = 'neutral', hideT = 0;
  let last = performance.now(), raf = 0;

  const showPortrait = (f: Face, secs: number) => {
    const p = portraitImg(f);
    if (!p || !p.src) return;
    bubble.replaceChildren(h('img', { src: p.src, alt: '' }));
    bubble.classList.remove('off');
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    hideT = secs;
  };

  const loop = (now: number) => {
    if (!el.isConnected && now - last > 3000) return; // abgebaut: Schleife beenden
    const dt = (now - last) / 1000;
    last = now;
    anim.draw(ctx, dt, { dir, speed: moving ? 0.7 : 0, acc: equippedFor('mia') });
    if (hideT > 0) { hideT -= dt; if (hideT <= 0 && face !== 'think' && face !== 'sad') bubble.classList.add('off'); }
    raf = requestAnimationFrame(loop);
  };
  void loadMia().then(() => { last = performance.now(); raf = requestAnimationFrame(loop); });
  void raf;

  return {
    el,
    setFace(f) {
      face = f;
      if (f === 'happy') { anim.celebrate(); showPortrait('happy', 2.4); }
      else if (f === 'think') showPortrait('think', 99);
      else if (f === 'sad' || f === 'surprised') showPortrait(f, 2.4);
      else bubble.classList.add('off');
    },
    setMoving(on) { moving = on; },
    setDir(d) { dir = d; },
    celebrate() { anim.celebrate(); },
  };
}
