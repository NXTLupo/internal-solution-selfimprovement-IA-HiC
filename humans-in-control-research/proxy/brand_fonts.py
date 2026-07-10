"""brand_fonts.py - THE single font manifest for every proxy export surface
(WS-0g, plans/slides-strategic-visual-uplift-2026-07-09.md).

Before this module the manifest lived in three places and drifted: pptx_export
.FONT_FAMILIES (embedder), a runtime-monkeypatched `extra` list in gold_pptx_export
._embed_gold_fonts (where Saira Condensed was silently MISSING for weeks - every
title substituted Calibri), and nxt_diagram_render._FONT_FILES (which mapped the
NXT mono slot to JetBrains while its own @font-face used IBM Plex). One manifest,
consumed by all three; the mono face is IBM Plex Mono per the NXT Brand Tokens
collection (font/mono variable).
"""

# Embeddable families: typeface name -> pitchFamily/charset + static TTF files
# (files live in proxy/fonts/static/, mounted into the container).
FONT_MANIFEST = [
    {"typeface": "Saira Condensed", "pitchFamily": 34, "charset": 0,
     "regular": "SairaCondensed-Regular.ttf", "bold": "SairaCondensed-SemiBold.ttf"},
    {"typeface": "Archivo", "pitchFamily": 34, "charset": 0,
     "regular": "Archivo-Regular.ttf", "bold": "Archivo-Bold.ttf",
     "italic": "Archivo-Italic.ttf", "boldItalic": "Archivo-BoldItalic.ttf"},
    {"typeface": "IBM Plex Mono", "pitchFamily": 49, "charset": 0,
     "regular": "IBMPlexMono-Regular.ttf", "bold": "IBMPlexMono-SemiBold.ttf"},
    # NU + legacy faces still present in older decks / NU mode
    {"typeface": "Lato", "pitchFamily": 34, "charset": 0, "regular": "Lato.ttf"},
    {"typeface": "Lora", "pitchFamily": 18, "charset": 0, "regular": "Lora.ttf"},
    {"typeface": "Bebas Neue", "pitchFamily": 34, "charset": 0, "regular": "BebasNeue-Regular.ttf"},
    {"typeface": "Spectral", "pitchFamily": 18, "charset": 0,
     "regular": "Spectral-Regular.ttf", "bold": "Spectral-Bold.ttf"},
    {"typeface": "Fraunces", "pitchFamily": 18, "charset": 0,
     "regular": "Fraunces-Regular.ttf", "bold": "Fraunces-Bold.ttf",
     "italic": "Fraunces-Italic.ttf"},
    {"typeface": "Inter", "pitchFamily": 34, "charset": 0,
     "regular": "Inter-Regular.ttf", "bold": "Inter-Bold.ttf"},
    {"typeface": "JetBrains Mono", "pitchFamily": 49, "charset": 0,
     "regular": "JetBrainsMono-Regular.ttf", "bold": "JetBrainsMono-Medium.ttf"},
]

# @font-face slots for the diagram/exhibit renderer: (css family, file, weight).
# The NXT mono slot is IBM PLEX MONO (token font/mono) - never JetBrains.
DIAGRAM_FONT_FACES = [
    ("NXT Display", "SairaCondensed-SemiBold.ttf", 600),
    ("NXT Display", "SairaCondensed-Regular.ttf", 400),
    ("NXT Title", "Archivo-Bold.ttf", 700),
    ("NXT Title", "Archivo-Regular.ttf", 400),
    ("NXT Body", "Archivo-Regular.ttf", 400),
    ("NXT Body", "Archivo-Bold.ttf", 700),
    ("NXT Mono", "IBMPlexMono-Regular.ttf", 400),
    ("NXT Mono", "IBMPlexMono-SemiBold.ttf", 600),
    ("NU Single", "Lato.ttf", 400),
]


def export_fallbacks() -> dict:
    """Token-derived export fallbacks (ink color / body face) for runs the GEO walk
    could not attribute - replaces the hardcoded 141414/Archivo constants. Reads the
    live token mirror; falls back to the NXT canon values if the mirror is missing."""
    try:
        import json
        import os
        here = os.path.dirname(os.path.abspath(__file__))
        mirror = os.path.join(here, "..", "hic-workspace", "design-system", "figma-tokens.json")
        candidates = [mirror, "/hic-workspace/design-system/figma-tokens.json"]
        for c in candidates:
            if os.path.exists(c):
                with open(c, "r", encoding="utf-8") as f:
                    t = json.load(f)
                nxt = t.get("NXT", {})
                return {
                    "ink": (nxt.get("color", {}).get("ink") or "#141414").lstrip("#"),
                    "body_font": nxt.get("font", {}).get("body") or "Archivo",
                }
    except Exception:
        pass
    return {"ink": "141414", "body_font": "Archivo"}
