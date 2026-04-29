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
from typing import Optional, Dict, Any, List, Tuple
import asyncio

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

    # -- University Newsrooms — Wave 1 additions (2026-04-21 gap-analysis fill) --
    # These close the highest-priority newsroom gaps identified vs. the
    # 198-resource Advancement universe. Northeastern Global News is critical
    # for the current engagement (client home institution). All use Google News
    # site-filter RSS rather than guessed WordPress feed URLs — proven in this
    # registry (see case_advancement_gnews, evertrue_gnews) and avoids 404s
    # from fabricated /feed/ endpoints.
    "northeastern_global_news_gnews": {"name": "Northeastern Global News", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.northeastern.edu"},
    "columbia_news_gnews":            {"name": "Columbia News", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.columbia.edu"},
    "northwestern_now_gnews":         {"name": "Northwestern Now", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.northwestern.edu"},
    "emory_news_gnews":               {"name": "Emory News Center", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.emory.edu"},
    "washu_source_gnews":             {"name": "The Source (Washington University in St. Louis)", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Asource.wustl.edu"},
    "cornell_chronicle_gnews":        {"name": "Cornell Chronicle", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.cornell.edu"},
    "stanford_news_gnews":            {"name": "Stanford News", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.stanford.edu"},
    "brown_news_gnews":               {"name": "Brown University News", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Anews.brown.edu"},
    "dartmouth_news_gnews":           {"name": "Dartmouth News", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Ahome.dartmouth.edu"},
    "jhu_hub_gnews":                  {"name": "Johns Hopkins Hub", "category": "University Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Ahub.jhu.edu"},

    # -- Alumni Magazines (new category, 2026-04-21) --
    # Issue-cadenced publications — distinct value class from rolling newsrooms.
    # Carry reunion culture, stewardship tone, board language, and named-donor
    # stories that newsrooms typically don't surface. Doc flags these as
    # spot-verified 2026-current with public issue pages. Use web_search
    # (Gemini-grounded) because issue-based pubs don't map cleanly to RSS.
    "princeton_alumni_weekly":  {"name": "Princeton Alumni Weekly", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "paw.princeton.edu"},
    "yale_alumni_magazine":     {"name": "Yale Alumni Magazine", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "yalealumnimagazine.com"},
    "columbia_college_today":   {"name": "Columbia College Today", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "college.columbia.edu/cct"},
    "dartmouth_alumni_mag":     {"name": "Dartmouth Alumni Magazine", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "dartmouthalumnimagazine.com"},
    "virginia_magazine":        {"name": "Virginia Magazine (UVA)", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "uvamagazine.org"},
    "harvard_magazine":         {"name": "Harvard Magazine", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "harvardmagazine.com"},
    "stanford_magazine":        {"name": "Stanford Magazine", "category": "Alumni Magazines", "type": "web_search", "tier": 1, "domain": "stanfordmag.org"},

    # -- Advancement Sector/Benchmark — Wave 1 additions (2026-04-21) --
    # These close the benchmark gap vs. what we previously only got through
    # weak Google News proxies (CASE, EverTrue, etc.). Direct primary-source
    # coverage of advancement strategy, donor benchmarks, and sector research.
    "eab_advancement_blog":      {"name": "EAB Advancement Blog", "category": "Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Aeab.com+advancement"},
    "ccs_insights":              {"name": "CCS Fundraising Insights", "category": "Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Accsfundraising.com"},
    "kindsight_resources":       {"name": "Kindsight Resource Hub", "category": "Advancement", "type": "web_search", "tier": 2, "domain": "kindsight.io/resources"},
    "blackbaud_engage_highered": {"name": "Blackbaud ENGAGE Higher Education", "category": "Advancement", "type": "rss", "tier": 1,
        "url": "https://news.google.com/rss/search?q=site%3Acommunity.blackbaud.com+higher+education"},
    "indiana_lilly_philanthropy": {"name": "Indiana University Lilly Family School of Philanthropy", "category": "Advancement", "type": "web_search", "tier": 1, "domain": "philanthropy.iupui.edu"},
    "lake_institute_faith_giving": {"name": "Lake Institute on Faith & Giving", "category": "Advancement", "type": "web_search", "tier": 2, "domain": "lakeinstitute.org"},
    "fund_raising_school":        {"name": "The Fund Raising School (Indiana University)", "category": "Advancement", "type": "web_search", "tier": 2, "domain": "philanthropy.iupui.edu/professional-development/the-fund-raising-school"},

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

    # --- Retail News (35 sources, added 2026-04-28) ---
    "retail_dive": {"name": "Retail Dive", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retaildive.com/feeds/news/"},
    "retail_dive_marketing": {"name": "Retail Dive: Marketing", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retaildive.com/topic/marketing/feed/"},
    "retail_dive_tech": {"name": "Retail Dive: Tech", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retaildive.com/topic/technology/feed/"},
    "retail_wire": {"name": "Retail Wire", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retailwire.com/feed/"},
    "retail_touchpoints": {"name": "Retail TouchPoints", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retailtouchpoints.com/feed"},
    "chain_store_age": {"name": "Chain Store Age", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://chainstoreage.com/rss.xml"},
    "ris_news": {"name": "RIS News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://risnews.com/rss.xml"},
    "total_retail": {"name": "Total Retail", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.mytotalretail.com/feed/"},
    "retail_week_uk": {"name": "Retail Week (UK)", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retail-week.com/feeds/feed.rss"},
    "the_robin_report": {"name": "The Robin Report", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://therobinreport.com/feed/"},
    "retail_cx": {"name": "Retail Customer Experience", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.retailcustomerexperience.com/rss/"},
    "retail_insider": {"name": "Retail Insider", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://retail-insider.com/feed/"},
    "retail_minded": {"name": "Retail Minded", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://retailminded.com/feed/"},
    "retail_doctor": {"name": "The Retail Doctor (Bob Phibbs)", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://retaildoc.com/blog/rss.xml"},
    "nrf_blog": {"name": "NRF Blog", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://nrf.com/rss.xml"},
    "nrf_smart_brief": {"name": "NRF Smart Brief", "category": "Retail News", "type": "web_search", "tier": 2, "domain": "smartbrief.com/nrf"},
    "modern_retail": {"name": "Modern Retail", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.modernretail.co/feed/"},
    "glossy": {"name": "Glossy", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.glossy.co/feed/"},
    "digiday": {"name": "Digiday", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://digiday.com/feed/"},
    "vogue_business": {"name": "Vogue Business", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.voguebusiness.com/feed"},
    "business_of_fashion": {"name": "Business of Fashion", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.businessoffashion.com/arc/outboundfeeds/rss/"},
    "fashion_united": {"name": "Fashion United", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://fashionunited.com/feed"},
    "wwd": {"name": "Women's Wear Daily", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://wwd.com/feed/"},
    "sourcing_journal": {"name": "Sourcing Journal", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://sourcingjournal.com/feed/"},
    "footwear_news": {"name": "Footwear News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://footwearnews.com/feed/"},
    "supermarket_news": {"name": "Supermarket News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.supermarketnews.com/rss.xml"},
    "progressive_grocer": {"name": "Progressive Grocer", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://progressivegrocer.com/rss.xml"},
    "grocery_dive": {"name": "Grocery Dive", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.grocerydive.com/feeds/news/"},
    "csp_daily_news": {"name": "CSP Daily News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.cspdailynews.com/rss-feeds"},
    "convenience_store_news": {"name": "Convenience Store News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://csnews.com/rss.xml"},
    "drug_store_news": {"name": "Drug Store News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://drugstorenews.com/rss.xml"},
    "home_furnishings_news": {"name": "Home Furnishings News", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://hfndigital.com/feed/"},
    "dc_velocity": {"name": "DC Velocity (Logistics)", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.dcvelocity.com/rss"},
    "logistics_management": {"name": "Logistics Management", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.logisticsmgmt.com/rss/all_articles"},
    "license_global": {"name": "License Global", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.licenseglobal.com/rss.xml"},

    # --- Ecommerce (20 sources, added 2026-04-28) ---
    "shopify_blog": {"name": "Shopify Retail Blog", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.shopify.com/blog.atom"},
    "bigcommerce_blog": {"name": "BigCommerce Blog", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.bigcommerce.com/blog/feed/"},
    "practical_ecommerce": {"name": "Practical Ecommerce", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.practicalecommerce.com/feed"},
    "ecommerce_bytes": {"name": "EcommerceBytes", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.ecommercebytes.com/new/index.rss"},
    "digital_commerce_360": {"name": "Digital Commerce 360", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.digitalcommerce360.com/feed/"},
    "emarketer": {"name": "eMarketer", "category": "Ecommerce", "type": "rss", "tier": 1, "url": "https://www.emarketer.com/rss"},
    "marketplace_pulse": {"name": "Marketplace Pulse", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.marketplacepulse.com/rss.xml"},
    "techcrunch_commerce": {"name": "TechCrunch Commerce", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://techcrunch.com/category/commerce/feed/"},
    "klaviyo_blog": {"name": "Klaviyo Blog", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.klaviyo.com/blog/feed"},
    "recharge_blog": {"name": "Recharge Blog", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://rechargepayments.com/blog/feed/"},
    "yotpo_blog": {"name": "Yotpo Blog", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.yotpo.com/blog/feed/"},
    "common_thread_co": {"name": "Common Thread Collective", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://commonthreadco.com/blogs/coachs-corner.atom"},
    "two_pm": {"name": "2PM Newsletter", "category": "Ecommerce", "type": "web_search", "tier": 2, "domain": "2pml.com"},
    "lean_luxe": {"name": "Lean Luxe", "category": "Ecommerce", "type": "web_search", "tier": 2, "domain": "leanluxe.com"},
    "future_commerce": {"name": "Future Commerce", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://futurecommerce.com/feed.xml"},
    "pipe_candy": {"name": "Pipe Candy DTC Insights", "category": "Ecommerce", "type": "web_search", "tier": 2, "domain": "pipecandy.com/blog"},
    "forrester_retail": {"name": "Forrester Retail Blog", "category": "Ecommerce", "type": "rss", "tier": 1, "url": "https://www.forrester.com/blogs/category/retail/feed/"},
    "better_lemonade_stand": {"name": "A Better Lemonade Stand", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://www.abetterlemonadestand.com/blog/feed/"},
    "andrew_faris": {"name": "Andrew Faris (eCom Insiders)", "category": "Ecommerce", "type": "web_search", "tier": 2, "domain": "andrewfaris.com"},
    "internet_retailing_uk": {"name": "Internet Retailing (UK)", "category": "Ecommerce", "type": "rss", "tier": 2, "url": "https://internetretailing.net/feed"},

    # --- Digital Marketing (25 sources, added 2026-04-28) ---
    "hubspot_marketing": {"name": "HubSpot Marketing Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://blog.hubspot.com/marketing/rss.xml"},
    "martech_org": {"name": "MarTech.org", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://martech.org/feed/"},
    "marketing_profs": {"name": "MarketingProfs", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.marketingprofs.com/rss/all-content-rss.xml"},
    "marketing_week": {"name": "Marketing Week", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.marketingweek.com/feed/"},
    "marketing_brew": {"name": "Marketing Brew", "category": "Digital Marketing", "type": "web_search", "tier": 2, "domain": "marketingbrew.com"},
    "marketing_dive": {"name": "Marketing Dive", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.marketingdive.com/feeds/news/"},
    "adweek": {"name": "Adweek", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.adweek.com/feed/"},
    "ad_age": {"name": "Ad Age", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://adage.com/rss.xml"},
    "campaign_live": {"name": "Campaign Live", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.campaignlive.com/rss/all"},
    "the_drum": {"name": "The Drum", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.thedrum.com/rss.xml"},
    "clickz": {"name": "ClickZ", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.clickz.com/feed/"},
    "search_engine_land": {"name": "Search Engine Land", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://searchengineland.com/feed"},
    "search_engine_journal": {"name": "Search Engine Journal", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.searchenginejournal.com/feed/"},
    "search_engine_watch": {"name": "Search Engine Watch", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.searchenginewatch.com/feed/"},
    "moz_blog": {"name": "Moz Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://moz.com/posts/rss/"},
    "ahrefs_blog": {"name": "Ahrefs Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://ahrefs.com/blog/feed/"},
    "semrush_blog": {"name": "Semrush Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.semrush.com/blog/feed/"},
    "neil_patel": {"name": "Neil Patel Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://neilpatel.com/feed/"},
    "backlinko": {"name": "Backlinko", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://backlinko.com/feed"},
    "copyblogger": {"name": "Copyblogger", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://copyblogger.com/feed/"},
    "content_marketing_inst": {"name": "Content Marketing Institute", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://contentmarketinginstitute.com/feed/"},
    "convince_convert": {"name": "Convince & Convert", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.convinceandconvert.com/feed/"},
    "seths_blog": {"name": "Seth's Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://seths.blog/feed/"},
    "wordstream": {"name": "WordStream Blog", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.wordstream.com/blog/feed"},
    "marketing_ai_inst": {"name": "Marketing AI Institute", "category": "Digital Marketing", "type": "rss", "tier": 2, "url": "https://www.marketingaiinstitute.com/blog/rss.xml"},

    # --- Social Marketing (25 sources, added 2026-04-28) ---
    "social_media_today": {"name": "Social Media Today", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.socialmediatoday.com/feeds/news/"},
    "social_media_examiner": {"name": "Social Media Examiner", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.socialmediaexaminer.com/feed/"},
    "hootsuite_blog": {"name": "Hootsuite Blog", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://blog.hootsuite.com/feed/"},
    "buffer_resources": {"name": "Buffer Resources", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://buffer.com/resources/rss/"},
    "sprout_social": {"name": "Sprout Social Insights", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://sproutsocial.com/insights/feed/"},
    "later_blog": {"name": "Later Blog", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://later.com/blog/feed/"},
    "agorapulse_blog": {"name": "Agorapulse Blog", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.agorapulse.com/blog/feed/"},
    "socialpilot_blog": {"name": "SocialPilot Blog", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.socialpilot.co/blog/feed"},
    "jeff_bullas": {"name": "Jeff Bullas", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.jeffbullas.com/feed/"},
    "mari_smith": {"name": "Mari Smith", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "marismith.com/blog"},
    "brian_solis": {"name": "Brian Solis", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.briansolis.com/feed/"},
    "meta_business_news": {"name": "Meta for Business", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "facebook.com/business/news"},
    "tiktok_newsroom": {"name": "TikTok Newsroom", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "newsroom.tiktok.com"},
    "tiktok_business_blog": {"name": "TikTok for Business Insights", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "tiktok.com/business/en-US/blog"},
    "linkedin_marketing": {"name": "LinkedIn Marketing Blog", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.linkedin.com/business/marketing/blog/rss"},
    "youtube_creators": {"name": "YouTube Creators Blog", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://blog.youtube/rss/"},
    "pinterest_newsroom": {"name": "Pinterest Newsroom", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "newsroom.pinterest.com"},
    "snap_newsroom": {"name": "Snap Inc. Newsroom", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "newsroom.snap.com"},
    "influencer_marketing_hub": {"name": "Influencer Marketing Hub", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://influencermarketinghub.com/feed/"},
    "tubefilter": {"name": "Tubefilter", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.tubefilter.com/feed/"},
    "passionfruit_creators": {"name": "Passionfruit", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "passionfru.it"},
    "information_creator": {"name": "The Information: Creator Economy", "category": "Social Marketing", "type": "web_search", "tier": 1, "domain": "theinformation.com/topics/creator-economy"},
    "mediapost": {"name": "Mediapost", "category": "Social Marketing", "type": "rss", "tier": 2, "url": "https://www.mediapost.com/rss/all/"},
    "nyu_creator_economy": {"name": "NYU Creator Economy Center", "category": "Social Marketing", "type": "web_search", "tier": 1, "domain": "stern.nyu.edu/experience-stern/about/departments-centers-initiatives/centers-of-research/fubon-center"},
    "digiday_social": {"name": "Digiday: Social", "category": "Social Marketing", "type": "web_search", "tier": 2, "domain": "digiday.com/social"},

    # --- Consumer Insights (20 sources, added 2026-04-28) ---
    "pew_internet_tech": {"name": "Pew Internet & Tech", "category": "Consumer Insights", "type": "rss", "tier": 1, "url": "https://www.pewresearch.org/internet/feed/"},
    "pew_consumer": {"name": "Pew Research (general)", "category": "Consumer Insights", "type": "rss", "tier": 1, "url": "https://www.pewresearch.org/feed/"},
    "mckinsey_retail": {"name": "McKinsey: Retail", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "mckinsey.com/industries/retail/our-insights"},
    "mckinsey_marketing": {"name": "McKinsey: Marketing & Sales", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "mckinsey.com/capabilities/growth-marketing-and-sales"},
    "bcg_retail": {"name": "BCG: Retail", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "bcg.com/industries/retail"},
    "bain_retail": {"name": "Bain: Retail", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "bain.com/industry-expertise/retail"},
    "deloitte_consumer": {"name": "Deloitte: Consumer", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "deloitte.com/us/en/insights/industry/retail-distribution.html"},
    "deloitte_digital": {"name": "Deloitte Digital", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "deloittedigital.com/us/en/insights.html"},
    "pwc_consumer": {"name": "PwC Consumer Insights", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "pwc.com/gx/en/industries/consumer-markets.html"},
    "accenture_retail": {"name": "Accenture: Retail", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "accenture.com/us-en/industries/retail-index"},
    "gartner_marketing": {"name": "Gartner: Marketing", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "gartner.com/en/marketing"},
    "gartner_retail": {"name": "Gartner: Retail Industry", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "gartner.com/en/industries/retail"},
    "statista_topics": {"name": "Statista (free charts)", "category": "Consumer Insights", "type": "web_search", "tier": 2, "domain": "statista.com/topics"},
    "think_with_google": {"name": "Think with Google", "category": "Consumer Insights", "type": "rss", "tier": 2, "url": "https://www.thinkwithgoogle.com/intl/en-us/feed/"},
    "google_trends": {"name": "Google Trends", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "trends.google.com/trends"},
    "pew_social_media": {"name": "Pew Social Media Reports", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "pewresearch.org/topic/internet-technology/platforms-services/social-media"},
    "ypulse": {"name": "YPulse (Gen Z/Millennial)", "category": "Consumer Insights", "type": "web_search", "tier": 2, "domain": "ypulse.com/blog"},
    "mintel_insights": {"name": "Mintel Insights", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "mintel.com/insights"},
    "kantar_insights": {"name": "Kantar Insights", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "kantar.com/inspiration"},
    "nielsen_iq": {"name": "NielsenIQ Insights", "category": "Consumer Insights", "type": "web_search", "tier": 1, "domain": "nielseniq.com/global/en/insights"},

    # --- Retail Tech (15 sources, added 2026-04-28) ---
    "retail_tech_review": {"name": "Retail Technology Review", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://www.retailtechnologyreview.com/rss"},
    "retail_tech_innovation": {"name": "Retail Tech Innovation Hub", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://retailtechinnovationhub.com/home?format=rss"},
    "retail_tech_insights": {"name": "Retail Tech Insights (CIOReview)", "category": "Retail Tech", "type": "web_search", "tier": 2, "domain": "retail.cioreview.com"},
    "retailnext_blog": {"name": "RetailNext Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://retailnext.net/en/blog/feed/"},
    "square_retail_blog": {"name": "Square Retail Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://squareup.com/us/en/the-bottom-line/feed.xml"},
    "lightspeed_blog": {"name": "Lightspeed Retail Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://www.lightspeedhq.com/blog/feed/"},
    "ncr_voyix": {"name": "NCR Voyix Insights", "category": "Retail Tech", "type": "web_search", "tier": 2, "domain": "ncrvoyix.com/insights"},
    "salesforce_commerce": {"name": "Salesforce Commerce Cloud Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://www.salesforce.com/news/feed/"},
    "adobe_xc_blog": {"name": "Adobe Experience Cloud Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://blog.adobe.com/en/topics/experience-cloud.feed"},
    "microsoft_retail_blog": {"name": "Microsoft Retail Blog", "category": "Retail Tech", "type": "web_search", "tier": 2, "domain": "microsoft.com/en-us/industry/blog/retail"},
    "google_cloud_retail": {"name": "Google Cloud Retail Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://cloud.google.com/blog/topics/retail/rss"},
    "aws_retail_blog": {"name": "AWS Retail Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://aws.amazon.com/blogs/industries/category/industries/retail/feed/"},
    "ibm_retail_blog": {"name": "IBM Retail Blog", "category": "Retail Tech", "type": "web_search", "tier": 2, "domain": "ibm.com/blog/category/retail"},
    "oracle_retail_blog": {"name": "Oracle Retail Blog", "category": "Retail Tech", "type": "rss", "tier": 2, "url": "https://blogs.oracle.com/retail/rss"},
    "sap_retail": {"name": "SAP Retail Insights", "category": "Retail Tech", "type": "web_search", "tier": 2, "domain": "sap.com/insights/industries/retail.html"},

    # --- Retail Economic Data (15 sources, added 2026-04-28) ---
    "census_marts": {"name": "Census Monthly Retail Trade", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.census.gov/data/timeseries/eits/marts"},
    "census_economic": {"name": "Census Economic Indicators", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.census.gov/data.html"},
    "census_qsr": {"name": "Census Quarterly E-commerce", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.census.gov/data/timeseries/eits/qsr"},
    "bea_retail": {"name": "BEA (Bureau of Economic Analysis)", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "apps.bea.gov/api"},
    "bls_retail": {"name": "BLS CPI/Wages (retail)", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.bls.gov/publicAPI/v2"},
    "fred_retail": {"name": "FRED (St. Louis Fed)", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "fred.stlouisfed.org/docs/api/fred"},
    "data_gov_retail": {"name": "Data.gov: Retail Datasets", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "catalog.data.gov/dataset?q=retail"},
    "api_data_gov": {"name": "api.data.gov (federal gateway)", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.data.gov"},
    "commerce_gov_api": {"name": "Commerce.gov Content API", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.commerce.gov/api"},
    "usda_ers": {"name": "USDA Economic Research", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "ers.usda.gov/developer"},
    "uk_ons_retail": {"name": "UK ONS Retail Sales", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "api.ons.gov.uk"},
    "eurostat_retail": {"name": "Eurostat Retail Trade", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "ec.europa.eu/eurostat/web/retail-trade/data/database"},
    "oecd_retail": {"name": "OECD Data API (retail)", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "data.oecd.org/api"},
    "worldbank_consumption": {"name": "World Bank: Consumption", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "data.worldbank.org"},
    "imf_retail": {"name": "IMF Data API (retail)", "category": "Retail Economic Data", "type": "web_search", "tier": 1, "domain": "imf.org/en/Data"},

    # --- Search Trends (10 sources, added 2026-04-28) ---
    "pytrends": {"name": "Google Trends (pytrends)", "category": "Search Trends", "type": "web_search", "tier": 1, "domain": "trends.google.com"},
    "wiki_pageviews": {"name": "Wikipedia Pageviews API", "category": "Search Trends", "type": "web_search", "tier": 1, "domain": "wikimedia.org/api/rest_v1"},
    "duckduckgo_ia": {"name": "DuckDuckGo Instant Answer", "category": "Search Trends", "type": "web_search", "tier": 2, "domain": "api.duckduckgo.com"},
    "newsapi_org": {"name": "NewsAPI.org", "category": "Search Trends", "type": "web_search", "tier": 2, "domain": "newsapi.org"},
    "gdelt_global": {"name": "GDELT Global News", "category": "Search Trends", "type": "web_search", "tier": 1, "domain": "api.gdeltproject.org"},
    "guardian_open": {"name": "Guardian Open Platform", "category": "Search Trends", "type": "web_search", "tier": 1, "domain": "open-platform.theguardian.com"},
    "nyt_article_search": {"name": "NYT Article Search", "category": "Search Trends", "type": "web_search", "tier": 1, "domain": "developer.nytimes.com/apis"},
    "youtube_data_api": {"name": "YouTube Data API", "category": "Search Trends", "type": "web_search", "tier": 2, "domain": "developers.google.com/youtube/v3"},
    "bing_web_search": {"name": "Bing Web Search", "category": "Search Trends", "type": "web_search", "tier": 2, "domain": "microsoft.com/en-us/bing/apis/bing-web-search-api"},
    "common_crawl": {"name": "Common Crawl", "category": "Search Trends", "type": "web_search", "tier": 1, "domain": "commoncrawl.org/the-data/get-started"},

    # --- Social Sentiment (10 sources, added 2026-04-28) ---
    "reddit_json_api": {"name": "Reddit JSON API", "category": "Social Sentiment", "type": "web_search", "tier": 2, "domain": "reddit.com"},
    "pushshift": {"name": "Reddit Pushshift", "category": "Social Sentiment", "type": "web_search", "tier": 2, "domain": "api.pushshift.io"},
    "hacker_news_api": {"name": "Hacker News API", "category": "Social Sentiment", "type": "web_search", "tier": 2, "domain": "hacker-news.firebaseio.com"},
    "mastodon_public": {"name": "Mastodon Public Timeline", "category": "Social Sentiment", "type": "web_search", "tier": 2, "domain": "mastodon.social/api/v1/timelines/public"},
    "bluesky_at_proto": {"name": "Bluesky AT Protocol", "category": "Social Sentiment", "type": "web_search", "tier": 2, "domain": "docs.bsky.app"},
    "product_hunt": {"name": "Product Hunt API", "category": "Social Sentiment", "type": "web_search", "tier": 2, "domain": "api.producthunt.com/v2/docs"},
    "indie_hackers": {"name": "Indie Hackers", "category": "Social Sentiment", "type": "rss", "tier": 2, "url": "https://www.indiehackers.com/feed.xml"},
    "twitter_x_api": {"name": "Twitter/X API (limited)", "category": "Social Sentiment", "type": "web_search", "tier": 3, "domain": "developer.x.com"},
    "threads_public": {"name": "Threads (public web)", "category": "Social Sentiment", "type": "web_search", "tier": 3, "domain": "threads.net"},
    "tiktok_display_api": {"name": "TikTok Display API", "category": "Social Sentiment", "type": "web_search", "tier": 3, "domain": "developers.tiktok.com/doc/display-api-overview"},

    # --- Reddit Retail (25 sources, added 2026-04-28) ---
    "reddit_retail": {"name": "r/retail", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/retail.rss"},
    "reddit_ecommerce": {"name": "r/ecommerce", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/ecommerce.rss"},
    "reddit_shopify": {"name": "r/shopify", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/shopify.rss"},
    "reddit_amazon_seller": {"name": "r/AmazonSeller", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/AmazonSeller.rss"},
    "reddit_fba": {"name": "r/FulfillmentByAmazon", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/FulfillmentByAmazon.rss"},
    "reddit_dropship": {"name": "r/dropship", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/dropship.rss"},
    "reddit_woocommerce": {"name": "r/woocommerce", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/woocommerce.rss"},
    "reddit_etsy_sellers": {"name": "r/EtsySellers", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/EtsySellers.rss"},
    "reddit_dtc_marketing": {"name": "r/DTCMarketing", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/DTCMarketing.rss"},
    "reddit_marketing": {"name": "r/marketing", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/marketing.rss"},
    "reddit_digital_marketing": {"name": "r/digital_marketing", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/digital_marketing.rss"},
    "reddit_digital_marketing2": {"name": "r/DigitalMarketing", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/DigitalMarketing.rss"},
    "reddit_seo": {"name": "r/SEO", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/SEO.rss"},
    "reddit_bigseo": {"name": "r/bigseo", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/bigseo.rss"},
    "reddit_techseo": {"name": "r/TechSEO", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/TechSEO.rss"},
    "reddit_ppc": {"name": "r/PPC", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/PPC.rss"},
    "reddit_facebook_ads": {"name": "r/FacebookAds", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/FacebookAds.rss"},
    "reddit_socialmedia": {"name": "r/socialmedia", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/socialmedia.rss"},
    "reddit_smm": {"name": "r/SocialMediaMarketing", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/SocialMediaMarketing.rss"},
    "reddit_content_marketing": {"name": "r/contentmarketing", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/contentmarketing.rss"},
    "reddit_advertising": {"name": "r/advertising", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/advertising.rss"},
    "reddit_copywriting": {"name": "r/copywriting", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/copywriting.rss"},
    "reddit_entrepreneur": {"name": "r/Entrepreneur", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Entrepreneur.rss"},
    "reddit_smallbusiness": {"name": "r/smallbusiness", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/smallbusiness.rss"},
    "reddit_buyitforlife": {"name": "r/BuyItForLife", "category": "Reddit Retail", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/BuyItForLife.rss"},

    # ================================================================
    # CHECKOUT-FUNDRAISING / CAUSE-COMMERCE INTELLIGENCE PACK (2026-04-29)
    # 153 new sources covering: cause-commerce tech (ShoppingGives, Pledge,
    # Daffy, Klarna Giving, Stripe Climate), brand impact pages (Wayfair,
    # Bombas, TOMS, Patagonia, Allbirds), donation tech platforms,
    # carbon-at-checkout, philanthropy press, retail/commerce additions,
    # consumer/CSR research firms, government/regulatory data, press
    # wires, and cause-focused subreddits. static_url type fetches a
    # configured page via trafilatura/Jina (3-tier expansion).
    # ================================================================

    # --- Cause-Commerce Tech (23 sources) ---
    "shoppinggives_blog": {"name": "ShoppingGives Blog", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.shoppinggives.com/blog"},
    "shoppinggives_news": {"name": "ShoppingGives Newsroom", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.shoppinggives.com/news"},
    "pledge_to_resources": {"name": "Pledge.to Resources", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.pledge.to/resources"},
    "pledge_shopify_give_grow": {"name": "Pledge Give and Grow Shopify", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.pledge.to/products/shopify-give-and-grow-app"},
    "pledgeling_foundation": {"name": "Pledgeling Foundation", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://pledgeling.org/"},
    "roundup_app": {"name": "RoundUp App", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.roundupapp.com/"},
    "rounditup_america": {"name": "Round It Up America", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.rounditupamerica.org/"},
    "daffy_resources": {"name": "Daffy Resources", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.daffy.org/resources"},
    "daffy_developer": {"name": "Daffy Developer Docs", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.daffy.org/developer"},
    "daffy_for_work": {"name": "Daffy for Work", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.daffy.org/work"},
    "givelify_blog": {"name": "Givelify Blog", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.givelify.com/blog/"},
    "givelify_press": {"name": "Givelify Press", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.givelify.com/press/"},
    "charitybuzz": {"name": "Charitybuzz", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.charitybuzz.com/"},
    "charitybuzz_press": {"name": "Charitybuzz Press", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.charitybuzz.com/press"},
    "stripe_climate": {"name": "Stripe Climate", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://stripe.com/climate"},
    "frontier_climate": {"name": "Frontier Climate", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://frontierclimate.com/"},
    "stripe_newsroom": {"name": "Stripe Newsroom", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://stripe.com/newsroom"},
    "klarna_newsroom": {"name": "Klarna Newsroom", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.klarna.com/international/press/"},
    "klarna_sustainability": {"name": "Klarna Sustainability", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.klarna.com/us/sustainability/"},
    "shopify_apps_roundup": {"name": "Shopify Round-Up Apps", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://apps.shopify.com/search?q=round+up+donation"},
    "shopify_engineering": {"name": "Shopify Engineering Blog", "category": "Cause-Commerce Tech", "type": "rss", "tier": 2, "url": "https://shopify.engineering/blog.atom"},
    "shopify_news": {"name": "Shopify News", "category": "Cause-Commerce Tech", "type": "rss", "tier": 2, "url": "https://news.shopify.com/feed"},
    "salesforce_org_blog": {"name": "Salesforce.org Blog", "category": "Cause-Commerce Tech", "type": "static_url", "tier": 2, "url": "https://www.salesforce.org/blog/"},

    # --- Cause-Brand Impact (25 sources) ---
    "wayfair_news": {"name": "Wayfair Newsroom", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.aboutwayfair.com/category/press-release"},
    "wayfair_impact": {"name": "Wayfair Social Impact", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.aboutwayfair.com/our-commitments/social-impact"},
    "wayfair_ir": {"name": "Wayfair Investor Relations", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://investor.wayfair.com/news-releases"},
    "bombas_impact": {"name": "Bombas Impact (Bee Better)", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://beebetter.bombas.com/impact"},
    "bombas_press": {"name": "Bombas Press", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://bombas.com/pages/press"},
    "toms_impact": {"name": "TOMS Impact Reports", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.toms.com/us/impact.html"},
    "toms_news": {"name": "TOMS Newsroom", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.toms.com/us/about-toms/newsroom.html"},
    "warby_buy_pair": {"name": "Warby Parker Buy a Pair", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.warbyparker.com/buy-a-pair-give-a-pair"},
    "warby_press": {"name": "Warby Parker Press", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://investors.warbyparker.com/news-releases"},
    "allbirds_sustainability": {"name": "Allbirds Sustainability", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.allbirds.com/pages/sustainability"},
    "patagonia_activism": {"name": "Patagonia Activism", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.patagonia.com/activism/"},
    "onepercent_planet": {"name": "1 Percent for the Planet", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.onepercentfortheplanet.org/stories"},
    "benjerry_news": {"name": "Ben and Jerrys Issues", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.benjerry.com/whats-new"},
    "honest_co": {"name": "Honest Company", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.honest.com/about-us/our-story"},
    "lush_charity_pot": {"name": "Lush Charity Pot", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.lush.com/us/en_us/a/charity-pot"},
    "body_shop_activism": {"name": "The Body Shop Activism", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.thebodyshop.com/en-us/about-us/activism"},
    "cotopaxi_impact": {"name": "Cotopaxi Impact", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.cotopaxi.com/pages/impact"},
    "thinx_impact": {"name": "Thinx Impact", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.thinx.com/pages/social-impact"},
    "parker_clay": {"name": "Parker Clay Impact", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://parkerclay.com/pages/impact"},
    "tentree": {"name": "Tentree Impact", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.tentree.com/pages/impact-report"},
    "pura_vida_charity": {"name": "Pura Vida Charity", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.puravidabracelets.com/pages/charity"},
    "sand_cloud_charity": {"name": "Sand Cloud Charity", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.sandcloud.com/pages/save-the-fishies"},
    "sevenly": {"name": "Sevenly", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.sevenly.org/"},
    "newmans_own": {"name": "Newmans Own Foundation", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://newmansownfoundation.org/news/"},
    "red_org": {"name": "Project RED", "category": "Cause-Brand Impact", "type": "static_url", "tier": 2, "url": "https://www.red.org/news"},

    # --- Donation Tech Platforms (27 sources) ---
    "donatestock_blog": {"name": "DonateStock Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://donatestock.com/blog"},
    "givingblock_blog": {"name": "The Giving Block", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://thegivingblock.com/resources/blog/"},
    "engiven_blog": {"name": "Engiven", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.engiven.com/blog"},
    "gofundme_press": {"name": "GoFundMe Newsroom", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.gofundme.com/c/press-room"},
    "donorschoose_press": {"name": "DonorsChoose Press", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.donorschoose.org/about/press.html"},
    "nfg_blog": {"name": "Network for Good", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.networkforgood.com/blog/"},
    "fidelity_charitable_insights": {"name": "Fidelity Charitable Insights", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.fidelitycharitable.org/insights.html"},
    "schwab_charitable_insights": {"name": "Schwab Charitable Insights", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.schwabcharitable.org/insights"},
    "vanguard_charitable_insights": {"name": "Vanguard Charitable Insights", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.vanguardcharitable.org/insights"},
    "nptrust_daf_report": {"name": "NPTrust DAF Report", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.nptrust.org/reports/daf-report/"},
    "chariot_blog": {"name": "Chariot Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.givechariot.com/blog"},
    "pledge1pct_news": {"name": "Pledge 1 Percent News", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://pledge1percent.org/news/"},
    "benevity_blog": {"name": "Benevity Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://benevity.com/resources/blog"},
    "blackbaud_blog": {"name": "Blackbaud Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.blackbaud.com/blog"},
    "submittable_blog": {"name": "Submittable Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.submittable.com/blog/"},
    "percent_pledge": {"name": "Percent Pledge", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://percentpledge.org/blog/"},
    "givinga_blog": {"name": "Givinga Insights", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.givinga.com/insights/blog"},
    "groundswell_blog": {"name": "Groundswell Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://groundswell.io/blog/"},
    "millie_blog": {"name": "Millie Giving", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.milliegiving.com/blog"},
    "doublethedonation_blog": {"name": "Double the Donation", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://doublethedonation.com/blog/"},
    "virtue_impact_blog": {"name": "Virtue Impact Shopify", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.virtueimpact.com/blog"},
    "dailykarma_blog": {"name": "DailyKarma Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.dailykarma.com/blog/"},
    "beam_impact_blog": {"name": "Beam Impact Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.beamimpact.com/blog"},
    "getchange_blog": {"name": "Change Mastercard Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.getchange.io/blog"},
    "aspiration_press": {"name": "Aspiration Press", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.aspiration.com/press"},
    "acorns_press": {"name": "Acorns Press", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://www.acorns.com/press/"},
    "opencollective_blog": {"name": "OpenCollective Blog", "category": "Donation Tech Platforms", "type": "static_url", "tier": 2, "url": "https://opencollective.com/blog"},

    # --- Sustainability-at-Checkout (15 sources) ---
    "stripe_climate_customers": {"name": "Stripe Climate Customers", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://climate.stripe.com/"},
    "frontier_climate_news": {"name": "Frontier Climate Blog", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://frontierclimate.com/blog"},
    "ecocart_blog": {"name": "EcoCart Blog", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://ecocart.io/blog/"},
    "cloverly_blog": {"name": "Cloverly Blog", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://www.cloverly.com/blog"},
    "patch_io_blog": {"name": "Patch carbon API Blog", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://www.patch.io/blog"},
    "pachama_blog": {"name": "Pachama Insights", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://pachama.com/blog/"},
    "climate_neutral_blog": {"name": "Climate Neutral Certified", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://www.climateneutral.org/blog"},
    "watershed_blog": {"name": "Watershed Blog", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://watershed.com/blog"},
    "persefoni_blog": {"name": "Persefoni Insights", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://www.persefoni.com/blog"},
    "south_pole_news": {"name": "South Pole News", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://www.southpole.com/news"},
    "carbon_credits_news": {"name": "Carbon Credits News", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://carboncredits.com/news/"},
    "trellis_feed": {"name": "Trellis (formerly GreenBiz)", "category": "Sustainability-at-Checkout", "type": "rss", "tier": 2, "url": "https://trellis.net/feed/"},
    "sustainable_brands": {"name": "Sustainable Brands", "category": "Sustainability-at-Checkout", "type": "rss", "tier": 2, "url": "https://sustainablebrands.com/rss.xml"},
    "triple_pundit": {"name": "TriplePundit", "category": "Sustainability-at-Checkout", "type": "rss", "tier": 2, "url": "https://www.triplepundit.com/feed"},
    "threebl_media": {"name": "3BL Media News", "category": "Sustainability-at-Checkout", "type": "static_url", "tier": 2, "url": "https://www.3blmedia.com/news"},

    # --- Philanthropy Press (16 sources) ---
    "chronicle_philanthropy_fundraising": {"name": "Chronicle of Philanthropy: Fundraising", "category": "Philanthropy Press", "type": "static_url", "tier": 1, "url": "https://www.philanthropy.com/section/fundraising/53"},
    "nonprofit_times_feed": {"name": "NonProfit Times", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://thenonprofittimes.com/feed/"},
    "inside_philanthropy": {"name": "Inside Philanthropy", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://www.insidephilanthropy.com/home?format=rss"},
    "nonprofit_quarterly": {"name": "Nonprofit Quarterly", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://nonprofitquarterly.org/feed/"},
    "philanthropy_news_digest": {"name": "Philanthropy News Digest", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://philanthropynewsdigest.org/rss/feed/pnd-news"},
    "devex_news": {"name": "Devex", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://www.devex.com/news.rss"},
    "alliance_magazine": {"name": "Alliance Magazine", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://www.alliancemagazine.org/feed/"},
    "forbes_nonprofit_council": {"name": "Forbes Nonprofit Council", "category": "Philanthropy Press", "type": "rss", "tier": 2, "url": "https://www.forbes.com/sites/forbesnonprofitcouncil/feed/"},
    "nten": {"name": "NTEN", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://www.nten.org/feed/"},
    "nptechforgood": {"name": "Nonprofit Tech for Good", "category": "Philanthropy Press", "type": "rss", "tier": 2, "url": "https://www.nptechforgood.com/feed/"},
    "global_impact_blog": {"name": "Global Impact Greater Giving", "category": "Philanthropy Press", "type": "static_url", "tier": 2, "url": "https://charity.org/give-global-blog/"},
    "engage_for_good": {"name": "Engage for Good", "category": "Philanthropy Press", "type": "static_url", "tier": 1, "url": "https://engageforgood.com/blog/"},
    "selfish_giving": {"name": "Selfish Giving (Joe Waters)", "category": "Philanthropy Press", "type": "rss", "tier": 1, "url": "https://selfishgiving.com/feed/"},
    "mr_benchmarks": {"name": "M+R Benchmarks", "category": "Philanthropy Press", "type": "static_url", "tier": 1, "url": "https://mrbenchmarks.com/"},
    "agitator_donorvoice": {"name": "The Agitator / DonorVoice", "category": "Philanthropy Press", "type": "static_url", "tier": 2, "url": "https://agitator.thedonorvoice.com/"},
    "charity_navigator_news": {"name": "Charity Navigator News", "category": "Philanthropy Press", "type": "static_url", "tier": 2, "url": "https://www.charitynavigator.org/discover-charities/news/"},

    # --- Retail News (6 sources) ---
    "pymnts": {"name": "PYMNTS", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.pymnts.com/feed/"},
    "the_paypers": {"name": "The Paypers", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://thepaypers.com/feed"},
    "finextra": {"name": "Finextra", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://www.finextra.com/rss/headlines.aspx"},
    "tearsheet": {"name": "Tearsheet", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://tearsheet.co/feed/"},
    "retail_brew": {"name": "Retail Brew", "category": "Retail News", "type": "static_url", "tier": 2, "url": "https://www.retailbrew.com/"},
    "business_of_home": {"name": "Business of Home", "category": "Retail News", "type": "rss", "tier": 2, "url": "https://businessofhome.com/feeds/all"},

    # --- Consumer/CSR Research (15 sources) ---
    "cone_communications": {"name": "Cone Communications", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.conecomm.com/insights-1"},
    "edelman_trust": {"name": "Edelman Trust Barometer", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.edelman.com/trust/trust-barometer"},
    "porter_novelli": {"name": "Porter Novelli Intelligence", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.porternovelli.com/intelligence/"},
    "kantar_sustainability": {"name": "Kantar Sustainability", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.kantar.com/inspiration/sustainability"},
    "mckinsey_sustainability": {"name": "McKinsey Sustainability", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.mckinsey.com/capabilities/sustainability/our-insights"},
    "bcg_customer": {"name": "BCG Customer Insight", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.bcg.com/capabilities/customer-insight/overview"},
    "accenture_life_trends": {"name": "Accenture Life Trends", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.accenture.com/us-en/insights/song/accenture-life-trends"},
    "pew_religion": {"name": "Pew Religion and Charitable Giving", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.pewresearch.org/topic/religion/"},
    "ypulse_blog": {"name": "YPulse Blog", "category": "Consumer/CSR Research", "type": "static_url", "tier": 2, "url": "https://www.ypulse.com/blog/"},
    "morning_consult": {"name": "Morning Consult Brand", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://pro.morningconsult.com/articles"},
    "civic_science": {"name": "Civic Science Insights", "category": "Consumer/CSR Research", "type": "static_url", "tier": 2, "url": "https://civicscience.com/insights/"},
    "numerator_blog": {"name": "Numerator Insights", "category": "Consumer/CSR Research", "type": "static_url", "tier": 2, "url": "https://www.numerator.com/resources/blog/"},
    "first_insight": {"name": "First Insight Gen Z", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.firstinsight.com/white-papers-posts"},
    "ibm_ibv_sustainability": {"name": "IBM Institute Sustainability", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.ibm.com/thought-leadership/institute-business-value/en-us/topic/sustainability"},
    "wef_stakeholder_capitalism": {"name": "WEF Stakeholder Capitalism", "category": "Consumer/CSR Research", "type": "static_url", "tier": 1, "url": "https://www.weforum.org/stakeholdercapitalism/"},

    # --- Government Data (9 sources) ---
    "irs_eos": {"name": "IRS Tax Exempt Org Search", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://apps.irs.gov/app/eos/"},
    "irs_charities_news": {"name": "IRS Charities Newsroom", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://www.irs.gov/charities-non-profits"},
    "candid_apis": {"name": "Candid APIs", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://learn.candid.org/products/apis/"},
    "nasco_state": {"name": "NASCO state regulators", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://www.nasconet.org/"},
    "ncn_articles": {"name": "National Council of Nonprofits", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://www.councilofnonprofits.org/articles"},
    "bea_pce": {"name": "BEA Personal Consumption", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://apps.bea.gov/api/signup/"},
    "data_gov_charitable": {"name": "data.gov charitable", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://catalog.data.gov/dataset?q=charitable"},
    "ftc_press": {"name": "FTC Consumer Protection", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://www.ftc.gov/news-events/news/press-releases"},
    "charity_navigator_methodology": {"name": "Charity Navigator Methodology", "category": "Government Data", "type": "static_url", "tier": 1, "url": "https://www.charitynavigator.org/about-us/our-methodology/data-and-methodology"},

    # --- Press Wires (7 sources) ---
    "prnewswire_retail": {"name": "PR Newswire Retail", "category": "Press Wires", "type": "rss", "tier": 2, "url": "https://www.prnewswire.com/rss/consumer-products-retail-latest-news/retail-news.rss"},
    "prnewswire_tech": {"name": "PR Newswire Technology", "category": "Press Wires", "type": "rss", "tier": 2, "url": "https://www.prnewswire.com/rss/technology-latest-news/technology-newslist.rss"},
    "businesswire_retail": {"name": "Business Wire Retail", "category": "Press Wires", "type": "rss", "tier": 2, "url": "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeGVtRWA=="},
    "businesswire_online_retail": {"name": "Business Wire Online Retail", "category": "Press Wires", "type": "static_url", "tier": 2, "url": "https://www.businesswire.com/newsroom/industry/retail/online-retail"},
    "globenewswire_retail": {"name": "GlobeNewswire Retail", "category": "Press Wires", "type": "rss", "tier": 2, "url": "https://www.globenewswire.com/RssFeed/industry/9576-Retail/feedTitle/GlobeNewswire%20-%20Industry%20News%20on%20Retail"},
    "csrwire": {"name": "CSRwire", "category": "Press Wires", "type": "rss", "tier": 1, "url": "https://www.csrwire.com/press_releases.rss"},
    "justmeans_3bl": {"name": "Justmeans / 3BL", "category": "Press Wires", "type": "static_url", "tier": 2, "url": "https://www.3blmedia.com/news"},

    # --- Cause Reddit (10 sources) ---
    "reddit_nonprofit_main": {"name": "Reddit r/nonprofit", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/nonprofit/.rss"},
    "reddit_fundraising": {"name": "Reddit r/fundraising", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/fundraising/.rss"},
    "reddit_charitynavigator": {"name": "Reddit r/CharityNavigator", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/CharityNavigator/.rss"},
    "reddit_effectivealtruism": {"name": "Reddit r/EffectiveAltruism", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/EffectiveAltruism/.rss"},
    "reddit_socialenterprise": {"name": "Reddit r/socialenterprise", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/socialenterprise/.rss"},
    "reddit_sustainability_main": {"name": "Reddit r/sustainability", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/sustainability/.rss"},
    "reddit_ethicalfashion": {"name": "Reddit r/ethicalfashion", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/ethicalfashion/.rss"},
    "reddit_dtcmarketing": {"name": "Reddit r/DTCMarketing", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/DTCMarketing/.rss"},
    "reddit_wayfair": {"name": "Reddit r/wayfair", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/wayfair/.rss"},
    "reddit_personalfinance_daf": {"name": "Reddit r/personalfinance", "category": "Cause Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/personalfinance/.rss"},

    # ================================================================
    # 400-SOURCE RETAIL EXPANSION PACK (2026-04-29)
    # 386 new sources covering: Wayfair competitive set + retail IR,
    # home/furniture trade, retail tech vendors, payments/checkout,
    # analysts, supply chain, specialty verticals, international retail,
    # consultancies, deal intelligence, social listening, brand reddit,
    # retail operator reddit, and open data APIs.
    # ================================================================

    # --- Retail Competitive Set (50) ---
    "wayfair_sec": {"name": "Wayfair IR / SEC Filings", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.wayfair.com/sec-filings"},
    "wsm_ir": {"name": "Williams-Sonoma IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.williams-sonomainc.com/news-events/press-releases"},
    "rh_ir": {"name": "RH Restoration Hardware IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.rh.com/news-events/press-releases"},
    "ikea_newsroom": {"name": "IKEA Newsroom", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://newsroom.inter.ikea.com/"},
    "ikea_annual": {"name": "Inter IKEA annual reports", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://www.inter.ikea.com/en/performance"},
    "ashley_press": {"name": "Ashley Furniture press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.ashleyfurnitureindustries.com/about-us/news.html"},
    "lzb_ir": {"name": "La-Z-Boy IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investors.la-z-boy.com/financials/sec-filings"},
    "hoft_ir": {"name": "Hooker Furnishings IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.hookerfurnishings.com/"},
    "etd_ir": {"name": "Ethan Allen IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.ethanallen.com/"},
    "mlkn_ir": {"name": "MillerKnoll IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.millerknoll.com/news-and-events/news-releases"},
    "scs_ir": {"name": "Steelcase IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.steelcase.com/news-events/press-releases"},
    "hni_ir": {"name": "HNI Corp IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://www.hnicorp.com/investor-information/press-releases"},
    "kirk_ir": {"name": "Kirklands IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.kirklands.com/financials/sec-filings"},
    "athome_press": {"name": "At Home press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.athome.com/about-us"},
    "biglots_ir": {"name": "Big Lots IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://www.biglots.com/corporate/about-us/press-releases"},
    "tuesdaymorning_press": {"name": "Tuesday Morning press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.tuesdaymorning.com/"},
    "crateandbarrel_press": {"name": "Crate and Barrel press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.crateandbarrel.com/about-us/our-story"},
    "arhs_ir": {"name": "Arhaus IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investors.arhaus.com/news-events/press-releases"},
    "love_ir": {"name": "Lovesac IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.lovesac.com/financials/sec-filings"},
    "fnd_ir": {"name": "Floor and Decor IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.flooranddecor.com/news-events/press-releases"},
    "ttsh_ir": {"name": "Tile Shop IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investors.tileshop.com/news-events/news-releases"},
    "ll_flooring_press": {"name": "LL Flooring press", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investors.llflooring.com/news"},
    "byon_ir": {"name": "Beyond Inc BBBY IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investors.beyond.com/sec-filings/all-sec-filings"},
    "tjx_ir": {"name": "TJX Companies IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.tjx.com/news/news-details"},
    "rost_ir": {"name": "Ross Stores IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://corp.rossstores.com/investors/financial-information/press-releases"},
    "burl_ir": {"name": "Burlington Stores IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://www.burlingtoninvestors.com/news-and-events/press-releases"},
    "walmart_ir": {"name": "Walmart IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://corporate.walmart.com/news"},
    "target_ir": {"name": "Target IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://corporate.target.com/press"},
    "cost_ir": {"name": "Costco IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.costco.com/news/financial-news"},
    "amzn_ir": {"name": "Amazon IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.aboutamazon.com/news-release/news-release-details/default.aspx"},
    "hd_ir": {"name": "Home Depot IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.homedepot.com/news/press-releases"},
    "low_ir": {"name": "Lowes IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://corporate.lowes.com/newsroom"},
    "tsco_ir": {"name": "Tractor Supply IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://ir.tractorsupply.com/financial-news/press-releases"},
    "harborfreight_press": {"name": "Harbor Freight press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.harborfreight.com/about-us"},
    "shw_ir": {"name": "Sherwin-Williams IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investors.sherwin-williams.com/news-and-events/press-releases"},
    "dg_ir": {"name": "Dollar General IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.dollargeneral.com/websites/dollargeneral/English/2120/news-release.html"},
    "dltr_ir": {"name": "Dollar Tree IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://corporate.dollartree.com/newsroom/press-releases"},
    "five_ir": {"name": "Five Below IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.fivebelow.com/financials-filings/press-releases"},
    "macys_ir": {"name": "Macys IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://www.macysinc.com/news-media/press-releases"},
    "kss_ir": {"name": "Kohls IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://corporate.kohls.com/news/all-news.html"},
    "jwn_ir": {"name": "Nordstrom IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://press.nordstrom.com/news-releases"},
    "jcpenney_press": {"name": "JCPenney Newsroom", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://corporate.jcpenney.com/newsroom/press-releases"},
    "belk_press": {"name": "Belk press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.belk.com/customer-service/press-releases.html"},
    "dds_ir": {"name": "Dillards IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.dillards.com/news/news-details"},
    "saks_press": {"name": "Saks press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.saks.com/c/about/press-releases"},
    "neiman_press": {"name": "Neiman Marcus press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.neimanmarcusgroup.com/press-releases"},
    "tcs_ir": {"name": "Container Store IR", "category": "Retail Competitive Set", "type": "static_url", "tier": 1, "url": "https://investor.containerstore.com/news-events/press-releases"},
    "bollandbranch_press": {"name": "Boll and Branch press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.bollandbranch.com/press"},
    "brooklinen_press": {"name": "Brooklinen press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.brooklinen.com/pages/in-the-press"},
    "parachute_press": {"name": "Parachute Home press", "category": "Retail Competitive Set", "type": "static_url", "tier": 2, "url": "https://www.parachutehome.com/press"},

    # --- Home/Furniture Trade (39) ---
    "furniture_today": {"name": "Furniture Today", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.furnituretoday.com/feed/"},
    "home_news_now": {"name": "Home News Now", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://homenewsnow.com/feed/"},
    "hfn_digital": {"name": "Home Furnishings News HFN", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://hfndigital.com/feed/"},
    "home_textiles_today": {"name": "Home Textiles Today", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.hometextilestoday.com/feed/"},
    "furniture_news_uk": {"name": "Furniture News UK", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.furniturenews.net/feed/"},
    "casual_living": {"name": "Casual Living", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://casualnewsnow.com/"},
    "big_furniture_group": {"name": "Big Furniture Group", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.bigfurnituregroup.com/feed"},
    "designers_today": {"name": "Designers Today", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.designerstoday.com/"},
    "kbb_online": {"name": "Kitchen and Bath Business", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.kbbonline.com/rss.xml"},
    "kbdn": {"name": "Kitchen and Bath Design News", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.kbdn.net/rss.xml"},
    "hospitality_design": {"name": "Hospitality Design", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://hospitalitydesign.com/feed/"},
    "ad_pro": {"name": "Architectural Digest Pro", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.architecturaldigest.com/topic/ad-pro"},
    "ad_main": {"name": "Architectural Digest", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.architecturaldigest.com/feed/rss"},
    "interior_design_mag": {"name": "Interior Design Magazine", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://interiordesign.net/feed/"},
    "dezeen": {"name": "Dezeen", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.dezeen.com/feed/"},
    "wallpaper_mag": {"name": "Wallpaper", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.wallpaper.com/rss"},
    "dwell": {"name": "Dwell", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.dwell.com/feeds/all.rss"},
    "housebeautiful": {"name": "House Beautiful", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.housebeautiful.com/rss/all.xml/"},
    "elledecor": {"name": "Elle Decor", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.elledecor.com/rss/all.xml/"},
    "veranda": {"name": "Veranda", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.veranda.com/rss/all.xml/"},
    "apartment_therapy": {"name": "Apartment Therapy", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.apartmenttherapy.com/main.rss"},
    "remodelista": {"name": "Remodelista", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.remodelista.com/feed/"},
    "houzz_pro": {"name": "Houzz Pro", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.houzz.com/pro"},
    "the_spruce": {"name": "The Spruce", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.thespruce.com/feeds/latest"},
    "curbed_vox": {"name": "Curbed", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.curbed.com/rss/index.xml"},
    "designboom": {"name": "DesignBoom", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.designboom.com/feed/"},
    "design_milk": {"name": "Design Milk", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://design-milk.com/feed/"},
    "core77": {"name": "Core77", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.core77.com/feed"},
    "yanko_design": {"name": "Yanko Design", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://www.yankodesign.com/feed/"},
    "ahfa_news": {"name": "AHFA news", "category": "Home/Furniture Trade", "type": "static_url", "tier": 1, "url": "https://www.ahfa.us/news/"},
    "hfa_blog": {"name": "Home Furnishings Association", "category": "Home/Furniture Trade", "type": "rss", "tier": 2, "url": "https://myhfa.org/blog/feed/"},
    "icfa_news": {"name": "Intl Casual Furnishings Assn", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://icfa.org/news/"},
    "wfca_news": {"name": "World Floor Covering Assn", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://wfca.org/news/"},
    "asid_news": {"name": "ASID news", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.asid.org/news"},
    "iida_news": {"name": "IIDA news", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://iida.org/news"},
    "highpoint_market": {"name": "High Point Market press", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.highpointmarket.org/press"},
    "vegas_market": {"name": "Las Vegas Market press", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.lasvegasmarket.com/press"},
    "andmore_news": {"name": "Andmore news", "category": "Home/Furniture Trade", "type": "static_url", "tier": 2, "url": "https://www.andmore.com/news/"},
    "stump_furniture_ma": {"name": "Stump and Co furniture M&A", "category": "Home/Furniture Trade", "type": "rss", "tier": 1, "url": "https://www.stumpandcompany.com/feed/"},

    # --- Retail Tech Vendors (35) ---
    "tost_ir": {"name": "Toast IR", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://investors.toasttab.com/news-events/news-releases"},
    "lspd_ir": {"name": "Lightspeed IR", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://investors.lightspeedhq.com/news-events/press-releases"},
    "sq_ir": {"name": "Square Block IR", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://investors.block.xyz/financials/sec-filings/"},
    "clover_news": {"name": "Clover Fiserv news", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.clover.com/news"},
    "ncrvoyix_press": {"name": "NCR Voyix press", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.ncrvoyix.com/news-releases"},
    "diebold_press": {"name": "Diebold Nixdorf press", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.dieboldnixdorf.com/en-us/about-us/newsroom/news-releases"},
    "zbra_ir": {"name": "Zebra Tech IR", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://investors.zebra.com/news-and-events/press-releases"},
    "honeywell_pss": {"name": "Honeywell PSS", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://sps.honeywell.com/us/en/about-us/newsroom"},
    "manh_ir": {"name": "Manhattan Associates IR", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://ir.manh.com/news-releases"},
    "aptos_blog": {"name": "Aptos retail blog", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.aptos.com/insights/blog/"},
    "mi9_blog": {"name": "Mi9 Retail blog", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.mi9retail.com/blog/"},
    "relex_blog": {"name": "RELEX Solutions blog", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.relexsolutions.com/resources/blog/"},
    "blueyonder_blog": {"name": "Blue Yonder blog", "category": "Retail Tech Vendors", "type": "rss", "tier": 2, "url": "https://blog.blueyonder.com/feed/"},
    "o9_blog": {"name": "o9 Solutions blog", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://o9solutions.com/blog/"},
    "vusion_news": {"name": "VusionGroup ESL", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.vusion.com/news-events"},
    "pricer_press": {"name": "Pricer ESL press", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.pricer.com/press-releases/"},
    "trax_news": {"name": "Trax Retail news", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://traxretail.com/news/"},
    "standard_ai_press": {"name": "Standard AI press", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://standard.ai/news"},
    "aifi_news": {"name": "AiFi press", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://aifi.com/news/"},
    "grabango_news": {"name": "Grabango", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.grabango.com/news"},
    "trigo_blog": {"name": "Trigo Retail", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.trigoretail.com/blog"},
    "caper_news": {"name": "Caper Instacart", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.caper.ai/news/"},
    "focal_blog": {"name": "Focal Systems Walmart", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://focal.systems/blog/"},
    "pensa_news": {"name": "Pensa Systems", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.pensasystems.com/news"},
    "bossanova_news": {"name": "Bossa Nova Robotics", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.bossanova.com/news/"},
    "simbe_news": {"name": "Simbe Robotics Tally", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.simberobotics.com/news/"},
    "braincorp_blog": {"name": "Brain Corp", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.braincorp.com/blog/"},
    "ocado_news": {"name": "Ocado Technology", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://www.ocadogroup.com/about-us/our-news"},
    "autostore_insights": {"name": "AutoStore press", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.autostoresystem.com/insights"},
    "sym_ir": {"name": "Symbotic IR", "category": "Retail Tech Vendors", "type": "static_url", "tier": 1, "url": "https://ir.symbotic.com/press-releases"},
    "greyorange_blog": {"name": "GreyOrange", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.greyorange.com/blog/"},
    "locus_news": {"name": "Locus Robotics", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://locusrobotics.com/news/"},
    "six_river": {"name": "6 River Systems Shopify", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://6river.com/category/news/"},
    "berkshire_grey_news": {"name": "Berkshire Grey", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://www.berkshiregrey.com/news/"},
    "fabric_blog": {"name": "Fabric micro-fulfillment", "category": "Retail Tech Vendors", "type": "static_url", "tier": 2, "url": "https://fabric.inc/blog"},

    # --- Payments & Checkout (34) ---
    "payments_dive": {"name": "Payments Dive", "category": "Payments & Checkout", "type": "rss", "tier": 2, "url": "https://www.paymentsdive.com/feeds/news/"},
    "digital_transactions": {"name": "Digital Transactions", "category": "Payments & Checkout", "type": "rss", "tier": 2, "url": "https://www.digitaltransactions.net/feed/"},
    "americanbanker_payments": {"name": "American Banker Payments", "category": "Payments & Checkout", "type": "rss", "tier": 2, "url": "https://www.americanbanker.com/payments/feed"},
    "glenbrook_payments": {"name": "Glenbrook Payments News", "category": "Payments & Checkout", "type": "static_url", "tier": 2, "url": "https://glenbrook.com/payments-news/all-payments-news/"},
    "mobile_payments_today": {"name": "Mobile Payments Today", "category": "Payments & Checkout", "type": "rss", "tier": 2, "url": "https://www.mobilepaymentstoday.com/rss/"},
    "retail_banker_intl": {"name": "Retail Banker International", "category": "Payments & Checkout", "type": "rss", "tier": 2, "url": "https://www.retailbankerinternational.com/feed/"},
    "adyen_press": {"name": "Adyen press", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.adyen.com/press-and-media"},
    "worldpay_fis": {"name": "Worldpay FIS press", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.fisglobal.com/about-us/media-room"},
    "fiserv_press": {"name": "Fiserv press", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://newsroom.fiserv.com/news-releases"},
    "gpn_ir": {"name": "Global Payments IR", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://investors.globalpayments.com/news-releases"},
    "visa_blog": {"name": "Visa Business News", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://usa.visa.com/visa-everywhere/blog.html"},
    "mastercard_press": {"name": "Mastercard Newsroom", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.mastercard.com/news/press/"},
    "amex_press": {"name": "American Express Newsroom", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://about.americanexpress.com/newsroom/press-releases/default.aspx"},
    "discover_press": {"name": "Discover Newsroom", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://investorrelations.discover.com/newsroom/press-releases/"},
    "paypal_newsroom_rss": {"name": "PayPal Newsroom RSS", "category": "Payments & Checkout", "type": "rss", "tier": 1, "url": "https://newsroom.paypal-corp.com/rss-feeds"},
    "afrm_ir": {"name": "Affirm IR", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://investors.affirm.com/press-releases"},
    "afterpay_block": {"name": "Afterpay Block press", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://block.xyz/press"},
    "sezl_ir": {"name": "Sezzle IR", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://investors.sezzle.com/news-events/press-releases"},
    "zip_ir": {"name": "Zip Co IR", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://zip.co/us/about-us/investor-relations"},
    "splitit_press": {"name": "Splitit press", "category": "Payments & Checkout", "type": "static_url", "tier": 2, "url": "https://splitit.com/press-releases/"},
    "shop_pay_editions": {"name": "Shop Pay Shopify Editions", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.shopify.com/editions"},
    "bolt_blog": {"name": "Bolt Commerce blog", "category": "Payments & Checkout", "type": "static_url", "tier": 2, "url": "https://www.bolt.com/blog"},
    "checkout_press": {"name": "Checkout.com press", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.checkout.com/about-us/news"},
    "stripe_press": {"name": "Stripe Press", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://stripe.com/newsroom"},
    "mq_ir": {"name": "Marqeta IR", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://investors.marqeta.com/press-releases"},
    "lithic_blog": {"name": "Lithic blog", "category": "Payments & Checkout", "type": "static_url", "tier": 2, "url": "https://lithic.com/blog"},
    "plaid_news": {"name": "Plaid Newsroom", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://plaid.com/news/"},
    "rskd_ir": {"name": "Riskified IR", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://ir.riskified.com/news-events/press-releases"},
    "forter_blog": {"name": "Forter blog", "category": "Payments & Checkout", "type": "static_url", "tier": 2, "url": "https://www.forter.com/blog/"},
    "signifyd_blog": {"name": "Signifyd blog", "category": "Payments & Checkout", "type": "static_url", "tier": 2, "url": "https://www.signifyd.com/blog/"},
    "paze_blog": {"name": "Paze CMA wallet", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.paze.com/blog"},
    "clearinghouse_press": {"name": "The Clearing House", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.theclearinghouse.org/payment-systems"},
    "fednow_news": {"name": "Federal Reserve FedNow", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://www.frbservices.org/financial-services/fednow/news.html"},
    "nilson_archive": {"name": "Nilson Report headlines", "category": "Payments & Checkout", "type": "static_url", "tier": 1, "url": "https://nilsonreport.com/publication_newsletter_issue_archive.php"},

    # --- Retail Analysts (27) ---
    "forrester_cx_index": {"name": "Forrester CX Index", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.forrester.com/research/cxindex/"},
    "idc_retail": {"name": "IDC Retail Insights", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.idc.com/itexecutive/research/retail"},
    "coresight_research": {"name": "Coresight Research", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://coresight.com/research/"},
    "globaldata_retail": {"name": "GlobalData Retail", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.globaldata.com/industries-we-cover/retail/"},
    "wgsn_insight": {"name": "WGSN Insight", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.wgsn.com/en/products/insight"},
    "mintel_retail": {"name": "Mintel Retail Reports", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.mintel.com/insights/retail"},
    "euromonitor_retail": {"name": "Euromonitor Retail", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.euromonitor.com/retail"},
    "circana_insights": {"name": "Circana NPD Insights", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.circana.com/intelligence/insights/"},
    "niq_insights": {"name": "NIQ NielsenIQ Insights", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://nielseniq.com/global/en/insights/"},
    "circana_news": {"name": "Circana news/press", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.circana.com/intelligence/news-press-releases/"},
    "placer_blog": {"name": "Placer.ai blog", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.placer.ai/blog"},
    "placer_research": {"name": "Placer.ai research reports", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.placer.ai/research-reports"},
    "safegraph_blog": {"name": "SafeGraph Insights", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.safegraph.com/blog"},
    "foursquare_blog": {"name": "Foursquare Insights", "category": "Retail Analysts", "type": "static_url", "tier": 2, "url": "https://location.foursquare.com/resources/blog/"},
    "earnest_analytics": {"name": "Earnest Analytics", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.earnestanalytics.com/insights"},
    "second_measure": {"name": "Bloomberg Second Measure", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://secondmeasure.com/datapoints/"},
    "yipit": {"name": "Yipit Data", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://yipitdata.com/research/"},
    "consumer_edge": {"name": "Consumer Edge Insights", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://consumer-edge.com/insights/"},
    "m_science": {"name": "M Science", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.mscience.com/insights"},
    "adobe_dei": {"name": "Adobe Digital Economy Index", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://business.adobe.com/resources/digital-economy-index.html"},
    "salesforce_shopping_index": {"name": "Salesforce Shopping Index", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.salesforce.com/news/stories/shopping-index/"},
    "shopify_commerce_trends": {"name": "Shopify Commerce Trends", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.shopify.com/enterprise/blog/commerce-trends"},
    "mastercard_spendingpulse": {"name": "Mastercard SpendingPulse", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.mastercardservices.com/en/reports-insights"},
    "visa_smi": {"name": "Visa Spending Momentum Index", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://usa.visa.com/partner-with-us/payment-technology/visa-spending-momentum-index.html"},
    "conf_board_consumer": {"name": "Conference Board Consumer Confidence", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://www.conference-board.org/topics/consumer-confidence"},
    "umich_consumer_surveys": {"name": "U Michigan Consumer Surveys", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://data.sca.isr.umich.edu/"},
    "nrf_economic_review": {"name": "NRF Monthly Economic Review", "category": "Retail Analysts", "type": "static_url", "tier": 1, "url": "https://nrf.com/research/monthly-economic-review"},

    # --- Supply Chain (25) ---
    "supply_chain_dive": {"name": "Supply Chain Dive", "category": "Supply Chain", "type": "rss", "tier": 1, "url": "https://www.supplychaindive.com/feeds/news/"},
    "freightwaves": {"name": "FreightWaves", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://www.freightwaves.com/feed"},
    "the_loadstar": {"name": "The Loadstar", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://theloadstar.com/feed/"},
    "american_shipper": {"name": "American Shipper", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://www.freightwaves.com/category/american-shipper/feed"},
    "joc": {"name": "Journal of Commerce", "category": "Supply Chain", "type": "rss", "tier": 1, "url": "https://www.joc.com/rss.xml"},
    "mmh": {"name": "Modern Materials Handling", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://www.mmh.com/rss/all_articles"},
    "inbound_logistics": {"name": "Inbound Logistics", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://www.inboundlogistics.com/feed"},
    "logistics_bureau": {"name": "Logistics Bureau", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://www.logisticsbureau.com/feed/"},
    "mhlnews": {"name": "Material Handling and Logistics", "category": "Supply Chain", "type": "rss", "tier": 2, "url": "https://www.mhlnews.com/rss.xml"},
    "rla_news": {"name": "Reverse Logistics Association", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://rla.org/news"},
    "cscmp_news": {"name": "CSCMP news", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://www.cscmp.org/CSCMP/News/News.aspx"},
    "nptc_news": {"name": "Natl Private Truck Council", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.nptc.org/news/"},
    "ata_news": {"name": "American Trucking Assn", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://www.trucking.org/news-insights"},
    "last_mile_blog": {"name": "Last Mile Experts", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://lastmileexperts.com/blog/"},
    "pitney_shipping_index": {"name": "Pitney Bowes Parcel Shipping Index", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://www.pitneybowes.com/us/shipping-index.html"},
    "project44_blog": {"name": "Project44 blog", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.project44.com/learn/blog"},
    "fourkites_blog": {"name": "FourKites blog", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.fourkites.com/blog/"},
    "flexe_insights": {"name": "Flexe insights", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.flexe.com/insights"},
    "shipbob_blog": {"name": "ShipBob blog", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.shipbob.com/blog/"},
    "shipstation_blog": {"name": "ShipStation blog", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.shipstation.com/blog/"},
    "easyship_blog": {"name": "Easyship blog", "category": "Supply Chain", "type": "static_url", "tier": 2, "url": "https://www.easyship.com/blog"},
    "xpo_ir": {"name": "XPO Logistics IR", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://investors.xpo.com/news-releases"},
    "saia_ir": {"name": "Saia IR", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://investor.saia.com/news-and-events/press-releases"},
    "wern_ir": {"name": "Werner Enterprises IR", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://investor.werner.com/news-events/press-releases"},
    "chrw_ir": {"name": "C.H. Robinson IR", "category": "Supply Chain", "type": "static_url", "tier": 1, "url": "https://investor.chrobinson.com/financial-information/news-releases"},

    # --- Specialty Verticals (23) ---
    "beauty_independent": {"name": "Beauty Independent", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.beautyindependent.com/feed/"},
    "glossy_beauty": {"name": "Glossy Beauty", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://www.glossy.co/category/beauty/"},
    "wwd_beauty": {"name": "WWD Beauty", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://wwd.com/beauty-industry-news/"},
    "cew_news": {"name": "CEW Cosmetic Executive Women", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://cew.org/cew-newsroom/"},
    "happi_rss": {"name": "Happi personal care", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.happi.com/rss/feed/"},
    "cosmetics_business": {"name": "Cosmetics Business", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.cosmeticsbusiness.com/feeds/news/"},
    "chain_drug_review": {"name": "Chain Drug Review", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://chaindrugreview.com/category/news/"},
    "pharmacy_times": {"name": "Pharmacy Times", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.pharmacytimes.com/feed.rss"},
    "shelby_report": {"name": "Shelby Report grocery", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.theshelbyreport.com/feed/"},
    "winsight_grocery": {"name": "Winsight Grocery Business", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.winsightgrocerybusiness.com/rss-feeds"},
    "nacs_online": {"name": "NACS Convenience Online", "category": "Specialty Verticals", "type": "static_url", "tier": 1, "url": "https://www.convenience.org/Media/News-Releases"},
    "pet_business": {"name": "Pet Business", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://www.petbusiness.com/rss.xml"},
    "pet_product_news": {"name": "Pet Product News", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://www.petproductnews.com/news"},
    "sportsone_source": {"name": "Sporting Goods Dealer", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://sportsonesource.com/news/"},
    "sgb_online": {"name": "SGB Media sporting goods", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://sgbonline.com/feed/"},
    "footwearplus": {"name": "Footwear Plus", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://footwearplusmagazine.com/news/"},
    "toy_book": {"name": "Toy Insider Toy Book", "category": "Specialty Verticals", "type": "rss", "tier": 2, "url": "https://toybook.com/feed/"},
    "toy_hobby_au": {"name": "Toy and Hobby Retailer", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://toyandhobbyretailer.com.au/news/"},
    "hobby_merchandiser": {"name": "Hobby Merchandiser", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://hobbymerchandiser.com/news/"},
    "kids_today": {"name": "Kids Today", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://www.kidstodayonline.com/news/"},
    "earnshaws": {"name": "Earnshaws kids fashion", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://www.earnshaws.com/news/"},
    "oia_outdoor": {"name": "Outdoor Industry Association", "category": "Specialty Verticals", "type": "static_url", "tier": 1, "url": "https://outdoorindustry.org/article/"},
    "outside_business_journal": {"name": "Outside Business Journal Snews", "category": "Specialty Verticals", "type": "static_url", "tier": 2, "url": "https://www.outsidebusinessjournal.com/"},

    # --- International Retail (25) ---
    "retail_week_uk_main": {"name": "Retail Week UK", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.retail-week.com/feeds/feed.rss"},
    "drapers_uk": {"name": "Drapers UK fashion", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.drapersonline.com/feed"},
    "the_grocer_uk": {"name": "The Grocer UK", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.thegrocer.co.uk/rss/all-news/512.rss"},
    "retail_gazette": {"name": "Retail Gazette UK", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.retailgazette.co.uk/feed/"},
    "internet_retailing_eu": {"name": "Internet Retailing UK EU", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://internetretailing.net/feed"},
    "chargedretail": {"name": "Chargedretail UK", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.chargedretail.co.uk/feed/"},
    "textilwirtschaft_de": {"name": "TextilWirtschaft Germany", "category": "International Retail", "type": "static_url", "tier": 2, "url": "https://www.textilwirtschaft.de/"},
    "ehi_de": {"name": "EHI Retail Institute Germany", "category": "International Retail", "type": "static_url", "tier": 1, "url": "https://www.ehi.org/en/press"},
    "lsa_conso_fr": {"name": "LSA Conso France", "category": "International Retail", "type": "static_url", "tier": 2, "url": "https://www.lsa-conso.fr/"},
    "retail_detail_benelux": {"name": "Retail Detail Benelux", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.retaildetail.eu/feed/"},
    "retail_insider_ca": {"name": "Retail Insider Canada", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://retail-insider.com/feed/"},
    "canadian_grocer": {"name": "Canadian Grocer", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://canadiangrocer.com/feed"},
    "inside_retail_au": {"name": "Inside Retail Australia", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://insideretail.com.au/feed/"},
    "inside_retail_asia": {"name": "Inside Retail Asia", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://insideretail.asia/feed/"},
    "cna_business": {"name": "Channel News Asia Business", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=10416"},
    "krasia": {"name": "KrASIA Asia tech retail", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://kr-asia.com/feed"},
    "tech_in_asia": {"name": "Tech in Asia", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://www.techinasia.com/rss"},
    "pandaily": {"name": "Pandaily China", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://pandaily.com/feed/"},
    "yicai_global": {"name": "Yicai Global China", "category": "International Retail", "type": "static_url", "tier": 1, "url": "https://www.yicaiglobal.com/news"},
    "caixin_global": {"name": "Caixin Global", "category": "International Retail", "type": "rss", "tier": 1, "url": "https://www.caixinglobal.com/news.xml"},
    "nikkei_retail": {"name": "Nikkei Asia Retail", "category": "International Retail", "type": "static_url", "tier": 1, "url": "https://asia.nikkei.com/Business/Retail"},
    "latam_intersect": {"name": "LatAm Intersect Retail", "category": "International Retail", "type": "static_url", "tier": 2, "url": "https://latamintersect.com/category/insights/"},
    "bloomberg_linea": {"name": "Bloomberg Linea LatAm", "category": "International Retail", "type": "static_url", "tier": 1, "url": "https://www.bloomberglinea.com/"},
    "dc_brazil": {"name": "Diario do Comercio Brazil", "category": "International Retail", "type": "static_url", "tier": 2, "url": "https://www.diariodocomercio.com.br/"},
    "retail_asia_mag": {"name": "Retail Asia magazine", "category": "International Retail", "type": "rss", "tier": 2, "url": "https://retailasia.com/rss.xml"},

    # --- Strategy Consultancies (24) ---
    "kearney_consumer": {"name": "Kearney Consumer Institute", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.kearney.com/consumer-retail"},
    "occ_strategy": {"name": "OC&C Strategy Retail", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.occstrategy.com/en/expertise/consumer-retail"},
    "alixpartners_retail": {"name": "AlixPartners Retail", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.alixpartners.com/industries/consumer-products-and-retail/"},
    "rsm_retail": {"name": "RSM Retail Insights", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://rsmus.com/insights/industries/consumer-products.html"},
    "kpmg_consumer": {"name": "KPMG Consumer Retail", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://kpmg.com/us/en/industries/consumer-retail.html"},
    "ey_future_consumer": {"name": "EY Future Consumer Index", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.ey.com/en_us/consumer-products-retail/future-consumer-index"},
    "capgemini_retail": {"name": "Capgemini Retail Research", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.capgemini.com/insights/research-library/?_industry=retail"},
    "wipro_retail": {"name": "Wipro Retail Insights", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.wipro.com/retail/insights/"},
    "cognizant_retail": {"name": "Cognizant Retail", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.cognizant.com/us/en/industries/retail"},
    "publicis_sapient_retail": {"name": "Publicis Sapient Retail", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.publicissapient.com/industries/retail"},
    "material_plus": {"name": "LRW Material Plus", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.materialplus.io/insights"},
    "lippincott": {"name": "Lippincott", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://lippincott.com/insight/"},
    "interbrand": {"name": "Interbrand Best Global Brands", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://interbrand.com/thinking/"},
    "siegel_gale": {"name": "Siegel+Gale Simplicity Index", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.siegelgale.com/insights/"},
    "landor_fitch": {"name": "Landor & Fitch", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://landorandfitch.com/en/thinking"},
    "wolffolins": {"name": "Wolff Olins", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.wolffolins.com/views"},
    "rga_future": {"name": "R/GA FutureVision", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.rga.com/futurevision"},
    "huge_articles": {"name": "Huge", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.hugeinc.com/articles"},
    "code_and_theory": {"name": "Code and Theory", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.codeandtheory.com/thinking"},
    "wpromote_blog": {"name": "Wpromote digital marketing", "category": "Strategy Consultancies", "type": "static_url", "tier": 2, "url": "https://www.wpromote.com/blog"},
    "tinuiti_blog": {"name": "Tinuiti performance marketing", "category": "Strategy Consultancies", "type": "static_url", "tier": 2, "url": "https://tinuiti.com/blog/"},
    "ctc_coachs_corner": {"name": "Common Thread Coachs Corner", "category": "Strategy Consultancies", "type": "static_url", "tier": 2, "url": "https://commonthreadco.com/blogs/coachs-corner"},
    "shopify_plus_blog": {"name": "Shopify Plus blog", "category": "Strategy Consultancies", "type": "static_url", "tier": 1, "url": "https://www.shopify.com/plus/blog"},
    "commercetools_blog": {"name": "commercetools blog", "category": "Strategy Consultancies", "type": "static_url", "tier": 2, "url": "https://commercetools.com/blog"},

    # --- Retail Deal Intelligence (25) ---
    "pymnts_retail": {"name": "PYMNTS Retail", "category": "Retail Deal Intelligence", "type": "rss", "tier": 2, "url": "https://www.pymnts.com/category/retail/feed/"},
    "bloomberg_retail": {"name": "Bloomberg Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.bloomberg.com/markets/sectors/retail"},
    "reuters_retail": {"name": "Reuters Retail and Consumer", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.reuters.com/business/retail-consumer/"},
    "wsj_retail": {"name": "WSJ Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.wsj.com/news/business/retail-consumer-products"},
    "ft_retail": {"name": "FT Retail and Consumer", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.ft.com/retail-consumer"},
    "cnbc_retail": {"name": "CNBC Retail", "category": "Retail Deal Intelligence", "type": "rss", "tier": 1, "url": "https://www.cnbc.com/id/10000113/device/rss/rss.html"},
    "forbes_retail": {"name": "Forbes Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://www.forbes.com/retail/"},
    "fortune_retail": {"name": "Fortune Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://fortune.com/section/retail/"},
    "crains_chicago": {"name": "Crains Chicago Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://www.chicagobusiness.com/retail-products"},
    "boston_globe_business": {"name": "Boston Globe Business", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://www.bostonglobe.com/business/"},
    "the_information_commerce": {"name": "The Information Commerce", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.theinformation.com/topics/commerce"},
    "axios_business": {"name": "Axios Business Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://www.axios.com/business"},
    "modern_retail_daily": {"name": "Modern Retail Daily", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://www.modernretail.co/category/news/"},
    "robin_report_main": {"name": "Robin Report Substack", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://therobinreport.com/"},
    "puck_lauren_sherman": {"name": "Puck Lauren Sherman", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://puck.news/author/lauren-sherman/"},
    "offpricenews": {"name": "Off Price News", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://offpricenews.com/"},
    "retaildive_bankruptcy": {"name": "RetailDIVE Bankruptcy tracker", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.retaildive.com/topic/bankruptcy/"},
    "debtwire_retail": {"name": "Debtwire Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.debtwire.com/sectors/consumer-retail"},
    "pitchbook_retail": {"name": "PitchBook Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://pitchbook.com/news/articles?industry=Consumer%20Products%20and%20Services"},
    "cb_insights_retail": {"name": "CB Insights Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.cbinsights.com/research-retail"},
    "crunchbase_retail": {"name": "Crunchbase News Retail", "category": "Retail Deal Intelligence", "type": "rss", "tier": 2, "url": "https://news.crunchbase.com/feed/?cat=retail"},
    "reorg_research": {"name": "Reorg Bankruptcy Research", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://reorg.com/news-and-research/"},
    "mergermarket_consumer": {"name": "Mergermarket Consumer", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 1, "url": "https://www.iongroup.com/news/?_sft_category=consumer"},
    "dealstreet_asia_retail": {"name": "DealStreetAsia Retail", "category": "Retail Deal Intelligence", "type": "static_url", "tier": 2, "url": "https://www.dealstreetasia.com/category/sector/retail"},
    "retailtech_innovation_hub": {"name": "Retail Tech Innovation Hub RSS", "category": "Retail Deal Intelligence", "type": "rss", "tier": 2, "url": "https://retailtechinnovationhub.com/home?format=rss"},

    # --- Social Listening Pro (19) ---
    "tiktok_creative_center": {"name": "TikTok Creative Center", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://ads.tiktok.com/business/creativecenter/"},
    "tiktok_business_blog_main": {"name": "TikTok for Business", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://www.tiktok.com/business/en-US/blog"},
    "pinterest_predicts": {"name": "Pinterest Predicts", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://business.pinterest.com/pinterest-predicts/"},
    "pinterest_trends": {"name": "Pinterest Trends Tool", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://trends.pinterest.com/"},
    "trustpilot_blog_main": {"name": "Trustpilot Business Insights", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://business.trustpilot.com/blog"},
    "trustpilot_electronics": {"name": "Trustpilot reviews electronics", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://www.trustpilot.com/categories/electronics_technology"},
    "reviews_io_blog": {"name": "Reviews.io blog", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://blog.reviews.io/"},
    "yotpo_insights_blog": {"name": "Yotpo Insights", "category": "Social Listening Pro", "type": "rss", "tier": 2, "url": "https://www.yotpo.com/blog/feed/"},
    "bazaarvoice_blog": {"name": "Bazaarvoice Resources", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://www.bazaarvoice.com/blog/"},
    "powerreviews_insights": {"name": "PowerReviews insights", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://www.powerreviews.com/insights/"},
    "glassdoor_research": {"name": "Glassdoor Economic Research", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://www.glassdoor.com/research/"},
    "indeed_hiring_lab": {"name": "Indeed Hiring Lab", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://www.hiringlab.org/"},
    "linkedin_workforce": {"name": "LinkedIn Workforce Reports", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://economicgraph.linkedin.com/resources/linkedin-workforce-report-united-states"},
    "comparably_news": {"name": "Comparably news", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://www.comparably.com/news/"},
    "data_ai_insights": {"name": "data.ai retail apps", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://www.data.ai/insights/"},
    "sensor_tower_blog": {"name": "Sensor Tower blog", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://sensortower.com/blog"},
    "apptopia_blog": {"name": "Apptopia retail apps", "category": "Social Listening Pro", "type": "static_url", "tier": 2, "url": "https://blog.apptopia.com/"},
    "similarweb_blog": {"name": "SimilarWeb Retail", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://www.similarweb.com/blog/"},
    "comscore_blog": {"name": "Comscore Retail Reports", "category": "Social Listening Pro", "type": "static_url", "tier": 1, "url": "https://www.comscore.com/Insights/Blog?cs_edgescape_cc=US"},

    # --- Brand Reddit (5) ---
    "reddit_bombas": {"name": "Reddit r/Bombas", "category": "Brand Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Bombas/.rss"},
    "reddit_allbirdshoes": {"name": "Reddit r/AllbirdsShoes", "category": "Brand Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/AllbirdsShoes/.rss"},
    "reddit_patagonia_brand": {"name": "Reddit r/Patagonia", "category": "Brand Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Patagonia/.rss"},
    "reddit_costco_brand": {"name": "Reddit r/Costco", "category": "Brand Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Costco/.rss"},
    "reddit_target_brand": {"name": "Reddit r/Target", "category": "Brand Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Target/.rss"},

    # --- Retail Operator Reddit (25) ---
    "reddit_retailmanagers": {"name": "Reddit r/RetailManagers", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/RetailManagers/.rss"},
    "reddit_walmart_ops": {"name": "Reddit r/walmart", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/walmart/.rss"},
    "reddit_homedepot": {"name": "Reddit r/HomeDepot", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/HomeDepot/.rss"},
    "reddit_lowes": {"name": "Reddit r/Lowes", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Lowes/.rss"},
    "reddit_ikea": {"name": "Reddit r/IKEA", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/IKEA/.rss"},
    "reddit_homegoods": {"name": "Reddit r/HomeGoods", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/HomeGoods/.rss"},
    "reddit_potterybarn": {"name": "Reddit r/PotteryBarn", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/PotteryBarn/.rss"},
    "reddit_restorationhardware": {"name": "Reddit r/restorationhardware", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/restorationhardware/.rss"},
    "reddit_askretail": {"name": "Reddit r/AskRetail", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/AskRetail/.rss"},
    "reddit_flipping": {"name": "Reddit r/Flipping", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Flipping/.rss"},
    "reddit_frugal": {"name": "Reddit r/Frugal", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Frugal/.rss"},
    "reddit_povertyfinance": {"name": "Reddit r/povertyfinance", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/povertyfinance/.rss"},
    "reddit_declutter": {"name": "Reddit r/declutter", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/declutter/.rss"},
    "reddit_minimalism": {"name": "Reddit r/minimalism", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/minimalism/.rss"},
    "reddit_interiordesign": {"name": "Reddit r/InteriorDesign", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/InteriorDesign/.rss"},
    "reddit_mfa": {"name": "Reddit r/MaleFashionAdvice", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/MaleFashionAdvice/.rss"},
    "reddit_ffa": {"name": "Reddit r/femalefashionadvice", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/femalefashionadvice/.rss"},
    "reddit_skincareaddiction": {"name": "Reddit r/SkincareAddiction", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/SkincareAddiction/.rss"},
    "reddit_makeupaddiction": {"name": "Reddit r/MakeupAddiction", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/MakeupAddiction/.rss"},
    "reddit_sephora": {"name": "Reddit r/Sephora", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Sephora/.rss"},
    "reddit_ulta": {"name": "Reddit r/Ulta", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Ulta/.rss"},
    "reddit_amazonseller_ops": {"name": "Reddit r/AmazonSeller", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/AmazonSeller/.rss"},
    "reddit_resellers": {"name": "Reddit r/Resellers", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/Resellers/.rss"},
    "reddit_thriftstorehauls": {"name": "Reddit r/ThriftStoreHauls", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/ThriftStoreHauls/.rss"},
    "reddit_homeimprovement": {"name": "Reddit r/HomeImprovement", "category": "Retail Operator Reddit", "type": "rss", "tier": 3, "url": "https://www.reddit.com/r/HomeImprovement/.rss"},

    # --- Open Data APIs (30) ---
    "osm_overpass": {"name": "OpenStreetMap Overpass", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://overpass-api.de/"},
    "overpass_turbo": {"name": "Overpass Turbo", "category": "Open Data APIs", "type": "static_url", "tier": 2, "url": "https://overpass-turbo.eu/"},
    "yelp_fusion": {"name": "Yelp Fusion API", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.yelp.com/developers/documentation/v3"},
    "google_places": {"name": "Google Places API", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://developers.google.com/maps/documentation/places/web-service/overview"},
    "foursquare_places": {"name": "Foursquare Places API", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://docs.foursquare.com/developer/reference/places-api-overview"},
    "opencorporates": {"name": "OpenCorporates", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://api.opencorporates.com/"},
    "sec_edgar_search": {"name": "SEC EDGAR full-text search", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://efts.sec.gov/LATEST/search-index?q=&forms=10-K"},
    "sec_financial_data": {"name": "SEC Financial Statement Data", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.sec.gov/dera/data/financial-statement-data-sets"},
    "uspto_patent_api": {"name": "USPTO Patent Search API", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://developer.uspto.gov/api-catalog"},
    "uspto_tsdr": {"name": "USPTO TSDR Trademark API", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://developer.uspto.gov/api-catalog/tsdr-data-api"},
    "openfda_recalls": {"name": "FDA Adverse Events Recalls", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://open.fda.gov/apis/"},
    "cpsc_recalls": {"name": "CPSC Recalls API", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.saferproducts.gov/RestWebServices/Recall?format=json"},
    "osha_search": {"name": "OSHA Establishment Search", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.osha.gov/data"},
    "nlrb_election": {"name": "NLRB Election Case Search", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.nlrb.gov/reports/agency-performance"},
    "bls_qcew": {"name": "BLS QCEW employment", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.bls.gov/cew/"},
    "bls_ppi": {"name": "BLS Producer Price Index", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.bls.gov/ppi/"},
    "bls_mxp": {"name": "BLS Import Export Price Indexes", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.bls.gov/mxp/"},
    "usitc_dataweb": {"name": "USITC DataWeb", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://dataweb.usitc.gov/"},
    "cbp_ace": {"name": "CBP ACE import data", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.cbp.gov/trade/automated"},
    "importgenius_blog": {"name": "ImportGenius blog", "category": "Open Data APIs", "type": "static_url", "tier": 2, "url": "https://www.importgenius.com/blog"},
    "panjiva_research": {"name": "Panjiva research", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://panjiva.com/research"},
    "datasembly_blog": {"name": "Datasembly insights", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://datasembly.com/insights/"},
    "oecd_consumer_confidence": {"name": "OECD Consumer Confidence", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://data.oecd.org/leadind/consumer-confidence-index-cci.htm"},
    "worldbank_consumption_pack": {"name": "World Bank Consumer Spending", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://data.worldbank.org/indicator/NE.CON.PRVT.CD"},
    "uncomtrade": {"name": "UN Comtrade", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://comtradeplus.un.org/"},
    "data_gov_retail_idx": {"name": "data.gov retail datasets", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://catalog.data.gov/dataset?q=retail&sort=metadata_modified+desc"},
    "eurostat_retail_pack": {"name": "Eurostat Retail Trade Volume", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://ec.europa.eu/eurostat/databrowser/view/sts_trtu_m/default/table"},
    "ons_retail_pack": {"name": "UK ONS Retail Sales Index", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://api.ons.gov.uk/dataset/retail-sales-index/editions/time-series/versions/1.0"},
    "statcan_retail": {"name": "Statistics Canada Retail", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.statcan.gc.ca/en/developers/wds"},
    "destatis_retail": {"name": "Destatis German Retail", "category": "Open Data APIs", "type": "static_url", "tier": 1, "url": "https://www.destatis.de/EN/Themes/Economy/Wholesale-Retail-Trade/_node.html"},

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
# RSS BODY EXPANSION (2026-04-29)
# ================================================================
# RSS feeds typically expose only a 1-3 sentence teaser in the entry
# `summary`/`description` field; the full article body lives behind
# `entry.link`. Without expansion, the corpus chat can only cite headlines
# for retail/DTC/marketing/news trade-press sources.
#
# 3-TIER EXTRACTION STRATEGY (revised after Jina free-tier 429 throttling):
#
#   TIER 1 — Direct HTTP fetch + trafilatura (PRIMARY, ~95% of articles)
#     Fetch the article URL with a real browser User-Agent, hand the HTML
#     to trafilatura.extract() which is the best-in-class open-source
#     readability extractor (handles boilerplate stripping, comment removal,
#     metadata, tables). No external API, no rate limit. Local CPU only.
#
#   TIER 2 — Jina Reader fallback (the ~5% trafilatura misses)
#     Some sites are JS-heavy SPAs (Modern Retail variants), have aggressive
#     anti-bot WAFs, or paywalls Jina happens to bypass. We fall through to
#     r.jina.ai with a PROCESS-WIDE semaphore=3 and a 60-second 429 backoff
#     so a single rate-limit response halts Jina traffic until cooldown.
#
#   TIER 3 — RSS teaser (last-resort fallback)
#     The original 500-char summary is always returned if both upstreams
#     fail — never degrades the corpus, only ever improves it.
#
# A per-process URL → content cache prevents duplicate fetches across
# queries within the proxy's lifetime.
# ================================================================

_RSS_BODY_CACHE: Dict[str, Dict[str, Any]] = {}
_RSS_BODY_CACHE_MAX = 2000  # ~20 MB at 10 KB/article — bounded LRU-ish

# Process-wide concurrency cap for Jina Reader. Free tier rate-limits hard
# (HTTP 429) when we exceed ~5-10 concurrent requests, so we keep this
# conservative across the whole proxy. _JINA_BACKOFF_UNTIL is set to a
# future epoch on 429; while now < this, all Jina calls are short-circuited.
_JINA_SEMAPHORE: Optional["asyncio.Semaphore"] = None
_JINA_BACKOFF_UNTIL: float = 0.0


def _get_jina_semaphore() -> "asyncio.Semaphore":
    """Lazy init so we attach to the running event loop, not a stale one."""
    global _JINA_SEMAPHORE
    if _JINA_SEMAPHORE is None:
        _JINA_SEMAPHORE = asyncio.Semaphore(3)
    return _JINA_SEMAPHORE


def _cache_body(url: str, content: str, method: str) -> None:
    """Add to bounded LRU cache, evicting ~10% oldest when full."""
    if len(_RSS_BODY_CACHE) >= _RSS_BODY_CACHE_MAX:
        drop_n = max(1, _RSS_BODY_CACHE_MAX // 10)
        for k in list(_RSS_BODY_CACHE.keys())[:drop_n]:
            _RSS_BODY_CACHE.pop(k, None)
    _RSS_BODY_CACHE[url] = {"content": content, "fetched_at": time.time(), "method": method}


# Realistic browser UA — most news sites accept this; many block bare
# httpx/python-requests UAs at the WAF layer.
_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


async def _fetch_article_html(client: "httpx.AsyncClient", url: str, timeout: float = 10.0) -> Optional[str]:
    """Fetch the article URL directly with a browser-like User-Agent.

    Returns the response body as text on 2xx, or None on non-200, network
    error, redirect loop, or non-HTML content-type. Never raises.
    """
    try:
        resp = await client.get(
            url,
            headers={
                "User-Agent": _BROWSER_UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout=timeout,
            follow_redirects=True,
        )
        if resp.status_code != 200:
            return None
        ct = (resp.headers.get("content-type") or "").lower()
        if ct and "html" not in ct and "xml" not in ct:
            return None
        return resp.text
    except Exception:
        return None


def _extract_body_with_trafilatura(html: str, url: Optional[str] = None) -> Optional[str]:
    """Run trafilatura on already-fetched HTML. Returns None if extraction
    fails or yields < 200 chars. Imported lazily so the module loads even
    if trafilatura isn't installed yet (e.g., during the rebuild window)."""
    try:
        import trafilatura  # local import — fail soft if not installed
    except ImportError:
        return None
    try:
        body = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=False,
            favor_precision=False,
            no_fallback=False,
        )
        if body and len(body) > 200:
            return body
        return None
    except Exception:
        return None


async def _try_jina_reader(client: "httpx.AsyncClient", url: str, timeout: float = 12.0) -> Optional[str]:
    """Tier-2 fallback. Concurrency-capped via _JINA_SEMAPHORE; aborts
    immediately if a previous call hit a 429 within the last 60 seconds.
    Returns extracted body or None.
    """
    global _JINA_BACKOFF_UNTIL
    now = time.time()
    if now < _JINA_BACKOFF_UNTIL:
        return None

    sem = _get_jina_semaphore()
    async with sem:
        # Re-check after acquiring the semaphore — another coroutine may
        # have just hit a 429 while we waited.
        if time.time() < _JINA_BACKOFF_UNTIL:
            return None
        try:
            resp = await client.get(
                f"https://r.jina.ai/{url}",
                headers={"Accept": "application/json", "X-With-Links": "false", "X-Return-Format": "text"},
                timeout=timeout,
                follow_redirects=True,
            )
            if resp.status_code == 429:
                _JINA_BACKOFF_UNTIL = time.time() + 60.0
                logger.warning("[Jina] HTTP 429 — backing off Jina Reader for 60s (per-process)")
                return None
            if resp.status_code != 200:
                return None
            content = ""
            try:
                data = resp.json()
                if isinstance(data, dict):
                    inner = data.get("data") if isinstance(data.get("data"), dict) else {}
                    # Jina has shipped multiple response shapes over time —
                    # check every plausible key on both the wrapper and the
                    # inner data envelope.
                    content = (
                        inner.get("content")
                        or inner.get("text")
                        or data.get("content")
                        or data.get("text")
                        or ""
                    )
            except Exception:
                content = resp.text
            if not content or len(content) < 200:
                # Plain-text fallback — some pages only render content in
                # text mode, not JSON mode.
                try:
                    resp2 = await client.get(
                        f"https://r.jina.ai/{url}",
                        headers={"Accept": "text/plain"},
                        timeout=timeout,
                        follow_redirects=True,
                    )
                    if resp2.status_code == 200 and len(resp2.text) > len(content):
                        content = resp2.text
                except Exception:
                    pass
            if content and len(content) > 200:
                return content
        except Exception as e:
            logger.debug(f"[Jina] {url[:60]} failed: {str(e)[:120]}")
    return None


async def _expand_rss_body(client: "httpx.AsyncClient", url: str, fallback_content: str, timeout: float = 12.0) -> Tuple[str, str]:
    """3-tier body expansion. Returns (content, source_method) where
    source_method ∈ {"trafilatura", "jina", "*_cached", "rss"}. Always
    returns a usable string — never raises."""
    if not url or not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return fallback_content, "rss"

    cached = _RSS_BODY_CACHE.get(url)
    if cached and cached.get("content"):
        return cached["content"], f"{cached.get('method', 'unknown')}_cached"

    # Tier 1: direct fetch + trafilatura
    html = await _fetch_article_html(client, url, timeout=timeout)
    if html:
        body = _extract_body_with_trafilatura(html, url=url)
        if body:
            content = body[:10000]
            _cache_body(url, content, "trafilatura")
            return content, "trafilatura"

    # Tier 2: Jina Reader (rate-limited, may be in backoff)
    jina_body = await _try_jina_reader(client, url, timeout=timeout)
    if jina_body:
        content = jina_body[:10000]
        _cache_body(url, content, "jina")
        return content, "jina"

    # Tier 3: RSS teaser
    return fallback_content, "rss"


async def _expand_rss_items(items: List[Dict[str, Any]], max_concurrent: int = 8) -> List[Dict[str, Any]]:
    """Expand each RSS item's `content` field with the full article body.

    Per-source concurrency cap (max_concurrent) prevents one source from
    flooding the network. Module-level _JINA_SEMAPHORE clamps total Jina
    fan-out across the whole proxy. Items without a usable URL keep their
    RSS teaser. The `_body_source` field records the method that won
    ("trafilatura" / "jina" / "*_cached" / "rss") so the frontend or
    downstream analytics can surface body provenance.
    """
    if not items:
        return items

    sem = asyncio.Semaphore(max_concurrent)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        async def _expand_one(item: Dict[str, Any]) -> Dict[str, Any]:
            async with sem:
                url = item.get("url", "")
                fallback = item.get("content", "") or ""
                content, method = await _expand_rss_body(client, url, fallback)
                return {**item, "content": content, "_body_source": method}

        return await asyncio.gather(*[_expand_one(it) for it in items])


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

            # --- Static URL connector (single-page fetch via 3-tier expansion) ---
            # 2026-04-29 — For brand impact pages, vendor blogs without RSS,
            # and corporate insight pages. Fetches the configured `url` once
            # via the same trafilatura→Jina pipeline that RSS body expansion
            # uses, then keyword-filters the extracted body against the
            # query so the source only contributes when it's actually
            # relevant to what the user asked.
            elif src_type == "static_url":
                page_url = src.get("url", "")
                if not page_url:
                    return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": [], "total": 0, "error": "no url configured"}

                async with httpx.AsyncClient(follow_redirects=True) as page_client:
                    content, method = await _expand_rss_body(page_client, page_url, "")

                if not content or len(content) < 200:
                    # Fetch failed — no body to return.
                    return {"source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3), "items": [], "total": 0, "error": "page fetch failed"}

                # Keyword filter: extract simple keywords from the query and
                # require at least one to appear in the body, OR pass through
                # if the page is the canonical brand impact page (always
                # relevant to a checkout-fundraising research goal).
                stop_words = {'the','a','an','is','are','was','were','be','been','have','has','had',
                              'do','does','did','will','would','could','should','to','of','in','for',
                              'on','with','at','by','from','as','and','but','or','not','this','that',
                              'it','its','their','they','them','what','which','who','how','when','where',
                              'about','into','through','during','before','after','between','2025','2026'}
                keywords = [w.lower() for w in q.split() if len(w) > 2 and w.lower() not in stop_words]
                body_lower = content.lower()
                matches = sum(1 for kw in keywords if kw in body_lower)

                # Always emit ONE item (the page) regardless of match count;
                # downstream relevance scoring decides whether to keep it.
                # Pages that don't mention the keywords still get scored low
                # and dropped before reaching the LLM corpus.
                items = [{
                    "title": src["name"],
                    "content": content,
                    "url": page_url,
                    "date": "",
                    "_body_source": method,
                    "_keyword_matches": matches,
                }]
                logger.info(f"[StaticURL] {src['name']}: body={len(content)} chars via {method}, kw_matches={matches}/{len(keywords)}")
                return {
                    "source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3),
                    "items": items, "total": 1,
                    "body_expansion": {
                        "full_body": 1 if "trafilatura" in method or "jina" in method else 0,
                        "teaser_only": 0,
                        "by_method": {method: 1},
                    }
                }

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

                # 2026-04-29 — RSS BODY EXPANSION (3-tier).
                # Tier 1 (trafilatura) handles ~95% of articles via direct
                # HTTP + local readability extraction — no API, no rate
                # limits. Tier 2 (Jina Reader) is the throttled fallback
                # for the JS-heavy / paywalled / anti-bot remainder.
                # Tier 3 keeps the 500-char RSS teaser as a final fallback.
                items = await _expand_rss_items(items, max_concurrent=8)
                tier_counts = {"trafilatura": 0, "jina": 0, "cached": 0, "rss": 0}
                for it in items:
                    src_method = (it.get("_body_source") or "rss").lower()
                    if "cached" in src_method:
                        tier_counts["cached"] += 1
                    elif "trafilatura" in src_method:
                        tier_counts["trafilatura"] += 1
                    elif "jina" in src_method:
                        tier_counts["jina"] += 1
                    else:
                        tier_counts["rss"] += 1
                full_body = tier_counts["trafilatura"] + tier_counts["jina"] + tier_counts["cached"]
                logger.info(
                    f"[RSS] {src['name']}: {full_body}/{len(items)} full bodies "
                    f"(trafilatura={tier_counts['trafilatura']}, jina={tier_counts['jina']}, "
                    f"cached={tier_counts['cached']}, teaser={tier_counts['rss']})"
                )

                return {
                    "source": src["name"], "category": src["category"], "credibilityTier": src.get("tier", 3),
                    "items": items, "total": len(feed.entries),
                    "filtered": len(relevant), "note": f"{len(relevant)} of {len(feed.entries)} articles matched keywords",
                    "body_expansion": {
                        "full_body": full_body,
                        "teaser_only": tier_counts["rss"],
                        "by_method": tier_counts,
                    }
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
        gen_config: Dict[str, Any] = {
            "temperature": config.get("temperature", 0.2),
            "maxOutputTokens": config.get("maxOutputTokens", 8192),
        }
        # 2026-04-29 — Pass through structured-output config so callers can
        # force strict JSON. Without this, Gemini's free-form text output
        # often truncates mid-string under tight token budgets — the source
        # of the long-running [YouTubeDiscovery] suggestVideoQueries
        # "Unexpected end of JSON input" errors. responseMimeType +
        # responseSchema put Gemini into JSON mode where it self-terminates
        # cleanly even at the maxOutputTokens boundary.
        if config.get("responseMimeType"):
            gen_config["responseMimeType"] = config["responseMimeType"]
        if config.get("responseSchema"):
            gen_config["responseSchema"] = config["responseSchema"]

        gemini_body = {
            "contents": [{"parts": [{"text": contents}]}] if isinstance(contents, str) else contents,
            "generationConfig": gen_config,
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
    # Phase 2.5 (2026-04-28): goal-fit metadata for blended retrieval ranking.
    # When the orchestrator collects this article against a research goal, it
    # scores 0–100 via Gemini relevance grader; persisting that score lets the
    # chunk store rank high-goal-fit articles' chunks above low-goal-fit ones
    # for the same query similarity.
    relevanceScore: Optional[int] = None        # 0..100; None = unknown / not graded
    relevanceReason: Optional[str] = None       # 1-sentence Gemini grader reason
    engagementGoal: Optional[str] = None        # original goal text this article was collected for

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
    # Phase 2.5: goal-fit metadata for blended retrieval ranking
    if req.relevanceScore is not None:
        lines.append(f'relevance: {int(req.relevanceScore)}')
    if req.relevanceReason:
        lines.append(f'relevance_reason: {esc(req.relevanceReason)}')
    if req.engagementGoal:
        lines.append(f'engagement_goal: {esc(req.engagementGoal)}')
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

        # Auto-embed the new article for semantic retrieval. Failures are
        # logged but never surface — the write is already durable, and the
        # embedding can be rebuilt later via POST /api/wiki/embed-backfill.
        embed_entry = {
            "title": req.title or "",
            "source": req.source or "",
            "date": req.date or "",
            "summary": req.content[:EMBED_BODY_CHARS] if req.content else "",
        }
        embedded = _embed_and_cache_article(h, embed_entry, body=req.content[:EMBED_BODY_CHARS] if req.content else "")

        return {
            "status": "ok",
            "wikiPath": path_rel,
            "urlHash": h,
            "chars": chars,
            "kind": req.kind or 'article',
            "embedded": embedded,
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
    caps each body's length so the aggregate response stays bounded.

    Phase 2.5 (2026-04-28): `engagementGoal` strengthens recall of previously
    archived content by blending the chat-question embedding with the original
    research goal embedding. Effect: even a narrow chat question retrieves
    articles relevant to the broader engagement context, surfacing high-goal-fit
    archive content that pure question-cosine would miss.
    """
    ids: Optional[_List_wiki_index[str]] = None                 # url_hash values
    wikiPaths: Optional[_List_wiki_index[str]] = None           # direct paths
    query: Optional[str] = None                     # keyword search
    kind: Optional[str] = None                      # filter: article|transcript|upload
    source: Optional[str] = None                    # substring match on source name
    minChars: Optional[int] = 0
    limit: Optional[int] = 10
    maxCharsPerArticle: Optional[int] = 20_000      # 20KB default — plenty for most quotes
    engagementGoal: Optional[str] = None            # original engagement goal for context blend
    goalBlendWeight: Optional[float] = 0.30         # 0..1; portion of engagement goal in retrieval embedding


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

    # Query-based retrieval. Two-tier:
    #   Tier 1: chunked retrieval against `wiki/.vectors.db` (Phase 2). Embeds
    #     the query once, searches per-chunk vectors, groups by article. The
    #     matched chunk text + section is carried back so the LLM sees the
    #     precise passage, not just the article preamble.
    #   Tier 2 (fallback): legacy keyword + (sem × 10) blend over the
    #     `.embeddings.json` sidecar (one vector per article, built from
    #     title + first 1200 chars only).
    # Tier 1 activates only if the chunk store file exists; otherwise Tier 2
    # runs unchanged.
    matched_chunks_by_path: dict = {}  # wiki_path -> [chunk dicts] for response enrichment

    if len(selected) < limit and req.query:
        chunked_results = _search_chunked_articles(
            req.query,
            kind=req.kind,
            source=req.source,
            limit=limit - len(selected),
            chunks_per_article=3,
            engagement_goal=req.engagementGoal,
            goal_blend_weight=req.goalBlendWeight if req.goalBlendWeight is not None else 0.30,
        )
        if chunked_results is not None:
            # Re-score each chunk-store hit by mapping back to the wiki index entry
            # (so we keep the response shape stable: id, title, source, date, etc.).
            wiki_path_to_entry = {e.get("wikiPath"): e for e in entries}
            for r in chunked_results:
                wp = r.get("wiki_path")
                if not wp or wp in used_paths:
                    continue
                e = wiki_path_to_entry.get(wp)
                if not e:
                    # Stale chunk store entry (file deleted between embed-time
                    # and now) — skip silently.
                    continue
                if req.minChars and req.minChars > 0 and int(e.get('chars') or 0) < req.minChars:
                    continue
                selected.append(e)
                used_paths.add(wp)
                matched_chunks_by_path[wp] = r.get("chunks", [])
            logger.info(
                f"Wiki retrieval (chunked): query={req.query[:60]!r} "
                f"chunked_hits={len(chunked_results)} selected_so_far={len(selected)}"
            )

    if len(selected) < limit and req.query and not matched_chunks_by_path:
        # Tier 2 fallback (chunk store unavailable or zero hits)
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

        # Semantic pass (optional, non-blocking on failure)
        sem_scores = _semantic_scores_for_query(
            req.query,
            [c.get("id") for c in candidates if c.get("id")],
        )

        scored: list = []
        for e in candidates:
            if e.get('wikiPath') in used_paths:
                continue
            kw = _score_article_for_query(e, query_tokens)
            sem = sem_scores.get(e.get("id") or "", 0.0)
            total = kw + (sem * 10.0)
            # Require either a keyword hit or a meaningful semantic hit
            # (cosine > 0.3 filters out near-random matches)
            if kw > 0 or sem > 0.3:
                scored.append((e, total, kw, sem))
        scored.sort(key=lambda t: t[1], reverse=True)
        logger.info(
            f"Wiki retrieval: query={req.query[:60]!r} candidates={len(candidates)} "
            f"scored={len(scored)} semantic_hits={len(sem_scores)}"
        )
        for e, _total, _kw, _sem in scored[: limit - len(selected)]:
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
        article_dict = {
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
        }
        # Phase 2 enrichment: if the chunk store surfaced this article, carry
        # the matched chunks (precise passages with section context) so the
        # LLM can cite the right paragraph instead of re-reading the whole body.
        chunks = matched_chunks_by_path.get(e.get('wikiPath'))
        if chunks:
            article_dict['matched_chunks'] = chunks
        articles.append(article_dict)
    return {
        'total_matched': len(selected),
        'returned': len(articles),
        'articles': articles,
        'retrieval_mode': 'chunked' if matched_chunks_by_path else ('legacy' if req.query else 'direct'),
    }


# ================================================================
# WIKI SEMANTIC EMBEDDINGS  (Phase 1-retrofit 2026-04-21)
# ================================================================
# Keyword scoring (_score_article_for_query) is fast but brittle: a query
# for "donor retention" misses an article titled "alumni participation
# decline" because no token overlaps. We layer semantic retrieval on top
# using OpenAI text-embedding-3-small (1536-dim, $0.02/M tok):
#
#   - At write-article time, embed title + source + date + first 1200 chars
#     of body. Vector is cached by url_hash in a single sidecar JSON file.
#   - At fetch-articles time, embed the query once, cosine-sim against the
#     cached vectors, blend with the existing keyword score.
#   - One sidecar file is fast to load (~1.5KB × N articles), atomic to
#     write (tmp-then-rename), and survives proxy restarts.
#   - No external vector store. At our scale (<20k articles per engagement)
#     a pure-Python cosine scan over all vectors is <10ms per query.
#
# Degrades gracefully: if OPENAI_API_KEY is missing or the API call fails,
# retrieval falls back to pure keyword scoring — nothing breaks.

# --- Provider registry ----------------------------------------------------
# Anthropic has NO native embedding endpoint (confirmed at the Anthropic
# docs; their recommended partner is Voyage AI). OpenAI and Gemini both
# ship dedicated embedding APIs; Voyage is included here so teams that
# want the "Anthropic ecosystem" answer have a drop-in option. Cached
# vectors are tagged with the provider+model+dim used to produce them, so
# switching providers forces a transparent re-embed rather than mixing
# incompatible vector spaces.
EMBED_PROVIDERS = {
    "openai": {
        "model": "text-embedding-3-small",
        "dim": 1536,
        "url": "https://api.openai.com/v1/embeddings",
        "key_env": "OPENAI_API_KEY",
        "batch": 96,
    },
    "openai-large": {
        "model": "text-embedding-3-large",
        "dim": 3072,
        "url": "https://api.openai.com/v1/embeddings",
        "key_env": "OPENAI_API_KEY",
        "batch": 96,
    },
    "gemini": {
        # Google's current-gen embedding model. 768 dims by default; still
        # small and fast. batchEmbedContents is the bulk endpoint.
        "model": "text-embedding-004",
        "dim": 768,
        "url": "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents",
        "key_env": "GEMINI_API_KEY",
        "batch": 100,
    },
    "voyage": {
        # Anthropic's recommended partner. voyage-3 is the current flagship.
        "model": "voyage-3",
        "dim": 1024,
        "url": "https://api.voyageai.com/v1/embeddings",
        "key_env": "VOYAGE_API_KEY",
        "batch": 128,
    },
}

EMBED_PROVIDER = os.environ.get("EMBED_PROVIDER", "openai").lower()
if EMBED_PROVIDER not in EMBED_PROVIDERS:
    logger.warning(f"Unknown EMBED_PROVIDER={EMBED_PROVIDER!r}, defaulting to openai")
    EMBED_PROVIDER = "openai"

EMBED_MODEL = EMBED_PROVIDERS[EMBED_PROVIDER]["model"]
EMBED_DIM = EMBED_PROVIDERS[EMBED_PROVIDER]["dim"]
EMBED_MAX_TEXT_CHARS = 8000       # ~2K tokens — safely under most providers' caps
EMBED_BODY_CHARS = 1200           # body excerpt included in the embed text
EMBED_BATCH = EMBED_PROVIDERS[EMBED_PROVIDER]["batch"]
EMBED_FILE = os.path.join(WIKI_BASE, ".embeddings.json")
_EMBEDDINGS_CACHE: dict = {"by_id": {}, "loaded": False, "dim": EMBED_DIM, "provider": EMBED_PROVIDER, "model": EMBED_MODEL}


def _load_embeddings() -> dict:
    """Load the embeddings sidecar into memory on first access. Returns the
    mutable by_id map so callers can append directly (persist via _save).
    If the sidecar was produced by a different provider/model/dim than the
    currently configured one, the in-memory cache starts empty (so callers
    backfill cleanly) — the old file is preserved on disk until the next
    save overwrites it."""
    if _EMBEDDINGS_CACHE.get("loaded"):
        return _EMBEDDINGS_CACHE["by_id"]
    try:
        if os.path.exists(EMBED_FILE):
            with open(EMBED_FILE, "r", encoding="utf-8") as f:
                data = _json_wiki_index.load(f)
            prev_provider = (data.get("provider") or "").lower()
            prev_model = data.get("model") or ""
            prev_dim = int(data.get("dim") or 0)
            same_space = (
                (prev_provider == EMBED_PROVIDER or not prev_provider)
                and (prev_model == EMBED_MODEL or not prev_model)
                and (prev_dim == EMBED_DIM or prev_dim == 0)
            )
            if same_space:
                _EMBEDDINGS_CACHE["by_id"] = data.get("embeddings", {}) or {}
                _EMBEDDINGS_CACHE["dim"] = prev_dim or EMBED_DIM
                logger.info(
                    f"Wiki embeddings loaded: {len(_EMBEDDINGS_CACHE['by_id'])} vectors "
                    f"(provider={EMBED_PROVIDER}, model={EMBED_MODEL}, dim={EMBED_DIM})"
                )
            else:
                logger.warning(
                    f"Wiki embeddings sidecar was produced by "
                    f"provider={prev_provider or '?'}/model={prev_model or '?'}/dim={prev_dim or '?'} "
                    f"but current config is provider={EMBED_PROVIDER}/model={EMBED_MODEL}/dim={EMBED_DIM}. "
                    f"Starting with empty cache — run POST /api/wiki/embed-backfill to re-embed."
                )
                _EMBEDDINGS_CACHE["by_id"] = {}
        else:
            _EMBEDDINGS_CACHE["by_id"] = {}
    except Exception as e:
        logger.warning(f"Wiki embeddings load failed: {e}")
        _EMBEDDINGS_CACHE["by_id"] = {}
    _EMBEDDINGS_CACHE["loaded"] = True
    return _EMBEDDINGS_CACHE["by_id"]


def _save_embeddings() -> None:
    """Persist the in-memory embeddings to disk atomically (tmp + rename)."""
    by_id = _EMBEDDINGS_CACHE.get("by_id", {})
    payload = {
        "provider": EMBED_PROVIDER,
        "model": EMBED_MODEL,
        "dim": _EMBEDDINGS_CACHE.get("dim", EMBED_DIM),
        "count": len(by_id),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "embeddings": by_id,
    }
    tmp = EMBED_FILE + ".tmp"
    try:
        os.makedirs(os.path.dirname(EMBED_FILE), exist_ok=True)
        with open(tmp, "w", encoding="utf-8") as f:
            _json_wiki_index.dump(payload, f)
        os.replace(tmp, EMBED_FILE)
    except Exception as e:
        logger.warning(f"Wiki embeddings save failed: {e}")


def _embed_via_openai(texts: list, cfg: dict) -> list:
    """OpenAI + OpenAI-compatible providers. Both text-embedding-3-small
    and -large use the same wire format."""
    from openai import OpenAI  # lazy import — SDK already required for Whisper
    key = os.environ.get(cfg["key_env"], "")
    if not key:
        raise RuntimeError(f"{cfg['key_env']} not configured")
    client = OpenAI(api_key=key)
    resp = client.embeddings.create(model=cfg["model"], input=texts)
    return [d.embedding for d in resp.data]


def _embed_via_gemini(texts: list, cfg: dict) -> list:
    """Google Gemini batchEmbedContents. Uses direct REST to avoid adding
    a SDK dep — the proxy already has httpx."""
    key = os.environ.get(cfg["key_env"], "")
    if not key:
        raise RuntimeError(f"{cfg['key_env']} not configured")
    url = f"{cfg['url']}?key={key}"
    body = {
        "requests": [
            {
                "model": f"models/{cfg['model']}",
                "content": {"parts": [{"text": t}]},
                "taskType": "RETRIEVAL_DOCUMENT",
            }
            for t in texts
        ]
    }
    with httpx.Client(timeout=60.0) as c:
        r = c.post(url, json=body, headers={"Content-Type": "application/json"})
    if r.status_code >= 400:
        raise RuntimeError(f"Gemini embed HTTP {r.status_code}: {r.text[:300]}")
    data = r.json()
    embeddings = data.get("embeddings") or []
    return [e.get("values") or [] for e in embeddings]


def _embed_via_voyage(texts: list, cfg: dict) -> list:
    """Voyage AI — Anthropic's recommended embedding partner. Uses direct
    REST (no SDK) to avoid a dep just for one endpoint."""
    key = os.environ.get(cfg["key_env"], "")
    if not key:
        raise RuntimeError(f"{cfg['key_env']} not configured")
    body = {"model": cfg["model"], "input": texts, "input_type": "document"}
    with httpx.Client(timeout=60.0) as c:
        r = c.post(
            cfg["url"],
            json=body,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
        )
    if r.status_code >= 400:
        raise RuntimeError(f"Voyage embed HTTP {r.status_code}: {r.text[:300]}")
    data = r.json()
    return [d.get("embedding") or [] for d in (data.get("data") or [])]


_EMBED_DISPATCH = {
    "openai": _embed_via_openai,
    "openai-large": _embed_via_openai,
    "gemini": _embed_via_gemini,
    "voyage": _embed_via_voyage,
}


def _embed_texts(texts: list, task_type: str = "document") -> list:
    """Batch-embed strings via the currently configured provider. Returns a
    list of float lists (dim=EMBED_DIM). Raises on API failure — callers
    should catch and fall back to keyword scoring.

    task_type: 'document' when embedding wiki content for storage,
               'query'    when embedding a user question for retrieval.
               Gemini uses RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY taskType.
    """
    if not texts:
        return []
    cfg = EMBED_PROVIDERS[EMBED_PROVIDER]
    trimmed = [(t or " ")[:EMBED_MAX_TEXT_CHARS] for t in texts]

    # Gemini differentiates document vs query via taskType — inject it here
    if EMBED_PROVIDER == "gemini" and task_type == "query":
        key = os.environ.get(cfg["key_env"], "")
        if not key:
            raise RuntimeError(f"{cfg['key_env']} not configured")
        url = f"{cfg['url']}?key={key}"
        body = {
            "requests": [
                {
                    "model": f"models/{cfg['model']}",
                    "content": {"parts": [{"text": t}]},
                    "taskType": "RETRIEVAL_QUERY",
                }
                for t in trimmed
            ]
        }
        with httpx.Client(timeout=60.0) as c:
            r = c.post(url, json=body, headers={"Content-Type": "application/json"})
        if r.status_code >= 400:
            raise RuntimeError(f"Gemini embed HTTP {r.status_code}: {r.text[:300]}")
        embeddings = (r.json().get("embeddings") or [])
        return [e.get("values") or [] for e in embeddings]

    # Voyage also has separate input_type for queries
    if EMBED_PROVIDER == "voyage" and task_type == "query":
        key = os.environ.get(cfg["key_env"], "")
        if not key:
            raise RuntimeError(f"{cfg['key_env']} not configured")
        body = {"model": cfg["model"], "input": trimmed, "input_type": "query"}
        with httpx.Client(timeout=60.0) as c:
            r = c.post(
                cfg["url"],
                json=body,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            )
        if r.status_code >= 400:
            raise RuntimeError(f"Voyage embed HTTP {r.status_code}: {r.text[:300]}")
        return [d.get("embedding") or [] for d in (r.json().get("data") or [])]

    # Default path: document embedding via dispatch table
    fn = _EMBED_DISPATCH.get(EMBED_PROVIDER)
    if not fn:
        raise RuntimeError(f"No embed dispatch for provider={EMBED_PROVIDER}")
    return fn(trimmed, cfg)


def _build_embed_text(entry: dict, body: str = "") -> str:
    """The string actually sent to the embedding API per article. Title
    carries the most semantic signal; source + date disambiguate; a short
    body excerpt catches the articles whose titles are generic."""
    title = (entry.get("title") or "").strip()
    source = (entry.get("source") or "").strip()
    date = (entry.get("date") or "").strip()
    excerpt = (body or entry.get("summary") or "").strip()[:EMBED_BODY_CHARS]
    parts = []
    if title:
        parts.append(title)
    if source or date:
        parts.append(f"{source} {date}".strip())
    if excerpt:
        parts.append(excerpt)
    return "\n\n".join(parts) or "(empty)"


def _cosine(a: list, b: list) -> float:
    """Pure-Python cosine similarity. ~5μs per pair at 1536-dim, so a full
    scan of a 300-article archive is ~1.5ms — no numpy required."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 0.0 or nb <= 0.0:
        return 0.0
    return dot / ((na ** 0.5) * (nb ** 0.5))


def _embed_and_cache_article(url_hash: str, entry: dict, body: str = "") -> bool:
    """Embed one article and persist. Safe to call from write-article —
    failures log but never raise (so article write still succeeds).

    Dual-writes: legacy `.embeddings.json` (single vector for backward compat)
    AND chunked `.vectors.db` (per-chunk vectors for tail-content retrieval).
    Either tier failing independently is non-fatal."""
    if not url_hash:
        return False

    legacy_ok = False
    try:
        vec = _embed_texts([_build_embed_text(entry, body)], task_type="document")[0]
        by_id = _load_embeddings()
        by_id[url_hash] = vec
        _save_embeddings()
        legacy_ok = True
    except Exception as e:
        logger.warning(f"Legacy embed failed for {url_hash[:10]}: {e}")

    # Phase 2: also chunk + embed for the new store. Skipped silently if
    # wiki_chunker / wiki_vector_store aren't importable (back-compat).
    try:
        store = _get_chunk_store()
        if store is not None and body:
            from wiki_chunker import chunk_markdown
            chunks = chunk_markdown(body)
            if chunks:
                texts = []
                for c in chunks:
                    sec = c.get("section", "")
                    texts.append(f"{sec}\n\n{c['text']}" if sec else c["text"])
                vectors = _embed_texts(texts, task_type="document")
                wiki_path = entry.get("wikiPath") or ""
                store.upsert_article_chunks(
                    article_id=wiki_path or url_hash,
                    wiki_path=wiki_path,
                    chunks=chunks,
                    embeddings=vectors,
                    article_metadata={
                        "url": entry.get("url", ""),
                        "title": entry.get("title", ""),
                        "source": entry.get("source", ""),
                        "kind": entry.get("kind", ""),
                        "tier": int(entry.get("tier", 0) or 0),
                        "date": entry.get("date", ""),
                        "chars": int(entry.get("chars", 0) or 0),
                        # Phase 2.5: pass goal-fit metadata if attached (entry
                        # carries `relevance` from the article frontmatter via
                        # _get_wiki_index_cached → _read_frontmatter mapping).
                        "relevance_score": entry.get("relevance"),
                        "engagement_goal": entry.get("engagement_goal"),
                    },
                )
    except Exception as e:
        logger.warning(f"Chunk store embed failed for {url_hash[:10]}: {e}")

    return legacy_ok


# ================================================================
# CHUNKED VECTOR STORE  (Phase 2, 2026-04-28)
# ================================================================
# Replaces the single-vector-per-article `.embeddings.json` sidecar with a
# per-chunk sqlite-vec store at `wiki/.vectors.db`. Articles are split into
# ~512-token chunks (markdown-aware: h2/h3 → paragraph → token-window) at
# ingestion; each chunk gets its own embedding. Retrieval returns top chunks
# grouped by article along with the matched passage.
#
# Why: a 60K-token research synthesis used to be represented by a single
# vector built from the first 1200 chars + title. The other 99% of the
# document was unsearchable. Chunking restores tail-content addressability.
#
# Activation: if `wiki/.vectors.db` exists and `wiki_vector_store` is
# importable, fetch-articles uses chunk retrieval. Otherwise falls back
# transparently to the legacy `.embeddings.json` keyword+semantic blend.

CHUNK_STORE_PATH = os.path.join(WIKI_BASE, ".vectors.db")
_chunk_store_singleton = None


def _get_chunk_store():
    """Lazy initializer. Returns a VectorStore or None if unavailable."""
    global _chunk_store_singleton
    if _chunk_store_singleton is not None:
        return _chunk_store_singleton if _chunk_store_singleton is not False else None
    try:
        if not os.path.exists(CHUNK_STORE_PATH):
            _chunk_store_singleton = False
            return None
        from wiki_vector_store import VectorStore
        _chunk_store_singleton = VectorStore(CHUNK_STORE_PATH, dim=1536)
        logger.info(f"Chunked retrieval enabled: {CHUNK_STORE_PATH} stats={_chunk_store_singleton.count()}")
        return _chunk_store_singleton
    except Exception as e:
        logger.warning(f"Chunk store unavailable, using legacy retrieval: {e}")
        _chunk_store_singleton = False
        return None


def _blend_embeddings(query_vec: list, goal_vec: list, goal_weight: float) -> list:
    """Linearly blend two unit-normalized embeddings, then re-normalize.
    goal_weight ∈ [0, 1]: portion of the goal embedding in the blend.
    Used by chunked retrieval to surface archive content aligned with the
    broader engagement context, not just the narrow chat question."""
    import math
    w_q = max(0.0, min(1.0, 1.0 - goal_weight))
    w_g = max(0.0, min(1.0, goal_weight))
    blended = [w_q * q + w_g * g for q, g in zip(query_vec, goal_vec)]
    norm = math.sqrt(sum(x * x for x in blended)) or 1.0
    return [x / norm for x in blended]


def _search_chunked_articles(query: str, kind: str | None, source: str | None,
                              limit: int, chunks_per_article: int = 3,
                              engagement_goal: str | None = None,
                              goal_blend_weight: float = 0.30) -> list[dict] | None:
    """Embed the query (optionally blended with the engagement goal), search
    the chunk store, return article-level results enriched with matched chunks.
    None if chunk store unavailable / fails.

    Phase 2.5: when engagement_goal is provided, the retrieval embedding is
    weighted blend of the chat question (1 - goal_blend_weight) and the original
    research goal (goal_blend_weight). Default weight 0.30 — chat question
    dominates, but goal context biases ranking toward archive content
    relevant to the broader engagement.
    """
    store = _get_chunk_store()
    if store is None:
        return None
    q = (query or "").strip()
    if not q:
        return None
    try:
        qvec = _embed_texts([q], task_type="query")[0]
    except Exception as e:
        logger.warning(f"Query embed failed for chunked retrieval, falling back: {e}")
        return None

    # Optional engagement-goal blend
    if engagement_goal and goal_blend_weight and goal_blend_weight > 0.001:
        try:
            gvec = _embed_texts([engagement_goal.strip()], task_type="query")[0]
            qvec = _blend_embeddings(qvec, gvec, goal_blend_weight)
            logger.info(
                f"[chunked retrieval] blended embedding: query={q[:60]!r} "
                f"goal={engagement_goal[:60]!r} weight={goal_blend_weight:.2f}"
            )
        except Exception as e:
            logger.warning(f"Goal embed failed, retrieval falls back to query-only embedding: {e}")

    try:
        return store.search_articles(qvec, limit=limit, kind=kind, source=source,
                                     chunks_per_article=chunks_per_article)
    except Exception as e:
        logger.warning(f"Chunk store search failed, falling back: {e}")
        return None


def _semantic_scores_for_query(query: str, candidate_ids: list) -> dict:
    """Embed a single query and return a dict {url_hash: cosine_similarity}
    over the given candidate ids. Empty dict on any failure — keyword
    scoring then carries retrieval alone."""
    q = (query or "").strip()
    if not q or not candidate_ids:
        return {}
    by_id = _load_embeddings()
    if not by_id:
        return {}
    try:
        qvec = _embed_texts([q], task_type="query")[0]
    except Exception as e:
        logger.warning(f"Query embed failed, semantic scoring disabled this turn: {e}")
        return {}
    scores: dict = {}
    for cid in candidate_ids:
        vec = by_id.get(cid)
        if not vec:
            continue
        scores[cid] = _cosine(qvec, vec)
    return scores


@app.post("/api/wiki/embed-backfill")
async def wiki_embed_backfill(limit: int = 0, force: int = 0):
    """One-shot embed everything in the archive that doesn't have a vector
    yet (or all of it, if force=1). Batches of 64. Returns counts.
    Call this once after enabling embeddings to vectorize the existing wiki.

    Query params:
      limit:  cap how many articles to embed this call (0 = unlimited)
      force:  1 → re-embed even if a vector already exists
    """
    try:
        entries = _get_wiki_index_cached(summary_len=0)
    except Exception as e:
        return JSONResponse({"error": f"index build failed: {e}"}, status_code=500)

    by_id = _load_embeddings()
    work: list = []
    for e in entries:
        h = e.get("id")
        if not h:
            continue
        if not force and h in by_id:
            continue
        work.append(e)
        if limit > 0 and len(work) >= limit:
            break

    if not work:
        return {"embedded": 0, "already_indexed": len(by_id), "total_articles": len(entries)}

    success = 0
    failed = 0
    for start in range(0, len(work), EMBED_BATCH):
        chunk = work[start:start + EMBED_BATCH]
        texts: list = []
        for e in chunk:
            body_excerpt = ""
            wp = e.get("wikiPath") or ""
            safe = os.path.normpath(os.path.join(WIKI_BASE, wp))
            if safe.startswith(os.path.normpath(WIKI_BASE)) and os.path.exists(safe):
                try:
                    with open(safe, "r", encoding="utf-8") as f:
                        body_excerpt = _extract_wiki_body(f.read(), max_chars=EMBED_BODY_CHARS)
                except Exception:
                    pass
            texts.append(_build_embed_text(e, body_excerpt))
        try:
            vecs = _embed_texts(texts)
            for e, vec in zip(chunk, vecs):
                by_id[e["id"]] = vec
            success += len(chunk)
        except Exception as ex:
            logger.warning(f"Embed batch {start}-{start + len(chunk)} failed: {ex}")
            failed += len(chunk)

    _save_embeddings()
    return {
        "embedded": success,
        "failed": failed,
        "total_indexed": len(by_id),
        "total_articles": len(entries),
    }


class WikiExploreConceptsRequest(BaseModel):
    """Semantic-neighbor exploration for the dynamic prompt chip system.
    Given a research goal (or any query text), returns archive neighbors
    bucketed by similarity band so the caller can phrase chips that
    reference real archive content without fabricating."""
    goal: str
    limit: Optional[int] = 8           # cap per-band output
    minSim: Optional[float] = 0.25     # floor for "adjacent" band
    kind: Optional[str] = None         # filter: article|transcript|upload


@app.post("/api/wiki/explore-concepts")
async def wiki_explore_concepts(req: WikiExploreConceptsRequest):
    """Return the archive's semantic neighborhood of a goal, bucketed:

        strong    — cosine >= 0.60   → "Archive already covers this; review before collecting"
        adjacent  — 0.35 <= cosine < 0.60 → "Overlooked-but-close angle to explore"
        weak      — 0.25 <= cosine < 0.35 → surfaced only if strong+adjacent is thin

    Returned articles carry {id, title, source, summary, similarity} so the
    chip generator can reference them by name. Degrades gracefully: if
    embeddings are unavailable or the query embed fails, returns empty
    buckets — callers already handle the empty-result case.
    """
    goal = (req.goal or "").strip()
    if len(goal) < 8:
        return {"strong": [], "adjacent": [], "weak": [], "total_indexed": 0, "reason": "goal_too_short"}

    try:
        entries = _get_wiki_index_cached(summary_len=200)
    except Exception as e:
        return JSONResponse({"error": f"index build failed: {e}", "strong": [], "adjacent": [], "weak": []}, status_code=500)

    by_id = _load_embeddings()
    if not by_id:
        return {"strong": [], "adjacent": [], "weak": [], "total_indexed": 0, "reason": "no_embeddings"}

    # Optional kind filter first (cheaper than computing cosines we'll discard)
    pool = entries
    if req.kind:
        pool = [e for e in pool if e.get("kind") == req.kind]

    try:
        qvec = _embed_texts([goal], task_type="query")[0]
    except Exception as e:
        logger.warning(f"explore-concepts: query embed failed: {e}")
        return {"strong": [], "adjacent": [], "weak": [], "total_indexed": len(by_id), "reason": "query_embed_failed"}

    scored: list = []
    for e in pool:
        vec = by_id.get(e.get("id") or "")
        if not vec:
            continue
        sim = _cosine(qvec, vec)
        if sim < (req.minSim or 0.25):
            continue
        scored.append({
            "id": e.get("id"),
            "title": e.get("title") or "",
            "source": e.get("source") or "",
            "kind": e.get("kind") or "",
            "date": e.get("date") or "",
            "wikiPath": e.get("wikiPath") or "",
            "summary": (e.get("summary") or "")[:200],
            "similarity": round(sim, 4),
        })
    scored.sort(key=lambda x: x["similarity"], reverse=True)

    cap = max(1, min(20, req.limit or 8))
    strong = [s for s in scored if s["similarity"] >= 0.60][:cap]
    adjacent = [s for s in scored if 0.35 <= s["similarity"] < 0.60][:cap]
    weak = [s for s in scored if 0.25 <= s["similarity"] < 0.35][:cap]

    return {
        "goal_preview": goal[:120],
        "total_indexed": len(by_id),
        "candidates_scored": len(scored),
        "strong": strong,
        "adjacent": adjacent,
        "weak": weak,
    }


@app.get("/api/wiki/embed-status")
async def wiki_embed_status():
    """Quick health check — how many articles have vectors vs total."""
    by_id = _load_embeddings()
    try:
        entries = _get_wiki_index_cached(summary_len=0)
        total = len(entries)
        indexed_ids = set(by_id.keys())
        missing = sum(1 for e in entries if e.get("id") and e["id"] not in indexed_ids)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    # Phase 2 chunk store status
    chunk_status = {"available": False, "articles": 0, "chunks": 0, "by_kind": {}}
    store = _get_chunk_store()
    if store is not None:
        try:
            c = store.count()
            chunk_status = {
                "available": True,
                "articles": c.get("articles", 0),
                "chunks": c.get("chunks", 0),
                "by_kind": c.get("by_kind", {}),
                "db_path": CHUNK_STORE_PATH,
                "db_size_bytes": os.path.getsize(CHUNK_STORE_PATH) if os.path.exists(CHUNK_STORE_PATH) else 0,
            }
        except Exception as e:
            chunk_status["error"] = str(e)
    return {
        "model": EMBED_MODEL,
        "dim": _EMBEDDINGS_CACHE.get("dim", EMBED_DIM),
        "legacy": {
            "indexed": len(by_id),
            "total_articles": total,
            "missing": missing,
            "coverage": round(100.0 * (total - missing) / total, 1) if total > 0 else 0.0,
        },
        "chunked": chunk_status,
        # Backward-compat aliases (some clients read these flat):
        "indexed": len(by_id),
        "total_articles": total,
        "missing": missing,
        "coverage": round(100.0 * (total - missing) / total, 1) if total > 0 else 0.0,
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


# ================================================================
# Chunked-embedding rebuild (Phase 2)
# ================================================================

@app.post("/api/wiki/embed-rebuild")
async def wiki_embed_rebuild(scopes: str = "articles,transcripts,uploads,sources",
                              limit: int = 0, dry_run: int = 0):
    """Re-chunk and re-embed wiki content into `wiki/.vectors.db`.

    Idempotent: skips articles already indexed with matching chunk count.
    Use `force=1` (TODO) or delete `.vectors.db` to do a full rebuild.

    Query params:
      scopes: comma-separated subdirectories under wiki/ to scan
              (default: articles,transcripts,uploads,sources)
      limit:  cap how many articles to embed this call (0 = unlimited)
      dry_run: 1 → walk + chunk but don't embed or write
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key and not dry_run:
        return JSONResponse({"error": "OPENAI_API_KEY missing"}, status_code=500)
    try:
        from wiki_embed_backfill import backfill
        from pathlib import Path
        scope_list = [s.strip() for s in scopes.split(",") if s.strip()]
        result = backfill(
            wiki_root=Path(WIKI_BASE),
            db_path=CHUNK_STORE_PATH,
            api_key=api_key,
            scopes=scope_list,
            limit=limit if limit > 0 else None,
            dry_run=bool(dry_run),
            verbose=False,
        )
        # Re-init the cached singleton to pick up the new file
        global _chunk_store_singleton
        _chunk_store_singleton = None
        return result
    except Exception as e:
        logger.exception("embed-rebuild failed")
        return JSONResponse({"error": f"{type(e).__name__}: {e}"}, status_code=500)


# ================================================================
# PPTX export — RenderSpec[] → native editable PowerPoint
# ================================================================

@app.post("/api/export-pptx")
async def export_pptx(payload: dict):
    """Convert a list of RenderSpec objects into a native editable .pptx.

    Request body: {
      "specs": [ ...RenderSpec[] from design-desk/services/domToPptx.ts walkDocumentToSpecs() ... ],
      "filename": "freeform-org-NU.pptx"  (optional)
    }

    Response: binary .pptx as application/vnd.openxmlformats-officedocument.presentationml.presentation
    """
    import tempfile
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from pptx_export import render_specs_to_pptx

    specs = payload.get("specs") or []
    if not isinstance(specs, list):
        raise HTTPException(status_code=400, detail="payload.specs must be a list")
    if len(specs) == 0:
        raise HTTPException(status_code=400, detail="payload.specs is empty — nothing to render")

    filename = payload.get("filename") or "freeform-export.pptx"
    if not filename.endswith(".pptx"):
        filename = filename + ".pptx"

    out_dir = tempfile.mkdtemp(prefix="hic-pptx-")
    out_path = os.path.join(out_dir, filename)

    try:
        result = render_specs_to_pptx(specs, out_path)
    except Exception as e:
        logger.exception("PPTX render failed")
        raise HTTPException(status_code=500, detail=f"PPTX render failed: {type(e).__name__}: {e}")

    logger.info(
        "exported pptx: %s | rendered=%s | skipped=%s | total=%d | size=%d",
        out_path, result["rendered"], result["skipped"], result["total_specs"], result["file_size"],
    )

    return FileResponse(
        out_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=filename,
        headers={"X-Render-Counts": json.dumps(result["rendered"])},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5012"))
    logger.info(f"Starting Research Data Proxy v2 on port {port} with {len(SOURCES)} sources")
    uvicorn.run(app, host="0.0.0.0", port=port)
