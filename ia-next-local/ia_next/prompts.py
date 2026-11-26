"""One prompt order for every stepped writer (uplift plan 2026-11-23, WS-2 step 3).

The local server reuses the cached reading of a prompt up to the first byte that differs. Measured 23 Nov on Ollama
0.40.16: a 1,819-token prompt sent again evaluated in 0.005 s instead of 0.306 s, and one with only its ending changed
in 0.019 s. So every step of one task sends: the same system text, then the material block (byte-identical across
steps), then the fixed header (goal, persona, scope), and only then the step's own instruction. Anything that varies
between steps (the step text, a schema-specific ask) goes last. Nothing time-dependent may appear before the step.
"""


def material_block(corpus):
    """The evidence, wrapped once, identically for every step of a task."""
    return f"<material>\n{corpus}\n</material>\n\n"


def head(corpus, **fields):
    """Material first, then the task's fixed fields in a stable order (sorted by name, empty ones left out)."""
    lines = "".join(f"{k.replace('_', ' ').capitalize()}: {v}\n" for k, v in sorted(fields.items()) if str(v or "").strip())
    return material_block(corpus) + lines


def step(head_text, instruction):
    """One step's message: the shared head, then this step's instruction."""
    return head_text + str(instruction or "")
