---
name: deep-research-with-packs
description: Run a research report that searches the person's chosen HiC data packs, named publications, Reddit and YouTube first, with a brief the person can approve on its plan card.
when_to_use: The person asks for research, a deep dive or a report on a subject, names a data pack, an industry, publications, a subreddit or a period, or picked packs in the composer.
version: 3
owner: IA Next harness (WS-H9)
tier: core
tools: start_research_report, start_social_analysis, list_engagements, task_status, read_report, retry_task
---

# Deep research with data packs

A research report is the studio's longest piece of work: the Research Lead searches the packs, the named publications,
the open web and YouTube inside the period; the Analyst pulls verbatim findings; the Writer drafts; a reviewer on
another model checks it. The brief decides all of it, so these steps are about the brief.

1. Read the request for six things: the subject, the audience, the period, the packs, named publications, and named
   sources (a subreddit, Reddit, YouTube, attached files). They fill `goal`, `audience`, `scope` (the period goes here),
   `packs`, `publications` and `required_sources`. A line at the top of the message lists the packs the person selected
   in the composer ("Data packs the person selected for research"); that selection is exact and wins over anything you infer.
   Check: each of the six is either taken from the person's words or recorded as not stated; nothing is invented.

2. Look at the engagement's existing work before planning new research. The focused engagement's work list rides with
   the message; when no engagement is in focus, the recent engagements and their ids are listed. Use
   `list_engagements` with an `engagement_id` only when that list is not in front of you.
   Check: `new_research_confirmed` is true only when the person asked for new research, or said yes after you told
   them the engagement already has findings.

3. Choose the packs. Use the composer's selection exactly. Otherwise use the packs the person names or the industry
   they name implies, by id from the tool's list (`retail`, `higher_ed`, `healthcare`, `executive_search` and the rest;
   `references/packs.md` lists every pack with what it covers). Otherwise pass an empty `packs` list.
   Check: every id in `packs` appears in the `start_research_report` description; no id is made up.

4. Name Reddit when the person names it. A named subreddit or "on Reddit" means the posts are primary evidence: list
   each one in `required_sources` as `reddit:r/<name>`. When the engagement holds no posts from it, the plan card
   collects them first as its own step, so do not call `start_social_analysis` as well (that tool is for Reddit
   listening on its own). YouTube needs no step of its own (research reads it every run); put `youtube` in
   `required_sources` when the person asks for videos as evidence.
   Check: every subreddit the person named appears in `required_sources`.

5. Write the brief. `goal`: the decision or question the report answers. `audience`: who reads it. `scope`: the
   population, the geography and the period in the person's words ("the last 90 days"). `structure`: the sections in
   order. `constraints`: what to leave out. `success`: at most five criteria, each naming what a finding must show.
   Put every publication the person named in `publications`, exactly as written.
   Check: `success` has one to five items and each could be answered by a quoted source.

6. Call `start_research_report` once with the brief, `packs`, `publications` and `budget_usd` 0. The result is a plan
   card the person reviews; say in one sentence that the plan is ready.
   Check: the tool was called once in this turn, and the reply does not say the work has started.

7. When the person asks how it is going, use `task_status`; report the report as finished only when its status is
   done. To answer questions about a finished report, use `read_report` with its task id.
   Check: every claim about the report's content comes from `read_report`, never from memory of the brief.

## If something goes wrong

| What happened | What to do |
|---|---|
| The tool says the engagement already has findings | Tell the person, ask whether to research again, and call again with `new_research_confirmed` true only after a yes |
| The work stops because Reddit returned no posts for the subreddit | Tell the person which subreddit and period came back empty, and offer a longer period or a wider subreddit |
| A pack id is rejected | Use only the ids listed in the tool description; when the industry has no pack, pass an empty list and name the industry in `scope` |
| A named publication returned nothing | Say which ones returned nothing (the report lists them) and offer the pack that covers that industry |
| The task failed | Read the reason with `task_status`, tell the person, and use `retry_task` with the same task id when they ask to try again |
| The person asks a question about earlier research | Do not start new research; use `read_report` or `recall` on the existing work |
