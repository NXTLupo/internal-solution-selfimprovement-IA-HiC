/**
 * NXT Humans Design System - Single Unified Visual Language
 *
 * Anti-Slop Business Flat Minimalism.
 *
 * This replaces the previous 20-style selector. There is ONE visual system
 * for all NXT Humans deliverables. It is governed by the Visualization
 * Design System Style Guide and enforced by the wiki knowledge layer.
 *
 * Philosophy: "If it looks like AI made it, it's wrong."
 *
 * The style sits at the intersection of Swiss International Style (grid
 * discipline, typographic hierarchy, functional color) and editorial
 * brutalism (oversized type, stark contrast, content-as-decoration).
 */

export interface VisualizationStyle {
    id: string;
    name: string;
    shortLabel: string;
    description: string;
    verticals: string;
    promptBase: {
        portrait: string;
        scene: string;
        diagram: string;
        chart: string;
        icon: string;
    };
    negativeConstraints: string;
    motionStyle: string;
}

// --- THE NXT HUMANS VISUAL LANGUAGE ---

const NXT_DESIGN_SYSTEM_PROMPT = {
    portrait: [
        'Flat geometric vector minimalist portrait illustration.',
        'Built from rectangles, circles, and clean straight lines only.',
        'Maximum 3 colors: near-black (#0D0D0D) as primary, one gray (#999999) for secondary shapes,',
        'and ONE accent color - either muted chartreuse (#B8B800) or deep cyan (#00B7C3) - for the single focal element.',
        'Solid flat fills only. Crisp vector edges.',
        'Negative space is a deliberate design element - use it to create form.',
        'No facial features unless absolutely necessary. Geometric abstraction preferred.',
        'Style reference: Massimo Vignelli meets Swiss International Style.',
    ].join(' '),

    scene: [
        'Flat geometric vector minimalist scene illustration.',
        'Anti-slop business flat minimalism. Swiss International Style discipline.',
        'Built from rectangles, circles, triangles, and straight lines with right-angle turns only.',
        'Maximum 3 colors: near-black (#0D0D0D), one gray (#999999 or #666666), and ONE accent -',
        'either muted chartreuse (#B8B800) or deep cyan (#00B7C3). Never both accents together.',
        'Solid flat fills only. No gradients, no shadows, no 3D, no glow, no textures.',
        'Crisp vector edges at any scale. Negative space is a deliberate compositional element.',
        'High information density with clear visual hierarchy.',
        'The accent color marks the single most important element - the one thing the viewer should notice first.',
        'Every shape earns its place through function: communicating hierarchy, directing attention, or making data legible.',
    ].join(' '),

    diagram: [
        'Flat geometric vector diagram in the NXT Humans design system.',
        'Boxes with 1px #E0E0E0 borders on white background, OR solid #F5F5F0 fill with no border. Sharp corners (0px radius).',
        'Connecting lines: straight with right-angle turns only. 1-2px weight. #999999 color. No bezier curves.',
        'Arrowheads: small filled triangles, 6-8px wide, same color as line.',
        'Labels: clean sans-serif (Archivo style) at small size, placed above or to the right of each element.',
        'ONE node in the diagram may use #B8B800 (chartreuse) border or fill to mark it as the focus. All others neutral.',
        'Flow direction: left-to-right (process flows) or top-to-bottom (hierarchies). NEVER diagonal.',
        'No gradients, no shadows, no rounded blob shapes, no decorative elements.',
        'Background: pure white (#FFFFFF).',
    ].join(' '),

    chart: [
        'Clean data visualization following McKinsey/Zelazny standards.',
        'Neutral base color (#999999 or #BBBBBB) for all data elements.',
        'ONE element highlighted in chartreuse (#B8B800) or cyan (#00B7C3) - this is the element the conclusion refers to.',
        'No pie charts. Use horizontal bars for comparison, lines for trends, waterfall for cumulative impact.',
        'Y-axis starts at zero on all bar charts. Minimal gridlines in #EEEEEE if needed.',
        'Axes: 1px #E0E0E0 lines. Labels in small clean sans-serif.',
        'Source citation required: small text below chart.',
        'No 3D effects, no gradients, no decorative elements, no rounded corners.',
        'Background: pure white (#FFFFFF). Black (#0D0D0D) header if used in table context.',
    ].join(' '),

    icon: [
        'Monoline geometric icon in NXT Humans design system.',
        'Single weight stroke (2px at 24px base size). Near-black (#0D0D0D) on white.',
        'Built from straight lines, rectangles, circles, and triangles only.',
        'No filled circles with white cut-out icons (this is the most overused AI icon pattern).',
        'Square or circular keyline container if part of a set. No mixed container shapes.',
        'Maximum one accent color element per icon set.',
        'No gradients, no shadows, no organic curves, no rounded blob shapes.',
    ].join(' '),
};

const NXT_NEGATIVE_CONSTRAINTS = [
    'ABSOLUTELY NO: gradients, gradient meshes, drop shadows, box shadows, inner shadows, glow effects.',
    'NO 3D effects, isometric views, perspective transforms, skeuomorphism.',
    'NO rounded blob shapes, organic curves, wavy lines, hand-drawn aesthetics.',
    'NO duotone photo treatments, photo-illustration hybrids, raster textures, noise overlays.',
    'NO icons inside colored circles. NO neon glow. NO lens flare. NO aurora/mesh effects.',
    'NO purple, pink, orange, rainbow, or pastel color sequences.',
    'NO Inter, Roboto, Arial, Poppins, Space Grotesk typefaces.',
    'NO decorative elements that do not communicate information.',
    'NO pie charts or donut charts. NO diagonal flow lines.',
    'CRITICAL - NO TEXT IN IMAGES: Do NOT render any text, words, letters, numbers, labels, captions, titles, headings, or typography inside the image. AI image models cannot spell - text baked into pixels will contain errors that are impossible to fix. All text will be added as a separate overlay layer at render time. The image must contain ZERO readable characters.',
    'If it looks like AI made it, it is wrong. Redesign.',
].join(' ');

const NXT_MOTION_STYLE = 'Clean geometric motion. Elements slide in from edges, scale from center, or draw themselves with precise vector strokes. No bouncy physics, no elastic easing, no particle effects. Timing: deliberate and measured, not playful.';

const NXT_STYLE: VisualizationStyle = {
    id: 'nxt_design_system',
    name: 'NXT Humans Design System',
    shortLabel: 'NXT',
    description: 'Anti-slop business flat minimalism. Swiss International Style meets editorial brutalism. The single visual language for all NXT Humans deliverables.',
    verticals: 'All - CX consulting, enterprise strategy, product management, technology audit',
    promptBase: NXT_DESIGN_SYSTEM_PROMPT,
    negativeConstraints: NXT_NEGATIVE_CONSTRAINTS,
    motionStyle: NXT_MOTION_STYLE,
};

// --- EXPORTS (backward-compatible interface) ---

/**
 * The single visualization style. This array exists for backward compatibility
 * with code that iterates VISUALIZATION_STYLES. It contains exactly one entry.
 */
const VISUALIZATION_STYLES: VisualizationStyle[] = [NXT_STYLE];

export const DEFAULT_STYLE_ID = 'nxt_design_system';

/**
 * Returns the NXT Humans design system style. The styleId parameter
 * is accepted for backward compatibility but always returns the same style.
 */
export function getStyleById(_styleId?: string): VisualizationStyle {
    return NXT_STYLE;
}

