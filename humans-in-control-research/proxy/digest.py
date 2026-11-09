"""The morning read-out (2026-10-31, agent-stack plan WS-E E3, transcript T10 applied to HiC's own state).

What changed since the owner last looked: the runs that ran, their verdicts, decks waiting on a decision (open
deckAsk cards), self-improvement proposals waiting for review, a paused improvement loop, the overnight rescore and
its failures, and what the second brain filed. Composed from the records the platform already keeps (RunState files,
the telemetry sink, the rescore summaries, the epoch proposals, the loop state, the brain-growth report); nothing is
estimated or inferred. Pure functions; the proxy route supplies the records.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def _iso_to_ts(iso: str) -> float:
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _plural(n: int, one: str, many: Optional[str] = None) -> str:
    return f"{n} {one if n == 1 else (many or one + 's')}"


def compose_digest(since_iso: str, now_iso: str, *, runs: list, events: list, rescore: Optional[dict], proposals: list,
                   loop: dict, deck_asks: list, brain: Optional[dict]) -> dict:
    since_ts = _iso_to_ts(since_iso)
    sections = []

    # runs (RunState records updated since)
    recent = [r for r in runs if (float(r.get("updated_at") or 0) / 1000.0) >= since_ts]
    recent.sort(key=lambda r: float(r.get("updated_at") or 0), reverse=True)
    if recent:
        items = []
        for r in recent[:12]:
            verdicts = r.get("verdicts") or []
            failed = sum(1 for v in verdicts if v.get("pass") is False)
            arts = len(r.get("artifacts") or [])
            bits = [str(r.get("kind") or "run")]
            if arts:
                bits.append(_plural(arts, "artifact"))
            if verdicts:
                bits.append(f"{len(verdicts) - failed} of {len(verdicts)} verdicts passed")
            goal = (r.get("goal") or {}).get("status") if isinstance(r.get("goal"), dict) else None
            if goal:
                bits.append(f"goal {goal}")
            items.append({"text": f"{str(r.get('objective') or r.get('engagement') or 'Untitled run')[:110]}: {', '.join(bits)}.",
                          "ref": {"engagement": r.get("engagement"), "run_id": r.get("run_id")}})
        sections.append({"id": "runs", "title": "Runs since you were last here", "items": items})

    # post-generation verdicts from the event sink
    chains = [e for e in events if e.get("kind") == "post_chain"]
    if chains:
        failed = [e for e in chains if e.get("pass") is False]
        items = [{"text": f"{_plural(len(chains), 'artifact')} went through the post-generation chain; {len(failed)} failed it."}]
        for e in failed[:6]:
            items.append({"text": f"Failed: {e.get('artifact_id')} in {e.get('run_id')}"
                                  + (f" after {e.get('repair_rounds')} repair round(s)" if e.get("repair_rounds") else "") + ".",
                          "ref": {"run_id": e.get("run_id"), "artifact_id": e.get("artifact_id")}})
        sections.append({"id": "verdicts", "title": "Verdicts", "items": items})

    # decks waiting on the owner
    if deck_asks:
        sections.append({"id": "open_decks", "title": "Decks waiting on your decision", "items": [
            {"text": f"{d.get('engagement')}: a deck shipped with {_plural(int(d.get('findings') or 0), 'open finding')} (accept, narrow or guide).",
             "ref": {"engagement": d.get("engagement"), "message_id": d.get("message_id")}} for d in deck_asks[:8]]})

    # self-improvement proposals waiting for review
    pending = [p for p in proposals if isinstance(p, dict) and p.get("status") == "pending"]
    if pending:
        pending.sort(key=lambda p: str(p.get("created_at") or ""), reverse=True)
        sections.append({"id": "proposals", "title": "Self-improvement proposals waiting for review", "items": [
            {"text": str(p.get("summary") or p.get("id"))[:200], "ref": {"proposal_id": p.get("id")}} for p in pending[:8]]})

    # the improvement loop
    if loop.get("paused"):
        sections.append({"id": "loop", "title": "Self-improvement loop", "items": [
            {"text": f"Paused: {loop.get('paused_reason') or 'no held-out win in recent batches'}."}]})

    # the overnight rescore
    if rescore and _iso_to_ts(rescore.get("finished_at") or "") >= since_ts:
        items = [{"text": f"Rescored {_plural(int(rescore.get('artifacts') or 0), 'artifact')} from the last {int(rescore.get('window_hours') or 24)} hours; "
                          f"{int(rescore.get('failures') or 0)} failed."}]
        for f in (rescore.get("failed") or [])[:5]:
            items.append({"text": f"Failed rescore: {f.get('kind')} {f.get('artifact_id')} in {f.get('run_id')}.",
                          "ref": {"run_id": f.get("run_id"), "artifact_id": f.get("artifact_id")}})
        if rescore.get("epoch_proposal_id"):
            items.append({"text": f"The failure volume opened proposal {rescore['epoch_proposal_id']}.", "ref": {"proposal_id": rescore["epoch_proposal_id"]}})
        sections.append({"id": "rescore", "title": "Overnight rescore", "items": items})

    # what the second brain filed
    if brain and _iso_to_ts(brain.get("ran_at") or "") >= since_ts:
        kg = brain.get("known_gaps") or {}
        due = [g for g in (brain.get("patterns") or []) if g.get("due")]
        items = []
        if kg.get("written"):
            items.append({"text": f"Filed or updated {_plural(len(kg['written']), 'known-gap page')} from the eval lane: {', '.join(p.split('/')[-1][8:-3] for p in kg['written'][:6])}."})
        if (brain.get("engagements") or {}).get("backfilled"):
            items.append({"text": f"Tagged {_plural(len(brain['engagements']['backfilled']), 'engagement page')} with type and industry."})
        for g in due:
            items.append({"text": f"A cross-engagement pattern is due for {g.get('type')} in {g.get('industry')} ({g.get('engagements')} engagements)."})
        if items:
            sections.append({"id": "brain", "title": "Second brain", "items": items})

    # the agents' side of the platform
    turns = [e for e in events if e.get("kind") == "agent_turn"]
    hooks = [e for e in events if e.get("kind") == "webhook" and e.get("stage") == "accepted"]
    reviews = [e for e in events if e.get("kind") == "computer_use" and str(e.get("stage") or "").startswith("review")]
    if turns or hooks or reviews:
        items = []
        if turns:
            items.append({"text": f"The platform agent answered {_plural(len(turns), 'turn')}."})
        if hooks:
            items.append({"text": f"{_plural(len(hooks), 'delegated job')} arrived through the signed webhook."})
        if reviews:
            items.append({"text": f"{_plural(len(reviews), 'outbound computer-use action')} went to review."})
        sections.append({"id": "agents", "title": "Agents", "items": items})

    counts = {s["id"]: len(s["items"]) for s in sections}
    needs = []
    if deck_asks:
        needs.append(_plural(len(deck_asks), "deck") + " waiting on a decision")
    if pending:
        needs.append(_plural(len(pending), "proposal") + " to review")
    if loop.get("paused"):
        needs.append("the improvement loop is paused")
    headline = ("Needs you: " + "; ".join(needs) + ".") if needs else (
        "Nothing waits on you; here is what ran." if sections else "Nothing changed since you were last here.")
    return {"since": since_iso, "generated_at": now_iso, "headline": headline, "sections": sections, "counts": counts,
            "needs_attention": bool(needs)}


def render_text(d: dict) -> str:
    """The digest as plain text, for the platform agent to read aloud."""
    lines = [d.get("headline") or ""]
    for s in d.get("sections") or []:
        lines.append("")
        lines.append(s["title"] + ":")
        lines += [f"- {i['text']}" for i in s["items"]]
    return "\n".join(lines).strip()


def default_since(seen: dict, surface: str, now: datetime, hours: float = 24.0) -> str:
    iso = (seen or {}).get(surface)
    if iso and _iso_to_ts(iso) > 0:
        return iso
    return datetime.fromtimestamp(now.timestamp() - hours * 3600, tz=timezone.utc).isoformat().replace("+00:00", "Z")
