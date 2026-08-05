import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // ============================================================
      // 🔥 PROXY CORRIGIDO
      // ============================================================
      proxy: {
        // 🔥 E-MAIL: Aponta para o servidor de e-mail
        '/api/email': {
          target: 'http://10.210.2.92:3333',
          changeOrigin: true,
          secure: false,
        },
        // 🔥 BACKEND: Aponta para o servidor principal (metas, capacidades, etc)
        '/api/metas': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        },
        '/api/capacidades': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        },
        '/api/dashboard': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        },
        // 🔥 AUTH e REGISTRO: Apontam para o backend
        '/auth': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        },
        '/registro': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        },
        // 🔥 Fallback: Qualquer outra rota /api vai para o backend
        '/api': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        }
      }
    },
  };
});