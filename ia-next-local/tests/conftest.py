"""Shared test guard: no test ever reaches the live HiC proxy (its wiki is the shared second brain; a test write there
would pollute real work). HiC is pointed at a closed local port; tests that exercise the link mock hic._call."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, hic  # noqa: E402


@pytest.fixture(autouse=True)
def _no_progress_callback():
    """Each test starts with no streaming-progress callback: a step a previous test opened and never finished would
    otherwise make this test's model calls stream (store.start_node sets one; finish_node clears it)."""
    from ia_next import providers, store
    tok = providers.PROGRESS.set(None)
    tr = store.TRACE.set("")                     # nor a trace a previous test's stage took on (WS-H3)
    yield
    try:
        providers.PROGRESS.reset(tok)
        store.TRACE.reset(tr)
    except ValueError:
        pass


@pytest.fixture(autouse=True)
def _person_idle(request, monkeypatch):
    """Background work's "is the person's work running?" check reads as idle: tasks other tests leave running in the
    shared store are not the person's (26 Nov). tests/test_migration_yields.py checks the real thing."""
    from ia_next import health, hicmigrate
    health._EMBEDDER.update(at=0.0, value=None)            # the embedder check's five-minute result is per test
    hicmigrate.STATE.pop("paused_since", None)
    hicmigrate._BUSY.update(at=0.0, busy=False)
    if "test_migration_yields" not in request.node.nodeid:
        monkeypatch.setattr(hicmigrate, "foreground_busy", lambda ttl=2.0: False)


@pytest.fixture(autouse=True)
def _no_live_hic(monkeypatch, tmp_path):
    monkeypatch.setattr(hic, "HIC_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(hic, "RUNTIME_CONFIG", str(tmp_path / "no-hic-config.json"))
    monkeypatch.setattr(config, "RENDER_URL", "http://127.0.0.1:9")       # nor the prototype renderer
    from ia_next import social                                             # nor Social Research, the shared Reddit engine
    monkeypatch.setattr(social, "SHARED_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(hic, "_GENERAL", {"ids": None, "at": 0.0, "in_pack": 0})        # no cached general sources leak between tests
    # IA Next Local: no test reaches the model server, the search service or the image engine on this machine
    monkeypatch.setattr(config, "OLLAMA_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(config, "SEARCH_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(config, "COMFY_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("IA_NEXT_KEEP_READY", "0")                          # no test loads a model in the background
    from ia_next import pagetext                                           # nor the open web, through the deep reader
    monkeypatch.setattr(pagetext, "_get", lambda url: (None, b""))
    monkeypatch.setattr(pagetext, "_browse", lambda url: None)                # nor the browser reader
    monkeypatch.setattr(pagetext, "READER_URL", "")
    from ia_next import videotranscript, youtube                           # nor YouTube
    monkeypatch.setattr(videotranscript, "probe", lambda url: {})
    monkeypatch.setattr(videotranscript, "captions", lambda vid: [])
    monkeypatch.setattr(youtube, "_search_entries", lambda q, n: [])
    from ia_next import packsocial                                         # nor Reddit through the packs' subreddits
    monkeypatch.setattr(packsocial, "search_packs", lambda *a, **k: ([], {}))
    monkeypatch.setattr(packsocial, "search_names", lambda *a, **k: ([], {"kept": 0}))
    from ia_next import packsources                                        # and an empty pack registry: every source goes to
    monkeypatch.setattr(packsources, "_CACHE", {"reg": {}})                 # HiC's multi-search unless a test says otherwise
    youtube._PROBED.clear()
    youtube._COOL.update(until=0, blocked_until=0)
    from ia_next import localmedia
    monkeypatch.setattr(localmedia, "ENGINE_WAIT", 0)                      # and no test waits for an engine to restart
    from ia_next import store
    monkeypatch.setattr(store, "SCORE_ON_DONE", False)                     # the scorecard is tested directly, not by threads


# IA Next Local: tests copied from IA Next that assert the PAID providers' mechanics. This build has none of them
# (no token prices, no request bodies for Anthropic, OpenAI or Google, no paid video, image or transcription service,
# and HiC's document engine is replaced by the local author), so they are reported as skipped with the reason, never
# deleted silently. tests/test_local_build.py holds the local contract that replaces them.
NOT_IN_LOCAL_BUILD = {
    "test_a_document_from_hic_needs_spend_approval": "a document is written on this machine at no cost; the plan card starts it",
    "test_approving_a_document_on_its_card_returns_the_task_to_follow": "no spend approval for a local document",
    "test_one_conversation_waits_for_approval_past_its_limit": "local work costs 0.00, so a conversation never reaches a spend limit",
    "test_claude_body_never_carries_rejected_fields": "no Anthropic request body is built",
    "test_only_the_agent_loop_caches_its_messages": "no paid prompt cache; the local server keeps prefixes itself",
    "test_meter_prices_cache_reads_and_writes": "no token prices",
    "test_gemini_cached_tokens_are_metered_once": "no Gemini call",
    "test_openai_body_has_no_temperature": "no OpenAI request body is built",
    "test_ledger_stops_spend_over_budget": "local calls cost 0.00, so a budget is never passed",
    "test_approved_video_runs_once_and_mirrors_the_interactions_request": "no paid video service; local video is not installed",
    "test_video_reply_without_inline_data_fails": "no paid video service",
    "test_image_runs_directly_asks_for_no_text_and_saves_a_png": "asserts the paid image model's id",
    "test_revise_changes_only_the_named_slide_keeps_its_picture_and_the_previous_version": "asserts a cost above zero",
    "test_the_token_comes_from_hics_runtime_config_on_each_call": "uses a PDF upload, which is parsed here, not in HiC",
    "test_hic_down_or_refusing_raises_a_readable_reason": "uses a PDF upload, which is parsed here, not in HiC",
    "test_an_artifact_is_made_in_hic_checked_here_and_served_in_a_sandbox": "documents are written by the local author, not HiC's engine",
    "test_every_metered_call_is_recorded_as_spend": "asserts a cost above zero",
    "test_the_ledger_raises_a_stop_that_ordinary_error_handlers_cannot_swallow": "asserts a cost above zero",
    "test_stop_pressed_during_a_real_deck_run_stops_it_after_the_call_in_flight": "asserts a cost above zero",
    "test_the_reviewer_sees_the_screenshots": "asserts the Gemini request shape",
    "test_gemini_request_carries_images": "asserts the Gemini request shape",
    "test_research_case_fails_when_the_judge_shares_the_authors_vendor": "asserts paid vendor names; publishers are checked in test_local_build",
    "test_transcribe_audio_uses_the_chosen_model_and_stores_the_text": "asserts OpenAI's transcription model id",
    "test_prototype_gets_one_correction_then_saves_a_clean_file": "scripted replies assume no design review runs without a paid key",
}


def pytest_collection_modifyitems(config, items):
    for item in items:
        why = NOT_IN_LOCAL_BUILD.get(item.originalname if hasattr(item, "originalname") else item.name)
        if why:
            item.add_marker(pytest.mark.skip(reason="not in IA Next Local: " + why))


@pytest.fixture(autouse=True)
def _legacy_empty_plans(request, monkeypatch):
    """QA 25 Nov (E16): a plan on an engagement that holds nothing now keeps its research step on. Tests written before
    that skip research on an empty engagement to reach the builder; they run with the rule off. A test of the rule
    asks for it with @pytest.mark.empty_guard."""
    if "empty_guard" not in request.keywords:
        from ia_next import config as _cfg
        monkeypatch.setattr(_cfg, "KEEP_RESEARCH_WHEN_EMPTY", False, raising=False)


@pytest.fixture(autouse=True)
def _no_default_period(request, monkeypatch):
    """Field test 23 Nov: research with no stated period now means the last 30 days (currency.py). The collection tests
    written before that rule use undated stand-in pages; they run with no default period. A test that checks the rule
    asks for it with @pytest.mark.period."""
    if "period" not in request.keywords:
        from ia_next import currency
        monkeypatch.setattr(currency, "RESEARCH_DAYS", None)
    if "fast_depth" not in request.keywords:
        # report tests written before the two depths script a reviewing model for every report
        from ia_next import config
        monkeypatch.setattr(config, "DEFAULT_DEPTH", "deep", raising=False)
    if "deck_steps" not in request.keywords:
        # the deck tests written before the stepped composer script one reply that holds the whole deck
        from ia_next import config
        monkeypatch.setattr(config, "DECK_STEPS", False, raising=False)
    if "report_steps" not in request.keywords:
        from ia_next import config
        monkeypatch.setattr(config, "REPORT_STEPS", False, raising=False)
    if "doc_steps" not in request.keywords:
        # document tests written before the stepped author script one reply that holds the whole document
        from ia_next import config
        monkeypatch.setattr(config, "DOC_STEPS", False, raising=False)
    if "deck_figures" not in request.keywords:
        # deck tests written before the figures slide count the slides the scripted reply holds
        from ia_next import config
        monkeypatch.setattr(config, "DECK_FIGURES_SLIDE", False, raising=False)
    if "audio_exchanges" not in request.keywords:
        # audio tests written before the conversation pass script one reply for the whole script
        from ia_next import config
        monkeypatch.setattr(config, "AUDIO_EXCHANGES", False, raising=False)
    if "new_engagement" not in request.keywords:
        # conversation tests written before "New engagement means new" let the scripted model name an engagement
        from ia_next import agent as _agent
        monkeypatch.setattr(_agent, "NEW_MEANS_NEW", False, raising=False)
    if "deck_sources" not in request.keywords:
        # deck tests written before the sources slide count the slides the scripted reply holds
        from ia_next import config
        monkeypatch.setattr(config, "DECK_SOURCES_SLIDE", False, raising=False)
    if "whole_pack" not in request.keywords:
        # collection tests written before a deep request read its packs whole script the pack search they expect
        from ia_next import config
        monkeypatch.setattr(config, "DEEP_WHOLE_PACK", False, raising=False)
    if "scope_check" not in request.keywords:
        # analyst tests written before the population check script one reply per window of passages
        from ia_next import config
        monkeypatch.setattr(config, "SCOPE_CHECK", False, raising=False)


def pytest_configure(config):
    config.addinivalue_line("markers", "period: the test runs with the 30-day default research period")
    config.addinivalue_line("markers", "empty_guard: the test runs with research kept on for an engagement that holds nothing")
    config.addinivalue_line("markers", "deck_steps: the test runs the deck composer in steps (storyline, then batches)")
    config.addinivalue_line("markers", "fast_depth: the test runs with the fast default depth (no second-model review)")
    config.addinivalue_line("markers", "report_steps: the test runs the report writer in steps (outline, then sections)")
    config.addinivalue_line("markers", "scope_check: the test runs the population check on findings")
    config.addinivalue_line("markers", "audio_exchanges: the test runs the audio script's conversation pass")
    config.addinivalue_line("markers", "deck_figures: the test lets the deck add its slide of quoted figures")
    config.addinivalue_line("markers", "doc_steps: the test runs the document author in steps (plan, then sections)")
    config.addinivalue_line("markers", "new_engagement: with no engagement chosen, work is filed in a new one")
    config.addinivalue_line("markers", "whole_pack: a deep request reads every source of its packs first")
    config.addinivalue_line("markers", "deck_sources: the test lets the deck add its slides that list the sources")
