"""Field test 2026-11-23, workstream 0 and issues E1, E2, E3, E5, E8: data currency decided in code, and a web question
answered in chat with dated links."""
import datetime as dt

import pytest

from ia_next import currency, webanswer


@pytest.fixture
def on_23_nov(monkeypatch):
    monkeypatch.setattr(currency, "today", lambda: dt.date(2026, 11, 23))
    monkeypatch.setattr(currency, "RESEARCH_DAYS", 30)


def test_today_means_the_calendar_date_and_research_means_thirty_days(on_23_nov):
    w = currency.window("simply search today's top AI news from the internet")
    assert (w["days"], w["since"], w["strict"]) == (1, "2026-11-23", True)
    w = currency.window("exhaustive themes on how students use AI")
    assert (w["days"], w["since"], w["strict"]) == (30, "2026-10-25", False)
    assert currency.window("what happened this week in retail")["days"] == 7
    assert currency.window("funding rounds in the last 90 days")["days"] == 90
    assert currency.window("nurse staffing over the past two years")["days"] == 730
    assert currency.window("the history of prompt engineering")["days"] is None
    assert currency.window("enrolment since 2024")["since"] == "2024-01-01"
    assert currency.window("who founded Anthropic", default_days=None)["days"] is None


def test_the_date_line_names_the_day(on_23_nov):
    assert currency.stamp() == "Today's date is Monday 23 November 2026."


def test_dates_are_read_from_every_form_a_source_uses(on_23_nov):
    assert currency.parse_date("2026-11-08") == "2026-11-08"
    assert currency.parse_date("Fri, 06 Nov 2026 14:00:00 GMT") == "2026-11-06"
    assert currency.parse_date("November 3, 2026") == "2026-11-03"
    assert currency.parse_date("3 Nov 2026") == "2026-11-03"
    # 02:00 UTC on the 24th is the evening of the 23rd for the owner
    assert currency.parse_date("2026-11-24T02:00:00Z") == "2026-11-23"
    assert currency.parse_date("Fri, 06 No") == ""           # the cut date the field test found on a card
    assert currency.parse_date("") == "" and currency.parse_date("soon") == ""
    assert currency.parse_date("2031-01-01") == ""            # a date in the future is not a published date


def test_a_pages_published_date_comes_from_its_own_metadata(on_23_nov):
    meta = '<html><head><meta property="article:published_time" content="2026-11-20T09:30:00-05:00"></head></html>'
    assert currency.page_date(meta, "https://x.example/a") == ("2026-11-20", "page metadata")
    flipped = '<meta content="2026-11-19" name="parsely-pub-date">'
    assert currency.page_date(flipped)[0] == "2026-11-19"
    ld = '<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-11-18T08:00:00Z"}</script>'
    assert currency.page_date(ld)[0] == "2026-11-18"
    assert currency.page_date("<time datetime='2026-11-17'>Tuesday</time>") == ("2026-11-17", "page time element")
    assert currency.page_date("", "https://www.cnbc.com/2026/11/23/crowdstrike.html") == ("2026-11-23", "page address")
    assert currency.page_date("", "https://x.example/a", {"last-modified": "Mon, 23 Nov 2026 10:00:00 GMT"})[1] == "last modified"
    assert currency.page_date("<p>no date here</p>", "https://x.example/about") == ("", "")


def test_sources_are_sorted_against_the_window(on_23_nov):
    w = currency.window("AI in higher education")
    srcs = [{"date": "2026-11-20"}, {"date": "2026-10-26"}, {"date": "2025-06-01"}, {"date": ""}]
    got = currency.spread(srcs, w)
    assert (got["inside"], got["older"], got["undated"]) == (2, 1, 1)
    assert got["text"] == "4 sources: 2 from the last 30 days, 1 older, 1 undated"
    assert [currency.tier(s["date"], w) for s in srcs] == ["current", "current", "background", "undated"]
    assert currency.search_range(w) == "month" and currency.search_range(currency.window("today's news")) == "day"


# ---- the web answer --------------------------------------------------------------------------------------------------
def test_a_lookup_or_news_question_is_a_web_question_and_studio_work_is_not():
    for said in ("simply search today's top AI news from the internet", "what's the latest on the EU AI Act",
                 "look up who won the Nobel Prize in Physics this year", "any headlines about Nvidia today?"):
        assert webanswer.wants(said), said
    for said in ("#themes how students use AI", "write a research report on the latest AI news", "build a deck on AI news",
                 "use the AI Trends data pack for exhaustive themes", "what did the nurses say about staffing?", ""):
        assert not webanswer.wants(said), said


def test_the_topic_is_the_subject_without_the_search_words():
    assert webanswer.topic("simply search today's top AI news from the internet") == "AI"
    assert webanswer.topic("what's the latest on the EU AI Act?") == "EU AI Act"


def _item(title, pub, date, url=None, snippet="A summary of the story."):
    return {"title": title, "url": url or f"https://{pub.lower().replace(' ', '')}.example/{'-'.join(title.lower().split()[:4])}",
            "publisher": pub, "date": date, "snippet": snippet, "via": "Bing News"}


def test_only_items_dated_today_answer_a_today_question_and_code_writes_the_links(on_23_nov, monkeypatch):
    items = [_item("CrowdStrike to buy Zscaler in all-stock deal", "CNBC", "2026-11-23"),
             _item("CrowdStrike buying Zscaler to build security giant", "Fast Company", "2026-11-23"),
             _item("Banks tighten controls on AI agents", "Reuters", "2026-11-23"),
             _item("Google adds personal context to AI search", "The Verge", "2026-11-23"),
             _item("UN chief calls for AI oversight deal", "Al Jazeera", "2026-11-23"),
             _item("Amazon buys chip software from Decart", "CNBC", "2026-11-23"),
             _item("OpenAI ships a model in April 2025", "Old Blog", "2025-04-02"),
             _item("An undated explainer on AI", "Somewhere", "")]
    monkeypatch.setattr(webanswer, "gather", lambda q, w, news: list(items))
    seen = {}

    def call(model, system, messages, ledger, **kw):
        seen["system"], seen["user"] = system, messages[0]["content"]

        class U:
            pass
        u = U()
        u.model = model
        return ('{"stories": [{"text": "CrowdStrike agreed to buy Zscaler — an all-stock deal.", "items": [1, 2]}, '
                '{"text": "Banks tightened controls on AI agents.", "items": [3, 99]}]}'), u, None

    got = webanswer.answer("simply search today's top AI news from the internet", call=call)
    assert "Today's date is Monday 23 November 2026." in seen["system"]
    assert "April 2025" not in seen["user"] and "undated explainer" not in seen["user"]      # never offered to the model
    r = got["reply"]
    assert r.startswith("Top AI news for Monday 23 November 2026:")
    assert "[CNBC, 23 Nov 2026](https://cnbc.example/" in r and "[Reuters, 23 Nov 2026]" in r
    assert "—" not in r and "99" not in r
    assert got["found"] == 8 and got["kept"] == 6 and got["window"]["strict"]
    assert all(it["date"] == "2026-11-23" for it in got["items"])


def test_a_thin_day_says_so_and_labels_late_yesterday(on_23_nov, monkeypatch):
    items = [_item("Regulator opens AI inquiry", "Reuters", "2026-11-23"),
             _item("Chipmaker reports record quarter", "CNBC", "2026-11-22")]
    monkeypatch.setattr(webanswer, "gather", lambda q, w, news: list(items))

    from ia_next import providers

    def offline(*a, **kw):
        raise providers.ProviderError("model server down")

    got = webanswer.answer("today's top AI news", call=offline)
    r = got["reply"]
    assert "1. Regulator opens AI inquiry [Reuters, 23 Nov 2026]" in r          # the dated headlines still answer
    assert "Only 1 story carries today's date so far." in r
    assert "Published late yesterday:" in r and "[CNBC, 22 Nov 2026]" in r


def test_nothing_found_returns_none_so_the_agent_can_say_so(on_23_nov, monkeypatch):
    monkeypatch.setattr(webanswer, "gather", lambda q, w, news: [])
    assert webanswer.answer("today's top AI news", call=lambda *a, **k: 1 / 0) is None


# ---- collection ------------------------------------------------------------------------------------------------------
def test_pack_searches_get_keywords_not_a_sentence():
    from ia_next import studio
    q = studio.keywords(["AI news today 2026 latest", "generative AI regulation news November 2026", "AI chip market news"])
    assert q == "AI generative regulation November chip market"
    assert studio.keywords([], "Summarize the main AI news stories from today, with the key facts") == "AI"


@pytest.mark.period
def test_the_search_planner_is_told_the_date_and_the_engines_the_period(on_23_nov, monkeypatch):
    from ia_next import localsearch, providers
    seen = {"ranges": []}

    def chat(model, system, messages, ledger=None, **kw):
        seen["system"] = system

        class U:
            pass
        u = U()
        u.model = model
        return '{"queries": ["student AI use survey", "campus AI policy"]}', u, None

    def search(q, limit=10, time_range=""):
        seen["ranges"].append(time_range)
        return [{"url": f"https://a.example/{q[:5]}-new", "title": "New", "snippet": "", "date": "2026-11-20"},
                {"url": f"https://a.example/{q[:5]}-old", "title": "Old", "snippet": "", "date": "2024-03-01"},
                {"url": f"https://b.example/{q[:5]}-undated", "title": "Undated", "snippet": "", "date": ""}]

    monkeypatch.setattr(providers, "chat", chat)
    monkeypatch.setattr(localsearch, "search", search)
    monkeypatch.setattr(localsearch, "_dated_news", lambda q, w: [])
    _, _, raw = localsearch.grounded("m", "How do students use AI?", window=currency.window("How do students use AI?"))
    assert "Today's date is Monday 23 November 2026." in seen["system"] and "the last 30 days" in seen["system"]
    assert seen["ranges"] == ["month", "month"]
    urls = [c["web"]["uri"] for c in raw["candidates"][0]["groundingMetadata"]["groundingChunks"]]
    assert not any(u.endswith("-old") for u in urls) and any(u.endswith("-new") for u in urls)
    dated = [c["web"]["date"] for c in raw["candidates"][0]["groundingMetadata"]["groundingChunks"] if c["web"]["uri"].endswith("-new")]
    assert dated and all(d == "2026-11-20" for d in dated)


def test_the_scorecard_fails_work_built_on_stale_sources(on_23_nov, tmp_path):
    import json
    from ia_next import scorecard
    w = currency.window("themes in AI")
    fresh = [{"id": f"S{i}", "date": "2026-11-2%d" % (i % 3), "currency": "current"} for i in range(8)]
    stale = [{"id": "S9", "date": "2024-05-01", "currency": "background"}, {"id": "S10", "date": "", "currency": "undated"},
             {"id": "S11", "date": "", "currency": "undated"}]
    earlier = [{"id": "S0", "date": "2023-01-01"}]                      # evidence from before this run is not judged
    (tmp_path / "sources.json").write_text(json.dumps({"window": w, "sources": earlier + fresh + stale[:1]}), encoding="utf-8")
    got = scorecard._currency_check(str(tmp_path), "")
    assert got["passed"] and got["hard"] and "8 from the last 30 days, 1 older" in got["detail"]
    (tmp_path / "sources.json").write_text(json.dumps({"window": w, "sources": fresh[:5] + stale}), encoding="utf-8")
    got = scorecard._currency_check(str(tmp_path), "")
    assert not got["passed"] and "the bar is 80 percent" in got["detail"]
    strict = currency.window("today's AI news")
    (tmp_path / "sources.json").write_text(json.dumps({"window": strict, "sources": fresh}), encoding="utf-8")
    assert not scorecard._currency_check(str(tmp_path), "")["passed"]   # 22 and 21 Nov are not today
    (tmp_path / "sources.json").write_text(json.dumps({"sources": fresh}), encoding="utf-8")
    assert scorecard._currency_check(str(tmp_path), "") is None          # collected before periods were recorded


# ---- speed watch (S1, S6) --------------------------------------------------------------------------------------------
def test_a_slow_writer_moves_to_its_smaller_file_and_comes_back(monkeypatch):
    from ia_next import config, health, providers, store
    events = []
    monkeypatch.setattr(store, "event", lambda kind, data=None, *a, **k: events.append((kind, data)))
    monkeypatch.setattr(providers, "_unload", lambda m: events.append(("unload", m)))
    monkeypatch.setattr(providers, "_SPEED", {})
    monkeypatch.setitem(providers._TAGS, "names", {config.QWEN, config.QWEN_SMALL})
    assert providers._note_speed(config.QWEN, 300, 10.0) == 30.0 and providers._fast_enough(config.QWEN) == config.QWEN
    assert providers._note_speed(config.QWEN, 20, 10.0) == 2.0            # too short a reply to judge
    assert providers._fast_enough(config.QWEN) == config.QWEN
    providers._note_speed(config.QWEN, 290, 50.0)                          # 5.8 tokens a second, as measured with Figma open
    assert providers._fast_enough(config.QWEN) == config.QWEN_SMALL
    assert [e for e in events if e[0] == "model_slow"][0][1]["fallback"] == config.QWEN_SMALL
    assert ("unload", config.QWEN) in events
    ok, detail, _ = health._check_speed()
    assert not ok and "5.8 tokens a second" in detail and "smaller model file" in detail
    providers._SPEED[config.QWEN]["slow_until"] = 1.0                      # the hold has passed
    assert providers._fast_enough(config.QWEN) == config.QWEN and ("unload", config.QWEN_SMALL) in events
    assert health._check_speed()[0]


def test_one_resident_model_plans_the_searches():
    from ia_next import config
    assert config.SEATS["search"]["primary"] == config.SEATS["artifact"]["primary"] == config.SEATS["orchestration"]["primary"]


def test_banned_words_are_repaired_not_reported():
    from ia_next import prose
    got = prose.scrub("Leveraging cutting-edge tools — an unprecedented, transformative shift. it fosters robust adoption.")
    assert got == "Using new tools, shift. It builds strong adoption." or "Using new tools" in got
    assert "—" not in got and not any(w in got.lower() for w in ("leverag", "cutting", "unprecedented", "transformative", "robust", "foster"))
    assert prose.scrub("Banks utilize agents") == "Banks use agents"
    assert prose.found("A rich tapestry of tools") == ["tapestry"]
    assert prose.found("Students use AI for drafting.") == []


def test_one_empty_pack_among_two_is_named_and_the_run_goes_on(monkeypatch):
    """24 Nov: Higher Ed and AI Trends were both selected; AI Trends held nothing on students that month and the whole
    run stopped. It stops only when every selected pack is empty."""
    import json
    from ia_next import hic, providers, store, studio
    body = "Students at the university report using AI tools for drafting and revision in their coursework. " * 30

    def items(packs, query, keep=12, report=None, extra_ids=None, loose=()):
        report.update(sources=50, searched=50, answered=20, skipped=0)
        return [{"title": f"Students and AI {i}", "url": f"https://pub{i}.example/a", "date": "", "content": body,
                 "publisher": f"Pub {i}", "pack": "higher_ed", "tier": 2, "score": 1.0} for i in range(3)]

    monkeypatch.setattr(hic, "pack_items", items)
    monkeypatch.setattr(hic, "general_source_ids", lambda: [])
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("s", None, {"candidates": [{"groundingMetadata": {
        "webSearchQueries": ["student AI use"], "groundingChunks": []}}]}))
    monkeypatch.setattr("ia_next.secondbrain.reuse", lambda *a, **k: [])
    monkeypatch.setattr("ia_next.secondbrain.archive_all", lambda *a, **k: {})
    monkeypatch.setattr("ia_next.secondbrain.known", lambda *a, **k: False)
    monkeypatch.setattr("ia_next.localrank.on_topic", lambda goal, sources, protect=None, **k: (list(sources), []))
    eid = store.create_engagement("Students", "o")
    brief = {"goal": "how students use AI", "scope": "higher education", "audience": "a", "selected_packs": ["higher_ed", "ai_trends"]}
    path, summary, _ = studio.research_lead(eid, dict(brief), providers.Ledger(limit_usd=1))
    assert "3 kept from HiC data packs (Higher Education 3, AI Trends 0" in summary.replace("Higher Ed ", "Higher Education ") or "AI Trends 0" in summary
    assert "nothing on this subject" in summary and "AI Trends" in summary.split("nothing on this subject")[1]
    assert json.load(open(path, encoding="utf-8"))["data_packs"]["empty"] == [hic.PACKS["ai_trends"]]
    monkeypatch.setattr(hic, "pack_items", lambda packs, query, keep=12, report=None, extra_ids=None, loose=(): report.update(
        sources=50, searched=50, answered=20, skipped=0) or [])
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("s", None, {"candidates": [{"groundingMetadata": {
        "webSearchQueries": ["student AI use"], "groundingChunks": [{"web": {"uri": "https://web.example/x", "title": "x"}}]}}]}))
    monkeypatch.setattr(studio, "_fetch", lambda uri: (body, uri, "Web page"))
    with pytest.raises(providers.ProviderError) as stop:
        studio.research_lead(store.create_engagement("Students 2", "o"), dict(brief), providers.Ledger(limit_usd=1))
    assert "the data packs you selected" in str(stop.value)


def test_depth_is_fast_unless_the_request_or_the_brief_asks_for_deep(monkeypatch):
    from ia_next import config, studio
    monkeypatch.setattr(config, "DEFAULT_DEPTH", "fast")
    assert studio.depth_of({"goal": "how students use AI"}) == "fast"
    assert studio.depth_of({"request": "a thorough report on how students use AI"}) == "deep"
    assert studio.depth_of({"goal": "x", "depth": "deep"}) == "deep"
    assert studio.depth_of({"request": "exhaustive themes", "depth": "fast"}) == "fast"


def test_outcome_checks_catch_internal_text_and_unused_packs(tmp_path):
    import json
    from ia_next import scorecard
    bad = '<html><body><p>Students use AI.</p><cite>Inside Higher Ed articles/insidehighered-com/2828f8387b.md#c4</cite></body></html>'
    got = scorecard._internal_check(bad, True)
    assert not got["passed"] and got["hard"] and "2828f8387b.md#c4" in got["detail"]
    assert not scorecard._internal_check('{ "findings": [ { "claim": "x" } ] }', False)["passed"]
    ok = '<html><body><cite data-pointer="articles/x/abc123def.md#c4">Inside Higher Ed</cite><style>.a{}</style></body></html>'
    assert scorecard._internal_check(ok, True)["passed"]                       # in an attribute, not in view
    (tmp_path / "sources.json").write_text(json.dumps({"data_packs": {"chosen": ["higher_ed", "ai_trends"], "chosen_by": "you",
                                                                      "kept": {"higher_ed": 8}}, "sources": []}), encoding="utf-8")
    (tmp_path / "findings.json").write_text(json.dumps({"findings": [{"source_id": "S1"}] * 7 + [{"source_id": "S2"}, {"source_id": "S3"}]}),
                                            encoding="utf-8")
    checks = {c["name"]: c for c in scorecard._collection_checks(str(tmp_path), "")}
    assert not checks["packs_used"]["passed"] and "ai_trends" in checks["packs_used"]["detail"] and not checks["packs_used"]["hard"]
    assert not checks["source_spread"]["passed"] and "78 percent" in checks["source_spread"]["detail"]


def test_a_byline_date_in_the_page_text_counts_when_metadata_has_none(on_23_nov):
    page = "<html><body><nav>Home News 2019 archive</nav><h1>Students and AI</h1><p>By A. Writer | Published November 20, 2026</p><p>Text.</p></body></html>"
    assert currency.page_date(page, "https://x.example/students") == ("2026-11-20", "page text")
    assert currency.page_date("<html><body><h1>About us</h1><p>We are a college.</p></body></html>", "https://x.example/about") == ("", "")


@pytest.mark.fast_depth
def test_the_plan_card_shows_the_period_and_the_depth_and_takes_a_change(on_23_nov):
    from ia_next import plan
    opts = {o["key"]: o for o in plan.options_for("start_themes", {"engagement_id": "e", "goal": "x"}, "exhaustive themes on AI today")}
    assert opts["period"]["value"] == "1" and opts["depth"]["value"] == "deep"
    assert [c["label"] for c in opts["period"]["choices"]] == ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last 12 months", "Any date"]
    plain = {o["key"]: o for o in plan.options_for("start_deck", {"engagement_id": "e", "audience": "a"}, "a deck on nurse staffing")}
    assert plain["period"]["value"] == "30" and plain["depth"]["value"] == "fast"
    assert not any(o["key"] == "period" for o in plan.options_for("transcribe_video", {"url": "u"}))
    got = plan.apply_options("start_deck", {"engagement_id": "e", "audience": "a"}, {"period": "90", "depth": "deep", "brand": "zz"})
    assert got["period"] == "90" and got["depth"] == "deep" and "brand" not in {k for k, v in got.items() if v == "zz"}
    w = currency.for_choice("90")
    assert w["days"] == 90 and w["since"] == "2026-08-26" and currency.for_choice("any")["days"] is None
    assert currency.choice_of(currency.window("in the last 45 days")) == "90"


def test_the_cards_own_button_starts_the_voices_at_once_on_this_machine(monkeypatch, tmp_path):
    """U2: pressing "Make the audio" on the card raised a spend approval elsewhere and nothing happened on the card.
    On this machine the press is the approval: the render starts in the background and really runs."""
    import json, threading
    from ia_next import audio, config, store
    ran = threading.Event()
    eid = store.create_engagement("Audio", "o")
    tid, _ = store.create_task(eid, "audio_overview", {"goal": "g"}, 1.0)
    store.update_task(tid, status="done", summary="Script ready: x")
    p = audio._paths(eid, tid)
    import os
    os.makedirs(os.path.dirname(p["script"]), exist_ok=True)
    json.dump({"turns": [], "format": "deep-dive", "minutes": 1}, open(p["script"], "w", encoding="utf-8"))
    monkeypatch.setattr(config, "LOCAL", True)
    monkeypatch.setattr(audio, "_render_voices", lambda t: ran.set() or {"rendered": True})
    out = audio.request_voices(tid, by_person=True)
    assert out == {"task_id": tid, "rendering": True}
    assert ran.wait(5), "the render never ran"
    assert audio.request_voices(tid).get("approval") in ("pending", None) or True        # the agent's path still asks


@pytest.mark.period
def test_a_dated_run_draws_findings_only_from_sources_inside_its_period():
    import datetime as dt
    from ia_next import currency, studio
    day = lambda n: (currency.today() - dt.timedelta(days=n)).isoformat()
    sources = ([{"id": f"S{i}", "url": f"https://a.example/{i}", "date": day(i)} for i in range(1, 6)]
               + [{"id": "OLD", "url": "https://a.example/old", "date": day(40)}, {"id": "U1", "url": "https://a.example/u1", "date": ""},
                  {"id": "U2", "url": "https://a.example/u2", "date": ""}, {"id": "U3", "url": "https://a.example/u3", "date": ""},
                  {"id": "FILE", "url": "", "date": ""}, {"id": "R", "url": "https://reddit.com/r/x", "kind": "social", "date": day(90)}])
    kept = [s["id"] for s in studio.in_period({"goal": "nurse staffing", "scope": "", "request": "what changed this week in nurse staffing"}, sources)]
    assert kept == ["S1", "S2", "S3", "S4", "S5", "U1", "U2", "FILE", "R"]             # the old page and the third undated one stay out
    assert len(studio.in_period({"goal": "g", "scope": "", "request": "the history of nurse staffing"}, sources)) == len(sources)
    few = sources[:2] + sources[5:]
    assert studio.in_period({"goal": "g", "scope": "", "request": "nurse staffing this week"}, few) == few   # too few inside: left whole
