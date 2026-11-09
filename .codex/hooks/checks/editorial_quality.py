"""editorial_quality — E2 gate (2026-07-02, artifact-total-elevation plan).

Deck-level editorial audit of a slide-bearing artifact. Prompt rules demonstrably leak (the 2026-07-02
live deck shipped antithesis titles, a banned metaphor, six slides with one identical citation line, a
reused verbatim quote, and four slides with no judgment title), so the deck level is gated here.

FAILURES (objective defects -> block when non-shadow):
  1. banned rhetorical patterns surviving in titles/leads ("X, not Y" antithesis; metaphor list)
  2. duplicate verbatim quotes across slides
  3. citation monotony: one citation string on > 35% of content slides (evidence-diversity floor)
WARNINGS (judgment calls; U4 ramp - shadow first):
  4. judgment-title rate: titles that read as topic labels (no verb / ALL-CAPS label / trailing colon)

Accepts an AIR dict (walks artifactPayload for slides), a slides array, or raw text (patterns only).
"""
from __future__ import annotations

import json
import re
from typing import Any

_ANTITHESIS_RE = re.compile(r"^[\"“]?[A-Z][^,.:;]{2,90}?,\s+not\s+(?:just\s+|only\s+|merely\s+)?(?:a|an|the)?\s?[^,.:;]{2,60}\.?[\"”]?$")
_METAPHOR_RE = re.compile(r"\bopen(?:s|ed)? the door\b|\bearn(?:s|ed)? the right\b|\btrust ceiling\b|\bwhere value leaks\b|\bredraw(?:s|ing)? the map\b", re.IGNORECASE)
_ALLCAPS_LABEL_RE = re.compile(r"^[A-Z0-9 &/\-·:]{3,60}$")
# a judgment title contains a finite-verb-ish token; cheap heuristic list of common verbs/auxiliaries
_VERBISH_RE = re.compile(
    r"\b(is|are|was|were|has|have|had|do|does|did|can|cannot|must|will|won't|force|forces|forced|leave|leaves|"
    r"left|drive|drives|drove|turn|turns|turned|fail|fails|failed|need|needs|needed|erode|erodes|make|makes|"
    r"made|cost|costs|push|pushes|pushed|stall|stalls|stalled|prevent|prevents|block|blocks|create|creates|"
    r"depend|depends|convert|converts|generate|generates|outpace|outpaces|recover|recovers|treat|treats|"
    r"settle|settles|carry|carries|win|wins|lose|loses|beat|beats|start|starts|end|ends|remain|remains|"
    r"become|becomes|require|requires|deliver|delivers|expose|exposes|shape|shapes|threaten|threatens|"
    r"accept|accepts|ignore|ignores|change|changes|grow|grows|shrink|shrinks|hold|holds|break|breaks|"
    r"raise|raises|lower|lowers|cut|cuts|add|adds|earn|earns|misselect|abandon|abandons|decode|decodes|"
    r"conflict|conflicts|define|defines|defined|describe|describes|enable|enables|enabled|reduce|reduces|"
    r"increase|increases|improve|improves|limit|limits|align|aligns|separate|separates|connect|connects|"
    r"match|matches|maintain|maintains|support|supports|lack|lacks|miss|misses|waste|wastes|spend|spends|"
    r"pay|pays|buy|buys|sell|sells|report|reports|show|shows|reveal|reveals|signal|signals|mean|means|"
    r"matter|matters|work|works|operate|operates|scale|scales|compete|competes|overlap|overlaps|"
    r"undermine|undermines|strengthen|strengthens|weaken|weakens|accelerate|accelerates|delay|delays|"
    r"outperform|outperforms|trail|trails|dominate|dominates|capture|captures|surface|surfaces|"
    r"originate|originates|absorb|absorbs|shift|shifts|move|moves|keep|keeps|stay|stays|come|comes|go|goes)\b",
    re.IGNORECASE,
)

_MONOTONY_FRACTION = 0.35   # no single citation string may carry more than this share of content slides


def _slides_from_fenced_text(text: str) -> list:
    """Parse :::slide fenced JSON blocks out of a chat-reply string (the #slides payload shape:
    artifactPayload = {kind, content} where content carries the fences). Fences close tight against
    the JSON ('}:::' with no newline), so parse by brace-slicing each ':::slide' segment."""
    out = []
    for seg in (text or "").split(":::slide")[1:]:
        # segment = ' template=... brand=...\n{ json }::: (next fence or end)'
        start = seg.find("{")
        end = seg.rfind("}", 0, seg.find(":::") if ":::" in seg else len(seg))
        if end == -1:
            end = seg.rfind("}")
        if start == -1 or end <= start:
            continue
        raw = seg[start:end + 1]
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict):
                # carry the fence template attr so section-divider/cover slides can be skipped
                m = re.match(r"\s*template=([\w:.-]+)", seg)
                if m and "template" not in obj:
                    obj["template"] = m.group(1)
                out.append(obj)
        except Exception:
            continue   # unparseable fence - the schema gates catch that class
    return out


def _walk_slides(target: Any) -> list:
    """Extract a slides list from an AIR dict / wrapper / fenced text / bare array. Best-effort."""
    if isinstance(target, list):
        return [s for s in target if isinstance(s, dict)]
    if isinstance(target, str):
        return _slides_from_fenced_text(target)
    if isinstance(target, dict):
        payload = target.get("artifactPayload", target)
        if isinstance(payload, str):
            fenced = _slides_from_fenced_text(payload)
            if fenced:
                return fenced
            try:
                payload = json.loads(payload)
            except Exception:
                return []
        if isinstance(payload, dict):
            for key in ("slides", "deck", "data"):
                v = payload.get(key)
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    return v
                if isinstance(v, dict) and isinstance(v.get("slides"), list):
                    return [s for s in v["slides"] if isinstance(s, dict)]
            # #slides chat shape: {kind, content} with :::slide fences in content
            c = payload.get("content")
            if isinstance(c, str):
                return _slides_from_fenced_text(c)
            # HTML-artifact shape: {kind, html} - no slides; patterns-only audit applies
        if isinstance(payload, list):
            return [s for s in payload if isinstance(s, dict)]
    return []


def _title_is_topic_label(title: str) -> "str | None":
    t = (title or "").strip()
    if not t:
        return None   # empty handled by schema checks, not editorial
    if _ALLCAPS_LABEL_RE.match(t) and len(t.split()) <= 6:
        return "ALL-CAPS topic label"
    if t.endswith(":"):
        return "trailing-colon label"
    words = t.split()
    if len(words) < 4:
        return "too short to state a judgment"
    if not _VERBISH_RE.search(t):
        return "no verb (reads as a topic, not a judgment)"
    return None


def check(target: Any, ctx: dict | None = None) -> dict:
    failures: list[str] = []
    warnings: list[str] = []
    shadow = True
    if isinstance(target, dict):
        qr = target.get("qualityReport") or {}
        shadow = qr.get("shadowMode", True) is not False

    slides = _walk_slides(target)
    text = target if isinstance(target, str) else json.dumps(target, ensure_ascii=False)

    # 1. banned rhetorical patterns (whole-artifact scan; also per-title below)
    metaphors = _METAPHOR_RE.findall(text)
    if metaphors:
        failures.append(f"{len(metaphors)} banned metaphor(s) ({', '.join(sorted(set(m.lower() for m in metaphors))[:4])}) - state the literal mechanism instead")

    quotes_seen: dict[str, int] = {}
    citation_count: dict[str, int] = {}
    label_titles: list[str] = []
    content_slides = 0

    for s in slides:
        title = str(s.get("title") or "")
        tpl = str(s.get("template") or "").lower()
        if any(t in tpl for t in ("section-divider", "cover", "agenda", "divider")):
            continue
        content_slides += 1
        if title and _ANTITHESIS_RE.match(title.strip()):
            failures.append(f'antithesis title survived post-processing: "{title[:90]}"')
        reason = _title_is_topic_label(title)
        if reason:
            label_titles.append(f'"{title[:70]}" ({reason})')
        q = str(s.get("quote") or "").strip().lower()
        if len(q) >= 25:
            quotes_seen[q] = quotes_seen.get(q, 0) + 1
        for src in (s.get("sources") or []):
            k = str(src).strip().lower()
            if k:
                citation_count[k] = citation_count.get(k, 0) + 1

    dupes = [q for q, n in quotes_seen.items() if n > 1]
    if dupes:
        failures.append(f"{len(dupes)} verbatim quote(s) reused across slides - every slide cites distinct evidence")

    if content_slides >= 6:
        for cite, n in citation_count.items():
            if n / content_slides > _MONOTONY_FRACTION:
                failures.append(
                    f'citation monotony: "{cite[:70]}" carries {n}/{content_slides} content slides '
                    f"(> {int(_MONOTONY_FRACTION * 100)}% floor) - diversify evidence across the ledger"
                )

    if label_titles:
        rate = 1 - (len(label_titles) / max(1, content_slides))
        warnings.append(
            f"judgment-title rate {round(rate * 100)}%: {len(label_titles)}/{content_slides} title(s) read as topic labels: "
            + "; ".join(label_titles[:5])
        )

    ok = True if shadow else (len(failures) == 0)
    return {
        "ok": ok,
        "blocking": (not shadow) and len(failures) > 0,
        "severity": "review" if shadow else ("block" if failures else "ok"),
        "shadowMode": shadow,
        "slides_audited": content_slides,
        "failures": failures,
        "warnings": warnings,
    }
