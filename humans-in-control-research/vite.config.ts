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
      },
      // 2026-06-08 — Emit ASCII-escaped JS (non-ASCII -> \uXXXX) so glyphs never
      // mojibake at serve time regardless of Content-Type charset. Fixes the
      // garbled button icons ("Â—§ REASONING") that appeared because the served
      // bundle's raw UTF-8 glyph bytes were mis-decoded. (Emoji are separately
      // BANNED and stripped from the UI per the no-emoji rule.)
      esbuild: { charset: 'ascii' },
      // 2026-05-12 — stable chunk names to survive Docker rebuilds while
      // a tab is open. Without this, every rebuild rotates the content
      // hashes on ~85 dynamic-import chunks (prototypeBuilder, sessionService,
      // exportService, prototypeLibrary, etc.) and the open tab 404s the
      // moment the user fires #proto / #presentation / Save Session.
      //
      // The main entry bundle KEEPS its content hash (so cache-busting on
      // the index works), and the index.html is served with no-store
      // (see nginx.conf) so every page load pulls the latest entry. But
      // child chunks now have stable URLs (no hash) — same source → same
      // URL across rebuilds — so an in-flight tab can keep loading
      // unchanged chunks even after a rebuild swapped the entry hash.
      //
      // Paired with nginx.conf — /assets/chunks/* has must-revalidate so
      // when a chunk's content DOES change, the browser picks it up on
      // the next request instead of serving the cached stale version.
      build: {
        // 2026-06-06 — sourcemaps enabled to diagnose the recurring
        // "Cannot read properties of undefined (reading '0')" crash in
        // production-bundled minified code. Successor agent: with
        // sourcemaps on, the AppErrorBoundary stack will show real
        // component + source-file names instead of `eWe`/`tWe` minified
        // symbols. After the crash source is identified and fixed,
        // consider toggling back to false for smaller bundles.
        sourcemap: true,
        rollupOptions: {
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/chunks/[name].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
      },
    };
});
