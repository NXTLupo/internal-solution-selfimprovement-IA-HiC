"""The Sources panel shows what an engagement really reads (2026-11-19 review): Reddit listening appears as one grouped
row instead of "No sources yet", a page stored under its bare domain gets a readable title from its address, a page
collected twice says which source it repeats, and older work without a check record is not an error. Offline."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, secondbrain, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    monkeypatch.setattr("ia_next.transcripts.uploaded_sources", lambda eid: [])
    yield


def _write(eid, rel, data):
    with open(store.safe_path(eid, rel), "w", encoding="utf-8") as fh:
        json.dump(data, fh)


def test_reddit_listening_is_one_grouped_row_with_its_window_and_page():
    eid = store.create_engagement("AI on r/NEU", "o")
    _write(eid, "results/social_sources.json", {"query": "AI", "subreddits": ["NEU"], "start": "2026-08-17", "end": "2026-11-17",
                                                "engine": "social-research", "sources": [{"id": "S1"}, {"id": "S2"}]})
    _write(eid, "results/social.json", {"engine": {"page": "http://localhost:3000/topic-modeling/p1"}})
    rows = secondbrain.overview(eid)
    assert len(rows) == 1 and rows[0]["group"] is True and rows[0]["origin"] == "reddit"
    assert rows[0]["title"] == "Reddit listening: r/NEU" and rows[0]["count"] == 2
    assert rows[0]["date"] == "2026-08-17 to 2026-11-17" and rows[0]["url"].endswith("/topic-modeling/p1")
    assert "Social Research" in rows[0]["guide"]["summary"]


def test_a_domain_only_title_reads_from_the_address_and_a_repeated_page_names_its_twin():
    eid = store.create_engagement("e", "o")
    _write(eid, "results/sources.json", {"sources": [
        {"id": "S1", "title": "huntnewsnu.com", "url": "https://huntnewsnu.com/2026/11/students-weigh-ai-tools-in-class/", "text": "x"},
        {"id": "S2", "title": "huntnewsnu.com", "url": "https://huntnewsnu.com/2026/11/students-weigh-ai-tools-in-class", "text": "x"},
        {"id": "S3", "title": "A real headline", "url": "https://example.org/a", "text": "x"}]})
    rows = {r["id"]: r for r in secondbrain.overview(eid)}
    assert rows["S1"]["title"] == "huntnewsnu.com: Students weigh ai tools in class"
    assert rows["S2"]["same_as"] == "S1" and rows["S1"]["same_as"] == "" and rows["S3"]["title"] == "A real headline"


def test_each_chat_names_the_engagements_it_worked_in():
    """2026-11-19 (owner): chats, engagements and work were three confusing places. An engagement's flyout lists its
    chats, so each listed chat names the engagements of the files attached in it and of the work it started."""
    a = store.create_engagement("A", "o")
    b = store.create_engagement("B", "o")
    tid, _ = store.create_task(b, "deck", {}, 1.0)
    store.save_conversation("conv_aaaaaaaaaaaa", [
        {"type": "user", "text": "Analyze this"},
        {"type": "files", "files": [{"engagement_id": a, "source_id": "S1"}]},
        {"type": "agent", "rec": {"started": [tid], "tasks": [tid]}}])
    store.save_conversation("conv_bbbbbbbbbbbb", [{"type": "user", "text": "What can you do?"}])
    rows = {c["id"]: c for c in store.list_conversations()}
    assert rows["conv_aaaaaaaaaaaa"]["engagements"] == [b, a]          # most recent first
    assert rows["conv_bbbbbbbbbbbb"]["engagements"] == []


def test_older_work_without_a_check_record_answers_without_an_error():
    from fastapi.testclient import TestClient
    from ia_next import app as app_module
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "research_report", {}, 1.0)
    r = TestClient(app_module.app).get(f"/api/tasks/{tid}/verification")
    assert r.status_code == 200 and r.json() == {"verified": False}
    assert TestClient(app_module.app).get("/api/tasks/task_nope/verification").status_code == 404
