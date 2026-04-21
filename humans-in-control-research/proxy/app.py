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
# Browser-compatible User-Agent — required by Cloudflare / Akamai / many WAF-protected
# news sites (Chronicle, Diverse, Google News) which 403 bare custom UAs. The NXT
# identity still propagates via mailto= params on Crossref/OpenAlex polite-pool calls.
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 NXTHumans-HiC-Research/2.0 (research@nxthumans.com)",
    "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, application/json;q=0.8, text/html;q=0.5, */*;q=0.3",
    "Accept-Language": "en-US,en;q=0.9",
}

# ================================================================
# SOURCE REGISTRY — Add new sources here, no code changes needed
# ================================================================

SOURCES = {
    # --- NEWS & HIGHER-ED (RSS/Atom + Web) — Tier 2 ---
    "higher_ed_dive": {"name": "Higher Ed Dive", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.highereddive.com/feeds/news/"},
    "inside_higher_ed": {"name": "Inside Higher Ed", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.insidehighered.com/rss.xml"},
    "edsurge": {"name": "EdSurge", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.edsurge.com/feed"},
    "hechinger": {"name": "Hechinger Report", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://hechingerreport.org/feed/"},
    "campus_tech": {"name": "Campus Technology", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://campustechnology.com/rss-feeds/news.aspx"},
    "ecampus": {"name": "eCampus News", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://www.ecampusnews.com/feed/"},
    "the_conversation_edu": {"name": "The Conversation - Education", "category": "Higher-Ed News", "type": "rss", "tier": 2, "url": "https://theconversation.com/us/education/articles.atom"},
    "university_world_news": {"name": "University World News", "category": "Higher-Ed News", "type": "web_search", "tier": 2, "domain": "universityworldnews.com"},
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
    "core_ac": {"name": "CORE", "category": "Academic Literature", "type": "web_search", "tier": 1,
        "domain": "core.ac.uk"},

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
    "fred": {"name": "FRED", "category": "Economic Data", "type": "web_search", "tier": 1,
        "domain": "fred.stlouisfed.org"},
    "bls": {"name": "BLS", "category": "Economic Data", "type": "web_search", "tier": 1,
        "domain": "bls.gov"},
    "imf": {"name": "IMF Data", "category": "Economic Data", "type": "web_search", "tier": 1,
        "domain": "imf.org/en/Data"},

    # --- GOVERNMENT & REGULATORY ---
    "usaspending": {"name": "USAspending", "category": "Government Data", "type": "web_search", "tier": 1,
        "domain": "usaspending.gov"},
    "federal_register": {"name": "Federal Register", "category": "Government Data", "type": "rest", "tier": 1,
        "base_url": "https://www.federalregister.gov/api/v1/documents.json",
        "params": {"order": "relevance"},
        "query_param": "conditions[term]", "limit_param": "per_page", "default_limit": 20,
        "results_path": "results", "total_path": "count"},
    "congress": {"name": "Congress.gov", "category": "Government Data", "type": "web_search", "tier": 1,
        "domain": "congress.gov"},
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
    "ieee_spectrum_ai": {"name": "IEEE Spectrum AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://spectrum.ieee.org/feeds/feed.rss"},
    "venturebeat_ai": {"name": "VentureBeat AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://venturebeat.com/category/ai/feed/"},
    "techcrunch_ai": {"name": "TechCrunch AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://techcrunch.com/tag/artificial-intelligence/feed/"},
    "ars_technica_ai": {"name": "Ars Technica AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://arstechnica.com/tag/artificial-intelligence/feed/"},
    "wired_ai": {"name": "WIRED AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.wired.com/feed/tag/ai/latest/rss"},
    "the_verge_ai": {"name": "The Verge AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.theverge.com/rss/artificial-intelligence/index.xml"},
    "zdnet_ai": {"name": "ZDNet AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.zdnet.com/topic/artificial-intelligence/rss.xml"},
    "the_register_ml": {"name": "The Register ML", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.theregister.com/headlines.atom"},
    "the_guardian_ai": {"name": "The Guardian AI", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.theguardian.com/technology/artificialintelligenceai/rss"},
    "synced_review": {"name": "Synced Review", "category": "AI News", "type": "rss", "tier": 2, "url": "https://syncedreview.com/feed/"},
    "marktechpost": {"name": "MarkTechPost", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.marktechpost.com/feed/"},
    "kdnuggets": {"name": "KDnuggets", "category": "AI News", "type": "rss", "tier": 2, "url": "https://www.kdnuggets.com/feed"},
    "the_gradient": {"name": "The Gradient", "category": "AI News", "type": "rss", "tier": 2, "url": "https://thegradient.pub/rss/"},

    # --- AI LAB BLOGS (RSS) — Tier 1 ---
    "openai_blog": {"name": "OpenAI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://openai.com/blog/rss.xml"},
    "google_ai_blog": {"name": "Google AI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://blog.google/technology/ai/rss/"},
    "deepmind_blog": {"name": "DeepMind Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://deepmind.google/blog/rss.xml"},
    "meta_ai_blog": {"name": "Meta AI Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://engineering.fb.com/feed/"},
    "microsoft_research": {"name": "Microsoft Research", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://www.microsoft.com/en-us/research/feed/"},
    "nvidia_dev_blog": {"name": "NVIDIA Developer", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://developer.nvidia.com/blog/feed/"},
    "huggingface_blog": {"name": "Hugging Face Blog", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://huggingface.co/blog/feed.xml"},
    "anthropic_blog": {"name": "Anthropic Blog", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "anthropic.com/news"},
    "stability_ai": {"name": "Stability AI", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "stability.ai/news"},
    "mistral_ai": {"name": "Mistral AI", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "mistral.ai/news"},
    "bair_blog": {"name": "BAIR (Berkeley)", "category": "AI Lab Blogs", "type": "rss", "tier": 1, "url": "https://bair.berkeley.edu/blog/feed.xml"},

    # --- AI RESEARCH REPOS (RSS + REST) — Tier 1 ---
    # arXiv: Use the Atom search API (not RSS daily feeds which list ALL papers)
    "arxiv_cs_ai": {"name": "arXiv CS.AI", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query",
        "params": {"sortBy": "relevance", "sortOrder": "descending", "max_results": "15"},
        "query_param": "search_query", "limit_param": "max_results", "default_limit": 15,
        "results_path": None, "total_path": None,
        "note": "Returns Atom XML - handled by special case"},
    "arxiv_cs_lg": {"name": "arXiv CS.LG", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query",
        "params": {"sortBy": "relevance", "sortOrder": "descending", "max_results": "15"},
        "query_param": "search_query", "limit_param": "max_results", "default_limit": 15,
        "results_path": None, "total_path": None},
    "arxiv_cs_cl": {"name": "arXiv CS.CL", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query",
        "params": {"sortBy": "relevance", "sortOrder": "descending", "max_results": "15"},
        "query_param": "search_query", "limit_param": "max_results", "default_limit": 15,
        "results_path": None, "total_path": None},
    "openreview": {"name": "OpenReview", "category": "AI Research", "type": "web_search", "tier": 1,
        "domain": "openreview.net"},
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
    "brookings_ai": {"name": "Brookings AI", "category": "AI Policy & Ethics", "type": "web_search", "tier": 1, "domain": "brookings.edu/topic/artificial-intelligence"},
    "stanford_hai": {"name": "Stanford HAI", "category": "AI Policy & Ethics", "type": "web_search", "tier": 1, "domain": "hai.stanford.edu/news"},

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
    "ibm_research": {"name": "IBM Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "research.ibm.com/blog"},
    "salesforce_ai": {"name": "Salesforce AI Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 2, "domain": "blog.salesforceairesearch.com"},
    "cohere_blog": {"name": "Cohere Blog", "category": "AI Lab Blogs", "type": "web_search", "tier": 2, "domain": "cohere.com/blog"},
    "allen_ai": {"name": "Allen AI Blog", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "allenai.org/blog"},
    "stanford_hai_blog": {"name": "Stanford HAI Blog", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "hai.stanford.edu/news"},
    "databricks_ai": {"name": "Databricks AI", "category": "AI Lab Blogs", "type": "rss", "tier": 2, "url": "https://www.databricks.com/feed"},

    # --- MORE AI RESEARCH (RSS) — Tier 1 ---
    "arxiv_cs_cv": {"name": "arXiv CS.CV (Vision)", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query", "params": {}, "query_param": "search_query", "limit_param": "max_results", "default_limit": 15, "results_path": None, "total_path": None},
    "arxiv_cs_ro": {"name": "arXiv CS.RO (Robotics)", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query", "params": {}, "query_param": "search_query", "limit_param": "max_results", "default_limit": 15, "results_path": None, "total_path": None},
    "arxiv_stat_ml": {"name": "arXiv stat.ML", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query", "params": {}, "query_param": "search_query", "limit_param": "max_results", "default_limit": 15, "results_path": None, "total_path": None},
    "arxiv_cs_ir": {"name": "arXiv CS.IR (Info Retrieval)", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query", "params": {}, "query_param": "search_query", "limit_param": "max_results", "default_limit": 15, "results_path": None, "total_path": None},
    "arxiv_cs_hc": {"name": "arXiv CS.HC (Human-Computer)", "category": "AI Research", "type": "rest", "tier": 1,
        "base_url": "https://export.arxiv.org/api/query", "params": {}, "query_param": "search_query", "limit_param": "max_results", "default_limit": 15, "results_path": None, "total_path": None},

    # --- MORE SCHOLARLY APIs (REST) — Tier 1 ---
    "datacite": {"name": "DataCite (Dataset DOIs)", "category": "Academic Literature", "type": "rest", "tier": 1,
        "base_url": "https://api.datacite.org/dois",
        "params": {"resource-type-id": "dataset"},
        "query_param": "query", "limit_param": "page[size]", "default_limit": 15,
        "results_path": "data", "total_path": "meta.total"},
    "zenodo": {"name": "Zenodo", "category": "Academic Literature", "type": "web_search", "tier": 1,
        "domain": "zenodo.org"},

    # --- AI POLICY & ETHICS (RSS) — Tier 1 ---
    "oecd_ai": {"name": "OECD AI Policy", "category": "AI Policy & Ethics", "type": "web_search", "tier": 1, "domain": "oecd.ai/en"},
    "eff_ai": {"name": "EFF AI & Rights", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://www.eff.org/rss/updates.xml"},
    "ada_lovelace": {"name": "Ada Lovelace Institute", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://www.adalovelaceinstitute.org/feed/"},
    "ai_now_institute": {"name": "AI Now Institute", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://ainowinstitute.org/feed"},
    "cset_georgetown": {"name": "Georgetown CSET", "category": "AI Policy & Ethics", "type": "web_search", "tier": 1, "domain": "cset.georgetown.edu"},
    "partnership_on_ai": {"name": "Partnership on AI", "category": "AI Policy & Ethics", "type": "rss", "tier": 1, "url": "https://partnershiponai.org/feed/"},

    # --- OPEN DATA PORTALS (CKAN/Socrata) — Tier 1 ---
    "data_gov_au": {"name": "Data.gov.au", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://data.gov.au/data/api/3/action/package_search"},
    "data_gov_ca": {"name": "Open Canada", "category": "Open Data Portals", "type": "ckan", "tier": 1,
        "base_url": "https://open.canada.ca/data/api/3/action/package_search"},
    "eu_data_portal": {"name": "EU Open Data", "category": "Open Data Portals", "type": "web_search", "tier": 1,
        "domain": "data.europa.eu"},
    "la_open_data": {"name": "LA Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.lacity.org", "default_dataset": None},
    "sf_open_data": {"name": "SF Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.sfgov.org", "default_dataset": None},
    "texas_open_data": {"name": "Texas Open Data", "category": "Open Data Portals", "type": "socrata", "tier": 1,
        "domain": "data.texas.gov", "default_dataset": None},

    # --- AI CODE REPOS (REST via GitHub) — Tier 2 ---
    "github_trending": {"name": "GitHub Code Search", "category": "AI Code", "type": "web_search", "tier": 2,
        "domain": "github.com"},

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
    "imf_data": {"name": "IMF Data", "category": "Economic Data", "type": "web_search", "tier": 1,
        "domain": "imf.org/en/Data"},
    "oecd_data": {"name": "OECD Data", "category": "Economic Data", "type": "web_search", "tier": 1,
        "domain": "data.oecd.org"},

    # --- GOVERNMENT & REGULATORY (REST) — Tier 1 ---
    "nist_ai": {"name": "NIST AI Standards", "category": "Government Data", "type": "rss", "tier": 1, "url": "https://www.nist.gov/news-events/news/rss.xml"},

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
    "neurips_proc": {"name": "NeurIPS Proceedings", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "proceedings.neurips.cc"},
    "acl_anthology": {"name": "ACL Anthology", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "aclanthology.org"},

    # ================================================================
    # WEB-ONLY SOURCES — Site-scoped Jina search (no API/RSS available)
    # These use Jina's search API with site: scoping for targeted results
    # ================================================================

    # --- AI News (Web-only) ---
    "oreilly_radar": {"name": "O'Reilly Radar", "category": "AI News", "type": "web_search", "tier": 2, "domain": "oreilly.com/radar"},
    "deeplearning_ai_batch": {"name": "DeepLearning.AI Batch", "category": "AI News", "type": "web_search", "tier": 2, "domain": "deeplearning.ai/the-batch"},
    "distill_pub": {"name": "Distill.pub", "category": "AI News", "type": "web_search", "tier": 1, "domain": "distill.pub"},
    "arxiv_sanity": {"name": "arXiv Sanity", "category": "AI News", "type": "web_search", "tier": 2, "domain": "arxiv-sanity-lite.com"},

    # --- Conference Proceedings (Web-only) ---
    "neurips_conf": {"name": "NeurIPS Conference", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "neurips.cc"},
    "icml_conf": {"name": "ICML Conference", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "icml.cc"},
    "iclr_conf": {"name": "ICLR Conference", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "iclr.cc"},
    "aaai_conf": {"name": "AAAI Conference", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "aaai.org"},
    "ijcai_conf": {"name": "IJCAI Conference", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "ijcai.org"},
    "cvpr_conf": {"name": "CVPR (Vision)", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "openaccess.thecvf.com"},
    "acl_conf": {"name": "ACL (NLP)", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "aclweb.org"},
    "emnlp_conf": {"name": "EMNLP (NLP)", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "emnlp.org"},
    "kdd_conf": {"name": "KDD (Data Mining)", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "kdd.org"},
    "pmlr_proc": {"name": "PMLR Proceedings", "category": "AI Conferences", "type": "web_search", "tier": 1, "domain": "proceedings.mlr.press"},

    # --- Datasets & Benchmarks (Web-only) ---
    "papers_with_code_sota": {"name": "Papers With Code SOTA", "category": "AI Models & Datasets", "type": "web_search", "tier": 1, "domain": "paperswithcode.com/sota"},
    "hf_leaderboard": {"name": "HF Open LLM Leaderboard", "category": "AI Models & Datasets", "type": "web_search", "tier": 1, "domain": "huggingface.co/spaces/open-llm-leaderboard"},
    "lmarena": {"name": "LMSys Chatbot Arena", "category": "AI Models & Datasets", "type": "web_search", "tier": 2, "domain": "lmarena.ai"},
    "mlperf": {"name": "MLPerf Benchmarks", "category": "AI Models & Datasets", "type": "web_search", "tier": 1, "domain": "mlperf.org"},
    "helm_stanford": {"name": "HELM (Stanford)", "category": "AI Models & Datasets", "type": "web_search", "tier": 1, "domain": "crfm.stanford.edu/helm"},
    "tf_datasets": {"name": "TensorFlow Datasets", "category": "AI Models & Datasets", "type": "web_search", "tier": 2, "domain": "tensorflow.org/datasets"},
    "pytorch_hub": {"name": "PyTorch Hub", "category": "AI Models & Datasets", "type": "web_search", "tier": 2, "domain": "pytorch.org/hub"},
    "ollama_library": {"name": "Ollama Library", "category": "AI Models & Datasets", "type": "web_search", "tier": 2, "domain": "ollama.com/library"},

    # --- Official Lab Pages (Web-only — no RSS) ---
    "openai_research": {"name": "OpenAI Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "openai.com/research"},
    "anthropic_research": {"name": "Anthropic Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "anthropic.com/research"},
    "google_research": {"name": "Google Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "research.google/blog"},
    "nvidia_research": {"name": "NVIDIA Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "research.nvidia.com"},
    "adobe_research": {"name": "Adobe Research", "category": "AI Lab Blogs", "type": "web_search", "tier": 1, "domain": "research.adobe.com"},
    "qualcomm_ai": {"name": "Qualcomm AI", "category": "AI Lab Blogs", "type": "web_search", "tier": 2, "domain": "qualcomm.com/research/artificial-intelligence"},
    "intel_ai": {"name": "Intel AI", "category": "AI Lab Blogs", "type": "web_search", "tier": 2, "domain": "intel.com/content/www/us/en/artificial-intelligence"},

    # --- AI Policy (Web-only) ---
    "unesco_ai": {"name": "UNESCO AI", "category": "AI Policy & Ethics", "type": "web_search", "tier": 1, "domain": "unesco.org/en/artificial-intelligence"},
    "nist_ai_web": {"name": "NIST AI Framework", "category": "AI Policy & Ethics", "type": "web_search", "tier": 1, "domain": "nist.gov/artificial-intelligence"},

    # --- Open Source Communities (Web-only) ---
    "hf_forums": {"name": "Hugging Face Forums", "category": "AI Communities", "type": "web_search", "tier": 3, "domain": "discuss.huggingface.co"},
    "pytorch_forums": {"name": "PyTorch Forums", "category": "AI Communities", "type": "web_search", "tier": 3, "domain": "discuss.pytorch.org"},
    "tf_forum": {"name": "TensorFlow Forum", "category": "AI Communities", "type": "web_search", "tier": 3, "domain": "discuss.tensorflow.org"},

    # --- Code Repos (Web-only) ---
    "github_trending_ai": {"name": "GitHub Trending AI", "category": "AI Code", "type": "web_search", "tier": 2, "domain": "github.com/trending"},
    "langchain_docs": {"name": "LangChain Docs", "category": "AI Code", "type": "web_search", "tier": 2, "domain": "python.langchain.com"},
    "llamaindex_docs": {"name": "LlamaIndex Docs", "category": "AI Code", "type": "web_search", "tier": 2, "domain": "docs.llamaindex.ai"},

    # --- Video Channels (Web-only) ---
    "yt_two_minute_papers": {"name": "Two Minute Papers", "category": "Video", "type": "web_search", "tier": 3, "domain": "youtube.com/@TwoMinutePapers"},
    "yt_yannic_kilcher": {"name": "Yannic Kilcher", "category": "Video", "type": "web_search", "tier": 3, "domain": "youtube.com/@YannicKilcher"},
    "yt_lex_fridman": {"name": "Lex Fridman Podcast", "category": "Video", "type": "web_search", "tier": 2, "domain": "youtube.com/@lexfridman"},
    "yt_ai_explained": {"name": "AI Explained", "category": "Video", "type": "web_search", "tier": 3, "domain": "youtube.com/@aiexplained-official"},
    "yt_sentdex": {"name": "Sentdex", "category": "Video", "type": "web_search", "tier": 3, "domain": "youtube.com/@sentdex"},

    # ------------------------------------------------------------------
    # S3: PHILANTHROPIC & NONPROFIT DATA — US + international charity registries
    # All entries below are free to query without signup UNLESS an api_key var is
    # set (Every.org only). Gated sources (Candid Grants, UK Charity Commission,
    # CharityAPI) are deliberately NOT in this registry — add them when/if keys
    # become available. CAUTION: some of these return dataset-level metadata
    # (via CKAN), not record-level data — useful for discovery, not line-level
    # grantmaker lookup. That remains ProPublica territory.
    # ------------------------------------------------------------------
    "propublica_np": {"name": "ProPublica Nonprofit Explorer", "category": "Philanthropy", "type": "rest", "tier": 1,
        "base_url": "https://projects.propublica.org/nonprofits/api/v2/search.json",
        "params": {},
        "query_param": "q", "limit_param": None, "default_limit": 25,
        "results_path": "organizations", "total_path": "total_results"},
    # Every.org uses path-query pattern: /v0.2/search/{query}?apiKey=...&take=...
    # The "_query_" sentinel on query_param triggers the existing DOAJ-style
    # handler that appends query to URL path instead of using a ?q= param.
    "every_org": {"name": "Every.org Nonprofit Search", "category": "Philanthropy", "type": "rest", "tier": 1,
        "base_url": "https://partners.every.org/v0.2/search",
        "params": {"apiKey": os.getenv("EVERY_ORG_API_KEY", "")},
        "query_param": "_query_", "limit_param": "take", "default_limit": 15,
        "results_path": "nonprofits", "total_path": None,
        "requires_env": "EVERY_ORG_API_KEY"},
    "cra_t3010_ca": {"name": "CRA T3010 (Canada — Open Canada CKAN)", "category": "Philanthropy", "type": "ckan", "tier": 1,
        "base_url": "https://open.canada.ca/data/en/api/3/action/package_search"},
    "acnc_au": {"name": "Australian Charities (ACNC — data.gov.au CKAN)", "category": "Philanthropy", "type": "ckan", "tier": 1,
        "base_url": "https://data.gov.au/data/api/3/action/package_search"},
    "charities_ie": {"name": "Irish Charities Regulator (data.gov.ie CKAN)", "category": "Philanthropy", "type": "ckan", "tier": 1,
        "base_url": "https://data.gov.ie/api/3/action/package_search"},
    "irs_990_bulk": {"name": "IRS Form 990 S3 Bulk Index", "category": "Philanthropy", "type": "web_search", "tier": 1,
        "domain": "s3.amazonaws.com/irs-form-990"},

    # ------------------------------------------------------------------
    # S4: PHILANTHROPY + ADVANCEMENT RSS — 16 feeds across 4 subcategories.
    # 7 serve direct RSS; the other 9 are served via Google News site-filtered
    # RSS (news.google.com/rss/search?q=site:X) because those publications are
    # Cloudflare-blocked, lack public RSS, or have broken feed URLs. The
    # Google News variant returns headlines + direct links back to the source.
    # ------------------------------------------------------------------

    # Philanthropy trade press — direct RSS
    "chronicle_philanthropy":        {"name": "Chronicle of Philanthropy", "category": "Philanthropy News", "type": "rss", "tier": 2,
        "url": "https://www.philanthropy.com/feed"},
    "nonprofit_times":               {"name": "The NonProfit Times", "category": "Philanthropy News", "type": "rss", "tier": 2,
        "url": "https://www.thenonprofittimes.com/feed/"},
    "center_effective_philanthropy": {"name": "Center for Effective Philanthropy", "category": "Philanthropy News", "type": "rss", "tier": 2,
        "url": "https://cep.org/feed/"},

    # Advancement / fundraising — direct RSS
    "rnl_blog":                      {"name": "Ruffalo Noel Levitz (RNL) Blog", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://www.ruffalonl.com/blog/feed/"},
    "gravyty_blog":                  {"name": "Gravyty (Bonterra) Blog", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://gravyty.com/feed/"},
    "fundraiseup_blog":              {"name": "Fundraise Up Blog", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://fundraiseup.com/blog/rss.xml"},

    # Higher-ed news — direct RSS
    "university_business":           {"name": "University Business", "category": "Higher-Ed News", "type": "rss", "tier": 2,
        "url": "https://universitybusiness.com/feed/"},

    # Cloudflare-blocked / missing-RSS sources — proxied via Google News site-filter RSS
    "chronicle_higher_ed_gnews":     {"name": "Chronicle of Higher Ed (via Google News)", "category": "Higher-Ed News", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Achronicle.com+higher+education"},
    "diverse_higher_ed_gnews":       {"name": "Diverse Issues in Higher Ed (via Google News)", "category": "Higher-Ed News", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Adiverseeducation.com"},
    "philanthropy_news_digest_gnews":{"name": "Philanthropy News Digest (via Google News)", "category": "Philanthropy News", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Aphilanthropynewsdigest.org"},
    "nonprofit_quarterly_gnews":     {"name": "Nonprofit Quarterly (via Google News)", "category": "Philanthropy News", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Anonprofitquarterly.org"},
    "ncfp_gnews":                    {"name": "National Center for Family Philanthropy (via Google News)", "category": "Philanthropy News", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Ancfp.org"},
    "case_advancement_gnews":        {"name": "CASE Advancement News (via Google News)", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Acase.org+advancement"},
    "higheredjobs_alumni_gnews":     {"name": "HigherEdJobs Alumni Relations (via Google News)", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Ahigheredjobs.com+alumni+advancement"},
    "evertrue_gnews":                {"name": "EverTrue RAISE (via Google News)", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Aevertrue.com"},
    "givecampus_gnews":              {"name": "GiveCampus Resources (via Google News)", "category": "Advancement", "type": "rss", "tier": 2,
        "url": "https://news.google.com/rss/search?q=site%3Agivecampus.com"},

    # ------------------------------------------------------------------
    # S6: HIGHER-ED BENCHMARKING — live programmatic sources only.
    # IPEDS bulk, CASE VSE, Giving USA, Commonfund HEPI, M+R, FEP are all
    # PDF/annual-CSV drops — documented separately for manual ingestion.
    # ------------------------------------------------------------------
    "urban_education_data": {"name": "Urban Institute Education Data (IPEDS aggregation)", "category": "Education Data", "type": "rest", "tier": 1,
        "base_url": "https://educationdata.urban.org/api/v1/college-university/ipeds/directory/2022/",
        "params": {},
        "query_param": "unitid", "limit_param": None, "default_limit": 25,
        "results_path": "results", "total_path": "count"},

    # ------------------------------------------------------------------
    # S7: ARCHIVAL INTELLIGENCE — not exposed as search tiles; the S8
    # scheduler calls these programmatically to snapshot institutional
    # campaign microsites and org charts on a quarterly cadence.
    # ------------------------------------------------------------------
    "wayback_availability": {"name": "Wayback Machine Availability", "category": "Archival", "type": "rest", "tier": 1,
        "base_url": "https://archive.org/wayback/available",
        "params": {},
        "query_param": "url", "limit_param": None, "default_limit": 1,
        "results_path": "archived_snapshots", "total_path": None},
    "wayback_cdx": {"name": "Wayback Machine CDX Server", "category": "Archival", "type": "rest", "tier": 1,
        "base_url": "https://web.archive.org/cdx/search/cdx",
        "params": {"output": "json"},
        "query_param": "url", "limit_param": "limit", "default_limit": 25,
        "results_path": "_passthrough_array", "total_path": None},

    # ================================================================
    # HIGHER-ED ADVANCEMENT REGISTRY — 123 sources (128 - 5 dedupes)
    # ================================================================
    # -- University Advancement, Private (15) --
    "princeton_news": {"name": "Princeton University News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://www.princeton.edu/feed"},
    "yale_news": {"name": "Yale News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.yale.edu/rss"},
    "duke_today": {"name": "Duke Today", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://today.duke.edu/rss"},
    "harvard_gazette": {"name": "Harvard Gazette", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.harvard.edu/gazette/feed/"},
    "mit_news_adv": {"name": "MIT News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.mit.edu/rss/feed"},
    "carnegie_mellon_news": {"name": "Carnegie Mellon University News", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "cmu.edu/news"},
    "tufts_now": {"name": "Tufts Now", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://now.tufts.edu/rss.xml"},
    "boston_college_news": {"name": "Boston College News", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "bc.edu/bc-web/bc-news"},
    "wake_forest_news": {"name": "Wake Forest News", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://news.wfu.edu/feed/"},
    "tulane_news": {"name": "Tulane News", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://news.tulane.edu/rss.xml"},
    "case_western_news": {"name": "Case Western Reserve News Center", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://thedaily.case.edu/feed/"},
    "rochester_newscenter": {"name": "University of Rochester NewsCenter", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://www.rochester.edu/newscenter/feed/"},
    "rit_news": {"name": "RIT News", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://www.rit.edu/ritnews/rss/"},
    "syracuse_news": {"name": "Syracuse University News", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "news.syr.edu"},
    "gw_today": {"name": "GW Today", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "gwtoday.gwu.edu"},

    # -- University Advancement, Public (29) --
    "penn_state_news": {"name": "Penn State News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://www.psu.edu/news/rss/rss.xml"},
    "rutgers_today": {"name": "Rutgers Today", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "rutgers.edu/news"},
    "maryland_today": {"name": "Maryland Today (UMD)", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://today.umd.edu/feed"},
    "virginia_tech_news": {"name": "Virginia Tech News", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "news.vt.edu"},
    "nc_state_news": {"name": "NC State News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.ncsu.edu/feed/"},
    "clemson_news": {"name": "Clemson News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.clemson.edu/feed/"},
    "alabama_news": {"name": "UA News Center", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.ua.edu/feed/"},
    "ut_austin_news": {"name": "UT Austin News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.utexas.edu/feed/"},
    "arizona_news": {"name": "University of Arizona News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.arizona.edu/rss"},
    "asu_news": {"name": "ASU News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.asu.edu/rss-feed"},
    "oregon_news": {"name": "Around the O (University of Oregon)", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.uoregon.edu/feed"},
    "nebraska_news": {"name": "Nebraska Today (UNL)", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.unl.edu/feed"},
    "uga_news": {"name": "UGA Today", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.uga.edu/feed/"},
    "fsu_news": {"name": "Florida State University News", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://news.fsu.edu/feed/"},
    "uconn_today": {"name": "UConn Today", "category": "University Advancement", "type": "rss", "tier": 1, "url": "https://today.uconn.edu/feed/"},
    "vcu_news": {"name": "VCU News", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://news.vcu.edu/feed/"},
    "lsu_media_center": {"name": "LSU Media Center", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "lsu.edu/mediacenter"},
    "tennessee_today": {"name": "Tennessee Today (UTK)", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "news.utk.edu"},
    "uky_news": {"name": "UKNow (Kentucky)", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "uknow.uky.edu"},
    "cu_boulder_today": {"name": "CU Boulder Today", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "colorado.edu/today"},
    "utah_news": {"name": "@theU (University of Utah)", "category": "University Advancement", "type": "rss", "tier": 2, "url": "https://attheu.utah.edu/feed/"},
    "illinois_news": {"name": "Illinois News Bureau (UIUC)", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "news.illinois.edu"},
    "msu_today": {"name": "MSUToday (Michigan State)", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "msutoday.msu.edu"},
    "ucf_today": {"name": "UCF Today", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "ucf.edu/news"},
    "florida_news": {"name": "UF News", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "news.ufl.edu"},
    "umass_news": {"name": "UMass Amherst News & Media", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "umass.edu/news"},
    "mizzou_news": {"name": "Show Me Mizzou", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "showme.missouri.edu/news"},
    "wvu_today": {"name": "WVU Today", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "wvutoday.wvu.edu"},
    "pittsburgh_pittwire": {"name": "Pittwire (University of Pittsburgh)", "category": "University Advancement", "type": "web_search", "tier": 2, "domain": "pitt.edu/pittwire"},

    # -- Reddit Communities (26) --
    "reddit_askacademia": {"name": "Reddit: r/AskAcademia", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/AskAcademia/.rss"},
    "reddit_gradschool": {"name": "Reddit: r/GradSchool", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/GradSchool/.rss"},
    "reddit_professors": {"name": "Reddit: r/Professors", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/Professors/.rss"},
    "reddit_phd": {"name": "Reddit: r/PhD", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/PhD/.rss"},
    "reddit_academia": {"name": "Reddit: r/academia", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/academia/.rss"},
    "reddit_highereducation": {"name": "Reddit: r/highereducation", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/highereducation/.rss"},
    "reddit_gradadmissions": {"name": "Reddit: r/gradadmissions", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/gradadmissions/.rss"},
    "reddit_studentloans": {"name": "Reddit: r/StudentLoans", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/StudentLoans/.rss"},
    "reddit_scholarships": {"name": "Reddit: r/Scholarships", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/Scholarships/.rss"},
    "reddit_philanthropy": {"name": "Reddit: r/Philanthropy", "category": "Reddit Communities", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Philanthropy/.rss"},
    "reddit_bogleheads": {"name": "Reddit: r/Bogleheads", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/Bogleheads/.rss"},
    "reddit_investing": {"name": "Reddit: r/investing", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/investing/.rss"},
    "reddit_chubbyfire": {"name": "Reddit: r/ChubbyFIRE", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/ChubbyFIRE/.rss"},
    "reddit_whitecoatinvestor": {"name": "Reddit: r/whitecoatinvestor", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/whitecoatinvestor/.rss"},
    "reddit_uiuc": {"name": "Reddit: r/UIUC", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/UIUC/.rss"},
    "reddit_berkeley": {"name": "Reddit: r/berkeley", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/berkeley/.rss"},
    "reddit_utaustin": {"name": "Reddit: r/UTAustin", "category": "Reddit Communities", "type": "rss", "tier": 1, "url": "https://www.reddit.com/r/UTAustin/.rss"},
    "reddit_harvard": {"name": "Reddit: r/Harvard", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/Harvard/.rss"},
    "reddit_stanford": {"name": "Reddit: r/stanford", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/stanford/.rss"},
    "reddit_usc": {"name": "Reddit: r/USC", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/USC/.rss"},
    "reddit_uva": {"name": "Reddit: r/UVA", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/UVA/.rss"},
    "reddit_unc": {"name": "Reddit: r/UNC", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/UNC/.rss"},
    "reddit_pennstateuniversity": {"name": "Reddit: r/PennStateUniversity", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/PennStateUniversity/.rss"},
    "reddit_northwestern": {"name": "Reddit: r/Northwestern", "category": "Reddit Communities", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Northwestern/.rss"},
    "reddit_princeton": {"name": "Reddit: r/princeton", "category": "Reddit Communities", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/princeton/.rss"},
    "reddit_estateplanning": {"name": "Reddit: r/EstatePlanning", "category": "Reddit Communities", "type": "rss", "tier": 2, "url": "https://www.reddit.com/r/EstatePlanning/.rss"},

    # -- Government & Association Data (17 net; 5 deduped) --
    "ipeds_finance": {"name": "IPEDS Finance Survey", "category": "Government Data", "type": "web_search", "tier": 1, "domain": "nces.ed.gov/ipeds"},
    "open990": {"name": "Open990", "category": "Government Data", "type": "web_search", "tier": 2, "domain": "open990.org"},
    "nsf_herd": {"name": "NSF HERD Survey", "category": "Government Data", "type": "web_search", "tier": 1, "domain": "ncses.nsf.gov/surveys/higher-education-research-development"},
    "nccs_urban": {"name": "NCCS / Urban Institute Data", "category": "Government Data", "type": "web_search", "tier": 2, "domain": "nccs.urban.org"},
    "nacubo_endowment_summary": {"name": "NACUBO-Commonfund Study of Endowments (Public)", "category": "Government Data", "type": "web_search", "tier": 1, "domain": "nacubo.org/research"},
    "agb": {"name": "Association of Governing Boards (AGB)", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "agb.org/knowledge-center"},
    "ace_news": {"name": "American Council on Education (ACE)", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "acenet.edu"},
    "aau_news": {"name": "AAU News", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "aau.edu/news"},
    "aplu_news": {"name": "APLU News", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "aplu.org"},
    "naicu": {"name": "NAICU Newsroom", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "naicu.edu"},
    "sheeo_shef": {"name": "SHEEO State Higher Education Finance (SHEF)", "category": "Government Data", "type": "web_search", "tier": 2, "domain": "shef.sheeo.org"},
    "afp_research": {"name": "AFP Research & Reports", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "afpglobal.org/research"},
    "lilly_philanthropy": {"name": "IU Lilly Family School of Philanthropy", "category": "Government Data", "type": "web_search", "tier": 2, "domain": "philanthropy.indianapolis.iu.edu"},
    "giving_usa": {"name": "Giving USA Annual Report", "category": "Government Data", "type": "web_search", "tier": 1, "domain": "givingusa.org"},
    "fep_reports": {"name": "Fundraising Effectiveness Project", "category": "Government Data", "type": "web_search", "tier": 2, "domain": "fepreports.org"},
    "thecb_tx": {"name": "Texas Higher Education Coordinating Board", "category": "Government Data", "type": "web_search", "tier": 2, "domain": "highered.texas.gov"},
    "schev_va": {"name": "State Council of Higher Education for Virginia", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "research.schev.edu"},
    "ibhe_il": {"name": "Illinois Board of Higher Education", "category": "Government Data", "type": "web_search", "tier": 3, "domain": "ibhe.org"},

    # -- Trade Press & Think Tanks (24 net; cep deduped vs center_effective_philanthropy) --
    "ssir": {"name": "Stanford Social Innovation Review", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 1, "url": "https://ssir.org/site/rss_2.0"},
    "bridgespan": {"name": "The Bridgespan Group - Insights", "category": "Trade Press & Think Tanks", "type": "web_search", "tier": 1, "domain": "bridgespan.org/insights"},
    "philanthropy_roundtable": {"name": "Philanthropy Roundtable", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.philanthropyroundtable.org/feed/"},
    "ncrp": {"name": "National Committee for Responsive Philanthropy", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.ncrp.org/feed"},
    "candid_blog": {"name": "Candid Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 1, "url": "https://blog.candid.org/feed/"},
    "independent_sector": {"name": "Independent Sector", "category": "Trade Press & Think Tanks", "type": "web_search", "tier": 2, "domain": "independentsector.org"},
    "council_on_foundations": {"name": "Council on Foundations", "category": "Trade Press & Think Tanks", "type": "web_search", "tier": 2, "domain": "cof.org/news"},
    "giving_compass": {"name": "Giving Compass", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://givingcompass.org/feed"},
    "nonprofit_pro": {"name": "NonProfit PRO", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 1, "url": "https://www.nonprofitpro.com/feed/"},
    "nonprofit_hub": {"name": "Nonprofit Hub", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://nonprofithub.org/feed/"},
    "blue_avocado": {"name": "Blue Avocado", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://blueavocado.org/feed/"},
    "bloomerang_blog": {"name": "Bloomerang Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 1, "url": "https://bloomerang.co/blog/feed/"},
    "donorperfect_blog": {"name": "DonorPerfect Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.donorperfect.com/nonprofit-expert-blog/feed/"},
    "neon_one_blog": {"name": "Neon One Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://neonone.com/resources/blog/feed/"},
    "classy_blog": {"name": "Classy Blog (GoFundMe)", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.classy.org/blog/feed/"},
    "double_the_donation_blog": {"name": "Double the Donation Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://doublethedonation.com/blog/feed/"},
    "givebutter_blog": {"name": "Givebutter Blog", "category": "Trade Press & Think Tanks", "type": "web_search", "tier": 2, "domain": "givebutter.com/blog"},
    "virtuous_blog": {"name": "Virtuous Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://virtuous.org/blog/feed/"},
    "bonterra_blog": {"name": "Bonterra Blog", "category": "Trade Press & Think Tanks", "type": "web_search", "tier": 2, "domain": "bonterratech.com/blog"},
    "donorbox_blog": {"name": "Donorbox Nonprofit Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://donorbox.org/nonprofit-blog/feed/"},
    "qgiv_blog": {"name": "Qgiv Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.qgiv.com/blog/feed/"},
    "onecause_blog": {"name": "OneCause Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.onecause.com/blog/feed/"},
    "iwave_blog": {"name": "iWave Blog", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 3, "url": "https://www.iwave.com/blog/feed/"},
    "philanthropy_daily": {"name": "Philanthropy Daily", "category": "Trade Press & Think Tanks", "type": "rss", "tier": 2, "url": "https://www.philanthropydaily.com/feed/"},

    # -- Alumni Engagement Platforms & Community (15) --
    "hivebrite_blog": {"name": "Hivebrite Blog", "category": "Alumni Engagement", "type": "web_search", "tier": 1, "domain": "hivebrite.io/blog"},
    "threesixty_alumni_blog": {"name": "360Alumni Blog", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://360alumni.com/blog/feed/"},
    "peoplegrove_blog": {"name": "PeopleGrove Blog", "category": "Alumni Engagement", "type": "web_search", "tier": 1, "domain": "peoplegrove.com/blog"},
    "mentor_collective_blog": {"name": "Mentor Collective Blog", "category": "Alumni Engagement", "type": "web_search", "tier": 2, "domain": "mentorcollective.org/blog"},
    "thankview_blog": {"name": "ThankView Blog", "category": "Alumni Engagement", "type": "web_search", "tier": 2, "domain": "thankview.com/blog"},
    "givingtuesday_data": {"name": "GivingTuesday Data Commons", "category": "Alumni Engagement", "type": "web_search", "tier": 1, "domain": "givingtuesday.org/data-commons"},
    "mightycause_blog": {"name": "Mightycause Blog", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://www.mightycause.com/blog/feed/"},
    "higher_ed_live": {"name": "Higher Ed Live Podcast", "category": "Alumni Engagement", "type": "rss", "tier": 1, "url": "https://higheredlive.com/feed/podcast/"},
    "what_the_fundraising": {"name": "What the Fundraising (Mallory Erickson)", "category": "Alumni Engagement", "type": "rss", "tier": 1, "url": "https://feeds.buzzsprout.com/1811249.rss"},
    "fundraising_hayday": {"name": "Fundraising HayDay", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://feed.podbean.com/fundraisinghayday/feed.xml"},
    "your_path_nonprofit_leadership": {"name": "Your Path to Nonprofit Leadership", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://feeds.buzzsprout.com/711042.rss"},
    "nonprofit_lowdown": {"name": "Nonprofit Lowdown (Rhea Wong)", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://anchor.fm/s/508cc1a0/podcast/rss"},
    "amy_eisenstein_blog": {"name": "Amy Eisenstein Blog", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://amyeisenstein.com/feed/"},
    "joan_garry_blog": {"name": "Joan Garry Nonprofit Leadership Blog", "category": "Alumni Engagement", "type": "rss", "tier": 2, "url": "https://blog.joangarry.com/feed/"},
    "kivi_nonprofit_marketing_guide": {"name": "Kivi's Nonprofit Communications Blog", "category": "Alumni Engagement", "type": "rss", "tier": 1, "url": "https://www.nonprofitmarketingguide.com/feed/"},
}

# ================================================================
# CONNECTOR ENGINE — Generic handlers for each connector type
# ================================================================

async def fetch_with_retry(client: httpx.AsyncClient, url: str, params: dict = None, headers: dict = None, max_retries: int = 3) -> httpx.Response:
    headers = {**DEFAULT_HEADERS, **(headers or {})}
    for attempt in range(max_retries + 1):
        try:
            # follow_redirects=True — many RSS feeds (Chronicle of Philanthropy,
            # Google News site-filter, several WordPress sites) respond with
            # 301/302 to the canonical feed URL. Without this, we'd persist the
            # redirect body (empty HTML) and feedparser would get 0 entries.
            resp = await client.get(url, params=params, headers=headers, timeout=TIMEOUT, follow_redirects=True)
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

            # --- arXiv API connector (returns Atom XML, not JSON) ---
            if src_type == "rest" and "arxiv.org" in src.get("base_url", ""):
                cat_prefix = source_id.replace("arxiv_", "").replace("_", ".") if source_id.startswith("arxiv_") else ""
                search_q = f"cat:{cat_prefix} AND all:{q}" if cat_prefix else f"all:{q}"
                params = {"search_query": search_q, "sortBy": "relevance", "sortOrder": "descending", "max_results": str(min(limit, 20))}
                resp = await fetch_with_retry(client, "https://export.arxiv.org/api/query", params=params)
                if resp.status_code != 200:
                    return {"source": src["name"], "category": src["category"], "credibilityTier": 1, "items": [], "total": 0, "error": f"HTTP {resp.status_code}"}
                feed = feedparser.parse(resp.text)
                items = []
                for entry in feed.entries[:limit]:
                    items.append({
                        "title": entry.get("title", "").replace("\n", " "),
                        "content": (entry.get("summary", ""))[:500].replace("\n", " "),
                        "url": entry.get("link", ""),
                        "date": entry.get("published", ""),
                    })
                return {"source": src["name"], "category": src["category"], "credibilityTier": 1, "items": items, "total": len(items)}

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
                            "url": (lambda u: ("https://www.reddit.com" + u) if u and u.startswith("/r/") else to_str(u))(to_str(item.get("url") or item.get("doi") or item.get("link") or item.get("URL") or item.get("permalink") or item.get("profileUrl") or (f"https://projects.propublica.org/nonprofits/organizations/{item.get('ein')}" if item.get("ein") else ""))),
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
                # Derive the portal base URL from the API URL (e.g., catalog.data.gov from catalog.data.gov/api/...)
                api_base = src["base_url"]  # e.g., https://catalog.data.gov/api/3/action/package_search
                portal_base = api_base.split("/api/")[0] if "/api/" in api_base else api_base
                items = []
                for r in results[:limit]:
                    # Prefer the CKAN package's own url/resources, fall back to constructed URL
                    pkg_url = r.get("url") or f"{portal_base}/dataset/{r.get('name', r.get('id', ''))}"
                    items.append({"title": r.get("title", ""), "content": (r.get("notes") or "")[:500], "url": pkg_url, "date": r.get("metadata_modified", "")})
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

            # --- Web Search connector (site-scoped Jina search for web-only sources) ---
            elif src_type == "web_search":
                site_domain = src.get("domain", "")
                search_query = f"site:{site_domain} {q}" if site_domain else q
                endpoint = f"https://s.jina.ai/{search_query}"
                try:
                    resp = await fetch_with_retry(client, endpoint, headers={"Accept": "application/json", "X-With-Links": "true"})
                    data = resp.json() if resp.status_code == 200 else {}
                    results = data.get("data") or data.get("results") or (data if isinstance(data, list) else [])
                    items = [{"title": to_str(r.get("title", "")), "content": to_str(r.get("content") or r.get("description") or "", "")[:1000], "url": r.get("url", ""), "date": ""} for r in (results[:limit] if isinstance(results, list) else [results]) if isinstance(r, dict)]
                except Exception as e:
                    items = []
                    logger.warning(f"Web search for {src['name']} failed: {e}")
                return {"source": src["name"], "category": src.get("category", "Web"), "credibilityTier": src.get("tier", 3), "items": items, "total": len(items)}

            else:
                return {"source": src["name"], "items": [], "total": 0, "error": f"Unknown connector type: {src_type}"}

    except Exception as e:
        logger.error(f"Error searching {source_id}: {e}")
        return {"source": src.get("name", source_id), "items": [], "total": 0, "error": str(e)}


# --- BULK SEARCH: Query multiple sources in parallel ---

@app.get("/api/multi-search")
async def multi_search(q: str = Query(...), sources: str = Query(...), limit: int = Query(10)):
    """Search multiple sources with controlled concurrency to avoid rate limits."""
    source_ids = [s.strip() for s in sources.split(",") if s.strip() in SOURCES]
    if not source_ids:
        return {"results": [], "error": "No valid source IDs provided"}

    import asyncio
    # Limit concurrent requests to avoid hammering APIs with rate limits
    semaphore = asyncio.Semaphore(8)

    async def search_one(sid):
        async with semaphore:
            try:
                return await search_source(sid, q=q, limit=limit)
            except Exception as e:
                return {"source": SOURCES.get(sid, {}).get("name", sid), "items": [], "total": 0, "error": str(e)}

    results = await asyncio.gather(*[search_one(sid) for sid in source_ids])
    return {"query": q, "sources_queried": len(source_ids), "results": results}


# ================================================================
# PDF EXTRACTION ENDPOINT — Download and parse actual PDFs
# ================================================================

@app.get("/api/extract-pdf")
async def extract_pdf_endpoint(url: str = Query(...), max_pages: int = Query(30)):
    return await _extract_pdf_impl(url, max_pages)

async def _extract_pdf_impl(url: str, max_pages: int = 30):
    """Download a PDF from URL, extract text content. Returns structured text."""
    import io
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # Follow DOI redirects to actual PDF
            resp = await client.get(url, headers={**DEFAULT_HEADERS, "Accept": "application/pdf,*/*"}, timeout=45.0)

            content_type = resp.headers.get("content-type", "")
            raw = bytes(resp.content)  # Ensure we have bytes
            is_pdf = "pdf" in content_type or url.endswith(".pdf") or (len(raw) > 5 and raw[0:5] == b"%PDF-")
            logger.info(f"PDF check: url={url[:60]}, content_type={content_type}, size={len(raw)}, is_pdf={is_pdf}")

            if not is_pdf:
                # Try to find PDF link on the landing page
                html = resp.text[:5000]
                import re
                pdf_links = re.findall(r'href=["\']([^"\']*\.pdf[^"\']*)["\']', html, re.IGNORECASE)
                if pdf_links:
                    pdf_url = pdf_links[0]
                    if not pdf_url.startswith("http"):
                        from urllib.parse import urljoin
                        pdf_url = urljoin(url, pdf_url)
                    resp = await client.get(pdf_url, headers=DEFAULT_HEADERS, timeout=45.0)
                    raw = bytes(resp.content)
                    is_pdf = len(raw) > 5 and raw[0:5] == b"%PDF-"

            if not is_pdf:
                return {"url": url, "extracted": False, "error": "Not a PDF or PDF not freely accessible", "text": ""}

            # Parse PDF with PyPDF2
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(io.BytesIO(raw))
                num_pages = len(reader.pages)
                pages = []
                for i in range(min(num_pages, max_pages)):
                    text = reader.pages[i].extract_text()
                    if text and text.strip():
                        pages.append(f"[Page {i+1}]\n{text.strip()}")

                full_text = "\n\n".join(pages)
                return {
                    "url": url,
                    "extracted": True,
                    "pages": len(pages),
                    "totalPages": len(reader.pages),
                    "characters": len(full_text),
                    "text": full_text[:50000],  # Cap at 50KB
                }
            except ImportError:
                return {"url": url, "extracted": False, "error": "PyPDF2 not installed", "text": ""}

    except Exception as e:
        logger.error(f"PDF extraction failed for {url}: {e}")
        return {"url": url, "extracted": False, "error": str(e)[:200], "text": ""}


# ================================================================
# UPLOADED-FILE PARSING — provider-agnostic text extraction from
# client-uploaded documents (PDF / DOCX / XLSX / PPTX / text). Called
# once per file after browser upload so the parsed body is available
# to every downstream surface: Claude/OpenAI/Gemini chat, slide
# generation, wiki archive, and corpus ingestion.
#
# Why a separate endpoint: /api/extract-pdf takes a URL only (reaches
# out to a remote server). Uploaded files arrive as base64 bytes in
# the browser — no URL to fetch. This endpoint accepts the raw bytes
# directly and routes to the same parser family.
# ================================================================

# Pydantic BaseModel is imported later at the wiki-endpoints section; we
# need it at module scope here so the model class can be defined before
# the later import executes. Redundant import is a no-op in Python.
from pydantic import BaseModel as _BaseModel_parse
class ParseUploadRequest(_BaseModel_parse):
    filename: str
    base64: str
    mimeType: Optional[str] = ""

def _parse_pdf_bytes(raw: bytes, max_pages: int = 80) -> dict:
    """Extract text from PDF bytes using PyPDF2. Returns {text, pages, totalPages, method}."""
    try:
        from PyPDF2 import PdfReader
        import io as _io
        reader = PdfReader(_io.BytesIO(raw))
        total = len(reader.pages)
        chunks = []
        for i in range(min(total, max_pages)):
            try:
                t = reader.pages[i].extract_text() or ""
                if t.strip():
                    chunks.append(f"[Page {i+1}]\n{t.strip()}")
            except Exception:
                # Occasional malformed pages — skip without failing the whole parse
                continue
        text = "\n\n".join(chunks)
        return {"text": text[:120_000], "pages": len(chunks), "totalPages": total, "method": "pypdf"}
    except ImportError:
        return {"text": "", "error": "PyPDF2 not installed", "method": "pypdf"}
    except Exception as e:
        return {"text": "", "error": str(e)[:200], "method": "pypdf"}

def _parse_office_bytes(raw: bytes) -> dict:
    """Text-stream extraction from DOCX/XLSX/PPTX bytes. These are zipped XML —
    a regex pass over printable ASCII captures most document text when pypdf
    doesn't apply. Mirrors the approach already working in geminiService.ts."""
    try:
        # Decode as latin-1 (byte-preserving) and strip non-printables
        import re as _re
        text = raw.decode("latin-1", errors="ignore")
        # Collapse binary noise, strip XML tags, clean whitespace
        text = _re.sub(r"[^\x20-\x7E\n\r\t]+", " ", text)
        text = _re.sub(r"<[^>]+>", " ", text)
        text = _re.sub(r"\s{2,}", " ", text).strip()
        # Keep only sequences that look like real words
        blocks = _re.findall(r"[A-Za-z][A-Za-z0-9\s,.;:!?'\-]{40,}", text)
        body = " ".join(blocks)[:120_000]
        words = [w for w in body.split() if len(w) > 3]
        return {"text": body if len(words) > 30 else "", "method": "office-regex"}
    except Exception as e:
        return {"text": "", "error": str(e)[:200], "method": "office-regex"}

@app.post("/api/parse-upload")
async def parse_upload(req: ParseUploadRequest):
    """Parse an uploaded file (provided as base64) to plain text.
    Routes by extension/MIME:
      .pdf                         → PyPDF2
      .txt/.md/.csv/.json/.xml     → direct UTF-8 / latin-1 decode
      .docx/.xlsx/.pptx/.doc/.xls  → office regex text extraction
      other                        → returns empty text + 'unsupported'
    Never raises — always returns a result dict so the frontend can
    attach the outcome to FileType without exception handling."""
    import base64 as _b64
    fn = (req.filename or "").strip()
    mime = (req.mimeType or "").lower()
    ext = fn.rsplit(".", 1)[-1].lower() if "." in fn else ""

    if not req.base64:
        return {"filename": fn, "text": "", "error": "no base64 payload", "method": "none"}

    try:
        raw = _b64.b64decode(req.base64, validate=False)
    except Exception as e:
        return {"filename": fn, "text": "", "error": f"base64 decode failed: {e}", "method": "none"}

    if not raw:
        return {"filename": fn, "text": "", "error": "empty payload", "method": "none"}

    # 1. PDF (by extension, MIME, or magic bytes)
    is_pdf = ext == "pdf" or "pdf" in mime or (len(raw) >= 5 and raw[:5] == b"%PDF-")
    if is_pdf:
        out = _parse_pdf_bytes(raw)
        logger.info(f"[parse-upload] PDF {fn} → {len(out.get('text') or '')} chars ({out.get('pages', 0)} pages)")
        return {"filename": fn, **out, "bytes": len(raw)}

    # 2. Plain text / json / csv / markdown / xml
    text_exts = {"txt", "md", "markdown", "csv", "json", "xml", "log", "tsv", "yaml", "yml"}
    is_text_mime = mime.startswith("text/") or mime in {"application/json", "application/xml", "text/csv"}
    if ext in text_exts or is_text_mime:
        try:
            decoded = raw.decode("utf-8")
        except UnicodeDecodeError:
            decoded = raw.decode("latin-1", errors="replace")
        logger.info(f"[parse-upload] TEXT {fn} → {len(decoded)} chars")
        return {"filename": fn, "text": decoded[:200_000], "method": "decode", "bytes": len(raw)}

    # 3. Office documents (DOCX/XLSX/PPTX/DOC/XLS/PPT)
    office_exts = {"docx", "xlsx", "pptx", "doc", "xls", "ppt", "odt", "ods", "odp"}
    is_office_mime = "officedocument" in mime or "ms-excel" in mime or "msword" in mime or "powerpoint" in mime
    if ext in office_exts or is_office_mime:
        out = _parse_office_bytes(raw)
        logger.info(f"[parse-upload] OFFICE {fn} → {len(out.get('text') or '')} chars")
        return {"filename": fn, **out, "bytes": len(raw)}

    # 4. Fallback — best-effort regex on raw bytes
    out = _parse_office_bytes(raw)
    if out.get("text"):
        logger.info(f"[parse-upload] FALLBACK {fn} (ext={ext}, mime={mime}) → {len(out['text'])} chars")
        return {"filename": fn, **out, "bytes": len(raw), "method": "fallback-regex"}
    return {"filename": fn, "text": "", "error": f"unsupported format (ext={ext}, mime={mime})", "method": "unsupported", "bytes": len(raw)}


@app.get("/api/extract-content")
async def extract_content(url: str = Query(...)):
    """Smart content extraction:
    1. YouTube URLs → yt-dlp download + OpenAI whisper-1 transcription (S5)
    2. Everything else → PDF-first (PyPDF2), Jina Reader fallback
    """
    # Branch 1: YouTube URL → transcription path.
    # Reuses the same helpers the /api/transcribe-youtube endpoint uses so the
    # corpus-enrichment pipeline gets video transcripts as first-class documents
    # without any caller change.
    if _is_youtube_url(url):
        work_dir = tempfile.mkdtemp(prefix="yt_xscribe_content_")
        try:
            logger.info(f"[extract-content] routing YouTube URL to whisper: {url[:70]}")
            audio_path, metadata = _ytdlp_download_audio(url, work_dir)
            result = _whisper_transcribe_with_chunking(audio_path)
            transcript = result["text"]
            return {
                "url": url,
                "method": "youtube_whisper",
                "title": metadata["title"] or f"YouTube video {metadata['video_id']}",
                "content": transcript,
                "characters": len(transcript),
                "duration_s": metadata["duration_s"],
                "video_id": metadata["video_id"],
                "channel_id": metadata["channel_id"],
                "uploader": metadata["uploader"],
                "chunks_total": result["chunks_total"],
                "chunks_succeeded": result["chunks_succeeded"],
            }
        except Exception as e:
            logger.warning(f"[extract-content] YouTube transcription failed for {url[:50]}: {e}; returning error")
            return {
                "url": url, "method": "youtube_failed",
                "title": "", "content": "", "characters": 0,
                "error": f"YouTube transcription failed: {str(e)[:200]}",
            }
        finally:
            try:
                shutil.rmtree(work_dir, ignore_errors=True)
            except Exception:
                pass

    # Branch 2: PDF-first (existing behavior, unchanged).
    pdf_result = await _extract_pdf_impl(url)
    if pdf_result.get("extracted") and pdf_result.get("text"):
        return {
            "url": url, "method": "pdf", "title": f"PDF from {url[:60]}",
            "content": pdf_result["text"],
            "pages": pdf_result.get("pages", 0),
            "characters": pdf_result.get("characters", 0),
        }

    # Fall back to Jina Reader for web pages
    try:
        async with httpx.AsyncClient() as client:
            # Try JSON mode first
            resp = await fetch_with_retry(client, f"https://r.jina.ai/{url}",
                headers={"Accept": "application/json", "X-With-Links": "true", "X-Return-Format": "text"})

            content = ""
            title = url[:60]

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    # Jina wraps response in data.content or just content
                    if isinstance(data, dict):
                        content = data.get("data", {}).get("content") or data.get("content") or data.get("text") or ""
                        title = data.get("data", {}).get("title") or data.get("title") or title
                except Exception:
                    # If JSON parse fails, the response is likely plain text/markdown
                    content = resp.text

                # If JSON gave nothing, try plain text mode
                if not content or len(content) < 50:
                    resp2 = await fetch_with_retry(client, f"https://r.jina.ai/{url}",
                        headers={"Accept": "text/plain"})
                    if resp2.status_code == 200 and len(resp2.text) > len(content):
                        content = resp2.text

            logger.info(f"Jina Reader: url={url[:50]}, chars={len(content)}")
            return {
                "url": url, "method": "jina", "title": title,
                "content": content[:10000],
                "characters": len(content),
            }
    except Exception as e:
        logger.warning(f"Jina Reader failed for {url[:50]}: {e}")
        return {"url": url, "method": "failed", "title": "", "content": "", "error": str(e)[:200]}


# ================================================================
# YouTube Transcription — S5
# yt-dlp downloads audio-only → ffmpeg chunks if >24 MB →
# OpenAI whisper-1 transcribes each → stitched into unified transcript.
# Feeds the research corpus as first-class documents via /api/extract-content.
# ================================================================
import subprocess
import tempfile
import shutil
from urllib.parse import urlparse
from fastapi import Request as _S5Request  # aliased so later `from fastapi import Request` stays cosmetic

# OpenAI Whisper API rejects uploads >25 MB. Staying 1 MB under = safety margin.
YOUTUBE_WHISPER_SIZE_LIMIT_MB = 24
# 10-min chunks at 128 kbps MP3 ≈ 9.6 MB per chunk — comfortably under cap.
YOUTUBE_CHUNK_DURATION_SECONDS = 600


def _is_youtube_video_url(url: str) -> bool:
    """True ONLY for video-playable URLs (/watch, /shorts/, /embed/, youtu.be/).
    Deliberately excludes RSS feed URLs (/feeds/videos.xml?channel_id=...)
    and channel browsing URLs (/channel/UC..., /@handle, /user/name) — those
    are polling / browse targets for the S8 scheduler, not transcription
    targets. Without this gate, a Tier 0 manifest URL for an institution's
    YouTube channel RSS would get routed to /api/transcribe-youtube and fail
    via yt-dlp because there's no single video to download."""
    if not url or not isinstance(url, str):
        return False
    try:
        p = urlparse(url)
        host = (p.netloc or "").lower()
        path = (p.path or "").lower()
        if host == "youtu.be":
            # https://youtu.be/<VIDEO_ID>  — the path itself is the video id
            return bool(path.strip("/"))
        if host.endswith("youtube.com"):
            # Only video-playable paths. Anything else (feeds, channels, handles,
            # playlists-as-pages) is NOT a transcription target.
            return (
                path.startswith("/watch")
                or path.startswith("/shorts/")
                or path.startswith("/embed/")
                or path.startswith("/v/")
            )
        return False
    except Exception:
        return False


# Backward-compat alias: earlier code (S5) used _is_youtube_url. Keep the
# name reachable so any other caller continues to compile, but route through
# the tightened implementation above.
_is_youtube_url = _is_youtube_video_url


def _ytdlp_download_audio(url: str, dest_dir: str) -> tuple:
    """Download audio-only to dest_dir via yt-dlp; re-encode to 128 kbps MP3.
    Returns (audio_file_path, metadata_dict). Raises on failure.
    yt_dlp is imported lazily so the rest of the proxy works even if the
    package install failed (graceful degradation)."""
    import yt_dlp  # noqa: local import

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(dest_dir, "audio.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "128",
        }],
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    mp3_files = [f for f in os.listdir(dest_dir) if f.lower().endswith(".mp3")]
    if not mp3_files:
        raise RuntimeError("yt-dlp produced no mp3 output")

    audio_path = os.path.join(dest_dir, mp3_files[0])
    metadata = {
        "title": info.get("title") or "",
        "duration_s": info.get("duration") or 0,
        "uploader": info.get("uploader") or "",
        "channel_id": info.get("channel_id") or "",
        "published": info.get("upload_date") or "",
        "video_id": info.get("id") or "",
        "url": info.get("webpage_url") or url,
    }
    return audio_path, metadata


def _ffmpeg_chunk_audio(audio_path: str, chunk_dir: str) -> list:
    """ffmpeg segment-split with stream-copy (no re-encode, near-instant).
    Returns sorted list of chunk file paths. Raises on failure."""
    chunk_pattern = os.path.join(chunk_dir, "chunk_%03d.mp3")
    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-f", "segment",
        "-segment_time", str(YOUTUBE_CHUNK_DURATION_SECONDS),
        "-c", "copy",
        "-reset_timestamps", "1",
        chunk_pattern,
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=180)
    if result.returncode != 0:
        err = (result.stderr or b"").decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"ffmpeg chunking rc={result.returncode}: {err[:200]}")

    chunks = sorted(
        os.path.join(chunk_dir, f)
        for f in os.listdir(chunk_dir)
        if f.startswith("chunk_") and f.lower().endswith(".mp3")
    )
    if not chunks:
        raise RuntimeError("ffmpeg produced no chunks")
    return chunks


def _whisper_transcribe_file(audio_path: str) -> dict:
    """Single-shot whisper-1 call. Returns {'text', 'segments'[{start,end,text}]}.
    Imports OpenAI lazily for graceful degradation if the SDK isn't installed."""
    from openai import OpenAI  # noqa: local import

    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not configured")
    client = OpenAI(api_key=key)
    with open(audio_path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    segments = []
    for seg in (resp.segments or []):
        segments.append({"start": seg.start, "end": seg.end, "text": seg.text})
    return {"text": resp.text or "", "segments": segments}


def _whisper_transcribe_with_chunking(audio_path: str) -> dict:
    """Main dispatcher: ≤24 MB single-shot, else chunk + stitch.
    Always returns {'text', 'segments', 'chunks_total', 'chunks_succeeded'}.
    Partial failures are logged — one bad chunk doesn't abort the whole job."""
    size_mb = os.path.getsize(audio_path) / (1024 * 1024)
    logger.info(f"[YT-xscribe] audio {size_mb:.2f} MB (cap {YOUTUBE_WHISPER_SIZE_LIMIT_MB} MB)")

    if size_mb <= YOUTUBE_WHISPER_SIZE_LIMIT_MB:
        out = _whisper_transcribe_file(audio_path)
        out["chunks_total"] = 1
        out["chunks_succeeded"] = 1
        return out

    chunk_dir = tempfile.mkdtemp(prefix="whisper_chunks_")
    try:
        chunks = _ffmpeg_chunk_audio(audio_path, chunk_dir)
        logger.info(f"[YT-xscribe] split into {len(chunks)} chunks")

        combined_text = []
        combined_segments = []
        succeeded = 0
        for i, chunk_path in enumerate(chunks):
            offset_s = i * YOUTUBE_CHUNK_DURATION_SECONDS
            try:
                r = _whisper_transcribe_file(chunk_path)
                combined_text.append(r["text"])
                for seg in r["segments"]:
                    combined_segments.append({
                        "start": seg["start"] + offset_s,
                        "end": seg["end"] + offset_s,
                        "text": seg["text"],
                    })
                succeeded += 1
                logger.info(f"[YT-xscribe] chunk {i+1}/{len(chunks)} OK")
            except Exception as e:
                logger.error(f"[YT-xscribe] chunk {i+1}/{len(chunks)} failed: {e}")
                combined_text.append(f"[chunk {i+1} transcription failed]")

        if succeeded == 0:
            raise RuntimeError(f"All {len(chunks)} chunks failed")

        return {
            "text": " ".join(combined_text).strip(),
            "segments": combined_segments,
            "chunks_total": len(chunks),
            "chunks_succeeded": succeeded,
        }
    finally:
        try:
            shutil.rmtree(chunk_dir, ignore_errors=True)
        except Exception:
            pass


@app.post("/api/transcribe-youtube")
async def transcribe_youtube_endpoint(request: _S5Request):
    """Transcribe a YouTube video via OpenAI whisper-1 with automatic chunking.

    Body: { "url": "https://youtu.be/..." }
    Returns: {
      "url", "method": "youtube_whisper",
      "title", "duration_s", "video_id", "channel_id", "uploader", "published",
      "content" (full transcript), "segments" [{start,end,text}],
      "chunks_total", "chunks_succeeded", "characters"
    }
    """
    try:
        body = await request.json()
        url = (body or {}).get("url", "").strip()
    except Exception:
        return JSONResponse({"error": "invalid JSON body"}, status_code=400)

    if not url:
        return JSONResponse({"error": "url required"}, status_code=400)
    if not _is_youtube_url(url):
        return JSONResponse({"error": f"not a YouTube URL: {url[:80]}"}, status_code=400)

    work_dir = tempfile.mkdtemp(prefix="yt_xscribe_")
    try:
        logger.info(f"[YT-xscribe] download {url[:70]}")
        audio_path, metadata = _ytdlp_download_audio(url, work_dir)
        logger.info(f"[YT-xscribe] downloaded '{metadata['title'][:50]}' "
                    f"({metadata['duration_s']}s)")

        result = _whisper_transcribe_with_chunking(audio_path)
        transcript = result["text"]

        # Phase 1.3 — persist transcript to wiki archive. Non-blocking:
        # wiki failure doesn't break the transcription response.
        wiki_path_out: Optional[str] = None
        if transcript and len(transcript) >= 200:
            try:
                req_obj = WikiArticleWriteRequest(
                    url=url,
                    content=transcript,
                    source=metadata.get("uploader") or "YouTube",
                    title=metadata.get("title"),
                    date=metadata.get("published"),
                    tier=2,
                    method="whisper",
                    kind="transcript",
                    channel=metadata.get("uploader") or metadata.get("channel_id"),
                    duration_sec=int(metadata.get("duration_s") or 0) or None,
                )
                write_resp = await wiki_write_article(req_obj)
                if isinstance(write_resp, dict) and write_resp.get("wikiPath"):
                    wiki_path_out = write_resp["wikiPath"]
            except Exception as wiki_err:
                logger.warning(f"[YT-xscribe] wiki write failed for {url[:60]}: {wiki_err}")

        return {
            "url": url,
            "method": "youtube_whisper",
            "title": metadata["title"],
            "duration_s": metadata["duration_s"],
            "video_id": metadata["video_id"],
            "channel_id": metadata["channel_id"],
            "uploader": metadata["uploader"],
            "published": metadata["published"],
            "content": transcript,
            "segments": result["segments"],
            "chunks_total": result["chunks_total"],
            "chunks_succeeded": result["chunks_succeeded"],
            "characters": len(transcript),
            "wikiPath": wiki_path_out,
        }
    except Exception as e:
        logger.error(f"[YT-xscribe] failed for {url[:60]}: {e}")
        return JSONResponse(
            {"error": f"transcription failed: {str(e)[:300]}", "url": url},
            status_code=500,
        )
    finally:
        try:
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass


# ================================================================
# S8: YOUTUBE CHANNEL SCHEDULER — polls 100 higher-ed advancement channel
# RSS feeds, detects new uploads since last run, gates them by fundraising
# keywords, and (optionally) auto-transcribes relevant videos via the S5
# Whisper pipeline.
#
# Design choice: on-demand-triggered endpoint, not a running cron thread.
# The user or external cron invokes POST /api/scheduler/poll-youtube-channels
# whenever they want a fresh pass. This keeps state persistence simple and
# avoids orphan threads across container restarts.
# ================================================================
import feedparser as _feedparser_s8  # alias so we don't shadow the existing feedparser import
from datetime import datetime, timezone

SCHEDULER_STATE_PATH = "/hic-workspace/scheduler-state.json"
YOUTUBE_CHANNELS_PATH = "/hic-workspace/youtube-channels.json"
INSTITUTION_MANIFEST_PATH = "/hic-workspace/institution-manifest.json"

# Default keyword set that flags a new video as "fundraising-relevant" —
# callers can override via request body. Conservative list designed to gate
# whisper spend; NOT a general-purpose relevance filter.
DEFAULT_FUNDRAISING_KEYWORDS = [
    "gift", "campaign", "donor", "endowment", "commitment", "pledge",
    "giving day", "scholarship", "bequest", "challenge", "raised",
    "philanthropy", "advancement", "alumni", "fundraising", "matching",
    "milestone", "anniversary", "planned giving",
]


def _load_scheduler_state() -> dict:
    """Read scheduler-state.json or return an empty stub. Never raises —
    a missing or malformed state file is treated as 'first run'."""
    try:
        if os.path.exists(SCHEDULER_STATE_PATH):
            with open(SCHEDULER_STATE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"[scheduler] state load failed ({e}); treating as first run")
    return {"version": 1, "last_poll_at": None, "channels": {}}


def _save_scheduler_state(state: dict) -> None:
    """Atomic-ish write: serialize to temp file, then rename. Prevents
    partial-write corruption if the container dies mid-save."""
    state["last_poll_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        tmp = SCHEDULER_STATE_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp, SCHEDULER_STATE_PATH)
    except Exception as e:
        logger.error(f"[scheduler] state save failed: {e}")


def _load_youtube_channels() -> list:
    """Read the 100-channel manifest produced by S0. Returns the channel
    list; empty list if missing."""
    try:
        with open(YOUTUBE_CHANNELS_PATH, "r", encoding="utf-8") as f:
            doc = json.load(f)
            return [c for c in doc.get("channels", []) if c.get("channel_id")]
    except Exception as e:
        logger.warning(f"[scheduler] youtube-channels.json not readable: {e}")
        return []


async def _poll_single_channel(client, channel: dict, last_seen_iso: str, cached_etag: str) -> dict:
    """Poll one channel's RSS feed. Returns a dict with the channel's UC-ID,
    new videos since last_seen_iso, updated etag, and any error.

    Tries the primary feed URL first, falls back to playlist_id endpoint on
    404/5xx (per the S4 RSS-strategy guidance we documented)."""
    uc = channel["channel_id"]
    primary = channel.get("rss_feed_primary") or f"https://www.youtube.com/feeds/videos.xml?channel_id={uc}"
    fallback = channel.get("rss_feed_fallback") or f"https://www.youtube.com/feeds/videos.xml?playlist_id=UU{uc[2:]}"

    headers = dict(DEFAULT_HEADERS)
    if cached_etag:
        headers["If-None-Match"] = cached_etag

    # Try primary → fallback
    resp = None
    for url in (primary, fallback):
        try:
            r = await client.get(url, headers=headers, timeout=15.0, follow_redirects=True)
            if r.status_code == 304:
                # Not modified since last poll — no new content
                return {"channel_id": uc, "new_videos": [], "etag": cached_etag, "status": "not_modified"}
            if r.status_code == 200 and len(r.content) > 200:
                resp = r
                break
        except Exception as e:
            logger.debug(f"[scheduler] {uc} {url[:60]} fetch err: {e}")
            continue

    if resp is None:
        return {"channel_id": uc, "new_videos": [], "etag": cached_etag, "status": "fetch_failed"}

    # Parse the Atom feed
    try:
        feed = _feedparser_s8.parse(resp.text)
    except Exception as e:
        return {"channel_id": uc, "new_videos": [], "etag": cached_etag, "status": f"parse_err:{e}"}

    new_videos = []
    last_seen_ts = _parse_iso(last_seen_iso) if last_seen_iso else None
    for entry in feed.entries or []:
        # YouTube Atom feeds expose published + yt:videoId
        published = entry.get("published") or entry.get("updated") or ""
        video_id = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
        if not video_id:
            continue
        ts = _parse_iso(published)
        if last_seen_ts and ts and ts <= last_seen_ts:
            continue  # already seen
        new_videos.append({
            "video_id": video_id,
            "title": entry.get("title", ""),
            "published": published,
            "description": entry.get("summary", "")[:500],
            "url": f"https://www.youtube.com/watch?v={video_id}",
        })

    new_etag = resp.headers.get("etag", cached_etag)
    return {"channel_id": uc, "new_videos": new_videos, "etag": new_etag, "status": "ok"}


def _parse_iso(s: str):
    """Tolerant ISO-8601 parser. Returns aware datetime or None."""
    if not s:
        return None
    try:
        # feedparser sometimes gives "2024-05-01T12:34:56+00:00" — Python 3.11+ handles that.
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _video_matches_keywords(title: str, description: str, keywords: list) -> list:
    """Return the subset of keywords found in title+description (case-insensitive)."""
    text = f"{title} {description}".lower()
    return [kw for kw in keywords if kw.lower() in text]


@app.post("/api/scheduler/poll-youtube-channels")
async def scheduler_poll_youtube_channels(request: _S5Request):
    """Poll all (or a subset of) YouTube channels from the manifest, return
    new uploads since last poll, optionally auto-transcribe keyword matches.

    Body:
      {
        "channel_ids":            ["UC...", "UC..."]      # optional filter
        "institutions":           ["northeastern","harvard"]  # optional; maps to channels
        "keywords":               ["gift","campaign",...]  # optional override
        "auto_transcribe":        false                    # if true, transcribe keyword hits
        "max_transcribe":         3                        # hard cap on whisper spend per poll
        "dry_run":                false                    # if true, don't write state
      }

    Returns:
      {
        "polled": 97, "polled_failed": 3, "skipped_not_modified": 17,
        "new_videos": [{...}], "transcribed": [{video_id, transcript_chars, ...}],
        "state_updated": true, "poll_duration_s": 12.3
      }
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    channel_id_filter = set(body.get("channel_ids") or [])
    institution_filter = set(body.get("institutions") or [])
    keywords = body.get("keywords") or DEFAULT_FUNDRAISING_KEYWORDS
    auto_transcribe = bool(body.get("auto_transcribe", False))
    max_transcribe = int(body.get("max_transcribe", 3))
    dry_run = bool(body.get("dry_run", False))

    all_channels = _load_youtube_channels()
    if not all_channels:
        return JSONResponse({"error": "youtube-channels.json not available in /hic-workspace"}, status_code=500)

    # Apply filters
    target_channels = all_channels
    if channel_id_filter:
        target_channels = [c for c in target_channels if c["channel_id"] in channel_id_filter]
    if institution_filter:
        # Join against manifest: find channels whose institution maps to one of the filter ids
        try:
            with open(INSTITUTION_MANIFEST_PATH, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {"institutions": []}
        inst_uc_ids = set()
        for inst in manifest.get("institutions", []):
            if inst.get("id") in institution_filter:
                for yt in inst.get("sources", {}).get("youtube_channels", []):
                    if yt.get("channel_id"):
                        inst_uc_ids.add(yt["channel_id"])
        target_channels = [c for c in target_channels if c["channel_id"] in inst_uc_ids]

    if not target_channels:
        return {"polled": 0, "new_videos": [], "note": "no channels after filtering"}

    state = _load_scheduler_state()
    chan_state = state.setdefault("channels", {})

    t_start = time.time()
    polled, polled_failed, skipped_not_modified = 0, 0, 0
    all_new_videos = []

    async with httpx.AsyncClient() as client:
        for chan in target_channels:
            uc = chan["channel_id"]
            prev = chan_state.get(uc, {})
            last_seen = prev.get("last_video_published", "")
            cached_etag = prev.get("etag", "")

            result = await _poll_single_channel(client, chan, last_seen, cached_etag)
            status = result["status"]
            if status == "ok":
                polled += 1
                if result["new_videos"]:
                    # Update state to the newest video seen
                    newest = max(result["new_videos"], key=lambda v: v["published"] or "")
                    chan_state[uc] = {
                        "last_video_published": newest["published"],
                        "last_video_id": newest["video_id"],
                        "etag": result["etag"],
                    }
                    # Enrich with institution metadata
                    for v in result["new_videos"]:
                        v["channel_id"] = uc
                        v["institution"] = chan.get("institution", "")
                        v["role"] = chan.get("role", "")
                        v["focus"] = chan.get("focus", "")
                        v["matched_keywords"] = _video_matches_keywords(v["title"], v.get("description", ""), keywords)
                        all_new_videos.append(v)
                else:
                    # No new videos but refresh etag
                    if result["etag"] != cached_etag:
                        chan_state[uc] = {**prev, "etag": result["etag"]}
            elif status == "not_modified":
                skipped_not_modified += 1
                polled += 1
            else:
                polled_failed += 1

    # Auto-transcribe keyword hits
    transcribed = []
    if auto_transcribe and all_new_videos:
        relevant = [v for v in all_new_videos if v["matched_keywords"]]
        relevant = relevant[:max_transcribe]  # cap whisper spend
        for v in relevant:
            try:
                # Reuse the S5 pipeline internally (no HTTP roundtrip back to self)
                work_dir = tempfile.mkdtemp(prefix="yt_xscribe_sched_")
                try:
                    audio_path, metadata = _ytdlp_download_audio(v["url"], work_dir)
                    tx_result = _whisper_transcribe_with_chunking(audio_path)
                    transcript_text = tx_result.get("text", "") or ""
                    # Phase 1.3 — persist transcript to wiki archive so chat +
                    # slide generators + future engagements can recall it.
                    # In-process call to the wiki-write helper (no HTTP loop).
                    wiki_path_out: Optional[str] = None
                    if transcript_text and len(transcript_text) >= 200:
                        try:
                            # Resolve channel metadata for this video (fresh lookup —
                            # we're outside the poll loop that iterated `chan`).
                            src_chan = next((c for c in target_channels if c.get("channel_id") == v.get("channel_id")), None)
                            src_name = (src_chan or {}).get("title") or v.get("institution") or 'YouTube'
                            req_obj = WikiArticleWriteRequest(
                                url=v["url"],
                                content=transcript_text,
                                source=src_name,
                                title=v["title"],
                                date=v.get("published") or None,
                                tier=2,
                                method="whisper",
                                kind="transcript",
                                channel=v.get("institution") or v.get("channel_id"),
                                duration_sec=int(metadata.get("duration_s") or 0) or None,
                            )
                            write_resp = await wiki_write_article(req_obj)
                            if isinstance(write_resp, dict) and write_resp.get("wikiPath"):
                                wiki_path_out = write_resp["wikiPath"]
                        except Exception as wiki_err:
                            logger.warning(f"[scheduler] transcript wiki write failed for {v['video_id']}: {wiki_err}")
                    transcribed.append({
                        "video_id": v["video_id"],
                        "title": v["title"],
                        "duration_s": metadata.get("duration_s", 0),
                        "transcript_chars": len(transcript_text),
                        "chunks": f"{tx_result.get('chunks_succeeded', 0)}/{tx_result.get('chunks_total', 0)}",
                        "matched_keywords": v["matched_keywords"],
                        "wikiPath": wiki_path_out,
                    })
                finally:
                    try:
                        shutil.rmtree(work_dir, ignore_errors=True)
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"[scheduler] transcribe failed for {v['video_id']}: {e}")
                transcribed.append({"video_id": v["video_id"], "error": str(e)[:150]})

    if not dry_run:
        _save_scheduler_state(state)

    return {
        "polled": polled,
        "polled_failed": polled_failed,
        "skipped_not_modified": skipped_not_modified,
        "channels_targeted": len(target_channels),
        "new_videos": all_new_videos,
        "transcribed": transcribed,
        "state_updated": not dry_run,
        "poll_duration_s": round(time.time() - t_start, 2),
    }


# ================================================================
# AI PROVIDER PROXY — Routes AI calls server-side to bypass CORS
# Keys stay on the server, never reach the browser.
# ================================================================

from fastapi import Request

@app.post("/api/ai/anthropic")
async def proxy_anthropic(request: Request):
    """Proxy requests to Anthropic Claude API. Adds API key server-side."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "ANTHROPIC_API_KEY not configured"}, status_code=500)

    try:
        body = await request.json()
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
        # Forward anthropic-beta header if present
        beta = request.headers.get("anthropic-beta")
        if beta:
            headers["anthropic-beta"] = beta

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                json=body,
                headers=headers,
                timeout=300.0,
            )
            if resp.status_code >= 400:
                logger.error(f"Anthropic API {resp.status_code} for model={body.get('model')}: {resp.text[:600]}")
            try:
                return JSONResponse(resp.json(), status_code=resp.status_code)
            except Exception as json_err:
                logger.error(f"Anthropic non-JSON response ({resp.status_code}): {resp.text[:600]} | json_err={json_err!r}")
                return JSONResponse({"error": f"Anthropic returned non-JSON (status {resp.status_code}): {resp.text[:300]}"}, status_code=502)
    except httpx.TimeoutException:
        logger.error("Anthropic proxy timeout")
        return JSONResponse({"error": "Anthropic API timeout (300s)"}, status_code=504)
    except Exception as e:
        logger.error(f"Anthropic proxy error: type={type(e).__name__} repr={e!r}")
        return JSONResponse({"error": f"Anthropic proxy error: {type(e).__name__}: {str(e)[:200] or repr(e)[:200]}"}, status_code=502)


@app.post("/api/ai/gemini")
async def proxy_gemini(request: Request):
    """Proxy requests to Gemini API. Adds API key server-side."""
    api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "GEMINI_API_KEY not configured"}, status_code=500)

    try:
        body = await request.json()
        model = body.get("model", "gemini-2.5-flash")
        contents = body.get("contents", "")
        config = body.get("config", {})

        # Build Gemini API request
        gemini_body = {
            "contents": [{"parts": [{"text": contents}]}] if isinstance(contents, str) else contents,
            "generationConfig": {
                "temperature": config.get("temperature", 0.2),
                "maxOutputTokens": config.get("maxOutputTokens", 8192),
            },
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        content_size = len(json.dumps(gemini_body))
        logger.info(f"Gemini proxy: model={model}, content_size={content_size:,} chars")

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=gemini_body, headers={"Content-Type": "application/json"}, timeout=300.0)
            result = resp.json()
            if resp.status_code != 200:
                logger.warning(f"Gemini API error {resp.status_code}: {json.dumps(result)[:300]}")
            return JSONResponse(result, status_code=resp.status_code)
    except httpx.TimeoutException:
        logger.error("Gemini proxy timeout")
        return JSONResponse({"error": "Gemini API timeout (300s)"}, status_code=504)
    except Exception as e:
        logger.error(f"Gemini proxy error: {e}")
        return JSONResponse({"error": f"Gemini proxy error: {str(e)[:200]}"}, status_code=502)


@app.post("/api/ai/openai")
async def proxy_openai(request: Request):
    """Proxy requests to OpenAI API. Adds API key server-side."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "OPENAI_API_KEY not configured"}, status_code=500)

    try:
        body = await request.json()
        # Determine endpoint: responses API vs chat completions
        endpoint = request.headers.get("x-openai-endpoint", "responses")
        if endpoint == "chat":
            url = "https://api.openai.com/v1/chat/completions"
        else:
            url = "https://api.openai.com/v1/responses"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=body, headers=headers, timeout=300.0)
            if resp.status_code >= 400:
                logger.error(f"OpenAI API {resp.status_code} for model={body.get('model')} endpoint={endpoint}: {resp.text[:600]}")
            return JSONResponse(resp.json(), status_code=resp.status_code)
    except httpx.TimeoutException:
        logger.error("OpenAI proxy timeout")
        return JSONResponse({"error": "OpenAI API timeout (300s)"}, status_code=504)
    except Exception as e:
        logger.error(f"OpenAI proxy error: {e}")
        return JSONResponse({"error": f"OpenAI proxy error: {str(e)[:200]}"}, status_code=502)


@app.get("/api/ai/status")
async def ai_provider_status():
    """Check which AI providers have API keys configured."""
    return {
        "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "gemini": bool(os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")),
    }


# ================================================================
# CX MESH PROXY — Routes calls to Reddit Ripper (5001) to bypass CORS
# ================================================================

REDDIT_RIPPER_URL = os.getenv("REDDIT_RIPPER_URL", "http://reddit-ripper:5000")

@app.post("/api/cx/collect")
async def proxy_cx_collect(request: Request):
    """Proxy collection requests to Reddit Ripper service."""
    try:
        body = await request.json()
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{REDDIT_RIPPER_URL}/api/collect", json=body, timeout=30.0)
            return JSONResponse(resp.json(), status_code=resp.status_code)
    except Exception as e:
        logger.error(f"CX collect proxy failed: {e}")
        return JSONResponse({"error": f"Reddit Ripper unavailable: {str(e)[:100]}", "job_id": None}, status_code=503)

@app.get("/api/cx/status/{job_id}")
async def proxy_cx_status(job_id: str):
    """Proxy job status checks to Reddit Ripper service."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{REDDIT_RIPPER_URL}/api/status/{job_id}", timeout=15.0)
            return JSONResponse(resp.json(), status_code=resp.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)[:100], "status": "error"}, status_code=503)

@app.get("/api/cx/results/{job_id}")
async def proxy_cx_results(job_id: str):
    """Proxy results retrieval from Reddit Ripper service."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{REDDIT_RIPPER_URL}/api/results/{job_id}", timeout=30.0)
            return JSONResponse(resp.json(), status_code=resp.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)[:100]}, status_code=503)

@app.get("/api/cx/download/{job_id}/{filename}")
async def proxy_cx_download(job_id: str, filename: str):
    """Proxy file downloads from Reddit Ripper service."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{REDDIT_RIPPER_URL}/api/download/{job_id}/{filename}", timeout=30.0)
            return JSONResponse(resp.json() if 'json' in resp.headers.get('content-type', '') else {"data": resp.text}, status_code=resp.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)[:100]}, status_code=503)

@app.get("/api/cx/health")
async def cx_health():
    """Check Reddit Ripper health."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{REDDIT_RIPPER_URL}/", timeout=5.0)
            return {"available": resp.status_code == 200, "url": REDDIT_RIPPER_URL}
    except Exception:
        return {"available": False, "url": REDDIT_RIPPER_URL}


# ================================================================
# WIKI WRITE LAYER — P6-01: Enables the self-improvement loop
# The wiki directory is mounted in the container; these endpoints
# allow the frontend to write learnings back to wiki pages.
# ================================================================

# In Docker: wiki is mounted at /hic-workspace/wiki via docker-compose volume
# Locally: fall back to relative path from proxy directory
WIKI_BASE = os.environ.get("WIKI_PATH", "/hic-workspace/wiki")
if not os.path.isdir(WIKI_BASE):
    WIKI_BASE = os.path.join(os.path.dirname(__file__), "..", "hic-workspace", "wiki")

from pydantic import BaseModel

class WikiWriteRequest(BaseModel):
    path: str       # Relative path within wiki/ (e.g., "anti-patterns/personas.md")
    content: str    # Full content to write

class WikiAppendRequest(BaseModel):
    path: str       # Relative path within wiki/
    content: str    # Content to append
    section: str = ""  # Optional: append under this section header

@app.post("/api/wiki/write")
async def wiki_write(req: WikiWriteRequest):
    """Write (overwrite) a wiki page. Used for full page updates."""
    safe_path = os.path.normpath(os.path.join(WIKI_BASE, req.path))
    if not safe_path.startswith(os.path.normpath(WIKI_BASE)):
        return JSONResponse({"error": "Path traversal blocked"}, status_code=400)
    os.makedirs(os.path.dirname(safe_path), exist_ok=True)
    try:
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(req.content)
        logger.info(f"Wiki write: {req.path} ({len(req.content)} chars)")
        return {"status": "ok", "path": req.path, "chars": len(req.content)}
    except Exception as e:
        logger.error(f"Wiki write failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/wiki/append")
async def wiki_append(req: WikiAppendRequest):
    """Append content to an existing wiki page. Creates if not exists."""
    safe_path = os.path.normpath(os.path.join(WIKI_BASE, req.path))
    if not safe_path.startswith(os.path.normpath(WIKI_BASE)):
        return JSONResponse({"error": "Path traversal blocked"}, status_code=400)
    os.makedirs(os.path.dirname(safe_path), exist_ok=True)
    try:
        existing = ""
        if os.path.exists(safe_path):
            with open(safe_path, "r", encoding="utf-8") as f:
                existing = f.read()

        if req.section and req.section in existing:
            # Append under the specified section header
            section_idx = existing.index(req.section) + len(req.section)
            # Find the next section header or end of file
            next_section = existing.find("\n## ", section_idx + 1)
            if next_section == -1:
                next_section = existing.find("\n# ", section_idx + 1)
            insert_at = next_section if next_section != -1 else len(existing)
            updated = existing[:insert_at].rstrip() + "\n" + req.content + "\n" + existing[insert_at:]
        else:
            updated = existing.rstrip() + "\n\n" + req.content + "\n"

        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(updated)
        logger.info(f"Wiki append: {req.path} (+{len(req.content)} chars)")
        return {"status": "ok", "path": req.path, "totalChars": len(updated)}
    except Exception as e:
        logger.error(f"Wiki append failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/wiki/list/{path:path}")
async def wiki_list(path: str):
    """List files in a wiki directory."""
    safe_path = os.path.normpath(os.path.join(WIKI_BASE, path))
    if not safe_path.startswith(os.path.normpath(WIKI_BASE)):
        return JSONResponse({"error": "Path traversal blocked"}, status_code=400)
    if not os.path.isdir(safe_path):
        return JSONResponse({"error": "Not a directory"}, status_code=404)
    files = sorted([f for f in os.listdir(safe_path) if os.path.isfile(os.path.join(safe_path, f))])
    return {"path": path, "files": files}


@app.get("/api/wiki/read/{path:path}")
async def wiki_read(path: str):
    """Read a wiki page. Alternative to the nginx/vite static serving."""
    safe_path = os.path.normpath(os.path.join(WIKI_BASE, path))
    if not safe_path.startswith(os.path.normpath(WIKI_BASE)):
        return JSONResponse({"error": "Path traversal blocked"}, status_code=400)
    if not os.path.exists(safe_path):
        return JSONResponse({"error": "Not found"}, status_code=404)
    with open(safe_path, "r", encoding="utf-8") as f:
        return {"path": path, "content": f.read()}


# ================================================================
# WIKI ARTICLE ARCHIVE — Phase 1.1 (wiki-as-persistent-corpus-memory)
# ================================================================
# Every extracted article, transcript, PDF, or uploaded doc lands here as a
# deterministically-addressed markdown file with YAML frontmatter. Evidence
# nodes in the KG carry the resulting wikiPath so renderers, chat, and
# slide generators can load full content on demand — no more 300-char
# truncated snippets.
#
# Path convention:
#   articles/{source-slug}/{url-hash}.md     — web articles via Jina/PDF
#   transcripts/{channel-slug}/{video-hash}.md — YouTube transcripts
#   uploads/{engagement-slug}/{doc-hash}.md  — user-uploaded documents
#
# URL hash is a short (10 char) blake2b of the canonical URL — stable across
# sessions, allows cross-engagement dedup without storing the full URL in
# the path.

import hashlib
import re as _re_wiki

ARTICLE_MIN_CHARS_FOR_DEDUP = 500  # Skip re-fetch if cached content ≥ this

def _wiki_slug(text: str, max_len: int = 48) -> str:
    """Slug-ify a string for wiki directory names. Lowercase, hyphenated,
    alphanumeric only, capped to max_len."""
    s = _re_wiki.sub(r'[^a-z0-9]+', '-', (text or '').lower()).strip('-')
    return (s[:max_len] or 'unknown').rstrip('-')

def _url_hash(url: str) -> str:
    """Stable short hash of a canonical URL — blake2b 10-char digest.
    Canonicalization: lowercase scheme/host, strip trailing slash, drop
    common tracking params, preserve path + meaningful query."""
    if not url:
        return 'unknown'
    u = url.strip().lower()
    # Strip common tracking params
    for param in ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid']:
        u = _re_wiki.sub(rf'[?&]{param}=[^&]*', '', u)
    u = u.rstrip('/').rstrip('?').rstrip('&')
    return hashlib.blake2b(u.encode('utf-8'), digest_size=5).hexdigest()

class WikiArticleWriteRequest(BaseModel):
    """Schema for writing an extracted article to the wiki archive.
    All fields except url + content are metadata that drives the frontmatter."""
    url: str
    content: str
    source: Optional[str] = None         # Human-readable source name (e.g. "Chronicle of Philanthropy")
    title: Optional[str] = None
    author: Optional[str] = None
    date: Optional[str] = None           # Publication date (any ISO-ish format)
    tier: Optional[int] = None           # Credibility tier 1/2/3
    method: Optional[str] = None         # 'jina' | 'pypdf' | 'whisper' | 'rss' | 'api' | 'upload'
    kind: Optional[str] = 'article'      # 'article' | 'transcript' | 'pdf' | 'upload'
    engagement: Optional[str] = None     # Optional engagement slug for uploads/ namespace
    channel: Optional[str] = None        # For transcripts — channel/institution name
    duration_sec: Optional[int] = None   # For transcripts
    page_count: Optional[int] = None     # For PDFs

def _article_wiki_path(kind: str, source: str, engagement: Optional[str], channel: Optional[str], h: str) -> str:
    """Build the canonical wiki path for an article based on its kind."""
    if kind == 'transcript':
        bucket = _wiki_slug(channel or source or 'unknown-channel')
        return f"transcripts/{bucket}/{h}.md"
    if kind == 'upload':
        bucket = _wiki_slug(engagement or 'misc')
        return f"uploads/{bucket}/{h}.md"
    # Default: article
    bucket = _wiki_slug(source or 'unknown-source')
    return f"articles/{bucket}/{h}.md"

def _build_article_frontmatter(req: WikiArticleWriteRequest, h: str, path_rel: str, chars: int) -> str:
    """Build YAML frontmatter for a wiki article. Kept minimal + stable so
    downstream readers can rely on the shape."""
    def esc(v):
        if v is None:
            return ''
        s = str(v).replace('"', '\\"').replace('\n', ' ')
        return f'"{s}"'
    lines = [
        '---',
        f'url: {esc(req.url)}',
        f'url_hash: {esc(h)}',
        f'kind: {esc(req.kind or "article")}',
        f'source: {esc(req.source or "")}',
        f'title: {esc(req.title or "")}',
        f'author: {esc(req.author or "")}',
        f'date: {esc(req.date or "")}',
        f'tier: {req.tier if req.tier is not None else ""}',
        f'method: {esc(req.method or "")}',
        f'extracted_at: {esc(datetime.now(timezone.utc).isoformat())}',
        f'chars: {chars}',
    ]
    if req.channel:
        lines.append(f'channel: {esc(req.channel)}')
    if req.engagement:
        lines.append(f'engagement: {esc(req.engagement)}')
    if req.duration_sec is not None:
        lines.append(f'duration_sec: {req.duration_sec}')
    if req.page_count is not None:
        lines.append(f'page_count: {req.page_count}')
    lines.append('---')
    return '\n'.join(lines)

@app.post("/api/wiki/write-article")
async def wiki_write_article(req: WikiArticleWriteRequest):
    """Persist an extracted article/transcript/PDF/upload to the wiki archive.
    Returns the canonical wikiPath the caller should attach to evidence nodes.
    Overwrites if the hash already exists (latest extraction wins)."""
    if not req.url or not req.content:
        return JSONResponse({"error": "url + content required"}, status_code=400)
    if len(req.content) < 40:
        return JSONResponse({"error": f"content too short ({len(req.content)} chars); min 40"}, status_code=400)
    h = _url_hash(req.url)
    path_rel = _article_wiki_path(req.kind or 'article', req.source or '', req.engagement, req.channel, h)
    safe_path = os.path.normpath(os.path.join(WIKI_BASE, path_rel))
    if not safe_path.startswith(os.path.normpath(WIKI_BASE)):
        return JSONResponse({"error": "Path traversal blocked"}, status_code=400)
    try:
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        chars = len(req.content)
        frontmatter = _build_article_frontmatter(req, h, path_rel, chars)
        body = f"{frontmatter}\n\n# {req.title or req.source or 'Untitled'}\n\n"
        if req.url:
            body += f"Source: [{req.source or req.url}]({req.url})\n\n"
        body += req.content.strip() + "\n"
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(body)
        logger.info(f"Wiki article write: {path_rel} ({chars} chars, kind={req.kind})")
        return {
            "status": "ok",
            "wikiPath": path_rel,
            "urlHash": h,
            "chars": chars,
            "kind": req.kind or 'article',
        }
    except Exception as e:
        logger.error(f"Wiki article write failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/wiki/read-article/{hash_or_path:path}")
async def wiki_read_article(hash_or_path: str):
    """Read a wiki article. Accepts either a full wikiPath
    (articles/source/hash.md) or just the hash — in which case we search
    known article subdirectories."""
    # Direct path
    if hash_or_path.endswith('.md') or '/' in hash_or_path:
        safe_path = os.path.normpath(os.path.join(WIKI_BASE, hash_or_path))
        if not safe_path.startswith(os.path.normpath(WIKI_BASE)):
            return JSONResponse({"error": "Path traversal blocked"}, status_code=400)
        if not os.path.exists(safe_path):
            return JSONResponse({"error": "Not found", "wikiPath": hash_or_path}, status_code=404)
        with open(safe_path, "r", encoding="utf-8") as f:
            return {"wikiPath": hash_or_path, "content": f.read()}

    # Hash-only lookup: walk articles/, transcripts/, uploads/ for {hash}.md
    h = hash_or_path
    for namespace in ('articles', 'transcripts', 'uploads'):
        ns_root = os.path.join(WIKI_BASE, namespace)
        if not os.path.isdir(ns_root):
            continue
        for bucket in os.listdir(ns_root):
            candidate = os.path.join(ns_root, bucket, f"{h}.md")
            if os.path.exists(candidate):
                rel = os.path.relpath(candidate, WIKI_BASE).replace(os.sep, '/')
                with open(candidate, "r", encoding="utf-8") as f:
                    return {"wikiPath": rel, "content": f.read()}
    return JSONResponse({"error": "Hash not found", "urlHash": h}, status_code=404)

@app.get("/api/wiki/check-article")
async def wiki_check_article(url: str, min_chars: int = ARTICLE_MIN_CHARS_FOR_DEDUP):
    """Dedup check: does the wiki already hold ≥ min_chars of extracted
    content for this URL? Orchestrator calls this before Jina/PDF fetch
    to skip redundant re-extraction across engagements."""
    if not url:
        return JSONResponse({"error": "url required"}, status_code=400)
    h = _url_hash(url)
    # Walk the same three namespaces as read-article
    for namespace in ('articles', 'transcripts', 'uploads'):
        ns_root = os.path.join(WIKI_BASE, namespace)
        if not os.path.isdir(ns_root):
            continue
        for bucket in os.listdir(ns_root):
            candidate = os.path.join(ns_root, bucket, f"{h}.md")
            if os.path.exists(candidate):
                size = os.path.getsize(candidate)
                # Rough char estimate — bytes ≈ chars for markdown
                if size >= min_chars:
                    rel = os.path.relpath(candidate, WIKI_BASE).replace(os.sep, '/')
                    return {
                        "cached": True,
                        "wikiPath": rel,
                        "urlHash": h,
                        "bytes": size,
                    }
                # File exists but too small — treat as not cached so caller re-fetches
                return {"cached": False, "urlHash": h, "reason": "below_min_chars", "bytes": size}
    return {"cached": False, "urlHash": h}


# ================================================================
# WIKI METADATA INDEX + RETRIEVAL  (Phase 1-retrofit 2026-04-20)
# ================================================================
# The wiki archive holds FULL article/transcript/upload bodies — hundreds
# of thousands of characters per engagement. We cannot jam all of it into
# every AI prompt; that's the context-window cliff the earlier design
# tried (and failed) to climb by cramming truncated corpora.
#
# Instead: a lightweight metadata index (title, url, source, date, charCount,
# short summary, wikiPath) gives the model a complete menu of what's
# available. When it needs body text, it calls /api/wiki/fetch-articles with
# ids or a keyword query and gets real bodies back inline. This is the
# classical RAG pattern, implemented against the existing wiki archive
# without any vector store — a simple keyword search over frontmatter +
# summary is sufficient at our scale (≤20k articles per engagement).

import json as _json_wiki_index
from time import time as _now_wiki_index
from typing import List as _List_wiki_index  # List not in module-level typing import

_WIKI_INDEX_CACHE: dict = {"built_at": 0.0, "entries": [], "mtime_scan": 0.0}
_WIKI_INDEX_TTL_SEC = 30  # rebuild if older than this AND any wiki file is newer

def _parse_wiki_frontmatter(text: str) -> dict:
    """Extract the YAML-ish frontmatter from a wiki article. Returns a dict
    of key→string. Tolerates missing fields, malformed lines, and absent
    frontmatter (returns empty dict)."""
    if not text.startswith('---'):
        return {}
    end = text.find('\n---', 3)
    if end < 0:
        return {}
    block = text[3:end]
    out: dict = {}
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            continue
        key, _, val = line.partition(':')
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            out[key] = val
    return out

def _extract_wiki_body(text: str, max_chars: int = 200) -> str:
    """Strip frontmatter + h1 + Source:[]()  and return the first max_chars of the body.
    Matches the stripping logic in researchFabricOrchestrator.checkWikiCache."""
    body = text
    if body.startswith('---'):
        end = body.find('\n---\n', 3)
        if end > 0:
            body = body[end + 5:]
    body = _re_wiki.sub(r'^#\s+[^\n]+\n+', '', body.lstrip(), count=1)
    body = _re_wiki.sub(r'^Source:\s+\[[^\]]+\]\([^)]+\)\n+', '', body, count=1)
    body = body.strip()
    if max_chars <= 0:
        return body
    return body[:max_chars]

def _walk_wiki_archive():
    """Yield (abs_path, rel_path, mtime) for every .md file under the
    articles/, transcripts/, uploads/ namespaces. Skips dotfiles and dirs."""
    for namespace in ('articles', 'transcripts', 'uploads'):
        ns_root = os.path.join(WIKI_BASE, namespace)
        if not os.path.isdir(ns_root):
            continue
        for bucket in os.listdir(ns_root):
            if bucket.startswith('.'):
                continue
            bucket_dir = os.path.join(ns_root, bucket)
            if not os.path.isdir(bucket_dir):
                continue
            for fname in os.listdir(bucket_dir):
                if not fname.endswith('.md') or fname.startswith('.'):
                    continue
                abs_path = os.path.join(bucket_dir, fname)
                try:
                    mtime = os.path.getmtime(abs_path)
                except OSError:
                    continue
                rel = os.path.relpath(abs_path, WIKI_BASE).replace(os.sep, '/')
                yield abs_path, rel, mtime

def _build_wiki_index(summary_len: int = 200) -> list:
    """Walk the wiki archive and construct the metadata index. Each entry
    is a dict safe for JSON serialization and small enough to fit 10,000
    entries into a ~3MB payload."""
    entries: list = []
    for abs_path, rel, mtime in _walk_wiki_archive():
        try:
            with open(abs_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            logger.warning(f"Wiki index: failed to read {rel}: {e}")
            continue
        fm = _parse_wiki_frontmatter(text)
        summary = _extract_wiki_body(text, max_chars=summary_len)
        chars_from_fm = 0
        try:
            chars_from_fm = int(fm.get('chars', '0') or '0')
        except ValueError:
            chars_from_fm = 0
        entry = {
            'id': fm.get('url_hash') or rel.rsplit('/', 1)[-1].replace('.md', ''),
            'wikiPath': rel,
            'kind': fm.get('kind') or 'article',
            'url': fm.get('url') or '',
            'title': fm.get('title') or '',
            'source': fm.get('source') or '',
            'date': fm.get('date') or '',
            'author': fm.get('author') or '',
            'tier': fm.get('tier') or '',
            'method': fm.get('method') or '',
            'channel': fm.get('channel') or '',
            'engagement': fm.get('engagement') or '',
            'chars': chars_from_fm or max(0, len(text) - 400),
            'mtime': mtime,
            'summary': summary,
        }
        entries.append(entry)
    # Sort newest first by mtime — AI sees most recent collections at top
    entries.sort(key=lambda e: e.get('mtime', 0), reverse=True)
    return entries

def _get_wiki_index_cached(summary_len: int = 200, force_rebuild: bool = False) -> list:
    """Return the cached wiki index, rebuilding if TTL expired, forced, or
    any file under the archive has changed since the last build."""
    global _WIKI_INDEX_CACHE
    now = _now_wiki_index()
    age = now - _WIKI_INDEX_CACHE.get('built_at', 0.0)
    if not force_rebuild and age < _WIKI_INDEX_TTL_SEC and _WIKI_INDEX_CACHE.get('entries'):
        # Quick mtime scan — if any file is newer than cache, rebuild
        newest = _WIKI_INDEX_CACHE.get('mtime_scan', 0.0)
        stale = False
        for _abs, _rel, mtime in _walk_wiki_archive():
            if mtime > newest:
                stale = True
                break
        if not stale:
            return _WIKI_INDEX_CACHE['entries']
    entries = _build_wiki_index(summary_len=summary_len)
    max_mtime = max((e.get('mtime', 0.0) for e in entries), default=0.0)
    _WIKI_INDEX_CACHE = {
        'built_at': now,
        'mtime_scan': max_mtime,
        'entries': entries,
    }
    return entries

@app.get("/api/wiki/index")
async def wiki_index_endpoint(
    summary_len: int = 200,
    limit: int = 0,
    kind: Optional[str] = None,
    source: Optional[str] = None,
    min_chars: int = 0,
    force_rebuild: int = 0,
):
    """Return the wiki metadata index — the lightweight menu the AI routes
    against. Query params filter by kind/source/min_chars. summary_len
    controls how many body chars are included per entry (0 = omit).
    The index itself is cached for ~30s with file-mtime invalidation."""
    try:
        entries = _get_wiki_index_cached(summary_len=summary_len, force_rebuild=bool(force_rebuild))
    except Exception as e:
        logger.error(f"Wiki index build failed: {e}")
        return JSONResponse({"error": str(e), "entries": []}, status_code=500)

    filtered = entries
    if kind:
        filtered = [e for e in filtered if e.get('kind') == kind]
    if source:
        s = source.lower()
        filtered = [e for e in filtered if s in (e.get('source') or '').lower()]
    if min_chars > 0:
        filtered = [e for e in filtered if int(e.get('chars') or 0) >= min_chars]
    if limit > 0:
        filtered = filtered[:limit]

    return {
        'total': len(entries),
        'returned': len(filtered),
        'built_at': _WIKI_INDEX_CACHE.get('built_at'),
        'entries': filtered,
    }


class WikiFetchArticlesRequest(BaseModel):
    """AI-callable retrieval. Either pass explicit ids/wikiPaths, OR pass a
    keyword `query` that the proxy keyword-matches against title + summary +
    source. `limit` caps how many bodies come back; `maxCharsPerArticle`
    caps each body's length so the aggregate response stays bounded."""
    ids: Optional[_List_wiki_index[str]] = None                 # url_hash values
    wikiPaths: Optional[_List_wiki_index[str]] = None           # direct paths
    query: Optional[str] = None                     # keyword search
    kind: Optional[str] = None                      # filter: article|transcript|upload
    source: Optional[str] = None                    # substring match on source name
    minChars: Optional[int] = 0
    limit: Optional[int] = 10
    maxCharsPerArticle: Optional[int] = 20_000      # 20KB default — plenty for most quotes


def _score_article_for_query(entry: dict, query_tokens: list) -> float:
    """Simple keyword overlap scoring — title hits worth more than summary."""
    if not query_tokens:
        return 0.0
    title = (entry.get('title') or '').lower()
    summary = (entry.get('summary') or '').lower()
    source = (entry.get('source') or '').lower()
    score = 0.0
    for tok in query_tokens:
        if tok in title:
            score += 3.0
        if tok in summary:
            score += 1.0
        if tok in source:
            score += 0.5
    return score


@app.post("/api/wiki/fetch-articles")
async def wiki_fetch_articles(req: WikiFetchArticlesRequest):
    """Return full article bodies matching the request. This is the AI's
    retrieval primitive: it sees metadata via /api/wiki/index, then calls
    this endpoint with ids or a query to get real text for citation."""
    try:
        entries = _get_wiki_index_cached(summary_len=0)
    except Exception as e:
        logger.error(f"Wiki fetch-articles: index build failed: {e}")
        return JSONResponse({"error": str(e), "articles": []}, status_code=500)

    limit = max(1, min(50, req.limit or 10))
    max_chars = max(500, min(50_000, req.maxCharsPerArticle or 20_000))

    # Direct id/path lookup takes precedence over query
    selected: list = []
    used_paths: set = set()
    if req.ids:
        id_set = set(req.ids)
        for e in entries:
            if e.get('id') in id_set and e.get('wikiPath') not in used_paths:
                selected.append(e)
                used_paths.add(e.get('wikiPath'))
    if req.wikiPaths:
        path_set = set(req.wikiPaths)
        for e in entries:
            if e.get('wikiPath') in path_set and e.get('wikiPath') not in used_paths:
                selected.append(e)
                used_paths.add(e.get('wikiPath'))

    # Query-based retrieval (if no direct ids matched enough)
    if len(selected) < limit and req.query:
        q = req.query.strip().lower()
        query_tokens = [t for t in _re_wiki.split(r'\W+', q) if len(t) >= 3]
        candidates = entries
        if req.kind:
            candidates = [e for e in candidates if e.get('kind') == req.kind]
        if req.source:
            s = req.source.lower()
            candidates = [e for e in candidates if s in (e.get('source') or '').lower()]
        if req.minChars and req.minChars > 0:
            candidates = [e for e in candidates if int(e.get('chars') or 0) >= req.minChars]
        scored = [(e, _score_article_for_query(e, query_tokens)) for e in candidates]
        scored = [(e, s) for (e, s) in scored if s > 0 and e.get('wikiPath') not in used_paths]
        scored.sort(key=lambda es: es[1], reverse=True)
        for e, _s in scored[: limit - len(selected)]:
            selected.append(e)
            used_paths.add(e.get('wikiPath'))

    # If still nothing selected and no direct ids given, fall back to newest
    if not selected and not req.ids and not req.wikiPaths and not req.query:
        selected = entries[:limit]

    # Read bodies and assemble response
    articles = []
    for e in selected[:limit]:
        safe_path = os.path.normpath(os.path.join(WIKI_BASE, e.get('wikiPath') or ''))
        if not safe_path.startswith(os.path.normpath(WIKI_BASE)) or not os.path.exists(safe_path):
            continue
        try:
            with open(safe_path, 'r', encoding='utf-8') as f:
                raw = f.read()
        except Exception as err:
            logger.warning(f"Wiki fetch-articles: read fail {e.get('wikiPath')}: {err}")
            continue
        body = _extract_wiki_body(raw, max_chars=max_chars)
        articles.append({
            'id': e.get('id'),
            'wikiPath': e.get('wikiPath'),
            'url': e.get('url'),
            'title': e.get('title'),
            'source': e.get('source'),
            'date': e.get('date'),
            'kind': e.get('kind'),
            'tier': e.get('tier'),
            'chars': len(body),
            'content': body,
        })
    return {
        'total_matched': len(selected),
        'returned': len(articles),
        'articles': articles,
    }


# ================================================================
# YOUTUBE DISCOVER BY CHANNELS  (Phase 1-retrofit 2026-04-21)
# ================================================================
# The in-session YouTube pipeline previously hit 5 hardcoded AI-focused
# channels regardless of the research topic. For a higher-ed-advancement
# brief that's zero signal. This endpoint accepts a list of channel_ids
# (provided by the client-side youtubeChannelRegistry which picks by lens)
# plus the research goal, fans out to each channel's RSS feed, scores every
# recent video by keyword overlap with the goal + AI-suggested queries, and
# returns the top N video URLs ready for Whisper transcription.
#
# Non-blocking: per-channel failures are logged but don't kill the response.
# Bounded: concurrency limited, per-channel limit_per_channel default 10,
# total max_results default 15.

import re as _re_yt_discover
from concurrent.futures import ThreadPoolExecutor as _Executor_yt_discover

class YouTubeDiscoverRequest(BaseModel):
    channel_ids: _List_wiki_index[str]
    goal: str = ""
    queries: Optional[_List_wiki_index[str]] = None
    limit_per_channel: Optional[int] = 10
    max_results: Optional[int] = 15
    min_relevance: Optional[float] = 3.0

_YT_RSS_PRIMARY = "https://www.youtube.com/feeds/videos.xml?channel_id={cid}"
_YT_RSS_FALLBACK = "https://www.youtube.com/feeds/videos.xml?playlist_id=UU{cid_body}"

_STOPWORDS_YT = set([
    'the','and','for','that','this','with','from','have','has','are','was','were',
    'but','not','their','them','they','into','than','which','what','when','where',
    'also','been','being','about','more','most','some','over','between','through',
    'across','within','your','you','can','how','why','will','should','could'
])

def _tokenize_yt(text: str) -> set:
    """Lowercase tokenize to 4+ char words, stopword-filtered."""
    if not text:
        return set()
    words = _re_yt_discover.findall(r"[a-zA-Z][a-zA-Z0-9]+", text.lower())
    return set(w for w in words if len(w) >= 4 and w not in _STOPWORDS_YT)

def _score_video(title: str, description: str, goal_tokens: set, query_tokens_list: list) -> tuple:
    """Score a video against the goal + suggested queries.
    Returns (score 0-10, matched_queries[]).
    Title matches weighted 2x body matches."""
    title_tokens = _tokenize_yt(title)
    desc_tokens = _tokenize_yt(description or "")
    score = 0.0
    # Goal keyword overlap
    goal_title_hits = len(goal_tokens & title_tokens)
    goal_desc_hits = len(goal_tokens & desc_tokens)
    score += goal_title_hits * 1.5 + goal_desc_hits * 0.5
    # Query-specific bonuses
    matched_queries = []
    for i, qtoks in enumerate(query_tokens_list):
        if not qtoks:
            continue
        q_title_hits = len(qtoks & title_tokens)
        q_desc_hits = len(qtoks & desc_tokens)
        if q_title_hits > 0 or q_desc_hits >= 2:
            matched_queries.append(i)
            score += q_title_hits * 2.0 + q_desc_hits * 0.3
    # Cap at 10
    return (min(10.0, score), matched_queries)

def _fetch_channel_videos(channel_id: str, limit: int) -> dict:
    """Fetch latest N videos from a YouTube channel via RSS.
    Tries primary feed first, then fallback (UU-transformed playlist).
    Returns { videos: [...], status: 'ok'|'err', error: str }."""
    urls_to_try = [
        _YT_RSS_PRIMARY.format(cid=channel_id),
    ]
    # Fallback: UC -> UU playlist feed
    if channel_id.startswith('UC'):
        urls_to_try.append(_YT_RSS_FALLBACK.format(cid_body=channel_id[2:]))
    last_err = ""
    for url in urls_to_try:
        try:
            with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                resp = client.get(url)
                if resp.status_code != 200:
                    last_err = f"HTTP {resp.status_code}"
                    continue
                feed = _feedparser_s8.parse(resp.text)
                videos = []
                for entry in (feed.entries or [])[:limit]:
                    video_id = entry.get('yt_videoid') or (entry.get('id', '').split(':')[-1])
                    if not video_id:
                        continue
                    videos.append({
                        'video_id': video_id,
                        'url': f"https://www.youtube.com/watch?v={video_id}",
                        'title': entry.get('title', '') or '',
                        'channel_id': channel_id,
                        'channel_title': getattr(feed.feed, 'title', '') or '',
                        'published': entry.get('published') or entry.get('updated') or '',
                        'description': (entry.get('summary') or '')[:1000],
                    })
                return {'videos': videos, 'status': 'ok'}
        except Exception as e:
            last_err = str(e)[:100]
            continue
    return {'videos': [], 'status': 'err', 'error': last_err}


@app.post("/api/youtube/discover-by-channels")
async def youtube_discover_by_channels(req: YouTubeDiscoverRequest):
    """Fan out to N YouTube channel RSS feeds, score videos by goal+query
    relevance, return the top M ranked.
    Typical use: client picks channels by lens, then calls this to pre-filter
    before enqueuing Whisper transcription (expensive — we don't want to
    transcribe every video from every channel)."""
    channel_ids = [c for c in (req.channel_ids or []) if isinstance(c, str) and c.strip()]
    if not channel_ids:
        return {'total_channels_queried': 0, 'total_videos_scanned': 0, 'videos': [], 'errors': ['no channel_ids provided']}

    limit_per_channel = max(1, min(25, req.limit_per_channel or 10))
    max_results = max(1, min(50, req.max_results or 15))
    min_rel = max(0.0, float(req.min_relevance or 3.0))

    goal_tokens = _tokenize_yt(req.goal or "")
    query_tokens_list = [_tokenize_yt(q) for q in (req.queries or [])]

    # Fan out with bounded concurrency (threadpool — synchronous RSS fetch).
    # 6-way parallelism matches the orchestrator's proxy-concurrency ceiling.
    all_videos = []
    errors = []
    with _Executor_yt_discover(max_workers=6) as ex:
        futures = {ex.submit(_fetch_channel_videos, cid, limit_per_channel): cid for cid in channel_ids}
        for fut in futures:
            cid = futures[fut]
            try:
                result = fut.result(timeout=10)
                if result.get('status') == 'ok':
                    all_videos.extend(result.get('videos', []))
                else:
                    errors.append(f"{cid}: {result.get('error', 'unknown')}")
            except Exception as e:
                errors.append(f"{cid}: {str(e)[:80]}")

    # Score every video
    scored = []
    for v in all_videos:
        score, matched = _score_video(v.get('title', ''), v.get('description', ''), goal_tokens, query_tokens_list)
        if score < min_rel:
            continue
        scored.append({
            'video_id': v['video_id'],
            'url': v['url'],
            'title': v['title'],
            'channel_id': v['channel_id'],
            'channel_title': v.get('channel_title', ''),
            'published': v.get('published', ''),
            'score': round(score, 2),
            'matched_queries': [(req.queries or [])[i] for i in matched if i < len(req.queries or [])],
        })
    scored.sort(key=lambda x: x['score'], reverse=True)
    top = scored[:max_results]

    logger.info(f"[YT-Discover] queried {len(channel_ids)} channels, scanned {len(all_videos)} videos, returning {len(top)} above relevance threshold {min_rel}")
    return {
        'total_channels_queried': len(channel_ids),
        'total_videos_scanned': len(all_videos),
        'videos': top,
        'errors': errors,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5012"))
    logger.info(f"Starting Research Data Proxy v2 on port {port} with {len(SOURCES)} sources")
    uvicorn.run(app, host="0.0.0.0", port=port)
