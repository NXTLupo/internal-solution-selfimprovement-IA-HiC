---
id: social-intelligence/reddit-deep/productmanagement/1qpnpb2.md
url: "https://www.reddit.com/r/ProductManagement/comments/1qpnpb2/steelmanning_a_a_product_spec_with_ai_making_the/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Steelmanning a a product spec with AI - Making the best version of a spec before you \"hand it over\""
author: "catnach"
date: "2026-01-28T20:55:14.000Z"
score: 0
upvote_ratio: 0.46
num_comments: 4
flair: ""
extracted_at: "2026-10-09T16:37:15.731Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1qpnpb2.md#c0"
    char_span: [0, 1888]
    sentence_count: 11
    key_terms: [something, productmanagement, product, "don't", did, okay, read, spec]
    concepts: [productmanagement, something, product, "don't", documents]
    token_count: 433
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1qpnpb2/steelmanning_a_a_product_spec_with_ai_making_the/","kind":"social-post","date":"2026-01-28","author":"catnach","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1qpnpb2.md#c1"
    char_span: [1890, 3992]
    sentence_count: 26
    key_terms: [output, post, team, business, feature, project, format, instructions]
    concepts: [output, business, feature, project, instructions]
    token_count: 467
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1qpnpb2/steelmanning_a_a_product_spec_with_ai_making_the/","kind":"social-post","date":"2026-01-28","author":"catnach","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1qpnpb2.md#c2"
    char_span: [3994, 5966]
    sentence_count: 12
    key_terms: [ask, like, preferred, questions, complete, markdown, context, format]
    concepts: [preferred, questions, complete, markdown, context]
    token_count: 453
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1qpnpb2/steelmanning_a_a_product_spec_with_ai_making_the/","kind":"social-post","date":"2026-01-28","author":"catnach","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1qpnpb2.md#c3"
    char_span: [5981, 7544]
    sentence_count: 18
    key_terms: [prd, read, approach, snarkylalaith, requirements, use, management, product]
    concepts: [approach, snarkylalaith, requirements, management, product]
    section: Comments
    token_count: 363
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1qpnpb2/steelmanning_a_a_product_spec_with_ai_making_the/","kind":"social-post","date":"2026-01-28","author":"catnach","subreddit":"productmanagement"}]
---
# Steelmanning a a product spec with AI - Making the best version of a spec before you "hand it over"

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1qpnpb2/steelmanning_a_a_product_spec_with_ai_making_the/)
Posted by **catnach** · **0↑** · **4 comments**

Before we dig into the AI, first consider what your challenges are and how to address them, for example:

* Devs don't deliver what was needed - okay, but did they understand the thing in the first place?
* Designer designing things that can't be built in the timeframes - okay, but did they know about the time constraints or engineering limitations?
* Delivery is buggy or breaks other features - okay, but did the team know how this might impact other bits of the product? Have they ever even used the product?

And then, if you steelman your spec, will anyone read it? Do you have processes or ceremonies in place to ensure that people actually review what you've created? 

Finally, a warning: AI hallucinates, a **lot**. You *must read through* whatever it produces and edit it. I spend as much time prompting as I do editing. To put something really good together it's probably 2 hrs work now (maybe 8/10hrs before). You will lose the trust of your team if you ask them to read AI slop. 

  
**With all the said, let's begin!**

\---

# Step 1 - Tool selection

You don't need to overthink this, Claude, ChatGPT, Gemini, all fine. Pick something that's approved in your workplace and something that has some concept of "projects" as this will make your life easier later. Don't necessarily use the biggest models in these tools as sometimes they "overthink" things

# Step 2 - Create your context

You must have these five core documents nailed down before you start, you will load these documents into your project and they will dramatically alter the quality of the output.

1. Market - A detailed write up of what market you operate in and who your customer is. Is your industry regulated? Is it growing or shrinking? What country are you operating in and delivering for? 
2. Business - What is your business and business model? How does it work? Who pays? Who uses the product? What are they trying to achieve?
3. Team - What is your general company and team structure? Who is in your team? What are their roles? What is your team's objective?
4. Technology - What tech are you using? What data do you have or not have? What do you need to worry about and/or not worry about? (Example is if you work at Microsoft and you're building Office365 features, it's unlikely you need to worry about auth. If you're in a tiny startup, maybe you haven't even built auth yet?)
5. Output format (markdown) - What is the ideal output format? What are the key sections? Think about best practice here and then reduce later. I delete about half of what the AI writes nowerdays as the models have become so verbose. In this document you can ask for your preferred format of things to address your key areas of concern, such as mermaid diagrams or gherkin tests. 

You can add other useful docs as well such as internal lingo and acronyms etc. 

# Step 3 - Set your project instructions

Keep this simple and to the point, below are my project instructions.

>You are an expert product manager who is helping me write the requirements for a new feature my team is building.

>Your job is to generate output .md files in British English. 

>Before creating the file, you should ask as many questions as necessary. The accuracy of the output filee is of paramount importance. 

# Step 4 - Give it a try

Start with a simple prompt in this project, something like

>We're going to build a new feature for post upvoting. The key aspects of the feature are:

>\- Whenever users see a useful post, they're encouraged up upvote it

>\- Comments and upvotes boost the post's ranking on the feed

>\- When a post reaches a certain threshold, the post is then shared on subreddit follower general feeds

You'll be amazed at how you can go from the above to a full spec by answering 20-40 questions that the LLM will ask you. As it has all that juicy context you provided earlier, it'll ask you intelligent questions. Without the context, it'll be worthless. 

Also, you can add screenshots, pictures etc. These tools are multi-modal now and sometimes diagrams help. 

# Step 5 - Edit like a journalist

Pull the markdown file out and edit it in your preferred markdown editor (Jira, Notion, Linear, Macdown, Obsidian, the list goes on). 

Edit it like a journalist, ie be brutal. You should use a few words, with the least amount of complicated language, to communicate. Bonus tip, read "On Writing Well" by William Zinsser. 

LLMs are becoming verbose, your job now is to ensure accuracy and to make it easy to read. 

# Step 6 - Ship it and get feedback

Pretty simple, send it out, get feedback, iterate on your prompting and your context documents. Play around and find what works for you. 

==========

**Some random tips:**

* **Make it feel like it's everyone's document**, not just yours - Leave sections for other people to complete, like a "Engineering to complete" in the architecture section, "QA to complete" in the testing requirements, "Design to populate" in the design links section
* **Markup is your friend** \- Always ask the tools for diagrams in Mermaid, and outputs in Markdown
* **If you're unsure, use AI to unblock you** \- For example, if you can't think of a best practices output format for the spec, ask AI to help you create one. DO NOT ask it to create one from scratch, ask it to ask you how. 
* **Ask your team how they like to get documentation** \- Now that transforming your preferred format (say user stories) into their preferred format (say functional requirements) is basically zero effort, you can cater to this! 

  
Hope this is useful to at least some of you - happy to answer questions in the comments below :) 

Have a great day!

## Comments

- **SnarkyLalaith** (13↑): I didn’t even read through this. No one is going to read through a large PRD. 

Involve the team early. 

Use the PRD as documentation. 

Make sure the engineering designs handle your requirements. A kickoff review is a potential way to get this started. 

Make sure the tickets do as well. 

Update PRD with new findings so it stays relevant as the source. 

Done.
  - **catnach** (-4↑): I appreciate the reply but I’d like to push back a bit.

What you describe is an approach to product management, not the approach. 

It’s frustrating to see people be so reductive about product management but it’s understandable because the rhetoric of our practice is driven by a tiny group of individuals at an even tinier group of companies who all do roughly the same thing. 

Large PRDs are common in many industries for many reasons, such as regulated medical products where you have to document exactly what the thing is meant to do to meet regulatory requirements. 

I could list other examples but I suspect you wouldn’t read it. It’s just an approach to improving a process that might not be appropriate for your use case.
    - **SnarkyLalaith** (4↑): I am not arguing that the PRD isn’t important. Note that I mentioned keeping it updated and using it as a base. 

But we need to be rooted in reality. It isn’t about perfecting the PRD. It is about clear communication and ensuring the team understands the what and the why.
    - **McSendo** (3↑): I read it, but you didn't mention which use cases this is good for and which it isn't.
