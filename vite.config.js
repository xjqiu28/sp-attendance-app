import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes built asset paths relative, so the site works
// whether it's served from the domain root or from a GitHub Pages
// project subpath (https://username.github.io/repo-name/) without
// needing to hardcode the repo name here.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      // Lets any file, however deeply nested, reach another one with
      // '@/...' from the src root instead of counting '../../..'.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  // Vitest (`npm test`): components render into jsdom; stylesheet
  // imports are stubbed out, since tests only check behavior/markup.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
