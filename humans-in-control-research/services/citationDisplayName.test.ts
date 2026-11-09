// 2026-11-09 - pins displaySourceName (the QA critic's "single highest-value remaining change"):
// a citation label is a publication's name, never a connector feed slug.
import { describe, it, expect } from 'vitest';
import { displaySourceName } from './citationPointerRegistry';

describe('displaySourceName', () => {
    it('maps known feed slugs to publication names', () => {
        expect(displaySourceName('aws ml blog')).toBe('AWS Machine Learning Blog');
        expect(displaySourceName('zdnet_ai')).toBe('ZDNet');
        expect(displaySourceName('eff ai')).toBe('Electronic Frontier Foundation');
        expect(displaySourceName('arxiv cs ro')).toBe('arXiv (Robotics)');
        expect(displaySourceName('exs recruiterflow')).toBe('Recruiterflow Blog');
        expect(displaySourceName('kdnuggets.com')).toBe('KDnuggets');
    });
    it('uses one casing for the Reddit Deep connector', () => {
        expect(displaySourceName('reddit-deep: r/neu')).toBe('Reddit Deep: r/neu');
        expect(displaySourceName('Reddit Deep: r/museagent')).toBe('Reddit Deep: r/museagent');
    });
    it('title-cases a residual slug but never rewrites a real publication name', () => {
        expect(displaySourceName('higher ed dive')).toBe('Higher Ed Dive');
        expect(displaySourceName('The Conversation')).toBe('The Conversation');
        expect(displaySourceName('NVIDIA Developer')).toBe('NVIDIA Developer');
        expect(displaySourceName('Hechinger Report')).toBe('Hechinger Report');
    });
});
