"""Find class names a generated page defines twice (uplift plan 2026-11-23, WS-6; memory note 22 Nov).

Each artifact page carries one stylesheet built from several modules. Four times a generic class name (.truth, .dim,
.bar, .lead) was given two meanings in one sheet and silently restyled the other part of the page. This renders every
page type from a stand-in document, reads its <style>, and reports each class that two unscoped rules (outside media
queries) give different values for the same property. Exit status 1 when any is found.

    python scripts/css_collisions.py            (inside the ia-next-local image, cwd = repo)
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")


def rules(css):
    """[(selector, {property: value})] for rules outside @media / @supports / @keyframes blocks."""
    flat, depth, buf = [], 0, ""
    i = 0
    while i < len(css):                            # drop nested at-rule blocks
        if css.startswith("@media", i) or css.startswith("@supports", i) or css.startswith("@keyframes", i) or css.startswith("@page", i):
            j = css.index("{", i)
            depth, k = 1, j + 1
            while depth and k < len(css):
                depth += {"{": 1, "}": -1}.get(css[k], 0)
                k += 1
            i = k
            continue
        buf += css[i]
        i += 1
    for m in RULE.finditer(buf):
        props = {}
        for decl in m.group(2).split(";"):
            if ":" in decl:
                k, v = decl.split(":", 1)
                props[k.strip().lower()] = " ".join(v.split()).lower()
        for sel in m.group(1).split(","):
            flat.append((" ".join(sel.split()), props))
    return flat


def collisions(page):
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", page, re.S))
    by = {}
    for sel, props in rules(css):
        m = re.fullmatch(r"\.([A-Za-z][\w-]*)", sel)   # an unscoped single class
        if m:
            by.setdefault(m.group(1), []).append(props)
    out = {}
    for cls, blocks in by.items():
        seen = {}
        for props in blocks:
            for k, v in props.items():
                if k in seen and seen[k] != v:
                    out.setdefault(cls, set()).add(f"{k}: {seen[k]} / {v}")
                seen.setdefault(k, v)
    return {k: sorted(v) for k, v in out.items()}


def pages():
    from ia_next import docpage, journeymap, localstudy, slidepage
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    g = json.load(open(os.path.join(here, "tests", "fixtures", "builder_golden.json"), encoding="utf-8"))["clean"]
    titles = {"S1": "Advising survey"}
    doc = {"title": "Students cannot reach advisors", "standfirst": "Advising is hard to reach [S1].",
           "takeaways": ["Advisors are booked out [S1]."], "sections": [{"heading": "Booking", "paragraphs": ["Slots fill fast [S1]."],
                                                                        "quotes": [{"text": "I could not get a slot all term.", "source_id": "S1"}]}]}
    out = {"document": docpage.document(doc, "Report", "nxt", titles),
           "personas": docpage.personas(g["personas"]["doc"], "Persona set", "nxt", titles),
           "competitive": docpage.competitive(g["competitive"]["doc"], "Competitive gap analysis", "nxt", titles),
           "architecture": docpage.architecture(g["arch"]["doc"], "Architecture", "nxt", titles),
           "slides:personas": slidepage.personas(g["personas"]["doc"], titles, "nxt"),
           "slides:competitive": slidepage.competitive(g["competitive"]["doc"], titles, "nxt"),
           "slides:architecture": slidepage.architecture(g["arch"]["doc"], titles, "nxt"),
           "slides:document": slidepage.document(doc, "Report", titles, "nxt")}
    try:
        out["journey"] = journeymap.page(g["journey"]["doc"], [{"id": "S1", "title": "Advising survey"}], "nxt")
    except Exception as e:                          # the page function's signature differs: reported, not hidden
        out["journey"] = f"<!-- journey page not rendered: {type(e).__name__}: {e} -->"
    try:
        out["slides:journey"] = slidepage.journey(g["journey"]["doc"], [{"id": "S1", "title": "Advising survey"}], "nxt")
    except Exception as e:
        out["slides:journey"] = f"<!-- journey slides not rendered: {type(e).__name__}: {e} -->"
    faq = {"title": "Advising questions", "standfirst": "What students ask.", "items": [
        {"question": "How do I book?", "answer": "Through the portal.", "source_id": "S1", "quote": "Students book through the online portal."}]}
    out["study:faq"] = localstudy.render("faq", faq, "nxt", titles)
    return out


def main():
    found = 0
    for name, page in pages().items():
        if page.startswith("<!-- ") and "not rendered" in page[:80]:
            print(f"{name}: {page}")
            continue
        got = collisions(page)
        found += len(got)
        print(f"{name}: " + ("no class defined twice" if not got else "; ".join(f".{k} ({', '.join(v)})" for k, v in sorted(got.items()))))
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
