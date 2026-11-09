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

/**
 * 2026-10-30 (WS-0 S1/S2) - serve /config.json in dev the way nginx serves it in the
 * image: proxy base + the shared proxy token, read from the environment at request
 * time. Runtime configuration, never a build-time `define`, so no secret enters the
 * bundle. The token is read from the root workbench .env (one level up) or the process.
 */
function runtimeConfigPlugin(env: Record<string, string>): Plugin {
    return {
        name: 'hic-runtime-config',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url !== '/config.json') return next();
                // The research-proxy writes the live token here at its startup (proxy/app.py
                // _write_runtime_config). Fall back to the environment for a pinned token.
                let fromProxy: { proxyBase?: string; proxyToken?: string } = {};
                try {
                    const runtimePath = path.resolve(__dirname, 'hic-workspace', '.runtime', 'config.json');
                    if (fs.existsSync(runtimePath)) fromProxy = JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
                } catch { /* fall through to env */ }
                const body = {
                    proxyBase: process.env.VITE_PROXY_BASE || env.VITE_PROXY_BASE || fromProxy.proxyBase || 'http://127.0.0.1:5012',
                    proxyToken: process.env.PROXY_AUTH_TOKEN || env.PROXY_AUTH_TOKEN || fromProxy.proxyToken || '',
                };
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store');
                res.end(JSON.stringify(body));
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
      plugins: [react(), wikiStaticPlugin(), designMdPlugin(), runtimeConfigPlugin(env)],
      // 2026-10-30 (WS-0 S1) - NO provider key is defined into the bundle any more. The
      // browser reaches every provider through the proxy (services/genaiClient.ts,
      // services/proxyConfig.ts). `check:bundle-secrets` fails the build if a key-shaped
      // string ever appears in dist/ again.
      define: {
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
      // 2026-06-12 — chunk filenames are CONTENT-HASHED. This reverses the
      // 2026-05-12 "stable chunk names" decision, which caused the P0
      // "dual app boot" bug: an old tab revalidating an un-hashed chunk
      // after a Docker rebuild received the NEW build's chunk content,
      // whose static imports pulled in and executed the entire new entry
      // bundle — a second React app mounted at #root and silently reset
      // the user's in-flight session to the landing page. Nothing "failed"
      // (valid JS loaded), so neither ChunkLoadGuard nor AppErrorBoundary
      // could catch it.
      //
      // The contract now: unchanged source keeps the same hash, so an open
      // tab keeps loading unchanged chunks across rebuilds. A CHANGED chunk
      // gets a new URL, so the old tab 404s on it and ChunkLoadGuard shows
      // its designed banner (Save Session → Reload) instead of a silent
      // landing reset. index.html stays no-store (nginx.conf) so fresh page
      // loads always pull the latest entry. Hashed chunk URLs are safe to
      // cache long-term (nginx /assets/chunks/* policy may be immutable).
      build: {
        // 2026-06-06 — sourcemaps were enabled to diagnose a minified crash.
        // 2026-10-30 (WS-0 S1) — off for the served image: the 14.7 MB map shipped
        // the full source to every visitor. Set HIC_SOURCEMAP=1 for a local
        // diagnostic build.
        sourcemap: process.env.HIC_SOURCEMAP === '1',
        rollupOptions: {
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/chunks/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
      },
    };
});
