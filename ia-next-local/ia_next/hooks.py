"""Turn middleware and hooks (harness WS-H2, 26 Nov; Harness Engineering R1 and R11).

The paper's advice: start with a linear loop, and once three or more independent turn policies exist, make each one a
composable policy instead of another branch in the loop. Safety rules live as data, with a floor beneath them that no
data rule can lift.

- Events: PreToolUse (before a tool runs) and PostToolUse (after). A handler returns Allow, Deny(reason),
  Rewrite(args) or Context(text). The first Deny wins; Rewrites compose in order; Contexts are added to the result.
- The floor (`HARDLINE`) is frozen when this module loads, so nothing read at run time (a page, a document, a data
  rule) can switch it off.
- The owner's rules (`data/hooks.json`) add deny rules without code: {"rules": [{"tool": "<regex>", "args": {"<field>":
  "<regex>"}, "reason": "<words>"}]}. Re-read when the file changes.
- Every decision that is not Allow is an event on the turn's trace and a live step in the page.
"""
import json
import os
import re
import threading

from . import config, store


class Allow:
    pass


class Deny:
    def __init__(self, reason):
        self.reason = str(reason or "a rule blocked this call")


class Rewrite:
    def __init__(self, args, why=""):
        self.args, self.why = dict(args), str(why or "")


class Context:
    def __init__(self, text):
        self.text = str(text or "")


class Skip:
    """PreToolUse: the call is not run; `note` stands as its result. `end_turn` ends the turn with a plain-words reply."""
    def __init__(self, note, is_error=False, end_turn=False):
        self.note, self.is_error, self.end_turn = str(note), bool(is_error), bool(end_turn)


class Continue:
    """Stop: the turn is not over; `text` is said to the model and it takes another step."""
    def __init__(self, text, why=""):
        self.text, self.why = str(text), str(why or "")


class Replace:
    """Stop: the reply is replaced and the turn ends with `exit` as its reason (later handlers still run)."""
    def __init__(self, reply, exit, why=""):
        self.reply, self.exit, self.why = str(reply), str(exit), str(why or "")


ALLOW = Allow()
RULES_FILE = os.path.join(config.DATA_DIR, "hooks.json")

# ---- the floor: rules no data rule can lift (frozen at import) ---------------------------------------------------
_KEY_RX = re.compile(r"\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,})\b")


def _no_secrets(name, args):
    """A tool call never carries a key or token in its arguments (they would be stored, shown and sent on)."""
    if _KEY_RX.search(json.dumps(args or {}, ensure_ascii=False)):
        return Deny("its arguments contain what looks like a key or token; keys never travel in tool calls")
    return ALLOW


HARDLINE = (("no secrets in tool arguments", _no_secrets),)
_HARDLINE_FROZEN = tuple(HARDLINE)


# ---- the owner's rules, as data ------------------------------------------------------------------------------------
_RULES = {"mtime": None, "rules": []}
_LOCK = threading.Lock()


def owner_rules():
    """The deny rules in data/hooks.json ([] when there is no file or it does not parse)."""
    try:
        mt = os.path.getmtime(RULES_FILE)
    except OSError:
        return []
    with _LOCK:
        if _RULES["mtime"] != mt:
            try:
                with open(RULES_FILE, encoding="utf-8") as fh:
                    raw = json.load(fh)
                rules = []
                for r in (raw.get("rules") if isinstance(raw, dict) else raw) or []:
                    if isinstance(r, dict) and r.get("tool"):
                        rules.append({"tool": re.compile(str(r["tool"])), "reason": str(r.get("reason") or "the owner's rule"),
                                      "args": {k: re.compile(str(v), re.I) for k, v in (r.get("args") or {}).items()}})
                _RULES.update(mtime=mt, rules=rules)
            except (OSError, ValueError, re.error):
                _RULES.update(mtime=mt, rules=[])
        return list(_RULES["rules"])


def _owner_deny(name, args):
    for r in owner_rules():
        if r["tool"].fullmatch(name) and all(rx.search(str((args or {}).get(k, ""))) for k, rx in r["args"].items()):
            return Deny(r["reason"])
    return ALLOW


# ---- the registry ----------------------------------------------------------------------------------------------------
_HANDLERS = {"PreToolUse": [("owner rules", _owner_deny)], "PostToolUse": [], "Stop": [], "PreStep": []}


def register(event, name, fn):
    """Add a handler at the end of an event's list (after the floor and the owner's rules)."""
    _HANDLERS.setdefault(event, []).append((name, fn))


def pre_tool(name, args, conversation=None, skip=None):
    """(args to run with, deny reason or None, [context lines]). The floor runs first, then the handlers in order. A Skip
    from a handler is put in `skip` (a list) and reported as a deny with its note."""
    args = dict(args or {})
    notes = []
    for label, fn in _HARDLINE_FROZEN + tuple(_HANDLERS.get("PreToolUse", [])):
        try:
            out = fn(name, args)
        except Exception:
            continue                                 # a broken handler never stops the work
        if isinstance(out, Skip):
            if skip is not None:
                skip.append(out)
            return args, out.note, notes
        if isinstance(out, Deny):
            store.event("hook_denied", {"conversation": conversation, "tool": name, "rule": label, "reason": out.reason,
                                        "floor": label in dict(_HARDLINE_FROZEN)})
            return args, out.reason, notes
        if isinstance(out, Rewrite):
            store.event("hook_rewrite", {"conversation": conversation, "tool": name, "rule": label, "why": out.why})
            args = out.args
        elif isinstance(out, Context) and out.text:
            store.event("hook_context", {"conversation": conversation, "tool": name, "rule": label, "text": out.text[:300]})
            notes.append(out.text)
    return args, None, notes


def stop(reply, exit_why, state, conversation=None):
    """(text for another step or None, reply, exit reason). The Stop handlers run in order on a reply with no tool call: a
    Replace changes the reply and the next handler still runs; the first Continue gives the model another step."""
    for label, fn in tuple(_HANDLERS.get("Stop", [])):
        try:
            out = fn(reply, state)
        except Exception:
            continue
        if isinstance(out, Replace):
            store.event("hook_replace", {"conversation": conversation, "rule": label, "why": out.why, "exit": out.exit})
            reply, exit_why = out.reply, out.exit
        elif isinstance(out, Continue):
            store.event("hook_continue", {"conversation": conversation, "rule": label, "why": out.why})
            return out.text, reply, exit_why
    return None, reply, exit_why


def pre_step(state, conversation=None):
    """[texts said to the model before this step] from the PreStep handlers."""
    said = []
    for label, fn in tuple(_HANDLERS.get("PreStep", [])):
        try:
            out = fn(state)
        except Exception:
            continue
        if isinstance(out, Context) and out.text:
            said.append(out.text)
    return said


def post_tool(name, args, out, conversation=None):
    """(result, [context lines]) after the PostToolUse handlers."""
    notes = []
    for label, fn in tuple(_HANDLERS.get("PostToolUse", [])):
        try:
            got = fn(name, args, out)
        except Exception:
            continue
        if isinstance(got, Context) and got.text:
            store.event("hook_context", {"conversation": conversation, "tool": name, "rule": label, "text": got.text[:300]})
            notes.append(got.text)
    return out, notes


def describe():
    """The rules in force, for /api/hooks: the floor (cannot be turned off) and the owner's rules."""
    return {"floor": [label for label, _ in _HARDLINE_FROZEN],
            "owner_rules": [{"tool": r["tool"].pattern, "args": {k: v.pattern for k, v in r["args"].items()}, "reason": r["reason"]}
                            for r in owner_rules()],
            "handlers": {ev: [label for label, _ in hs] for ev, hs in _HANDLERS.items()},
            "rules_file": RULES_FILE}
