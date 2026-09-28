import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');

  // Origin of the Laravel API. Used to proxy same-origin requests during dev
  // so the app can keep calling relative "/api" paths.
  const apiTarget = env.DEV_API_TARGET || 'http://localhost:8000';

  return {
    define: {
      __DEV_RUN_ID__: JSON.stringify(Date.now()),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/broadcasting': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/storage': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
