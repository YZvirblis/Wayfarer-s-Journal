import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = `http://127.0.0.1:${process.env.WJ_PORT ?? 4777}`;

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 4778,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
});
