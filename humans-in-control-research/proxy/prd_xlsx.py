"""PRD requirements workbook (.xlsx) built from a compiled PrdAir record.

Owner directive (2026-10-02): "the #PRD needs to produce a structured set of requirements as an XLS
(spreadsheet), not an HTML document!" The engineering team receives a filterable workbook: one row per
requirement, each traced to evidence, with acceptance tests, success signals, NFRs, risks, open questions
and sources on their own sheets.

Contract: `build_prd_workbook(air: dict, brand: str) -> bytes`. `air` is the PrdAir record from
services/prdAir.ts (graph + sections). Pure function: no model call, no network. Every string is written
as the record carries it; inline pointer brackets are stripped from display cells and every pointer lives
in its own column. Colors and fonts resolve from hic-workspace/design-system/figma-tokens.json (the
same file the proxy's `_load_figma_tokens` reads); nothing is hardcoded here.
"""
from __future__ import annotations

import io
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

from openpyxl import Workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

LEDGER_SHEET = "Coverage Ledger"
THEMES_SHEET = "Themes"
CHECKS_SHEET = "Checks"

SHEET_ORDER = [
    "Summary", "Requirements", LEDGER_SHEET, THEMES_SHEET, "Acceptance Tests", "Traceability", "Success Signals",
    "Personas & Jobs", "Pains & Evidence", "Gaps", "Assumptions", "NFRs", "Open Questions",
    "Risks", "Alternatives", "Sources", "Delivery", CHECKS_SHEET,
]

REQUIREMENT_HEADERS = [
    "Req ID", "Requirement", "Type", "Priority", "Priority rationale", "Primary persona",
    "Job / user story", "Acceptance criteria", "Acceptance test IDs", "Target", "Traced pains",
    "Traced competitive gaps", "Root type", "Ledger IDs", "Evidence quote", "Evidence source", "Evidence pointer",
    "Independent origins", "Success signal IDs", "Dependencies", "Risks", "Owner", "Status",
    "Release", "Notes",
]

LEDGER_HEADERS = [
    "ID", "Type", "Feature area", "Item", "Verbatim quote", "Source document", "Speaker / owner", "Date",
    "Pointer", "Source label", "Disposition", "Group", "Covering requirement IDs", "Coverage status",
]
THEME_HEADERS = ["Theme ID", "Theme", "Theme group", "Group size", "Sentiment", "Category", "Feature area",
                 "Covering requirement IDs", "Coverage status"]
TYPE_LABEL = {"stated": "Stated", "feedback": "Feedback", "theme": "Theme"}
ROOT_LABEL = {"stated": "Stated", "feedback": "Feedback", "pain": "Pain", "competitive-gap": "Competitive gap", "theme": "Theme", "bet": "Bet"}

PRIORITY_VALUES = ["Must", "Should", "Could", "Won't"]
STATUS_VALUES = ["Proposed", "Accepted", "In progress", "Done", "Deferred", "Rejected"]
TIER_TO_PRIORITY = {"must": "Must", "should": "Should", "could": "Could", "wont": "Won't"}
TIER_TO_RELEASE = {"must": "MVP", "should": "Next", "could": "Later", "wont": "Not planned"}

_POINTER_BRACKET_RE = re.compile(r"\s*\[[^\[\]]*?(?:#c\d+|CHUNK_\w+)[^\[\]]*?\]")
_EM_DASH_RE = re.compile(r"\s*—\s*")
_MAX_CELL = 32000

# ---- tokens -------------------------------------------------------------------------------------

_TOKEN_PATHS = [
    "/hic-workspace/design-system/figma-tokens.json",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "hic-workspace", "design-system", "figma-tokens.json"),
]


def _load_tokens() -> dict:
    for p in _TOKEN_PATHS:
        try:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            continue
    return {}


def _brand_block(brand: str, tokens: Optional[dict] = None) -> dict:
    tokens = tokens if tokens is not None else _load_tokens()
    key = str(brand or "NXT").strip().upper()
    blk = tokens.get(key)
    if not isinstance(blk, dict):
        blk = tokens.get("NXT") or {}
    return blk


def _hex(v: Any) -> Optional[str]:
    s = str(v or "").strip().lstrip("#")
    return s.upper() if re.fullmatch(r"[0-9A-Fa-f]{6}", s) else None


class _Theme:
    """Brand styling resolved from the token block. A missing token leaves Excel's default (no fill)."""

    def __init__(self, brand: str, tokens: Optional[dict] = None):
        blk = _brand_block(brand, tokens)
        c = blk.get("color", {}) or {}
        f = blk.get("font", {}) or {}
        self.rail = _hex(c.get("rail") or c.get("ink"))
        self.paper = _hex(c.get("paper"))
        self.accent = _hex(c.get("accent"))
        self.on_accent = _hex(c.get("on-accent"))
        self.accent_pale = _hex(c.get("accent-pale"))
        self.wash_cool = _hex(c.get("wash-cool"))
        self.pale = _hex(c.get("pale"))
        self.panel = _hex(c.get("panel"))
        self.muted = _hex(c.get("muted"))
        self.body_color = _hex(c.get("body"))
        self.hairline = _hex(c.get("hairline"))
        self.source = _hex(c.get("source") or c.get("cyan"))
        self.title_font = str(f.get("title") or f.get("body") or "")
        self.body_font = str(f.get("table") or f.get("body") or "")

    def fill(self, hex6: Optional[str]) -> PatternFill:
        return PatternFill(fill_type="solid", start_color=hex6, end_color=hex6) if hex6 else PatternFill()

    def font(self, *, title: bool = False, bold: bool = False, color: Optional[str] = None, size: Optional[float] = None) -> Font:
        name = (self.title_font if title else self.body_font) or None
        return Font(name=name, bold=bold, color=color or self.body_color, size=size)


# ---- text helpers -------------------------------------------------------------------------------

def clean(v: Any) -> str:
    """Display text: pointer brackets removed (pointers live in their own columns), no em dash, Excel-safe."""
    if v is None:
        return ""
    if isinstance(v, (list, tuple)):
        v = "\n".join(clean(x) for x in v if clean(x))
    s = str(v)
    s = _POINTER_BRACKET_RE.sub("", s)
    s = _EM_DASH_RE.sub(", ", s)
    s = ILLEGAL_CHARACTERS_RE.sub("", s)
    s = re.sub(r"[ \t]+\n", "\n", s).strip()
    return s[:_MAX_CELL]


def _ids(xs: Iterable[Any]) -> str:
    return ", ".join(str(x) for x in (xs or []) if x)


def _by_id(arr: Any) -> Dict[str, dict]:
    out: Dict[str, dict] = {}
    for x in arr or []:
        if isinstance(x, dict) and x.get("id"):
            out[str(x["id"])] = x
    return out


def target_text(t: Any) -> str:
    """The typed requirement target as one readable line: metric, value and unit, then baseline."""
    if not isinstance(t, dict) or t.get("kind") != "requirement_target":
        return ""
    metric = clean(t.get("metric"))
    value = t.get("value")
    unit = clean(t.get("unit"))
    if metric.strip().lower() == "appetite":
        metric = ""
    if value in (None, ""):
        head = metric
    else:
        amount = f"{value}%" if unit == "%" else f"{value} {unit}".rstrip()
        head = f"{metric}: {amount}" if metric else amount
    parts = [head.strip()]
    if t.get("baseline"):
        parts.append(f"Baseline: {clean(t.get('baseline'))}")
    return "\n".join(p for p in parts if p)


_STOP = set("""the a an and or of to in on for with from by at as is are be been this that these those it its
into over under than then when which who whom whose what where while their there they them his her our your
user users system systems every each must should could will would can may not no""".split())


def _tokens(s: str) -> set:
    return {w for w in re.findall(r"[a-z][a-z\-]{4,}", (s or "").lower()) if w not in _STOP}


# ---- derived fields -----------------------------------------------------------------------------

_INTEGRATION_RE = re.compile(r"\b(integrat\w*|sync\w*|APIs?|feeds?|webhooks?|single sign-on|SSO|system of record|source of truth|imports?|exports?)\b", re.I)
_DATA_RE = re.compile(r"\b(data|attributes?|records?|retention|retains?|audit logs?|consent)\b", re.I)
_UX_RE = re.compile(r"\b(screens?|pages?|layouts?|interface|navigation|empty state|loading state|design system components?)\b", re.I)


_SUBJECT_RE = re.compile(r"^((?:[A-Z][\w&.-]*\s+){0,3}[A-Z][\w&.-]*)\s+[a-z]")


def is_engagement_requirement(req: dict, ledger: Dict[str, dict]) -> bool:
    """A requirement on the ENGAGEMENT, not the product (2026-10-02 live read-through: 407 of 2657 rows were the
    delivery party's own obligations, "<Vendor> staffs the engagement with ...", typed as product requirements).
    Generic test: every ledger root is a contract item, and the sentence's subject is a capitalized party name that
    the source document's own title carries (contracts are titled with the parties). The row stays covered and
    traced; only its type changes, so engineering can filter it."""
    items = [ledger.get(i) for i in req.get("ledgerIds") or []]
    items = [i for i in items if isinstance(i, dict)]
    if not items or any(str(i.get("documentKind") or "") != "contract" for i in items):
        return False
    m = _SUBJECT_RE.match(str(req.get("text") or "").strip())
    if not m or m.group(1).split()[0] in ("The", "A", "An", "Each", "Every", "All", "Given", "When"):
        return False
    subj = re.sub(r"[^a-z0-9]+", " ", m.group(1).lower()).strip()
    titles = " ".join(re.sub(r"[^a-z0-9]+", " ", str(i.get("documentTitle") or "").lower()) for i in items)
    return bool(subj) and f" {subj} " in f" {titles} "


def requirement_type(req: dict, ledger: Optional[Dict[str, dict]] = None) -> str:
    if ledger is not None and is_engagement_requirement(req, ledger):
        return "Engagement"
    if str(req.get("kind") or "").lower() == "non-functional":
        return "Non-functional"
    text = str(req.get("text") or "")
    if _INTEGRATION_RE.search(text):
        return "Integration"
    if _DATA_RE.search(text):
        return "Data"
    if _UX_RE.search(text):
        return "UX"
    return "Functional"


_ERROR_RE = re.compile(r"\b(error|errors|fails?|failed|failure|unavailable|outage|denied|invalid|times? out|timeout|degraded|down)\b", re.I)
_EDGE_RE = re.compile(r"\b(no|none|empty|without|missing|conflict\w*|duplicate\w*|exceeds?|stale|late|expired|unassigned|first time|only one)\b", re.I)


def acceptance_test_type(at: dict) -> str:
    text = " ".join(str(at.get(k) or "") for k in ("given", "when", "then"))
    if _ERROR_RE.search(text):
        return "Error"
    if _EDGE_RE.search(str(at.get("given") or "") + " " + str(at.get("when") or "")):
        return "Edge"
    return "Happy"


class _Graph:
    def __init__(self, air: dict):
        g = air.get("graph") or {}
        self.air = air
        self.sections = air.get("sections") or {}
        self.sources = _by_id(g.get("sources"))
        self.quotes = _by_id(g.get("quotes"))
        self.pains = _by_id(g.get("pains"))
        self.themes = _by_id(g.get("themes"))
        self.personas = _by_id(g.get("personas"))
        self.gaps = _by_id(g.get("competitiveGaps"))
        self.reqs: List[dict] = [r for r in (g.get("requirements") or []) if isinstance(r, dict)]
        self.ats = _by_id(g.get("acceptanceTests"))
        self.at_list: List[dict] = [a for a in (g.get("acceptanceTests") or []) if isinstance(a, dict)]
        _at_ids = [str(a.get("id") or "") for a in self.at_list]
        self.at_ids_unique = len(set(_at_ids)) == len(_at_ids)
        self.signals = _by_id(g.get("signals"))
        self.signal_list: List[dict] = [s for s in (g.get("signals") or []) if isinstance(s, dict)]
        self.ledger_list: List[dict] = [x for x in (g.get("ledger") or []) if isinstance(x, dict)]
        self.ledger = _by_id(self.ledger_list)
        self.areas = {str(a.get("id")): clean(a.get("label")) for a in (g.get("areas") or []) if isinstance(a, dict) and a.get("id")}

    def area_label(self, area_id: Any) -> str:
        return self.areas.get(str(area_id or ""), "Cross-cutting")

    def theme_rows(self) -> List[dict]:
        """Every board theme id (from THEME ledger groups) with its group and the requirements that cover it."""
        out = []
        for li in self.ledger_list:
            if li.get("type") != "theme":
                continue
            members = li.get("themeMembers") or [{"id": t, "name": li.get("item")} for t in li.get("themeIds") or []]
            for m in members:
                if not isinstance(m, dict):
                    continue
                tid = str(m.get("id") or "")
                cov = [r for r in self.ordered_requirements()
                       if li.get("id") in (r.get("ledgerIds") or []) or tid in (r.get("themeIds") or [])]
                out.append({"id": tid, "name": m.get("name") or li.get("item"), "group": li.get("id"),
                            "size": len(members), "sentiment": m.get("sentiment") or "", "category": m.get("category") or "",
                            "area": self.area_label(li.get("featureArea")), "cover": cov})
        return out

    def root_types(self, req: dict) -> List[str]:
        """Same derivation as prdAir.requirementRootTypes."""
        out: List[str] = []
        lt = {str((self.ledger.get(i) or {}).get("type") or "") for i in req.get("ledgerIds") or []}
        if "stated" in lt:
            out.append("stated")
        if "feedback" in lt:
            out.append("feedback")
        if any(p in self.pains for p in req.get("painIds") or []):
            out.append("pain")
        if any(c in self.gaps for c in req.get("competitiveGapIds") or []):
            out.append("competitive-gap")
        if any(t in self.themes for t in req.get("themeIds") or []):
            out.append("theme")
        return out or ["bet"]

    def covering(self, ledger_id: str) -> List[dict]:
        return [r for r in self.ordered_requirements() if ledger_id in (r.get("ledgerIds") or [])]

    def coverage(self) -> Dict[str, Any]:
        """Coverage over the workbook's own data: every ledger item x the requirements that list it, with the
        client-document scope (stated + feedback) and the board themes counted separately."""
        scope = [li for li in self.ledger_list if li.get("type") != "theme"]
        covered = sum(1 for li in scope if self.covering(str(li.get("id"))))
        fallback_only = sum(1 for li in scope
                            if (cv := self.covering(str(li.get("id")))) and all(r.get("origin") == "fallback" for r in cv))
        themes = self.theme_rows()
        tcov = sum(1 for t in themes if t["cover"])
        return {
            "items": len(scope),
            "stated": sum(1 for li in scope if li.get("type") == "stated"),
            "feedback": sum(1 for li in scope if li.get("type") == "feedback"),
            "covered": covered,
            "fallback_only": fallback_only,
            "pct": round(100.0 * covered / len(scope), 1) if scope else 100.0,
            "themes": len(themes),
            "theme_groups": sum(1 for li in self.ledger_list if li.get("type") == "theme"),
            "themes_covered": tcov,
            "theme_pct": round(100.0 * tcov / len(themes), 1) if themes else 100.0,
        }

    def ordered_requirements(self) -> List[dict]:
        order = ((self.sections.get("requirements") or {}).get("requirementIds")) or []
        by = {str(r.get("id")): r for r in self.reqs}
        out = [by[i] for i in order if i in by]
        seen = {str(r.get("id")) for r in out}
        out += [r for r in self.reqs if str(r.get("id")) not in seen]
        return out

    def quotes_for(self, req: dict) -> List[dict]:
        ids: List[str] = []
        # The client's own words first: the ledger roots' quotes.
        for lid in req.get("ledgerIds") or []:
            q = (self.ledger.get(lid) or {}).get("quoteId")
            if q:
                ids.append(q)
        for pid in req.get("painIds") or []:
            ids += list((self.pains.get(pid) or {}).get("quoteIds") or [])
        for gid in req.get("competitiveGapIds") or []:
            ids += list((self.gaps.get(gid) or {}).get("quoteIds") or [])
        seen, out = set(), []
        for q in ids:
            if q in seen or q not in self.quotes:
                continue
            seen.add(q)
            out.append(self.quotes[q])
        return out

    def independent_origins(self, req: dict) -> int:
        """Same collapse as prdAir.independentOriginsForRequirement: by pointer page, else by source name."""
        keys = set()
        for q in self.quotes_for(req):
            s = self.sources.get(str(q.get("sourceId") or ""))
            if not s:
                continue
            ptr = re.sub(r"#c\d+$", "", str(s.get("pointer") or ""), flags=re.I)
            keys.add(ptr or str(s.get("name") or "").strip().lower())
        return len(keys)

    def source_of(self, q: dict) -> dict:
        return self.sources.get(str(q.get("sourceId") or "")) or {}

    def persona_name(self, pid: str) -> str:
        p = self.personas.get(pid)
        return clean(p.get("name")) if p else pid

    def primary_persona(self, req: dict) -> str:
        ids = list(req.get("personaIds") or [])
        for pid in ids:
            if (self.personas.get(pid) or {}).get("primary"):
                return self.persona_name(pid)
        return self.persona_name(ids[0]) if ids else ""

    def job_story_for(self, req: dict) -> str:
        jobs = ((self.sections.get("usersAndJobs") or {}).get("jobStories")) or []
        pids = set(req.get("personaIds") or [])
        qids = {str(q.get("id")) for q in self.quotes_for(req)}
        cand = [j for j in jobs if isinstance(j, dict) and j.get("personaId") in pids]
        best = next((j for j in cand if qids & set(j.get("quoteIds") or [])), None) or (cand[0] if cand else None)
        return job_story_text(best) if best else ""

    def ats_for(self, req: dict) -> List[dict]:
        """A requirement's acceptance tests. Tests are matched by their requirementId first: a live record
        numbered tests per requirement (every requirement has an AT-1), so a bare id lookup would hand R-1
        the last AT-1 in the list."""
        rid = req.get("id")
        mine = [a for a in self.at_list if a.get("requirementId") == rid]
        order = [str(x) for x in req.get("acceptanceTestIds") or []]
        mine.sort(key=lambda a: order.index(str(a.get("id"))) if str(a.get("id")) in order else len(order))
        if self.at_ids_unique:
            seen = {str(a.get("id")) for a in mine}
            mine += [self.ats[i] for i in order if i in self.ats and i not in seen and not self.ats[i].get("requirementId")]
        return mine

    def at_label(self, at: dict) -> str:
        """Workbook-unique test id: the record's id when ids are unique, else qualified by the requirement."""
        aid = str(at.get("id") or "")
        if self.at_ids_unique or not at.get("requirementId"):
            return aid
        return f"{at.get('requirementId')}.{aid}"

    def signals_for(self, req: dict) -> List[str]:
        ids = list(req.get("signalIds") or [])
        for s in self.signal_list:
            if req.get("id") in (s.get("requirementIds") or []) and s.get("id") not in ids:
                ids.append(s.get("id"))
        return [str(i) for i in ids if i]

    def dependencies_for(self, req: dict) -> str:
        deps = ((self.sections.get("delivery") or {}).get("dependencies")) or []
        hay = " ".join([str(req.get("text") or "")] + [" ".join(str(a.get(k) or "") for k in ("given", "when", "then")) for a in self.ats_for(req)]).lower()
        hits = []
        for d in deps:
            if not isinstance(d, dict) or not d.get("name"):
                continue
            name = str(d["name"]).lower()
            name_tokens = _tokens(name)
            if name in hay or (name_tokens and len(name_tokens & _tokens(hay)) >= max(1, (len(name_tokens) + 1) // 2)):
                hits.append(clean(d["name"]))
        return "\n".join(hits)

    def risks_for(self, req: dict) -> str:
        reg = ((self.sections.get("risks") or {}).get("register")) or []
        rid = str(req.get("id") or "")
        rt = _tokens(str(req.get("text") or ""))
        hits = []
        for r in reg:
            if not isinstance(r, dict):
                continue
            blob = " ".join(str(r.get(k) or "") for k in ("failureMode", "mitigation", "earlySignal"))
            if (rid and re.search(rf"\b{re.escape(rid)}\b", blob)) or len(rt & _tokens(blob)) >= 3:
                hits.append(str(r.get("id") or clean(r.get("failureMode"))))
        return ", ".join(hits)

    def release_for(self, req: dict) -> str:
        return TIER_TO_RELEASE.get(str(req.get("tier") or ""), "")

    def owner_for(self, req: dict) -> str:
        return clean(((self.sections.get("delivery") or {}).get("accountableApprover")) or "")


def job_story_text(j: dict) -> str:
    if not j:
        return ""
    return clean(f"When {j.get('when', '')}, I want to {j.get('iWantTo', '')}, so I can {j.get('soICan', '')}.").replace("..", ".")


def given_when_then(at: dict) -> str:
    return clean(f"Given {at.get('given', '')}, when {at.get('when', '')}, then {at.get('then', '')}.").replace("..", ".")


def requirement_notes(req: dict) -> str:
    notes = []
    if req.get("notes"):
        notes.append(clean(req.get("notes")))
    ct = str(req.get("claimType") or "")
    if ct:
        notes.append(f"Claim type: {ct.replace('_', ' ').lower()}")
    if req.get("kano"):
        notes.append(f"Kano: {req.get('kano')}")
    prop, tier = req.get("proposedTier"), req.get("tier")
    if prop and tier and prop != tier:
        notes.append(f"Proposed as {TIER_TO_PRIORITY.get(prop, prop)}, derived {TIER_TO_PRIORITY.get(tier, tier)} from the evidence")
    bet = req.get("bet")
    if isinstance(bet, dict) and bet.get("statement"):
        notes.append(f"Bet: {clean(bet.get('statement'))}")
        if bet.get("test"):
            notes.append(f"Test before build: {clean(bet.get('test'))}")
        if bet.get("conditionWhereAlternativeWins"):
            notes.append(f"Alternative wins if: {clean(bet.get('conditionWhereAlternativeWins'))}")
    return "\n".join(notes)


# ---- sheet writers ------------------------------------------------------------------------------

def _set(ws, row: int, col: int, value: Any):
    cell = ws.cell(row=row, column=col)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        cell.value = value
    else:
        cell.value = clean(value)
        # A string that starts with "=" is text, never a formula (no formula injection from the record).
        if isinstance(cell.value, str) and cell.value.startswith("="):
            cell.data_type = "s"
    return cell


def _table(ws, theme: _Theme, headers: List[str], rows: List[List[Any]], widths: Optional[Dict[str, float]] = None,
           start_row: int = 1, freeze: Optional[str] = "A2", autofilter: bool = True) -> int:
    """Write a header row + data rows. Returns the last row written."""
    thin = Side(style="thin", color=theme.hairline) if theme.hairline else Side(style="thin")
    border = Border(bottom=thin)
    for ci, h in enumerate(headers, start=1):
        c = ws.cell(row=start_row, column=ci, value=h)
        c.fill = theme.fill(theme.rail)
        c.font = theme.font(title=True, bold=True, color=theme.paper)
        c.alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[start_row].height = 30
    r = start_row
    for row in rows:
        r += 1
        for ci, v in enumerate(row, start=1):
            c = _set(ws, r, ci, v)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.font = theme.font()
            c.border = border
    for ci, h in enumerate(headers, start=1):
        letter = get_column_letter(ci)
        w = (widths or {}).get(h)
        if w is None:
            longest = max([len(h)] + [min(len(str(clean(row[ci - 1]) if ci - 1 < len(row) else "")), 60) for row in rows] or [len(h)])
            w = max(10, min(60, longest + 2))
        ws.column_dimensions[letter].width = w
    if freeze and start_row == 1:
        ws.freeze_panes = freeze
    if autofilter and rows:
        ws.auto_filter.ref = f"A{start_row}:{get_column_letter(len(headers))}{r}"
    return r


def coverage_line(g: _Graph) -> str:
    c = g.coverage()
    if not c["items"]:
        return "No scope and feedback ledger items (no client documents were analyzed)."
    tail = f"; {c['fallback_only']} written directly from the item and flagged for refinement" if c["fallback_only"] else ""
    return (f"{c['items']} ledger items ({c['stated']} stated features, {c['feedback']} feedback items); "
            f"{c['covered']} covered by requirements ({c['pct']}%){tail}.")


def theme_coverage_line(g: _Graph) -> str:
    c = g.coverage()
    if not c["themes"]:
        return "No board themes in the record."
    return f"{c['themes']} board themes in {c['theme_groups']} groups; {c['themes_covered']} covered by requirements ({c['theme_pct']}%)."


def receipt_lines(air: dict) -> List[str]:
    """The rule registry receipt, one plain line per rule (same wording as deliverableRules.formatReceiptLines)."""
    rec = air.get("receipt") or {}
    out = []
    for r in rec.get("rules") or []:
        if not isinstance(r, dict):
            continue
        fixes = ", ".join(x for x in [f"{r.get('repaired')} repaired" if r.get("repaired") else "", f"{r.get('filled')} filled" if r.get("filled") else ""] if x)
        state = "pass" if r.get("pass") else f"{len(r.get('violations') or [])} open"
        found = f", {r.get('found')} found" if r.get("found") else ""
        out.append(f"{clean(r.get('title'))}: {state} ({r.get('checked', 0)} checked{found}{', ' + fixes if fixes else ''}).")
    return out


def _summary(wb: Workbook, g: _Graph, theme: _Theme, generated: str):
    ws = wb.create_sheet("Summary")
    s = g.sections
    th = s.get("thesis") or {}
    prob = s.get("problem") or {}
    story = prob.get("story") or {}
    why = s.get("whyNow") or {}
    gna = s.get("goalsNonGoalsAppetite") or {}
    qual = s.get("quality") or {}
    priv = qual.get("privacy") or {}
    dl = s.get("delivery") or {}
    primary = [g.persona_name(p) for p in ((s.get("usersAndJobs") or {}).get("primaryPersonaIds") or [])] or [th.get("user", "")]
    goals = [f"{x.get('text', '')}{'' if x.get('measurable', True) else ' (not directly measurable)'}" for x in gna.get("goals") or [] if isinstance(x, dict)]
    non_goals = [f"{str(x.get('text', '')).rstrip('.;: ')}: {x.get('reason', '')}" if x.get("reason") else str(x.get("text", "")) for x in gna.get("nonGoals") or [] if isinstance(x, dict)]
    problem = " ".join(x for x in [story.get("user"), story.get("need"), story.get("insight")] if x) or th.get("pain", "")
    why_now = " ".join(x for x in [why.get("statement"), f"Change: {why.get('change')}" if why.get("change") else ""] if x)
    pairs = [
        ("Product", g.air.get("title")),
        ("Objective", g.air.get("objective")),
        ("Decision requested", th.get("decisionRequested")),
        ("Thesis", th.get("statement")),
        ("What it does", th.get("whatItDoes")),
        ("Primary user", "\n".join(clean(p) for p in primary if p)),
        ("Problem statement", problem),
        ("Why now", why_now),
        ("Goals", "\n".join(goals)),
        ("Non-goals (with reason)", "\n".join(non_goals)),
        ("Appetite", target_text(gna.get("appetite"))),
        ("Privacy regime", priv.get("regime") or ""),
        ("Scope and feedback coverage", coverage_line(g)),
        ("Theme coverage", theme_coverage_line(g)),
        ("Rule receipt", "\n".join(receipt_lines(g.air)) or "No rule receipt on the record."),
        ("Accountable approver", dl.get("accountableApprover")),
        ("Generated", generated),
    ]
    title = ws.cell(row=1, column=1, value=clean(g.air.get("title") or "Product requirements"))
    title.font = theme.font(title=True, bold=True, size=16)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=2)
    ws.row_dimensions[1].height = 28
    # Short rows 2-7 hold the counts table (columns D onward); the key-value summary starts at row 9 so its
    # tall wrapped rows never stretch the table.
    r = 8
    for k, v in pairs:
        r += 1
        kc = ws.cell(row=r, column=1, value=k)
        kc.font = theme.font(title=True, bold=True)
        kc.alignment = Alignment(vertical="top", wrap_text=True)
        vc = _set(ws, r, 2, v)
        vc.font = theme.font()
        vc.alignment = Alignment(vertical="top", wrap_text=True)
    # Unmerged, wrapped value column: Excel auto-fits row heights only on unmerged cells.
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 90
    ws.column_dimensions["C"].width = 3

    # Counts per tier x kind (a small cross-tab the reader can check against the Requirements filter),
    # placed to the right of the summary so the wide value column does not stretch it.
    r = 2
    c0 = 4
    types = ["Functional", "Non-functional", "Data", "Integration", "UX", "Engagement"]
    headers = ["Priority"] + types + ["Total"]
    rows = []
    reqs = g.ordered_requirements()
    for p_tier, label in TIER_TO_PRIORITY.items():
        mine = [q for q in reqs if q.get("tier") == p_tier]
        rows.append([label] + [sum(1 for q in mine if requirement_type(q, g.ledger) == t) for t in types] + [len(mine)])
    rows.append(["Total"] + [sum(1 for q in reqs if requirement_type(q, g.ledger) == t) for t in types] + [len(reqs)])
    for ci, h in enumerate(headers):
        c = ws.cell(row=r, column=c0 + ci, value=h)
        c.fill = theme.fill(theme.rail)
        c.font = theme.font(title=True, bold=True, color=theme.paper)
    for row in rows:
        r += 1
        for ci, v in enumerate(row):
            c = ws.cell(row=r, column=c0 + ci, value=v)
            c.font = theme.font(bold=(row[0] == "Total" or ci == 0))
    for ci in range(len(headers)):
        ws.column_dimensions[get_column_letter(c0 + ci)].width = 15
    ws.sheet_view.showGridLines = False


ENGAGEMENT_SHEET = "Engagement Obligations"


def _requirements(wb: Workbook, g: _Graph, theme: _Theme, engagement: bool = False):
    """The product requirements, or (engagement=True) the delivery party's own obligations on their own sheet:
    2026-10-02 QA of the live workbook, 330+ SOW obligations sat among the product requirements an engineering
    team starts from. Same columns, same ids, same coverage; only the sheet differs."""
    picked = [r for r in g.ordered_requirements() if (requirement_type(r, g.ledger) == "Engagement") == engagement]
    if engagement and not picked:
        return
    ws = wb.create_sheet(ENGAGEMENT_SHEET if engagement else "Requirements")
    rows = []
    for req in picked:
        quotes = g.quotes_for(req)
        q0 = quotes[0] if quotes else {}
        src = g.source_of(q0) if q0 else {}
        ats = g.ats_for(req)
        tgt = target_text(req.get("target"))
        if not tgt:
            tgt = "\n".join(t for t in (target_text(a.get("target")) for a in ats) if t)
        rows.append([
            req.get("id"), req.get("text"), requirement_type(req, g.ledger), TIER_TO_PRIORITY.get(str(req.get("tier")), ""),
            req.get("tierRationale"), g.primary_persona(req), g.job_story_for(req),
            "\n".join(given_when_then(a) for a in ats), _ids(g.at_label(a) for a in ats), tgt,
            "\n".join(f"{pid}: {clean((g.pains.get(pid) or {}).get('text'))}" for pid in req.get("painIds") or [] if pid in g.pains),
            "\n".join(f"{gid}: {clean((g.gaps.get(gid) or {}).get('text'))}" for gid in req.get("competitiveGapIds") or [] if gid in g.gaps),
            ", ".join(ROOT_LABEL.get(t, t) for t in g.root_types(req)), _ids(req.get("ledgerIds")),
            q0.get("text", ""), src.get("name", ""), q0.get("pointer") or src.get("pointer") or "",
            g.independent_origins(req), _ids(g.signals_for(req)), g.dependencies_for(req), g.risks_for(req),
            g.owner_for(req), "Proposed", g.release_for(req), requirement_notes(req),
        ])
    widths = {
        "Req ID": 9, "Requirement": 48, "Type": 14, "Priority": 10, "Priority rationale": 40, "Primary persona": 22,
        "Job / user story": 40, "Acceptance criteria": 55, "Acceptance test IDs": 14, "Target": 32, "Traced pains": 36,
        "Traced competitive gaps": 32, "Root type": 18, "Ledger IDs": 16, "Evidence quote": 48, "Evidence source": 24, "Evidence pointer": 34,
        "Independent origins": 12, "Success signal IDs": 14, "Dependencies": 24, "Risks": 12, "Owner": 24,
        "Status": 12, "Release": 11, "Notes": 40,
    }
    last = _table(ws, theme, REQUIREMENT_HEADERS, rows, widths=widths, freeze="C2")
    if not rows:
        return
    pcol = get_column_letter(REQUIREMENT_HEADERS.index("Priority") + 1)
    scol = get_column_letter(REQUIREMENT_HEADERS.index("Status") + 1)
    dv_p = DataValidation(type="list", formula1='"' + ",".join(PRIORITY_VALUES) + '"', allow_blank=False, showDropDown=False)
    dv_p.error, dv_p.errorTitle = "Pick Must, Should, Could or Won't.", "Priority"
    dv_s = DataValidation(type="list", formula1='"' + ",".join(STATUS_VALUES) + '"', allow_blank=False, showDropDown=False)
    dv_s.error, dv_s.errorTitle = "Pick a status from the list.", "Status"
    ws.add_data_validation(dv_p)
    ws.add_data_validation(dv_s)
    dv_p.add(f"{pcol}2:{pcol}{last}")
    dv_s.add(f"{scol}2:{scol}{last}")
    # Conditional fill by priority. The Priority cell itself carries the accent for Must; the row gets a wash.
    end_col = get_column_letter(len(REQUIREMENT_HEADERS))
    ws.conditional_formatting.add(f"{pcol}2:{pcol}{last}", FormulaRule(
        formula=[f'${pcol}2="Must"'], fill=theme.fill(theme.accent), font=Font(bold=True, color=theme.on_accent), stopIfTrue=False))
    row_fills = [("Must", theme.accent_pale), ("Should", theme.wash_cool), ("Could", theme.pale), ("Won't", theme.panel)]
    for label, hx in row_fills:
        if not hx:
            continue
        ws.conditional_formatting.add(f"A2:{end_col}{last}", FormulaRule(
            formula=[f'${pcol}2="{label}"'], fill=theme.fill(hx),
            font=Font(color=theme.muted) if label == "Won't" else None))


def _ledger(wb: Workbook, g: _Graph, theme: _Theme):
    """Scope & Feedback Ledger: every feature and piece of feedback the client articulated, with the requirements
    that document it. Coverage status is computed here from the requirements in this workbook."""
    ws = wb.create_sheet(LEDGER_SHEET)
    rows = []
    for li in g.ledger_list:
        lid = str(li.get("id") or "")
        cov = g.covering(lid)
        if not cov:
            status = "Not covered"
        elif all(r.get("origin") == "fallback" for r in cov):
            status = "Covered (needs refinement)"
        else:
            status = "Covered"
        sources = [s for s in li.get("sources") or [] if isinstance(s, dict)]
        docs = list(dict.fromkeys([clean(s.get("documentTitle")) for s in sources if s.get("documentTitle")] or [clean(li.get("documentTitle"))]))
        pointers = list(dict.fromkeys([str(s.get("pointer") or "") for s in sources if s.get("pointer")] or [str(li.get("pointer") or "")]))
        rows.append([
            lid, TYPE_LABEL.get(str(li.get("type")), clean(li.get("type"))), g.area_label(li.get("featureArea")),
            li.get("item"), li.get("quote"), "\n".join(docs), li.get("speaker") or "", li.get("date") or "",
            "\n".join(pointers), li.get("label") or "", li.get("disposition") or "", li.get("group") or "",
            _ids(r.get("id") for r in cov), status,
        ])
    _table(ws, theme, LEDGER_HEADERS, rows, widths={
        "ID": 8, "Type": 10, "Feature area": 18, "Item": 40, "Verbatim quote": 56, "Source document": 34,
        "Speaker / owner": 22, "Date": 12, "Pointer": 40, "Source label": 13, "Disposition": 13, "Group": 24,
        "Covering requirement IDs": 18, "Coverage status": 22,
    }, freeze="C2")
    if rows and theme.accent_pale:
        scol = get_column_letter(LEDGER_HEADERS.index("Coverage status") + 1)
        ws.conditional_formatting.add(f"A2:{get_column_letter(len(LEDGER_HEADERS))}{len(rows) + 1}", FormulaRule(
            formula=[f'${scol}2="Covered (needs refinement)"'], fill=theme.fill(theme.accent_pale)))


def _themes(wb: Workbook, g: _Graph, theme: _Theme):
    """Every Research Assembly Board theme id, its group, sentiment and category, and the requirements covering it."""
    ws = wb.create_sheet(THEMES_SHEET)
    rows = []
    for t in g.theme_rows():
        cov = t["cover"]
        status = "Not covered" if not cov else ("Covered (needs refinement)" if all(r.get("origin") == "fallback" for r in cov) else "Covered")
        rows.append([t["id"], t["name"], t["group"], t["size"], t["sentiment"], t["category"], t["area"], _ids(r.get("id") for r in cov), status])
    _table(ws, theme, THEME_HEADERS, rows, widths={"Theme ID": 22, "Theme": 50, "Theme group": 12, "Group size": 10, "Sentiment": 12,
                                                   "Category": 24, "Feature area": 22, "Covering requirement IDs": 22, "Coverage status": 22}, freeze="C2")


def _acceptance_tests(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Acceptance Tests")
    order = [str(r.get("id")) for r in g.ordered_requirements()]
    ats = sorted(g.at_list, key=lambda a: (order.index(a.get("requirementId")) if a.get("requirementId") in order else len(order)))
    rows = [[g.at_label(a), a.get("requirementId"), a.get("given"), a.get("when"), a.get("then"), target_text(a.get("target")), acceptance_test_type(a)] for a in ats]
    _table(ws, theme, ["AT ID", "Req ID", "Given", "When", "Then", "Target", "Type"], rows,
           widths={"AT ID": 9, "Req ID": 9, "Given": 40, "When": 40, "Then": 48, "Target": 32, "Type": 10}, freeze="C2")


def _traceability(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Traceability")
    rows = []
    for req in g.ordered_requirements():
        rid = req.get("id")
        quotes = g.quotes_for(req)
        src_ids = []
        for q in quotes:
            sid = q.get("sourceId")
            if sid and sid not in src_ids:
                src_ids.append(sid)
        theme_ids = list(req.get("themeIds") or [])
        for pid in req.get("painIds") or []:
            for t in (g.pains.get(pid) or {}).get("themeIds") or []:
                if t not in theme_ids:
                    theme_ids.append(t)
        rows.append([
            rid, TIER_TO_PRIORITY.get(str(req.get("tier")), ""), _ids(req.get("ledgerIds")),
            ", ".join(ROOT_LABEL.get(t, t) for t in g.root_types(req)), _ids(req.get("personaIds")), _ids(req.get("painIds")),
            _ids(req.get("competitiveGapIds")), _ids(theme_ids), _ids(q.get("id") for q in quotes), _ids(src_ids),
            _ids(g.at_label(a) for a in g.ats_for(req)), _ids(g.signals_for(req)),
            "\n".join(q.get("pointer") or "" for q in quotes if q.get("pointer")),
        ])
    _table(ws, theme, ["Req ID", "Priority", "Ledger roots", "Root type", "Personas", "Pains", "Competitive gaps", "Themes", "Quotes", "Sources",
                       "Acceptance tests", "Signals", "Evidence pointers"], rows,
           widths={"Req ID": 9, "Priority": 10, "Evidence pointers": 50}, freeze="B2")


def _signals(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Success Signals")
    order = ((g.sections.get("successSignals") or {}).get("signalIds")) or []
    sigs = [g.signals[i] for i in order if i in g.signals] + [s for s in g.signal_list if s.get("id") not in order]
    rows = []
    for s in sigs:
        pop = s.get("population") or {}
        pop_txt = ", ".join(x for x in [g.persona_name(pop["personaId"]) if pop.get("personaId") else "", f"stage: {pop['stage']}" if pop.get("stage") else ""] if x)
        gr = s.get("guardrail") or {}
        linked = list(s.get("requirementIds") or [])
        for r in g.reqs:
            if s.get("id") in (r.get("signalIds") or []) and r.get("id") not in linked:
                linked.append(r.get("id"))
        tgts = [target_text(r.get("target")) for r in g.reqs if r.get("id") in linked and r.get("target")]
        rows.append([s.get("id"), s.get("signal"), s.get("instrument"), pop_txt, s.get("direction"), s.get("baselineStatus"),
                     "\n".join(t for t in tgts if t), s.get("type"), gr.get("statement"), gr.get("rollbackAuthority"), _ids(linked)])
    _table(ws, theme, ["ID", "Signal / event", "Instrument", "Population", "Direction", "Baseline status", "Target",
                       "Type", "Guardrail", "Rollback owner", "Linked Req IDs"], rows,
           widths={"ID": 8, "Signal / event": 30, "Instrument": 40, "Population": 28, "Direction": 10, "Baseline status": 40,
                   "Target": 36, "Type": 10, "Guardrail": 40, "Rollback owner": 28, "Linked Req IDs": 16}, freeze="C2")


def _personas(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Personas & Jobs")
    jobs = ((g.sections.get("usersAndJobs") or {}).get("jobStories")) or []
    rows = []
    covered = set()
    for j in jobs:
        if not isinstance(j, dict):
            continue
        p = g.personas.get(j.get("personaId")) or {}
        covered.add(j.get("personaId"))
        q = next((g.quotes[x] for x in j.get("quoteIds") or [] if x in g.quotes), {})
        rows.append([j.get("personaId"), p.get("name"), p.get("role"), "Primary" if p.get("primary") else "Secondary",
                     p.get("stageOfStruggle"), j.get("id"), j.get("when"), j.get("iWantTo"), j.get("soICan"),
                     j.get("journeyStage"), q.get("text", ""), g.source_of(q).get("name", "") if q else "", q.get("pointer", "")])
    for pid, p in g.personas.items():
        if pid in covered:
            continue
        rows.append([pid, p.get("name"), p.get("role"), "Primary" if p.get("primary") else "Secondary", p.get("stageOfStruggle"),
                     "", "", "", "", "", "", "", ""])
    _table(ws, theme, ["Persona ID", "Persona", "Role", "Priority", "Stage of struggle", "Job ID", "When", "I want to",
                       "So I can", "Journey stage", "Supporting quote", "Source", "Pointer"], rows,
           widths={"When": 34, "I want to": 34, "So I can": 34, "Supporting quote": 44, "Pointer": 34}, freeze="C2")


def _pains(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Pains & Evidence")
    rows = []
    for pid, p in g.pains.items():
        personas = ", ".join(g.persona_name(x) for x in p.get("personaIds") or [])
        qids = [x for x in p.get("quoteIds") or [] if x in g.quotes] or [None]
        for qid in qids:
            q = g.quotes.get(qid) if qid else {}
            src = g.source_of(q) if q else {}
            rows.append([pid, p.get("text"), p.get("kind"), p.get("journeyStage"), personas, _ids(p.get("themeIds")),
                         q.get("id", "") if q else "", q.get("text", "") if q else "", src.get("name", ""),
                         (q.get("pointer") if q else "") or src.get("pointer", ""), src.get("url", ""), src.get("date", "")])
    _table(ws, theme, ["Pain ID", "Pain", "Kind", "Stage", "Persona", "Themes", "Quote ID", "Quote", "Source", "Pointer", "URL", "Date"],
           rows, widths={"Pain": 40, "Quote": 50, "Pointer": 34, "URL": 30}, freeze="C2")


def _gaps(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Gaps")
    rows = []
    for gid, gap in g.gaps.items():
        q = next((g.quotes[x] for x in gap.get("quoteIds") or [] if x in g.quotes), {})
        src = g.source_of(q) if q else {}
        tracing = [r for r in g.ordered_requirements() if gid in (r.get("competitiveGapIds") or [])]
        impact = ", ".join(f"{r.get('id')} ({TIER_TO_PRIORITY.get(str(r.get('tier')), '')})" for r in tracing)
        rows.append([gid, gap.get("text"), gap.get("competitor"), impact, q.get("text", ""), src.get("name", ""),
                     q.get("pointer", "") or src.get("pointer", ""), src.get("url", "")])
    _table(ws, theme, ["Gap ID", "Capability", "Competitor", "Impact (requirements traced)", "Evidence quote", "Source", "Pointer", "URL"],
           rows, widths={"Capability": 44, "Impact (requirements traced)": 30, "Evidence quote": 48, "Pointer": 34}, freeze="C2")


def _assumptions(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Assumptions")
    rows = []
    for a in ((g.sections.get("hypotheses") or {}).get("assumptions")) or []:
        if not isinstance(a, dict):
            continue
        q = next((g.quotes[x] for x in a.get("supportingQuoteIds") or [] if x in g.quotes), {})
        rows.append([a.get("id"), a.get("text"), a.get("quadrant"), a.get("test"), a.get("owner"), q.get("text", ""),
                     g.source_of(q).get("name", "") if q else "", q.get("pointer", "")])
    _table(ws, theme, ["ID", "Assumption", "Quadrant", "Test", "Owner", "Supporting quote", "Source", "Pointer"], rows,
           widths={"Assumption": 44, "Test": 44, "Supporting quote": 44, "Pointer": 34}, freeze="C2")


def _nfrs(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("NFRs")
    qual = g.sections.get("quality") or {}
    releases = ((g.sections.get("delivery") or {}).get("releaseCriteria")) or []
    nfr_reqs = [r for r in g.ordered_requirements() if str(r.get("kind")) == "non-functional"]
    rows = []
    for ch in qual.get("characteristics") or []:
        if not isinstance(ch, dict):
            continue
        name = str(ch.get("characteristic") or "")
        st_tokens = _tokens(str(ch.get("statement") or ""))
        ch_metric = str((ch.get("target") or {}).get("metric") or "").strip().lower()
        verify = [r.get("id") for r in nfr_reqs
                  if (ch_metric and ch_metric == str((r.get("target") or {}).get("metric") or "").strip().lower())
                  or (st_tokens and len(st_tokens & _tokens(str(r.get("text") or ""))) >= 3)]
        ats = [g.at_label(a) for r in nfr_reqs if r.get("id") in verify for a in g.ats_for(r)]
        crit = [c for c in releases if name and name.split()[0].lower() in str(c).lower()]
        verification = "\n".join(x for x in [f"Acceptance tests: {_ids(ats)}" if ats else "", f"Requirements: {_ids(verify)}" if verify and not ats else ""] + [clean(c) for c in crit] if x)
        rows.append(["ISO/IEC 25010", name, ch.get("statement"), target_text(ch.get("target")), verification])
    acc = qual.get("accessibility") or {}
    if acc.get("level") or acc.get("exposedCriteria"):
        crit = [c for c in releases if "accessib" in str(c).lower() or "wcag" in str(c).lower()]
        rows.append(["Accessibility", acc.get("level") or "", "\n".join(clean(x) for x in acc.get("exposedCriteria") or []), "", "\n".join(clean(c) for c in crit)])
    priv = qual.get("privacy") or {}
    if priv.get("regime") or priv.get("dataMinimization"):
        trig = priv.get("dpiaTrigger") or {}
        crit = [c for c in releases if "privacy" in str(c).lower()]
        stmt = "\n".join(x for x in [clean(priv.get("dataMinimization")), f"Privacy impact assessment {'required' if trig.get('triggered') else 'not required'}: {clean(trig.get('reason'))}" if trig.get("reason") else ""] if x)
        rows.append(["Privacy", priv.get("regime") or "", stmt, "", "\n".join(clean(c) for c in crit)])
    _table(ws, theme, ["Standard", "Characteristic", "Statement", "Target", "Verification"], rows,
           widths={"Standard": 16, "Characteristic": 24, "Statement": 56, "Target": 40, "Verification": 48}, freeze="C2")


def _open_questions(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Open Questions")
    qs = ((g.sections.get("delivery") or {}).get("openQuestions")) or []
    rows = [[f"OQ-{i}", q.get("question"), q.get("owner"), q.get("due")] for i, q in enumerate(qs, start=1) if isinstance(q, dict)]
    _table(ws, theme, ["ID", "Question", "Owner", "Due"], rows, widths={"ID": 8, "Question": 70, "Owner": 32, "Due": 30}, freeze="B2")


def _risks(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Risks")
    rk = g.sections.get("risks") or {}
    rows = [[r.get("id"), r.get("failureMode"), r.get("likelihood"), r.get("severity"), r.get("earlySignal"), r.get("owner"), r.get("mitigation")]
            for r in rk.get("register") or [] if isinstance(r, dict)]
    _table(ws, theme, ["ID", "Failure mode", "Likelihood", "Severity", "Early signal", "Owner", "Mitigation"], rows,
                  widths={"ID": 8, "Failure mode": 44, "Likelihood": 11, "Severity": 10, "Early signal": 40, "Owner": 28, "Mitigation": 44}, freeze="C2")


def _alternatives(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Alternatives")
    rk = g.sections.get("risks") or {}
    rows = [[f"ALT-{i}", a.get("option"), a.get("rejectedBecause"), a.get("tradeoff")]
            for i, a in enumerate([x for x in rk.get("alternatives") or [] if isinstance(x, dict)], start=1)]
    _table(ws, theme, ["ID", "Alternative considered", "Rejected because", "Trade-off"], rows,
           widths={"ID": 9, "Alternative considered": 40, "Rejected because": 50, "Trade-off": 50}, freeze="B2")


def _sources(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Sources")
    used: Dict[str, int] = {}
    for q in g.quotes.values():
        sid = str(q.get("sourceId") or "")
        used[sid] = used.get(sid, 0) + 1
    rows = [[sid, s.get("name"), s.get("kind"), s.get("date"), s.get("url"), s.get("pointer"), used.get(sid, 0)] for sid, s in g.sources.items()]
    _table(ws, theme, ["ID", "Name", "Type", "Date", "URL", "Pointer", "Quotes cited"], rows,
           widths={"ID": 8, "Name": 36, "Type": 16, "Date": 12, "URL": 44, "Pointer": 44, "Quotes cited": 12}, freeze="B2")


def _delivery(wb: Workbook, g: _Graph, theme: _Theme):
    ws = wb.create_sheet("Delivery")
    dl = g.sections.get("delivery") or {}
    rows: List[List[Any]] = []
    for i, ph in enumerate(dl.get("rollout") or [], start=1):
        if isinstance(ph, dict):
            rows.append(["Rollout phase", f"{i}. {clean(ph.get('phase'))}", ph.get("gate"), ph.get("killCriteria"), ph.get("rollbackAuthority")])
    for c in dl.get("releaseCriteria") or []:
        rows.append(["Release criterion", c, "", "", ""])
    for d in dl.get("dependencies") or []:
        if isinstance(d, dict):
            rows.append(["Dependency", d.get("name"), d.get("kind"), "", d.get("owner")])
    for t in dl.get("trackingPlan") or []:
        if isinstance(t, dict):
            rows.append(["Tracking event", t.get("event"), ", ".join(clean(p) for p in t.get("properties") or []), "", t.get("owner")])
    for r in ((g.sections.get("solutionFlows") or {}).get("businessRules")) or []:
        rows.append(["Business rule", r, "", "", ""])
    _table(ws, theme, ["Record", "Item", "Gate / kind / properties", "Kill criteria", "Owner / rollback authority"], rows,
           widths={"Record": 18, "Item": 48, "Gate / kind / properties": 48, "Kill criteria": 44, "Owner / rollback authority": 32}, freeze="B2")


_EXEMPT_POINTER_HEADERS = {"Evidence pointer", "Pointer", "Evidence pointers"}


_STANDARD_RE = re.compile(r"\b(?:WCAG\s*\d+(?:\.\d+)?(?:\s*(?:AA|AAA|A))?|ISO(?:/IEC)?(?:/IEEE)?\s*\d+(?::\d{4})?|IEEE\s*\d+|Article\s*\d+|p\d{2})\b", re.I)
# Suffix in either case, as in the TS twin (its combined protect pattern is case-insensitive): "H-1B", "SF-3a".
# Case-insensitive like the TypeScript PROTECTED_RE ('gi'): "exhibit a-2" is an id token on both sides (2026-10-20).
_ID_TOKEN_RE = re.compile(r"\b[A-Z]{1,5}-\d+[A-Za-z]?\b", re.I)
_POINTER_TOKEN_RE = re.compile(r"\b[A-Za-z][\w.\\-]*/[\w./\\-]+(?:#c\d+)?", re.I)
_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}(?:-\d{2}(?:-\d{2})?)?\b")
_UNITS = r"%|percent\b|x\b|k\b|m\b|bn\b|ms\b|seconds?\b|minutes?\b|hours?\b|days?\b|weeks?\b|months?\b|years?\b|terms?\b|times\b|points?\b"
_NUMBER_RE = re.compile(r"(?:\$\s?)?\b\d(?:[\d,.]*\d)?(?:\s*(?:" + _UNITS + r"))?", re.I)
_QUANTITY_OPENERS = ("Over|Under|About|Around|Approximately|Roughly|Within|Up|Nearly|Almost|More|Less|Fewer|Only|Just|All|The|A|An|Some|"
                     "Each|Every|At|By|In|On|For|To|Of|From|After|Before|Top|Last|First|Next|Reduce|Cut|Add|Save|Target|Than|With")
_NAME_NUMBER_RE = re.compile(r"\b(?!(?:" + _QUANTITY_OPENERS + r")\b)[A-Z][A-Za-z]+(?:[ -][A-Z][A-Za-z]+)? \d+(?:\.\d+)?\b(?!\s*(?:" + _UNITS + r"))(?![-/:.]\d)")


_MODIFIER_NUMBER_RE = re.compile(r"\b\d{2,}(?:\.\d+)?\s+(?!(?:" + _UNITS + r"))[a-z]*[a-rt-z]\b")


_FIXED_TERM_RE = re.compile(r"\b\d+-year(?:-old)?s?\b")


def naked_numbers(text: str) -> List[str]:
    """Python twin of services/deliverableRules.ts nakedNumbers: digits that are not an id, a pointer, a standard
    name, a year or part of a name ("Acme 360")."""
    t = _NAME_NUMBER_RE.sub(" ", text or "")
    t = _STANDARD_RE.sub(" ", t)
    t = _POINTER_TOKEN_RE.sub(" ", t)
    t = _MODIFIER_NUMBER_RE.sub(" ", t)
    t = _ID_TOKEN_RE.sub(" ", t)
    t = _YEAR_RE.sub(" ", t)
    # 2026-10-20 (root-cause audit P1.9): an "N-year" term is a fixed term, as in deliverableRules.ts FIXED_TERM_RE.
    t = _FIXED_TERM_RE.sub(" ", t)
    return [m.group(0).strip() for m in _NUMBER_RE.finditer(t) if re.search(r"\d", m.group(0))]


def export_checks(g: _Graph, wb: Workbook) -> List[Dict[str, Any]]:
    """INDEPENDENT export check: the same rules the TypeScript registry enforces, re-validated on the final rows.
    Never raises; the workbook ships either way and the failures are listed on the Checks sheet."""
    checks: List[Dict[str, Any]] = []

    def add(name: str, failures: List[str]):
        checks.append({"check": name, "pass": not failures, "failures": failures})

    reqs = g.ordered_requirements()
    covered = set()
    for r in reqs:
        for lid in r.get("ledgerIds") or []:
            covered.add(lid)
            for t in (g.ledger.get(lid) or {}).get("themeIds") or []:
                covered.add(f"theme:{t}")
        for t in r.get("themeIds") or []:
            covered.add(f"theme:{t}")
    miss = [str(li.get("id")) for li in g.ledger_list if li.get("id") not in covered]
    for li in g.ledger_list:
        if li.get("type") == "theme":
            miss += [f"theme {t}" for t in li.get("themeIds") or [] if f"theme:{t}" not in covered]
    add("Coverage: every stated, feedback and theme id is covered by a requirement", miss)

    ids = [str(r.get("id")) for r in reqs]
    idf = [f"duplicate requirement id {i}" for i in sorted({i for i in ids if ids.count(i) > 1})]
    idf += [f"{i} out of sequence (expected R-{n})" for n, i in enumerate(ids, start=1) if i != f"R-{n}"]
    at_ids = [str(a.get("id")) for a in g.at_list]
    idf += [f"duplicate test id {i}" for i in sorted({i for i in at_ids if at_ids.count(i) > 1})]
    idf += [f"{a.get('id')} points to missing {a.get('requirementId')}" for a in g.at_list if a.get("requirementId") not in ids]
    idf += [f"signal {s.get('id')} points to missing {x}" for s in g.signal_list for x in s.get("requirementIds") or [] if x not in ids]
    idf += [f"{r.get('id')} names missing ledger item {x}" for r in reqs for x in r.get("ledgerIds") or [] if x not in g.ledger]
    add("Id integrity: unique, sequential, no dangling references", idf)

    gwt = [str(r.get("id")) for r in reqs if not any(str(a.get("given") or "").strip() and str(a.get("when") or "").strip() and str(a.get("then") or "").strip() for a in g.ats_for(r))]
    add("Every requirement has a Given / When / Then test", gwt)

    # The number rule, re-checked here on the final rows (2026-10-02 audit: the export check covered coverage, ids,
    # tests, pointers and dashes but not numbers). A figure may appear only inside a quote or a typed target; the
    # requirement sentence and its acceptance test are neither.
    # 2026-10-20 (root-cause audit P1.9): acceptance criteria are specifications, not claims; their thresholds stay
    # verifiable. Only the requirement sentence is checked here, matching prdRulesContract.ts.
    nums = []
    for r in reqs:
        for n in naked_numbers(str(r.get("text") or "")):
            nums.append(f"{r.get('id')}: \"{n}\"")
            break
    add("Numbers appear only inside quotes, typed targets or acceptance tests (requirement text)", nums[:200])

    ptr, dash = [], []
    for ws in wb.worksheets:
        if ws.title == CHECKS_SHEET:
            continue
        headers = {c.column: c.value for c in ws[1]} if ws.max_row >= 1 else {}
        for row in ws.iter_rows(min_row=1):
            for c in row:
                v = c.value
                if not isinstance(v, str):
                    continue
                if "\u2014" in v:
                    dash.append(f"{ws.title}!{c.coordinate}")
                if headers.get(c.column) not in _EXEMPT_POINTER_HEADERS and _POINTER_BRACKET_RE.search(v):
                    ptr.append(f"{ws.title}!{c.coordinate}")
    add("No pointer text in display cells", ptr[:200])
    add("No em dash in any cell", dash[:200])
    # The generation receipt, rule by rule (2026-10-02 QA: the record said pass:false while this sheet showed six
    # green rows because it never rendered the receipt). Each receipt rule is its own row; open violations listed.
    rec = g.air.get("receipt") if isinstance(getattr(g, "air", None), dict) else None
    for r in (rec or {}).get("rules") or []:
        if isinstance(r, dict):
            add(f"Generation rule: {clean(r.get('title'))}", [clean(v) for v in (r.get("violations") or [])][:200])
    if rec:
        add("Generation receipt: every rule passes", [] if rec.get("pass") else ["the receipt reports at least one rule open (rows above)"])
    return checks


def _checks_sheet(wb: Workbook, theme: _Theme, checks: List[Dict[str, Any]]):
    ws = wb.create_sheet(CHECKS_SHEET)
    rows = [[c["check"], "Pass" if c["pass"] else "Fail", len(c["failures"]), "\n".join(c["failures"][:50])] for c in checks]
    _table(ws, theme, ["Check", "Result", "Failures", "Detail"], rows, widths={"Check": 60, "Result": 10, "Failures": 10, "Detail": 70}, freeze="B2")


def build_prd_workbook_with_checks(air: dict, brand: str = "NXT", tokens: Optional[dict] = None):
    """Build the workbook and run the independent export check. Returns (bytes, checks)."""
    return _build(air, brand, tokens)


def build_prd_workbook(air: dict, brand: str = "NXT", tokens: Optional[dict] = None) -> bytes:
    """Build the PRD requirements workbook. Returns the .xlsx bytes."""
    return _build(air, brand, tokens)[0]


def _build(air: dict, brand: str = "NXT", tokens: Optional[dict] = None):
    if not isinstance(air, dict):
        raise ValueError("air must be a PrdAir object")
    theme = _Theme(brand or str(air.get("brand") or "NXT"), tokens)
    g = _Graph(air)
    generated = str(air.get("createdAtIso") or "")[:10] or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    wb = Workbook()
    wb.remove(wb.active)
    _summary(wb, g, theme, generated)
    _requirements(wb, g, theme)
    _requirements(wb, g, theme, engagement=True)
    _ledger(wb, g, theme)
    _themes(wb, g, theme)
    _acceptance_tests(wb, g, theme)
    _traceability(wb, g, theme)
    _signals(wb, g, theme)
    _personas(wb, g, theme)
    _pains(wb, g, theme)
    _gaps(wb, g, theme)
    _assumptions(wb, g, theme)
    _nfrs(wb, g, theme)
    _open_questions(wb, g, theme)
    _risks(wb, g, theme)
    _alternatives(wb, g, theme)
    _sources(wb, g, theme)
    _delivery(wb, g, theme)
    checks = export_checks(g, wb)
    _checks_sheet(wb, theme, checks)
    wb.active = 1  # open on Requirements, the core sheet
    for ws in wb.worksheets:
        if ws.sheet_properties is not None and theme.accent:
            ws.sheet_properties.tabColor = theme.accent if ws.title == "Requirements" else (theme.rail or None)
    wb.properties.title = clean(air.get("title") or "Product requirements")[:250]
    wb.properties.subject = "Product requirements"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue(), checks


def checks_header(checks: List[Dict[str, Any]]) -> str:
    """Compact response-header value: "pass", or "fail: <check> (<n>); ...". ASCII only."""
    bad = [c for c in checks if not c["pass"]]
    if not bad:
        return "pass"
    return ("fail: " + "; ".join(f"{c['check'].split(':')[0]} ({len(c['failures'])})" for c in bad)).encode("ascii", "ignore").decode()[:900]


def slug_filename(title: str, brand: str = "NXT") -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(title or "").lower()).strip("-")[:70].strip("-") or "prd"
    return f"{s}-requirements-{str(brand or 'nxt').lower()}.xlsx"
