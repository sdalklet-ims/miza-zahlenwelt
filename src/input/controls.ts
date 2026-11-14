/**
 * Steuerung: Gelaufen wird mit dem Finger auf der Welt (siehe worldScreen: halten = folgen). Hier: Pfoten-Knopf rechts unten (kontextabhängig).
 * Der frühere Joystick wird nicht mehr angezeigt (Code bleibt für Tests).
 * Jedes Bedienelement verfolgt seinen eigenen Pointer → Multi-Touch geht.
 * Zusätzlich Tastatur (Pfeile/WASD, Leertaste/E) zum Testen am Rechner.
 */
import { h } from '../core/dom';

export interface Controls {
  el: HTMLElement;
  /** Bewegungsvektor, Länge 0..1 */
  vec: () => { x: number; y: number };
  /** Zeigt den Aktionsknopf mit Symbol und Beschriftung; null = ausblenden */
  setAction: (label: string | null, icon?: string) => void;
  dispose: () => void;
}

export function createControls(onAction: () => void): Controls {
  let jx = 0, jy = 0;
  const keys = new Set<string>();

  const knob = h('div', { class: 'joy-knob' });
  const base = h('div', { class: 'joy-base', 'aria-label': 'Joystick' }, h('div', { class: 'joy-ring' }), knob);
  let joyId: number | null = null;
  const joyMove = (e: PointerEvent) => {
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const reach = r.width * 0.36;
    let dx = (e.clientX - cx) / reach, dy = (e.clientY - cy) / reach;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    knob.style.transform = `translate(${dx * 38}%, ${dy * 38}%)`;
    const dead = 0.14;
    const mag = Math.min(1, m);
    if (mag < dead) { jx = jy = 0; return; }
    const k = (mag - dead) / (1 - dead);
    jx = (dx / (m || 1)) * k;
    jy = (dy / (m || 1)) * k;
  };
  const joyEnd = (e: PointerEvent) => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    jx = jy = 0;
    knob.style.transform = '';
    base.classList.remove('active');
  };
  base.addEventListener('pointerdown', (e) => {
    if (joyId != null) return;
    e.preventDefault();
    joyId = e.pointerId;
    try { base.setPointerCapture(e.pointerId); } catch { /* egal */ }
    base.classList.add('active');
    joyMove(e);
  });
  base.addEventListener('pointermove', (e) => e.pointerId === joyId && joyMove(e));
  base.addEventListener('pointerup', joyEnd);
  base.addEventListener('pointercancel', joyEnd);

  const actIcon = h('span', { class: 'act-icon' }, '🐾');
  const actLabel = h('span', { class: 'act-label' });
  const act = h('button', { class: 'act-btn off', 'aria-label': 'Aktion' }, actIcon, actLabel);
  act.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    act.classList.add('down');
    onAction();
  });
  const up = () => act.classList.remove('down');
  act.addEventListener('pointerup', up);
  act.addEventListener('pointercancel', up);
  act.addEventListener('pointerleave', up);

  const kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'e') { if (!e.repeat) onAction(); e.preventDefault(); return; }
    keys.add(k);
  };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  return {
    el: h('div', { class: 'controls' }, act), // der runde Joystick ist weg: gelaufen wird mit dem Finger auf der Welt (halten = folgen)
    vec() {
      let x = jx, y = jy;
      if (!x && !y) {
        x = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
        y = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
        const m = Math.hypot(x, y);
        if (m > 1) { x /= m; y /= m; }
      }
      return { x, y };
    },
    setAction(label, icon = '🐾') {
      act.classList.toggle('off', label == null);
      if (label != null) {
        actIcon.textContent = icon;
        actLabel.textContent = label;
      }
    },
    dispose() {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    },
  };
}
