// sectionMaps.ts - 2026-10-27
//
// Every slide carries a visual (owner goal: "professional, high quality images ... and/or diagramming ... for every
// slide we create"). Covers and section dividers wait on a generated photograph, and the image critic refuses
// photographs that read as synthetic, so on run 45 the cover and all four dividers shipped as bare type. When image
// models cannot carry an abstract idea, the deck draws it (owner: "WHEN IMAGE MODELS CANT VISUALIZE ABSTRACT CONCEPTS USE
// OUR DIAGRAMMING TOOL"). A divider's honest picture is a map of its own section: one labelled layer per topic the
// section's slides cover, in order. The cover maps the deck's sections from the agenda. Deterministic and content-true;
// the viz block renders through vizSlot.attachViz at compose time, and an accepted photograph still takes the slot.

type DeckSlide = { template?: string; composerPayload?: any };

const CONNECTIVE = /^slides:(cover|agenda|section-divider|thesis-interstitial|scene)$/;
const KEEP_CAPS = new Set(['AI', 'NXT', 'CFS', 'QA', 'CX', 'UX', 'IP', 'IT', 'HR', 'ROI', 'SOW', 'T&M', 'NTE', 'CIO', 'CRM', 'API', 'NFP', 'NU']);

/** A kicker as a short label: numbering and trailing detail dropped, sentence case. */
function topicOf(raw: unknown): string {
    let t = String(raw ?? '').replace(/^\s*\d{1,2}\s*[|.:)-]\s*/, '').split(/\s+[·|]\s+/)[0].trim();
    if (!t) return '';
    if (t === t.toUpperCase()) {
        const caps = new Set(t.split(/[^A-Z&]+/).filter(w => w.length <= 3 && KEEP_CAPS.has(w)));
        t = t.charAt(0) + t.slice(1).toLowerCase();
        // acronyms and the house brand keep their case (live: "The nxt humans offer")
        t = t.replace(/\b[A-Za-z&]{2,3}\b/g, w => (caps.has(w.toUpperCase()) ? w.toUpperCase() : w)).replace(/\bNXT humans\b/g, 'NXT Humans');
    }
    return t.length > 42 ? t.slice(0, 42).replace(/\s+\S*$/, '') : t;
}

function hasPicture(p: any): boolean {
    return !!p && ['heroImage', 'backgroundImage', 'panelImage', 'illustration'].some(k => typeof p[k] === 'string' && p[k]);
}

/** Attach a section map to each divider (and a deck map to the cover) that has no picture and no authored viz.
 *  Mutates the slides' composerPayload; returns the number of maps attached. */
export function attachSectionMaps(slides: DeckSlide[]): number {
    let n = 0;
    const tmpl = (s: DeckSlide) => String(s?.template || '');
    slides.forEach((s, i) => {
        if (tmpl(s) !== 'slides:section-divider') return;
        const p = s.composerPayload;
        if (!p || p.viz || hasPicture(p)) return;
        const topics: string[] = [];
        for (let j = i + 1; j < slides.length && tmpl(slides[j]) !== 'slides:section-divider'; j++) {
            if (CONNECTIVE.test(tmpl(slides[j]))) continue;
            const q = slides[j]?.composerPayload || {};
            const k = topicOf(q.kicker || q.eyebrow || q.topicKicker);
            if (k && !topics.some(x => x.toLowerCase() === k.toLowerCase())) topics.push(k);
        }
        if (topics.length < 2) return;
        s.composerPayload = { ...p, viz: { family: 'capabilityStack', labels: topics.slice(0, 5) } };
        n++;
    });
    // The cover maps the deck: one short topic per section (the kicker of the section's first content slide). Agenda
    // sentences are too long for a diagram label (live: "Clients buy working software that senior" was cut mid-phrase).
    const cover = slides.find(s => tmpl(s) === 'slides:cover');
    const cp = cover?.composerPayload;
    if (cover && cp && !cp.viz && !hasPicture(cp)) {
        const sections: string[] = [];
        slides.forEach((s, i) => {
            if (tmpl(s) !== 'slides:section-divider') return;
            for (let j = i + 1; j < slides.length && tmpl(slides[j]) !== 'slides:section-divider'; j++) {
                if (CONNECTIVE.test(tmpl(slides[j]))) continue;
                const q = slides[j]?.composerPayload || {};
                const k = topicOf(q.kicker || q.eyebrow || q.topicKicker);
                if (k && !sections.some(x => x.toLowerCase() === k.toLowerCase())) sections.push(k);
                break;
            }
        });
        if (sections.length >= 2) { cover.composerPayload = { ...cp, viz: { family: 'capabilityStack', labels: sections.slice(0, 5) } }; n++; }
    }
    return n;
}
