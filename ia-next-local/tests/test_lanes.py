"""The three lanes (lanes.py): two pieces of work made side by side on one model, one call on the card at a time,
a different model waits for an empty studio, and waiting is counted."""
import threading
import time

from ia_next import lanes


def _reset():
    lanes._studio.clear(); lanes._card.clear(); lanes._queue.clear(); lanes._waiting.clear(); lanes._holders.clear()
    lanes._last.update(holder=None, ended=0.0)
    for v in lanes._stats.values():
        v.update(waits=0, seconds=0.0)


def test_two_writer_jobs_share_the_studio_and_a_third_waits(monkeypatch):
    _reset()
    monkeypatch.setattr(lanes, "STUDIO_SLOTS", 2)             # a machine with room for two; this laptop runs one
    order, gate = [], threading.Event()

    def job(name, family="writer"):
        with lanes.studio(family, on_wait=lambda: order.append(f"{name} waits"), seconds=1):
            order.append(f"{name} in")
            gate.wait(2)
        order.append(f"{name} out")
    ts = [threading.Thread(target=job, args=(n,)) for n in ("a", "b")]
    for t in ts:
        t.start()
    time.sleep(0.2)
    assert sorted(order) == ["a in", "b in"] and lanes.snapshot()["studio"]["making"] == {"writer": 2}
    third = threading.Thread(target=job, args=("c",))
    proto = threading.Thread(target=job, args=("p", "prototype"))
    third.start(); proto.start()
    time.sleep(0.3)
    assert "c waits" in order and "p waits" in order and "c in" not in order and "p in" not in order
    gate.set()
    for t in ts + [third, proto]:
        t.join(5)
    assert {"c in", "p in", "c out", "p out"} <= set(order)
    assert lanes.snapshot()["studio"]["making"] == {} and lanes.snapshot()["waited"]["studio"]["waits"] >= 2


def test_one_generating_call_on_the_card_at_a_time_in_arrival_order_and_an_embedding_fits_beside_it():
    _reset()
    running, peak, done = [], [], []

    def call(name, kind):
        with lanes.card(kind):
            running.append(name)
            peak.append([k for k, _ in lanes._card])
            time.sleep(0.15)
            running.remove(name)
            done.append(name)
    ts = []
    for name, kind in (("w1", "writer"), ("img", "image"), ("w2", "writer")):
        t = threading.Thread(target=call, args=(name, kind))
        t.start(); ts.append(t)
        time.sleep(0.03)
    e = threading.Thread(target=call, args=("emb", "embed"))
    e.start()
    for t in ts + [e]:
        t.join(5)
    assert [d for d in done if d != "emb"] == ["w1", "img", "w2"]                 # first come, first served
    assert all(sum(1 for k in p if k != "embed") <= 1 for p in peak)             # never two generating calls
    assert any("embed" in p and len(p) == 2 for p in peak)                       # the embedding ran beside a call
    assert lanes.family_of("build_experience_prototype") == "prototype" and lanes.family_of("start_deck") == "writer"


def test_a_picture_waits_when_the_budget_has_no_room(monkeypatch):
    _reset()
    monkeypatch.setattr(lanes, "CARD_GB", 24.0)
    lanes._card.append(("writer", 18.5))
    assert not lanes._fits("image") and lanes._fits("embed")
    lanes._card.clear()
    assert lanes._fits("image")


def test_the_shortest_waiting_work_enters_the_studio_first(monkeypatch):
    _reset()
    monkeypatch.setattr(lanes, "STUDIO_SLOTS", 2)
    order, hold = [], threading.Event()

    def job(name, seconds):
        with lanes.studio("writer", seconds=seconds):
            order.append(name)
            hold.wait(1.5) if name in ("first", "second") else None
    a = threading.Thread(target=job, args=("first", 1)); b = threading.Thread(target=job, args=("second", 1))
    a.start(); b.start(); time.sleep(0.2)
    ts = [threading.Thread(target=job, args=(n, s)) for n, s in (("deck", 56), ("report", 13), ("audio", 9))]
    for t in ts:
        t.start()
    time.sleep(1.2)
    hold.set()
    for t in [a, b] + ts:
        t.join(8)
    assert order[2:] == ["audio", "report", "deck"]
    assert lanes.typical("start_research_report") == 130 and lanes.typical("start_deck") == 560 and lanes.typical("start_audio_overview") == 90


def test_one_piece_of_work_at_a_time_shortest_first(monkeypatch):
    _reset()
    monkeypatch.setattr(lanes, "STUDIO_SLOTS", 1)
    order, hold = [], threading.Event()

    def job(name, seconds):
        with lanes.studio("writer", seconds=seconds):
            order.append(name)
            hold.wait(4) if name == "first" else None
    a = threading.Thread(target=job, args=("first", 1)); a.start(); time.sleep(0.15)
    ts = [threading.Thread(target=job, args=(n, s)) for n, s in (("deck", 56), ("journey", 32), ("report", 13))]
    for t in ts:
        t.start()
    time.sleep(1.1)
    assert order == ["first"]
    hold.set()
    for t in [a] + ts:
        t.join(8)
    assert order == ["first", "report", "journey", "deck"]


def test_the_card_stays_with_the_piece_that_is_writing_and_moves_when_it_pauses(monkeypatch):
    _reset()
    monkeypatch.setattr(lanes, "HOLD_SECONDS", 0.6)
    order = []

    def piece(name, calls, pause_after=None):
        for i in range(calls):
            with lanes.card("writer", holder=name):
                order.append(name)
                time.sleep(0.05)
            if pause_after == i:
                time.sleep(1.0)                      # making a picture or building a file: no call for a while
    a = threading.Thread(target=piece, args=("A", 6, 2)); b = threading.Thread(target=piece, args=("B", 4))
    a.start(); time.sleep(0.02); b.start()
    a.join(10); b.join(10)
    assert "".join(order) == "AAABBBBAAA"            # A writes three calls in a row, pauses, B takes all of its turns, A resumes
