import { z } from 'zod';
import { BrandSchema, type ValidationResult } from './personaArtifact';

export const OrgNodeSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    title: z.string().min(1),
    department: z.string().optional(),
    directReports: z.array(z.string()).default([]),
    location: z.string().optional(),
    email: z.string().optional(),
    iconKey: z.enum(['person', 'vacant', 'team', 'external']).optional(),
});

export const OrgChartArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('org'),
    brand: BrandSchema,
    title: z.string().min(1),
    nodes: z.array(OrgNodeSchema).min(1),
    rootIds: z.array(z.string().min(1)).min(1),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    layout: z.object({
        // nodes is optional — when only direction changes (e.g., user asks
        // for radial), the model SHOULD omit nodes so the renderer recomputes
        // positions. Required-nodes was a foot-gun that produced
        // "layout.nodes: Invalid input" failures on legitimate revisions.
        nodes: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
        direction: z.enum(['TB', 'LR', 'BT', 'RL', 'radial']),
    }).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
}).superRefine((val, ctx) => {
    const ids = new Set(val.nodes.map(n => n.id));
    for (const rootId of val.rootIds) {
        if (!ids.has(rootId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rootIds'], message: `rootIds entry "${rootId}" references nonexistent node` });
        }
    }
    for (const node of val.nodes) {
        for (const reportId of node.directReports) {
            if (!ids.has(reportId)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nodes'], message: `node "${node.id}" has directReport "${reportId}" that doesn't exist` });
            }
        }
    }
});

export type OrgChartArtifact = z.infer<typeof OrgChartArtifactSchema>;

export function validateOrgChartArtifact(input: unknown): ValidationResult<OrgChartArtifact> {
    const r = OrgChartArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
