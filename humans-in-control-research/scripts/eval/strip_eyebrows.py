#!/usr/bin/env python
"""Strip the AI-slop eyebrow microlabels from the gold exemplars, per the user's
decision (2026-06-04): remove labels that color/position already convey; keep the
load-bearing ones. STRIP: WHAT FRUSTRATES THEM, WHAT THEY NEED, DESIGN RESPONSE,
PROOF IT WORKED, the leading 'PEAKS' on the persona phase line. KEEP everything
else (ACCEPTANCE, SUCCESS METRIC, WHERE IT BREAKS, DOMINANT/RECURRING, THE PROBLEM,
US-N traces, THE DIAGNOSIS/THE GUIDING POLICY, blueprint lanes, Gartner scale, sev)."""
import re
import pathlib

GOLD = pathlib.Path(__file__).resolve().parents[2] / "hic-workspace/wiki/design-system/gold"

# Eyebrow label elements to remove entirely (the colored block/border stays).
STRIP_LABELS = ["WHAT FRUSTRATES THEM", "WHAT THEY NEED", "DESIGN RESPONSE", "PROOF IT WORKED"]

total = 0
for f in sorted(GOLD.glob("*.html")):
    html = f.read_text(encoding="utf-8")
    before = html
    n = 0
    # Remove <div class="...">LABEL</div> for each strip label (any label class).
    for lab in STRIP_LABELS:
        pat = re.compile(r'<div class="[^"]*">' + re.escape(lab) + r'</div>\s*')
        html, c = pat.subn("", html)
        n += c
    # Strip the leading "PEAKS &nbsp;" on the persona phase line, keep the week range.
    html, c = re.subn(r'(<div class="peak">)PEAKS\s*&nbsp;\s*', r'\1', html)
    n += c
    # Em-dash HARD BAN (project rule): convert em-dashes to commas. Keep en-dashes
    # (numeric ranges like WEEKS 0-1 are correct and not the AI tell). Handles the
    # &mdash; entity and the raw U+2014 char, with or without surrounding spaces.
    for pat in (r'\s*&mdash;\s*', r'\s*—\s*'):
        html, c = re.subn(pat, ', ', html)
        n += c
    if html != before:
        f.write_text(html, encoding="utf-8")
    print(f"  {f.name}: stripped {n}")
    total += n
print(f"[done] stripped {total} eyebrow microlabels across gold exemplars")
