"""The uplift plan of 23 Nov 2026 (plans/modernization-uplift-plan-2026-11-23.md), workstream by workstream."""
import json
import os
import zipfile

import httpx
import pytest

from ia_next import config, health, hic, providers, scorecard, store


# ---- WS-2 step 1: what the local server did with each prompt ----------------------------------------------------------
def test_each_call_records_prompt_reuse_and_model_loads():
    # Ollama reports the whole prompt each time; a reused prefix shows only in the prompt time (measured 23 Nov)
    for tokens, psecs, load in ((9000, 3.0, 6.0), (9500, 0.1, 0.0), (9600, 0.2, 0.0)):
        u = providers.Usage("qwen", tokens, 300, 0, 4.0)
        u.sent_tokens, u.prompt_seconds, u.load_seconds, u.num_ctx = tokens, psecs, load, 32768
        providers.record_spend(u, "task_cache_1")
    rep = providers.cache_report("task_cache_1")
    assert rep["calls"] == 3 and rep["model_loads"] == 1 and rep["contexts"] == [32768]
    assert rep["full_rates"] == {"qwen": 3000} and rep["prompt_tokens_sent"] == 28100
    assert rep["prompt_tokens_evaluated"] == 9000 + 300 + 600 and 0.6 < rep["reused_share"] < 0.67
    assert providers.cache_report("task_none") == {}


# ---- WS-3 step 1: health that tells the truth ------------------------------------------------------------------------
def test_deep_health_names_what_is_down_and_what_it_disables(monkeypatch):
    monkeypatch.setattr(health, "CHECKS", (("models", lambda: (True, "10 models", "")),
                                           ("embedder", lambda: (False, "HiC's embedder is not answering", "second-brain search")),
                                           ("broken", lambda: 1 / 0)))
    d = health.deep(force=True)
    assert not d["ok"] and d["down"] == ["embedder", "broken"]
    emb = next(s for s in d["services"] if s["name"] == "embedder")
    assert emb["disables"] == "second-brain search"
    assert "ZeroDivisionError" in next(s for s in d["services"] if s["name"] == "broken")["detail"]


def test_a_slow_hic_answer_is_not_reported_as_hic_not_running(monkeypatch):
    def slow(*a, **k):
        raise httpx.ReadTimeout("slow")
    monkeypatch.setattr(httpx, "request", slow)
    with pytest.raises(hic.HicUnavailable) as e:
        hic._forward("POST", "/api/wiki/chunks-backfill", 30)
    assert "is running but did not answer /api/wiki/chunks-backfill within 30 s" in str(e.value)


# ---- WS-1 steps 1 and 2: the scorecard ----------------------------------------------------------------------------------
def _task(tmp_path, kind="artifact", page="<p>ok</p>", slides=None, verification=None):
    folder = tmp_path / "t"
    folder.mkdir(exist_ok=True)
    rp = folder / "artifact.html"
    rp.write_text(page, encoding="utf-8")
    if slides is not None:
        (folder / "slides.html").write_text(slides, encoding="utf-8")
    if verification is not None:
        (folder / "verification.json").write_text(json.dumps(verification), encoding="utf-8")
    return {"id": "task_x", "kind": kind, "status": "done", "result_path": str(rp), "engagement_id": "eng_x"}


def test_the_scorecard_catches_the_defects_the_owner_found(tmp_path, monkeypatch):
    monkeypatch.setattr(scorecard, "_fit", lambda html, sel="section.stage": [
        {"n": 1, "overflow": 0, "into_footer": 0, "wider_than_box": 0, "smallest_px": 28, "title": "Where things stand"},
        {"n": 2, "overflow": 40, "into_footer": 1, "wider_than_box": 0, "smallest_px": 18, "title": "Decisions"},
        {"n": 3, "overflow": 0, "into_footer": 0, "wider_than_box": 0, "smallest_px": 28, "title": "Decisions"}])
    page = "<p>Rules live in each syllabus.<sup class=\"fn\"><a>1</a> Many institutions ...</p><td></td>\x02"
    t = _task(tmp_path, page=page, slides="<section class=\"stage\"><p>A sentence cut…</p></section>",
              verification={"score": 1.0, "deterministic_findings": [{"rule": "quote-not-in-source", "detail": "x"}]})
    sc = scorecard.score(t)
    by = {c["name"]: c for c in sc["checks"]}
    for name in ("page_well_formed", "footnotes_close", "no_cut_sentences", "slides_fit", "slide_text_size", "quotes_in_sources"):
        assert not by[name]["passed"] and name in sc["hard_failed"], name
    assert not by["no_empty_blocks"]["passed"] and "no_empty_blocks" not in sc["hard_failed"]     # reported, soft
    assert not by["repeated_titles"]["passed"] and "repeated_titles" not in sc["hard_failed"]     # a continued table, soft
    assert sc["judge"] == 1.0                                         # the reviewer said 1.00; the checks say otherwise


def test_a_clean_task_passes_and_an_unreachable_renderer_is_not_a_failure(tmp_path):
    t = _task(tmp_path, page="<p>Clean.<sup class=\"fn\"><a>1</a></sup></p>",
              slides="<section class=\"stage\"><h1>One</h1><p>Whole.</p></section>",
              verification={"score": 0.9, "deterministic_findings": []})
    sc = scorecard.score(t)
    assert sc["hard_failed"] == []
    fit = next(c for c in sc["checks"] if c["name"] == "slides_fit")
    assert fit["passed"] and not fit["hard"] and "not measured" in fit["detail"]


def test_a_deck_under_ten_points_or_with_repeated_slides_needs_review(tmp_path):
    folder = tmp_path / "deck"
    folder.mkdir()
    (folder / "deck.html").write_text("<section class=\"slide\"><p>x</p></section>", encoding="utf-8")
    (folder / "deck.json").write_text(json.dumps({"slides": [{"title": "Close"}, {"title": "Close"}]}), encoding="utf-8")
    with zipfile.ZipFile(folder / "deck.pptx", "w") as z:
        z.writestr("ppt/slides/slide1.xml", '<p:sld><a:rPr sz="900"/><a:rPr sz="2800"/></p:sld>')
    t = {"id": "task_d", "kind": "deck", "status": "done", "result_path": str(folder / "deck.html"), "engagement_id": "e"}
    sc = scorecard.score(t)
    assert set(sc["hard_failed"]) >= {"no_repeated_slides", "pptx_text_size"}


def test_a_failed_hard_check_marks_the_task_needs_review(tmp_path):
    eid = store.create_engagement("Scorecard", "x")
    tid, _ = store.create_task(eid, "artifact", {"goal": "x"}, 0.0)
    folder = tmp_path / "s"
    folder.mkdir()
    (folder / "artifact.html").write_text("<p>Bad.<sup>1 left open</p>", encoding="utf-8")
    store.update_task(tid, status="done", result_path=str(folder / "artifact.html"), summary="Document ready.")
    sc = scorecard.run(tid)
    t = store.get_task(tid)
    assert "footnotes_close" in sc["hard_failed"] and t["summary"].startswith("Needs review (footnotes_close")
    assert t["scorecard"]["hard_failed"] == ["footnotes_close"] and (folder / "scorecard.json").is_file()
    scorecard.run(tid)                                                 # scoring twice does not repeat the prefix
    assert store.get_task(tid)["summary"].count("Needs review") == 1


def test_each_model_keeps_one_context_so_it_is_not_reloaded():
    small_call, mid_call = 2000, 40000                        # characters
    assert providers.context_for(small_call, 1000, config.QWEN) == providers.context_for(mid_call, 8000, config.QWEN) == 32768
    assert providers.context_for(small_call, 1000, config.MINICPM) == 16384
    assert providers.context_for(150000, 12000, config.QWEN) == 65536          # only a call too large for the floor steps up
    assert providers.context_for(small_call, 1000) == 16384                     # unknown model: the old sizing


def test_every_step_of_a_task_shares_one_byte_identical_head():
    from ia_next import prompts
    h1 = prompts.head("<source id='S1'>evidence</source>", persona="a student", scope="term one")
    h2 = prompts.head("<source id='S1'>evidence</source>", scope="term one", persona="a student")
    assert h1 == h2 and h1.startswith("<material>" + chr(10) + "<source")
    assert h1.endswith("Persona: a student" + chr(10) + "Scope: term one" + chr(10))
    a, b = prompts.step(h1, "Step one."), prompts.step(h1, "Step two.")
    common = len(a) - len("Step one.")
    assert a[:common] == b[:common] == h1                  # everything before the step's own words is shared


def test_a_call_inside_a_step_streams_and_reports_its_progress(monkeypatch):
    lines = [json.dumps({"message": {"content": w}, "done": False}) for w in ("Students ", "explain ", "readings.")]
    lines.append(json.dumps({"message": {"content": ""}, "done": True, "done_reason": "stop", "prompt_eval_count": 50,
                             "eval_count": 3, "load_duration": 0, "prompt_eval_duration": 1000000}))

    class Stream:
        status_code = 200
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def iter_lines(self):
            return iter(lines)
    monkeypatch.setattr(httpx, "stream", lambda *a, **k: Stream())
    monkeypatch.setattr(providers, "resolve", lambda model, need=(): model)
    monkeypatch.setattr(providers, "capabilities", lambda model: set())
    monkeypatch.setattr(providers, "_room", lambda: None)
    monkeypatch.setattr(providers, "PROGRESS_EVERY", 0.0)
    heard = []
    tok = providers.PROGRESS.set(heard.append)
    try:
        text, u, resp = providers.chat("qwen", "s", [{"role": "user", "content": "x"}], None, max_tokens=50)
    finally:
        providers.PROGRESS.reset(tok)
    assert text == "Students explain readings." and u.output_tokens == 3 and resp.stop_reason == "end_turn"
    assert heard and heard[-1] >= 2                           # the running count was reported while it streamed


# ---- WS-1 steps 3 and 4: feedback and the improvement loop -------------------------------------------------------------
def test_repeated_failures_become_a_gated_proposal_or_an_attention_item(monkeypatch):
    from ia_next import control, improve, skills
    eid = store.create_engagement("Loop", "x")
    for i in range(2):
        tid, _ = store.create_task(eid, "deck", {"goal": "x"}, 0.0)
        store.event("scorecard", {"hard_failed": ["no_repeated_slides", "slides_fit"]}, eid, tid)
    tid, _ = store.create_task(eid, "deck", {"goal": "x"}, 0.0)
    store.event("task_feedback", {"verdict": "reject", "text": "the closing slide appears three times", "kind": "deck"}, eid, tid)
    seed = skills.default_text("deck_composer")
    monkeypatch.setattr(improve, "draft", lambda skill, failures, call=None: seed + " Never repeat a slide's title or content.")
    got = improve.run()
    assert [p["check"] for p in got["proposed"]] == ["no_repeated_slides"]              # the skill can fix this
    assert [a["check"] for a in got["attention"]] == ["slides_fit"]                     # only code can fix this
    assert control.pending() and "Evaluate deck_composer" in control.pending()[-1]["reason"]
    assert skills.versions("deck_composer")[-1]["status"] == "candidate"                # proposed, never promoted
    assert improve.run()["proposed"] == []                                              # not proposed twice


# ---- WS-3 steps 2 to 5: the second brain when HiC's search is down, coverage, retries, transcripts -------------------
def _engagement_with_sources():
    from ia_next import transcripts
    eid = store.create_engagement("Recall", "x")
    transcripts.add_text_source(eid, "Detectors.txt", "Instructors say AI detectors flag honest essays.\n\n"
                                "Students hide AI use because the syllabus rules are unclear.", "document")
    transcripts.add_text_source(eid, "Careers.txt", "Employers ask graduates for evidence of AI skills in interviews.", "document")
    return eid


def test_recall_answers_from_the_engagement_when_hic_cannot_search(monkeypatch):
    from ia_next import secondbrain
    eid = _engagement_with_sources()

    def down(*a, **k):
        raise hic.HicUnavailable("HiC is not running")
    monkeypatch.setattr(hic, "_call", down)
    got = secondbrain.recall("why do students hide AI use", engagement=eid, k=2)
    assert got and "hide AI use" in got[0]["excerpt"] and "unavailable" in got[0]["via"]
    # HiC up but its embedder down: chunks-by-goal returns nothing, and the engagement still answers
    monkeypatch.setattr(hic, "_call", lambda *a, **k: {"chunk_ids": [], "pages": {}})
    monkeypatch.setattr(health, "deep", lambda force=False: {"services": [{"name": "embedder", "ok": False}]})
    got = secondbrain.recall("employers AI skills", engagement=eid, k=1)
    assert got and "Employers" in got[0]["excerpt"]


def test_recall_expands_a_broad_question_and_reranks_after_the_manifest(monkeypatch):
    from ia_next import secondbrain
    asked, read = [], {"w/a.md#c0": "Detectors flag essays.", "w/b.md#c0": "Unrelated budget note.",
                       "w/c.md#c0": "Students hide AI use from instructors.", "w/d.md#c0": "Syllabus rules differ."}

    def fake_hic(method, path, timeout, **kw):
        if path == "/api/manifest/chunks-by-goal":
            asked.append(kw["params"]["goal"])
            return {"chunk_ids": ["w/a.md#c0", "w/b.md#c0"] if len(asked) == 1 else ["w/c.md#c0", "w/d.md#c0"], "pages": {}}   # thin
        import urllib.parse
        return {"chunk": read[urllib.parse.unquote(path.split("/api/wiki/read-article/")[1])]}

    def fake_model(model, system, messages, ledger, **kw):
        if "rephrase" in system:
            return json.dumps({"variants": ["why students conceal AI"]}), None, None
        return json.dumps({"scores": [1, 0, 3, 2]}), None, None
    monkeypatch.setattr(hic, "_call", fake_hic)
    got = secondbrain.recall("AI use and honesty", k=3, call=fake_model)
    assert asked == ["AI use and honesty", "why students conceal AI"]          # the broad question was widened
    assert [g["pointer"] for g in got] == ["w/c.md#c0", "w/d.md#c0", "w/a.md#c0"]   # reranked, best first
    assert secondbrain.expand("a long and specific question about the second detector study in the spring term") == []
    near = lambda *a, **k: (json.dumps({"variants": ["AI use and honesty (alternative phrasing)", "students concealing chatbot help"]}), None, None)
    assert secondbrain.expand("AI use and honesty", call=near) == ["students concealing chatbot help"]


def test_pages_archived_while_the_embedder_was_down_are_embedded_when_it_returns(monkeypatch):
    from ia_next import secondbrain
    eid = _engagement_with_sources()
    sid = secondbrain.all_sources(eid)[0]["id"]
    monkeypatch.setattr(hic, "_call", lambda *a, **k: {"wikiPath": "articles/ia-next/x1.md", "embedded": False})
    secondbrain.archive(eid, secondbrain.all_sources(eid)[0])
    assert secondbrain.coverage(eid) == {"sources": 2, "archived": 1, "chunks": 0, "waiting_for_embedder": 1}
    assert (eid, sid, "articles/ia-next/x1.md") in secondbrain.pending_embeds()
    monkeypatch.setattr(health, "deep", lambda force=False: {"services": [{"name": "embedder", "ok": False}]})
    assert secondbrain.embed_pending()["embedded"] == 0                         # nothing sent while it is down
    sent = []

    def backfill(method, path, timeout, **kw):
        sent.append((path, kw.get("params")))
        return {"embedded": 1}
    monkeypatch.setattr(health, "deep", lambda force=False: {"services": [{"name": "embedder", "ok": True}]})
    monkeypatch.setattr(hic, "_call", backfill)
    assert secondbrain.embed_pending()["embedded"] >= 1
    assert ("/api/wiki/chunks-backfill", {"path_contains": "articles/ia-next/x1.md", "force": 1}) in sent
    assert secondbrain.coverage(eid)["waiting_for_embedder"] == 0


def test_an_audio_transcript_is_kept_as_timestamped_paragraphs(monkeypatch):
    from ia_next import localspeech, transcripts
    segs = [{"start": i * 10.0, "end": i * 10.0 + 9.5, "text": f"Sentence number {i}."} for i in range(20)]
    monkeypatch.setattr(localspeech, "transcribe", lambda path, size="small": (segs, {"duration": 200.0}))
    d = transcripts._post_transcription("faster-whisper-small", "talk.mp3", b"x", "audio/mpeg")
    paras = d["text"].split("\n\n")
    import re
    assert len(paras) >= 2 and all(re.match(r"\[\d\d:\d\d(:\d\d)?\] ", p) for p in paras)   # HiC's chunker cuts here


# ---- WS-5: budgets in tokens, a long conversation keeps its context, episodic memory, retirement ---------------------
def test_a_full_builder_call_stays_on_the_model_floor():
    from ia_next import secondbrain
    head = 12000                                                # system, instructions and schema of a stepped ask
    assert providers.context_for(secondbrain.BUDGET_CHARS + head, 16000, config.QWEN) == config.CTX_FLOOR[config.QWEN]
    assert int((60000 + head) / 3.0) + 12000 + 512 > 32768      # the old count sent the same call to a reload
    assert providers.prompt_tokens(4090, config.QWEN) < providers.prompt_tokens(4090, "unmeasured-model")


def test_a_prompt_the_server_finds_too_long_is_sent_again_at_the_step_that_holds_it(monkeypatch):
    sent = []

    class R:
        def __init__(self, code, text, n=0):
            self.status_code, self.text, self.n = code, text, n
        def json(self):
            return {"message": {"content": "ok"}, "done": True, "done_reason": "stop", "prompt_eval_count": self.n, "eval_count": 1}

    def post(url, json=None, timeout=None):
        sent.append(json["options"]["num_ctx"])
        if len(sent) == 1:                       # what Ollama 0.40.16 answers (measured 23 Nov); it never cuts the prompt
            return R(400, '{"error":"request (40000 tokens) exceeds the available context size (32768 tokens), try increasing it"}')
        return R(200, "", 40000)
    monkeypatch.setattr(httpx, "post", post)
    monkeypatch.setattr(providers, "resolve", lambda model, need=(): model)
    monkeypatch.setattr(providers, "capabilities", lambda model: set())
    monkeypatch.setattr(providers, "_room", lambda: None)
    text, u, _ = providers.chat(config.QWEN, "s", [{"role": "user", "content": "x" * 1000}], None, max_tokens=100)
    assert sent == [32768, 65536] and text == "ok" and u.num_ctx == 65536


def test_a_long_conversation_is_compacted_and_keeps_its_last_six_turns(monkeypatch):
    from ia_next import agent
    conv = agent.Conversation("conv_compact1")
    for i in range(12):
        conv.messages.append({"role": "user", "content": f"Turn {i}: make a deck about advising for task_{i:012x} " + "x" * 9000})
        conv.messages.append({"role": "assistant", "content": [{"type": "text", "text": f"Planned plan_{i:012x}."}]})
    calls = []

    def fake(model, system, messages, ledger, **kw):
        calls.append(messages[0]["content"])
        return "The person wants decks on advising; they prefer the NU brand.", None, None
    assert agent.compact("conv_compact1", conv, config.NEMOTRON, fake)
    assert len(agent._turn_starts(conv.messages)) == agent.KEEP_TURNS
    assert conv.messages[0]["content"].startswith("Turn 6:")
    assert "prefer the NU brand" in conv.system and "task_000000000000" in conv.system      # ids survive by code
    first = conv.system
    assert not agent.compact("conv_compact1", conv, config.NEMOTRON, fake) or conv.system != first
    assert len(calls) == 1


def test_a_turns_tool_results_become_one_line_and_a_file():
    from ia_next import agent
    conv = agent.Conversation("conv_shrink1")
    conv.messages = [{"role": "user", "content": "Read the report"},
                     {"role": "assistant", "content": [{"type": "tool_use", "id": "toolu_1", "name": "read_report", "input": {}}]},
                     {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "toolu_1", "content": "y" * 50000}]}]
    out = {"task_id": "task_abc", "status": "done", "report": "y" * 50000}
    conv.tool_files["toolu_1"] = (agent._oneline("read_report", out), agent._save_result("conv_shrink1", "toolu_1", "read_report", out))
    agent.shrink_tool_results(conv)
    line = conv.messages[2]["content"][0]["content"]
    assert line.startswith("read_report: task_id=task_abc, status=done") and "tool_results/conv_shrink1/toolu_1.json" in line
    assert os.path.exists(os.path.join(config.DATA_DIR, "tool_results", "conv_shrink1", "toolu_1.json"))


def test_finished_work_is_remembered_with_its_checks_and_verdict():
    from ia_next import memory
    eid = store.create_engagement("Episodes", "x")
    tid, _ = store.create_task(eid, "deck", {"goal": "a board deck on student AI use"}, 0.0)
    store.update_task(tid, status="done", summary="Ten slides on how students use AI")
    memory.episode(store.get_task(tid), scorecard={"hard_failed": ["slides_fit"]})
    memory.episode(store.get_task(tid), verdict="reject", verdict_text="the closing slide repeats")
    got = memory.recall_episodes("another deck about student AI use for the provost", engagement=eid)
    assert got and got[0]["task_id"] == tid
    assert "needs review: slides_fit" in got[0]["line"] and "rejected: the closing slide repeats" in got[0]["line"]
    assert memory.recall_episodes("budget spreadsheet") == []


def test_learned_entries_no_recall_used_for_sixty_days_move_to_the_archive():
    from ia_next import memory
    import time as _t
    memory._write("MEMORY.md", "# What the agent has learned\n- Decks for the provost run ten slides (source: reviewer line 4)"
                  "\n- Prefers the NU brand (source: conversation, 2026-11-01)\n- Advising questions cite r/NEU (source: reviewer line 9)\n")
    now = _t.time()
    assert memory.retire(now)["retired"] == []                                   # first seen now: sixty days start
    memory.recall("advising questions")                                          # a use resets that entry's clock
    later = now + 61 * 86400
    st = memory._stats()
    for k in st:
        if st[k]["last_used"]:
            st[k]["last_used"] = later - 86400
    memory._write(memory.STATS, json.dumps(st))
    got = memory.retire(later)
    assert got["retired"] == ["Decks for the provost run ten slides (source: reviewer line 4)"]
    assert any("Prefers the NU brand" in e for e in memory.entries("MEMORY.md"))   # the person's own instruction stays
    assert "not recalled in 60 days" in memory._read(memory.ARCHIVE)             # archived, never deleted


def test_a_step_opened_with_start_node_shows_the_tokens_written():
    eid = store.create_engagement("Progress", "x")
    tid, _ = store.create_task(eid, "research_report", {"goal": "x"}, 0.0)
    nid = store.start_node(tid, "Analyst", "qwen", 1)
    providers.PROGRESS.get()(1234)                                  # what a streaming call reports
    assert store.conn().execute("SELECT summary FROM nodes WHERE id = ?", (nid,)).fetchone()["summary"] == "writing: 1,234 tokens so far"
    with store.stage(tid, "Editor: inner step", "qwen"):
        inner = providers.PROGRESS.get()
    assert providers.PROGRESS.get() is not inner                    # the stage's own callback ends with the stage
    store.finish_node(nid, None, None, error="stopped")
    assert providers.PROGRESS.get() is None                         # nothing left reporting to a finished step


def test_a_slide_standfirst_is_whole_or_left_out_never_cut():
    from ia_next import slidepage
    long_one = ("The architecture fails because students navigate conflicting course policies and unreliable detection "
                "tools, leading to widespread unauthorized use and uneven learning outcomes.")            # 177 characters
    doc = {"title": "Students meet conflicting AI rules", "standfirst": long_one,
           "zones": [{"name": "Course", "role": "Where rules are set"}], "components": [{"name": "Syllabus", "zone": "Course",
           "does": "States the course's rule on AI use for every assignment and how students should disclose it."}],
           "flows": [], "failures": [], "target": []}
    page = slidepage.architecture(doc, {}, "nxt")
    assert "uneven learning outcomes." in page and "\u2026" not in page
    assert slidepage._lead("word " * 120, 170) == ""                       # too long, one sentence: left out


def test_a_task_scored_clean_after_a_fix_loses_its_needs_review_mark(monkeypatch):
    eid = store.create_engagement("Rescore", "x")
    tid, _ = store.create_task(eid, "artifact", {"goal": "x"}, 0.0)
    store.update_task(tid, status="done", summary="Architecture map ready.")
    results = iter([{"hard_failed": ["no_cut_sentences"], "checks": [], "judge": None},
                    {"hard_failed": [], "checks": [], "judge": None}])
    monkeypatch.setattr(scorecard, "score", lambda t: next(results))
    monkeypatch.setattr("ia_next.improve.maybe_run", lambda: False)
    scorecard.run(tid)
    assert store.get_task(tid)["summary"] == "Needs review (no_cut_sentences). Architecture map ready."
    scorecard.run(tid)
    assert store.get_task(tid)["summary"] == "Architecture map ready."


def test_each_step_of_a_shaped_document_is_counted_against_its_task(monkeypatch):
    from ia_next import localartifact
    seen = []

    def fake(model, system, messages, ledger=None, **kw):
        seen.append(getattr(ledger, "task_id", None))
        raise providers.ProviderError("stop after the first step")
    monkeypatch.setattr(providers, "chat", fake)
    with pytest.raises(providers.ProviderError):
        localartifact._generate_shaped("arch", "nxt", "g", "corpus", {}, "architecture", tid="task_counted")
    assert seen == ["task_counted"]

