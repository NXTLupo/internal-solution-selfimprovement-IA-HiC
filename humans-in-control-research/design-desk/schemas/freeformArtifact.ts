import { z } from 'zod';
import { BrandSchema, type ValidationResult } from './personaArtifact';

export const FreeformKindSchema = z.enum(['org', 'journey', 'arch', 'roadmap', 'blueprint']);
export type FreeformKind = z.infer<typeof FreeformKindSchema>;

export const FreeformArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('freeform'),
    kind: FreeformKindSchema,
    brand: BrandSchema,
    title: z.string().min(1),
    html: z.string().min(1),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type FreeformArtifact = z.infer<typeof FreeformArtifactSchema>;

export function validateFreeformArtifact(input: unknown): ValidationResult<FreeformArtifact> {
    const r = FreeformArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
