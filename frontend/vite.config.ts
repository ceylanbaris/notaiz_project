import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    headers: {
      // Allow Google OAuth popup to post back to this window
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    // Dev proxy — üretimde VITE_API_URL kullanılır, bu blok build'e dahil edilmez
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
});
