"""Relevance to the person's objective, measured on this machine with the local embedding model.

A data pack returns each publication's latest items, and a word match lets through items that share only general
words with the goal (19 Nov: research on how college students use AI collected a court ruling on visas and a piece on
improv for new teachers, because they said "students" and "universities"). The objective is the measure of relevance,
never the source type, so every collected source is scored against the goal by meaning: the goal and each source's
title and opening are embedded with qwen3-embedding and compared.

Measured on that run's 20 sources: the 14 on the subject scored 0.47 to 0.72, the 4 off it 0.34 to 0.36, and the two
between were general student-success pieces. A source is kept when it scores at least KEEP, or within NEAR of the
best. Nothing is dropped when the embedding model does not answer: a filter that cannot run never removes evidence.
"""
import math

import httpx

from . import config

MODEL = "qwen3-embedding:0.6b"
# One context size for every call to the embedding model (26 Nov): Ollama reloads a model whenever a request asks for a
# different num_ctx, so the Library's embedder (2048) and an embedder asking for the default kept reloading it in turn,
# and a research run's relevance scoring timed out after 300 s while the Library was embedding.
EMBED_OPTIONS = {"num_ctx": 2048}
EMBED_KEEP = "10m"
KEEP, NEAR, MIN_KEPT = 0.45, 0.62, 6
INSTRUCT = "Instruct: Given a research goal, retrieve passages that help answer it\nQuery: "


def embed(texts):
    from . import lanes
    with lanes.card("embed"):                    # small enough to run beside a call when the card has room
        r = httpx.post(config.OLLAMA_URL + "/api/embed", json={"model": MODEL, "input": texts, "options": EMBED_OPTIONS,
                                                                "keep_alive": EMBED_KEEP}, timeout=300)
    r.raise_for_status()
    return r.json()["embeddings"]


def cosine(a, b):
    den = math.sqrt(sum(x * x for x in a) * sum(y * y for y in b))
    return sum(x * y for x, y in zip(a, b)) / den if den else 0.0


def scores(goal, texts, embed_fn=embed):
    """The similarity of each text to the goal, or None when the embedding model did not answer."""
    if not texts:
        return []
    try:
        vecs = embed_fn([INSTRUCT + str(goal)[:1200]] + [str(t)[:1400] for t in texts])
    except Exception:
        return None
    return [round(cosine(vecs[0], v), 3) for v in vecs[1:]]


def on_topic(goal, sources, protect=lambda s: False, embed_fn=embed):
    """(kept, dropped) of `sources` by relevance to the goal. A source `protect` names is always kept (what the person
    attached or asked for by name). At least MIN_KEPT stay, best first, so a narrow goal is not starved."""
    got = scores(goal, [f"{s.get('title', '')}. {str(s.get('text') or '')[:900]}" for s in sources], embed_fn)
    if got is None or not sources:
        return list(sources), []
    best = max(got)
    line = min(KEEP, NEAR * best) if best < KEEP / NEAR else KEEP
    ranked = sorted(range(len(sources)), key=lambda i: -got[i])
    keep = {i for i in ranked if got[i] >= line or protect(sources[i])}
    for i in ranked:                                     # the floor
        if len(keep) >= min(MIN_KEPT, len(sources)):
            break
        keep.add(i)
    for i, s in enumerate(sources):
        s["relevance"] = got[i]
    return [s for i, s in enumerate(sources) if i in keep], [s for i, s in enumerate(sources) if i not in keep]
