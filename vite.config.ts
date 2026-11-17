import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // The Vite dev server must never be exposed to untrusted networks.
    host: '127.0.0.1',
    strictPort: true,
    fs: { strict: true },
  },
});
