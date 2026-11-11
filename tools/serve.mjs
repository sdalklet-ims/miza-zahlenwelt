// Kleiner Server ohne Abhängigkeiten: liefert docs/ (oder einen anderen Ordner) aus und zeigt die Adresse fürs iPad im selben WLAN.
// Start: npm run serve   (vorher einmal: npm run build:pages)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';

const root = process.argv[2] ?? 'docs';
const port = Number(process.env.PORT ?? 8080);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.txt': 'text/plain' };

createServer(async (req, res) => {
  try {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[\\/])+/, '');
    let f = join(root, p);
    if ((await stat(f).catch(() => null))?.isDirectory()) f = join(f, 'index.html');
    const data = await readFile(f);
    res.writeHead(200, { 'Content-Type': types[extname(f)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('nicht gefunden');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Mia läuft: http://localhost:${port}`);
  for (const list of Object.values(networkInterfaces())) for (const n of list ?? []) if (n.family === 'IPv4' && !n.internal) console.log(`Am iPad im selben WLAN: http://${n.address}:${port}`);
});
