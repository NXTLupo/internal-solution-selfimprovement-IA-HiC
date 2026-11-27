"""One rework pass on finished work (harness WS-H7, 26 Nov; paper items 5 and 6).

When the scorecard reports a hard failure that code can repair, this runs once, scores the work again, keeps the
better version and records what happened (`rework` in scorecard.json, event `rework_done`). Never more than one
rework per task; a failure the rework does not fix stays labelled ("Needs review (...)"), exactly as before.

What is repaired, without a model call:
- a deck: a slide whose title repeats an earlier one is left out of the saved slides (the appended source tables share
  a title by design), and the PowerPoint and preview are written again from the saved slides with today's template,
  which keeps every reading run at 10 pt or more (deckstudio.MIN_PT). The previous slides are kept as deck.v<N>.json.

What needs no rework here, and why:
- slides made from saved data (a journey map, a persona set, a competitive analysis, an architecture): the scorecard and
  every export lay them out again from the saved data with today's template, so a template fix already reaches finished
  work; a failure there is a template defect, fixed in the template.
- a research report: the writer rewrites the sections a reviewer's point names once before it finishes (WS-H7 targeted
  repair in localwriter), which is this loop's one pass for reports.
- sources_current: old evidence needs a new collection, which is the person's call.

Measured on 26 Nov: today's checks pass all 115 finished tasks on every check this can repair; six cards still said
"Needs review" because nothing scored them again after the fix (scorecard.VERSION and the idle re-score do that now).
"""
import io
import json
import os
import re
import shutil
import time

from . import store

DECK_FIXABLE = {"no_repeated_slides", "pptx_text_size"}
KEEP = ("deck.json", "deck.pptx", "deck.html")


def fixable(t, hard_failed):
    """The hard failures of this task the rework can try to repair (empty when none)."""
    folder = os.path.dirname(t.get("result_path") or "")
    if t.get("kind") == "deck" and folder and os.path.isfile(os.path.join(folder, "deck.json")):
        return set(hard_failed or []) & DECK_FIXABLE
    return set()


def unrepeat(slides):
    """The slides with any whose title repeats an earlier one left out (source tables excepted), and how many went."""
    seen, kept = set(), []
    for s in slides or []:
        title = str(s.get("title") or "").strip().lower()
        key = " ".join(re.findall(r"[a-z0-9]+", title))
        if key and key in seen and not title.startswith("sources"):
            continue
        seen.add(key)
        kept.append(s)
    return kept, len(slides or []) - len(kept)


def _repair_deck(t, folder, wants):
    from . import deckstudio
    p = os.path.join(folder, "deck.json")
    with io.open(p, encoding="utf-8") as fh:
        meta = json.load(fh)
    steps = []
    if "no_repeated_slides" in wants:
        meta["slides"], gone = unrepeat(meta.get("slides"))
        if gone:
            n = 1
            while os.path.exists(os.path.join(folder, f"deck.v{n}.json")):
                n += 1
            shutil.copyfile(p, os.path.join(folder, f"deck.v{n}.json"))
            with io.open(p, "w", encoding="utf-8") as fh:
                json.dump(meta, fh, indent=1, ensure_ascii=False)
            steps.append(f"{gone} repeated slide{'s' if gone != 1 else ''} left out (previous slides kept as deck.v{n}.json)")
    deckstudio.rerender(t["engagement_id"], t["id"], meta.get("brand") or "nxt")
    steps.append("PowerPoint and preview written again from the saved slides with today's template")
    return steps


def run(t, sc, score):
    """Try the one rework on task `t` whose scorecard is `sc`; `score(t)` scores it again. Returns the scorecard to keep
    (with a `rework` record) or `sc` unchanged when nothing applies or the task was reworked before."""
    if sc.get("rework") or (scorecard_saved(t) or {}).get("rework"):
        return sc
    wants = fixable(t, sc.get("hard_failed"))
    if not wants:
        return sc
    folder = os.path.dirname(t["result_path"])
    backup = os.path.join(folder, ".rework-backup")
    shutil.rmtree(backup, ignore_errors=True)
    os.makedirs(backup)
    for name in KEEP:
        if os.path.isfile(os.path.join(folder, name)):
            shutil.copyfile(os.path.join(folder, name), os.path.join(backup, name))
    before = list(sc.get("hard_failed") or [])
    record = {"at": time.time(), "tried": sorted(wants), "before": before}
    after = None
    try:
        record["steps"] = _repair_deck(t, folder, wants)
        after = score(t)
    except Exception as ex:                       # a repair that cannot run leaves the work as it was
        record["error"] = f"{type(ex).__name__}: {str(ex)[:200]}"
    better = after is not None and len(after["hard_failed"]) < len(before)
    if not better:
        for name in os.listdir(backup):
            shutil.copyfile(os.path.join(backup, name), os.path.join(folder, name))
    shutil.rmtree(backup, ignore_errors=True)
    record["kept"] = "repaired" if better else "original"
    record["after"] = list(after["hard_failed"]) if better else before
    record["fixed"] = sorted(set(before) - set(record["after"]))
    store.event("rework_done", {k: record.get(k) for k in ("tried", "fixed", "after", "kept", "steps", "error")},
                t["engagement_id"], t["id"])
    return dict(after if better else sc, rework=record)


def scorecard_saved(t):
    from . import scorecard
    return scorecard.read(t)
