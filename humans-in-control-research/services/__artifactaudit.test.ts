import { it } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { slideDataToStageHtml } from './slideToStageHtml';

// 2026-08-07 (L2 regression-obligations hardening): the proof output dir was a
// hardcoded per-session scratchpad path from a deleted session, which failed
// the suite on every other machine. Portable temp dir, created on demand.
const OUT = join(tmpdir(), 'hic-render-proofs');
mkdirSync(OUT, { recursive: true });

// Throwaway render-audit: emit the REAL stage HTML for architecture-map + service-blueprint so the
// current native renderers can be screenshotted and checked for element placement. Not a permanent test.
it('emit architecture + blueprint audit html', () => {
    const arch: any = {
        template: 'architecture-map',
        brand: 'nxt', theme: 'light',
        kicker: 'ARCHITECTURE · TARGET STATE · ADVANCEMENT',
        title: 'Engagement signals route through scoring before any ask is personalized',
        architectureMap: {
            flowSummary: 'Engagement signals flow from the portal through scoring into the personalizer, which writes asks back to the CRM of record.',
            layers: [
                { name: 'Experience', nodes: [{ name: 'Advancement Portal', type: 'web' }, { name: 'Gift Officer Dashboard', type: 'web' }] },
                { name: 'Application', nodes: [{ name: 'Engagement Scoring', type: 'service' }, { name: 'Ask Personalizer', type: 'service' }, { name: 'Stewardship Automation', type: 'service' }] },
                { name: 'Data', nodes: [{ name: 'Donor CRM (Slate)', type: 'system' }, { name: 'Giving History Store', type: 'database' }] },
                { name: 'Integration', nodes: [{ name: 'EverTrue Sync', type: 'api' }, { name: 'Email / ESP Connector', type: 'api' }] },
            ],
        },
        sources: ['Advancement CRM Audit', 'EverTrue Docs'],
    };
    const blueprint: any = {
        template: 'service-blueprint',
        brand: 'nxt', theme: 'light',
        kicker: 'SERVICE BLUEPRINT · CURRENT STATE · ALUMNI GIVING',
        title: 'Stewardship goes silent right after the gift, where loyalty is won or lost',
        serviceBlueprint: {
            stages: [
                { phase: 'Cultivate', emotion: 'curious', duration: 'Weeks', customerAction: 'Reads an impact story', frontstage: 'Personalized outreach', backstage: 'Segment by affinity', support: 'CRM affinity tags', failPoint: false },
                { phase: 'Ask', emotion: 'hesitant', duration: 'Days', customerAction: 'Receives the appeal', frontstage: 'Tailored ask', backstage: 'Generate ask amount', support: 'Giving-history model', failPoint: true, painPoint: 'One-size appeal ignores giving history' },
                { phase: 'Give', emotion: 'satisfied', duration: 'Minutes', customerAction: 'Makes the gift', frontstage: 'Frictionless checkout', backstage: 'Process payment', support: 'Payment gateway', failPoint: false },
                { phase: 'Steward', emotion: 'disappointed', duration: 'Weeks', customerAction: 'Waits to hear back', frontstage: 'No follow-up', backstage: 'No trigger fires', support: 'No stewardship flow', failPoint: true, painPoint: 'No thank-you or impact report after the gift' },
            ],
        },
        sources: ['Alumni Interviews', 'Advancement CRM Audit'],
    };
    writeFileSync(join(OUT, 'arch-proof.html'), slideDataToStageHtml(arch), 'utf8');
    writeFileSync(join(OUT, 'blueprint-proof.html'), slideDataToStageHtml(blueprint), 'utf8');
});
