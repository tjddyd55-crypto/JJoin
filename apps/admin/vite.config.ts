import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      // Source ESM for Vite; package main is CJS for Nest.
      '@jjoin/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@jjoin/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
    },
  },
});
