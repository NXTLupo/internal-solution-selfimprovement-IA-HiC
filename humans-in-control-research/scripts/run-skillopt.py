#!/usr/bin/env python3
"""SkillOpt-for-HiC CLI runner.

Offline trainer for HiC skills. Reads a SKILL.md + rollout-evidence JSON,
calls Gemini 3.5 Flash with thinking_level=medium as the optimizer, applies
text-patch edits to produce a candidate SKILL.md.

Usage:
    python scripts/run-skillopt.py \\
        --skill exemplar-skills/diagrams/journey-illustrator/SKILL.md \\
        --rollouts /tmp/journey-rollouts.json \\
        --kind journey \\
        --epochs 1 \\
        --budget 4

The rollout JSON shape:
    [
      {
        "id": "engagement-slug",
        "task_summary": "Generate a journey for ...",
        "output": "<full HTML of the produced journey artifact>",
        "score": 0.42,
        "sub_scores": {"verbatim_quote_density": 0.0, ...},
        "failures": ["verbatim-quote density 0% below 40% floor", ...],
        "user_edits": [{"section": "...", "from": "...", "to": "..."}]
      },
      ...
    ]

The scoring is run separately (see scripts/score-rollouts.py) so this
script can focus on the optimization loop.

Output:
    Writes <SKILL_PATH>.candidate-<timestamp>.md alongside the original.
    The user reviews the diff and overwrites the original to deploy.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.request
import urllib.error


PROXY_BASE = os.environ.get('HIC_PROXY_BASE', 'http://127.0.0.1:5012')


def proxy_auth_headers():
    """The proxy requires x-proxy-token on /api/* (auth on by default since WS-0). The token is never passed
    through the batch environment; it is read from the runtime config the proxy publishes
    (<hic-workspace>/.runtime/config.json), which the container and the host both see."""
    tok = os.environ.get('HIC_PROXY_TOKEN', '').strip()
    if not tok:
        for base in (os.environ.get('HIC_WORKSPACE', ''), '/hic-workspace',
                     os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hic-workspace')):
            if not base:
                continue
            try:
                with open(os.path.join(base, '.runtime', 'config.json'), 'r', encoding='utf-8') as f:
                    tok = str((json.load(f) or {}).get('proxyToken') or '')
                if tok:
                    break
            except Exception:
                continue
    return {'x-proxy-token': tok} if tok else {}
SLOW_UPDATE_START = '<!-- SLOW_UPDATE_START -->'
SLOW_UPDATE_END = '<!-- SLOW_UPDATE_END -->'
DEFAULT_MODEL = 'gemini-3.5-flash'
ESTIMATED_COST_PER_CALL_USD = 0.004  # Gemini 3.5 Flash with thinking=medium


# ─── Prompts (paper §C.2.1–§C.2.6) ────────────────────────────────────────

ANALYST_FAILURE = """You are an expert failure-analysis agent for AI agent tasks.

You will be given MULTIPLE failed agent trajectories from a single minibatch and the current skill document.
Your job is to identify the most important COMMON failure patterns across the batch and propose a concise set of skill edits.

## Analysis Process
1. Read ALL trajectories in the minibatch.
2. Identify the most prevalent, systematic failure patterns across them.
3. For each pattern, classify its failure type.
4. Propose skill edits that address the COMMON patterns, not individual edge cases.
5. Edits must be generalizable; do not hardcode task-specific values.
6. Only patch gaps in the skill; do not duplicate existing content.

EDIT BUDGET L = {budget}

{optimizer_memory_block}
CURRENT SKILL DOCUMENT:
```
{skill}
```

FAILED TRAJECTORIES ({n} in this minibatch):
{trajectories}

Respond ONLY with a valid JSON object (no markdown fences, no extra text):
{{
  "batch_size": {n},
  "failure_summary": [
    {{"failure_type": "<type>", "count": <int>, "description": "<one-line>"}}
  ],
  "patch": {{
    "reasoning": "<why these edits address the batch's common failures>",
    "edits": [
      {{"op": "append", "content": "<markdown to add at end of skill>"}},
      {{"op": "insert_after", "target": "<exact heading/text>", "content": "<markdown>"}},
      {{"op": "replace", "target": "<exact text>", "content": "<replacement>"}},
      {{"op": "delete", "target": "<exact text to remove>"}}
    ]
  }}
}}

IMPORTANT: The skill may contain a section between {slow_start} and {slow_end} markers. This is PROTECTED. Do NOT propose any edits that target content within these markers."""


ANALYST_SUCCESS = """You are an expert success-pattern analyst for AI agents.

You will be given MULTIPLE successful agent trajectories from a single minibatch and the current skill document. Your job is to identify generalizable behavior patterns that are COMMON across the batch and worth encoding in the skill.

## Rules
- Only propose patches for patterns NOT already covered in the skill.
- Focus on patterns that appear across MULTIPLE trajectories in the batch.
- Be concise. Patterns must generalize beyond specific tasks.
- Prefer reinforcing existing sections over adding new top-level sections.

EDIT BUDGET L = {budget}

{optimizer_memory_block}
CURRENT SKILL DOCUMENT:
```
{skill}
```

SUCCESSFUL TRAJECTORIES ({n} in this minibatch):
{trajectories}

Respond ONLY with a valid JSON object:
{{
  "batch_size": {n},
  "success_patterns": ["<pattern 1>"],
  "patch": {{
    "reasoning": "<why these patterns are worth encoding>",
    "edits": [...]
  }}
}}

IMPORTANT: Do NOT propose any edits between {slow_start} and {slow_end} markers."""


MERGE_PATCHES = """You are a skill-edit coordinator. You receive multiple independently-proposed patches from {source_label} analysis. Merge them into ONE coherent, non-redundant patch.

Merge guidelines:
1. Deduplicate: keep the best-worded version of similar edits.
2. Resolve conflicts: if patches contradict, choose stronger justification.
3. Preserve unique insights: include all non-redundant edits.
4. Prevalent-pattern bias: edits across multiple patches address systematic issues.
5. Independence: no two edits in the merged patch target the same text region.
6. Support count: estimate how many source patches support each merged edit.
7. PROTECTED: Do NOT merge edits targeting content between {slow_start} and {slow_end}.

CURRENT SKILL (for context):
```
{skill}
```

INDEPENDENT PATCHES ({n}):
{patches}

Respond ONLY with a valid JSON object:
{{
  "reasoning": "<summary>",
  "edits": [
    {{
      "op": "...",
      "target": "...",
      "content": "...",
      "support_count": <integer>,
      "source_type": "{source_type}"
    }}
  ]
}}"""


FINAL_MERGE = """You are a skill-edit coordinator performing the FINAL merge. You receive two pre-merged patch groups:
1. Failure-driven patches (corrective, high priority)
2. Success-driven patches (reinforcement, lower priority)

Merge guidelines:
1. FAILURE PATCHES TAKE PRIORITY.
2. Deduplicate: failure version wins.
3. Preserve success insights not covered by failure edits.
4. Carry forward support_count and source_type.
5. PROTECTED: Do NOT target content between {slow_start} and {slow_end}.

CURRENT SKILL:
```
{skill}
```

FAILURE-DRIVEN:
{failure_edits}

SUCCESS-DRIVEN:
{success_edits}

Respond ONLY with a valid JSON object:
{{
  "reasoning": "<summary>",
  "edits": [...]
}}"""


RANKING = """You are an expert edit-ranking optimizer. You receive a skill document and a pool of proposed edits. RANK them and select the top {budget}.

Ranking criteria (priority order):
1. Systematic impact (widespread recurring patterns)
2. Complementarity (fills gaps, doesn't duplicate)
3. Generality (general principles over specific entities)
4. Actionability (concrete > vague)

CURRENT SKILL:
```
{skill}
```

CANDIDATE EDITS (0-indexed):
{edits}

Respond ONLY with a valid JSON object:
{{
  "reasoning": "<justification>",
  "selected_indices": [<0-based indices of top {budget} edits>]
}}"""


# ─── Optimizer LLM caller ─────────────────────────────────────────────────

def call_optimizer(prompt, model=DEFAULT_MODEL):
    """Call Gemini 3.5 Flash via HiC proxy with thinking_level=medium."""
    body = {
        'model': model,
        'contents': {'parts': [{'text': prompt}]},
        'config': {
            'responseMimeType': 'application/json',
            'temperature': 0.2,
            'thinking_config': {'thinking_level': 'medium'},
        },
    }
    req = urllib.request.Request(
        f'{PROXY_BASE}/api/ai/gemini',
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json', **proxy_auth_headers()},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode('utf-8')
            data = json.loads(raw)
            text = data.get('text') or (data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', ''))
            return {'text': text, 'cost': ESTIMATED_COST_PER_CALL_USD}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='replace')[:200]
        raise RuntimeError(f'optimizer call HTTP {e.code}: {err_body}')


def safe_parse(text, context):
    """Parse a JSON response, tolerating code fences, surrounding prose, and
    Gemini's tendency to emit unescaped newlines/quotes in string values."""
    s = text.strip()
    # Strip code fences
    if s.startswith('```'):
        s = re.sub(r'^```(?:json)?\s*', '', s)
        s = re.sub(r'\s*```$', '', s)
    # Find first { and last }
    start = s.find('{')
    end = s.rfind('}')
    if start < 0 or end < start:
        # Try array
        astart = s.find('[')
        aend = s.rfind(']')
        if astart >= 0 and aend > astart:
            start, end = astart, aend
        else:
            print(f'  [{context}] no JSON object found', file=sys.stderr)
            return None
    candidate = s[start:end+1]

    # Pass 1 — vanilla json.loads
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e1:
        # Pass 2 — strip trailing commas before } or ]
        repaired = re.sub(r',(\s*[}\]])', r'\1', candidate)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass
        # Pass 3 — normalize newlines inside string literals
        # Gemini sometimes emits raw \n inside content; replace with escaped form
        # only when it sits between two quote chars without crossing a structural
        # boundary.
        try:
            repaired2 = re.sub(
                r'("(?:[^"\\]|\\.)*?)\n((?:[^"\\]|\\.)*?")',
                lambda m: m.group(1) + '\\n' + m.group(2),
                repaired,
            )
            return json.loads(repaired2)
        except json.JSONDecodeError:
            pass
        # Pass 4 — single-quotes → double-quotes (last resort)
        try:
            repaired3 = repaired.replace("'", '"')
            return json.loads(repaired3)
        except json.JSONDecodeError:
            print(f'  [{context}] JSON parse failed after all repairs: {e1}', file=sys.stderr)
            # Save the raw response for inspection
            try:
                debug_path = f'/d/tmp/skillopt-parse-fail-{context}.txt'
                with open(debug_path.replace('/d/tmp/', os.environ.get('TEMP', '/tmp/') + '/'), 'w', encoding='utf-8') as f:
                    f.write(text)
                print(f'  [{context}] raw response saved for inspection', file=sys.stderr)
            except Exception:
                pass
            return None


# ─── Text-patch operations ────────────────────────────────────────────────

def protected_regions(skill):
    """Every (start, end) span the proposer may not touch: the YAML frontmatter (the registry, the manifest view and
    Claude Code all parse it) and every SLOW_UPDATE_START/END block (the skill's contract sections, WS-A A3,
    2026-10-31). A skill can carry several blocks; the old single-pair check protected only the first."""
    spans = []
    if skill.startswith('---'):
        fm_end = skill.find('\n---', 3)
        if fm_end > 0:
            spans.append((0, fm_end + 4))
    pos = 0
    while True:
        s = skill.find(SLOW_UPDATE_START, pos)
        if s < 0:
            break
        e = skill.find(SLOW_UPDATE_END, s)
        if e < 0:
            spans.append((s, len(skill)))   # an unterminated block protects to the end
            break
        spans.append((s, e + len(SLOW_UPDATE_END)))
        pos = e + len(SLOW_UPDATE_END)
    return spans


def slow_update_blocks(skill):
    return [sp for sp in protected_regions(skill) if skill[sp[0]:sp[0] + len(SLOW_UPDATE_START)] == SLOW_UPDATE_START]


def in_protected_region(skill, target):
    t_idx = skill.find(target)
    if t_idx < 0:
        return False
    t_end = t_idx + len(target)
    return any(a <= t_idx < b or a < t_end <= b for a, b in protected_regions(skill))


def apply_edit(skill, edit):
    op = edit.get('op')
    target = edit.get('target')
    content = edit.get('content')
    if target and in_protected_region(skill, target):
        return skill, False, 'targets protected slow-update region'
    if op == 'append':
        if not content:
            return skill, False, 'append missing content'
        sep = '' if skill.endswith('\n\n') else ('\n' if skill.endswith('\n') else '\n\n')
        return skill + sep + content, True, None
    if op == 'insert_after':
        if not target or not content:
            return skill, False, 'insert_after missing target or content'
        idx = skill.find(target)
        if idx < 0:
            return skill, False, f'target not found: {target[:60]!r}'
        ins = idx + len(target)
        sep = '\n' if (ins < len(skill) and skill[ins] == '\n') else '\n\n'
        return skill[:ins] + sep + content + skill[ins:], True, None
    if op == 'replace':
        if not target or content is None:
            return skill, False, 'replace missing target or content'
        idx = skill.find(target)
        if idx < 0:
            return skill, False, f'target not found: {target[:60]!r}'
        return skill[:idx] + content + skill[idx + len(target):], True, None
    if op == 'delete':
        if not target:
            return skill, False, 'delete missing target'
        idx = skill.find(target)
        if idx < 0:
            return skill, False, f'target not found: {target[:60]!r}'
        return skill[:idx] + skill[idx + len(target):], True, None
    return skill, False, f'unknown op: {op}'


def apply_patches(skill, edits):
    current = skill
    applied = []
    rejected = []
    for e in edits:
        new_skill, ok, reason = apply_edit(current, e)
        if ok:
            current = new_skill
            applied.append(e)
        else:
            rejected.append({'edit': e, 'reason': reason})
    return current, applied, rejected


# ─── Main loop ────────────────────────────────────────────────────────────

def format_trajectory(t, idx):
    """Format a trajectory for inclusion in the analyst prompt."""
    sub = ', '.join(f'{k}={v:.2f}' for k, v in (t.get('sub_scores') or {}).items())
    failures = '; '.join((t.get('failures') or [])[:5])
    edits_block = ''
    if t.get('user_edits'):
        edits_block = '\nUSER EDITS:\n' + '\n'.join(
            f'  - {e.get("section")}: "{(e.get("from") or "")[:80]}" -> "{(e.get("to") or "")[:80]}"'
            for e in (t['user_edits'])[:3]
        )
    return f"""--- TRAJECTORY {idx + 1} (id={t.get('id')}, score={t.get('score', 0.0):.2f}) ---
TASK: {(t.get('task_summary') or '')[:500]}
FAILURES: {failures}
SUB-SCORES: {sub}
OUTPUT (truncated):
{(t.get('output') or '')[:2000]}
{edits_block}
"""


def chunk(arr, size):
    return [arr[i:i+size] for i in range(0, len(arr), size)]


def run_skillopt_step(skill_text, rollouts, budget, minibatch_size, optimizer_memory=''):
    failures = [r for r in rollouts if r.get('score', 0) < 0.6]
    successes = [r for r in rollouts if r.get('score', 0) >= 0.6]
    print(f'  Split: {len(failures)} failures, {len(successes)} successes')

    total_cost = 0.0
    trace = []
    failure_patches = []
    success_patches = []

    optimizer_memory_block = (
        f'OPTIMIZER MEMORY:\n{optimizer_memory}\n\n' if optimizer_memory else ''
    )

    # 3a: failure analysis per minibatch
    for i, mb in enumerate(chunk(failures, minibatch_size)):
        if not mb:
            continue
        prompt = ANALYST_FAILURE.format(
            budget=budget,
            optimizer_memory_block=optimizer_memory_block,
            skill=skill_text[:12000],
            n=len(mb),
            trajectories='\n'.join(format_trajectory(t, j) for j, t in enumerate(mb)),
            slow_start=SLOW_UPDATE_START,
            slow_end=SLOW_UPDATE_END,
        )
        print(f'  [failure-analyst-{i+1}] calling optimizer...')
        try:
            result = call_optimizer(prompt)
            total_cost += result['cost']
            parsed = safe_parse(result['text'], f'failure-{i}')
            if parsed and parsed.get('patch', {}).get('edits'):
                edits = parsed['patch']['edits']
                for e in edits:
                    e['source_type'] = 'failure'
                failure_patches.append({'source': 'failure', 'reasoning': parsed.get('patch', {}).get('reasoning', ''), 'edits': edits})
                trace.append(f'failure-mb-{i+1}: {len(edits)} edits, reasoning: {parsed["patch"].get("reasoning", "")[:120]}')
        except Exception as e:
            trace.append(f'failure-mb-{i+1}: SKIPPED ({e})')

    # 3b: success analysis per minibatch
    for i, mb in enumerate(chunk(successes, minibatch_size)):
        if not mb:
            continue
        prompt = ANALYST_SUCCESS.format(
            budget=budget,
            optimizer_memory_block=optimizer_memory_block,
            skill=skill_text[:12000],
            n=len(mb),
            trajectories='\n'.join(format_trajectory(t, j) for j, t in enumerate(mb)),
            slow_start=SLOW_UPDATE_START,
            slow_end=SLOW_UPDATE_END,
        )
        print(f'  [success-analyst-{i+1}] calling optimizer...')
        try:
            result = call_optimizer(prompt)
            total_cost += result['cost']
            parsed = safe_parse(result['text'], f'success-{i}')
            if parsed and parsed.get('patch', {}).get('edits'):
                edits = parsed['patch']['edits']
                for e in edits:
                    e['source_type'] = 'success'
                success_patches.append({'source': 'success', 'reasoning': parsed.get('patch', {}).get('reasoning', ''), 'edits': edits})
                trace.append(f'success-mb-{i+1}: {len(edits)} edits')
        except Exception as e:
            trace.append(f'success-mb-{i+1}: SKIPPED ({e})')

    # 4a: merge failures
    merged_failure = []
    if len(failure_patches) > 1:
        prompt = MERGE_PATCHES.format(
            source_label='FAILURE',
            source_type='failure',
            skill=skill_text[:8000],
            n=len(failure_patches),
            patches='\n'.join(f'--- PATCH {i+1} ---\nREASONING: {p["reasoning"]}\nEDITS: {json.dumps(p["edits"])[:2000]}' for i, p in enumerate(failure_patches)),
            slow_start=SLOW_UPDATE_START,
            slow_end=SLOW_UPDATE_END,
        )
        print('  [merge-failure] calling optimizer...')
        try:
            result = call_optimizer(prompt)
            total_cost += result['cost']
            parsed = safe_parse(result['text'], 'merge-failure')
            if parsed and parsed.get('edits'):
                merged_failure = parsed['edits']
                for e in merged_failure:
                    e['source_type'] = 'failure'
                trace.append(f'merge-failure: {len(merged_failure)} consolidated edits')
        except Exception as e:
            trace.append(f'merge-failure SKIPPED ({e})')
            merged_failure = [e for p in failure_patches for e in p['edits']]
    elif len(failure_patches) == 1:
        merged_failure = failure_patches[0]['edits']

    # 4b: merge successes
    merged_success = []
    if len(success_patches) > 1:
        prompt = MERGE_PATCHES.format(
            source_label='SUCCESS',
            source_type='success',
            skill=skill_text[:8000],
            n=len(success_patches),
            patches='\n'.join(f'--- PATCH {i+1} ---\nREASONING: {p["reasoning"]}\nEDITS: {json.dumps(p["edits"])[:2000]}' for i, p in enumerate(success_patches)),
            slow_start=SLOW_UPDATE_START,
            slow_end=SLOW_UPDATE_END,
        )
        print('  [merge-success] calling optimizer...')
        try:
            result = call_optimizer(prompt)
            total_cost += result['cost']
            parsed = safe_parse(result['text'], 'merge-success')
            if parsed and parsed.get('edits'):
                merged_success = parsed['edits']
                for e in merged_success:
                    e['source_type'] = 'success'
                trace.append(f'merge-success: {len(merged_success)} consolidated edits')
        except Exception as e:
            trace.append(f'merge-success SKIPPED ({e})')
            merged_success = [e for p in success_patches for e in p['edits']]
    elif len(success_patches) == 1:
        merged_success = success_patches[0]['edits']

    # 4c: final merge
    final_edits = []
    if merged_failure or merged_success:
        prompt = FINAL_MERGE.format(
            skill=skill_text[:8000],
            failure_edits=json.dumps(merged_failure, indent=2)[:3000],
            success_edits=json.dumps(merged_success, indent=2)[:3000],
            slow_start=SLOW_UPDATE_START,
            slow_end=SLOW_UPDATE_END,
        )
        print('  [final-merge] calling optimizer...')
        try:
            result = call_optimizer(prompt)
            total_cost += result['cost']
            parsed = safe_parse(result['text'], 'final-merge')
            if parsed and parsed.get('edits'):
                final_edits = parsed['edits']
                trace.append(f'final-merge: {len(final_edits)} edits')
        except Exception as e:
            trace.append(f'final-merge SKIPPED ({e})')
            final_edits = merged_failure + merged_success

    # 5: rank + clip
    selected = final_edits
    if len(final_edits) > budget:
        # Python 3.11 (the proxy container that runs the SkillOpt batch) rejects a nested f-string that reuses the
        # outer quote, so the fragments are built by a helper (2026-10-31; the old form raised SyntaxError on import).
        def _edit_line(i, e):
            target = ' target=' + repr(str(e.get('target') or '')[:80]) if e.get('target') else ''
            content = ' content=' + repr(str(e.get('content') or '')[:200]) if e.get('content') else ''
            return f"[{i}] {e.get('source_type', '?')}/{e.get('op')}{target}{content} support={e.get('support_count', 1)}"
        edit_list = '\n'.join(_edit_line(i, e) for i, e in enumerate(final_edits))
        prompt = RANKING.format(skill=skill_text[:8000], edits=edit_list, budget=budget)
        print('  [ranking] calling optimizer...')
        try:
            result = call_optimizer(prompt)
            total_cost += result['cost']
            parsed = safe_parse(result['text'], 'ranking')
            if parsed and parsed.get('selected_indices'):
                selected = [final_edits[i] for i in parsed['selected_indices'] if 0 <= i < len(final_edits)][:budget]
                trace.append(f'ranking: selected {len(selected)} of {len(final_edits)}')
        except Exception as e:
            trace.append(f'ranking SKIPPED ({e})')
            selected = final_edits[:budget]

    # 6: apply
    candidate, applied, rejected = apply_patches(skill_text, selected)
    trace.append(f'apply: {len(applied)} applied, {len(rejected)} rejected')

    return {
        'candidate_skill': candidate,
        'applied_edits': applied,
        'rejected_edits': rejected,
        'reasoning_trace': '\n'.join(trace),
        'estimated_cost_usd': total_cost,
    }


# ─── GEPA-style candidate POOL (2026-10-30, WS-5 R4) ─────────────────────────
# The optimizer used to yield ONE Flash patch per epoch, never executed or scored. The pool
# keeps k candidates (the incumbent, a mutation of it, and k-2 proposer runs with different
# minibatch orders and edit budgets), SCORES each one on a vector of metrics, keeps the Pareto
# front, and picks the winner by a weighted tie-break. Two scorers:
#   text  (rung 1): structural integrity, hygiene, held-out failure coverage, size cost; no model
#                   call, so a dev run completes on any machine
#   live  (rung 2): `node scripts/eval-run.mjs --mode live --skill-override <id>=<candidate>`
#                   generates the eval cases with the candidate installed as the deliverable
#                   kind's instruction override and reads the judge registry's scores
# The pool file (<skill>.pool-<ts>.json) lists every candidate with its vector so the gate reviews
# a scored population, not one unscored edit.

def _load_validator():
    from importlib import util as _imp_util
    spec = _imp_util.spec_from_file_location('validate_candidate', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'validate-candidate.py'))
    mod = _imp_util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def text_score_vector(baseline_text, candidate_text, rollouts):
    """Rung-1 vector: every metric 0..1, higher is better."""
    v = _load_validator()
    ok, issues = v.check_structural_integrity(baseline_text, candidate_text)
    integrity = 1.0 if ok else max(0.0, 1.0 - 0.34 * len(issues))
    hygiene = v.universal_hygiene_score(candidate_text)
    failures = [f for r in rollouts for f in (r.get('failures') or [])]
    addressed, total, _missing = v.held_out_failure_addressed(candidate_text, failures)
    coverage = (addressed / total) if total else 1.0
    ratio = len(candidate_text) / max(1, len(baseline_text))
    size = 1.0 if ratio <= 1.0 else max(0.0, 1.0 - (ratio - 1.0) / 0.6)   # up to 60% growth tolerated
    return {'integrity': round(integrity, 4), 'hygiene': round(hygiene, 4), 'failure_coverage': round(coverage, 4), 'size': round(size, 4)}


def live_score_vector(candidate_path, skill_id, kind, hic_dir, model):
    """Rung-2 vector from the eval lane. Returns None when the lane cannot run (no node, no proxy)."""
    import subprocess
    summary_path = os.path.join(hic_dir, 'evals', 'results', '_summary.json')
    cmd = ['node', os.path.join(hic_dir, 'scripts', 'eval-run.mjs'), '--mode', 'live', '--models', model,
           '--skill-override', f'{skill_id}={candidate_path}', '--kinds', kind]
    try:
        r = subprocess.run(cmd, cwd=hic_dir, capture_output=True, text=True, timeout=3600)
    except Exception as e:
        print(f'  [live-score] eval lane unavailable: {e}', file=sys.stderr)
        return None
    if not os.path.exists(summary_path):
        print(f'  [live-score] no summary written (rc={r.returncode}): {(r.stderr or r.stdout)[-300:]}', file=sys.stderr)
        return None
    try:
        summary = json.loads(open(summary_path, 'r', encoding='utf-8').read())
    except Exception:
        return None
    cases = [c for c in (summary.get('cases') or []) if isinstance(c, dict) and isinstance(c.get('scores'), dict)]
    if not cases:
        return None
    agg = {}
    for c in cases:
        for k, val in c['scores'].items():
            if isinstance(val, (int, float)):
                agg.setdefault(k, []).append(float(val))
    vec = {k: round(sum(vs) / len(vs), 4) for k, vs in agg.items()}
    vec['pass_rate'] = round(sum(1 for c in cases if c.get('pass')) / len(cases), 4)
    return vec


def pareto_front(indexed_vectors):
    """[(idx, {metric: score})] -> indices of the non-dominated candidates (higher is better on every metric)."""
    keys = sorted({k for _i, v in indexed_vectors for k in v})
    front = []
    for i, vi in indexed_vectors:
        dominated = False
        for j, vj in indexed_vectors:
            if i == j:
                continue
            ge_all = all(vj.get(k, 0) >= vi.get(k, 0) for k in keys)
            gt_any = any(vj.get(k, 0) > vi.get(k, 0) for k in keys)
            if ge_all and gt_any:
                dominated = True
                break
        if not dominated:
            front.append(i)
    return front


WEIGHTS = {'failure_coverage': 0.35, 'hygiene': 0.25, 'integrity': 0.25, 'size': 0.15, 'pass_rate': 0.5}


def weighted(vec):
    return sum(WEIGHTS.get(k, 0.2) * float(v) for k, v in vec.items())


def build_pool(skill_text, rollouts, budget, minibatch, k, seed=7):
    """k candidate skill texts: the incumbent, a mutation of the incumbent, and proposer runs over shuffled minibatches."""
    import random
    rng = random.Random(seed)
    pool = [{'label': 'incumbent', 'text': skill_text, 'applied_edits': [], 'trace': 'the live skill, unchanged', 'cost': 0.0}]
    # a mutation: the proposer sees only the FAILURES, with a wider budget (the incumbent's weak spots, not its successes)
    variants = []
    for n in range(max(1, k - 1)):
        order = list(rollouts)
        rng.shuffle(order)
        variants.append({
            'label': 'mutation' if n == 0 else f'proposer-{n}',
            'rollouts': [r for r in order if r.get('score', 0) < 0.6] or order if n == 0 else order,
            'budget': budget + 2 if n == 0 else max(1, budget - (n % 2)),
            'minibatch': minibatch if n % 3 else max(2, minibatch - 1),
        })
    for v in variants:
        print(f'  [pool] {v["label"]}: budget={v["budget"]} minibatch={v["minibatch"]} rollouts={len(v["rollouts"])}')
        try:
            result = run_skillopt_step(skill_text, v['rollouts'], v['budget'], v['minibatch'])
        except Exception as e:
            print(f'  [pool] {v["label"]} failed: {e}', file=sys.stderr)
            continue
        text = result['candidate_skill'] if result['applied_edits'] else skill_text
        if any(text == c['text'] for c in pool):
            print(f'  [pool] {v["label"]}: identical to an existing candidate; dropped')
            continue
        pool.append({'label': v['label'], 'text': text, 'applied_edits': result['applied_edits'], 'trace': result['reasoning_trace'], 'cost': result['estimated_cost_usd']})
    return pool


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--skill', required=True, help='Path to SKILL.md')
    p.add_argument('--rollouts', required=True, help='Path to rollout-evidence JSON')
    p.add_argument('--kind', required=True, help='Deliverable kind (journey/persona/...)')
    p.add_argument('--epochs', type=int, default=1)
    p.add_argument('--budget', type=int, default=4)
    p.add_argument('--minibatch', type=int, default=4)
    p.add_argument('--out-dir', default=None, help='Output directory (default: alongside SKILL.md)')
    # WS-5 R4: the GEPA pool
    p.add_argument('--pool', type=int, default=0, help='Candidate pool size k (0 = the single-candidate loop)')
    p.add_argument('--score-mode', choices=['text', 'live'], default='text', help='text = rung-1 text metrics; live = eval lane with the candidate installed')
    p.add_argument('--skill-id', default=None, help='Skill id for the live override (default: the skill folder name)')
    p.add_argument('--live-model', default='claude-opus-5-5')
    p.add_argument('--budget-usd', type=float, default=2.0, help='Stop building the pool when the estimated optimizer spend passes this')
    args = p.parse_args()

    if args.pool and args.pool >= 2:
        return main_pool(args)

    if not os.path.exists(args.skill):
        print(f'SKILL.md not found: {args.skill}', file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.rollouts):
        print(f'rollouts JSON not found: {args.rollouts}', file=sys.stderr)
        sys.exit(1)

    skill_text = open(args.skill, 'r', encoding='utf-8').read()
    rollouts = json.loads(open(args.rollouts, 'r', encoding='utf-8').read())
    if not isinstance(rollouts, list):
        print('rollouts JSON must be a list', file=sys.stderr)
        sys.exit(1)
    print(f'SkillOpt: {args.skill} ({len(skill_text)} chars), {len(rollouts)} rollouts, kind={args.kind}')
    print(f'         epochs={args.epochs}, budget={args.budget}, minibatch={args.minibatch}')

    current_skill = skill_text
    total_cost = 0.0
    full_trace = []
    all_applied = []

    for epoch in range(args.epochs):
        print(f'\n=== EPOCH {epoch + 1}/{args.epochs} ===')
        result = run_skillopt_step(
            current_skill,
            rollouts,
            args.budget,
            args.minibatch,
        )
        total_cost += result['estimated_cost_usd']
        full_trace.append(f'--- EPOCH {epoch + 1} ---\n' + result['reasoning_trace'])
        all_applied.extend(result['applied_edits'])
        if result['applied_edits']:
            current_skill = result['candidate_skill']
            print(f'  Epoch {epoch + 1}: applied {len(result["applied_edits"])} edits, candidate now {len(current_skill)} chars')
        else:
            print(f'  Epoch {epoch + 1}: no edits applied')

    # Write candidate
    out_dir = args.out_dir or os.path.dirname(os.path.abspath(args.skill))
    timestamp = dt.datetime.now().strftime('%Y%m%d-%H%M%S')
    skill_base = os.path.splitext(os.path.basename(args.skill))[0]
    candidate_path = os.path.join(out_dir, f'{skill_base}.candidate-{timestamp}.md')
    trace_path = os.path.join(out_dir, f'{skill_base}.skillopt-trace-{timestamp}.txt')
    edits_path = os.path.join(out_dir, f'{skill_base}.skillopt-edits-{timestamp}.json')

    with open(candidate_path, 'w', encoding='utf-8') as f:
        f.write(current_skill)
    with open(trace_path, 'w', encoding='utf-8') as f:
        f.write(f'SkillOpt training trace — {timestamp}\n')
        f.write(f'Total cost: ${total_cost:.4f}\n')
        f.write(f'Skill: {args.skill}\n')
        f.write(f'Rollouts: {args.rollouts} ({len(rollouts)} items)\n')
        f.write(f'Epochs: {args.epochs}\n\n')
        f.write('\n\n'.join(full_trace))
    with open(edits_path, 'w', encoding='utf-8') as f:
        json.dump(all_applied, f, indent=2)

    print(f'\n=== DONE ===')
    print(f'Candidate: {candidate_path}')
    print(f'Trace:     {trace_path}')
    print(f'Edits:     {edits_path}')
    print(f'Cost:      ${total_cost:.4f}')
    print(f'\nReview the diff, then to deploy: cp {candidate_path} {args.skill}')


def main_pool(args):
    """The GEPA loop: pool -> score -> Pareto -> pick; repeat for --epochs with the winner as the next incumbent."""
    if not os.path.exists(args.skill) or not os.path.exists(args.rollouts):
        print('SKILL.md or rollouts JSON not found', file=sys.stderr)
        sys.exit(1)
    skill_text = open(args.skill, 'r', encoding='utf-8').read()
    # WS-A A3 (2026-10-31): the pool trains METHOD, never the contract. A skill with no SLOW_UPDATE block has no
    # declared contract to protect, so a pool run on it could rewrite its output contract or hard rules; refuse.
    if not slow_update_blocks(skill_text):
        print(f'REFUSED: {args.skill} has no {SLOW_UPDATE_START} ... {SLOW_UPDATE_END} block. Wrap its contract '
              f'sections (input/output contract, hard rules) before a pool run; the proposer may edit only the method.',
              file=sys.stderr)
        sys.exit(3)
    rollouts = json.loads(open(args.rollouts, 'r', encoding='utf-8').read())
    hic_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    skill_id = args.skill_id or os.path.basename(os.path.dirname(os.path.abspath(args.skill)))
    out_dir = args.out_dir or os.path.dirname(os.path.abspath(args.skill))
    os.makedirs(out_dir, exist_ok=True)
    timestamp = dt.datetime.now().strftime('%Y%m%d-%H%M%S')
    skill_base = os.path.splitext(os.path.basename(args.skill))[0]
    print(f'SkillOpt GEPA pool: {args.skill} ({len(skill_text)} chars), {len(rollouts)} rollouts, kind={args.kind}, k={args.pool}, scorer={args.score_mode}')

    incumbent = skill_text
    history = []
    total_cost = 0.0
    for epoch in range(max(1, args.epochs)):
        print(f'\n=== POOL EPOCH {epoch + 1}/{args.epochs} ===')
        pool = build_pool(incumbent, rollouts, args.budget, args.minibatch, args.pool, seed=7 + epoch)
        total_cost += sum(c['cost'] for c in pool)
        scored = []
        for i, c in enumerate(pool):
            vec = text_score_vector(skill_text, c['text'], rollouts)
            if args.score_mode == 'live' and c['label'] != 'incumbent':
                cpath = os.path.join(out_dir, f'{skill_base}.pool-{timestamp}-e{epoch + 1}-c{i}.md')
                open(cpath, 'w', encoding='utf-8').write(c['text'])
                live = live_score_vector(cpath, skill_id, args.kind, hic_dir, args.live_model)
                if live:
                    vec = {**vec, **live}
                else:
                    vec['pass_rate'] = 0.0
            c['vector'] = vec
            c['weighted'] = round(weighted(vec), 4)
            scored.append((i, vec))
            print(f'  [{i}] {c["label"]:<12} ' + ' '.join(f'{k}={v:.2f}' for k, v in vec.items()) + f'  weighted={c["weighted"]:.3f}')
        front = pareto_front(scored)
        # the incumbent only loses to a candidate on the front that beats it on the weighted sum AND on failure coverage
        inc = pool[0]
        winners = [i for i in front if i != 0 and pool[i]['weighted'] > inc['weighted'] and pool[i]['vector'].get('failure_coverage', 0) >= inc['vector'].get('failure_coverage', 0)]
        winner = max(winners, key=lambda i: pool[i]['weighted']) if winners else 0
        history.append({'epoch': epoch + 1, 'pool': [{k: v for k, v in c.items() if k != 'text'} | {'chars': len(c['text'])} for c in pool],
                        'pareto_front': front, 'winner': winner, 'winner_label': pool[winner]['label']})
        print(f'  Pareto front: {front}; winner: [{winner}] {pool[winner]["label"]}')
        if winner == 0:
            print('  The incumbent is not beaten this epoch; no candidate is written.')
            break
        incumbent = pool[winner]['text']
        if total_cost > args.budget_usd:
            print(f'  Optimizer budget ${args.budget_usd:.2f} reached after epoch {epoch + 1}')
            break

    pool_path = os.path.join(out_dir, f'{skill_base}.pool-{timestamp}.json')
    with open(pool_path, 'w', encoding='utf-8') as f:
        json.dump({'skill': args.skill, 'skill_id': skill_id, 'kind': args.kind, 'k': args.pool, 'score_mode': args.score_mode,
                   'rollouts': len(rollouts), 'estimated_cost_usd': round(total_cost, 4), 'epochs': history,
                   'weights': WEIGHTS, 'generated_at': dt.datetime.utcnow().isoformat() + 'Z'}, f, indent=2)
    print(f'\nPool record: {pool_path}')
    if incumbent != skill_text:
        candidate_path = os.path.join(out_dir, f'{skill_base}.candidate-{timestamp}.md')
        open(candidate_path, 'w', encoding='utf-8').write(incumbent)
        print(f'Candidate: {candidate_path}')
        print(f'Cost:      ${total_cost:.4f}')
        print(f'\nReview the diff, then to deploy: cp {candidate_path} {args.skill}')
    else:
        print('No candidate beat the incumbent; nothing to promote.')


if __name__ == '__main__':
    main()
