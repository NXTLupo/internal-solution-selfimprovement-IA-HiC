"""Work made from the person's own files alone (owner, 25 Nov, E16: a deck "based on the uploaded files" was filed in a new,
empty engagement and failed for lack of evidence while the files sat in another engagement)."""
import time

import pytest

from ia_next import agent, plan, router, store, transcripts


@pytest.fixture()
def db(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.db"))


def test_a_request_that_names_the_persons_files_is_read_as_files_only():
    for said in ("Make a detailed slide deck for educators to understand AI usage based on the uploaded files",
                 "a journey map from my interview transcripts", "summarize the recordings I uploaded",
                 "an infographic on onboarding using these documents only", "write a brief from the attached notes"):
        assert router.files_basis(said) and router.files_only(said), said
    assert router.files_basis("a deck from my files and web research on freight pricing")
    assert not router.files_only("a deck from my files and web research on freight pricing")
    for said in ("a deck on file sharing in hospitals", "themes in document automation", "a report on video interviews in hiring"):
        assert not router.files_basis(said), said
    # which files the work rests on is not what it is about
    said = "Make a detailed slide deck in the Northeastern brand from this engagement for [educators to understand AI usage] based on the uploaded files"
    assert router.subject_of(said, "", outputs=True) == "AI usage"
    assert router.presentation_free(said)[1] == "educators"


@pytest.mark.new_engagement
def test_fresh_uploads_are_used_within_the_engagement_they_were_uploaded_to(db):
    old = store.create_engagement("Earlier study", "o")
    transcripts.add_text_source(old, "an older file.txt", "Older words about another matter entirely, kept from long ago.", "document")
    src = store.create_engagement("Interviews", "o")
    ids = [transcripts.add_text_source(src, f"student {i}.txt", f"Student {i} says they draft with an assistant and then check every source by hand.", "document") for i in range(3)]
    said = "Make a deck for [educators to understand AI usage] based on the uploaded files"
    ctx = {"request": said}
    out = agent._new_engagement_for("start_deck", {"engagement_id": "", "audience": "a"}, ctx)
    assert out["engagement_id"] == src and out["source_ids"] == ids           # filed where the files are, made from them only
    assert len(store.list_engagements()) == 2                                 # no new engagement was opened
    steps, _ = plan.build_steps("start_deck", out, ctx)
    by = {s["key"]: s for s in steps}
    assert "Holds 3 uploaded files" in by["material"]["does"] and "made from your files only" in by["material"]["does"]
    assert by["research"]["on"] is False and "your files only" in by["research"]["note"]
    rows = plan.understood("start_deck", out, said, src)
    carried = next(r for r in rows if r["label"] == "Carried over")["items"]
    assert carried[0] == "3 uploaded files: student 0.txt, student 1.txt, student 2.txt"
    assert router._audience(said) == "educators"
    # a file named in the request is found wherever it was uploaded, and the work is filed there
    named = agent._new_engagement_for("start_artifact", {"engagement_id": "", "goal": "g"}, {"request": "a study guide from an older file.txt only"})
    assert named["engagement_id"] == old and named["source_ids"] == ["S1"]
    # a request that names no files opens an empty engagement, as before
    other = agent._new_engagement_for("start_deck", {"engagement_id": "", "audience": "a"}, {"request": "a deck on freight pricing"})
    assert other["engagement_id"] not in (src, old) and transcripts.uploaded_sources(other["engagement_id"]) == []


@pytest.mark.new_engagement
def test_attached_files_file_the_work_in_their_own_engagement(db):
    from ia_next import attachments
    src = store.create_engagement("Interviews", "o")
    sid = transcripts.add_text_source(src, "student 0.txt", "Student 0 says they draft with an assistant and then check every source by hand.", "document")
    tok = attachments._CURRENT.set({"files": [{"engagement_id": src, "source_id": sid, "title": "student 0.txt", "fresh": True}]})
    try:
        out = agent._new_engagement_for("start_deck", {"engagement_id": "", "audience": "a"}, {"request": "a deck from this file"})
    finally:
        attachments._CURRENT.reset(tok)
    assert out["engagement_id"] == src


def test_files_and_research_together_keep_research_on(db):
    eid = store.create_engagement("Interviews", "o")
    transcripts.add_text_source(eid, "notes.txt", "The team met twice and agreed the pilot would start with two wards in spring.", "document")
    steps, _ = plan.build_steps("start_deck", {"engagement_id": eid, "audience": "a"}, {"request": "a deck from my notes and web research on ward pilots"})
    assert {s["key"]: s for s in steps}["research"]["on"] is True


def test_an_engagement_with_nothing_to_build_from_says_so_in_plain_words():
    from ia_next import material
    assert "start_social_analysis" not in material.NO_EVIDENCE.split("(For the assistant")[0]
    assert "start_social_analysis" in material.NO_EVIDENCE                    # the assistant is still told how to collect each kind
    assert "Attach the files" in material.NO_EVIDENCE


def test_any_uploaded_file_can_be_used_in_any_engagement_by_name(db):
    a = store.create_engagement("Interviews, spring", "o")
    transcripts.add_text_source(a, "StudentA.txt", "Student A says the assistant drafts and she rewrites every paragraph herself.", "document")
    transcripts.add_text_source(a, "college_first_year1.txt", "A first-year says nobody explained which tools the course allows.", "document")
    b = store.create_engagement("Faculty workshop", "o")
    transcripts.add_text_source(b, "agenda.txt", "The workshop runs two hours and ends with a shared policy draft for the term.", "document")
    assert [r["title"] for r in transcripts.library()][:3] == ["agenda.txt", "college_first_year1.txt", "StudentA.txt"]
    # a request filed in another engagement names a file uploaded elsewhere: the file follows the request
    ctx = {"request": "make a study guide from StudentA.txt for the workshop", "focus": b}
    out = agent._with_files("start_artifact", {"engagement_id": b, "goal": "g"}, ctx)
    assert out["files_from"] == "Interviews, spring"
    assert [u["title"] for u in transcripts.uploaded_sources(b)] == ["agenda.txt", "StudentA.txt"]
    assert len(transcripts.uploaded_sources(a)) == 2                          # the first engagement keeps its files
    again = agent._with_files("start_artifact", {"engagement_id": b, "goal": "g"}, {"request": "a quiz from StudentA.txt"})
    assert len(transcripts.uploaded_sources(b)) == 2 and "files_from" not in again     # already there: nothing is copied twice
    # an engagement that has its own files and a request that names none: nothing is brought in
    agent._with_files("start_deck", {"engagement_id": b, "audience": "x"}, {"request": "a deck based on the uploaded files"})
    assert len(transcripts.uploaded_sources(b)) == 2


def test_an_engagement_keeps_its_files_in_context(db):
    a = store.create_engagement("Interviews, spring", "o")
    assert agent.focus_context(a) == "This engagement has no work yet."
    transcripts.add_text_source(a, "StudentA.txt", "Student A says the assistant drafts and she rewrites every paragraph herself.", "document")
    said = agent.focus_context(a)
    assert "Files uploaded in this engagement (1): StudentA.txt [S1]" in said


@pytest.mark.empty_guard
def test_a_plan_with_nothing_to_build_from_keeps_its_research_on(db, monkeypatch):
    import json
    monkeypatch.setattr(plan, "_run", lambda *a, **k: None)                   # the rule is checked; no work is started
    eid = store.create_engagement("Empty", "o")
    steps, label = plan.build_steps("start_deck", {"engagement_id": eid, "audience": "a"}, {"request": "a deck on freight pricing"})
    pid = store.new_id("plan")
    plan._db().execute("INSERT INTO plans (id, conversation, engagement_id, tool, args_json, steps_json, status, note, created) VALUES (?,?,?,?,?,?,?,?,?)",
                       (pid, "c", eid, "start_deck", json.dumps({"engagement_id": eid, "audience": "a"}), json.dumps(steps), "proposed", "", time.time()))
    got = plan.start(pid, skip=["research"], background=False, wait=lambda tid: None)
    research = next(s for s in got["steps"] if s["key"] == "research")
    assert research["on"] is True and "Kept on" in research["note"]


def test_which_set_of_files_is_a_choice_on_the_plan_card(db, monkeypatch):
    eid = store.create_engagement("Interviews", "o")
    clock = [1_795_000_000.0]
    monkeypatch.setattr(transcripts.time, "time", lambda: clock[0])
    first = [transcripts.add_text_source(eid, f"spring {i}.txt", f"Spring interview {i}: the student drafts with an assistant and checks each source.", "document") for i in range(2)]
    clock[0] += 5 * 3600                                                      # a second sitting, hours later
    second = [transcripts.add_text_source(eid, f"autumn {i}.txt", f"Autumn interview {i}: the student asks the assistant to explain a reading first.", "document") for i in range(3)]
    assert [g["ids"] for g in transcripts.sittings(eid)] == [second, first]
    args = {"engagement_id": eid, "audience": "a", "source_ids": second}
    opt = next(o for o in plan.options_for("start_deck", args, "a deck based on the uploaded files") if o["key"] == "files_set")
    assert opt["label"] == "Files" and opt["value"] == "sit0" and [c["value"] for c in opt["choices"]] == ["sit0", "sit1", "all"]
    assert "The 3 files added" in opt["choices"][0]["label"] and "autumn 0.txt" in opt["choices"][0]["label"]
    assert opt["choices"][2]["label"] == "All 5 files in this engagement"
    assert plan.apply_options("start_deck", args, {"files_set": "sit1"})["source_ids"] == first      # the set chosen is the set used
    assert plan.apply_options("start_deck", args, {"files_set": "all"})["source_ids"] == second + first
    # one sitting only, or a request that does not rest on files: no such choice
    assert not any(o["key"] == "files_set" for o in plan.options_for("start_deck", {"engagement_id": eid, "audience": "a"}, "a deck on freight pricing"))


def test_a_file_can_be_removed_from_the_library_and_put_back(db):
    from fastapi.testclient import TestClient
    from ia_next import app as appmod
    c = TestClient(appmod.app)
    eid = store.create_engagement("Interviews", "o")
    a = transcripts.add_text_source(eid, "keep.txt", "The student drafts with an assistant and checks each source by hand afterwards.", "document")
    b = transcripts.add_text_source(eid, "drop.txt", "A second file that the person decides they no longer want to see offered.", "document")
    assert c.post(f"/api/engagements/{eid}/files/{b}/remove", json={"removed": True}).json()["removed"] is True
    assert [f["title"] for f in c.get("/api/files").json()["files"]] == ["keep.txt"]
    assert [u["id"] for u in transcripts.recent_uploads()[1]] == [a] and transcripts.named_in("a quiz from drop.txt") == []
    assert len(transcripts.uploaded_sources(eid)) == 2                        # the engagement keeps it for work already made
    c.post(f"/api/engagements/{eid}/files/{b}/remove", json={"removed": False})
    assert len(c.get("/api/files").json()["files"]) == 2
    assert c.post(f"/api/engagements/{eid}/files/S99/remove", json={"removed": True}).status_code == 404


def test_a_deck_from_the_persons_own_files_has_no_empty_line_on_its_sources_slides():
    from ia_next import deckstudio
    sources = [{"id": f"S{i}", "title": f"interview {i}.txt"} for i in range(1, 8)]
    slides = [{"cites": [s["id"] for s in sources], "source_id": ""}]
    made = deckstudio.sources_slides(slides, sources)
    assert len(made) == 2 and all(s["subtitle"].strip() for s in made)


def test_a_question_about_the_persons_files_is_answered_from_where_they_are(db):
    files = store.create_engagement("Interviews", "o")
    transcripts.add_text_source(files, "studentA.txt", "Student A says the assistant drafts and she rewrites every paragraph herself.", "transcript")
    empty = store.create_engagement("AI usage based on the uploaded files", "o")
    said = "what are the top use cases for AI with students based on the uploaded transcripts"
    assert agent.answer_home(empty, said) == files                            # the empty focus: answered where the files are
    assert agent.answer_home("", said) == files                               # no focus at all
    assert agent.answer_home(files, said) == files
    assert agent.answer_home(empty, "what are the main themes in nurse staffing") == empty     # names no files: the focus stays
    assert agent.answer_home(empty, "what does studentA.txt say about drafting") == files


def test_the_conversation_model_stays_in_memory_and_others_keep_their_time():
    from ia_next import config, providers
    assert providers.keep_alive(config.SEATS["orchestration"]["primary"]) == -1
    assert providers.keep_alive(config.SEATS["fast"]["primary"]) == config.KEEP_ALIVE


def test_a_digest_of_the_persons_data_is_a_chat_question():
    for said in ("summarize the transcripts", "give me the key themes from the interviews", "what are the top use cases in the uploaded files",
                 "list the main takeaways from these files", "what do students say about cheating in the interviews?", "recap the engagement findings"):
        assert plan.is_data_ask(said), said
    for said in ("make a deck from the transcripts", "summarize the transcripts as an infographic", "what is the capital of France",
                 "list the engagements", "#themes from the interviews"):
        assert not plan.is_data_ask(said), said


def test_a_data_question_finds_the_material_when_nothing_or_an_empty_engagement_is_focused(db):
    files = store.create_engagement("Interviews", "o")
    transcripts.add_text_source(files, "studentA.txt", "Student A says the assistant drafts and she rewrites every paragraph herself.", "transcript")
    empty = store.create_engagement("Empty", "o")
    assert agent.answer_home(empty, "summarize the interviews", True) == files
    assert agent.answer_home("", "give me the key themes from the data", True) == files
    assert agent.answer_home(files, "summarize the interviews", True) == files
    assert agent.answer_home(empty, "what is the capital of France", False) == empty
    lone = store.create_engagement("Lone", "o")
    for e in (files, empty):
        store.update_engagement(e, {"archived": True})
    assert agent.answer_home(lone, "summarize the interviews", True) == lone     # nothing else holds material: the focus is tried


def test_a_question_that_names_the_files_reads_only_the_files(db):
    eid = store.create_engagement("Interviews", "o")
    a = transcripts.add_text_source(eid, "studentA.txt", "Student A says the assistant drafts and she rewrites every paragraph herself.", "transcript")
    b = transcripts.add_text_source(eid, "studentB.txt", "Student B checks every answer against the reading before handing anything in.", "transcript")
    assert agent.file_ids(eid, "what are the top use cases based on the uploaded transcripts") == [a, b]
    assert agent.file_ids(eid, "what does studentB.txt say") == [b]
    assert agent.file_ids(eid, "what are the main themes in nurse staffing") is None


def test_a_chat_answer_shows_speech_as_a_clean_sentence_or_no_quote(monkeypatch):
    import json as _json
    from ia_next import answers, providers, studiokit
    speech = ("Transcript of student.MOV. [00:00] i just like paste my notes into the chatbot and i was like can you like shorten it. "
              "I use it to summarize long readings into notes before every class.")
    chunks = [{"pointer": "p1", "source_id": "S1", "title": "student.MOV", "text": speech}]
    monkeypatch.setattr(studiokit, "load_material", lambda e, b, budget=0: ("g", [{"id": "S1", "title": "student.MOV"}], chunks, {}, {}))
    reply = _json.dumps({"answer": "Students use it to condense readings.", "points": [
        {"text": "One student asks it to summarize court cases.", "source_id": "S1",
         "quote": "i just like paste my notes into the chatbot and i was like can you like shorten it."}]})
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (reply, None, None))
    got = answers.answer("e", "how do students use it", quick=True)
    assert "like shorten it" not in got["reply"]
    assert "I use it to summarize long readings into notes before every class." in got["reply"] or "One student asks it to summarize" in got["reply"]
