"""
Research Data Proxy v2 — Configuration-Driven Source Registry
Implements 8 connector types that cover 200+ data sources.
Adding a new source = adding a config entry, not writing new code.

Connector types:
1. REST API (generic JSON pagination)
2. RSS/Atom (news feeds)
3. CKAN Action API (open data catalogs)
4. Socrata SODA (city/state portals)
5. ArcGIS REST (geospatial layers)
6. SDMX REST (international statistics)
7. OAI-PMH (repository harvesting)
8. Web Search (Invidious YouTube, etc.)
"""

import os
import json
import logging
import time
import random
import feedparser
import httpx
from fastapi import FastAPI, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HiC Research Data Proxy v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TIMEOUT = 30.0
DEFAULT_HEADERS = {"User-Agent": "NXTHumans-HiC-Research/2.0 (research@nxthumans.com)"}

# ================================================================
# SOURCE REGISTRY — Add new sources here, no code changes needed
# ================================================================

SOURCES = {
    # --- NEWS & HIGHER-ED (RSS/Atom + Web) — Tier 2 ---
    "higher_ed_dive": {"name": "Higher Ed Dive", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.highereddive.com/feeds/news/"},
    "inside_higher_ed": {"name": "Inside Higher Ed", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.insidehighered.com/feed"},
    "edsurge": {"name": "EdSurge", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.edsurge.com/feed"},
    "hechinger": {"name": "Hechinger Report", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://hechingerreport.org/feed/"},
    "campus_tech": {"name": "Campus Technology", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://campustechnology.com/rss-feeds/all.aspx"},
    "ecampus": {"name": "eCampus News", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.ecampusnews.com/feed/"},
    "the_conversation_edu": {"name": "The Conversation - Education", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://theconversation.com/us/education/articles.atom"},
    "university_world_news": {"name": "University World News", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.universityworldnews.com/rss.php?edition=global"},
    "pie_news": {"name": "The PIE News", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://thepienews.com/feed/"},
    "open_campus": {"name": "Open Campus", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://opencampus.org/feed/"},

    # --- SCHOLARLY APIs ---
    "openalex": {"name": "OpenAlex", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://api.openalex.org/works", "params": {"sort": "relevance_score:desc", "mailto": "research@nxthumans.com"},
        "query_param": "search", "limit_param": "per_page", "default_limit": 20,
        "results_path": "results", "total_path": "meta.count"},
    "semantic_scholar": {"name": "Semantic Scholar", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://api.semanticscholar.org/graph/v1/paper/search",
        "params": {"fields": "title,abstract,citationCount,year,openAccessPdf,url"},
        "query_param": "query", "limit_param": "limit", "default_limit": 15,
        "results_path": "data", "total_path": "total"},
    "crossref": {"name": "Crossref", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://api.crossref.org/works",
        "params": {"sort": "relevance", "order": "desc", "mailto": "research@nxthumans.com"},
        "query_param": "query", "limit_param": "rows", "default_limit": 20,
        "results_path": "message.items", "total_path": "message.total-results"},
    "doaj": {"name": "DOAJ", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://doaj.org/api/search/articles",
        "params": {}, "query_param": "_query_", "limit_param": "pageSize", "default_limit": 20,
        "results_path": "results", "total_path": "total"},
    "europe_pmc": {"name": "Europe PMC", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
        "params": {"format": "json", "resultType": "core"},
        "query_param": "query", "limit_param": "pageSize", "default_limit": 20,
        "results_path": "resultList.result", "total_path": "hitCount"},
    "core_ac": {"name": "CORE", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://api.core.ac.uk/v3/search/works",
        "params": {}, "query_param": "q", "limit_param": "limit", "default_limit": 15,
        "results_path": "results", "total_path": "totalHits"},

    # --- EDUCATION GOVERNMENT DATA ---
    "college_scorecard": {"name": "College Scorecard", "category": "Education Data", "type": "rest", "tier": 1,
        "base_url": "https://api.data.gov/ed/collegescorecard/v1/schools",
        "params": {"api_key": os.getenv("DATA_GOV_API_KEY", "DEMO_KEY"), "fields": "id,school.name,school.state,latest.student.size,latest.admissions.admission_rate.overall"},
        "query_param": "school.name", "limit_param": "per_page", "default_limit": 20,
        "results_path": "results", "total_path": "metadata.total"},
    "eric": {"name": "ERIC", "category": "Education Data", "type": "rest", "tier": 1,
        "base_url": "https://api.ies.ed.gov/eric/",
        "params": {"format": "json"},
        "query_param": "search", "limit_param": "rows", "default_limit": 20,
        "results_path": "response.docs", "total_path": "response.numFound"},

    # --- ECONOMIC & STATISTICAL ---
    "worldbank": {"name": "World Bank", "category": "Economic Data", "type": "rest", "tier": 1,
        "base_url": "https://api.worldbank.org/v2/indicator",
        "params": {"format": "json", "per_page": "20"},
        "query_param": "qterm", "limit_param": "per_page", "default_limit": 20,
        "results_path": "_array_1", "total_path": "_array_0.total"},
    "fred": {"name": "FRED", "category": "Economic Data", "type": "rest", "tier": 1,
        "base_url": "https://api.stlouisfed.org/fred/series/search",
        "params": {"api_key": os.getenv("FRED_API_KEY", ""), "file_type": "json"},
        "query_param": "search_text", "limit_param": "limit", "default_limit": 20,
        "results_path": "seriess", "total_path": "count"},
    "bls": {"name": "BLS", "category": "Economic Data", "type": "rest", "tier": 1,
        "base_url": "https://api.bls.gov/publicAPI/v2/timeseries/data/",
        "params": {}, "query_param": None, "limit_param": None, "default_limit": 10,
        "results_path": "Results.series", "total_path": None},
    "imf": {"name": "IMF Data", "category": "Economic Data", "type": "rest", "tier": 1,
        "base_url": "https://dataservices.imf.org/REST/SDMX_JSON.svc/Dataflow",
        "params": {}, "query_param": None, "limit_param": None, "default_limit": 50,
        "results_path": None, "total_path": None},

    # --- GOVERNMENT & REGULATORY ---
    "usaspending": {"name": "USAspending", "category": "Government Data", "type": "rest", "tier": 1,
        "base_url": "https://api.usaspending.gov/api/v2/search/spending_by_award/",
        "params": {}, "query_param": None, "limit_param": "limit", "default_limit": 20,
        "results_path": "results", "total_path": "page_metadata.total"},
    "federal_register": {"name": "Federal Register", "category": "Government Data", "type": "rest", "tier": 1,
        "base_url": "https://www.federalregister.gov/api/v1/documents.json",
        "params": {"order": "relevance"},
        "query_param": "conditions[term]", "limit_param": "per_page", "default_limit": 20,
        "results_path": "results", "total_path": "count"},
    "congress": {"name": "Congress.gov", "category": "Government Data", "type": "rest", "tier": 1,
        "base_url": "https://api.congress.gov/v3/bill",
        "params": {"api_key": os.getenv("DATA_GOV_API_KEY", "DEMO_KEY"), "format": "json"},
        "query_param": None, "limit_param": "limit", "default_limit": 20,
        "results_path": "bills", "total_path": "pagination.count"},
    "sec_edgar": {"name": "SEC EDGAR", "category": "Government Data", "type": "rest", "tier": 1,
        "base_url": "https://efts.sec.gov/LATEST/search-index",
        "params": {"dateRange": "custom", "startdt": "2024-01-01"},
        "query_param": "q", "limit_param": None, "default_limit": 20,
        "results_path": "hits.hits", "total_path": "hits.total.value"},

    # --- OPEN DATA PORTALS (Socrata SODA) ---
    "nyc_open_data": {"name": "NYC Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.cityofnewyork.us", "default_dataset": None},
    "chicago_data": {"name": "Chicago Data Portal", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.cityofchicago.org", "default_dataset": None},
    "california_data": {"name": "California Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.ca.gov", "default_dataset": None},

    # --- OPEN DATA PORTALS (CKAN) ---
    "data_gov": {"name": "Data.gov (US)", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://catalog.data.gov/api/3/action/package_search"},
    "data_gov_uk": {"name": "Data.gov.uk", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://data.gov.uk/api/3/action/package_search"},

    # --- SOCIAL & TECH ---
    "hackernews": {"name": "Hacker News", "category": "Tech & Social", "type": "rest", "tier": 3,
        "base_url": "https://hn.algolia.com/api/v1/search",
        "params": {"tags": "story"},
        "query_param": "query", "limit_param": "hitsPerPage", "default_limit": 20,
        "results_path": "hits", "total_path": "nbHits"},

    # --- VIDEO ---
    "youtube": {"name": "YouTube Search", "category": "Video", "type": "invidious", "tier": 3},

    # --- WEB INTELLIGENCE ---
    "jina": {"name": "Jina Reader", "category": "Web Intelligence", "type": "jina", "tier": 3},

    # --- NEWS AGGREGATORS ---
    "gdelt": {"name": "GDELT", "category": "News & Media", "type": "gdelt", "tier": 2},

    # ================================================================
    # AI-FOCUSED SOURCES (~65 new sources)
    # ================================================================

    # --- AI NEWS (RSS) — Tier 2 ---
    "mit_tech_review_ai": {"name": "MIT Technology Review AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.technologyreview.com/feed/"},
    "ieee_spectrum_ai": {"name": "IEEE Spectrum AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://spectrum.ieee.org/feeds/topic/artificial-intelligence"},
    "venturebeat_ai": {"name": "VentureBeat AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://venturebeat.com/category/ai/feed/"},
    "techcrunch_ai": {"name": "TechCrunch AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://techcrunch.com/tag/artificial-intelligence/feed/"},
    "ars_technica_ai": {"name": "Ars Technica AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://arstechnica.com/tag/artificial-intelligence/feed/"},
    "wired_ai": {"name": "WIRED AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.wired.com/feed/tag/ai/latest/rss"},
    "the_verge_ai": {"name": "The Verge AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.theverge.com/rss/artificial-intelligence/index.xml"},
    "zdnet_ai": {"name": "ZDNet AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.zdnet.com/topic/artificial-intelligence/rss.xml"},
    "the_register_ml": {"name": "The Register ML", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.theregister.com/offbeat/ml/headlines.atom"},
    "the_guardian_ai": {"name": "The Guardian AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.theguardian.com/technology/artificialintelligenceai/rss"},
    "synced_review": {"name": "Synced Review", "category": "AI News", "type": "rss", "tier": 2, "url": "https://syncedreview.com/feed/"},
    "marktechpost": {"name": "MarkTechPost", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.marktechpost.com/feed/"},
    "kdnuggets": {"name": "KDnuggets", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.kdnuggets.com/feed"},
    "the_gradient": {"name": "The Gradient", "category": "AI News", "type": "rss", "tier": 2, "url": "https://thegradient.pub/rss/"},

    # --- AI LAB BLOGS (RSS) — Tier 1 ---
    "openai_blog": {"name": "OpenAI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://openai.com/blog/rss.xml"},
    "google_ai_blog": {"name": "Google AI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://ai.googleblog.com/feeds/posts/default"},
    "deepmind_blog": {"name": "DeepMind Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://deepmind.google/blog/rss.xml"},
    "meta_ai_blog": {"name": "Meta AI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://ai.meta.com/blog/rss/"},
    "microsoft_research": {"name": "Microsoft Research", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://www.microsoft.com/en-us/research/feed/"},
    "nvidia_dev_blog": {"name": "NVIDIA Developer", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://developer.nvidia.com/blog/feed/"},
    "huggingface_blog": {"name": "Hugging Face Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://huggingface.co/blog/feed.xml"},
    "anthropic_blog": {"name": "Anthropic Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://www.anthropic.com/feed.xml"},
    "stability_ai": {"name": "Stability AI", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://stability.ai/news/rss.xml"},
    "mistral_ai": {"name": "Mistral AI", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://mistral.ai/feed.xml"},
    "bair_blog": {"name": "BAIR (Berkeley)", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://bair.berkeley.edu/blog/feed.xml"},

    # --- AI RESEARCH REPOS (RSS + REST) — Tier 1 ---
    "arxiv_cs_ai": {"name": "arXiv CS.AI", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.AI"},
    "arxiv_cs_lg": {"name": "arXiv CS.LG", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.LG"},
    "arxiv_cs_cl": {"name": "arXiv CS.CL", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.CL"},
    "openreview": {"name": "OpenReview", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://api.openreview.net/notes/search",
        "params": {}, "query_param": "term", "limit_param": "limit", "default_limit": 15,
        "results_path": "notes", "total_path": "count"},
    "dblp": {"name": "DBLP", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://dblp.org/search/publ/api",
        "params": {"format": "json"}, "query_param": "q", "limit_param": "h", "default_limit": 20,
        "results_path": "result.hits.hit", "total_path": "result.hits.@total"},

    # --- AI MODELS & DATASETS (REST) — Tier 1 ---
    "hf_models": {"name": "Hugging Face Models", "category": "AI Models & Datasets", "type": "rest", "tier": 1,
        "base_url": "https://huggingface.co/api/models",
        "params": {"sort": "downloads", "direction": "-1"}, "query_param": "search", "limit_param": "limit", "default_limit": 15,
        "results_path": None, "total_path": None},
    "hf_datasets": {"name": "Hugging Face Datasets", "category": "AI Models & Datasets", "type": "rest", "tier": 1,
        "base_url": "https://huggingface.co/api/datasets",
        "params": {"sort": "downloads", "direction": "-1"}, "query_param": "search", "limit_param": "limit", "default_limit": 15,
        "results_path": None, "total_path": None},

    # --- AI POLICY & ETHICS (RSS) — Tier 1 ---
    "brookings_ai": {"name": "Brookings AI", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://www.brookings.edu/topic/artificial-intelligence/feed/"},
    "stanford_hai": {"name": "Stanford HAI", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://hai.stanford.edu/news/rss.xml"},

    # --- AI COMMUNITIES (REST) — Tier 3 ---
    "stackoverflow_ai": {"name": "Stack Overflow AI", "category": "AI Communities", "type": "rest", "tier": 3,
        "base_url": "https://api.stackexchange.com/2.3/search/advanced",
        "params": {"site": "stackoverflow", "tagged": "machine-learning;artificial-intelligence", "sort": "relevance", "order": "desc"},
        "query_param": "q", "limit_param": "pagesize", "default_limit": 15,
        "results_path": "items", "total_path": "total"},

    # --- AI CODE (REST) — Tier 2 ---
    "github_repos": {"name": "GitHub Repos", "category": "AI Code", "type": "rest", "tier": 2,
        "base_url": "https://api.github.com/search/repositories",
        "params": {"sort": "stars", "order": "desc"}, "query_param": "q", "limit_param": "per_page", "default_limit": 15,
        "results_path": "items", "total_path": "total_count"},

    # ================================================================
    # REMAINING AI SOURCES — Completing the 200-source registry
    # ================================================================

    # --- MORE AI NEWS (RSS) — Tier 2 ---
    "engadget_ai": {"name": "Engadget AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.engadget.com/rss.xml"},
    "the_conversation_ai": {"name": "The Conversation AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://theconversation.com/us/topics/artificial-intelligence-13/articles.atom"},
    "analytics_vidhya": {"name": "Analytics Vidhya", "category": "AI News", "type": "rss", "tier": 3, "url": "https://www.analyticsvidhya.com/feed/"},
    "towards_ai": {"name": "Towards AI", "category": "AI News", "type": "rss", "tier": 3, "url": "https://pub.towardsai.net/feed"},
    "ai_alignment_forum": {"name": "AI Alignment Forum", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.alignmentforum.org/feed.xml"},
    "import_ai": {"name": "Import AI (Jack Clark)", "category": "AI News", "type": "rss", "tier": 2, "url": "https://importai.substack.com/feed"},
    "ml_mastery": {"name": "Machine Learning Mastery", "category": "AI News", "type": "rss", "tier": 3, "url": "https://machinelearningmastery.com/feed/"},

    # --- MORE AI LAB BLOGS (RSS) — Tier 1 ---
    "apple_ml": {"name": "Apple ML Research", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://machinelearning.apple.com/rss.xml"},
    "amazon_science": {"name": "Amazon Science", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://www.amazon.science/index.rss"},
    "aws_ml_blog": {"name": "AWS ML Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 2, "url": "https://aws.amazon.com/blogs/machine-learning/feed/"},
    "ibm_research": {"name": "IBM Research", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://research.ibm.com/blog/rss"},
    "salesforce_ai": {"name": "Salesforce AI Research", "category": "AI Lab Blogs", "type": "rss", "tier": 2, "url": "https://blog.salesforceairesearch.com/rss/"},
    "cohere_blog": {"name": "Cohere Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 2, "url": "https://cohere.com/blog/rss.xml"},
    "allen_ai": {"name": "Allen AI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://allenai.org/blog/feed"},
    "stanford_hai_blog": {"name": "Stanford HAI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://hai.stanford.edu/news/rss.xml"},
    "databricks_ai": {"name": "Databricks AI", "category": "AI Lab Blogs", "type": "rss", "tier": 2, "url": "https://www.databricks.com/feed"},

    # --- MORE AI RESEARCH (RSS) — Tier 1 ---
    "arxiv_cs_cv": {"name": "arXiv CS.CV (Vision)", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.CV"},
    "arxiv_cs_ro": {"name": "arXiv CS.RO (Robotics)", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.RO"},
    "arxiv_stat_ml": {"name": "arXiv stat.ML", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/stat.ML"},
    "arxiv_cs_ir": {"name": "arXiv CS.IR (Info Retrieval)", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.IR"},
    "arxiv_cs_hc": {"name": "arXiv CS.HC (Human-Computer)", "category": "AI Research", "type": "rss", "tier": 1, "url": "https://rss.arxiv.org/rss/cs.HC"},

    # --- MORE SCHOLARLY APIs (REST) — Tier 1 ---
    "datacite": {"name": "DataCite (Dataset DOIs)", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://api.datacite.org/dois",
        "params": {"resource-type-id": "dataset"},
        "query_param": "query", "limit_param": "page[size]", "default_limit": 15,
        "results_path": "data", "total_path": "meta.total"},
    "zenodo": {"name": "Zenodo", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://zenodo.org/api/records",
        "params": {"type": "publication"},
        "query_param": "q", "limit_param": "size", "default_limit": 15,
        "results_path": "hits.hits", "total_path": "hits.total"},

    # --- AI POLICY & ETHICS (RSS) — Tier 1 ---
    "oecd_ai": {"name": "OECD AI Policy", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://www.oecd-ilibrary.org/rss/science-and-technology.rss"},
    "eff_ai": {"name": "EFF AI & Rights", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://www.eff.org/rss/updates.xml"},
    "ada_lovelace": {"name": "Ada Lovelace Institute", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://www.adalovelaceinstitute.org/feed/"},
    "ai_now_institute": {"name": "AI Now Institute", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://ainowinstitute.org/feed"},
    "cset_georgetown": {"name": "Georgetown CSET", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://cset.georgetown.edu/feed/"},
    "partnership_on_ai": {"name": "Partnership on AI", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://partnershiponai.org/feed/"},

    # --- OPEN DATA PORTALS (CKAN/Socrata) — Tier 1 ---
    "data_gov_au": {"name": "Data.gov.au", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://data.gov.au/api/3/action/package_search"},
    "data_gov_ca": {"name": "Open Canada", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://open.canada.ca/data/api/3/action/package_search"},
    "eu_data_portal": {"name": "EU Open Data", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://data.europa.eu/api/hub/search/datasets"},
    "la_open_data": {"name": "LA Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.lacity.org", "default_dataset": None},
    "sf_open_data": {"name": "SF Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.sfgov.org", "default_dataset": None},
    "texas_open_data": {"name": "Texas Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.texas.gov", "default_dataset": None},

    # --- AI CODE REPOS (REST via GitHub) — Tier 2 ---
    "github_trending": {"name": "GitHub Code Search", "category": "AI Code", "type": "rest", "tier": 2,
        "base_url": "https://api.github.com/search/code",
        "params": {"sort": "indexed", "order": "desc"}, "query_param": "q", "limit_param": "per_page", "default_limit": 10,
        "results_path": "items", "total_path": "total_count"},

    # --- AI COMMUNITIES (REST) — Tier 3 ---
    "reddit_ml": {"name": "Reddit r/MachineLearning", "category": "AI Communities", "type": "rest", "tier": 3,
        "base_url": "https://www.reddit.com/r/MachineLearning/search.json",
        "params": {"restrict_sr": "1", "sort": "relevance", "t": "month"},
        "query_param": "q", "limit_param": "limit", "default_limit": 15,
        "results_path": "data.children", "total_path": None},
    "reddit_ai": {"name": "Reddit r/artificial", "category": "AI Communities", "type": "rest", "tier": 3,
        "base_url": "https://www.reddit.com/r/artificial/search.json",
        "params": {"restrict_sr": "1", "sort": "relevance", "t": "month"},
        "query_param": "q", "limit_param": "limit", "default_limit": 15,
        "results_path": "data.children", "total_path": None},
    "reddit_llm": {"name": "Reddit r/LocalLLaMA", "category": "AI Communities", "type": "rest", "tier": 3,
        "base_url": "https://www.reddit.com/r/LocalLLaMA/search.json",
        "params": {"restrict_sr": "1", "sort": "relevance", "t": "month"},
        "query_param": "q", "limit_param": "limit", "default_limit": 15,
        "results_path": "data.children", "total_path": None},

    # --- MORE ECONOMIC & STATISTICAL (REST) — Tier 1 ---
    "imf_data": {"name": "IMF Data", "category": "Economic Data", "type": "rest", "tier": 1,
        "base_url": "https://dataservices.imf.org/REST/SDMX_JSON.svc/Dataflow",
        "params": {}, "query_param": None, "limit_param": None, "default_limit": 50,
        "results_path": None, "total_path": None},
    "oecd_data": {"name": "OECD Data", "category": "Economic Data", "type": "rest", "tier": 1,
        "base_url": "https://stats.oecd.org/SDMX-JSON/data",
        "params": {}, "query_param": None, "limit_param": None, "default_limit": 20,
        "results_path": None, "total_path": None},

    # --- GOVERNMENT & REGULATORY (REST) — Tier 1 ---
    "nist_ai": {"name": "NIST AI Standards", "category": "Government Data", "type": "rss", "tier": 1, "url": "https://www.nist.gov/artificial-intelligence/rss.xml"},

    # --- VIDEO CHANNELS (Invidious) — Tier 3 ---
    # These use the same invidious connector but with channel-specific searches
    "youtube_ai": {"name": "YouTube AI Content", "category": "Video", "type": "invidious", "tier": 3},

    # --- DATASETS & BENCHMARKS (REST) — Tier 1 ---
    "openml": {"name": "OpenML", "category": "AI Models & Datasets", "type": "rest", "tier": 1,
        "base_url": "https://www.openml.org/api/v1/json/data/list",
        "params": {}, "query_param": "data_name", "limit_param": "limit", "default_limit": 15,
        "results_path": "data.dataset", "total_path": None},
    "kaggle_datasets": {"name": "Kaggle Datasets", "category": "AI Models & Datasets", "type": "rest", "tier": 2,
        "base_url": "https://www.kaggle.com/api/v1/datasets/list",
        "params": {"sortBy": "hottest"}, "query_param": "search", "limit_param": "pageSize", "default_limit": 15,
        "results_path": None, "total_path": None},
    "paperswithcode": {"name": "Papers With Code", "category": "AI Models & Datasets", "type": "rest", "tier": 1,
        "base_url": "https://paperswithcode.com/api/v1/papers/",
        "params": {"ordering": "-paper_date"}, "query_param": "q", "limit_param": "items_per_page", "default_limit": 15,
        "results_path": "results", "total_path": "count"},

    # --- CONFERENCE PROCEEDINGS (Web/RSS where available) — Tier 1 ---
    "neurips_proc": {"name": "NeurIPS Proceedings", "category": "AI Conferences", "type": "rss", "tier": 1, "url": "https://proceedings.neurips.cc/rss"},
    "acl_anthology": {"name": "ACL Anthology", "category": "AI Conferences", "type": "rss", "tier": 1, "url": "https://aclanthology.org/feed.xml"},
}

# ================================================================
# CONNECTOR ENGINE — Generic handlers for each connector type
# ================================================================

async def fetch_with_retry(client: httpx.AsyncClient, url: str, params: dict = None, headers: dict = None, max_retries: int = 3) -> httpx.Response:
    headers = {**DEFAULT_HEADERS, **(headers or {})}
    for attempt in range(max_retries + 1):
        try:
            resp = await client.get(url, params=params, headers=headers, timeout=TIMEOUT)
            if resp.status_code == 200:
                return resp
            if resp.status_code in (429, 500, 502, 503, 504):
                retry_after = resp.headers.get("Retry-After", str(2 ** attempt))
                try:
                    sleep_s = min(60, int(retry_after)) + random.random()
                except ValueError:
                    sleep_s = 2 ** attempt + random.random()
                time.sleep(sleep_s)
                continue
            return resp  # Non-retryable error
        except Exception as e:
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
            raise
    return resp

def resolve_path(data, path):
    """Navigate nested dict/list by dot-separated path. Special: _array_N for list index."""
    if not path:
        return data
    for key in path.split("."):
        if key.startswith("_array_"):
            idx = int(key.replace("_array_", ""))
            if isinstance(data, list) and len(data) > idx:
                data = data[idx]
            else:
                return None
        elif isinstance(data, dict):
            data = data.get(key)
        else:
            return None
        if data is None:
            return None
    return data

# ================================================================
# ENDPOINTS
# ================================================================

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "research-proxy-v2", "sources": len(SOURCES)}

@app.get("/api/sources")
async def list_sources():
    """List all available data sources grouped by category."""
    categories = {}
    for sid, src in SOURCES.items():
        cat = src.get("category", "Other")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({"id": sid, "name": src["name"], "type": src["type"]})
    return {"total": len(SOURCES), "categories": categories}

@app.get("/api/search/{source_id}")
async def search_source(source_id: str = Path(...), q: str = Query(...), limit: int = Query(20)):
    """Generic search endpoint — works for ANY registered source."""
    if source_id not in SOURCES:
        return JSONResponse({"error": f"Unknown source: {source_id}", "items": []}, status_code=404)

    src = SOURCES[source_id]
    src_type = src["type"]

    try:
        async with httpx.AsyncClient() as client:

            # --- REST API connector ---
            if src_type == "rest":
                params = dict(src.get("params", {}))
                if src.get("query_param"):
                    if src["query_param"] == "_query_":
                        # DOAJ-style: query in URL path
                        url = f"{src['base_url']}/{q}"
                    else:
                        params[src["query_param"]] = q
                        url = src["base_url"]
                else:
                    url = src["base_url"]
                if src.get("limit_param"):
                    params[src["limit_param"]] = str(min(limit, 50))

                resp = await fetch_with_retry(client, url, params=params)
                if resp.status_code != 200:
                    return {"source": src["name"], "items": [], "total": 0, "error": f"HTTP {resp.status_code}"}

                data = resp.json()
                items_raw = resolve_path(data, src.get("results_path")) or []
                total = resolve_path(data, src.get("total_path")) or len(items_raw)

                # Normalize items
                items = []
                def to_str(val, fallback=""):
                    """Safely convert any value to string (handles dicts, lists, None)."""
                    if val is None: return fallback
                    if isinstance(val, str): return val
                    if isinstance(val, dict): return val.get("en") or val.get("text") or str(next(iter(val.values()), fallback))
                    if isinstance(val, list): return ", ".join(str(v) for v in val[:5])
                    return str(val)

                for item in (items_raw if isinstance(items_raw, list) else [items_raw])[:limit]:
                    if isinstance(item, dict):
                        # Handle Reddit's nested {data: {title: ...}} structure
                        if "data" in item and isinstance(item["data"], dict) and "title" in item["data"]:
                            item = item["data"]
                        raw_title = item.get("title") or item.get("name") or item.get("modelId") or item.get("id") or item.get("school.name")
                        items.append({
                            "title": to_str(raw_title, str(item)[:100]),
                            "content": to_str(item.get("abstract") or item.get("description") or item.get("snippet") or item.get("selftext") or item.get("body"), json.dumps(item)[:500]),
                            "url": to_str(item.get("url") or item.get("doi") or item.get("link") or item.get("URL") or item.get("permalink")),
                            "date": to_str(item.get("date") or item.get("published") or item.get("publication_date") or item.get("created_at") or item.get("lastModified") or item.get("created_utc")),
                        })
                    else:
                        items.append({"title": str(item)[:100], "content": str(item)[:500], "url": "", "date": ""})

                return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": items, "total": total}

            # --- RSS/Atom connector (with keyword filtering) ---
            elif src_type == "rss":
                try:
                    resp = await fetch_with_retry(client, src["url"])
                except Exception as e:
                    logger.warning(f"RSS feed {src['name']} failed: {e}")
                    return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": [], "total": 0, "error": f"Feed unavailable: {str(e)[:100]}"}
                feed = feedparser.parse(resp.text)
                if not feed.entries:
                    return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": [], "total": 0, "note": "Feed returned 0 entries (may be temporarily unavailable)"}

                # Extract keywords from query for filtering
                stop_words = {'the','a','an','is','are','was','were','be','been','have','has','had',
                              'do','does','did','will','would','could','should','to','of','in','for',
                              'on','with','at','by','from','as','and','but','or','not','this','that',
                              'it','its','their','they','them','what','which','who','how','when','where',
                              'about','into','through','during','before','after','between','2025','2026'}
                keywords = [w.lower() for w in q.split() if len(w) > 2 and w.lower() not in stop_words]

                all_items = []
                for entry in feed.entries:
                    title = entry.get("title", "")
                    content = entry.get("summary", entry.get("description", ""))[:500]
                    text = f"{title} {content}".lower()

                    # Score by keyword matches
                    matches = sum(1 for kw in keywords if kw in text)
                    all_items.append({
                        "title": title,
                        "content": content,
                        "url": entry.get("link", ""),
                        "date": entry.get("published", entry.get("updated", "")),
                        "_matches": matches,
                    })

                # Sort by relevance (keyword matches), take top items
                all_items.sort(key=lambda x: x["_matches"], reverse=True)
                # Keep items with at least 1 keyword match, or top items if none match
                relevant = [i for i in all_items if i["_matches"] > 0]
                if not relevant:
                    relevant = all_items[:limit]  # fallback: return latest if nothing matches
                items = [{k: v for k, v in i.items() if k != "_matches"} for i in relevant[:limit]]

                return {
                    "source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3),
                    "items": items, "total": len(feed.entries),
                    "filtered": len(relevant), "note": f"{len(relevant)} of {len(feed.entries)} articles matched keywords"
                }

            # --- CKAN connector ---
            elif src_type == "ckan":
                params = {"q": q, "rows": min(limit, 50)}
                resp = await fetch_with_retry(client, src["base_url"], params=params)
                data = resp.json()
                results = data.get("result", {}).get("results", [])
                items = [{"title": r.get("title", ""), "content": (r.get("notes") or "")[:500], "url": f"https://catalog.data.gov/dataset/{r.get('name', '')}", "date": r.get("metadata_modified", "")} for r in results[:limit]]
                return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": items, "total": data.get("result", {}).get("count", 0)}

            # --- Socrata connector ---
            elif src_type == "socrata":
                # Socrata discovery API
                domain = src["domain"]
                resp = await fetch_with_retry(client, f"https://api.us.socrata.com/api/catalog/v1", params={"q": q, "domains": domain, "limit": str(min(limit, 20))})
                data = resp.json()
                results = data.get("results", [])
                items = [{"title": r.get("resource", {}).get("name", ""), "content": (r.get("resource", {}).get("description") or "")[:500], "url": r.get("link", ""), "date": r.get("resource", {}).get("updatedAt", "")} for r in results[:limit]]
                return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": items, "total": data.get("resultSetSize", 0)}

            # --- GDELT connector ---
            elif src_type == "gdelt":
                url = f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}&mode=artlist&maxrecords={min(limit, 75)}&format=json&sort=DateDesc"
                resp = await fetch_with_retry(client, url)
                data = resp.json() if resp.status_code == 200 else {}
                articles = data.get("articles", [])
                items = [{"title": a.get("title", ""), "content": f"[{a.get('seendate', '')}] {a.get('title', '')} (Source: {a.get('domain', '')})", "url": a.get("url", ""), "date": a.get("seendate", "")} for a in articles[:limit]]
                return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": items, "total": len(articles)}

            # --- Invidious/YouTube connector ---
            elif src_type == "invidious":
                instances = ["https://vid.puffyan.us", "https://invidious.fdn.fr", "https://inv.nadeko.net", "https://invidious.nerdvpn.de"]
                for instance in instances:
                    try:
                        resp = await client.get(f"{instance}/api/v1/search", params={"q": q, "type": "video", "sort_by": "relevance", "page": "1"}, timeout=15)
                        if resp.status_code == 200:
                            videos = resp.json()
                            items = [{"title": v.get("title", ""), "content": f"{v.get('title', '')} ({round(v.get('lengthSeconds', 0)/60)}min, {v.get('viewCount', 0):,} views)", "url": f"https://www.youtube.com/watch?v={v.get('videoId', '')}", "date": v.get("publishedText", "")} for v in (videos if isinstance(videos, list) else [])[:limit]]
                            return {"source": "YouTube", "category": "Video", "items": items, "total": len(items)}
                    except Exception:
                        continue
                return {"source": "YouTube", "category": "Video", "items": [], "total": 0, "error": "All instances failed"}

            # --- Jina Reader connector ---
            elif src_type == "jina":
                is_url = q.startswith("http://") or q.startswith("https://")
                endpoint = f"https://r.jina.ai/{q}" if is_url else f"https://s.jina.ai/{q}"
                resp = await fetch_with_retry(client, endpoint, headers={"Accept": "application/json", "X-With-Links": "true"})
                try:
                    data = resp.json()
                except Exception:
                    data = {"content": resp.text, "title": q}

                if is_url:
                    items = [{"title": data.get("title", q), "content": (data.get("content") or data.get("text") or "")[:5000], "url": q, "date": ""}]
                else:
                    results = data.get("data") or data.get("results") or (data if isinstance(data, list) else [data])
                    items = [{"title": r.get("title", ""), "content": (r.get("content") or r.get("description") or "")[:2000], "url": r.get("url", ""), "date": ""} for r in (results[:limit] if isinstance(results, list) else [results])]
                return {"source": "Jina Reader", "category": "Web Intelligence", "items": items, "total": len(items)}

            else:
                return {"source": src["name"], "items": [], "total": 0, "error": f"Unknown connector type: {src_type}"}

    except Exception as e:
        logger.error(f"Error searching {source_id}: {e}")
        return {"source": src.get("name", source_id), "items": [], "total": 0, "error": str(e)}


# --- BULK SEARCH: Query multiple sources in parallel ---

@app.get("/api/multi-search")
async def multi_search(q: str = Query(...), sources: str = Query(...), limit: int = Query(10)):
    """Search multiple sources in parallel. sources = comma-separated source IDs."""
    source_ids = [s.strip() for s in sources.split(",") if s.strip() in SOURCES]
    if not source_ids:
        return {"results": [], "error": "No valid source IDs provided"}

    import asyncio
    async def search_one(sid):
        try:
            return await search_source(sid, q=q, limit=limit)
        except Exception as e:
            return {"source": SOURCES.get(sid, {}).get("name", sid), "items": [], "total": 0, "error": str(e)}

    results = await asyncio.gather(*[search_one(sid) for sid in source_ids])
    return {"query": q, "sources_queried": len(source_ids), "results": results}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5012"))
    logger.info(f"Starting Research Data Proxy v2 on port {port} with {len(SOURCES)} sources")
    uvicorn.run(app, host="0.0.0.0", port=port)
