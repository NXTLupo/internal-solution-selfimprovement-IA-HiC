/**
 * E3.2 (2026-08-21). A RESEARCH-RUN RECAP VIDEO, BUILT FROM AIR.
 *
 * The plan gated this item behind one condition, and the condition is the interesting
 * part: no composition text reaches a frame until it has been through the same scrub
 * every other artifact goes through. A render bakes copy into pixels, and a pixel has no
 * repair path. Every other HiC gate can hand a bad sentence back to a repair pass; this
 * one cannot, so the scrub happens HERE, before a composition is even built, and the
 * renderer refuses again at its own door.
 *
 * What this composes is deliberately narrow. A deck already exists as slide payloads; a
 * recap is not a second deck, it is the run's ARGUMENT in sequence: the objective, the
 * thesis the deck argued, the evidence it rests on, the recommendation. Four to six
 * beats, one claim each, built from what AIR already holds.
 *
 * Authoring stays here rather than in the renderer sidecar because the brand tokens, the
 * lexicon and the citation rules all live on this side. The sidecar renders; it does not
 * decide what is sayable.
 */

import { stripFormatTells, deClicheText } from './slidePostProcessor';
import { extractPointers } from './citationPointerRegistry';
import { detectSlopInSlides } from './slopDetector';

export interface RecapBeat {
    /** Small monospace label, e.g. "01 / Objective". */
    step: string;
    /** The one sentence this beat asserts. */
    line: string;
    /** Optional supporting line. */
    sub?: string;
}

export interface RecapInput {
    /** The run's objective, as the user wrote it. */
    objective: string;
    /** The thesis the deck argued, when the run recorded one. */
    thesis?: string | null;
    /** Named sources the artifact actually cited. */
    sources: string[];
    /** The recommendation or closing judgment. */
    recommendation?: string | null;
    /** NXT or NU. Brand is a token flip, never a separate design. */
    brand?: 'nxt' | 'nu';
}

export interface RecapComposition {
    /** The HTML to hand the renderer, or null when the content was refused. */
    html: string | null;
    beats: RecapBeat[];
    /** Why nothing was composed. Empty when html is present. */
    refusals: string[];
}

const BRAND = {
    nxt: { rail: '#0D0D0D', accent: '#B8B800', onAccent: '#0D0D0D', display: '"Saira Condensed", "Archivo", sans-serif' },
    nu: { rail: '#0E1626', accent: '#C8102E', onAccent: '#FFFFFF', display: 'Lato, sans-serif' },
};

/** One sentence, scrubbed and pointer-free. Returns null when nothing usable survives. */
function sayable(raw: string | null | undefined): string | null {
    if (!raw) return null;
    // Pointers are addresses, not copy: a viewer must never see a file path, and a video
    // has no affordance to open one anyway.
    const { text } = extractPointers(String(raw));
    const scrubbed = stripFormatTells(deClicheText(text)).trim();
    if (scrubbed.length < 8) return null;
    return scrubbed.replace(/\s+/g, ' ');
}

/**
 * Build the beats. Every beat that survives is one the run actually recorded: an absent
 * thesis produces no thesis beat rather than an invented one.
 */
export function buildRecapBeats(input: RecapInput): RecapBeat[] {
    const beats: RecapBeat[] = [];
    const objective = sayable(input.objective);
    if (objective) {
        beats.push({ step: '01 / Objective', line: objective.slice(0, 180) });
    }
    const thesis = sayable(input.thesis);
    if (thesis) {
        beats.push({ step: '02 / What the evidence says', line: thesis.slice(0, 180) });
    }
    const named = (input.sources || []).map(s => sayable(s)).filter(Boolean) as string[];
    if (named.length) {
        beats.push({
            step: '03 / Where it came from',
            line: 'Drawn from the sources named here, each one openable in the workspace.',
            sub: named.slice(0, 6).join('  ·  '),
        });
    }
    const rec = sayable(input.recommendation);
    if (rec) {
        beats.push({ step: '04 / What follows', line: rec.slice(0, 180) });
    }
    return beats;
}

const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Compose, or refuse. The refusal path is the reason this function exists: it runs the
 * same slop detector the artifact chain runs, and a beat that trips it is not rendered
 * at lower quality, it is not rendered at all.
 */
export function buildRecapComposition(input: RecapInput): RecapComposition {
    const beats = buildRecapBeats(input);
    const refusals: string[] = [];

    if (beats.length < 2) {
        refusals.push('fewer than two usable beats: a recap of one sentence is not worth a render');
    }

    // Reuse the artifact-chain detector by shaping each beat as a slide-like object, so
    // there is one lexicon and one detector rather than a second copy for video.
    const asSlides = beats.map((b, i) => ({
        id: `beat-${i + 1}`,
        template: 'slides:thesis-interstitial',
        title: b.line,
        composerPayload: { title: b.line, ...(b.sub ? { intro: b.sub } : {}) },
    }));
    const slop = detectSlopInSlides(asSlides);
    for (const site of slop) {
        refusals.push(`${site.slideId} carries the banned phrase "${site.phrase}", which cannot be repaired once it is a pixel`);
    }

    if (refusals.length) return { html: null, beats, refusals };

    const tok = BRAND[input.brand === 'nu' ? 'nu' : 'nxt'];
    const perBeat = 5.5;
    const duration = Number((beats.length * perBeat).toFixed(2));

    const scenes = beats.map((b, i) => `
      <div id="s${i}" class="scene">
        <div class="rail"></div>
        <div class="step">${esc(b.step)}</div>
        <div class="line">${esc(b.line)}</div>
        ${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ''}
      </div>`).join('');

    const timeline = beats.map((b, i) => {
        const at = Number((i * perBeat).toFixed(2));
        const out = Number((at + perBeat).toFixed(2));
        const arrive = i === 0 ? 0.2 : at;
        return `
      tl.to("#s${i}", { opacity: 1, duration: 0.5, ease: "sine.inOut" }, ${Math.max(0, arrive - 0.3)});
      tl.fromTo("#s${i} .line", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, ${arrive});
      ${i < beats.length - 1 ? `tl.to("#s${i}", { opacity: 0, duration: 0.45, ease: "sine.inOut" }, ${out - 0.3});` : ''}`;
    }).join('');

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${tok.rail}; }
      body { font-family: Archivo, system-ui, sans-serif; color: #FFFFFF; }
      .scene { position: absolute; inset: 0; opacity: 0; padding: 0 160px; display: flex; flex-direction: column; justify-content: center; }
      #s0 { opacity: 1; }
      .rail { position: absolute; left: 0; top: 0; width: 8px; height: 1080px; background: ${tok.accent}; }
      .step { font-family: "IBM Plex Mono", monospace; font-size: 24px; letter-spacing: 0.2em; color: ${tok.accent}; margin-bottom: 22px; }
      .line { font-family: ${tok.display}; font-weight: 600; font-size: 74px; line-height: 1.06; max-width: 1500px; }
      .sub { font-size: 26px; color: #A3A3A3; margin-top: 26px; max-width: 1400px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="hic-recap" data-start="0" data-duration="${duration}"
         data-width="1920" data-height="1080" data-fps="30">${scenes}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });${timeline}
      window.__timelines["hic-recap"] = tl;
    </script>
  </body>
</html>`;

    return { html, beats, refusals: [] };
}
