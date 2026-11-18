"""HiC's artifact studio, for IA Next (plan Part 2, Artifacts; owner decision 17 Nov: call HiC through the host).

The agent maps a hashtag or its plain form ("#prd", "a product requirements document") to one of HiC's artifact kinds.
The task reads unanalysed uploads first, builds the corpus from the second brain (manifest chunks of the named
sources, whole when they fit), queues the generation in HiC's job store (POST /api/jobs, op /api/artifact/generate)
and polls it, then runs IA Next's own checks on the result: every quoted passage is looked up in the sources, and a
reviewer from another vendor scores it. HiC meters its own model calls; the task records an estimate, marked as one.

The generated page is model-written HTML: it is served only inside a sandboxed iframe with a strict CSP, like a
prototype (app.py), and the brand faces are embedded at serve time.
"""
import html as _html
import json
import os
import re
import threading
import time

from . import config, deck, hic, providers, secondbrain, store, verify

KINDS = {
    "prd": "product requirements document",
    "roadmap": "roadmap",
    "recommendations": "recommendations",
    "strategy": "strategy",
    "brief": "executive brief",
    "blueprint": "service blueprint",
    "personas": "personas",
    "competitive": "competitive analysis",
    "gap": "gap analysis",
    "arch": "architecture map",
    "org": "org chart",
    "tech-audit": "technology audit",
    "mindmap": "mind map",
    "case-study": "case study",
    "report": "report",
    "whitepaper": "white paper",
    "explainer": "explainer",
    "heuristic-ux": "heuristic UX review",
    "research-plan": "research plan",
}
# 17 Nov full pass, measured from HiC's own telemetry: one PRD draft cost 3.10 USD (eight Opus 5.5 calls). The real
# cost of each run is read back from HiC (run id ia-next-<task>); this estimate is only for the approval card, the
# conversation's limit and the case where HiC's telemetry cannot be read.
ESTIMATE_USD = 3.20
BUDGET_USD = 4.00              # one draft, the free quote repair, the cross-vendor review and upload analysis
POLL_SECONDS = 5
MAX_WAIT_SECONDS = 20 * 60
ARTIFACT_CSP = ("default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; "
                "script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'")
ARTIFACT_HEADERS = {"Content-Security-Policy": ARTIFACT_CSP, "X-Content-Type-Options": "nosniff",
                    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}
_QUOTE = re.compile(r"[\"“]([^\"“”<>]{24,400})[\"”]")
_QUOTE_TAG = re.compile(r"(?is)<(blockquote|q)\b[^>]*>(.*?)</\1>")


def label(kind):
    return KINDS.get(kind, kind)


def visible_text(doc):
    """The words a reader sees: scripts, styles and tags removed, entities decoded."""
    t = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", doc or "")
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", _html.unescape(t)).strip()


_ASSET_REF = re.compile(r"""(url\(\s*['"]?|src\s*=\s*['"])((?:\./)?assets/[^'")\s]+)""", re.I)


def inline_brand_assets(doc, brand):
    """HiC's design-system CSS points at its logo files relative to HiC's gallery (`assets/nxt-logo-black.png`). Inside
    IA Next's sandbox (img-src data: only) those would show nothing, so each logo reference becomes the brand's own
    vector mark from the token copy, as a data URI (white for a "white" variant). Other relative assets are dropped
    to a transparent pixel rather than left as a blocked request."""
    import base64
    kit = deck.brand_kit(brand)
    mark = kit.get("mark") or ""
    blank = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="

    def svg_uri(color):
        if not mark.startswith("<svg"):
            return blank
        svg = mark.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1).replace('fill="currentColor"', f'fill="{color}"')
        return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")

    def swap(m):
        ref = m.group(2).lower()
        if "logo" in ref:
            return m.group(1) + svg_uri("#FFFFFF" if any(w in ref for w in ("white", "light", "reverse", "inverse")) else "#0D0D0D")
        return m.group(1) + blank
    return _ASSET_REF.sub(swap, doc or "")


def quoted_passages(doc):
    """What the page presents as quotations: text inside <blockquote> or <q>, and quotation marks within ONE run of
    text between tags (17 Nov full pass: pairing marks across table cells produced false quotes). Styles, scripts and
    templates are not text (17 Nov: CSS attribute selectors such as [data-x="..."] were counted as quotes)."""
    found = []
    doc = re.sub(r"(?is)<(script|style|noscript|template)\b[^>]*>.*?</\1\s*>", " ", doc or "")
    for m in _QUOTE_TAG.finditer(doc):
        t = re.sub(r"\s+", " ", _html.unescape(re.sub(r"(?s)<[^>]+>", " ", m.group(2)))).strip(" \"\u201c\u201d")
        if len(t) >= 24:
            found.append(t)
    for seg in re.split(r"(?s)<[^>]+>", doc):
        for m in _QUOTE.finditer(_html.unescape(seg)):
            found.append(m.group(1).strip())
    return list(dict.fromkeys(found))


def _norm(s):
    return re.sub(r"\s+", " ", (s or "").lower()).strip(" .,;:")


def unverified_quotes(doc, sources):
    """Quoted passages that appear in none of the sources (whitespace and case ignored)."""
    pool = [_norm(s.get("text")) for s in sources]
    return [q[:160] for q in quoted_passages(doc) if _norm(q) and not any(_norm(q) in p for p in pool)]


def repair_quotes(doc, sources, missing):
    """Narrowing-only and free: a quote that closely matches one source sentence takes that sentence's exact words;
    any other quote loses its quotation marks, so it no longer stands as a quotation. Returns (doc, restored, unquoted)."""
    import difflib
    sentences = []
    for s in sources:
        sentences += [x.strip() for x in re.split(r"(?<=[.!?])\s+|\n+", s.get("text") or "") if len(x.strip()) >= 20]
    restored = unquoted = 0
    for q in missing:
        best, ratio = None, 0.0
        for sen in sentences:
            r = difflib.SequenceMatcher(None, _norm(q), _norm(sen)).ratio()
            if r > ratio:
                best, ratio = sen, r
        for mark_open, mark_close in (("\u201c", "\u201d"), ('"', '"'), ("&ldquo;", "&rdquo;"), ("&quot;", "&quot;")):
            old = f"{mark_open}{q}{mark_close}"
            if old in doc:
                if best and ratio >= 0.85:
                    doc = doc.replace(old, f"{mark_open}{_html.escape(best, quote=False)}{mark_close}")
                    restored += 1
                else:
                    doc = doc.replace(old, q)
                    unquoted += 1
                break
    return doc, restored, unquoted


def hic_cost(run_id):
    """What HiC's own meter recorded for the calls tagged with `run_id` (x-hic-run-id), or None when unreadable."""
    try:
        got = hic._call("GET", "/api/telemetry/events", 30, params={"run_id": run_id, "kind": "ai_call", "limit": 500})
        rows = got.get("rows") or []
        return round(sum(float(r.get("cost_usd") or 0) for r in rows), 6), len(rows)
    except Exception:
        return None


def corpus_for(eid, brief):
    """(corpus text, the sources it holds, the evidence report): the named sources' findings and manifest chunks."""
    findings = deck._load(eid, "results/findings.json")["findings"]
    sources = deck._load(eid, "results/sources.json")["sources"]
    findings, sources = deck.scope_material(findings, sources, brief.get("source_ids"))
    if not sources:
        raise ValueError("the named sources have not been read into this engagement yet")
    chunks, evidence = secondbrain.material(eid, sources, brief.get("goal", ""))
    fl = "\n".join(f"- [{f['source_id']}] {f['claim']} | quote: \"{f['quote']}\"" for f in findings)
    corpus = ("FINDINGS (each quote already checked against its source):\n" + (fl or "(none)") +
              "\n\nSOURCES (each source's text, as chunks):\n" + secondbrain.as_prompt(chunks))
    return corpus, sources, dict(evidence, pointers=[c["pointer"] for c in chunks if c["pointer"]])


def generate(kind, brand, goal, corpus, render_mode, tid=None, spent=lambda: 0.0, run_id=""):
    """Queue the artifact in HiC's job store and wait for it. Returns the job's result (html, artifact_id, ...). The
    request carries x-hic-run-id, so HiC's usage ledger records every model call of the job under that id."""
    job = hic._call("POST", "/api/jobs", 60, json={"op": "/api/artifact/generate", "body": {
        "kind": kind, "brand": brand, "goal": goal, "corpus": corpus, "render_mode": render_mode}},
        headers={"x-hic-run-id": run_id, "x-hic-session": "ia-next"} if run_id else None)
    jid = job.get("job_id")
    if not jid:
        raise providers.ProviderError(f"HiC did not queue the {label(kind)}: {str(job.get('error') or job)[:200]}")
    deadline = time.time() + MAX_WAIT_SECONDS
    while True:
        if tid:
            store.check_stop(tid, spent())
        st = hic._call("GET", f"/api/jobs/{jid}", 30)
        if st.get("status") not in ("running", "queued"):
            break
        if time.time() > deadline:
            raise providers.ProviderError(f"HiC's {label(kind)} did not finish within {MAX_WAIT_SECONDS // 60} minutes")
        time.sleep(POLL_SECONDS)
    res = st.get("result") or {}
    if st.get("status") != "done" or not res.get("html"):
        raise providers.ProviderError(f"HiC could not make the {label(kind)}: {str(res.get('error') or st.get('status'))[:300]}")
    return dict(res, job_id=jid)


def html_path_for_task(tid):
    t = store.get_task(tid)
    return store.safe_path(t["engagement_id"], f"results/tasks/{tid}/artifact.html")


def _fail(tid, eid, nid, msg, ledger):
    if nid:
        store.finish_node(nid, None, None, error=msg[:500])
    store.update_task(tid, status="failed", error=msg[:500], spent_usd=ledger.spent_usd)
    store.event("task_failed", {"error": msg[:500]}, eid, tid)


@store.stoppable
def run_artifact_task(tid):
    t = store.get_task(tid)
    eid, brief = t["engagement_id"], t["brief"]
    kind, brand = brief["kind"], deck.brand_id(brief.get("brand"))
    ledger = providers.Ledger(limit_usd=t["budget_usd"] or BUDGET_USD, task_id=tid)
    store.update_task(tid, status="running")
    store.event("task_running", {}, eid, tid)
    from . import transcripts
    try:                                     # the person's attached files are read before the artifact is made
        seq = transcripts.run_uploads_first(tid, eid, brief.get("goal", ""), ledger)
    except Exception as e:
        return _fail(tid, eid, None, f"the attached files could not be analysed, so the {label(kind)} was not made: {str(e)[:300]}", ledger)
    nid = store.start_node(tid, "Artifact Studio (HiC)", "hic", seq)
    try:
        corpus, sources, evidence = corpus_for(eid, brief)
        res = generate(kind, brand, brief.get("goal", ""), corpus, brief.get("render_mode") or "document", tid,
                       lambda: ledger.spent_usd, run_id=f"ia-next-{tid}")
    except FileNotFoundError:
        return _fail(tid, eid, nid, "this engagement has no analysed material yet; run research or attach files first", ledger)
    except hic.HicUnavailable as e:
        return _fail(tid, eid, nid, f"{e}. Decks, journey maps and prototypes still work without it.", ledger)
    except (providers.ProviderError, ValueError) as e:
        return _fail(tid, eid, nid, str(e), ledger)
    metered = hic_cost(f"ia-next-{tid}")                  # HiC's own meter for this job's model calls
    hic_usd = metered[0] if metered and metered[1] else ESTIMATE_USD
    try:
        ledger.add(providers.Usage("hic-artifact", extra_usd=hic_usd))
    except providers.BudgetExceeded:
        pass                                 # already spent in HiC: recorded, and no further paid call is made below
    doc = inline_brand_assets(res["html"].replace("—", ", "), brand)
    first_missing = unverified_quotes(doc, sources)
    doc, restored, unquoted = repair_quotes(doc, sources, first_missing)
    missing = unverified_quotes(doc, sources)
    text = visible_text(doc)
    outdir = store.safe_path(eid, f"results/tasks/{tid}")
    os.makedirs(outdir, exist_ok=True)
    hp = os.path.join(outdir, "artifact.html")
    with open(hp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(doc)
    store.finish_node(nid, hp, f"{label(kind)} from {len(sources)} sources ({len(evidence.get('pointers') or [])} manifest "
                               f"chunks); {len(first_missing)} quoted passages not in the sources: {restored} restored to "
                               f"the source's words, {unquoted} no longer shown as quotes")
    review = None
    rid = store.start_node(tid, "Verifier", verify.judge_model_for("claude-sonnet-5-5"), seq + 1)
    try:
        if ledger.spent_usd >= ledger.limit_usd:
            raise providers.BudgetExceeded(ledger.spent_usd, ledger.limit_usd)
        review = verify.judge(text, {"goal": brief.get("goal", ""), "audience": brief.get("audience", ""), "success": []},
                              sources, "claude-opus-5-5", ledger)
        store.finish_node(rid, hp, f"reviewer score {review['score']:.2f} ({review['judge_model']})")
    except Exception as e:                   # the artifact is kept; the card says the review did not run
        store.finish_node(rid, None, None, error=f"the review did not run: {str(e)[:200]}")
    with open(os.path.join(outdir, "verification.json"), "w", encoding="utf-8", newline="\n") as fh:   # the card's checks
        json.dump({"score": (review or {}).get("score", 0), "judge": review,
                   "deterministic_findings": [{"rule": "quote-not-in-source", "detail": q} for q in missing]}, fh,
                  indent=1, ensure_ascii=False)
    with open(os.path.join(outdir, "artifact.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"kind": kind, "label": label(kind), "brand": brand, "goal": brief.get("goal", ""),
                   "source_ids": brief.get("source_ids") or [], "evidence": evidence,
                   "quotes_not_in_sources": missing, "quotes_first_draft": first_missing, "quotes_restored": restored,
                   "quotes_unquoted": unquoted, "review": review,
                   "hic_usd": hic_usd, "hic_usd_measured": bool(metered and metered[1]),
                   "hic": {k: res.get(k) for k in ("job_id", "artifact_id", "run_id", "run_status", "kind", "brand")},
                   "built": time.time()}, fh, indent=1, ensure_ascii=False)
    with open(os.path.join(outdir, "sources.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"sources": [{k: s.get(k, "") for k in ("id", "title", "url")} for s in sources]}, fh, indent=1, ensure_ascii=False)
    score = f", reviewer score {review['score']:.2f}" if review else ""
    cost = (f"HiC's cost {hic_usd:.2f} USD by its own meter" if metered and metered[1]
            else f"HiC's cost estimated at {hic_usd:.2f} USD")
    summary = (f"{label(kind).capitalize()} ready in the {deck.BRAND_NAMES[brand]} brand, from {len(sources)} sources"
               f"{score}; {len(missing)} quoted passages not found in the sources; {cost}")
    store.update_task(tid, status="done", result_path=hp, summary=summary, spent_usd=ledger.spent_usd)
    store.event("task_done", {"summary": summary, "spent_usd": ledger.spent_usd}, eid, tid)


def start_artifact_task(eid, kind, goal, brand, audience="", source_ids=None, render_mode="document", idem_key=None):
    brief = {"kind": kind, "goal": goal, "audience": audience, "brand": deck.brand_id(brand),
             "render_mode": render_mode if render_mode in ("document", "slides") else "document"}
    if source_ids:
        brief["source_ids"] = list(source_ids)
    tid, created = store.create_task(eid, "artifact", brief, BUDGET_USD, idem_key)
    if created:
        threading.Thread(target=run_artifact_task, args=(tid,), daemon=True, name=f"task-{tid}").start()
    return tid, created


STR = {"type": "string"}
_MAP = ("#prd or product requirements -> prd; #roadmap -> roadmap; #recs or #recommendations -> recommendations; "
        "#strategy -> strategy; #brief -> brief; #blueprint or service blueprint -> blueprint; #personas -> personas; "
        "#competitive -> competitive; #gap -> gap; #arch or architecture -> arch; #org -> org; #audit or tech audit -> "
        "tech-audit; #mindmap -> mindmap; #case-study -> case-study; #report -> report; #whitepaper -> whitepaper; "
        "#explainer -> explainer; #heuristic or UX review -> heuristic-ux; research plan -> research-plan")
TOOLS = [
    {"name": "start_artifact", "strict": False,      # fields checked in code; keeps the strict grammar under the API limit
     "description": ("Start a background task in which HiC's artifact studio makes one document from an engagement's "
                     "material: " + ", ".join(KINDS.values()) + ". Map the person's hashtag or words to kind: " + _MAP +
                     ". Decks (#slides), journey maps, prototypes, themes and social listening have their own tools. goal "
                     "is what the artifact must answer, in the person's words. brand, source_ids and whole_engagement as "
                     "in start_deck. render_mode is \"slides\" only when the person asks for this artifact as slides. "
                     "Quoted passages are checked against the sources and a reviewer from another vendor scores it. About "
                     f"{ESTIMATE_USD:.2f} USD per document by HiC's own meter, so it needs the person's spend approval; "
                     "returns a pending approval, then the task id once approved."),
     "input_schema": {"type": "object", "additionalProperties": False, "required": ["engagement_id", "kind", "goal", "brand"],
                      "properties": {"engagement_id": STR, "kind": {"type": "string", "enum": sorted(KINDS)}, "goal": STR,
                                     "audience": STR, "brand": {"type": "string", "enum": ["deciem", "nu", "nxt"]},
                                     "source_ids": {"type": "array", "items": STR},
                                     "whole_engagement": {"type": "boolean"},
                                     "render_mode": {"type": "string", "enum": ["document", "slides"]}}}},
]


def execute(name, args):
    try:
        if name != "start_artifact":
            return {"error": f"unknown tool {name}"}
        eid = str(args.get("engagement_id") or "")
        if not store.get_engagement(eid):
            return {"error": "no such engagement; list_engagements shows the ids"}
        kind = str(args.get("kind") or "").strip().lower()
        if kind not in KINDS:
            return {"error": f"kind must be one of: {', '.join(sorted(KINDS))}"}
        goal = str(args.get("goal") or "").strip()
        if not goal:
            return {"error": "say what the artifact must answer (goal)"}
        try:
            ids = deck.clean_source_ids(eid, args.get("source_ids"))
        except ValueError as e:
            return {"error": str(e)}
        from . import attachments
        refused = attachments.unnamed_fresh(eid, ids, bool(args.get("whole_engagement")))
        if refused:
            return refused
        import hashlib
        from . import control
        if BUDGET_USD > config.TASK_SPEND_APPROVAL_USD:          # above the threshold: the person approves this exact call
            st = control.status_for("start_artifact", args)
            if st == "denied":
                return {"approval": "denied", "message": "the person declined this spend; do not try another way"}
            if st != "approved":
                a = control.request("spend", "start_artifact", args,
                                    f"HiC's artifact studio makes a {label(kind)}: about {ESTIMATE_USD:.2f} USD by HiC's own meter "
                                    f"(approved up to {BUDGET_USD:.2f} USD)")
                return {"approval": a["status"], "approval_id": a["id"],
                        "message": "needs the person's spend approval" if a["status"] == "pending" else f"approval {a['status']}"}
        idem = hashlib.sha256(json.dumps(args, sort_keys=True).encode()).hexdigest()
        tid, created = start_artifact_task(eid, kind, goal, args.get("brand") or "nxt", str(args.get("audience") or ""),
                                           ids, str(args.get("render_mode") or "document"), idem)
        return {"task_id": tid, "engagement_id": eid, "started": created,
                "message": "started" if created else "an identical task already exists; reporting that one"}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)[:300]}"}
