import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { exportPrototypeAsZip } from './prototypeExporter';

// jsdom lacks URL.createObjectURL / revokeObjectURL; the exporter uses them to
// trigger the browser download. Stub them so the export path runs to completion.
beforeEach(() => {
    (URL as any).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as any).revokeObjectURL = vi.fn();
});

describe('exportPrototypeAsZip', () => {
    const SAMPLE = {
        title: 'Plan Pulse Outlook 2026',
        slug: 'plan-pulse-outlook-2026',
        brand: 'NXT',
        code: 'function App(){ return null; }\nfunction Screen_x(){ return null; }',
        code_format: 'react',
        brief: { concept_title: 'x' },
        critique: { verdict: 'refine' },
    };

    it('builds a downloadable zip and returns the filename', async () => {
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const captured: Blob[] = [];
        (URL as any).createObjectURL = vi.fn((b: Blob) => { captured.push(b); return 'blob:mock'; });

        const filename = await exportPrototypeAsZip(SAMPLE as any);

        expect(filename).toBe('plan-pulse-outlook-2026.zip');
        expect(clickSpy).toHaveBeenCalledTimes(1);   // download was triggered
        expect(captured.length).toBe(1);

        // Round-trip the produced blob to confirm it is a real, well-formed zip
        // containing the expected scaffold + the prototype code.
        const zip = await JSZip.loadAsync(captured[0]);
        const names = Object.keys(zip.files);
        const root = 'plan-pulse-outlook-2026/';
        expect(names).toContain(root + 'index.html');
        expect(names).toContain(root + 'package.json');
        expect(names).toContain(root + 'vite.config.js');
        expect(names).toContain(root + 'README.md');
        expect(names).toContain(root + 'src/App.jsx');
        expect(names).toContain(root + 'src/main.jsx');
        expect(names).toContain(root + 'brief.json');
        expect(names).toContain(root + 'critique.json');

        const appCode = await zip.file(root + 'src/App.jsx')!.async('string');
        expect(appCode).toContain('function App()');
        expect(appCode).toContain('Screen_x');
    });

    it('never emits an empty App file even when code is missing', async () => {
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const captured: Blob[] = [];
        (URL as any).createObjectURL = vi.fn((b: Blob) => { captured.push(b); return 'blob:mock'; });

        await exportPrototypeAsZip({ ...SAMPLE, code: '' } as any);
        const zip = await JSZip.loadAsync(captured[0]);
        const appCode = await zip.file('plan-pulse-outlook-2026/src/App.jsx')!.async('string');
        expect(appCode.length).toBeGreaterThan(0);
        expect(appCode).toContain('export default function App');
    });
});
