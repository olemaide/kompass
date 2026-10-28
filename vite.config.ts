import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
  server: {
    port: 5188,
    proxy: { '/api': { target: 'http://127.0.0.1:4747', headers: { host: '127.0.0.1:4747' } } },
  },
});
