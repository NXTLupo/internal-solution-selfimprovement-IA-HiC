---
id: social-intelligence/reddit-deep/sideproject/1t6jwo6.md
url: "https://www.reddit.com/r/SideProject/comments/1t6jwo6/building_workflow_products_what_we_changed_after/"
kind: "social-post"
source: "reddit-deep: r/sideproject"
subreddit: "sideproject"
title: "Building workflow products - what we changed after our first real user feedback session"
author: "hamayerowel"
date: "2026-05-07T18:57:47.000Z"
score: 4
upvote_ratio: 1
num_comments: 6
flair: ""
extracted_at: "2026-07-03T00:07:56.414Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/sideproject/1t6jwo6.md#c0"
    char_span: [0, 1796]
    sentence_count: 11
    key_terms: [com, iakpress, fixed, already, https, xpressui, field, sideproject]
    concepts: [iakpress, fixed, already, https, xpressui]
    token_count: 438
    sources: [{"n":"reddit-deep: r/sideproject","u":"https://www.reddit.com/r/SideProject/comments/1t6jwo6/building_workflow_products_what_we_changed_after/"}]
  - id: "social-intelligence/reddit-deep/sideproject/1t6jwo6.md#c1"
    char_span: [1811, 2217]
    sentence_count: 4
    key_terms: [users, implementation, utilisateurs, hamayerowel, technically, changelogs, discussion, totalement]
    concepts: [users]
    section: Comments
    token_count: 111
---
# Building workflow products - what we changed after our first real user feedback session

Source: [reddit-deep: r/sideproject](https://www.reddit.com/r/SideProject/comments/1t6jwo6/building_workflow_products_what_we_changed_after/)
Posted by **hamayerowel** · **4↑** · **6 comments**

We launched XPressUI a few weeks ago — a multi-step form and document intake builder that exports to WordPress or hosted links.

We sent the product to a tester and got 11 specific observations. Here's what we fixed:

**Things we thought were obvious but weren't:**

* The required field toggle was buried inside a "Validation" accordion. Moved it to the General section.
* The date picker could go back to year 1 AD. Fixed minimum to 1900.
* Clicking on a date field didn't open the calendar — you had to click the icon. Fixed with `showPicker()` on field click.
* The save button was creating a version even when nothing changed, leading to 50 versions in a few minutes. Now it diffs before saving.
* Project status wasn't persisting after navigating away. Fixed.

**Things that were already fixed but testers assumed weren't:**

* Form fields hiding after successful submission (like GravityForms) — already implemented via `data-workflow-state="submitted"`
* Submission loader — already showing `aria-busy` on the submit button
* Radio buttons in preview — already working

The lesson: users don't read changelogs. If a fix isn't visible at a glance, it doesn't exist for them.

We're now live at iakpress.com. Still early — open to feedback.

# Latest Resources

* **Plugin (v1.0.81):** [Download here](https://github.com/lybaba/xpressui-packages/releases/tag/v1.0.80)
* **Product Page:** [iakpress.com](https://iakpress.com/)
* **Console Builder:** [xpressui.iakpress.com](https://xpressui.iakpress.com/)

## Comments

- **Agreeable_Care4440** (1↑): “The lesson: users don’t read changelogs” is painfully accurate. If something isn’t obvious in the actual flow, most users will assume it doesn’t exist no matter how technically correct the implementation is.
  - **hamayerowel** (1↑): Totalement vrai. Les utilisateurs croient à ce qu'ils voient.  Du coup ça doit être simple et évident.
- **B_Namure45** (1↑): top discussion
