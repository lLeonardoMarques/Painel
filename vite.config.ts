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
      host: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy para resolver CORS com as APIs externas
      proxy: {
        // 🔥 AUTH - PRIMEIRO DA LISTA (mais específico)
        '/auth': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('❌ Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('🔄 [Proxy] Requisição:', req.method, req.url);
              // 🔥 HEADERS IMPORTANTES PARA O PROXY
              proxyReq.setHeader('Origin', 'http://10.210.1.242:8080');
              proxyReq.setHeader('Access-Control-Request-Method', 'POST');
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('🔄 [Proxy] Resposta:', proxyRes.statusCode, req.url);
              // 🔥 ADICIONA HEADERS CORS NA RESPOSTA
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, X-Requested-With';
            });
          },
        },

        // 🔥 REGISTRO
        '/registro': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('proxyRes', (proxyRes, _req, _res) => {
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            });
          },
        },

        // 🔥 NOVOS (do config 2)
        '/api/alertas': {
          target: 'http://10.210.2.131:3333',
          changeOrigin: true,
          secure: false,
        },
        '/api/resumo': {
          target: 'http://10.210.1.242:8090',
          changeOrigin: true,
          secure: false,
        },

        // 🔥 APIs específicas (do config 1)
        '/api/email': {
          target: 'http://10.210.2.92:3333',
          changeOrigin: true,
          secure: false,
        },
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

        // 🔥 API GENÉRICA - POR ÚLTIMO (fallback)
        '/api': {
          target: 'http://10.210.1.242:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});