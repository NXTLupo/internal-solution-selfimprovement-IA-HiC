#!/usr/bin/env python3
"""
Canonical anti-slop lexicon loader (2026-06-14, Field Guide Rule 99).

The SINGLE SOURCE OF TRUTH is hic-workspace/wiki/frameworks/anti-slop-lexicon.json.
Every NEW writing-quality hook imports its lists/regex from here instead of redefining
them inline (the 5-6 divergent copies the 2026-06-14 audit found). Legacy hooks migrate
to this loader incrementally; never add a banned term to a hook inline again.

Fail-soft: if the JSON is missing/unreadable, returns empty structures so a hook degrades
to a no-op rather than crashing the Stop bus.
"""
import json
import os
import re
import functools

_CANDIDATE_PATHS = [
    # repo-root-relative (hooks run from the workbench root)
    "humans-in-control-research/hic-workspace/wiki/frameworks/anti-slop-lexicon.json",
    "hic-workspace/wiki/frameworks/anti-slop-lexicon.json",
    # absolute fallbacks
    os.path.join(os.path.dirname(__file__), "..", "..", "..",
                 "humans-in-control-research", "hic-workspace", "wiki", "frameworks", "anti-slop-lexicon.json"),
]


@functools.lru_cache(maxsize=1)
def load_lexicon():
    for p in _CANDIDATE_PATHS:
        try:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            continue
    return {}


def tier1_words():
    return load_lexicon().get("tier1_always", {}).get("words", [])


def tier2_words():
    return load_lexicon().get("tier2_cluster", {}).get("words", [])


def tier2_threshold():
    return load_lexicon().get("tier2_cluster", {}).get("cluster_threshold", 2)


def multiword_phrases():
    lex = load_lexicon()
    out = []
    for k in ("multiword_banned", "copula_inflation"):
        out += lex.get(k, {}).get("phrases", [])
    return out


def openers():
    return load_lexicon().get("openers_banned", {}).get("phrases", [])


def closers():
    return load_lexicon().get("closers_banned", {}).get("phrases", [])


def structural_regex():
    """Return {name: compiled_regex} for the structural tells."""
    raw = load_lexicon().get("structural_regex", {})
    out = {}
    for k, v in raw.items():
        if k.startswith("_") or not isinstance(v, str):
            continue
        try:
            out[k] = re.compile(v)
        except re.error:
            continue
    return out


# --- sanitization (Field Guide Rule 97): strip code/quotes/URLs/[CHUNK] before scanning
_CODE_FENCE = re.compile(r"```[\s\S]*?```")
_INLINE_CODE = re.compile(r"`[^`]+`")
_MD_LINK = re.compile(r"\[[^\]]+\]\([^)]+\)")
_URL = re.compile(r"https?://\S+")
_CHUNK = re.compile(r"\[CHUNK_[A-Z0-9_]+\]|\[[^\]]*\.md#c\d+\]")
_DQUOTE = re.compile(r"“[^”]*”|\"[^\"]{0,400}\"")


def sanitize(text):
    """Remove code, inline code, links, URLs, chunk pointers, and quoted source text so a
    banned word inside a real quotation or a JSON field is not a false positive."""
    if not isinstance(text, str):
        return ""
    t = _CODE_FENCE.sub(" ", text)
    t = _INLINE_CODE.sub(" ", t)
    t = _MD_LINK.sub(" ", t)
    t = _URL.sub(" ", t)
    t = _CHUNK.sub(" ", t)
    t = _DQUOTE.sub(" ", t)
    return t
