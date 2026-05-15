import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    // Let Rollup decide chunking. Manual splits caused circular-import TDZ
    // errors at runtime (https://github.com/vitejs/vite/issues/14025).
  },
});
