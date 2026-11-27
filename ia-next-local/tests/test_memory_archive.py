"""Memory grows past its files' caps (harness WS-H11, from the Anthropic talk: "allow the memories to grow large, but
give agents tools to quickly index and search"). A note pushed out of MEMORY.md by its size goes to the archive instead
of being lost; recall searches the archive; a turn gets the archived notes that bear on it; what the person asked to
forget never comes back."""
import pytest

from ia_next import config, memory, store


@pytest.fixture(autouse=True)
def _own_memory(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "m.sqlite3"))
    monkeypatch.setattr(config, "MEMORY_DIR", str(tmp_path / "memory"))
    config.ensure_dirs()


def test_a_note_pushed_out_by_the_cap_is_archived_and_still_found(monkeypatch):
    monkeypatch.setattr(memory, "MEMORY_CAP", 200)
    memory.remember_now("Retail decks lead with the shopper's checkout friction", "workspace")
    for i in range(6):
        memory.remember_now(f"Filler note number {i} about formatting tables in reports", "workspace")
    assert "checkout friction" not in memory._read("MEMORY.md")               # it left the file...
    assert any("checkout friction" in e for e in memory.archived())             # ...for the archive
    hits = memory.recall("checkout friction retail decks")
    assert hits and hits[0]["from"] == "archive" and "checkout friction" in hits[0]["text"]
    assert memory.relevant_archived("make a retail deck about checkout friction")


def test_a_forgotten_note_does_not_come_back_from_the_archive(monkeypatch):
    monkeypatch.setattr(memory, "MEMORY_CAP", 200)
    memory.remember_now("Send every report to the outside agency", "workspace")
    for i in range(6):
        memory.remember_now(f"Filler note number {i} about formatting tables in reports", "workspace")
    memory.forget("outside agency")
    assert not any("outside agency" in e for e in memory.archived())
    assert memory.relevant_archived("send the report to the outside agency") == []
