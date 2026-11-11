# Einmaliges Hilfsskript: PWA-Feinschliff (Service Worker registrieren, Wake Lock, Tipp-Toleranz, Hochformat, Manifest)
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:50])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


MAIN_NEW = """// Offline-Start: Service Worker nur über https oder localhost; updateViaCache 'none', damit Updates sofort ankommen
if ('serviceWorker' in navigator && import.meta.env.PROD && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((r) => void r.update()).catch(() => {});
}
// Spielstand dauerhaft sichern lassen (Safari räumt ihn dann nicht so schnell weg)
void navigator.storage?.persist?.().catch(() => {});

// Bildschirm wach halten, solange das Spiel sichtbar ist
let wake: { release(): Promise<void> } | null = null;
async function keepAwake() {
  try {
    const nav = navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (nav.wakeLock && document.visibilityState === 'visible' && !wake) {
      wake = await nav.wakeLock.request('screen');
      (wake as unknown as EventTarget).addEventListener('release', () => (wake = null));
    }
  } catch { /* nicht verfügbar oder abgelehnt */ }
}
document.addEventListener('visibilitychange', () => void keepAwake());
document.addEventListener('pointerdown', () => void keepAwake(), { passive: true }); // iPad erlaubt es oft erst nach einer Berührung

// Zuverlässige Knöpfe: Wird ein Knopf getroffen, aber der Finger rutscht beim Loslassen bis ~24 px daneben
// (z. B. weil der Knopf beim Drücken schrumpft), löst trotzdem ein Tipp aus.
{
  const TOL = 24;
  let down: { el: HTMLButtonElement; x: number; y: number; id: number } | null = null;
  let lastClick = 0;
  document.addEventListener('click', () => (lastClick = performance.now()), true);
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element | null)?.closest?.('button') as HTMLButtonElement | null;
    down = el && !el.disabled ? { el, x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  }, true);
  document.addEventListener('pointerup', (e) => {
    const d = down;
    down = null;
    if (!d || d.id !== e.pointerId || !d.el.isConnected) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 40) return; // war eine Wischgeste
    const t0 = performance.now();
    setTimeout(() => {
      if (lastClick >= t0 - 5 || !d.el.isConnected) return; // ein normaler Klick kam an
      const r = d.el.getBoundingClientRect();
      if (e.clientX >= r.left - TOL && e.clientX <= r.right + TOL && e.clientY >= r.top - TOL && e.clientY <= r.bottom + TOL) d.el.click();
    }, 60);
  }, true);
}
"""

ed('src/main.ts', [("""if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
""", MAIN_NEW)])
ed('src/styles/base.css', [("@media (orientation: portrait) { #rotate { display: flex; } }\n", "/* Hochformat wird ebenfalls unterstützt (die Bühne wächst nach unten mit), daher keine Dreh-Aufforderung mehr */\n")])
ed('public/manifest.webmanifest', [('"display": "fullscreen",\n  "display_override": ["fullscreen", "standalone"],\n  "orientation": "landscape",', '"display": "standalone",\n  "orientation": "any",')])
ed('package.json', [('"preview": "vite preview --host",', '"preview": "vite preview --host",\n    "build:pages": "tsc --noEmit && vite build --outDir docs && node tools/after-pages.mjs",\n    "serve": "node tools/serve.mjs",')])
open('.gitignore', 'a', encoding='utf-8').write('\nspielstand-test.txt\ntest-out/\n.claude/\n')
print('ok')
