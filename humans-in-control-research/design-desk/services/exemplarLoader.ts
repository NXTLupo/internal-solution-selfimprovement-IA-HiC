/**
 * Exemplar loader - loads the canonical 1920x1080 HTML exemplar for a given
 * (kind, brand) pair plus the matching brand-style and diagram-illustrator
 * skill markdown. The exemplar HTML is the visual ground truth - the model
 * adapts content but preserves the frame, typography, atmospheric treatment.
 *
 * Vite ?raw imports bundle the file content as a string at build time. After
 * editing any exemplar HTML or SKILL.md, a Docker rebuild is required (no
 * HMR in production).
 */

import type { FreeformKind } from '../schemas/freeformArtifact';
import type { BrandHashtag } from './hashtagParser';

import bpNuHtml from '../../styles/01-service-blueprint-NU.html?raw';
import bpNxtHtml from '../../styles/02-service-blueprint-NXT.html?raw';
import archNuHtml from '../../styles/03-architecture-NU.html?raw';
import archNxtHtml from '../../styles/04-architecture-NXT.html?raw';
import orgNuHtml from '../../styles/05-org-chart-NU.html?raw';
import orgNxtHtml from '../../styles/06-org-chart-NXT.html?raw';
import roadmapNuHtml from '../../styles/07-roadmap-NU.html?raw';
import roadmapNxtHtml from '../../styles/08-roadmap-NXT.html?raw';
// 2026-05-09: Journey-specific exemplars (no longer share with blueprint).
// These embody the 10-point design spec: 12-col grid, 3 horizontal bands
// (header/journey/synthesis), no brand-mark/seal/wordmark, voice-of-user
// row at bottom of journey band, synthesis + 4 metric tiles in bottom band.
import journeyNuHtml from '../../styles/09-journey-NU.html?raw';
import journeyNxtHtml from '../../styles/10-journey-NXT.html?raw';

import nxtBrandSkill from '../../exemplar-skills/brands/nxt-style/SKILL.md?raw';
import nuBrandSkill from '../../exemplar-skills/brands/nu-style/SKILL.md?raw';
// 2026-10-01 - DECIEM has no authored exemplar HTML yet (styles/ carries NU + NXT twins only).
// Brand is a token-set flip on shared geometry, so DECIEM reuses the NXT frame and carries its
// own brand-style text built from the brands.ts token set (see deciemBrandStyle.ts).
import { DECIEM_BRAND_STYLE_SKILL } from './deciemBrandStyle';

import orgSkill from '../../exemplar-skills/diagrams/org-illustrator/SKILL.md?raw';
import journeySkill from '../../exemplar-skills/diagrams/journey-illustrator/SKILL.md?raw';
import archSkill from '../../exemplar-skills/diagrams/arch-illustrator/SKILL.md?raw';
import roadmapSkill from '../../exemplar-skills/diagrams/roadmap-illustrator/SKILL.md?raw';
import blueprintSkill from '../../exemplar-skills/diagrams/blueprint-illustrator/SKILL.md?raw';

// Partial: only the diagram kinds (org/arch/roadmap/blueprint/journey) ship HTML
// exemplars; the other FreeformKind values resolve via fallback. (was a total
// Record, which tsc rejected for the missing keys.)
const EXEMPLARS: Partial<Record<FreeformKind, Record<BrandHashtag, string>>> = {
    org:       { nu: orgNuHtml,      nxt: orgNxtHtml,      deciem: orgNxtHtml      },
    arch:      { nu: archNuHtml,     nxt: archNxtHtml,     deciem: archNxtHtml     },
    roadmap:   { nu: roadmapNuHtml,  nxt: roadmapNxtHtml,  deciem: roadmapNxtHtml  },
    // 2026-05-09: Journey + blueprint NOW SHARE the new journey exemplar
    // (09/10) which embodies the 10-point design spec. Blueprint is
    // semantically a journey with pain-points-solved + recommendations
    // layered - the visual frame is identical; the diagram skill's
    // perKindGuidance handles the future-state framing and intervention
    // overlays. The old service-blueprint exemplars (01/02) are retired
    // from the registry but remain in styles/ for historical reference.
    blueprint: { nu: journeyNuHtml,  nxt: journeyNxtHtml,  deciem: journeyNxtHtml  },
    journey:   { nu: journeyNuHtml,  nxt: journeyNxtHtml,  deciem: journeyNxtHtml  },
};

const BRAND_SKILLS: Record<BrandHashtag, string> = {
    nxt: nxtBrandSkill,
    nu:  nuBrandSkill,
    deciem: DECIEM_BRAND_STYLE_SKILL,
};

const DIAGRAM_SKILLS: Partial<Record<FreeformKind, string>> = {
    org:       orgSkill,
    journey:   journeySkill,
    arch:      archSkill,
    roadmap:   roadmapSkill,
    blueprint: blueprintSkill,
};

export interface ExemplarBundle {
    exemplarHtml: string;
    brandSkill: string;
    diagramSkill: string;
}

export function loadExemplar(kind: FreeformKind, brand: BrandHashtag): ExemplarBundle {
    const kindMap = EXEMPLARS[kind];
    if (!kindMap) {
        // 2026-11-08 (live: a revision of an audio overview died with a raw "unknown kind").
        // Generated-media kinds have no HTML exemplar to revise against: the correct move is a
        // fresh generation carrying the correction, and the error now says exactly that.
        if (/^(audio-overview|video-overview|brief-dialog|mindmap|meta-themes|deep-research|infographic)$/i.test(String(kind))) {
            throw new Error(`This ${kind} artifact is regenerated rather than revised in place: run #${kind} again and put your correction in the prompt (it becomes the steering topic).`);
        }
        throw new Error(`exemplarLoader: unknown kind "${kind}"`);
    }
    const exemplarHtml = kindMap[brand];
    if (!exemplarHtml) throw new Error(`exemplarLoader: unknown brand "${brand}"`);
    const brandSkill = BRAND_SKILLS[brand];
    const diagramSkill = DIAGRAM_SKILLS[kind];
    if (!brandSkill || brandSkill.trim().length === 0) {
        throw new Error(`exemplarLoader: brand skill not authored - add content to .claude/skills/brands/${brand}-style/SKILL.md`);
    }
    if (!diagramSkill || diagramSkill.trim().length === 0) {
        throw new Error(`exemplarLoader: diagram skill not authored - add content to .claude/skills/diagrams/${kind}-illustrator/SKILL.md`);
    }
    return { exemplarHtml, brandSkill, diagramSkill };
}
