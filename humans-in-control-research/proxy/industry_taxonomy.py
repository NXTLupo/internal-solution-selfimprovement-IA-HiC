#!/usr/bin/env python3
"""
Industry taxonomy + classifier (proxy side, added 2026-05-29).

Python twin of services/industryTaxonomy.ts. The second brain is organized by
industry vertical as a MULTI-VALUED tag dimension (cross-over content belongs
to several verticals; physical folders would break the chunk-store path keys).

Canonical list mirrors KNOWN_VERTICALS in services/briefParser.ts. Deterministic
source->verticals classification (no LLM) honors the determinism-first rule;
the proxy runs a cheap Gemini Flash pass ONLY on the deterministic-ambiguous
remainder (those tagged cross_industry), tagged industry_method=llm.

workforce and ai_research are CROSS-CUTTING: they frequently co-occur with a
primary vertical and never suppress it.
"""
import re

INDUSTRY_VERTICALS = [
    "higher_ed", "fundraising", "healthcare", "life_sciences", "saas",
    "enterprise_it", "retail", "dtc", "cpg", "financial_services", "insurance",
    "nonprofit", "government", "policy", "media", "education", "manufacturing",
    "energy", "real_estate", "ai_research", "workforce", "sustainability",
]
CROSS_INDUSTRY = "cross_industry"
CROSS_CUTTING = {"workforce", "ai_research"}  # co-occur; never suppress a primary
_VSET = set(INDUSTRY_VERTICALS)


def is_known_vertical(v: str) -> bool:
    return v in _VSET


# (regex, verticals) — most specific first. Mirrors the TS SIGNAL_MAP.
_SIGNAL_MAP = [
    (re.compile(r"\b(higher ?ed|universit|college|campus|undergrad|co-?op|coop|student|admission|enrol|alumni|provost|faculty|northeastern|registrar|fafsa|tuition)\b", re.I), ["higher_ed"]),
    (re.compile(r"r/(cscareerquestions|engineeringstudents|gradadmissions|college|professors|academia|highereducation|students)", re.I), ["higher_ed", "workforce"]),
    (re.compile(r"\b(advancement|donor|fundrais|philanthrop|giving|endowment|gift officer|capital campaign|annual fund|major gift)\b", re.I), ["fundraising", "nonprofit"]),
    (re.compile(r"\b(nonprofit|non-profit|ngo|charit|foundation grant)\b", re.I), ["nonprofit"]),
    (re.compile(r"\b(health ?care|hospital|patient|clinical|physician|nurse|payer|provider network|ehr|telehealth|medicaid|medicare)\b", re.I), ["healthcare"]),
    (re.compile(r"\b(pharma|biotech|life ?science|clinical trial|fda approval|drug develop|genomic)\b", re.I), ["life_sciences", "healthcare"]),
    (re.compile(r"r/(recruiting|humanresources|jobs|careerguidance|antiwork|workreform)", re.I), ["workforce"]),
    (re.compile(r"\b(workforce|talent acquisition|recruit|hiring|hr tech|employee experience|upskill|reskill|labor market|gig economy)\b", re.I), ["workforce"]),
    (re.compile(r"\b(b2b saas|saas|product-led|plg|\barr\b|churn rate|enterprise software|devops|kubernetes|api platform)\b", re.I), ["saas", "enterprise_it"]),
    (re.compile(r"r/(artificial|machinelearning|openai|gpt|chatgpt|localllama|singularity)", re.I), ["ai_research"]),
    (re.compile(r"\b(generative ai|large language model|\bllm\b|machine learning|ai agent|foundation model|prompt engineering)\b", re.I), ["ai_research"]),
    (re.compile(r"r/(ecommerce|shopify|dropship|marketing|digital_?marketing|marketingautomation|fulfillmentbyamazon)", re.I), ["retail", "dtc"]),
    (re.compile(r"\b(e-?commerce|dtc|direct-to-consumer|retail|merchandis|shopify|omnichannel|point of sale|cpg|consumer packaged)\b", re.I), ["retail", "dtc"]),
    (re.compile(r"\b(bank|fintech|financial services|wealth manage|capital markets|payments|lending|underwrit|insurance|insurtech|actuar|claims process)\b", re.I), ["financial_services"]),
    (re.compile(r"\b(government|public sector|federal agency|gov ?tech|policy|regulat|legislation|municipal|civic)\b", re.I), ["government", "policy"]),
    (re.compile(r"\b(media|publishing|journalism|streaming|broadcast|newsroom|subscription media)\b", re.I), ["media"]),
    (re.compile(r"\b(manufactur|industrial|supply chain|factory|plant floor|oem)\b", re.I), ["manufacturing"]),
    (re.compile(r"\b(energy|utility|grid|renewable|solar|oil ?& ?gas|power generation)\b", re.I), ["energy"]),
    (re.compile(r"\b(real estate|proptech|property manage|commercial real|leasing)\b", re.I), ["real_estate"]),
    (re.compile(r"\b(sustainab|esg|carbon|net zero|climate|decarboniz)\b", re.I), ["sustainability"]),
    (re.compile(r"\b(k-?12|school district|edtech|primary education|secondary education|teacher)\b", re.I), ["education"]),
]


def classify_deterministic(source: str = "", title: str = "", url: str = "", kind: str = "") -> list:
    """Deterministic source/title -> verticals. Returns [] when nothing matches
    (caller decides: cross_industry, or escalate to LLM)."""
    hay = "  ".join([x for x in (source, title, url, kind) if x])
    hits = []
    for rx, verticals in _SIGNAL_MAP:
        if rx.search(hay):
            for v in verticals:
                if v not in hits:
                    hits.append(v)
    # Order: primaries first, cross-cutting (workforce/ai_research) after, cap 3.
    primary = [v for v in hits if v not in CROSS_CUTTING]
    cross = [v for v in hits if v in CROSS_CUTTING]
    ordered = (primary + cross)[:3]
    return ordered


def normalize_verticals(raw) -> list:
    """Coerce an LLM/freeform list to known verticals; drop unknowns."""
    if isinstance(raw, str):
        raw = re.split(r"[,\s]+", raw)
    out = []
    for v in (raw or []):
        v = str(v).strip().lower().replace("-", "_").replace(" ", "_")
        if v in _VSET and v not in out:
            out.append(v)
    return out[:3]
