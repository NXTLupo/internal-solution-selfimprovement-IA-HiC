"""WS-D D1 (2026-10-31): the thread registry, routing, placement and persistence (pure; no network)."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import threads as thr  # noqa: E402

JOB = "job_1793460208032_4efdb51f"


def test_route_by_job_id_then_by_engagement():
    reg = {
        "A": {"id": "A", "job_ids": [JOB], "engagement": "exec-search-2026", "updated_at": "2026-10-31T10:00:00Z"},
        "B": {"id": "B", "job_ids": [], "engagement": "retail-ai-2026", "updated_at": "2026-10-31T11:00:00Z"},
    }
    assert thr.route_message(reg, "NEW", f"is {JOB} finished yet?") == "A"
    assert thr.route_message(reg, "NEW", "what did retail-ai-2026 conclude about conversion?") == "B"
    assert thr.route_message(reg, "A", f"is {JOB} finished yet?") is None       # already in the owning thread
    assert thr.route_message(reg, "NEW", "a brand new question") is None


def test_placement_policy_names_local_and_cloud():
    assert thr.placement_for_tools(["run_deliverable", "reddit_search"]) == "cloud"
    assert thr.placement_for_tools(["run_deliverable", "computer_use_click"]) == "local"
    assert thr.placement_for_tools([]) == "cloud"


def test_upsert_accumulates_ownership_and_location():
    reg = {}
    row = thr.upsert_thread(reg, "A", user_message="Build a deck on executive search", tools=["run_deliverable"], job_ids=[JOB], engagement="exec-search-2026")
    assert row["title"].startswith("Build a deck") and row["job_ids"] == [JOB] and row["location"] == "cloud" and row["turns"] == 1
    row = thr.upsert_thread(reg, "A", user_message="and open it in the browser", tools=["browser_open"], job_ids=[JOB, "job_1793460208999_aaaaaaaa"])
    assert row["job_ids"] == [JOB, "job_1793460208999_aaaaaaaa"] and row["location"] == "local" and row["turns"] == 2
    assert row["engagement"] == "exec-search-2026"


def test_extractors():
    res = {"result": {"content": [{"text": "queued"}], "job_id": JOB, "nested": [{"jobId": "job_1793460211111_bbbbbbbb"}]}}
    assert thr.extract_job_ids(res) == [JOB, "job_1793460211111_bbbbbbbb"]
    assert thr.extract_engagement({"engagement": "exec-search-2026"}) == "exec-search-2026"
    assert thr.extract_engagement({"run_id": "run_abc123"}, {"slug": "job_123456"}) == ""


def test_registry_and_conversation_survive_a_restart(tmp_path):
    base = str(tmp_path)
    reg = {}
    thr.upsert_thread(reg, "A", user_message="hello", job_ids=[JOB])
    thr.save_registry(reg, base)
    thr.save_conversation("A", {"id": "A", "messages": [{"role": "user", "content": "hello"}], "file_mappings": {}, "journey_mappings": {}}, base)
    # a fresh process reads the same files
    assert thr.load_registry(base)["A"]["job_ids"] == [JOB]
    assert thr.load_conversation("A", base)["messages"][0]["content"] == "hello"
    assert thr.load_conversation("missing", base) is None
    assert thr.safe_id("../../etc/passwd") == ".._.._etc_passwd"
