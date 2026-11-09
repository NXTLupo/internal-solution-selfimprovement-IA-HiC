/** 2026-10-26 (live: on two section dividers with a picture panel the title wrapped to three lines in the narrowed
 *  column and ran over the supporting line, even after the layout gate's 0.78 step-down): the narrowed title keeps a
 *  height budget that ends above the supporting line. Renders to ARCHETYPE_RENDER_DIR for the proxy measurement. */
import { it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { composeSlide } from './slideComposer';

const PIC = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="820" height="1080"/>');

it('a long divider title beside the picture panel steps down instead of running into the supporting line', () => {
    const payload: any = { number: '02', title: 'Students reach advisors and employers prepared through the Hub',
        supporting: 'The Hub prepares students and informs their advisors before the first meeting.', heroImage: PIC };
    const html = composeSlide('section-divider', payload, 'nxt') as string;
    const i = html.indexOf('STUDENTS REACH') >= 0 ? html.indexOf('STUDENTS REACH') : html.indexOf('Students reach');
    const style = html.slice(html.lastIndexOf('<div style="', i), i);
    const size = Number((/font-size:\s*(\d+(?:\.\d+)?)px/.exec(style) || [])[1]);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(120);     // stepped down from the hero tier
    const dir = process.env.ARCHETYPE_RENDER_DIR;
    if (dir) fs.writeFileSync(path.join(dir, 'divider-long-title-panel.html'), html);
});
