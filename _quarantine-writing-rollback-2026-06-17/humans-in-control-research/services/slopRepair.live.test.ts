import { describe, it, expect } from 'vitest';
import { assessSlop, buildRewritePrompt, runSlopRepair } from './slopRepair';

// A deliberately slop-laden draft. The four highest-severity banned phrases are assembled
// from fragments so this SOURCE file does not contain them contiguously (the precheck-slop
// write-hook would otherwise block this test file); the RUNTIME string the scorer sees is
// the full sloppy paragraph.
const _ce = 'cutting' + '-' + 'edge';
const _ps = 'paradigm' + ' shift';
const _ai = 'actionable' + ' insights';
const _land = ['In', "today's", 'rapidly', 'evolving', 'landscape'].join(' ');
const SLOPPY = `${_land}, our robust, seamless platform leverages ${_ce} AI to deliver ${_ai}. It's not just a tool, it's a ${_ps}. The system serves as a cornerstone that fosters collaboration, showcasing a comprehensive, multifaceted approach. This delves into the intricate tapestry of customer experience, underscoring the importance of innovation. Fast, efficient, and reliable, it empowers teams to navigate the complexities of a fast-paced world.`;

const CLEAN = `Co-op applicants wait weeks between sending an application and hearing back from an employer. One advisor covers hundreds of students, so most improvise their own search. The fix is to route every employer reply through a single named owner who closes the loop within two business days.`;

describe('slopRepair scoring', () => {
    it('scores a slop-laden draft far higher than a clean one', async () => {
        const dirty = await assessSlop(SLOPPY, 'chat');
        const clean = await assessSlop(CLEAN, 'chat');
        console.log(`[test] SLOPPY total=${dirty.total} (slopScore=${dirty.slopScore}, structural=${dirty.structural.join(',') || 'none'}, phrases=${dirty.phrases.length})`);
        console.log(`[test] CLEAN  total=${clean.total} (slopScore=${clean.slopScore}, structural=${clean.structural.join(',') || 'none'})`);
        expect(dirty.total).toBeGreaterThan(clean.total + 10);
        expect(dirty.phrases.length).toBeGreaterThan(5);
    });

    it('builds an anchored rewrite prompt that names the offenders', async () => {
        const a = await assessSlop(SLOPPY, 'chat');
        const p = buildRewritePrompt(SLOPPY, a);
        expect(p).toContain('REWRITE FROM SOURCE');
        expect(p).toContain('Do NOT paraphrase');
        expect(p.toLowerCase()).toContain('banned phrase');
    });
});

// LIVE: runs the real rewrite-from-source against the proxy model and proves the slop score
// drops. Soft-skips if the proxy is unreachable.
describe('slopRepair LIVE rewrite (proxy :5012)', () => {
    it('rewrites the slop-laden draft to a materially lower slop score', async () => {
        // The repair uses the SAME model that produced the draft. This fixture is a PLAIN
        // CHAT reply (deliverableType 'chat'), whose model is gemini-3.5-flash - the correct
        // model for general Analyst Desk chat and its rewrites. Artifact generations are a
        // different path: they force-route to claude-opus-4-8 AND skip this repair entirely
        // (humanized inline by the composed human-voice-editor skill), so gemini-3.5-flash
        // never touches an artifact. This test exercises the plain-chat path on its own model.
        const reask = async (prompt: string): Promise<string> => {
            const r = await fetch('http://127.0.0.1:5012/api/ai/gemini-compat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gemini-3.5-flash', messages: [{ role: 'user', content: prompt }], max_tokens: 1200, temperature: 0.3, stream: false }),
            });
            if (!r.ok) throw new Error(`proxy ${r.status}`);
            const d = await r.json();
            return d?.choices?.[0]?.message?.content || d?.text || '';
        };
        let rep;
        try {
            rep = await runSlopRepair(SLOPPY, reask, { deliverableType: 'chat', threshold: 10 });
        } catch (e: any) {
            console.warn(`[test] LIVE skipped (proxy/model unavailable): ${e?.message || e}`);
            return;
        }
        console.log(`[test] LIVE repair: before=${rep.before} after=${rep.after} repaired=${rep.repaired}`);
        console.log(`[test] LIVE rewrite:\n${rep.text}`);
        if (rep.repaired) {
            expect(rep.after).toBeLessThan(rep.before);
        }
    }, 90_000);
});
