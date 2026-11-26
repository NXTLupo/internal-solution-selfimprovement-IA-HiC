"""Refresh IA Next's read-only copy of HiC's AI Experience Patterns catalog.

HiC's catalog (humans-in-control-research/hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json, 92+ named
patterns with their primitives and best uses) is what HiC's experience-prototype-composer skill composes prototypes
from. IA Next's Creative Director and Prototyper choose from the same catalog. IA Next makes no runtime call into the
suite, so it keeps a copy in ia_next/design_patterns.json. Run this after the catalog changes:

    python ia-next/scripts/sync_design_patterns.py
"""
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "humans-in-control-research", "hic-workspace", "wiki",
                                    "inspiration-hub", "ai-patterns", "_catalog.json"))
DST = os.path.normpath(os.path.join(HERE, "..", "ia_next", "design_patterns.json"))
KEEP = ("id", "name", "section", "primitives", "best_for")


def main(src=SRC, dst=DST):
    with open(src, encoding="utf-8") as fh:
        cat = json.load(fh)
    pats = [{k: p[k] for k in KEEP if k in p} for p in cat.get("patterns") or [] if p.get("id") and p.get("name")]
    if not pats:
        sys.exit(f"no patterns in {src}")
    out = {"_source": "humans-in-control-research/hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json (HiC's AI "
                      "Experience Patterns catalog). Copied by ia-next/scripts/sync_design_patterns.py; do not edit by hand.",
           "_copied": datetime.date.today().isoformat(), "_catalog_version": cat.get("version", ""),
           "sections": cat.get("sections") or [], "patterns": pats}
    with open(dst, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"wrote {dst}: {len(pats)} patterns")


if __name__ == "__main__":
    main()
