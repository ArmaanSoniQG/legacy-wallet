import wasm    from '@rollup/plugin-wasm';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',

  // 🔑 test looks for dist/dilithium.js
  output: {
    file:    'dist/dilithium.js',
    format:  'esm',
    sourcemap: true,
  },

  plugins: [
    resolve(),
    wasm({ maxFileSize: 1_000_000, targetEnv: 'auto-inline' }),
  ],
};
