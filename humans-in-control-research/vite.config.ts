import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

/**
 * Vite plugin to serve wiki markdown files from hic-workspace/wiki/
 * at the /hic-workspace/wiki/ URL path. Used by wikiService.ts to
 * load framework specs, anti-patterns, benchmarks, and brand standards.
 */
function wikiStaticPlugin(): Plugin {
    return {
        name: 'wiki-static-server',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                // Serve hic-workspace files (wiki markdown + skill-manifest.json)
                if (req.url && req.url.startsWith('/hic-workspace/')) {
                    const relativePath = req.url.replace('/hic-workspace/', '');
                    const filePath = path.resolve(__dirname, 'hic-workspace', relativePath);
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        const ext = path.extname(filePath).toLowerCase();
                        const contentType = ext === '.json' ? 'application/json' : 'text/markdown; charset=utf-8';
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        fs.createReadStream(filePath).pipe(res);
                        return;
                    }
                }
                // Serve Agent Skill files from .claude/skills/
                if (req.url && req.url.startsWith('/skills/')) {
                    const relativePath = req.url.replace('/skills/', '');
                    const filePath = path.resolve(__dirname, '..', '.claude', 'skills', relativePath);
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        fs.createReadStream(filePath).pipe(res);
                        return;
                    }
                }
                next();
            });
        },
    };
}

/**
 * Vite plugin to serve humans-in-control-research/DESIGN.md at the /DESIGN.md
 * URL path in dev. In production the Dockerfile copies DESIGN.md into nginx's
 * static root. Consumed by design-desk/services/designMdLoader.ts.
 */
function designMdPlugin(): Plugin {
    return {
        name: 'design-md-server',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url !== '/DESIGN.md') return next();
                const file = path.resolve(__dirname, 'DESIGN.md');
                if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    fs.createReadStream(file).pipe(res);
                    return;
                }
                next();
            });
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Docker on Windows — inotify events don't propagate through WSL2
        // volume mounts, so HMR silently fails and a stale bundle is served.
        // Polling guarantees file-change detection at the cost of a bit of CPU.
        watch: {
          usePolling: true,
          interval: 500,
        },
      },
      plugins: [react(), wikiStaticPlugin(), designMdPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.DESIGN_DESK_ENABLED': JSON.stringify(env.VITE_DESIGN_DESK_ENABLED || 'true'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
