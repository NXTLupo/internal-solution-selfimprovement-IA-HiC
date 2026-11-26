"""Three lanes for the work this machine does at once (field test 23 Nov, speed plan: "three lanes and a scheduler").

One plan's making step used to hold the whole studio (plan._STUDIO), so a two-minute report waited behind a nine-minute
deck, and every page read, pack search and export of the second piece of work waited with it. The lanes:

- studio: STUDIO_SLOTS pieces of work at a time (one on this machine, see below), the shortest waiting work first.
  Work that needs a different model (the prototype's Ornith) waits for the studio to empty, and the others wait for
  it: two 18 GB models taking turns on one card reload each other on every call (measured: 15 to 20 seconds a swap).
- card: one model call or picture at a time, first come first served, inside a memory budget. A picture (the image
  engine) and a writing call never run together. The wait happens before a call's clock starts, so the token-rate
  watch never mistakes queueing for a slow card.
- network: page reads and pack searches, up to NETWORK_SLOTS at once, never waiting for the card.

`snapshot()` reports who holds each lane and how long work waited, for the health route.
"""
import contextlib
import contextvars
import os
import threading
import time

# Measured 24 Nov with two slots: a deck and a journey map made side by side took 17.2 and 14.0 minutes, against 9.2
# and 5.3 one after the other. The model server keeps one prompt cache, so two writers taking turns each lose their
# cached prefix on every call. One piece of work at a time is faster on one card; the gain that remains is the order
# (shortest first) and the card and network lanes. Set IA_NEXT_STUDIO_SLOTS=2 on a machine with two cards.
STUDIO_SLOTS = int(os.environ.get("IA_NEXT_STUDIO_SLOTS", "2"))
NETWORK_SLOTS = int(os.environ.get("IA_NEXT_NETWORK_SLOTS", "12"))
CARD_GB = float(os.environ.get("IA_NEXT_CARD_GB", "24"))
# what each kind of work holds on the card while it runs (measured with nvidia-smi on this laptop, rounded up)
COST_GB = {"writer": 18.5, "other_model": 19.5, "small": 3.0, "image": 12.0, "embed": 1.5}

_cond = threading.Condition()
_studio = {}                      # model family -> pieces of work being made with it
_card = []                        # [(kind, GB)] calls on the card now
_queue = []                       # tickets waiting for the card, oldest first
_net = threading.BoundedSemaphore(NETWORK_SLOTS)
_stats = {"studio": {"waits": 0, "seconds": 0.0}, "card": {"waits": 0, "seconds": 0.0}, "network": {"waits": 0, "seconds": 0.0}}


def _waited(lane, since):
    took = time.time() - since
    if took > 0.05:
        _stats[lane]["waits"] += 1
        _stats[lane]["seconds"] = round(_stats[lane]["seconds"] + took, 2)
    return took


def family_of(tool):
    """The model family a piece of work writes with: the prototype has its own model, everything else the writer."""
    return "prototype" if "prototype" in str(tool or "") else "writer"


# How long each kind of work usually takes on this machine (seconds, measured 24 and 24 Nov). The studio admits the
# shortest waiting work first: on the first run with two slots, a nine-minute deck and a five-minute journey map took
# both, and a two-minute report and a ninety-second audio script waited behind them.
TYPICAL_SECONDS = {"audio": 90, "report": 130, "themes": 120, "journey": 320, "artifact": 400, "prototype": 300, "deck": 560}
_waiting = []                     # [(typical seconds, arrival, ticket)] for the studio


def typical(tool):
    name = str(tool or "").lower()
    return next((v for k, v in TYPICAL_SECONDS.items() if k in name), 300)


@contextlib.contextmanager
def studio(family="writer", on_wait=None, seconds=300):
    """Hold one of the studio's slots for a making step. `on_wait()` is called once if the step has to wait. `seconds`
    is how long the work usually takes: among work waiting, the shortest goes in first."""
    t0 = time.time()
    ticket = (float(seconds), t0, object())
    # Work started together: the shorter piece reaches the door first. Plans of one request reach the studio seconds
    # apart (24 Nov: the report and the audio script arrived a few seconds after the deck and the journey map had
    # taken both slots), so long work waits a little longer at the door: about 1 second for an audio script, 2 for a
    # report, 5 for a journey map, 8 for a deck.
    time.sleep(min(8.0, float(seconds) / 70.0))
    with _cond:
        told = False
        _waiting.append(ticket)
        while (_studio and (set(_studio) != {family} or _studio[family] >= STUDIO_SLOTS)) or min(_waiting)[:2] != ticket[:2]:
            if not told and on_wait:
                told = True
                try:
                    on_wait()
                except Exception:
                    pass
            _cond.wait(timeout=5)
        _waiting.remove(ticket)
        _studio[family] = _studio.get(family, 0) + 1
        _cond.notify_all()
    _waited("studio", t0)
    try:
        yield
    finally:
        with _cond:
            _studio[family] -= 1
            if _studio[family] <= 0:
                _studio.pop(family, None)
            quiet = not _studio and not _waiting
            _cond.notify_all()
        if quiet:                                 # the studio is quiet: the conversation model comes back (E8)
            try:
                from . import providers
                providers.ready_soon("the studio finished its work")
            except Exception:
                pass


def _fits(kind):
    """A writing call runs alone with other writing calls excluded (the model server answers one at a time); a picture
    never shares the card with a call that would push it past the budget."""
    if not _card:
        return True
    used = sum(gb for _, gb in _card)
    if any(k != "embed" for k, _ in _card) and kind != "embed":
        return False                              # one generating call at a time
    return used + COST_GB.get(kind, 18.5) <= CARD_GB


# The card stays with the piece of work that is writing. The model server keeps one prompt cache, and a stepped
# writer's calls share a long opening: when two pieces of work take turns call by call, each call pays for its whole
# prompt again (measured 24 Nov: a deck 17.2 minutes beside a journey map, 7.3 alone). So after a call ends, the piece
# that made it has HOLD_SECONDS to ask again before anyone else is let in. A piece that stops asking (it is making a
# picture, building a file, checking quotes) releases the card to the next, which is where working side by side pays.
HOLD_SECONDS = float(os.environ.get("IA_NEXT_CARD_HOLD_SECONDS", "2.0"))
_last = {"holder": None, "ended": 0.0}
_holders = {}                     # ticket -> holder
# A person reading a source while research runs asks about it (QA 25 Nov, E1). Their one short call takes the card
# next, ahead of the line and of the holder's claim: the work waits for one answer and then carries on.
URGENT = contextvars.ContextVar("ia_next_lane_urgent", default=False)
_urgent = set()


def _my_turn(ticket, kind):
    """True when this ticket is the first in line that may take the card now."""
    if not _fits(kind):
        return False
    first = next((t for t in _queue if t in _urgent), None)
    if first is not None:
        return first is ticket
    held = _last["holder"] is not None and time.time() - _last["ended"] < HOLD_SECONDS
    for t in _queue:
        if not held or _holders.get(t) == _last["holder"]:
            return t is ticket
    return False


@contextlib.contextmanager
def card(kind="writer", holder=None):
    """Hold the graphics card for one model call ("writer", "other_model", "small"), one picture ("image") or one
    embedding batch ("embed", which may run beside a call when it fits the memory budget). `holder` names the piece of
    work the call belongs to (its task id): the card stays with it between its back-to-back calls."""
    ticket = object()
    holder = holder or threading.get_ident()
    t0 = time.time()
    with _cond:
        _queue.append(ticket)
        _holders[ticket] = holder
        if URGENT.get():
            _urgent.add(ticket)
        while not _my_turn(ticket, kind) and not (kind == "embed" and _fits(kind)):
            _cond.wait(timeout=0.25)
        _queue.remove(ticket)
        _holders.pop(ticket, None)
        _urgent.discard(ticket)
        entry = (kind, COST_GB.get(kind, 18.5))
        _card.append(entry)
        _cond.notify_all()
    _waited("card", t0)
    try:
        yield
    finally:
        with _cond:
            _card.remove(entry)
            if kind != "embed":
                _last.update(holder=holder, ended=time.time())
            _cond.notify_all()


@contextlib.contextmanager
def network():
    t0 = time.time()
    _net.acquire()
    _waited("network", t0)
    try:
        yield
    finally:
        _net.release()


def snapshot():
    with _cond:
        return {"studio": {"slots": STUDIO_SLOTS, "making": dict(_studio)},
                "card": {"budget_gb": CARD_GB, "running": [k for k, _ in _card], "waiting": len(_queue)},
                "network": {"slots": NETWORK_SLOTS},
                "waited": {k: dict(v) for k, v in _stats.items()}}
