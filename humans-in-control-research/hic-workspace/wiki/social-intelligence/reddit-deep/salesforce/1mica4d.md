---
id: social-intelligence/reddit-deep/salesforce/1mica4d.md
url: "https://www.reddit.com/r/salesforce/comments/1mica4d/issue_with_campaign_members_no_longer_syncing_to/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Issue with Campaign Members no longer syncing to Marketing Cloud from CRM"
author: "Punk_Loser"
date: "2025-08-05T15:27:33.000Z"
score: 3
upvote_ratio: 1
num_comments: 4
flair: "help please"
extracted_at: "2026-06-23T20:32:01.770Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1mica4d.md#c0"
    char_span: [0, 1509]
    sentence_count: 12
    key_terms: [campaign, members, syncing, automation, leads, marketing, new, cloud]
    concepts: [campaign, members, syncing, automation, marketing]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1mica4d.md#c1"]
    token_count: 323
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1mica4d/issue_with_campaign_members_no_longer_syncing_to/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1mica4d.md#c1"
    char_span: [1523, 4011]
    sentence_count: 16
    key_terms: [campaign, automation, sync, connector, marketing, data, cloud, members]
    concepts: [campaign, automation, connector, marketing, cloud]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1mica4d.md#c0"]
    section: Comments
    token_count: 460
  - id: "social-intelligence/reddit-deep/salesforce/1mica4d.md#c2"
    char_span: [4013, 4341]
    sentence_count: 2
    key_terms: [sync, bidirectional, automations, checkpoints, explicitly, rebuilding, throughput, untangling]
    section: Comments
    token_count: 67
---
# Issue with Campaign Members no longer syncing to Marketing Cloud from CRM

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1mica4d/issue_with_campaign_members_no_longer_syncing_to/)
Posted by **Punk_Loser** · **3↑** · **4 comments**

I have Campaigns and Campaign Members synced to Marketing Cloud. I have a web form creating Leads/CMs attached to the Campaign. They were syncing just fine and entering a data extension via an automation. Then an automation triggered journey sends.

I cleared the campaign members from the campaign on the CRM side and deleted the contacts out of the data extension so I could update the journey.

New campaign members/leads attached to this campaign are no longer syncing to Marketing Cloud. I didn’t change anything besides clearing out old data. I see the leads/cms in CRM.

Any ideas why this happened? I’m going to create a new campaign an update the campaign ID on the web form for now and see if new campaign members/leads will start syncing again.

EDIT:
Turns out it was two things that the timing lined up perfectly lol… I ignored an email that the API user was deactivated and had to reconnect it… that’s what happens when I’m inundated with annoying sales emails and fucking connections spam.
I also had an automation to filter the contacts into a DE that filtered out any campaign member with a null first name, and the new web form wasn’t populating first name during testing… so just a dumb oversight on both ends on my part.

## Comments

- **ck-pinkfish** (3↑): Working at a platform that does automation for enterprise teams, this Marketing Cloud sync break after clearing campaign members is a classic Salesforce automation fuckup that happens when you delete data without considering the underlying sync mechanisms.

The issue is probably related to Marketing Cloud Connector's sync filters or automation rules that got confused when you cleared the campaign members. MC Connector tracks synchronization status and deleting members without properly resetting sync flags can break the automation flow.

Check your Marketing Cloud Connector configuration in Setup to see if the campaign sync is still active and properly configured. Sometimes clearing large amounts of data triggers sync errors that require manual reset of the connector settings.

The data extension automation might also be looking for specific field mappings or campaign member statuses that got reset when you cleared the data. If your automation has filters based on member status or creation dates, clearing and recreating members could put them outside the filter criteria.

Your workaround of creating a new campaign is smart because it bypasses whatever sync state got corrupted. This is usually faster than troubleshooting the Marketing Cloud Connector sync issues, which can take hours to diagnose properly.

Most automation tools are either too basic for real Marketing Cloud integration or way too complex for marketing teams to troubleshoot when things break. The MC Connector is particularly fragile when it comes to bulk data operations and doesn't handle cleanup scenarios gracefully.

For future reference, pause automations before clearing campaign data, then restart them after new data is loaded to avoid sync state conflicts.
  - **Punk_Loser** (1↑): Thank you for this. Definitely good to keep this in mind going forward. I wish this was actually the issue and not my inability to read lmao
- **ResidentNothing478** (2↑): Check in Synchronized Data Extensions if campaign is still synching and its active. Also double check if there is nothing getting injected into the new campaign member records that's causing the records to not come through i.e. check if you have filters on the SDE that's not the issue.
- **Mountain_Lecture6146** (1↑): Yeah, classic Marketing Cloud connector fragility. Once you bulk-clear campaign members, the sync flags often desync unless you pause/restart the connector or reset the Synchronized DE mapping.

Rebuilding the campaign is usually faster than untangling the broken sync queue, but long term, add a “pre-clear” step to disable automations and re-init the connector after cleanup. We hit the same edge case in Stacksync with CRM-MC bidirectional sync, state drift kills throughput unless sync checkpoints are explicitly reset.
