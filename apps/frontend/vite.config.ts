import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@schemapilot/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@schemapilot/schema-core': path.resolve(__dirname, '../../packages/schema-core/src/index.ts'),
      '@schemapilot/schema-validators': path.resolve(__dirname, '../../packages/schema-validators/src/index.ts'),
      '@schemapilot/sql-generators': path.resolve(__dirname, '../../packages/sql-generators/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
