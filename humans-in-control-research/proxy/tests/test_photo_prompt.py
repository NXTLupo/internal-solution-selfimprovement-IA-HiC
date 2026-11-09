"""Slide photography (2026-10-26): the owner rejected AI-looking, futuristic slide images and asked that abstract
concepts go to the diagramming tool. The photo prompt is the five-part real-photography formula plus negatives, and a
scene writer's diagram is kept only when every label comes from the slide's own words.
"""
from __future__ import annotations

import ast
import logging
import os
import re

_PROXY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_NAMES = {"_abstract_diagram_from", "_photo_prompt", "_PHOTO_NEGATIVES", "_PHOTO_SLOT_FRAMING", "_norm_brand", "_BRAND_IDS"}


def _load():
    tree = ast.parse(open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read())
    ns = {"logger": logging.getLogger("t"), "re": re, "Optional": __import__("typing").Optional}
    for node in tree.body:
        name = getattr(node, "name", None) or (node.targets[0].id if isinstance(node, ast.Assign)
                                               and isinstance(node.targets[0], ast.Name) else None)
        if name in _NAMES:
            exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), ns)
    return ns


BUZZ = re.compile(r"\b(cinematic|8k|flawless|photorealistic|stunning|hyper-?realistic|golden[- ]hour)\b", re.I)


def test_scene_prompt_is_the_five_part_formula_with_negatives():
    ns = _load()
    scene = {"subject": "A co-op advisor reviews a printed student plan with a second-year student at a worn oak table",
             "camera": "35mm at f/2.8", "lighting": "overcast daylight through a window on the left, about 5600K",
             "environment": "a coffee ring on the desk, creased paper, a cable across the table",
             "composition": "subject in the left third, candid mid-conversation"}
    p = ns["_photo_prompt"]("Advisors and students share one readiness record", "scene", "nxt", scene)
    for part in ("worn oak table", "35mm at f/2.8", "5600K", "coffee ring", "left third"):
        assert part in p
    assert "holograms" in p and "oversaturated" in p and "plastic" in p
    assert not BUZZ.search(p.replace("Avoid:", ""))


def test_literal_fallback_prompt_also_drops_the_buzzwords():
    ns = _load()
    for slot in ("background", "portrait", "scene"):
        p = ns["_photo_prompt"]("A registrar's office counter at the start of term", slot, "nxt")
        assert not BUZZ.search(p), (slot, BUZZ.search(p))
        assert "35mm" in p and "5600K" in p


def test_abstract_diagram_keeps_only_labels_from_the_slide():
    ns = _load()
    concept = "Students, advisors and employers work from one shared readiness record with a weekly next step"
    good = {"nodes": [{"id": "a", "label": "Students"}, {"id": "b", "label": "Shared readiness record"},
                      {"id": "c", "label": "Advisors"}, {"id": "d", "label": "Employers"}],
            "edges": [{"from": "a", "to": "b"}, {"from": "c", "to": "b"}, {"from": "d", "to": "b", "label": "weekly next step"}]}
    d = ns["_abstract_diagram_from"](good, concept)
    assert d["kind"] == "flowchart" and len(d["nodes"]) == 4 and len(d["edges"]) == 3
    kinds = {n["label"]: n["kind"] for n in d["nodes"]}
    assert kinds["Shared readiness record"] == "system"
    assert kinds["Students"] == kinds["Advisors"] == kinds["Employers"] == "actor"
    same = {**good, "edges": [{**e, "label": "work from"} for e in good["edges"]]}
    assert all(e["label"] == "" for e in ns["_abstract_diagram_from"](same, concept)["edges"])
    invented = {"nodes": [{"id": "a", "label": "Quantum AI engine"}, {"id": "b", "label": "Blockchain ledger"},
                          {"id": "c", "label": "Students"}], "edges": [{"from": "a", "to": "b"}, {"from": "b", "to": "c"}]}
    assert ns["_abstract_diagram_from"](invented, concept) is None
    assert ns["_abstract_diagram_from"]("not a dict", concept) is None


def test_deck_subject_is_cut_to_its_subject_and_kept_out_of_diagram_text():
    ns = _load()
    import re as _re
    ns["_DECK_SUBJECT_RE"] = _re.compile(r"\s*Subject of the deck:\s*(.*)$", _re.I | _re.S)
    ns["_DELIVERABLE_LEAD_RE"] = _re.compile(r"^\s*(?:please\s+)?(?:generate|create|build|produce|write|draft|develop|prepare)\b.*?\b(?:for|on|about|of)\s+", _re.I)
    tree = ast.parse(open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read())
    for node in tree.body:
        if getattr(node, "name", None) == "_split_deck_subject":
            exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), ns)
    text, subject = ns["_split_deck_subject"]("Multiple campus platforms hold readiness records. Subject of the deck: Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub")
    assert text == "Multiple campus platforms hold readiness records"
    assert subject == "Northeastern University's Experiential Learning Hub"
    assert ns["_split_deck_subject"]("No subject here.") == ("No subject here.", "")


# ---- 2026-10-26: deck-aware scene variety and the image critic -------------------------------------------------------
import asyncio
import json as _json


class _FakeResp:
    def __init__(self, payload):
        self.status_code = 200
        self._p = payload
        self.text = ""

    def json(self):
        return self._p


def _fake_httpx(replies, sent):
    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, headers=None, timeout=None, json=None):
            sent.append(json)
            return _FakeResp({"candidates": [{"content": {"parts": [{"text": replies.pop(0)}]}}]})
    return type("httpx", (), {"AsyncClient": _Client})


def _load_scene(replies, sent):
    tree = ast.parse(open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read())
    names = {"_photo_scene", "_photo_scene_inner", "_DECK_SCENE_LOCKS", "_PHOTO_SCENES", "_DECK_SCENES", "_PHOTO_SLOT_FRAMING", "_split_deck_subject", "_DELIVERABLE_LEAD_RE",
             "_norm_brand", "_BRAND_IDS", "_abstract_diagram_from", "_ILLUS_VS_MODEL", "_image_critic", "_CRITIC_CACHE",
             "_IMAGE_CRITIC_MODEL", "_CRITIC_RULES", "_shrink_for_critic", "_DECK_SUBJECT_RE"}
    ns = {"logger": logging.getLogger("t"), "re": re, "json": _json, "os": os, "asyncio": asyncio, "Optional": __import__("typing").Optional,
          "httpx": _fake_httpx(replies, sent), "_goog_key_headers": lambda k, extra=None: {}, "hashlib": __import__("hashlib")}
    for node in tree.body:
        name = getattr(node, "name", None) or (node.targets[0].id if isinstance(node, ast.Assign)
                                               and isinstance(node.targets[0], ast.Name) else None)
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            name = node.target.id
        if name in names:
            exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), ns)
    return ns


def _scene_json(subject):
    return _json.dumps({"photographable": True, "subject": subject, "camera": "35mm at f/2.8",
                        "lighting": "overcast daylight", "environment": "worn counter edges", "composition": "wide view"})


def test_a_second_scene_for_the_same_deck_is_told_what_the_first_used_and_never_the_stock_props():
    os.environ.setdefault("GEMINI_API_KEY", "test")
    sent = []
    ns = _load_scene([_scene_json("A pharmacist restocks a shelf of skincare bottles"), _scene_json("A loading dock at dawn")], sent)
    deck = "Subject of the deck: NXT Humans value proposition against agency decline"
    asyncio.run(ns["_photo_scene"](f"Brand automation across The Ordinary. {deck}", "scene", "nxt", False))
    asyncio.run(ns["_photo_scene"](f"Document extraction for Canon CFS. {deck}", "scene", "nxt", False))
    first, second = sent[0]["contents"][0]["parts"][0]["text"], sent[1]["contents"][0]["parts"][0]["text"]
    assert "ALREADY USED" not in first
    assert "ALREADY USED" in second and "pharmacist restocks a shelf" in second
    for prompt in (first, second):
        assert "Never a coiled cable" in prompt and "LAST resort" in prompt
        assert "a coffee ring, a cable across the desk" not in prompt


def test_a_rejected_photo_retries_with_the_critic_reason_and_bypasses_the_memo():
    os.environ.setdefault("GEMINI_API_KEY", "test")
    sent = []
    ns = _load_scene([_scene_json("A team at a whiteboard"), _scene_json("A service counter with a queue")], sent)
    asyncio.run(ns["_photo_scene"]("Teams map the workflow", "scene", "nxt", False))
    asyncio.run(ns["_photo_scene"]("Teams map the workflow", "scene", "nxt", False, retry_note="a staged stock pose"))
    assert len(sent) == 2 and "REJECTED by the creative director: a staged stock pose" in sent[1]["contents"][0]["parts"][0]["text"]


def test_the_image_critic_refuses_on_the_judges_word_and_fails_open_without_a_judge():
    os.environ.setdefault("GEMINI_API_KEY", "test")
    sent = []
    ns = _load_scene(['{"accept": false, "kind": "collage", "reason": "A glowing globe and golden pipes read as AI art."}'], sent)
    v = asyncio.run(ns["_image_critic"](b"not-a-real-png", "source"))
    assert v["accept"] is False and v["kind"] == "collage"
    assert "futuristic" in sent[0]["contents"][0]["parts"][1]["text"]
    again = asyncio.run(ns["_image_critic"](b"not-a-real-png", "source"))   # cached: no second call
    assert again == v and len(sent) == 1
    ns2 = _load_scene([], [])
    key = os.environ.pop("GEMINI_API_KEY", None)
    try:
        assert asyncio.run(ns2["_image_critic"](b"x", "generated"))["accept"] is True
    finally:
        if key is not None:
            os.environ["GEMINI_API_KEY"] = key
