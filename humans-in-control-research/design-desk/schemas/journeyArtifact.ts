import { z } from 'zod';
import { BrandSchema, type ValidationResult } from './personaArtifact';

export const JourneyStageSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    emotion: z.enum(['positive', 'neutral', 'negative']),
    touchpoints: z.array(z.string()).default([]),
    painPoints: z.array(z.string()).default([]),
    opportunities: z.array(z.string()).default([]),
});

export const JourneyArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('journey'),
    brand: BrandSchema,
    title: z.string().min(1),
    stages: z.array(JourneyStageSchema).min(1),
    connections: z.array(z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        label: z.string().optional(),
    })).default([]),
    layout: z.object({
        nodes: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
    }).optional(),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
}).superRefine((val, ctx) => {
    const ids = new Set(val.stages.map(s => s.id));
    for (const conn of val.connections) {
        if (!ids.has(conn.from)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['connections'], message: `connection.from "${conn.from}" references nonexistent stage` });
        }
        if (!ids.has(conn.to)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['connections'], message: `connection.to "${conn.to}" references nonexistent stage` });
        }
    }
});

export type JourneyArtifact = z.infer<typeof JourneyArtifactSchema>;

export function validateJourneyArtifact(input: unknown): ValidationResult<JourneyArtifact> {
    const r = JourneyArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
