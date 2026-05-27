#!/usr/bin/env python3
"""precheck_pptx_font_role.py - PreToolUse hook (2026-05-26)

Enforces the font-role contract in components/slideTemplates/pptx.ts so the
preview-vs-PPTX font drift can never silently reappear on any template.

Root cause it guards: pptx.ts historically used a single `FONT` constant
(the body face, Roboto) for EVERY text element, including titles and big
display numbers, while web.tsx used `var(--font-display)` (Spectral) for
those. The two renderers diverged because pptx.ts collapsed the
display/body distinction. On 2026-05-26 this shipped a case-study export
with a heavy-sans title where the preview showed an elegant serif.

The fix introduced role accessors: fDisplay() / fBody() / fLabel() /
fMono(). This hook blocks any NEW addText in pptx.ts that:

  (a) renders a DISPLAY-role element (title, hero number, big stat) but
      uses `fontFace: FONT` (the body alias) instead of `fDisplay()`, OR
  (b) renders any text with the raw `fontFace: FONT` when a role accessor
      should be used.

Heuristic for "display-role": the addText call's fontSize is >= 18 (titles
and hero numbers) OR the call is the `title(` helper. Body text is < 18pt.

Scope: ONLY components/slideTemplates/pptx.ts. This is a targeted guard for
the one file where the role split matters and has regressed before.

Exit codes:
  0 — clean (or file out of scope)
  2 — block (display-role text using the body FONT alias)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, file_path, normalize_path, allow

# normalize_path() lowercases, so compare against a lowercased suffix.
TARGET_SUFFIX = "components/slidetemplates/pptx.ts"

# Match an addText(...) call and capture its option object so we can read
# fontSize + fontFace together. Non-greedy to one call at a time.
ADDTEXT_PATTERN = re.compile(
    r"addText\([^;]*?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}",
    re.DOTALL,
)
FONTSIZE_PATTERN = re.compile(r"fontSize:\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z_$][\w$]*)")
FONTFACE_BODY_PATTERN = re.compile(r"fontFace:\s*FONT\b")

# Display-role fontSize floor. Titles + hero numbers are >= 18pt. The body
# face is acceptable below this.
DISPLAY_FONTSIZE_FLOOR = 18.0
# fontSize values that are dynamic (heroPt(...), fs, sz) are display numbers
# by construction — heroPt produces 14-160pt display numerals.
DISPLAY_DYNAMIC_TOKENS = {"fs", "sz", "numSize", "fontSize"}


def main() -> int:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write"}:
        allow()

    p = normalize_path(file_path(event))
    if not p.endswith(TARGET_SUFFIX):
        allow()

    tool_input = event.get("tool_input") or event.get("toolInput") or {}
    content = (
        tool_input.get("new_string")
        or tool_input.get("content")
        or tool_input.get("newString")
        or ""
    )
    if not content:
        allow()

    violations: list[str] = []
    for m in ADDTEXT_PATTERN.finditer(content):
        opts = m.group(1)
        if not FONTFACE_BODY_PATTERN.search(opts):
            continue  # uses a role accessor or a literal face — fine
        # It uses the raw body FONT. Is it a display-role element?
        fs_match = FONTSIZE_PATTERN.search(opts)
        is_display = False
        if fs_match:
            val = fs_match.group(1)
            try:
                if float(val) >= DISPLAY_FONTSIZE_FLOOR:
                    is_display = True
            except ValueError:
                # Dynamic size (heroPt result / variable) — treat as display
                if val in DISPLAY_DYNAMIC_TOKENS or "hero" in val.lower():
                    is_display = True
        if is_display:
            snippet = opts.strip().replace("\n", " ")[:120]
            violations.append(snippet)

    if not violations:
        allow()

    unique = list(dict.fromkeys(violations))[:6]
    msg = [
        "[pptx-font-role] Display-role addText using the body FONT alias in pptx.ts.",
        "",
        "components/slideTemplates/pptx.ts must use the font-role accessors so the",
        "PPTX export matches the web preview. A title or hero-number (fontSize >= 18",
        "or a heroPt() dynamic size) rendered with `fontFace: FONT` collapses the",
        "display/body split and reproduces the 2026-05-26 serif-vs-sans drift.",
        "",
        "FIX — use the role accessor that matches the web renderer:",
        "  - titles, action-titles, hero numbers, big stat numerals → fontFace: fDisplay()",
        "  - prose, descriptions, narratives                        → fontFace: fBody()",
        "  - eyebrow labels, tracked caps                           → fontFace: fLabel()",
        "  - source lines, codes, citations                         → fontFace: fMono()",
        "  - verbatim block quotes                                  → fontFace: fontForRole('quote', T)",
        "",
        "Display-role addText calls still using FONT:",
    ]
    for v in unique:
        msg.append(f"  - ...{v}...")
    msg.append("")
    msg.append("Edit blocked. Swap fontFace: FONT for the correct role accessor.")
    print("\n".join(msg), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
