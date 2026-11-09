"""WS-D D3 (2026-10-31): the signed inbound webhook. No secret means no endpoint; a signed request queues an
allow-listed job; unsigned, stale, replayed or forged requests are refused; the finished job's report is POSTed
to the callback, signed. The job itself is stubbed (no model call, no network)."""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

SECRET = "s3cret-for-the-test-source-0001"


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    os.environ["HIC_MEMORY_LIFECYCLE"] = "0"
    import importlib
    return importlib.import_module("app")


@pytest.fixture()
def harness(app_mod, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    # auth stays ON with a token the webhook caller does not have: the route must not need it
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "the-shared-proxy-token")
    monkeypatch.setattr(app_mod, "TELEMETRY_PATH", str(tmp_path / "events.jsonl"))
    monkeypatch.setattr(app_mod, "_WEBHOOK_SECRETS_FILE", str(tmp_path / "webhook-secrets.json"))
    monkeypatch.setenv("HIC_WEBHOOK_SECRETS", f"partner-agent:{SECRET}")
    monkeypatch.setenv("HIC_WEBHOOK_CALLBACK_HOSTS", "agent")
    monkeypatch.setattr(app_mod, "_WEBHOOK_SEEN_DIR", str(tmp_path / "webhook-seen"))
    queued, watched = [], []
    monkeypatch.setattr(app_mod, "_queue_job", lambda op, body, extra=None: queued.append((op, body, extra)) or "job_test_1")

    async def _watch(job_id, url, source, secret, max_wait_s=0):
        watched.append((job_id, url, source, secret))
    monkeypatch.setattr(app_mod, "_job_callback_watch", _watch)
    return TestClient(app_mod.app), queued, watched


def _signed(app_mod, payload, ts=None, secret=SECRET, source="partner-agent"):
    raw = json.dumps(payload).encode("utf-8")
    ts = str(int(time.time()) if ts is None else ts)
    return raw, {"Content-Type": "application/json", "X-HiC-Source": source, "X-HiC-Timestamp": ts,
                 "X-HiC-Signature": app_mod._webhook_sign(secret, ts, raw)}


JOB = {"op": "/api/artifact/generate", "body": {"kind": "recs", "goal": "g", "corpus": "c" * 300}}


def test_no_secret_means_no_endpoint(app_mod, harness, monkeypatch):
    client, queued, _ = harness
    monkeypatch.setenv("HIC_WEBHOOK_SECRETS", "")
    raw, headers = _signed(app_mod, JOB)
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 404
    assert queued == []


def test_a_signed_request_queues_the_job_without_the_proxy_token(app_mod, harness, tmp_path):
    client, queued, watched = harness
    raw, headers = _signed(app_mod, {**JOB, "callback_url": "http://agent:8500/api/webhooks/hic"})
    r = client.post("/api/webhooks/run", content=raw, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"job_id": "job_test_1", "status": "queued", "op": "/api/artifact/generate", "callback": True}
    assert queued[0][0] == "/api/artifact/generate" and queued[0][2]["source"] == "webhook:partner-agent"
    assert watched == [("job_test_1", "http://agent:8500/api/webhooks/hic", "partner-agent", SECRET)]
    events = [json.loads(l) for l in (tmp_path / "events.jsonl").read_text(encoding="utf-8").splitlines()]
    assert events[-1]["kind"] == "webhook" and events[-1]["stage"] == "accepted"


def test_unsigned_forged_stale_and_replayed_requests_are_refused(app_mod, harness):
    client, queued, _ = harness
    raw = json.dumps(JOB).encode("utf-8")
    assert client.post("/api/webhooks/run", content=raw, headers={"Content-Type": "application/json"}).status_code == 401
    raw, headers = _signed(app_mod, JOB, secret="not-the-right-secret-at-all")
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 401
    raw, headers = _signed(app_mod, JOB, source="someone-else")
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 401
    raw, headers = _signed(app_mod, JOB, ts=int(time.time()) - 3600)
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 401
    raw, headers = _signed(app_mod, JOB)
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 200
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 409
    assert len(queued) == 1


def test_a_replay_is_refused_by_every_worker(app_mod, harness, tmp_path):
    """The seen set is on disk, so a second process (a fresh import's state) refuses the same signature."""
    client, queued, _ = harness
    raw, headers = _signed(app_mod, JOB)
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 200
    sig = headers["X-HiC-Signature"]
    assert app_mod._webhook_first_use(sig) is False                      # what any other worker sees
    assert len(list((tmp_path / "webhook-seen").iterdir())) == 1


def test_only_allow_listed_ops_and_safe_callbacks(app_mod, harness):
    client, queued, _ = harness
    raw, headers = _signed(app_mod, {"op": "/api/retention/purge", "body": {}})
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 400
    raw, headers = _signed(app_mod, {**JOB, "callback_url": "http://127.0.0.1:5012/api/jobs"})
    r = client.post("/api/webhooks/run", content=raw, headers=headers)
    assert r.status_code == 400 and "callback_url refused" in r.json()["error"]
    raw, headers = _signed(app_mod, {**JOB, "callback_url": "file:///etc/passwd"})
    assert client.post("/api/webhooks/run", content=raw, headers=headers).status_code == 400
    assert queued == []


def test_the_callback_receives_a_signed_report(app_mod, tmp_path, monkeypatch):
    monkeypatch.setattr(app_mod, "TELEMETRY_PATH", str(tmp_path / "events.jsonl"))
    monkeypatch.setattr(app_mod, "_job_read", lambda job_id: {
        "job_id": job_id, "op": "/api/artifact/generate", "status": "done", "finished_at": "2026-10-31T12:00:00Z",
        "result": {"ok": True, "html": "<html/>", "artifact_id": "art_9", "launcher_url": "/api/artifact/view/art_9",
                   "run_status": "complete", "model": "claude-opus-5-5", "kind": "recs"}})
    monkeypatch.setattr(app_mod, "_job_interrupted_state", lambda st: None)
    posts = []

    class _Resp:
        status_code = 204

    class _Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, content=None, headers=None):
            posts.append((url, content, headers))
            return _Resp()

    import httpx
    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    asyncio.run(app_mod._job_callback_watch("job_x", "http://agent:8500/cb", source="partner-agent", secret=SECRET))
    url, raw, headers = posts[0]
    got = json.loads(raw)
    assert url == "http://agent:8500/cb"
    assert got["artifact_id"] == "art_9" and got["launcher_url"] == "/api/artifact/view/art_9"
    assert got["verdict"]["run_status"] == "complete"
    assert "html" not in got
    assert headers["X-HiC-Signature"] == app_mod._webhook_sign(SECRET, headers["X-HiC-Timestamp"], raw)
    events = [json.loads(l) for l in (tmp_path / "events.jsonl").read_text(encoding="utf-8").splitlines()]
    assert events[-1]["kind"] == "webhook" and events[-1]["stage"] == "callback_ok"
