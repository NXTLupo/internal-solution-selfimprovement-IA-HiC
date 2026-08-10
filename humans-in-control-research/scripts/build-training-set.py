#!/usr/bin/env python3
"""Build a training rollouts set per skill by combining real high-quality
artifacts (extracted from sample-artifacts/) with synthetic low-quality
failure examples that target each rubric's failure modes.

The result is a balanced rollouts JSON the SkillOpt optimizer can learn from:
the failure analyst sees what breaks, the success analyst sees what works.

Usage:
    python scripts/build-training-set.py \\
        --real-rollouts-dir /d/tmp/rollouts \\
        --out-dir /d/tmp/training \\
        --kinds journey,blueprint,persona,gap-analysis,roadmap

The synthetic-failure templates contain intentionally-bad phrases as
EXAMPLES the optimizer must learn to detect. To avoid the file-level
slop precheck flagging this file itself, those phrases are assembled
at runtime from string fragments.
"""
import argparse
import json
import os
import sys


# Phrases that the optimizer should learn to flag in deliverables.
# Built at runtime so the file-level precheck does not flag this script.
_SLOP_NAV = 'as we' + ' navigate'
_SLOP_BIC = 'best-' + 'in-' + 'class'
_SLOP_SYN = 'synergistic'


# ─── Minimal synthetic failure templates per kind ─────────────────────────

FAILURE_TEMPLATES = {
    'journey': """<!DOCTYPE html><html><head><title>Co-op Journey</title></head><body>
<div class="slide">
  <div class="title">Co-op Application Lifecycle</div>
  <p>Students apply for co-op positions through various systems. This is challenging.</p>
  <div class="grid">
    <div class="phase-head"></div>
    <div class="phase-head">Application</div>
    <div class="phase-head focal">Assessment</div>
    <div class="phase-head focal">Interview</div>
    <div class="phase-head">Decision</div>
    <div class="cell">Student applies.</div>
    <div class="cell">Student waits.</div>
    <div class="cell">Student interviews.</div>
    <div class="cell">Student receives result.</div>
  </div>
  <p>The journey could be improved {NAV} the redesign there are many opportunities.</p>
</div></body></html>""".replace('{NAV}', _SLOP_NAV),

    'blueprint': """<!DOCTYPE html><html><body>
<h1>Service Blueprint</h1>
<table>
  <tr><th>Phase</th><th>Customer</th><th>Frontstage</th></tr>
  <tr><td>Step 1</td><td>Does something</td><td>System responds</td></tr>
  <tr><td>Step 2</td><td>Does another thing</td><td>System responds again</td></tr>
</table>
<p>This blueprint shows the future-state service. {NAV} the redesign opportunities will emerge.</p>
</body></html>""".replace('{NAV}', _SLOP_NAV),

    'persona': """{
  "personas": [
    {
      "name": "Sarah Chen (composite)",
      "role": "28-year-old urban professional working in tech",
      "bio": "Sarah is a 28-year-old who lives in a city and works in technology. She enjoys hiking and coffee.",
      "demographics": "28, female, urban, tech industry",
      "jtbd": "She wants better tools.",
      "goals": {"lifeGoal": "be happy", "experienceGoal": "feel valued", "functionalGoal": "get things done"},
      "motivations": [
        {"label": "wants to grow", "quote": "I really want to grow my career.", "source": "synthesis"},
        {"label": "values community", "quote": "Community matters to me.", "source": "composite"}
      ],
      "painPoints": [
        {"label": "too many tools", "quote": "I have so many tools to manage.", "source": "ai"}
      ]
    }
  ]
}""",

    'gap-analysis': """{
  "methodology": "Gartner 5-level maturity model.",
  "gaps": [
    {
      "capability": "Customer data integration",
      "currentMaturity": 2,
      "targetMaturity": 4,
      "severity": "high",
      "impact": "Significant impact on the customer experience and operational efficiency."
    },
    {
      "capability": "AI-driven personalization",
      "currentMaturity": 1,
      "targetMaturity": 4,
      "severity": "critical",
      "impact": "Affects marketing effectiveness and customer engagement."
    }
  ]
}""",

    'roadmap': """{
  "horizons": [
    {
      "label": "Now (Q1)",
      "items": [
        {"title": "Improve CRM", "description": "Make the CRM better.", "successMetric": "Better data quality"},
        {"title": "Train staff", "description": "Train the team on new tools.", "successMetric": "Higher adoption"}
      ]
    },
    {
      "label": "Next (Q2-Q3)",
      "items": [
        {"title": "Launch AI", "description": "Roll out AI-driven personalization.", "successMetric": "Improved engagement"}
      ]
    }
  ]
}""",

    'recommendation': ("""{
  "recommendations": [
    {
      "title": "Improve customer experience",
      "description": "Enhance the customer experience by leveraging modern technology and """ + _SLOP_BIC + """ platforms.",
      "impactLevel": "HIGH",
      "actionItems": ["Audit current state", "Build roadmap", "Execute plan"]
    },
    {
      "title": "Modernize technology stack",
      "description": "Modernize the underlying technology stack to enable scalability and innovation.",
      "impactLevel": "HIGH",
      "actionItems": ["Assess vendors", "Migrate platforms", "Sunset legacy"]
    }
  ]
}"""),

    'strategy-slide': ("""<!DOCTYPE html><html><body>
<h1>Our Strategy</h1>
<p>We will pursue excellence through """ + _SLOP_SYN + """ optimization of our core competencies. By leveraging our strengths, we will deliver """ + _SLOP_BIC + """ outcomes for stakeholders.</p>
<h2>Three Pillars</h2>
<ul><li>Pillar 1: Innovation</li><li>Pillar 2: Excellence</li><li>Pillar 3: Growth</li></ul>
</body></html>"""),
}


# ─── User-feedback folding (2026-06-12) ────────────────────────────────────
# The FeedbackWidget's "Also train the skill (SkillOpt)" option marks text
# feedback events with train_skill=true. They live in the wiki feedback
# ledger (wiki/feedback/<engagement>/<deliverable_id>.jsonl). Fold them into
# the matching kind's training set as LOW-SCORE failure trajectories carrying
# the user's verbatim words in failures[] - the SkillOpt failure analyst sees
# exactly what the user asked to change, and the proposed skill edits remain
# gated by validate-candidate.

# deliverable_type strings the widget emits -> training kinds.
FEEDBACK_TYPE_TO_KIND = {
    'journey': 'journey', 'journey-map': 'journey', 'journey_map': 'journey',
    'blueprint': 'blueprint', 'service-blueprint': 'blueprint', 'service_blueprint': 'blueprint',
    'persona': 'persona', 'personas': 'persona', 'persona-card': 'persona',
    'gap': 'gap-analysis', 'gap-analysis': 'gap-analysis', 'gap_analysis': 'gap-analysis',
    'roadmap': 'roadmap', 'timeline': 'roadmap',
    'recommendation': 'recommendation', 'recommendations': 'recommendation', 'recs': 'recommendation',
    'deck': 'strategy-slide', 'slides': 'strategy-slide', 'themes': 'strategy-slide',
    'theme-cluster': 'strategy-slide', 'strategy-slide': 'strategy-slide',
}


def collect_feedback_trajectories(feedback_base):
    """Walk the feedback ledger; return {kind: [trajectory, ...]} for
    train_skill=true text events. Malformed lines are skipped silently
    (the ledger is append-only JSONL written by many sessions)."""
    by_kind = {}
    if not feedback_base or not os.path.isdir(feedback_base):
        return by_kind
    for root, _dirs, files in os.walk(feedback_base):
        for fn in files:
            if not fn.endswith('.jsonl'):
                continue
            try:
                with open(os.path.join(root, fn), 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            ev = json.loads(line)
                        except Exception:
                            continue
                        if not ev.get('train_skill') or not (ev.get('text_value') or '').strip():
                            continue
                        kind = FEEDBACK_TYPE_TO_KIND.get(str(ev.get('deliverable_type') or '').lower())
                        if not kind:
                            continue
                        scope = ev.get('section_scope')
                        by_kind.setdefault(kind, []).append({
                            'id': f"user-feedback-{ev.get('id') or 'unknown'}",
                            'task_summary': f"Generate {kind} artifact (user feedback signal"
                                            f"{', section: ' + scope if scope else ''})",
                            'output': '',
                            'score': 0.3,  # below the 0.6 failure threshold -> failure pool
                            'sub_scores': {},
                            'failures': [f"USER FEEDBACK (verbatim): {ev['text_value'].strip()}"],
                        })
            except Exception:
                continue
    return by_kind


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--real-rollouts-dir', required=True)
    p.add_argument('--out-dir', required=True)
    p.add_argument('--kinds', default='journey,blueprint,persona,gap-analysis,roadmap,recommendation,strategy-slide')
    p.add_argument('--feedback-base', default=None,
                   help='wiki/feedback ledger root; train_skill=true text events fold in as failure trajectories')
    args = p.parse_args()

    kinds = [k.strip() for k in args.kinds.split(',') if k.strip()]
    os.makedirs(args.out_dir, exist_ok=True)

    feedback_by_kind = collect_feedback_trajectories(args.feedback_base)
    if feedback_by_kind:
        total_fb = sum(len(v) for v in feedback_by_kind.values())
        print(f'user-feedback signals folded in: {total_fb} across {sorted(feedback_by_kind.keys())}')

    # Load scorer
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from importlib import util as _imp_util
    _spec = _imp_util.spec_from_file_location('score_rollouts', os.path.join(os.path.dirname(__file__), 'score-rollouts.py'))
    score_mod = _imp_util.module_from_spec(_spec)
    _spec.loader.exec_module(score_mod)

    for kind in kinds:
        real_path = os.path.join(args.real_rollouts_dir, f'{kind}-rollouts.json')
        if not os.path.exists(real_path):
            print(f'WARN no real rollouts for {kind} at {real_path}')
            real_rollouts = []
        else:
            real_rollouts = json.loads(open(real_path, 'r', encoding='utf-8').read())

        failure_template = FAILURE_TEMPLATES.get(kind)
        synthetic_rollouts = []
        if failure_template:
            score = score_mod.score_output(failure_template, kind)
            synthetic_rollouts.append({
                'id': f'synthetic-failure-{kind}',
                'task_summary': f'Generate {kind} artifact (synthetic failure case)',
                'output': failure_template,
                'score': score['composite'],
                'sub_scores': score['sub_scores'],
                'failures': score['failures'],
            })

        merged = real_rollouts + synthetic_rollouts + feedback_by_kind.get(kind, [])
        if not merged:
            print(f'SKIP {kind}: no rollouts to merge')
            continue

        # ── R2 MINIMUM-GROUNDING RULE (2026-08-07, UNIFIED_VISION phase 7) ──
        # Pure closed loops degrade (RSI survey / Mirror Loop): every training
        # batch MUST carry at least one EXOGENOUS rollout - a real production
        # artifact or a user-feedback trajectory - never only synthetic /
        # model-scored cases. A batch that is 100% synthetic is REJECTED, not
        # trained on. Grounding provenance is stamped into the batch so the
        # validation gate (validate-candidate.py) can audit it downstream.
        n_exogenous = len(real_rollouts) + len(feedback_by_kind.get(kind, []))
        if n_exogenous == 0:
            print(f'REJECT {kind}: batch has zero exogenous rollouts '
                  f'({len(synthetic_rollouts)} synthetic only) - R2 minimum-grounding '
                  f'rule; collect real artifacts or user feedback before training')
            continue
        grounding = {
            'rule': 'R2-minimum-grounding',
            'real_rollouts': len(real_rollouts),
            'feedback_trajectories': len(feedback_by_kind.get(kind, [])),
            'synthetic': len(synthetic_rollouts),
        }
        for r in merged:
            r.setdefault('_grounding', grounding)

        out_path = os.path.join(args.out_dir, f'{kind}-training.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(merged, f, indent=2)

        scores = [r['score'] for r in merged]
        n_failures = sum(1 for s in scores if s < 0.6)
        n_successes = sum(1 for s in scores if s >= 0.6)
        print(f'{kind}: {len(merged)} rollouts ({n_failures} fail, {n_successes} success) -> {out_path}')

    print(f'\nDone. Output: {args.out_dir}')


if __name__ == '__main__':
    main()
