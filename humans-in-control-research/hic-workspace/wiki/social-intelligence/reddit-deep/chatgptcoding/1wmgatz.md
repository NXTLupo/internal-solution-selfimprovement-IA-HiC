---
id: social-intelligence/reddit-deep/chatgptcoding/1wmgatz.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1wmgatz/90_of_vibecoded_saas_are_ready_to_get_hacked/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "90% of vibecoded saas are ready to get hacked, here's the data:"
author: "russopuppo"
date: "2026-09-21T15:38:54.000Z"
score: 0
upvote_ratio: 0.32
num_comments: 8
flair: "Resources And Tips"
extracted_at: "2026-10-09T16:37:34.761Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wmgatz.md#c0"
    char_span: [0, 1977]
    sentence_count: 12
    key_terms: [database, data, access, user, backend, project, "here's", chatgptcoding]
    concepts: [database, access, chatgptcoding, backend, project]
    token_count: 464
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wmgatz/90_of_vibecoded_saas_are_ready_to_get_hacked/","kind":"social-post","date":"2026-09-21","author":"russopuppo","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wmgatz.md#c1"
    char_span: [1979, 4424]
    sentence_count: 23
    key_terms: [permissions, private, frontend, api, check, backend, code, find]
    concepts: [permissions, private, frontend, check, backend]
    token_count: 499
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wmgatz/90_of_vibecoded_saas_are_ready_to_get_hacked/","kind":"social-post","date":"2026-09-21","author":"russopuppo","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wmgatz.md#c2"
    char_span: [4426, 5160]
    sentence_count: 7
    key_terms: [limits, generation, endpoint, provider, request, add, api, file]
    concepts: [limits, generation, endpoint, provider, request]
    token_count: 150
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wmgatz/90_of_vibecoded_saas_are_ready_to_get_hacked/","kind":"social-post","date":"2026-09-21","author":"russopuppo","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wmgatz.md#c3"
    char_span: [5175, 6920]
    sentence_count: 13
    key_terms: [test, instead, prompt, starting, backend, without, enough, people]
    concepts: [instead, prompt, starting, backend, without]
    section: Comments
    token_count: 404
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wmgatz/90_of_vibecoded_saas_are_ready_to_get_hacked/","kind":"social-post","date":"2026-09-21","author":"russopuppo","subreddit":"chatgptcoding"}]
---
# 90% of vibecoded saas are ready to get hacked, here's the data:

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1wmgatz/90_of_vibecoded_saas_are_ready_to_get_hacked/)
Posted by **russopuppo** · **0↑** · **8 comments**

I use reddit daily and I see people building saas with lovable, bolt, replit and other tools like these all the time, so I wanted to check how safe these projects actually are.

I started by reading security scans and blog posts about security of vibecoded products:

the result is that 90% of tested apps had at least one vulnerability. What shocked me is how stupid most of the problems are: database rules, user isolation, backend permissions, exposed API keys and endpoints with basically no protection

here’s the most common patterns I found and the prompts I would use to fix them:

# 1. Open databases

A lot of apps have authentication, but the database rules aren’t safe: that means the app knows who you are, but the database still returns data you shouldn't be able to access.

**For example**: your dashboard only shows me my own customers, but I open the request in DevTools, remove the filter for my account and the API sends me customers from other users too.

Here's the fix:

“Audit every database table that stores private data. For each one, define who can read, create, update and delete data. Deny access by default and enforce these rules in the database or backend, not in the frontend. Get the user and workspace from the verified server session, never from IDs sent by the client.”

# 2. Broken user isolation

Another common problem is users being able to access data that they don't own.

Usually the backend checks if the user is logged in, but doesn't also check who owns the specific project, file or any other element.

For example: I'm on my project at “www.mysaas.com/project-1/“, I change it to “www.mysaas.com/project-2/“ and I can access somebody else's project.

Here's the fix:

“Check every API route and database query that receives an ID or reference to private data. Before editing or deleting anything, verify on the server that the logged in user is actually allowed to access that resource. Never trust an ID, owner, role or access rule sent by the frontend, and use one shared authorization system instead of different checks in every endpoint. ”

# 3. Broken permissions

Sometimes roles and permissions exist only in the frontend. The app hides pages and buttons correctly, but the backend doesn't check the same rules when someone calls the API directly.

For example: I'm a normal member, so the "Delete user" button is hidden. I open DevTools, find the api request used by the admin and send it myself: if the backend doesn't check my role, the action can still go through.

For this part, using a backend provider can be a better solution than asking ai to rebuild the same auth, workspaces, permissions, etc.. from zero.

I use foundel.dev to manage security, auth, payments, permissions, etc… so I suggest looking around for one that matches your needs.

If you're building it yourself, here's the fix:

“Create one shared permission system for all private backend actions. Block access by default. Before any admin, billing, workspace or account action runs, check the logged in user's role and permissions on the server. Never trust permissions sent by the frontend.”

# 4. Exposed secrets and API keys

Private keys sometimes end up inside frontend code or public repos. If a private environment variable is included in the frontend build, anyone using the website may be able to find and copy it.

For example: I open DevTools, search the website's javascript and find a private api key. I can copy that key and use it from my own computer while every request is still charged to your account.

Here's the fix:

“Audit the project for exposed API keys, tokens and secrets. Check the current code and git history using a secret scanner if available. Find every private credential used in frontend code or committed to the repository, move private credentials and privileged API calls to server-side code, and list every exposed credential that must be revoked and replaced. Do not print the secret values.”

# 5. No rate limits

Some endpoints cost you money every time they're called. If you don't add limits, a single user can repeatedly trigger AI generation, emails, scraping or other paid operations.

For example: your app has an ai generation endpoint at /api/generate. I write a small script that calls it 10,000 times. Every request works, your provider charges you for all of them and nothing stops me.

Here's the fix:

“Find every endpoint that uses a paid API or expensive operation, including AI generation, email, SMS, scraping, file processing and background jobs. Add server-side rate limits and usage limits per user and workspace, and enforce them before calling the paid service. Add daily or monthly caps, request and file size limits where needed, and list every external provider where I should enable spending limits or billing alerts.”

Let me know what you think in the comments. Hope to help some people stay safe.

## Comments

- **Any-Blacksmith-2054** (8↑): 99% vibecoded saas have zero users, why bother
  - **Infinitedeveloper** (1↑): Damn, couldnt even get their mom to try it out?
- **Muted_Ad_9442** (2↑): Really good points, especially point 3 about permissions.

One dangerous thing I noticed when using AI coding tools is how easily they bypass security to make things "work". 

Recently I saw an agent that was trying to fix a failing test. Instead of fixing the backend permission bug, it simply commented out the auth check and edited the test assertion to expect 200 OK instead of 403! And then told the developer "all tests are green now". 

If someone is just vibecoding without checking git diffs carefully, you end up with open endpoints everywhere. Prompt instructions like "make sure it's secure" are never enough, you really need strict tests in CI that the AI cannot touch or rewrite.
  - **russopuppo** (1↑): I agree, I think every vibecoder should learn about backend and system architecture. The post was for people just starting out and obviously one prompt is not enough but I figured it could still help people to make their app safer
    - **Muted_Ad_9442** (1↑): Totally agree! For beginners, your prompt checklist is a great starting point and definitely better than having no protection at all. Raising awareness about this is what matters most. Thanks for putting it together!
- **Salt_Hyena5896** (1↑): The most useful part is treating DevTools/API calls as the test surface instead of trusting the UI. I’d add one CI smoke test per tenant: replay the same read/update request as a user from a second tenant and assert 403/empty data, plus a secret scan on built assets. That catches isolation regressions without relying on manual review.
