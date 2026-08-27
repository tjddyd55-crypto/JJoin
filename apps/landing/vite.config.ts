import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@jjoin/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@jjoin/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
    },
  },
  server: { port: 4173 },
  preview: { port: 4173 },
});
