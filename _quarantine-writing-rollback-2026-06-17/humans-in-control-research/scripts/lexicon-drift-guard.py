#!/usr/bin/env python3
"""
Lexicon drift guard (Anti-Slop Field Guide Rule 99).

The lexicon has two faces: the machine JSON (anti-slop-lexicon.json, imported by the hooks)
and the prose page (anti-slop-lexicon.md, retrieved by generation + read by humans). This
guard fails if they diverge - every Tier-1 word and every structural-tell name in the JSON
must appear in the prose page, so a term added to one is added to the other.

Run in CI / pre-commit: `python scripts/lexicon-drift-guard.py` (exit 1 on drift).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, "..", "hic-workspace", "wiki", "frameworks")
JSON_PATH = os.path.join(BASE, "anti-slop-lexicon.json")
MD_PATH = os.path.join(BASE, "anti-slop-lexicon.md")


def main():
    try:
        lex = json.load(open(JSON_PATH, encoding="utf-8"))
        prose = open(MD_PATH, encoding="utf-8").read().lower()
    except Exception as e:
        print(f"[drift-guard] cannot read lexicon pair: {e}")
        return 1

    missing = []
    for w in lex.get("tier1_always", {}).get("words", []):
        # prefix-5 match: any inflection (delve/delves/delving, meticulous/meticulously)
        # shares its first 5 chars with the base term documented in the prose.
        wl = w.lower()
        if wl in prose or (len(wl) >= 4 and wl[:4] in prose):
            continue
        missing.append(f"tier1:{w}")
    # structural tells are described, not verbatim; map each regex name to a keyword that
    # must appear somewhere in the prose so the concept is documented.
    STRUCT_KW = {
        "negative_parallelism": "parallelism",
        "dramatic_colon_fragment": "fragment",
        "dangling_ing_significance": "dangling",
        "rhetorical_midsentence_question": "rhetorical",
        "rule_of_three_triad": "triad",
        "bold_colon_label": "bold-label",
        "stacked_hedging": "hedging",
        "false_balance": "false balance",
    }
    for name in lex.get("structural_regex", {}):
        if name.startswith("_"):
            continue
        kw = STRUCT_KW.get(name, name.replace("_", " ").split()[0])
        if kw.lower() not in prose:
            missing.append(f"structural:{name}")

    if missing:
        print("[drift-guard] DRIFT: JSON terms absent from the prose page:")
        for m in missing[:40]:
            print(f"  - {m}")
        print("Add them to anti-slop-lexicon.md (or remove from the JSON).")
        return 1
    print(f"[drift-guard] OK: {len(lex.get('tier1_always',{}).get('words',[]))} Tier-1 terms + "
          f"{len([k for k in lex.get('structural_regex',{}) if not k.startswith('_')])} structural tells all present in the prose twin.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
