import { describe, it, expect } from 'vitest';
import { correctTranscriptArtifacts } from './quoteExtractor';

// RC5: ASR errors leaked verbatim into deck quotes - "Claude" mis-transcribed
// as "clawed" ("you get clawed out of the box", "they have clawed skills") and
// filler "yada yada yada" survived into an evidence quote. correctTranscriptArtifacts
// repairs these conservatively without touching genuine prose.

describe('correctTranscriptArtifacts (RC5)', () => {
    it('fixes "clawed" -> "Claude" in product-domain contexts', () => {
        expect(correctTranscriptArtifacts('they have clawed skills that know how to create a deck'))
            .toBe('they have Claude skills that know how to create a deck');
        expect(correctTranscriptArtifacts('you get clawed out of the box, you get none of these things'))
            .toBe('you get Claude out of the box, you get none of these things');
    });

    it('leaves a genuine non-AI use of "clawed" alone', () => {
        const sentence = 'the cat clawed the leather sofa to shreds overnight';
        expect(correctTranscriptArtifacts(sentence)).toBe(sentence);
    });

    it('drops "yada yada yada" filler and repairs spacing/punctuation', () => {
        expect(correctTranscriptArtifacts('each of these sub-chunks cross-reference and yada yada yada. So we are going in the right direction.'))
            .toBe('each of these sub-chunks cross-reference. So we are going in the right direction.');
    });

    it('is a no-op on clean prose', () => {
        const clean = 'the manifest model avoids stuffing all context into every prompt.';
        expect(correctTranscriptArtifacts(clean)).toBe(clean);
    });
});
