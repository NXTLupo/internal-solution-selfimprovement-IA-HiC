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
    # DECIEM brand (2026-10-01, PPTX-template-sourced third brand mode): display/title
    # Poppins (also every label), body Josefin Sans, tables / data / mono slot Nunito; Questrial ships in the template.
    # The variable TTFs fill both the regular and bold slots (one file, weight axis).
    {"typeface": "Poppins", "pitchFamily": 34, "charset": 0,
     "regular": "Poppins-Regular.ttf", "bold": "Poppins-Bold.ttf"},
    {"typeface": "Josefin Sans", "pitchFamily": 34, "charset": 0,
     "regular": "JosefinSans-Variable.ttf", "bold": "JosefinSans-Variable.ttf"},
    {"typeface": "Questrial", "pitchFamily": 34, "charset": 0,
     "regular": "Questrial-Regular.ttf"},
    {"typeface": "Nunito", "pitchFamily": 34, "charset": 0,
     "regular": "Nunito-Variable.ttf"},
]

# Typefaces that belong to the DECIEM brand only. gold_pptx_export embeds these
# when the exported deck is DECIEM (or a measured run uses one of them); NXT and
# NU decks keep their existing embed set unchanged.
DECIEM_TYPEFACES = ("Poppins", "Josefin Sans", "Questrial", "Nunito")

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
    # DECIEM faces (2026-10-01, measured on the template): Poppins Bold = every title and
    # label, Josefin Sans = body, Nunito = tables / data / meta. Questrial is embedded in the
    # template but used once, so it is available (FONT_MANIFEST) and not a role.
    ("DECIEM Display", "Poppins-Bold.ttf", 700),
    ("DECIEM Display", "Poppins-Regular.ttf", 400),
    ("DECIEM Label", "Poppins-Bold.ttf", 700),
    ("DECIEM Label", "Poppins-SemiBold.ttf", 600),
    ("DECIEM Body", "JosefinSans-Variable.ttf", 400),
    ("DECIEM Mono", "Nunito-Variable.ttf", 400),
]


def export_fallbacks(brand: str = "NXT") -> dict:
    """Token-derived export fallbacks (ink color / body face) for runs the GEO walk
    could not attribute - replaces the hardcoded 141414/Archivo constants. Reads the
    live token mirror; falls back to the NXT canon values if the mirror is missing.
    `brand` selects the token block (NXT default, unchanged; DECIEM for template decks)."""
    bn = (brand or "NXT").strip().upper()
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
                blk = t.get(bn) or t.get("NXT", {})
                return {
                    "ink": (blk.get("color", {}).get("ink") or "#141414").lstrip("#"),
                    "body_font": blk.get("font", {}).get("body") or "Archivo",
                }
    except Exception:
        pass
    return {"ink": "141414", "body_font": "Archivo"}
