#!/usr/bin/env python3
"""Stop hook: block Claude's own chat replies that contain AI-slop language.

Owner rule (2026-08-07): the anti-slop lexicon applies to chat replies to the
owner, not just generated artifacts. This hook reads the LAST assistant
message from the session transcript and blocks the stop with the offender
list so the model rewrites in plain human language.

Design notes:
- stop_hook_active guard prevents an infinite block loop: the rewrite pass
  gets through even if imperfect (one correction cycle per stop).
- Text inside backticks/code fences and inside double quotes is EXEMPT:
  replies legitimately quote slop when reporting slop fixes, and code
  identifiers are not prose.
- Fail-open on any error: a broken hook must never wedge the session.
"""
import json
import re
import sys


LEXICON = [
    r"\bdelv(?:e|es|ing)\b",
    r"\bleverag(?:e|es|ed|ing)\b",
    r"\bseamless(?:ly)?\b",
    r"\bholistic\b",
    r"\btapestry\b",
    r"\btestament to\b",
    r"\bmeticulous(?:ly)?\b",
    r"\bnestled\b",
    r"\bfoster(?:s|ed|ing)?\b",
    r"\bbolster(?:s|ed|ing)?\b",
    r"\bmultifaceted\b",
    r"\butiliz(?:e|es|ed|ing)\b",
    r"\bparadigm\b",
    r"\bsynerg(?:y|ies|istic)\b",
    r"\bgame.chang(?:er|ing)\b",
    r"\bcutting.edge\b",
    r"\bbest.in.class\b",
    r"\bactionable insight",
    r"\bdeep dive\b",
    r"\blow.hanging fruit\b",
    r"\bmove the needle\b",
    r"\bunlock(?:s|ed|ing)? the\b",
    r"\bempower(?:s|ed|ing|ment)?\b",
    r"\btransformative\b",
    r"\brevolutionary\b",
    r"\bgroundbreaking\b",
    r"\bunprecedented\b",
    r"\bai.powered\b",
    r"\bvalue.driven\b",
    r"\bintelligent insights?\b",
    r"\bpath to value\b",
    r"\bnetwork activation\b",
    r"\bit(?:'s| is) worth noting\b",
    r"\bit should be noted\b",
    r"\brobust(?:ly|ness)?\b",
    r"\bin today'?s\b",
    r"\brapidly evolving\b",
    r"\bnavigate the (?:complexit|landscape)",
    r"\bstands as a\b",
    r"\bserves as a\b",
    # 2026-08-09 languagejones audit: assistant voice + incoherent collocations
    r"\bsure thing\b",
    r"\b(?:really )?great question\b",
    r"\band that matters\b",
    r"\boverarching\b",
    r"\bundergird(?:s|ing)?\b",
    r"\bwhat (?:it|they) buys? you\b",
    r"\bpoint (?:it|them) at a problem\b",
    r"\bthe move here is\b",
    r"\bnestled amid\b",
    r"\bquietly (?:reshaping|transforming|becoming)\b",
]
LEXICON_RE = re.compile("|".join(LEXICON), re.IGNORECASE)
EM_DASH = "—"
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF☀-➿⬀-⯿️]")


def last_assistant_text(transcript_path):
    text = ""
    try:
        with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                msg = entry.get("message") or {}
                if entry.get("type") != "assistant" and msg.get("role") != "assistant":
                    continue
                content = msg.get("content")
                if not isinstance(content, list):
                    continue
                parts = [c.get("text", "") for c in content
                         if isinstance(c, dict) and c.get("type") == "text"]
                joined = "\n".join(p for p in parts if p)
                if joined.strip():
                    text = joined
    except Exception:
        return ""
    return text


def strip_exempt_spans(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)   # code fences
    text = re.sub(r"`[^`\n]*`", " ", text)                     # inline code
    text = re.sub(r'"[^"\n]*"', " ", text)                     # quoted evidence
    text = re.sub(r"\[[^\]\n]*\]\([^)\n]*\)", " ", text)       # markdown links
    return text


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    if payload.get("stop_hook_active"):
        return 0
    transcript = payload.get("transcript_path") or ""
    if not transcript:
        return 0
    raw = last_assistant_text(transcript)
    if len(raw.strip()) < 40:
        return 0
    prose = strip_exempt_spans(raw)

    offenders = []
    if EM_DASH in prose:
        offenders.append("em-dash (use comma, colon, or period)")
    hits = sorted(set(m.group(0).lower() for m in LEXICON_RE.finditer(prose)))
    offenders.extend(hits[:12])
    if EMOJI_RE.search(prose):
        offenders.append("emoji (banned in this project's chat)")

    if not offenders:
        return 0
    print(json.dumps({
        "decision": "block",
        "reason": (
            "Your reply to the owner contains AI-slop language: "
            + "; ".join(offenders)
            + ". Rewrite the reply in plain human sentences per the Actor Rule: "
            "name the actor, use plain nouns, ground cause and effect, cut every "
            "word that adds no fact. No em-dashes, no emoji, no buzzwords. "
            "Then give the rewritten reply as your final message."
        ),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
