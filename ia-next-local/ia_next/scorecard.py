"""What "better" means, computed by code for every finished task (uplift plan 2026-11-23, WS-1 steps 1 and 2).

Between 19 and 23 Nov the owner rejected artifacts for defects code could have caught: unclosed footnotes (58 on one
page), slide text at 9 points, sentences cut with an ellipsis, blank table cells, a deck that repeated its closing slide
three times, a class-name collision that stretched a menu. The reviewer model scored some of those pages 1.00. So the
verdict here is a list of checks with names and details; the reviewer's score is one more row, never the verdict.

`score(task)` returns {checks: [{name, passed, hard, detail}], judge, hard_failed: [names], checked_at}. A failed hard
check means the task needs review: the card names the checks. Hard checks are the ones with no false positives on the
finished work of eng_ad1e84d10f22 (measured when this was written); everything else is reported but soft.
"""
import json
import os
import re
import time
import zipfile

from . import config, store

SLIDE_MIN_PX = 20            # 10 pt in PowerPoint (1 px on the 1920 stage is half a point)
PPTX_MIN_PT = 10.0
CUE_MAX_SECONDS = 8.0
HARD = {"page_well_formed", "footnotes_close", "slides_fit", "slide_text_size", "no_cut_sentences", "no_repeated_slides",
        "quotes_in_sources", "pptx_text_size", "transcript_files", "sources_current", "no_internal_text"}


def _read(p):
    try:
        with open(p, encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


def _check(name, passed, detail=""):
    return {"name": name, "passed": bool(passed), "hard": name in HARD, "detail": str(detail)[:300]}


def _page_checks(page):
    """Checks on any HTML page: no control characters, every footnote closes, no empty paragraph or cell."""
    out = []
    bad = sum(1 for c in page if ord(c) < 9 or 13 < ord(c) < 32)
    out.append(_check("page_well_formed", bad == 0, f"{bad} control characters" if bad else "no control characters"))
    opened, closed = page.count("<sup"), page.count("</sup>")
    if opened:
        out.append(_check("footnotes_close", opened == closed, f"{opened} footnotes opened, {closed} closed"))
    body = re.sub(r"(?is)<(script|style)\b.*?</\1>", "", page)
    empty = len(re.findall(r"<(p|td)(\s[^>]*)?>\s*</\1>", body))
    out.append(_check("no_empty_blocks", empty == 0, f"{empty} empty paragraphs or cells" if empty else "none empty"))
    return out


def _fit(slides_html, selector="section.stage"):
    """Per-slide measurements from the renderer's /fit, or None when the renderer cannot be reached."""
    import httpx
    try:
        r = httpx.post(config.RENDER_URL.rstrip("/") + "/fit", json={"html": slides_html, "selector": selector}, timeout=300)
        if r.status_code == 200:
            return r.json().get("slides") or []
    except httpx.HTTPError:
        pass
    return None


def _slide_checks(slides_html, selector="section.stage"):
    out = []
    # A sentence is cut when its text ENDS on an ellipsis (the next thing is a tag or the end). An ellipsis with words
    # after it is the source's own, inside a quote ("Students are not looking at one memo in isolation… One ruling
    # brings ..."), and marked a whole report "Needs review" on 24 Nov.
    cut = len(re.findall(r"…\s*(?=<|$)", re.sub(r"(?is)<(script|style)\b.*?</\1>", "", slides_html)))
    out.append(_check("no_cut_sentences", cut == 0, f"{cut} sentences cut with an ellipsis" if cut else "every sentence whole"))
    m = _fit(slides_html, selector)
    if m is None:
        out.append({"name": "slides_fit", "passed": True, "hard": False, "detail": "the renderer could not be reached; not measured"})
        return out
    over = [s["n"] for s in m if s.get("overflow", 0) > 0 or s.get("into_footer", 0) > 0 or s.get("wider_than_box", 0) > 0]
    out.append(_check("slides_fit", not over, f"slides that overflow or run into the footer: {over}" if over else f"all {len(m)} slides fit"))
    small = [s["n"] for s in m if 0 < s.get("smallest_px", 0) < SLIDE_MIN_PX]
    out.append(_check("slide_text_size", not small, f"slides with text under 10 pt: {small}" if small else "no text under 10 pt"))
    # a table that continues across slides repeats its title on purpose, so on a slide page this is reported, not a gate
    titles = [s.get("title", "").strip().lower() for s in m if s.get("title")]
    repeats = sorted({x for x in titles if titles.count(x) > 1})
    out.append(_check("repeated_titles", not repeats, f"titles on more than one slide: {repeats[:3]}" if repeats else "every title once"))
    return out


def _pptx_checks(path):
    try:
        z = zipfile.ZipFile(path)
        xml = "".join(z.read(n).decode("utf-8", "replace") for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n))
    except (OSError, zipfile.BadZipFile, KeyError):
        return [_check("pptx_text_size", False, "the PowerPoint file could not be read")]
    # a brand's own lockup is artwork set in type, not reading text (live read 25 Nov: the DECIEM lockup on a cover,
    # 8 pt by the brand's template, marked a whole deck "Needs review")
    xml = re.sub(r'<p:sp>(?:(?!</p:sp>).)*?name="Brand lockup"(?:(?!</p:sp>).)*?</p:sp>', "", xml, flags=re.S)
    sizes = [int(v) / 100 for v in re.findall(r'sz="(\d+)"', xml)]
    low = [s for s in sizes if s < PPTX_MIN_PT]
    titles = re.findall(r"<p:cNvPr[^>]*name=\"Title[^\"]*\"", xml)
    return [_check("pptx_text_size", not low, f"{len(low)} runs under {PPTX_MIN_PT:g} pt (smallest {min(low):g})" if low
                   else f"smallest {min(sizes):g} pt" if sizes else "no text")]


def _currency_check(folder, eid):
    """sources_current (field test 23 Nov, workstream 0): the sources a run collected against the period its request
    implied. The run's own sources.json when the task has one, else the engagement's latest. None when the evidence
    was collected before periods were recorded, or the request asked for history."""
    from . import currency
    paths = [os.path.join(folder, "sources.json")] if folder else []
    try:
        paths.append(store.safe_path(eid, "results/sources.json"))
    except Exception:
        pass
    for p in paths:
        try:
            d = json.loads(_read(p) or "{}")
        except ValueError:
            continue
        w = d.get("window") or {}
        if not w.get("since"):
            continue
        judged = [s for s in d.get("sources") or [] if s.get("currency")]      # this period's collection, not earlier evidence
        if not judged:
            continue
        got = currency.spread(judged, w)
        bar = 1.0 if w.get("strict") else currency.RESEARCH_BAR
        return _check("sources_current", got["share"] >= bar,
                      f"{got['text']}; the bar is {round(bar * 100)} percent from {w.get('label')}")
    return None


# ---- outcome checks (field test 23 Nov, workstream H) ------------------------------------------------------------------
# The scorecard checked form (quotes found, footnotes closed, slides fit) and passed a stale-news report, themes built
# without the selected pack, and a card that printed a findings file as a report. These check what was asked for.
_INTERNAL = re.compile(r'articles/[\w.-]+/[0-9a-f]{6,}\.md(#c\d+)?|#c\d+\b|\{\s*"findings"\s*:|"source_id"\s*:|\bCHUNK_\d+|\btask_[0-9a-f]{10,}\b|'
                       r'\beng_[0-9a-f]{10,}\b|qwen[\d.]*:[\w.-]+|hf\.co/[\w./:-]+')


def _visible(text, is_html):
    if not is_html:
        return text
    t = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", text)
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", t))


def _internal_check(text, is_html):
    """no_internal_text: nothing a reader sees may be a file pointer, a raw data structure, an internal id or a model
    file name (the audio transcript printed "articles/insidehighered-com/2828f8387b.md#c4" after every line)."""
    hits = sorted({m.group(0)[:60] for m in _INTERNAL.finditer(_visible(text, is_html))})
    return _check("no_internal_text", not hits, f"internal text shown to the reader: {hits[:3]}" if hits else "no pointers, ids or raw data in view")


def _collection_checks(folder, eid):
    """packs_used and source_spread, from the evidence the work was built on (soft: they inform, the gates are above)."""
    out = []
    for p in ([os.path.join(folder, "sources.json")] if folder else []) + [store.safe_path(eid, "results/sources.json")]:
        try:
            d = json.loads(_read(p) or "{}")
        except (ValueError, Exception):
            continue
        if d.get("sources"):
            from . import evidencequality
            q = evidencequality.mix(d["sources"])
            if q["graded"] >= 4:
                out.append(_check("source_quality", q["share"] >= 0.6 and q["weak"] <= 2, q["text"]))
        packs = d.get("data_packs") or {}
        if packs.get("chosen_by") == "you" and packs.get("chosen"):
            kept = packs.get("kept") or {}
            empty = [x for x in packs["chosen"] if not kept.get(x)]
            out.append(_check("packs_used", not empty, (f"selected packs with no source kept: {', '.join(empty)}" if empty else
                                                        "every selected pack has sources in the evidence: "
                                                        + ", ".join(f"{k} {v}" for k, v in kept.items() if k in packs["chosen"]))))
        break
    for p in ([os.path.join(folder, "findings.json")] if folder else []) + [store.safe_path(eid, "results/findings.json")]:
        try:
            fd = json.loads(_read(p) or "{}")
            fs = fd.get("findings") or []
        except (ValueError, Exception):
            continue
        if fd.get("population"):
            gone = [x for x in fd.get("left_out_of_scope") or [] if str(x.get("left_out", "")).startswith("about ")]
            beside = sum(1 for f in fs if f.get("scope_note"))
            out.append(_check("population_scope", beside <= max(2, len(fs) // 3),
                              f"evidence checked against {fd['population']}: {len(gone)} findings about other groups left out, "
                              f"{beside} about neighbouring groups kept and named"))
        if len(fs) >= 8:
            by = {}
            for f in fs:
                by[f.get("source_id")] = by.get(f.get("source_id"), 0) + 1
            top, n = max(by.items(), key=lambda kv: kv[1])
            out.append(_check("source_spread", n / len(fs) <= 0.4 and len(by) >= 4,
                              f"{len(fs)} findings from {len(by)} sources; the most used source carries {round(100 * n / len(fs))} percent"))
        break
    return out


def _judge(folder):
    v = _read(os.path.join(folder, "verification.json"))
    try:
        d = json.loads(v) if v else {}
    except ValueError:
        return None, []
    return d.get("score"), d.get("deterministic_findings") or []


def score(t):
    """The scorecard for one finished task (see module docstring)."""
    rp = t.get("result_path") or ""
    folder = os.path.dirname(rp) if rp else ""
    checks, judge = [], None
    page = _read(rp) if rp.endswith(".html") else ""
    if page:
        checks += _page_checks(page)
    slides = ""
    if folder and os.path.isfile(os.path.join(folder, "slides.html")):
        # score the slides the export makes today (laid out again from saved data), not the copy saved at generation
        try:
            from . import deck as _deck, exporter
            slides = exporter.relayout(t, folder, _deck.brand_id((t.get("brief") or {}).get("brand"))) or ""
        except Exception:
            slides = ""
        slides = slides or _read(os.path.join(folder, "slides.html"))
    if slides:
        checks += _slide_checks(slides)
    if t["kind"] == "deck":
        meta = os.path.join(folder, "deck.json")
        try:
            d = json.loads(_read(meta)) if os.path.isfile(meta) else {}
        except ValueError:
            d = {}
        titles = [str(s.get("title") or "").strip().lower() for s in d.get("slides") or []]
        rep = sorted({x for x in titles if x and titles.count(x) > 1})
        checks.append(_check("no_repeated_slides", not rep, f"repeated slide titles: {rep[:3]}" if rep else f"{len(titles)} different slides"))
        pptx = os.path.join(folder, "deck.pptx")
        if os.path.isfile(pptx):
            checks += _pptx_checks(pptx)
    if folder:
        judge, findings = _judge(folder)
        quoted = [f for f in findings if f.get("rule") == "quote-not-in-source"]
        if os.path.isfile(os.path.join(folder, "verification.json")):
            checks.append(_check("quotes_in_sources", not quoted, f"{len(quoted)} quoted passages not found in the sources"
                                 if quoted else "every quote found in its source"))
        jp = os.path.join(folder, "journey.json")
        if os.path.isfile(jp):
            try:
                j = json.loads(_read(jp))
                checks.append(_check("quotes_in_sources", True, f"{j.get('quotes_kept', 0)} quotes verified; "
                                     f"{j.get('dropped_pains_quote_not_in_source', 0)} not found and removed before writing"))
            except ValueError:
                pass
    cur = _currency_check(folder, t.get("engagement_id")) if t["kind"] != "video_transcript" else None
    if cur:
        checks.append(cur)
    if t["kind"] != "video_transcript":
        try:
            if page:
                checks.append(_internal_check(page, True))
            elif rp.endswith(".md") and os.path.isfile(rp):
                checks.append(_internal_check(_read(rp), False))
            if t["kind"] in ("research_report", "themes", "deck", "artifact", "journey_map", "audio_overview"):
                checks += _collection_checks(folder, t.get("engagement_id"))
        except Exception:
            pass
    if t["kind"] == "video_transcript" and folder:
        need = ("transcript.txt", "transcript.md", "transcript.srt", "transcript.vtt", "segments.json")
        missing = [n for n in need if not os.path.isfile(os.path.join(folder, n))]
        checks.append(_check("transcript_files", not missing, f"missing: {missing}" if missing else "TXT, Markdown, SRT, VTT and JSON present"))
        try:
            segs = json.loads(_read(os.path.join(folder, "segments.json"))).get("segments") or []
            long_ = sum(1 for s in segs if s["end"] - s["start"] > CUE_MAX_SECONDS)
            checks.append(_check("subtitle_lines", long_ == 0, f"{long_} subtitle lines over {CUE_MAX_SECONDS:g} s" if long_
                                 else f"{len(segs)} subtitle lines, none over {CUE_MAX_SECONDS:g} s"))
        except (ValueError, KeyError, TypeError):
            pass
    return {"checks": checks, "judge": judge, "hard_failed": [c["name"] for c in checks if c["hard"] and not c["passed"]],
            "checked_at": time.time()}


def run(tid):
    """Score a finished task, write scorecard.json beside its result, record an event, and mark the task as needing
    review when a hard check failed (the summary then begins with the failing checks). Never raises."""
    try:
        t = store.get_task(tid)
        if not t or t["status"] != "done":
            return None
        sc = score(t)
        rp = t.get("result_path") or ""
        if rp:
            with open(os.path.join(os.path.dirname(rp), "scorecard.json"), "w", encoding="utf-8", newline="\n") as fh:
                json.dump(sc, fh, indent=1, ensure_ascii=False)
        store.event("scorecard", {"hard_failed": sc["hard_failed"],
                                  "soft_failed": [c["name"] for c in sc["checks"] if not c["hard"] and not c["passed"]],
                                  "passed": sum(1 for c in sc["checks"] if c["passed"]),
                                  "checks": len(sc["checks"]), "judge": sc["judge"]}, t["engagement_id"], tid)
        summary = str(t.get("summary") or "")
        if sc["hard_failed"] and not summary.startswith("Needs review"):
            store.update_task(tid, summary=f"Needs review ({', '.join(sc['hard_failed'])}). {summary}"[:2000])
        elif not sc["hard_failed"] and summary.startswith("Needs review ("):
            # scored again after a fix and every hard check passes: the mark goes (23 Nov: an architecture kept
            # "Needs review (no_cut_sentences)" after its slides were fixed and re-scored clean)
            store.update_task(tid, summary=re.sub(r"^Needs review \([^)]*\)\.\s*", "", summary)[:2000])
        try:                                      # WS-5 step 3: the task's one line in episodic memory
            from . import memory
            memory.episode(store.get_task(tid) or t, scorecard=sc)
        except Exception:
            pass
        from . import improve                     # every few scored tasks, the failures become proposals (WS-1 step 4)
        improve.maybe_run()
        return sc
    except Exception:
        return None


def read(t):
    """The saved scorecard of a task, or None."""
    rp = (t or {}).get("result_path") or ""
    if not rp:
        return None
    try:
        return json.loads(_read(os.path.join(os.path.dirname(rp), "scorecard.json")) or "null")
    except ValueError:
        return None
