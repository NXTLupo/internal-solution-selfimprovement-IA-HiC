/** 2026-10-26: a brief-card handed five or six blocks re-grids instead of dropping the extra ones (live: the fifth box,
 *  "2027 continuity path", carried $500K / $840K / $66,625 a month and was never drawn). Renders to ARCHETYPE_RENDER_DIR. */
import { it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { composeSlide } from './slideComposer';

const BLOCKS = [
    { label: 'Management outlook', body: 'Management projects $1.0M in FY2027 on time and materials and staff augmentation, from an H1 extension proposal plus continued AI advisory.' },
    { label: 'Scope of work', body: 'NXT Humans provides AI strategy and advisory, demos, solution architecture and innovation support across The Ordinary and Origins.' },
    { label: 'Team involved', body: 'The client directs a mix of AI strategy, architecture, design and engineering, with Rob Koch as lead and support allocated monthly.' },
    { label: 'What the client buys', body: 'Estee Lauder buys faster experimentation without lowering brand quality, through reusable campaign components and human review.' },
    { label: '2027 continuity path', body: 'An H1 2027 extension worth $500K is proposed, with additional brands as the expansion route once the extension is signed.' },
];
const PIC = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="560" height="740"/>');

it('never cuts a client sentence on a provided-content slide (2026-10-26 live: "...and defines future-state")', () => {
    const long = [
        { label: 'Management outlook', body: 'Management projects $470K in FY2027 on T&M / not-to-exceed (NTE) terms, assuming a proposed 12-month staff-augmentation contract, still unsigned, ramps through 2027.' },
        { label: 'Scope of work', body: 'NXT Humans builds document extraction and quality-control foundations, runs current-state origination discovery and defines future-state requirements, architecture, an Azure DevOps backlog and an implementation roadmap.' },
        { label: 'Team involved', body: 'An AI strategist / engagement lead, an AI engineering lead and a business analyst / product owner staff the account. Andrew Fegley is the responsible NXT executive in the current discovery statement of work (SOW).' },
        { label: 'What the client is buying', body: 'Canon CFS buys a path from isolated optical character recognition (OCR) automation to a scalable document-intelligence and origination platform, with clearer workflows, APIs, controls and delivery sequencing.' },
        { label: '2027 continuity path', body: 'The $840K proposal value for the 12-month staff augmentation is risk-adjusted to $470K in the management outlook until the contract is signed.' },
    ];
    const payload: any = { kicker: '02 | FORTUNE 500 FINANCIAL SERVICES', title: 'Canon CFS modernizes document-heavy finance operations with NXT Humans',
        subtitle: 'The account has progressed from targeted document extraction into origination-system discovery and architecture.', blocks: long, heroImage: PIC, _provided: true, sourceLine: 'Source: Portfolio.pptx' };
    const html = composeSlide('brief-card', payload, 'nxt') as string;
    for (const b of long) expect(html).toContain(b.body.replace(/&/g, '&amp;'));
    const dir = process.env.ARCHETYPE_RENDER_DIR;
    if (dir) fs.writeFileSync(path.join(dir, 'brief-card-5-long-provided.html'), html);
});

it('draws all five blocks beside a picture and without one', () => {
    for (const withPic of [true, false]) {
        const payload: any = { kicker: '01 | FORTUNE 500 BEAUTY', title: 'NXT Humans serves Estee Lauder as an embedded AI innovation partner',
            subtitle: 'The relationship moved from an AI Personal Shopper to brand and marketing automation.', blocks: BLOCKS, sourceLine: 'Source: Portfolio.pptx' };
        if (withPic) payload.heroImage = PIC;
        const html = composeSlide('brief-card', payload, 'nxt') as string;
        for (const b of BLOCKS) expect(html).toContain(b.label.toUpperCase() === b.label ? b.label : b.label);
        expect(html).toContain('$500K');
        const dir = process.env.ARCHETYPE_RENDER_DIR;
        if (dir) fs.writeFileSync(path.join(dir, `brief-card-5-blocks-${withPic ? 'pic' : 'nopic'}.html`), html);
    }
});
