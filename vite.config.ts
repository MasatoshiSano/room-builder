import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group three + r3f + drei + three-stdlib together to avoid the
            // circular-chunk warning (drei imports three internally).
            if (
              id.includes('three') ||
              id.includes('@react-three') ||
              id.includes('three-stdlib')
            ) {
              return 'three';
            }
            if (id.includes('@serendie')) return 'serendie';
            if (
              id.includes('zustand') ||
              id.includes('zundo') ||
              id.includes('idb')
            ) {
              return 'state';
            }
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
