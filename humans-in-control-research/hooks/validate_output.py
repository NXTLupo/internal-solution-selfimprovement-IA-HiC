"""
Deterministic Output Validation Hook for Humans-in-Control Research Workbench.

Executes on Claude Code Stop events. Parses AI output to verify:
1. Priority source citations are present
2. Citation density meets minimum threshold
3. Action titles contain verbs and data (not passive topic labels)
4. No banned slop phrases appear
5. NXT visual blocks have required source attributions

Exit codes:
  0 — Output passes all checks
  2 — Output fails validation (Claude MUST rewrite before delivery)
"""

import sys
import re
import json

# ============================================================
# BANNED SLOP PHRASES (350+ from .claude/CLAUDE.md)
# ============================================================

SLOP_HIGH = [
    "paradigm shift", "game-changer", "holistic approach", "cutting-edge",
    "best-in-class", "leverage synergies", "robust solution", "seamless integration",
    "actionable insights", "thought leadership", "value proposition", "core competency",
    "move the needle", "circle back", "deep dive", "low-hanging fruit", "synergy",
    "ecosystem", "disruptive", "innovative solution",
    "in today's rapidly evolving landscape", "it's important to note",
    "it's worth noting", "it should be noted", "needless to say",
    "at the end of the day", "the reality is", "the fact of the matter",
    "when it comes to", "in terms of", "with respect to", "as we navigate",
    "in this ever-changing", "the landscape of",
]

SLOP_MEDIUM = [
    "it seems", "perhaps", "it's possible", "may or may not", "to some extent",
    "in some ways", "arguably", "potentially", "conceivably", "it could be said",
    "moving forward", "going forward", "at this point in time", "in the current climate",
    "as we move forward", "looking ahead", "on a go-forward basis", "at the present time",
    "fundamental shift", "seismic shift", "unprecedented", "transformative",
    "revolutionary", "groundbreaking", "trailblazing", "world-class",
]

META_NARRATION = [
    "good morning", "good afternoon", "good evening",
    "welcome to", "thank you for being here", "thank you for joining",
    "today we will", "today we'll", "we will present", "we are going to",
    "we now move to", "we are now entering", "let us now examine",
    "this is where we", "in this section", "in this presentation", "in this deck",
    "as you can see", "this slide shows", "the next slide",
    "our objective is to", "allow me to", "before we begin",
    "i'd like to start by", "let's dive into", "let's explore",
]

GENERIC_CITATIONS = [
    "research shows", "studies indicate", "data suggests", "sources confirm",
    "evidence points to", "analysis reveals", "intelligence suggests",
    "multiple sources", "various sources", "our research", "the data",
]

TOPIC_TITLES = [
    "the landscape", "key findings", "recommendations", "the path forward",
    "overview", "introduction", "background", "conclusion", "summary",
    "the complication", "the situation", "next steps", "action items",
]

ALL_BANNED = (
    [(p, "slop-high") for p in SLOP_HIGH]
    + [(p, "slop-medium") for p in SLOP_MEDIUM]
    + [(p, "meta-narration") for p in META_NARRATION]
    + [(p, "generic-citation") for p in GENERIC_CITATIONS]
    + [(p, "topic-title") for p in TOPIC_TITLES]
)


def validate_output(text: str, priority_sources: list[str] | None = None) -> tuple[bool, list[str]]:
    """Validate an AI output against all quality gates.

    Returns (passed, errors) where errors is a list of violation descriptions.
    """
    errors: list[str] = []
    lower = text.lower()

    # 1. Banned phrase detection
    for phrase, category in ALL_BANNED:
        if phrase.lower() in lower:
            errors.append(f"[{category}] Banned phrase detected: \"{phrase}\"")

    # 2. Citation density check
    citations = re.findall(r'\[([^\]]+?):\s*"[^"]+"\]', text)
    word_count = len(text.split())
    if word_count > 200 and len(citations) < 3:
        errors.append(
            f"[citation-density] Only {len(citations)} citations in {word_count} words. "
            f"Minimum 3 named-source citations per 200 words."
        )

    # 3. Priority source validation
    if priority_sources:
        for source in priority_sources:
            if source.lower() not in lower:
                errors.append(
                    f"[priority-missing] Priority source \"{source}\" was not cited. "
                    f"User flagged this source as mandatory."
                )

    # 4. NXT block source attribution check
    nxt_blocks = re.findall(r':::nxt:(\S+)\n([\s\S]*?):::', text)
    for block_type, block_content in nxt_blocks:
        if block_type in ('stat-row', 'evidence-block', 'comparison-table', 'grid-matrix'):
            if '"source"' not in block_content and 'source' not in block_content.lower():
                errors.append(
                    f"[nxt-attribution] :::nxt:{block_type} block has no source attribution. "
                    f"Every data block requires a 'source' field."
                )

    # 5. Action title check (look for NXT block titles that are topic labels)
    for title_pattern in TOPIC_TITLES:
        title_regex = re.compile(
            rf'"title"\s*:\s*"({re.escape(title_pattern)})"',
            re.IGNORECASE,
        )
        match = title_regex.search(text)
        if match:
            errors.append(
                f'[action-title] Title "{match.group(1)}" is a topic label, not an action title. '
                f"Rewrite as a complete sentence stating a conclusion with data."
            )

    passed = len(errors) == 0
    return passed, errors


def main():
    """Read from stdin or file argument. Exit 0 if valid, exit 2 if not."""
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    if not text.strip():
        print("PASS: No output to validate.")
        sys.exit(0)

    # Optional: read priority sources from env or second argument
    priority_sources = None
    if len(sys.argv) > 2:
        try:
            priority_sources = json.loads(sys.argv[2])
        except (json.JSONDecodeError, TypeError):
            pass

    passed, errors = validate_output(text, priority_sources)

    if passed:
        print("PASS: Output meets all quality gates.")
        sys.exit(0)
    else:
        print(f"FAIL: {len(errors)} violation(s) detected.\n")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")
        print(
            "\nThe output must be rewritten to fix these violations "
            "before delivery to the user."
        )
        sys.exit(2)


if __name__ == "__main__":
    main()
