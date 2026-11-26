"""One engine for the stepped builders (uplift plan 2026-11-23, WS-6).

Four builders wrote their artifacts the same way, each with its own loop: a persona set, an architecture and a
competitive gap analysis (localartifact) and a journey map (journeymap). Every one sends the same material first (the
shared head, prompts.py), then asks for one part of the document at a time against a bounded schema, shows each ask as
a visible step on the task's card, keeps going when an optional part fails and stops when a required one does. Each
loop had been patched separately (a step left open, a failure that left no empty list behind, a roster rebuilt
differently), so the four drifted.

Here the loop is written once. A builder declares a Spec: its steps, in order. A Step names its card line, its
instruction, its schema, whether it fans out over items the document already holds (one ask per persona, one per
journey phase), what to keep or trim when it returns (`after`, inside the step), what to check once it is done (`then`,
after the step closed, may raise), and what to leave when an optional step fails (`defaults`). The engine runs them
with the builder's own `ask(system, message, schema, **opts) -> dict`.

The single-call builders use the same engine for their repair passes: a step that runs only `when` the document still
needs it (the deck's rewrite when the asked-for sources are missing, a study page's top-up below its floor), up to
`times` times, stopping at the first failure, with its own `merge` (keep the better draft; add what is missing and
check again) and its own call options (`opts`, such as a smaller reply).

tests/test_builder.py replays the record scripts/builder_golden.py made from the four loops before they moved here,
and requires the same visible steps, the same message, system and schema for every ask, and the same finished
document, byte for byte, for a clean run and for one whose second step fails. The same inputs at a fixed seed give the
same artifact, so the move is not a regression.
"""
from dataclasses import dataclass, field
from typing import Callable, Optional

from . import providers, store

FAILED = (ValueError, providers.ProviderError)     # what a failed step raises: unparseable JSON or a refused call


@dataclass
class Step:
    stage: object                          # the card line: a string, or fn(doc, item, n, total) -> str
    task: object                           # the instruction after the head: a string, or fn(doc, item) -> str
    schema: object                         # a dict, or fn(doc) -> dict (the builder's ask bounds it)
    each: Optional[Callable] = None        # fn(doc) -> items: one ask per item, merged into that item
    fresh: bool = False                    # the reply starts the document (the first step) instead of merging into it
    required: bool = False                 # a failed required step fails the build; an optional one leaves `defaults`
    defaults: tuple = ()                   # keys set to [] when an optional step fails
    after: Optional[Callable] = None       # fn(doc, item), inside the step, after the reply is merged
    say: Optional[Callable] = None         # fn(doc, item) -> the step's one line on the card
    then: Optional[Callable] = None        # fn(doc), once the step and all its items are done; may raise
    when: Optional[Callable] = None        # fn(doc) -> bool: run (again) only while the document needs this step
    times: int = 1                         # how many times the step may run while `when` holds (stops at a failure)
    merge: Optional[Callable] = None       # fn(doc, reply, item): merge the reply in its own way (instead of update)
    before: Optional[Callable] = None      # fn(doc, item), inside the step, before the ask (an event, a record)
    opts: dict = field(default_factory=dict)   # keyword arguments for this step's ask (max_tokens, ...)


@dataclass
class Spec:
    kind: str
    steps: list
    system: str = ""
    what: str = ""                         # the artifact in words ("persona set"), for errors
    page: Optional[Callable] = None        # fn(doc, label, brand, titles) -> html
    slides: Optional[Callable] = None      # fn(doc, titles, brand) -> slide html (the editable PowerPoint)
    counts: Optional[Callable] = None      # fn(doc, extra) -> {what: how many}
    extra: dict = field(default_factory=dict)


SPECS = {}


def register(spec):
    SPECS[spec.kind] = spec
    return spec


def _value(v, *args):
    return v(*args) if callable(v) else v


def run(spec, head, ask, model, tid=""):
    """The document, written step by step. `ask(system, message, schema)` returns the parsed reply."""
    doc = {}
    for step in spec.steps:
        for _ in range(max(1, step.times)):
            if step.when and not step.when(doc):
                break
            if not _one_pass(spec, step, doc, head, ask, model, tid):
                break                              # a failed repair pass is not tried again
        if step.then:
            step.then(doc)
    return doc


def _one_pass(spec, step, doc, head, ask, model, tid):
    """One run of a step (each of its items when it fans out). False when an optional ask failed."""
    ok = True
    items = list(step.each(doc)) if step.each else [None]
    for n, item in enumerate(items, 1):
        label = _value(step.stage, doc, item, n, len(items))
        try:
            with store.stage(tid, label, model) as st:
                if step.before:
                    step.before(doc, item)
                got = ask(spec.system, head + _value(step.task, doc, item), _value(step.schema, doc), **step.opts)
                if step.merge:
                    step.merge(doc, got, item)
                elif step.fresh:
                    doc.clear()
                    doc.update(got)
                else:
                    (item if item is not None else doc).update(got)
                if step.after:
                    step.after(doc, item)
                if step.say:
                    st.say(step.say(doc, item))
        except FAILED:
            if step.required:
                raise
            ok = False
            for k in step.defaults:
                (item if item is not None else doc).setdefault(k, [])
    return ok
