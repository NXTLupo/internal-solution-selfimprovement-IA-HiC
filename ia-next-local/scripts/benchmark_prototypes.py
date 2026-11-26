"""Benchmark an IA Next prototype against reference prototypes (plan Part 8, P5; the standing REA rule).

Every candidate, IA Next's and each reference, is screenshotted by the isolated renderer (ia-next-render) and scored
by the same reviewer from another vendor with the same rubric (prototype.critique: concept, hierarchy, brand,
data_story, interaction, content, accessibility, 1 to 5). The brief's screens are the neutral direction for all.

References are HTML files in a folder: captured best-of-breed output (v0, Figma Make, Claude artifacts) goes there.
With --make-claude-artifact the script also writes one reference itself, the way a Claude artifact is made: one
Opus 5.5 pass from the same brief, with none of IA Next's pipeline (no direction, pattern catalog, review or revision).
That reference is labelled as such; it is not a capture of v0 or Figma Make.

Run inside the IA Next container (keys and the renderer are there):
  docker exec -i -e TASK=<prototype task id> -e REFS=/data/benchmarks/refs -e MAKE_CLAUDE_ARTIFACT=1 \
      -w /app ia-next python - < ia-next/scripts/benchmark_prototypes.py
Writes /data/benchmarks/<task>/report.json and report.md.
"""
import json
import os
import sys
import time

sys.path.insert(0, "/app")
from ia_next import config, deck, prototype, providers, store  # noqa: E402

TASK = os.environ.get("TASK", "")
REFS = os.environ.get("REFS", "/data/benchmarks/refs")
MAKE = os.environ.get("MAKE_CLAUDE_ARTIFACT") == "1"
ARTIFACT_PROMPT = ("Build a single-file, self-contained, interactive HTML prototype (inline CSS and JavaScript, no "
                   "external requests, no external fonts or images) of this product.\n\nProduct: {experience}\n"
                   "Users: {audience}\nScreens it must include, in order:\n{screens}\nBrand: {brand_name} (colours "
                   "{accent} accent, dark navy, white; typeface {font}).\nMake it polished, realistic and fully "
                   "clickable, with sample data. Reply with the HTML file only.")


_STOP = {"of", "the", "a", "an", "and", "for", "to", "in", "on", "with", "view", "screen", "page"}


def screen_key(item):
    """The navigation label a screen is reached by: the brief item's leading words up to the first small word, at most
    two ("Donor retention view (renewed ...)" -> "Donor retention"; "Overview of engagement" -> "Overview"). The first
    run used the brief's long wording, which matched no candidate's navigation and under-counted reached screens."""
    import re
    words = []
    for w in re.findall(r"[A-Za-z][A-Za-z'-]*", item.split(":")[0].split("(")[0]):
        if w.lower() in _STOP or len(words) == 2:
            break
        words.append(w)
    return " ".join(words) or item[:30]


def main():
    t = store.get_task(TASK)
    if not t or t["kind"] != "prototype" or t["status"] != "done":
        raise SystemExit(f"{TASK} is not a finished prototype")
    brief = t["brief"]
    kit = deck.brand_kit(brief.get("brand") or "nxt")
    direction = {"screens": [{"name": screen_key(m)} for m in brief.get("must_include") or []]}
    out = f"/data/benchmarks/{TASK}"
    os.makedirs(out, exist_ok=True)
    os.makedirs(REFS, exist_ok=True)
    ledger = providers.Ledger(limit_usd=4.0)
    candidates = {"IA Next prototype": open(prototype.html_path_for_task(TASK), encoding="utf-8").read()}
    if MAKE:
        msg = ARTIFACT_PROMPT.format(experience=brief["experience"], audience=brief.get("audience", ""),
                                     screens="\n".join(f"- {m}" for m in brief.get("must_include") or []),
                                     brand_name=kit["name"], accent=f"#{kit['accent']}",
                                     font="Lato" if brief.get("brand") == "nu" else "Archivo")
        text, _, _ = providers.claude(config.SEATS["artifact"]["primary"], "", [{"role": "user", "content": msg}], ledger,
                                      max_tokens=64000, effort="medium")
        html = prototype.extract_html(text)
        with open(os.path.join(REFS, f"claude-artifact-style-{TASK}.html"), "w", encoding="utf-8") as fh:
            fh.write(html)
    for name in sorted(os.listdir(REFS)):
        if name.endswith(".html") and (TASK in name or not name.startswith("claude-artifact-style-")):
            candidates[f"reference: {name}"] = open(os.path.join(REFS, name), encoding="utf-8").read()
    rows = []
    for label, html in candidates.items():
        shot = prototype.screenshots(html, direction, kit.get("fonts_css", "") if label == "IA Next prototype" else "")
        review = prototype.critique(html, direction, kit, ledger, "claude-opus-5-5", shot[0] if shot else None)
        scores = (review or {}).get("scores") or {}
        rows.append({"candidate": label, "bytes": len(html.encode("utf-8")), "validator": prototype.validate_html(html)[:5],
                     "screens_shot": [n for n, _ in (shot or ([], []))[0]],
                     "unreachable": (shot or ([], []))[1], "scores": scores,
                     "total": sum(scores.values()), "must_fix": [f.get("fix") for f in (review or {}).get("must_fix") or []][:5],
                     "reviewer": (review or {}).get("model")})
    report = {"task": TASK, "brief": brief, "at": time.time(), "spent_usd": ledger.spent_usd, "rows": rows}
    json.dump(report, open(os.path.join(out, "report.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    dims = ["concept", "hierarchy", "brand", "data_story", "interaction", "content", "accessibility"]
    lines = [f"# Prototype benchmark: {TASK}", "", f"Reviewer: {rows[0]['reviewer'] if rows else ''}, same rubric for every "
             "candidate, screenshots of every screen from the isolated renderer.", "",
             "| Candidate | " + " | ".join(dims) + " | Total | Screens reached |", "|---" * (len(dims) + 3) + "|"]
    for r in rows:
        lines.append(f"| {r['candidate']} | " + " | ".join(str(r["scores"].get(d, "")) for d in dims)
                     + f" | {r['total']} | {max(0, len(r['screens_shot']) - 1)} of {len(direction['screens'])} |")
    lines += ["", "Screens looked for: " + ", ".join(s["name"] for s in direction["screens"]), ""]
    for r in rows:
        lines.append(f"- {r['candidate']}: validator {'passed' if not r['validator'] else '; '.join(r['validator'])}; "
                     f"reviewer's first fixes: {' | '.join((f or '')[:120] for f in r['must_fix'][:2])}")
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"spent {ledger.spent_usd:.2f} USD")


main()
