"""Job heartbeat (2026-10-25): a proxy restart killed a running deck job and its state file said
"running" forever, so the browser polled one reformat for 19 minutes. A running job now carries a
heartbeat; a poll that finds a stale one answers interrupted (HTTP 503) and the client resubmits.
"""
from __future__ import annotations

import ast
import asyncio
import json
import logging
import os
import re
import sys
import threading
import time

import pytest

_PROXY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

_NAMES = {"_job_path", "_job_write", "_job_read", "_JobHeartbeat", "_job_interrupted_state", "_run_job",
          "_JOB_STALE_S"}


class _FakeJSONResponse:
    def __init__(self, body: dict, status_code: int = 200):
        self.body = json.dumps(body).encode("utf-8")
        self.status_code = status_code


def _load(tmp_path, heartbeat_s=0.05):
    """Exec the job-store pieces of app.py without importing the app (importing boots FastAPI)."""
    tree = ast.parse(open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read())
    ns = {"logger": logging.getLogger("t"), "os": os, "re": re, "json": json, "time": time, "threading": threading,
          "asyncio": asyncio, "Optional": __import__("typing").Optional, "JSONResponse": _FakeJSONResponse,
          "_synthetic_request": lambda op, body: body}
    for node in tree.body:
        name = getattr(node, "name", None) or (node.targets[0].id if isinstance(node, ast.Assign)
                                               and isinstance(node.targets[0], ast.Name) else None)
        if name in _NAMES:
            exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), ns)
    ns["_JOBS_DIR"] = str(tmp_path)
    ns["_JOB_HEARTBEAT_S"] = heartbeat_s
    return ns


def _running(ns, job_id):
    state = {"job_id": job_id, "op": "/x", "status": "running", "started_epoch": time.time(), "hb": time.time()}
    ns["_job_write"](job_id, state)
    return state


def test_fresh_heartbeat_is_alive_stale_one_is_interrupted(tmp_path):
    ns = _load(tmp_path)
    alive = {"status": "running", "hb": time.time()}
    assert ns["_job_interrupted_state"](alive) is None
    dead = ns["_job_interrupted_state"]({"status": "running", "hb": time.time() - ns["_JOB_STALE_S"] - 1})
    assert dead["status"] == "error" and dead["http_status"] == 503 and "interrupted" in dead["error"]
    assert ns["_job_interrupted_state"]({"status": "done", "hb": 0}) is None


def test_legacy_running_job_without_heartbeat_is_interrupted(tmp_path):
    # The live orphan: {"status": "running", "started_at": ...} written before the heartbeat existed.
    ns = _load(tmp_path)
    dead = ns["_job_interrupted_state"]({"job_id": "job_1", "status": "running", "started_at": "2026-10-26T01:20:23Z"})
    assert dead["http_status"] == 503 and dead["job_id"] == "job_1"


def test_run_job_beats_while_running_and_final_state_wins(tmp_path):
    ns = _load(tmp_path, heartbeat_s=0.05)
    seen = []

    async def handler(_req):
        first = ns["_job_read"]("job_a")["hb"]
        await asyncio.sleep(0.3)
        seen.append(ns["_job_read"]("job_a")["hb"] > first)
        return _FakeJSONResponse({"ok": True}, 200)

    ns["handler_a"] = handler
    ns["_JOB_OPS"] = {"/x": "handler_a"}
    state = _running(ns, "job_a")
    beat = ns["_JobHeartbeat"]("job_a", state)
    beat.thread.start()
    asyncio.run(ns["_run_job"]("job_a", "/x", {}, beat))
    assert seen == [True], "the heartbeat thread did not advance hb while the handler ran"
    time.sleep(0.2)  # a late beat must never overwrite the final state
    final = ns["_job_read"]("job_a")
    assert final["status"] == "done" and final["result"] == {"ok": True}
    assert not beat.thread.is_alive()


def test_cancelled_job_records_interrupted_instead_of_running(tmp_path):
    ns = _load(tmp_path)

    async def handler(_req):
        raise asyncio.CancelledError()

    ns["handler_b"] = handler
    ns["_JOB_OPS"] = {"/x": "handler_b"}
    state = _running(ns, "job_b")
    beat = ns["_JobHeartbeat"]("job_b", state)
    beat.thread.start()
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(ns["_run_job"]("job_b", "/x", {}, beat))
    final = ns["_job_read"]("job_b")
    assert final["status"] == "error" and final["http_status"] == 503
