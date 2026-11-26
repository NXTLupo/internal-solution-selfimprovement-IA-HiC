"""No generated page gives one class two meanings (uplift plan 2026-11-23, WS-6; memory note of 22 Nov).

Four times a generic class name (.truth, .dim, .bar, .lead) was defined twice in one page's stylesheet and restyled
the other part of the page; each was renamed with a prefix (k-truth, mbar, r-lead) after it reached the owner. Each page
is the brand kit's sheet, the shared page style and one module's sheet, so these are the two places a name can meet
itself: two unscoped rules in one page, or a module reusing a name the shared sheets already style. New names take a
prefix of their module or component (mbar, r-lead, k-truth, jm-...)."""
import importlib.util
import os
import re

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
SHARED_ON_PURPOSE = {"hero", "k"}       # the page hero (refined by .doc .hero) and the mono label (refined by .who .k)


def _scanner():
    spec = importlib.util.spec_from_file_location("css_collisions", os.path.join(HERE, "..", "scripts", "css_collisions.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def scan():
    mod = _scanner()
    return mod, mod.pages()


def test_every_page_type_renders(scan):
    _, pages = scan
    assert {"document", "personas", "competitive", "architecture", "journey", "slides:journey", "study:faq"} <= set(pages)
    assert not [n for n, p in pages.items() if "not rendered" in p[:120]]


def test_no_page_defines_a_class_twice_with_different_values(scan):
    mod, pages = scan
    assert {name: got for name, page in pages.items() if (got := mod.collisions(page))} == {}


def test_no_module_reuses_a_name_the_shared_sheets_style():
    from ia_next import deck, docpage, journeymap, localstudy, pagestyle, slidepage

    def classes(css):
        css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        return {c for sel in re.findall(r"([^{}]+)\{", css) if not sel.strip().startswith("@")
                for c in re.findall(r"\.([A-Za-z][\w-]*)", sel)}
    kit, page = classes(deck.brand_kit("nxt")["css"]), classes(pagestyle.CSS)
    # the sheets each module's pages are built from: slide pages carry the brand kit only, documents the shared style too
    reused = {name: sorted((classes(css) & shared) - SHARED_ON_PURPOSE)
              for name, css, shared in (("docpage", docpage.CSS, kit | page), ("journeymap", journeymap.CSS, kit | page),
                                        ("localstudy", localstudy._CSS, kit | page), ("slidepage", slidepage.CSS, kit))}
    assert {k: v for k, v in reused.items() if v} == {}
