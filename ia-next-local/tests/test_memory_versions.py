"""Memory guardrails (harness WS-H11, 26 Nov; the Anthropic Applied AI talk): every change is a version with who made
it, why and the turn it came from; any version can be restored; the person's own memory (USER.md) only changes on
their instruction; a writer that drafted against older text is refused; memory exports and imports."""
import pytest

from ia_next import memory, store


def test_every_change_is_a_version_and_any_version_can_be_restored():
    memory.remember_now("The owner prefers decks of twelve slides", "workspace")
    first = memory._read("MEMORY.md")
    tok = store.TRACE.set("tr_aaaaaaaaaaaa")
    try:
        memory.remember_now("Reports cite the Library first", "workspace")
    finally:
        store.TRACE.reset(tok)
    vs = memory.versions("MEMORY.md")
    assert [v["reason"] for v in vs[:2]] == ["remember", "remember"] and vs[0]["trace"] == "tr_aaaaaaaaaaaa"
    assert vs[0]["author"] == "person"
    got = memory.rollback(vs[1]["id"])
    assert got["ok"] and memory._read("MEMORY.md") == first                         # back to the state after the first
    assert memory.versions("MEMORY.md")[0]["reason"] == "rollback"                # the restore is itself a version
    memory.forget("twelve slides")
    assert memory.versions("MEMORY.md")[0]["reason"] == "forget"


def test_the_persons_own_memory_changes_only_on_their_instruction():
    with pytest.raises(PermissionError):
        memory._versioned_write("USER.md", "# About the person\n- inferred by a model\n", "dreaming", "dreaming")
    memory.remember_now("Name: Jordan", "workspace", kind="user")                  # the person's own instruction is allowed
    assert "Jordan" in memory._read("USER.md")


def test_a_writer_that_read_older_text_is_refused():
    memory.remember_now("Decks use the NXT brand by default", "workspace")
    seen = memory.current_hash("MEMORY.md")
    memory.remember_now("Journey maps start from interviews", "workspace")         # another writer changes the file
    with pytest.raises(memory.Conflict):
        memory._versioned_write("MEMORY.md", "# What the agent has learned\n- a draft from older text\n", "dreaming", "dreaming",
                                expected_hash=seen)
    assert "Journey maps start from interviews" in memory._read("MEMORY.md")


def test_memory_exports_and_imports_as_versions():
    memory.remember_now("Use plain words", "workspace")
    data = memory.export_memory()
    assert "Use plain words" in data["files"]["MEMORY.md"] and data["versions"]["MEMORY.md"]
    memory.forget("plain words")
    got = memory.import_memory(data)
    assert got["ok"] and "Use plain words" in memory._read("MEMORY.md")
    assert memory.versions("MEMORY.md")[0]["reason"] == "import"
