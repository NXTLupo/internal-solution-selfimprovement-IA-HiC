/**
 * SlideArtifact - wraps a SlideSpec with the same shape as the legacy
 * FreeformArtifact (id / kind / brand / title / citations / timestamps),
 * so it slots into the existing designDeskStore without changes.
 *
 * The store sees `type: 'slide'` artifacts alongside `type: 'freeform'`
 * artifacts. Both are valid; the renderer in ArtifactViewer picks the
 * appropriate path based on `type`.
 */

import { z } from 'zod';
import { SlideSpecSchema, type SlideSpec } from './slideSpec';
import { BrandSchema, type ValidationResult } from './personaArtifact';
import { FreeformKindSchema, type FreeformKind } from './freeformArtifact';

export const SlideArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('slide'),
    kind: FreeformKindSchema,
    brand: BrandSchema,
    title: z.string().min(1),
    spec: SlideSpecSchema,
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type SlideArtifact = z.infer<typeof SlideArtifactSchema>;
export type { SlideSpec, FreeformKind };

export function validateSlideArtifact(input: unknown): ValidationResult<SlideArtifact> {
    const r = SlideArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const first = r.error.issues[0];
    return { ok: false, error: `${first.path.join('.')}: ${first.message}` };
}
