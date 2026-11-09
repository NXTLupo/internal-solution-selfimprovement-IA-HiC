---
id: articles/reddit-deep-r-webdev/8bac23fe9d.md
url: "https://www.reddit.com/r/webdev/comments/1n95qe8/how_do_you_usually_code_static_websites/"
url_hash: "8bac23fe9d"
kind: "article"
source: "Reddit Deep: r/webdev"
title: "How do you usually code static websites?"
author: ""
date: "2025-09-05T13:46:47.000Z"
tier: 
method: "source-native"
extracted_at: "2026-08-26T19:13:41.945546+00:00"
chars: 2483
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:13:41.176Z"
relevance: 40
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "0aa38be02e9357e1"
relevance_by_goal: {"d21cb50b17ba":40}
chunks:
  - id: "articles/reddit-deep-r-webdev/8bac23fe9d.md#c0"
    char_span: [0, 2076]
    sentence_count: 15
    key_terms: [css, tailwind, variables, like, use, beginner, understanding, start]
    concepts: [tailwind, variables, beginner, understanding, start]
    token_count: 499
    sources: [{"n":"Reddit Deep: r/webdev","u":"https://www.reddit.com/r/webdev/comments/1n95qe8/how_do_you_usually_code_static_websites/","kind":"article","date":"2025-09-05","subreddit":"webdev"}]
  - id: "articles/reddit-deep-r-webdev/8bac23fe9d.md#c1"
    char_span: [2078, 2652]
    sentence_count: 5
    key_terms: [tailwind, developers, classes, styles, bunch, style, like, declarations]
    concepts: [tailwind, developers, classes, styles, bunch]
    token_count: 123
    sources: [{"n":"Reddit Deep: r/webdev","u":"https://www.reddit.com/r/webdev/comments/1n95qe8/how_do_you_usually_code_static_websites/","kind":"article","date":"2025-09-05","subreddit":"webdev"}]
---
# How do you usually code static websites?

Source: [Reddit Deep: r/webdev](https://www.reddit.com/r/webdev/comments/1n95qe8/how_do_you_usually_code_static_websites/)

I want to recreate a design from Figma, it’s a project with 3 subpages, mostly layout and some light interactions.  
Would you build it with plain HTML + CSS (and maybe a little JavaScript), or is it better to use something like Tailwind or SASS/SCSS ? How do you usually approach projects like this? Also, since I’m still a beginner, I’m wondering if I should already start using things like BEM, CSS variables, etc., or are those mostly for larger projects?

--- TOP COMMENTS ---
[169↑ heesell] If you're a beginner, use css instead of hopping onto the Tailwind wagon. Understanding css is important.
[15↑ F1QA] 100% use semantic CSS variables too, at the very least for your palette. Makes life much easier when it comes to making tweaks or adding themes.
[20↑ sorge13248] Understanding css is !important
[3↑ Sudden_Excitement_17] Stop it you!
[21↑ Headpuncher] Definitely this, sooner or later you’ll find yourself in a project that doesn’t use tailwind, doesn’t have scope for it and isn’t ever going to get it.   You’ll need to know how to do more than just copy class names into html.   

Assuming tailwind is even around in 3-5 years.  I know css will be.
[36↑ berky93] If you’re a beginner, my advice is to avoid tailwind. It teaches you a lot of what might generally be considered anti-patterns (such as effectively inlining all your styles). I would suggest you start with the basics and expand your toolset as the need arises.

But as for things like BEM and CSS variables (which aren’t really in the same category, but close enough), those are practices that you can start to familiarize yourself with early. CSS variables is a pretty core concept in styling these days, and it’s always good to get into the habit of structuring your components and classes in an organized way.
[0↑ GradjaninX] Interesting, never heard that inline is anti-pattern. Especially from bootstrap/tailwind environment.

style attribute could be considered anti pattern, but tailwind is essentially just a bunch of classes, which is fine. Nobody will read html anyways.
[5↑ berky93] Tailwind is a bunch of classes, but they act like style declarations. So you get a lot of the same issues of readability and reusability as inline styles. But for beginner developers, you also start building a habit of putting all of your styles in your markup, which isn’t a great practice.

Tailwind has its place—clearly many developers like it—but for someone who is just learning I would advise against it.
