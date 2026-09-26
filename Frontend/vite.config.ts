import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
          secure: false,
          timeout: 30_000,
          proxyTimeout: 30_000,
          followRedirects: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.error('[vite] /api proxy error:', err.message)
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    detail: `Backend unreachable at ${apiTarget}. Is Django 'manage.py runserver 0.0.0.0:8000' running?`,
                  })
                )
              }
            })
          },
        },
      },
    },
    build: {
      sourcemap: mode !== 'production',
    },
  }
})
