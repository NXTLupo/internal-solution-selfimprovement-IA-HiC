"""Offline tests for the workspace page's API additions: static assets, engagement focus on a message, and the
media listing. No network and no model calls: agent.turn is replaced by a recorder."""
import os
import re
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, app as app_module, config, store  # noqa: E402

WEB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


@pytest.fixture
def client():
    return TestClient(app_module.app)          # not a context manager: no startup thread, no scheduler


@pytest.fixture
def turns(monkeypatch):
    seen = []

    def fake_turn(cid, text, call=None):
        seen.append((cid, text))
        return {"reply": "ok", "trace": [], "usd": 0.0}
    monkeypatch.setattr(agent, "turn", fake_turn)
    return seen


# ---- the page and its assets -------------------------------------------------------------------
def test_index_is_served_without_caching(client):
    r = client.get("/")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    assert r.headers["cache-control"] == "no-store"


def test_static_serves_web_files_and_revalidates(client):
    r = client.get("/static/index.html")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-cache"


def test_static_never_serves_outside_the_web_folder(client):
    for path in ("/static/../ia_next/app.py", "/static/%2e%2e/ia_next/app.py", "/static/..%2fia_next%2fapp.py"):
        r = client.get(path)
        assert r.status_code == 404 or "FastAPI" not in r.text, path


# ---- engagement focus on a message -------------------------------------------------------------
def test_message_without_focus_is_passed_unchanged(client, turns):
    r = client.post("/api/conversations/conv_x/messages", json={"text": "  What can you do?  "})
    assert r.status_code == 200 and r.json()["reply"] == "ok"
    assert turns == [("conv_x", "What can you do?")]


def test_message_with_focus_names_the_engagement_first(client, turns):
    eid = store.create_engagement("Co-op search  prep", "objective")
    r = client.post("/api/conversations/conv_x/messages", json={"text": "Make a deck", "engagement_id": eid})
    assert r.status_code == 200
    assert turns[-1][1] == f"(Focused engagement: Co-op search prep [{eid}]. This engagement has no work yet.)\nMake a deck"
    # B2: the focused engagement's own work rides with the message
    tid, _ = store.create_task(eid, "deck", {"audience": "provost"}, 2.5, "k-focus")
    client.post("/api/conversations/conv_x/messages", json={"text": "Open the deck", "engagement_id": eid})
    assert f"Its work, newest first:\n- deck (" in turns[-1][1] and f"[{tid}]" in turns[-1][1]


def test_message_with_unknown_or_empty_focus_is_unchanged(client, turns):
    client.post("/api/conversations/c/messages", json={"text": "hello", "engagement_id": "eng_nope"})
    client.post("/api/conversations/c/messages", json={"text": "hello", "engagement_id": ""})
    client.post("/api/conversations/c/messages", json={"text": "hello", "engagement_id": None})
    assert [t for _, t in turns] == ["hello", "hello", "hello"]


def test_empty_message_is_still_refused(client, turns):
    assert client.post("/api/conversations/c/messages", json={"text": "   ", "engagement_id": ""}).status_code == 400
    assert turns == []


# ---- media listing -----------------------------------------------------------------------------
def _write(eid, rel, data=b"x"):
    p = store.safe_path(eid, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as fh:
        fh.write(data)
    return p


def test_media_lists_images_and_videos_with_view_urls_that_serve(client):
    eid = store.create_engagement("e", "o")
    _write(eid, "results/images/img_a.png", b"\x89PNG....")
    _write(eid, "results/videos/vid_b.mp4", b"....ftyp")
    _write(eid, "results/images/notes.txt", b"not media")
    _write(eid, "results/images/empty.png", b"")
    r = client.get(f"/api/engagements/{eid}/media")
    assert r.status_code == 200
    body = r.json()
    assert [i["name"] for i in body["images"]] == ["img_a.png"]
    assert [v["name"] for v in body["videos"]] == ["vid_b.mp4"]
    assert body["images"][0]["view"] == f"/api/engagements/{eid}/files/results/images/img_a.png"
    assert client.get(body["images"][0]["view"]).status_code == 200
    assert client.get(body["videos"][0]["view"]).status_code == 200


def test_media_for_an_engagement_without_media_is_empty(client):
    eid = store.create_engagement("e", "o")
    assert client.get(f"/api/engagements/{eid}/media").json() == {"engagement_id": eid, "images": [], "videos": []}


def test_media_for_an_unknown_engagement_is_404(client):
    assert client.get("/api/engagements/eng_nope/media").status_code == 404


# ---- the page's own rules (checked when the web folder is present) --------------------------------
def _web_files():
    if not os.path.isdir(WEB):
        return []
    return [os.path.join(WEB, n) for n in os.listdir(WEB) if n.endswith((".html", ".css", ".js"))]


def test_web_files_have_no_em_dash_and_never_allow_same_origin_frames():
    files = _web_files()
    if not files:
        pytest.skip("web folder not mounted")
    for p in files:
        text = open(p, encoding="utf-8").read()
        assert chr(0x2014) not in text, p
        assert "allow-same-origin" not in text, p


def test_web_files_load_scripts_only_from_pinned_allowed_hosts():
    files = _web_files()
    if not files:
        pytest.skip("web folder not mounted")
    for p in files:
        text = open(p, encoding="utf-8").read()
        for src in re.findall(r"<script[^>]+src=\"([^\"]+)\"", text):
            if src.startswith(("/", "./")):
                continue
            assert re.match(r"https://(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/npm|unpkg\.com)/", src), src
            assert re.search(r"@\d+\.\d+\.\d+|/\d+\.\d+\.\d+/", src), src
        for href in re.findall(r"<link[^>]+href=\"(https?://[^\"]+)\"", text):
            assert re.match(r"https://fonts\.(googleapis|gstatic)\.com(/|$)", href), href


# ---- the prototype wrapper page --------------------------------------------------------------
def test_prototype_wrapper_embed_drops_the_top_line_and_keeps_the_sandbox(client):
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "prototype", {"experience": "x", "audience": "", "must_include": []}, 1.0)
    store.update_task(tid, status="done", result_path="results/prototype.json")
    full = client.get(f"/api/tasks/{tid}/view").text
    embedded = client.get(f"/api/tasks/{tid}/view?embed=1").text
    # Part 8 (P4): no text strip above the prototype in either view; the sandbox is unchanged
    assert "<header>" not in full and "runs on its own" not in full
    assert "<header>" not in embedded and "height:100vh" in embedded and "height:100vh" in full
    for page in (full, embedded):
        assert 'sandbox="allow-scripts"' in page and "allow-same-origin" not in page


def test_the_imported_library_is_not_listed_as_an_engagement(client):
    from ia_next import library
    library.library_engagement()
    real = store.create_engagement("Client work", "o")
    listed = [e["id"] for e in client.get("/api/engagements").json()["engagements"]]
    assert listed == [real]
    assert len(client.get("/api/engagements?include_library=1").json()["engagements"]) == 2


def test_rebrand_route_validates_the_brand_and_the_task(client):
    """Plan Part 7 (BR3): the deck card's brand switch. An unknown brand is a 400; a task that is not a finished
    deck is a 409 with the reason; nothing is spent."""
    assert client.post("/api/tasks/task_nope/rebrand", json={"brand": "deciem"}).status_code == 400
    r = client.post("/api/tasks/task_nope/rebrand", json={"brand": "nu"})
    assert r.status_code == 409 and "no deck with that task id" in r.json()["detail"]
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "deck", {"audience": "a", "brand": "nxt"}, 1.0)
    r = client.post(f"/api/tasks/{tid}/rebrand", json={"brand": "nu"})
    assert r.status_code == 409 and "only a finished deck" in r.json()["detail"]


def test_workspace_notes_ride_with_the_next_message(client, turns):
    """B6: an upload that failed, an approval decided on a card, work that finished: the page sends them with the
    next message so the agent knows. Capped, whitespace-collapsed, and placed before the person's words."""
    client.post("/api/conversations/c/messages", json={"text": "Analyze this", "notes": [
        'The upload of "brief.pdf" did not work (Not a supported file type); that file is not in the engagement.',
        "  The person   approved: Approve trying the work again  ", ""]})
    sent = turns[-1][1]
    assert sent.startswith('(Since your last message, in the workspace: The upload of "brief.pdf" did not work')
    assert "The person approved: Approve trying the work again." in sent and sent.endswith(")\nAnalyze this")
    client.post("/api/conversations/c/messages", json={"text": "x", "notes": ["n" * 900] * 20})
    sent = turns[-1][1]
    assert sent.count("n" * 300) == 8 and "n" * 301 not in sent
    client.post("/api/conversations/c/messages", json={"text": "plain", "notes": []})
    assert turns[-1][1] == "plain"


def test_notes_come_before_the_focus_line_is_added(client, turns):
    eid = store.create_engagement("Co-op prep", "objective")
    client.post("/api/conversations/c/messages", json={"text": "Go", "engagement_id": eid, "notes": ["Deck [task_1] finished"]})
    sent = turns[-1][1]
    assert sent.startswith(f"(Focused engagement: Co-op prep [{eid}].") and "(Since your last message, in the workspace: Deck [task_1] finished.)\nGo" in sent


# ---- conversations kept on the server (Part 1: past conversations could not be reopened) ----------------
def test_conversations_are_saved_listed_and_reopened(client):
    items = [{"type": "user", "text": "Make a  deck for the provost"},
             {"type": "agent", "rec": {"reply": "Started the deck.", "chips": [{"text": "Started a deck"}]}, "usd": 0.05}]
    assert client.put("/api/conversations/conv_a/items", json={"items": items}).json() == {"saved": 2}
    client.put("/api/conversations/conv_b/items", json={"items": [{"type": "user", "text": "Second"}]})
    client.put("/api/conversations/conv_empty/items", json={"items": []})
    listed = client.get("/api/conversations").json()["conversations"]
    assert [c["id"] for c in listed] == ["conv_b", "conv_a"]                 # newest first; empty ones left out
    assert listed[1]["title"] == "Make a deck for the provost" and listed[1]["items"] == 2
    assert client.get("/api/conversations/conv_a").json()["items"] == items
    assert client.get("/api/conversations/conv_nope").status_code == 404
    assert client.put("/api/conversations/bad id!/items", json={"items": []}).status_code == 400


def test_a_saved_conversation_keeps_its_newest_items_within_the_size_cap():
    items = [{"type": "user", "text": f"m{i} " + "x" * 20000} for i in range(80)]
    kept = store.save_conversation("conv_big", items)
    saved = store.load_conversation("conv_big")["items"]
    assert kept == len(saved) <= 60 and saved[-1]["text"].startswith("m79") and len(str(saved)) <= 700_000


def test_the_agent_picks_up_a_reopened_conversation_after_a_restart():
    store.save_conversation("conv_r", [{"type": "user", "text": "Make a deck for the provost"},
                                       {"type": "agent", "rec": {"reply": "The deck is ready.", "chips": [{"text": "Started a deck"}]}}])
    agent._CONVS.pop("conv_r", None)                                        # as after a restart
    seen = []

    def call(model, system, messages, ledger, **kw):
        seen.append(messages[0]["content"])

        class R:
            stop_reason, content = "end_turn", []
        return "ok", None, R()
    agent.turn("conv_r", "Now shorten it", call=call)
    assert seen[0].startswith("(This conversation was reopened.") and "Person: Make a deck for the provost" in seen[0]
    assert "You: [Started a deck] The deck is ready." in seen[0] and seen[0].endswith(")\nNow shorten it")
    agent.turn("conv_r", "Thanks", call=call)                              # only the first turn carries the note
    assert agent._CONVS["conv_r"].messages[-2]["content"] == "Thanks"
    assert agent.resume_note("conv_never") == ""


def test_the_file_picker_filter_lists_extensions_only():
    """17 Nov (owner): Chrome's Open dialog hung ("Not Responding") after the paperclip. The accept list mixed MIME types
    (text/plain, audio/*) with extensions; Chrome on Windows expands each MIME type into every registered extension.
    Extensions only, as HiC's working upload does, and the same types the page accepts."""
    if not os.path.isdir(WEB):
        pytest.skip("web folder not mounted")
    page = open(os.path.join(WEB, "index.html"), encoding="utf-8").read()
    accept = re.search(r'id="fileInput"[^>]*accept="([^"]*)"', page).group(1).split(",")
    assert accept and all(a.startswith(".") and "/" not in a and "*" not in a for a in accept), accept
    js = open(os.path.join(WEB, "app.js"), encoding="utf-8").read()
    exts = set(re.findall(r"'\.([a-z0-9]+)'", re.search(r"const TEXT_EXT = \[([^\]]*)\]", js).group(1)))
    exts |= set(re.findall(r"'\.([a-z0-9]+)'", re.search(r"const AUDIO_EXT = \[([^\]]*)\]", js).group(1)))
    assert {a[1:] for a in accept} == exts
