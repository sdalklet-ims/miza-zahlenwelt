// PWA-Test mit Chrome (headless): Service Worker, Offline-Start (Server wird dazwischen beendet), Spielstand, Screenshots.
// Aufruf: node tools/pwa-test.mjs   (setzt voraus: npm run build:pages)
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8091, DBG = 9333, URL0 = `http://localhost:${PORT}/`;
mkdirSync('test-out', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', ['tools/serve.mjs', 'docs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const chrome = spawn(CHROME, [`--remote-debugging-port=${DBG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'mia-chrome-'))}`, '--headless=new', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
let ok = true;
const check = (name, cond, extra = '') => { console.log((cond ? 'OK   ' : 'FEHLER ') + name + (extra ? ' – ' + extra : '')); if (!cond) ok = false; };

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* noch nicht bereit */ }
    await sleep(500);
  }
  throw new Error('Chrome nicht erreichbar');
}
const ws = new WebSocket(await connect());
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.text; };
const shot = async (name, w, h) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`test-out/${name}.png`, Buffer.from(r.result.data, 'base64'));
};

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL0 });
  await sleep(6000);
  const sw = await ev(`(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active})()`);
  check('Service Worker aktiv', sw === true);
  await sleep(4000);
  const n = await ev(`(async()=>{const k=await caches.keys();return k.length?(await (await caches.open(k[0])).keys()).length:0})()`);
  check('Dateien im Cache', n > 10, n + ' Dateien');
  // Spielstand: schreiben, neu laden, lesen
  await ev(`(()=>{const p=JSON.parse(localStorage.getItem('mia.progress.v1')||'{}');p.coins=77;localStorage.setItem('mia.progress.v1',JSON.stringify(p));return 1})()`);
  await send('Page.reload'); await sleep(4000);
  check('Spielstand bleibt nach Neuladen', (await ev(`JSON.parse(localStorage.getItem('mia.progress.v1')).coins`)) === 77);
  // Screenshots (Start-Bildschirm)
  await shot('ipad-quer-1180x820', 1180, 820);
  await shot('ipad-hoch-820x1180', 820, 1180);
  // Offline: Server beenden, neu laden
  server.kill();
  try { execSync(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`); } catch { /* egal */ }
  await sleep(1500);
  const down = await fetch(URL0).then(() => false).catch(() => true);
  check('Server ist aus', down);
  await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL0 });
  await sleep(7000);
  const title = await ev('document.title'), kids = await ev(`document.getElementById('stage')?.children.length`);
  check('Offline-Start lädt die Seite', title === 'Mia und die Zahlenwelt' && kids > 0, `Titel "${title}", ${kids} Ebenen`);
  check('Spielstand offline vorhanden', (await ev(`JSON.parse(localStorage.getItem('mia.progress.v1')).coins`)) === 77);
  await shot('offline-quer-1180x820', 1180, 820);
} catch (e) { console.log('FEHLER', e); ok = false; }
ws.close(); chrome.kill(); server.kill();
console.log(ok ? 'ALLES OK' : 'ES GIBT FEHLER');
process.exit(ok ? 0 : 1);
