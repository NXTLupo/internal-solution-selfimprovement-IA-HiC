#!/usr/bin/env python3
"""
Industry backfill (2026-05-29) — tag the second brain by industry vertical.

Walks the corpus, classifies each article's industries (deterministic first;
Gemini Flash only on the ambiguous remainder), writes `industries:` +
`industry_method:` into frontmatter (idempotent/additive), then generates the
per-vertical manifests at wiki/industries/<vertical>.md and an industries
breakdown for index.md.

Usage (run inside the proxy container so GEMINI_API_KEY + /hic-workspace are present):
  docker compose -f docker-compose-all.yml exec research-proxy python /app/industry_backfill.py --dry-run
  docker compose -f docker-compose-all.yml exec research-proxy python /app/industry_backfill.py --apply
  ... --apply --no-llm     # deterministic only, skip the Flash ambiguous pass
  ... --sample 200         # classify only the first N (dry-run preview)

Safe: additive frontmatter only, idempotent (skips files already tagged unless
--retag), re-runnable. --dry-run writes nothing.
"""
import os
import sys
import re
import json
import time
import argparse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from industry_taxonomy import (
    classify_deterministic, normalize_verticals, INDUSTRY_VERTICALS,
    CROSS_INDUSTRY,
)

WIKI = next((p for p in (
    "/hic-workspace/wiki",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "hic-workspace", "wiki"),
) if os.path.isdir(p)), None)

CORPUS_DIRS = ["articles", "social-intelligence", "evidence", "transcripts"]
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
# 2026-06-12 - was gemini-2.5-flash (retired tier) with ?key= in the URL;
# canonical fast-text model + x-goog-api-key header per the A2 redaction rule.
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"

FM_RE = re.compile(r"^---\n([\s\S]*?)\n---\n?", re.M)


def parse_frontmatter(text):
    m = FM_RE.match(text)
    if not m:
        return {}, text, None
    raw = m.group(1)
    fm = {}
    for line in raw.splitlines():
        mm = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if mm:
            fm[mm.group(1)] = mm.group(2).strip().strip('"')
    return fm, text, m


def field_from_fm(fm_text, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm_text, re.M)
    return m.group(1).strip().strip('"') if m else ""


def first_body_chars(text, n=600):
    body = FM_RE.sub("", text, count=1)
    body = re.sub(r"^#.*$", "", body, flags=re.M).strip()
    return body[:n]


def classify_llm_batch(items):
    """items: list of {idx, title, snippet}. Returns {idx: [verticals]}.
    Gemini Flash, temp 0, JSON. Best-effort; failures -> empty (caller keeps
    cross_industry)."""
    if not GEMINI_KEY or not items:
        return {}
    vocab = ", ".join(INDUSTRY_VERTICALS)
    lines = [f'{it["idx"]}: title="{it["title"][:120]}" snippet="{it["snippet"][:300]}"' for it in items]
    prompt = (
        "Classify each item into 1-3 industry verticals from this fixed vocabulary "
        f"(use ONLY these tokens): {vocab}.\n"
        "workforce and ai_research are cross-cutting and may co-occur with a primary vertical. "
        "Return STRICT JSON: an object mapping each item id (string) to an array of vertical tokens. "
        "No prose.\n\nITEMS:\n" + "\n".join(lines)
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }).encode()
    req = urllib.request.Request(GEMINI_URL, data=body,
                                 headers={"Content-Type": "application/json",
                                          "x-goog-api-key": GEMINI_KEY})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read().decode())
        txt = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(txt)
        return {str(k): normalize_verticals(v) for k, v in parsed.items()}
    except Exception as e:
        print(f"  [llm] batch failed ({e}); ambiguous items stay cross_industry")
        return {}


def upsert_industries(text, m, verticals, method):
    """Insert/replace `industries:` + `industry_method:` inside frontmatter."""
    fm_raw = m.group(1)
    fm_raw = re.sub(r"^industries:.*$\n?", "", fm_raw, flags=re.M)
    fm_raw = re.sub(r"^industry_method:.*$\n?", "", fm_raw, flags=re.M)
    addition = f'industries: [{", ".join(verticals)}]\nindustry_method: {method}'
    new_fm = fm_raw.rstrip() + "\n" + addition
    return f"---\n{new_fm}\n---\n" + text[m.end():]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-llm", action="store_true", help="deterministic only")
    ap.add_argument("--retag", action="store_true", help="re-tag even if already tagged")
    ap.add_argument("--sample", type=int, default=0)
    args = ap.parse_args()
    apply = args.apply and not args.dry_run
    if not WIKI:
        print("ERROR: wiki dir not found"); sys.exit(1)
    print(f"WIKI={WIKI}  mode={'APPLY' if apply else 'DRY-RUN'}  llm={not args.no_llm}")

    files = []
    for d in CORPUS_DIRS:
        base = os.path.join(WIKI, d)
        for root, _, fnames in os.walk(base):
            for fn in fnames:
                if fn.endswith(".md"):
                    files.append(os.path.join(root, fn))
    if args.sample:
        files = files[: args.sample]
    print(f"corpus files: {len(files)}")

    counts = {v: 0 for v in INDUSTRY_VERTICALS}
    counts[CROSS_INDUSTRY] = 0
    cross_vertical_pairs = {}
    by_vertical_examples = {v: [] for v in list(INDUSTRY_VERTICALS) + [CROSS_INDUSTRY]}
    ambiguous = []          # (path, text, m, title)
    tagged = skipped = det_n = 0
    plan = []               # (path, text, m, verticals, method)

    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue
        fm, _, m = parse_frontmatter(text)
        if m is None:
            continue
        if fm.get("industries") and not args.retag:
            skipped += 1
            continue
        source = fm.get("source", "")
        title = fm.get("title", "") or os.path.basename(path)
        url = fm.get("url", "")
        kind = fm.get("kind", "")
        verts = classify_deterministic(source, title, url, kind)
        if verts:
            det_n += 1
            plan.append((path, text, m, verts, "deterministic"))
        else:
            ambiguous.append((path, text, m, title, first_body_chars(text)))

    print(f"deterministic-classified: {det_n}  ambiguous: {len(ambiguous)}  already-tagged(skipped): {skipped}")

    # LLM pass on ambiguous remainder
    if ambiguous and not args.no_llm:
        BATCH = 20
        idx_map = {}
        for i, (path, text, m, title, snip) in enumerate(ambiguous):
            idx_map[str(i)] = (path, text, m)
        for start in range(0, len(ambiguous), BATCH):
            chunk = ambiguous[start:start + BATCH]
            items = [{"idx": str(start + j), "title": c[3], "snippet": c[4]} for j, c in enumerate(chunk)]
            res = classify_llm_batch(items)
            for k, verts in res.items():
                if k in idx_map and verts:
                    path, text, m = idx_map[k]
                    plan.append((path, text, m, verts, "llm"))
            print(f"  [llm] batch {start//BATCH + 1}: classified {len([1 for v in res.values() if v])}/{len(items)}")
            time.sleep(0.3)
        # leftover ambiguous -> cross_industry
        classified_paths = {p for p, _, _, _, _ in plan}
        for path, text, m, title, snip in ambiguous:
            if path not in classified_paths:
                plan.append((path, text, m, [CROSS_INDUSTRY], "unclassified"))
    elif ambiguous:
        for path, text, m, title, snip in ambiguous:
            plan.append((path, text, m, [CROSS_INDUSTRY], "deterministic"))

    # tally + apply
    for path, text, m, verts, method in plan:
        for v in verts:
            counts[v] = counts.get(v, 0) + 1
            if len(by_vertical_examples.get(v, [])) < 5:
                by_vertical_examples[v].append(os.path.relpath(path, WIKI))
        for a in verts:
            for b in verts:
                if a < b:
                    cross_vertical_pairs[(a, b)] = cross_vertical_pairs.get((a, b), 0) + 1
        if apply:
            try:
                new_text = upsert_industries(text, m, verts, method)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_text)
                tagged += 1
            except Exception as e:
                print(f"  write fail {path}: {e}")

    print("\n=== INDUSTRY DISTRIBUTION ===")
    for v, c in sorted(counts.items(), key=lambda kv: -kv[1]):
        if c:
            print(f"  {v:20} {c}")
    print("\n=== TOP CROSS-OVER PAIRS ===")
    for (a, b), c in sorted(cross_vertical_pairs.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {a} + {b}: {c}")
    print(f"\nplan size: {len(plan)}  applied: {tagged if apply else 0} (dry-run wrote nothing)" )

    # Manifest + index generation only on apply
    if apply:
        generate_manifests(counts, by_vertical_examples, cross_vertical_pairs)
        print("manifests + index industries section written")


def generate_manifests(counts, examples, pairs):
    from datetime import date
    today = date.today().isoformat()
    ind_dir = os.path.join(WIKI, "industries")
    os.makedirs(ind_dir, exist_ok=True)
    for v in INDUSTRY_VERTICALS:
        c = counts.get(v, 0)
        if c == 0:
            continue
        co = sorted([(b if a == v else a, n) for (a, b), n in pairs.items() if v in (a, b)],
                    key=lambda kv: -kv[1])[:6]
        co_lines = "\n".join(f"- [[industries/{o}]] — {n} shared sources" for o, n in co) or "- (none yet)"
        ex_lines = "\n".join(f"- {e}" for e in examples.get(v, [])[:5]) or "- (none)"
        content = (
            f"---\ntitle: {v} — Industry Manifest\ntype: industry\nupdated: {today}\n"
            f"industries: [{v}]\nstatus: active\n---\n\n"
            f"# {v} — Industry Manifest\n\n"
            f"> Auto-generated by industry_backfill.py. Do not hand-edit.\n\n"
            f"**Corpus sources tagged `{v}`:** {c}\n\n"
            f"## Cross-over verticals (shared sources)\n{co_lines}\n\n"
            f"## Representative sources\n{ex_lines}\n"
        )
        with open(os.path.join(ind_dir, f"{v}.md"), "w", encoding="utf-8") as f:
            f.write(content)
    # index industries section (appended/replaced)
    idx_path = os.path.join(WIKI, "industries", "_index.md")
    rows = "\n".join(f"- [[industries/{v}]] — {counts[v]} sources"
                     for v in INDUSTRY_VERTICALS if counts.get(v, 0))
    with open(idx_path, "w", encoding="utf-8") as f:
        f.write(f"---\ntitle: Industries Index\ntype: industry\nupdated: {today}\n---\n\n"
                f"# Industries\n\nThe second brain corpus organized by vertical "
                f"(multi-valued; cross-over content appears under each relevant vertical).\n\n{rows}\n")


if __name__ == "__main__":
    main()
