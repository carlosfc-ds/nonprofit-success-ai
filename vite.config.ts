import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Forward API calls to the ProPublica proxy (server.ts, `npm run server`).
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.SEARCH_PROXY_PORT || 3001}`,
          changeOrigin: true,
        },
      },
      watch: {
        // OneDrive intermittently locks this file (cloud sync/placeholder), which
        // crashes chokidar's Windows fs watcher with an uncaught EBUSY error.
        ignored: ['**/files.zip'],
      },
    },
  };
});
