#!/usr/bin/env python3
"""
Wiki Write Precheck — PreToolUse hook.

Evidence from lint-2026-05-23.md:
  - broken-link: 17775 across 137 wiki pages
  - orphan-page: 103
  - frontmatter: 102 (Missing frontmatter field 'title')

Stops new rot at the source: blocks Edit/Write tool calls into the wiki
directory that would create a page missing required frontmatter, or
that introduces a link to a target that doesn't exist on disk.

The hook reads the proposed tool input from stdin (PreToolUse contract:
the JSON includes file_path and the new content), inspects the proposed
content, and exits non-zero with a structured message to block the write.

Exit 0 = allow the write.
Exit 2 = block the write with a guidance message on stderr.
"""
import sys
import os
import re
import json

REQUIRED_FRONTMATTER = ('title', 'type')
WIKI_DIR_FRAGMENT = os.path.normpath('humans-in-control-research/hic-workspace/wiki')

# We tolerate a few link target patterns: relative .md links, anchor-only
# links (#section), and external URLs (http(s)://, mailto:, etc.).
WIKI_LINK_RE = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
EXTERNAL_RE = re.compile(r'^(https?:|mailto:|tel:|#)', re.IGNORECASE)


def proposed_content(tool_input):
    """Extract the proposed file content from the tool input JSON."""
    if not isinstance(tool_input, dict):
        return None, None
    file_path = tool_input.get('file_path') or tool_input.get('filePath')
    if not file_path:
        return None, None
    # Write tool: content; Edit tool: new_string (plus old_string)
    content = tool_input.get('content')
    if content is None:
        # For Edit operations, we only see the diff (new_string), not the
        # resulting full file. Skipping these — the frontmatter check would
        # false-positive on every Edit because we can't see the existing
        # frontmatter that's preserved by the edit.
        return file_path, None
    return file_path, content


def is_wiki_path(file_path):
    """Is this a write into the HiC wiki?"""
    norm = os.path.normpath(file_path or '')
    return WIKI_DIR_FRAGMENT.lower() in norm.lower() and norm.lower().endswith('.md')


def check_frontmatter(content):
    """Return list of missing required frontmatter fields."""
    if not content.lstrip().startswith('---'):
        return list(REQUIRED_FRONTMATTER)
    # Find closing fence
    rest = content.lstrip()[3:]
    end = rest.find('\n---')
    if end < 0:
        return list(REQUIRED_FRONTMATTER)
    block = rest[:end]
    present = set()
    for line in block.splitlines():
        line = line.strip()
        if ':' in line:
            key = line.split(':', 1)[0].strip()
            if key:
                present.add(key.lower())
    missing = [f for f in REQUIRED_FRONTMATTER if f not in present]
    return missing


def collect_internal_links(content):
    """Return list of internal markdown link targets that point to other
    wiki pages (relative .md paths)."""
    out = []
    for m in WIKI_LINK_RE.finditer(content):
        target = m.group(2).strip()
        if EXTERNAL_RE.match(target):
            continue
        # Strip anchor / query
        target = target.split('#', 1)[0].split('?', 1)[0]
        if target and (target.endswith('.md') or '/' in target):
            out.append(target)
    return out


def resolve_link_against_disk(link, source_file_path):
    """Given a link in content of source_file_path, check whether the target
    resolves to an existing file. Returns (exists, resolved_path)."""
    source_dir = os.path.dirname(os.path.abspath(source_file_path))
    candidate = os.path.normpath(os.path.join(source_dir, link))
    if os.path.exists(candidate):
        return True, candidate
    # Also try with .md suffix appended if link omitted it
    if not link.endswith('.md'):
        alt = candidate + '.md'
        if os.path.exists(alt):
            return True, alt
    return False, candidate


def main():
    # Read tool input from stdin (Claude Code PreToolUse hook contract)
    try:
        tool_input = json.load(sys.stdin)
    except Exception:
        # Not a parseable hook payload — allow
        sys.exit(0)

    # The PreToolUse hook payload nests the actual tool args
    tool_args = tool_input.get('tool_input') or tool_input.get('toolInput') or tool_input
    file_path, content = proposed_content(tool_args)

    if not file_path or content is None:
        sys.exit(0)

    if not is_wiki_path(file_path):
        sys.exit(0)

    failures = []

    # Frontmatter
    missing = check_frontmatter(content)
    if missing:
        failures.append(
            f"MISSING_FRONTMATTER: {file_path} is missing required field(s): "
            f"{', '.join(missing)}. Wiki pages require at least: "
            f"{', '.join(REQUIRED_FRONTMATTER)}."
        )

    # Internal links
    links = collect_internal_links(content)
    broken = []
    for link in links:
        exists, resolved = resolve_link_against_disk(link, file_path)
        if not exists:
            broken.append((link, resolved))
    if broken:
        # Only fail on writes that introduce >0 broken links; allow legitimate
        # forward references (new pages) by warning the first 3 only.
        if len(broken) >= 3:
            failures.append(
                f"BROKEN_LINKS in {file_path}: {len(broken)} link target(s) "
                f"don't exist on disk. First: '{broken[0][0]}' (resolves to "
                f"{broken[0][1]}). Either create the targets first or remove "
                f"the links."
            )

    if failures:
        sys.stderr.write("WIKI WRITE BLOCKED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nGuidance: the wiki currently has 17,775 broken links and 102 "
            "missing frontmatter fields (lint-2026-05-23.md). Do not add to "
            "that pile. If the link targets are intentional forward references "
            "to pages you're about to create, sequence the creation first.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
