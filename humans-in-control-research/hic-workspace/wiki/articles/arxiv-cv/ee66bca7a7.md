---
id: articles/arxiv-cv/ee66bca7a7.md
url: "https://arxiv.org/abs/2608.23011"
url_hash: "ee66bca7a7"
kind: "article"
source: "arxiv_cv"
title: "Coarse Indexing, Fine Evidence: Decoupling Temporal Granularity in Long-Video RAG"
author: ""
date: "Tue, 25 Aug 2026 00:00:00 -0400"
tier: 3
method: "source-native"
extracted_at: "2026-08-25T23:45:36.501800+00:00"
chars: 3192
engagement: "identify-high-converting-email-design-patterns-and-product-m"
collected_at: "2026-08-25T23:45:36.697Z"
relevance: 0
engagement_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
content_hash: "12fc5af3423db194"
relevance_by_goal: {"8429cfd39d4f":0}
chunks:
  - id: "articles/arxiv-cv/ee66bca7a7.md#c0"
    char_span: [0, 2603]
    sentence_count: 9
    key_terms: [granularity, evidence, temporal, original, long-video, coarse, indexing, rag]
    concepts: [granularity, evidence, temporal, original, long-video]
    token_count: 496
    sources: [{"n":"arxiv_cv","u":"https://arxiv.org/abs/2608.23011","kind":"article","date":"2026-08-25"}]
  - id: "articles/arxiv-cv/ee66bca7a7.md#c1"
    char_span: [2615, 3332]
    sentence_count: 4
    key_terms: [arxivlabs, community, collaborators, influence, values, arxiv, core, organizations]
    concepts: [arxivlabs, community, collaborators, influence, values]
    token_count: 141
    sources: [{"n":"arxiv_cv","u":"https://arxiv.org/abs/2608.23011","kind":"article","date":"2026-08-25"}]
---
# Coarse Indexing, Fine Evidence: Decoupling Temporal Granularity in Long-Video RAG

Source: [arxiv_cv](https://arxiv.org/abs/2608.23011)

Computer Science > Computer Vision and Pattern Recognition
  [Submitted on 24 Aug 2026]
    Title:Coarse Indexing, Fine Evidence: Decoupling Temporal Granularity in Long-Video RAG
View PDF HTML (experimental)Abstract:Graph-based retrieval-augmented generation (RAG) provides a scalable paradigm for long-video understanding, but existing systems typically inherit a fixed temporal granularity from video segmentation when constructing their retrieval index. We argue that this design unnecessarily couples indexing granularity with evidence granularity: coarse representations can often suffice for locating relevant temporal regions, while fine-grained evidence remains important for downstream reasoning. We propose \textbf{Density-Aware Graph Construction (DAGC)}, a training-free approach that decouples a query-independent coarse retrieval index from the original fine-grained evidence space. DAGC constructs a compact, density-adaptive graph index by merging visually redundant neighboring chunks, while preserving mappings to the original temporal units. Retrieved coarse regions are subsequently expanded back to the original chunk granularity for fine-grained evidence refinement and answer generation. Experiments on MLVU, VideoMME, and LongVideoBench show that DAGC retains only about 40--50\% of the original graph nodes and achieves $1.3$--$1.7\times$ end-to-end wall-clock acceleration while preserving approximately 99\% of the original QA performance. The gains transfer across different LVLM backbones and video RAG pipelines, suggesting that long-video RAG need not maintain the same temporal granularity for indexing and evidence reasoning.
References & Citations
    
    Loading...
Bibliographic and Citation Tools
            Bibliographic Explorer (What is the Explorer?)
          
        
            Connected Papers (What is Connected Papers?)
          
        
            Litmaps (What is Litmaps?)
          
        
            scite Smart Citations (What are Smart Citations?)
          
        Code, Data and Media Associated with this Article
            alphaXiv (What is alphaXiv?)
          
        
            CatalyzeX Code Finder for Papers (What is CatalyzeX?)
          
        
            DagsHub (What is DagsHub?)
          
        
            Gotit.pub (What is GotitPub?)
          
        
            Hugging Face (What is Huggingface?)
          
        
            ScienceCast (What is ScienceCast?)
          
        Demos
Recommenders and Search Tools
              Influence Flower (What are Influence Flowers?)
            
          
              CORE Recommender (What is CORE?)
            
          arXivLabs: experimental projects with community collaborators
arXivLabs is a framework that allows collaborators to develop and share new arXiv features directly on our website.
Both individuals and organizations that work with arXivLabs have embraced and accepted our values of openness, community, excellence, and user data privacy. arXiv is committed to these values and only works with partners that adhere to them.
Have an idea for a project that will add value for arXiv's community? Learn more about arXivLabs.
