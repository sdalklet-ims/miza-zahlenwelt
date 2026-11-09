/** Drag and Drop per Pointer Events (Touch + Maus). Die Bühne ist skaliert, daher rechnen wir in Bühnen-Pixeln. */
import { getScale, layers } from './stage';

export interface DragOpts {
  el: HTMLElement;
  /** Mögliche Ablageflächen (werden bei jedem Zug neu abgefragt) */
  targets: () => HTMLElement[];
  /** Ziel oder null (daneben losgelassen) */
  onDrop: (target: HTMLElement | null) => void;
  onTap?: () => void;
}

export function makeDraggable(o: DragOpts) {
  const { el } = o;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button > 0) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetische Events */ }
    const sx = e.clientX, sy = e.clientY;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let over: HTMLElement | null = null;

    const place = (cx: number, cy: number) => {
      if (!ghost) return;
      const r = layers.stage.getBoundingClientRect();
      const sc = getScale();
      ghost.style.left = (cx - r.left) / sc - ghost.offsetWidth / 2 + 'px';
      ghost.style.top = (cy - r.top) / sc - ghost.offsetHeight / 2 - 24 + 'px';
    };
    const hit = (cx: number, cy: number) =>
      o.targets().find((t) => {
        const b = t.getBoundingClientRect();
        return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
      }) ?? null;

    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
        dragging = true;
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.classList.add('drag-ghost');
        ghost.style.width = el.offsetWidth + 'px';
        ghost.style.height = el.offsetHeight + 'px';
        layers.overlay.append(ghost);
        el.classList.add('dragging');
      }
      if (dragging) {
        place(ev.clientX, ev.clientY);
        const t = hit(ev.clientX, ev.clientY);
        if (t !== over) {
          over?.classList.remove('drop-hover');
          t?.classList.add('drop-hover');
          over = t;
        }
      }
    };
    const end = (ev: PointerEvent, cancelled: boolean) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
      try { el.releasePointerCapture(ev.pointerId); } catch { /* egal */ }
      over?.classList.remove('drop-hover');
      ghost?.remove();
      el.classList.remove('dragging');
      if (dragging) o.onDrop(cancelled ? null : hit(ev.clientX, ev.clientY));
      else if (!cancelled) o.onTap?.();
    };
    const up = (ev: PointerEvent) => end(ev, false);
    const cancel = (ev: PointerEvent) => end(ev, true);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
  });
}
