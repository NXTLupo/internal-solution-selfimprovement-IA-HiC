---
id: social-intelligence/reddit-deep/productmanagement/1q9un4p.md
url: "https://www.reddit.com/r/ProductManagement/comments/1q9un4p/can_a_chatgpt_agent_analyze_my_web_app_flow_and/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Can a ChatGPT agent analyze my web app flow and provide real UX recommendations?"
author: "Maleficent_Mud7141"
date: "2026-01-11T08:58:23.000Z"
score: 0
upvote_ratio: 0.42
num_comments: 14
flair: ""
extracted_at: "2026-06-18T13:35:35.654Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1q9un4p.md#c0"
    char_span: [0, 828]
    sentence_count: 6
    key_terms: [recommendations, productmanagement, app, flow, real, comments, homepage, chatgpt]
    concepts: [recommendations, productmanagement, comments, homepage, chatgpt]
    token_count: 196
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1q9un4p/can_a_chatgpt_agent_analyze_my_web_app_flow_and/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1q9un4p.md#c1"
    char_span: [842, 2621]
    sentence_count: 16
    key_terms: [users, "don't", user, reach, "it's", real, feedback, validate]
    concepts: [users, "don't", reach, feedback, validate]
    section: Comments
    token_count: 455
  - id: "social-intelligence/reddit-deep/productmanagement/1q9un4p.md#c2"
    char_span: [2623, 4349]
    sentence_count: 14
    key_terms: [give, user, feedback, chrome, claude, based, etc, web]
    concepts: [feedback, chrome, claude, based, behavior]
    section: Comments
    token_count: 410
---
# Can a ChatGPT agent analyze my web app flow and provide real UX recommendations?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1q9un4p/can_a_chatgpt_agent_analyze_my_web_app_flow_and/)
Posted by **Maleficent_Mud7141** · **0↑** · **14 comments**

Hey everyone,  
I have a web app + a marketing homepage, and I’m considering using a ChatGPT agent to go through the entire flow (onboarding, main screens, key actions) and return a structured document with UX / CRO recommendations.

My questions:

1. Is this actually effective in practice, or does it stay mostly theoretical?
2. If not — are there tools that simulate a real user and provide AI-based recommendations to improve product flow (both homepage and app)?
3. I’d love to hear from real experience, not demos 🙂

Thanks!

## Comments

- **rollingSleepyPanda** (4↑): Are you building a web app for an ai agent, or for a specific user profile? What's keeping you from collecting usage data or talking to users?
  - **Maleficent_Mud7141** (0↑): I Don't know how to reach them
- **lykosen11** (3↑): It sure can.


But will it be remotely right when it comes to your users?

You have no idea. It will behave the same right or wrong.


Validate.
- **tgcp** (1↑): It would be a decent starting point for a wider research project but I wouldn't take it as gospel. It's a cheap, easy way to get some focus areas for your conversations with actual users or potential users, but don't let it become your only focus - if your interviewees try to steer the conversation elsewhere, let them.
- **Tonu13** (1↑): Prod Hunt used to be a great place for this
Now with AI startups and tools launching at the rate of knots, there is no easy way to get feedback from real user community. You’ll have to rely on one or the other AI platform for this else reach out to random PMs on Linkedin and hope that they are able to provide recommendations.
- **deadineaststlouis** (1↑): It will certainly give you something that looks like feedback.

Given how hard it is to do good user testing and avoid people telling you what they think they should say, I have no idea why you'd want a robot to do more of that.

Find a real person on your segment. If it's mass appeal even better. Do some user testing. Read Krug's books on this if you're not sure how. It's not expensive or hard. Most people are just lazy and don't do it.
- **_CaptRondo_** (1↑): Sorry, why not just validate with real users?!
  - **Maleficent_Mud7141** (0↑): Don't know how to reach them
    - **_CaptRondo_** (0↑): Can you elaborate on that?
Also, data like heatmaps etc?

It’s just that AI etc can give you predictions and feedback based on best use case (as in that is how they are trained), but nothing will beat real world usage and feedback
- **Odd-Sugar3927** (1↑): Claude code with Google Chrome. Make sure you have NPM on your machine, go into the directory, hit ‘Claude --chrome’ and then you can use the chrome MCP server and browser extension. Literally just have Claude at that point go in.
- **Forrest319** (1↑): I haven't done this with Chad GPT but I know Gemini can. It can watch videos you give it so you give it a recording of a web session or your workflow while narrating. I've given it screenshots for ux feedback too.
- **mckirkus** (1↑): I took over a pretty large product in the mortgage space.  1000s of active paying customers.  .  The first thing I did was build 5 tables to store every single user behavior.  Timestamped button clicks, navigations, etc.  This wasn't web based but still applies.  Exported some SQL queries to CSV and picked it apart in Excel with Pivot Tables.  

The off the shelf web based solutions really don't give you the context you need for each interaction to give more than a surface level understanding.  For instance, you don't just want the user, you probably also want their zip code, parent account, etc.   Get that raw user behavior data out, then augment it either when it's logged or after, then pivot table it.

It feels like you're trying to offload to AI things you should be trying ot understand yourself.
- **el0011101000101001** (1↑): Why are product managers allergic to involving a UX team? This is exactly why user researchers and designers exist.
  - **ch-12** (1↑): Some companies don’t value or invest in a good design team.
