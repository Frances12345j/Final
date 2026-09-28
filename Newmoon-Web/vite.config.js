import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');

  // Origin of the Laravel API. Used to proxy same-origin requests during dev
  // so the app can keep calling relative "/api" paths.
  const apiTarget = env.DEV_API_TARGET || 'http://localhost:8000';

  // Public path the build is served from. "/" is correct for the dev server and
  // for the root-domain deploy. A build served from a subdirectory (e.g.
  // http://localhost/Newmoon/Newmoon-Web/dist/) must set this, otherwise
  // index.html emits absolute /assets/* and /favicon.jpg URLs that 404 against
  // the web server root. Kept configurable so the subdirectory deploy does not
  // require editing source. Read from import.meta.env.BASE_URL by the router.
  const base = env.VITE_BASE_PATH || '/';

  // Interface the dev server binds to. Set DEV_HOST in .env to a single address
  // (e.g. the Wi-Fi IP the phone uses). Binding every interface with `true`
  // makes Vite print one "Network:" line per adapter, which is noise on a
  // multi-homed machine. Defaults to loopback when unset, which only breaks LAN
  // access, never the app itself.
  const devHost = env.DEV_HOST || '127.0.0.1';

  return {
    base,
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
      host: devHost,
      // Fail loudly on a busy port instead of silently moving to 5174, which
      // previously left several dev servers stacked up and serving stale code.
      strictPort: true,
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
