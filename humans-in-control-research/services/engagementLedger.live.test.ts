/**
 * OPT-IN LIVE extraction: builds the engagement ledger from real client-upload pages on disk through the RUNNING
 * proxy (/api/ai/anthropic, the reasoning model), and writes every extracted item to LEDGER_LIVE_OUT.
 *
 *   LEDGER_LIVE=1 LEDGER_LIVE_ENGAGEMENT=<slug> LEDGER_LIVE_OUT=<file.json> npx vitest run services/engagementLedger.live.test.ts
 *
 * Skipped unless LEDGER_LIVE=1. Page reads come from disk (the proxy's ledger write is replaced by memory), so
 * the run never writes to the wiki.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Agent, setGlobalDispatcher } from 'undici';
import { buildEngagementLedger } from './engagementLedger';
import { CLAUDE_REASONING_MODEL } from './claudeModelPolicy';

const LIVE = process.env.LEDGER_LIVE === '1';
const ENG = process.env.LEDGER_LIVE_ENGAGEMENT || '';
const PROXY = process.env.LEDGER_LIVE_PROXY || 'http://127.0.0.1:5012';
const WIKI = path.resolve(__dirname, '..', 'hic-workspace', 'wiki');

describe.skipIf(!LIVE || !ENG)('LIVE engagement ledger extraction through the running proxy', () => {
    it('extracts, locks and lists every item', async () => {
        setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
        const dir = path.join(WIKI, 'articles', 'client-uploads');
        const only = (process.env.LEDGER_LIVE_PAGES || '').split(',').map(s => s.trim()).filter(Boolean);
        const pages = fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => `articles/client-uploads/${f}`)
            .filter(p => new RegExp(`^engagement:\\s*"[^"]*${ENG}`, 'm').test(fs.readFileSync(path.join(WIKI, p), 'utf8').slice(0, 4096)))
            .filter(p => !only.length || only.some(o => p.includes(o)));
        const store = new Map<string, string>();
        const fetchImpl = (async (url: string, init?: any) => {
            const u = new URL(url);
            const json = (o: any) => ({ ok: true, status: 200, json: async () => o }) as any;
            if (u.pathname === '/api/wiki/read-batch') {
                const out: any = {};
                for (const p of JSON.parse(init.body).paths) out[p] = { exists: true, content: fs.readFileSync(path.join(WIKI, p), 'utf8') };
                return json({ pages: out });
            }
            if (u.pathname.startsWith('/api/wiki/read/')) { const c = store.get(decodeURIComponent(u.pathname.slice(15))); return json(c ? { exists: true, content: c } : { exists: false }); }
            if (u.pathname === '/api/wiki/write') { const b = JSON.parse(init.body); store.set(b.path, b.content); return json({ status: 'ok' }); }
            return fetch(url, init);
        }) as any;
        let calls = 0;
        const gen = async ({ system, user, label, maxTokens }: any) => {
            calls++;
            const t0 = Date.now();
            const r = await fetch(`${PROXY}/api/ai/anthropic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: CLAUDE_REASONING_MODEL, max_tokens: maxTokens || 32000, system, messages: [{ role: 'user', content: user }] }) });
            const j: any = await r.json();
            const text = (j?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
            console.log(`[live] ${label}: HTTP ${r.status}, ${text.length} chars, stop ${j?.stop_reason}, ${Math.round((Date.now() - t0) / 1000)}s`);
            return text;
        };
        const led = await buildEngagementLedger({ engagement: ENG, wikiPaths: pages, gen, fetchImpl, proxyBase: 'http://disk.local', concurrency: 5 });
        const out = { calls, documentStats: led.documentStats, items: led.items.map(i => ({ id: i.id, type: i.type, label: i.label, disposition: i.disposition, group: i.group, item: i.item, quote: i.quote, document: i.documentTitle, pointer: i.pointer, speaker: i.speaker, date: i.date, kind: i.documentKind })) };
        if (process.env.LEDGER_LIVE_OUT) fs.writeFileSync(process.env.LEDGER_LIVE_OUT, JSON.stringify(out, null, 1));
        console.log(`[live] ${led.items.length} item(s) from ${led.documents.length} document(s), ${calls} call(s)`);
        expect(led.items.length).toBeGreaterThan(0);
        expect(led.documentStats.every(d => d.chunksRead === d.chunksRegistered)).toBe(true);
    }, 1800000);
});
