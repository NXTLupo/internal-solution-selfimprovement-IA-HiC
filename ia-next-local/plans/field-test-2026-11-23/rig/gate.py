"""Release gate for the four field-test cases (field test 23 Nov, H: "the four cases are driver scripts, not a gate").

Run the cases through the page first (rig/ui_case.js, one engagement per case), then:

    python gate.py <engagement id> [<engagement id> ...]      (reads http://127.0.0.1:9460)

For every finished piece of work in those engagements it checks the owner's bars and prints one line each:
- nothing failed, and no hard check failed (no "Needs review");
- time from creation to finish under the bar for its kind (deliverables far under 20 minutes);
- evidence: at least MIN_SOURCES sources, the currency check passed, source quality passed;
- themes: at least MIN_THEMES themes.
Exit code 0 when every line passes, 1 otherwise. A line that fails is the thing to read and fix before a release.
"""
import json
import sys
import urllib.request

BASE = "http://127.0.0.1:9460"
BAR_SECONDS = {"research_report": 600, "themes": 600, "deck": 720, "journey_map": 480, "audio_overview": 360,
               "prototype": 600, "artifact": 600, "diagram": 420}
MIN_SOURCES = 12
MIN_THEMES = 8
MUST_PASS = ("sources_current", "source_quality", "quotes_in_sources", "no_internal_text", "population_scope")


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.load(r)


def main(eids):
    bad = 0
    for eid in eids:
        for row in get(f"/api/tasks?engagement_id={eid}")["tasks"]:
            t = get(f"/api/tasks/{row['id']}")
            why = []
            if t["status"] != "done":
                why.append(f"status {t['status']}" + (f": {str(t.get('error'))[:80]}" if t.get("error") else ""))
            took = float(t["updated"]) - float(t["created"])
            bar = BAR_SECONDS.get(t["kind"], 900)
            if t["status"] == "done" and took > bar:
                why.append(f"took {took / 60:.1f} min against a bar of {bar / 60:.0f}")
            sc = t.get("scorecard") or {}
            if sc.get("hard_failed"):
                why.append("hard checks failed: " + ", ".join(sc["hard_failed"]))
            for c in sc.get("checks") or []:
                if c["name"] in MUST_PASS and not c["passed"]:
                    why.append(f"{c['name']}: {c['detail'][:90]}")
            summary = str(t.get("summary") or "")
            import re
            m = re.search(r"(\d+) sources collected", summary)
            if m and int(m.group(1)) < MIN_SOURCES:
                why.append(f"{m.group(1)} sources, under {MIN_SOURCES}")
            m = re.search(r"(\d+) themes in", summary)
            if t["kind"] == "themes" and m and int(m.group(1)) < MIN_THEMES:
                why.append(f"{m.group(1)} themes, under {MIN_THEMES}")
            bad += bool(why)
            print(f"{'FAIL' if why else 'pass'}  {t['kind']:<16} {took / 60:5.1f} min  {t['id']}  " + ("; ".join(why) if why else summary[:70]))
    print(f"\n{'GATE FAILED' if bad else 'gate passed'}: {bad} line(s) to read")
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1:]))
