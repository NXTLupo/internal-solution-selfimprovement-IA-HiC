"""Join human labels to judge verdicts (IA plan Phase 0, label capture; plan 6.5 "Calibrating the judges").

Pure functions, no I/O, so the join is testable without the live eval store.

The defect this replaces: the join keyed both sides on (artifact_id or run_id, slide_id) and dropped any
label without a slide id. 1,110 of the 1,171 recorded verdicts are whole-artifact verdicts with no slide
id, so they could never meet a label and every artifact-level judge stayed uncalibrated. Now:
  - a verdict with no slide id is a verdict on the whole artifact, slide key WHOLE_ARTIFACT;
  - a label may name the whole artifact the same way (the chat thumbs control sends WHOLE_ARTIFACT);
  - a label is indexed under every id it carries (artifact_id, run_id, message_id), and a verdict is
    looked up by its artifact_id, then run_id, then message_id, so the two sides meet whichever id the
    producer recorded.
"""

WHOLE_ARTIFACT = "_artifact"


def _ids(row):
    return [str(row.get(k)) for k in ("artifact_id", "run_id", "message_id") if row.get(k)]


def human_index(labels):
    """Latest human judgment per (id, slide). Later labels overwrite earlier ones."""
    human = {}
    for l in labels:
        slide = str(l.get("slide_id") or "")
        if not slide:
            continue
        verdict = l.get("label") == "approved"
        for i in _ids(l):
            human[(i, slide)] = verdict
    return human


def confusion_by_judge(labels, verdicts):
    """Per judge: tp/fp/fn/tn of judge pass against human approval, over verdicts that meet a label."""
    human = human_index(labels)
    stats = {}
    for v in verdicts:
        jid = str(v.get("judge_id") or "")
        if not jid or jid.startswith("human."):
            continue
        slide = str(v.get("slide_id") or WHOLE_ARTIFACT)
        h = None
        for i in _ids(v):
            if (i, slide) in human:
                h = human[(i, slide)]
                break
        if h is None:
            continue
        jp = bool(v.get("pass"))
        s = stats.setdefault(jid, {"tp": 0, "fp": 0, "fn": 0, "tn": 0})
        s["tp" if jp and h else "fp" if jp else "fn" if h else "tn"] += 1
    return stats
