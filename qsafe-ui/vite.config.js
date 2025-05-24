import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ──────────────────────────────────────────────────────────────
// Polyfill Node globals + core modules so @noble/* works in Vite
// ──────────────────────────────────────────────────────────────
import { NodeGlobalsPolyfillPlugin }  from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin }  from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
  plugins: [react()],

  /* Tell Vite/ESBuild to inject Buffer, process, and stub core libs */
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({ buffer: true, process: true }),
        NodeModulesPolyfillPlugin()
      ]
    }
  },

  server: { port: 5173 }
});
