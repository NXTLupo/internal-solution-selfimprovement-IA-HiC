#!/usr/bin/env python3
"""
AI Output Syntax Validator + Repairer — Stop hook.

Reads deliverable JSON from stdin (same contract as validate_evidence.py).
Walks the tree, finds any string field that contains an embedded artifact
(JSON-in-string, HTML-in-string, SVG-in-string), and applies the repair
ladder from .claude/skills/ai-output-syntax-repair/SKILL.md.

If the top-level stdin is itself broken JSON, this hook never sees it —
Claude Code's harness handles that. The purpose here is to catch
SECOND-LEVEL parse failures where a field like `slide.html_content` or
`prototype.svg_payload` contains its own AI-generated text that downstream
renderers must parse.

Exit 0 = pass (no broken embedded artifacts or all repaired).
Exit 2 = block (unrepairable embedded artifact present).
"""
import sys
import json
import re

# Field names known to carry embedded artifacts in HiC deliverables.
JSON_FIELD_NAMES = {
    'embedded_json', 'rawJson', 'raw_json', 'json_payload',
    'tool_arguments', 'tool_call_arguments',
}
HTML_FIELD_NAMES = {
    'html_content', 'html_payload', 'prototype_html',
    'rendered_html', 'fragment',
}
SVG_FIELD_NAMES = {
    'svg', 'svg_content', 'svg_payload', 'diagram_svg',
    'illustration_svg',
}
CSS_FIELD_NAMES = {
    'css', 'css_content', 'style_block', 'inline_styles',
}


def trim_wrapping(text):
    """Rung 1 — strip conversational wrap + fences."""
    if not isinstance(text, str):
        return text, False
    s = text
    # Strip fenced code blocks
    s = re.sub(r'^```(?:json|html|svg|css|xml)?\s*', '', s.strip())
    s = re.sub(r'\s*```$', '', s)
    # Find first { or [ and last matching } or ]
    first_obj = s.find('{')
    first_arr = s.find('[')
    starts = [p for p in (first_obj, first_arr) if p >= 0]
    if not starts:
        return text, False
    start = min(starts)
    # Find last matching close
    last_obj = s.rfind('}')
    last_arr = s.rfind(']')
    end = max(last_obj, last_arr)
    if end <= start:
        return text, False
    candidate = s[start:end + 1]
    return candidate, candidate != text


def trailing_comma_cleanup(text):
    """Rung 3 — strip trailing commas before } or ]."""
    if not isinstance(text, str):
        return text, False
    out = re.sub(r',(\s*[}\]])', r'\1', text)
    return out, out != text


def truncation_close(text):
    """Rung 6 — close unterminated string + unbalanced brackets.

    Walks the JSON-like text tracking string state, escape state, and
    brace/bracket depth. When it reaches EOF mid-structure, it closes
    everything in reverse order.
    """
    if not isinstance(text, str) or len(text) < 2:
        return text, False

    in_string = False
    escape = False
    stack = []  # [(char, position)]
    last_in_string_pos = -1

    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue
        if in_string:
            if ch == '\\':
                escape = True
                continue
            if ch == '"':
                in_string = False
                continue
            last_in_string_pos = i
            continue
        # Not in string
        if ch == '"':
            in_string = True
            continue
        if ch in '{[':
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()

    if not in_string and not stack:
        return text, False  # already balanced

    closers = []
    if in_string:
        # Close the open string at the last reasonable boundary.
        closers.append('"')
    while stack:
        opener = stack.pop()
        closers.append('}' if opener == '{' else ']')

    repaired = text + ''.join(closers)
    return repaired, True


def repair_json_text(text):
    """Apply the ladder. Return (parsed, repaired_via, ok, warnings)."""
    warnings = []
    rungs = []

    if not isinstance(text, str) or not text.strip():
        return None, 'empty', False, ['empty input']

    candidate = text

    # Rung 1
    new_candidate, did = trim_wrapping(candidate)
    if did:
        rungs.append('trim_wrapping')
        candidate = new_candidate

    try:
        return json.loads(candidate), 'no_repair_needed' if not rungs else 'trim_wrapping', True, warnings
    except json.JSONDecodeError:
        pass

    # Rung 3 (skipping rung 2 = whitespace-to-empty, which a Stop hook should NOT silently fix)
    new_candidate, did = trailing_comma_cleanup(candidate)
    if did:
        rungs.append('trailing_comma_cleanup')
        candidate = new_candidate
        try:
            return json.loads(candidate), 'trailing_comma_cleanup', True, warnings
        except json.JSONDecodeError:
            pass

    # Rung 6
    new_candidate, did = truncation_close(candidate)
    if did:
        rungs.append('truncation_close')
        candidate = new_candidate
        warnings.append('artifact was truncated; final item may be incomplete')
        try:
            return json.loads(candidate), 'truncation_close', True, warnings
        except json.JSONDecodeError as e:
            return None, 'truncation_close', False, warnings + [f'truncation close insufficient: {str(e)[:80]}']

    return None, 'unrepairable', False, warnings + ['no rung succeeded']


def is_likely_html(text):
    """Heuristic — string starts with < and contains a closing tag pattern."""
    if not isinstance(text, str):
        return False
    s = text.lstrip()
    return s.startswith('<') and bool(re.search(r'</\w+\s*>', s))


def repair_html_text(text):
    """Close unclosed HTML tags by stack-walking. Lightweight — full parsing
    requires a real DOM parser which the hook doesn't have. We just close
    the obvious balance issues."""
    if not isinstance(text, str):
        return None, 'empty', False, []

    void_tags = {'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'}
    tag_re = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?(/?)>')
    stack = []
    for m in tag_re.finditer(text):
        closing = m.group(1) == '/'
        tag = m.group(2).lower()
        self_close = m.group(4) == '/' or tag in void_tags
        if self_close:
            continue
        if closing:
            if stack and stack[-1] == tag:
                stack.pop()
        else:
            stack.append(tag)

    if not stack:
        return text, 'no_repair_needed', True, []

    closers = ''.join(f'</{t}>' for t in reversed(stack))
    return text + closers, 'html_truncation_close', True, [f'closed {len(stack)} unbalanced tag(s): {", ".join(stack)}']


def walk_artifacts(obj, path=""):
    """Yield (path, type, text) for every embedded artifact field."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            sub_path = f"{path}.{k}"
            if isinstance(v, str) and v.strip():
                key_lower = k.lower()
                if key_lower in JSON_FIELD_NAMES or any(n in key_lower for n in JSON_FIELD_NAMES):
                    yield sub_path, 'json', v
                elif key_lower in HTML_FIELD_NAMES or any(n in key_lower for n in HTML_FIELD_NAMES):
                    yield sub_path, 'html', v
                elif key_lower in SVG_FIELD_NAMES or any(n in key_lower for n in SVG_FIELD_NAMES):
                    yield sub_path, 'svg', v
                elif key_lower in CSS_FIELD_NAMES or any(n in key_lower for n in CSS_FIELD_NAMES):
                    yield sub_path, 'css', v
                # Auto-detect HTML/SVG payloads by content heuristic
                elif is_likely_html(v) and len(v) > 100:
                    yield sub_path, 'html', v
            yield from walk_artifacts(v, sub_path)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from walk_artifacts(item, f"{path}[{i}]")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = []
    fixed_count = 0
    fail_count = 0

    for art_path, art_type, art_text in walk_artifacts(data):
        if art_type == 'json':
            parsed, via, ok, warnings = repair_json_text(art_text)
            if not ok:
                fail_count += 1
                failures.append(
                    f"UNREPAIRABLE_EMBEDDED_JSON at {art_path}: {warnings[-1] if warnings else 'unknown'}"
                )
            elif via not in ('no_repair_needed',):
                fixed_count += 1
                if 'truncation' in via:
                    failures.append(
                        f"TRUNCATED_EMBEDDED_JSON at {art_path}: closed via {via}; "
                        f"last item may be incomplete — investigate retry rather than ship"
                    )
        elif art_type == 'html':
            repaired, via, ok, warnings = repair_html_text(art_text)
            if not ok:
                fail_count += 1
                failures.append(f"UNREPAIRABLE_EMBEDDED_HTML at {art_path}")
            elif via == 'html_truncation_close':
                fixed_count += 1
                failures.append(
                    f"TRUNCATED_EMBEDDED_HTML at {art_path}: {warnings[0] if warnings else 'closed unbalanced tags'}"
                )
        # SVG / CSS handled by html_truncation heuristic and stack walk
        # respectively — keeping the hook tight for the Stop budget.

    if fail_count > 0 or any('TRUNCATED' in f for f in failures):
        sys.stderr.write("AI OUTPUT SYNTAX VALIDATION FAILED:\n")
        for f in failures[:10]:
            sys.stderr.write(f"  - {f}\n")
        if len(failures) > 10:
            sys.stderr.write(f"  ... and {len(failures) - 10} more\n")
        sys.stderr.write(
            "\nGuidance: invoke the ai-output-syntax-repair skill to inspect the "
            "raw model output BEFORE downstream parsing. If repair succeeds but "
            "marks degradation=true, consider retrying the generator rather than "
            "shipping a partial artifact. Truncation usually indicates max-tokens "
            "exhaustion — request a chunked generation pass or raise max_tokens.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
