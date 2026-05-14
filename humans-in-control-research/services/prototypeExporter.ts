/**
 * prototypeExporter.ts — 2026-05-14
 *
 * Bundles a built prototype into a runnable, downloadable .zip with:
 *   - src/App.jsx (the generated prototype code)
 *   - src/main.jsx (React 18 entry)
 *   - src/index.css (minimal NXT-brand defaults)
 *   - index.html (Vite-style)
 *   - package.json (React + Vite deps)
 *   - vite.config.js
 *   - README.md (engagement metadata + how to run)
 *   - brief.json (the original ProductBrief, if available)
 *   - critique.json (Stage 5 audit, if available)
 *
 * Output: a single .zip the researcher can `npm install && npm run dev`
 * locally — fully detached from HiC.
 */

import JSZip from 'jszip';

export interface PrototypeExportInput {
    title: string;
    slug: string;
    brand?: 'NXT' | 'NU' | string;
    code: string;                       // the generated React component (default-exports App)
    based_on?: string;                  // recommendation slug or "free-form: ..."
    research_goal?: string;
    brief?: any;                        // the approved ProductBrief, if available
    critique?: any;                     // Stage 5 critique JSON, if available
    code_format?: 'react' | 'react-tsx' | string;
}

function safeFilename(s: string): string {
    return (s || 'prototype')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'prototype';
}

function buildIndexHtml(title: string): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title.replace(/</g, '&lt;')}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`;
}

function buildMainJsx(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function buildIndexCss(brand: string): string {
    const isNu = brand === 'NU';
    return `:root {
  --bg: #FFFFFF;
  --text: #0D0D0D;
  --accent: ${isNu ? '#C8102E' : '#B8B800'};
  --accent-2: ${isNu ? '#000000' : '#115054'};
}
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  font-family: 'Archivo', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
`;
}

function buildPackageJson(slug: string, codeIsTsx: boolean): string {
    return JSON.stringify({
        name: slug,
        private: true,
        version: '0.1.0',
        type: 'module',
        scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
        },
        dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1',
        },
        devDependencies: {
            '@vitejs/plugin-react': '^4.3.0',
            vite: '^5.4.0',
            ...(codeIsTsx ? { typescript: '^5.4.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0' } : {}),
        },
    }, null, 2) + '\n';
}

function buildViteConfig(): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true },
});
`;
}

function buildReadme(input: PrototypeExportInput): string {
    const lines: string[] = [];
    lines.push(`# ${input.title}`);
    lines.push('');
    if (input.brand) lines.push(`**Brand:** ${input.brand}`);
    if (input.based_on) lines.push(`**Based on:** ${input.based_on}`);
    if (input.research_goal) lines.push(`**Research goal:** ${input.research_goal}`);
    lines.push('');
    lines.push('## Run locally');
    lines.push('');
    lines.push('```bash');
    lines.push('npm install');
    lines.push('npm run dev');
    lines.push('```');
    lines.push('');
    lines.push('Opens at http://localhost:3000.');
    lines.push('');
    lines.push('## What\'s in this bundle');
    lines.push('');
    lines.push('| File | Purpose |');
    lines.push('|---|---|');
    lines.push('| `src/App.jsx` | The generated prototype component |');
    lines.push('| `src/main.jsx` | React 18 root render |');
    lines.push('| `src/index.css` | Minimal brand defaults |');
    lines.push('| `brief.json` | The approved product brief that drove this build |');
    lines.push('| `critique.json` | The quality audit produced after the build |');
    lines.push('');
    lines.push('## Exported from NXT Humans Intelligence Augmentation Suite');
    lines.push('');
    lines.push(`Exported on ${new Date().toISOString().slice(0, 10)}.`);
    lines.push('');
    return lines.join('\n');
}

/**
 * Build the zip and trigger a browser download. Returns the filename so the
 * caller can surface it in a chat message (e.g. "Downloaded as foo.zip").
 */
export async function exportPrototypeAsZip(input: PrototypeExportInput): Promise<string> {
    const zip = new JSZip();
    const slug = safeFilename(input.slug || input.title);
    const root = zip.folder(slug)!;
    const codeIsTsx = (input.code_format || 'react').toLowerCase().includes('tsx');
    const codeFile = codeIsTsx ? 'App.tsx' : 'App.jsx';

    root.file('index.html', buildIndexHtml(input.title || slug));
    root.file('package.json', buildPackageJson(slug, codeIsTsx));
    root.file('vite.config.js', buildViteConfig());
    root.file('README.md', buildReadme(input));

    const src = root.folder('src')!;
    src.file(codeFile, input.code || '// Prototype code was empty.\nexport default function App() { return null; }\n');
    src.file('main.jsx', buildMainJsx());
    src.file('index.css', buildIndexCss(input.brand || 'NXT'));

    if (input.brief) {
        root.file('brief.json', JSON.stringify(input.brief, null, 2));
    }
    if (input.critique) {
        root.file('critique.json', JSON.stringify(input.critique, null, 2));
    }

    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    const filename = `${slug}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return filename;
}
