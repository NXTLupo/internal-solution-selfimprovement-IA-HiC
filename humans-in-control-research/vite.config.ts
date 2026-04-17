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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), wikiStaticPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
