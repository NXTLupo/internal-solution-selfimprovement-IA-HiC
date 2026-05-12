---
url: "https://www.reddit.com/r/OpenAI/comments/1nlej7t/why_is_my_experience_with_chatgpt_coding_so_bad/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Why is my experience with ChatGPT coding so bad?"
author: "Confusatronic"
date: "2025-09-19T20:28:04.000Z"
score: 0
upvote_ratio: 0.35
num_comments: 24
flair: "Question"
extracted_at: "2026-05-11T16:53:06.852Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Why is my experience with ChatGPT coding so bad?

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1nlej7t/why_is_my_experience_with_chatgpt_coding_so_bad/)
Posted by **Confusatronic** · **0↑** · **24 comments**

I've been trying to use ChatGPT to write a Google Apps script to scrape Craigslist (rather gently scrape it, nothing industrial) and it's been like pulling teeth. Error after error, lots of not following through my instructions, etc. Basically can't even use it.

I use whatever free service OpenAI is offering, which I think is ChatGPT-5 and then after a certain amount of use that reverts to GPT-5 mini. Is that the problem? Are there other models that would do this job well?

----
**EDIT:** Tried Claude and it was much easier and it's done now.

## Comments

- **Reasonable-Total-628** (2↑): git good
- **coloradical5280** (3↑): You’re using the free version and asking for results that take a bit of compute. You probably could one shot this with codex cli on pro plan. Just never going to happen on free.
- **SimpleAccurate631** (1↑): Can you maybe provide some of the prompts you’ve given it that haven’t worked? I’m an AI engineer, so I don’t mind looking at it. LLM’s do make mistakes, sometimes big ones. But 98% of the time, tweaking the prompt is what does the trick. Even people who swear they gave good, clear prompts often miss something that would make a big difference
  - **Confusatronic** (-1↑): I doubt it's the prompt, because ChatGPT verified what I want and it was correct. But when it wrote the script, it wrote it with errors. Over and over. But in case you're right, here is the prompt I wrote (with parts in brackets redacted for Reddit):

----

Write a Google Apps script that will search Craigslist in the following way, with the goal being alerting me to items as soon as they are posted: It searches [my city's] Craigslist's "musicians" page. If it finds a keyword hit (from an included list in the Google Apps script), it sends an email to "[my email]". That email will have the subject line of the Craigslist posting and a hyperlink to it. But this script works with a Google Sheets sheet to keep track of what has already been scraped from Craigslist, so it doesn't keep alerting on items it already told me about. This script should run, on *average*, every 15 minutes, but you will want to use a random function to randomize a little the time it runs so Craigslist doesn't block it. Sometimes it will run at 11 minutes, sometimes, 19, but on average it will be every 15 minutes. Do you understand the task?
    - **SimpleAccurate631** (3↑): Oh it’s going to over-engineer the heck out of that and be a nightmare. Not cause you totally screwed up. But you just shoved a buffet down its throat and asked it to chew and swallow no problem. Here’s how I would approach it (I would actually give more detailed prompts, but these are the gist of it):

1) I would first ask it to just create a script you can manually run that searches the Craigslist page you want and simply prints out a list of the titles for each result in your terminal.

2) Then, once you have verified that works, ask it to update a Google sheet you have created with an incrementing id in column A, timestamp in column B, title in column C, and hyperlink in column D. This is important because it needs to know exactly what the structure of the spreadsheet should be, and what goes where.

3) Then, I would ask it to update the script to either first read the Google sheet and grab the newest timestamp, then search the Craigslist page again. Or ask ChatGPT if there’s an effective way to store the timestamp of the last time it was run. It might have a creative solution.

4) Then, I would manually delete the most recent 1 or 2 posts in the sheet (entire row), and run the script again. If it works, then you should be able to see the posts you deleted back in the list. And I would explicitly tell ChatGPT that exact expected result.

5) Once that works, ask ChatGPT what the most effective method is to have the process email you when it runs, then ask how to implement that. Then test manually again (delete a row, run it manually, and you should expect to receive an email with a link to the Google sheet with the updated list).

6) Finally, I would then ask it what it recommends in terms of options to automate the script (once a day or once a week multiple times a day).

Bonus Tips:
1) Give it like 1-3 sentences with the context of what and why you are asking for help with this in every prompt. Context helps more than you think.
2) Tell it if the prompt is unclear in any way, it needs to ask you for clarification before it just proceeds with writing code.
3) Tell it to provide you with exact steps or commands to run to test it (easy copy-pasta).
4) Think of any other guidelines or boundaries you want it to adhere to. For instance, I explicitly tell it to avoid over engineering anything, and if it can’t do something in a relatively straightforward way, then it needs to tell me and ask how I want to proceed.
    - **simfgames** (3↑): It is definitely the prompt. LLMs can only one shot fairly simple things.

All models work best with shorter instructions. But cheaper models *especially* need short, specific instructions.
    - **Coffee_Crisis** (1↑): Have it write a design document and an implementation plan first, then read those files and update them as you implement one step at a time
    - **e38383** (1↑): It most likely can’t solve this. It has no access to the result you get from that search.

Try to give it more instructions:
1. the direct link or POST request
2. an example result (source)
3. what you expect it to find (how is the keyword defined)

That should help a lot.

Google apps script can run things on random times IIRC, but that can’t be set up in the script itself, you need to do this separately.
    - **UziMcUsername** (1↑): You’re going to need to break it down into a lot of steps. Some of those steps you mentioned have lots of requirements. Sending an email sounds simple, but without you and your mail client it gets complicated. Get chat to break it down into steps/conponents until you understand what’s involved. Then you’ll be able to guide it through the process
    - **SerenityScott** (1↑): You can't ask ChatGPT to verify anything. Everything it does is a hallucination. Sometimes it's accurate sometime's it's not. It can't validate or verify anything. I've made custom GPTs with an uploaded document, and it can't cite or quote it correctly. That's GPT5, 4o, all models. LLMs are not reliable. But they will tell you they verified or validated. Or went back to check and then give you a different hallucinated quote.
- **[deleted]** (1↑): It's like pulling teeth because there are inherent limitations with 1. Google App Scripts, and 2. Craigslist that you don't understand. Maybe instead of spending hours beating your head against the wall you do a quick Google search to determine what those are, so you can better understand the problem you're facing and why there is no feasible way to do this without a secondary backend service.
- **MaleficentSail6336** (1↑): Mine 2
- **CommercialComputer15** (1↑): That’s how it works lol
