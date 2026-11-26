"""IA Next Local (owner goal 2026-11-19): the same system with every model call answered on this machine and no call to
a paid API. These tests hold the contract of the local layer: no key, a guard on metered hosts, the Messages shape
the agent loop reads, the seat chains, publisher-based judge independence, and HiC's paid routes answered here or
refused. No network: conftest points the model server, the search service and HiC at a closed port."""
import json
import os
import sys

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, deck, hic, localhic, localsearch, providers, verify  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_the_build_reads_no_provider_key_and_prices_nothing():
    assert config.LOCAL and not (config.ANTHROPIC_API_KEY or config.OPENAI_API_KEY or config.GEMINI_API_KEY)
    assert providers.Usage("any", 1_000_000, 1_000_000, extra_usd=5.0).usd == 0.0
    compose = open(os.path.join(ROOT, "ia-next-local.compose.yml"), encoding="utf-8").read()
    service = compose.split("services:", 1)[1]
    assert "env_file" not in service and "API_KEY" not in service
    assert "anthropic" not in open(os.path.join(ROOT, "requirements.txt"), encoding="utf-8").read().lower()


@pytest.mark.parametrize("url", ["https://api.anthropic.com/v1/messages", "https://api.openai.com/v1/responses",
                                 "https://generativelanguage.googleapis.com/v1beta/models/x:generateContent",
                                 "https://api.elevenlabs.io/v1/text-to-speech/x", "https://x.openai.azure.com/y"])
def test_any_request_to_a_metered_model_host_is_refused_before_it_leaves(url):
    with pytest.raises(providers.ProviderError, match="no call to a paid model API"):
        httpx.post(url, json={})
    with pytest.raises(providers.ProviderError):
        httpx.Client().get(url)


def test_messages_become_local_chat_messages_and_back():
    msgs = [{"role": "user", "content": "How is task_1?"},
            {"role": "assistant", "content": [{"type": "thinking", "thinking": "x"}, {"type": "text", "text": "Checking."},
                                              {"type": "tool_use", "id": "toolu_1", "name": "task_status", "input": {"task_id": "task_1"}}]},
            {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "toolu_1", "content": "{\"status\": \"done\"}"},
                                         {"type": "text", "text": "(Two steps remain.)"}]}]
    out = providers._to_ollama("SYS", msgs)
    assert out[0] == {"role": "system", "content": "SYS"}
    assert out[2]["tool_calls"] == [{"function": {"name": "task_status", "arguments": {"task_id": "task_1"}}}]
    assert out[3] == {"role": "tool", "content": "{\"status\": \"done\"}", "tool_name": "task_status"}
    assert out[4] == {"role": "user", "content": "(Two steps remain.)"}
    assert "thinking" not in json.dumps(out)
    tools = providers._tools([{"name": "t", "description": "d", "input_schema": {"type": "object", "properties": {}}}])
    assert tools[0]["function"]["name"] == "t" and tools[0]["type"] == "function"


def test_a_local_reply_reads_like_the_messages_reply_the_agent_loop_expects(monkeypatch):
    monkeypatch.setattr(providers, "installed", lambda refresh=False: {config.QWEN})
    monkeypatch.setattr(providers, "capabilities", lambda m: {"completion", "tools", "vision"})
    sent = {}

    class R:
        status_code = 200

        def json(self):
            return {"message": {"content": "", "tool_calls": [{"function": {"name": "start_deck", "arguments": {"brand": "nu"}}}]},
                    "prompt_eval_count": 300, "eval_count": 20, "done_reason": "stop"}
    monkeypatch.setattr(providers.httpx, "post", lambda url, json=None, timeout=None: sent.update(url=url, body=json) or R())
    ledger = providers.Ledger()
    text, u, resp = providers.claude(config.SEATS["orchestration"]["primary"], "SYS", [{"role": "user", "content": "deck"}], ledger,
                                     tools=[{"name": "start_deck", "description": "", "input_schema": {"type": "object"}}])
    assert resp.stop_reason == "tool_use" and resp.content[0].type == "tool_use" and resp.content[0].input == {"brand": "nu"}
    assert resp.content[0].model_dump(exclude_none=True)["name"] == "start_deck"
    assert u.model == config.QWEN and ledger.spent_usd == 0.0          # Nemotron is not installed here: Qwen answered, and is named
    assert sent["url"].endswith("/api/chat") and sent["body"]["options"]["num_ctx"] == 32768 and sent["body"]["stream"] is False   # Qwen's fixed floor (uplift WS-2)


def test_a_seat_falls_through_its_chain_and_says_when_nothing_fits(monkeypatch):
    monkeypatch.setattr(providers, "capabilities", lambda m: {"completion", "tools"} | ({"vision"} if "qwen3.8" in m else set()))
    monkeypatch.setattr(providers, "installed", lambda refresh=False: {config.QWEN_SMALL, config.QWEN_4B})
    assert providers.resolve(config.SEATS["orchestration"]["primary"]) == config.QWEN_SMALL
    assert providers.resolve(config.SEATS["fast"]["primary"]) == config.QWEN_4B
    assert providers.resolve("claude-opus-5-5") == config.QWEN_SMALL        # an id recorded by the paid build: the author seat
    assert providers.resolve(config.NEMOTRON, ("vision",)) == config.QWEN_SMALL
    monkeypatch.setattr(providers, "installed", lambda refresh=False: set())
    with pytest.raises(providers.ProviderError, match="pull_models"):
        providers.resolve(config.SEATS["artifact"]["primary"])


def test_a_prompt_too_long_for_the_local_limit_is_refused_never_cut():
    assert providers.context_for(10_000, 2000) == 16384
    assert providers.context_for(120_000, 8000) == 65536
    with pytest.raises(providers.ProviderError, match="over the local limit"):
        providers.context_for(1_000_000, 8000)


def test_the_judge_comes_from_a_different_publisher_than_the_author():
    assert config.vendor_of(config.NEMOTRON) == "nvidia" and config.vendor_of(config.QWEN) == "alibaba"
    assert config.vendor_of("prism-ml/Ternary-Bonsai-2-27B") == "alibaba"      # a derivative counts as its base family
    for author in (config.QWEN, config.QWEN_SMALL, config.NEMOTRON, config.ORNITH):
        assert config.vendor_of(verify.judge_model_for(author)) != config.vendor_of(author)


def test_hics_paid_routes_are_answered_here_or_refused_and_free_routes_go_through(monkeypatch):
    seen = []
    monkeypatch.setattr(hic, "_forward", lambda method, path, timeout, **kw: seen.append(path) or {"ok": True, "packs": []})
    assert hic._call("GET", "/api/source-packs", 5) == {"ok": True, "packs": []}             # free: forwarded
    for path in ("/api/ai/anthropic", "/api/ai/gemini", "/api/journey-map/generate", "/api/artifact/revise", "/api/tts/voices"):
        with pytest.raises(hic.HicUnavailable, match="paid model"):
            hic._call("POST", path, 5, json={})
    with pytest.raises(hic.HicUnavailable, match="paid model"):
        hic._call("POST", "/api/jobs", 5, json={"op": "/api/ai/anthropic", "body": {}})
    assert seen == ["/api/source-packs"]
    # a local job's cost reads as measured and free, so the document step never books HiC's estimate
    assert hic._call("GET", "/api/telemetry/events", 5, params={"run_id": "ia-next-task_1"})["rows"] == [{"cost_usd": 0.0, "model": "local"}]


def test_a_picture_or_scanned_page_never_goes_to_hic(monkeypatch):
    import base64
    monkeypatch.setattr(localhic, "_read_image", lambda data, mime="image/png": "WORDS IN THE PICTURE")
    forwarded = []
    out = localhic.intercept("POST", "/api/parse-upload", {"json": {"filename": "scan.PNG", "base64": base64.b64encode(b"x").decode()}},
                             lambda *a, **k: forwarded.append(a) or {})
    assert out == {"text": "WORDS IN THE PICTURE", "method": "local vision model"} and not forwarded
    out = localhic.intercept("POST", "/api/parse-upload", {"json": {"filename": "brief.docx", "base64": ""}},
                             lambda *a, **k: forwarded.append(a) or {"text": "parsed by HiC's local library"})
    assert out["text"].startswith("parsed") and forwarded                  # Office files: HiC parses them with no model


def test_themes_are_clustered_here_with_a_fixed_seed(monkeypatch):
    import numpy as np
    rng = np.random.default_rng(0)
    a, b = rng.normal(0, .05, (8, 16)) + 1, rng.normal(0, .05, (8, 16)) - 1
    monkeypatch.setattr(localhic, "_embed", lambda texts: np.vstack([a, b]).tolist())
    items = [{"id": f"p{i}", "title": "", "content": ("advisors registrar enrollment " if i < 8 else "donors gifts campaign ") * 5}
             for i in range(16)]
    first, second = localhic.topics(items, 3), localhic.topics(items, 3)
    assert first == second and len(first["topics"]) == 2
    assert sorted(len(t["post_ids"]) for t in first["topics"]) == [8, 8]
    assert any("donors" in w for w, _ in first["topics"][0]["top_terms"] + first["topics"][1]["top_terms"])


def test_grounded_search_returns_pages_where_the_research_lead_reads_them(monkeypatch):
    monkeypatch.setattr(providers, "chat", lambda *a, **k: (json.dumps({"queries": ["nurse staffing outcomes"]}),
                                                           providers.Usage(config.QWEN), None))
    monkeypatch.setattr(localsearch, "search", lambda q, limit=10: [
        {"url": "https://journal.example/a", "title": "Staffing study", "snippet": "s"},
        {"url": "https://journal.example/b", "title": "B", "snippet": "s"}, {"url": "https://journal.example/c", "title": "C", "snippet": "s"},
        {"url": "https://www.youtube.com/watch?v=1", "title": "video", "snippet": ""}])
    text, u, raw = providers.gemini_generate(config.SEATS["search"]["primary"], "Research nurse staffing", search=True)
    chunks = raw["candidates"][0]["groundingMetadata"]["groundingChunks"]
    assert [c["web"]["uri"] for c in chunks] == ["https://journal.example/a", "https://journal.example/b"]   # two per host, no video
    assert "Staffing study" in text


def test_a_brand_name_from_a_local_model_is_honoured_and_media_says_what_is_missing():
    assert deck.brand_id("Northeastern") == "nu" and deck.brand_id("nu") == "nu" and deck.brand_id("unknown") == "nxt"
    from ia_next import localmedia, media
    with pytest.raises(providers.ProviderError, match="not set up in IA Next Local"):
        localmedia.image("a team at a table")
    with pytest.raises(ValueError, match="seconds must be 5 to 5"):            # the one tested length; nothing is stretched
        media.generate_video("eng", "a clip", 8, providers.Ledger())
    with pytest.raises(providers.ProviderError, match="Nothing was sent to a paid video service"):
        media.generate_video("eng", "a clip", 5, providers.Ledger())             # no engine answers in the test run


# ---- video: one five-second clip with sound, made on this machine, decoded before it is saved ------------------------
def _clip(seconds=5.0, tone=True, audio=True):
    """A small real MP4 (H.264 + AAC) built with PyAV, so the checks run on a decodable file."""
    import io

    import av
    import numpy as np
    buf = io.BytesIO()
    with av.open(buf, "w", format="mp4") as c:
        v = c.add_stream("h264", rate=24)
        v.width, v.height, v.pix_fmt = 96, 64, "yuv420p"
        a = c.add_stream("aac", rate=44100) if audio else None
        for i in range(int(round(seconds * 24)) + 1):
            fr = av.VideoFrame.from_ndarray(np.full((64, 96, 3), (i * 2) % 255, dtype="uint8"), format="rgb24")
            for pk in v.encode(fr):
                c.mux(pk)
        for pk in v.encode():
            c.mux(pk)
        if a is not None:
            n = int(44100 * seconds)
            wave = (np.sin(np.arange(n) * 2 * np.pi * 440 / 44100) * (0.4 if tone else 0.0)).astype("float32")
            for s in range(0, n, 1024):
                chunk = wave[s:s + 1024]
                fr = av.AudioFrame.from_ndarray(chunk.reshape(1, -1), format="fltp", layout="mono")
                fr.sample_rate, fr.pts = 44100, s
                for pk in a.encode(fr):
                    c.mux(pk)
            for pk in a.encode():
                c.mux(pk)
    return buf.getvalue()


def test_the_video_graph_is_the_publishers_lite_distill_recipe_and_only_the_captions_vary():
    from ia_next import localmedia
    g = localmedia._video_graph("a nurse walks a ward corridor", "footsteps, a distant monitor", 7)
    assert g["1"]["inputs"]["unet_name"] == localmedia.VIDEO_TRANSFORMER and "Lite-distill" in localmedia.VIDEO_TRANSFORMER
    s = g["8"]["inputs"]
    assert (s["steps"], s["cfg"], s["denoise"]) == (10, 1.0, 1.0) and g["4"]["inputs"]["scaling_factor"] == 0.417
    assert (g["7"]["inputs"]["width"], g["7"]["inputs"]["height"], g["7"]["inputs"]["length"]) == (864, 480, 121)
    assert g["11"]["inputs"]["audio"] == ["10", 0] and g["12"]["class_type"] == "SaveVideo"       # sound is muxed into the file
    classes = {n["class_type"] for n in g.values()}
    assert not {c for c in classes if "VSR" in c or "Beautify" in c or "MagCache" in c}           # no optional branches
    other = localmedia._video_graph("x", "y", 7)
    assert [k for k in g if g[k] != other[k]] == ["5"]                                              # only the captions differ
    with open(os.path.join(ROOT, "workflows", "video.api.json"), encoding="utf-8") as fh:
        pinned = json.load(fh)["prompt"]
    assert {k: v["class_type"] for k, v in pinned.items()} == {k: v["class_type"] for k, v in g.items()}


def test_a_clip_is_decoded_and_a_silent_soundless_or_wrong_length_clip_is_refused(monkeypatch):
    pytest.importorskip("av")
    from ia_next import localmedia
    monkeypatch.setattr(localmedia, "available", lambda wait=0: True)
    monkeypatch.setattr(localmedia, "_video_transformer", lambda: localmedia.VIDEO_TRANSFORMER)
    good = _clip()
    monkeypatch.setattr(localmedia, "_run", lambda *a, **k: good)
    mp4, engine, facts = localmedia.video("a nurse walks a ward corridor", "footsteps")
    assert mp4 == good and engine == "comfyui:kandinsky-6.0-lite-distill"
    assert facts["video"]["codec"] == "h264" and facts["audio"]["codec"] == "aac" and abs(facts["seconds"] - 5) < 0.25
    for bad, why in ((_clip(audio=False), "without sound"), (_clip(tone=False), "silent sound track"),
                     (_clip(seconds=2.0), "not 5 seconds"), (b"not a video", "does not decode")):
        monkeypatch.setattr(localmedia, "_run", lambda *a, _b=bad, **k: _b)
        with pytest.raises(providers.ProviderError, match=why):
            localmedia.video("x", "y")


def test_an_approved_local_video_is_made_once_saved_and_costs_nothing(monkeypatch, tmp_path):
    pytest.importorskip("av")
    from ia_next import control, localmedia, media, store
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    calls = []
    good = _clip()
    monkeypatch.setattr(localmedia, "available", lambda wait=0: True)
    monkeypatch.setattr(localmedia, "_video_transformer", lambda: localmedia.VIDEO_TRANSFORMER)
    monkeypatch.setattr(localmedia, "_run", lambda graph, *a, **k: calls.append(graph) or good)
    eid = store.create_engagement("e", "o")
    args = {"engagement_id": eid, "prompt": "A charge nurse updates a staffing board", "seconds": 5, "sound": "quiet ward ambience"}
    first = media.execute("generate_video", args)
    assert first["approval"] == "pending" and not calls                      # nothing runs before the person approves
    control.decide(first["approval_id"], True)
    out = media.execute("generate_video", args)
    assert out["generated"] and not out["reused"] and out["spent_usd"] == 0.0 and out["model"] == "comfyui:kandinsky-6.0-lite-distill"
    assert calls[0]["5"]["inputs"]["audio_caption"] == "quiet ward ambience" and "staffing board" in calls[0]["5"]["inputs"]["video_caption"]
    with open(store.safe_path(eid, out["video"]), "rb") as fh:
        assert fh.read() == good
    again = media.execute("generate_video", args)                            # one approval, one clip
    assert again["reused"] and len(calls) == 1
    assert media.execute("generate_video", dict(args, seconds=15))["error"].startswith("this build makes 5-second clips only")


# ---- writing, replayed on the frozen first local report (tests/fixtures/nurse_staffing_report) ---------------------
FX = os.path.join(ROOT, "tests", "fixtures", "nurse_staffing_report")


def _fx(name):
    with open(os.path.join(FX, name), encoding="utf-8") as fh:
        return fh.read() if name.endswith(".md") else json.load(fh)


def test_real_quotes_no_longer_fail_on_typography():
    """The first local report had 12 deterministic findings; replayed offline, 10 were the checker's: curly against
    straight apostrophes, a restyled inner quotation, a stray space before a full stop, a quote's closing comma, and
    em-dashes inside two cited source titles. Two were real (a figure outside a quote, twice)."""
    found = verify.deterministic(_fx("report.md"), _fx("sources.json")["sources"])
    # what is left is the old Writer's own: figures it stated itself, in digits or spelled out ("four-to-one")
    assert len(found) >= 2 and {f["rule"] for f in found} == {"naked-number"}
    src = [{"id": "S1", "title": "Staffing — a review", "text": "Each nurse’s workload rose , the report said “sharply”, in 2024."}]
    ok = 'The review found "Each nurse\'s workload rose, the report said \'sharply\'." [S1]\n\n## Sources\n- [S1] Staffing — a review'
    assert verify.deterministic(ok, src) == []
    bad = 'The review found "Each nurse\'s workload fell sharply across the wards." [S1]'
    assert [f["rule"] for f in verify.deterministic(bad, src)] == ["quote-not-in-source"]      # different words still fail


def test_the_rewritten_report_passes_every_deterministic_check():
    assert verify.deterministic(_fx("report.rewrite.md"), _fx("sources.json")["sources"]) == []


def test_the_writer_names_evidence_and_code_inserts_the_exact_quotes(monkeypatch):
    from ia_next import localwriter
    findings = [{"source_id": "S1", "claim_type": "SUPPORTED_FACT", "claim": "Workload raises mortality",
                 "quote": "each patient added raised mortality by 7 percent, the “largest” effect"},
                {"source_id": "S2", "claim_type": "SUPPORTED_FACT", "claim": "Ratios are supported", "quote": "ANA supports enforceable ratios"}]
    sources = [{"id": "S1", "title": "Aiken study", "url": "https://a.example", "text": findings[0]["quote"]},
               {"id": "S2", "title": "ANA", "url": "https://b.example", "text": findings[1]["quote"]}]
    sch = localwriter.schema(["E1", "E2"])
    block = sch["properties"]["sections"]["items"]["properties"]["blocks"]["items"]
    assert block["properties"]["evidence_ids"]["items"]["enum"] == ["E1", "E2"] and block["properties"]["evidence_ids"]["minItems"] == 1
    assert sch["properties"]["sections"]["minItems"] == 5
    replies = [json.dumps({"title": "Staffing drives outcomes", "sections": [{"heading": "Workload raises the risk of death", "blocks": [
        {"text": "Each added patient raises mortality by 7 percent.", "evidence_ids": ["E1"], "quote_ids": []},
        {"text": "The nurses' association backs enforceable ratios.", "evidence_ids": ["E2"], "quote_ids": ["E2"]}]}]}),
        json.dumps({"blocks": [{"n": 1, "text": "Each added patient raises a nurse's patients' risk of death.", "quote_ids": ["E1"]}]})]
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (replies.pop(0), providers.Usage(config.QWEN), None))
    md, model, stats = localwriter.write({"audience": "COO", "goal": "g", "scope": "s"}, findings, sources, providers.Ledger())
    assert stats["repaired"] == 1 and stats["open"] == [] and stats["evidence_used"] == 2
    assert "raises a nurse's patients' risk of death. [S1]" in md and "by 7 percent. [S1]" not in md      # the figure left the prose
    assert "> \"each patient added raised mortality by 7 percent, the 'largest' effect\" [S1]" in md       # and arrived in its quote
    assert "- [S1] Aiken study (undated) https://a.example" in md and verify.deterministic(md, sources) == []
    assert localwriter.check_prose("Staffing fell 12 percent.").startswith("it states the figure")
    assert localwriter.check_prose("A four-to-one ratio works.").startswith("it states the figure 'four-to-one' in words")
    assert localwriter.check_prose("The 2021 study found fewer deaths.") == ""                              # a year is not a figure


def test_a_prototype_review_is_independent_of_both_the_brief_and_the_build(monkeypatch):
    """Qwen writes the design brief and Ornith builds: a Qwen review of the screenshots would be Qwen judging its own
    design. The source goes to a third publisher, and the pixel review is recorded as pending until an independent
    vision model is installed."""
    from ia_next import prototype
    monkeypatch.setattr(providers, "installed", lambda refresh=False: {config.QWEN, config.ORNITH, config.NEMOTRON, config.QWEN_9B})
    monkeypatch.setattr(providers, "capabilities", lambda m: {"completion", "tools"} | (set() if "Nemotron" in m else {"vision"}))
    seen = {}

    def fake(model, prompt, ledger, system=None, json_schema=None, max_output_tokens=0, images=None, search=False):
        seen.update(model=model, images=images)
        return json.dumps({"scores": {"concept": 4}, "must_fix": []}), providers.Usage(model), {}
    monkeypatch.setattr(providers, "gemini_generate", fake)
    out = prototype.critique("<html></html>", {}, None, providers.Ledger(), config.ORNITH, shots=[("Home", b"png")])
    assert config.vendor_of(seen["model"]) == "nvidia" and not seen["images"]
    assert out["pixel_review"].startswith("pending") and out["looked_at"] == [] and out["independent_of"] == ["alibaba", "ornith"]


# ---- structured output that cannot kill a run (19 Nov: a report died on JSON cut at the token limit) ----------------
def test_json_cut_off_mid_object_keeps_what_was_complete():
    cut = '{"title": "T", "sections": [{"heading": "A", "blocks": [{"text": "one", "evidence_ids": ["E1"]}, {"text": "tw'
    doc = providers.parse_json(cut)
    assert doc["title"] == "T" and doc["sections"][0]["blocks"] == [{"text": "one", "evidence_ids": ["E1"]}]
    assert providers.parse_json('{"a": [1, 2, {"b": "x"}], "c": "unfinished') == {"a": [1, 2, {"b": "x"}]}
    assert providers.parse_json('{"a": 1, "b":') == {"a": 1}
    assert providers.parse_json('```json\n{"a": {"b": [1, 2]}}\n```') == {"a": {"b": [1, 2]}}
    with pytest.raises(ValueError):
        providers.parse_json("no object here")
    with pytest.raises(ValueError):
        providers.parse_json('{"a": [1, 2', repair=False)


def test_structured_output_that_runs_out_of_room_is_asked_again_with_more(monkeypatch):
    sent = []

    class R:
        status_code = 200

        def __init__(self, d):
            self._d = d

        def json(self):
            return self._d

    def post(url, json=None, timeout=None):
        sent.append(json["options"]["num_predict"])
        full = len(sent) > 1
        return R({"message": {"content": '{"ok": true}' if full else '{"ok": tr'}, "done_reason": "stop" if full else "length",
                  "prompt_eval_count": 5, "eval_count": 5})

    monkeypatch.setattr(providers, "resolve", lambda m, need=(): m)
    monkeypatch.setattr(providers, "capabilities", lambda m: {"completion", "thinking"})
    monkeypatch.setattr(providers, "_room", lambda: None)
    monkeypatch.setattr(providers.httpx, "post", post)
    text, _, resp = providers.chat("m", "s", [{"role": "user", "content": "x"}], max_tokens=1000, effort="high",
                                   json_schema={"type": "object"})
    assert sent == [5000, 10000] and text == '{"ok": true}' and resp.stop_reason == "end_turn"   # 1000 + the thinking allowance, then doubled


# ---- a figure written in words is still a figure (19 Nov: "seven percent", "one hundred million dollars") ------------
def test_spelled_out_figures_are_found_and_lone_number_words_are_not():
    from ia_next import studiokit
    found = lambda s: [d for _, d in studiokit.spelled_figures(s)]
    assert found("each additional patient increases mortality risk by seven percent") == ["7"]
    assert found("a four-to-one ratio would save over one hundred million dollars annually") == ["4", "1", "100000000"]
    assert found("sixteen percent of nurses left") == ["16"]
    assert found("twenty five hospitals took part") == ["25"]
    assert found("two voices read the script and one advisor checks it") == []
    assert found("California and Oregon enacted statutory minimum ratios") == []
    # checked against the cited passage like a typed number
    assert studiokit.numbers_supported("risk rises by seven percent", ["each additional patient raised risk by 7%"])
    assert not studiokit.numbers_supported("risk rises by seven percent", ["risk rises with every added patient"])


def test_the_writer_and_the_checker_refuse_a_figure_in_words():
    from ia_next import localwriter
    assert "in words" in localwriter.check_prose("Turnover fell by sixteen percent after the mandate.")
    assert localwriter.check_prose("Turnover fell after the mandate.") == ""
    f = verify.deterministic("# T\n\nTurnover fell by sixteen percent after the mandate [S1].\n\n## Sources\n\n[S1] A\n",
                             [{"id": "S1", "title": "A", "url": "https://a.example", "text": "x"}])
    assert any(x["rule"] == "naked-number" for x in f)


# ---- the conversation stays answerable while the studio holds the graphics card --------------------------------------
def test_a_busy_studio_is_answered_at_once_from_the_task_list_with_no_model(monkeypatch, tmp_path):
    from ia_next import agent, lifecycle, store
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "deck", {}, 1.0, "busy")
    store.update_task(tid, status="running")
    store.start_node(tid, "Deck Composer", "m", 1)
    monkeypatch.setattr(providers, "is_loaded", lambda m: False)
    assert [x["id"] for x in agent.studio_busy(config.NEMOTRON)] == [tid]

    def no_model(*a, **k):
        raise AssertionError("a model was called while the studio was busy")
    monkeypatch.setattr(providers, "claude", no_model)
    out = agent.turn(agent.new_conversation(), "is my deck done?")
    assert "still working on a deck" in out["reply"] and "Deck Composer has been working" in out["reply"] and out["trace"] == []
    stopped = []
    monkeypatch.setattr(lifecycle, "stop", lambda t: stopped.append(t) or {"id": t, "status": "stopping"})
    out = agent.turn(agent.new_conversation(), "please stop it")
    assert stopped == [tid] and out["reply"].startswith("Stopping a deck")
    monkeypatch.setattr(providers, "is_loaded", lambda m: True)            # the agent's model is in memory: the full agent answers
    assert agent.studio_busy(config.NEMOTRON) == []


def test_a_question_about_the_focused_engagement_is_answered_from_its_passages_in_one_call(monkeypatch, tmp_path):
    from ia_next import agent, answers, store, studiokit
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    eid = store.create_engagement("Student AI use", "o")
    said = "Only a small share of students believed their instructors were well equipped to guide them."
    chunks = [{"pointer": "p1", "source_id": "S1", "title": "Survey", "text": "Intro. " + said + " More."},
              {"pointer": "p2", "source_id": "S2", "title": "Faculty study", "text": "Most faculty use the tools minimally in teaching."}]
    monkeypatch.setattr(studiokit, "load_material", lambda e, b, budget=0: ("g", [{"id": "S1", "title": "Survey"}, {"id": "S2", "title": "Faculty study"}],
                                                                           chunks, {c["pointer"]: c for c in chunks}, {}))
    monkeypatch.setattr(agent, "studio_busy", lambda m: [])
    monkeypatch.setattr(providers, "is_loaded", lambda m: True)
    reply = json.dumps({"answer": "Students doubt their instructors because few instructors use the tools.", "points": [
        {"text": "Few students think their instructors can guide them.", "source_id": "S1", "quote": said},
        {"text": "Most faculty barely use the tools.", "source_id": "S2", "quote": "Most faculty use the tools minimally in teaching."},
        {"text": "About sixty percent avoid them.", "source_id": "S2", "quote": "Most faculty use the tools minimally in teaching."},   # its own figure
        {"text": "Leaders agree.", "source_id": "S2", "quote": "A sentence that is in no passage at all."}]})
    calls = []
    monkeypatch.setattr(providers, "claude", lambda *a, **k: calls.append(k.get("tools")) or (reply, None, None))
    out = agent.turn(agent.new_conversation(), "Why do students say their instructors cannot guide them? Cite the sources.", focus=eid)
    assert len(calls) == 1 and calls[0] is None                             # one call, and not the tool loop
    assert out["trace"][0]["tool"] == "answer_from_sources" and out["trace"][0]["output"] == {"points": 3, "sources": ["S1", "S2"], "dropped": 1}
    assert "[S1]" in out["reply"] and "[S2]" in out["reply"] and said in out["reply"] and "sixty percent" not in out["reply"]
    assert "Faculty study says: [S2]" in out["reply"]                       # the point with its own figure keeps only its checked sentence
    assert "- [S1] Survey" in out["reply"]


# ---- the study formats (Gemini Notebook's Studio outputs), held to its measured counts --------------------------------
def test_study_items_need_a_source_a_copied_sentence_and_no_figure_of_their_own():
    from ia_next import localstudy
    q = "Advisors see the record of a student only after the student books a meeting."
    good = {"question": "Why do advisors see a record late?", "answer": "The record opens only when a meeting is booked.", "source_id": "S1", "quote": q}
    doc = {"title": "T", "standfirst": "S", "items": [
        good,
        dict(good, question="How many students use it?", answer="About sixteen percent of students use it."),     # its own figure
        dict(good, question="Who owns it?", source_id="S9"),                                                    # unknown source
        dict(good, question="What changed?", quote="short")]}                                                   # no real quote
    out, kept, short = localstudy.check("faq", doc, ["S1", "S2"])
    assert kept == {"items": 1} and out["items"][0]["question"] == good["question"]
    assert short == ["1 items of the 10 a FAQ needs"]                      # the shortfall is stated, never hidden
    page = localstudy.render("faq", out, "nxt", {"S1": "Advising handbook"})
    assert "<q>" + q + "</q>" in page and "Advising handbook" in page and "Ask about this" in page


def test_a_quiz_marks_answers_and_explains_every_option_and_a_chronology_is_in_date_order():
    from ia_next import localstudy
    q = "The registrar exports enrollment every week to a file no other system reads."
    item = {"stem": "A gift officer wants to know why a lapsed alum appears late. What explains it?",
            "options": ["The weekly export is not read downstream.", "The alum changed address.", "The officer lacks access.", "The system was offline."],
            "answer": 0, "why_right": "The export reaches no other system.", "why_wrong": ["Addresses are not the cause.", "Access is granted.", "No outage is described."],
            "source_id": "S1", "quote": q}
    out, kept, _ = localstudy.check("quiz", {"title": "T", "standfirst": "S", "questions": [
        item, dict(item, stem="a fragment with no end"), dict(item, options=["Same.", "Same.", "Other.", "Else."])]}, ["S1"])
    assert kept == {"questions": 1}
    page = localstudy.render("quiz", out, "nxt", {"S1": "Registrar notes"})
    assert page.count('class="opt"') == 4 and page.count("data-right") >= 1 and "<noscript>" in page and "Answer key" in page
    assert "No outage is described." in page                                # why each wrong option is wrong
    ent = lambda d, k: {"date": d, "sort_key": k, "event": "The office changed the rule.", "source_id": "S1", "quote": q}
    out, kept, _ = localstudy.check("chronology", {"title": "T", "standfirst": "S", "entries": [
        ent("March 2026", "2026-03-01"), ent("2024", "2024-01-01"), ent("no date", "soon")]}, ["S1"])
    assert [e["date"] for e in out["entries"]] == ["2024", "March 2026"]
    assert {"studyguide", "faq", "chronology", "flashcards", "quiz"} <= set(__import__("ia_next.artifacts", fromlist=["KINDS"]).KINDS)


# ---- what reading the first full local briefing showed (19 Nov) ------------------------------------------------------
def test_a_quote_keeps_the_sources_own_wording_without_being_marked_down():
    dash = chr(0x2014)
    said = f"A 2025 survey found a jump{dash}a one-year change the authors called groundbreaking work in applied education."
    src = [{"id": "S1", "title": "A", "url": "https://a.example", "text": said}]
    nl = chr(10)
    ok = verify.deterministic(nl.join(["# T", "", "Adoption rose quickly [S1].", "", f'> "{said}" [S1]', "", "## Sources", "", "- [S1] A", ""]), src)
    assert ok == []
    own = verify.deterministic(nl.join(["# T", "", f"This groundbreaking change{dash}a big one{dash}matters [S1].", "", "## Sources", "", "- [S1] A", ""]), src)
    assert {f["rule"] for f in own} == {"em-dash", "slop"}                  # the writer's own words are still held to the rule


def test_headings_become_sentences_and_a_quote_is_shown_once():
    from ia_next import localwriter
    assert localwriter._sentence_case("Students Have Made AI a Routine Part of Academic Work") == "Students have made AI a routine part of academic work"
    assert localwriter._sentence_case("Ohio State embeds AI across its majors") == "Ohio State embeds AI across its majors"
    led = {"E1": {"claim": "c", "quote": "Students turn to assistants to save time on routine work.", "source_id": "S1"}}
    blk = lambda t: {"text": t, "evidence_ids": ["E1"], "quote_ids": ["E1"]}
    doc = {"title": "T", "summary": "", "sections": [{"heading": "Students save time", "implication": "", "blocks": [blk("First point."), blk("Second point.")]}]}
    md = localwriter.render(doc, led, [{"id": "S1", "title": "A", "url": "https://a.example"}])
    assert md.count("Students turn to assistants") == 1 and md.count("[S1]") >= 3      # cited twice, quoted once


def test_collected_sources_are_kept_by_meaning_not_by_shared_words():
    from ia_next import localrank
    vec = {"goal": [1, 0, 0], "on": [0.9, 0.1, 0], "near": [0.6, 0.6, 0], "off": [0.1, 1, 0]}

    def fake(texts):
        return [vec["goal"]] + [vec["on"] if "assistant" in t else vec["near"] if "success" in t else vec["off"] for t in texts[1:]]
    src = ([{"title": f"Students and assistants {i}", "text": "assistant use"} for i in range(6)]
           + [{"title": "Student success playbook", "text": "success"}, {"title": "Court blocks visa policy", "text": "students universities"},
              {"title": "Named by the person", "text": "visa", "requested": True}])
    kept, dropped = localrank.on_topic("how students use assistants", src, protect=lambda s: bool(s.get("requested")), embed_fn=fake)
    assert [s["title"] for s in dropped] == ["Court blocks visa policy"]
    assert any(s["title"] == "Named by the person" for s in kept) and all("relevance" in s for s in src)

    def broken(texts):
        raise RuntimeError("model away")
    kept, dropped = localrank.on_topic("g", src, embed_fn=broken)
    assert len(kept) == len(src) and dropped == []                        # a filter that cannot run removes nothing


def test_the_name_under_a_quotation_is_not_part_of_the_quotation():
    from ia_next import artifacts, localstudy
    said = "Students most often describe the assistant as a form of academic support."
    page = f"<blockquote><q>{said}</q><cite>libguides.example: Research guide</cite></blockquote>"
    assert artifacts.quoted_passages(page) == [said]
    assert artifacts.unverified_quotes(page, [{"id": "S1", "text": "Intro. " + said + " More."}]) == []
    assert verify.checklist_for({"checklist": localstudy.CHECKLIST}) == localstudy.CHECKLIST
    assert "opening paragraph" in verify.checklist_for({})[0]              # a report keeps its own checklist

