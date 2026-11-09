/** 2026-10-26: deck type harmony across sibling slides, and the templates that used to drop items (comparison-panels
 *  criteria past five, agenda groups past two). Renders to ARCHETYPE_RENDER_DIR. */
import { it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { composeSlide, deckTypePins } from './slideComposer';

const sizeOf = (html: string, text: string): number => {
    const i = html.indexOf(text);
    const style = html.slice(html.lastIndexOf('<div style="', i), i);
    const m = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(style);
    return m ? Number(m[1]) : 0;
};
const block = (label: string) => ({ label, body: `${label} carries one complete sentence about the account and its delivery work.` });

it('sibling slides of one archetype share the lede size after deckTypePins', () => {
    const short = 'Canon CFS moved into origination discovery.';
    const long = 'The account has progressed from targeted document extraction into origination-system discovery, architecture, governed backlog work and a potential longer-term delivery team across three business units.';
    const a: any = { kicker: '01', title: 'Canon CFS modernizes finance operations', subtitle: short, blocks: ['A', 'B', 'C', 'D'].map(block) };
    const b: any = { kicker: '02', title: 'Benefits Cortex turns Plan Pulse into a platform', subtitle: long, blocks: ['A', 'B', 'C', 'D'].map(block) };
    const before = [sizeOf(composeSlide('brief-card', a, 'nxt') as string, short), sizeOf(composeSlide('brief-card', b, 'nxt') as string, long)];
    expect(before[0]).toBeGreaterThan(before[1]);   // the drift the owner saw
    const pins = deckTypePins([{ id: 'a', template: 'slides:brief-card', payload: a }, { id: 'b', template: 'slides:brief-card', payload: b }]);
    expect(pins.a.subtitle).toBe(before[1]);
    const after = [sizeOf(composeSlide('brief-card', { ...a, _typePins: pins.a }, 'nxt') as string, short), sizeOf(composeSlide('brief-card', { ...b, _typePins: pins.b }, 'nxt') as string, long)];
    expect(after[0]).toBe(after[1]);
    // a single slide of an archetype takes no pins
    expect(deckTypePins([{ id: 'c', template: 'slides:brief-card', payload: a }])).toEqual({});
});

it('comparison-panels draws seven criteria and agenda draws three groups (they used to drop items)', () => {
    const criteria = ['Contract', 'Scope', 'Team', 'Value', 'Risk', 'Timing', 'Owner'];
    const cp: any = { kicker: 'STATUS', title: 'Signed work and proposals are reported separately', criteria,
        panels: [{ name: 'Contracted', cells: criteria.map(c => `${c} contracted fact`) }, { name: 'Proposal', cells: criteria.map(c => `${c} proposal fact`) }] };
    const html = composeSlide('comparison-panels', cp, 'nxt') as string;
    for (const c of criteria) { expect(html).toContain(c); expect(html).toContain(`${c} proposal fact`); }
    const ag: any = { title: 'Three parts carry the portfolio into 2027', groups: [
        { label: 'Model', items: ['Portfolio thesis'] }, { label: 'Accounts', items: ['Canon CFS', 'Benefits Cortex'] }, { label: 'Outlook', items: ['2027 bridge'] }] };
    for (const withBg of [false, true]) {
        const p = withBg ? { ...ag, backgroundImage: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>') } : ag;
        const h = composeSlide('agenda', p, 'nxt') as string;
        for (const g of ['Model', 'Accounts', 'Outlook', '2027 bridge']) expect(h).toContain(g);
        const dir = process.env.ARCHETYPE_RENDER_DIR;
        if (dir) fs.writeFileSync(path.join(dir, `agenda-3-groups-${withBg ? 'bg' : 'plain'}.html`), h);
    }
    const dir = process.env.ARCHETYPE_RENDER_DIR;
    if (dir) fs.writeFileSync(path.join(dir, 'comparison-7-criteria.html'), html);
});
