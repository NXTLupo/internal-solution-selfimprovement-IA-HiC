---
id: social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "has anyone here actually used AI to write code for a website or app specifically so other AI systems can read and parse it properly?"
author: "Academic_Flamingo302"
date: "2026-04-20T08:40:25.000Z"
score: 11
upvote_ratio: 0.77
num_comments: 55
flair: "Question"
extracted_at: "2026-10-09T16:37:34.756Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c0"
    char_span: [0, 1960]
    sentence_count: 8
    key_terms: [chatgpt, different, completely, write, changes, content, product, claude]
    concepts: [chatgpt, different, completely, write, chatgptcoding]
    token_count: 389
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/","kind":"social-post","date":"2026-04-20","author":"Academic_Flamingo302","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c1"
    char_span: [1975, 4028]
    sentence_count: 18
    key_terms: [documentation, better, horse, get, put, "shouldn't", reverse, solves]
    concepts: [documentation, better, horse, "shouldn't", reverse]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c2"]
    section: Comments
    token_count: 452
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/","kind":"social-post","date":"2026-04-20","author":"Academic_Flamingo302","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c2"
    char_span: [4030, 5838]
    sentence_count: 13
    key_terms: [car, data, documentation, strategy, struggle, content, better, horses]
    concepts: [documentation, strategy, struggle, content, better]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c1"]
    section: Comments
    token_count: 388
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/","kind":"social-post","date":"2026-04-20","author":"Academic_Flamingo302","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c3"
    char_span: [5840, 6644]
    sentence_count: 3
    key_terms: [different, content-marketing, geo, johns10davenport, discoverability, model-specific, probabilistic, specifically]
    concepts: [different]
    section: Comments
    token_count: 174
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/","kind":"social-post","date":"2026-04-20","author":"Academic_Flamingo302","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1sqjj5a.md#c4"
    char_span: [6646, 8450]
    sentence_count: 9
    key_terms: [product, models, schema, structured, ultrathink-art, data, different, functions]
    concepts: [product, structured, models, schema, ultrathink-art]
    section: Comments
    token_count: 406
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/","kind":"social-post","date":"2026-04-20","author":"Academic_Flamingo302","subreddit":"chatgptcoding"}]
---
# has anyone here actually used AI to write code for a website or app specifically so other AI systems can read and parse it properly?

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1sqjj5a/has_anyone_here_actually_used_ai_to_write_code/)
Posted by **Academic_Flamingo302** · **11↑** · **55 comments**

I am asking because of something I kept running into with client work last year.

I was making changes to web apps and kept noticing that ChatGPT and Claude were giving completely different answers when someone asked them about the same product.

same website. same content. different AI. completely different understanding of what the product actually does. at first I thought it was just model behaviour differences. then I started looking more carefully at why.

turns out different AI systems parse the same page differently. Claude tends to weight dense contextual paragraphs. ChatGPT pulls more from structured consistent information spread across multiple sources. Perplexity behaves differently again.

so a page that reads perfectly to one model is ambiguous or incomplete to another.

I ended up writing the structural changes manually. actual content architecture decisions. how information is organised. where key descriptions live.

I deliberately did not use AI to write this part. felt like the irony would be too much  using ChatGPT to write code that tricks ChatGPT into reading it better.

after those changes the way each AI described the product became noticeably more accurate and more consistent across models.

what I am genuinely curious about now.

has anyone here actually tried using AI coding tools to write this kind of architecture from the start. like prompting Claude or ChatGPT to build a web app specifically optimised for how AI agents parse and recommend content.

or is everyone still ignoring this layer completely because the tools we use to build do not think about it at all.

## Comments

- **Odd-Ad-900** (3↑): Yes
  - **Academic_Flamingo302** (1↑): great..could you share some insights ?
    - **pixelkicker** (4↑): Literally just put this question into ChatGPT and you’ll have your answer. There are many parsers out there.
- **JohnnyJordaan** (2↑): I'm not exactly sure if I follow but what strikes me at first is that this basically suggests a documentation void. That's why it relies on the AI's own particular investigative approach how it finds out about the inner workings of the application. That shouldn't be their responsibility to begin with. If the project is properly documented, it's easy for the AI to work from there. Any major model for that matter. Letting it reverse engineer is a last resort, not the first. Let alone coding in a way that reverse engineering is done better, which feels like finding a way to make the horse that's already put behind the wagon to run better... You get my point? The fix shouldn't be in improving a bad idea or situation but rather replacing it by something that solves the original problem better -> put the horse before the wagon. Or get a truck, to resolve the issue of horse placement altogether.

So the "prompt for AI to to build a web app specifically optimised for how AI agents parse and recommend content." should basically be to also include proper documentation from the get-go. And this is also how I work when integrating external libraries. I either let a MCP like context7 deliver the docs or I myself clone the library's github repo locally and direct the AI agent to use that 'for reference'.
  - **Academic_Flamingo302** (2↑): I get your point, and I think it’s a strong one.

Good documentation solves a lot of this earlier and more cleanly than trying to infer meaning later. I’m with you there.  
What pushed me into this wasn’t internal codebases though, it was public-facing products where the website becomes the documentation for buyers and increasingly for AI systems too. In those cases, many businesses have no real docs at all, only pages written for humans.

So I see it less as replacing documentation and more as extending clarity into the public layer as well.
    - **JohnnyJordaan** (1↑): Imho it's solving the issue at the wrong end. If you want a better transportation device, you build a car. You don't breed faster or more resilient horses. Documentation is the car. Making the code "speak for itself" as you seem to aim for is basically trying to trying to breed a better horse. Yes it can work but it never becomes a car. The lack of a car shouldn't be solved through horses.
- **Western_Objective209** (1↑): the general strategy to make content AI accessible is to have a JSON output available and discoverable by an LLM. The differences tend to come down to the kind of browser each chatbot has, and for whatever reason they use ones that aren't particularly good so they struggle to parse interactive pages
- **cornmacabre** (1↑): There's a lot under the surface of the insight you bumped into!

Structured data, the SEO philosophy of 'optimize for humans and for robots,' and so much more that's aligned to several pillars of information theory and data strategy.

My advice without being too condescending or prescriptive is try to uncouple the letters "AI" from your mental model of this topic (although it certainly is relevant here). You'll be ahead of the curve by applying well established meta-content practices and data strategies that folks in domains like marketing and data science know very well.

Chase the AI dragon superficially and myopically here based on what you've framed in this post, and you're likely just gonna reinvent a really shitty wheel. Focus on the taxonomy of your site, your meta-data approach across templates, and observe how different webcrawlers parse the content (or struggle with loops) is a good place to start. 

It'll be a big mistake if you fixate specifically on LLM response differences; beyond the nature of probabilistic output, every AI provider uses a different web retrieval approach... focus on the principles around content parsability and discoverability.
  - **Academic_Flamingo302** (3↑): Really thoughtful comment.I agree with the core warning and the long-term answer is stronger foundations, not model-specific hacks.
- **johns10davenport** (1↑): Are you talking about GEO, or writing tools for agents?
  - **Academic_Flamingo302** (2↑): A bit of both, honestly.

Not GEO in the usual content-marketing sense, and not just internal agent tooling either. More the layer where a product exists publicly, but different AI systems understand it differently depending on how the information is structured.

I’m interested in that gap between what we built and what the model thinks we built. That gap is getting more important now.
    - **johns10davenport** (0↑): I don’t think this is important at all. I think you are in an unnecessary rabbit hole.
- **-IoI-** (1↑): Yes, I add instructions that summarise complex user journeys, related functions and data context, general test execution plan and any callled/relevant functions/classes. I place these at roots of distinct functionality at the end of a debug/feature development session with an ApplyTo pattern to ensure it gets auto-discovered when needed.
  - **Academic_Flamingo302** (2↑): That’s interesting.
- **ultrathink-art** (1↑): JSON-LD schema markup matters more than prose for this — models that crawl your site parse structured data far more consistently than marketing copy. The variation you hit (same site, different models, different answers) is often because LLMs weight structured fields heavily and improvise on unstructured text. Typed attributes with unambiguous field names beat long descriptive paragraphs for cross-model consistency.
  - **colblair** (1↑): Exactly. I've seen models ignore half a product description but reliably pull specs from a [schema.org/Product](http://schema.org/Product) block.
- **Accurate_Hand_832** (1↑): Ummm not the full codes but a correction in a code.
- **FunctionThat5686** (1↑): [ Removed by Reddit ]
- **ultrathink-art** (1↑): Structured data (JSON-LD schema markup) gives the most consistent parsing across models — they're all trained to respect it. Plain HTML descriptions diverge because each model weights layout/CSS signals differently. For anything agents will touch repeatedly, versioned JSON APIs with explicit endpoint naming (`/api/v2/products`) beat scraping a product page every time.
