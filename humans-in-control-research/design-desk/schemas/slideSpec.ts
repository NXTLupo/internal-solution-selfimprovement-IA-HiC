/**
 * SlideSpec — universal object-based slide schema.
 *
 * The architectural pivot: instead of the AI generating freeform HTML and
 * an exporter reverse-engineering the browser DOM, the AI generates a typed
 * SlideSpec JSON. Two renderers consume it:
 *   1. SlideSpecViewer (React) — paints to HTML/SVG for canvas preview
 *   2. emitSlidePptx (PptxGenJS) — writes native PPTX shapes
 *
 * Both renderers read the SAME source of truth, so canvas preview and
 * PPTX export always agree pixel-for-pixel. No DOM extraction, no
 * cross-realm bugs, no "headings missing" surprises.
 *
 * Coordinates are in slide INCHES on a 13.333"×7.5" 16:9 canvas.
 * Colors are 6-char hex without leading "#".
 * Font sizes are in POINTS.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Slide canvas
// ---------------------------------------------------------------------------

export const SLIDE_W_IN = 13.333;
export const SLIDE_H_IN = 7.5;

// ---------------------------------------------------------------------------
// Common pieces
// ---------------------------------------------------------------------------

const HexColorSchema = z.string().regex(/^[0-9A-Fa-f]{6}$/, 'Color must be 6-char hex without leading #');

const PositionSchema = z.object({
    x: z.number(),
    y: z.number(),
    w: z.number().min(0.01),
    h: z.number().min(0.01),
});

const DashSchema = z.enum(['solid', 'dash', 'sysDot', 'dashDot']).default('solid');

// ---------------------------------------------------------------------------
// Text object — multi-run capable for inline-styled phrases
// ---------------------------------------------------------------------------

export const TextRunSchema = z.object({
    text: z.string(),
    fontFamily: z.string().optional(),
    fontSize: z.number().min(1).max(200).optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    color: HexColorSchema.optional(),
    /** Letter-spacing in points (positive = wider, negative = tighter). */
    charSpacing: z.number().min(-50).max(50).optional(),
});

export const TextObjectSchema = PositionSchema.extend({
    type: z.literal('text'),
    /** One run for plain text; multiple runs for inline-formatted text
     *  (h1 with em, p with bold inserts, etc.). Each run carries its own
     *  styling. */
    runs: z.array(TextRunSchema).min(1),
    align: z.enum(['left', 'center', 'right']).default('left'),
    valign: z.enum(['top', 'middle', 'bottom']).default('top'),
    /** Semantic role for the renderer to apply additional treatment
     *  (e.g., 'h1' may get larger letter-spacing, 'eyebrow' may get
     *  a leading color rule). Optional — pure style still works without. */
    role: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Shape object — rect / roundRect / ellipse / etc
// ---------------------------------------------------------------------------

export const ShapeObjectSchema = PositionSchema.extend({
    type: z.literal('shape'),
    shape: z.enum(['rect', 'roundRect', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'parallelogram', 'diamond']),
    fill: HexColorSchema.optional(),
    /** Fill alpha 0..1 (1 = opaque). */
    fillAlpha: z.number().min(0).max(1).default(1),
    line: HexColorSchema.optional(),
    /** Border width in points. 0 or undefined = no border. */
    lineWidth: z.number().min(0).max(20).default(0),
    lineDash: DashSchema,
    /** For roundRect: corner radius in inches (NOT the OOXML guide ratio). */
    cornerRadius: z.number().min(0).optional(),
    role: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Line object — start + end points (for connectors, dividers)
// ---------------------------------------------------------------------------

export const LineObjectSchema = z.object({
    type: z.literal('line'),
    /** Start point in slide inches. */
    x1: z.number(),
    y1: z.number(),
    /** End point in slide inches. */
    x2: z.number(),
    y2: z.number(),
    color: HexColorSchema,
    /** Stroke width in points. */
    width: z.number().min(0.1).max(20).default(1),
    dash: DashSchema,
    arrowStart: z.boolean().default(false),
    arrowEnd: z.boolean().default(false),
    role: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Image object — for icons, raster fallbacks
// ---------------------------------------------------------------------------

export const ImageObjectSchema = PositionSchema.extend({
    type: z.literal('image'),
    /** Either a data URL or a URL string. */
    src: z.string(),
    role: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Object union + spec
// ---------------------------------------------------------------------------

export const SlideObjectSchema = z.discriminatedUnion('type', [
    TextObjectSchema,
    ShapeObjectSchema,
    LineObjectSchema,
    ImageObjectSchema,
]);

export const SlideSpecSchema = z.object({
    /** Canvas dimensions in inches. Defaults to 16:9 widescreen. */
    width: z.number().default(SLIDE_W_IN),
    height: z.number().default(SLIDE_H_IN),
    /** Background color (hex, no #). Defaults to white. */
    background: HexColorSchema.default('FFFFFF'),
    /** Z-order = array order (later = higher). */
    objects: z.array(SlideObjectSchema),
});

// ---------------------------------------------------------------------------
// Inferred TS types
// ---------------------------------------------------------------------------

export type TextRun = z.infer<typeof TextRunSchema>;
export type TextObject = z.infer<typeof TextObjectSchema>;
export type ShapeObject = z.infer<typeof ShapeObjectSchema>;
export type LineObject = z.infer<typeof LineObjectSchema>;
export type ImageObject = z.infer<typeof ImageObjectSchema>;
export type SlideObject = z.infer<typeof SlideObjectSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;

export interface ValidationOk { ok: true; value: SlideSpec; }
export interface ValidationErr { ok: false; error: string; issues?: any[]; }

export function validateSlideSpec(input: unknown): ValidationOk | ValidationErr {
    const r = SlideSpecSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const first = r.error.issues[0];
    return {
        ok: false,
        error: `${first.path.join('.') || 'spec'}: ${first.message}`,
        issues: r.error.issues,
    };
}
