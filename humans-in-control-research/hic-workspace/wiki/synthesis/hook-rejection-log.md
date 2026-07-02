---
id: synthesis/hook-rejection-log.md
chunks:
  - id: "synthesis/hook-rejection-log.md#c0"
    char_span: [0, 1794]
    sentence_count: 1
    key_terms: [constraints, deliverable, floor, density, learned, verdict, reason, source]
    concepts: [constraints, deliverable, floor, density, learned]
    related_chunks: ["synthesis/hook-rejection-log.md#c1", "synthesis/hook-rejection-log.md#c2", "synthesis/hook-rejection-log.md#c3", "synthesis/hook-rejection-log.md#c4"]
    token_count: 512
  - id: "synthesis/hook-rejection-log.md#c1"
    char_span: [1575, 3374]
    sentence_count: 1
    key_terms: [brief, floor, constraints, learned, deliverable, user, nauto-generated, density]
    concepts: [constraints, brief, floor, deliverable, learned]
    related_chunks: ["synthesis/hook-rejection-log.md#c0", "synthesis/hook-rejection-log.md#c2", "synthesis/hook-rejection-log.md#c3", "synthesis/hook-rejection-log.md#c4"]
    token_count: 512
  - id: "synthesis/hook-rejection-log.md#c2"
    char_span: [3168, 5006]
    sentence_count: 1
    key_terms: [constraints, brief, learned, user, nauto-generated, structurally, deliverable, nxt-section]
    concepts: [constraints, brief, learned, nauto-generated, structurally]
    related_chunks: ["synthesis/hook-rejection-log.md#c0", "synthesis/hook-rejection-log.md#c1", "synthesis/hook-rejection-log.md#c3", "synthesis/hook-rejection-log.md#c4"]
    token_count: 512
  - id: "synthesis/hook-rejection-log.md#c3"
    char_span: [4745, 6527]
    sentence_count: 1
    key_terms: [brief, floor, constraints, deliverable, density, learned, verdict, reason]
    concepts: [constraints, deliverable, brief, floor, density]
    related_chunks: ["synthesis/hook-rejection-log.md#c0", "synthesis/hook-rejection-log.md#c1", "synthesis/hook-rejection-log.md#c2", "synthesis/hook-rejection-log.md#c4"]
    token_count: 512
  - id: "synthesis/hook-rejection-log.md#c4"
    char_span: [6339, 7989]
    sentence_count: 1
    key_terms: [constraints, learned, brief, user, nauto-generated, structurally, deliverable, nxt-section]
    concepts: [constraints, learned, brief, nauto-generated, structurally]
    related_chunks: ["synthesis/hook-rejection-log.md#c0", "synthesis/hook-rejection-log.md#c1", "synthesis/hook-rejection-log.md#c2", "synthesis/hook-rejection-log.md#c3"]
    token_count: 455
---
{"ts_ms": 1781202328608, "source": "artifact_engine_auditor", "deliverable": "#roadmap", "model": "claude-sonnet-4-6", "verdict": "accept", "reason": "all required modules present, no slop hits", "missing_modules": [], "present_modules": ["nxt-horizons", "nxt-horizon"], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions, plus manually bridged\nfeedback from Claude C"}
{"ts_ms": 1782323516530, "source": "evidence_density_precheck", "deliverable": "#brief", "verdict": "warn", "reason": "Evidence density 0.33 below floor before generation", "detail": {"density": 0.333, "named_sources": [], "chunk_pointers_count": 0, "corpus_chars": 35681, "deficit_dimensions": ["named_sources_below_floor (have 0, floor 6)", "chunk_pointers_below_floor (have 0, floor 12)"], "should_remediate": true}}
{"ts_ms": 1782323573292, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-opus-4-8", "verdict": "accept", "reason": "all required modules present, no slop hits", "missing_modules": [], "present_modules": ["nxt-section", "nxt-h2"], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782323574516, "source": "evidence_density_precheck", "deliverable": "#brief", "verdict": "warn", "reason": "Evidence density 0.33 below floor before generation", "detail": {"density": 0.333, "named_sources": [], "chunk_pointers_count": 0, "corpus_chars": 29901, "deficit_dimensions": ["named_sources_below_floor (have 0, floor 6)", "chunk_pointers_below_floor (have 0, floor 12)"], "should_remediate": true}}
{"ts_ms": 1782323677737, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-opus-4-8", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": ["this brief"], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782323806605, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "gemini-3.1-pro-preview", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782324113682, "source": "evidence_density_precheck", "deliverable": "#brief", "verdict": "warn", "reason": "Evidence density 0.33 below floor before generation", "detail": {"density": 0.333, "named_sources": [], "chunk_pointers_count": 0, "corpus_chars": 29864, "deficit_dimensions": ["named_sources_below_floor (have 0, floor 6)", "chunk_pointers_below_floor (have 0, floor 12)"], "should_remediate": true}}
{"ts_ms": 1782324173351, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-sonnet-4-6", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": ["this brief"], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782324276532, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-opus-4-8", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": ["this brief"], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782324410447, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "gemini-3.1-pro-preview", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782324454348, "source": "evidence_density_precheck", "deliverable": "#brief", "verdict": "warn", "reason": "Evidence density 0.33 below floor before generation", "detail": {"density": 0.333, "named_sources": [], "chunk_pointers_count": 0, "corpus_chars": 29864, "deficit_dimensions": ["named_sources_below_floor (have 0, floor 6)", "chunk_pointers_below_floor (have 0, floor 12)"], "should_remediate": true}}
{"ts_ms": 1782324582625, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-opus-4-8", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": ["This brief"], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782326179226, "source": "evidence_density_precheck", "deliverable": "#brief", "verdict": "warn", "reason": "Evidence density 0.33 below floor before generation", "detail": {"density": 0.333, "named_sources": [], "chunk_pointers_count": 0, "corpus_chars": 29864, "deficit_dimensions": ["named_sources_below_floor (have 0, floor 6)", "chunk_pointers_below_floor (have 0, floor 12)"], "should_remediate": true}}
{"ts_ms": 1782326295539, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-opus-4-8", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782326384343, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "gemini-3.1-pro-preview", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
{"ts_ms": 1782326654318, "source": "artifact_engine_auditor", "deliverable": "#brief", "model": "claude-sonnet-4-6", "verdict": "advance", "reason": "artifact missing 2/2 required modules \u2014 structurally not a brief", "missing_modules": ["nxt-section", "nxt-h2"], "present_modules": [], "slop_hits": [], "prompt_excerpt": "=== LEARNED CONSTRAINTS (from prior user feedback, apply these) ===\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n- CONSTRAINT: Case-study slides render on t"}
