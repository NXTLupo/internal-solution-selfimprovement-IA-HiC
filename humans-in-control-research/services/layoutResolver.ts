/**
 * Layout Resolver - Content-First Slide Architecture
 *
 * Deterministically maps content blocks to the best archetype template.
 * The AI declares WHAT to communicate (content blocks), and this module
 * decides HOW to present it (which archetype template to use).
 *
 * This eliminates:
 * - Empty metrics[]/bentoCells[] arrays (blocks only exist if content exists)
 * - Archetype monotony (diverse content naturally maps to diverse layouts)
 * - The AI "defaulting" to CONTENT_DATA_PANEL out of safety
 */

import type { Slide, SlideLayout, SlideMetric, BentoCell, ContentBlock, ContentBlockItem, SlideStyle } from '../types';

const ACCENT_ROTATION = ['#CC6644', '#B8B800', '#00B7C3'];
const getAccent = (i: number) => ACCENT_ROTATION[i % ACCENT_ROTATION.length];

const DEFAULT_STYLE: SlideStyle = {
    backgroundColor: '#FFFFFF',
    headerColor: '#1A1A1A',
    textColor: '#444444',
    accentColor: '#B8B800',
};

interface ResolvedLayout {
    layout: SlideLayout;
    mappedFields: Partial<Slide>;
}

/**
 * Resolve content blocks into the best archetype and map blocks to Slide fields.
 */
export function resolveLayout(
    blocks: ContentBlock[],
    bgPreference: 'light' | 'dark' = 'light'
): ResolvedLayout {
    const types = new Set(blocks.map(b => b.type));
    const hasType = (t: string) => types.has(t as any);

    // Count blocks of each type
    const blocksByType = (t: string) => blocks.filter(b => b.type === t);

    // --- Resolution rules (priority-ordered) ---

    // Rule 1: Section label only → SECTION_HEADER
    if (types.size === 1 && hasType('section_label')) {
        return { layout: 'SECTION_HEADER', mappedFields: {} };
    }

    // Rule 2: Title-level (no evidence, no metrics, no data) → TITLE_SLIDE
    if (!hasType('evidence_bullets') && !hasType('metric_cards') && !hasType('data_grid') &&
        !hasType('problem_statement') && !hasType('solution_points') && !hasType('persona_card') &&
        !hasType('journey_strip') && !hasType('comparison_row')) {
        return { layout: 'TITLE_SLIDE', mappedFields: mapToFields(blocks) };
    }

    // Rule 3: Problem + solution → PROBLEM_SOLUTION
    if (hasType('problem_statement') && hasType('solution_points')) {
        return { layout: 'PROBLEM_SOLUTION', mappedFields: mapToFields(blocks) };
    }

    // Rule 4: Hero stat + 3+ metric cards → CONTENT_INSIGHT_CHART
    const metricBlocks = blocksByType('metric_cards');
    const metricItemCount = metricBlocks.reduce((sum, b) => sum + (b.items?.length || 0), 0);
    if (hasType('hero_stat') && metricItemCount >= 3) {
        return { layout: 'CONTENT_INSIGHT_CHART', mappedFields: mapToFields(blocks) };
    }

    // Rule 5: Data grid with 4+ items OR 4+ distinct block types → BENTO_GRID
    const dataGridItems = blocksByType('data_grid').reduce((sum, b) => sum + (b.items?.length || 0), 0);
    if (dataGridItems >= 4 || types.size >= 4) {
        return { layout: 'BENTO_GRID', mappedFields: mapToFields(blocks) };
    }

    // Rule 6: 3+ card-style items without metrics → FULL_WIDTH_VIZ
    const evidenceItems = blocksByType('evidence_bullets').reduce((sum, b) => sum + (b.items?.length || 0), 0);
    if (evidenceItems >= 3 && !hasType('metric_cards') && !hasType('hero_stat')) {
        return { layout: 'FULL_WIDTH_VIZ', mappedFields: mapToFields(blocks) };
    }

    // Rule 7: Default → CONTENT_DATA_PANEL
    return { layout: 'CONTENT_DATA_PANEL', mappedFields: mapToFields(blocks) };
}

/**
 * Map content blocks to existing Slide interface fields.
 * This ensures the current HTML templates and PPTX renderers work unchanged.
 */
function mapToFields(blocks: ContentBlock[]): Partial<Slide> {
    const fields: Partial<Slide> = {};

    // Collect content[] from evidence_bullets
    const evidenceBullets = blocks.filter(b => b.type === 'evidence_bullets');
    if (evidenceBullets.length > 0) {
        const items: string[] = [];
        for (const block of evidenceBullets) {
            for (const item of (block.items || [])) {
                const text = item.text || '';
                const source = item.source ? ` (${item.source})` : '';
                items.push(text + source);
            }
        }
        fields.content = items.slice(0, 4);
    }

    // Collect metrics[] from metric_cards + hero_stat
    const metricItems: SlideMetric[] = [];
    const heroStats = blocks.filter(b => b.type === 'hero_stat');
    for (const hs of heroStats) {
        metricItems.push({
            label: hs.context || 'Key Metric',
            value: hs.value || '',
            unit: hs.unit,
            accentColor: getAccent(metricItems.length),
        });
    }
    const metricCards = blocks.filter(b => b.type === 'metric_cards');
    for (const mc of metricCards) {
        for (const item of (mc.items || [])) {
            metricItems.push({
                label: item.label || '',
                value: item.value || '',
                unit: item.unit,
                accentColor: getAccent(metricItems.length),
            });
        }
    }
    if (metricItems.length > 0) fields.metrics = metricItems;

    // Map quote_block → quote field
    const quoteBlock = blocks.find(b => b.type === 'quote_block');
    if (quoteBlock) {
        fields.quote = quoteBlock.text || '';
        // Add quote source to sources array
        if (quoteBlock.source) {
            fields.sources = [...(fields.sources || []), quoteBlock.source];
        }
    }

    // Map persona_card → persona fields
    const personaBlock = blocks.find(b => b.type === 'persona_card');
    if (personaBlock) {
        fields.personaName = personaBlock.name;
        fields.personaRole = personaBlock.role;
        fields.personaQuote = personaBlock.quote;
    }

    // Map problem_statement → problemStat
    const problemBlock = blocks.find(b => b.type === 'problem_statement');
    if (problemBlock) {
        fields.problemStat = {
            value: problemBlock.value || '',
            description: problemBlock.description || '',
        };
    }

    // Map solution_points → solutionPoints[]
    const solutionBlocks = blocks.filter(b => b.type === 'solution_points');
    if (solutionBlocks.length > 0) {
        const points: { title: string; description: string }[] = [];
        for (const sb of solutionBlocks) {
            for (const item of (sb.items || [])) {
                points.push({ title: item.title || '', description: item.description || '' });
            }
        }
        fields.solutionPoints = points.slice(0, 3);
    }

    // Map data_grid → bentoCells[]
    const dataGridBlocks = blocks.filter(b => b.type === 'data_grid');
    if (dataGridBlocks.length > 0) {
        const cells: BentoCell[] = [];
        for (const dg of dataGridBlocks) {
            for (const item of (dg.items || [])) {
                // Auto-determine cell type from data shape
                if (item.value && /^\d/.test(item.value)) {
                    cells.push({ type: 'stat', value: item.value, label: item.label, unit: item.unit, accentColor: getAccent(cells.length) });
                } else if (item.description && item.description.length > 50) {
                    cells.push({ type: 'indicator', label: item.label, text: item.description });
                } else {
                    cells.push({ type: 'stat', value: item.value || item.label || '', label: item.description || item.label || '', accentColor: getAccent(cells.length) });
                }
            }
        }
        fields.bentoCells = cells.slice(0, 6);
    }

    // Map comparison_row blocks → data for whatever template consumes them
    const compRows = blocks.filter(b => b.type === 'comparison_row');
    if (compRows.length > 0 && !fields.bentoCells) {
        fields.bentoCells = compRows.slice(0, 6).map((r, i) => ({
            type: 'stat' as const,
            label: r.dimension || '',
            value: `${r.ours || '?'} vs ${r.theirs || '?'}`,
            text: r.gap ? `Gap: ${r.gap}` : undefined,
            accentColor: getAccent(i),
        }));
    }

    // Map journey_strip → content bullets (for FULL_WIDTH_VIZ card rendering)
    const journeyBlocks = blocks.filter(b => b.type === 'journey_strip');
    if (journeyBlocks.length > 0 && !fields.content?.length) {
        fields.content = journeyBlocks.map(j => {
            const parts = [j.phase, j.action, j.pain ? `Pain: ${j.pain}` : ''].filter(Boolean);
            return parts.join(' - ') + (j.mot ? ' [Moment of Truth]' : '');
        });
    }

    // Collect all sources from all blocks
    const allSources: string[] = [...(fields.sources || [])];
    for (const block of blocks) {
        if (block.source) allSources.push(block.source);
        if (block.items) {
            for (const item of block.items) {
                if (item.source) allSources.push(item.source);
            }
        }
    }
    if (allSources.length > 0) {
        fields.sources = [...new Set(allSources)]; // deduplicate
    }

    // Map narrative_text → narrative/speakerNotes
    const narrativeBlocks = blocks.filter(b => b.type === 'narrative_text');
    if (narrativeBlocks.length > 0) {
        fields.narrative = narrativeBlocks.map(b => b.text || '').join(' ');
    }

    return fields;
}
