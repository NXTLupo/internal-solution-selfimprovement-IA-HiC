/** 2026-10-25: the flowchart exhibit slide = the drawing across the full exhibit slot + the so-what band. The derived
 *  label legend is gone (the owner rejected the machine-concatenated legend twice). Renders to ARCHETYPE_RENDER_DIR. */
import { it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { composeSlide } from './slideComposer';

const PAYLOAD: any = {
    kicker: 'ESCALATION PATH',
    title: 'A flagged gap moves from self-guided fix to advisor to employer decision',
    nodes: [
        { id: 'n1', label: 'First-year intake and readiness check', kind: 'input' },
        { id: 'n2', label: 'Readiness gap flagged on a milestone?', kind: 'decision' },
        { id: 'n3', label: 'Guidance tile and AI Companion step', kind: 'system' },
        { id: 'n4', label: 'Within companion scope?', kind: 'decision' },
        { id: 'n5', label: 'Referral to Experiential Learning staff', kind: 'actor' },
        { id: 'n6', label: 'Preparation Summary sent to advisor', kind: 'system' },
        { id: 'n7', label: 'Co-op advisor consultation', kind: 'actor' },
        { id: 'n8', label: 'Student accepts offer; hub records the hire', kind: 'outcome' },
    ],
    edges: [
        { from: 'n1', to: 'n2', label: 'intake scored' }, { from: 'n2', to: 'n3', label: 'yes, gap flagged' }, { from: 'n2', to: 'n6', label: 'no, on track' },
        { from: 'n3', to: 'n4', label: 'scope check' }, { from: 'n4', to: 'n6', label: 'yes, answered' }, { from: 'n4', to: 'n5', label: 'no, needs human judgment' },
        { from: 'n5', to: 'n6', label: 'staff resolve' }, { from: 'n6', to: 'n7', label: 'summary shared' }, { from: 'n7', to: 'n8', label: 'offer extended' },
    ],
    takeaway: { label: 'PLACEMENT BOUNDARY', statement: 'The hub records the placement after the student accepts an offer the employer extended.' },
    sourceLine: 'Sources: Northeastern Student 360 Product Brief; SOW014 NXT Humans NU Student AI Companion EL Foundation',
};

it('places the flowchart across the full 1622x600 exhibit slot with the band and no label-dump legend', () => {
    const pngPath = process.env.FLOW_PNG;
    const pay = JSON.parse(JSON.stringify(PAYLOAD));
    pay.exhibitImage = pngPath && fs.existsSync(pngPath)
        ? 'data:image/png;base64,' + fs.readFileSync(pngPath).toString('base64')
        : 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="3244" height="1200"/>');
    const html = composeSlide('infographic-exhibit', pay, 'nxt') as string;
    // 2026-11-16: the slot keeps its full 1622x600 size and moves down 24px to make room for the subtitle line
    expect(html).toContain('left:196px;top:250px;width:1622px;height:600px');
    expect(html).not.toContain('Decisions');
    expect(html).toContain('PLACEMENT BOUNDARY');
    const dir = process.env.ARCHETYPE_RENDER_DIR;
    if (dir) fs.writeFileSync(path.join(dir, 'flowchart-slide.html'), html);
});
