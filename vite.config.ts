import { defineConfig, type Plugin } from 'vite';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Schreibt nach dem Build einen Service Worker mit der Liste aller Dateien (Offline-Betrieb). */
function swPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'mia-service-worker',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else {
            const rel = relative(outDir, full).split('\\').join('/');
            if (rel !== 'sw.js' && !rel.startsWith('audio/')) files.push(rel);
          }
        }
      };
      walk(outDir);
      const tpl = readFileSync('tools/sw.template.js', 'utf8')
        .replace('__FILES__', JSON.stringify(files))
        .replace('__VERSION__', String(Date.now()));
      writeFileSync(join(outDir, 'sw.js'), tpl);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [swPlugin()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020' },
});
