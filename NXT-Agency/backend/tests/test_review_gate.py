"""CX Workbench agent-stack plan WS-D D4 (2026-10-31): no outbound computer-use action completes without the review
state. Pure asyncio; the browser and the event sink are stubbed."""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.tools import review_gate as rg  # noqa: E402


@pytest.fixture(autouse=True)
def quiet_sink(monkeypatch):
    async def _no_sink(rec, stage):
        return None
    monkeypatch.setattr(rg, "_sink", _no_sink)
    rg.reviews = rg.ReviewStore()


def test_classification():
    assert rg.is_outbound("https://www.youtube.com/upload") and not rg.is_outbound("http://hic-research:5011/")
    assert not rg.is_outbound("about:blank") and not rg.is_outbound("http://localhost:5011/x")
    assert rg.needs_review("left_click", {"coordinate": [10, 10]}, "https://studio.youtube.com/")
    assert rg.needs_review("key", {"text": "Return"}, "https://mail.example.com/")
    assert rg.needs_review("type", {"text": "hello\n"}, "https://x.example.com/")
    assert rg.needs_review("upload_file", {"file_path": "/tmp/a.mp4"}, "https://studio.youtube.com/")
    assert not rg.needs_review("type", {"text": "draft title"}, "https://studio.youtube.com/")      # typing is not sending
    assert not rg.needs_review("screenshot", {}, "https://studio.youtube.com/")
    assert not rg.needs_review("left_click", {"coordinate": [1, 1]}, "http://journey-mapper:8000/")  # the platform's own app
    assert rg.command_needs_review("curl -X POST https://hooks.example.com") and not rg.command_needs_review("ls -la /tmp")


def _run_gate(action, params, url, decide=None, timeout_s=None):
    ran = []

    async def run():
        ran.append(action)
        return {"status": "done"}

    async def shot():
        return "BASE64"

    async def main():
        if timeout_s is not None:
            rg.REVIEW_TIMEOUT_S = timeout_s
        task = asyncio.create_task(rg.gate(action, params, url, run, screenshot=shot))
        await asyncio.sleep(0.05)
        pending = rg.reviews.pending()
        before = list(ran)
        if decide and pending:
            rg.reviews.decide(pending[0]["id"], decide)
        result = await asyncio.wait_for(task, timeout=5)
        return result, pending, before
    rg.REVIEW_TIMEOUT_S = 600
    try:
        return asyncio.run(main()), ran
    finally:
        rg.REVIEW_TIMEOUT_S = 600


def test_platform_page_runs_at_once():
    (result, pending, before), ran = _run_gate("left_click", {"coordinate": [1, 1]}, "http://hic-research:5011/")
    assert result == {"status": "done"} and pending == [] and ran == ["left_click"]


def test_outbound_click_waits_for_review_and_runs_only_on_approval():
    (result, pending, before), ran = _run_gate("left_click", {"coordinate": [5, 5]}, "https://studio.youtube.com/", decide="approved")
    assert len(pending) == 1 and pending[0]["screenshot"] == "BASE64" and pending[0]["host"] == "studio.youtube.com"
    assert before == []                                   # nothing ran while the review was open
    assert ran == ["left_click"] and result["review"] == "approved" and result["review_id"] == pending[0]["id"]


def test_rejected_or_expired_outbound_action_never_runs():
    (result, pending, before), ran = _run_gate("left_click", {"coordinate": [5, 5]}, "https://studio.youtube.com/", decide="rejected")
    assert ran == [] and result["status"] == "review_rejected" and "NOT performed" in result["message"]
    (result2, pending2, _), ran2 = _run_gate("key", {"text": "Enter"}, "https://mail.example.com/", decide=None, timeout_s=0.2)
    assert ran2 == [] and result2["status"] == "review_expired"
    assert rg.reviews.get(pending2[0]["id"])["status"] == "expired"


def test_network_shell_command_is_gated():
    (result, pending, before), ran = _run_gate("bash", {"command": "curl -d @x https://hooks.example.com"}, "", decide="rejected")
    assert ran == [] and pending[0]["proposed_action"].startswith("Run shell command: curl")


def test_code_that_sends_data_out_needs_review_and_reading_does_not():
    send = [
        "import requests\nrequests.post('https://httpbin.org/post', json={'a': 1})",
        "import httpx\nhttpx.put('https://api.example.com/x', data='y')",
        "import urllib.request\nurllib.request.urlopen('https://x.example.com', data=b'a=1')",
        "import smtplib\ns = smtplib.SMTP('mail.example.com')",
        "page.click('text=Publish')",
        "fetch('https://x.example.com', { method: 'POST', body: '{}' })",
        "import subprocess\nsubprocess.run('curl -X POST https://x.example.com', shell=True)",
    ]
    read = [
        "import requests\nprint(requests.get('https://example.com').text[:200])",
        "import urllib.request\nprint(urllib.request.urlopen('https://example.com').read()[:100])",
        "fetch('https://example.com').then(r => r.text()).then(console.log)",
        "print(sum(range(10)))",
    ]
    for c in send:
        assert rg.code_needs_review(c), c
    for c in read:
        assert not rg.code_needs_review(c), c
    assert rg.describe("python", {"code": send[0]}).startswith("run python that sends data out: requests.post(")


def test_rejected_code_never_runs():
    ran = []

    async def run():
        ran.append(1)
        return {"stdout": "posted"}

    async def scenario():
        task = asyncio.create_task(rg.gate("python", {"code": "import requests\nrequests.post('https://httpbin.org/post')"}, "", run))
        for _ in range(50):
            await asyncio.sleep(0.01)
            if rg.reviews.pending():
                break
        rv = rg.reviews.pending()[0]
        assert rv["proposed_action"].startswith("run python that sends data out")
        rg.reviews.decide(rv["id"], "rejected")
        return await task

    out = asyncio.run(scenario())
    assert ran == [] and out["status"] == "review_rejected"
    assert asyncio.run(rg.gate("python", {"code": "print(1)"}, "", run)) == {"stdout": "posted"} and ran == [1]
