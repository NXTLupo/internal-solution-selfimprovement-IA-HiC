import { describe, it, expect } from 'vitest';
import { recheckExportedCoverage, formatExportCoverageCheck } from './coverageRecheck';

describe('export-time coverage re-check (independent of the generation-time matcher)', () => {
    const record: any = { kind: 'deck', items: [{ id: 'TH-1', label: 'Theme one' }, { id: 'SF-2', label: 'Feature two' }, { id: 'AREA-1', label: 'Area', anyOf: ['AREA-1', 'SF-9'] }] };
    it('passes when every item is stamped on an exported slide (areas through any member)', () => {
        const c = recheckExportedCoverage(record, [{ _coverageIds: ['TH-1'] }, { _coverageIds: ['SF-2', 'SF-9'] }]);
        expect(c!.missing).toEqual([]);
        expect(formatExportCoverageCheck(c)).toMatch(/all 3 client items/);
    });
    it('reports items whose only carrying slide was rejected or removed', () => {
        const c = recheckExportedCoverage(record, [{ _coverageIds: ['TH-1'] }, { status: 'rejected', _coverageIds: ['SF-2', 'SF-9'] }]);
        expect(c!.missing.map(m => m.id)).toEqual(['SF-2', 'AREA-1']);
        expect(formatExportCoverageCheck(c)).toMatch(/2 of 3 items are no longer carried/);
    });
    it('is silent when the generation ran no contract', () => {
        expect(recheckExportedCoverage(undefined, [])).toBeNull();
        expect(formatExportCoverageCheck(null)).toBe('');
    });
});
