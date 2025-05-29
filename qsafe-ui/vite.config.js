import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'wasm-dilithium': fileURLToPath(
        new URL('../packages/wasm-dilithium/dist/index.js', import.meta.url)
      ),
    },
  },
});
