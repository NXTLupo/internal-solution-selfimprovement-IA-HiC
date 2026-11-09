"""Agent-stack plan, fifth pass (2026-10-31): a 166 MB session autosave held the event loop for 4.3 s, so the save
now runs in a worker thread, and a faulthandler watchdog names the line whenever the loop stops running."""
from __future__ import annotations

import asyncio
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    os.environ["HIC_MEMORY_LIFECYCLE"] = "0"
    import importlib
    return importlib.import_module("app")


@pytest.fixture()
def client(app_mod, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    monkeypatch.setattr(app_mod, "SESSIONS_BASE", str(tmp_path / "sessions"))
    return TestClient(app_mod.app)


def test_save_runs_in_a_thread_and_keeps_its_contract(client, app_mod, tmp_path, monkeypatch):
    threads = []
    real = asyncio.to_thread

    async def spy(fn, *a, **k):
        threads.append(fn.__name__)
        return await real(fn, *a, **k)
    monkeypatch.setattr(app_mod.asyncio, "to_thread", spy)

    folder = tmp_path / "sessions" / "nu-coop"
    folder.mkdir(parents=True)
    (folder / "state.json").write_text(json.dumps({"file_names": ["brief.pdf"]}), encoding="utf-8")
    body = {"slug": "nu-coop", "title": "NU co-op", "sections": {
        "state": {"file_names": ["charter.pdf"], "slides": [{"id": "s1"}]},
        "chat": [{"role": "user", "content": "hi"}],
    }}
    r = client.post("/api/sessions", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] and d["slug"] == "nu-coop" and set(d["sections_written"]) >= {"metadata", "state", "chat"}
    assert threads == ["_session_save_sync"]
    state = json.loads((folder / "state.json").read_text(encoding="utf-8"))
    assert state["file_names"] == ["brief.pdf", "charter.pdf"]          # the append-only union still holds
    meta = json.loads((folder / "metadata.json").read_text(encoding="utf-8"))
    assert meta["chat_turn_count"] == 1


def test_bad_bodies_are_still_400(client):
    assert client.post("/api/sessions", content=b"{not json", headers={"Content-Type": "application/json"}).status_code == 400
    assert client.post("/api/sessions", json=["a", "list"]).status_code == 400


def test_running_jobs_scan_skips_files_no_heartbeat_can_have_touched(client, app_mod, tmp_path, monkeypatch):
    import time
    jobs = tmp_path / "_jobs"
    jobs.mkdir()
    monkeypatch.setattr(app_mod, "_JOBS_DIR", str(jobs))
    now = time.time()

    def job(jid, status, hb, age_of_file):
        p = jobs / f"{jid}.json"
        p.write_text(json.dumps({"job_id": jid, "op": "proxy_anthropic", "status": status, "hb": hb, "started_epoch": now - 30}), encoding="utf-8")
        os.utime(p, (now - age_of_file, now - age_of_file))
    job("live", "running", now - 5, 5)                 # beating: listed
    job("stale", "running", now - 300, 300)            # heartbeat gone: interrupted, not listed
    job("done", "done", now - 5, 5)                    # finished: not listed
    job("old_file", "running", now - 5, 3600)          # untouched for an hour: skipped unread
    reads = []
    real_read = app_mod._job_read
    monkeypatch.setattr(app_mod, "_job_read", lambda jid: (reads.append(jid), real_read(jid))[1])
    r = client.get("/api/jobs")
    assert r.status_code == 200
    assert [j["job_id"] for j in r.json()["running"]] == ["live"]
    assert "old_file" not in reads and "stale" not in reads


def _off_loop() -> bool:
    try:
        asyncio.get_running_loop()
        return False
    except RuntimeError:
        return True


def test_embeds_never_run_on_the_event_loop(client, app_mod, monkeypatch):
    """The watchdog's most frequent catch: a blocking 2-3 s embed HTTP call inside async handlers."""
    seen = []

    def fake_embed(texts, task_type="document"):
        seen.append(("embed", _off_loop()))
        return [[0.1, 0.2] for _ in texts]

    def fake_query(text, attempts=4):
        seen.append(("query", _off_loop()))
        return [0.1, 0.2]

    class _Store:
        def search(self, qvec, **k):
            seen.append(("search", _off_loop()))
            return []
    monkeypatch.setattr(app_mod, "_embed_texts", fake_embed)
    monkeypatch.setattr(app_mod, "_embed_query_with_retry", fake_query)
    monkeypatch.setattr(app_mod, "_get_chunk_store", lambda: _Store())
    assert client.post("/api/embed", json={"texts": ["a document"], "task_type": "document"}).json()["embeddings"] == [[0.1, 0.2]]
    assert client.post("/api/embed", json={"texts": ["a query nobody cached 2026-10-31"], "task_type": "query"}).status_code == 200
    assert client.get("/api/manifest/chunks-by-goal", params={"goal": "co-op advising", "prompt": "first search"}).status_code == 200
    assert seen == [("embed", True), ("embed", True), ("query", True), ("query", True), ("search", True)]


def test_tree_scans_are_threadpool_handlers(app_mod):
    import inspect
    for fn in (app_mod.skill_list_versions, app_mod.wiki_list, app_mod.wiki_read_batch):
        assert not inspect.iscoroutinefunction(fn), fn.__name__


def test_watchdog_rearms_faulthandler_from_the_loop(app_mod, monkeypatch):
    import faulthandler
    armed, cancelled = [], []
    monkeypatch.setattr(faulthandler, "dump_traceback_later", lambda t, **k: armed.append((t, k.get("exit"))))
    monkeypatch.setattr(faulthandler, "cancel_dump_traceback_later", lambda: cancelled.append(1))
    monkeypatch.setattr(app_mod, "_LOOP_STALL_DUMP_SEC", 2.0)

    async def run():
        task = asyncio.create_task(app_mod._loop_stall_watchdog())
        await asyncio.sleep(1.2)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    asyncio.run(run())
    assert len(armed) >= 2 and all(a == (2.0, False) for a in armed)   # re-armed every half second, never exits
    assert cancelled == [1]                                             # disarmed when the task stops
