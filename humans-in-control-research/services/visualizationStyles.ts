/**
 * Visualization Style System — 10 executive-grade illustration archetypes
 * Based on modern commercial illustration research.
 * Each style has prompt blueprints for: portraits, scenes, diagrams, charts, icons.
 */

export interface VisualizationStyle {
    id: string;
    name: string;
    shortLabel: string;
    description: string;
    archetype: string;
    preview: string; // emoji/icon hint
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

export const VISUALIZATION_STYLES: VisualizationStyle[] = [
    {
        id: 'photorealistic',
        name: 'Cinematic Photorealism',
        shortLabel: 'Photo',
        description: 'Professional editorial photography with subtle data overlays. Apple-style design language.',
        archetype: 'Default',
        preview: 'P',
        promptBase: {
            portrait: 'Cinematic 4K editorial photography, 85mm lens, f/1.8, soft natural lighting, authentic diverse subject in professional context, subtle modern data overlays (glassmorphism UI)',
            scene: 'Professional cinematic photography of real-world business environment, clean UI elements floating in 3D space, minimalist data visualization, Future of Work aesthetic, 4K resolution',
            diagram: 'Clean professional infographic on white background, corporate color palette, modern flat design with subtle depth, clear labels and connections',
            chart: 'Premium data visualization, clean axes, professional typography, corporate blue/teal palette, white background',
            icon: 'Minimal professional icon, clean lines, corporate style',
        },
        negativeConstraints: 'Do not include: cartoon, low resolution, blurry, gibberish text, neon overload, cyberpunk',
        motionStyle: 'Subtle UI animations, data reveals, smooth camera movements',
    },
    {
        id: 'geometric_minimal',
        name: 'Geometric Minimalism',
        shortLabel: 'Minimal',
        description: 'Bold silhouettes, tight geometry, meaningful negative space. Magazine-cover sophistication.',
        archetype: 'A',
        preview: 'A',
        promptBase: {
            portrait: 'Ultra-minimal editorial illustration, hard-edged vector geometry, two-tone plus accent palette, high-contrast silhouette with active negative space forming a second hidden symbol, crisp clean edges, no gradients, premium magazine-cover composition',
            scene: 'Minimal geometric editorial illustration, bold silhouettes, flat color fields, one clever conceptual metaphor, generous margins, hard-edged vector shapes, two-tone palette with one accent color',
            diagram: 'Geometric diagram with bold flat shapes, minimal color palette, clean connecting lines, negative space as design element, infographic clarity',
            chart: 'Minimalist chart with geometric shapes as data points, flat color, clean typography, single conceptual twist in the visualization',
            icon: 'Bold geometric icon, single color, negative space design, instantly readable at small size',
        },
        negativeConstraints: 'Do not include: gradients, photorealism, 3D rendering, texture, ornament, busy backgrounds',
        motionStyle: 'Morphing silhouettes, wipe-reveals, figure/ground flips, minimal loops',
    },
    {
        id: 'corporate_vector',
        name: 'Corporate Vector Clarity',
        shortLabel: 'Vector',
        description: 'Clean shapes, readable characters, tight conceptual metaphors. Enterprise-trusted.',
        archetype: 'B',
        preview: 'B',
        promptBase: {
            portrait: 'Modern corporate vector illustration, flat colors, simplified character with readable gestures, bold but controlled 4-6 color palette, consistent stroke weight, clean geometry',
            scene: 'Corporate vector illustration system, flat colors, modular scene-building, simplified characters in professional settings, minimal texture, clear conceptual metaphor, designed for presentation slides',
            diagram: 'Clean vector diagram, isotype pictograph system, consistent line weight, modular tile layout, empty space for labels, 4-color palette',
            chart: 'Clean vector chart with illustrated context frame, pictograph data points, flat color fills, professional but approachable',
            icon: 'Consistent stroke weight icon, geometric, flat color, readable at 16px, part of a unified system',
        },
        negativeConstraints: 'Do not include: photorealism, heavy texture, hand-drawn feel, ornate detail, 3D effects',
        motionStyle: '2D motion design, sliding panels, simple rigged character gestures, icon-to-diagram transforms',
    },
    {
        id: 'narrative_tableau',
        name: 'Ornate Narrative Tableau',
        shortLabel: 'Ornate',
        description: 'High-detail symbolic worlds for vision, mission, and complex systems. Storybook meets editorial.',
        archetype: 'C',
        preview: 'C',
        promptBase: {
            portrait: 'Highly detailed narrative illustration portrait, layered depth, intricate patterning, symbolic objects surrounding subject, controlled lighting, storybook-meets-editorial tone, rich harmonized palette',
            scene: 'Richly detailed narrative illustration, layered depth, intricate patterning, symbolic objects, controlled lighting, storybook-meets-editorial tone, embed 5-7 symbolic elements representing subpoints, calm negative-space zone for text',
            diagram: 'Illustrated allegorical scene functioning as a diagram, symbolic objects as data nodes, path metaphors as connections, ornate but readable, rich palette',
            chart: 'Diegetic data visualization embedded in an illustrated world: banners showing numbers, signposts showing categories, artifacts containing statistics',
            icon: 'Ornate illustrated icon with fine line detail, symbolic meaning, miniature narrative element',
        },
        negativeConstraints: 'Do not include: flat vector, minimal style, corporate sterility, photorealism',
        motionStyle: 'Slow cinematic camera moves, parallax multiplane, selective micro-animations (fluttering, drifting particles)',
    },
    {
        id: 'expressive_paint',
        name: 'Expressive Gouache & Paint',
        shortLabel: 'Paint',
        description: 'Energy, humanity, and tension. Bold brushstrokes for leadership stories and transformation.',
        archetype: 'D',
        preview: 'D',
        promptBase: {
            portrait: 'Expressive gouache-on-paper portrait, visible brush texture, layered paint swathes, imperfect edges, bold color blocks, energetic gestural marks, emphasis on expression and body language, textured paper grain',
            scene: 'Expressive gouache illustration, visible brush texture, bold color blocks, energetic gestural marks, minimal line drawing accents, emotional and human-centered composition, textured paper grain background',
            diagram: 'Painterly diagram with brush-stroke connections, color regions as categories, expressive but readable, gouache texture throughout',
            chart: 'Clean chart paired with expressive painted color field backgrounds, data is precise but framing is emotional and textured',
            icon: 'Bold brush-stroke icon, single gesture, expressive mark-making, imperfect edges',
        },
        negativeConstraints: 'Do not include: vector art, hard edges, digital perfection, corporate sterility, flat design',
        motionStyle: 'Brushstroke reveals, paint spreading, gradient flow, texture shimmer',
    },
    {
        id: 'digital_collage',
        name: 'Textured Digital Collage',
        shortLabel: 'Collage',
        description: 'Smart editorial feel. Assembled metaphor fragments for complex topics and market analysis.',
        archetype: 'E',
        preview: 'E',
        promptBase: {
            portrait: 'Contemporary editorial digital collage portrait, layered paper cutouts, scanned texture overlays, subtle misregistration, strong simplified forms, limited bold palette, tactile shadows between layers',
            scene: 'Digital collage illustration, layered paper cutouts, scanned textures, strong simplified forms, limited bold palette, tactile shadows between layers, conceptual metaphor assembled from fragments, one photographic texture element (grain/halftone)',
            diagram: 'Collage-style infographic, paper layer hierarchy, scanned texture fills for categories, bold typography labels, editorial magazine layout',
            chart: 'Chart with collage texture fills (not distorting values), paper-cut category labels, tactile editorial feel',
            icon: 'Cut-paper icon, slight shadow, textured fill, bold simplified form',
        },
        negativeConstraints: 'Do not include: photorealism, 3D rendering, clean vector, smooth gradients',
        motionStyle: 'Paper layers sliding, tearing reveals, stop-motion-esque transitions, collage piece drift',
    },
    {
        id: 'warm_retro',
        name: 'Warm Retro Slice-of-Life',
        shortLabel: 'Retro',
        description: 'Approachable, story-forward, cinematic. Perfect for persona stories and customer journeys.',
        archetype: 'F',
        preview: 'F',
        promptBase: {
            portrait: 'Warm contemporary editorial illustration portrait, soft retro character design, gentle texture, cinematic lighting, calm composition, muted base palette plus 2 bright accents',
            scene: 'Warm retro-modern editorial illustration, soft character design, gentle texture, cinematic environment lighting, mid-distance framing, 5-7 contextual props, muted base plus 2 bright accents, reserve space for callouts',
            diagram: 'Illustrated environment with data embedded naturally on screens, posters, and dashboards within the scene, warm retro color palette',
            chart: 'Clean data chart in a warm illustrated frame, retro character pointing to key data, gentle texture background',
            icon: 'Soft retro icon, gentle rounded shapes, warm palette, friendly and approachable',
        },
        negativeConstraints: 'Do not include: harsh edges, neon colors, corporate sterility, photorealism, dark themes',
        motionStyle: 'Parallax room scenes, day/night lighting shifts, UI overlays on devices, subtle character loops',
    },
    {
        id: 'typographic',
        name: 'Typographic & Lettering',
        shortLabel: 'Type',
        description: 'Lettering-forward. Type as personality carrier for brand voice and key messages.',
        archetype: 'G',
        preview: 'G',
        promptBase: {
            portrait: 'Custom hand-lettered name/title as hero element with illustrated character integrated around letterforms, consistent stroke rhythm, minimal palette plus one accent',
            scene: 'Custom hand-lettered headline integrated with illustration, lettering is the hero, supporting characters and objects wrap around letterforms, minimal palette, small ornamental motifs',
            diagram: 'Typographic diagram where labels are the visual heroes, hand-lettered category names, illustrated connections between words, decorative but readable',
            chart: 'Clean chart with hand-lettered axis labels and title, personality through typography, data remains precise',
            icon: 'Single hand-lettered initial or word functioning as icon, decorative stroke, personality-forward',
        },
        negativeConstraints: 'Do not include: standard fonts, photorealism, complex scenes that compete with lettering',
        motionStyle: 'Kinetic type, stroke-write-on animation, letters forming icons',
    },
    {
        id: 'printmaking',
        name: 'Printmaking & Heritage',
        shortLabel: 'Print',
        description: 'Authenticity, sustainability, history. Linocut/engraving for institutional storytelling.',
        archetype: 'H',
        preview: 'H',
        promptBase: {
            portrait: 'Modern linocut-inspired portrait illustration, carved line texture, limited 2-3 color ink palette, imperfect registration, paper grain, high-contrast hatching',
            scene: 'Linocut/woodcut-inspired illustration, carved line texture, limited ink palette (2-3 colors), imperfect registration, paper grain, high-contrast shading via hatch marks, vintage label annotations',
            diagram: 'Engraved-style diagram, hatch-mark shading, vintage scientific illustration feel, annotated with label-style typography',
            chart: 'Stamp-like pictograph chart, engraved line style, limited color, paper grain background',
            icon: 'Carved stamp icon, woodcut texture, bold simple form, imperfect edges',
        },
        negativeConstraints: 'Do not include: smooth gradients, photorealism, digital perfection, bright neon colors',
        motionStyle: 'Ink roll-on, carved reveal, halftone build, paper grain movement',
    },
    {
        id: 'doodle_energy',
        name: 'Doodle-Maximal Energy',
        shortLabel: 'Doodle',
        description: 'High energy, strong identity, unforgettable. Anti-corporate-cliche with discipline.',
        archetype: 'J',
        preview: 'J',
        promptBase: {
            portrait: 'Bold doodle-style character portrait, strong linework, playful expression, vibrant saturated palette, dense detail around subject, sticker-like quality',
            scene: 'High-energy doodle universe, dense character crowd scene, bold linework, playful iconography, controlled chaos with clear focal point plus supporting clusters, vibrant palette, 8-12 tiny Easter egg metaphors embedded in environment',
            diagram: 'Doodle-style diagram with hand-drawn connections, playful icons as nodes, sticker-like labels, energetic but readable',
            chart: 'Playful chart with doodle annotations, stamps and stickers as data callouts, energetic hand-drawn feel, bold colors',
            icon: 'Doodle icon, bold linework, vibrant color fill, playful character quality',
        },
        negativeConstraints: 'Do not include: corporate minimalism, photorealism, muted colors, sterile clean design',
        motionStyle: 'Boiling line animation, pop-on stickers, looping micro-gags, chaotic-but-timed reveals',
    },
];

export const DEFAULT_STYLE_ID = 'photorealistic';

export function getStyleById(id: string): VisualizationStyle {
    return VISUALIZATION_STYLES.find(s => s.id === id) || VISUALIZATION_STYLES[0];
}

/**
 * Build a complete image prompt using the selected style + context.
 */
export function buildStyledPrompt(
    styleId: string,
    context: 'portrait' | 'scene' | 'diagram' | 'chart' | 'icon',
    subject: string
): string {
    const style = getStyleById(styleId);
    const base = style.promptBase[context];
    return `${base}. Subject: ${subject}. ${style.negativeConstraints}`;
}
