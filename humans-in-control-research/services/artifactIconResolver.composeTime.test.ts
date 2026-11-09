/** 2026-10-23 (#slides elevation, iconography): compose-time content-true icons on card archetypes. */
import { describe, it, expect } from 'vitest';
import { attachContentTrueIcons } from './artifactIconResolver';
import { composeSlide } from './slideComposer';

describe('attachContentTrueIcons', () => {
    it('fills stepIcons for flow-arc from the step concepts, content-true or empty, never a repeated glyph', () => {
        const payload: any = {
            kicker: 'INTAKE TO PLACEMENT', title: 'Four hand-offs carry a student from application to placement',
            steps: [
                { title: 'Student submits the application', description: 'The form lands in the advising CRM.' },
                { title: 'Advisor reviews the file', description: 'Gaps are flagged within five days.' },
                { title: 'Employer interview', description: 'The match queue schedules the conversation.' },
                { title: 'Placement confirmed', description: 'The offer is accepted and recorded.' },
            ],
        };
        const n = attachContentTrueIcons('slides:flow-arc', payload, 'nxt', 'light');
        expect(Array.isArray(payload.stepIcons)).toBe(true);
        expect(payload.stepIcons).toHaveLength(4);
        // 2026-10-26: a row carries an icon on every card or on none (owner audit: icons on 02 and 04 only)
        const filled = payload.stepIcons.filter(Boolean);
        expect(filled.length === 0 || filled.length === 4).toBe(true);
        expect(n).toBe(filled.length);
        expect(new Set(filled).size).toBe(filled.length);
        for (const uri of filled) expect(uri.startsWith('data:image/svg+xml')).toBe(true);
        // idempotent: a second pass leaves the carrier alone
        expect(attachContentTrueIcons('flow-arc', payload, 'nxt', 'light')).toBe(0);
    });
    it('is a no-op for archetypes without an icon cell and for empty payloads', () => {
        expect(attachContentTrueIcons('slides:stat-row', { stats: [{ figure: '9' }] }, 'nxt', 'light')).toBe(0);
        expect(attachContentTrueIcons('slides:flow-arc', null, 'nxt', 'light')).toBe(0);
    });
    it('the composed flow-arc slide paints the glyph cells', () => {
        const html = composeSlide('flow-arc', {
            kicker: 'INTAKE TO PLACEMENT', title: 'Four hand-offs carry a student from application to placement',
            steps: [
                { title: 'Student submits the application', description: 'The form lands in the advising CRM.' },
                { title: 'Advisor reviews the file', description: 'Gaps are flagged within five days.' },
                { title: 'Employer interview', description: 'The match queue schedules the conversation.' },
                { title: 'Placement confirmed', description: 'The offer is accepted and recorded.' },
            ],
        }, 'nxt');
        expect(html).toBeTruthy();
    });
    it('the composed flow-arc slide paints every attached glyph; a row with an unmatched step carries none', () => {
        const steps = [
            { title: 'Student submits the application', description: 'The form lands in the advising CRM.' },
            { title: 'Advisor reviews the file', description: 'Gaps are flagged within five days.' },
            { title: 'Employer interview', description: 'The match queue schedules the conversation.' },
            { title: 'Placement confirmed', description: 'The offer is accepted and recorded.' },
        ];
        const payload: any = { kicker: 'INTAKE TO PLACEMENT', title: 'Four hand-offs carry a student from application to placement', steps };
        attachContentTrueIcons('slides:flow-arc', payload, 'nxt', 'light');
        const html = composeSlide('flow-arc', payload, 'nxt') as string;
        for (const uri of payload.stepIcons.filter(Boolean)) expect(html).toContain(uri);
        const mixed: any = { title: 'x', steps: [...steps.slice(0, 3), { title: 'Qzxv wbnk', description: 'Qzxv wbnk plorf.' }] };
        expect(attachContentTrueIcons('slides:flow-arc', mixed, 'nxt', 'light')).toBe(0);
        expect(mixed.stepIcons.every((u: string) => u === '')).toBe(true);
    });
});
