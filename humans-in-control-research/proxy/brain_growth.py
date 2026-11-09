"""The second brain grows on schedule (2026-10-31, agent-stack plan WS-C C3).

Three deterministic steps, run by the proxy's daily pass (and on demand through POST /api/brain/grow):

1. KNOWN GAPS FROM THE EVAL LANE. Every artifact that failed its post-generation chain became a frontier eval case
   (`evals/cases/frontier/*.json`, `origin.note`). The note alone is thin ("chainPass=false; chainTrace=[]" on most
   cases), so each case is read together with the AIR it points at, and its failures are reduced to FAMILIES (the
   claim ledger's codes, the evidence-density floor, the action-title test). A family seen in two or more cases gets
   a page `known-gaps/failure-<family>.md`: what fails, what the harness already does about it, and one
   `## <date> | <engagement>` block per occurrence (the block format `learningEngine.getRecurringShortfallTopics`
   counts). Pages are regenerated whole from the frontier set, so a rerun never duplicates a block.
2. ENGAGEMENT FRONTMATTER. The wiki compiler groups engagement pages by `engagement_type` and `industry` and compiles
   a cross-engagement pattern once five share a group. `saveEngagementMemory` wrote neither key, so no group ever
   formed. Existing pages get both (industry from the deterministic taxonomy over the research goal; nothing when the
   goal names no vertical).
3. PATTERN DUE REPORT. Groups at the threshold whose pattern page is missing or older than the group's newest
   engagement are reported as due; the SPA's incremental wiki compile (the one compiler, `wikiCompiler.ts`) writes
   the pattern on its next run. Mentor pages are never written here: `mentors/` grows only through the gated skill path.

Pure functions; the caller supplies the IO.
"""
from __future__ import annotations

import hashlib
import json
import re
from typing import Callable, Optional

MIN_CASES_FOR_GAP = 2
MIN_ENGAGEMENTS_FOR_PATTERN = 5          # mirrors wikiCompiler.ts MIN_ENGAGEMENTS_FOR_PATTERN
CROSS_CUTTING = {"workforce", "ai_research"}

# family -> (title, what fails, what the harness does about it). Plain statements about the gates, no metrics.
FAMILIES = {
    "UNSOURCED_FACT": ("Unsourced declarative facts",
                       "A declarative statement about a named entity carries no corpus pointer.",
                       "The claim ledger repair narrows the sentence to a judgment or asks for the source; a deliverable that keeps failing here needs evidence collected for the claim before generation, not softer wording."),
    "UNRESOLVED_SOURCE": ("Citations that resolve to no source",
                          "A cited pointer resolves to no chunk or page in the manifest.",
                          "Cite only pointers returned by retrieval for this run; the resolver drops the rest."),
    "UNVERIFIED_QUOTE": ("Quotes not found in the cited source",
                         "A quoted span does not appear verbatim in the cited chunk.",
                         "Quote only text present in the chunk; paraphrase loses the Evidence label."),
    "DATE_SCOPE_MISMATCH": ("Claims outside the cited source's period",
                            "The sentence states a period the cited source does not cover.",
                            "Narrow the sentence to the source's period."),
    "UNSUPPORTED_MODALITY": ("Certainty or causation the source does not support",
                             "The sentence states causation or certainty where the source reports correlation or a hedge.",
                             "Match the source's strength of claim."),
    "PRODUCT_SCOPE_MISMATCH": ("Claims about a product the source does not cover",
                               "The cited source discusses a different product, system or population.",
                               "Narrow the claim to what the source covers."),
    "INDEPENDENCE_INFLATED": ("One original counted as several sources",
                              "Several citations repeat one original claim and are presented as convergence.",
                              "Count independent originals before claiming a pattern across sources."),
    "UNVERIFIED_IDENTIFIER": ("Names and identifiers not found in the corpus",
                              "A named entity or identifier in the artifact does not appear in the cited material.",
                              "Name only entities the corpus names."),
    "DERIVED_AS_SOURCE": ("Derived figures presented as sourced facts",
                          "A value the model computed is cited as if a source stated it.",
                          "Label derivations as derivations and keep the source for the inputs."),
    "CHROME_LEAK": ("Process chrome in the shipped artifact",
                    "Pipeline metadata or process language reached the visible artifact.",
                    "The chain strips it; repeated hits point at a prompt that asks for it."),
    "evidence-density": ("Evidence density below the floor before generation",
                         "The corpus carried too little named evidence for the deliverable before generation started.",
                         "evidence-density-pre-checker names the upstream remediation (query expansion, analogues, framework pages) to run before generating."),
    "evidence-anchoring": ("Claims not anchored to evidence",
                           "The deliverable's claims were not tied to evidence pointers.",
                           "Generate from manifest chunk pointers and keep one pointer per claim."),
    "action-titles": ("Slide titles that state a topic, not a judgment",
                      "Titles fail the Partner Test: they name a topic instead of stating a conclusion.",
                      "slide-title-lab and deck-composer state each title as a judgment about the subject."),
    "claim-ledger": ("Claims the ledger could not support",
                     "The claim ledger stage finished partial: declarative claims without a supporting pointer were narrowed or withheld.",
                     "Generate from manifest chunk pointers and state an unsupported point as a judgment, not a fact."),
    "provenance": ("Citations whose provenance did not resolve",
                   "The provenance stage could not tie every citation to a named source.",
                   "Cite only pointers retrieval returned for this run; the resolver relabels or drops the rest."),
    "pointer-binding": ("Claims left without a bound pointer",
                        "The pointer-binding stage could not attach a corpus pointer to every claim.",
                        "Keep one evidence pointer per claim in the generated payload."),
    "deck-quality": ("Decks below the deck-quality bar",
                     "The deck-quality stage scored the composition below its floor (archetype variety, visual share, argument arc).",
                     "deck-composer sets the variety and visual floors; vary archetypes by content shape rather than repeating one layout."),
    "exhibits": ("Exhibits that did not render or carry their data",
                 "The exhibit stage found charts or diagrams without the data or source they claimed.",
                 "Use a stat callout when the data for a chart does not exist; never invent chart values."),
    "grade": ("Unverified or superficial factual claims",
              "The grading stage found factual claims it could not verify, or claims too shallow to carry the argument.",
              "Anchor each factual sentence to a quoted passage; cut claims the corpus cannot carry."),
    "lexical": ("Banned phrasing in generated copy",
                "The lexical stage removed banned phrases, meta-narration or format tells.",
                "human-voice-editor and the banned-phrase list in .claude/CLAUDE.md; repeated hits point at a prompt that invites them."),
    "prose": ("Prose that fails the writing signal",
              "The prose stage flagged cadence, missing actors, copula avoidance or dilution.",
              "human-voice-editor: name the actor, use a plain verb, delete words that add no fact."),
    "unrecorded": ("Chain refusals with no recorded reason",
                   "The post-generation chain refused the artifact but the record names no stage or finding.",
                   "A harness observability gap: the chain must write the failing stage into postChain so the refusal can be attributed."),
}

_DENSITY_RE = re.compile(r"evidence density", re.I)
MAX_LINES_PER_BLOCK = 8
# families the generating model cannot act on (they describe the harness); never injected into a generation prompt
HARNESS_ONLY = {"unrecorded"}


def occurred_on(case: dict, air: Optional[dict], today: str) -> str:
    """The day the failing artifact was generated: the AIR's stamp, else the epoch-ms suffix of its id, else the
    day the case joined the frontier set (the set was seeded in one pass, so that date alone says nothing)."""
    if isinstance(air, dict) and str(air.get("createdAtIso") or "")[:4].isdigit():
        return str(air["createdAtIso"])[:10]
    ref = str((case.get("origin") or {}).get("ref") or case.get("id") or "")
    m = re.search(r"(\d{13})$", ref)
    if m:
        from datetime import datetime, timezone
        return datetime.fromtimestamp(int(m.group(1)) / 1000.0, tz=timezone.utc).strftime("%Y-%m-%d")
    return str((case.get("origin") or {}).get("added") or today)[:10]


def _family_of_token(tok: str) -> Optional[str]:
    t = str(tok or "").strip()
    if not t or t == "unchecked":
        return None
    m = re.match(r"claim:([A-Z_]+)@", t)
    if m:
        return m.group(1)
    head = re.split(r"[:@\s]", t, 1)[0].strip().strip('"[]')
    if head.upper() in FAMILIES:
        return head.upper()
    if head.lower().startswith(("action_title", "title")):
        return "action-titles"
    if head.lower().startswith("evidence_anchoring"):
        return "evidence-anchoring"
    if _DENSITY_RE.search(t):
        return "evidence-density"
    return None


# The chains' own stage ids, read from postChain.chainTrace (slides) when a stage did not succeed.
STAGE_FAMILY = {
    "chain:titles": "action-titles",
    "chain:claims": "claim-ledger",
    "chain:provenance": "provenance",
    "chain:bindPointers": "pointer-binding",
    "chain:evidenceSlots": "evidence-anchoring",
    "chain:exhibits": "exhibits",
    "chain:prose": "prose",
    "chain:grade": "grade",
    "chain:lexical": "lexical",
    "chain:deckQuality": "deck-quality",
    "chain:renderPlan": "render-plan",
}


def air_attribution(air: Optional[dict]) -> dict:
    """What a failed record says about WHY it failed, from where the chains write it: the slide chain's
    `postChain.chainTrace` (stages that did not succeed), the HTML chain's `postChain.htmlChain` (ledger codes
    still blocking), and `qualityReport.deterministicFailures` (codes with counts). Empty when nothing is recorded."""
    if not isinstance(air, dict):
        return {"stages": [], "codes": {}}
    pc = air.get("postChain") if isinstance(air.get("postChain"), dict) else {}
    qr = air.get("qualityReport") if isinstance(air.get("qualityReport"), dict) else {}
    stages = []
    for st in (pc.get("chainTrace") or qr.get("chainTrace") or []):
        if isinstance(st, dict) and str(st.get("status") or "success") != "success":
            stages.append({"stage": str(st.get("stepId") or "?"), "status": str(st.get("status")),
                           "error": st.get("errorType"), "next": st.get("nextAction")})
    codes: dict = {}
    for tok in qr.get("deterministicFailures") or []:
        t = str(tok)
        if t == "unchecked":
            continue
        m = re.match(r"claim:([A-Z_]+)@", t)
        key = m.group(1) if m else re.split(r"@", t, 1)[0][:60]
        codes[key] = codes.get(key, 0) + 1
    hc = pc.get("htmlChain") if isinstance(pc.get("htmlChain"), dict) else {}
    after = (hc.get("ledgerAfter") or {}).get("summary") if isinstance(hc.get("ledgerAfter"), dict) else None
    for k, v in (after or {}).items():
        if isinstance(v, int) and v > 0 and k not in codes:
            codes[k] = v
    return {"stages": stages, "codes": codes}


def attribution_note(att: dict) -> str:
    """The frontier case's origin note: the failing stages and codes, never an empty trace when the record has one."""
    parts = [f"{s['stage']} {s['status']}" + (f" ({s['error']})" if s.get("error") else "") for s in att.get("stages") or []]
    parts += [f"{k} x{n}" for k, n in sorted((att.get("codes") or {}).items(), key=lambda kv: (-kv[1], kv[0]))]
    return "chainPass=false; " + ("failing: " + "; ".join(parts) if parts else "no failing stage or finding recorded")


def case_failures(case: dict, air: Optional[dict]) -> dict:
    """{family: detail} for one frontier case, from its origin note and the AIR it points at."""
    out: dict = {}
    note = str(((case.get("origin") or {}).get("note")) or "")
    if _DENSITY_RE.search(note):
        out["evidence-density"] = note[:120]
    elif note.startswith("["):
        try:
            for item in json.loads(note):
                fam = _family_of_token(str(item))
                if fam:
                    out.setdefault(fam, str(item)[:120])
        except Exception:
            pass
    if isinstance(air, dict):
        qr = air.get("qualityReport") if isinstance(air.get("qualityReport"), dict) else {}
        pc = air.get("postChain") if isinstance(air.get("postChain"), dict) else {}
        hc = pc.get("htmlChain") if isinstance(pc.get("htmlChain"), dict) else pc
        rep = hc.get("repair") if isinstance(hc.get("repair"), dict) else {}
        rounds = rep.get("rounds")
        counts: dict = {}
        for tok in qr.get("deterministicFailures") or []:
            fam = _family_of_token(str(tok))
            if fam:
                counts[fam] = counts.get(fam, 0) + 1
        for fam, n in counts.items():
            out.setdefault(fam, f"{n} blocking row(s)" + (f" after {rounds} repair round(s)" if rounds else ""))
        # the slide chain's stages that did not succeed (postChain.chainTrace)
        for st in air_attribution(air)["stages"]:
            fam = STAGE_FAMILY.get(st["stage"], st["stage"].replace("chain:", "chain-"))
            out.setdefault(fam, f"{st['stage']} {st['status']}" + (f" ({st['error']})" if st.get("error") else ""))
    if not out and "chainPass=false" in note:
        out["unrecorded"] = "chain refused; no stage or finding recorded"
    return out


def known_gap_pages(cases: list, air_for: Callable[[dict], Optional[dict]], today: str) -> dict:
    """{wiki path: markdown} for every family seen in MIN_CASES_FOR_GAP or more frontier cases."""
    by_family: dict = {}
    for case in sorted(cases, key=lambda c: str(c.get("id") or "")):
        air = air_for(case)
        fams = case_failures(case, air)
        inp = case.get("input") or {}
        for fam, detail in fams.items():
            by_family.setdefault(fam, []).append({
                "date": occurred_on(case, air, today),
                "engagement": str(inp.get("engagement") or "unknown")[:80],
                "kind": str(case.get("kind") or "artifact"),
                "ref": str((case.get("origin") or {}).get("ref") or case.get("id") or ""),
                "case": str(case.get("id") or ""),
                "detail": detail,
            })
    pages = {}
    for fam, rows in sorted(by_family.items()):
        if len(rows) < MIN_CASES_FOR_GAP:
            continue
        title, fails, helps = FAMILIES.get(fam, (fam.replace("_", " ").lower(), "A recurring chain failure.", ""))
        kinds: dict = {}
        for r in rows:
            kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
        engagements = sorted({r["engagement"] for r in rows})
        blocks: dict = {}
        for r in rows:
            blocks.setdefault((r["date"], r["engagement"]), []).append(r)
        body = [f"# Recurring failure: {title}", "",
                f"What fails: {fails}", "",
                f"Seen in {len(rows)} frontier eval case(s) across {len(engagements)} engagement(s); deliverable kinds: "
                + ", ".join(f"{k} ({n})" for k, n in sorted(kinds.items(), key=lambda kv: (-kv[1], kv[0]))) + ".", ""]
        if helps:
            body += [f"What the harness does about it: {helps}", ""]
        for (date, eng), rs in sorted(blocks.items()):
            body.append(f"## {date} | {eng}")
            body += [f"- {r['kind']} {r['ref']}: {r['detail']} (frontier case {r['case']})" for r in rs[:MAX_LINES_PER_BLOCK]]
            if len(rs) > MAX_LINES_PER_BLOCK:
                body.append(f"- and {len(rs) - MAX_LINES_PER_BLOCK} more case(s) of this family on this day")
            body.append("")
        text = "\n".join(body).rstrip() + "\n"
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
        slug = re.sub(r"[^a-z0-9]+", "-", fam.lower()).strip("-")
        path = f"known-gaps/failure-{slug}.md"
        fm = ["---", f"id: {path}", f'title: "Recurring failure: {title}"', "type: known-gap", "source: eval-frontier",
              f"family: {fam}", f"applies_to: {'harness' if fam in HARNESS_ONLY else 'generation'}",
              f"kinds: [{', '.join(sorted(kinds))}]", f"cases: {len(rows)}",
              f"updated: {today}", f"source_hash: {digest}", "---", ""]
        pages[path] = "\n".join(fm) + text
    return pages


def page_source_hash(text: str) -> str:
    m = re.search(r"^source_hash:\s*([0-9a-f]+)\s*$", text or "", re.M)
    return m.group(1) if m else ""


def _frontmatter(text: str) -> tuple:
    t = (text or "").replace("\r\n", "\n")
    m = re.match(r"^---\n([\s\S]*?)\n---\n", t)
    if not m:
        return {}, t, None
    fm = {}
    for line in m.group(1).split("\n"):
        mm = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if mm:
            fm[mm.group(1)] = mm.group(2).strip().strip('"')
    return fm, t, m


def primary_industry(goal: str, classify: Callable[..., list]) -> Optional[str]:
    hits = classify(title=goal) or []
    primary = [v for v in hits if v not in CROSS_CUTTING]
    return (primary or hits or [None])[0]


def backfill_engagement_frontmatter(text: str, classify: Callable[..., list]) -> Optional[str]:
    """The page with `engagement_type` and `industry` added when it is an engagement page missing them; else None."""
    fm, t, m = _frontmatter(text)
    if not m or fm.get("type") != "engagement":
        return None
    add = []
    if not fm.get("engagement_type"):
        add.append("engagement_type: research")
    if not fm.get("industry"):
        goal = fm.get("title") or ""
        gm = re.search(r"##\s+Research Goal\s*\n+([^\n]+)", t)
        ind = primary_industry(goal or (gm.group(1) if gm else ""), classify)
        if ind:
            add.append(f"industry: {ind}")
    if not add:
        return None
    head = m.group(0)
    return t.replace(head, head[:-4] + "\n".join(add) + "\n---\n", 1)


def _items(doc: Optional[dict], key: str) -> list:
    """The list inside a persisted deliverable ({schema_version, kind, slug, saved_at, data: {key: [...]}})."""
    if not isinstance(doc, dict):
        return []
    data = doc.get("data", doc)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get(key), list):
        return data[key]
    return []


def _one_line(s, limit: int) -> str:
    return re.sub(r"\s+", " ", str(s or "")).replace("\u2014", ",").strip()[:limit]


def engagement_page_from_folder(manifest: dict, themes: Optional[dict], personas: Optional[dict], recs: Optional[dict],
                                classify: Callable[..., list]) -> Optional[str]:
    """The engagement memory page for one engagement folder (wiki/engagements/<slug>/), in the exact format
    `saveEngagementMemory` writes, built only from what the engagement persisted: its research goal, theme names and
    descriptions, personas and recommendations. None when the folder has no goal or no themes (nothing real to say).

    2026-10-31 (WS-C C3, live check): 50 engagement folders carried real deliverables, but only 4 had the markdown
    page the pattern step reads, so the cross-engagement compiler saw 4 engagements instead of the portfolio."""
    goal = _one_line((manifest or {}).get("research_goal") or (manifest or {}).get("goal"), 1200)
    theme_rows = _items(themes, "themes")
    if not goal or not theme_rows:
        return None
    industry = primary_industry(goal, classify)
    created = str((manifest or {}).get("created_at") or "")[:10]
    updated = str((manifest or {}).get("updated_at") or created)[:10]
    def _theme(t: dict) -> str:
        # synthesized themes carry `description`; topic-model themes carry `summary`
        text = _one_line(t.get("description") or t.get("summary"), 260)
        name = _one_line(t.get("name"), 120) or "Unnamed"
        return f"- **{name}**: {text}" if text else f"- **{name}**"
    th = [_theme(t) for t in theme_rows[:20] if isinstance(t, dict)]
    pe = [f"- **{_one_line(p.get('name'), 100) or 'Unnamed'}** ({_one_line(p.get('role'), 140) or 'Unknown role'}): \"{_one_line(p.get('quote'), 220)}\""
          for p in _items(personas, "personas")[:12] if isinstance(p, dict)]
    rc = [f"- **[{_one_line(r.get('impactLevel'), 12) or 'Unknown'}] {_one_line(r.get('title'), 160) or 'Untitled'}**: {_one_line(r.get('description'), 260)}"
          for r in _items(recs, "recommendations")[:15] if isinstance(r, dict)]
    fm = ["---", f'title: "{goal.replace(chr(34), chr(92) + chr(34))}"', "type: engagement", "engagement_type: research"]
    if industry:
        fm.append(f"industry: {industry}")
    fm += [f'created: "{created}"', f'updated: "{updated}"', "source: engagement-folder", "---", ""]
    body = ["## Research Goal", "", goal, "", "## Themes Found", "", *th, "",
            "## Personas Identified", "", *(pe or ["- None generated"]), "",
            "## Recommendations Made", "", *(rc or ["- None generated"]), ""]
    return "\n".join(fm + body)


def pattern_groups(pages: dict, pattern_mtime: Callable[[str], Optional[float]], page_mtime: Callable[[str], float]) -> list:
    """[{type, industry, engagements, due, pattern_path}] from engagement pages {path: text}."""
    groups: dict = {}
    for path, text in pages.items():
        fm, _t, _m = _frontmatter(text)
        typ = fm.get("engagement_type") or fm.get("type")
        ind = fm.get("industry")
        if not typ or not ind or ind == "unknown" or typ == "unknown":
            continue
        groups.setdefault((typ, ind), []).append(path)
    out = []
    for (typ, ind), paths in sorted(groups.items()):
        safe = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower())
        ppath = f"synthesis/patterns/{safe(typ)}-{safe(ind)}.md"
        newest = max(page_mtime(p) for p in paths)
        pm = pattern_mtime(ppath)
        due = len(paths) >= MIN_ENGAGEMENTS_FOR_PATTERN and (pm is None or pm < newest)
        out.append({"type": typ, "industry": ind, "engagements": len(paths), "due": due, "pattern_path": ppath,
                    "pattern_exists": pm is not None})
    return out
