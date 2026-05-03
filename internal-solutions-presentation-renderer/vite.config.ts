import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Renderer service — port 5014 (Docker host); 4500 in container/dev.
// Reads PresentationPayload from HiC proxy at PROXY_URL.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 4500,
      host: '0.0.0.0',
      strictPort: false,
    },
    plugins: [react()],
    define: {
      // The proxy URL — defaults to localhost:5012 in dev, set via env in Docker.
      'process.env.PROXY_URL': JSON.stringify(env.PROXY_URL || 'http://localhost:5012'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Bridge: import HiC's slideTemplate renderers from the sibling project.
        // Iteration 2 will use this alias to mount theme-cluster, persona-card,
        // service-blueprint etc. inside section components.
        '@hic-templates': path.resolve(__dirname, '../humans-in-control-research/components/slideTemplates'),
      },
    },
  };
});
