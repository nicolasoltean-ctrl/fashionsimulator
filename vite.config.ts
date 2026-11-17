import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { apiMiddleware } from './server/proxy.ts';

// The import proxy (/api/*) is mounted into both the dev and preview servers,
// so `npm run dev` is all that is needed to run the whole app.
export default defineConfig({
  // Relative asset paths, so the build also works under a sub-path (GitHub Pages).
  base: './',
  plugins: [
    react(),
    {
      name: 'atelier-api',
      configureServer(server) {
        server.middlewares.use(apiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(apiMiddleware());
      },
    },
  ],
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
