/**
 * Skalenstriche für Zahlenstrahl und Rechenstrich: jede Einheit ein kleiner Strich, jede 5. etwas länger, jede 10. am längsten.
 * Bei kurzen Strecken (bis 120) ist die Einheit 1, bei langen (z. B. 0–1000) sind es Zehner (kleiner Strich), Fünfziger (mittel) und Hunderter (lang).
 */
const NS = 'http://www.w3.org/2000/svg';

export function drawScale(parent: Element, x: (n: number) => number, lo: number, hi: number, y: number, color = '#3b2a1e') {
  const span = hi - lo;
  const unit = span <= 120 ? 1 : span <= 1200 ? 10 : 100;
  const g = document.createElementNS(NS, 'g');
  for (let n = Math.ceil(lo / unit) * unit; n <= hi; n += unit) {
    const tenth = n % (unit * 10) === 0, fifth = n % (unit * 5) === 0;
    const half = tenth ? 16 : fifth ? 11 : 6;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', String(x(n))); l.setAttribute('x2', String(x(n)));
    l.setAttribute('y1', String(y - half)); l.setAttribute('y2', String(y + half));
    l.setAttribute('stroke', color); l.setAttribute('stroke-linecap', 'round');
    l.setAttribute('stroke-width', tenth ? '4' : fifth ? '3.2' : '2');
    l.setAttribute('opacity', tenth ? '1' : fifth ? '0.9' : '0.7');
    g.append(l);
  }
  parent.append(g);
}
