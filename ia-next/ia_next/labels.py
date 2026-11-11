"""Human labels and judge calibration (plan 6.5 "Calibrating the judges", Phase 5).

Every finished output can take a thumbs up or down with a short reason. A label is a measurement, never
an instruction: it changes no prompt. Calibration joins labels to the verifier's verdict on the same task
and reports, per judge model, agreement and Cohen's kappa. The plan's rule: a judge may block a release
only once it has at least 30 labels and kappa of at least 0.4; until then its verdicts are advisory.
"""
import json
import os
import time

from . import store

SCHEMA = """CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY, task_id TEXT, label TEXT, reason TEXT, created REAL)"""
MIN_LABELS = 30
MIN_KAPPA = 0.4
JUDGE_PASS_SCORE = 0.8     # a judge "passes" a task when its checklist score reaches this


def _db():
    c = store.conn()
    c.execute(SCHEMA)
    return c


def add(task_id, label, reason=""):
    if label not in ("approved", "rejected"):
        raise ValueError("label must be approved or rejected")
    t = store.get_task(task_id)
    if not t or t["status"] != "done":
        raise ValueError("only a finished task can be labeled")
    lid = store.new_id("label")
    _db().execute("INSERT INTO labels VALUES (?,?,?,?,?)", (lid, task_id, label, (reason or "")[:300], time.time()))
    store.event("label", {"task": task_id, "label": label, "reason": (reason or "")[:300]}, t["engagement_id"], task_id)
    return {"id": lid, "task": task_id, "label": label}


def latest_by_task():
    rows = _db().execute("SELECT task_id, label FROM labels ORDER BY created").fetchall()
    out = {}
    for r in rows:
        out[r["task_id"]] = r["label"] == "approved"
    return out


def judge_verdict(task):
    """(judge_model, passed) from the task's verification file, or None when the task was not judged."""
    try:
        p = store.safe_path(task["engagement_id"], "results/verification.json")
        if not os.path.isfile(p):
            return None
        with open(p, encoding="utf-8") as fh:
            v = json.load(fh)
        j = v.get("judge") or {}
        return j.get("judge_model"), float(v.get("score", j.get("score", 0))) >= JUDGE_PASS_SCORE
    except Exception:
        return None


def kappa(tp, fp, fn, tn):
    n = tp + fp + fn + tn
    if not n:
        return 0.0
    po = (tp + tn) / n
    pe = ((tp + fp) / n) * ((tp + fn) / n) + ((fn + tn) / n) * ((fp + tn) / n)
    return 1.0 if pe >= 1 else round((po - pe) / (1 - pe), 4)


def calibration():
    human = latest_by_task()
    stats = {}
    for tid, h in human.items():
        t = store.get_task(tid)
        jv = judge_verdict(t) if t else None
        if not jv or not jv[0]:
            continue
        model, jp = jv
        s = stats.setdefault(model, {"tp": 0, "fp": 0, "fn": 0, "tn": 0})
        s["tp" if jp and h else "fp" if jp else "fn" if h else "tn"] += 1
    out = {}
    for model, s in stats.items():
        n = sum(s.values())
        k = kappa(**s)
        out[model] = {"labels": n, "agreement": round((s["tp"] + s["tn"]) / n, 3) if n else 0, "kappa": k, "confusion": s,
                      "may_block": n >= MIN_LABELS and k >= MIN_KAPPA,
                      "status": "calibrated: may block" if n >= MIN_LABELS and k >= MIN_KAPPA
                      else f"advisory: {max(0, MIN_LABELS - n)} more labels needed" if n < MIN_LABELS else "advisory: agreement with people too low"}
    return {"rule": f"a judge may block only with {MIN_LABELS}+ labels and kappa >= {MIN_KAPPA}", "labels": len(human), "judges": out}
