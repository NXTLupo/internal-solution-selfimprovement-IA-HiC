"""Side by side with Gemini Notebook, by the instruments of the 9 Nov audit
(humans-in-control-research/plans/hic-vs-notebooklm-artifact-audit-2026-11-09.md, "THE HEAD-TO-HEAD" and "S9").

That audit measured the owner's real Gemini Notebook artifacts: a summary with 0 citations in 24 sentences, 2 to 6
figures asserted in the model's own voice, 16 quoted fragments with no check, 4 "This transcript details" openers,
interface text left in the export, and a PowerPoint of 15 full-slide pictures with no editable text. This script
measures one engagement's IA Next Local outputs with the same instruments and prints the two columns.

Run inside the app's container:  python notebook_compare.py <engagement id>
"""
import glob
import json
import os
import re
import sqlite3
import sys

NOTEBOOK = {                       # recorded on 9 Nov 2026 from the owner's real Gemini Notebook artifacts
    "report: citations a reader can follow": "0 in 24 sentences",
    "report: figures stated in the writer's own voice": "2 to 6 per document",
    "report: quotes checked against a source": "0 of 16 quoted fragments",
    "report: openers about the document itself": "4 of 24 sentences",
    "report: sources dated": "none shown",
    "deck: slides with editable text": "0 of 15 (15 full-slide pictures, 0 text runs)",
    "deck: sources per slide": "none",
    "audio: transcript lines tied to a passage": "none",
    "themes: themes with a checked quote and a dated source": "no themes output; mind map only",
    "journey map: quotes checked against a source": "no journey map output",
}
META = re.compile(r"(?i)\b(this (report|document|deck|analysis|summary|transcript)|the sources (reveal|show)|in (this|the) (report|section))\b")
CITE = re.compile(r"\[S\d+\]")
NUM = re.compile(r"(?<![\w.])\d[\d,.]*%?")


def tasks(eid):
    c = None
    for path in glob.glob("/data/*.sqlite3") + glob.glob("/data/*.db"):      # the file that holds the tasks
        x = sqlite3.connect(path)
        if x.execute("SELECT COUNT(*) FROM sqlite_master WHERE name = 'tasks'").fetchone()[0]:
            c = x
            break
    c.row_factory = sqlite3.Row
    return [dict(r) for r in c.execute("SELECT id, kind, result_path, summary FROM tasks WHERE engagement_id = ? AND status = 'done' ORDER BY created", (eid,))]


def read(p):
    try:
        return open(p, encoding="utf-8").read()
    except OSError:
        return ""


def report(md):
    body = md.split("\n## Sources")[0]
    own = [l for l in body.splitlines() if l.strip() and not l.startswith((">", "#", "|"))]
    sentences = [s for l in own for s in re.split(r"(?<=[.!?])\s+", re.sub(r"\[S\d+\]", "", l)) if len(s.split()) > 3]
    figs = sum(1 for s in sentences if any(not re.fullmatch(r"(19|20)\d\d", n.rstrip(".,")) for n in NUM.findall(s)))
    quotes = [l for l in body.splitlines() if l.startswith(">")]
    srcs = [l for l in md.split("\n## Sources")[-1].splitlines() if l.startswith("- [S")]
    dated = sum(1 for l in srcs if re.search(r"\(\d{1,2} [A-Z][a-z]{2} 20\d\d", l))
    marks = CITE.findall(body)
    return {"report: citations a reader can follow": f"{len(marks)} marks to {len(set(marks))} sources in {len(sentences)} sentences",
            "report: figures stated in the writer's own voice": f"{figs} of {len(sentences)} sentences",
            "report: openers about the document itself": f"{sum(1 for s in sentences if META.search(s))} of {len(sentences)} sentences",
            "report: sources dated": f"{dated} of {len(srcs)}", "_quotes": len(quotes)}


def deck(folder):
    out = {}
    try:
        from pptx import Presentation
        from pptx.util import Emu
        prs = Presentation(os.path.join(folder, "deck.pptx"))
        editable = rasters = cited = 0
        for s in prs.slides:
            runs = sum(len(p.runs) for sh in s.shapes if sh.has_text_frame for p in sh.text_frame.paragraphs)
            big = any(sh.shape_type == 13 and sh.width >= Emu(int(prs.slide_width * 0.95)) and sh.height >= Emu(int(prs.slide_height * 0.95)) for sh in s.shapes)
            editable += runs > 0
            rasters += big and runs == 0
            cited += "Sources:" in (s.notes_slide.notes_text_frame.text if s.has_notes_slide else "")
        n = len(prs.slides)
        out["deck: slides with editable text"] = f"{editable} of {n} ({rasters} full-slide pictures)"
        out["deck: sources per slide"] = f"{cited} of {n} slides list their sources in the notes"
    except Exception as e:
        out["deck: slides with editable text"] = f"could not open the PowerPoint ({type(e).__name__})"
    return out


def main(eid):
    mine = {}
    for t in tasks(eid):
        rp, folder = t["result_path"] or "", os.path.dirname(t["result_path"] or "")
        sc = json.loads(read(os.path.join(folder, "scorecard.json")) or "{}")
        check = {c["name"]: c for c in sc.get("checks") or []}
        if t["kind"] == "research_report" and rp.endswith(".md") and "Report ready" in (t["summary"] or ""):
            r = report(read(rp))
            q = check.get("quotes_in_sources") or {}
            r["report: quotes checked against a source"] = f"{r.pop('_quotes')} quotes; {q.get('detail', 'not scored')}"
            mine.update(r)
        elif t["kind"] == "deck":
            mine.update(deck(folder))
        elif t["kind"] == "audio_overview":
            m = re.search(r"(\d+) turns.*?(\d+) turns cited to passages from (\d+) sources", t["summary"] or "")
            mine["audio: transcript lines tied to a passage"] = f"{m.group(2)} of {m.group(1)} turns, from {m.group(3)} sources" if m else (t["summary"] or "")[:80]
        elif t["kind"] == "themes":
            th = json.loads(read(os.path.join(folder, "themes.json")) or "{}").get("themes") or []
            mine["themes: themes with a checked quote and a dated source"] = (
                f"{sum(1 for x in th if x.get('quote') and x.get('source_date'))} of {len(th)} themes")
        elif t["kind"] == "journey_map":
            j = json.loads(read(os.path.join(folder, "journey.json")) or "{}")
            mine["journey map: quotes checked against a source"] = f"{j.get('quotes_kept', 0)} quotes found word for word, {j.get('dropped_pains_quote_not_in_source', 0)} removed"
    rows = [{"instrument": k, "gemini_notebook": v, "ia_next_local": mine.get(k, "not made in this engagement")} for k, v in NOTEBOOK.items()]
    print(json.dumps(rows, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
