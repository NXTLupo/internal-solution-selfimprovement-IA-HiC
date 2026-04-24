import { parse as parseYaml } from 'yaml';

export interface DesignTokens {
    name: string;
    version: string;
    brands: Record<string, Record<string, string | number>>;
    typography?: Record<string, any>;
    layout?: Record<string, any>;
    iconography?: Record<string, any>;
    [key: string]: any;
}

export interface ParsedDesignMd {
    tokens: DesignTokens;
    rawMarkdown: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function parseDesignMd(source: string): ParsedDesignMd {
    const match = source.match(FRONTMATTER_RE);
    if (!match) {
        throw new Error('DESIGN.md missing YAML frontmatter block');
    }
    const yamlBlock = match[1];
    const rawMarkdown = source.slice(match[0].length).trimStart();
    let tokens: DesignTokens;
    try {
        tokens = parseYaml(yamlBlock) as DesignTokens;
    } catch (e: any) {
        throw new Error(`DESIGN.md frontmatter YAML malformed: ${e.message}`);
    }
    if (!tokens?.name || !tokens?.brands) {
        throw new Error('DESIGN.md frontmatter must define `name` and `brands`');
    }
    return { tokens, rawMarkdown };
}

export async function loadDesignMd(url = '/DESIGN.md'): Promise<ParsedDesignMd> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load DESIGN.md (${resp.status})`);
    const text = await resp.text();
    return parseDesignMd(text);
}
