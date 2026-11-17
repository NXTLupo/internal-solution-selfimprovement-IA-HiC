"""Regression cases per absorbed application (plan 7.6 and Section 8: an app is absorbed only when its
cases pass in IA Next).

Each case is a guarantee the old application made, or a rule the plan adds, checked mechanically on IA
Next's real outputs in the data volume. Nothing here calls a model. `run()` checks every finished task of
every kind, and reports per application whether it has at least one output and whether every output passes.

    docker exec -e PYTHONPATH=/app ia-next python -m ia_next.regression
"""
import io
import json
import os
import re
import sys

from . import store, verify

APPS = {
    "research_report": "HiC research and report generation",
    "journey_map": "Journey Mapper",
    "deck": "HiC slides and PowerPoint export",
    "social": "Social Research (Reddit analytics)",
    "transcript": "Video Analyzer and transcript-first analysis",
    "prototype": "HiC #proto prototypes",
    "image": "Character Generator stills and HiC imagery",
    "video": "Character Generator video",
}


def _load(eid, rel):
    with io.open(store.safe_path(eid, rel), encoding="utf-8") as fh:
        return json.load(fh)


def _quote_ok(q, src):
    return bool(src) and verify._norm(q) and verify._norm(q) in verify._norm(src.get("text", ""))


def check_research(t):
    eid = t["engagement_id"]
    src = {s["id"]: s for s in _load(eid, "results/sources.json")["sources"]}
    report = io.open(t["result_path"], encoding="utf-8").read()
    ver = _load(eid, "results/verification.json")
    fails = []
    for f in verify.deterministic(report, list(src.values())):
        if f["rule"] in ("unknown-citation", "quote-not-in-source", "em-dash", "no-citations"):
            fails.append(f"{f['rule']}: {f['detail'][:80]}")
    for f in _load(eid, "results/findings.json")["findings"]:
        if not _quote_ok(f["quote"], src.get(f["source_id"])):
            fails.append(f"finding quote not in {f['source_id']}")
    if verify.config.vendor_of(ver["judge"]["judge_model"]) == "anthropic":
        fails.append("judge was the author's vendor")
    return fails


def check_journey(t):
    eid = t["engagement_id"]
    j = _load(eid, "results/journey.json")
    src = {s["id"]: s for s in _load(eid, "results/sources.json")["sources"]}
    fails = [] if len(j["stages"]) >= 4 else [f"only {len(j['stages'])} stages"]
    for st in j["stages"]:
        for p in st["pains"]:
            if not _quote_ok(p["quote"], src.get(p["source_id"])):
                fails.append(f"pain quote not in {p['source_id']}")
    page = io.open(t["result_path"], encoding="utf-8").read()
    if re.search(r"<script", page.split("</style>", 1)[-1], re.I):
        fails.append("script element in the exhibit")
    return fails


def check_deck(t):
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from . import deck
    eid = t["engagement_id"]
    per_task = os.path.join(os.path.dirname(t.get("result_path") or ""), "deck.pptx") if isinstance(t, dict) else ""
    p = Presentation(per_task if per_task and os.path.isfile(per_task) else store.safe_path(eid, "results/deck.pptx"))
    fails = [] if 3 <= len(p.slides) <= 13 else [f"{len(p.slides)} slides"]
    for i, s in enumerate(p.slides, 1):
        # photographs are allowed only in a named photo panel; a picture anywhere else (a slide of text as an image) fails
        if any(sh.shape_type == MSO_SHAPE_TYPE.PICTURE and sh.name != "Photo" for sh in s.shapes):
            fails.append(f"slide {i} has a picture outside a photo panel")
        title = s.shapes.title.text if s.shapes.title else ""
        if not title.strip():
            fails.append(f"slide {i} has no editable title")
        elif i > 1 and deck.title_problems(title):
            fails.append(f"slide {i} title: {deck.title_problems(title)}")
        if not (s.has_notes_slide and "http" in s.notes_slide.notes_text_frame.text):
            fails.append(f"slide {i} notes carry no source")
    return fails


def check_social(t):
    eid = t["engagement_id"]
    d = _load(eid, "results/social.json")
    src = {s["id"]: s for s in _load(eid, "results/social_sources.json")["sources"]}
    fails = [] if len(d.get("themes", [])) >= 3 else ["fewer than 3 themes"]
    for th in d.get("themes", []):
        for q in th.get("quotes", []):
            if not _quote_ok(q["quote"], src.get(q["source_id"])):
                fails.append(f"theme quote not in {q['source_id']}")
    split = d.get("sentiment_split") or {}
    if split and sum(v for v in split.values() if isinstance(v, int)) != len(src):
        fails.append("sentiment split does not count every post")
    return fails


def check_transcript(t):
    eid = t["engagement_id"]
    src = {s["id"]: s for s in _load(eid, "results/sources.json")["sources"]}
    fails = []
    for f in _load(eid, "results/findings.json")["findings"]:
        if not _quote_ok(f["quote"], src.get(f["source_id"])):
            fails.append(f"quote not in {f['source_id']}")
        if f.get("speaker") and f["speaker"].lower() not in src.get(f["source_id"], {}).get("text", "").lower():
            fails.append(f"speaker {f['speaker']} not in its source")
    return fails


def check_prototype(t):
    from . import prototype
    page = io.open(prototype.html_path_for_task(t["id"]), encoding="utf-8").read()
    return [f"validator: {p}" for p in prototype.validate_html(page)]


def check_media(eid, rel):
    p = store.safe_path(eid, rel)
    head = open(p, "rb").read(16)
    if rel.endswith(".mp4"):
        return [] if head[4:8] == b"ftyp" and os.path.getsize(p) > 100_000 else ["not an MP4 with content"]
    return [] if head.startswith(b"\x89PNG") or head[:3] == b"\xff\xd8\xff" or head[8:12] == b"WEBP" else ["not an image file"]


CHECKS = {"research_report": check_research, "journey_map": check_journey, "deck": check_deck, "social": check_social,
          "transcript": check_transcript, "prototype": check_prototype}


def run():
    results = {k: [] for k in APPS}
    for t in store.conn().execute("SELECT * FROM tasks WHERE status = 'done' ORDER BY created").fetchall():
        t = store.get_task(t["id"])
        fn = CHECKS.get(t["kind"])
        if not fn:
            continue
        try:
            fails = fn(t)
        except Exception as e:
            fails = [f"check could not run: {type(e).__name__}: {str(e)[:120]}"]
        results[t["kind"]].append({"task": t["id"], "pass": not fails, "failures": fails})
    for e in store.list_engagements():
        for sub, kind in (("results/images", "image"), ("results/videos", "video")):
            d = store.safe_path(e["id"], sub)
            if os.path.isdir(d):
                for name in sorted(os.listdir(d)):
                    fails = check_media(e["id"], f"{sub}/{name}")
                    results[kind].append({"file": f"{e['id']}/{sub}/{name}", "pass": not fails, "failures": fails})
    summary = {k: {"app": APPS[k], "outputs": len(v), "passing": sum(1 for r in v if r["pass"]),
                   "absorbed": bool(v) and all(r["pass"] for r in v)} for k, v in results.items()}
    return {"summary": summary, "cases": results}


if __name__ == "__main__":
    out = run()
    for k, s in out["summary"].items():
        print(f"{'PASS' if s['absorbed'] else 'FAIL'}  {s['app']:<48} {s['passing']}/{s['outputs']} outputs pass")
        for r in out["cases"][k]:
            for f in r["failures"][:3]:
                print("      -", r.get("task") or r.get("file"), f)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=1)
