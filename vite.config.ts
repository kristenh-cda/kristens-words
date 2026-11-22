import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function versionServiceWorker(): Plugin {
  let outputDirectory = '';

  return {
    name: 'version-service-worker',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const indexPath = resolve(outputDirectory, 'index.html');
      const serviceWorkerPath = resolve(outputDirectory, 'sw.js');
      const [indexHtml, serviceWorker] = await Promise.all([
        readFile(indexPath, 'utf8'),
        readFile(serviceWorkerPath, 'utf8'),
      ]);
      const revision = createHash('sha256').update(indexHtml).digest('hex').slice(0, 12);
      const marker = '__APP_BUILD_REVISION__';

      if (!serviceWorker.includes(marker)) {
        throw new Error('Could not find the app build revision marker in the service worker.');
      }

      await writeFile(serviceWorkerPath, serviceWorker.replace(marker, revision));
    },
  };
}

export default defineConfig({
  plugins: [react(), versionServiceWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
