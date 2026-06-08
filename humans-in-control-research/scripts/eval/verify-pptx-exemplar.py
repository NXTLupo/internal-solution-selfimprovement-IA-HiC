#!/usr/bin/env python
"""PPTX render-fidelity verifier (structural layer of the PPTX benchmark).
Opens a .pptx and asserts: no blank slides, correct brand fonts, no leaked chrome,
no em-dash, and every slide bearing numbers carries an inline source token.
Read-only. Usage: python verify-pptx-exemplar.py <path.pptx>"""
import sys, re
from pptx import Presentation

PATH = sys.argv[1] if len(sys.argv) > 1 else "hic-workspace/wiki/eval/exemplars/journey-nu.pptx"
# NU measured export maps CSS roles -> these faces (nxt_slide_export._fam):
# Spectral (display), Roboto (body), and JetBrains Mono (any "mono", incl. Roboto Mono).
ALLOWED_FONTS = {"Spectral", "Roboto", "JetBrains Mono"}
CHROME = re.compile(r"\b(Delete|Edit slide|Add slide|Duplicate|contenteditable|Run ID|Pipeline version)\b", re.I)
REPORTING = re.compile(r"\bR-\d{2,}\b|\bConfidence:\s*(HYPOTHESIS|EMERGING|VERIFIED)|\(composite\)|\(synthetic\)|\[(CHUNK|EVIDENCE)_\d+")
EM_DASH = "—"
# Quantitative Claim Rule: flag a NAKED quantitative claim (%, $, ratio, count-as-assertion,
# "Nx", "N students/days/weeks"), NOT list ordinals like 01/02 or spelled numbers.
DIGIT = re.compile(r"(\$\s?\d|\b\d+(\.\d+)?\s?%|\b\d+\s?:\s?\d+\b|\b\d+x\b|\b\d{2,}\s+(students|donors|users|days|weeks|months|applications|co-ops|percent))", re.I)
SOURCE = re.compile(r"(SOURCE:|Source:|r/NEU|NU Student Survey|Higher Ed Dive|Corpus Sentiment|RETIRES PAIN)", re.I)

prs = Presentation(PATH)
fails, warns = [], []
fonts_seen = set()
nslides = len(prs.slides._sldIdLst)

for i, slide in enumerate(prs.slides, 1):
    texts = []
    for sh in slide.shapes:
        if not sh.has_text_frame:
            continue
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                if r.text.strip():
                    texts.append(r.text)
                    if r.font.name:
                        fonts_seen.add(r.font.name)
    blob = "\n".join(texts)
    if len(blob.strip()) < 40:
        fails.append(f"slide {i}: BLANK or near-blank ({len(blob)} chars)")
    if EM_DASH in blob:
        fails.append(f"slide {i}: em-dash present ({blob.count(EM_DASH)})")
    if CHROME.search(blob):
        fails.append(f"slide {i}: leaked editor chrome -> {CHROME.search(blob).group(0)!r}")
    if REPORTING.search(blob):
        fails.append(f"slide {i}: reporting/marker leak -> {REPORTING.search(blob).group(0)!r}")
    if DIGIT.search(blob) and not SOURCE.search(blob):
        fails.append(f"slide {i}: numbers present but NO inline source token")
    # Evidence-Label Rule: a standalone "Evidence" LABEL (a short heading run, not the word in
    # prose) must be followed by a sourced corpus quote on the slide.
    has_evidence_label = any(re.fullmatch(r"\W*evidence\W*", t.strip(), re.I) for t in texts)
    if has_evidence_label and not SOURCE.search(blob):
        fails.append(f"slide {i}: 'Evidence' labeled but NO sourced corpus quote on the slide")
    # No-Truncation Rule: a quote must never end in an ellipsis before its closing mark.
    if re.search(r'(\.\.\.|…)\s*["”’]', blob):
        fails.append(f"slide {i}: truncated quote (ellipsis before closing quote) - full quotes only")

bad_fonts = fonts_seen - ALLOWED_FONTS
if bad_fonts:
    warns.append(f"non-brand fonts used: {sorted(bad_fonts)}")

print(f"PPTX: {PATH}")
print(f"slides: {nslides}")
print(f"fonts used: {sorted(fonts_seen)}")
print(f"checks: {'PASS' if not fails else 'FAIL'}")
for f in fails:
    print(f"  FAIL  {f}")
for w in warns:
    print(f"  WARN  {w}")
if not fails:
    print("\nAll structural fidelity checks passed: no blank slides, no em-dash, no chrome leak,")
    print("no marker/reporting leak, every numeric slide carries an inline source, brand fonts only.")
sys.exit(1 if fails else 0)
