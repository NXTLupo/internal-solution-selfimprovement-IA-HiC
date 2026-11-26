"""Offline tests for IA Next's link to HiC (enhancement plan Part 2; owner decision 17 Nov: call HiC's proxy through
the host with the token HiC publishes). No network: httpx is replaced."""
import json
import os
import sys

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import app as app_module, config, hic, store, transcripts  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps({"proxyBase": "http://127.0.0.1:5012", "proxyToken": "tok-from-runtime"}), encoding="utf-8")
    monkeypatch.setattr(hic, "RUNTIME_CONFIG", str(cfg))
    monkeypatch.delenv("IA_NEXT_HIC_TOKEN", raising=False)
    yield


class FakeResponse:
    def __init__(self, status, body):
        self.status_code, self._body = status, body

    def json(self):
        return self._body


def test_the_token_comes_from_hics_runtime_config_on_each_call(monkeypatch):
    seen = []
    monkeypatch.setattr(httpx, "request", lambda method, url, headers=None, timeout=None, **kw:
                        (seen.append((method, url, headers, kw)) or FakeResponse(200, {"text": "Quarterly giving fell.", "method": "pdf"})))
    out = hic.parse_upload("report.pdf", b"%PDF-1.4 data", "application/pdf")
    assert out == {"text": "Quarterly giving fell.", "method": "pdf"}
    method, url, headers, kw = seen[0]
    assert method == "POST" and url == hic.HIC_URL + "/api/parse-upload"
    assert headers["x-proxy-token"] == "tok-from-runtime" and headers["x-hic-session"] == "ia-next"
    assert kw["json"]["filename"] == "report.pdf" and kw["json"]["mimeType"] == "application/pdf"


def test_hic_down_or_refusing_raises_a_readable_reason(monkeypatch):
    def down(*a, **k):
        raise httpx.ConnectError("refused")
    monkeypatch.setattr(httpx, "request", down)
    with pytest.raises(hic.HicUnavailable, match="HiC is not running"):
        hic.parse_upload("a.pdf", b"x")
    assert hic.available() is False
    monkeypatch.setattr(httpx, "request", lambda *a, **k: FakeResponse(401, {}))
    with pytest.raises(hic.HicUnavailable, match="token was not accepted"):
        hic.parse_upload("a.pdf", b"x")
    monkeypatch.setattr(httpx, "request", lambda *a, **k: FakeResponse(200, {"text": "", "error": "unsupported"}))
    with pytest.raises(ValueError, match="unsupported"):
        hic.parse_upload("a.pdf", b"x")


def test_documents_and_images_upload_through_hic_and_become_sources(monkeypatch):
    client = TestClient(app_module.app)
    eid = store.create_engagement("Advancement", "o")
    monkeypatch.setattr(hic, "parse_upload", lambda name, data, mime="": {"text": f"Text read from {name}.", "method": "docx"})
    r = client.post(f"/api/engagements/{eid}/uploads", files={"file": ("brief.docx", b"PK..", "application/octet-stream")})
    assert r.status_code == 200 and r.json()["read_by"] == "HiC"
    src = transcripts.uploaded_sources(eid)
    assert src[-1]["text"] == "Text read from brief.docx." and src[-1]["kind"] == "document"


def test_without_hic_a_document_upload_says_why_and_text_still_works(monkeypatch):
    client = TestClient(app_module.app)
    eid = store.create_engagement("Advancement", "o")

    def down(*a, **k):
        raise hic.HicUnavailable("HiC is not running, so this needs the suite")
    monkeypatch.setattr(hic, "parse_upload", down)
    r = client.post(f"/api/engagements/{eid}/uploads", files={"file": ("scan.pdf", b"%PDF-", "application/pdf")})
    assert r.status_code == 503 and "HiC is not running" in r.json()["detail"] and "still work" in r.json()["detail"]
    r = client.post(f"/api/engagements/{eid}/uploads", files={"file": ("notes.txt", b"Donors want fewer asks.", "text/plain")})
    assert r.status_code == 200
    monkeypatch.setattr(hic, "parse_upload", lambda *a, **k: (_ for _ in ()).throw(ValueError("no readable text")))
    assert client.post(f"/api/engagements/{eid}/uploads", files={"file": ("blank.png", b"\x89PNG", "image/png")}).status_code == 422
    assert client.post(f"/api/engagements/{eid}/uploads", files={"file": ("app.exe", b"MZ", "application/octet-stream")}).status_code == 415


# ---- data packs (Part 2) ------------------------------------------------------------------------------------
LONG = " ".join(["Nurse staffing ratios and retention bonuses shaped hospital turnover in 2026."] * 30)


def _fake_hic(calls):
    def call(method, path, timeout, **kw):
        calls.append(path)
        if path == "/api/source-packs/healthcare":
            return {"sourceIds": ["hc_aha_news", "hc_ama_news", "hc_misc"]}
        if path == "/api/multi-search":
            return {"results": [
                {"source": "AHA News", "credibilityTier": 1, "items": [
                    {"title": "Hospitals expand nurse retention programs", "url": "https://www.aha.org/news/1", "date": "2026-10-02", "content": LONG}]},
                {"source": "AMA News", "credibilityTier": 2, "items": [
                    {"title": "Physician pay update", "url": "https://www.ama-assn.org/x", "date": "2026-09-01", "content": "Pay scales."}]},
                {"source": "Misc", "credibilityTier": 3, "items": [{"title": "Nurse staffing", "url": "http://insecure.example/x", "content": LONG}]},
            ]}
        raise AssertionError(path)
    return call


def test_pack_items_are_ranked_by_relevance_and_keep_only_secure_links(monkeypatch):
    calls = []
    monkeypatch.setattr(hic, "_call", _fake_hic(calls))
    items = hic.pack_items(["healthcare", "not_a_pack"], "nurse staffing retention")
    assert [i["url"] for i in items] == ["https://www.aha.org/news/1"]          # irrelevant and http:// items are left out
    assert items[0]["publisher"] == "AHA News" and items[0]["pack"] == "healthcare" and items[0]["date"] == "2026-10-02"
    assert calls == ["/api/source-packs/healthcare", "/api/multi-search"]


def test_research_collects_from_the_chosen_packs_before_the_web(monkeypatch):
    from ia_next import providers, studio
    calls = []
    monkeypatch.setattr(hic, "_call", _fake_hic(calls))
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("summary", None, {"candidates": [{"groundingMetadata": {
        "groundingChunks": [{"web": {"uri": "https://news.example/a", "title": "Web article"}}]}}]}))
    monkeypatch.setattr(studio, "_page_text", lambda url: (LONG, url))
    monkeypatch.setattr("ia_next.library.seed_sources", lambda *a, **k: [])
    eid = store.create_engagement("Nursing", "o")
    brief = {"goal": "nurse staffing retention", "scope": "US hospitals 2026", "audience": "CNO", "packs": ["healthcare"]}
    _, summary, sources = studio.research_lead(eid, brief, providers.Ledger(limit_usd=1))
    assert sources[0]["title"] == "AHA News: Hospitals expand nurse retention programs" and sources[0]["pack"] == "healthcare"
    assert sources[1]["url"] == "https://news.example/a" and "1 kept from HiC data packs (Healthcare & Life Sciences 1; chosen by the agent; 3 of 3 sources searched" in summary


def test_research_without_hic_skips_the_packs_and_still_searches_the_web(monkeypatch):
    from ia_next import providers, studio

    def down(*a, **k):
        raise hic.HicUnavailable("HiC is not running, so this needs the suite")
    monkeypatch.setattr(hic, "_call", down)
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("summary", None, {"candidates": [{"groundingMetadata": {
        "groundingChunks": [{"web": {"uri": "https://news.example/a", "title": "Web article"}}]}}]}))
    monkeypatch.setattr(studio, "_page_text", lambda url: (LONG, url))
    monkeypatch.setattr("ia_next.library.seed_sources", lambda *a, **k: [])
    eid = store.create_engagement("Nursing", "o")
    _, summary, sources = studio.research_lead(eid, {"goal": "g", "scope": "s", "audience": "a", "packs": ["healthcare"]},
                                               providers.Ledger(limit_usd=1))
    assert [s["url"] for s in sources] == ["https://news.example/a"] and "data packs skipped: HiC is not running" in summary


def test_the_research_tool_passes_known_packs_into_the_brief(monkeypatch):
    from ia_next import agent, studio
    started = []
    monkeypatch.setattr(studio, "start_research_task", lambda eid, brief, budget, idem: (started.append(brief) or ("task_x", True)))
    args = {"engagement_title": "t", "engagement_id": "", "audience": "a", "goal": "g", "scope": "s", "structure": "st",
            "constraints": "c", "success": [], "budget_usd": 1.0, "new_research_confirmed": False, "packs": ["healthcare", "made_up"]}
    agent.execute_tool("start_research_report", args)
    assert started[0]["packs"] == ["healthcare"]
    spec = next(t for t in agent.TOOLS if t["name"] == "start_research_report")
    assert "packs" in spec["input_schema"]["required"] and "healthcare" in spec["description"]
