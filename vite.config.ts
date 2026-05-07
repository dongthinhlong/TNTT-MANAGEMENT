import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Ensure roll-up doesn't fail on external dependencies if using CDN
    rollupOptions: {
      external: [], 
    }
  },
  server: {
    port: 3000,
    host: true,
  }
});