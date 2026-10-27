import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Em `npm run dev`, serve as funções de /api do mesmo jeito que a Vercel. */
function apiDev(): Plugin {
  return {
    name: 'forma-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const path = new URL(req.url, 'http://localhost').pathname;
        const file = resolve(`.${path}.ts`);
        if (path.includes('/_') || !existsSync(file)) return next();
        try {
          const mod = await server.ssrLoadModule(file);
          const handler = mod[req.method || 'GET'];
          if (!handler) { res.statusCode = 405; return res.end(); }
          const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers as Record<string, string> });
          const r: Response = await handler(request);
          res.statusCode = r.status;
          r.headers.forEach((v, k) => { if (k !== 'set-cookie') res.setHeader(k, v); });
          const cookies = r.headers.getSetCookie();
          if (cookies.length) res.setHeader('set-cookie', cookies);
          res.end(Buffer.from(await r.arrayBuffer()));
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          res.statusCode = 500;
          res.end(String(err));
        }
      });
    },
  };
}

// `npm run build:single` gera um único index.html (usado para prévias).
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDev(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  base: mode === 'single' ? './' : '/',
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', chunkSizeWarningLimit: 2000 },
}));
