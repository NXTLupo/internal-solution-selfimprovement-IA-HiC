"""Make IA Next's embedded brand typefaces: small Latin WOFF2 subsets of each brand's faces.

Prototypes run in a sandbox that blocks web fonts, and most machines do not have Lato, Saira Condensed, Archivo,
Poppins or Josefin Sans installed, so a page asked to use them falls back to a system font. The server embeds these
subsets as data URIs when it serves a prototype or writes a preview, so the brand faces show everywhere.

Source: the open-licensed (SIL OFL) font files HiC's proxy already bundles for its PowerPoint export
(humans-in-control-research/proxy/fonts/static). Run once after the brand faces change (needs fonttools and brotli):

    python ia-next/scripts/make_brand_fonts.py
"""
import io
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "humans-in-control-research", "proxy", "fonts", "static"))
DST = os.path.normpath(os.path.join(HERE, "..", "ia_next", "fonts"))
# family -> [(weight, source file, variable weight to pin or None)]
FACES = {
    "Saira Condensed": [(600, "SairaCondensed-SemiBold.ttf", None), (700, "SairaCondensed-Bold.ttf", None)],
    "Archivo": [(400, "Archivo-Regular.ttf", None), (700, "Archivo-Bold.ttf", None)],
    "Lato": [(400, "Lato.ttf", None)],
    "Poppins": [(400, "Poppins-Regular.ttf", None), (700, "Poppins-Bold.ttf", None)],
    "Josefin Sans": [(400, "JosefinSans-Variable.ttf", 400), (700, "JosefinSans-Variable.ttf", 700)],
}
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2193,"
         "U+2212,U+2215,U+2713,U+2715,U+25B2,U+25BC,U+FEFF,U+FFFD")


def main():
    os.makedirs(DST, exist_ok=True)
    manifest = {"_source": "humans-in-control-research/proxy/fonts/static (SIL Open Font License); Latin subsets made by "
                           "ia-next/scripts/make_brand_fonts.py", "faces": []}
    for family, cuts in FACES.items():
        for weight, fname, pin in cuts:
            font = TTFont(os.path.join(SRC, fname))
            if pin is not None and "fvar" in font:
                font = instancer.instantiateVariableFont(font, {"wght": pin})
            opts = subset.Options()
            opts.flavor = "woff2"
            opts.layout_features = ["kern", "liga", "tnum", "lnum", "calt"]
            opts.name_IDs = ["*"]
            sub = subset.Subsetter(opts)
            sub.populate(unicodes=subset.parse_unicodes(LATIN))
            sub.subset(font)
            out = f"{family.replace(' ', '')}-{weight}.woff2"
            buf = io.BytesIO()
            font.flavor = "woff2"
            font.save(buf)
            with open(os.path.join(DST, out), "wb") as fh:
                fh.write(buf.getvalue())
            manifest["faces"].append({"family": family, "weight": weight, "file": out, "bytes": len(buf.getvalue())})
            print(f"{out}: {len(buf.getvalue()) // 1024} KB")
    with open(os.path.join(DST, "fonts.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, indent=1)
        fh.write("\n")


if __name__ == "__main__":
    sys.exit(main())
