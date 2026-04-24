import { describe, it, expect } from 'vitest';
import { parseDesignMd } from './designMdLoader';

const SAMPLE = `---
name: NXT Humans
version: 1.0.0
brands:
  nxt:
    primary: "#0D0D0D"
    accent: "#B8B800"
  nu:
    primary: "#141414"
    accent: "#C8102E"
typography:
  body: { family: "Archivo" }
---

# NXT Humans Design System

## Overview
Flat and minimal.
`;

describe('parseDesignMd', () => {
    it('extracts name and version from frontmatter', () => {
        const r = parseDesignMd(SAMPLE);
        expect(r.tokens.name).toBe('NXT Humans');
        expect(r.tokens.version).toBe('1.0.0');
    });

    it('extracts nested brand tokens', () => {
        const r = parseDesignMd(SAMPLE);
        expect(r.tokens.brands.nxt.primary).toBe('#0D0D0D');
        expect(r.tokens.brands.nu.accent).toBe('#C8102E');
    });

    it('preserves the raw markdown body for AI prompt injection', () => {
        const r = parseDesignMd(SAMPLE);
        expect(r.rawMarkdown).toContain('# NXT Humans Design System');
        expect(r.rawMarkdown).toContain('Flat and minimal.');
        expect(r.rawMarkdown).not.toContain('---\nname:');
    });

    it('throws when frontmatter is missing', () => {
        expect(() => parseDesignMd('# Just a doc\nno frontmatter here')).toThrow(/frontmatter/i);
    });

    it('throws when frontmatter YAML is malformed', () => {
        expect(() => parseDesignMd('---\nname: [unclosed\n---\n# Body')).toThrow();
    });
});
