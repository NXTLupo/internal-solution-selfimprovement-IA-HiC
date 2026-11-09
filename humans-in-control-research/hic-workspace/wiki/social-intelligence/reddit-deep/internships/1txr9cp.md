---
id: social-intelligence/reddit-deep/internships/1txr9cp.md
url: "https://www.reddit.com/r/internships/comments/1txr9cp/resume/"
kind: "social-post"
source: "reddit-deep: r/internships"
subreddit: "internships"
title: "Resume"
author: "Beneficial-Ad-2268"
date: "2026-06-05T17:17:10.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 4
flair: "Resume"
extracted_at: "2026-10-01T20:49:41.907Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/internships/1txr9cp.md#c0"
    char_span: [0, 2437]
    sentence_count: 8
    key_terms: [rag, system, evaluation, internship, retrieval-augmented, ci-gated, pipeline, resume]
    concepts: [retrieval-augmented, evaluation, internship, system, ci-gated]
    token_count: 505
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1txr9cp/resume/","kind":"social-post","date":"2026-06-05","author":"Beneficial-Ad-2268","subreddit":"internships"}]
  - id: "social-intelligence/reddit-deep/internships/1txr9cp.md#c1"
    char_span: [2439, 4576]
    sentence_count: 4
    key_terms: [training, scaled, model, using, full, developed, pipeline, across]
    concepts: [training, scaled, model, using, developed]
    token_count: 495
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1txr9cp/resume/","kind":"social-post","date":"2026-06-05","author":"Beneficial-Ad-2268","subreddit":"internships"}]
  - id: "social-intelligence/reddit-deep/internships/1txr9cp.md#c2"
    char_span: [4578, 5462]
    sentence_count: 1
    key_terms: [monitoring, language, learning, tracking, deep, implementation, architectures, cross-encoder]
    concepts: [monitoring, language, learning, tracking]
    token_count: 208
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1txr9cp/resume/","kind":"social-post","date":"2026-06-05","author":"Beneficial-Ad-2268","subreddit":"internships"}]
  - id: "social-intelligence/reddit-deep/internships/1txr9cp.md#c3"
    char_span: [5477, 6079]
    sentence_count: 4
    key_terms: [opportunities, definitely, interested, beneficial-ad-2268, jobs, careerscharlie, consistently, engineering]
    concepts: [opportunities, definitely, interested]
    section: Comments
    token_count: 128
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1txr9cp/resume/","kind":"social-post","date":"2026-06-05","author":"Beneficial-Ad-2268","subreddit":"internships"}]
---
# Resume

Source: [reddit-deep: r/internships](https://www.reddit.com/r/internships/comments/1txr9cp/resume/)
Posted by **Beneficial-Ad-2268** · **1↑** · **4 comments**

This is my resume ,help me get an internship or guide me to land my first internship ,plzz help I am desperate .

SUMMARY

Aspiring AI Engineer with a strong foundation in retrieval-augmented generation (RAG), large language models, MLOps, and full-stack AI

application deployment. Built a production-style RAG system with hybrid search, reranking, citation enforcement, and CI-gated evaluation.

Reproduced GPT-2 from scratch using Flash Attention and distributed training. Seeking an internship to contribute to real-world AI systems and

deepen production AI engineering skills.

PROJECT

Production RAG Application with CI-Gated Evaluation & Observability

• Designed and implemented a domain-specific "Ask My Docs" question-answering system combining dense vector search with BM25 sparse

retrieval, further refined by a cross-encoder reranker to significantly boost top‑3 retrieval precision over naive dense search.

• Enforced source citation in every generated answer, ensuring full traceability back to the original documents.

• Built a comprehensive observability stack: request-level tracing, p50/p95 latency histograms, per-query cost tracking, and live quality metric

dashboards—making the system production-monitoring ready.

• Created a CI-gated evaluation pipeline that runs automated RAG quality checks on every commit; merges are blocked if metrics regress, embedding

reliability directly into the development workflow.

AI-Powered Personalized News Digest Pipeline

• Engineered an automated daily pipeline that scrapes tech news from YouTube, OpenAI, and Anthropic blogs, summarizes articles using GPT, and

ranks them against a personal interest profile.

• Stored user profiles, article metadata, and interaction history in a PostgreSQL database via SQLAlchemy; the entire system runs on a Docker

container with cron scheduling for hands-free delivery.

• Implemented a ranking algorithm that scores each article’s relevance, culminating in a curated HTML email digest sent directly to the user’s inbox

every morning.

Deployed RAG Chatbot on Flipkart Product Reviews

• Built a retrieval-augmented chatbot that answers natural language questions using a corpus of real Flipkart product reviews, embedded and stored

in DataStax AstraDB.

• Integrated LangChain for retrieval and response generation via LLaMA 3.1 70B on Groq; developed a user chat interface with Flask and Bootstrap.

• Containerized the entire application with Docker, deployed on AWS EC2, and set up GitHub Actions for automated CI/CD deployment on each push

to the main branch.

Customer Satisfaction Predictor – End-to-End MLOps Pipeline

• Developed a complete MLOps pipeline for predicting e‑commerce review scores (1–5) from structured order features.

• Experimented with three model families (XGBoost, LightGBM, Random Forest), performing hyperparameter tuning across 300+ Optuna trials

while logging all experiments and metrics in MLflow.

• Orchestrated the full lifecycle—data ingestion, preprocessing, training, evaluation, and model promotion—using ZenML, ensuring full

reproducibility and production-readiness.

From-Scratch GPT-2 (124M) Reproduction with Modern Training Optimizations

• Faithfully implemented the full GPT-2 124M architecture from scratch: 12 transformer blocks with pre-LayerNorm, causal self-attention using

Flash Attention (F.scaled\_dot\_product\_attention), and GELU MLPs.

• Applied weight tying between the token embedding matrix and the LM head, saving \~37M parameters with no quality loss; padded vocabulary to

50,304 for CUDA kernel efficiency.

• Configured a modern training recipe: bfloat16 automatic mixed precision, TF32, AdamW with selective weight decay, cosine LR schedule with linear

warmup, gradient clipping at 1.0, and scaled residual initialization.

• Matched the original HellaSwag benchmark result (\~30% accuracy at 10B tokens) in just \~1 hour of training at a cloud GPU cost of approximately

$10.

• Scaled the training process across multiple GPUs using Distributed Data Parallel (DDP) and torchrun, demonstrating hands-on experience with

large-scale model training infrastructure.

EDUCATION

B.Tech/B.E. in Computer Science (Artificial Intelligence & Machine Learning)

\[THDC Institute of Hydropower Engineering and Technology\] • \[Roorkee,Uttarakhand\] • \[Expected Graduation: 2027\]

• Relevant Coursework: Deep Learning, Natural Language Processing, Large Language Models, Database Systems, Cloud Computing, Software

SKILLS

MLOps & Experiment Tracking: ZenML, MLflow, Optuna, Scikit-learn, XGBoost, LightGBM, automated evaluation pipelines

Languages: Python (expert), SQL (intermediate)

Model Training & Deep Learning: PyTorch, transformer architectures, Flash Attention, mixed precision (bfloat16/TF32), Distributed Data Parallel

(DDP), GPT-2 implementation from scratch

Web & DevOps: Flask, FastAPI (basic), Docker, AWS EC2, GitHub Actions (CI/CD), PostgreSQL, SQLAlchemy

Retrieval & LLM Applications: RAG, hybrid search (dense embeddings + BM25), cross-encoder reranking, LangChain, DataStax AstraDB, citation

enforcement

Observability & Monitoring: Request tracing, p50/p95 latency tracking, per-request cost monitoring, quality metric dashboards

## Comments

- **CareersCharlie** (1↑): Hi! I recently joined this discord server that's been posting internship and job opportunities consistently everyday. They include a variety of options, including software engineering, business, AI-related jobs, analytical, etc so it definitely opened me to so many more opportunities outside of LinkedIn and Indeed. I don't know if you'll be interested in joining but it definitely helped me find some great companies that I wasn't aware of before.
  - **Beneficial-Ad-2268** (2↑): I am interested in any opportunity I get ,how can I use this for seeking jobs and guidance??
