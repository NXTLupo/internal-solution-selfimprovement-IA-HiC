"""memory_store.py - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift, WS-B B1)

ONE memory door for every agent. The SPA, the platform agent, research-mcp (and through it Claude Code
sessions), the Claude Code hook and NXT-Agency all admit and recall facts through the proxy's
/api/memory/* endpoints, which run THIS module. Before it, the fact store (wiki/synthesis/
memory-facts.json) was reachable only through the SPA's wiki read/write path, so three of the four
agents could neither read nor write it: the transcript's unsolved problem, exactly.

This is a FAITHFUL port of the pure functions in services/memoryLifecycle.ts (admission gate, merge,
staleness guardrails, consolidation guardrails, deterministic reinforcement, capacity eviction with the
hybrid shadow) and services/memoryRetrieval.ts (salient terms, relevance-ranked fact selection). The
TypeScript stays the reference; `evals/fixtures/memory-parity.json` pins both implementations to the
same expected outputs (services/memoryParity.test.ts and proxy/tests/test_memory_store.py).

Store IO is the only impure part: a cross-process lock (the proxy runs several uvicorn workers) and an
atomic per-pid temp write, so two workers admitting at once cannot lose a fact.
"""
from __future__ import annotations

import json
import math
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

DEFAULT_CONFIG: Dict[str, Any] = {
    "maxFacts": 100,
    "factConfidenceThreshold": 0.7,
    "stalenessAgeDays": 90,
    "stalenessMinCandidates": 3,
    "stalenessMaxRemovalsPerCycle": 10,
    "stalenessProtectedCategories": ["correction"],
    "stalenessMaxLifetimeMultiplier": 20,
    "stalenessMaxExtensionDays": 3650,
    "consolidationMinFacts": 8,
    "consolidationMaxGroupsPerCycle": 3,
    "consolidationMaxSources": 8,
    "evictionPolicy": "confidence",
    "evictionShadowEnabled": True,
    "evictionConfidenceWeight": 0.65,
    "evictionConfirmationWeight": 0.25,
    "evictionAccessWeight": 0.10,
    "evictionConfirmationHalfLifeDays": 90,
    "evictionAccessHalfLifeDays": 30,
    "evictionCorrectionReservedFraction": 0.10,
}

VALID_CATEGORIES = ("preference", "knowledge", "context", "behavior", "goal", "correction")
DAY_MS = 86_400_000


def _cfg(cfg: Optional[dict]) -> dict:
    return {**DEFAULT_CONFIG, **(cfg or {})}


def now_iso() -> str:
    """new Date().toISOString() twin: millisecond precision, Z suffix."""
    d = datetime.now(timezone.utc)
    return d.strftime("%Y-%m-%dT%H:%M:%S.") + f"{d.microsecond // 1000:03d}Z"


def _ms(iso: Optional[str]) -> float:
    """Date.parse twin for the ISO strings this store writes. NaN when unparseable."""
    if not iso:
        return float("nan")
    s = str(iso).strip()
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        d = datetime.fromisoformat(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.timestamp() * 1000.0
    except Exception:
        return float("nan")


def _days_between(a_iso: str, b_iso: str) -> float:
    v = (_ms(b_iso) - _ms(a_iso)) / DAY_MS
    if v != v:  # NaN
        return 0.0
    return max(0.0, v)


def _js_round(x: float) -> int:
    """Math.round: halves round toward +infinity (Python's round() is banker's rounding)."""
    return int(math.floor(x + 0.5))


# ---------------------------------------------------------------------------------------------------------
# Identity
# ---------------------------------------------------------------------------------------------------------
_B36 = "0123456789abcdefghijklmnopqrstuvwxyz"


def _to_base36(n: int) -> str:
    if n == 0:
        return "0"
    out = []
    while n:
        n, r = divmod(n, 36)
        out.append(_B36[r])
    return "".join(reversed(out))


def fact_id(content: str) -> str:
    """factId twin: djb2 over UTF-16 code units of the lower-cased, space-collapsed content, unsigned base36."""
    norm = re.sub(r"\s+", " ", str(content or "").lower()).strip()
    h = 5381
    data = norm.encode("utf-16-le")
    for i in range(0, len(data), 2):
        code = data[i] | (data[i + 1] << 8)
        h = ((h << 5) + h + code) & 0xFFFFFFFF
    return "f" + _to_base36(h)


# ---------------------------------------------------------------------------------------------------------
# Admission + merge
# ---------------------------------------------------------------------------------------------------------
def admit_facts(proposed: Iterable[dict], run_id: str, cfg: Optional[dict] = None, now: Optional[str] = None) -> dict:
    cfg = _cfg(cfg)
    now = now or now_iso()
    admitted: List[dict] = []
    rejected: List[dict] = []
    by_scope = 0
    seen = set()
    for p in proposed or []:
        p = p if isinstance(p, dict) else {}
        content = str(p.get("content") or "").strip()
        if not content:
            rejected.append({"content": "", "reason": "empty content"})
            continue
        cat = p.get("category")
        if not cat or cat not in VALID_CATEGORIES:
            rejected.append({"content": content, "reason": "missing or invalid category"})
            by_scope += 1
            continue
        scope, dur, auth = p.get("scope"), p.get("durability"), p.get("authority")
        if not scope or not dur or not auth:
            rejected.append({"content": content, "reason": "missing scope/durability/authority label"})
            by_scope += 1
            continue
        if scope == "session" or dur != "durable" or auth != "descriptive":
            rejected.append({"content": content, "reason": f"scope gate: {scope}/{dur}/{auth}"})
            by_scope += 1
            continue
        conf = p.get("confidence")
        confidence = float(conf) if isinstance(conf, (int, float)) and not isinstance(conf, bool) else 0.0
        if confidence < cfg["factConfidenceThreshold"]:
            rejected.append({"content": content, "reason": f"confidence {_num(confidence)} below {_num(cfg['factConfidenceThreshold'])}"})
            continue
        fid = fact_id(content)
        if fid in seen:
            rejected.append({"content": content, "reason": "duplicate in batch"})
            continue
        seen.add(fid)
        creation_cap = cfg["stalenessAgeDays"] * cfg["stalenessMaxLifetimeMultiplier"]
        evd = p.get("expectedValidDays")
        evd = cfg["stalenessAgeDays"] if evd is None else evd
        expected = min(max(1, _js_round(float(evd))), creation_cap)
        admitted.append({
            "id": fid, "content": content, "category": cat, "confidence": confidence,
            "scope": scope, "durability": dur, "authority": auth,
            "createdAt": now, "expectedValidDays": expected,
            "confirmationCount": 0, "sourceRunIds": [run_id],
        })
    return {"admitted": admitted, "rejected": rejected, "rejectedByScopeGate": by_scope}


def _num(x: float) -> str:
    """JS number-to-string for the values the reasons quote (0.6, 0.7, 1)."""
    return str(int(x)) if float(x).is_integer() else repr(float(x))


def merge_facts(store: List[dict], incoming: List[dict]) -> List[dict]:
    by_id: Dict[str, dict] = {}
    for f in store or []:
        by_id[f["id"]] = dict(f)
    for f in incoming or []:
        prior = by_id.get(f["id"])
        if prior is None:
            by_id[f["id"]] = f
            continue
        prior["confidence"] = max(prior.get("confidence", 0), f.get("confidence", 0))
        merged = list(prior.get("sourceRunIds") or [])
        for r in f.get("sourceRunIds") or []:
            if r not in merged:
                merged.append(r)
        prior["sourceRunIds"] = merged
    return list(by_id.values())


# ---------------------------------------------------------------------------------------------------------
# Staleness
# ---------------------------------------------------------------------------------------------------------
def select_stale_candidates(facts: List[dict], cfg: Optional[dict] = None, now: Optional[str] = None) -> List[dict]:
    cfg = _cfg(cfg)
    now = now or now_iso()
    out = []
    for f in facts or []:
        if f.get("category") in cfg["stalenessProtectedCategories"]:
            continue
        clock = f.get("lastConfirmedAt") or f.get("createdAt")
        age = _days_between(clock, now)
        if age >= (f.get("expectedValidDays") or cfg["stalenessAgeDays"]):
            out.append(f)
    return out


def apply_staleness_decisions(facts: List[dict], decisions: List[dict], cfg: Optional[dict] = None, now: Optional[str] = None) -> dict:
    cfg = _cfg(cfg)
    now = now or now_iso()
    candidates = {f["id"]: f for f in select_stale_candidates(facts, cfg, now)}
    refused: List[dict] = []
    removal_ids: List[str] = []
    extensions: List[dict] = []
    for d in decisions or []:
        if d.get("id") not in candidates:
            refused.append({"id": d.get("id"), "reason": "not an aged candidate (protected, absent, or still inside its window)"})
            continue
        if d.get("verdict") == "REMOVE":
            removal_ids.append(d["id"])
        elif d.get("verdict") == "EXTEND":
            extensions.append(d)
    effective = removal_ids
    if len(removal_ids) > cfg["stalenessMaxRemovalsPerCycle"]:
        ranked = sorted((candidates[i] for i in removal_ids), key=lambda f: f.get("confidence", 0))
        effective = [f["id"] for f in ranked[:cfg["stalenessMaxRemovalsPerCycle"]]]
        for i in removal_ids:
            if i not in effective:
                refused.append({"id": i, "reason": "per-cycle removal cap reached"})
    removed_set = set(effective)
    proposed_for_removal = set(removal_ids)
    extended: List[str] = []
    out: List[dict] = []
    for f in facts:
        if f["id"] in removed_set:
            continue
        ext = next((e for e in extensions if e.get("id") == f["id"]), None)
        if not ext:
            out.append(f)
            continue
        if f["id"] in proposed_for_removal:
            refused.append({"id": f["id"], "reason": "proposed for removal in the same cycle; extension ignored"})
            out.append(f)
            continue
        days_since = _days_between(f.get("createdAt"), now)
        nxt = min(_js_round(days_since + max(1, ext.get("extendByDays") or cfg["stalenessAgeDays"])), cfg["stalenessMaxExtensionDays"])
        extended.append(f["id"])
        out.append({**f, "expectedValidDays": nxt})
    return {"facts": out, "removed": effective, "extended": extended, "refused": refused}


# ---------------------------------------------------------------------------------------------------------
# Consolidation
# ---------------------------------------------------------------------------------------------------------
def select_consolidation_groups(facts: List[dict], cfg: Optional[dict] = None) -> List[dict]:
    cfg = _cfg(cfg)
    by_cat: Dict[str, List[dict]] = {}
    for f in facts or []:
        by_cat.setdefault(f.get("category"), []).append(f)
    groups = [(c, lst) for c, lst in by_cat.items() if len(lst) >= cfg["consolidationMinFacts"]]
    groups.sort(key=lambda g: -len(g[1]))
    return [{"category": c, "factIds": [f["id"] for f in lst]} for c, lst in groups[:cfg["consolidationMaxGroupsPerCycle"]]]


def apply_consolidation(facts: List[dict], proposals: List[dict], cfg: Optional[dict] = None, now: Optional[str] = None) -> dict:
    cfg = _cfg(cfg)
    by_id = {f["id"]: f for f in facts}
    refused: List[dict] = []
    consumed = set()
    merged: List[dict] = []
    merged_ids: List[str] = []
    for p in proposals or []:
        ids: List[str] = []
        for i in (p or {}).get("sourceIds") or []:
            if i not in ids:
                ids.append(i)
        if len(ids) < 2:
            refused.append({"sourceIds": ids, "reason": "fewer than two sources"}); continue
        if len(ids) > cfg["consolidationMaxSources"]:
            refused.append({"sourceIds": ids, "reason": "over the per-group source cap"}); continue
        if any(i not in by_id for i in ids):
            refused.append({"sourceIds": ids, "reason": "unknown source id"}); continue
        if any(i in consumed for i in ids):
            refused.append({"sourceIds": ids, "reason": "source already consumed by another group"}); continue
        sources = [by_id[i] for i in ids]
        c = (p or {}).get("consolidated") or {}
        if not c.get("content") or not c.get("category") or not c.get("scope") or not c.get("durability") or not c.get("authority"):
            refused.append({"sourceIds": ids, "reason": "consolidated fact is missing classification"}); continue
        if c["scope"] == "session" or c["durability"] != "durable" or c["authority"] != "descriptive":
            refused.append({"sourceIds": ids, "reason": "consolidated fact fails the admission gate"}); continue
        max_conf = max(s.get("confidence", 0) for s in sources)
        cc = c.get("confidence")
        confidence = min(cc if isinstance(cc, (int, float)) and not isinstance(cc, bool) else max_conf, max_conf)
        if confidence < cfg["factConfidenceThreshold"]:
            refused.append({"sourceIds": ids, "reason": "merged confidence below threshold"}); continue
        newest = sources[0]["createdAt"]
        for s in sources:
            if _ms(s["createdAt"]) > _ms(newest):
                newest = s["createdAt"]
        earliest_deadline = min(_ms(s["createdAt"]) + (s.get("expectedValidDays") or cfg["stalenessAgeDays"]) * DAY_MS for s in sources)
        raw_window = (earliest_deadline - _ms(newest)) / DAY_MS
        creation_cap = cfg["stalenessAgeDays"] * cfg["stalenessMaxLifetimeMultiplier"]
        expected = min(max(1, _js_round(raw_window)), creation_cap)
        for i in ids:
            consumed.add(i)
        merged_ids.extend(ids)
        runs: List[str] = []
        for s in sources:
            for r in s.get("sourceRunIds") or []:
                if r not in runs:
                    runs.append(r)
        merged.append({
            "id": fact_id(c["content"]), "content": c["content"], "category": c["category"], "confidence": confidence,
            "scope": c["scope"], "durability": c["durability"], "authority": c["authority"],
            "createdAt": newest, "expectedValidDays": expected,
            "confirmationCount": max(s.get("confirmationCount") or 0 for s in sources),
            "sourceRunIds": runs,
        })
    kept = [f for f in facts if f["id"] not in consumed]
    return {"facts": merge_facts(kept, merged), "mergedIds": merged_ids, "refused": refused}


# ---------------------------------------------------------------------------------------------------------
# Reinforcement (deterministic user signal only)
# ---------------------------------------------------------------------------------------------------------
_REINFORCEMENT = [
    re.compile(r"\byes[,.]?\s+(?:exactly|perfect|that(?:'s| is) (?:right|correct|it))\b", re.I),
    re.compile(r"\bperfect(?:[.!?]|$)", re.I),
    re.compile(r"\bexactly\s+(?:right|correct|what i (?:wanted|needed|meant))\b", re.I),
    re.compile(r"\bthat(?:'s| is)\s+(?:exactly\s+)?(?:right|correct|what i (?:wanted|needed|meant))\b", re.I),
    re.compile(r"\bkeep\s+(?:doing\s+)?that\b", re.I),
    re.compile(r"\bthis is (?:great|helpful|what i wanted)\b", re.I),
    re.compile(r"\bnailed it\b", re.I),
]


def detect_reinforcement(user_messages: List[str]) -> dict:
    for m in (user_messages or [])[-6:]:
        for rx in _REINFORCEMENT:
            if rx.search(m or ""):
                return {"confirmed": True, "matched": rx.pattern}
    return {"confirmed": False}


def apply_reinforcement(facts: List[dict], nominated: List[str], user_messages: List[str], now: Optional[str] = None) -> dict:
    now = now or now_iso()
    if not detect_reinforcement(user_messages)["confirmed"]:
        return {"facts": facts, "confirmed": [], "ignored": list(nominated or [])}
    want = set(nominated or [])
    confirmed: List[str] = []
    out = []
    for f in facts:
        if f["id"] not in want:
            out.append(f)
            continue
        confirmed.append(f["id"])
        out.append({**f, "lastConfirmedAt": now, "confirmationCount": (f.get("confirmationCount") or 0) + 1})
    return {"facts": out, "confirmed": confirmed, "ignored": [i for i in (nominated or []) if i not in confirmed]}


# ---------------------------------------------------------------------------------------------------------
# Capacity eviction (confidence enforced; hybrid shadowed)
# ---------------------------------------------------------------------------------------------------------
def _decay(days: float, half_life: float) -> float:
    return math.pow(0.5, days / max(1, half_life))


def hybrid_score(f: dict, cfg: dict, now: str) -> float:
    conf = max(0.0, min(1.0, f.get("confidence", 0)))
    fresh = _decay(_days_between(f["lastConfirmedAt"], now), cfg["evictionConfirmationHalfLifeDays"]) if f.get("lastConfirmedAt") else 0
    heat = _decay(_days_between(f["lastAccessedAt"], now), cfg["evictionAccessHalfLifeDays"]) if f.get("lastAccessedAt") else 0
    return cfg["evictionConfidenceWeight"] * conf + cfg["evictionConfirmationWeight"] * fresh + cfg["evictionAccessWeight"] * heat


def evict_to_capacity(facts: List[dict], cfg: Optional[dict] = None, now: Optional[str] = None) -> dict:
    cfg = _cfg(cfg)
    now = now or now_iso()
    if len(facts) <= cfg["maxFacts"]:
        return {"facts": facts, "evicted": [], "shadowDisagreement": []}
    corrections_all = [f for f in facts if f.get("category") == "correction"]
    reserved = min(math.ceil(cfg["maxFacts"] * cfg["evictionCorrectionReservedFraction"]), len(corrections_all))
    corrections = sorted(corrections_all, key=lambda f: -f.get("confidence", 0))   # stable, like Array.sort
    protected = {f["id"] for f in corrections[:reserved]}

    def rank(f):
        return hybrid_score(f, cfg, now) if cfg["evictionPolicy"] == "hybrid-v1" else f.get("confidence", 0)

    contenders = sorted([f for f in facts if f["id"] not in protected], key=lambda f: -rank(f))
    keep_count = max(0, cfg["maxFacts"] - len(protected))
    kept = protected | {f["id"] for f in contenders[:keep_count]}
    evicted = [f["id"] for f in facts if f["id"] not in kept]
    shadow: List[str] = []
    if cfg["evictionShadowEnabled"] and cfg["evictionPolicy"] == "confidence":
        hyb = sorted([f for f in facts if f["id"] not in protected], key=lambda f: -hybrid_score(f, cfg, now))
        hybrid_kept = protected | {f["id"] for f in hyb[:keep_count]}
        shadow = [f["id"] for f in facts if (f["id"] in kept) != (f["id"] in hybrid_kept)]
    return {"facts": [f for f in facts if f["id"] in kept], "evicted": evicted, "shadowDisagreement": shadow}


def run_lifecycle_pass(store: List[dict], inp: dict) -> dict:
    """runLifecyclePass twin: admit, reinforce, staleness, consolidation, capacity. Pure."""
    cfg = _cfg(inp.get("cfg"))
    now = inp.get("nowIso") or now_iso()
    refusals: List[str] = []
    adm = admit_facts(inp.get("proposed") or [], inp.get("runId") or "", cfg, now)
    facts = merge_facts(store or [], adm["admitted"])
    refusals.extend(f"admit: {r['reason']}" for r in adm["rejected"])
    reinf = apply_reinforcement(facts, inp.get("reinforceIds") or [], inp.get("userMessages") or [], now)
    facts = reinf["facts"]
    if reinf["ignored"]:
        refusals.append(f"reinforce: {len(reinf['ignored'])} nomination(s) ignored without a user signal")
    removed = extended = 0
    if len(select_stale_candidates(facts, cfg, now)) >= cfg["stalenessMinCandidates"] and (inp.get("stalenessDecisions") or []):
        st = apply_staleness_decisions(facts, inp["stalenessDecisions"], cfg, now)
        facts, removed, extended = st["facts"], len(st["removed"]), len(st["extended"])
        refusals.extend(f"staleness {r['id']}: {r['reason']}" for r in st["refused"])
    merged = 0
    if inp.get("consolidationProposals"):
        co = apply_consolidation(facts, inp["consolidationProposals"], cfg, now)
        facts, merged = co["facts"], len(co["mergedIds"])
        refusals.extend(f"consolidation: {r['reason']}" for r in co["refused"])
    ev = evict_to_capacity(facts, cfg, now)
    facts = ev["facts"]
    return {"facts": facts, "report": {
        "admitted": len(adm["admitted"]), "rejected": len(adm["rejected"]), "rejectedByScopeGate": adm["rejectedByScopeGate"],
        "removed": removed, "extended": extended, "merged": merged, "confirmed": len(reinf["confirmed"]),
        "evicted": len(ev["evicted"]), "shadowDisagreement": len(ev["shadowDisagreement"]),
        "refusals": refusals, "total": len(facts),
    }}


# ---------------------------------------------------------------------------------------------------------
# Relevance (memoryRetrieval.ts twin)
# ---------------------------------------------------------------------------------------------------------
_STOP = set(("a an the and or of to in for on with by from as at is are be was were this that these those it its into over under "
             "how what which who whom when where why can could should would will shall may might must do does did done not no yes vs versus "
             "about across after against along among around before behind below beneath beside between beyond but down during except inside "
             "near off out outside through toward up upon within without analyze analysis analyse deliver define identify evaluate assess "
             "report strategy strategic recommendations recommendation outlook comprehensive state current trends trend key insights insight "
             "research findings finding deliverable deck slides patterns pattern engagement engagements prior runs run industry industries "
             "organization organisation organizations business businesses company companies market markets data based using use new 2025 2026 2027").split())


def _stem(w: str) -> str:
    w2 = re.sub(r"(ations?|izations?|isations?)$", "at", w, count=1)
    w2 = re.sub(r"(ies)$", "y", w2, count=1)
    m = re.search(r"(ing|ers?|ed|es|s)$", w2)
    if m and len(w) - len(m.group(1)) >= 4:     # the TS callback measures the ORIGINAL word
        w2 = w2[:m.start()]
    return w2


def salient_terms(text: str) -> set:
    out = set()
    for raw in re.findall(r"[A-Za-z][A-Za-z0-9-]{2,}", str(text or "")):
        acronym = len(raw) >= 3 and raw == raw.upper()
        w = raw.lower()
        if not acronym and (len(w) < 4 or w in _STOP):
            continue
        if w in _STOP:
            continue
        out.add(_stem(w))
    return out


def select_memory_facts(facts: List[dict], objective: str, max_n: int = 8, min_relevance: float = 0.2, now: Optional[str] = None) -> List[dict]:
    obj = salient_terms(objective)
    if not obj or not facts:
        return []
    now_ms = _ms(now or now_iso())
    rows = []
    for f in facts:
        terms = salient_terms(f.get("content", ""))
        shared = len([t for t in terms if t in obj])
        relevance = min(1.0, shared / max(2, min(len(obj), 6)))
        age = (now_ms - _ms(f.get("lastConfirmedAt") or f.get("createdAt") or "")) / DAY_MS
        age_days = max(0.0, age) if age == age else 0.0
        recency = math.exp(-age_days / 180)
        score = relevance * (0.6 + 0.4 * (f.get("confidence") or 0)) * (0.7 + 0.3 * recency)
        if relevance >= min_relevance:
            rows.append({"fact": f, "relevance": relevance, "score": score})
    rows.sort(key=lambda r: -r["score"])
    return rows[:max_n]


def render_facts_for_injection(facts: List[dict], max_chars: int = 2400) -> str:
    ordered = sorted(facts, key=lambda f: (f.get("lastConfirmedAt") or f.get("createdAt") or "", f.get("confidence", 0)), reverse=True)
    lines, used = [], 0
    for f in ordered:
        line = f"- [{f.get('category')}] {f.get('content')}"
        if used + len(line) > max_chars:
            break
        lines.append(line)
        used += len(line) + 1
    return "\n".join(lines)


# ---------------------------------------------------------------------------------------------------------
# Store IO: cross-process lock + atomic write (several uvicorn workers share the file)
# ---------------------------------------------------------------------------------------------------------
class StoreLock:
    def __init__(self, path: str, timeout_s: float = 10.0):
        self.lock = path + ".lock"
        self.timeout_s = timeout_s
        self.fd = None

    def __enter__(self):
        deadline = time.time() + self.timeout_s
        os.makedirs(os.path.dirname(self.lock) or ".", exist_ok=True)
        while True:
            try:
                self.fd = os.open(self.lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(self.fd, str(os.getpid()).encode())
                return self
            except (FileExistsError, PermissionError):
                # PermissionError: on Windows a lock file another holder is deleting is "delete pending".
                # a lock left by a crashed worker is stale after 30 s
                try:
                    if time.time() - os.path.getmtime(self.lock) > 30:
                        os.remove(self.lock)
                        continue
                except OSError:
                    pass
                if time.time() > deadline:
                    raise TimeoutError(f"memory store lock busy: {self.lock}")
                time.sleep(0.05)

    def __exit__(self, *exc):
        try:
            if self.fd is not None:
                os.close(self.fd)
            os.remove(self.lock)
        except OSError:
            pass
        return False


def load_store(path: str) -> List[dict]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read().strip()
    if not raw:
        return []
    data = json.loads(raw)
    return [x for x in data if isinstance(x, dict) and x.get("id")] if isinstance(data, list) else []


def save_store(path: str, facts: List[dict]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(facts, f, ensure_ascii=False, indent=2)
    for attempt in range(20):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            # Windows only: a reader holding the target open blocks the rename briefly
            if attempt == 19:
                raise
            time.sleep(0.05)


def mutate_store(path: str, fn) -> Tuple[List[dict], Any]:
    """Read-modify-write under the lock. `fn(facts) -> (new_facts, result)`; the file is written only when the
    list changed."""
    with StoreLock(path):
        facts = load_store(path)
        new_facts, result = fn(facts)
        if new_facts is not None and json.dumps(new_facts, sort_keys=True) != json.dumps(facts, sort_keys=True):
            save_store(path, new_facts)
            return new_facts, result
        return facts, result
