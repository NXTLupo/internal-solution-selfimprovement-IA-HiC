"""Stop and Try again for studio tasks (enhancement plan B4).

Stop: the server records the request at once ('stopping'); the task's ledger raises at its next metered call and the
research pipeline checks between steps, so a stop takes effect after the step in flight, and the task ends as
'stopped' with its spend so far. Nothing is deleted: whatever the task wrote stays in its own task folder.

Try again: a failed or stopped task starts again with the same brief and the same budget it was given (the 16 Nov
audit found that "Try again" re-asked the agent in words and dropped the approved budget). A budget above the spend
threshold needs a fresh approval for this exact retry, because one approval covers one call.
"""
import hashlib
import json
import threading

from . import config, control, store


def _runners():
    from . import deck, prototype, social, studio, transcripts
    return {"research_report": studio.run_research_task, "journey_map": studio.run_journey_task,
            "deck": deck.run_deck_task, "prototype": prototype.run_prototype_task,
            "social": social.run_social_task, "transcript": transcripts.run_transcript_task}


def stop(tid):
    """Returns the task after the request. Raises KeyError for an unknown task and ValueError when it is not
    running (already finished, failed or stopped)."""
    t = store.get_task(tid)
    if not t:
        raise KeyError(tid)
    store.request_stop(tid)
    t = store.get_task(tid)
    if t["status"] not in ("stopping", "stopped"):
        word = {"done": "finished", "failed": "ended without finishing"}.get(t["status"], t["status"])
        raise ValueError(f"that work has already {word}; there is nothing to stop")
    return t


def _retries(tid):
    """Ids of the tasks started as retries of this one, oldest first."""
    rows = store.conn().execute("SELECT data FROM events WHERE kind = 'task_retried' AND task_id = ? ORDER BY id", (tid,))
    out = []
    for r in rows:
        try:
            out.append(json.loads(r["data"])["new_task_id"])
        except (ValueError, KeyError, TypeError):
            pass
    return out


def _attempt(tid):
    """The retry number to use now: a retry still running is reused (a double click starts one run), a finished one
    makes room for the next."""
    done = 0
    for nid in _retries(tid):
        t = store.get_task(nid)
        if t and t["status"] in store.TERMINAL:
            done += 1
    return done


def retry(tid, approved=False, attempt=None):
    """Start a failed or stopped task again. Returns {"task_id", "started", "budget_usd", "retry_of"}, or
    {"approval": ..., "approval_id": ..., "approval_row": ...} while a budget above the threshold waits for the
    person. Raises KeyError for an unknown task and ValueError when the task cannot be retried."""
    t = store.get_task(tid)
    if not t:
        raise KeyError(tid)
    if t["status"] not in ("failed", "stopped"):
        raise ValueError("only work that did not finish can be tried again")
    runner = _runners().get(t["kind"])
    if runner is None:
        raise ValueError(f"{t['kind']} work cannot be tried again from here; ask for it again in the conversation")
    budget = float(t["budget_usd"] or config.TASK_SPEND_APPROVAL_USD)
    n = _attempt(tid) if attempt is None else int(attempt)
    args = {"task_id": tid, "attempt": n}
    if budget > config.TASK_SPEND_APPROVAL_USD and not approved and control.status_for("retry_task", args) != "approved":
        a = control.request("spend", "retry_task", args,
                            f"Try again with the same budget, {budget:.2f} USD, which is above the "
                            f"{config.TASK_SPEND_APPROVAL_USD:.2f} USD threshold")
        return {"approval": a["status"], "approval_id": a["id"], "approval_row": a,
                "message": "needs the person's spend approval" if a["status"] == "pending" else f"approval {a['status']}"}
    idem = hashlib.sha256(f"retry:{tid}:{n}".encode()).hexdigest()
    new, created = store.create_task(t["engagement_id"], t["kind"], t["brief"], budget, idem)
    if created:
        store.event("task_retried", {"new_task_id": new, "attempt": n, "budget_usd": budget}, t["engagement_id"], tid)
        threading.Thread(target=runner, args=(new,), daemon=True, name=f"task-{new}").start()
    return {"task_id": new, "started": created, "budget_usd": budget, "retry_of": tid}
