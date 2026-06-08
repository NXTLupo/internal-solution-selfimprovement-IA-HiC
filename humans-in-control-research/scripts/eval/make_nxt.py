#!/usr/bin/env python
"""Transform a stripped NU gold exemplar into its NXT twin, following the conventions
of the user's hand-made gap-nxt.html: keep the NU CSS var NAMES, remap their VALUES;
swap serif Lora headlines for Archivo, numerals for Bebas Neue; kicker -> cyan; primary
hot/accent/attention -> chartreuse (NXT's critical color); cool/target/source -> cyan;
rail -> black; wordmark -> NXT HUMANS. Bulk pass; visually verified + touched up after."""
import re
import pathlib

GOLD = pathlib.Path(__file__).resolve().parents[2] / "hic-workspace/wiki/design-system/gold"

NU_LINK = re.compile(r'<link href="https://fonts\.googleapis\.com/css2\?family=Lora[^"]*"')
NXT_LINK = ('<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue'
            '&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600'
            '&display=swap"')

NXT_ROOT = (':root{\n'
            '  --navy:#0D0D0D; --ink:#141414; --red:#B8B800; --teal:#00B7C3;\n'
            '  --paper:#FFFFFF; --ecru:#F2F1EA; --ecru2:#E9E8E0; --pink:#F4F1D6;\n'
            '  --grey:#73757A; --hair:#DDDDD6;\n'
            '}')

# gap-nxt is hand-made by the user (authoritative); never regenerate it from gap-nu.
SKIP_SOURCES = {"gap-nu.html"}
NU_FILES = sorted(p for p in GOLD.glob("*-nu.html"))

# Hardcoded NU hex (in SVG strokes/fills, inline styles) -> NXT hex. Applied AFTER
# the :root swap so it only touches literals the var-remap could not reach.
NU_HEX = {
    "#0E1626": "#0D0D0D", "#16233C": "#141414", "#D41B2C": "#B8B800",
    "#1D6E64": "#00B7C3", "#EFEDE5": "#F2F1EA", "#E7E4DA": "#E9E8E0",
    "#FBEDEE": "#F4F1D6", "#7C828D": "#73757A", "#D9D5CA": "#DDDDD6",
    "#0B0F17": "#080808", "#F3EFE5": "#F4F4EE",
}


def transform(html: str) -> str:
    # 1. font link
    html = NU_LINK.sub(NXT_LINK, html)
    # 2. :root block (remap values, keep names)
    html = re.sub(r':root\{[^}]*\}', NXT_ROOT, html, count=1)
    # 3. headline serif -> Archivo; numerals -> Bebas Neue
    html = html.replace("'Lora',serif", "'Archivo',sans-serif")
    html = re.sub(r"(\.num\{font-family:)'Archivo',sans-serif", r"\1'Bebas Neue',sans-serif", html)
    # 4. headline weights: h1 500->600 (+tightening), h2 600->700
    html = re.sub(r"(h1\{font-family:'Archivo',sans-serif;font-weight:)500",
                  r"\g<1>600;letter-spacing:-0.5px", html)
    html = re.sub(r"(h2\{font-family:'Archivo',sans-serif;font-weight:)600", r"\g<1>700", html)
    # 5. kicker -> cyan. In the NXT root the cyan value is held by the retained
    #    name --teal (#00B7C3), so point the kicker at var(--teal).
    html = re.sub(r"(\.kicker\{[^}]*?color:)var\(--red\)(\})", r"\1var(--teal)\2", html)
    # 6. source attributions also read cyan in NXT: .src color red -> teal(cyan slot)
    html = re.sub(r"(\.src\{[^}]*?color:)var\(--red\)", r"\1var(--teal)", html)
    # 7. wordmark
    html = html.replace('<div class="brand">NORTHEASTERN</div>',
                        '<div class="brand">NXT&nbsp;&nbsp;HUMANS</div>')
    # 8. hardcoded hex literals (SVG curve, inline styles) the var-remap missed
    for nu_hex, nxt_hex in NU_HEX.items():
        html = html.replace(nu_hex, nxt_hex).replace(nu_hex.lower(), nxt_hex)
    return html


for nu in NU_FILES:
    if nu.name in SKIP_SOURCES:
        continue
    out = GOLD / nu.name.replace("-nu.html", "-nxt.html")
    out.write_text(transform(nu.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"  {nu.name} -> {out.name}")
print("[done] NXT twins generated (bulk); visual verify + touch-up next")
