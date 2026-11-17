"""Refresh IA Next's read-only copy of HiC's brand tokens.

HiC's design system (the Figma library mirror at
humans-in-control-research/hic-workspace/design-system/figma-tokens.json, served by HiC at
/api/design-tokens?brand=NXT|NU|DECIEM) is the single source of brand colours, typefaces and logo vectors. IA Next
is a separate system and makes no runtime call into the suite, so it keeps a copy of the brand blocks it renders
with, in ia_next/brand_tokens.json. Run this after the design system changes, then run the tests:

    python ia-next/scripts/sync_brand_tokens.py
"""
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "humans-in-control-research", "hic-workspace", "design-system",
                                    "figma-tokens.json"))
DST = os.path.normpath(os.path.join(HERE, "..", "ia_next", "brand_tokens.json"))
KEEP = ("color", "font", "logo")
BRANDS = {"nxt": "NXT", "nu": "NU", "deciem": "DECIEM"}


def main(src=SRC, dst=DST):
    with open(src, encoding="utf-8") as fh:
        tokens = json.load(fh)
    out = {"_source": "humans-in-control-research/hic-workspace/design-system/figma-tokens.json "
                      "(Figma library iSQhAVM7SI4QHAWB7y9C2z: NXT mode 221:0, NU mode 535:0; DECIEM from its PowerPoint "
                      "template). Copied by ia-next/scripts/sync_brand_tokens.py; do not edit by hand.",
           "_copied": datetime.date.today().isoformat(),
           "_hic_refreshed": (tokens.get("_meta") or {}).get("refreshed", ""),
           "brands": {}}
    for ours, theirs in BRANDS.items():
        block = tokens.get(theirs)
        if not isinstance(block, dict):
            sys.exit(f"{theirs} is missing from {src}")
        out["brands"][ours] = {k: block[k] for k in KEEP if k in block}
    with open(dst, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"wrote {dst}: {', '.join(out['brands'])}")


if __name__ == "__main__":
    main()
