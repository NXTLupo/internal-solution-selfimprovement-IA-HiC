import { z } from 'zod';

// 2026-10-01 - DECIEM is the third brand mode (components/slideTemplates/brands.ts BrandId).
export const BrandSchema = z.enum(['nxt', 'nu', 'deciem']);

export const PersonaArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('persona'),
    brand: BrandSchema,
    name: z.string().min(1),
    role: z.string().min(1),
    goals: z.array(z.string().min(1)).min(1),
    painPoints: z.array(z.string().min(1)).min(1),
    jtbd: z.string().min(1),
    quotes: z.array(z.object({
        text: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type PersonaArtifact = z.infer<typeof PersonaArtifactSchema>;

export type ValidationResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

export function validatePersonaArtifact(input: unknown): ValidationResult<PersonaArtifact> {
    const r = PersonaArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
