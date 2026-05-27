#!/usr/bin/env python3
"""
Slide Variety Validator — Stop hook.

Evidence from STRATEGY_DECK_PIPELINE_AUDIT.md:
  - "AI often generates 2-3 archetypes; no enforcement"
  - 27 of 30 slides shipped blank; the few non-blank slides used only
    one or two templates, defeating the purpose of an 18-template system.

Rule: for any deck with N slides, require at least min(7, N // 3) distinct
template values across slides[]. This forces the AI to use the variety
that the slide-template system was designed to support.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json

# The 18 templates supported by components/slideTemplates/types.ts
KNOWN_TEMPLATES = {
    'persona-card', 'recommendation', 'theme-cluster', 'theme-spotlight',
    'theme-arc', 'theme-mosaic', 'competitive-matrix', 'block-quote',
    'case-study', 'principles', 'stat-row', 'timeline', 'section-divider',
    'service-blueprint', 'gap-matrix', 'architecture-map', 'prd-feature',
    'systems-inventory',
}


def find_slide_arrays(obj, path=""):
    """Yield (path, slides_list) for any slides[] array found in the tree."""
    if isinstance(obj, dict):
        if 'slides' in obj and isinstance(obj['slides'], list):
            yield (f"{path}.slides" if path else 'slides', obj['slides'])
        for k, v in obj.items():
            if k == 'slides':
                continue
            if isinstance(v, (dict, list)):
                yield from find_slide_arrays(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from find_slide_arrays(item, f"{path}[{i}]")


def extract_template(slide):
    """Get the template identifier from a slide object."""
    if not isinstance(slide, dict):
        return None
    for key in ('template', 'templateId', 'layout', 'type', 'kind'):
        v = slide.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip().lower()
    return None


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = []

    for path, slides in find_slide_arrays(data):
        if len(slides) < 3:
            continue  # too few slides to enforce variety

        templates = [extract_template(s) for s in slides]
        present = [t for t in templates if t]
        missing_templates = len(slides) - len(present)
        distinct = set(present)

        N = len(slides)
        required = min(7, max(2, N // 3))

        if missing_templates > 0:
            failures.append(
                f"MISSING_TEMPLATE_FIELD at {path}: {missing_templates}/{N} slides "
                f"have no template/layout/type identifier; renderer will default "
                f"or fail."
            )

        if len(distinct) < required:
            most_common = max(set(present), key=present.count) if present else 'unknown'
            most_common_count = present.count(most_common) if present else 0
            failures.append(
                f"LOW_VARIETY at {path}: {len(distinct)} distinct templates across "
                f"{N} slides; required {required}. Most-used template '{most_common}' "
                f"appears {most_common_count} times. AI regressed to modal layout."
            )

        # Check for unknown template identifiers (likely typos or hallucinated names)
        unknown_templates = [t for t in distinct if t not in KNOWN_TEMPLATES]
        if unknown_templates:
            failures.append(
                f"UNKNOWN_TEMPLATE at {path}: template(s) not in the 18-template "
                f"registry: {', '.join(sorted(unknown_templates))[:200]}. "
                f"Renderer will fail to render these."
            )

    if failures:
        sys.stderr.write("SLIDE VARIETY VALIDATION FAILED:\n")
        for f in failures[:8]:
            sys.stderr.write(f"  - {f}\n")
        if len(failures) > 8:
            sys.stderr.write(f"  ... and {len(failures) - 8} more\n")
        sys.stderr.write(
            "\nGuidance: invoke the slide-archetype-enforcer skill (or "
            "deck-narrative-composer with explicit template budget) to allocate "
            "templates BEFORE the AI fills content. The 18-template system in "
            "components/slideTemplates/types.ts is wasted if every slide is the "
            "same template.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
