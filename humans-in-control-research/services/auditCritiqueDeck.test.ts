// auditCritiqueDeck.test.ts - 2026-07-07 heuristic-audit uplift Phase 1.
// Locks the deterministic critique-deck composition: fence format parseable by the chat's
// slide regex, one screen-critique slide per reviewed screen with continuation past 4
// findings (no-truncation contract), screenshots riding as the slide image payload, and
// the em-dash ban enforced on model-authored finding text.

import { describe, it, expect } from 'vitest';
import { buildCritiqueDeckReply, buildAuditChatCorpus, screenMarkers, markerPositions, type AuditScreen } from './auditCritiqueDeck';
import { composeSlide } from './slideComposer';
import type { HeuristicReport, HeuristicFinding } from '../types';

const finding = (id: string, ref: number, severity: 0 | 1 | 2 | 3 | 4, title: string): HeuristicFinding => ({
    id, dimension: 'accessibility', screenshotRefs: [ref], severity, confidence: 'HIGH',
    title, description: `Description for ${id} — with an em-dash to strip.`,
    recommendation: `Fix ${id} with tokens.`,
    marker: { x: 20 + severity * 10, y: 30 + severity * 5 },
});

const REPORT: HeuristicReport = {
    brief: {
        productName: 'Acme Portal', productUrl: 'https://acme.example',
        targetAudience: ['Businesses'], businessGoals: ['Conversion'],
        experienceType: 'saas_dashboard',
        evaluationDimensions: ['accessibility', 'traditional_usability'],
    },
    executiveSummary: {
        overallScore: 55, totalFindings: 6,
        severityDistribution: { 0: 0, 1: 1, 2: 1, 3: 3, 4: 1 },
        topIssues: [
            finding('f1', 1, 4, 'Contrast fails on primary actions'),
            finding('f2', 1, 3, 'Focus states are invisible'),
            finding('f3', 2, 3, 'Navigation labels do not match destinations'),
        ],
        summary: 'The portal buries its primary action under low-contrast chrome. Navigation names disagree with destinations. A token-level fix resolves most of it.',
    },
    dimensions: [],
    findings: [
        finding('f1', 1, 4, 'Contrast fails on primary actions'),
        finding('f2', 1, 3, 'Focus states are invisible'),
        finding('f3', 1, 3, 'Form errors rely on color alone'),
        finding('f4', 1, 2, 'Touch targets are under-sized'),
        finding('f5', 1, 1, 'Heading levels skip from h1 to h4'),   // 5th on screen 1 -> continuation
        finding('f6', 2, 3, 'Navigation labels do not match destinations'),
    ],
    screenshotCount: 2,
    modelUsed: 'claude-opus-4-8',
    analyzedAt: '2026-07-07T00:00:00Z',
    screenSummaries: [
        { screenshot: 1, verdict: 'Strong table undermined by faint labels and no next step' },
        {
            screenshot: 2, verdict: 'Navigation names disagree with their destinations',
            proposedSections: [{ pattern: 'nav-bar', label: 'Acme Portal', items: ['Plans', 'Claims'] }],
            proposedRationale: 'Clear nav names and a labeled action row replace the mismatched links',
        },
    ],
};

const SCREENS: AuditScreen[] = [
    // bright dashboard screenshot -> the cover must use the FRAMED hero panel, not full-bleed;
    // annotatedDataUri = the disc-baked pixels every slide must prefer over the raw screenshot
    {
        name: 'Upload 1', dataUri: 'data:image/jpeg;base64,SCREEN_ONE', aspect: 1.6, luminance: 0.85,
        annotatedDataUri: 'data:image/jpeg;base64,SCREEN_ONE_ANNOTATED',
    },
    {
        name: 'acme.example · mobile', dataUri: 'data:image/jpeg;base64,SCREEN_TWO', aspect: 0.5, luminance: 0.4,
        annotatedDataUri: 'data:image/jpeg;base64,SCREEN_TWO_ANNOTATED',
        proposedRender: 'data:image/png;base64,PROPOSED_TWO',
        proposedRationale: 'Barrier rows become readable and every visitor gets a clear next step',
    },
];

// Same fence pattern CorpusChatPanel.parseSlideBlocks uses.
const FENCE = /:::slide((?:\s+[a-z]+=[a-z:-]+)*)\s*\n([\s\S]*?):::/g;

function parseFences(reply: string) {
    const out: { template: string; payload: any }[] = [];
    let m;
    while ((m = FENCE.exec(reply)) !== null) {
        out.push({
            template: (m[1].match(/\btemplate=([a-z:-]+)/i)?.[1] || ''),
            payload: JSON.parse(m[2].trim()),
        });
    }
    return out;
}

describe('buildCritiqueDeckReply', () => {
    const reply = buildCritiqueDeckReply(REPORT, SCREENS);
    const slides = parseFences(reply);

    it('emits parseable fences: cover + top-issues + per-screen critiques (with continuation) + redesign + closing thesis', () => {
        const templates = slides.map(s => s.template);
        expect(templates[0]).toBe('slides:cover');
        expect(templates).toContain('slides:numbered-themes');
        // v2: 3 findings/slide -> screen 1 (5 findings) = 2 slides; screen 2 (1) = 1 slide
        expect(templates.filter(t => t === 'slides:screen-critique')).toHaveLength(3);
        // screen 2 carries a proposedRender -> one side-by-side redesign slide
        expect(templates.filter(t => t === 'slides:screen-redesign')).toHaveLength(1);
        expect(templates[templates.length - 1]).toBe('slides:thesis-interstitial');
    });

    it('cover is luminance-aware: a bright dashboard screenshot rides the FRAMED hero panel, never full-bleed', () => {
        expect(slides[0].payload.heroImage).toBe('data:image/jpeg;base64,SCREEN_ONE');
        expect(slides[0].payload.backgroundImage).toBeUndefined();
        expect(String(slides[0].payload.title).length).toBeGreaterThan(10);
    });

    it('screen-critique v4: READING-ORDER numbering (discs descend the image; user-flagged swap fix)', () => {
        const crit = slides.filter(s => s.template === 'slides:screen-critique');
        // the annotated (disc-baked) pixels are preferred over the raw screenshot
        expect(crit[0].payload.screenImage).toBe('data:image/jpeg;base64,SCREEN_ONE_ANNOTATED');
        expect(crit[0].payload.imageAspect).toBe(1.6);
        expect(crit[0].payload.title).toBe('Strong table undermined by faint labels and no next step');
        expect(crit[0].payload.findings).toHaveLength(3);
        expect(crit[0].payload.findings.map((f: any) => f.number)).toEqual(['01', '02', '03']);
        // marker factory: y = 30 + severity*5, so READING order = severity ASCENDING here
        // (f5 y35 -> f4 y40 -> f2 y45): the list must follow the image top-to-bottom.
        expect(crit[0].payload.findings[0].severityLabel).toContain('COSMETIC');
        expect(crit[0].payload.findings.map((f: any) => f.heading)).toEqual([
            'Heading levels skip from h1 to h4',
            'Touch targets are under-sized',
            'Focus states are invisible',
        ]);
        expect(crit[1].payload.kicker).toContain('CONTINUED');
        expect(crit[1].payload.findings.map((f: any) => f.number)).toEqual(['04', '05']);
        expect(crit[2].payload.screenImage).toBe('data:image/jpeg;base64,SCREEN_TWO_ANNOTATED');
        expect(crit[2].payload.kicker).toContain('ACME.EXAMPLE');
    });

    it('screen-redesign: annotated current vs proposed + numbered LEGEND + WHAT CHANGES; no meta-narration', () => {
        const rd = slides.find(s => s.template === 'slides:screen-redesign')!;
        expect(rd.payload.currentImage).toBe('data:image/jpeg;base64,SCREEN_TWO_ANNOTATED');
        expect(rd.payload.proposedImage).toBe('data:image/png;base64,PROPOSED_TWO');
        expect(rd.payload.title).toContain('Barrier rows become readable');
        expect(rd.payload.takeaway.label).toBe('WHAT CHANGES');
        // the discs on the current screenshot are decodable ON this slide
        expect(rd.payload.legend).toBe('01 Navigation labels do not match destinations');
        expect(rd.payload.sourceLine).toBeUndefined();
        const rdText = JSON.stringify(rd.payload);
        expect(rdText).not.toMatch(/proposed one|numbered issue|the proposal|the layout/i);
    });

    it('marker geometry: reading-order n binding; collisions CLUSTER side-by-side, never relocate vertically', () => {
        const ms = screenMarkers(REPORT, 1);
        expect(ms.map(m => m.n)).toEqual(['01', '02', '03', '04', '05']);
        expect(ms[0]).toEqual({ n: '01', x: 30, y: 35 });   // topmost marker = 01, always
        // two markers at the same point: side-by-side at the SHARED anchor row (a vertical
        // relocation parked the disc on a different element - the live swapped-annotation bug)
        const placed = markerPositions([{ n: '01', x: 50, y: 50 }, { n: '02', x: 50, y: 50 }], 1000, 800, 40);
        expect(placed).toHaveLength(2);
        const [a, b] = placed;
        expect(a.py).toBe(b.py);
        expect(Math.abs(a.px - b.px)).toBeGreaterThanOrEqual(44);
    });

    it('strips em-dashes from model-authored text (hard ban) and ends with the #proto call to action', () => {
        expect(reply).not.toContain('—');
        expect(reply).toContain('#proto');
    });
});

describe('screen-critique archetype (Method A registry)', () => {
    it('composes the critique slide: screenshot img + severity labels + finding text + fix line', () => {
        const reply = buildCritiqueDeckReply(REPORT, SCREENS);
        const crit = parseFences(reply).find(s => s.template === 'slides:screen-critique')!;
        const html = composeSlide('screen-critique', crit.payload, 'nxt')!;
        expect(html).toBeTruthy();
        expect(html).toContain('data:image/jpeg;base64,SCREEN_ONE');
        // reading-order numbering: the topmost-marker finding (f5, COSMETIC) leads the slide
        expect(html).toContain('COSMETIC · ACCESSIBILITY');
        expect(html).toContain('Heading levels skip from h1 to h4');
        expect(html).toContain('Fix f5 with tokens');
    });
});

describe('buildAuditChatCorpus', () => {
    it('serializes the brief, findings, and the remediation directive for #proto grounding', () => {
        const corpus = buildAuditChatCorpus(REPORT, SCREENS);
        expect(corpus).toContain('Acme Portal');
        expect(corpus).toContain('[CRITICAL]');
        expect(corpus).toContain('PROTOTYPE DIRECTIVE');
        expect(corpus).toContain('WCAG 2.2 AA');
        expect(corpus).not.toContain('—');
    });
});
