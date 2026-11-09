---
id: articles/openai-blog/9c0a1aa3bb.md
url: "https://openai.com/index/advancing-content-provenance"
url_hash: "9c0a1aa3bb"
kind: "article"
source: "OpenAI Blog"
title: "Advancing content provenance for a safer, more transparent AI ecosystem"
author: ""
date: "Tue, 19 May 2026 10:45:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-25T23:40:47.709896+00:00"
chars: 6402
engagement: "identify-high-converting-email-design-patterns-and-product-m"
collected_at: "2026-08-25T23:40:47.561Z"
relevance: 0
engagement_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
content_hash: "bc8b2e9d9b246b2f"
relevance_by_goal: {"8429cfd39d4f":0}
chunks:
  - id: "articles/openai-blog/9c0a1aa3bb.md#c0"
    char_span: [0, 151]
    sentence_count: 1
    key_terms: [advancing-content-provenance, openai, transparent, provenance, advancing, ecosystem, content, source]
    concepts: [openai]
    token_count: 36
    sources: [{"n":"OpenAI Blog","u":"https://openai.com/index/advancing-content-provenance","kind":"article","date":"2026-05-19"}]
  - id: "articles/openai-blog/9c0a1aa3bb.md#c1"
    char_span: [153, 2777]
    sentence_count: 15
    key_terms: [provenance, content, verification, images, openai, people, synthid, through]
    concepts: [provenance, content, verification, images, openai]
    related_chunks: ["articles/openai-blog/9c0a1aa3bb.md#c2", "articles/openai-blog/9c0a1aa3bb.md#c3"]
    token_count: 512
    sources: [{"n":"OpenAI Blog","u":"https://openai.com/index/advancing-content-provenance","kind":"article","date":"2026-05-19"}]
  - id: "articles/openai-blog/9c0a1aa3bb.md#c2"
    char_span: [2459, 5087]
    sentence_count: 22
    key_terms: [provenance, content, information, metadata, c2pa, through, watermarking, helps]
    concepts: [provenance, information, content, metadata, through]
    related_chunks: ["articles/openai-blog/9c0a1aa3bb.md#c1"]
    token_count: 512
    sources: [{"n":"OpenAI Blog","u":"https://openai.com/index/advancing-content-provenance","kind":"article","date":"2026-05-19"}]
  - id: "articles/openai-blog/9c0a1aa3bb.md#c3"
    char_span: [4766, 6556]
    sentence_count: 13
    key_terms: [provenance, signals, people, verification, generated, content, openai, detection]
    concepts: [provenance, signals, verification, people, generated]
    related_chunks: ["articles/openai-blog/9c0a1aa3bb.md#c1"]
    token_count: 351
    sources: [{"n":"OpenAI Blog","u":"https://openai.com/index/advancing-content-provenance","kind":"article","date":"2026-05-19"}]
---
# Advancing content provenance for a safer, more transparent AI ecosystem

Source: [OpenAI Blog](https://openai.com/index/advancing-content-provenance)

Advancing content provenance for a safer, more transparent AI ecosystem
Helping people understand the origin of AI-generated content through Content Credentials, SynthID, and an early public verification tool.
Update July 31, 2026: We’re expanding this work beyond images. Supported audio generated with OpenAI tools, including through ChatGPT and the OpenAI API, now includes SynthID watermarking. Our public verification tool will now allow for verification of supported audio files in addition to images. We’re also introducing API access for verification, so developers and organizations can incorporate provenance checks into their own workflows. Together, these updates build on the multi-layered approach described below: combining open standards like C2PA, durable watermarking signals like SynthID, and verification tooling to make provenance easier to detect and use across more kinds of OpenAI-generated content.
People are using OpenAI’s tools everyday to create and edit images and audio in ways that make communication more expressive, useful, and accessible. As these tools become a part of how people build, imagine, and share, it’s important that people can understand and verify where the media comes from so they can interpret it with more confidence. Provenance signals can help by giving people context about where content came from, how it was created or edited, and whether it is what it claims to be.
Today we’re strengthening our approach to content provenance with a multi-layered, ecosystem-driven model to building trust online. We are making our provenance signals easier for other tools and platforms to recognize through C2PA conformance, adding durable cross-platform SynthID watermarking to images through a partnership with Google, and sharing a preview of a tool the public can use to verify whether images came from OpenAI.
Together these updates build on our earlier work to support open standards, make OpenAI-generated content easier to identify, and collaborate across the industry to support a more trustworthy information ecosystem.
OpenAI has been engaged in the development and adoption of provenance standards since 2024, when we began adding Content Credentials to images generated by DALL·E 3(opens in a new window) and later to ImageGen(opens in a new window) and Sora(opens in a new window). We also joined the Steering Committee of the Coalition for Content Provenance and Authenticity (C2PA), the cross-industry group behind the open technical standard for content provenance. C2PA’s technical approach uses metadata and cryptographic signatures to help information about a piece of media securely travel with the content itself. This information includes context that helps journalists evaluating a source, platforms making integrity decisions, and people trying to understand what they are seeing online.
We recently took the step of making OpenAI a C2PA Conforming Generator Product(opens in a new window). By becoming C2PA conformant, we are giving platforms a trusted way to read, preserve, and pass along the provenance information we attach to our content. This matters because provenance only works if it survives beyond the first platform where content is created, and conformance makes that possible.
C2PA metadata is an important foundation for provenance. It helps content carry information about where it came from, how it was created or edited, and who signed that information. But metadata is not foolproof. It can be stripped, lost through uploads and downloads, or broken by transformations like file format changes, resizing, or screenshots.
To make provenance more resilient, we are taking a multi-layered approach and incorporating watermarking through Google DeepMind’s SynthID(opens in a new window), starting with images generated through ChatGPT, Codex, or the OpenAI API. SynthID embeds an invisible watermarking layer that complements C2PA metadata-based approaches.
We’ve been building toward this for some time. We have used visible watermarks in Sora and an audio watermark in Voice Engine, and have continued to test and research accuracy and reliability over time. through deployment.
These two systems reinforce each other. C2PA helps content carry detailed context; SynthID helps preserve a signal when metadata does not survive. Watermarking can be more durable through transformations like screenshots, while metadata can provide more information than a watermark alone. Together, they make provenance more resilient than either layer would be on its own.
Trusted metadata and watermarks that resist most modifications can make provenance signals more durable. But people need a way to detect these signals. We are now previewing a public verification tool that will help people verify whether an uploaded image was generated on ChatGPT, the OpenAI API, or Codex, by checking if it contains provenance signals, including Content Credentials and SynthID.
We believe provenance should be easier for people to verify and interpret, and that our tool can help people play a role in answering the question, “Was this generated with AI?” by integrating multiple signals. This builds on learnings from the initial research preview of our image detection classifier in 2024 and enables people to reliably detect whether a SynthID watermark originating from OpenAI is present in the media, as well as surface C2PA metadata when it is found.
No detection method is foolproof, so we take a cautious approach in cases when detection fails. If no metadata or watermark is detected, for example, the tool will not make a definitive conclusion about whether the image was generated with OpenAI tools since provenance signals can in some cases be stripped.
At launch, the tool is limited to content generated by OpenAI. In the upcoming months, we aim to support cross-industry efforts to make verification possible across platforms. Over time, we also expect to support more types of content that people may encounter online.
No single provenance technique is enough on its own. We believe a strong approach combines shared standards, durable watermarking signals, and public verification. By building on our long-standing support for Content Credentials, becoming conformant with C2PA, adopting SynthID, and previewing public verification tooling, we hope to contribute in the long run to a more interoperable provenance ecosystem.
