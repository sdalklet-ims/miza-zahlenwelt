# Einmaliges Hilfsskript: sichtbare Markierung für den leeren Bauplatz.
def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


MARK = r"""

/** Markierung des Bauplatzes, solange noch nichts gebaut ist: Eckpfähle mit Fähnchen, Umrandung, Schild */
export function createPlotMarker(): THREE.Group {
  const g = new THREE.Group();
  const hx = 3.9, hz = 3.2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(at(cyl(0.06, 0.09, 1.3, '#a8693a', 6), sx * hx, 0.65, sz * hz));
    const f = cone(0.22, 0.5, '#e8504a', 3);
    f.rotation.set(0, 0, -Math.PI / 2);
    f.position.set(sx * hx + 0.25, 1.15, sz * hz);
    g.add(f);
  }
  const line = (w: number, d: number, x: number, z: number) => g.add(at(box(w, 0.05, d, '#fff6b0'), x, 0.04, z));
  line(2 * hx, 0.14, 0, -hz); line(2 * hx, 0.14, 0, hz); line(0.14, 2 * hz, -hx, 0); line(0.14, 2 * hz, hx, 0);
  const tex = canvasTex(320, 120, (c) => { c.fillStyle = '#c07b45'; c.fillRect(0, 0, 320, 120); c.strokeStyle = '#6a3f1c'; c.lineWidth = 8; c.strokeRect(4, 4, 312, 112); c.fillStyle = '#fff'; c.font = '900 44px ui-rounded, sans-serif'; c.textAlign = 'center'; c.fillText('Mias', 160, 52); c.fillText('Bauplatz', 160, 100); });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.1), [mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), mat('#6a3f1c'), toon({ map: tex }), mat('#8a5a2b')]);
  sign.position.set(0, 1.5, hz + 0.9);
  sign.castShadow = true;
  g.add(at(cyl(0.07, 0.09, 1.5, '#7a4d26', 6), 0, 0.75, hz + 0.9), sign);
  return g;
}
"""
sub('src/world3d/models.ts', lambda s: s + MARK)


def ws(s):
    s = s.replace("  let houseInside = false;\n  function syncHouse(animate: boolean) {\n    if (!plot) return;",
                  "  const plotMarker = M.createPlotMarker();\n  if (plot) { plotMarker.position.set(plot.x * S, heightAt(plot.x, plot.y), plot.y * S); scene.add(plotMarker); }\n  const plotName = h('div', { class: 'npc3-name' }, 'Mias Bauplatz');\n  const plotMark = h('div', { class: 'npc3-mark' }, '🏠');\n  labels.append(plotName, plotMark);\n  let houseInside = false;\n  function syncHouse(animate: boolean) {\n    if (!plot) return;\n    plotMarker.visible = !isBuilt('fundament');", 1)
    s = s.replace("    // Pfeil zum Haus, wenn es nicht im Bild ist", """    // Beschriftung des Bauplatzes (solange nichts gebaut ist)
    if (plot) {
      const empty = !isBuilt('fundament');
      v3.set(plot.x * S, 2.6, plot.y * S);
      const bp = stage.project(v3);
      const dd0 = Math.hypot(plot.x - st.x, plot.y - st.y);
      const on = empty && bp.x > -60 && bp.x < VW + 60 && bp.y > -40 && dd0 < 1100;
      plotMark.style.display = on ? '' : 'none';
      plotName.style.display = on && dd0 < 420 ? '' : 'none';
      plotMark.style.transform = `translate(${bp.x}px, ${bp.y - 6 + Math.sin(timeSec * 3) * 5}px) translate(-50%, -100%)`;
      plotName.style.transform = `translate(${bp.x}px, ${bp.y + 6}px) translate(-50%, 0)`;
    }

    // Pfeil zum Haus, wenn es nicht im Bild ist""", 1)
    return s


sub('src/world/worldScreen.ts', ws)
print('ok')
