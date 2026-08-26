import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ? process.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'https://dhbackend-2.onrender.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL ? process.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'https://dhbackend-2.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
